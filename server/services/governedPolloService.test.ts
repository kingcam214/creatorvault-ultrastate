import { afterEach, describe, expect, it, vi } from "vitest";

// These policy tests never invoke database-backed service methods. Mock the legacy
// schema bootstrap so Vitest can exercise the pure zero-spend gates in its ESM runtime.
vi.mock("../db", () => ({ db: {} }));
vi.mock("drizzle-orm", () => ({ sql: { raw: (query: string) => query } }));

import {
  assertGovernedPolloJobReadyForMonetization,
  getGovernedPolloConfig,
  isGovernedPolloExecutionEnabled,
  isTerminalGovernedPolloState,
  type GovernedPolloJob,
} from "./governedPolloService";

const ENV_KEYS = [
  "CREATORVAULT_POLLO_EXECUTION_MODE",
  "CREATORVAULT_POLLO_EMERGENCY_FREEZE",
  "CREATORVAULT_GOVERNED_POLLO_EXECUTION_ENABLED",
  "CREATORVAULT_POLLO_GLOBAL_DAILY_CREDIT_CAP",
  "CREATORVAULT_POLLO_PER_USER_DAILY_CREDIT_CAP",
  "CREATORVAULT_POLLO_PER_REQUEST_CREDIT_CAP",
  "CREATORVAULT_POLLO_MAX_CONCURRENT_JOBS",
  "CREATORVAULT_POLLO_LEASE_SECONDS",
] as const;

const originalEnv = Object.fromEntries(ENV_KEYS.map(key => [key, process.env[key]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function job(overrides: Partial<GovernedPolloJob> = {}): GovernedPolloJob {
  return {
    id: 1,
    requestId: "request-1",
    creatorId: 33,
    requestedBy: 33,
    approvedBy: 33,
    state: "accepted",
    idempotencyKey: "key-1",
    fingerprint: "f".repeat(64),
    sourceUrl: "https://creatorvault.live/source.mp4",
    sourceChecksum: "a".repeat(64),
    prompt: "Controlled Body Cinema motion treatment",
    provider: "pollo",
    providerModelPath: "pollo/pollo-v1-6",
    resolution: "720p",
    durationSeconds: 5,
    aspectRatio: "9:16",
    mode: "basic",
    outputCount: 1,
    estimatedCostCredits: 25,
    actualCostCredits: null,
    costEvidenceReference: "owner-reviewed quote",
    providerJobId: "provider-job-1",
    outputUrl: "https://provider.example/output.mp4",
    artifactUrl: "https://creatorvault.live/artifacts/accepted.mp4",
    qualityState: "accepted",
    qualityScore: 90,
    qualityReason: "Accepted after controlled review.",
    failureCode: null,
    failureMessage: null,
    leaseOwner: null,
    leaseExpiresAt: null,
    createdAt: "2026-07-31T00:00:00.000Z",
    updatedAt: "2026-07-31T00:00:00.000Z",
    approvedAt: "2026-07-31T00:00:00.000Z",
    submittedAt: "2026-07-31T00:00:00.000Z",
    completedAt: "2026-07-31T00:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

describe("governed Pollo control policy", () => {
  it("defaults to frozen zero-spend behavior when no explicit configuration is supplied", () => {
    for (const key of ENV_KEYS) delete process.env[key];
    const config = getGovernedPolloConfig();
    expect(config.executionEnabled).toBe(false);
    expect(config.globalDailyCreditCap).toBe(0);
    expect(config.perUserDailyCreditCap).toBe(0);
    expect(config.perRequestCreditCap).toBe(0);
    expect(config.maxConcurrentJobs).toBe(0);
    expect(isGovernedPolloExecutionEnabled()).toBe(false);
  });

  it("requires all explicit switches and positive caps before any governed provider execution is permitted", () => {
    process.env.CREATORVAULT_POLLO_EXECUTION_MODE = "governed";
    process.env.CREATORVAULT_POLLO_EMERGENCY_FREEZE = "off";
    process.env.CREATORVAULT_GOVERNED_POLLO_EXECUTION_ENABLED = "true";
    process.env.CREATORVAULT_POLLO_GLOBAL_DAILY_CREDIT_CAP = "500";
    process.env.CREATORVAULT_POLLO_PER_USER_DAILY_CREDIT_CAP = "100";
    process.env.CREATORVAULT_POLLO_PER_REQUEST_CREDIT_CAP = "50";
    process.env.CREATORVAULT_POLLO_MAX_CONCURRENT_JOBS = "1";
    expect(isGovernedPolloExecutionEnabled()).toBe(true);

    process.env.CREATORVAULT_POLLO_PER_REQUEST_CREDIT_CAP = "0";
    expect(isGovernedPolloExecutionEnabled()).toBe(false);
  });

  it("allows monetization only for a quality-accepted job with a durable artifact", () => {
    expect(() => assertGovernedPolloJobReadyForMonetization(job())).not.toThrow();
    expect(() => assertGovernedPolloJobReadyForMonetization(job({ artifactUrl: null }))).toThrow(/quality-accepted/i);
    expect(() => assertGovernedPolloJobReadyForMonetization(job({ state: "provider_complete" }))).toThrow(/quality-accepted/i);
  });

  it("classifies only explicit end states as terminal", () => {
    expect(isTerminalGovernedPolloState("accepted")).toBe(true);
    expect(isTerminalGovernedPolloState("rejected")).toBe(true);
    expect(isTerminalGovernedPolloState("failed")).toBe(true);
    expect(isTerminalGovernedPolloState("cancelled")).toBe(true);
    expect(isTerminalGovernedPolloState("submitted")).toBe(false);
    expect(isTerminalGovernedPolloState("submission_unknown")).toBe(false);
  });
});
