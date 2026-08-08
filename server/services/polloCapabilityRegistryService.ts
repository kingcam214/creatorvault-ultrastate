import { createHash, randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { assertBodyCinemaEvidenceReady } from "./bodyCinemaEvidenceService";

export type PolloGenerationType =
  | "text2video"
  | "image2video"
  | "ref2video"
  | "video2video"
  | "text2image"
  | "image2image"
  | "other";

export type CapabilityAccessState = "enabled" | "disabled" | "unknown" | "missing_credential";
export type CapabilityAuditState = "ready" | "degraded" | "blocked";

export type PolloModelCapability = {
  provider: "pollo";
  brand: string;
  model: string;
  modelKey: string;
  generationTypes: PolloGenerationType[];
  apiPaths: string[];
  supportsSourceVideoReference: boolean;
  accountAccess: CapabilityAccessState;
  discoverySource: "public_catalog";
};

export type PolloAccountSnapshot = {
  credentialPresent: boolean;
  balance: {
    state: "available" | "unavailable" | "not_checked";
    availableCredits: number | null;
    totalCredits: number | null;
    availableAmountUsd: number | null;
    totalAmountUsd: number | null;
    failureReason: string | null;
  };
  modelAccess: {
    state: "available" | "unavailable" | "not_checked";
    modelTokens: string[];
    failureReason: string | null;
  };
};

export type PolloCapabilitySnapshot = {
  id: string;
  provider: "pollo";
  state: CapabilityAuditState;
  catalogHash: string;
  checkedAt: string;
  models: PolloModelCapability[];
  account: PolloAccountSnapshot;
  warnings: string[];
};

export type BodyCinemaSourceVideoPreflight = {
  evidenceId: string;
  sourceMediaUrl: string;
  sourceFingerprint: string;
  selectedDirectionId: string;
  status: "quote_required" | "blocked";
  candidates: Array<Pick<PolloModelCapability, "modelKey" | "apiPaths" | "generationTypes" | "supportsSourceVideoReference" | "accountAccess">>;
  blockingReasons: string[];
  requiredBeforeSubmission: string[];
  executionPolicy: {
    defaultDeny: true;
    globalExecutionEnabled: boolean;
    quoteRequired: true;
    explicitOwnerApprovalRequired: true;
    exactBudgetCapRequired: true;
    oneUsePermitRequired: true;
    outputReviewRequired: true;
  };
};

type PublicModelSpec = {
  brand?: unknown;
  model?: unknown;
  type?: unknown;
  path?: unknown;
  deprecated?: unknown;
};

type StoredSnapshotRow = {
  id: string;
  snapshot_json: unknown;
};

const OWNER_IDS = new Set([6, 33]);
const POLLO_PUBLIC_MODEL_CATALOG = "https://api.pollo.ai/api/v1/model-specs";
const POLLO_PLATFORM_BASE = "https://pollo.ai/api/platform";
const MAX_MODEL_COUNT = 1_000;
const REQUEST_TIMEOUT_MS = 12_000;

function normalizeGenerationType(value: unknown): PolloGenerationType {
  const normalized = String(value || "").trim().toLowerCase();
  if (["text2video", "image2video", "ref2video", "video2video", "text2image", "image2image"].includes(normalized)) {
    return normalized as PolloGenerationType;
  }
  return "other";
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return JSON.stringify({ serialization_error: true });
  }
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

function canonicalToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/\/video$/, "")
    .replace(/^v1\/generation\//, "");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function collectModelTokens(value: unknown, output = new Set<string>(), depth = 0): Set<string> {
  if (depth > 5 || value === null || value === undefined) return output;
  if (typeof value === "string") {
    const token = canonicalToken(value);
    if (token && token.length <= 256) output.add(token);
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, MAX_MODEL_COUNT)) collectModelTokens(item, output, depth + 1);
    return output;
  }
  if (!isObject(value)) return output;
  for (const [key, item] of Object.entries(value)) {
    if (["model", "modelname", "model_name", "code", "path", "id", "name", "brand"].includes(key.toLowerCase())) {
      if (typeof item === "string") output.add(canonicalToken(item));
    }
    if (depth < 4) collectModelTokens(item, output, depth + 1);
  }
  return output;
}

function modelMatchesAccount(model: PolloModelCapability, tokens: Set<string>): boolean {
  const candidates = [
    model.modelKey,
    model.model,
    `${model.brand}/${model.model}`,
    ...model.apiPaths,
  ].map(canonicalToken);
  return candidates.some((candidate) => tokens.has(candidate));
}

function readNumeric(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown read-only provider audit error");
  return message.replace(/x-api-key\s*[:=]\s*[^\s,]+/gi, "x-api-key=[redacted]").slice(0, 360);
}

async function rawQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  const pool = (db as any).$client || (db as any).client;
  if (pool && typeof pool.promise === "function") {
    const [rows] = await pool.promise().query(query, params);
    return rows as T[];
  }
  if (pool && typeof pool.execute === "function") {
    const [rows] = await pool.execute(query, params);
    return rows as T[];
  }
  const values = [...params];
  const escaped = query.replace(/\?/g, () => {
    const value = values.shift();
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  });
  const result = await (db as any).execute(sql.raw(escaped));
  return (result as any).rows || result || [];
}

async function rawExec(query: string, params: any[] = []): Promise<any> {
  const pool = (db as any).$client || (db as any).client;
  if (pool && typeof pool.promise === "function") {
    const [result] = await pool.promise().query(query, params);
    return result;
  }
  if (pool && typeof pool.execute === "function") {
    const [result] = await pool.execute(query, params);
    return result;
  }
  const values = [...params];
  const escaped = query.replace(/\?/g, () => {
    const value = values.shift();
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  });
  return (db as any).execute(sql.raw(escaped));
}

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<Record<string, unknown> | unknown[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    const text = await response.text().catch(() => "");
    let payload: Record<string, unknown> | unknown[] = {};
    try {
      const parsed = JSON.parse(text || "{}");
      payload = Array.isArray(parsed) || isObject(parsed) ? parsed : { responseText: text.slice(0, 360) };
    } catch {
      payload = { responseText: text.slice(0, 360) };
    }
    if (!response.ok) {
      const detail = isObject(payload) ? String(payload.message || payload.code || "provider request failed") : "provider request failed";
      throw new Error(`Read-only provider endpoint returned ${response.status}: ${detail}`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function extractModelList(payload: Record<string, unknown> | unknown[]): PublicModelSpec[] {
  if (Array.isArray(payload)) return payload.filter(isObject) as PublicModelSpec[];
  const candidates = [payload.data, payload.models, payload.items, payload.result];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.filter(isObject) as PublicModelSpec[];
  }
  return [];
}

export function normalizePolloModelCatalog(payload: Record<string, unknown> | unknown[], accountTokens: Set<string> | null = null): PolloModelCapability[] {
  const grouped = new Map<string, PolloModelCapability>();
  for (const spec of extractModelList(payload).slice(0, MAX_MODEL_COUNT)) {
    const brand = String(spec.brand || "").trim();
    const model = String(spec.model || "").trim();
    const apiPath = String(spec.path || "").trim();
    if (!brand || !model || !apiPath || Boolean(spec.deprecated)) continue;
    const modelKey = `${brand}/${model}`;
    const current = grouped.get(modelKey) || {
      provider: "pollo" as const,
      brand,
      model,
      modelKey,
      generationTypes: [],
      apiPaths: [],
      supportsSourceVideoReference: false,
      accountAccess: "unknown" as CapabilityAccessState,
      discoverySource: "public_catalog" as const,
    };
    const type = normalizeGenerationType(spec.type);
    if (!current.generationTypes.includes(type)) current.generationTypes.push(type);
    if (!current.apiPaths.includes(apiPath)) current.apiPaths.push(apiPath);
    current.supportsSourceVideoReference = current.generationTypes.includes("ref2video") || current.generationTypes.includes("video2video");
    grouped.set(modelKey, current);
  }
  const models = [...grouped.values()].sort((left, right) => left.modelKey.localeCompare(right.modelKey));
  if (accountTokens === null) return models;
  return models.map((model) => ({
    ...model,
    accountAccess: accountTokens.size === 0 ? "unknown" : modelMatchesAccount(model, accountTokens) ? "enabled" : "disabled",
  }));
}

export async function ensurePolloCapabilityRegistrySchema(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS provider_capability_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    provider VARCHAR(32) NOT NULL,
    account_scope VARCHAR(96) NOT NULL,
    audit_state VARCHAR(32) NOT NULL,
    catalog_hash CHAR(64) NOT NULL,
    snapshot_json JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_provider_capability_snapshots_provider (provider, created_at),
    INDEX idx_provider_capability_snapshots_state (audit_state)
  )`);
}

export async function refreshPolloCapabilitySnapshot(requestedBy: number): Promise<PolloCapabilitySnapshot> {
  if (!OWNER_IDS.has(Number(requestedBy))) throw new Error("Owner approval is required to refresh provider capability access.");
  await ensurePolloCapabilityRegistrySchema();

  const warnings: string[] = [];
  let catalogPayload: Record<string, unknown> | unknown[] = [];
  try {
    catalogPayload = await fetchJson(POLLO_PUBLIC_MODEL_CATALOG);
  } catch (error) {
    throw new Error(`Public Pollo capability catalog could not be read without a provider generation: ${safeError(error)}`);
  }

  const apiKey = String(process.env.POLLO_API_KEY || "").trim();
  const credentialPresent = Boolean(apiKey);
  const account: PolloAccountSnapshot = {
    credentialPresent,
    balance: { state: "not_checked", availableCredits: null, totalCredits: null, availableAmountUsd: null, totalAmountUsd: null, failureReason: null },
    modelAccess: { state: "not_checked", modelTokens: [], failureReason: null },
  };
  let accountTokens: Set<string> | null = null;

  if (!credentialPresent) {
    warnings.push("Pollo API credential is absent; catalog discovery succeeded but no account access can be verified.");
  } else {
    const headers = { "x-api-key": apiKey };
    try {
      const balancePayload = await fetchJson(`${POLLO_PLATFORM_BASE}/credit/balance`, headers);
      const payload = isObject(balancePayload) && isObject(balancePayload.data) ? balancePayload.data : balancePayload;
      const record = isObject(payload) ? payload : {};
      account.balance = {
        state: "available",
        availableCredits: readNumeric(record.availableCredits),
        totalCredits: readNumeric(record.totalCredits),
        availableAmountUsd: readNumeric(record.availableAmountUsd),
        totalAmountUsd: readNumeric(record.totalAmountUsd),
        failureReason: null,
      };
    } catch (error) {
      account.balance.state = "unavailable";
      account.balance.failureReason = safeError(error);
      warnings.push("Pollo balance could not be verified through the read-only account endpoint.");
    }

    try {
      const modelAccessPayload = await fetchJson(`${POLLO_PLATFORM_BASE}/config/video/models`, headers);
      const tokens = collectModelTokens(modelAccessPayload);
      accountTokens = tokens;
      account.modelAccess = {
        state: "available",
        modelTokens: [...tokens].sort().slice(0, MAX_MODEL_COUNT),
        failureReason: null,
      };
    } catch (error) {
      account.modelAccess.state = "unavailable";
      account.modelAccess.failureReason = safeError(error);
      warnings.push("Pollo account model access could not be verified through the read-only model endpoint; all provider execution remains blocked.");
    }
  }

  const models = normalizePolloModelCatalog(catalogPayload, accountTokens);
  const state: CapabilityAuditState = models.length === 0
    ? "blocked"
    : account.modelAccess.state === "available" && account.balance.state === "available"
      ? "ready"
      : "degraded";
  const catalogHash = createHash("sha256").update(safeJson(models.map((model) => ({
    modelKey: model.modelKey,
    generationTypes: model.generationTypes,
    apiPaths: model.apiPaths,
  })))).digest("hex");
  const snapshot: PolloCapabilitySnapshot = {
    id: randomUUID(),
    provider: "pollo",
    state,
    catalogHash,
    checkedAt: new Date().toISOString(),
    models,
    account,
    warnings,
  };

  await rawExec(
    `INSERT INTO provider_capability_snapshots (id, provider, account_scope, audit_state, catalog_hash, snapshot_json)
     VALUES (?, 'pollo', ?, ?, ?, ?)`,
    [snapshot.id, `owner:${requestedBy}`, snapshot.state, snapshot.catalogHash, safeJson(snapshot)],
  );
  return snapshot;
}

export async function getLatestPolloCapabilitySnapshot(): Promise<PolloCapabilitySnapshot | null> {
  await ensurePolloCapabilityRegistrySchema();
  const rows = await rawQuery<StoredSnapshotRow>(
    "SELECT id, snapshot_json FROM provider_capability_snapshots WHERE provider = 'pollo' ORDER BY created_at DESC, id DESC LIMIT 1",
  );
  if (!rows[0]) return null;
  const snapshot = parseJson<PolloCapabilitySnapshot | null>(rows[0].snapshot_json, null);
  return snapshot && snapshot.provider === "pollo" ? snapshot : null;
}

export async function preflightBodyCinemaSourceVideo(input: {
  creatorId: number;
  evidenceId: string;
  sourceMediaUrl: string;
}): Promise<BodyCinemaSourceVideoPreflight> {
  const evidenceContext = await assertBodyCinemaEvidenceReady(input);
  const snapshot = await getLatestPolloCapabilitySnapshot();
  const blockingReasons: string[] = [];
  if (!snapshot) {
    blockingReasons.push("No read-only provider capability audit has been recorded. Provider execution is blocked until an owner refreshes the registry.");
  }
  if (snapshot && snapshot.state !== "ready") {
    blockingReasons.push("The latest provider capability audit is not fully ready; provider execution remains blocked.");
  }
  const candidates = (snapshot?.models || [])
    .filter((model) => model.supportsSourceVideoReference && model.accountAccess === "enabled")
    .map((model) => ({
      modelKey: model.modelKey,
      apiPaths: model.apiPaths,
      generationTypes: model.generationTypes,
      supportsSourceVideoReference: model.supportsSourceVideoReference,
      accountAccess: model.accountAccess,
    }));
  if (!candidates.length) {
    blockingReasons.push("No source-video reference model is proven both available in the public catalog and enabled for this Pollo API key.");
  }

  return {
    evidenceId: evidenceContext.evidence.id,
    sourceMediaUrl: evidenceContext.evidence.sourceMediaUrl,
    sourceFingerprint: evidenceContext.evidence.sourceFingerprint,
    selectedDirectionId: evidenceContext.direction.id,
    status: blockingReasons.length ? "blocked" : "quote_required",
    candidates,
    blockingReasons,
    requiredBeforeSubmission: [
      "verified_source_evidence",
      "approved_evidence_backed_treatment",
      "model_capability_match",
      "read_only_account_access_verification",
      "live_provider_quote",
      "exact_budget_cap",
      "explicit_owner_approval",
      "single_use_submission_permit",
      "persistent_provider_task_tracking",
      "output_storage_and_independent_quality_review",
    ],
    executionPolicy: {
      defaultDeny: true,
      globalExecutionEnabled: false,
      quoteRequired: true,
      explicitOwnerApprovalRequired: true,
      exactBudgetCapRequired: true,
      oneUsePermitRequired: true,
      outputReviewRequired: true,
    },
  };
}

export function buildPolloCapabilitySummary(snapshot: PolloCapabilitySnapshot | null): {
  state: CapabilityAuditState | "not_audited";
  catalogModelCount: number;
  sourceVideoModelCount: number;
  enabledSourceVideoModelCount: number;
  creditBalanceState: PolloAccountSnapshot["balance"]["state"] | "not_audited";
  accountModelAccessState: PolloAccountSnapshot["modelAccess"]["state"] | "not_audited";
} {
  if (!snapshot) {
    return { state: "not_audited", catalogModelCount: 0, sourceVideoModelCount: 0, enabledSourceVideoModelCount: 0, creditBalanceState: "not_audited", accountModelAccessState: "not_audited" };
  }
  const sourceVideo = snapshot.models.filter((model) => model.supportsSourceVideoReference);
  return {
    state: snapshot.state,
    catalogModelCount: snapshot.models.length,
    sourceVideoModelCount: sourceVideo.length,
    enabledSourceVideoModelCount: sourceVideo.filter((model) => model.accountAccess === "enabled").length,
    creditBalanceState: snapshot.account.balance.state,
    accountModelAccessState: snapshot.account.modelAccess.state,
  };
}

export const POLLO_CAPABILITY_REGISTRY_AUDIT_POLICY = {
  generationCallsAllowed: false,
  balanceEndpointReadOnly: true,
  modelCatalogReadOnly: true,
  accountModelEndpointReadOnly: true,
  persistedAuditRequiredBeforeSourceVideoExecution: true,
} as const;
