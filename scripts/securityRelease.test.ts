import { createHash } from "node:crypto";
import { constants, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPROVED_RELEASE_PATHS,
  REQUIRED_LIVE_BASELINE,
  REQUIRED_RELEASE_PARENT,
  APP_ROOT,
  PUBLIC_ORIGIN,
  ReleaseFailure,
  requireRelease,
  record,
  safeEqual,
  assertCheckout,
  assertBaseline,
  assertSecretFile,
  locateJwtKey,
  assertNewKey,
  replaceJwtKey,
  assertRuntime,
  executeRelease,
  assertShellEnvSource,
  needsFailureStop,
  supervisorCommand,
  type CheckoutEvidence,
  type FileIdentity,
  type RuntimeProof,
  type ReleaseEffects,
} from "./securityReleasePolicy";
import {
  OWNER_READ,
  requestPublic,
  trpcData,
  prepareLoginProof,
  verifyLiveRelease,
  provisionLoginVerifier,
  cleanupLoginVerifier,
  type LoginProof,
} from "./securityReleaseVerification";
import {
  atomicPersistKey,
  secretSnapshot,
  stopFailedRelease,
  assertAppBootAuthorized,
  maintenanceMode,
} from "./securityReleaseRunner";
import { prepareSecurityReleaseArtifact } from "./prepareSecurityReleaseArtifact";
import { APPROVED_APPLICATION_DIGESTS } from "./securityReleaseIntegrity";

// All identities, passwords, JWTs, rows, and candidate bytes below are explicit
// synthetic fixtures. No random generator, real accounts, socket, or deployment
// operation is called. JOSE and MySQL are mocked only in this test module.
type FixtureRow = Record<string, unknown>;
type FixtureResultHeader = { affectedRows: number; insertId?: number };
type FixtureQuery = string | { sql: string; timeout: number };
type FixtureExecute = (
  query: FixtureQuery,
  values?: readonly unknown[]
) => Promise<[FixtureRow[] | FixtureResultHeader, unknown]>;
type FixtureConnection = { execute: FixtureExecute; end: () => Promise<void> };
type FixtureStat = {
  dev: number;
  ino: number;
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  uid: number;
  gid: number;
  mode: number;
  nlink: number;
  isFile: () => boolean;
  isSymbolicLink: () => boolean;
};
type FixtureHandle = {
  chown: (uid: number, gid: number) => Promise<void>;
  chmod: (mode: number) => Promise<void>;
  writeFile: (text: string, encoding: string) => Promise<void>;
  readFile: (encoding: string) => Promise<string>;
  stat: () => Promise<FixtureStat>;
  sync: () => Promise<void>;
  close: () => Promise<void>;
};
const filesystem = vi.hoisted(() => ({
  lstat: vi.fn<(file: string) => Promise<FixtureStat>>(),
  open: vi.fn<
    (file: string, flags: number, mode?: number) => Promise<FixtureHandle>
  >(),
  rename: vi.fn<(from: string, to: string) => Promise<void>>(),
  unlink: vi.fn<(file: string) => Promise<void>>(),
  readFile: vi.fn<(file: string, encoding: string) => Promise<string>>(),
}));
vi.mock("node:fs", async importOriginal => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, promises: { ...actual.promises, ...filesystem } };
});
const syntheticOperations = vi.hoisted(() => ({
  randomBytes: vi.fn<(size: number) => Buffer>(),
  randomUUID: vi.fn<() => string>(),
  hash: vi.fn<(password: string, rounds: number) => Promise<string>>(),
  command:
    vi.fn<
      (command: string, args: readonly string[], options: unknown) => string
    >(),
  build:
    vi.fn<
      (options: {
        entryPoints: string[];
        outfile: string;
        platform: string;
        format: string;
        bundle: boolean;
        packages: string;
        logLevel: string;
      }) => Promise<void>
    >(),
}));
vi.mock("node:crypto", async importOriginal => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return {
    ...actual,
    randomBytes: syntheticOperations.randomBytes,
    randomUUID: syntheticOperations.randomUUID,
  };
});
vi.mock("bcryptjs", () => ({ default: { hash: syntheticOperations.hash } }));
vi.mock("esbuild", () => ({ build: syntheticOperations.build }));
vi.mock("node:child_process", async importOriginal => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    execFileSync: (
      command: string,
      args: readonly string[],
      options: unknown
    ): string => syntheticOperations.command(command, args, options),
  };
});
const mocks = vi.hoisted(() => ({
  createConnection: vi.fn<(url: string) => Promise<FixtureConnection>>(),
  execute: vi.fn<FixtureExecute>(),
  end: vi.fn<() => Promise<void>>(),
  jwtVerify:
    vi.fn<
      (
        token: string,
        key: Uint8Array,
        options: { algorithms: string[] }
      ) => Promise<{ payload: Record<string, unknown> }>
    >(),
  sign: vi.fn<(key: Uint8Array) => Promise<string>>(),
  claims: [] as Record<string, unknown>[],
  protectedHeaders: [] as Record<string, unknown>[],
  expirations: [] as number[],
}));
vi.mock("mysql2/promise", () => ({
  default: { createConnection: mocks.createConnection },
}));
vi.mock("jose", () => ({
  jwtVerify: mocks.jwtVerify,
  SignJWT: class SyntheticSignJWT {
    constructor(payload: Record<string, unknown>) {
      mocks.claims.push(payload);
    }
    setProtectedHeader(header: Record<string, unknown>): this {
      mocks.protectedHeaders.push(header);
      return this;
    }
    setExpirationTime(expiration: number): this {
      mocks.expirations.push(expiration);
      return this;
    }
    sign(key: Uint8Array): Promise<string> {
      return mocks.sign(key);
    }
  },
}));

const SHA = "a".repeat(40);
const EXPECTED_APPROVED_RELEASE_PATHS = [
  ".github/workflows/deploy.yml",
  "SECURITY_RELEASE_ROTATION_HANDOFF.md",
  "client/src/pages/KingCamClone.tsx",
  "client/src/pages/MotionFlyerAgent.tsx",
  "deploy_work_to_prod.sh",
  "package.json",
  "scripts/check-security-release-types.ts",
  "scripts/check-security-types.ts",
  "scripts/githubWorkflowPermissionPreflight.test.ts",
  "scripts/githubWorkflowPermissionPreflight.ts",
  "scripts/prepareSecurityReleaseArtifact.ts",
  "scripts/scope-guard.js",
  "scripts/security-privileged-procedures.json",
  "scripts/securityProcedureInventory.ts",
  "scripts/securityRelease.test.ts",
  "scripts/securityReleaseEntrypoint.ts",
  "scripts/securityReleaseIntegrity.test.ts",
  "scripts/securityReleaseIntegrity.ts",
  "scripts/securityReleasePolicy.ts",
  "scripts/securityReleaseRunner.ts",
  "scripts/securityReleaseVerification.ts",
  "server/_core/authenticationRoutes.security.test.ts",
  "server/_core/authenticationRoutes.ts",
  "server/_core/authorization.security.test.ts",
  "server/_core/authorizationPolicy.ts",
  "server/_core/index.ts",
  "server/_core/resourceAuthorization.security.test.ts",
  "server/_core/securityTestSetup.ts",
  "server/_core/trpc.ts",
  "server/routers.ts",
  "server/routers/activationWarRoomRouter.ts",
  "server/routers/aderlyRouter.ts",
  "server/routers/adminRouter.ts",
  "server/routers/bodyCinemaRouter.ts",
  "server/routers/campaignVisualRouter.ts",
  "server/routers/captionStageRouter.ts",
  "server/routers/cloneCommandRouter.ts",
  "server/routers/cloneTrainingLabRouter.ts",
  "server/routers/contentCommandRouter.ts",
  "server/routers/creationDirectorRouter.ts",
  "server/routers/creationProofRouter.ts",
  "server/routers/creatorOutreachRouter.ts",
  "server/routers/designImagePilotRouter.ts",
  "server/routers/governedKingcamIdentityRouter.ts",
  "server/routers/governedPolloRouter.ts",
  "server/routers/homepageMotionPilotRouter.ts",
  "server/routers/kingWorld3DRouter.ts",
  "server/routers/kingcamBrainRouter.ts",
  "server/routers/kingcamCloneOperatingSystemRouter.ts",
  "server/routers/kingcamSupremeSystemRouter.ts",
  "server/routers/ownerCockpitRouter.ts",
  "server/routers/polloRouter.ts",
  "server/routers/vaultxAcquisitionOperatorRouter.ts",
  "server/routers/vaultxRouter.ts",
  "server/routers/videoUploadRouter.ts",
  "server/routers/waitlistEngine.ts",
  "server/services/kingcamFullBodyPerformerService.ts",
  "server/typescriptReleaseGate.test.ts",
  "vitest.config.ts",
  "vitest.github-workflow-preflight.config.ts",
  "vitest.security-release.config.ts",
  "vitest.security.config.ts",
] as const;
const SYNTHETIC_KEY = "0123456789abcdef".repeat(8);
const SYNTHETIC_SECRET_DETAIL = "SYNTHETIC_PRIVATE_DETAIL_NOT_A_CREDENTIAL";
const OLD_KEY = "literal-synthetic-prior-key";
const fetchMock = vi.fn<typeof fetch>();
const root = path.resolve(import.meta.dirname, "..");
const source = (file: string): string =>
  readFileSync(path.join(root, file), "utf8");
const proof: LoginProof = {
  email: "fixture@example.invalid",
  password: "synthetic-password-not-a-credential",
  id: 7,
  openId: "synthetic-user-id",
  role: "user",
  oldSession: "synthetic-old-session",
  ownerOpenId: "synthetic-existing-owner-id",
  appId: "synthetic-app-id",
};
const loginEnv: Record<string, string> = {
  CREATORVAULT_RELEASE_VERIFY_EMAIL: proof.email,
  CREATORVAULT_RELEASE_VERIFY_PASSWORD: proof.password,
  DATABASE_URL: "mysql://fixture.invalid/synthetic-never-connected",
  VITE_APP_ID: proof.appId,
  OWNER_OPEN_ID: proof.ownerOpenId,
  JWT_SECRET: OLD_KEY,
};
const checkout = (patch: Partial<CheckoutEvidence> = {}): CheckoutEvidence => ({
  ref: "refs/heads/main",
  event: "push",
  before: REQUIRED_RELEASE_PARENT,
  sha: SHA,
  head: SHA,
  parent: REQUIRED_RELEASE_PARENT,
  commitCount: 1,
  baselineDiffPaths: [...APPROVED_RELEASE_PATHS],
  packageUnchanged: true,
  lockfileUnchanged: true,
  ...patch,
});
const identity = (patch: Partial<FileIdentity> = {}): FileIdentity => ({
  uid: 0,
  gid: 0,
  mode: 0o100600,
  regular: true,
  symlink: false,
  links: 1,
  ...patch,
});
const runtime = (patch: Partial<RuntimeProof> = {}): RuntimeProof => ({
  status: "online",
  mode: "fork_mode",
  instances: 1,
  watch: false,
  pid: 4242,
  uid: 0,
  cwd: APP_ROOT,
  launcher: `${APP_ROOT}/start.sh`,
  interpreter: "bash",
  launcherMatchesApproved: true,
  actualNodeCommand: true,
  processKeyMatchesFile: true,
  ...patch,
});
function response(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers,
  });
}
function loginResponse(
  patch: { status?: number; body?: unknown; cookie?: string | null } = {}
): Response {
  const cookie =
    patch.cookie === undefined
      ? "app_session_id=synthetic-fresh-session; Secure; HttpOnly"
      : patch.cookie;
  return response(
    patch.body ?? {
      token: "synthetic-fresh-session",
      user: { id: proof.id, role: proof.role },
    },
    patch.status ?? 200,
    cookie === null ? {} : { "set-cookie": cookie }
  );
}
function queuePrepareSuccess(): void {
  mocks.execute.mockResolvedValueOnce([
    [{ id: proof.id, openId: proof.openId, role: proof.role }],
    [],
  ]);
  mocks.execute.mockResolvedValueOnce([
    [{ openId: proof.ownerOpenId, role: "king" }],
    [],
  ]);
  fetchMock.mockResolvedValueOnce(loginResponse());
  fetchMock.mockResolvedValueOnce(
    response({ result: { data: { json: { id: proof.id, role: proof.role } } } })
  );
  fetchMock.mockResolvedValueOnce(
    response({ result: { data: { json: { total: 3 } } } })
  );
}
function verificationResponses(): Response[] {
  return [
    response({ commit: SHA, branch: "main", environment: "production" }),
    response({ error: "Not found" }, 404),
    response({ error: "Not found" }, 404),
    response({ error: "Not found" }, 404),
    response({ error: "UNAUTHORIZED" }, 401),
    loginResponse(),
    response({
      result: { data: { json: { id: proof.id, role: proof.role } } },
    }),
    response({ error: "FORBIDDEN" }, 403),
    response({ result: { data: { json: { total: 3 } } } }),
  ];
}
function queueResponses(responses: readonly Response[]): void {
  for (const value of responses) fetchMock.mockResolvedValueOnce(value);
}
function expectFailure(action: () => unknown, code: string): void {
  expect(action).toThrowError(new ReleaseFailure(code));
}
async function expectRejected(
  action: Promise<unknown>,
  code: string
): Promise<void> {
  await expect(action).rejects.toMatchObject({
    name: "ReleaseFailure",
    message: code,
    code,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.execute.mockReset();
  mocks.createConnection.mockReset();
  mocks.end.mockReset();
  mocks.jwtVerify.mockReset();
  mocks.sign.mockReset();
  fetchMock.mockReset();
  mocks.claims.length = 0;
  mocks.protectedHeaders.length = 0;
  mocks.expirations.length = 0;
  mocks.createConnection.mockResolvedValue({
    execute: mocks.execute,
    end: mocks.end,
  });
  for (const mock of Object.values(filesystem)) mock.mockReset();
  filesystem.lstat.mockRejectedValue(new Error("UNEXPECTED_SYNTHETIC_FS_CALL"));
  filesystem.open.mockRejectedValue(new Error("UNEXPECTED_SYNTHETIC_FS_CALL"));
  filesystem.rename.mockRejectedValue(
    new Error("UNEXPECTED_SYNTHETIC_FS_CALL")
  );
  filesystem.unlink.mockRejectedValue(
    new Error("UNEXPECTED_SYNTHETIC_FS_CALL")
  );
  filesystem.readFile.mockRejectedValue(
    new Error("UNEXPECTED_SYNTHETIC_FS_CALL")
  );
  for (const mock of Object.values(syntheticOperations)) mock.mockReset();
  syntheticOperations.randomBytes.mockImplementation(() => {
    throw new Error("UNEXPECTED_RANDOM_GENERATION");
  });
  syntheticOperations.randomUUID.mockImplementation(() => {
    throw new Error("UNEXPECTED_UUID_GENERATION");
  });
  syntheticOperations.hash.mockRejectedValue(
    new Error("UNEXPECTED_PASSWORD_HASH")
  );
  syntheticOperations.command.mockImplementation(() => {
    throw new Error("UNEXPECTED_SYSTEM_COMMAND");
  });
  syntheticOperations.build.mockRejectedValue(new Error("UNEXPECTED_BUILD"));
  mocks.end.mockResolvedValue(undefined);
  mocks.jwtVerify.mockResolvedValue({ payload: { openId: proof.openId } });
  mocks.sign.mockResolvedValue("synthetic-one-shot-owner-token");
  // An unqueued request is an immediate local failure, never a real fetch.
  fetchMock.mockRejectedValue(new Error(SYNTHETIC_SECRET_DETAIL));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("authorized production permission maintenance", () => {
  it.each([0o755, 0o775, 0o777, 0o700, 0o750])(
    "tightens directory mode %i without world or group-write access",
    mode => {
      const safe = maintenanceMode("directory", mode);
      expect(safe & 0o700).toBe(0o700);
      expect(safe & 0o027).toBe(0);
      expect(safe & 0o050).toBe(mode & 0o050);
    }
  );
  it.each([0o644, 0o660, 0o600, 0o400, 0o777])(
    "restricts secret mode %i to root read/write only",
    mode => {
      expect(maintenanceMode("secret", mode)).toBe(0o600);
    }
  );
  it.each([0o644, 0o755, 0o775, 0o700])(
    "preserves launcher executable intent without widening access for %i",
    mode => {
      const safe = maintenanceMode("launcher", mode);
      expect(safe & 0o600).toBe(0o600);
      expect(safe & 0o100).toBe(mode & 0o100);
      expect(safe & 0o027).toBe(0);
    }
  );
  it("rejects invalid permission metadata", () => {
    for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY, 0.5])
      expect(() => maintenanceMode("secret", value)).toThrow();
  });
  it("keeps repairs confined, byte-preserving, non-recursive and ahead of the unchanged root guard", () => {
    const runner = source("scripts/securityReleaseRunner.ts");
    const maintenance = runner.slice(
      runner.indexOf("async function maintainProductionPermissions"),
      runner.indexOf("async function assertSourceLifetime")
    );
    expect(maintenance).not.toMatch(
      /recursive|chmod\s+-R|chown\s+-R|\.writeFile\(original/
    );
    expect(maintenance).toContain("original.equals(verified)");
    expect(maintenance).toContain("MAINTENANCE_SERVICE_IDENTITY_UNVERIFIED");
    expect(maintenance).toContain("MAINTENANCE_SERVICE_CHANGED");
    const launch = runner.slice(
      runner.indexOf("async function launchSupervisor")
    );
    expect(
      launch.indexOf("await maintainProductionPermissions(workspace, sha)")
    ).toBeLessThan(launch.indexOf("await protectedRoot()"));
    expect(runner).toContain('"UNSAFE_APPLICATION_DIRECTORY"');
    expect(runner).toContain("entry.bytesPreserved === true");
    expect(runner).toContain('"UNVERIFIED_PERMISSION_MAINTENANCE"');
  });
});
describe("release metadata and constant-time comparison primitives", () => {
  it("pins the direct live baseline, application root, origin, and complete 62-file release set", () => {
    expect(REQUIRED_LIVE_BASELINE).toBe(
      "46d3021a1bd09222a61ff1390c9cfe8f82d06422"
    );
    expect(REQUIRED_RELEASE_PARENT).toBe(
      "bada9255449aa394e9526dcd03da8b1b18e39d47"
    );
    expect(APP_ROOT).toBe("/root/creatorvault");
    expect(PUBLIC_ORIGIN).toBe("https://creatorvault.live");
    expect(APPROVED_RELEASE_PATHS).toEqual(EXPECTED_APPROVED_RELEASE_PATHS);
    expect(APPROVED_RELEASE_PATHS).toHaveLength(62);
  });
  it("accepts true gates and rejects false gates with code-only errors", () => {
    expect(() => requireRelease(true, "SYNTHETIC_GATE")).not.toThrow();
    expectFailure(
      () => requireRelease(false, "SYNTHETIC_GATE"),
      "SYNTHETIC_GATE"
    );
  });
  it.each(
    [null, undefined, [], "metadata", 7, false].map(value => ({ value }))
  )("rejects non-record metadata $value", ({ value }) => {
    expectFailure(() => record(value), "INVALID_METADATA");
  });
  it("retains object records without copying secret fields into errors", () => {
    const fixture = { value: "synthetic" };
    expect(record(fixture)).toBe(fixture);
  });
  it.each([
    ["same", "same", true],
    ["same", "sAme", false],
    ["short", "longer", false],
    ["", "", true],
    ["", "x", false],
    ["é", "é", true],
    ["é", "ee", false],
  ])("safeEqual(%j, %j) is %s", (left, right, expected) => {
    expect(safeEqual(String(left), String(right))).toBe(expected);
  });
});

describe("fail-closed direct-baseline checkout and complete exact release path gates", () => {
  it("accepts only the complete approved checkout evidence", () =>
    expect(() => assertCheckout(checkout())).not.toThrow());
  const cases: [string, Partial<CheckoutEvidence>, string][] = [
    [
      "feature branch",
      { ref: "refs/heads/feature" },
      "UNAPPROVED_REF_OR_EVENT",
    ],
    [
      "release branch",
      { ref: "refs/heads/release/security-auth-hardening-with-rotation" },
      "UNAPPROVED_REF_OR_EVENT",
    ],
    ["tag", { ref: "refs/tags/security" }, "UNAPPROVED_REF_OR_EVENT"],
    ["pull request", { event: "pull_request" }, "UNAPPROVED_REF_OR_EVENT"],
    [
      "manual dispatch",
      { event: "workflow_dispatch" },
      "UNAPPROVED_REF_OR_EVENT",
    ],
    ["empty event", { event: "" }, "UNAPPROVED_REF_OR_EVENT"],
    ["short SHA", { sha: "abcdef0", head: "abcdef0" }, "CHECKOUT_SHA_MISMATCH"],
    [
      "uppercase SHA",
      { sha: "A".repeat(40), head: "A".repeat(40) },
      "CHECKOUT_SHA_MISMATCH",
    ],
    [
      "nonhex SHA",
      { sha: "g".repeat(40), head: "g".repeat(40) },
      "CHECKOUT_SHA_MISMATCH",
    ],
    [
      "wrong checked-out head",
      { head: "b".repeat(40) },
      "CHECKOUT_SHA_MISMATCH",
    ],
    [
      "different parent",
      { parent: "b".repeat(40) },
      "UNAPPROVED_RELEASE_LINEAGE",
    ],
    ["absent parent", { parent: "" }, "UNAPPROVED_RELEASE_LINEAGE"],
    [
      "merge parents",
      { parent: `${REQUIRED_RELEASE_PARENT} ${"b".repeat(40)}` },
      "UNAPPROVED_RELEASE_LINEAGE",
    ],
    ["zero commits", { commitCount: 0 }, "UNAPPROVED_RELEASE_LINEAGE"],
    ["multiple commits", { commitCount: 2 }, "UNAPPROVED_RELEASE_LINEAGE"],
    [
      "different push before SHA",
      { before: "b".repeat(40) },
      "UNAPPROVED_RELEASE_LINEAGE",
    ],
    ["absent push before SHA", { before: "" }, "UNAPPROVED_RELEASE_LINEAGE"],
    [
      "missing approved release path",
      { baselineDiffPaths: APPROVED_RELEASE_PATHS.slice(1) },
      "EXCLUDED_OR_MISSING_RELEASE_PATH",
    ],
    [
      "extra release path",
      {
        baselineDiffPaths: [...APPROVED_RELEASE_PATHS, "client/src/feature.ts"],
      },
      "EXCLUDED_OR_MISSING_RELEASE_PATH",
    ],
    [
      "duplicate release path",
      {
        baselineDiffPaths: [
          ...APPROVED_RELEASE_PATHS,
          APPROVED_RELEASE_PATHS[0]!,
        ],
      },
      "EXCLUDED_OR_MISSING_RELEASE_PATH",
    ],
    [
      "substituted release path",
      {
        baselineDiffPaths: [
          ...APPROVED_RELEASE_PATHS.slice(1),
          "client/src/feature.ts",
        ],
      },
      "EXCLUDED_OR_MISSING_RELEASE_PATH",
    ],
    [
      "package modification",
      { packageUnchanged: false },
      "DEPENDENCY_OR_LOCKFILE_CHANGE",
    ],
    [
      "lock modification",
      { lockfileUnchanged: false },
      "DEPENDENCY_OR_LOCKFILE_CHANGE",
    ],
    [
      "both dependency modifications",
      { packageUnchanged: false, lockfileUnchanged: false },
      "DEPENDENCY_OR_LOCKFILE_CHANGE",
    ],
  ];
  it.each(cases)("rejects %s", (_name, patch, code) =>
    expectFailure(() => assertCheckout(checkout(patch)), code)
  );
});

describe("mandatory live baseline gate", () => {
  it("accepts the exact production baseline on main", () =>
    expect(() =>
      assertBaseline({
        commit: REQUIRED_LIVE_BASELINE,
        branch: "main",
        environment: "production",
      })
    ).not.toThrow());
  it.each([
    { commit: SHA, branch: "main", environment: "production" },
    {
      commit: REQUIRED_LIVE_BASELINE.slice(0, 7),
      branch: "main",
      environment: "production",
    },
    {
      commit: REQUIRED_LIVE_BASELINE,
      branch: "feature",
      environment: "production",
    },
    { commit: REQUIRED_LIVE_BASELINE, branch: "main", environment: "staging" },
    { commit: REQUIRED_LIVE_BASELINE, branch: "main" },
    {},
  ])("rejects mismatched baseline %j", value =>
    expectFailure(() => assertBaseline(value), "LIVE_BASELINE_MISMATCH")
  );
  it.each([null, [], "untrusted"].map(value => ({ value })))(
    "rejects malformed baseline $value",
    ({ value }) =>
      expectFailure(() => assertBaseline(value), "INVALID_METADATA")
  );
});

describe("root-only single-link regular secret file", () => {
  it("accepts exactly a root-owned 0600 regular file", () =>
    expect(() => assertSecretFile(identity())).not.toThrow());
  const cases: [string, Partial<FileIdentity>, string][] = [
    ["world-readable", { mode: 0o644 }, "UNSAFE_SECRET_FILE_PERMISSIONS"],
    ["group-readable", { mode: 0o640 }, "UNSAFE_SECRET_FILE_PERMISSIONS"],
    ["group-writable", { mode: 0o660 }, "UNSAFE_SECRET_FILE_PERMISSIONS"],
    ["executable", { mode: 0o700 }, "UNSAFE_SECRET_FILE_PERMISSIONS"],
    ["wrong uid", { uid: 1000 }, "UNSAFE_SECRET_FILE_PERMISSIONS"],
    ["wrong gid", { gid: 1000 }, "UNSAFE_SECRET_FILE_PERMISSIONS"],
    ["symlink", { symlink: true }, "UNSAFE_SECRET_FILE_TYPE"],
    ["directory/device", { regular: false }, "UNSAFE_SECRET_FILE_TYPE"],
    ["hardlink", { links: 2 }, "UNSAFE_SECRET_FILE_TYPE"],
    ["unlinked file", { links: 0 }, "UNSAFE_SECRET_FILE_TYPE"],
  ];
  it.each(cases)("rejects %s", (_name, patch, code) =>
    expectFailure(() => assertSecretFile(identity(patch)), code)
  );
});

describe("literal JWT assignment parsing and byte-preserving replacement", () => {
  it.each([
    `JWT_SECRET=${OLD_KEY}`,
    `JWT_SECRET='${OLD_KEY}'\n`,
    `JWT_SECRET="${OLD_KEY}"\r\n`,
    `  export JWT_SECRET = '${OLD_KEY}'  # keep comment\r\n`,
  ])("accepts one literal assignment %j", text =>
    expect(locateJwtKey(text).value).toBe(OLD_KEY)
  );
  it.each([
    "",
    "DATABASE_URL=synthetic\n",
    "# JWT_SECRET=ignored\n",
    "  # JWT_SECRET=ignored\r\n",
  ])("rejects absent key %j", text =>
    expectFailure(() => locateJwtKey(text), "JWT_KEY_ABSENT")
  );
  it.each([
    `JWT_SECRET=${OLD_KEY}\nJWT_SECRET=${OLD_KEY}\n`,
    `JWT_SECRET=${OLD_KEY}\nexport JWT_SECRET=${OLD_KEY}\n`,
    "JWT_SECRET=$(synthetic-command)\n",
    "JWT_SECRET=`synthetic-command`\n",
    "JWT_SECRET='literal$EXPANSION'\n",
    "JWT_SECRET='literal\\escape'\n",
    "JWT_SECRET='literal;command'\n",
    "JWT_SECRET='literal with spaces'\n",
    "JWT_SECRET=''\n",
    "JWT_SECRET=\n",
    "JWT_SECRET='unterminated\n",
    'JWT_SECRET="unterminated\n',
    "JWT_SECRET='literal'junk\n",
    "JWT_SECRET=literal extra\n",
    "export JWT_SECRET\n",
    "OTHER_JWT_SECRET=ambiguous\n",
    "source synthetic-JWT_SECRET-file\n",
    "JWT_SECRET='literal\u0000value'\n",
    "JWT_SECRET='literal\u007fvalue'\n",
  ])("rejects nonliteral, ambiguous, or duplicate assignment %j", text =>
    expect(() => locateJwtKey(text)).toThrow(ReleaseFailure)
  );
  it("ignores commented assignments while retaining the active location", () => {
    const found = locateJwtKey(
      `# JWT_SECRET=ignored\r\n  export JWT_SECRET = '${OLD_KEY}' # keep\r\n`
    );
    expect(found).toEqual({
      line: 1,
      prefix: "  export JWT_SECRET = ",
      suffix: " # keep",
      value: OLD_KEY,
      ending: "\r\n",
    });
  });
  it.each(["\n", "\r\n"])(
    "preserves unrelated variables, comments, blank lines, whitespace, and %j",
    ending => {
      const before = [
        `# untouched comment`,
        `DATABASE_URL='synthetic$literal'`,
        "",
        `  export JWT_SECRET = \"${OLD_KEY}\"  # retain JWT comment`,
        "OTHER=unchanged",
        "",
      ].join(ending);
      const expected = before.replace(`\"${OLD_KEY}\"`, `'${SYNTHETIC_KEY}'`);
      expect(replaceJwtKey(before, SYNTHETIC_KEY)).toBe(expected);
      expect(locateJwtKey(replaceJwtKey(before, SYNTHETIC_KEY)).value).toBe(
        SYNTHETIC_KEY
      );
    }
  );
  it("preserves a missing trailing newline and mixed endings", () => {
    const before = `A=unchanged\r\nJWT_SECRET=${OLD_KEY} # retained\nZ=last`;
    expect(replaceJwtKey(before, SYNTHETIC_KEY)).toBe(
      `A=unchanged\r\nJWT_SECRET='${SYNTHETIC_KEY}' # retained\nZ=last`
    );
  });
  it("refuses replacement before malformed input can be persisted", () =>
    expect(() =>
      replaceJwtKey(
        `JWT_SECRET=${OLD_KEY}\nJWT_SECRET=duplicate`,
        SYNTHETIC_KEY
      )
    ).toThrow(ReleaseFailure));
  it("accepts only the fixed synthetic 128-character hex candidate", () =>
    expect(() => assertNewKey(SYNTHETIC_KEY)).not.toThrow());
  it.each([
    "",
    "a".repeat(128),
    "0123456".repeat(18) + "01",
    SYNTHETIC_KEY.slice(1),
    `${SYNTHETIC_KEY}0`,
    SYNTHETIC_KEY.toUpperCase(),
    `g${SYNTHETIC_KEY.slice(1)}`,
    `${SYNTHETIC_KEY}\n`,
  ])("rejects weak generated candidate %j", key => {
    expectFailure(() => assertNewKey(key), "WEAK_GENERATED_KEY");
    expectFailure(
      () => replaceJwtKey(`JWT_SECRET=${OLD_KEY}`, key),
      "WEAK_GENERATED_KEY"
    );
  });
});

describe("known runtime source and current live key equality", () => {
  it("accepts only the byte-approved start.sh shell source", () =>
    expect(assertRuntime(runtime())).toBe("shell-env"));
  const dotenv = (): RuntimeProof =>
    runtime({
      launcher: `${APP_ROOT}/dist/index.js`,
      interpreter: "node",
      launcherMatchesApproved: false,
      nodePreload: true,
      dotenvPath: `${APP_ROOT}/.env`,
      dotenvOverride: "true",
    });
  it.each(["node", "/usr/bin/node"])(
    "accepts explicit dotenv override with %s",
    interpreter =>
      expect(assertRuntime({ ...dotenv(), interpreter })).toBe(
        "dotenv-override"
      )
  );
  const cases: [string, Partial<RuntimeProof>, string][] = [
    ["offline", { status: "stopped" }, "UNSUPPORTED_PM2_PROCESS"],
    ["cluster", { mode: "cluster_mode" }, "UNSUPPORTED_PM2_PROCESS"],
    ["multiple instances", { instances: 2 }, "UNSUPPORTED_PM2_PROCESS"],
    ["no instance", { instances: 0 }, "UNSUPPORTED_PM2_PROCESS"],
    ["watch enabled", { watch: true }, "UNSUPPORTED_PM2_PROCESS"],
    ["watch paths enabled", { watch: ["src"] }, "UNSUPPORTED_PM2_PROCESS"],
    ["invalid pid", { pid: 1 }, "UNSUPPORTED_PM2_PROCESS"],
    ["nonroot process", { uid: 1000 }, "UNSUPPORTED_PM2_PROCESS"],
    ["wrong cwd", { cwd: "/tmp/synthetic" }, "UNPROVEN_ACTIVE_SECRET_SOURCE"],
    [
      "not an actual node command",
      { actualNodeCommand: false },
      "UNPROVEN_ACTIVE_SECRET_SOURCE",
    ],
    [
      "live process key differs from file",
      { processKeyMatchesFile: false },
      "UNPROVEN_ACTIVE_SECRET_SOURCE",
    ],
    [
      "unknown launcher",
      { launcher: `${APP_ROOT}/custom.sh` },
      "UNKNOWN_RUNTIME_SOURCE",
    ],
    [
      "unapproved start.sh bytes",
      { launcherMatchesApproved: false },
      "UNKNOWN_RUNTIME_SOURCE",
    ],
    [
      "wrong shell interpreter",
      { interpreter: "sh" },
      "UNKNOWN_RUNTIME_SOURCE",
    ],
  ];
  it.each(cases)("rejects %s", (_name, patch, code) =>
    expectFailure(() => assertRuntime(runtime(patch)), code)
  );
  const dotenvCases: [string, Partial<RuntimeProof>][] = [
    ["no preload", { nodePreload: false }],
    ["unset preload", { nodePreload: undefined }],
    ["wrong dotenv path", { dotenvPath: "/tmp/synthetic.env" }],
    ["unset dotenv path", { dotenvPath: undefined }],
    ["override false", { dotenvOverride: "false" }],
    ["unset override", { dotenvOverride: undefined }],
    ["nonliteral override", { dotenvOverride: "1" }],
    ["non-node interpreter", { interpreter: "bash" }],
  ];
  it.each(dotenvCases)("rejects dotenv source with %s", (_name, patch) =>
    expectFailure(
      () => assertRuntime({ ...dotenv(), ...patch }),
      "UNKNOWN_RUNTIME_SOURCE"
    )
  );
});

type Operation =
  | "preflight"
  | "stage"
  | "activateSecureArtifact"
  | "generateKey"
  | "persistKey"
  | "reload"
  | "verify";
type Scenario = {
  fail?: Operation;
  afterMark?: boolean;
  noMark?: boolean;
  generated?: string;
  error?: unknown;
};
function transactionFixture(options: Scenario = {}): {
  trace: string[];
  effects: ReleaseEffects;
} {
  const trace: string[] = [];
  function step(operation: Operation): void {
    trace.push(operation);
    if (options.fail === operation)
      throw options.error ?? new Error(SYNTHETIC_SECRET_DETAIL);
  }
  const effects: ReleaseEffects = {
    preflight: async () => {
      step("preflight");
    },
    stage: async () => {
      step("stage");
    },
    activateSecureArtifact: async () => {
      step("activateSecureArtifact");
    },
    generateKey: async () => {
      step("generateKey");
      return options.generated ?? SYNTHETIC_KEY;
    },
    persistKey: async (key, markRotated) => {
      expect(key).toBe(options.generated ?? SYNTHETIC_KEY);
      trace.push("persistKey");
      if (options.fail === "persistKey" && !options.afterMark)
        throw options.error ?? new Error(SYNTHETIC_SECRET_DETAIL);
      if (!options.noMark) {
        trace.push("markRotated");
        markRotated();
      }
      if (options.fail === "persistKey")
        throw options.error ?? new Error(SYNTHETIC_SECRET_DETAIL);
      trace.push("verified-durable-persistence");
    },
    reload: async () => {
      step("reload");
    },
    verify: async () => {
      step("verify");
    },
    clearSensitiveMemory: () => {
      trace.push("clearSensitiveMemory");
    },
  };
  return { trace, effects };
}

describe("release transaction ordering, fail-stop behavior, and forward-only rotation", () => {
  it("activates secure artifacts before candidate generation, then persists durably before reload and verification", async () => {
    const { trace, effects } = transactionFixture();
    expect(await executeRelease(effects)).toEqual({
      ok: true,
      rotated: true,
      code: "SECURITY_RELEASE_VERIFIED",
      phase: "complete",
    });
    expect(trace).toEqual([
      "preflight",
      "stage",
      "activateSecureArtifact",
      "generateKey",
      "persistKey",
      "markRotated",
      "verified-durable-persistence",
      "reload",
      "verify",
      "clearSensitiveMemory",
    ]);
  });
  it.each(["preflight", "stage", "activateSecureArtifact"] as const)(
    "%s failure generates no candidate, persists nothing, and never reloads",
    async fail => {
      const { trace, effects } = transactionFixture({ fail });
      const result = await executeRelease(effects);
      expect(result).toMatchObject({
        ok: false,
        rotated: false,
        code: "RELEASE_OPERATION_FAILED",
      });
      for (const operation of ["generateKey", "persistKey", "reload", "verify"])
        expect(trace).not.toContain(operation);
      expect(trace.at(-1)).toBe("clearSensitiveMemory");
    }
  );
  it("a preflight/build-gate rejection never reaches staging or generation", async () => {
    const { trace, effects } = transactionFixture({
      fail: "preflight",
      error: new ReleaseFailure("SYNTHETIC_BUILD_GATE_FAILED"),
    });
    expect(await executeRelease(effects)).toMatchObject({
      ok: false,
      rotated: false,
      phase: "preflight",
      code: "SYNTHETIC_BUILD_GATE_FAILED",
    });
    expect(trace).toEqual(["preflight", "clearSensitiveMemory"]);
  });
  it("generator exception persists nothing and reloads nothing", async () => {
    const { trace, effects } = transactionFixture({ fail: "generateKey" });
    expect(await executeRelease(effects)).toMatchObject({
      rotated: false,
      phase: "generation",
      ok: false,
    });
    expect(trace).not.toContain("persistKey");
    expect(trace).not.toContain("reload");
  });
  it("weak generator output is rejected before persistence", async () => {
    const { trace, effects } = transactionFixture({
      generated: "a".repeat(128),
    });
    expect(await executeRelease(effects)).toEqual({
      ok: false,
      rotated: false,
      phase: "generation",
      code: "WEAK_GENERATED_KEY",
    });
    expect(trace).not.toContain("persistKey");
    expect(trace).not.toContain("reload");
  });
  it("failed secret persistence before rename prevents reload and does not claim rotation", async () => {
    const { trace, effects } = transactionFixture({ fail: "persistKey" });
    expect(await executeRelease(effects)).toEqual({
      ok: false,
      rotated: false,
      phase: "persistence",
      code: "RELEASE_OPERATION_FAILED",
    });
    expect(trace).not.toContain("reload");
    expect(trace).not.toContain("verify");
  });
  it("a resolved persistence effect without the rotation marker still prevents reload", async () => {
    const { trace, effects } = transactionFixture({ noMark: true });
    expect(await executeRelease(effects)).toEqual({
      ok: false,
      rotated: false,
      phase: "persistence",
      code: "ROTATION_NOT_DURABLE",
    });
    expect(trace).not.toContain("reload");
  });
  const forwardCases: [Operation, boolean, string][] = [
    ["persistKey", true, "persistence"],
    ["reload", false, "reload"],
    ["verify", false, "verification"],
  ];
  it.each(forwardCases)(
    "failure in %s after markRotated remains explicitly forward-only",
    async (fail, afterMark, phase) => {
      const { trace, effects } = transactionFixture({ fail, afterMark });
      const result = await executeRelease(effects);
      expect(result).toEqual({
        ok: false,
        rotated: true,
        phase,
        code: "RELEASE_OPERATION_FAILED",
      });
      expect(trace.filter(value => value === "markRotated")).toHaveLength(1);
      expect(trace.filter(value => value === "generateKey")).toHaveLength(1);
      expect(
        trace.filter(value => value === "clearSensitiveMemory")
      ).toHaveLength(1);
      expect(trace.some(value => /rollback|restore/i.test(value))).toBe(false);
      if (fail === "persistKey") expect(trace).not.toContain("reload");
      if (fail === "reload") expect(trace).not.toContain("verify");
    }
  );
  it.each([
    "preflight",
    "stage",
    "activateSecureArtifact",
    "generateKey",
    "persistKey",
    "reload",
    "verify",
  ] as const)(
    "sanitizes exception messages and attached secret fields at %s",
    async fail => {
      const error = Object.assign(
        new Error(`${SYNTHETIC_SECRET_DETAIL}:${SYNTHETIC_KEY}`),
        {
          secret: SYNTHETIC_KEY,
          cookie: proof.oldSession,
          password: proof.password,
        }
      );
      const { effects } = transactionFixture({ fail, error });
      const result = await executeRelease(effects);
      expect(Object.keys(result).sort()).toEqual([
        "code",
        "ok",
        "phase",
        "rotated",
      ]);
      const serialized = JSON.stringify(result);
      for (const detail of [
        SYNTHETIC_SECRET_DETAIL,
        SYNTHETIC_KEY,
        proof.oldSession,
        proof.password,
      ])
        expect(serialized).not.toContain(detail);
      expect(result.code).toBe("RELEASE_OPERATION_FAILED");
    }
  );
  it.each(
    [
      null,
      undefined,
      SYNTHETIC_SECRET_DETAIL,
      { password: proof.password },
    ].map(error => ({ error }))
  )("sanitizes non-Error throws $error", async ({ error }) => {
    const { effects } = transactionFixture();
    effects.preflight = async () => {
      throw error;
    };
    expect(await executeRelease(effects)).toEqual({
      ok: false,
      rotated: false,
      code: "RELEASE_OPERATION_FAILED",
      phase: "preflight",
    });
  });
  it("retains only a typed failure code, never its stack or attached details", async () => {
    const error = Object.assign(new ReleaseFailure("SYNTHETIC_TYPED_GATE"), {
      secret: SYNTHETIC_KEY,
    });
    const { effects } = transactionFixture({ fail: "stage", error });
    expect(await executeRelease(effects)).toEqual({
      ok: false,
      rotated: false,
      phase: "staging",
      code: "SYNTHETIC_TYPED_GATE",
    });
  });
});

describe("public HTTP verification transport is bounded and fail-closed", () => {
  it.each([
    "",
    "https://fixture.invalid",
    "//fixture.invalid/path",
    "relative/path",
  ])("rejects unsafe path %j before fetch", async requestPath => {
    await expectRejected(
      requestPublic(requestPath),
      "UNSAFE_VERIFICATION_PATH"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("uses the fixed origin, manual redirects, no-cache, bounded timeout, and session cookie only in memory", async () => {
    fetchMock.mockResolvedValueOnce(response({ ok: true }));
    expect(
      await requestPublic("/fixture", {
        method: "POST",
        body: { synthetic: true },
        token: "synthetic-cookie",
      })
    ).toEqual({
      status: 200,
      location: null,
      cookie: null,
      body: { ok: true },
    });
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe(`${PUBLIC_ORIGIN}/fixture`);
    expect(call?.[1]).toMatchObject({
      method: "POST",
      redirect: "manual",
      body: '{"synthetic":true}',
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        Cookie: "app_session_id=synthetic-cookie",
      },
    });
    expect(call?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });
  it("does not send a Cookie or Content-Type for an unauthenticated GET", async () => {
    fetchMock.mockResolvedValueOnce(response({}));
    await requestPublic("/fixture");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
      body: undefined,
    });
  });
  it.each([301, 302, 303, 307, 308])(
    "rejects redirect status %s with a Location",
    async status => {
      fetchMock.mockResolvedValueOnce(
        response({ secret: SYNTHETIC_KEY }, status, {
          location: "https://fixture.invalid/private",
        })
      );
      await expectRejected(requestPublic("/fixture"), "VERIFICATION_REDIRECT");
    }
  );
  it("rejects even a 200 response bearing a Location", async () => {
    fetchMock.mockResolvedValueOnce(
      response({}, 200, { location: "/unexpected" })
    );
    await expectRejected(requestPublic("/fixture"), "VERIFICATION_REDIRECT");
  });
  it("sanitizes network exceptions", async () =>
    await expectRejected(
      requestPublic("/fixture"),
      "PUBLIC_VERIFICATION_REQUEST_FAILED"
    ));
  it("enforces a one-MiB response bound and cancels the stream", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(1024 * 1024 + 1));
      },
      cancel,
    });
    fetchMock.mockResolvedValueOnce(new Response(stream));
    await expectRejected(
      requestPublic("/fixture"),
      "VERIFICATION_RESPONSE_TOO_LARGE"
    );
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("allows exactly one MiB without printing non-JSON bodies", async () => {
    fetchMock.mockResolvedValueOnce(new Response("x".repeat(1024 * 1024)));
    expect((await requestPublic("/fixture")).body).toBeNull();
  });
  it("converts stream-reader exceptions to a fixed code", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error(SYNTHETIC_SECRET_DETAIL));
      },
    });
    fetchMock.mockResolvedValueOnce(new Response(stream));
    await expectRejected(
      requestPublic("/fixture"),
      "PUBLIC_VERIFICATION_REQUEST_FAILED"
    );
  });
  it("handles empty responses without retaining text", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await requestPublic("/fixture")).toEqual({
      status: 204,
      body: null,
      location: null,
      cookie: null,
    });
  });
  it("decodes a split UTF-8 JSON payload correctly", async () => {
    const bytes = new TextEncoder().encode('{"name":"é"}');
    const offset = bytes.indexOf(0xc3) + 1;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, offset));
        controller.enqueue(bytes.slice(offset));
        controller.close();
      },
    });
    fetchMock.mockResolvedValueOnce(new Response(stream));
    expect((await requestPublic("/fixture")).body).toEqual({ name: "é" });
  });
  it("extracts both plain and SuperJSON tRPC data", () => {
    expect(trpcData({ result: { data: { id: 7 } } })).toEqual({ id: 7 });
    expect(trpcData({ result: { data: { json: { id: 7 } } } })).toEqual({
      id: 7,
    });
  });
  it.each(
    [null, [], {}, { result: null }, { result: [] }].map(body => ({ body }))
  )("rejects malformed tRPC envelopes $body", ({ body }) =>
    expectFailure(() => trpcData(body), "INVALID_METADATA")
  );
});

describe("existing ordinary login proof is read-only and required before rotation", () => {
  it.each([
    "CREATORVAULT_RELEASE_VERIFY_EMAIL",
    "CREATORVAULT_RELEASE_VERIFY_PASSWORD",
    "DATABASE_URL",
    "VITE_APP_ID",
  ])("missing %s fails before DB or network", async key => {
    const env = { ...loginEnv };
    delete env[key];
    await expectRejected(
      prepareLoginProof(env),
      "EXISTING_LOGIN_VERIFICATION_INPUTS_MISSING"
    );
    expect(mocks.createConnection).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    "CREATORVAULT_RELEASE_VERIFY_EMAIL",
    "CREATORVAULT_RELEASE_VERIFY_PASSWORD",
    "DATABASE_URL",
    "VITE_APP_ID",
  ])("empty %s fails before DB or network", async key => {
    await expectRejected(
      prepareLoginProof({ ...loginEnv, [key]: "" }),
      "EXISTING_LOGIN_VERIFICATION_INPUTS_MISSING"
    );
    expect(mocks.createConnection).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("proves an existing ordinary account and existing DB owner with SELECT only", async () => {
    queuePrepareSuccess();
    const result = await prepareLoginProof({
      ...loginEnv,
      CREATORVAULT_RELEASE_VERIFY_EMAIL: " Fixture@Example.Invalid ",
    });
    expect(result).toEqual({
      ...proof,
      email: " Fixture@Example.Invalid ",
      oldSession: "synthetic-fresh-session",
    });
    expect(mocks.execute).toHaveBeenCalledTimes(2);
    for (const [query] of mocks.execute.mock.calls) {
      expect(query).toMatch(/^SELECT /);
      expect(query).not.toMatch(/INSERT|UPDATE|DELETE|CREATE|ALTER/i);
    }
    expect(mocks.execute.mock.calls[0]?.[1]).toEqual([
      "fixture@example.invalid",
    ]);
    expect(mocks.execute.mock.calls[1]?.[1]).toEqual([proof.ownerOpenId]);
    expect(mocks.end).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[1]?.body).toContain('"rememberMe":false');
  });
  it.each([
    { rows: [] },
    {
      rows: [
        { id: 7, openId: proof.openId, role: "user" },
        { id: 8, openId: "duplicate", role: "user" },
      ],
    },
  ])("rejects nonunique account rows $rows", async ({ rows }) => {
    mocks.execute.mockResolvedValueOnce([rows, []]);
    await expectRejected(
      prepareLoginProof(loginEnv),
      "VERIFICATION_ACCOUNT_NOT_UNIQUE"
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.end).toHaveBeenCalledOnce();
  });
  it.each([
    { id: 7, openId: proof.openId, role: "king" },
    { id: 7, openId: proof.openId, role: "admin" },
    { id: 7, openId: proof.openId, role: "unknown" },
    { id: 7, openId: null, role: "user" },
    { id: "invalid", openId: proof.openId, role: "user" },
    { id: Number.MAX_SAFE_INTEGER + 1, openId: proof.openId, role: "user" },
  ])("rejects nonordinary or malformed verification account %j", async user => {
    mocks.execute.mockResolvedValueOnce([[user], []]);
    await expectRejected(
      prepareLoginProof(loginEnv),
      "VERIFICATION_ACCOUNT_NOT_ORDINARY"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("accepts a creator as the ordinary account", async () => {
    mocks.execute.mockResolvedValueOnce([
      [{ id: proof.id, openId: proof.openId, role: "creator" }],
      [],
    ]);
    mocks.execute.mockResolvedValueOnce([
      [{ openId: proof.ownerOpenId, role: "admin" }],
      [],
    ]);
    fetchMock.mockResolvedValueOnce(
      loginResponse({
        body: {
          token: "synthetic-fresh-session",
          user: { id: proof.id, role: "creator" },
        },
      })
    );
    fetchMock.mockResolvedValueOnce(
      response({ result: { data: { id: proof.id } } })
    );
    fetchMock.mockResolvedValueOnce(
      response({ result: { data: { total: 3 } } })
    );
    expect((await prepareLoginProof(loginEnv)).role).toBe("creator");
  });
  it("rejects an absent owner ID before public login", async () => {
    mocks.execute.mockResolvedValueOnce([
      [{ id: proof.id, openId: proof.openId, role: proof.role }],
      [],
    ]);
    const env = { ...loginEnv };
    delete env.OWNER_OPEN_ID;
    await expectRejected(prepareLoginProof(env), "EXISTING_OWNER_ID_MISSING");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    { owners: [] },
    { owners: [{ openId: proof.ownerOpenId, role: "user" }] },
    {
      owners: [
        { openId: proof.ownerOpenId, role: "king" },
        { openId: "duplicate", role: "king" },
      ],
    },
  ])("rejects unverified owner rows $owners", async ({ owners }) => {
    mocks.execute.mockResolvedValueOnce([
      [{ id: proof.id, openId: proof.openId, role: proof.role }],
      [],
    ]);
    mocks.execute.mockResolvedValueOnce([owners, []]);
    await expectRejected(
      prepareLoginProof(loginEnv),
      "EXISTING_OWNER_ROLE_UNVERIFIED"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("sanitizes a database connection failure without public calls", async () => {
    mocks.createConnection.mockRejectedValueOnce(
      new Error(SYNTHETIC_SECRET_DETAIL)
    );
    await expectRejected(
      prepareLoginProof(loginEnv),
      "READ_ONLY_ACCOUNT_PROOF_FAILED"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("sanitizes a SELECT failure and closes the connection", async () => {
    mocks.execute.mockRejectedValueOnce(new Error(SYNTHETIC_SECRET_DETAIL));
    await expectRejected(
      prepareLoginProof(loginEnv),
      "READ_ONLY_ACCOUNT_PROOF_FAILED"
    );
    expect(mocks.end).toHaveBeenCalledOnce();
  });
  const failures: [string, Response, Response | undefined, string][] = [
    [
      "login status",
      loginResponse({ status: 401 }),
      undefined,
      "STANDARD_LOGIN_FAILED",
    ],
    [
      "missing token",
      loginResponse({ body: { user: { id: proof.id, role: proof.role } } }),
      undefined,
      "STANDARD_LOGIN_SESSION_MISSING",
    ],
    [
      "empty token",
      loginResponse({
        body: { token: "", user: { id: proof.id, role: proof.role } },
      }),
      undefined,
      "STANDARD_LOGIN_SESSION_MISSING",
    ],
    [
      "missing cookie",
      loginResponse({ cookie: null }),
      undefined,
      "STANDARD_LOGIN_SESSION_MISSING",
    ],
    [
      "wrong cookie",
      loginResponse({ cookie: "other=synthetic" }),
      undefined,
      "STANDARD_LOGIN_SESSION_MISSING",
    ],
    [
      "wrong identity",
      loginResponse({
        body: { token: "synthetic", user: { id: 8, role: proof.role } },
      }),
      undefined,
      "PRE_RELEASE_LOGIN_IDENTITY_MISMATCH",
    ],
    [
      "wrong role",
      loginResponse({
        body: { token: "synthetic", user: { id: proof.id, role: "admin" } },
      }),
      undefined,
      "PRE_RELEASE_LOGIN_IDENTITY_MISMATCH",
    ],
    [
      "session status",
      loginResponse(),
      response({ result: { data: { id: proof.id } } }, 401),
      "PRE_RELEASE_SESSION_UNVERIFIED",
    ],
    [
      "session identity",
      loginResponse(),
      response({ result: { data: { id: 8 } } }),
      "PRE_RELEASE_SESSION_UNVERIFIED",
    ],
  ];
  it.each(failures)(
    "rejects pre-release %s",
    async (_name, login, me, code) => {
      mocks.execute.mockResolvedValueOnce([
        [{ id: proof.id, openId: proof.openId, role: proof.role }],
        [],
      ]);
      mocks.execute.mockResolvedValueOnce([
        [{ openId: proof.ownerOpenId, role: "king" }],
        [],
      ]);
      fetchMock.mockResolvedValueOnce(login.clone());
      if (me) fetchMock.mockResolvedValueOnce(me.clone());
      await expectRejected(prepareLoginProof(loginEnv), code);
      expect(mocks.end).toHaveBeenCalledOnce();
    }
  );
  it("connection cleanup failure does not leak or overturn successful proof", async () => {
    queuePrepareSuccess();
    mocks.end.mockRejectedValueOnce(new Error(SYNTHETIC_SECRET_DETAIL));
    expect((await prepareLoginProof(loginEnv)).id).toBe(proof.id);
  });
});

describe("complete HTTP release verification proves denial, rotation, login, and DB-owner access", () => {
  it("verifies the complete sequence without real JWT signing or networking", async () => {
    queueResponses(verificationResponses());
    await expect(
      verifyLiveRelease(SHA, proof, SYNTHETIC_KEY)
    ).resolves.toBeUndefined();
    expect(
      fetchMock.mock.calls.map(call => [
        String(call[0]).replace(PUBLIC_ORIGIN, ""),
        call[1]?.method,
      ])
    ).toEqual([
      ["/__release", "GET"],
      ["/api/dev-login", "GET"],
      ["/api/dev-login", "POST"],
      ["/api/dev-login", "PUT"],
      [OWNER_READ, "GET"],
      ["/api/auth/login", "POST"],
      ["/api/trpc/auth.me", "GET"],
      [OWNER_READ, "GET"],
      [OWNER_READ, "GET"],
    ]);
    expect(mocks.jwtVerify).toHaveBeenCalledWith(
      "synthetic-fresh-session",
      Buffer.from(SYNTHETIC_KEY),
      { algorithms: ["HS256"] }
    );
    expect(mocks.claims).toEqual([
      {
        openId: proof.ownerOpenId,
        appId: proof.appId,
        name: "Security release verification",
      },
    ]);
    expect(mocks.protectedHeaders).toEqual([{ alg: "HS256", typ: "JWT" }]);
    expect(mocks.expirations[0]).toBeGreaterThanOrEqual(
      Math.floor(Date.now() / 1000) + 59
    );
    expect(mocks.expirations[0]).toBeLessThanOrEqual(
      Math.floor(Date.now() / 1000) + 60
    );
    expect(mocks.sign).toHaveBeenCalledWith(Buffer.from(SYNTHETIC_KEY));
    const requests = fetchMock.mock.calls;
    expect(requests[4]?.[1]?.headers).toMatchObject({
      Cookie: `app_session_id=${proof.oldSession}`,
    });
    expect(requests[7]?.[1]?.headers).toMatchObject({
      Cookie: "app_session_id=synthetic-fresh-session",
    });
    expect(requests[8]?.[1]?.headers).toMatchObject({
      Cookie: "app_session_id=synthetic-one-shot-owner-token",
    });
  });
  const cases: [string, number, () => Response, string][] = [
    [
      "release status",
      0,
      () =>
        response(
          { commit: SHA, branch: "main", environment: "production" },
          503
        ),
      "PUBLIC_RELEASE_MISMATCH",
    ],
    [
      "release SHA",
      0,
      () =>
        response({
          commit: "b".repeat(40),
          branch: "main",
          environment: "production",
        }),
      "PUBLIC_RELEASE_MISMATCH",
    ],
    [
      "short release SHA",
      0,
      () =>
        response({
          commit: SHA.slice(0, 7),
          branch: "main",
          environment: "production",
        }),
      "PUBLIC_RELEASE_MISMATCH",
    ],
    [
      "release branch",
      0,
      () =>
        response({ commit: SHA, branch: "feature", environment: "production" }),
      "PUBLIC_RELEASE_MISMATCH",
    ],
    [
      "release environment",
      0,
      () => response({ commit: SHA, branch: "main", environment: "staging" }),
      "PUBLIC_RELEASE_MISMATCH",
    ],
    ["malformed release metadata", 0, () => response(null), "INVALID_METADATA"],
    [
      "dev-login GET status",
      1,
      () => response({}, 200),
      "DEVELOPMENT_LOGIN_NOT_RETIRED",
    ],
    [
      "dev-login POST status",
      2,
      () => response({}, 403),
      "DEVELOPMENT_LOGIN_NOT_RETIRED",
    ],
    [
      "dev-login PUT status",
      3,
      () => response({}, 405),
      "DEVELOPMENT_LOGIN_NOT_RETIRED",
    ],
    [
      "dev-login GET cookie",
      1,
      () => response({}, 404, { "set-cookie": "app_session_id=synthetic" }),
      "DEVELOPMENT_LOGIN_NOT_RETIRED",
    ],
    [
      "dev-login POST cookie",
      2,
      () => response({}, 404, { "set-cookie": "unrelated=synthetic" }),
      "DEVELOPMENT_LOGIN_NOT_RETIRED",
    ],
    [
      "dev-login PUT cookie",
      3,
      () => response({}, 404, { "set-cookie": "app_session_id=synthetic" }),
      "DEVELOPMENT_LOGIN_NOT_RETIRED",
    ],
    [
      "dev-login GET redirect",
      1,
      () => response({}, 404, { location: "/synthetic" }),
      "VERIFICATION_REDIRECT",
    ],
    [
      "dev-login POST redirect",
      2,
      () => response({}, 302, { location: "/synthetic" }),
      "VERIFICATION_REDIRECT",
    ],
    [
      "dev-login PUT redirect",
      3,
      () => response({}, 307, { location: "/synthetic" }),
      "VERIFICATION_REDIRECT",
    ],
    [
      "old session still valid",
      4,
      () => response({}, 200),
      "OLD_SESSION_NOT_INVALIDATED",
    ],
    [
      "old session merely forbidden",
      4,
      () => response({}, 403),
      "OLD_SESSION_NOT_INVALIDATED",
    ],
    [
      "fresh login status",
      5,
      () => loginResponse({ status: 500 }),
      "STANDARD_LOGIN_FAILED",
    ],
    [
      "fresh login token",
      5,
      () => loginResponse({ body: { token: "" } }),
      "STANDARD_LOGIN_SESSION_MISSING",
    ],
    [
      "fresh login cookie",
      5,
      () => loginResponse({ cookie: null }),
      "STANDARD_LOGIN_SESSION_MISSING",
    ],
    [
      "ordinary me status",
      6,
      () =>
        response({ result: { data: { id: proof.id, role: proof.role } } }, 401),
      "ORDINARY_SESSION_FAILED",
    ],
    [
      "ordinary me ID",
      6,
      () => response({ result: { data: { id: 8, role: proof.role } } }),
      "ORDINARY_SESSION_FAILED",
    ],
    [
      "ordinary me role",
      6,
      () => response({ result: { data: { id: proof.id, role: "admin" } } }),
      "ORDINARY_SESSION_FAILED",
    ],
    [
      "ordinary me invalid data",
      6,
      () => response({ result: { data: null } }),
      "INVALID_METADATA",
    ],
    [
      "ordinary owner-read allowed",
      7,
      () => response({}, 200),
      "ORDINARY_OWNER_READ_NOT_DENIED",
    ],
    [
      "ordinary owner-read unauthenticated",
      7,
      () => response({}, 401),
      "ORDINARY_OWNER_READ_NOT_DENIED",
    ],
    [
      "owner read denied",
      8,
      () => response({ result: { data: { total: 3 } } }, 403),
      "EXISTING_OWNER_ACCESS_FAILED",
    ],
    [
      "owner result missing count",
      8,
      () => response({ result: { data: {} } }),
      "EXISTING_OWNER_ACCESS_FAILED",
    ],
    [
      "owner count not numeric",
      8,
      () => response({ result: { data: { total: "3" } } }),
      "EXISTING_OWNER_ACCESS_FAILED",
    ],
    [
      "owner malformed data",
      8,
      () => response({ result: { data: null } }),
      "INVALID_METADATA",
    ],
  ];
  it.each(cases)(
    "fails closed for %s",
    async (_name, index, replacement, code) => {
      const responses = verificationResponses();
      responses[index] = replacement();
      queueResponses(responses);
      await expectRejected(verifyLiveRelease(SHA, proof, SYNTHETIC_KEY), code);
      expect(fetchMock).toHaveBeenCalledTimes(index + 1);
    }
  );
  it("rejects a fresh session not verified under the rotated key", async () => {
    queueResponses(verificationResponses());
    mocks.jwtVerify.mockRejectedValueOnce(
      new Error(`${SYNTHETIC_SECRET_DETAIL}:${SYNTHETIC_KEY}`)
    );
    await expectRejected(
      verifyLiveRelease(SHA, proof, SYNTHETIC_KEY),
      "FRESH_LOGIN_NOT_SIGNED_BY_ROTATED_KEY"
    );
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("rejects fresh JWT identity mismatch before ordinary or owner reads", async () => {
    queueResponses(verificationResponses());
    mocks.jwtVerify.mockResolvedValueOnce({
      payload: { openId: "synthetic-other-account" },
    });
    await expectRejected(
      verifyLiveRelease(SHA, proof, SYNTHETIC_KEY),
      "FRESH_LOGIN_IDENTITY_MISMATCH"
    );
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8])(
    "transport failure at HTTP step %s aborts without leaking response or request details",
    async index => {
      const responses = verificationResponses();
      queueResponses(responses.slice(0, index));
      fetchMock.mockRejectedValueOnce(
        new Error(
          `${SYNTHETIC_SECRET_DETAIL}:${proof.password}:${proof.oldSession}`
        )
      );
      const { effects } = transactionFixture();
      effects.verify = () => verifyLiveRelease(SHA, proof, SYNTHETIC_KEY);
      const result = await executeRelease(effects);
      expect(result).toEqual({
        ok: false,
        rotated: true,
        phase: "verification",
        code: "PUBLIC_VERIFICATION_REQUEST_FAILED",
      });
      expect(fetchMock).toHaveBeenCalledTimes(index + 1);
      for (const detail of [
        proof.password,
        proof.oldSession,
        SYNTHETIC_KEY,
        SYNTHETIC_SECRET_DETAIL,
      ])
        expect(JSON.stringify(result)).not.toContain(detail);
    }
  );
  it("owner-signing exceptions remain forward-only and sanitized by the release result", async () => {
    queueResponses(verificationResponses());
    mocks.sign.mockRejectedValueOnce(
      new Error(`${SYNTHETIC_SECRET_DETAIL}:${SYNTHETIC_KEY}`)
    );
    const { effects } = transactionFixture();
    effects.verify = () => verifyLiveRelease(SHA, proof, SYNTHETIC_KEY);
    expect(await executeRelease(effects)).toEqual({
      ok: false,
      rotated: true,
      phase: "verification",
      code: "RELEASE_OPERATION_FAILED",
    });
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });
});

describe("approved application integrity and root authentication protections remain intact", () => {
  it.each(Object.entries(APPROVED_APPLICATION_DIGESTS))(
    "matches immutable approved SHA-256 application bytes in %s",
    (file, expected) => {
      expect(createHash("sha256").update(source(file)).digest("hex")).toBe(
        expected
      );
    }
  );
  it("retired dev-login is denied for all methods before normal auth handlers without cookies or redirects", () => {
    const routes = source("server/_core/authenticationRoutes.ts");
    expect(routes).toContain('app.all("/api/dev-login"');
    expect(routes).toContain('res.status(404).json({ error: "Not found" })');
    expect(routes.indexOf('app.all("/api/dev-login"')).toBeLessThan(
      routes.indexOf("registerOAuthRoutes(app)")
    );
    expect(routes).not.toMatch(/res\.(?:cookie|redirect)\s*\(/);
  });
  it("owner middleware remains rooted in protected DB-resolved user roles", () => {
    const trpc = source("server/_core/trpc.ts");
    expect(trpc).toContain(
      "export const ownerProcedure = protectedProcedure.use"
    );
    expect(trpc).toContain("!isOwnerRole(ctx.user.role)");
    expect(trpc).toContain('code: "FORBIDDEN"');
    expect(trpc).toContain("export const kingProcedure = ownerProcedure");
    expect(trpc).toContain("export const adminProcedure = ownerProcedure");
  });
  it("the dedicated release config selects controlled release and integrity tests with no inherited server security setup", () => {
    const config = source("vitest.security-release.config.ts");
    expect(config).toContain('"scripts/securityRelease.test.ts"');
    expect(config).toContain('"scripts/securityReleaseIntegrity.test.ts"');
    expect(config).toContain("setupFiles: []");
    expect(config).not.toContain("securityTestSetup");
  });
  it("the strict checker owns all eight release files and does not discard diagnostics", () => {
    const checker = source("scripts/check-security-release-types.ts");
    for (const file of [
      "scripts/securityReleasePolicy.ts",
      "scripts/securityReleaseRunner.ts",
      "scripts/securityReleaseVerification.ts",
      "scripts/securityReleaseEntrypoint.ts",
      "scripts/prepareSecurityReleaseArtifact.ts",
      "scripts/securityRelease.test.ts",
      "scripts/check-security-release-types.ts",
      "vitest.security-release.config.ts",
    ])
      expect(checker).toContain(`"${file}"`);
    expect(checker).toContain("strict: true");
    expect(checker).toContain("noImplicitAny: true");
    expect(checker).toContain("ts.getPreEmitDiagnostics(program)");
    expect(checker).not.toContain("diagnostics.filter");
  });
});

// Only the real atomic controller is called; every filesystem operation it uses
// is replaced above. The synthetic /root names are strings, never disk targets.
const SYNTHETIC_ENV = `# keep\r\nDATABASE_URL=synthetic\r\nJWT_SECRET='${OLD_KEY}' # keep-key-comment\r\nOTHER=unchanged`;
type PersistOperation =
  | "open-temp"
  | "chown"
  | "chmod"
  | "write"
  | "file-sync"
  | "file-close"
  | "rename"
  | "open-directory"
  | "directory-sync"
  | "directory-close"
  | "open-readback"
  | "stat-readback"
  | "readback";
function syntheticStats(patch: Partial<FixtureStat> = {}): FixtureStat {
  return {
    dev: 1,
    ino: 11,
    uid: 0,
    gid: 0,
    nlink: 1,
    mode: 0o100600,
    size: SYNTHETIC_ENV.length,
    mtimeMs: 100,
    ctimeMs: 100,
    isFile: () => true,
    isSymbolicLink: () => false,
    ...patch,
  };
}
function persistenceFixture(fail?: PersistOperation): {
  trace: string[];
  snapshot: {
    dev: number;
    ino: number;
    size: number;
    mtimeMs: number;
    ctimeMs: number;
    uid: number;
    gid: number;
    mode: number;
  };
  mark: () => void;
  marked: () => boolean;
  written: () => string;
  setReadback: (text: string) => void;
} {
  const trace: string[] = [];
  let activated = false;
  let marked = false;
  let written = "";
  let readback: string | undefined;
  const before = syntheticStats();
  const after = syntheticStats({ ino: 12, mtimeMs: 200, ctimeMs: 200 });
  const snapshot = {
    dev: before.dev,
    ino: before.ino,
    size: before.size,
    mtimeMs: before.mtimeMs,
    ctimeMs: before.ctimeMs,
    uid: before.uid,
    gid: before.gid,
    mode: before.mode,
  };
  function step(operation: PersistOperation): void {
    trace.push(operation);
    if (operation === fail)
      throw new Error(`${SYNTHETIC_SECRET_DETAIL}:${SYNTHETIC_KEY}`);
  }
  const file: FixtureHandle = {
    chown: async (uid, gid) => {
      step("chown");
      expect([uid, gid]).toEqual([0, 0]);
    },
    chmod: async mode => {
      step("chmod");
      expect(mode).toBe(0o600);
    },
    writeFile: async (text, encoding) => {
      step("write");
      expect(encoding).toBe("utf8");
      written = text;
    },
    readFile: async () => {
      throw new Error("UNEXPECTED_TEMP_READ");
    },
    stat: async () => before,
    sync: async () => {
      step("file-sync");
    },
    close: async () => {
      step("file-close");
    },
  };
  const directory: FixtureHandle = {
    ...file,
    sync: async () => {
      step("directory-sync");
    },
    close: async () => {
      step("directory-close");
    },
  };
  const read: FixtureHandle = {
    ...file,
    stat: async () => {
      step("stat-readback");
      return after;
    },
    readFile: async encoding => {
      step("readback");
      expect(encoding).toBe("utf8");
      return readback ?? written;
    },
    close: async () => {
      trace.push("readback-close");
    },
  };
  filesystem.lstat.mockImplementation(async filename => {
    expect(filename).toBe(`${APP_ROOT}/.env`);
    trace.push("lstat-secret");
    return activated ? after : before;
  });
  filesystem.open.mockImplementation(async (filename, flags, mode) => {
    if (filename === `${APP_ROOT}/.env.security-rotation-tmp`) {
      step("open-temp");
      expect(flags).toBe(
        constants.O_WRONLY |
          constants.O_CREAT |
          constants.O_EXCL |
          constants.O_NOFOLLOW
      );
      expect(mode).toBe(0o600);
      return file;
    }
    if (filename === APP_ROOT) {
      step("open-directory");
      expect(flags).toBe(constants.O_RDONLY | constants.O_DIRECTORY);
      return directory;
    }
    expect(filename).toBe(`${APP_ROOT}/.env`);
    step("open-readback");
    expect(flags).toBe(constants.O_RDONLY | constants.O_NOFOLLOW);
    return read;
  });
  filesystem.rename.mockImplementation(async (from, to) => {
    expect([from, to]).toEqual([
      `${APP_ROOT}/.env.security-rotation-tmp`,
      `${APP_ROOT}/.env`,
    ]);
    step("rename");
    activated = true;
  });
  filesystem.unlink.mockImplementation(async filename => {
    expect(filename).toBe(`${APP_ROOT}/.env.security-rotation-tmp`);
    trace.push("cleanup-temp");
  });
  return {
    trace,
    snapshot,
    mark: () => {
      trace.push("markRotated");
      marked = true;
    },
    marked: () => marked,
    written: () => written,
    setReadback: text => {
      readback = text;
    },
  };
}

describe("real atomic persistence controller with synthetic in-memory filesystem", () => {
  it("writes root-owned 0600 exclusively, fsyncs, closes, renames, marks, fsyncs directory, and proves readback", async () => {
    const fixture = persistenceFixture();
    await expect(
      atomicPersistKey(
        fixture.snapshot,
        SYNTHETIC_ENV,
        SYNTHETIC_KEY,
        fixture.mark
      )
    ).resolves.toBeUndefined();
    expect(fixture.trace).toEqual([
      "lstat-secret",
      "open-temp",
      "chown",
      "chmod",
      "write",
      "file-sync",
      "file-close",
      "lstat-secret",
      "rename",
      "markRotated",
      "open-directory",
      "directory-sync",
      "directory-close",
      "lstat-secret",
      "open-readback",
      "stat-readback",
      "readback",
      "readback-close",
      "cleanup-temp",
    ]);
    expect(fixture.written()).toBe(
      SYNTHETIC_ENV.replace(`'${OLD_KEY}'`, `'${SYNTHETIC_KEY}'`)
    );
    expect(fixture.marked()).toBe(true);
    expect(filesystem.rename).toHaveBeenCalledOnce();
  });
  it("a preexisting temporary path fails exclusive creation and is never deleted", async () => {
    const fixture = persistenceFixture("open-temp");
    await expectRejected(
      atomicPersistKey(
        fixture.snapshot,
        SYNTHETIC_ENV,
        SYNTHETIC_KEY,
        fixture.mark
      ),
      "JWT_PERSISTENCE_FAILED"
    );
    expect(fixture.marked()).toBe(false);
    expect(filesystem.unlink).not.toHaveBeenCalled();
    expect(filesystem.rename).not.toHaveBeenCalled();
  });
  it.each([
    "chown",
    "chmod",
    "write",
    "file-sync",
    "file-close",
    "rename",
  ] as const)(
    "%s failure never marks rotation or advances to readback",
    async operation => {
      const fixture = persistenceFixture(operation);
      await expectRejected(
        atomicPersistKey(
          fixture.snapshot,
          SYNTHETIC_ENV,
          SYNTHETIC_KEY,
          fixture.mark
        ),
        "JWT_PERSISTENCE_FAILED"
      );
      expect(fixture.marked()).toBe(false);
      expect(fixture.trace).not.toContain("open-directory");
      expect(fixture.trace).not.toContain("open-readback");
      expect(filesystem.unlink).toHaveBeenCalledOnce();
    }
  );
  it.each([
    "open-directory",
    "directory-sync",
    "directory-close",
    "open-readback",
    "stat-readback",
    "readback",
  ] as const)(
    "%s failure after rename is forward-only and prevents PM2 reload",
    async operation => {
      const fixture = persistenceFixture(operation);
      const transaction = transactionFixture();
      transaction.effects.persistKey = (key, mark) =>
        atomicPersistKey(fixture.snapshot, SYNTHETIC_ENV, key, () => {
          fixture.mark();
          mark();
        });
      const result = await executeRelease(transaction.effects);
      expect(result).toEqual({
        ok: false,
        rotated: true,
        phase: "persistence",
        code: "JWT_PERSISTENCE_FAILED",
      });
      expect(fixture.marked()).toBe(true);
      expect(filesystem.rename).toHaveBeenCalledOnce();
      expect(transaction.trace).not.toContain("reload");
      expect(transaction.trace).not.toContain("verify");
      expect(JSON.stringify(result)).not.toContain(SYNTHETIC_KEY);
    }
  );
  it("readback key mismatch after rename remains forward-only and blocks reload", async () => {
    const fixture = persistenceFixture();
    fixture.setReadback(`JWT_SECRET=${OLD_KEY}`);
    const transaction = transactionFixture();
    transaction.effects.persistKey = (key, mark) =>
      atomicPersistKey(fixture.snapshot, SYNTHETIC_ENV, key, () => {
        fixture.mark();
        mark();
      });
    expect(await executeRelease(transaction.effects)).toEqual({
      ok: false,
      rotated: true,
      phase: "persistence",
      code: "PERSISTED_JWT_KEY_UNVERIFIED",
    });
    expect(transaction.trace).not.toContain("reload");
    expect(filesystem.rename).toHaveBeenCalledOnce();
  });
  it("durable real-controller success is the only path permitting the transaction reload", async () => {
    const fixture = persistenceFixture();
    const transaction = transactionFixture();
    transaction.effects.persistKey = async (key, mark) => {
      await atomicPersistKey(fixture.snapshot, SYNTHETIC_ENV, key, () => {
        fixture.mark();
        mark();
      });
      expect(fixture.trace).toContain("directory-sync");
      expect(fixture.trace).toContain("readback");
      transaction.trace.push("atomic-persistence-verified");
    };
    expect(await executeRelease(transaction.effects)).toMatchObject({
      ok: true,
      rotated: true,
    });
    expect(
      transaction.trace.indexOf("atomic-persistence-verified")
    ).toBeLessThan(transaction.trace.indexOf("reload"));
  });
  it.each([
    "dev",
    "ino",
    "size",
    "mtimeMs",
    "ctimeMs",
    "uid",
    "gid",
    "mode",
  ] as const)(
    "changed snapshot %s fails before a temporary file exists",
    async field => {
      const fixture = persistenceFixture();
      const changed = {
        ...fixture.snapshot,
        [field]: fixture.snapshot[field] + 1,
      };
      await expectRejected(
        atomicPersistKey(changed, SYNTHETIC_ENV, SYNTHETIC_KEY, fixture.mark),
        "SECRET_SOURCE_CHANGED"
      );
      expect(filesystem.open).not.toHaveBeenCalled();
      expect(filesystem.rename).not.toHaveBeenCalled();
      expect(fixture.marked()).toBe(false);
    }
  );
  it("a concurrent source mutation during writing fails before rename", async () => {
    const fixture = persistenceFixture();
    filesystem.lstat
      .mockResolvedValueOnce(syntheticStats())
      .mockResolvedValueOnce(syntheticStats({ ctimeMs: 101 }));
    await expectRejected(
      atomicPersistKey(
        fixture.snapshot,
        SYNTHETIC_ENV,
        SYNTHETIC_KEY,
        fixture.mark
      ),
      "SECRET_SOURCE_CHANGED"
    );
    expect(filesystem.rename).not.toHaveBeenCalled();
    expect(fixture.marked()).toBe(false);
    expect(filesystem.unlink).toHaveBeenCalledOnce();
  });
  it("a readback inode race is rejected after marking rotation", async () => {
    const fixture = persistenceFixture();
    filesystem.lstat
      .mockResolvedValueOnce(syntheticStats())
      .mockResolvedValueOnce(syntheticStats())
      .mockResolvedValueOnce(
        syntheticStats({ ino: 999, mtimeMs: 200, ctimeMs: 200 })
      );
    await expectRejected(
      atomicPersistKey(
        fixture.snapshot,
        SYNTHETIC_ENV,
        SYNTHETIC_KEY,
        fixture.mark
      ),
      "SECRET_SOURCE_CHANGED"
    );
    expect(fixture.marked()).toBe(true);
    expect(fixture.trace).not.toContain("readback");
  });
  it("weak input fails before temp-file creation even in the real controller", async () => {
    const fixture = persistenceFixture();
    await expectRejected(
      atomicPersistKey(
        fixture.snapshot,
        SYNTHETIC_ENV,
        "a".repeat(128),
        fixture.mark
      ),
      "WEAK_GENERATED_KEY"
    );
    expect(filesystem.open).not.toHaveBeenCalled();
    expect(fixture.marked()).toBe(false);
  });
  it("missing secret snapshot reports only a fixed code", async () =>
    await expectRejected(secretSnapshot(), "SECRET_FILE_MISSING"));
  it("an oversized secret source is rejected without reading it", async () => {
    filesystem.lstat.mockResolvedValueOnce(
      syntheticStats({ size: 1024 * 1024 + 1 })
    );
    await expectRejected(secretSnapshot(), "SECRET_FILE_UNBOUNDED");
    expect(filesystem.open).not.toHaveBeenCalled();
  });
});

function expectOrdered(text: string, markers: readonly string[]): void {
  let previous = -1;
  for (const marker of markers) {
    const index = text.indexOf(marker);
    expect(index, `required gate exists: ${marker}`).toBeGreaterThanOrEqual(0);
    expect(
      index,
      `required gate follows predecessor: ${marker}`
    ).toBeGreaterThan(previous);
    previous = index;
  }
}
function executableLines(text: string): string {
  return text
    .split("\n")
    .filter(line => !/^\s*(?:#|\/\/)/.test(line))
    .join("\n");
}

describe("static single-controller workflow and deployment safety contracts", () => {
  it("requires a normal main push, direct baseline parent, one commit, and integrity policy before installation", () => {
    const workflow = source(".github/workflows/deploy.yml");
    expect(workflow).toContain("test \"$GITHUB_REF\" = 'refs/heads/main'");
    expect(workflow).toContain("test \"$GITHUB_EVENT_NAME\" = 'push'");
    expect(workflow).toContain(
      "CREATORVAULT_RELEASE_BEFORE: ${{ github.event.before }}"
    );
    expect(workflow).toContain(
      "runs-on: [self-hosted, linux, creatorvault-production]"
    );
    expect(workflow).toContain(`release_parent='${REQUIRED_RELEASE_PARENT}'`);
    expect(workflow).toContain(
      'test "$CREATORVAULT_RELEASE_BEFORE" = "$release_parent"'
    );
    expect(workflow).toContain('test "$(git rev-parse HEAD)" = "$GITHUB_SHA"');
    expect(workflow).toContain(
      'test "$(git show -s --format=%P HEAD)" = "$release_parent"'
    );
    expect(workflow).toContain(
      'test "$(git rev-list --count "$release_parent..HEAD")" = \'1\''
    );
    expect(workflow).toContain(
      "pnpm exec tsx scripts/securityReleaseIntegrity.ts"
    );
    expect(workflow).not.toMatch(
      /APPROVED_SECURITY_PARENT|1204f479|3076e8c|6c1cbf|case\s+"\$\(git diff --name-only/
    );
    expectOrdered(workflow, [
      "Verify approved security-release successor",
      "Enable pnpm",
      "Install dependencies",
    ]);
  });
  it("runs the integrity policy, security and controlled-release suites, parser tests, strict checks, build and artifact before deployment", () => {
    expectOrdered(source(".github/workflows/deploy.yml"), [
      "pnpm install --frozen-lockfile",
      "pnpm exec tsx scripts/securityReleaseIntegrity.ts",
      "pnpm test:security",
      "pnpm check:security",
      "vitest run --config vitest.security-release.config.ts",
      "vitest run --config vitest.github-workflow-preflight.config.ts",
      "tsx scripts/check-security-release-types.ts",
      "bash -n deploy_work_to_prod.sh",
      "pnpm check\n",
      "pnpm build\n",
      "Stamp and validate secure release artifact",
      'bash "$GITHUB_WORKSPACE/deploy_work_to_prod.sh"',
    ]);
  });
  it("does not skip or soften failures or cancel an in-progress irreversible rotation", () => {
    const workflow = source(".github/workflows/deploy.yml");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("fetch-depth: 0");
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).toContain("contents: read");
    expect(executableLines(workflow)).not.toMatch(
      /continue-on-error|\|\|\s*true|always\(\)|workflow_dispatch/
    );
    expect(workflow).toContain("sudo -n env");
  });
  it("workflow uses the single runner entrypoint, never embeds secrets, direct PM2 reloads, remote SSH, or legacy DDL", () => {
    const workflow = executableLines(source(".github/workflows/deploy.yml"));
    expect(workflow).not.toMatch(
      /\bpm2\s+(?:reload|restart|start|jlist|logs)\b|\bssh\b|\bscp\b|secrets\.|JWT_SECRET|CREATORVAULT_RELEASE_VERIFY_(?:EMAIL|PASSWORD)/
    );
    expect(workflow).not.toMatch(
      /node\s+.*ensure-governed-media-schema|\bpnpm\s+db:/
    );
    expect(
      workflow.match(/bash "\$GITHUB_WORKSPACE\/deploy_work_to_prod\.sh"/g)
    ).toHaveLength(1);
  });
  it("delegates the sole exact-file policy to securityReleaseIntegrity instead of a partial workflow allowlist", () => {
    const workflow = source(".github/workflows/deploy.yml");
    const integrity = source("scripts/securityReleaseIntegrity.ts");
    expect(workflow).toContain(
      "# One canonical exact-file policy below; no separate partial allowlist."
    );
    expect(workflow).toContain(
      "pnpm exec tsx scripts/securityReleaseIntegrity.ts"
    );
    expect(workflow).not.toMatch(/case\s+"\$\(git diff --name-only/);
    expect(integrity).toContain("APPROVED_RELEASE_PATHS");
    expect(integrity).toContain("assertCheckout(checkoutEvidence(");
  });
  it("the shell wrapper requires existing root/main/push context, no arguments, and restrictive umask", () => {
    const wrapper = source("deploy_work_to_prod.sh");
    expect(wrapper).toContain("set -euo pipefail");
    expect(wrapper).toContain("umask 077");
    expect(wrapper).toContain('[ "$#" -eq 0 ]');
    expect(wrapper).toContain('[ "$(id -u)" -eq 0 ]');
    expect(wrapper).toContain("'refs/heads/main'");
    expect(wrapper).toContain("'push'");
    expect(wrapper).toContain("CREATORVAULT_RELEASE_SHA");
    expect(wrapper).toContain("CREATORVAULT_RELEASE_WORKSPACE");
    expect(wrapper).toContain(
      "exec pnpm exec tsx scripts/securityReleaseRunner.ts"
    );
  });
  it("the shell wrapper has no generic deploy, missing-PM2 installation, DDL, direct reload, or noisy health fallback", () => {
    const wrapper = executableLines(source("deploy_work_to_prod.sh"));
    expect(wrapper).not.toMatch(
      /\b(?:npm|pnpm)\s+install|\bpm2\s+(?:start|restart|reload|logs|jlist)|\bcurl\b|ensure-governed-media-schema|JWT_SECRET|\.env/
    );
    expect(wrapper).not.toMatch(/\|\|\s*true|\bcat\b|set\s+-x/);
    expect(wrapper).toContain("command -v pm2");
  });
  it("all runner subprocess output is captured silently and low-level failures discard exception details", () => {
    const runner = source("scripts/securityReleaseRunner.ts");
    expect(runner.match(/\bexecFileSync\(/g)).toHaveLength(1);
    expect(runner).toContain('stdio: ["ignore", "pipe", "pipe"]');
    expect(runner).toContain("delete environment.JWT_SECRET");
    expect(runner).toContain(
      'throw new ReleaseFailure("LOCAL_RELEASE_COMMAND_FAILED")'
    );
    expect(runner).not.toMatch(
      /\b(?:spawn|execSync|spawnSync)\s*\(|stdio:\s*["']inherit/
    );
    expect(runner).not.toMatch(
      /console\.(?:log|error)\([^\n]*(?:error\.message|error\.stack|original|newKey|loginProof|\.raw|buffer|contents)/
    );
  });
  it("the runner reloads exactly once with no restart/start fallback or legacy schema initializer invocation", () => {
    const runner = executableLines(
      source("scripts/securityReleaseRunner.ts")
    ).replace(/\s+/g, " ");
    expect(
      runner.match(
        /silentCommand\(\s*APP_ROOT,\s*"pm2",\s*\["reload",\s*"creatorvault",\s*"--update-env"\]/g
      )
    ).toHaveLength(1);
    expect(runner).not.toMatch(
      /silentCommand\([^;]*"pm2"[^;]*\["(?:restart|start|logs)"|silentCommand\([^;]*(?:"pnpm"|"npm")|silentCommand\([^;]*ensure-governed-media-schema/
    );
    expect(runner).toContain('silentCommand(APP_ROOT, "pm2", ["save"]');
    const verification = runner.slice(
      runner.indexOf("async verify()"),
      runner.indexOf("clearSensitiveMemory()")
    );
    expectOrdered(verification, [
      "await verifyLiveRelease(sha, loginProof, newKey)",
      "POST_RELEASE_RESTART_LOOP",
      "await verifyLogs(cursors)",
      'silentCommand(APP_ROOT, "pm2", ["save"]',
    ]);
    expect(runner.match(/\["save"\]/g)).toHaveLength(1);
  });
  it("the real runner proves proc/file equality, byte-approved launcher and literal dotenv override before staging", () => {
    const runner = source("scripts/securityReleaseRunner.ts");
    expect(runner).toContain("safeEqual(liveKey, oldKey)");
    expect(runner).toContain('inherited.get("DOTENV_CONFIG_PATH")');
    expect(runner).toContain('inherited.get("DOTENV_CONFIG_OVERRIDE")');
    expect(runner).toContain(
      'args.length === 2 && args[0] === "-r" && args[1] === "dotenv/config"'
    );
    expect(runner).toContain("`${REQUIRED_LIVE_BASELINE}:start.sh`");
    expectOrdered(runner, [
      "async preflight()",
      "assertBaseline(live.body)",
      "processProof = await proveRuntime(workspace, original)",
      "await provisionLoginVerifier(env, sha,",
      "loginProof = await prepareLoginProof(",
      "async stage()",
      "async activateSecureArtifact()",
      "async generateKey()",
      "async persistKey(key, markRotated)",
      "async reload()",
      "async verify()",
    ]);
  });
  it("writes durable activation intent immediately before the first live artifact rename and never restores the prior artifact", () => {
    const runner = source("scripts/securityReleaseRunner.ts");
    const activation = runner.slice(
      runner.indexOf("async activateSecureArtifact()"),
      runner.indexOf("async generateKey()")
    );
    expect(activation).toMatch(
      /await writeJournal\(sha, "activation-intent"\);\s*await fs\.rename\(`\$\{APP_ROOT\}\/dist`, PRIOR_PATH\);/
    );
    expectOrdered(activation, [
      'await writeJournal(sha, "activation-intent")',
      "await fs.rename(`${APP_ROOT}/dist`, PRIOR_PATH)",
      'await fs.rename(path.join(STAGE_PATH, "dist"), `${APP_ROOT}/dist`)',
      'await writeJournal(sha, "staged")',
    ]);
    expect(activation).not.toContain(
      "await fs.rename(PRIOR_PATH, `${APP_ROOT}/dist`)"
    );
  });
  it("authorizes an unverified boot only for a rotated release with a currently active supervisor", () => {
    const runner = source("scripts/securityReleaseRunner.ts");
    const boot = runner.slice(
      runner.indexOf("export async function assertAppBootAuthorized"),
      runner.indexOf("async function launchSupervisor")
    );
    expectOrdered(
      boot.replace(/\s+/g, ""),
      [
        'if (state.phase === "verified") return;',
        'requireRelease(state.phase === "rotated", "BOOT_RELEASE_REQUIRES_FORWARD_FIX")',
        '"is-active"',
      ].map(gate => gate.replace(/\s+/g, ""))
    );
    expect(boot).not.toMatch(
      /state\.phase === "(?:preflight|activation-intent|staged|rotation-intent)"/
    );
  });
  it("generation verifies secure activation first and clears the temporary random buffer", () => {
    const runner = source("scripts/securityReleaseRunner.ts");
    const generation = runner.slice(
      runner.indexOf("async generateKey()"),
      runner.indexOf("async persistKey(key, markRotated)")
    );
    expectOrdered(generation, [
      "await assertArtifact(`${APP_ROOT}/dist`, sha)",
      "randomBytes(64)",
      "random.fill(0)",
    ]);
    expect(runner.match(/randomBytes\(64\)/g)).toHaveLength(1);
    expect(runner).toMatch(
      /clearSensitiveMemory\(\)\s*\{\s*original = "";\s*newKey = "";/
    );
  });
  it("runner reporting labels post-rotation failure FORWARD_ONLY and never emits raw errors or secret-bearing PM2 metadata", () => {
    const runner = source("scripts/securityReleaseRunner.ts");
    expect(runner).toContain(
      'recovery: result.rotated && !result.ok ? "FORWARD_ONLY" : "NONE"'
    );
    const outputLines = runner
      .split("\n")
      .filter(line => /console\.(?:log|error)\(/.test(line));
    expect(outputLines).toHaveLength(8);
    for (const line of outputLines)
      expect(line).not.toMatch(
        /JSON\.stringify\((?:error|e\.raw|e\.root|env|loginProof|proof|original|newKey)\)|console\.(?:log|error)\(error\)/
      );
  });
});

describe("pre-release old signing-source and existing owner read proofs", () => {
  it("verifies the old login JWT against the literal current key and proves owner-read access before returning readiness", async () => {
    queuePrepareSuccess();
    await prepareLoginProof(loginEnv);
    expect(mocks.jwtVerify).toHaveBeenCalledWith(
      "synthetic-fresh-session",
      Buffer.from(OLD_KEY),
      { algorithms: ["HS256"] }
    );
    expect(mocks.sign).toHaveBeenCalledWith(Buffer.from(OLD_KEY));
    expect(mocks.claims).toEqual([
      {
        openId: proof.ownerOpenId,
        appId: proof.appId,
        name: "Security release verification",
      },
    ]);
    expect(fetchMock.mock.calls[2]?.[0]).toBe(`${PUBLIC_ORIGIN}${OWNER_READ}`);
    expect(fetchMock.mock.calls[2]?.[1]?.headers).toMatchObject({
      Cookie: "app_session_id=synthetic-one-shot-owner-token",
    });
    expect(mocks.execute).toHaveBeenCalledTimes(2);
    expect(mocks.end).toHaveBeenCalledOnce();
  });
  it("rejects old login JWT signing-source mismatch before auth.me or owner-read", async () => {
    queuePrepareSuccess();
    mocks.jwtVerify.mockRejectedValueOnce(
      new Error(`${SYNTHETIC_SECRET_DETAIL}:${OLD_KEY}`)
    );
    await expectRejected(
      prepareLoginProof(loginEnv),
      "PRE_RELEASE_SESSION_SIGNING_SOURCE_MISMATCH"
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.end).toHaveBeenCalledOnce();
  });
  it("rejects old login JWT identity mismatch before further public calls", async () => {
    queuePrepareSuccess();
    mocks.jwtVerify.mockResolvedValueOnce({
      payload: { openId: "synthetic-different-account" },
    });
    await expectRejected(
      prepareLoginProof(loginEnv),
      "PRE_RELEASE_SESSION_IDENTITY_MISMATCH"
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("sanitizes old-key owner probe signing failures and closes the DB", async () => {
    queuePrepareSuccess();
    mocks.sign.mockRejectedValueOnce(
      new Error(`${SYNTHETIC_SECRET_DETAIL}:${OLD_KEY}`)
    );
    await expectRejected(
      prepareLoginProof(loginEnv),
      "READ_ONLY_ACCOUNT_PROOF_FAILED"
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mocks.end).toHaveBeenCalledOnce();
  });
  const cases: [string, () => Response, string][] = [
    [
      "denied owner",
      () => response({ result: { data: { total: 3 } } }, 403),
      "PRE_RELEASE_OWNER_READ_FAILED",
    ],
    [
      "unauthenticated owner",
      () => response({ result: { data: { total: 3 } } }, 401),
      "PRE_RELEASE_OWNER_READ_FAILED",
    ],
    [
      "missing total",
      () => response({ result: { data: {} } }),
      "PRE_RELEASE_OWNER_READ_FAILED",
    ],
    [
      "nonnumeric total",
      () => response({ result: { data: { total: "3" } } }),
      "PRE_RELEASE_OWNER_READ_FAILED",
    ],
    [
      "malformed data",
      () => response({ result: { data: null } }),
      "INVALID_METADATA",
    ],
    [
      "redirected owner",
      () => response({}, 302, { location: "/synthetic" }),
      "VERIFICATION_REDIRECT",
    ],
  ];
  it.each(cases)(
    "fails readiness for %s",
    async (_name, ownerResponse, code) => {
      mocks.execute.mockResolvedValueOnce([
        [{ id: proof.id, openId: proof.openId, role: proof.role }],
        [],
      ]);
      mocks.execute.mockResolvedValueOnce([
        [{ openId: proof.ownerOpenId, role: "king" }],
        [],
      ]);
      queueResponses([
        loginResponse(),
        response({ result: { data: { id: proof.id } } }),
        ownerResponse(),
      ]);
      await expectRejected(prepareLoginProof(loginEnv), code);
      expect(mocks.end).toHaveBeenCalledOnce();
    }
  );
  it("an owner transport failure cannot be treated as ready", async () => {
    mocks.execute.mockResolvedValueOnce([
      [{ id: proof.id, openId: proof.openId, role: proof.role }],
      [],
    ]);
    mocks.execute.mockResolvedValueOnce([
      [{ openId: proof.ownerOpenId, role: "king" }],
      [],
    ]);
    queueResponses([
      loginResponse(),
      response({ result: { data: { id: proof.id } } }),
    ]);
    await expectRejected(
      prepareLoginProof(loginEnv),
      "PUBLIC_VERIFICATION_REQUEST_FAILED"
    );
    expect(mocks.end).toHaveBeenCalledOnce();
  });
});

describe("sensitive cleanup exceptions cannot escape the transaction boundary", () => {
  it("reports a cleanup failure after rotation as sanitized and forward-only", async () => {
    const { effects } = transactionFixture();
    effects.clearSensitiveMemory = () => {
      throw new Error(`${SYNTHETIC_SECRET_DETAIL}:${SYNTHETIC_KEY}`);
    };
    const result = await executeRelease(effects);
    expect(result).toMatchObject({
      ok: false,
      rotated: true,
      code: "RELEASE_OPERATION_FAILED",
    });
    expect(JSON.stringify(result)).not.toContain(SYNTHETIC_KEY);
    expect(JSON.stringify(result)).not.toContain(SYNTHETIC_SECRET_DETAIL);
  });
  it("reports cleanup failure before rotation without exposing exception messages", async () => {
    const { effects } = transactionFixture({ fail: "preflight" });
    effects.clearSensitiveMemory = () => {
      throw new Error(`${SYNTHETIC_SECRET_DETAIL}:${proof.password}`);
    };
    const result = await executeRelease(effects);
    expect(result).toMatchObject({
      ok: false,
      rotated: false,
      code: "RELEASE_OPERATION_FAILED",
    });
    expect(JSON.stringify(result)).not.toContain(proof.password);
    expect(JSON.stringify(result)).not.toContain(SYNTHETIC_SECRET_DETAIL);
  });
});

describe("strict static Bash environment source provenance", () => {
  it.each([
    `JWT_SECRET=${OLD_KEY}\n`,
    `export JWT_SECRET='${OLD_KEY}' # retained\nDATABASE_URL='mysql://synthetic$literal'\n`,
    `# ignored source /synthetic\r\nJWT_SECRET="${OLD_KEY}"\r\nOTHER=literal-value\r\n`,
    `JWT_SECRET='${OLD_KEY}'\nIRRELEVANT='literal$NOT_EXPANDED $(not-executed) \\ ` +
      "`not-executed`'\n",
    `  JWT_SECRET=${OLD_KEY}\nOTHER=\nBLANK=''\nDOUBLE="literal"\n`,
  ])(
    "accepts static assignments and literal singlequoted irrelevant text %j",
    text => {
      expect(() => assertShellEnvSource(text)).not.toThrow();
      expect(locateJwtKey(text).value).toBe(OLD_KEY);
    }
  );
  it.each([
    `JWT_SECRET =${OLD_KEY}`,
    `JWT_SECRET= ${OLD_KEY}`,
    `JWT_SECRET = ${OLD_KEY}`,
    `export JWT_SECRET = '${OLD_KEY}'`,
    `JWT_SECRET=${OLD_KEY}#adjacent`,
    `JWT_SECRET='${OLD_KEY}'#adjacent`,
    `JWT_SECRET="${OLD_KEY}"#adjacent`,
    "source /synthetic/config",
    ". /synthetic/config",
    "eval 'OTHER=synthetic'",
    "OTHER=$(synthetic-command)",
    "OTHER=`synthetic-command`",
    "OTHER=$SYNTHETIC",
    "OTHER=literal; synthetic-command",
    "OTHER=literal && synthetic-command",
    "OTHER=literal | synthetic-command",
    "OTHER=<(synthetic-command)",
    'OTHER="$SYNTHETIC"',
    'OTHER="$(synthetic-command)"',
    'OTHER="\\escaped"',
    "OTHER='unterminated",
    "unset JWT_SECRET",
    "export OTHER",
    "OTHER =literal",
    "OTHER=literal#adjacent",
    "OTHER='literal'#adjacent",
    "OTHER+=literal",
    "function synthetic() { :; }",
    "OTHER=literal\u0000",
    "OTHER=literal\u007f",
  ])(
    "rejects executable, expansion, ambiguous or invalid Bash source %j",
    line => {
      expectFailure(
        () => assertShellEnvSource(`JWT_SECRET=${OLD_KEY}\n${line}\n`),
        "DYNAMIC_SHELL_ENVIRONMENT"
      );
    }
  );
  it("requires an unambiguous literal JWT even when all assignments are static", () => {
    expectFailure(
      () => assertShellEnvSource("OTHER=synthetic\n"),
      "JWT_KEY_ABSENT"
    );
    expectFailure(
      () =>
        assertShellEnvSource(`JWT_SECRET=${OLD_KEY}\nJWT_SECRET=duplicate\n`),
      "AMBIGUOUS_JWT_SOURCE"
    );
  });
  it("preserves a literal irrelevant dollar while replacing only the JWT", () => {
    const original = `DATABASE_URL='synthetic$literal'\nJWT_SECRET='${OLD_KEY}' # preserved\n`;
    assertShellEnvSource(original);
    const replaced = replaceJwtKey(original, SYNTHETIC_KEY);
    expect(replaced).toBe(
      `DATABASE_URL='synthetic$literal'\nJWT_SECRET='${SYNTHETIC_KEY}' # preserved\n`
    );
    expect(() => assertShellEnvSource(replaced)).not.toThrow();
  });
});

describe("durable failure-stop policy and one cancellation-independent root supervisor", () => {
  it.each([
    ["preflight", false],
    ["activation-intent", true],
    ["staged", true],
    ["rotation-intent", true],
    ["rotated", true],
    ["failed", true],
    ["verified", false],
  ] as const)("phase %s requires failure-stop = %s", (phase, expected) => {
    expect(needsFailureStop({ sha: SHA, phase, code: "NONE" }, SHA)).toBe(
      expected
    );
  });
  it.each(
    [null, undefined, [], "verified", 0, false].map(state => ({ state }))
  )("rejects malformed journal $state", ({ state }) => {
    expect(() => needsFailureStop(state, SHA)).toThrow(ReleaseFailure);
  });
  it.each([
    {},
    { sha: SHA },
    { phase: "verified" },
    { sha: "b".repeat(40), phase: "verified" },
    { sha: SHA, phase: "staging" },
    { sha: SHA, phase: "complete" },
    { sha: SHA, phase: null },
    { sha: SHA, phase: 1 },
    { sha: SHA, phase: ["verified"] },
    { sha: SHA, phase: { toString: () => "verified" } },
  ])("rejects mismatched or invalid durable journal %j", state => {
    expectFailure(
      () => needsFailureStop(state, SHA),
      "INVALID_RELEASE_JOURNAL"
    );
  });
  it.each(["", "a".repeat(39), "A".repeat(40), "g".repeat(40)])(
    "rejects invalid expected journal SHA %j",
    sha => {
      expectFailure(
        () => needsFailureStop({ sha, phase: "verified" }, sha),
        "INVALID_RELEASE_JOURNAL"
      );
    }
  );
  it("builds exactly one bounded root transient unit with immutable failure controller, silent output and shared writer lock before Node", () => {
    const command = supervisorCommand(SHA, "/synthetic/workspace", 4242);
    const controller = `${APP_ROOT}/.security-release-control-${SHA}/controller.mjs`;
    expect(command.filter(value => value.startsWith("--unit="))).toEqual([
      `--unit=creatorvault-security-release-${SHA}`,
    ]);
    for (const property of [
      "Type=exec",
      "User=root",
      "Group=root",
      "Restart=no",
      "KillMode=control-group",
      "RuntimeMaxSec=600",
      "TimeoutStopSec=240",
      "UMask=0077",
      "NoNewPrivileges=true",
      "StandardOutput=null",
      "StandardError=null",
      `WorkingDirectory=${APP_ROOT}`,
      `ExecStopPost=/usr/bin/node ${controller} --failure-stop`,
    ]) {
      expect(command).toContain(`--property=${property}`);
    }
    expect(command).toContain("--wait");
    expect(command).toContain("--collect");
    expect(command.slice(command.indexOf("/usr/bin/flock"))).toEqual([
      "/usr/bin/flock",
      "--exclusive",
      "--nonblock",
      "--close",
      `${APP_ROOT}/.env.writer.lock`,
      "/usr/bin/node",
      controller,
      "--supervised",
    ]);
    const publicEnvironment = command.filter(value =>
      value.startsWith("--setenv=")
    );
    expect(publicEnvironment).toEqual([
      `--setenv=CREATORVAULT_RELEASE_SHA=${SHA}`,
      "--setenv=CREATORVAULT_RELEASE_REF=refs/heads/main",
      "--setenv=CREATORVAULT_RELEASE_EVENT=push",
      `--setenv=CREATORVAULT_RELEASE_BEFORE=${REQUIRED_RELEASE_PARENT}`,
      "--setenv=CREATORVAULT_RELEASE_WORKSPACE=/synthetic/workspace",
      "--setenv=CREATORVAULT_RELEASE_PARENT_PID=4242",
    ]);
    expect(command.join(" ")).not.toMatch(
      /JWT_SECRET|VERIFY_EMAIL|VERIFY_PASSWORD|DATABASE_URL|OWNER_OPEN_ID|--scope|--user|--remain-after-exit|BindsTo=|PartOf=/
    );
    expect(syntheticOperations.command).not.toHaveBeenCalled();
  });
  it.each([
    { sha: "", workspace: "/synthetic", pid: 4242 },
    { sha: "g".repeat(40), workspace: "/synthetic", pid: 4242 },
    { sha: SHA, workspace: "relative", pid: 4242 },
    { sha: SHA, workspace: "/synthetic\nworkspace", pid: 4242 },
    { sha: SHA, workspace: "/synthetic\u0000workspace", pid: 4242 },
    { sha: SHA, workspace: "/synthetic", pid: 1 },
    { sha: SHA, workspace: "/synthetic", pid: 2.5 },
    { sha: SHA, workspace: "/synthetic", pid: Number.MAX_SAFE_INTEGER + 1 },
  ])(
    "rejects invalid supervisor metadata %j before executing anything",
    ({ sha, workspace, pid }) => {
      expectFailure(
        () => supervisorCommand(sha, workspace, pid),
        "INVALID_SUPERVISOR_METADATA"
      );
      expect(syntheticOperations.command).not.toHaveBeenCalled();
    }
  );
});

describe("durable rotation intent precedes the irreversible atomic rename", () => {
  it("awaits the fifth async callback after candidate fsync and before rename, rechecking source after callback durability", async () => {
    const fixture = persistenceFixture();
    const intent = vi.fn(async () => {
      fixture.trace.push("intent-write");
      expect(fixture.trace).toContain("file-sync");
      expect(filesystem.rename).not.toHaveBeenCalled();
      await Promise.resolve();
      fixture.trace.push("intent-fsync-complete");
    });
    await atomicPersistKey(
      fixture.snapshot,
      SYNTHETIC_ENV,
      SYNTHETIC_KEY,
      fixture.mark,
      intent
    );
    expect(intent).toHaveBeenCalledOnce();
    expect(fixture.trace.slice(4, 14)).toEqual([
      "write",
      "file-sync",
      "file-close",
      "lstat-secret",
      "intent-write",
      "intent-fsync-complete",
      "lstat-secret",
      "rename",
      "markRotated",
      "open-directory",
    ]);
    expect(fixture.marked()).toBe(true);
    expect(filesystem.rename).toHaveBeenCalledOnce();
  });
  it("a failed durable-intent callback never renames, marks, reloads or verifies and reports only a fixed code", async () => {
    const fixture = persistenceFixture();
    const transaction = transactionFixture();
    const intent = vi.fn(async () => {
      throw new Error(`${SYNTHETIC_SECRET_DETAIL}:${SYNTHETIC_KEY}`);
    });
    transaction.effects.persistKey = (key, mark) =>
      atomicPersistKey(
        fixture.snapshot,
        SYNTHETIC_ENV,
        key,
        () => {
          fixture.mark();
          mark();
        },
        intent
      );
    expect(await executeRelease(transaction.effects)).toEqual({
      ok: false,
      rotated: false,
      phase: "persistence",
      code: "JWT_PERSISTENCE_FAILED",
    });
    expect(intent).toHaveBeenCalledOnce();
    expect(filesystem.rename).not.toHaveBeenCalled();
    expect(fixture.marked()).toBe(false);
    expect(filesystem.unlink).toHaveBeenCalledOnce();
    expect(transaction.trace).not.toContain("reload");
    expect(transaction.trace).not.toContain("verify");
  });
  it.each([
    "dev",
    "ino",
    "size",
    "mtimeMs",
    "ctimeMs",
    "uid",
    "gid",
    "mode",
  ] as const)(
    "a source %s change during intent callback blocks rename",
    async field => {
      const fixture = persistenceFixture();
      const intent = vi.fn(async () => {
        filesystem.lstat.mockResolvedValueOnce(
          syntheticStats({ [field]: fixture.snapshot[field] + 1 })
        );
      });
      await expectRejected(
        atomicPersistKey(
          fixture.snapshot,
          SYNTHETIC_ENV,
          SYNTHETIC_KEY,
          fixture.mark,
          intent
        ),
        field === "uid" || field === "gid" || field === "mode"
          ? "UNSAFE_SECRET_FILE_PERMISSIONS"
          : "SECRET_SOURCE_CHANGED"
      );
      expect(intent).toHaveBeenCalledOnce();
      expect(filesystem.rename).not.toHaveBeenCalled();
      expect(fixture.marked()).toBe(false);
      expect(filesystem.unlink).toHaveBeenCalledOnce();
    }
  );
  it("directory-fsync failure after intent and rename remains forward-only", async () => {
    const fixture = persistenceFixture("directory-sync");
    const transaction = transactionFixture();
    const intent = vi.fn(async () => {
      fixture.trace.push("intent-fsync-complete");
    });
    transaction.effects.persistKey = (key, mark) =>
      atomicPersistKey(
        fixture.snapshot,
        SYNTHETIC_ENV,
        key,
        () => {
          fixture.mark();
          mark();
        },
        intent
      );
    expect(await executeRelease(transaction.effects)).toEqual({
      ok: false,
      rotated: true,
      phase: "persistence",
      code: "JWT_PERSISTENCE_FAILED",
    });
    expectOrdered(fixture.trace.join("\n"), [
      "intent-fsync-complete",
      "rename",
      "markRotated",
      "directory-sync",
    ]);
    expect(filesystem.rename).toHaveBeenCalledOnce();
    expect(transaction.trace).not.toContain("reload");
  });
  it("production always supplies the durable writeJournal rotation-intent callback and journals rotated afterward", () => {
    const runner = source("scripts/securityReleaseRunner.ts").replace(
      /\s+/g,
      " "
    );
    expect(runner).toMatch(
      /await atomicPersistKey\(\s*snapshot,\s*original,\s*key,\s*markRotated,\s*\(\)\s*=>\s*writeJournal\(sha,\s*"rotation-intent"\),?\s*\)/
    );
    expectOrdered(
      runner.slice(runner.indexOf("async persistKey(key, markRotated)")),
      [
        'writeJournal(sha, "rotation-intent")',
        'writeJournal(sha, "rotated")',
        "async reload()",
      ]
    );
    const journal = runner.slice(
      runner.indexOf("async function writeJournal"),
      runner.indexOf("async function readJournal")
    );
    expectOrdered(journal, [
      "await handle.writeFile(",
      "await handle.sync()",
      "await handle.close()",
      "await fs.rename(temporary, target)",
      "await directory.sync()",
    ]);
  });
});

const SYNTHETIC_UUID = "01234567-89ab-4cde-8fab-0123456789ab";
const FIXTURE_OPEN_ID = `cv_release_verify_${SYNTHETIC_UUID}`;
const FIXTURE_EMAIL = `cvsv_${SHA}@verify.invalid`;
const FIXTURE_USERNAME = `cvsv_${SHA.slice(0, 24)}`;
const FIXTURE_NAME = "CreatorVault temporary security verifier";
const FIXTURE_PASSWORD = "U1NT".repeat(16); // Explicit base64url of 48 synthetic ASCII S bytes.
const FIXTURE_HASH = "$2b$12$SYNTHETIC_NOT_A_REAL_BCRYPT_PASSWORD_HASH";
const appAuthEnv: Record<string, string> = {
  DATABASE_URL: loginEnv.DATABASE_URL,
  VITE_APP_ID: proof.appId,
  JWT_SECRET: OLD_KEY,
};
function sqlOf(query: FixtureQuery): string {
  return typeof query === "string" ? query : query.sql;
}
function queueProvisionPreflight(
  options: {
    owners?: FixtureRow[];
    collision?: FixtureRow[];
    columns?: FixtureRow[];
    permissionFailure?: boolean;
  } = {}
): void {
  mocks.execute.mockResolvedValueOnce([
    options.owners ?? [{ openId: proof.ownerOpenId, role: "king" }],
    [],
  ]);
  mocks.execute.mockResolvedValueOnce([options.collision ?? [], []]);
  mocks.execute.mockResolvedValueOnce([
    options.columns ?? [{ COLUMN_NAME: "password" }],
    [],
  ]);
  if (options.permissionFailure)
    mocks.execute.mockRejectedValueOnce(new Error(SYNTHETIC_SECRET_DETAIL));
  else mocks.execute.mockResolvedValueOnce([{ affectedRows: 0 }, []]);
}
function syntheticProvisionSecrets(): Buffer {
  const bytes = Buffer.from("S".repeat(48), "utf8");
  syntheticOperations.randomUUID.mockReturnValue(SYNTHETIC_UUID);
  syntheticOperations.randomBytes.mockReturnValue(bytes);
  syntheticOperations.hash.mockResolvedValue(FIXTURE_HASH);
  return bytes;
}
function assertNoProvisionMutation(): void {
  expect(syntheticOperations.randomUUID).not.toHaveBeenCalled();
  expect(syntheticOperations.randomBytes).not.toHaveBeenCalled();
  expect(syntheticOperations.hash).not.toHaveBeenCalled();
  expect(
    mocks.execute.mock.calls
      .map(([query]) => sqlOf(query))
      .some(query => /^INSERT /i.test(query))
  ).toBe(false);
  expect(fetchMock).not.toHaveBeenCalled();
}

describe("durably owned nonprivileged native-login verifier provisioning", () => {
  it.each(["DATABASE_URL", "VITE_APP_ID", "JWT_SECRET"])(
    "missing %s fails before DB, randomness, bcrypt or INSERT",
    async key => {
      const env = { ...appAuthEnv };
      delete env[key];
      const ownership = vi.fn<() => Promise<void>>();
      await expectRejected(
        provisionLoginVerifier(env, SHA, ownership),
        "EXISTING_APP_AUTH_CONFIGURATION_MISSING"
      );
      expect(mocks.createConnection).not.toHaveBeenCalled();
      expect(ownership).not.toHaveBeenCalled();
      assertNoProvisionMutation();
    }
  );
  it.each(["DATABASE_URL", "VITE_APP_ID", "JWT_SECRET"])(
    "empty %s fails before DB, randomness, bcrypt or INSERT",
    async key => {
      const ownership = vi.fn<() => Promise<void>>();
      await expectRejected(
        provisionLoginVerifier({ ...appAuthEnv, [key]: "" }, SHA, ownership),
        "EXISTING_APP_AUTH_CONFIGURATION_MISSING"
      );
      expect(mocks.createConnection).not.toHaveBeenCalled();
      expect(ownership).not.toHaveBeenCalled();
      assertNoProvisionMutation();
    }
  );
  it.each(["", "A".repeat(40), "g".repeat(40), "a".repeat(39)])(
    "invalid release SHA %j fails before DB or mutation",
    async sha => {
      await expectRejected(
        provisionLoginVerifier(appAuthEnv, sha, async () => undefined),
        "INVALID_RELEASE_SHA"
      );
      expect(mocks.createConnection).not.toHaveBeenCalled();
      assertNoProvisionMutation();
    }
  );
  it.each([
    { owners: [] },
    { owners: [{ openId: proof.ownerOpenId, role: "user" }] },
    { owners: [{ openId: proof.ownerOpenId, role: "creator" }] },
    { owners: [{ openId: "", role: "king" }] },
    { owners: [{ openId: null, role: "admin" }] },
    {
      owners: [
        { openId: proof.ownerOpenId, role: "king" },
        { openId: "synthetic-second-owner", role: "admin" },
      ],
    },
  ])(
    "rejects absent, malformed or nontrusted DB owner $owners before crypto/hash/INSERT",
    async ({ owners }) => {
      mocks.execute.mockResolvedValueOnce([owners, []]);
      const ownership = vi.fn<() => Promise<void>>();
      await expectRejected(
        provisionLoginVerifier(appAuthEnv, SHA, ownership),
        "EXISTING_OWNER_ROLE_UNVERIFIED"
      );
      expect(mocks.execute).toHaveBeenCalledOnce();
      expect(mocks.end).toHaveBeenCalledOnce();
      expect(ownership).not.toHaveBeenCalled();
      assertNoProvisionMutation();
    }
  );
  it("refuses either username or email collision before checking columns or generating anything", async () => {
    queueProvisionPreflight({ collision: [{ id: 42 }] });
    await expectRejected(
      provisionLoginVerifier(appAuthEnv, SHA, async () => undefined),
      "VERIFICATION_FIXTURE_COLLISION"
    );
    expect(mocks.execute).toHaveBeenCalledTimes(2);
    expect(mocks.execute.mock.calls[1]).toEqual([
      "SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1",
      [FIXTURE_EMAIL, FIXTURE_USERNAME],
    ]);
    assertNoProvisionMutation();
    expect(mocks.end).toHaveBeenCalledOnce();
  });
  it.each(
    [[], [{ COLUMN_NAME: "password_hash" }], [{ COLUMN_NAME: "PASSWORD" }]].map(
      columns => ({ columns })
    )
  )(
    "requires native users.password column, not only hash column $columns",
    async ({ columns }) => {
      queueProvisionPreflight({ columns });
      await expectRejected(
        provisionLoginVerifier(appAuthEnv, SHA, async () => undefined),
        "STANDARD_LOGIN_PASSWORD_COLUMN_MISSING"
      );
      expect(mocks.execute).toHaveBeenCalledTimes(3);
      assertNoProvisionMutation();
      expect(mocks.end).toHaveBeenCalledOnce();
    }
  );
  it("proves DELETE permission with a bounded zero-row DELETE before any crypto, ownership or INSERT", async () => {
    queueProvisionPreflight({ permissionFailure: true });
    const ownership = vi.fn<() => Promise<void>>();
    await expectRejected(
      provisionLoginVerifier(appAuthEnv, SHA, ownership),
      "VERIFICATION_FIXTURE_CREATION_FAILED"
    );
    expect(mocks.execute).toHaveBeenCalledTimes(4);
    expect(mocks.execute.mock.calls[3]).toEqual([
      { sql: "DELETE FROM users WHERE 1 = 0", timeout: 15000 },
    ]);
    expect(ownership).not.toHaveBeenCalled();
    assertNoProvisionMutation();
    expect(mocks.end).toHaveBeenCalledOnce();
  });
  it.each(["king", "admin"])(
    "selects existing trusted %s owner but inserts only a temporary user and never raw password",
    async role => {
      queueProvisionPreflight({
        owners: [{ openId: proof.ownerOpenId, role }],
      });
      mocks.execute.mockResolvedValueOnce([
        { affectedRows: 1, insertId: 7 },
        [],
      ]);
      const bytes = syntheticProvisionSecrets();
      const ownership = vi.fn(async (openId: string) => {
        expect(openId).toBe(FIXTURE_OPEN_ID);
        expect(syntheticOperations.randomBytes).not.toHaveBeenCalled();
        expect(syntheticOperations.hash).not.toHaveBeenCalled();
        expect(mocks.execute).toHaveBeenCalledTimes(4);
        await Promise.resolve();
      });
      const result = await provisionLoginVerifier(appAuthEnv, SHA, ownership);
      expect(result).toEqual({
        ...appAuthEnv,
        OWNER_OPEN_ID: proof.ownerOpenId,
        CREATORVAULT_RELEASE_VERIFY_EMAIL: FIXTURE_EMAIL,
        CREATORVAULT_RELEASE_VERIFY_PASSWORD: FIXTURE_PASSWORD,
      });
      expect(appAuthEnv).not.toHaveProperty(
        "CREATORVAULT_RELEASE_VERIFY_PASSWORD"
      );
      expect(syntheticOperations.randomUUID).toHaveBeenCalledOnce();
      expect(syntheticOperations.randomBytes).toHaveBeenCalledWith(48);
      expect(bytes.every(value => value === 0)).toBe(true);
      expect(syntheticOperations.hash).toHaveBeenCalledOnce();
      expect(syntheticOperations.hash).toHaveBeenCalledWith(
        FIXTURE_PASSWORD,
        12
      );
      expect(ownership.mock.calls).toEqual([[FIXTURE_OPEN_ID]]);
      expect(mocks.execute.mock.calls[0]?.[0]).toBe(
        "SELECT openId, role FROM users WHERE is_active = 1 AND role IN ('king', 'admin') ORDER BY CASE role WHEN 'king' THEN 0 ELSE 1 END, id ASC LIMIT 1"
      );
      expect(mocks.execute.mock.calls[4]).toEqual([
        {
          sql: "INSERT INTO users (openId, name, email, username, password, role, loginMethod, is_active, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'user', 'email', 1, NOW(), NOW())",
          timeout: 15000,
        },
        [
          FIXTURE_OPEN_ID,
          FIXTURE_NAME,
          FIXTURE_EMAIL,
          FIXTURE_USERNAME,
          FIXTURE_HASH,
        ],
      ]);
      const persisted = JSON.stringify({
        database: mocks.execute.mock.calls,
        ownership: ownership.mock.calls,
      });
      expect(persisted).not.toContain(FIXTURE_PASSWORD);
      expect(persisted).not.toContain("OWNER_OPEN_ID");
      expect(
        mocks.execute.mock.calls.map(([query]) => sqlOf(query)).join(" ")
      ).not.toMatch(/\bUPDATE\b|\bCREATE\b|\bALTER\b/);
      expect(mocks.end).toHaveBeenCalledOnce();
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );
  it("stores bcrypt hash in both native and optional legacy columns without changing the real handler", async () => {
    queueProvisionPreflight({
      columns: [{ COLUMN_NAME: "password" }, { COLUMN_NAME: "password_hash" }],
    });
    mocks.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    syntheticProvisionSecrets();
    await provisionLoginVerifier(appAuthEnv, SHA, async () => undefined);
    const insertion = mocks.execute.mock.calls[4];
    expect(sqlOf(insertion?.[0] ?? "")).toContain(
      "username, password, password_hash, role"
    );
    expect(insertion?.[1]).toEqual([
      FIXTURE_OPEN_ID,
      FIXTURE_NAME,
      FIXTURE_EMAIL,
      FIXTURE_USERNAME,
      FIXTURE_HASH,
      FIXTURE_HASH,
    ]);
    expect(syntheticOperations.hash).toHaveBeenCalledOnce();
  });
  it("an ownership-callback rejection prevents password generation/hash/INSERT and leaks only a fixed code", async () => {
    queueProvisionPreflight();
    syntheticOperations.randomUUID.mockReturnValue(SYNTHETIC_UUID);
    const ownership = vi.fn(async () => {
      throw new Error(`${SYNTHETIC_SECRET_DETAIL}:${FIXTURE_PASSWORD}`);
    });
    await expectRejected(
      provisionLoginVerifier(appAuthEnv, SHA, ownership),
      "VERIFICATION_FIXTURE_CREATION_FAILED"
    );
    expect(ownership.mock.calls).toHaveLength(1);
    expect(syntheticOperations.randomUUID).toHaveBeenCalledOnce();
    expect(syntheticOperations.randomBytes).not.toHaveBeenCalled();
    expect(syntheticOperations.hash).not.toHaveBeenCalled();
    expect(mocks.execute).toHaveBeenCalledTimes(4);
    expect(mocks.end).toHaveBeenCalledOnce();
  });
  it("does not begin INSERT until the asynchronous ownership callback has durably completed", async () => {
    queueProvisionPreflight();
    syntheticProvisionSecrets();
    mocks.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    let releaseOwnership: () => void = () => {
      throw new Error("OWNERSHIP_CALLBACK_NOT_STARTED");
    };
    const ownershipBarrier = new Promise<void>(resolve => {
      releaseOwnership = resolve;
    });
    let callbackEntered: () => void = () => undefined;
    const entered = new Promise<void>(resolve => {
      callbackEntered = resolve;
    });
    const provisioning = provisionLoginVerifier(appAuthEnv, SHA, async () => {
      callbackEntered();
      await ownershipBarrier;
    });
    await entered;
    expect(mocks.execute).toHaveBeenCalledTimes(4);
    expect(syntheticOperations.hash).not.toHaveBeenCalled();
    expect(syntheticOperations.randomBytes).not.toHaveBeenCalled();
    releaseOwnership();
    await provisioning;
    expect(mocks.execute).toHaveBeenCalledTimes(5);
  });
  it.each([0, 2])(
    "INSERT affectedRows=%s is rejected without raw-password persistence or owner mutation",
    async affectedRows => {
      queueProvisionPreflight();
      syntheticProvisionSecrets();
      mocks.execute.mockResolvedValueOnce([{ affectedRows }, []]);
      const ownership = vi.fn(async (openId: string) => {
        expect(openId).toBe(FIXTURE_OPEN_ID);
      });
      await expectRejected(
        provisionLoginVerifier(appAuthEnv, SHA, ownership),
        "VERIFICATION_FIXTURE_CREATION_FAILED"
      );
      expect(ownership).toHaveBeenCalledOnce();
      expect(mocks.end).toHaveBeenCalledOnce();
      expect(JSON.stringify(mocks.execute.mock.calls)).not.toContain(
        FIXTURE_PASSWORD
      );
    }
  );
  it.each([
    "connect",
    "owner-select",
    "collision-select",
    "column-select",
    "hash",
    "insert",
  ] as const)(
    "sanitizes %s failures and never exposes raw credentials",
    async failure => {
      const ownership = vi.fn(async (_openId: string) => undefined);
      const error = new Error(`${SYNTHETIC_SECRET_DETAIL}:${FIXTURE_PASSWORD}`);
      if (failure === "connect")
        mocks.createConnection.mockRejectedValueOnce(error);
      else if (failure === "owner-select")
        mocks.execute.mockRejectedValueOnce(error);
      else if (failure === "collision-select") {
        mocks.execute.mockResolvedValueOnce([
          [{ openId: proof.ownerOpenId, role: "king" }],
          [],
        ]);
        mocks.execute.mockRejectedValueOnce(error);
      } else if (failure === "column-select") {
        mocks.execute.mockResolvedValueOnce([
          [{ openId: proof.ownerOpenId, role: "king" }],
          [],
        ]);
        mocks.execute.mockResolvedValueOnce([[], []]);
        mocks.execute.mockRejectedValueOnce(error);
      } else {
        queueProvisionPreflight();
        syntheticProvisionSecrets();
        if (failure === "hash")
          syntheticOperations.hash.mockRejectedValueOnce(error);
        else mocks.execute.mockRejectedValueOnce(error);
      }
      await expectRejected(
        provisionLoginVerifier(appAuthEnv, SHA, ownership),
        "VERIFICATION_FIXTURE_CREATION_FAILED"
      );
      expect(JSON.stringify(mocks.execute.mock.calls)).not.toContain(
        FIXTURE_PASSWORD
      );
      if (failure === "connect") expect(mocks.end).not.toHaveBeenCalled();
      else expect(mocks.end).toHaveBeenCalledOnce();
      if (
        [
          "connect",
          "owner-select",
          "collision-select",
          "column-select",
        ].includes(failure)
      ) {
        assertNoProvisionMutation();
        expect(ownership).not.toHaveBeenCalled();
      }
    }
  );
  it("feeds the virtual credentials into unchanged real public login proof before and after rotation", async () => {
    queueProvisionPreflight();
    syntheticProvisionSecrets();
    mocks.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    const virtualEnv = await provisionLoginVerifier(
      appAuthEnv,
      SHA,
      async () => undefined
    );
    mocks.execute.mockResolvedValueOnce([
      [{ id: proof.id, openId: FIXTURE_OPEN_ID, role: "user" }],
      [],
    ]);
    mocks.execute.mockResolvedValueOnce([
      [{ openId: proof.ownerOpenId, role: "king" }],
      [],
    ]);
    mocks.jwtVerify.mockResolvedValue({ payload: { openId: FIXTURE_OPEN_ID } });
    queueResponses([
      loginResponse(),
      response({ result: { data: { id: proof.id } } }),
      response({ result: { data: { total: 3 } } }),
    ]);
    const realProof = await prepareLoginProof(virtualEnv);
    expect(realProof).toMatchObject({
      email: FIXTURE_EMAIL,
      password: FIXTURE_PASSWORD,
      openId: FIXTURE_OPEN_ID,
      role: "user",
      ownerOpenId: proof.ownerOpenId,
    });
    queueResponses(verificationResponses());
    await verifyLiveRelease(SHA, realProof, SYNTHETIC_KEY);
    const loginCalls = fetchMock.mock.calls.filter(
      ([url]) => url === `${PUBLIC_ORIGIN}/api/auth/login`
    );
    expect(loginCalls).toHaveLength(2);
    for (const [, options] of loginCalls)
      expect(options).toMatchObject({
        method: "POST",
        body: JSON.stringify({
          email: FIXTURE_EMAIL,
          password: FIXTURE_PASSWORD,
          rememberMe: false,
        }),
      });
    expect(mocks.claims.map(claim => claim.openId)).toEqual([
      proof.ownerOpenId,
      proof.ownerOpenId,
    ]);
  });
});

describe("cleanup deletes only the durably owned temporary user and confirms absence", () => {
  it.each([0, 1])(
    "exactly bounded own-fixture DELETE and absence SELECT succeeds with affectedRows=%s",
    async affectedRows => {
      mocks.execute
        .mockResolvedValueOnce([{ affectedRows }, []])
        .mockResolvedValueOnce([[], []]);
      await cleanupLoginVerifier(appAuthEnv.DATABASE_URL, SHA, FIXTURE_OPEN_ID);
      expect(mocks.execute.mock.calls).toEqual([
        [
          {
            sql: "DELETE FROM users WHERE openId = ? AND email = ? AND username = ? AND name = ? AND role = 'user'",
            timeout: 15000,
          },
          [FIXTURE_OPEN_ID, FIXTURE_EMAIL, FIXTURE_USERNAME, FIXTURE_NAME],
        ],
        [
          {
            sql: "SELECT id FROM users WHERE openId = ? LIMIT 1",
            timeout: 15000,
          },
          [FIXTURE_OPEN_ID],
        ],
      ]);
      expect(mocks.end).toHaveBeenCalledOnce();
      expect(syntheticOperations.randomBytes).not.toHaveBeenCalled();
      expect(syntheticOperations.randomUUID).not.toHaveBeenCalled();
      expect(syntheticOperations.hash).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );
  it.each([
    proof.ownerOpenId,
    proof.openId,
    SYNTHETIC_UUID,
    "cv_release_verify_short",
    `unowned_${SYNTHETIC_UUID}`,
    `cv_release_verify_${"-".repeat(36)}`,
  ])(
    "refuses wrong ownership prefix or malformed UUID %j before connection or DELETE",
    async openId => {
      await expectRejected(
        cleanupLoginVerifier(appAuthEnv.DATABASE_URL, SHA, openId),
        "INVALID_FIXTURE_OWNERSHIP"
      );
      expect(mocks.createConnection).not.toHaveBeenCalled();
      expect(mocks.execute).not.toHaveBeenCalled();
    }
  );
  it.each(["", "A".repeat(40), "a".repeat(39)])(
    "refuses invalid cleanup SHA %j before database access",
    async sha => {
      await expectRejected(
        cleanupLoginVerifier(appAuthEnv.DATABASE_URL, sha, FIXTURE_OPEN_ID),
        "INVALID_RELEASE_SHA"
      );
      expect(mocks.createConnection).not.toHaveBeenCalled();
    }
  );
  it("a matching openId that remains after narrowly guarded DELETE fails instead of broadening deletion", async () => {
    mocks.execute
      .mockResolvedValueOnce([{ affectedRows: 0 }, []])
      .mockResolvedValueOnce([[{ id: 7 }], []]);
    await expectRejected(
      cleanupLoginVerifier(appAuthEnv.DATABASE_URL, SHA, FIXTURE_OPEN_ID),
      "OWNED_VERIFICATION_FIXTURE_CLEANUP_FAILED"
    );
    expect(mocks.execute).toHaveBeenCalledTimes(2);
    expect(mocks.end).toHaveBeenCalledOnce();
  });
  it.each(["connection", "delete", "confirmation"] as const)(
    "sanitizes cleanup %s errors, with no fallback DELETE",
    async failure => {
      const error = new Error(`${SYNTHETIC_SECRET_DETAIL}:${FIXTURE_PASSWORD}`);
      if (failure === "connection")
        mocks.createConnection.mockRejectedValueOnce(error);
      else if (failure === "delete") mocks.execute.mockRejectedValueOnce(error);
      else {
        mocks.execute.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
        mocks.execute.mockRejectedValueOnce(error);
      }
      await expectRejected(
        cleanupLoginVerifier(appAuthEnv.DATABASE_URL, SHA, FIXTURE_OPEN_ID),
        "OWNED_VERIFICATION_FIXTURE_CLEANUP_FAILED"
      );
      expect(
        mocks.execute.mock.calls.filter(([query]) =>
          sqlOf(query).startsWith("DELETE ")
        )
      ).toHaveLength(failure === "connection" ? 0 : 1);
      if (failure !== "connection") expect(mocks.end).toHaveBeenCalledOnce();
    }
  );
});

const OTHER_PM2_APP = {
  name: "unrelated-synthetic-app",
  pm2_env: { status: "online" },
};
function failureStopFixture(
  options: {
    absent?: boolean;
    stopped?: boolean;
    snapshot?: unknown;
    backup?: unknown;
  } = {}
): string[][] {
  const trace: string[][] = [];
  let listed = false;
  syntheticOperations.command.mockImplementation(
    (command, args, invocation) => {
      expect(command).toBe("pm2");
      expect(invocation).toMatchObject({
        cwd: APP_ROOT,
        stdio: ["ignore", "pipe", "pipe"],
      });
      trace.push([...args]);
      if (args[0] === "jlist") {
        if (options.absent) return JSON.stringify([OTHER_PM2_APP]);
        const status =
          listed && options.stopped !== false ? "stopped" : "online";
        listed = true;
        return JSON.stringify([
          { name: "creatorvault", pm2_env: { status } },
          OTHER_PM2_APP,
        ]);
      }
      expect(args).toEqual(
        args[0] === "save" ? ["save", "--force"] : [args[0], "creatorvault"]
      );
      return "";
    }
  );
  filesystem.lstat.mockImplementation(async file => {
    expect(["/root/.pm2/dump.pm2", "/root/.pm2/dump.pm2.bak"]).toContain(file);
    return syntheticStats();
  });
  filesystem.readFile.mockImplementation(async (file, encoding) => {
    expect(encoding).toBe("utf8");
    if (file === "/root/.pm2/dump.pm2")
      return JSON.stringify(options.snapshot ?? [OTHER_PM2_APP]);
    expect(file).toBe("/root/.pm2/dump.pm2.bak");
    return JSON.stringify(options.backup ?? [OTHER_PM2_APP]);
  });
  return trace;
}

describe("narrow forward-only PM2 failure cleanup prevents resurrection", () => {
  it("stops and confirms then deletes only creatorvault, saves --force twice and verifies both resurrection snapshots", async () => {
    const trace = failureStopFixture();
    await stopFailedRelease();
    expect(trace).toEqual([
      ["jlist"],
      ["stop", "creatorvault"],
      ["jlist"],
      ["delete", "creatorvault"],
      ["save", "--force"],
      ["save", "--force"],
    ]);
    expect(filesystem.readFile.mock.calls).toEqual([
      ["/root/.pm2/dump.pm2", "utf8"],
      ["/root/.pm2/dump.pm2.bak", "utf8"],
    ]);
    expect(trace.flat()).not.toContain(OTHER_PM2_APP.name);
    expect(trace.flat()).not.toContain("all");
  });
  it("is idempotent when creatorvault is already absent, while still replacing and checking both snapshots", async () => {
    const trace = failureStopFixture({ absent: true });
    await stopFailedRelease();
    expect(trace).toEqual([
      ["jlist"],
      ["save", "--force"],
      ["save", "--force"],
    ]);
    expect(filesystem.readFile).toHaveBeenCalledTimes(2);
  });
  it("cannot delete/save an application whose stopped state was not confirmed", async () => {
    const trace = failureStopFixture({ stopped: false });
    await expectRejected(stopFailedRelease(), "FAILURE_STOP_UNCONFIRMED");
    expect(trace).toEqual([["jlist"], ["stop", "creatorvault"], ["jlist"]]);
    expect(filesystem.readFile).not.toHaveBeenCalled();
  });
  it.each(["primary", "backup"] as const)(
    "rejects %s snapshot retaining the failed app even if stopped",
    async target => {
      const rows = [
        { name: "creatorvault", pm2_env: { status: "stopped" } },
        OTHER_PM2_APP,
      ];
      failureStopFixture(
        target === "primary" ? { snapshot: rows } : { backup: rows }
      );
      await expectRejected(
        stopFailedRelease(),
        "FAILURE_RESURRECTION_STATE_UNVERIFIED"
      );
    }
  );
  it.each(["primary", "backup"] as const)(
    "rejects malformed %s snapshot instead of declaring cleanup complete",
    async target => {
      failureStopFixture(
        target === "primary"
          ? { snapshot: { name: "creatorvault" } }
          : { backup: { name: "creatorvault" } }
      );
      await expectRejected(
        stopFailedRelease(),
        "FAILURE_RESURRECTION_STATE_UNVERIFIED"
      );
    }
  );
  it.each([
    { isFile: () => false },
    { isSymbolicLink: () => true },
    { uid: 1000 },
    { nlink: 2 },
    { size: 4 * 1024 * 1024 + 1 },
  ])("rejects unsafe snapshot metadata %j", async patch => {
    failureStopFixture();
    filesystem.lstat.mockResolvedValueOnce(syntheticStats(patch));
    await expectRejected(
      stopFailedRelease(),
      "FAILURE_RESURRECTION_STATE_UNVERIFIED"
    );
    expect(filesystem.readFile).not.toHaveBeenCalled();
  });
  it.each(
    [{}, [{ name: "creatorvault" }, { name: "creatorvault" }]].map(list => ({
      list,
    }))
  )(
    "rejects invalid or duplicate targeted PM2 metadata $list before stopping",
    async ({ list }) => {
      syntheticOperations.command.mockReturnValue(JSON.stringify(list));
      await expectRejected(stopFailedRelease(), "FAILURE_STOP_UNCONFIRMED");
      expect(syntheticOperations.command).toHaveBeenCalledOnce();
      expect(filesystem.readFile).not.toHaveBeenCalled();
    }
  );
  it("a stop command failure is sanitized and never followed by delete or save", async () => {
    const trace = failureStopFixture();
    syntheticOperations.command
      .mockImplementationOnce(() => JSON.stringify([{ name: "creatorvault" }]))
      .mockImplementationOnce(() => {
        throw new Error(SYNTHETIC_SECRET_DETAIL);
      });
    await expectRejected(stopFailedRelease(), "LOCAL_RELEASE_COMMAND_FAILED");
    expect(syntheticOperations.command).toHaveBeenCalledTimes(2);
    expect(trace).toHaveLength(0);
  });
});

function bootFixture(state: unknown, active = "active"): void {
  filesystem.lstat.mockResolvedValue(syntheticStats({ size: 100 }));
  filesystem.readFile.mockImplementation(async file => {
    expect(file).toBe(`${APP_ROOT}/dist/public/release.json`);
    return JSON.stringify({ commit: SHA });
  });
  const handle: FixtureHandle = {
    chown: async () => {
      throw new Error("UNEXPECTED_BOOT_WRITE");
    },
    chmod: async () => {
      throw new Error("UNEXPECTED_BOOT_WRITE");
    },
    writeFile: async () => {
      throw new Error("UNEXPECTED_BOOT_WRITE");
    },
    readFile: async () => JSON.stringify(state),
    stat: async () => syntheticStats({ size: 100 }),
    sync: async () => {
      throw new Error("UNEXPECTED_BOOT_WRITE");
    },
    close: async () => undefined,
  };
  filesystem.open.mockImplementation(async (file, flags) => {
    expect(file).toBe(`${APP_ROOT}/.security-release-state-${SHA}.json`);
    expect(flags).toBe(constants.O_RDONLY | constants.O_NOFOLLOW);
    return handle;
  });
  syntheticOperations.command.mockImplementation(
    (command, args, invocation) => {
      expect(command).toBe("/usr/bin/systemctl");
      expect(invocation).toMatchObject({ cwd: APP_ROOT });
      expect(args).toContain(`creatorvault-security-release-${SHA}.service`);
      if (args[0] === "is-active") return active;
      // Exact public metadata of the synthetic bounded root transient supervisor.
      if (args[0] === "show")
        return "User=root\nGroup=root\nTransient=yes\nRuntimeMaxUSec=10min\nTimeoutStopUSec=4min\n";
      throw new Error("UNEXPECTED_BOOT_COMMAND");
    }
  );
}

describe("guarded compiled runtime blocks incomplete release resurrection", () => {
  it("verified durable state authorizes boot without relying on a surviving unit", async () => {
    bootFixture(
      { sha: SHA, phase: "verified", code: "SECURITY_RELEASE_VERIFIED" },
      "inactive"
    );
    await expect(assertAppBootAuthorized()).resolves.toBeUndefined();
    expect(syntheticOperations.command).not.toHaveBeenCalled();
  });
  it("matching active supervisor permits only rotated boot during the bounded release", async () => {
    bootFixture({ sha: SHA, phase: "rotated", code: "NONE" });
    await expect(assertAppBootAuthorized()).resolves.toBeUndefined();
    expect(syntheticOperations.command).toHaveBeenCalled();
  });
  it.each(["preflight", "activation-intent", "staged", "rotation-intent"])(
    "unverified %s phase never permits boot, even with an active supervisor",
    async phase => {
      bootFixture({ sha: SHA, phase, code: "NONE" });
      await expectRejected(
        assertAppBootAuthorized(),
        "BOOT_RELEASE_REQUIRES_FORWARD_FIX"
      );
      expect(syntheticOperations.command).not.toHaveBeenCalled();
    }
  );
  it.each(["inactive", "failed", "unknown", "", "deactivating"])(
    "unit state %j after reboot/cancellation never permits unverified boot",
    async active => {
      bootFixture({ sha: SHA, phase: "rotated", code: "NONE" }, active);
      await expectRejected(
        assertAppBootAuthorized(),
        "BOOT_RELEASE_REQUIRES_FORWARD_FIX"
      );
    }
  );
  it("a missing transient unit after reboot fails closed without importing original server", async () => {
    bootFixture({ sha: SHA, phase: "rotated", code: "NONE" });
    syntheticOperations.command.mockImplementation(() => {
      throw new Error(SYNTHETIC_SECRET_DETAIL);
    });
    await expectRejected(
      assertAppBootAuthorized(),
      "LOCAL_RELEASE_COMMAND_FAILED"
    );
    expect(filesystem.rename).not.toHaveBeenCalled();
  });
  it("failed durable release cannot boot even if a matching unit is active", async () => {
    bootFixture({
      sha: SHA,
      phase: "failed",
      code: "PUBLIC_VERIFICATION_REQUEST_FAILED",
    });
    await expectRejected(
      assertAppBootAuthorized(),
      "BOOT_RELEASE_REQUIRES_FORWARD_FIX"
    );
    expect(syntheticOperations.command).not.toHaveBeenCalled();
  });
  it("journal absence cannot be interpreted as verified completion", async () => {
    bootFixture({
      sha: SHA,
      phase: "verified",
      code: "SECURITY_RELEASE_VERIFIED",
    });
    filesystem.lstat.mockRejectedValueOnce(
      Object.assign(new Error("SYNTHETIC_JOURNAL_ABSENT"), { code: "ENOENT" })
    );
    await expectRejected(
      assertAppBootAuthorized(),
      "BOOT_RELEASE_NOT_AUTHORIZED"
    );
    expect(syntheticOperations.command).not.toHaveBeenCalled();
  });
  it.each(["EACCES", "EIO"])(
    "%s metadata error is never treated as an absent journal",
    async code => {
      bootFixture({
        sha: SHA,
        phase: "verified",
        code: "SECURITY_RELEASE_VERIFIED",
      });
      filesystem.lstat.mockRejectedValueOnce(
        Object.assign(new Error(SYNTHETIC_SECRET_DETAIL), { code })
      );
      await expectRejected(
        assertAppBootAuthorized(),
        "LOCAL_FILESYSTEM_METADATA_UNAVAILABLE"
      );
      expect(syntheticOperations.command).not.toHaveBeenCalled();
    }
  );
  it("a mismatched journal never authorizes boot or consults an unrelated unit", async () => {
    bootFixture({
      sha: "b".repeat(40),
      phase: "verified",
      code: "SECURITY_RELEASE_VERIFIED",
    });
    await expectRejected(assertAppBootAuthorized(), "INVALID_RELEASE_JOURNAL");
    expect(syntheticOperations.command).not.toHaveBeenCalled();
  });
  it("the wrapper dynamically imports only the guarded runtime first, then approved server, emitting only a fixed failure code", () => {
    const entry = source("scripts/securityReleaseEntrypoint.ts");
    expectOrdered(entry, [
      '"./security-release-runtime.mjs"',
      "assertAppBootAuthorized",
      "await guard()",
      '"./secure-app.js"',
    ]);
    expect(entry).not.toMatch(/^import\s.*secure-app/m);
    expect(entry).toContain(
      'console.error("CREATORVAULT_SECURITY_BOOT_GATE_FAILED")'
    );
    expect(entry).not.toMatch(
      /console\.(?:log|error)\([^\n]*(?:error\.|env|password|token|original)/
    );
  });
});

function artifactFixture(
  server = 'approved synthetic "/api/dev-login" res.status(404)'
): string[] {
  const trace: string[] = [];
  filesystem.lstat.mockImplementation(async file => {
    expect([
      "/synthetic/workspace/dist/index.js",
      "/synthetic/workspace/dist/secure-app.js",
    ]).toContain(file);
    if (file.endsWith("secure-app.js"))
      throw new Error("SYNTHETIC_TARGET_ABSENT");
    return syntheticStats();
  });
  filesystem.readFile.mockResolvedValue(server);
  filesystem.rename.mockImplementation(async (from, to) => {
    expect([from, to]).toEqual([
      "/synthetic/workspace/dist/index.js",
      "/synthetic/workspace/dist/secure-app.js",
    ]);
    trace.push("preserve-approved-server");
  });
  syntheticOperations.build.mockImplementation(async options => {
    expect(options).toMatchObject({
      platform: "node",
      format: "esm",
      bundle: true,
      packages: "external",
      logLevel: "silent",
    });
    trace.push(
      options.outfile.endsWith("security-release-runtime.mjs")
        ? "compile-runtime-helper"
        : "compile-entry-wrapper"
    );
  });
  return trace;
}

describe("infrastructure-only guarded artifact builder preserves application directory and original server", () => {
  it("compiles runtime helper, preserves approved index bytes as secure-app and replaces only dist entrypoint with guarded wrapper", async () => {
    const trace = artifactFixture();
    await prepareSecurityReleaseArtifact("/synthetic/workspace");
    expect(trace).toEqual([
      "compile-runtime-helper",
      "preserve-approved-server",
      "compile-entry-wrapper",
    ]);
    expect(
      syntheticOperations.build.mock.calls.map(([options]) => ({
        entryPoints: options.entryPoints,
        outfile: options.outfile,
      }))
    ).toEqual([
      {
        entryPoints: ["/synthetic/workspace/scripts/securityReleaseRunner.ts"],
        outfile: "/synthetic/workspace/dist/security-release-runtime.mjs",
      },
      {
        entryPoints: [
          "/synthetic/workspace/scripts/securityReleaseEntrypoint.ts",
        ],
        outfile: "/synthetic/workspace/dist/index.js",
      },
    ]);
    expect(filesystem.rename).toHaveBeenCalledOnce();
    expect(syntheticOperations.command).not.toHaveBeenCalled();
  });
  it.each([
    "missing protection",
    'local_kingcam_6 "/api/dev-login" res.status(404)',
    '"/api/dev-login" no-404',
    "res.status(404) no-route",
  ])(
    "rejects invalid original server %j before compilation or rename",
    async server => {
      artifactFixture(server);
      await expectRejected(
        prepareSecurityReleaseArtifact("/synthetic/workspace"),
        "BUILT_AUTH_PROTECTION_MISSING"
      );
      expect(syntheticOperations.build).not.toHaveBeenCalled();
      expect(filesystem.rename).not.toHaveBeenCalled();
    }
  );
  it.each([
    { isFile: () => false },
    { isSymbolicLink: () => true },
    { size: 0 },
  ])("rejects unsafe or empty original artifact metadata %j", async patch => {
    artifactFixture();
    filesystem.lstat.mockResolvedValueOnce(syntheticStats(patch));
    await expectRejected(
      prepareSecurityReleaseArtifact("/synthetic/workspace"),
      "APP_ARTIFACT_MISSING"
    );
    expect(filesystem.readFile).not.toHaveBeenCalled();
    expect(syntheticOperations.build).not.toHaveBeenCalled();
  });
  it("refuses an existing symlink secure-app target before any build or rename", async () => {
    artifactFixture();
    filesystem.lstat
      .mockResolvedValueOnce(syntheticStats())
      .mockResolvedValueOnce(syntheticStats({ isSymbolicLink: () => true }));
    await expectRejected(
      prepareSecurityReleaseArtifact("/synthetic/workspace"),
      "UNSAFE_BUILD_TARGET"
    );
    expect(syntheticOperations.build).not.toHaveBeenCalled();
    expect(filesystem.rename).not.toHaveBeenCalled();
  });
  it("a runtime-helper build failure prevents modifying the approved original artifact", async () => {
    artifactFixture();
    syntheticOperations.build.mockRejectedValueOnce(
      new Error(SYNTHETIC_SECRET_DETAIL)
    );
    await expect(
      prepareSecurityReleaseArtifact("/synthetic/workspace")
    ).rejects.toThrow(SYNTHETIC_SECRET_DETAIL);
    expect(filesystem.rename).not.toHaveBeenCalled();
    expect(syntheticOperations.build).toHaveBeenCalledOnce();
  });
  it("complete immutable release policy remains the exact approved 62-file set", () => {
    expect(APPROVED_RELEASE_PATHS).toEqual(EXPECTED_APPROVED_RELEASE_PATHS);
    expect(APPROVED_RELEASE_PATHS).toHaveLength(62);
    expect(APPROVED_RELEASE_PATHS).toContain(
      "scripts/githubWorkflowPermissionPreflight.test.ts"
    );
    expect(APPROVED_RELEASE_PATHS).toContain(
      "scripts/securityReleaseIntegrity.test.ts"
    );
  });
  it("workflow builds the guarded artifact only after mandatory application build and before deployment", () => {
    const workflow = source(".github/workflows/deploy.yml");
    expectOrdered(workflow, [
      "pnpm build\n",
      "Stamp and validate secure release artifact",
      "tsx scripts/prepareSecurityReleaseArtifact.ts",
      "test -f dist/secure-app.js",
      'bash "$GITHUB_WORKSPACE/deploy_work_to_prod.sh"',
    ]);
    expect(workflow).toContain("test -f dist/secure-app.js");
    expect(workflow).toContain("test -f dist/security-release-runtime.mjs");
  });
});

describe("controller persists only public fixture ownership and never requires external login credentials", () => {
  it("durably writes only sha/openId before INSERT, with exclusive nofollow permissions, fsync and parent-directory fsync", () => {
    const runner = source("scripts/securityReleaseRunner.ts").replace(
      /\s+/g,
      " "
    );
    const ownership = runner.slice(
      runner.indexOf("async function persistFixtureOwnership"),
      runner.indexOf("async function cleanupOwnedFixture")
    );
    expect(ownership).toContain(
      "constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600"
    );
    expectOrdered(ownership, [
      "JSON.stringify({ sha, openId })",
      "await handle.sync()",
      "await handle.close()",
      "await fs.rename(temporary, target)",
      "await directory.sync()",
    ]);
    expect(ownership).not.toMatch(
      /password|JWT_SECRET|DATABASE_URL|token|env\[/i
    );
    expect(runner).toMatch(
      /await provisionLoginVerifier\(\s*env,\s*sha,\s*openId\s*=>\s*persistFixtureOwnership\(sha,\s*openId\),?\s*\)/
    );
  });
  it("both successful verification and root supervisor poststop perform owned cleanup before state is considered complete", () => {
    const runner = source("scripts/securityReleaseRunner.ts").replace(
      /\s+/g,
      " "
    );
    const verify = runner.slice(
      runner.indexOf("async verify()"),
      runner.indexOf("clearSensitiveMemory()")
    );
    expectOrdered(verify, [
      "await verifyLiveRelease(sha, loginProof, newKey)",
      "await verifyLogs(cursors)",
      "await cleanupOwnedFixture(sha)",
      'silentCommand(APP_ROOT, "pm2", ["save"]',
    ]);
    const guard = runner.slice(
      runner.indexOf("export async function failureGuard"),
      runner.indexOf("export function checkoutEvidence")
    );
    expectOrdered(guard, [
      "await protectedRoot()",
      "await readJournal(sha)",
      "if (stop) await stopFailedRelease()",
      "await cleanupOwnedFixture(sha)",
    ]);
    const teardown = runner.slice(
      runner.indexOf("async function cleanupOwnedFixture"),
      runner.indexOf("export async function stopFailedRelease")
    );
    expectOrdered(teardown, [
      "assertSecretFile(",
      "state.sha === sha",
      "Object.keys(state).sort().join(",
      "await cleanupLoginVerifier(env.DATABASE_URL, sha, state.openId)",
      "await fs.unlink(file)",
    ]);
    expect(teardown).not.toMatch(/DELETE FROM|INSERT INTO|UPDATE users/);
  });
  it("supervisor preflight uses only existing application configuration and not VPS/workflow verification credentials", () => {
    const runner = executableLines(source("scripts/securityReleaseRunner.ts"));
    const supervisor = runner.slice(
      runner.indexOf("async function launchSupervisor"),
      runner.indexOf("async function main()")
    );
    expect(supervisor).not.toMatch(
      /CREATORVAULT_RELEASE_VERIFY_(?:EMAIL|PASSWORD)|env\.OWNER_OPEN_ID|EXISTING_LOGIN_VERIFICATION_INPUTS_MISSING/
    );
    expect(supervisor).toContain("env.DATABASE_URL && env.VITE_APP_ID");
    expect(runner).not.toMatch(
      /process\.env\.CREATORVAULT_RELEASE_VERIFY_(?:EMAIL|PASSWORD)/
    );
    expect(executableLines(source(".github/workflows/deploy.yml"))).not.toMatch(
      /CREATORVAULT_RELEASE_VERIFY_(?:EMAIL|PASSWORD)|OWNER_OPEN_ID|DATABASE_URL|secrets\.|workflow_dispatch|^\s*environment:/m
    );
    const policy = source("scripts/securityReleasePolicy.ts");
    const command = policy.slice(
      policy.indexOf("export function supervisorCommand"),
      policy.indexOf("export async function executeRelease")
    );
    expect(command).not.toMatch(
      /VERIFY_EMAIL|VERIFY_PASSWORD|JWT_SECRET|DATABASE_URL|OWNER_OPEN_ID/
    );
  });
  it("provisioning, cleanup and controller output never print managed user identities, raw credentials or tokens", () => {
    const verifier = source("scripts/securityReleaseVerification.ts");
    expect(verifier).not.toMatch(/console\.(?:log|error|warn|debug|info)\s*\(/);
    const output = source("scripts/securityReleaseRunner.ts")
      .split("\n")
      .filter(line => /console\.(?:log|error)\(/.test(line));
    expect(output).toHaveLength(8);
    for (const line of output)
      expect(line).not.toMatch(
        /verifier|openId|ownership|fixture|password|email|oldSession|ownerSession|token|env|\.message|\.stack/i
      );
    const executable = executableLines(verifier);
    expect(executable).not.toMatch(
      /(?:writeFile|appendFile|execFile|spawn)\s*\(/
    );
    expect(executable).toContain("await persistOwnership(openId)");
    expectOrdered(executable.slice(executable.indexOf("const openId =")), [
      "await persistOwnership(openId)",
      "randomBytes(48)",
      "await bcrypt.hash(password, 12)",
      "connection.execute<ResultSetHeader>",
    ]);
  });
  it("virtual verifier values and raw secret source are cleared after the real preflight proof", () => {
    const runner = source("scripts/securityReleaseRunner.ts").replace(
      /\s+/g,
      " "
    );
    expect(runner).toContain(
      "try { loginProof = await prepareLoginProof(verifier); }"
    );
    expect(runner).toContain(
      "finally { for (const key of Object.keys(verifier)) delete verifier[key]; for (const key of Object.keys(env)) delete env[key]; }"
    );
    expect(runner).toContain('loginProof.password = ""');
    expect(runner).toContain('loginProof.oldSession = ""');
  });
  it("the isolated focused suite explicitly rejects empty execution and retries", () => {
    const config = source("vitest.security-release.config.ts");
    expect(config).toContain("retry: 0");
    expect(config).toContain("passWithNoTests: false");
    expect(config).toContain("globalSetup: []");
    expect(config).toContain("fileParallelism: false");
  });
});
