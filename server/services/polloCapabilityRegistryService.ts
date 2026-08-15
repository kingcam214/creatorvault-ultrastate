import { createHash, randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { execFile } from "node:child_process";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import { db } from "../db";
import { assertBodyCinemaEvidenceReady } from "./bodyCinemaEvidenceService";
import { buildFrameEvidence, probeVideo } from "./bodyCinemaExistingMediaProofService";
import { reviewBodyCinemaOutput } from "./bodyCinemaOutputReviewService";

const execFileAsync = promisify(execFile);

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

export type ControlledModelAccessState = "available" | "unavailable" | "unknown";

export type ControlledSourceVideoCandidate = {
  rank: number;
  modelKey: string;
  providerApiPath: string;
  documentedInputSupport: string;
  durationSeconds: number;
  resolution: "720p" | "768P" | "720P";
  aspectRatio: "9:16";
  creativeStrength: string;
  disableNativeAudio?: boolean;
  priceStatus: "price_not_yet_returned";
  accountAccess: ControlledModelAccessState;
  lastVerifiedAt: string | null;
  failureReason: string | null;
};

export type BodyCinemaSourceVideoPreflight = {
  evidenceId: string;
  sourceMediaUrl: string;
  sourceFingerprint: string;
  selectedDirectionId: string;
  status: "access_attempt_ready" | "blocked";
  candidates: ControlledSourceVideoCandidate[];
  blockingReasons: string[];
  qualityExclusions: string[];
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
const DURABLE_CONTENT_VAULT_ROOT = "/root/uploads/content-vault";
const MAX_PROVIDER_OUTPUT_BYTES = 150 * 1024 * 1024;

// These routes are verified against Pollo's official OpenAPI reference. They use the
// exact CreatorVault source video as a typed video reference and preserve the provider's documented output contract.
const REJECTED_SOURCE_VIDEO_MODELS = new Map<string, string>([
  ["minimax/minimax-h3", "Rejected after real governed Body Cinema review: unstable pose evidence, weak visual quality, and near-duplicate output failed acceptance."],
  ["bytedance/seedance-2-5", "Rejected after Body Cinema quality review: the result did not meet source-preservation and motion-quality standards."],
  ["kling-ai/kling-v3-omni", "Rejected after Body Cinema quality review: the result did not meet source-preservation and motion-quality standards."],
]);

const CONTRACT_INCOMPATIBLE_SOURCE_VIDEO_MODELS = new Map<string, string>([
  ["alibaba/happyhorse-1-0", "Live Pollo API returned that Happy Horse 1.0 does not support video references; no task or credit charge occurred."],
]);

const CONTROLLED_SOURCE_VIDEO_LADDER = [
  {
    rank: 1,
    modelKey: "google/veo-3-1",
    providerApiPath: "/generation/google/veo-3-1/ref2video",
    documentedInputSupport: "refs[].type=video with HTTPS video URL",
    durationSeconds: 8,
    resolution: "720p",
    aspectRatio: "9:16",
    creativeStrength: "Official video-reference conditioning with eight-second high-fidelity vertical motion and preserved scene context.",
    disableNativeAudio: true,
  },
  {
    rank: 2,
    modelKey: "alibaba/wan-v2-6",
    providerApiPath: "/generation/wanx/wan-v2-6/ref2video",
    documentedInputSupport: "refs[].type=video with HTTPS video URL",
    durationSeconds: 5,
    resolution: "720P",
    aspectRatio: "9:16",
    creativeStrength: "Documented source-video conditioning with multi-shot control and source-audio-aware reference support.",
  },
  {
    rank: 3,
    modelKey: "alibaba/happyhorse-1-0",
    providerApiPath: "/generation/wanx/happyhorse-1-0/ref2video",
    documentedInputSupport: "refs[].type=video with HTTPS video URL",
    durationSeconds: 6,
    resolution: "720P",
    aspectRatio: "9:16",
    creativeStrength: "Reference-guided multi-shot identity continuity with natural motion and cinematic camera control.",

  },
  {
    rank: 4,
    modelKey: "minimax/minimax-h3",
    providerApiPath: "/generation/minimax/minimax-h3/ref2video",
    documentedInputSupport: "refs[].type=video with HTTPS video URL",
    durationSeconds: 6,
    resolution: "768P",
    aspectRatio: "9:16",
    creativeStrength: "Reference-guided multi-shot motion with documented character, style, and scene anchoring.",
  },
  {
    rank: 5,
    modelKey: "bytedance/seedance-2-5",
    providerApiPath: "/generation/bytedance/seedance-2-5/ref2video",
    documentedInputSupport: "refs[].type=video with HTTPS video URL",
    durationSeconds: 6,
    resolution: "720p",
    aspectRatio: "9:16",
    creativeStrength: "Multimodal reference anchoring for controlled short-form visual continuity.",
  },
  {
    rank: 6,
    modelKey: "kling-ai/kling-v3-omni",
    providerApiPath: "/generation/kling-ai/kling-v3-omni/ref2video",
    documentedInputSupport: "refs[].type=video with HTTPS video URL",
    durationSeconds: 6,
    resolution: "720P",
    aspectRatio: "9:16",
    creativeStrength: "High-resolution omni-modal reference control and cinematic motion continuity.",
  },
] as const;

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
      headers: {
        Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
        "User-Agent": "CreatorVault-Provider-Capability-Audit/1.0",
        ...headers,
      },
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
  await rawExec(`CREATE TABLE IF NOT EXISTS provider_model_access_memory (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    provider VARCHAR(32) NOT NULL,
    account_scope VARCHAR(96) NOT NULL,
    model_key VARCHAR(191) NOT NULL,
    access_state VARCHAR(32) NOT NULL,
    failure_reason TEXT NULL,
    balance_before_credits DECIMAL(18,4) NULL,
    balance_after_credits DECIMAL(18,4) NULL,
    provider_task_id VARCHAR(191) NULL,
    verified_at DATETIME NOT NULL,
    metadata_json LONGTEXT NULL,
    UNIQUE KEY provider_model_access_memory_unique (provider, account_scope, model_key),
    KEY provider_model_access_memory_account (account_scope, verified_at)
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

    // Pollo's official OpenAPI documents public model discovery and credit reads, but not a
    // read-only API-key entitlement endpoint. The previous undocumented call returned 400 and
    // falsely blocked every controlled source-video attempt. Availability is instead learned
    // from a single governed access attempt, recorded durably with before/after balance evidence.
    account.modelAccess = {
      state: "not_checked",
      modelTokens: [],
      failureReason: null,
    };
    warnings.push("Pollo does not publish a read-only model-entitlement endpoint; source-video access will be established only through the governed one-use access ladder.");
  }

  const models = normalizePolloModelCatalog(catalogPayload, accountTokens);
  // Pollo does not document a read-only per-key model-entitlement endpoint. Balance
  // verification proves credential health; individual availability is learned safely from
  // controlled attempts and persisted in provider_model_access_memory.
  const state: CapabilityAuditState = models.length === 0
    ? "blocked"
    : account.balance.state === "available"
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

export async function recordControlledModelAccessOutcome(params: {
  ownerId: number;
  modelKey: string;
  accessState: ControlledModelAccessState;
  failureReason?: string | null;
  balanceBeforeCredits?: number | null;
  balanceAfterCredits?: number | null;
  providerTaskId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!OWNER_IDS.has(Number(params.ownerId))) throw new Error("Owner approval is required to record provider model access.");
  await ensurePolloCapabilityRegistrySchema();
  if (!CONTROLLED_SOURCE_VIDEO_LADDER.some((candidate) => candidate.modelKey === params.modelKey)) {
    throw new Error("Only a documented controlled-ladder model may be recorded.");
  }
  await rawExec(
    `INSERT INTO provider_model_access_memory
      (provider, account_scope, model_key, access_state, failure_reason, balance_before_credits, balance_after_credits, provider_task_id, verified_at, metadata_json)
     VALUES ('pollo', ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
     ON DUPLICATE KEY UPDATE access_state = VALUES(access_state), failure_reason = VALUES(failure_reason),
       balance_before_credits = VALUES(balance_before_credits), balance_after_credits = VALUES(balance_after_credits),
       provider_task_id = VALUES(provider_task_id), verified_at = NOW(), metadata_json = VALUES(metadata_json)`,
    [`owner:${params.ownerId}`, params.modelKey, params.accessState, params.failureReason ?? null,
      params.balanceBeforeCredits ?? null, params.balanceAfterCredits ?? null, params.providerTaskId ?? null, safeJson(params.metadata)],
  );
}

async function getControlledModelAccessMemory(ownerId: number): Promise<Map<string, Record<string, unknown>>> {
  await ensurePolloCapabilityRegistrySchema();
  const rows = await rawQuery<any>(
    "SELECT model_key, access_state, failure_reason, verified_at FROM provider_model_access_memory WHERE provider = 'pollo' AND account_scope = ?",
    [`owner:${ownerId}`],
  );
  return new Map(rows.map((row) => [String(row.model_key), row]));
}

export function getControlledSourceVideoLadder(): ReadonlyArray<Omit<ControlledSourceVideoCandidate, "accountAccess" | "lastVerifiedAt" | "failureReason">> {
  return CONTROLLED_SOURCE_VIDEO_LADDER.map((candidate) => ({ ...candidate, priceStatus: "price_not_yet_returned" }));
}

export type PolloBalanceRead = {
  availableCredits: number;
  totalCredits: number | null;
  availableAmountUsd: number | null;
  totalAmountUsd: number | null;
  readAt: string;
};

export type ControlledAccessAttemptResult = {
  outcome: "model_unavailable_no_charge" | "invalid_parameters" | "invalid_key" | "insufficient_balance" | "balance_incident" | "task_created";
  model: ControlledSourceVideoCandidate;
  balanceBefore: PolloBalanceRead;
  balanceAfter: PolloBalanceRead | null;
  providerTaskId: string | null;
  providerResponse: Record<string, unknown>;
  message: string;
};

export async function getLatestControlledSourceVideoAttemptDetail(ownerId: number): Promise<{
  modelKey: string;
  accessState: ControlledModelAccessState;
  failureReason: string | null;
  providerIssues: string[];
  verifiedAt: string;
} | null> {
  if (!OWNER_IDS.has(Number(ownerId))) throw new Error("Owner approval is required to read controlled provider attempt details.");
  await ensurePolloCapabilityRegistrySchema();
  const rows = await rawQuery<any>(
    "SELECT model_key, access_state, failure_reason, metadata_json, verified_at FROM provider_model_access_memory WHERE provider = 'pollo' AND account_scope = ? ORDER BY verified_at DESC LIMIT 1",
    [`owner:${ownerId}`],
  );
  const record = rows[0];
  if (!record) return null;
  const metadata = parseJson<Record<string, unknown>>(record.metadata_json, {});
  const providerResponse = isObject(metadata.providerResponse) ? metadata.providerResponse : {};
  const rawIssues = Array.isArray((providerResponse as any).issues) ? (providerResponse as any).issues : [];
  const providerIssues = rawIssues
    .map((issue: any) => safeError(isObject(issue) ? issue.message || issue.code || "Provider validation issue" : issue))
    .filter(Boolean)
    .slice(0, 8);
  return {
    modelKey: String(record.model_key),
    accessState: String(record.access_state) as ControlledModelAccessState,
    failureReason: record.failure_reason ? safeError(record.failure_reason) : null,
    providerIssues,
    verifiedAt: new Date(record.verified_at).toISOString(),
  };
}

export async function readPolloBalance(): Promise<PolloBalanceRead> {
  const apiKey = String(process.env.POLLO_API_KEY || "").trim();
  if (!apiKey) throw new Error("POLLO_API_KEY is not configured; CreatorVault cannot verify balance before a controlled access attempt.");
  const raw = await fetchJson(`${POLLO_PLATFORM_BASE}/credit/balance`, { "x-api-key": apiKey });
  const payload = isObject(raw) && isObject(raw.data) ? raw.data : raw;
  const record = isObject(payload) ? payload : {};
  const availableCredits = readNumeric(record.availableCredits);
  if (availableCredits === null) throw new Error("Pollo balance response omitted availableCredits; no controlled access attempt was sent.");
  return {
    availableCredits,
    totalCredits: readNumeric(record.totalCredits),
    availableAmountUsd: readNumeric(record.availableAmountUsd),
    totalAmountUsd: readNumeric(record.totalAmountUsd),
    readAt: new Date().toISOString(),
  };
}

function buildControlledSourceVideoRequest(candidate: typeof CONTROLLED_SOURCE_VIDEO_LADDER[number], sourceUrl: string, prompt: string): Record<string, unknown> {
  if (!/^https:\/\//i.test(sourceUrl)) throw new Error("Controlled source-video access requires a secure HTTPS CreatorVault source URL.");
  const generationInput: Record<string, unknown> = {
    prompt,
    refs: [{ type: "video", name: "creatorvault_verified_source", video: sourceUrl, order: 1 }],
    duration: candidate.durationSeconds,
    resolution: candidate.resolution,
    aspectRatio: candidate.aspectRatio,
  };
  if ("disableNativeAudio" in candidate && candidate.disableNativeAudio) generationInput.generateAudio = false;
  return { input: generationInput };
}

export async function runNextControlledSourceVideoAccessAttempt(input: {
  ownerId: number;
  creatorId: number;
  evidenceId: string;
  sourceMediaUrl: string;
  prompt: string;
}): Promise<ControlledAccessAttemptResult> {
  if (!OWNER_IDS.has(Number(input.ownerId))) throw new Error("Owner approval is required for a controlled provider access attempt.");
  const preflight = await preflightBodyCinemaSourceVideo({ creatorId: input.creatorId, evidenceId: input.evidenceId, sourceMediaUrl: input.sourceMediaUrl });
  if (preflight.status !== "access_attempt_ready") throw new Error(`Controlled access is blocked: ${preflight.blockingReasons.join(" ")}`);
  const candidate = preflight.candidates[0];
  if (!candidate) throw new Error("No schema-compatible source-video candidate remains for this account.");
  const ladderSpec = CONTROLLED_SOURCE_VIDEO_LADDER.find((item) => item.modelKey === candidate.modelKey);
  if (!ladderSpec) throw new Error("Controlled candidate is not part of the documented source-video ladder.");
  const balanceBefore = await readPolloBalance();
  const apiKey = String(process.env.POLLO_API_KEY || "").trim();
  const response = await fetch(`https://pollo.ai/api/platform${ladderSpec.providerApiPath}`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json", "X-CreatorVault-Controlled-Attempt": randomUUID() },
    body: JSON.stringify(buildControlledSourceVideoRequest(ladderSpec, preflight.sourceMediaUrl, input.prompt)),
  });
  const providerResponse = await fetchJsonResponse(response);
  const taskId = String((providerResponse as any)?.data?.taskId || (providerResponse as any)?.taskId || "").trim() || null;
  if (taskId) {
    await recordControlledModelAccessOutcome({ ownerId: input.ownerId, modelKey: candidate.modelKey, accessState: "available", balanceBeforeCredits: balanceBefore.availableCredits, providerTaskId: taskId, metadata: { evidenceId: input.evidenceId, sourceFingerprint: preflight.sourceFingerprint, providerResponse } });
    return { outcome: "task_created", model: candidate, balanceBefore, balanceAfter: null, providerTaskId: taskId, providerResponse, message: "Provider created a real task. Discovery must stop." };
  }
  const needsPostBalance = response.status === 403 || response.status === 400 || response.status === 401 || response.status === 402;
  const balanceAfter = needsPostBalance ? await readPolloBalance() : null;
  const balanceChanged = balanceAfter !== null && balanceAfter.availableCredits !== balanceBefore.availableCredits;
  if (balanceChanged) {
    await recordControlledModelAccessOutcome({ ownerId: input.ownerId, modelKey: candidate.modelKey, accessState: "unknown", failureReason: `Provider returned HTTP ${response.status} and balance changed without task ID.`, balanceBeforeCredits: balanceBefore.availableCredits, balanceAfterCredits: balanceAfter.availableCredits, metadata: { providerResponse, creditIncident: true } });
    return { outcome: "balance_incident", model: candidate, balanceBefore, balanceAfter, providerTaskId: null, providerResponse, message: "Balance changed without a provider task; discovery stopped and a credit incident was recorded." };
  }
  const detail = safeError(isObject(providerResponse) ? providerResponse.message || providerResponse.code || `HTTP ${response.status}` : `HTTP ${response.status}`);
  if (response.status === 403) {
    await recordControlledModelAccessOutcome({ ownerId: input.ownerId, modelKey: candidate.modelKey, accessState: "unavailable", failureReason: detail, balanceBeforeCredits: balanceBefore.availableCredits, balanceAfterCredits: balanceAfter?.availableCredits ?? null, metadata: { providerResponse, noTaskId: true } });
    return { outcome: "model_unavailable_no_charge", model: candidate, balanceBefore, balanceAfter, providerTaskId: null, providerResponse, message: "Model was unavailable for this API key with no task and no observed balance change." };
  }
  const outcome = response.status === 400 ? "invalid_parameters" : response.status === 401 ? "invalid_key" : "insufficient_balance";
  await recordControlledModelAccessOutcome({ ownerId: input.ownerId, modelKey: candidate.modelKey, accessState: "unknown", failureReason: detail, balanceBeforeCredits: balanceBefore.availableCredits, balanceAfterCredits: balanceAfter?.availableCredits ?? null, metadata: { providerResponse, noTaskId: true } });
  return { outcome, model: candidate, balanceBefore, balanceAfter, providerTaskId: null, providerResponse, message: detail };
}

async function fetchJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text().catch(() => "");
  try { const parsed = JSON.parse(text || "{}"); return isObject(parsed) ? parsed : { responseText: text.slice(0, 800) }; }
  catch { return { responseText: text.slice(0, 800) }; }
}

export type ControlledSourceVideoTaskSettlement = {
  taskId: string;
  modelKey: string;
  status: "processing" | "succeed" | "failed";
  providerOutputUrl: string | null;
  durableOutputUrl: string | null;
  balanceBeforeCredits: number;
  balanceAfterCredits: number;
  actualCostCredits: number;
  providerResponse: Record<string, unknown>;
};

export async function settleControlledSourceVideoTask(input: {
  ownerId: number;
  taskId: string;
  durableOutputUrl: string;
}): Promise<ControlledSourceVideoTaskSettlement> {
  if (!OWNER_IDS.has(Number(input.ownerId))) throw new Error("Owner approval is required to settle a controlled provider task.");
  if (!/^https:\/\/creatorvault\.live\/uploads\/content-vault\//i.test(input.durableOutputUrl)) {
    throw new Error("Controlled task settlement requires a durable CreatorVault output URL.");
  }
  await ensurePolloCapabilityRegistrySchema();
  const rows = await rawQuery<any>(
    "SELECT * FROM provider_model_access_memory WHERE provider = 'pollo' AND account_scope = ? AND provider_task_id = ? LIMIT 1",
    [`owner:${input.ownerId}`, input.taskId],
  );
  const record = rows[0];
  if (!record) throw new Error("No controlled provider task record exists for this task ID.");
  const balanceBeforeCredits = readNumeric(record.balance_before_credits);
  if (balanceBeforeCredits === null) throw new Error("The controlled task record has no verified balance-before value.");
  const apiKey = String(process.env.POLLO_API_KEY || "").trim();
  if (!apiKey) throw new Error("POLLO_API_KEY is not configured; task settlement cannot check provider status.");
  const response = await fetch(`${POLLO_PLATFORM_BASE}/generation/${encodeURIComponent(input.taskId)}/status`, {
    method: "GET",
    headers: { "x-api-key": apiKey, Accept: "application/json" },
  });
  const providerResponse = await fetchJsonResponse(response);
  if (!response.ok) throw new Error(`Pollo task status returned ${response.status}: ${safeError((providerResponse as any).message || (providerResponse as any).responseText || "unknown error")}`);
  const generation = isObject((providerResponse as any).data) && Array.isArray(((providerResponse as any).data as any).generations)
    ? ((providerResponse as any).data as any).generations[0]
    : null;
  const rawStatus = String((generation as any)?.status || (providerResponse as any)?.data?.status || "processing").toLowerCase();
  const status: ControlledSourceVideoTaskSettlement["status"] = rawStatus === "succeed" ? "succeed" : rawStatus === "failed" ? "failed" : "processing";
  const providerOutputUrl = typeof (generation as any)?.url === "string" && (generation as any).url ? String((generation as any).url) : null;
  const balanceAfter = await readPolloBalance();
  const actualCostCredits = Number(Math.max(0, balanceBeforeCredits - balanceAfter.availableCredits).toFixed(4));
  const priorMetadata = parseJson<Record<string, unknown>>(record.metadata_json, {});
  const metadata = {
    ...priorMetadata,
    sourceVideoTaskSettlement: {
      settledAt: new Date().toISOString(),
      status,
      providerOutputUrl,
      durableOutputUrl: input.durableOutputUrl,
      balanceBeforeCredits,
      balanceAfterCredits: balanceAfter.availableCredits,
      actualCostCredits,
      providerResponse,
    },
  };
  await rawExec(
    `UPDATE provider_model_access_memory
     SET access_state = 'available', balance_after_credits = ?, failure_reason = NULL, metadata_json = ?, verified_at = NOW()
     WHERE id = ?`,
    [balanceAfter.availableCredits, safeJson(metadata), record.id],
  );
  return { taskId: input.taskId, modelKey: String(record.model_key), status, providerOutputUrl, durableOutputUrl: input.durableOutputUrl, balanceBeforeCredits, balanceAfterCredits: balanceAfter.availableCredits, actualCostCredits, providerResponse };
}

type VerifiedProviderVideo = {
  durationSeconds: number;
  width: number;
  height: number;
  sizeBytes: number;
};

async function inspectProviderVideo(filePath: string): Promise<VerifiedProviderVideo> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", filePath,
  ]);
  const parsed = parseJson<Record<string, any>>(stdout, {});
  const videoStream = Array.isArray(parsed.streams)
    ? parsed.streams.find((stream: any) => String(stream?.codec_type) === "video")
    : null;
  const durationSeconds = Number(parsed?.format?.duration);
  const width = Number(videoStream?.width);
  const height = Number(videoStream?.height);
  const fileStat = await stat(filePath);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || !Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0 || fileStat.size < 1024) {
    throw new Error("Provider result was not a readable video with duration and dimensions; it was not added to Media Vault.");
  }
  return { durationSeconds: Number(durationSeconds.toFixed(3)), width, height, sizeBytes: fileStat.size };
}

export async function ingestAndSettleControlledSourceVideoTask(input: {
  ownerId: number;
  taskId: string;
}): Promise<ControlledSourceVideoTaskSettlement & { mediaAssetId: string; verifiedVideo: VerifiedProviderVideo }> {
  if (!OWNER_IDS.has(Number(input.ownerId))) throw new Error("Owner approval is required to ingest a controlled provider task.");
  const apiKey = String(process.env.POLLO_API_KEY || "").trim();
  if (!apiKey) throw new Error("POLLO_API_KEY is not configured; completed provider output cannot be ingested.");
  const statusResponse = await fetch(`${POLLO_PLATFORM_BASE}/generation/${encodeURIComponent(input.taskId)}/status`, {
    method: "GET", headers: { "x-api-key": apiKey, Accept: "application/json" },
  });
  const providerResponse = await fetchJsonResponse(statusResponse);
  if (!statusResponse.ok) throw new Error(`Pollo task status returned ${statusResponse.status}; provider output was not ingested.`);
  const generation = isObject((providerResponse as any).data) && Array.isArray(((providerResponse as any).data as any).generations)
    ? ((providerResponse as any).data as any).generations[0]
    : null;
  const rawStatus = String((generation as any)?.status || (providerResponse as any)?.data?.status || "processing").toLowerCase();
  if (rawStatus !== "succeed") throw new Error(`Provider task is ${rawStatus}; CreatorVault will not ingest an unfinished or failed result.`);
  const providerOutputUrl = typeof (generation as any)?.url === "string" ? String((generation as any).url).trim() : "";
  if (!/^https:\/\//i.test(providerOutputUrl)) throw new Error("Provider marked the task complete without a readable HTTPS video URL.");

  const folder = `body-cinema-governed-${input.taskId.replace(/[^a-z0-9_-]/gi, "")}`;
  const filename = "Body-Cinema-Governed-Proof.mp4";
  const directory = path.join(DURABLE_CONTENT_VAULT_ROOT, folder);
  const localPath = path.join(directory, filename);
  const durableOutputUrl = `https://creatorvault.live/uploads/content-vault/${folder}/${filename}`;
  const existing = await rawQuery<any>("SELECT id FROM media_assets WHERE user_id = ? AND storage_path = ? LIMIT 1", [input.ownerId, durableOutputUrl]);
  let mediaAssetId = existing[0] ? String(existing[0].id) : randomUUID();
  let verifiedVideo: VerifiedProviderVideo;
  if (existing[0]) {
    verifiedVideo = await inspectProviderVideo(localPath);
  } else {
    await mkdir(directory, { recursive: true });
    try {
      const outputResponse = await fetch(providerOutputUrl);
      if (!outputResponse.ok || !outputResponse.body) throw new Error(`Provider output download returned ${outputResponse.status}.`);
      const declaredLength = Number(outputResponse.headers.get("content-length") || 0);
      if (declaredLength > MAX_PROVIDER_OUTPUT_BYTES) throw new Error("Provider output exceeded the governed Media Vault size limit.");
      const bytes = new Uint8Array(await outputResponse.arrayBuffer());
      if (bytes.byteLength < 1024 || bytes.byteLength > MAX_PROVIDER_OUTPUT_BYTES) throw new Error("Provider output size failed the governed Media Vault safety limit.");
      await writeFile(localPath, bytes);
      verifiedVideo = await inspectProviderVideo(localPath);
      await rawExec(
        `INSERT INTO media_assets
          (id, user_id, source_type, asset_type, file_name, original_name, mime_type, file_size, storage_path, public_url, thumbnail_url, duration, width, height, status, created_by_feature)
         VALUES (?, ?, 'generated', 'video', ?, ?, 'video/mp4', ?, ?, ?, ?, ?, ?, ?, 'ready', 'body_cinema_governed_provider')`,
        [mediaAssetId, input.ownerId, filename, filename, verifiedVideo.sizeBytes, durableOutputUrl, durableOutputUrl, durableOutputUrl, verifiedVideo.durationSeconds, verifiedVideo.width, verifiedVideo.height],
      );
    } catch (error) {
      await unlink(localPath).catch(() => undefined);
      throw error;
    }
  }
  const settlement = await settleControlledSourceVideoTask({ ownerId: input.ownerId, taskId: input.taskId, durableOutputUrl });
  return { ...settlement, mediaAssetId, verifiedVideo };
}

export async function reviewIngestedControlledSourceVideoTask(input: {
  ownerId: number;
  evidenceId: string;
  taskId: string;
}): Promise<{ outputAssetUrl: string; outputFingerprint: string; frameCount: number; review: Awaited<ReturnType<typeof reviewBodyCinemaOutput>> }> {
  if (!OWNER_IDS.has(Number(input.ownerId))) throw new Error("Owner approval is required to review a controlled provider output.");
  const folder = `body-cinema-governed-${input.taskId.replace(/[^a-z0-9_-]/gi, "")}`;
  const filename = "Body-Cinema-Governed-Proof.mp4";
  const localPath = path.join(DURABLE_CONTENT_VAULT_ROOT, folder, filename);
  const outputAssetUrl = `https://creatorvault.live/uploads/content-vault/${folder}/${filename}`;
  const video = await probeVideo(localPath);
  const bytes = await readFile(localPath);
  const outputFingerprint = createHash("sha256").update(bytes).digest("hex");
  const frameEvidence = await buildFrameEvidence(localPath, video);
  const review = await reviewBodyCinemaOutput(input.ownerId, {
    evidenceId: input.evidenceId,
    outputAssetUrl,
    outputFingerprint,
    frameEvidence,
  });
  return { outputAssetUrl, outputFingerprint, frameCount: frameEvidence.length, review };
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
  if (!snapshot) blockingReasons.push("No read-only provider capability audit has been recorded.");
  if (snapshot && snapshot.account.balance.state !== "available") {
    blockingReasons.push("Pollo balance could not be read, so CreatorVault will not start a controlled access attempt.");
  }
  const catalogKeys = new Set((snapshot?.models || [])
    .filter((model) => model.supportsSourceVideoReference)
    .map((model) => model.modelKey));
  const memory = await getControlledModelAccessMemory(input.creatorId);
  const rejectedCandidates = CONTROLLED_SOURCE_VIDEO_LADDER
    .filter((candidate) => REJECTED_SOURCE_VIDEO_MODELS.has(candidate.modelKey));
  const contractIncompatibleCandidates = CONTROLLED_SOURCE_VIDEO_LADDER
    .filter((candidate) => CONTRACT_INCOMPATIBLE_SOURCE_VIDEO_MODELS.has(candidate.modelKey));
  const qualityExclusions = [
    ...(rejectedCandidates.length
      ? [`Recorded Body Cinema quality rejection excludes: ${rejectedCandidates.map((candidate) => candidate.modelKey).join(", ")}.`]
      : []),
    ...(contractIncompatibleCandidates.length
      ? [`Recorded provider-contract exclusion: ${contractIncompatibleCandidates.map((candidate) => candidate.modelKey).join(", ")}.`]
      : []),
  ];
  const candidates: ControlledSourceVideoCandidate[] = CONTROLLED_SOURCE_VIDEO_LADDER
    .filter((candidate) => catalogKeys.has(candidate.modelKey))
    .filter((candidate) => !REJECTED_SOURCE_VIDEO_MODELS.has(candidate.modelKey))
    .filter((candidate) => !CONTRACT_INCOMPATIBLE_SOURCE_VIDEO_MODELS.has(candidate.modelKey))
    .map((candidate) => {
      const learning = memory.get(candidate.modelKey);
      const accessState = String(learning?.access_state || "unknown") as ControlledModelAccessState;
      return {
        ...candidate,
      durationSeconds: candidate.durationSeconds,
      resolution: candidate.resolution,
      aspectRatio: candidate.aspectRatio,
      priceStatus: "price_not_yet_returned" as const,
        accountAccess: accessState,
        lastVerifiedAt: learning?.verified_at ? String(learning.verified_at) : null,
        failureReason: learning?.failure_reason ? String(learning.failure_reason) : null,
      };
    })
    .filter((candidate) => candidate.accountAccess !== "unavailable");
  if (!candidates.length) blockingReasons.push("No schema-compatible source-video model remains eligible after account-access and Body Cinema quality-rejection controls.");

  return {
    evidenceId: evidenceContext.evidence.id,
    sourceMediaUrl: evidenceContext.evidence.sourceMediaUrl,
    sourceFingerprint: evidenceContext.evidence.sourceFingerprint,
    selectedDirectionId: evidenceContext.direction.id,
    status: blockingReasons.length ? "blocked" : "access_attempt_ready",
    candidates,
    blockingReasons,
    qualityExclusions,
    requiredBeforeSubmission: [
      "verified_source_evidence",
      "approved_evidence_backed_treatment",
      "model_capability_match",
      "balance_before_access_attempt",
      "documented_model_contract_match",
      "idempotent_controlled_access_attempt",
      "balance_after_rejection_verification",
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
  readOnlyModelEntitlementRequired: false,
  controlledAccessLadderRequired: true,
} as const;
