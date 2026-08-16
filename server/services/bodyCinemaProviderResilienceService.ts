import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import type { RoutableCreationModel } from "./creationModelRegistry";
import {
  classifyBodyCinemaProviderFailure as classifyProviderFailurePolicy,
  isBodyCinemaProviderSubmissionAllowed as isProviderSubmissionAllowedPolicy,
  resolveBodyCinemaFailureState as resolveProviderFailureStatePolicy,
} from "./bodyCinemaProviderResiliencePolicy";

/**
 * BODY CINEMA PROVIDER RESILIENCE
 *
 * This is a routing safety layer, not a second renderer. It remembers real
 * provider availability failures, opens a circuit before another chargeable
 * request can be sent, and makes the distinction between a creative route and
 * CreatorVault's already-proven source-preserving continuity lane explicit.
 *
 * It never treats the technical assembly lane as proof of a creative treatment.
 * It never auto-retries a provider, reserves spend, or starts a provider task.
 */

export type BodyCinemaProviderKey = "runway_aleph" | "topaz_video" | "creatorvault_technical_continuity";
export type BodyCinemaProviderHealthStatus = "unknown" | "healthy" | "degraded" | "unavailable" | "disabled";
export type BodyCinemaCircuitState = "closed" | "open" | "half_open";
export type BodyCinemaProviderFailureCode =
  | "service_unavailable"
  | "submission_timeout_no_task"
  | "plan_gate"
  | "workspace_limit"
  | "asset_contract"
  | "safety_block"
  | "provider_output_failure"
  | "quality_rejection"
  | "manual_hold";

export type BodyCinemaProviderHealth = {
  providerKey: BodyCinemaProviderKey;
  healthStatus: BodyCinemaProviderHealthStatus;
  circuitState: BodyCinemaCircuitState;
  lastFailureCode: BodyCinemaProviderFailureCode | null;
  lastFailureDetail: string | null;
  failureCount: number;
  retryNotBefore: string | null;
  lastProbeAt: string | null;
  lastRecoveredAt: string | null;
  updatedAt: string;
};

export type BodyCinemaProviderHealthEvent = {
  id: string;
  providerKey: BodyCinemaProviderKey;
  eventType: "failure_recorded" | "health_probe" | "manual_hold" | "recovered";
  healthStatus: BodyCinemaProviderHealthStatus;
  circuitState: BodyCinemaCircuitState;
  failureCode: BodyCinemaProviderFailureCode | null;
  detail: string | null;
  source: string;
  createdAt: string;
};

export type BodyCinemaRouteReadiness = {
  creativeRoutesReady: string[];
  heldCreativeRoutes: Array<{ modelKey: string; providerKey: BodyCinemaProviderKey; reason: string }>;
  continuityRouteReady: boolean;
  continuityMessage: string;
};

const PROVIDER_MODEL_KEYS: Record<BodyCinemaProviderKey, string[]> = {
  runway_aleph: ["runway/aleph-2-video-edit"],
  topaz_video: [],
  creatorvault_technical_continuity: ["creatorvault/real-render-engine"],
};

const PROVIDER_DEFAULTS: Record<BodyCinemaProviderKey, Omit<BodyCinemaProviderHealth, "updatedAt">> = {
  runway_aleph: {
    providerKey: "runway_aleph",
    healthStatus: "unknown",
    circuitState: "closed",
    lastFailureCode: null,
    lastFailureDetail: null,
    failureCount: 0,
    retryNotBefore: null,
    lastProbeAt: null,
    lastRecoveredAt: null,
  },
  topaz_video: {
    providerKey: "topaz_video",
    healthStatus: "disabled",
    circuitState: "open",
    lastFailureCode: "manual_hold",
    lastFailureDetail: "Topaz is a researched backup candidate only. It is not configured, benchmarked, or authorized for CreatorVault production use.",
    failureCount: 0,
    retryNotBefore: null,
    lastProbeAt: null,
    lastRecoveredAt: null,
  },
  creatorvault_technical_continuity: {
    providerKey: "creatorvault_technical_continuity",
    healthStatus: "healthy",
    circuitState: "closed",
    lastFailureCode: null,
    lastFailureDetail: null,
    failureCount: 0,
    retryNotBefore: null,
    lastProbeAt: null,
    lastRecoveredAt: null,
  },
};

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return JSON.stringify({ serializationError: true });
  }
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

async function rawQuery<T = any>(query: string, params: unknown[] = []): Promise<T[]> {
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

async function rawExec(query: string, params: unknown[] = []): Promise<any> {
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

function normaliseHealth(row: any): BodyCinemaProviderHealth {
  const fallback = PROVIDER_DEFAULTS[String(row?.provider_key || "") as BodyCinemaProviderKey];
  if (!fallback) throw new Error("Unknown Body Cinema provider health record.");
  return {
    providerKey: fallback.providerKey,
    healthStatus: String(row.health_status || fallback.healthStatus) as BodyCinemaProviderHealthStatus,
    circuitState: String(row.circuit_state || fallback.circuitState) as BodyCinemaCircuitState,
    lastFailureCode: row.last_failure_code ? String(row.last_failure_code) as BodyCinemaProviderFailureCode : null,
    lastFailureDetail: row.last_failure_detail ? String(row.last_failure_detail) : null,
    failureCount: Math.max(0, Number(row.failure_count || 0)),
    retryNotBefore: row.retry_not_before ? new Date(row.retry_not_before).toISOString() : null,
    lastProbeAt: row.last_probe_at ? new Date(row.last_probe_at).toISOString() : null,
    lastRecoveredAt: row.last_recovered_at ? new Date(row.last_recovered_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

export function providerKeyForCreationModel(modelKey: string): BodyCinemaProviderKey | null {
  for (const [providerKey, keys] of Object.entries(PROVIDER_MODEL_KEYS) as Array<[BodyCinemaProviderKey, string[]]>) {
    if (keys.includes(modelKey)) return providerKey;
  }
  return null;
}

export function classifyBodyCinemaProviderFailure(input: {
  code?: string | null;
  detail?: string | null;
}): BodyCinemaProviderFailureCode {
  return classifyProviderFailurePolicy(input) as BodyCinemaProviderFailureCode;
}

export function resolveBodyCinemaFailureState(code: BodyCinemaProviderFailureCode): Pick<BodyCinemaProviderHealth, "healthStatus" | "circuitState" | "retryNotBefore"> {
  return resolveProviderFailureStatePolicy(code) as Pick<BodyCinemaProviderHealth, "healthStatus" | "circuitState" | "retryNotBefore">;
}

export function isBodyCinemaProviderSubmissionAllowed(health: BodyCinemaProviderHealth, now = new Date()): boolean {
  return isProviderSubmissionAllowedPolicy(health, now);
}

export async function ensureBodyCinemaProviderResilienceSchema(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS body_cinema_provider_health (
    provider_key VARCHAR(96) NOT NULL PRIMARY KEY,
    health_status VARCHAR(32) NOT NULL,
    circuit_state VARCHAR(32) NOT NULL,
    last_failure_code VARCHAR(96) NULL,
    last_failure_detail TEXT NULL,
    failure_count INT NOT NULL DEFAULT 0,
    retry_not_before DATETIME NULL,
    last_probe_at DATETIME NULL,
    last_recovered_at DATETIME NULL,
    updated_at DATETIME NOT NULL,
    KEY body_cinema_provider_health_state (health_status, circuit_state, updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await rawExec(`CREATE TABLE IF NOT EXISTS body_cinema_provider_health_events (
    id CHAR(36) NOT NULL PRIMARY KEY,
    provider_key VARCHAR(96) NOT NULL,
    event_type VARCHAR(48) NOT NULL,
    health_status VARCHAR(32) NOT NULL,
    circuit_state VARCHAR(32) NOT NULL,
    failure_code VARCHAR(96) NULL,
    detail TEXT NULL,
    source VARCHAR(96) NOT NULL,
    metadata_json LONGTEXT NULL,
    created_at DATETIME NOT NULL,
    KEY body_cinema_provider_health_events_provider (provider_key, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  for (const provider of Object.values(PROVIDER_DEFAULTS)) {
    await rawExec(
      `INSERT IGNORE INTO body_cinema_provider_health (
        provider_key, health_status, circuit_state, last_failure_code, last_failure_detail,
        failure_count, retry_not_before, last_probe_at, last_recovered_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        provider.providerKey,
        provider.healthStatus,
        provider.circuitState,
        provider.lastFailureCode,
        provider.lastFailureDetail,
        provider.failureCount,
        provider.retryNotBefore,
        provider.lastProbeAt,
        provider.lastRecoveredAt,
      ],
    );
  }
}

async function appendHealthEvent(input: Omit<BodyCinemaProviderHealthEvent, "id" | "createdAt"> & { metadata?: Record<string, unknown> }): Promise<void> {
  await rawExec(
    `INSERT INTO body_cinema_provider_health_events (
      id, provider_key, event_type, health_status, circuit_state, failure_code, detail, source, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      randomUUID(),
      input.providerKey,
      input.eventType,
      input.healthStatus,
      input.circuitState,
      input.failureCode,
      input.detail,
      input.source,
      safeJson(input.metadata || {}),
    ],
  );
}

export async function getBodyCinemaProviderHealth(providerKey: BodyCinemaProviderKey): Promise<BodyCinemaProviderHealth> {
  await ensureBodyCinemaProviderResilienceSchema();
  const rows = await rawQuery("SELECT * FROM body_cinema_provider_health WHERE provider_key = ? LIMIT 1", [providerKey]);
  return rows[0] ? normaliseHealth(rows[0]) : { ...PROVIDER_DEFAULTS[providerKey], updatedAt: new Date().toISOString() };
}

export async function listBodyCinemaProviderHealth(): Promise<BodyCinemaProviderHealth[]> {
  await ensureBodyCinemaProviderResilienceSchema();
  const rows = await rawQuery("SELECT * FROM body_cinema_provider_health ORDER BY provider_key ASC");
  return rows.map(normaliseHealth);
}

export async function recordBodyCinemaProviderFailure(input: {
  providerKey: BodyCinemaProviderKey;
  code?: string | null;
  detail?: string | null;
  source: string;
  metadata?: Record<string, unknown>;
}): Promise<BodyCinemaProviderHealth> {
  await ensureBodyCinemaProviderResilienceSchema();
  const previous = await getBodyCinemaProviderHealth(input.providerKey);
  const failureCode = classifyBodyCinemaProviderFailure({ code: input.code, detail: input.detail });
  const next = resolveBodyCinemaFailureState(failureCode);
  const detail = String(input.detail || input.code || "Provider failure recorded.").slice(0, 8_000);
  await rawExec(
    `UPDATE body_cinema_provider_health
     SET health_status = ?, circuit_state = ?, last_failure_code = ?, last_failure_detail = ?,
         failure_count = ?, retry_not_before = ?, updated_at = NOW()
     WHERE provider_key = ?`,
    [next.healthStatus, next.circuitState, failureCode, detail, previous.failureCount + 1, next.retryNotBefore, input.providerKey],
  );
  await appendHealthEvent({
    providerKey: input.providerKey,
    eventType: "failure_recorded",
    healthStatus: next.healthStatus,
    circuitState: next.circuitState,
    failureCode,
    detail,
    source: input.source,
    metadata: input.metadata,
  });
  return getBodyCinemaProviderHealth(input.providerKey);
}

export async function recordBodyCinemaProviderHealthy(input: {
  providerKey: BodyCinemaProviderKey;
  source: string;
  detail?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<BodyCinemaProviderHealth> {
  await ensureBodyCinemaProviderResilienceSchema();
  const previous = await getBodyCinemaProviderHealth(input.providerKey);
  const isContinuityLane = input.providerKey === "creatorvault_technical_continuity";
  const nextStatus: BodyCinemaProviderHealthStatus = isContinuityLane ? "healthy" : "healthy";
  await rawExec(
    `UPDATE body_cinema_provider_health
     SET health_status = ?, circuit_state = 'closed', retry_not_before = NULL, last_probe_at = NOW(),
         last_recovered_at = NOW(), updated_at = NOW()
     WHERE provider_key = ?`,
    [nextStatus, input.providerKey],
  );
  await appendHealthEvent({
    providerKey: input.providerKey,
    eventType: previous.circuitState === "open" ? "recovered" : "health_probe",
    healthStatus: nextStatus,
    circuitState: "closed",
    failureCode: null,
    detail: input.detail || "Read-only availability check succeeded; no provider task was created.",
    source: input.source,
    metadata: input.metadata,
  });
  return getBodyCinemaProviderHealth(input.providerKey);
}

export function buildBodyCinemaRouteReadiness(models: RoutableCreationModel[], health: BodyCinemaProviderHealth[]): BodyCinemaRouteReadiness {
  const healthByProvider = new Map(health.map((entry) => [entry.providerKey, entry]));
  const creativeRoutesReady: string[] = [];
  const heldCreativeRoutes: BodyCinemaRouteReadiness["heldCreativeRoutes"] = [];

  for (const model of models) {
    if (model.executionLane === "assembly") continue;
    const providerKey = providerKeyForCreationModel(model.modelKey);
    if (!providerKey) continue;
    const providerHealth = healthByProvider.get(providerKey) || { ...PROVIDER_DEFAULTS[providerKey], updatedAt: new Date().toISOString() };
    if (isBodyCinemaProviderSubmissionAllowed(providerHealth)) creativeRoutesReady.push(model.modelKey);
    else heldCreativeRoutes.push({
      modelKey: model.modelKey,
      providerKey,
      reason: providerHealth.lastFailureCode || `${providerHealth.healthStatus}_${providerHealth.circuitState}`,
    });
  }

  const continuityHealth = healthByProvider.get("creatorvault_technical_continuity")
    || { ...PROVIDER_DEFAULTS.creatorvault_technical_continuity, updatedAt: new Date().toISOString() };
  const continuityRouteReady = isBodyCinemaProviderSubmissionAllowed(continuityHealth);
  return {
    creativeRoutesReady,
    heldCreativeRoutes,
    continuityRouteReady,
    continuityMessage: continuityRouteReady
      ? "Source-preserving technical continuity remains available, but it is not a substitute for a proven creative treatment."
      : "The source-preserving continuity lane is unavailable and needs repair before any Body Cinema work continues.",
  };
}

export const BODY_CINEMA_PROVIDER_RESILIENCE_POLICY = {
  providerFailureDoesNotAuthorizeAutomaticRetry: true,
  providerCircuitMustBeClosedBeforeChargeableSubmission: true,
  malformedOrUnsignedAssetFailureDoesNotMarkProviderDown: true,
  planGateRequiresEntitlementRepairBeforeRetry: true,
  outageOpensCircuitAndReleasesTheGovernedReservation: true,
  technicalContinuityIsNotCreativeTreatmentProof: true,
  unconfiguredCandidatesRemainDisabled: true,
} as const;

export function parseBodyCinemaProviderHealthEventMetadata(value: unknown): Record<string, unknown> {
  return parseJson<Record<string, unknown>>(value, {});
}
