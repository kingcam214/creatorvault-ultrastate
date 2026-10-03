import { execFileSync } from "node:child_process";
import { constants, promises as fs, type Stats } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseDotenv } from "dotenv";
import { jwtVerify, SignJWT } from "jose";
import mysql, { type RowDataPacket } from "mysql2/promise";
import {
  PUBLIC_ORIGIN,
  ReleaseFailure,
  assertNewKey,
  assertSecretFile,
  locateJwtKey,
  record,
  requireRelease,
  safeEqual,
} from "./securityReleasePolicy";
import {
  APP_ROOT,
  CONSOLIDATED_SECURITY_BASELINE,
  checkConsolidatedCheckout,
} from "./consolidatedReleasePolicy";
import { applyConsolidatedMigrations } from "./consolidatedMigrations";
import {
  preparePortableMariaDbTools,
  portableMariaDbServiceEnvironment,
} from "./portableMariaDbTools";
import {
  OWNER_READ,
  cleanupLoginVerifier,
  prepareLoginProof,
  provisionLoginVerifier,
  requestPublic,
  trpcData,
  type LoginProof,
} from "./securityReleaseVerification";

const ENV_PATH = `${APP_ROOT}/.env`;
const WRITER_LOCK = `${APP_ROOT}/.env.writer.lock`;
const ENTRY_PATH = `${APP_ROOT}/dist/index.js`;
const SECURE_APP_PATH = `${APP_ROOT}/dist/secure-app.js`;
const RUNTIME_PATH = `${APP_ROOT}/dist/consolidated-release-runtime.mjs`;
const RELEASE_STAMP_PATH = `${APP_ROOT}/dist/public/release.json`;
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_LOG_WINDOW = 2 * 1024 * 1024;

type ReleasePhase =
  | "preflight"
  | "migrating"
  | "activation-intent"
  | "ready"
  | "verified"
  | "failed";

export type ReleaseState = {
  sha: string;
  phase: ReleasePhase;
  code: string;
  migrations?: number;
  alreadyApplied?: number;
  proof?: string;
};

type FileSnapshot = {
  dev: number;
  ino: number;
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  uid: number;
  gid: number;
  mode: number;
  digest?: string;
};

type EnvCapture = {
  snapshot: FileSnapshot;
  source: string;
};

type Pm2Proof = {
  pid: number;
  restarts: number;
};

type LogCursor = {
  path: string;
  dev: number;
  ino: number;
  size: number;
};

type Inputs = {
  workspace: string;
  sha: string;
  ref: string;
  event: string;
  before: string;
};

type VerificationEvidence = {
  pid: number;
  restarts: number;
  migrations: number;
  alreadyApplied: number;
};

export type ConsolidatedReleaseResult = {
  ok: boolean;
  sha: string;
  code: string;
  phase: ReleasePhase | "supervisor";
  evidence?: VerificationEvidence;
};

function statePath(sha: string): string {
  requireRelease(/^[a-f0-9]{40}$/.test(sha), "INVALID_CONSOLIDATED_SHA");
  return `${APP_ROOT}/.consolidated-release-state-${sha}.json`;
}

function fixturePath(sha: string): string {
  requireRelease(/^[a-f0-9]{40}$/.test(sha), "INVALID_CONSOLIDATED_SHA");
  return `${APP_ROOT}/.consolidated-release-fixture-${sha}.json`;
}

function stagePath(sha: string): string {
  requireRelease(/^[a-f0-9]{40}$/.test(sha), "INVALID_CONSOLIDATED_SHA");
  return `${APP_ROOT}/.consolidated-release-stage-${sha}`;
}

function controlPath(sha: string): string {
  requireRelease(/^[a-f0-9]{40}$/.test(sha), "INVALID_CONSOLIDATED_SHA");
  return `${APP_ROOT}/.consolidated-release-control-${sha}`;
}

function priorArtifactPath(): string {
  return `${APP_ROOT}/dist.secure-${CONSOLIDATED_SECURITY_BASELINE}`;
}

function backupDirectory(): string {
  return `${APP_ROOT}/.consolidated-release-backups`;
}

function snapshot(meta: Stats, digest?: string): FileSnapshot {
  return {
    dev: meta.dev,
    ino: meta.ino,
    size: meta.size,
    mtimeMs: meta.mtimeMs,
    ctimeMs: meta.ctimeMs,
    uid: meta.uid,
    gid: meta.gid,
    mode: meta.mode,
    digest,
  };
}

function unchanged(left: FileSnapshot, right: FileSnapshot): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.digest === right.digest
  );
}

function errorCode(error: unknown): string {
  if (error instanceof ReleaseFailure) return error.code;
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[A-Z][A-Z0-9_]{1,120}$/.test(error.code)
  )
    return error.code;
  return "CONSOLIDATED_RELEASE_OPERATION_FAILED";
}

function scrubEnvironment(): NodeJS.ProcessEnv {
  const environment = { ...process.env };
  for (const key of [
    "JWT_SECRET",
    "NODE_OPTIONS",
    "NODE_PATH",
    "NODE_DEBUG",
    "NODE_DEBUG_NATIVE",
    "DEBUG",
    "BASH_ENV",
    "ENV",
    "SHELLOPTS",
    "BASHOPTS",
    "LD_PRELOAD",
    "LD_LIBRARY_PATH",
  ])
    delete environment[key];
  for (const key of Object.keys(environment))
    if (key.startsWith("BASH_FUNC_")) delete environment[key];
  return environment;
}

/** No command output, stderr, or inherited preload configuration leaves this process. */
function silentCommand(
  cwd: string,
  command: string,
  args: readonly string[],
  timeout = 60000,
  privateToolEnvironment?: NodeJS.ProcessEnv
): string {
  try {
    return execFileSync(command, [...args], {
      cwd,
      env: privateToolEnvironment ?? scrubEnvironment(),
      stdio: ["ignore", "pipe", "pipe"],
      timeout,
      maxBuffer: 4 * 1024 * 1024,
      encoding: "utf8",
    });
  } catch {
    throw new ReleaseFailure("CONSOLIDATED_LOCAL_COMMAND_FAILED");
  }
}

async function optionalLstat(file: string): Promise<Stats | undefined> {
  try {
    return await fs.lstat(file);
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    )
      return undefined;
    throw new ReleaseFailure("CONSOLIDATED_FILESYSTEM_METADATA_UNAVAILABLE");
  }
}

function assertRootPrivateFile(meta: Stats, code: string): void {
  try {
    assertSecretFile({
      uid: meta.uid,
      gid: meta.gid,
      mode: meta.mode,
      regular: meta.isFile(),
      symlink: meta.isSymbolicLink(),
      links: meta.nlink,
    });
  } catch {
    throw new ReleaseFailure(code);
  }
}

function assertRootProtectedFile(meta: Stats, code: string): void {
  requireRelease(
    meta.isFile() &&
      !meta.isSymbolicLink() &&
      meta.nlink === 1 &&
      meta.uid === 0 &&
      meta.gid === 0 &&
      (meta.mode & 0o022) === 0 &&
      meta.size > 0 &&
      meta.size <= MAX_FILE_BYTES,
    code
  );
}

async function assertRootDirectory(
  directory: string,
  code: string
): Promise<void> {
  const meta = await fs.lstat(directory).catch(() => {
    throw new ReleaseFailure(code);
  });
  requireRelease(
    meta.isDirectory() &&
      !meta.isSymbolicLink() &&
      meta.uid === 0 &&
      meta.gid === 0 &&
      (meta.mode & 0o022) === 0,
    code
  );
}

async function readStablePrivateFile(
  file: string,
  maxBytes: number,
  code: string
): Promise<{ meta: Stats; text: string }> {
  const meta = await fs.lstat(file).catch(() => {
    throw new ReleaseFailure(code);
  });
  assertRootPrivateFile(meta, code);
  requireRelease(meta.size <= maxBytes, code);
  const handle = await fs
    .open(file, constants.O_RDONLY | constants.O_NOFOLLOW)
    .catch(() => {
      throw new ReleaseFailure(code);
    });
  try {
    const actual = await handle.stat();
    requireRelease(
      actual.dev === meta.dev &&
        actual.ino === meta.ino &&
        actual.size === meta.size,
      code
    );
    const text = await handle.readFile("utf8");
    return { meta, text };
  } finally {
    await handle.close();
  }
}

async function captureAuthoritativeEnv(): Promise<EnvCapture> {
  const { meta, text } = await readStablePrivateFile(
    ENV_PATH,
    MAX_FILE_BYTES,
    "CONSOLIDATED_AUTHORITATIVE_ENV_INVALID"
  );
  return {
    snapshot: snapshot(meta, createHash("sha256").update(text).digest("hex")),
    source: text,
  };
}

async function assertEnvUnchanged(expected: FileSnapshot): Promise<void> {
  const current = await captureAuthoritativeEnv();
  try {
    requireRelease(
      unchanged(expected, current.snapshot),
      "CONSOLIDATED_AUTHORITATIVE_ENV_CHANGED"
    );
  } finally {
    current.source = "";
  }
}

async function guardedMutation<T>(
  env: FileSnapshot,
  work: () => Promise<T>
): Promise<T> {
  await assertEnvUnchanged(env);
  const result = await work();
  await assertEnvUnchanged(env);
  return result;
}

function validateState(value: unknown, sha: string): ReleaseState {
  const state = record(value);
  requireRelease(
    state.sha === sha &&
      typeof state.phase === "string" &&
      [
        "preflight",
        "migrating",
        "activation-intent",
        "ready",
        "verified",
        "failed",
      ].includes(state.phase) &&
      typeof state.code === "string" &&
      /^[A-Z][A-Z0-9_]{1,120}$/.test(state.code),
    "CONSOLIDATED_STATE_INVALID"
  );
  for (const key of Object.keys(state))
    requireRelease(
      [
        "sha",
        "phase",
        "code",
        "migrations",
        "alreadyApplied",
        "proof",
      ].includes(key),
      "CONSOLIDATED_STATE_INVALID"
    );
  for (const key of ["migrations", "alreadyApplied"] as const)
    if (key in state)
      requireRelease(
        typeof state[key] === "number" &&
          Number.isSafeInteger(state[key]) &&
          state[key] >= 0 &&
          state[key] <= 100,
        "CONSOLIDATED_STATE_INVALID"
      );
  if ("proof" in state)
    requireRelease(
      typeof state.proof === "string" &&
        /^[A-Z][A-Z0-9_]{1,120}$/.test(state.proof),
      "CONSOLIDATED_STATE_INVALID"
    );
  return state as ReleaseState;
}

async function readState(sha: string): Promise<ReleaseState | undefined> {
  const target = statePath(sha);
  const meta = await optionalLstat(target);
  if (!meta) return undefined;
  const stable = await readStablePrivateFile(
    target,
    32768,
    "CONSOLIDATED_STATE_INVALID"
  );
  try {
    requireRelease(
      stable.meta.ino === meta.ino && stable.meta.dev === meta.dev,
      "CONSOLIDATED_STATE_INVALID"
    );
    return validateState(JSON.parse(stable.text) as unknown, sha);
  } catch (error: unknown) {
    if (error instanceof ReleaseFailure) throw error;
    throw new ReleaseFailure("CONSOLIDATED_STATE_INVALID");
  }
}

async function writeState(state: ReleaseState): Promise<void> {
  validateState(state, state.sha);
  const target = statePath(state.sha);
  const old = await optionalLstat(target);
  if (old) assertRootPrivateFile(old, "CONSOLIDATED_STATE_INVALID");
  const temporary = `${target}.tmp`;
  requireRelease(
    !(await optionalLstat(temporary)),
    "CONSOLIDATED_STATE_TEMP_EXISTS"
  );
  let handle: fs.FileHandle | undefined;
  try {
    handle = await fs.open(
      temporary,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600
    );
    await handle.writeFile(`${JSON.stringify(state)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await fs.rename(temporary, target);
    const directory = await fs.open(
      APP_ROOT,
      constants.O_RDONLY | constants.O_DIRECTORY
    );
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
    const verified = await fs.lstat(target);
    assertRootPrivateFile(verified, "CONSOLIDATED_STATE_PERSIST_FAILED");
  } catch (error: unknown) {
    if (error instanceof ReleaseFailure) throw error;
    throw new ReleaseFailure("CONSOLIDATED_STATE_PERSIST_FAILED");
  } finally {
    if (handle) await handle.close().catch(() => undefined);
    await fs.unlink(temporary).catch(() => undefined);
  }
}

async function assertHistoricalSecurityRecord(): Promise<void> {
  const target = `${APP_ROOT}/.security-release-state-${CONSOLIDATED_SECURITY_BASELINE}.json`;
  const stable = await readStablePrivateFile(
    target,
    4096,
    "CONSOLIDATED_SECURITY_BASELINE_RECORD_INVALID"
  );
  try {
    const value = record(JSON.parse(stable.text) as unknown);
    requireRelease(
      value.sha === CONSOLIDATED_SECURITY_BASELINE &&
        value.phase === "verified" &&
        value.code === "SECURITY_RELEASE_VERIFIED",
      "CONSOLIDATED_SECURITY_BASELINE_RECORD_INVALID"
    );
  } catch (error: unknown) {
    if (error instanceof ReleaseFailure) throw error;
    throw new ReleaseFailure("CONSOLIDATED_SECURITY_BASELINE_RECORD_INVALID");
  }
}

function assertNoPreloadHooks(): void {
  for (const key of [
    "NODE_OPTIONS",
    "NODE_PATH",
    "NODE_DEBUG",
    "NODE_DEBUG_NATIVE",
    "DEBUG",
    "BASH_ENV",
    "ENV",
    "LD_PRELOAD",
    "LD_LIBRARY_PATH",
  ])
    requireRelease(
      !process.env[key],
      "CONSOLIDATED_UNTRUSTED_PRELOAD_ENVIRONMENT"
    );
  requireRelease(
    !/\b(?:xtrace|verbose)\b/.test(process.env.SHELLOPTS ?? "") &&
      !Object.keys(process.env).some(key => key.startsWith("BASH_FUNC_")),
    "CONSOLIDATED_UNTRUSTED_PRELOAD_ENVIRONMENT"
  );
}

async function assertRootContext(): Promise<void> {
  requireRelease(
    process.getuid?.() === 0 && process.getgid?.() === 0,
    "CONSOLIDATED_ROOT_CONTEXT_REQUIRED"
  );
  assertNoPreloadHooks();
  for (const directory of ["/", "/root", APP_ROOT])
    await assertRootDirectory(directory, "CONSOLIDATED_ROOT_PATH_UNSAFE");
  requireRelease(
    (await fs.realpath(APP_ROOT)) === APP_ROOT,
    "CONSOLIDATED_APP_ROOT_NOT_CANONICAL"
  );
  const lock = await fs.lstat(WRITER_LOCK).catch(() => {
    throw new ReleaseFailure("CONSOLIDATED_ENV_WRITER_LOCK_MISSING");
  });
  assertRootPrivateFile(lock, "CONSOLIDATED_ENV_WRITER_LOCK_INVALID");
  await assertHistoricalSecurityRecord();
}

function inputsFromEnvironment(): Inputs {
  const workspace = process.env.CREATORVAULT_RELEASE_WORKSPACE ?? "";
  const sha = process.env.CREATORVAULT_RELEASE_SHA ?? "";
  const ref = process.env.CREATORVAULT_RELEASE_REF ?? "";
  const event = process.env.CREATORVAULT_RELEASE_EVENT ?? "";
  const before = process.env.CREATORVAULT_RELEASE_BEFORE ?? "";
  requireRelease(
    workspace.startsWith("/") &&
      !/[\x00-\x1f\x7f]/.test(workspace) &&
      /^[a-f0-9]{40}$/.test(sha) &&
      ref === "refs/heads/main" &&
      event === "push" &&
      /^[a-f0-9]{40}$/.test(before),
    "CONSOLIDATED_RELEASE_ENVIRONMENT_INVALID"
  );
  return { workspace, sha, ref, event, before };
}

export function checkConsolidatedReleaseCheckout(
  workspace: string,
  sha: string,
  ref: string,
  event: string,
  before: string
): void {
  checkConsolidatedCheckout(workspace, sha, ref, event, before);
}

async function assertLiveBaseline(): Promise<void> {
  const response = await requestPublic("/__release");
  const release = record(response.body);
  requireRelease(
    response.status === 200 &&
      release.commit === CONSOLIDATED_SECURITY_BASELINE &&
      release.branch === "main" &&
      release.environment === "production",
    "CONSOLIDATED_LIVE_BASELINE_MISMATCH"
  );
}

function numberField(
  value: Record<string, unknown>,
  key: string,
  code: string
): number {
  const candidate = value[key];
  requireRelease(
    typeof candidate === "number" &&
      Number.isSafeInteger(candidate) &&
      candidate >= 0,
    code
  );
  return candidate;
}

function noArguments(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

async function pm2Proof(): Promise<Pm2Proof> {
  let rows: unknown;
  try {
    rows = JSON.parse(silentCommand(APP_ROOT, "pm2", ["jlist"])) as unknown;
  } catch (error: unknown) {
    if (error instanceof ReleaseFailure)
      throw new ReleaseFailure("CONSOLIDATED_PM2_METADATA_UNAVAILABLE");
    throw new ReleaseFailure("CONSOLIDATED_PM2_METADATA_UNAVAILABLE");
  }
  requireRelease(Array.isArray(rows), "CONSOLIDATED_PM2_METADATA_INVALID");
  const apps = rows.filter(value => record(value).name === "creatorvault");
  requireRelease(apps.length === 1, "CONSOLIDATED_PM2_APPLICATION_NOT_UNIQUE");
  const app = record(apps[0]);
  const env = record(app.pm2_env);
  const pid = numberField(app, "pid", "CONSOLIDATED_PM2_METADATA_INVALID");
  const restarts = numberField(
    env,
    "restart_time",
    "CONSOLIDATED_PM2_METADATA_INVALID"
  );
  requireRelease(
    env.status === "online" &&
      env.exec_mode === "fork_mode" &&
      (env.instances === 1 || env.instances === "1") &&
      env.watch === false &&
      env.pm_cwd === APP_ROOT &&
      env.pm_exec_path === ENTRY_PATH &&
      typeof env.exec_interpreter === "string" &&
      /(?:^|\/)node$/.test(env.exec_interpreter) &&
      env.autorestart === true &&
      noArguments(env.node_args) &&
      noArguments(env.args) &&
      noArguments(env.interpreter_args),
    "CONSOLIDATED_PM2_RUNTIME_INVALID"
  );
  const status = await fs.readFile(`/proc/${pid}/status`, "utf8").catch(() => {
    throw new ReleaseFailure("CONSOLIDATED_PM2_PROCESS_UNAVAILABLE");
  });
  const uid = /^Uid:\s+(\d+)/m.exec(status)?.[1];
  requireRelease(uid === "0", "CONSOLIDATED_PM2_PROCESS_NOT_ROOT");
  const cwd = await fs.readlink(`/proc/${pid}/cwd`).catch(() => {
    throw new ReleaseFailure("CONSOLIDATED_PM2_PROCESS_UNAVAILABLE");
  });
  const executable = await fs.realpath(`/proc/${pid}/exe`).catch(() => {
    throw new ReleaseFailure("CONSOLIDATED_PM2_PROCESS_UNAVAILABLE");
  });
  const executableMeta = await fs.stat(executable).catch(() => {
    throw new ReleaseFailure("CONSOLIDATED_PM2_PROCESS_UNAVAILABLE");
  });
  requireRelease(
    path.basename(executable) === "node" &&
      executableMeta.isFile() &&
      executableMeta.uid === 0 &&
      (executableMeta.mode & 0o022) === 0 &&
      cwd === APP_ROOT,
    "CONSOLIDATED_KERNEL_NODE_INVALID"
  );
  const rawCommand = await fs.readFile(`/proc/${pid}/cmdline`).catch(() => {
    throw new ReleaseFailure("CONSOLIDATED_PM2_PROCESS_UNAVAILABLE");
  });
  const argv = rawCommand.toString("utf8").split("\0").filter(Boolean);
  rawCommand.fill(0);
  const directLauncher =
    argv.length === 2 && argv[0] === executable && argv[1] === ENTRY_PATH;
  const pm2Title = argv.length === 1 && argv[0] === `node ${ENTRY_PATH}`;
  requireRelease(
    directLauncher || pm2Title,
    "CONSOLIDATED_NODE_LAUNCHER_INVALID"
  );
  const inherited = await fs.readFile(`/proc/${pid}/environ`).catch(() => {
    throw new ReleaseFailure("CONSOLIDATED_PM2_PROCESS_UNAVAILABLE");
  });
  try {
    const keys = inherited
      .toString("utf8")
      .split("\0")
      .map(entry => entry.split("=", 1)[0] ?? "");
    requireRelease(
      !keys.some(
        key =>
          [
            "NODE_OPTIONS",
            "NODE_PATH",
            "NODE_DEBUG",
            "NODE_DEBUG_NATIVE",
            "DEBUG",
            "BASH_ENV",
            "ENV",
            "LD_PRELOAD",
            "LD_LIBRARY_PATH",
          ].includes(key) || key.startsWith("BASH_FUNC_")
      ),
      "CONSOLIDATED_RUNTIME_PRELOAD_REJECTED"
    );
  } finally {
    inherited.fill(0);
  }
  return { pid, restarts };
}

async function assertProtectedActiveArtifact(sha: string): Promise<void> {
  const stamp = await fs.readFile(RELEASE_STAMP_PATH, "utf8").catch(() => {
    throw new ReleaseFailure("CONSOLIDATED_RELEASE_STAMP_MISSING");
  });
  let release: Record<string, unknown>;
  try {
    release = record(JSON.parse(stamp) as unknown);
  } catch {
    throw new ReleaseFailure("CONSOLIDATED_RELEASE_STAMP_INVALID");
  }
  requireRelease(
    release.commit === sha &&
      release.branch === "main" &&
      release.environment === "production",
    "CONSOLIDATED_RELEASE_STAMP_INVALID"
  );
  await assertRootDirectory(
    `${APP_ROOT}/dist`,
    "CONSOLIDATED_ACTIVE_ARTIFACT_INVALID"
  );
  const runtime =
    sha === CONSOLIDATED_SECURITY_BASELINE
      ? `${APP_ROOT}/dist/security-release-runtime.mjs`
      : RUNTIME_PATH;
  for (const file of [
    ENTRY_PATH,
    SECURE_APP_PATH,
    runtime,
    RELEASE_STAMP_PATH,
  ]) {
    const meta = await fs.lstat(file).catch(() => {
      throw new ReleaseFailure("CONSOLIDATED_ACTIVE_ARTIFACT_INVALID");
    });
    assertRootProtectedFile(meta, "CONSOLIDATED_ACTIVE_ARTIFACT_INVALID");
  }
  if (sha === CONSOLIDATED_SECURITY_BASELINE) {
    const wrapper = await fs.readFile(ENTRY_PATH, "utf8");
    const server = await fs.readFile(SECURE_APP_PATH, "utf8");
    requireRelease(
      wrapper.includes("assertAppBootAuthorized") &&
        wrapper.includes("activateAuthoritativeSigningSource") &&
        wrapper.includes("secure-app.js") &&
        !server.includes("local_kingcam_6") &&
        server.includes('"/api/dev-login"') &&
        server.includes("res.status(404)"),
      "CONSOLIDATED_ACTIVE_BASELINE_SECURITY_UNPROVEN"
    );
  }
}

async function assertCandidateArtifact(
  directory: string,
  sha: string
): Promise<void> {
  const stampPath = path.join(directory, "public/release.json");
  const stamp = await fs.readFile(stampPath, "utf8").catch(() => {
    throw new ReleaseFailure("CONSOLIDATED_CANDIDATE_STAMP_MISSING");
  });
  let release: Record<string, unknown>;
  try {
    release = record(JSON.parse(stamp) as unknown);
  } catch {
    throw new ReleaseFailure("CONSOLIDATED_CANDIDATE_STAMP_INVALID");
  }
  requireRelease(
    release.commit === sha &&
      release.branch === "main" &&
      release.environment === "production",
    "CONSOLIDATED_CANDIDATE_STAMP_INVALID"
  );
  for (const file of [
    "index.js",
    "secure-app.js",
    "consolidated-release-runtime.mjs",
    "public/index.html",
  ]) {
    const meta = await fs.lstat(path.join(directory, file)).catch(() => {
      throw new ReleaseFailure("CONSOLIDATED_CANDIDATE_INCOMPLETE");
    });
    requireRelease(
      meta.isFile() &&
        !meta.isSymbolicLink() &&
        meta.nlink === 1 &&
        meta.size > 0,
      "CONSOLIDATED_CANDIDATE_INCOMPLETE"
    );
  }
  const wrapper = await fs.readFile(path.join(directory, "index.js"), "utf8");
  const server = await fs.readFile(
    path.join(directory, "secure-app.js"),
    "utf8"
  );
  requireRelease(
    wrapper.includes("assertConsolidatedAppBootAuthorized") &&
      wrapper.includes("secure-app.js") &&
      !server.includes("local_kingcam_6") &&
      server.includes('"/api/dev-login"') &&
      server.includes("res.status(404)"),
    "CONSOLIDATED_GUARDED_BUILD_INVALID"
  );
}

async function treeDigest(directory: string): Promise<string> {
  const digest = createHash("sha256");
  async function visit(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const file = path.join(current, entry.name);
      const relative = path.relative(directory, file);
      requireRelease(
        !entry.isSymbolicLink() && (entry.isFile() || entry.isDirectory()),
        "CONSOLIDATED_UNSAFE_ARTIFACT_TREE"
      );
      requireRelease(
        !/(^|\/)(?:\.env(?:\.|$)|node_modules|uploads|logs)(?:\/|$)/.test(
          relative
        ) && !/\.(?:pem|key|crt|p12)$/i.test(relative),
        "CONSOLIDATED_SECRET_OR_RUNTIME_FILE_IN_ARTIFACT"
      );
      const meta = await fs.lstat(file);
      requireRelease(
        meta.uid === 0 &&
          meta.gid === 0 &&
          (entry.isDirectory() || meta.nlink === 1),
        "CONSOLIDATED_ARTIFACT_OWNERSHIP_INVALID"
      );
      digest.update(relative);
      digest.update("\0");
      if (entry.isDirectory()) {
        await visit(file);
      } else {
        const handle = await fs.open(
          file,
          constants.O_RDONLY | constants.O_NOFOLLOW
        );
        try {
          for await (const chunk of handle.createReadStream())
            digest.update(chunk);
        } finally {
          await handle.close();
        }
      }
      digest.update("\0");
    }
  }
  await visit(directory);
  return digest.digest("hex");
}

async function assertPackageParity(workspace: string): Promise<void> {
  const currentText = await fs.readFile(`${APP_ROOT}/package.json`, "utf8");
  const candidateText = await fs.readFile(
    path.join(workspace, "package.json"),
    "utf8"
  );
  let current: Record<string, unknown>;
  let candidate: Record<string, unknown>;
  try {
    current = record(JSON.parse(currentText) as unknown);
    candidate = record(JSON.parse(candidateText) as unknown);
  } catch {
    throw new ReleaseFailure("CONSOLIDATED_PACKAGE_METADATA_INVALID");
  }
  requireRelease(
    JSON.stringify(current.dependencies) ===
      JSON.stringify(candidate.dependencies) &&
      JSON.stringify(current.devDependencies) ===
        JSON.stringify(candidate.devDependencies) &&
      (await fs.readFile(`${APP_ROOT}/pnpm-lock.yaml`, "utf8")) ===
        (await fs.readFile(path.join(workspace, "pnpm-lock.yaml"), "utf8")),
    "CONSOLIDATED_DEPENDENCY_OR_LOCKFILE_MISMATCH"
  );
}

async function stageCandidate(workspace: string, sha: string): Promise<string> {
  const stage = stagePath(sha);
  requireRelease(
    !(await optionalLstat(stage)),
    "CONSOLIDATED_PRIOR_STAGE_REQUIRES_REVIEW"
  );
  await fs.mkdir(stage, { mode: 0o700 });
  await assertRootDirectory(stage, "CONSOLIDATED_STAGE_DIRECTORY_INVALID");
  const source = path.join(workspace, "dist");
  await assertCandidateArtifact(source, sha);
  const sourceDigest = await treeDigest(source);
  await fs.cp(source, path.join(stage, "dist"), {
    recursive: true,
    errorOnExist: true,
    force: false,
    dereference: false,
  });
  for (const file of ["package.json", "pnpm-lock.yaml"])
    await fs.copyFile(
      path.join(workspace, file),
      path.join(stage, file),
      constants.COPYFILE_EXCL
    );
  await assertCandidateArtifact(path.join(stage, "dist"), sha);
  requireRelease(
    (await treeDigest(path.join(stage, "dist"))) === sourceDigest,
    "CONSOLIDATED_STAGE_DIGEST_MISMATCH"
  );
  return sourceDigest;
}

function configValue(value: string): string {
  requireRelease(
    !/[\x00-\x1f\x7f]/.test(value),
    "CONSOLIDATED_BACKUP_URI_INVALID"
  );
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function parsedDatabase(databaseUrl: string): {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
  sslMode?: string;
  socketPath?: string;
} {
  let value: URL;
  try {
    value = new URL(databaseUrl);
  } catch {
    throw new ReleaseFailure("CONSOLIDATED_BACKUP_URI_INVALID");
  }
  requireRelease(
    (value.protocol === "mysql:" || value.protocol === "mariadb:") &&
      value.hostname.length > 0 &&
      value.pathname.length > 1 &&
      value.username.length > 0,
    "CONSOLIDATED_BACKUP_URI_INVALID"
  );
  const sslMode = value.searchParams.get("ssl-mode") ?? undefined;
  if (sslMode)
    requireRelease(
      /^[A-Za-z0-9_-]{1,40}$/.test(sslMode),
      "CONSOLIDATED_BACKUP_URI_INVALID"
    );
  return {
    host: decodeURIComponent(value.hostname),
    port: value.port || "3306",
    user: decodeURIComponent(value.username),
    password: decodeURIComponent(value.password),
    database: decodeURIComponent(value.pathname.slice(1)),
    sslMode,
    socketPath: value.searchParams.get("socketPath") ?? undefined,
  };
}

async function protectedDatabaseBackup(
  databaseUrl: string,
  sha: string
): Promise<void> {
  const backupRoot = backupDirectory();
  const rootMeta = await optionalLstat(backupRoot);
  if (!rootMeta) await fs.mkdir(backupRoot, { mode: 0o700 });
  await assertRootDirectory(
    backupRoot,
    "CONSOLIDATED_BACKUP_DIRECTORY_INVALID"
  );
  const backup = path.join(backupRoot, `${sha}.sql`);
  const config = path.join(backupRoot, `${sha}.client.cnf`);
  requireRelease(
    !(await optionalLstat(backup)) && !(await optionalLstat(config)),
    "CONSOLIDATED_BACKUP_ALREADY_EXISTS"
  );
  const details = parsedDatabase(databaseUrl);
  const binaries = ["/usr/bin/mysqldump", "/usr/bin/mariadb-dump"];
  let dump: string | undefined;
  let privateToolEnvironment: NodeJS.ProcessEnv | undefined;
  for (const candidate of binaries) {
    const meta = await optionalLstat(candidate);
    if (
      meta &&
      meta.isFile() &&
      !meta.isSymbolicLink() &&
      meta.uid === 0 &&
      (meta.mode & 0o022) === 0
    ) {
      dump = candidate;
      break;
    }
  }
  if (!dump) {
    const toolsRoot = path.join(controlPath(sha), "portable-db-tools");
    await fs.mkdir(toolsRoot, { mode: 0o700 });
    await assertRootDirectory(
      toolsRoot,
      "CONSOLIDATED_PRIVATE_BACKUP_TOOLS_INVALID"
    );
    const tools = await preparePortableMariaDbTools(toolsRoot).catch(() => {
      throw new ReleaseFailure(
        "CONSOLIDATED_PRIVATE_BACKUP_TOOL_PREPARATION_FAILED"
      );
    });
    dump = tools.dump;
    privateToolEnvironment = portableMariaDbServiceEnvironment(
      tools.libraryPath
    );
  }
  requireRelease(dump, "CONSOLIDATED_BACKUP_TOOL_UNAVAILABLE");
  let handle: fs.FileHandle | undefined;
  try {
    const lines = [
      "[client]",
      `host=${configValue(details.host)}`,
      `port=${configValue(details.port)}`,
      `user=${configValue(details.user)}`,
      `password=${configValue(details.password)}`,
      ...(details.socketPath
        ? [`socket=${configValue(details.socketPath)}`, "protocol=SOCKET"]
        : ["protocol=TCP"]),
      ...(details.sslMode ? [`ssl-mode=${configValue(details.sslMode)}`] : []),
      "",
    ];
    handle = await fs.open(
      config,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600
    );
    await handle.writeFile(lines.join("\n"), "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    const result = await fs.open(
      backup,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600
    );
    await result.close();
    const args = [
      `--defaults-extra-file=${config}`,
      "--single-transaction",
      "--no-tablespaces",
      "--hex-blob",
      "--add-drop-table",
      `--result-file=${backup}`,
      "--",
      details.database,
    ];
    silentCommand(APP_ROOT, dump, args, 300000, privateToolEnvironment);
    const backupHandle = await fs.open(
      backup,
      constants.O_RDONLY | constants.O_NOFOLLOW
    );
    try {
      const meta = await backupHandle.stat();
      assertRootPrivateFile(meta, "CONSOLIDATED_BACKUP_INVALID");
      requireRelease(meta.size > 0, "CONSOLIDATED_BACKUP_EMPTY");
      await backupHandle.sync();
    } finally {
      await backupHandle.close();
    }
  } catch (error: unknown) {
    if (error instanceof ReleaseFailure) throw error;
    throw new ReleaseFailure("CONSOLIDATED_BACKUP_FAILED");
  } finally {
    if (handle) await handle.close().catch(() => undefined);
    await fs.unlink(config).catch(() => undefined);
  }
}

async function verifyMigratedTables(databaseUrl: string): Promise<void> {
  let connection: mysql.Connection | undefined;
  try {
    connection = await mysql.createConnection(databaseUrl);
    for (const table of [
      "stripe_creator_payouts",
      "stripe_creator_payout_policy",
      "persona_vaults",
      "persona_assets",
      "video_generation_chains",
      "video_chain_segments",
    ]) {
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT 1 AS present FROM \`${table}\` LIMIT 1`
      );
      requireRelease(
        Array.isArray(rows),
        "CONSOLIDATED_MIGRATION_READ_PROOF_FAILED"
      );
    }
  } catch (error: unknown) {
    if (error instanceof ReleaseFailure) throw error;
    throw new ReleaseFailure("CONSOLIDATED_MIGRATION_READ_PROOF_FAILED");
  } finally {
    if (connection) await connection.end().catch(() => undefined);
  }
}

async function persistFixtureOwnership(
  sha: string,
  openId: string
): Promise<void> {
  requireRelease(
    /^cv_release_verify_[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      openId
    ),
    "CONSOLIDATED_FIXTURE_OWNERSHIP_INVALID"
  );
  const target = fixturePath(sha);
  requireRelease(
    !(await optionalLstat(target)),
    "CONSOLIDATED_FIXTURE_JOURNAL_EXISTS"
  );
  const temporary = `${target}.tmp`;
  let handle: fs.FileHandle | undefined;
  try {
    handle = await fs.open(
      temporary,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600
    );
    await handle.writeFile(`${JSON.stringify({ sha, openId })}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await fs.rename(temporary, target);
  } catch (error: unknown) {
    if (error instanceof ReleaseFailure) throw error;
    throw new ReleaseFailure("CONSOLIDATED_FIXTURE_JOURNAL_FAILED");
  } finally {
    if (handle) await handle.close().catch(() => undefined);
    await fs.unlink(temporary).catch(() => undefined);
  }
}

async function cleanupOwnedFixture(
  databaseUrl: string,
  sha: string
): Promise<void> {
  const target = fixturePath(sha);
  const meta = await optionalLstat(target);
  if (!meta) return;
  const stable = await readStablePrivateFile(
    target,
    4096,
    "CONSOLIDATED_FIXTURE_OWNERSHIP_INVALID"
  );
  try {
    requireRelease(
      stable.meta.ino === meta.ino && stable.meta.dev === meta.dev,
      "CONSOLIDATED_FIXTURE_OWNERSHIP_INVALID"
    );
    const ownership = record(JSON.parse(stable.text) as unknown);
    requireRelease(
      ownership.sha === sha &&
        typeof ownership.openId === "string" &&
        Object.keys(ownership).sort().join(",") === "openId,sha",
      "CONSOLIDATED_FIXTURE_OWNERSHIP_INVALID"
    );
    await cleanupLoginVerifier(databaseUrl, sha, ownership.openId);
    await fs.unlink(target);
  } catch (error: unknown) {
    if (error instanceof ReleaseFailure) throw error;
    throw new ReleaseFailure("CONSOLIDATED_FIXTURE_CLEANUP_FAILED");
  }
}

async function activateCandidate(sha: string, digest: string): Promise<void> {
  const stage = stagePath(sha);
  const stagedDist = path.join(stage, "dist");
  requireRelease(
    (await treeDigest(stagedDist)) === digest,
    "CONSOLIDATED_STAGED_ARTIFACT_CHANGED"
  );
  const active = await fs.lstat(`${APP_ROOT}/dist`).catch(() => {
    throw new ReleaseFailure("CONSOLIDATED_ACTIVE_ARTIFACT_INVALID");
  });
  requireRelease(
    active.isDirectory() &&
      !active.isSymbolicLink() &&
      active.uid === 0 &&
      active.gid === 0,
    "CONSOLIDATED_ACTIVE_ARTIFACT_INVALID"
  );
  const retained = priorArtifactPath();
  requireRelease(
    !(await optionalLstat(retained)),
    "CONSOLIDATED_SECURE_BASELINE_ARTIFACT_EXISTS"
  );
  await fs.rename(`${APP_ROOT}/dist`, retained);
  try {
    await fs.rename(stagedDist, `${APP_ROOT}/dist`);
  } catch {
    // No restoration of an older insecure artifact is ever attempted.
    throw new ReleaseFailure(
      "CONSOLIDATED_ARTIFACT_ACTIVATION_FAILED_FORWARD_ONLY"
    );
  }
  for (const file of ["package.json", "pnpm-lock.yaml"])
    await fs.rename(path.join(stage, file), path.join(APP_ROOT, file));
  await assertProtectedActiveArtifact(sha);
  requireRelease(
    (await treeDigest(`${APP_ROOT}/dist`)) === digest,
    "CONSOLIDATED_ACTIVE_ARTIFACT_DIGEST_MISMATCH"
  );
}

async function logCursors(): Promise<LogCursor[]> {
  let rows: unknown;
  try {
    rows = JSON.parse(silentCommand(APP_ROOT, "pm2", ["jlist"])) as unknown;
  } catch {
    throw new ReleaseFailure("CONSOLIDATED_PM2_METADATA_UNAVAILABLE");
  }
  requireRelease(Array.isArray(rows), "CONSOLIDATED_PM2_METADATA_INVALID");
  const apps = rows.filter(value => record(value).name === "creatorvault");
  requireRelease(apps.length === 1, "CONSOLIDATED_PM2_APPLICATION_NOT_UNIQUE");
  const environment = record(record(apps[0]).pm2_env);
  const cursors: LogCursor[] = [];
  for (const key of ["pm_out_log_path", "pm_err_log_path"]) {
    const file = environment[key];
    requireRelease(
      typeof file === "string" &&
        (file.startsWith("/root/.pm2/logs/creatorvault-") ||
          file.startsWith(`${APP_ROOT}/logs/`)),
      "CONSOLIDATED_PM2_LOG_PATH_INVALID"
    );
    const meta = await fs.lstat(file);
    requireRelease(
      meta.isFile() &&
        !meta.isSymbolicLink() &&
        meta.uid === 0 &&
        meta.size <= 128 * 1024 * 1024,
      "CONSOLIDATED_PM2_LOG_PATH_INVALID"
    );
    cursors.push({ path: file, dev: meta.dev, ino: meta.ino, size: meta.size });
  }
  return cursors;
}

async function verifyLogs(cursors: readonly LogCursor[]): Promise<void> {
  for (const cursor of cursors) {
    const handle = await fs
      .open(cursor.path, constants.O_RDONLY | constants.O_NOFOLLOW)
      .catch(() => {
        throw new ReleaseFailure("CONSOLIDATED_LOG_WINDOW_UNAVAILABLE");
      });
    try {
      const meta = await handle.stat();
      requireRelease(
        meta.dev === cursor.dev &&
          meta.ino === cursor.ino &&
          meta.size >= cursor.size &&
          meta.size - cursor.size <= MAX_LOG_WINDOW,
        "CONSOLIDATED_LOG_WINDOW_UNAVAILABLE"
      );
      const bytes = Buffer.alloc(meta.size - cursor.size);
      try {
        await handle.read(bytes, 0, bytes.length, cursor.size);
        requireRelease(
          !/TypeError|ReferenceError|SyntaxError|uncaught|Unhandled|restart loop|ERR_MODULE|Cannot find module|EADDRINUSE|router.*error/i.test(
            bytes.toString("utf8")
          ),
          "CONSOLIDATED_SERIOUS_APPLICATION_ERROR_IN_LOGS"
        );
      } finally {
        bytes.fill(0);
      }
    } finally {
      await handle.close();
    }
  }
}

function tokenFromLogin(value: {
  status: number;
  cookie: string | null;
  body: unknown;
}): string {
  requireRelease(
    value.status === 200 && value.cookie?.includes("app_session_id="),
    "CONSOLIDATED_NATIVE_LOGIN_FAILED"
  );
  const body = record(value.body);
  requireRelease(
    typeof body.token === "string" && body.token.length > 0,
    "CONSOLIDATED_NATIVE_LOGIN_FAILED"
  );
  return body.token;
}

async function verifyHomepage(): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${PUBLIC_ORIGIN}/`, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ReleaseFailure("CONSOLIDATED_HOMEPAGE_UNAVAILABLE");
  }
  requireRelease(
    response.status === 200 &&
      !response.headers.get("location") &&
      !response.headers.get("set-cookie"),
    "CONSOLIDATED_HOMEPAGE_UNAVAILABLE"
  );
  const reader = response.body?.getReader();
  let body = "";
  let size = 0;
  if (reader) {
    const decoder = new TextDecoder();
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      requireRelease(size <= 1024 * 1024, "CONSOLIDATED_HOMEPAGE_TOO_LARGE");
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
  }
  requireRelease(
    /<html[\s>]/i.test(body) &&
      /<script[^>]+src=["'][^"']+\.js(?:\?[^"']*)?["']/i.test(body),
    "CONSOLIDATED_HOMEPAGE_ASSET_INVALID"
  );
}

async function verifyPersonaRoute(proof: LoginProof): Promise<void> {
  const input = encodeURIComponent(
    JSON.stringify({
      json: { personaId: "00000000-0000-4000-8000-000000000001" },
    })
  );
  const response = await requestPublic(
    `/api/trpc/personaVault.getPersona?input=${input}`,
    {
      token: proof.oldSession,
    }
  );
  requireRelease(
    response.status === 200 ||
      response.status === 404 ||
      response.status === 403,
    "CONSOLIDATED_PERSONA_READ_ROUTE_UNAVAILABLE"
  );
}

async function verifyLive(
  sha: string,
  proof: LoginProof,
  key: string,
  before: Pm2Proof,
  cursors: readonly LogCursor[],
  migrationCounts: { migrations: number; alreadyApplied: number }
): Promise<VerificationEvidence> {
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    const health = await requestPublic("/api/health").catch(() => undefined);
    if (health?.status === 200) {
      const current = await pm2Proof().catch(() => undefined);
      if (current && current.pid !== before.pid) {
        ready = true;
        break;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  requireRelease(ready, "CONSOLIDATED_POST_RELOAD_READINESS_TIMEOUT");
  const release = await requestPublic("/__release");
  const metadata = record(release.body);
  requireRelease(
    release.status === 200 &&
      metadata.commit === sha &&
      metadata.branch === "main" &&
      metadata.environment === "production",
    "CONSOLIDATED_PUBLIC_RELEASE_MISMATCH"
  );
  await verifyHomepage();
  const health = await requestPublic("/api/health");
  requireRelease(health.status === 200, "CONSOLIDATED_HEALTH_HTTP_FAILED");
  for (const method of ["GET", "POST", "PUT"] as const) {
    const response = await requestPublic("/api/dev-login", { method });
    requireRelease(
      response.status === 404 && !response.location && !response.cookie,
      "CONSOLIDATED_DEVELOPMENT_LOGIN_NOT_RETIRED"
    );
  }
  const retained = await requestPublic("/api/trpc/auth.me", {
    token: proof.oldSession,
  });
  const retainedAccount = record(trpcData(retained.body));
  requireRelease(
    retained.status === 200 &&
      Number(retainedAccount.id) === proof.id &&
      retainedAccount.role === proof.role,
    "CONSOLIDATED_RETAINED_SESSION_FAILED"
  );
  const login = await requestPublic("/api/auth/login", {
    method: "POST",
    body: { email: proof.email, password: proof.password, rememberMe: false },
  });
  const fresh = tokenFromLogin(login);
  const claims = await jwtVerify(fresh, Buffer.from(key), {
    algorithms: ["HS256"],
  }).catch(() => {
    throw new ReleaseFailure("CONSOLIDATED_NATIVE_LOGIN_SIGNATURE_FAILED");
  });
  requireRelease(
    claims.payload.openId === proof.openId,
    "CONSOLIDATED_NATIVE_LOGIN_IDENTITY_FAILED"
  );
  const denied = await requestPublic(OWNER_READ, { token: fresh });
  requireRelease(
    denied.status === 403,
    "CONSOLIDATED_ORDINARY_OWNER_READ_NOT_DENIED"
  );
  const ownerToken = await new SignJWT({
    openId: proof.ownerOpenId,
    appId: proof.appId,
    name: "Consolidated release verification",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + 60)
    .sign(Buffer.from(key));
  const owner = await requestPublic(OWNER_READ, { token: ownerToken });
  requireRelease(
    owner.status === 200 &&
      typeof record(trpcData(owner.body)).total === "number",
    "CONSOLIDATED_OWNER_READ_FAILED"
  );
  await verifyPersonaRoute(proof);
  const active = await pm2Proof();
  requireRelease(
    active.pid > 1 &&
      active.pid !== before.pid &&
      active.restarts <= before.restarts + 1,
    "CONSOLIDATED_PM2_POST_RELOAD_INVALID"
  );
  await new Promise(resolve => setTimeout(resolve, 3000));
  const stable = await pm2Proof();
  requireRelease(
    stable.pid === active.pid && stable.restarts === active.restarts,
    "CONSOLIDATED_PM2_RESTART_LOOP"
  );
  await verifyLogs(cursors);
  return {
    pid: stable.pid,
    restarts: stable.restarts,
    migrations: migrationCounts.migrations,
    alreadyApplied: migrationCounts.alreadyApplied,
  };
}

async function assertWorkerLock(): Promise<void> {
  requireRelease(
    /^[a-f0-9]{32}$/.test(process.env.INVOCATION_ID ?? ""),
    "CONSOLIDATED_LOCAL_SUPERVISION_REQUIRED"
  );
  const command = await fs
    .readFile(`/proc/${process.ppid}/cmdline`, "utf8")
    .catch(() => {
      throw new ReleaseFailure("CONSOLIDATED_LOCAL_SUPERVISION_REQUIRED");
    });
  const argv = command.split("\0").filter(Boolean);
  requireRelease(
    argv[0] === "/usr/bin/flock" &&
      argv.includes("--exclusive") &&
      argv.includes("--nonblock") &&
      argv.includes("--close") &&
      argv.includes(WRITER_LOCK),
    "CONSOLIDATED_ENV_WRITER_LOCK_REQUIRED"
  );
}

async function stopFailedConsolidatedRelease(): Promise<void> {
  let rows: unknown;
  try {
    rows = JSON.parse(silentCommand(APP_ROOT, "pm2", ["jlist"])) as unknown;
  } catch {
    throw new ReleaseFailure("CONSOLIDATED_FAILURE_STOP_UNCONFIRMED");
  }
  requireRelease(Array.isArray(rows), "CONSOLIDATED_FAILURE_STOP_UNCONFIRMED");
  const apps = rows.filter(value => record(value).name === "creatorvault");
  requireRelease(apps.length <= 1, "CONSOLIDATED_FAILURE_STOP_UNCONFIRMED");
  if (apps.length === 1) {
    silentCommand(APP_ROOT, "pm2", ["stop", "creatorvault"]);
    const stoppedRows = JSON.parse(
      silentCommand(APP_ROOT, "pm2", ["jlist"])
    ) as unknown;
    requireRelease(
      Array.isArray(stoppedRows),
      "CONSOLIDATED_FAILURE_STOP_UNCONFIRMED"
    );
    const stopped = stoppedRows.filter(
      value => record(value).name === "creatorvault"
    );
    requireRelease(
      stopped.length === 1 &&
        record(record(stopped[0]).pm2_env).status === "stopped",
      "CONSOLIDATED_FAILURE_STOP_UNCONFIRMED"
    );
    silentCommand(APP_ROOT, "pm2", ["save", "--force"]);
  }
}

export function requiresFailureStop(state: ReleaseState | undefined): boolean {
  return (
    state?.phase === "activation-intent" ||
    state?.phase === "ready" ||
    state?.phase === "failed"
  );
}

async function failureGuard(sha: string): Promise<void> {
  await assertRootContext();
  const env = await captureAuthoritativeEnv();
  let databaseUrl = "";
  try {
    databaseUrl = parseDotenv(env.source).DATABASE_URL ?? "";
    requireRelease(
      databaseUrl.length > 0,
      "CONSOLIDATED_DATABASE_CONFIGURATION_MISSING"
    );
    const state = await readState(sha).catch(() => undefined);
    if (state?.phase === "verified") {
      await guardedMutation(env.snapshot, () =>
        cleanupOwnedFixture(databaseUrl, sha)
      );
      return;
    }
    if (requiresFailureStop(state))
      await guardedMutation(env.snapshot, stopFailedConsolidatedRelease);
    await guardedMutation(env.snapshot, () =>
      cleanupOwnedFixture(databaseUrl, sha)
    );
  } finally {
    env.source = "";
    databaseUrl = "";
  }
}

async function runProductionRelease(
  inputs: Inputs
): Promise<ConsolidatedReleaseResult> {
  let capture: EnvCapture | undefined;
  let settings: Record<string, string> = {};
  let signingKey = "";
  let proof: LoginProof | undefined;
  let processBefore: Pm2Proof | undefined;
  let cursors: LogCursor[] = [];
  let phase: ReleasePhase = "preflight";
  let activationStarted = false;
  try {
    checkConsolidatedReleaseCheckout(
      inputs.workspace,
      inputs.sha,
      inputs.ref,
      inputs.event,
      inputs.before
    );
    await assertRootContext();
    await assertWorkerLock();
    await assertCandidateArtifact(
      path.join(inputs.workspace, "dist"),
      inputs.sha
    );
    await assertLiveBaseline();
    await assertPackageParity(inputs.workspace);
    await assertProtectedActiveArtifact(CONSOLIDATED_SECURITY_BASELINE);
    capture = await captureAuthoritativeEnv();
    settings = parseDotenv(capture.source);
    signingKey = locateJwtKey(capture.source).value;
    assertNewKey(signingKey);
    requireRelease(
      safeEqual(settings.JWT_SECRET ?? "", signingKey) &&
        typeof settings.DATABASE_URL === "string" &&
        typeof settings.VITE_APP_ID === "string",
      "CONSOLIDATED_AUTHORITATIVE_ENV_INVALID"
    );
    capture.source = "";
    processBefore = await pm2Proof();
    await guardedMutation(capture.snapshot, () =>
      writeState({
        sha: inputs.sha,
        phase: "preflight",
        code: "CONSOLIDATED_PREFLIGHT_COMPLETE",
      })
    );
    const verifier = await guardedMutation(capture.snapshot, () =>
      provisionLoginVerifier(settings, inputs.sha, openId =>
        persistFixtureOwnership(inputs.sha, openId)
      )
    );
    try {
      proof = await prepareLoginProof(verifier);
    } finally {
      for (const key of Object.keys(verifier)) delete verifier[key];
    }
    await jwtVerify(proof.oldSession, Buffer.from(signingKey), {
      algorithms: ["HS256"],
    }).catch(() => {
      throw new ReleaseFailure("CONSOLIDATED_ACTIVE_SIGNING_SOURCE_UNPROVEN");
    });
    const ordinaryBefore = await requestPublic(OWNER_READ, {
      token: proof.oldSession,
    });
    requireRelease(
      ordinaryBefore.status === 403,
      "CONSOLIDATED_BASELINE_ORDINARY_OWNER_DENIAL_UNPROVEN"
    );
    cursors = await logCursors();
    const digest = await guardedMutation(capture.snapshot, () =>
      stageCandidate(inputs.workspace, inputs.sha)
    );
    phase = "migrating";
    await guardedMutation(capture.snapshot, () =>
      writeState({
        sha: inputs.sha,
        phase,
        code: "CONSOLIDATED_MIGRATION_PENDING",
      })
    );
    let backupComplete = false;
    const migrations = await guardedMutation(capture.snapshot, () =>
      applyConsolidatedMigrations(
        settings.DATABASE_URL ?? "",
        inputs.workspace,
        {
          beforeApply: async () => {
            requireRelease(
              !backupComplete,
              "CONSOLIDATED_BACKUP_CALLBACK_REPEATED"
            );
            await assertEnvUnchanged(
              capture?.snapshot ?? {
                dev: -1,
                ino: -1,
                size: -1,
                mtimeMs: -1,
                ctimeMs: -1,
                uid: -1,
                gid: -1,
                mode: -1,
              }
            );
            await protectedDatabaseBackup(
              settings.DATABASE_URL ?? "",
              inputs.sha
            );
            backupComplete = true;
            await assertEnvUnchanged(
              capture?.snapshot ?? {
                dev: -1,
                ino: -1,
                size: -1,
                mtimeMs: -1,
                ctimeMs: -1,
                uid: -1,
                gid: -1,
                mode: -1,
              }
            );
          },
          onProgress: async event => {
            await guardedMutation(
              capture?.snapshot ?? {
                dev: -1,
                ino: -1,
                size: -1,
                mtimeMs: -1,
                ctimeMs: -1,
                uid: -1,
                gid: -1,
                mode: -1,
              },
              () =>
                writeState({
                  sha: inputs.sha,
                  phase: "migrating",
                  code: "CONSOLIDATED_MIGRATION_PROGRESS",
                  migrations: event.statement,
                  proof: "PROGRESS_RECORDED",
                })
            );
          },
        }
      )
    );
    await guardedMutation(capture.snapshot, () =>
      verifyMigratedTables(settings.DATABASE_URL ?? "")
    );
    phase = "activation-intent";
    activationStarted = true;
    await guardedMutation(capture.snapshot, () =>
      writeState({
        sha: inputs.sha,
        phase,
        code: "CONSOLIDATED_ACTIVATION_INTENT",
        migrations: migrations.applied.length,
        alreadyApplied: migrations.alreadyApplied.length,
      })
    );
    await guardedMutation(capture.snapshot, () =>
      activateCandidate(inputs.sha, digest)
    );
    phase = "ready";
    await guardedMutation(capture.snapshot, () =>
      writeState({
        sha: inputs.sha,
        phase,
        code: "CONSOLIDATED_READY_FOR_VERIFICATION",
        migrations: migrations.applied.length,
        alreadyApplied: migrations.alreadyApplied.length,
      })
    );
    await guardedMutation(capture.snapshot, async () => {
      silentCommand(APP_ROOT, "pm2", [
        "reload",
        "creatorvault",
        "--update-env",
      ]);
    });
    if (!proof || !processBefore)
      throw new ReleaseFailure("CONSOLIDATED_PREFLIGHT_INCOMPLETE");
    const loginProof = proof;
    const preReloadProcess = processBefore;
    const evidence = await guardedMutation(capture.snapshot, () =>
      verifyLive(
        inputs.sha,
        loginProof,
        signingKey,
        preReloadProcess,
        cursors,
        {
          migrations: migrations.applied.length,
          alreadyApplied: migrations.alreadyApplied.length,
        }
      )
    );
    await guardedMutation(capture.snapshot, () =>
      cleanupOwnedFixture(settings.DATABASE_URL ?? "", inputs.sha)
    );
    await guardedMutation(capture.snapshot, async () => {
      silentCommand(APP_ROOT, "pm2", ["save"]);
    });
    phase = "verified";
    await guardedMutation(capture.snapshot, () =>
      writeState({
        sha: inputs.sha,
        phase,
        code: "CONSOLIDATED_RELEASE_VERIFIED",
        migrations: migrations.applied.length,
        alreadyApplied: migrations.alreadyApplied.length,
        proof: "NATIVE_LOGIN_SESSION_PRESERVED",
      })
    );
    return {
      ok: true,
      sha: inputs.sha,
      code: "CONSOLIDATED_RELEASE_VERIFIED",
      phase,
      evidence,
    };
  } catch (error: unknown) {
    const code = errorCode(error);
    if (capture) {
      try {
        if (activationStarted) {
          await guardedMutation(capture.snapshot, () =>
            writeState({ sha: inputs.sha, phase: "failed", code })
          );
        } else {
          await guardedMutation(capture.snapshot, () =>
            writeState({ sha: inputs.sha, phase, code })
          );
        }
      } catch {
        // The failure hook treats an ambiguous post-activation state as fail-closed.
      }
    }
    try {
      await failureGuard(inputs.sha);
    } catch {
      return {
        ok: false,
        sha: inputs.sha,
        code: "CONSOLIDATED_FAILURE_STOP_UNCONFIRMED",
        phase: activationStarted ? "failed" : phase,
      };
    }
    return {
      ok: false,
      sha: inputs.sha,
      code,
      phase: activationStarted ? "failed" : phase,
    };
  } finally {
    if (proof) {
      proof.password = "";
      proof.oldSession = "";
    }
    proof = undefined;
    signingKey = "";
    if (capture) capture.source = "";
    capture = undefined;
    for (const key of Object.keys(settings)) delete settings[key];
    settings = {};
  }
}

async function systemdActive(sha: string): Promise<boolean> {
  try {
    const state = silentCommand(APP_ROOT, "/usr/bin/systemctl", [
      "is-active",
      `creatorvault-consolidated-release-${sha}.service`,
    ]).trim();
    return state === "active" || state === "activating";
  } catch {
    return false;
  }
}

export async function assertConsolidatedAppBootAuthorized(): Promise<void> {
  await assertRootContext();
  const stamp = await fs.readFile(RELEASE_STAMP_PATH, "utf8").catch(() => {
    throw new ReleaseFailure("CONSOLIDATED_BOOT_STAMP_UNAVAILABLE");
  });
  let release: Record<string, unknown>;
  try {
    release = record(JSON.parse(stamp) as unknown);
  } catch {
    throw new ReleaseFailure("CONSOLIDATED_BOOT_STAMP_INVALID");
  }
  requireRelease(
    typeof release.commit === "string" && /^[a-f0-9]{40}$/.test(release.commit),
    "CONSOLIDATED_BOOT_STAMP_INVALID"
  );
  await assertProtectedActiveArtifact(release.commit);
  const state = await readState(release.commit);
  requireRelease(state, "CONSOLIDATED_BOOT_NOT_AUTHORIZED");
  if (state.phase === "verified") return;
  requireRelease(
    state.phase === "ready" && (await systemdActive(release.commit)),
    "CONSOLIDATED_BOOT_REQUIRES_ACTIVE_SUPERVISOR"
  );
}

/** Reads only the root-owned authoritative JWT after boot authorization; never writes .env. */
export async function activateConsolidatedSigningSource(): Promise<void> {
  await assertConsolidatedAppBootAuthorized();
  const capture = await captureAuthoritativeEnv();
  let source = capture.source;
  try {
    const parsed = parseDotenv(source);
    const key = locateJwtKey(source).value;
    assertNewKey(key);
    requireRelease(
      safeEqual(parsed.JWT_SECRET ?? "", key),
      "CONSOLIDATED_AUTHORITATIVE_SIGNING_SOURCE_INVALID"
    );
    process.env.JWT_SECRET = key;
    for (const name of Object.keys(parsed)) delete parsed[name];
  } finally {
    source = "";
    capture.source = "";
  }
}

function supervisorArgs(inputs: Inputs, parentPid: number): string[] {
  requireRelease(
    Number.isSafeInteger(parentPid) && parentPid > 1,
    "CONSOLIDATED_SUPERVISOR_METADATA_INVALID"
  );
  const controller = `${controlPath(inputs.sha)}/consolidated-controller.mjs`;
  return [
    "--quiet",
    "--wait",
    "--collect",
    `--unit=creatorvault-consolidated-release-${inputs.sha}`,
    "--property=Type=exec",
    "--property=User=root",
    "--property=Group=root",
    "--property=Restart=no",
    "--property=KillMode=control-group",
    "--property=RuntimeMaxSec=900",
    "--property=TimeoutStopSec=240",
    "--property=UMask=0077",
    "--property=NoNewPrivileges=true",
    "--property=StandardOutput=null",
    "--property=StandardError=null",
    `--property=WorkingDirectory=${APP_ROOT}`,
    `--property=ExecStopPost=/usr/bin/node ${controller} --failure-stop`,
    "--setenv=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    "--setenv=TZ=UTC",
    `--setenv=CREATORVAULT_RELEASE_SHA=${inputs.sha}`,
    "--setenv=CREATORVAULT_RELEASE_REF=refs/heads/main",
    "--setenv=CREATORVAULT_RELEASE_EVENT=push",
    `--setenv=CREATORVAULT_RELEASE_BEFORE=${inputs.before}`,
    `--setenv=CREATORVAULT_RELEASE_WORKSPACE=${inputs.workspace}`,
    `--setenv=CREATORVAULT_RELEASE_PARENT_PID=${parentPid}`,
    "/usr/bin/flock",
    "--exclusive",
    "--nonblock",
    "--close",
    WRITER_LOCK,
    "/usr/bin/node",
    controller,
    "--supervised",
  ];
}

async function assertSupervisorTools(): Promise<void> {
  for (const executable of [
    "/usr/bin/node",
    "/usr/bin/flock",
    "/usr/bin/systemd-run",
    "/usr/bin/systemctl",
  ]) {
    const meta = await fs.stat(executable).catch(() => {
      throw new ReleaseFailure("CONSOLIDATED_SUPERVISOR_TOOL_UNAVAILABLE");
    });
    requireRelease(
      meta.isFile() && meta.uid === 0 && (meta.mode & 0o022) === 0,
      "CONSOLIDATED_SUPERVISOR_TOOL_UNAVAILABLE"
    );
  }
  const manager = await fs.lstat("/run/systemd/private").catch(() => {
    throw new ReleaseFailure("CONSOLIDATED_LOCAL_SUPERVISOR_UNAVAILABLE");
  });
  requireRelease(
    manager.isSocket() && manager.uid === 0,
    "CONSOLIDATED_LOCAL_SUPERVISOR_UNAVAILABLE"
  );
}

async function launchSupervisor(
  inputs: Inputs
): Promise<ConsolidatedReleaseResult> {
  checkConsolidatedReleaseCheckout(
    inputs.workspace,
    inputs.sha,
    inputs.ref,
    inputs.event,
    inputs.before
  );
  await assertRootContext();
  await assertCandidateArtifact(
    path.join(inputs.workspace, "dist"),
    inputs.sha
  );
  await assertLiveBaseline();
  await assertPackageParity(inputs.workspace);
  await assertSupervisorTools();
  const control = controlPath(inputs.sha);
  requireRelease(
    !(await optionalLstat(control)) &&
      !(await optionalLstat(statePath(inputs.sha))),
    "CONSOLIDATED_PREVIOUS_ATTEMPT_REQUIRES_REVIEW"
  );
  await fs.mkdir(control, { mode: 0o700 });
  await assertRootDirectory(control, "CONSOLIDATED_CONTROL_DIRECTORY_INVALID");
  const target = path.join(control, "consolidated-controller.mjs");
  await fs.copyFile(
    path.join(inputs.workspace, "dist/consolidated-release-runtime.mjs"),
    target,
    constants.COPYFILE_EXCL
  );
  await fs.chmod(target, 0o600);
  const controller = await fs.lstat(target);
  assertRootPrivateFile(controller, "CONSOLIDATED_CONTROL_ARTIFACT_INVALID");
  let completed = true;
  try {
    silentCommand(
      APP_ROOT,
      "/usr/bin/systemd-run",
      supervisorArgs(inputs, process.pid),
      960000
    );
  } catch {
    completed = false;
  }
  const state = await readState(inputs.sha).catch(() => undefined);
  const verified =
    state?.phase === "verified" &&
    state.code === "CONSOLIDATED_RELEASE_VERIFIED";
  const active = completed && verified ? await pm2Proof() : undefined;
  const evidence = verified
    ? {
        pid: active?.pid ?? 0,
        restarts: active?.restarts ?? 0,
        migrations: state.migrations ?? 0,
        alreadyApplied: state.alreadyApplied ?? 0,
      }
    : undefined;
  return {
    ok: completed && verified,
    sha: inputs.sha,
    code:
      completed && verified
        ? "CONSOLIDATED_RELEASE_VERIFIED"
        : (state?.code ?? "CONSOLIDATED_SUPERVISED_RELEASE_FAILED"),
    phase: state?.phase ?? "supervisor",
    evidence,
  };
}

export function validControllerArguments(argv: readonly string[]): boolean {
  return (
    argv.length === 2 ||
    (argv.length === 3 &&
      ["--check-checkout", "--supervised", "--failure-stop"].includes(
        argv[2] ?? ""
      ))
  );
}

function outputResult(result: ConsolidatedReleaseResult): void {
  if (result.ok && result.evidence) {
    console.log(
      JSON.stringify({
        result: "PASS",
        sha: result.sha,
        jwtRotation: false,
        sessionPreserved: true,
        devLogin404: true,
        ordinary403: true,
        owner200: true,
        pm2Online: {
          pid: result.evidence.pid,
          restarts: result.evidence.restarts,
        },
        migrations: {
          applied: result.evidence.migrations,
          alreadyApplied: result.evidence.alreadyApplied,
        },
        health: "HTTP_200",
        logPass: true,
        cleanup: "PASS",
      })
    );
    return;
  }
  console.error(
    JSON.stringify({ result: "FAIL", code: result.code, phase: result.phase })
  );
}

async function main(): Promise<void> {
  let inputs: Inputs | undefined;
  try {
    requireRelease(
      validControllerArguments(process.argv),
      "CONSOLIDATED_UNSUPPORTED_RELEASE_ARGUMENTS"
    );
    inputs = inputsFromEnvironment();
    const argument = process.argv[2];
    if (argument === "--check-checkout") {
      checkConsolidatedReleaseCheckout(
        inputs.workspace,
        inputs.sha,
        inputs.ref,
        inputs.event,
        inputs.before
      );
      console.log("CONSOLIDATED_CHECKOUT_GATE=PASS");
      return;
    }
    if (argument === "--failure-stop") {
      requireRelease(
        process.argv.length === 3,
        "CONSOLIDATED_UNSUPPORTED_RELEASE_ARGUMENTS"
      );
      await failureGuard(inputs.sha);
      return;
    }
    const result =
      argument === "--supervised"
        ? await runProductionRelease(inputs)
        : await launchSupervisor(inputs);
    outputResult(result);
    if (!result.ok) process.exitCode = 1;
  } catch (error: unknown) {
    console.error(
      JSON.stringify({
        result: "FAIL",
        code: errorCode(error),
        phase: "supervisor",
      })
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  void main();
