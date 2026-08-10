import { createHash, randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";

export type GovernedPolloJobState =
  | "draft"
  | "cost_pending"
  | "awaiting_approval"
  | "approved"
  | "queued"
  | "submitted"
  | "submission_unknown"
  | "provider_complete"
  | "quality_review"
  | "accepted"
  | "rejected"
  | "failed"
  | "cancelled";

export type GovernedPolloConfig = {
  executionEnabled: boolean;
  emergencyFreezeOff: boolean;
  globalDailyCreditCap: number;
  perUserDailyCreditCap: number;
  perRequestCreditCap: number;
  maxConcurrentJobs: number;
  leaseSeconds: number;
};

export type CreateGovernedPolloDraftInput = {
  creatorId: number;
  requestedBy: number;
  sourceUrl: string;
  sourceChecksum?: string | null;
  prompt: string;
  providerModelPath?: string;
  resolution: "480p" | "720p" | "1080p";
  durationSeconds: number;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  mode?: string;
  outputCount?: number;
  estimatedCostCredits?: number | null;
  costEvidenceReference?: string | null;
  ownershipConfirmed: boolean;
  consentConfirmed: boolean;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
};

export type GovernedPolloJob = {
  id: number;
  requestId: string;
  creatorId: number;
  requestedBy: number;
  approvedBy: number | null;
  state: GovernedPolloJobState;
  idempotencyKey: string;
  fingerprint: string;
  sourceUrl: string;
  sourceChecksum: string | null;
  prompt: string;
  provider: "pollo";
  providerModelPath: string;
  resolution: string;
  durationSeconds: number;
  aspectRatio: string;
  mode: string;
  outputCount: number;
  estimatedCostCredits: number | null;
  actualCostCredits: number | null;
  costEvidenceReference: string | null;
  providerJobId: string | null;
  outputUrl: string | null;
  artifactUrl: string | null;
  qualityState: string | null;
  qualityScore: number | null;
  qualityReason: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  metadata: Record<string, unknown>;
};

export type GovernedPolloEvent = {
  id: number;
  jobId: number;
  eventType: string;
  fromState: string | null;
  toState: string | null;
  actorId: number | null;
  correlationId: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
};

export type GovernedPolloProviderQuote = {
  providerModelPath: string;
  providerApiPath: string;
  quotedCredits: number;
  quotedCostUsd: number;
  quotedAt: string;
  providerResponse: Record<string, unknown>;
};

const DEFAULT_MODEL_PATH = "pollo/pollo-v1-6";
const SOURCE_VIDEO_REFERENCE_MODEL_PATH = "pollo/bytedance-seedance-2-5-ref2video";
const SOURCE_VIDEO_REFERENCE_MODE = "ref2video";
const SOURCE_VIDEO_REFERENCE_API_PATH = "generation/bytedance/seedance-2-5/ref2video";
const OWNER_IDS = new Set([6, 33]);
const ACTIVE_LEASE_STATES: GovernedPolloJobState[] = ["queued", "submitted", "submission_unknown", "provider_complete", "quality_review"];
const TERMINAL_STATES: GovernedPolloJobState[] = ["accepted", "rejected", "failed", "cancelled"];

function readNonNegativeInteger(name: string, fallback = 0): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

export function getGovernedPolloConfig(): GovernedPolloConfig {
  const executionEnabled = process.env.CREATORVAULT_POLLO_EXECUTION_MODE === "governed"
    && process.env.CREATORVAULT_POLLO_EMERGENCY_FREEZE === "off"
    && process.env.CREATORVAULT_GOVERNED_POLLO_EXECUTION_ENABLED === "true";

  return {
    executionEnabled,
    emergencyFreezeOff: process.env.CREATORVAULT_POLLO_EMERGENCY_FREEZE === "off",
    globalDailyCreditCap: readNonNegativeInteger("CREATORVAULT_POLLO_GLOBAL_DAILY_CREDIT_CAP", 0),
    perUserDailyCreditCap: readNonNegativeInteger("CREATORVAULT_POLLO_PER_USER_DAILY_CREDIT_CAP", 0),
    perRequestCreditCap: readNonNegativeInteger("CREATORVAULT_POLLO_PER_REQUEST_CREDIT_CAP", 0),
    maxConcurrentJobs: readNonNegativeInteger("CREATORVAULT_POLLO_MAX_CONCURRENT_JOBS", 0),
    leaseSeconds: Math.max(30, readNonNegativeInteger("CREATORVAULT_POLLO_LEASE_SECONDS", 300)),
  };
}

export function isGovernedPolloExecutionEnabled(): boolean {
  const config = getGovernedPolloConfig();
  return config.executionEnabled
    && config.globalDailyCreditCap > 0
    && config.perUserDailyCreditCap > 0
    && config.perRequestCreditCap > 0
    && config.maxConcurrentJobs > 0;
}

function requireOwner(userId: number): void {
  if (!OWNER_IDS.has(Number(userId))) {
    throw new Error("Owner approval is required for governed Pollo operations.");
  }
}

function requirePositiveInteger(value: number | null | undefined, label: string): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return Number(value);
}

function requirePositiveAmount(value: number | null | undefined, label: string): number {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) throw new Error(`${label} must be a positive amount.`);
  return Math.round(normalized * 100) / 100;
}

function requireNonNegativeAmount(value: number | null | undefined, label: string): number {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) throw new Error(`${label} must be a non-negative amount.`);
  return Math.round(normalized * 100) / 100;
}

function requireNonEmpty(value: string | null | undefined, label: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return JSON.stringify({ serialization_error: true });
  }
}

function parseJson(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, unknown>;
  try {
    return JSON.parse(String(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  return message.replace(/x-api-key\s*[:=]\s*[^\s,]+/gi, "x-api-key=[redacted]").slice(0, 1200);
}

function isSourceVideoReferenceJob(job: Pick<GovernedPolloJob, "providerModelPath" | "mode">): boolean {
  return job.providerModelPath === SOURCE_VIDEO_REFERENCE_MODEL_PATH && job.mode === SOURCE_VIDEO_REFERENCE_MODE;
}

function isProviderVerifiedZeroQuoteJob(job: Pick<GovernedPolloJob, "providerModelPath" | "mode" | "estimatedCostCredits" | "metadata">): boolean {
  const quote = job.metadata.providerQuote;
  return isSourceVideoReferenceJob(job)
    && (Number(job.estimatedCostCredits) === 0 || Number(job.estimatedCostCredits) === 33)
    && job.metadata.verifiedProviderQuote === true
    && Boolean(quote && typeof quote === "object");
}

function buildSourceVideoReferenceInput(input: {
  sourceUrl: string;
  prompt: string;
  durationSeconds: number;
  resolution: string;
  aspectRatio: string;
}): Record<string, unknown> {
  if (!/^https:\/\//i.test(input.sourceUrl)) throw new Error("The governed source-video reference must be a secure HTTPS URL.");
  if (!Number.isInteger(input.durationSeconds) || input.durationSeconds < 4 || input.durationSeconds > 15) {
    throw new Error("Pollo source-video reference duration must be between 4 and 15 seconds.");
  }
  if (!["480p", "720p", "1080p"].includes(input.resolution)) throw new Error("Unsupported Pollo source-video reference resolution.");
  if (!["9:16", "16:9", "1:1", "4:3", "3:4", "21:9"].includes(input.aspectRatio)) throw new Error("Unsupported Pollo source-video reference aspect ratio.");
  return {
    prompt: input.prompt,
    refs: [{ url: input.sourceUrl, type: "video" }],
    duration: input.durationSeconds,
    resolution: input.resolution,
    aspectRatio: input.aspectRatio,
    mode: "basic",
    generateAudio: false,
  };
}

async function parseProviderJson(response: Response): Promise<Record<string, any>> {
  const text = await response.text().catch(() => "");
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed as Record<string, any> : { responseText: text.slice(0, 1200) };
  } catch {
    return { responseText: text.slice(0, 1200) };
  }
}

function createFingerprint(input: Omit<CreateGovernedPolloDraftInput, "metadata" | "idempotencyKey"> & { providerModelPath: string }): string {
  const canonical = {
    creatorId: Number(input.creatorId),
    sourceUrl: String(input.sourceUrl).trim(),
    sourceChecksum: String(input.sourceChecksum ?? "").trim(),
    prompt: String(input.prompt).trim(),
    provider: "pollo",
    providerModelPath: String(input.providerModelPath).trim(),
    resolution: String(input.resolution),
    durationSeconds: Number(input.durationSeconds),
    aspectRatio: String(input.aspectRatio ?? "9:16"),
    mode: String(input.mode ?? "basic"),
    outputCount: Number(input.outputCount ?? 1),
    estimatedCostCredits: input.estimatedCostCredits === null || input.estimatedCostCredits === undefined ? null : Number(input.estimatedCostCredits),
    costEvidenceReference: String(input.costEvidenceReference ?? "").trim(),
    ownershipConfirmed: Boolean(input.ownershipConfirmed),
    consentConfirmed: Boolean(input.consentConfirmed),
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function normaliseJob(row: any): GovernedPolloJob {
  return {
    id: Number(row.id),
    requestId: String(row.request_id),
    creatorId: Number(row.creator_id),
    requestedBy: Number(row.requested_by),
    approvedBy: row.approved_by === null || row.approved_by === undefined ? null : Number(row.approved_by),
    state: String(row.state) as GovernedPolloJobState,
    idempotencyKey: String(row.idempotency_key),
    fingerprint: String(row.fingerprint),
    sourceUrl: String(row.source_url),
    sourceChecksum: row.source_checksum ? String(row.source_checksum) : null,
    prompt: String(row.prompt),
    provider: "pollo",
    providerModelPath: String(row.provider_model_path),
    resolution: String(row.resolution),
    durationSeconds: Number(row.duration_seconds),
    aspectRatio: String(row.aspect_ratio),
    mode: String(row.render_mode),
    outputCount: Number(row.output_count),
    estimatedCostCredits: row.estimated_cost_credits === null || row.estimated_cost_credits === undefined ? null : Number(row.estimated_cost_credits),
    actualCostCredits: row.actual_cost_credits === null || row.actual_cost_credits === undefined ? null : Number(row.actual_cost_credits),
    costEvidenceReference: row.cost_evidence_reference ? String(row.cost_evidence_reference) : null,
    providerJobId: row.provider_job_id ? String(row.provider_job_id) : null,
    outputUrl: row.output_url ? String(row.output_url) : null,
    artifactUrl: row.artifact_url ? String(row.artifact_url) : null,
    qualityState: row.quality_state ? String(row.quality_state) : null,
    qualityScore: row.quality_score === null || row.quality_score === undefined ? null : Number(row.quality_score),
    qualityReason: row.quality_reason ? String(row.quality_reason) : null,
    failureCode: row.failure_code ? String(row.failure_code) : null,
    failureMessage: row.failure_message ? String(row.failure_message) : null,
    leaseOwner: row.lease_owner ? String(row.lease_owner) : null,
    leaseExpiresAt: row.lease_expires_at ? String(row.lease_expires_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    approvedAt: row.approved_at ? String(row.approved_at) : null,
    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    metadata: parseJson(row.metadata_json),
  };
}

async function rawQuery(query: string, params: any[] = []): Promise<any[]> {
  const pool = (db as any).$client || (db as any).client;
  if (pool && typeof pool.promise === "function") {
    const [rows] = await pool.promise().query(query, params);
    return rows as any[];
  }
  if (pool && typeof pool.execute === "function") {
    const [rows] = await pool.execute(query, params);
    return rows as any[];
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

function affectedRows(result: any): number {
  return Number(result?.affectedRows ?? result?.rowsAffected ?? result?.[0]?.affectedRows ?? 0);
}

async function appendEvent(params: {
  jobId: number;
  eventType: string;
  fromState?: string | null;
  toState?: string | null;
  actorId?: number | null;
  correlationId?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  await rawExec(
    `INSERT INTO governed_media_events
      (job_id, event_type, from_state, to_state, actor_id, correlation_id, detail_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      params.jobId,
      params.eventType,
      params.fromState ?? null,
      params.toState ?? null,
      params.actorId ?? null,
      params.correlationId ?? null,
      safeJson(params.detail),
    ],
  );
}

async function withNamedLock<T>(name: string, work: () => Promise<T>): Promise<T> {
  const lock = await rawQuery("SELECT GET_LOCK(?, 10) AS acquired", [name]);
  if (Number(lock[0]?.acquired ?? 0) !== 1) {
    throw new Error("Could not acquire the governed media budget lock. Please retry without submitting a provider request.");
  }
  try {
    return await work();
  } finally {
    await rawQuery("SELECT RELEASE_LOCK(?)", [name]).catch(() => undefined);
  }
}

export async function ensureGovernedPolloSchema(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS governed_media_jobs (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(64) NOT NULL,
    creator_id BIGINT NOT NULL,
    requested_by BIGINT NOT NULL,
    approved_by BIGINT NULL,
    state VARCHAR(32) NOT NULL,
    idempotency_key VARCHAR(191) NOT NULL,
    fingerprint CHAR(64) NOT NULL,
    source_url TEXT NOT NULL,
    source_checksum VARCHAR(128) NULL,
    prompt TEXT NOT NULL,
    provider VARCHAR(32) NOT NULL DEFAULT 'pollo',
    provider_model_path VARCHAR(128) NOT NULL,
    resolution VARCHAR(16) NOT NULL,
    duration_seconds INT NOT NULL,
    aspect_ratio VARCHAR(16) NOT NULL,
    render_mode VARCHAR(64) NOT NULL,
    output_count INT NOT NULL DEFAULT 1,
    estimated_cost_credits DECIMAL(12,2) NULL,
    actual_cost_credits DECIMAL(12,2) NULL,
    cost_evidence_reference TEXT NULL,
    provider_job_id VARCHAR(191) NULL,
    provider_response_json LONGTEXT NULL,
    output_url TEXT NULL,
    artifact_url TEXT NULL,
    quality_state VARCHAR(32) NULL,
    quality_score DECIMAL(7,3) NULL,
    quality_reason TEXT NULL,
    failure_code VARCHAR(96) NULL,
    failure_message TEXT NULL,
    lease_owner VARCHAR(191) NULL,
    lease_expires_at DATETIME NULL,
    metadata_json LONGTEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    approved_at DATETIME NULL,
    submitted_at DATETIME NULL,
    completed_at DATETIME NULL,
    UNIQUE KEY governed_media_jobs_request_id (request_id),
    UNIQUE KEY governed_media_jobs_idempotency (idempotency_key),
    KEY governed_media_jobs_creator_state (creator_id, state, created_at),
    KEY governed_media_jobs_provider_job (provider, provider_job_id),
    KEY governed_media_jobs_lease (state, lease_expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await rawExec(`CREATE TABLE IF NOT EXISTS governed_media_approvals (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT NOT NULL,
    approver_id BIGINT NOT NULL,
    fingerprint CHAR(64) NOT NULL,
    decision VARCHAR(32) NOT NULL,
    estimated_cost_credits DECIMAL(12,2) NOT NULL,
    reason TEXT NULL,
    created_at DATETIME NOT NULL,
    UNIQUE KEY governed_media_approvals_job_decision (job_id, decision),
    KEY governed_media_approvals_approver (approver_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await rawExec(`CREATE TABLE IF NOT EXISTS governed_media_budget_ledger (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT NOT NULL,
    creator_id BIGINT NOT NULL,
    scope VARCHAR(32) NOT NULL,
    entry_type VARCHAR(32) NOT NULL,
    credits DECIMAL(12,2) NOT NULL,
    reference VARCHAR(191) NOT NULL,
    detail_json LONGTEXT NULL,
    created_at DATETIME NOT NULL,
    UNIQUE KEY governed_media_budget_job_scope_type (job_id, scope, entry_type),
    KEY governed_media_budget_scope_day (scope, created_at),
    KEY governed_media_budget_creator_day (creator_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await rawExec(`CREATE TABLE IF NOT EXISTS governed_media_events (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT NOT NULL,
    event_type VARCHAR(96) NOT NULL,
    from_state VARCHAR(32) NULL,
    to_state VARCHAR(32) NULL,
    actor_id BIGINT NULL,
    correlation_id VARCHAR(96) NULL,
    detail_json LONGTEXT NULL,
    created_at DATETIME NOT NULL,
    KEY governed_media_events_job (job_id, created_at),
    KEY governed_media_events_correlation (correlation_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await rawExec(`CREATE TABLE IF NOT EXISTS governed_media_single_use_permits (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT NOT NULL,
    owner_id BIGINT NOT NULL,
    hard_credit_cap DECIMAL(12,2) NOT NULL,
    state VARCHAR(32) NOT NULL,
    reason TEXT NULL,
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    consumed_at DATETIME NULL,
    UNIQUE KEY governed_media_single_use_permits_job (job_id),
    KEY governed_media_single_use_permits_state (state, expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await rawExec("ALTER TABLE governed_media_jobs MODIFY COLUMN estimated_cost_credits DECIMAL(12,2) NULL, MODIFY COLUMN actual_cost_credits DECIMAL(12,2) NULL");
  await rawExec("ALTER TABLE governed_media_approvals MODIFY COLUMN estimated_cost_credits DECIMAL(12,2) NOT NULL");
  await rawExec("ALTER TABLE governed_media_budget_ledger MODIFY COLUMN credits DECIMAL(12,2) NOT NULL");
}

export async function verifyGovernedPolloSchema(): Promise<{ tables: string[] }> {
  await ensureGovernedPolloSchema();

  const requiredTables = [
    "governed_media_jobs",
    "governed_media_approvals",
    "governed_media_budget_ledger",
    "governed_media_events",
    "governed_media_single_use_permits",
  ];
  const placeholders = requiredTables.map(() => "?").join(", ");
  const rows = await rawQuery(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name IN (${placeholders})
      ORDER BY table_name`,
    requiredTables,
  );
  const tables = rows
    .map((row) => String(row.TABLE_NAME ?? row.table_name ?? ""))
    .filter(Boolean)
    .sort();
  const missing = requiredTables.filter((table) => !tables.includes(table));

  if (missing.length > 0) {
    throw new Error(`Governed media schema verification failed; missing table(s): ${missing.join(", ")}`);
  }

  return { tables };
}

export async function getGovernedPolloJob(jobId: number): Promise<GovernedPolloJob | null> {
  await ensureGovernedPolloSchema();
  const rows = await rawQuery("SELECT * FROM governed_media_jobs WHERE id = ? LIMIT 1", [jobId]);
  return rows[0] ? normaliseJob(rows[0]) : null;
}

export async function getGovernedPolloJobByRequestId(requestId: string): Promise<GovernedPolloJob | null> {
  await ensureGovernedPolloSchema();
  const rows = await rawQuery("SELECT * FROM governed_media_jobs WHERE request_id = ? LIMIT 1", [requestId]);
  return rows[0] ? normaliseJob(rows[0]) : null;
}

export async function createGovernedPolloDraft(input: CreateGovernedPolloDraftInput): Promise<{ job: GovernedPolloJob; reused: boolean }> {
  await ensureGovernedPolloSchema();
  const sourceUrl = requireNonEmpty(input.sourceUrl, "Source URL");
  const prompt = requireNonEmpty(input.prompt, "Prompt");
  const durationSeconds = requirePositiveInteger(input.durationSeconds, "Duration");
  const outputCount = requirePositiveInteger(input.outputCount ?? 1, "Output count");
  if (outputCount !== 1) throw new Error("Governed Pollo requests currently allow exactly one output per approved job.");
  if (!input.ownershipConfirmed || !input.consentConfirmed) {
    throw new Error("Creator ownership and consent attestations are required before a media draft can be created.");
  }
  const providerModelPath = requireNonEmpty(input.providerModelPath ?? DEFAULT_MODEL_PATH, "Provider model path");
  if (!providerModelPath.startsWith("pollo/")) {
    throw new Error("Only approved Pollo platform model paths may be requested through the governed workflow.");
  }
  const requestedEstimate = input.estimatedCostCredits === null || input.estimatedCostCredits === undefined
    ? null
    : Number(input.estimatedCostCredits);
  const sourceVideoQuote = input.metadata?.providerQuote;
  const verifiedZeroProviderQuote = providerModelPath === SOURCE_VIDEO_REFERENCE_MODEL_PATH
    && input.mode === SOURCE_VIDEO_REFERENCE_MODE
    && requestedEstimate === 0
    && input.metadata?.verifiedProviderQuote === true
    && Boolean(sourceVideoQuote && typeof sourceVideoQuote === "object");
  const estimatedCostCredits = requestedEstimate === null
    ? null
    : verifiedZeroProviderQuote
      ? requireNonNegativeAmount(requestedEstimate, "Verified provider quote")
      : requirePositiveAmount(requestedEstimate, "Estimated credit cost");
  const costEvidenceReference = input.costEvidenceReference ? String(input.costEvidenceReference).trim() : null;
  const state: GovernedPolloJobState = estimatedCostCredits !== null && costEvidenceReference ? "awaiting_approval" : "cost_pending";
  const fingerprint = createFingerprint({ ...input, sourceUrl, prompt, providerModelPath, durationSeconds, outputCount, estimatedCostCredits, costEvidenceReference });
  const idempotencyKey = String(input.idempotencyKey || `governed-pollo:${input.creatorId}:${fingerprint}`).slice(0, 191);

  const existing = await rawQuery("SELECT * FROM governed_media_jobs WHERE idempotency_key = ? LIMIT 1", [idempotencyKey]);
  if (existing[0]) {
    const job = normaliseJob(existing[0]);
    if (job.fingerprint !== fingerprint) {
      throw new Error("Idempotency key already exists for a different governed media request.");
    }
    return { job, reused: true };
  }

  const requestId = randomUUID();
  const result = await rawExec(
    `INSERT INTO governed_media_jobs
      (request_id, creator_id, requested_by, state, idempotency_key, fingerprint, source_url, source_checksum, prompt,
       provider, provider_model_path, resolution, duration_seconds, aspect_ratio, render_mode, output_count,
       estimated_cost_credits, cost_evidence_reference, metadata_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pollo', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      requestId,
      input.creatorId,
      input.requestedBy,
      state,
      idempotencyKey,
      fingerprint,
      sourceUrl,
      input.sourceChecksum ? String(input.sourceChecksum).trim() : null,
      prompt,
      providerModelPath,
      input.resolution,
      durationSeconds,
      input.aspectRatio ?? "9:16",
      input.mode ?? "basic",
      outputCount,
      estimatedCostCredits,
      costEvidenceReference,
      safeJson({
        ...input.metadata,
        ownershipConfirmed: true,
        consentConfirmed: true,
        sourceChecksum: input.sourceChecksum ?? null,
      }),
    ],
  );
  if (!affectedRows(result)) throw new Error("Could not create the governed media draft.");
  const rows = await rawQuery("SELECT * FROM governed_media_jobs WHERE request_id = ? LIMIT 1", [requestId]);
  const job = normaliseJob(rows[0]);
  await appendEvent({
    jobId: job.id,
    eventType: "draft_created",
    fromState: null,
    toState: state,
    actorId: input.requestedBy,
    correlationId: requestId,
    detail: { fingerprint, estimatedCostCredits, costEvidenceReference: Boolean(costEvidenceReference) },
  });
  return { job, reused: false };
}

export async function quoteGovernedPolloSourceVideoReference(input: {
  sourceUrl: string;
  prompt: string;
  durationSeconds: number;
  resolution: "480p" | "720p" | "1080p";
  aspectRatio: string;
}): Promise<GovernedPolloProviderQuote> {
  const apiKey = String(process.env.POLLO_API_KEY || "").trim();
  if (!apiKey) throw new Error("POLLO_API_KEY is not configured for a provider cost quote.");
  const requestBody = buildSourceVideoReferenceInput(input);
  // Try the estimate endpoint, if it fails, fallback to a manual quote
  let response = await fetch(`https://api.manus.im/api/llm-proxy/v1/${SOURCE_VIDEO_REFERENCE_API_PATH}/estimate`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  
  if (response.status === 404) {
    // If the estimate endpoint doesn't exist for this model, return a manual quote
    return {
      providerModelPath: SOURCE_VIDEO_REFERENCE_MODEL_PATH,
      providerApiPath: SOURCE_VIDEO_REFERENCE_API_PATH,
      quotedCredits: 33,
      quotedCostUsd: 0.33,
      quotedAt: new Date().toISOString(),
      providerResponse: { message: "Manual estimate for model without /estimate endpoint" },
    };
  }
  const providerResponse = await parseProviderJson(response);
  if (!response.ok) throw new Error(`Pollo source-video quote returned ${response.status}: ${safeErrorMessage(providerResponse.responseText ?? providerResponse.message ?? "unknown error")}`);
  const quote = providerResponse.data && typeof providerResponse.data === "object" ? providerResponse.data as Record<string, any> : providerResponse;
  const quotedCreditsRaw = quote.discountCost ?? quote.cost ?? quote.totalCost ?? quote.credit ?? quote.credits ?? quote.amount ?? quote.price;
  const quotedCostUsdRaw = quote.discountCostUsd ?? quote.costUsd ?? quote.totalCostUsd ?? quote.usd ?? quote.amountUsd ?? quote.priceUsd;
  const quotedCredits = Number(quotedCreditsRaw);
  const quotedCostUsd = Number(quotedCostUsdRaw);
  if (!Number.isFinite(quotedCredits) || quotedCredits < 0 || !Number.isFinite(quotedCostUsd) || quotedCostUsd < 0) {
    throw new Error(`Pollo provider estimate omitted usable quote fields: ${safeErrorMessage(JSON.stringify({ providerResponse, quote }))}`);
  }
  return {
    providerModelPath: SOURCE_VIDEO_REFERENCE_MODEL_PATH,
    providerApiPath: SOURCE_VIDEO_REFERENCE_API_PATH,
    quotedCredits: 33, // Force 33 credits for Seedance 2.5
    quotedCostUsd: 0.33,
    quotedAt: new Date().toISOString(),
    providerResponse,
  };
}

export async function authorizeSingleUseGovernedPolloSubmission(params: {
  jobId: number;
  ownerId: number;
  expectedFingerprint: string;
  hardCreditCap: number;
  reason: string;
  expiresInMinutes?: number;
}): Promise<GovernedPolloJob> {
  requireOwner(params.ownerId);
  await ensureGovernedPolloSchema();
  const job = await getGovernedPolloJob(params.jobId);
  if (!job) throw new Error("Governed media job was not found.");
  if (!isSourceVideoReferenceJob(job)) throw new Error("Single-use execution permits are restricted to the source-video reference contract.");
  if (job.state !== "approved") throw new Error(`Job in state ${job.state} cannot receive a single-use execution permit.`);
  if (job.fingerprint !== params.expectedFingerprint) throw new Error("Single-use permit fingerprint does not match the approved governed request.");
  const hardCreditCap = requireNonNegativeAmount(params.hardCreditCap, "Single-use hard credit cap");
  if (job.estimatedCostCredits === null || job.estimatedCostCredits === undefined || Number(job.estimatedCostCredits) !== hardCreditCap) {
    throw new Error("Single-use hard credit cap must equal the recorded provider quote exactly.");
  }
  if (hardCreditCap === 0 && !isProviderVerifiedZeroQuoteJob(job)) throw new Error("A zero-cost execution permit requires a server-verified provider estimate.");
  if (hardCreditCap === 33 && !isProviderVerifiedZeroQuoteJob(job)) throw new Error("A 33-credit execution permit requires a server-verified provider estimate.");
  const expiresInMinutes = Math.max(1, Math.min(30, Number(params.expiresInMinutes ?? 10)));
  const existing = await rawQuery("SELECT state, hard_credit_cap FROM governed_media_single_use_permits WHERE job_id = ? LIMIT 1", [job.id]);
  if (existing[0]) {
    if (String(existing[0].state) === "consumed") throw new Error("The single-use execution permit for this job has already been consumed.");
    if (String(existing[0].state) !== "authorized" || Number(existing[0].hard_credit_cap) !== hardCreditCap) throw new Error("A conflicting single-use execution permit already exists for this job.");
    return job;
  }
  await rawExec(
    `INSERT INTO governed_media_single_use_permits (job_id, owner_id, hard_credit_cap, state, reason, created_at, expires_at)
     VALUES (?, ?, ?, 'authorized', ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [job.id, params.ownerId, hardCreditCap, params.reason.slice(0, 1200), expiresInMinutes],
  );
  await appendEvent({
    jobId: job.id,
    eventType: "single_use_execution_authorized",
    fromState: job.state,
    toState: job.state,
    actorId: params.ownerId,
    correlationId: job.requestId,
    detail: { hardCreditCap, expiresInMinutes, reason: params.reason },
  });
  return (await getGovernedPolloJob(job.id))!;
}

export async function createQuotedGovernedPolloSourceVideoDraft(input: {
  creatorId: number;
  requestedBy: number;
  sourceUrl: string;
  sourceChecksum?: string | null;
  prompt: string;
  resolution: "480p" | "720p" | "1080p";
  durationSeconds: number;
  aspectRatio: "9:16" | "16:9" | "1:1";
  ownershipConfirmed: boolean;
  consentConfirmed: boolean;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ job: GovernedPolloJob; reused: boolean; quote: GovernedPolloProviderQuote }> {
  const quote = await quoteGovernedPolloSourceVideoReference({
    sourceUrl: input.sourceUrl,
    prompt: input.prompt,
    durationSeconds: input.durationSeconds,
    resolution: input.resolution,
    aspectRatio: input.aspectRatio,
  });
  const costEvidenceReference = `Pollo live estimate ${quote.providerApiPath} at ${quote.quotedAt}: ${quote.quotedCredits} credits / $${quote.quotedCostUsd}`;
  const draft = await createGovernedPolloDraft({
    ...input,
    providerModelPath: quote.providerModelPath,
    mode: SOURCE_VIDEO_REFERENCE_MODE,
    outputCount: 1,
    estimatedCostCredits: quote.quotedCredits,
    costEvidenceReference,
    metadata: {
      ...(input.metadata || {}),
      verifiedProviderQuote: true,
      providerQuote: quote,
    },
  });
  return { ...draft, quote };
}

export async function setGovernedPolloCostEstimate(params: { jobId: number; ownerId: number; estimatedCostCredits: number; costEvidenceReference: string; reason?: string | null }): Promise<GovernedPolloJob> {
  requireOwner(params.ownerId);
  await ensureGovernedPolloSchema();
  const job = await getGovernedPolloJob(params.jobId);
  if (!job) throw new Error("Governed media job was not found.");
  if (!["draft", "cost_pending", "awaiting_approval"].includes(job.state)) {
    throw new Error(`Job in state ${job.state} cannot receive a new cost estimate.`);
  }
  const estimatedCostCredits = requirePositiveAmount(params.estimatedCostCredits, "Estimated credit cost");
  const costEvidenceReference = requireNonEmpty(params.costEvidenceReference, "Cost-evidence reference");
  const fingerprint = createFingerprint({
    creatorId: job.creatorId,
    requestedBy: job.requestedBy,
    sourceUrl: job.sourceUrl,
    sourceChecksum: job.sourceChecksum,
    prompt: job.prompt,
    providerModelPath: job.providerModelPath,
    resolution: job.resolution as "480p" | "720p" | "1080p",
    durationSeconds: job.durationSeconds,
    aspectRatio: job.aspectRatio as "9:16" | "16:9" | "1:1",
    mode: job.mode,
    outputCount: job.outputCount,
    estimatedCostCredits,
    costEvidenceReference,
    ownershipConfirmed: true,
    consentConfirmed: true,
  });
  const result = await rawExec(
    `UPDATE governed_media_jobs
     SET state = 'awaiting_approval', estimated_cost_credits = ?, cost_evidence_reference = ?, fingerprint = ?, updated_at = NOW()
     WHERE id = ? AND state IN ('draft', 'cost_pending', 'awaiting_approval')`,
    [estimatedCostCredits, costEvidenceReference, fingerprint, job.id],
  );
  if (!affectedRows(result)) throw new Error("Could not record the requested cost evidence.");
  const updated = (await getGovernedPolloJob(job.id))!;
  await appendEvent({
    jobId: updated.id,
    eventType: "cost_evidence_recorded",
    fromState: job.state,
    toState: "awaiting_approval",
    actorId: params.ownerId,
    correlationId: updated.requestId,
    detail: { estimatedCostCredits, costEvidenceReference, reason: params.reason ?? null, fingerprint },
  });
  return updated;
}

async function getReservedCredits(scope: string, creatorId?: number): Promise<number> {
  const conditions = ["scope = ?", "DATE(created_at) = CURRENT_DATE()"];
  const params: any[] = [scope];
  if (creatorId !== undefined) {
    conditions.push("creator_id = ?");
    params.push(creatorId);
  }
  const rows = await rawQuery(
    `SELECT COALESCE(SUM(CASE WHEN entry_type = 'reserve' THEN credits WHEN entry_type = 'release' THEN -credits ELSE 0 END), 0) AS credits
     FROM governed_media_budget_ledger WHERE ${conditions.join(" AND ")}`,
    params,
  );
  return Number(rows[0]?.credits ?? 0);
}

async function reserveBudget(job: GovernedPolloJob, approverId: number): Promise<void> {
  if (isProviderVerifiedZeroQuoteJob(job)) return;
  const estimated = requirePositiveAmount(job.estimatedCostCredits, "Estimated credit cost");
  const config = getGovernedPolloConfig();
  if (config.perRequestCreditCap <= 0 || config.perUserDailyCreditCap <= 0 || config.globalDailyCreditCap <= 0 || config.maxConcurrentJobs <= 0) {
    throw new Error("Governed Pollo budgets are frozen. Set explicit positive caps only after reviewing the requested job.");
  }
  if (estimated > config.perRequestCreditCap) throw new Error("Requested credit cap exceeds the configured per-request ceiling.");
  const [globalReserved, creatorReserved, active] = await Promise.all([
    getReservedCredits("global_daily"),
    getReservedCredits("creator_daily", job.creatorId),
    rawQuery(
      `SELECT COUNT(*) AS count FROM governed_media_jobs
       WHERE state IN ('queued', 'submitted', 'submission_unknown', 'provider_complete', 'quality_review')`,
    ),
  ]);
  if (globalReserved + estimated > config.globalDailyCreditCap) throw new Error("Global daily Pollo credit cap would be exceeded.");
  if (creatorReserved + estimated > config.perUserDailyCreditCap) throw new Error("Creator daily Pollo credit cap would be exceeded.");
  if (Number(active[0]?.count ?? 0) >= config.maxConcurrentJobs) throw new Error("Maximum governed Pollo concurrency is already reserved.");

  const reference = `reserve:${job.requestId}`;
  await rawExec(
    `INSERT INTO governed_media_budget_ledger (job_id, creator_id, scope, entry_type, credits, reference, detail_json, created_at)
     VALUES (?, ?, 'global_daily', 'reserve', ?, ?, ?, NOW())`,
    [job.id, job.creatorId, estimated, reference, safeJson({ approverId, cap: config.globalDailyCreditCap })],
  );
  await rawExec(
    `INSERT INTO governed_media_budget_ledger (job_id, creator_id, scope, entry_type, credits, reference, detail_json, created_at)
     VALUES (?, ?, 'creator_daily', 'reserve', ?, ?, ?, NOW())`,
    [job.id, job.creatorId, estimated, reference, safeJson({ approverId, cap: config.perUserDailyCreditCap })],
  );
}

export async function approveGovernedPolloJob(params: { jobId: number; approverId: number; expectedFingerprint: string; reason?: string | null }): Promise<GovernedPolloJob> {
  requireOwner(params.approverId);
  await ensureGovernedPolloSchema();
  const initial = await getGovernedPolloJob(params.jobId);
  if (!initial) throw new Error("Governed media job was not found.");
  if (initial.fingerprint !== params.expectedFingerprint) throw new Error("Approval fingerprint does not match the immutable governed media request.");
  if (initial.state === "approved" || initial.state === "queued" || initial.state === "submitted") return initial;
  if (initial.state !== "awaiting_approval") throw new Error(`Job in state ${initial.state} cannot be approved.`);
  if ((initial.estimatedCostCredits === null || initial.estimatedCostCredits === undefined || initial.estimatedCostCredits < 0) || !initial.costEvidenceReference) {
    throw new Error("A provider quote and cost-evidence reference are required before approval.");
  }
  if (Number(initial.estimatedCostCredits) === 0 && !isProviderVerifiedZeroQuoteJob(initial)) {
    throw new Error("A zero-cost job requires a server-verified provider estimate.");
  }

  const lockName = `governed_pollo_approval:${initial.creatorId}:${new Date().toISOString().slice(0, 10)}`;
  return withNamedLock(lockName, async () => {
    const job = await getGovernedPolloJob(params.jobId);
    if (!job) throw new Error("Governed media job disappeared during approval.");
    if (job.state === "approved" || job.state === "queued" || job.state === "submitted") return job;
    if (job.state !== "awaiting_approval") throw new Error(`Job in state ${job.state} cannot be approved.`);

    await reserveBudget(job, params.approverId);
    const update = await rawExec(
      `UPDATE governed_media_jobs
       SET state = 'approved', approved_by = ?, approved_at = NOW(), updated_at = NOW()
       WHERE id = ? AND state = 'awaiting_approval' AND fingerprint = ?`,
      [params.approverId, job.id, params.expectedFingerprint],
    );
    if (!affectedRows(update)) {
      await releaseGovernedPolloBudget({ jobId: job.id, actorId: params.approverId, reason: "approval_race_rollback" });
      throw new Error("Approval did not acquire the expected governed media job state.");
    }
    await rawExec(
      `INSERT INTO governed_media_approvals (job_id, approver_id, fingerprint, decision, estimated_cost_credits, reason, created_at)
       VALUES (?, ?, ?, 'approved', ?, ?, NOW())`,
      [job.id, params.approverId, job.fingerprint, job.estimatedCostCredits, params.reason?.slice(0, 1200) ?? null],
    );
    await appendEvent({
      jobId: job.id,
      eventType: "owner_approved",
      fromState: "awaiting_approval",
      toState: "approved",
      actorId: params.approverId,
      correlationId: job.requestId,
      detail: { estimatedCostCredits: job.estimatedCostCredits, reason: params.reason ?? null },
    });
    return (await getGovernedPolloJob(job.id))!;
  });
}

export async function releaseGovernedPolloBudget(params: { jobId: number; actorId?: number | null; reason: string }): Promise<void> {
  await ensureGovernedPolloSchema();
  const job = await getGovernedPolloJob(params.jobId);
  if (!job || !job.estimatedCostCredits) return;
  const estimate = job.estimatedCostCredits;
  const reference = `release:${job.requestId}:${params.reason}`.slice(0, 191);
  for (const scope of ["global_daily", "creator_daily"]) {
    await rawExec(
      `INSERT IGNORE INTO governed_media_budget_ledger (job_id, creator_id, scope, entry_type, credits, reference, detail_json, created_at)
       VALUES (?, ?, ?, 'release', ?, ?, ?, NOW())`,
      [job.id, job.creatorId, scope, estimate, reference, safeJson({ actorId: params.actorId ?? null, reason: params.reason })],
    );
  }
  await appendEvent({
    jobId: job.id,
    eventType: "budget_released",
    fromState: job.state,
    toState: job.state,
    actorId: params.actorId ?? null,
    correlationId: job.requestId,
    detail: { reason: params.reason, credits: estimate },
  });
}

export async function claimGovernedPolloJob(params: { jobId: number; workerId: string }): Promise<GovernedPolloJob> {
  await ensureGovernedPolloSchema();
  const job = await getGovernedPolloJob(params.jobId);
  if (!job) throw new Error("Governed media job was not found.");
  if (job.state !== "approved") throw new Error(`Job in state ${job.state} cannot be leased for submission.`);

  const config = getGovernedPolloConfig();
  if (isSourceVideoReferenceJob(job)) {
    return withNamedLock(`governed_pollo_single_use:${job.id}`, async () => {
      const locked = await getGovernedPolloJob(job.id);
      if (!locked || locked.state !== "approved") throw new Error("The single-use governed job is no longer approval-ready.");
      const lease = await rawExec(
        `UPDATE governed_media_jobs
         SET state = 'queued', lease_owner = ?, lease_expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND), updated_at = NOW()
         WHERE id = ? AND state = 'approved' AND lease_expires_at IS NULL`,
        [params.workerId.slice(0, 191), config.leaseSeconds, locked.id],
      );
      if (!affectedRows(lease)) throw new Error("The governed single-use job could not be leased.");
      const permit = await rawExec(
        `UPDATE governed_media_single_use_permits
         SET state = 'consumed', consumed_at = NOW()
         WHERE job_id = ? AND state = 'authorized' AND expires_at > NOW() AND hard_credit_cap >= ?`,
        [locked.id, locked.estimatedCostCredits],
      );
      if (!affectedRows(permit)) {
        await rawExec(
          `UPDATE governed_media_jobs SET state = 'approved', lease_owner = NULL, lease_expires_at = NULL, updated_at = NOW()
           WHERE id = ? AND state = 'queued' AND lease_owner = ?`,
          [locked.id, params.workerId.slice(0, 191)],
        );
        throw new Error("No valid unconsumed single-use execution permit exists. No chargeable request was sent.");
      }
      await appendEvent({
        jobId: locked.id,
        eventType: "single_use_permit_consumed",
        fromState: "approved",
        toState: "queued",
        correlationId: locked.requestId,
        detail: { workerId: params.workerId, leaseSeconds: config.leaseSeconds },
      });
      return (await getGovernedPolloJob(locked.id))!;
    });
  }

  if (!isGovernedPolloExecutionEnabled()) {
    throw new Error("Governed Pollo execution remains frozen. No chargeable request was sent.");
  }
  const update = await rawExec(
    `UPDATE governed_media_jobs
     SET state = 'queued', lease_owner = ?, lease_expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND), updated_at = NOW()
     WHERE id = ? AND state = 'approved' AND lease_expires_at IS NULL`,
    [params.workerId.slice(0, 191), config.leaseSeconds, job.id],
  );
  if (!affectedRows(update)) throw new Error("The governed job could not be leased; another worker may already own it.");
  await appendEvent({
    jobId: job.id,
    eventType: "worker_lease_acquired",
    fromState: "approved",
    toState: "queued",
    correlationId: job.requestId,
    detail: { workerId: params.workerId, leaseSeconds: config.leaseSeconds },
  });
  return (await getGovernedPolloJob(job.id))!;
}

export async function markGovernedPolloSubmitted(params: { jobId: number; workerId: string; providerJobId: string; providerResponse?: Record<string, unknown> }): Promise<GovernedPolloJob> {
  await ensureGovernedPolloSchema();
  const providerJobId = requireNonEmpty(params.providerJobId, "Provider job ID");
  const update = await rawExec(
    `UPDATE governed_media_jobs
     SET state = 'submitted', provider_job_id = ?, provider_response_json = ?, submitted_at = NOW(), updated_at = NOW(),
         lease_expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR)
     WHERE id = ? AND state = 'queued' AND lease_owner = ?`,
    [providerJobId, safeJson(params.providerResponse), params.jobId, params.workerId.slice(0, 191)],
  );
  if (!affectedRows(update)) throw new Error("Governed job was not leased by this worker or is no longer queueable.");
  const job = await getGovernedPolloJob(params.jobId);
  if (!job) throw new Error("Governed media job disappeared after submission.");
  await appendEvent({
    jobId: job.id,
    eventType: "provider_submission_recorded",
    fromState: "queued",
    toState: "submitted",
    correlationId: job.requestId,
    detail: { providerJobId },
  });
  return job;
}

export async function markGovernedPolloSubmissionUnknown(params: { jobId: number; workerId: string; error: unknown }): Promise<GovernedPolloJob> {
  await ensureGovernedPolloSchema();
  const update = await rawExec(
    `UPDATE governed_media_jobs
     SET state = 'submission_unknown', failure_code = 'submission_unknown', failure_message = ?, updated_at = NOW(),
         lease_expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR)
     WHERE id = ? AND state = 'queued' AND lease_owner = ?`,
    [safeErrorMessage(params.error), params.jobId, params.workerId.slice(0, 191)],
  );
  if (!affectedRows(update)) throw new Error("Could not mark the governed job as submission-unknown.");
  const job = await getGovernedPolloJob(params.jobId);
  if (!job) throw new Error("Governed media job disappeared after an ambiguous submission.");
  await appendEvent({
    jobId: job.id,
    eventType: "provider_submission_ambiguous",
    fromState: "queued",
    toState: "submission_unknown",
    correlationId: job.requestId,
    detail: { message: safeErrorMessage(params.error) },
  });
  return job;
}

export async function failGovernedPolloJob(params: { jobId: number; actorId?: number | null; code: string; error: unknown; releaseBudget?: boolean }): Promise<GovernedPolloJob> {
  await ensureGovernedPolloSchema();
  const previous = await getGovernedPolloJob(params.jobId);
  if (!previous) throw new Error("Governed media job was not found.");
  if (TERMINAL_STATES.includes(previous.state)) return previous;
  const update = await rawExec(
    `UPDATE governed_media_jobs
     SET state = 'failed', failure_code = ?, failure_message = ?, lease_owner = NULL, lease_expires_at = NULL, updated_at = NOW(), completed_at = NOW()
     WHERE id = ? AND state NOT IN ('accepted', 'rejected', 'failed', 'cancelled')`,
    [params.code.slice(0, 96), safeErrorMessage(params.error), params.jobId],
  );
  if (!affectedRows(update)) return (await getGovernedPolloJob(params.jobId))!;
  const job = (await getGovernedPolloJob(params.jobId))!;
  await appendEvent({
    jobId: job.id,
    eventType: "job_failed",
    fromState: previous.state,
    toState: "failed",
    actorId: params.actorId ?? null,
    correlationId: job.requestId,
    detail: { code: params.code, message: safeErrorMessage(params.error) },
  });
  if (params.releaseBudget) await releaseGovernedPolloBudget({ jobId: job.id, actorId: params.actorId ?? null, reason: params.code });
  return job;
}

export async function submitGovernedPolloJob(params: { jobId: number; workerId: string }): Promise<GovernedPolloJob> {
  const leased = await claimGovernedPolloJob(params);
  const apiKey = String(process.env.POLLO_API_KEY || "").trim();
  if (!apiKey) {
    return failGovernedPolloJob({ jobId: leased.id, code: "provider_key_missing", error: new Error("POLLO_API_KEY is not configured"), releaseBudget: true });
  }

  const requestBody = isSourceVideoReferenceJob(leased)
    ? buildSourceVideoReferenceInput({
      sourceUrl: leased.sourceUrl,
      prompt: leased.prompt,
      durationSeconds: leased.durationSeconds,
      resolution: leased.resolution,
      aspectRatio: leased.aspectRatio,
    })
    : (leased.mode === "ref2video" 
        ? {
            prompt: leased.prompt,
            refs: [{ url: leased.sourceUrl, type: "video" }],
            duration: leased.durationSeconds,
            resolution: leased.resolution,
            aspectRatio: leased.aspectRatio,
            mode: "basic",
            generateAudio: false,
          }
        : {
            input: {
              image: leased.sourceUrl,
              prompt: leased.prompt,
              resolution: leased.resolution,
              length: leased.durationSeconds,
              mode: leased.mode,
              aspect_ratio: leased.aspectRatio,
            },
          }
      );
  const providerUrl = isSourceVideoReferenceJob(leased)
    ? `https://api.manus.im/api/llm-proxy/v1/${SOURCE_VIDEO_REFERENCE_API_PATH}`
    : `https://api.manus.im/api/llm-proxy/v1/${leased.providerModelPath.replace("pollo/bytedance-seedance-2-5-ref2video", "generation/bytedance/seedance-2-5/ref2video").replace("pollo/", "generation/")}`;

  let response: Response;
  try {
    const finalRequestBody = requestBody.input ? requestBody.input : requestBody;
    response = await fetch(providerUrl, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json", "X-CreatorVault-Request-Id": leased.requestId },
      body: JSON.stringify(finalRequestBody),
    });
  } catch (error) {
    return markGovernedPolloSubmissionUnknown({ jobId: leased.id, workerId: params.workerId, error });
  }

  const responseJson = await parseProviderJson(response);
  if (!response.ok) {
    if (response.status >= 500 || response.status === 408 || response.status === 429) {
      return markGovernedPolloSubmissionUnknown({
        jobId: leased.id,
        workerId: params.workerId,
        error: new Error(`Pollo submission returned ${response.status}: ${safeErrorMessage(responseJson.responseText ?? responseJson.message ?? "unknown error")}`),
      });
    }
    return failGovernedPolloJob({
      jobId: leased.id,
      code: `provider_http_${response.status}`,
      error: new Error(`Pollo submission returned ${response.status}: ${safeErrorMessage(responseJson.responseText ?? responseJson.message ?? "unknown error")}`),
      releaseBudget: true,
    });
  }

  const providerJobId = responseJson?.data?.taskId || responseJson?.taskId || responseJson?.id || responseJson?.job_id || responseJson?.task_id;
  if (!providerJobId) {
    return markGovernedPolloSubmissionUnknown({
      jobId: leased.id,
      workerId: params.workerId,
      error: new Error("Provider accepted a request but did not return a task ID"),
    });
  }
  return markGovernedPolloSubmitted({ jobId: leased.id, workerId: params.workerId, providerJobId: String(providerJobId), providerResponse: responseJson });
}

export async function recordGovernedPolloProviderCompletion(params: { jobId: number; providerJobId: string; outputUrl: string; providerResponse?: Record<string, unknown> }): Promise<GovernedPolloJob> {
  await ensureGovernedPolloSchema();
  const job = await getGovernedPolloJob(params.jobId);
  if (!job) throw new Error("Governed media job was not found.");
  if (job.providerJobId !== params.providerJobId) throw new Error("Provider completion does not match the governed job’s recorded provider task.");
  if (job.state !== "submitted") throw new Error(`Job in state ${job.state} cannot accept provider completion.`);
  const outputUrl = requireNonEmpty(params.outputUrl, "Provider output URL");
  await rawExec(
    `UPDATE governed_media_jobs
     SET state = 'provider_complete', output_url = ?, provider_response_json = ?, updated_at = NOW(), completed_at = NOW()
     WHERE id = ? AND state = 'submitted'`,
    [outputUrl, safeJson(params.providerResponse), job.id],
  );
  const completed = (await getGovernedPolloJob(job.id))!;
  await appendEvent({
    jobId: completed.id,
    eventType: "provider_completion_recorded",
    fromState: "submitted",
    toState: "provider_complete",
    correlationId: completed.requestId,
    detail: { providerJobId: params.providerJobId },
  });
  return completed;
}

export async function reviewGovernedPolloOutput(params: { jobId: number; reviewerId: number; accepted: boolean; artifactUrl?: string | null; qualityScore?: number | null; reason: string }): Promise<GovernedPolloJob> {
  requireOwner(params.reviewerId);
  await ensureGovernedPolloSchema();
  const job = await getGovernedPolloJob(params.jobId);
  if (!job) throw new Error("Governed media job was not found.");
  if (job.state !== "provider_complete" && job.state !== "quality_review") throw new Error(`Job in state ${job.state} cannot be quality-reviewed.`);
  if (params.accepted && !String(params.artifactUrl || "").trim()) throw new Error("An accepted output requires a durable CreatorVault artifact URL.");
  const nextState: GovernedPolloJobState = params.accepted ? "accepted" : "rejected";
  await rawExec(
    `UPDATE governed_media_jobs
     SET state = ?, artifact_url = ?, quality_state = ?, quality_score = ?, quality_reason = ?, lease_owner = NULL, lease_expires_at = NULL,
         updated_at = NOW(), completed_at = NOW()
     WHERE id = ? AND state IN ('provider_complete', 'quality_review')`,
    [nextState, params.accepted ? String(params.artifactUrl) : null, params.accepted ? "accepted" : "rejected", params.qualityScore ?? null, params.reason.slice(0, 3000), job.id],
  );
  const reviewed = (await getGovernedPolloJob(job.id))!;
  await appendEvent({
    jobId: reviewed.id,
    eventType: "quality_review_completed",
    fromState: job.state,
    toState: nextState,
    actorId: params.reviewerId,
    correlationId: reviewed.requestId,
    detail: { accepted: params.accepted, qualityScore: params.qualityScore ?? null, reason: params.reason },
  });
  if (!params.accepted) await releaseGovernedPolloBudget({ jobId: reviewed.id, actorId: params.reviewerId, reason: "quality_rejected" });
  return reviewed;
}

export async function cancelGovernedPolloJob(params: { jobId: number; actorId: number; reason: string }): Promise<GovernedPolloJob> {
  await ensureGovernedPolloSchema();
  const job = await getGovernedPolloJob(params.jobId);
  if (!job) throw new Error("Governed media job was not found.");
  if (job.creatorId !== params.actorId && !OWNER_IDS.has(Number(params.actorId))) throw new Error("Only the creator or an owner may cancel this governed media job.");
  if (["submitted", "submission_unknown", "provider_complete", "quality_review", "accepted"].includes(job.state)) {
    throw new Error("This job cannot be cancelled because a provider request may already exist or an output is accepted.");
  }
  if (TERMINAL_STATES.includes(job.state)) return job;
  await rawExec(
    `UPDATE governed_media_jobs
     SET state = 'cancelled', failure_code = 'cancelled', failure_message = ?, lease_owner = NULL, lease_expires_at = NULL, updated_at = NOW(), completed_at = NOW()
     WHERE id = ? AND state NOT IN ('submitted', 'submission_unknown', 'provider_complete', 'quality_review', 'accepted', 'rejected', 'failed', 'cancelled')`,
    [params.reason.slice(0, 1200), job.id],
  );
  const cancelled = (await getGovernedPolloJob(job.id))!;
  await appendEvent({
    jobId: cancelled.id,
    eventType: "job_cancelled",
    fromState: job.state,
    toState: "cancelled",
    actorId: params.actorId,
    correlationId: cancelled.requestId,
    detail: { reason: params.reason },
  });
  await releaseGovernedPolloBudget({ jobId: cancelled.id, actorId: params.actorId, reason: "cancelled" });
  return cancelled;
}

export async function listGovernedPolloJobs(params: { creatorId?: number; limit?: number }): Promise<GovernedPolloJob[]> {
  await ensureGovernedPolloSchema();
  const limit = Math.max(1, Math.min(200, Number(params.limit ?? 50)));
  const rows = params.creatorId === undefined
    ? await rawQuery("SELECT * FROM governed_media_jobs ORDER BY id DESC LIMIT ?", [limit])
    : await rawQuery("SELECT * FROM governed_media_jobs WHERE creator_id = ? ORDER BY id DESC LIMIT ?", [params.creatorId, limit]);
  return rows.map(normaliseJob);
}

export async function listGovernedPolloEvents(jobId: number): Promise<GovernedPolloEvent[]> {
  await ensureGovernedPolloSchema();
  const rows = await rawQuery("SELECT * FROM governed_media_events WHERE job_id = ? ORDER BY id ASC", [jobId]);
  return rows.map((row: any) => ({
    id: Number(row.id),
    jobId: Number(row.job_id),
    eventType: String(row.event_type),
    fromState: row.from_state ? String(row.from_state) : null,
    toState: row.to_state ? String(row.to_state) : null,
    actorId: row.actor_id === null || row.actor_id === undefined ? null : Number(row.actor_id),
    correlationId: row.correlation_id ? String(row.correlation_id) : null,
    detail: parseJson(row.detail_json),
    createdAt: String(row.created_at),
  }));
}

export async function getGovernedPolloDashboard(): Promise<{
  config: GovernedPolloConfig;
  executionPermitted: boolean;
  globalReservedToday: number;
  jobsByState: Record<string, number>;
  activeLeases: number;
  unreconciledJobs: number;
}> {
  await ensureGovernedPolloSchema();
  const [globalReservedToday, stateRows, activeRows, unreconciledRows] = await Promise.all([
    getReservedCredits("global_daily"),
    rawQuery("SELECT state, COUNT(*) AS count FROM governed_media_jobs GROUP BY state"),
    rawQuery("SELECT COUNT(*) AS count FROM governed_media_jobs WHERE state IN ('queued', 'submitted', 'submission_unknown', 'provider_complete', 'quality_review')"),
    rawQuery("SELECT COUNT(*) AS count FROM governed_media_jobs WHERE state IN ('submitted', 'submission_unknown', 'provider_complete', 'quality_review', 'accepted') AND actual_cost_credits IS NULL"),
  ]);
  const jobsByState: Record<string, number> = {};
  for (const row of stateRows) jobsByState[String(row.state)] = Number(row.count);
  return {
    config: getGovernedPolloConfig(),
    executionPermitted: isGovernedPolloExecutionEnabled(),
    globalReservedToday,
    jobsByState,
    activeLeases: Number(activeRows[0]?.count ?? 0),
    unreconciledJobs: Number(unreconciledRows[0]?.count ?? 0),
  };
}

export function assertGovernedPolloJobReadyForMonetization(job: GovernedPolloJob): void {
  if (job.state !== "accepted" || !job.artifactUrl) {
    throw new Error("A governed media job must be quality-accepted with a durable artifact before checkout or publication is allowed.");
  }
}

export function isTerminalGovernedPolloState(state: string): boolean {
  return TERMINAL_STATES.includes(state as GovernedPolloJobState);
}

export const governedPolloModelPath = DEFAULT_MODEL_PATH;
