import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PolloCapabilitySnapshot } from "./polloCapabilityRegistryService";

const fixture = vi.hoisted(() => {
  const forbiddenNetwork = vi.fn(() => {
    throw new Error("TEST_EXTERNAL_NETWORK_FORBIDDEN");
  });
  const providerFetch = vi.fn(forbiddenNetwork);
  const databaseQuery = vi.fn(async () => [{}]);
  const routes = new Map<
    string,
    (request: unknown, response: unknown) => void
  >();
  const middleware = () => undefined;
  const app = {
    use: vi.fn(),
    post: vi.fn(),
    get: vi.fn(
      (route: string, handler: (request: unknown, response: unknown) => void) =>
        routes.set(route, handler)
    ),
  };
  const server = {
    listen: vi.fn((_port: number, initialized: () => void) => initialized()),
    once: vi.fn(),
  };
  const express = Object.assign(
    vi.fn(() => app),
    {
      raw: vi.fn(() => middleware),
      json: vi.fn(() => middleware),
      urlencoded: vi.fn(() => middleware),
      static: vi.fn(() => middleware),
    }
  );
  return {
    app,
    cachedSnapshot: vi.fn(),
    databaseQuery,
    express,
    forbiddenNetwork,
    mediaProof: vi.fn(async () => undefined),
    providerFetch,
    refreshSnapshot: vi.fn(),
    routes,
    schema: vi.fn(async () => ({ tables: [] as string[] })),
    server,
    socialSchema: vi.fn(async () => ({ tables: [] as string[] })),
    startup: vi.fn(async () => undefined),
  };
});

// All startup dependencies are mocked so the focused tests exercise only the
// shared opt-in boundary and cannot start services, schedule work, or use transport.
vi.mock("dotenv/config", () => ({}));
vi.mock("express", () => ({ default: fixture.express }));
vi.mock("http", () => ({
  createServer: () => fixture.server,
  get: fixture.forbiddenNetwork,
  request: fixture.forbiddenNetwork,
}));
vi.mock("https", () => ({
  get: fixture.forbiddenNetwork,
  request: fixture.forbiddenNetwork,
}));
vi.mock("net", () => ({
  default: { createServer: fixture.forbiddenNetwork },
  connect: fixture.forbiddenNetwork,
  createConnection: fixture.forbiddenNetwork,
}));
vi.mock("fs", async () => ({
  ...(await vi.importActual<typeof import("fs")>("fs")),
  existsSync: () => true,
  readFileSync: () => JSON.stringify({ commit: "synthetic-local-startup" }),
}));
vi.mock("../db", () => ({
  db: { $client: { promise: () => ({ query: fixture.databaseQuery }) } },
  getDb: fixture.forbiddenNetwork,
  getPersonaVaultSqlClient: fixture.forbiddenNetwork,
}));
vi.mock("drizzle-orm", () => ({ sql: { raw: (query: string) => query } }));
vi.mock("../_core/authenticationRoutes", () => ({
  registerAuthenticationRoutes: vi.fn(),
}));
vi.mock("../routers", () => ({ appRouter: {} }));
vi.mock("../_core/context", () => ({ createContext: vi.fn() }));
vi.mock("../_core/vite", () => ({ serveStatic: vi.fn(), setupVite: vi.fn() }));
vi.mock("../telegram-webhook", () => ({ default: vi.fn() }));
vi.mock("../webrtc", () => ({ initializeWebRTC: vi.fn() }));
vi.mock("../_core/stripeWebhook", () => ({ handleStripeWebhook: vi.fn() }));
vi.mock("../_core/startup", () => ({ runStartupTasks: fixture.startup }));
vi.mock("../_core/llm", () => ({ getLLMProviderStatus: () => [] }));
vi.mock("../_core/sdk", () => ({
  sdk: { authenticateRequest: fixture.forbiddenNetwork },
}));
vi.mock("../routers/videoStudioRouter", () => ({ default: vi.fn() }));
vi.mock("../routers/videoUploadRouter", () => ({ videoUploadRouter: vi.fn() }));
vi.mock("../routers/bodyCinemaCandidatePlayback", () => ({
  registerBodyCinemaCandidatePlayback: vi.fn(),
}));
vi.mock("./telegramConnectRoute", () => ({
  registerTelegramConnectRoutes: vi.fn(),
}));
vi.mock("./telegramDailyDropEngine", () => ({ startDailyDropCron: vi.fn() }));
vi.mock("./telegramBuyerReactivation", () => ({
  startReactivationCron: vi.fn(),
}));
vi.mock("./vaultxAutonomousAcquisitionOperator", () => ({
  startVaultXAcquisitionCron: vi.fn(),
}));
vi.mock("../routers/challengeAutomationRouter", () => ({
  startChallengeAutomationCron: vi.fn(),
}));
vi.mock("./creatorVaultOvernightRevenue", () => ({
  startCreatorVaultOvernightRevenueCron: vi.fn(),
}));
vi.mock("./postScheduler", () => ({ startPostScheduler: vi.fn() }));
vi.mock("./personaContinuityWorker", () => ({
  startPersonaContinuityWorker: vi.fn(() => null),
}));
vi.mock("./bodyCinemaExistingMediaProofService", () => ({
  buildFrameEvidence: fixture.forbiddenNetwork,
  getBodyCinemaPreProviderAttestation: () => ({ state: "synthetic-not-run" }),
  probeVideo: fixture.forbiddenNetwork,
  runBodyCinemaExistingMediaPreProviderProof: fixture.mediaProof,
}));
vi.mock("./socialSpineService", () => ({
  ensureSocialSpineSchema: fixture.socialSchema,
}));
vi.mock("./bodyCinemaEvidenceService", () => ({
  assertBodyCinemaEvidenceReady: fixture.forbiddenNetwork,
}));
vi.mock("./bodyCinemaSourceMapService", () => ({
  assertBodyCinemaSourceMapReady: fixture.forbiddenNetwork,
}));
vi.mock("./bodyCinemaOutputReviewService", () => ({
  reviewBodyCinemaOutput: fixture.forbiddenNetwork,
}));
vi.mock("./bodyCinemaEditBlueprintService", () => ({
  assertBodyCinemaEditBlueprintReady: fixture.forbiddenNetwork,
}));
vi.mock("./bodyCinemaProviderResilienceService", () => ({
  recordBodyCinemaProviderFailure: fixture.forbiddenNetwork,
}));
vi.mock("./bodyCinemaVaceWorkerContract", () => ({
  buildVaceMaskedEditContract: fixture.forbiddenNetwork,
  vaceContractFingerprint: fixture.forbiddenNetwork,
}));
vi.mock("./personaContinuityProviderContract", () => ({
  buildPersonaContinuityProviderInput: fixture.forbiddenNetwork,
  isPersonaContinuityJob: () => false,
  PERSONA_CONTINUITY_API_PATH: "synthetic-no-endpoint",
  PERSONA_CONTINUITY_MODE: "synthetic-no-execution",
  verifyPersonaContinuityReceipt: fixture.forbiddenNetwork,
}));
vi.mock("./personaContinuitySubmissionGuard", () => ({
  assertPersonaContinuitySubmission: fixture.forbiddenNetwork,
  getPersonaContinuityIngestion: fixture.forbiddenNetwork,
}));
vi.mock("./topazPrecisionVideoService", () => ({
  TopazPrecisionProviderError: Error,
  acceptTopazPrecisionVideoRequest: fixture.forbiddenNetwork,
  createTopazPrecisionVideoRequest: fixture.forbiddenNetwork,
  getTopazPrecisionVideoStatus: fixture.forbiddenNetwork,
  prepareTopazPrecisionVideoRequest: fixture.forbiddenNetwork,
  uploadAndCompleteTopazPrecisionVideo: fixture.forbiddenNetwork,
}));
vi.mock("./governedPolloService", async () => ({
  ...(await vi.importActual<typeof import("./governedPolloService")>(
    "./governedPolloService"
  )),
  verifyGovernedPolloSchema: fixture.schema,
}));
vi.mock("./polloCapabilityRegistryService", async () => ({
  ...(await vi.importActual<typeof import("./polloCapabilityRegistryService")>(
    "./polloCapabilityRegistryService"
  )),
  getLatestPolloCapabilitySnapshot: fixture.cachedSnapshot,
  refreshPolloCapabilitySnapshot: fixture.refreshSnapshot,
}));
vi.mock("@trpc/server/adapters/express", () => ({
  createExpressMiddleware: () => () => undefined,
}));

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
  "CREATORVAULT_POLLO_MAX_CONCURRENT_JOBS",
  "CREATORVAULT_POLLO_LEASE_SECONDS",
  "ENABLE_PROVIDER_CAPABILITY_ATTESTATION",
  "POLLO_API_KEY",
] as const;

const originalEnv = Object.fromEntries(
  ENV_KEYS.map(key => [key, process.env[key]])
);

type Release = {
  providerCapabilityAudit: {
    auditError: string | null;
    auditedAt: string | null;
    auditOnly: boolean;
    providerGenerationCalled: boolean;
  };
};

function syntheticSnapshot(): PolloCapabilitySnapshot {
  return {
    id: "synthetic-capability-snapshot",
    provider: "pollo",
    state: "ready",
    catalogHash: "a".repeat(64),
    checkedAt: "2026-10-04T20:00:00.000Z",
    models: [],
    warnings: [],
    account: {
      credentialPresent: false,
      balance: {
        state: "not_checked",
        availableCredits: null,
        totalCredits: null,
        availableAmountUsd: null,
        totalAmountUsd: null,
        failureReason: null,
      },
      modelAccess: {
        state: "not_checked",
        modelTokens: [],
        failureReason: null,
      },
    },
  };
}

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

async function initializeStartup(): Promise<Release> {
  await import("../_core/index");
  await vi.dynamicImportSettled();
  const json = vi.fn<(value: Release) => void>();
  const response = { setHeader: vi.fn(), json };
  const route = fixture.routes.get("/__release");
  expect(route).toBeTypeOf("function");
  route?.({}, response);
  const release = json.mock.calls[0]?.[0];
  if (!release) throw new Error("SYNTHETIC_RELEASE_ROUTE_UNAVAILABLE");
  expect(fixture.server.listen).toHaveBeenCalledOnce();
  return release;
}

async function actualRegistry(): Promise<
  typeof import("./polloCapabilityRegistryService")
> {
  return vi.importActual<typeof import("./polloCapabilityRegistryService")>(
    "./polloCapabilityRegistryService"
  );
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  fixture.routes.clear();
  fixture.databaseQuery.mockResolvedValue([{}]);
  fixture.providerFetch.mockImplementation(fixture.forbiddenNetwork);
  fixture.refreshSnapshot.mockResolvedValue(syntheticSnapshot());
  fixture.cachedSnapshot.mockResolvedValue(null);
  vi.stubEnv("ENABLE_PROVIDER_CAPABILITY_ATTESTATION", undefined);
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("POLLO_API_KEY", undefined);
  vi.stubGlobal("fetch", fixture.providerFetch);
  vi.stubGlobal("setInterval", vi.fn());
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("provider capability attestation default-deny", () => {
  it.each([
    [undefined, false],
    ["", false],
    [" ", false],
    ["false", false],
    ["0", false],
    ["TRUE", false],
    ["True", false],
    ["yes", false],
    ["true", true],
    ["1", true],
  ])("uses the shared strict predicate for %p", async (value, expected) => {
    if (value === undefined)
      vi.stubEnv("ENABLE_PROVIDER_CAPABILITY_ATTESTATION", undefined);
    else vi.stubEnv("ENABLE_PROVIDER_CAPABILITY_ATTESTATION", value);
    expect(
      (await actualRegistry()).isProviderCapabilityAttestationEnabled()
    ).toBe(expected);
  });

  it.each([undefined, "false", "0", "TRUE", "True", "yes"])(
    "does not invoke startup attestation or provider transport for %p",
    async value => {
      if (value === undefined)
        vi.stubEnv("ENABLE_PROVIDER_CAPABILITY_ATTESTATION", undefined);
      else vi.stubEnv("ENABLE_PROVIDER_CAPABILITY_ATTESTATION", value);
      const release = await initializeStartup();
      expect(fixture.refreshSnapshot).not.toHaveBeenCalled();
      expect(fixture.providerFetch).not.toHaveBeenCalled();
      expect(release.providerCapabilityAudit.auditError).toBeNull();
    }
  );

  it.each(["true", "1"])(
    "invokes mocked attestation once without blocking startup for exact opt-in %s",
    async value => {
      vi.stubEnv("ENABLE_PROVIDER_CAPABILITY_ATTESTATION", value);
      const release = await initializeStartup();
      expect(fixture.refreshSnapshot).toHaveBeenCalledOnce();
      expect(fixture.refreshSnapshot).toHaveBeenCalledWith(6);
      expect(fixture.server.listen).toHaveBeenCalledOnce();
      expect(fixture.providerFetch).not.toHaveBeenCalled();
      expect(release.providerCapabilityAudit.auditError).toBeNull();
    }
  );

  it("contains an opt-in rejection without logging synthetic sensitive detail", async () => {
    const sensitiveDetail = "synthetic-provider-secret-must-not-log";
    vi.stubEnv("ENABLE_PROVIDER_CAPABILITY_ATTESTATION", "true");
    fixture.refreshSnapshot.mockRejectedValue(new Error(sensitiveDetail));
    const release = await initializeStartup();
    const logged = vi
      .mocked(console.log)
      .mock.calls.flat()
      .map(String)
      .join("\n");
    expect(fixture.server.listen).toHaveBeenCalledOnce();
    expect(release.providerCapabilityAudit.auditError).toBe(
      "Provider capability attestation did not complete."
    );
    expect(logged).not.toContain(sensitiveDetail);
  });

  it("rejects disabled direct refresh before registry DDL or provider transport", async () => {
    const registry = await actualRegistry();
    await expect(registry.refreshPolloCapabilitySnapshot(6)).rejects.toThrow(
      "Provider capability attestation is not enabled for this process."
    );
    expect(fixture.databaseQuery).not.toHaveBeenCalled();
    expect(fixture.providerFetch).not.toHaveBeenCalled();
  });

  it("rechecks after registry bootstrap before catalog transport", async () => {
    vi.stubEnv("ENABLE_PROVIDER_CAPABILITY_ATTESTATION", "true");
    fixture.databaseQuery.mockImplementation(async () => {
      vi.stubEnv("ENABLE_PROVIDER_CAPABILITY_ATTESTATION", undefined);
      return [{}];
    });
    const registry = await actualRegistry();
    await expect(registry.refreshPolloCapabilitySnapshot(6)).rejects.toThrow(
      "Provider capability attestation is not enabled for this process."
    );
    expect(fixture.databaseQuery).toHaveBeenCalled();
    expect(fixture.providerFetch).not.toHaveBeenCalled();
  });

  it("rechecks after catalog before a credentialed balance transport", async () => {
    vi.stubEnv("ENABLE_PROVIDER_CAPABILITY_ATTESTATION", "true");
    vi.stubEnv("POLLO_API_KEY", "synthetic-not-a-real-credential");
    fixture.providerFetch.mockImplementationOnce(async () => {
      vi.stubEnv("ENABLE_PROVIDER_CAPABILITY_ATTESTATION", undefined);
      return {
        ok: true,
        text: async () =>
          JSON.stringify([
            {
              brand: "synthetic",
              model: "catalog",
              type: "text2video",
              path: "/synthetic",
            },
          ]),
      };
    });
    const registry = await actualRegistry();
    const snapshot = await registry.refreshPolloCapabilitySnapshot(6);
    expect(snapshot.state).toBe("degraded");
    expect(snapshot.account.balance.failureReason).toBe(
      "Provider capability attestation is not enabled for this process."
    );
    expect(fixture.providerFetch).toHaveBeenCalledOnce();
  });
});

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
    expect(() =>
      assertGovernedPolloJobReadyForMonetization(job())
    ).not.toThrow();
    expect(() =>
      assertGovernedPolloJobReadyForMonetization(job({ artifactUrl: null }))
    ).toThrow(/quality-accepted/i);
    expect(() =>
      assertGovernedPolloJobReadyForMonetization(
        job({ state: "provider_complete" })
      )
    ).toThrow(/quality-accepted/i);
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
