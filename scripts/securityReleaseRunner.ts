import { execFileSync } from "node:child_process";
import { constants, promises as fs, type Stats } from "node:fs";
import { randomBytes, createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseDotenv } from "dotenv";
import {
  APP_ROOT,
  REQUIRED_LIVE_BASELINE,
  assertBaseline,
  assertRuntime,
  assertSecretFile,
  assertShellEnvSource,
  executeRelease,
  locateJwtKey,
  record,
  replaceJwtKey,
  requireRelease,
  ReleaseFailure,
  safeEqual,
  needsFailureStop,
  supervisorCommand,
  type ReleaseEffects,
  type RuntimeProof,
  type TransactionResult,
  type DurablePhase,
} from "./securityReleasePolicy";
import { checkReleaseCheckout } from "./securityReleaseIntegrity";
export { checkoutEvidence } from "./securityReleaseIntegrity";
import {
  prepareLoginProof,
  provisionLoginVerifier,
  cleanupLoginVerifier,
  requestPublic,
  verifyLiveRelease,
  type LoginProof,
} from "./securityReleaseVerification";

const SECRET_PATH = `${APP_ROOT}/.env`;
const LOCK_PATH = "/run/creatorvault-security-release.lock";
const STAGE_PATH = `${APP_ROOT}/.security-release-stage`;
const PRIOR_PATH = `${APP_ROOT}/dist.pre-security-release`;
const NODE_ENTRY = `${APP_ROOT}/dist/index.js`;
const WRITER_LOCK = `${APP_ROOT}/.env.writer.lock`;
function journalPath(sha: string): string {
  requireRelease(/^[a-f0-9]{40}$/.test(sha), "INVALID_RELEASE_SHA");
  return `${APP_ROOT}/.security-release-state-${sha}.json`;
}
type FileSnapshot = {
  dev: number;
  ino: number;
  size: number;
  mtimeMs: number;
  ctimeMs: number;
  uid: number;
  gid: number;
  mode: number;
};
type Pm2Evidence = {
  pid: number;
  uptime: number;
  restarts: number;
  launcher: string;
  cwd: string;
  interpreter: string;
  nodeArgs: unknown;
  source?: "shell-env" | "dotenv-override";
  raw: Record<string, unknown>;
  root: Record<string, unknown>;
};
type LogCursor = { path: string; dev: number; ino: number; size: number };

function silentCommand(
  workspace: string,
  command: string,
  args: readonly string[],
  timeout = 30000
): string {
  const environment = { ...process.env };
  delete environment.JWT_SECRET;
  for (const key of [
    "SHELLOPTS",
    "BASHOPTS",
    "BASH_ENV",
    "ENV",
    "NODE_OPTIONS",
    "NODE_DEBUG",
    "NODE_DEBUG_NATIVE",
    "DEBUG",
    "LD_PRELOAD",
    "LD_LIBRARY_PATH",
  ])
    delete environment[key];
  for (const key of Object.keys(environment))
    if (key.startsWith("BASH_FUNC_")) delete environment[key];
  try {
    return execFileSync(command, [...args], {
      cwd: workspace,
      env: environment,
      stdio: ["ignore", "pipe", "pipe"],
      timeout,
      maxBuffer: 4 * 1024 * 1024,
      encoding: "utf8",
    });
  } catch {
    throw new ReleaseFailure("LOCAL_RELEASE_COMMAND_FAILED");
  }
}
function git(workspace: string, args: readonly string[]): string {
  return silentCommand(workspace, "git", args).trim();
}
function pathsFrom(text: string): string[] {
  return text.split("\n").filter(Boolean);
}
async function metadataIfPresent(file: string): Promise<Stats | undefined> {
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
    throw new ReleaseFailure("LOCAL_FILESYSTEM_METADATA_UNAVAILABLE");
  }
}
async function writeJournal(
  sha: string,
  phase: DurablePhase,
  code = "NONE"
): Promise<void> {
  requireRelease(/^[A-Z_]{1,100}$/.test(code), "UNSAFE_JOURNAL_CODE");
  const target = journalPath(sha);
  const temporary = `${target}.tmp`;
  let created = false;
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
    created = true;
    await handle.writeFile(JSON.stringify({ sha, phase, code }) + "\n", "utf8");
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
  } finally {
    if (handle) await handle.close().catch(() => undefined);
    if (created) await fs.unlink(temporary).catch(() => undefined);
  }
}
async function readJournal(
  sha: string
): Promise<Record<string, unknown> | undefined> {
  const file = journalPath(sha);
  const meta = await metadataIfPresent(file);
  if (!meta) return undefined;
  assertSecretFile({
    uid: meta.uid,
    gid: meta.gid,
    mode: meta.mode,
    regular: meta.isFile(),
    symlink: meta.isSymbolicLink(),
    links: meta.nlink,
  });
  requireRelease(meta.size <= 1024, "INVALID_RELEASE_JOURNAL");
  const handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const actual = await handle.stat();
    requireRelease(
      actual.ino === meta.ino && actual.dev === meta.dev,
      "INVALID_RELEASE_JOURNAL"
    );
    const state = record(JSON.parse(await handle.readFile("utf8")) as unknown);
    needsFailureStop(state, sha);
    requireRelease(
      Object.keys(state).sort().join(",") === "code,phase,sha" &&
        /^[A-Z_]{1,100}$/.test(String(state.code)),
      "INVALID_RELEASE_JOURNAL"
    );
    return state;
  } finally {
    await handle.close();
  }
}
function fixtureJournalPath(sha: string): string {
  journalPath(sha);
  return `${APP_ROOT}/.security-release-fixture-${sha}.json`;
}
async function persistFixtureOwnership(
  sha: string,
  openId: string
): Promise<void> {
  requireRelease(
    /^cv_release_verify_[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      openId
    ),
    "INVALID_FIXTURE_OWNERSHIP"
  );
  const target = fixtureJournalPath(sha);
  const temporary = `${target}.tmp`;
  let created = false;
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
    created = true;
    await handle.writeFile(JSON.stringify({ sha, openId }) + "\n", "utf8");
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
  } finally {
    if (handle) await handle.close().catch(() => undefined);
    if (created) await fs.unlink(temporary).catch(() => undefined);
  }
}
async function cleanupOwnedFixture(sha: string): Promise<void> {
  const file = fixtureJournalPath(sha);
  const meta = await metadataIfPresent(file);
  if (!meta) return;
  assertSecretFile({
    uid: meta.uid,
    gid: meta.gid,
    mode: meta.mode,
    regular: meta.isFile(),
    symlink: meta.isSymbolicLink(),
    links: meta.nlink,
  });
  requireRelease(meta.size <= 1024, "INVALID_FIXTURE_OWNERSHIP");
  const handle = await fs.open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  let state: Record<string, unknown>;
  try {
    state = record(JSON.parse(await handle.readFile("utf8")) as unknown);
  } finally {
    await handle.close();
  }
  requireRelease(
    state.sha === sha &&
      typeof state.openId === "string" &&
      Object.keys(state).sort().join(",") === "openId,sha",
    "INVALID_FIXTURE_OWNERSHIP"
  );
  const snapshot = await secretSnapshot();
  let source = await readSecretFile(snapshot);
  const env = parseDotenv(source);
  source = "";
  try {
    requireRelease(env.DATABASE_URL, "DATABASE_CONFIGURATION_MISSING");
    await cleanupLoginVerifier(env.DATABASE_URL, sha, state.openId);
  } finally {
    for (const key of Object.keys(env)) delete env[key];
  }
  await fs.unlink(file);
}
export async function stopFailedRelease(): Promise<void> {
  // This narrowly targeted failure path never kills PM2 or affects another app.
  const initial = JSON.parse(
    silentCommand(APP_ROOT, "pm2", ["jlist"])
  ) as unknown;
  requireRelease(Array.isArray(initial), "FAILURE_STOP_UNCONFIRMED");
  const existing = initial.filter(item => record(item).name === "creatorvault");
  requireRelease(existing.length <= 1, "FAILURE_STOP_UNCONFIRMED");
  if (existing.length === 1) {
    silentCommand(APP_ROOT, "pm2", ["stop", "creatorvault"], 30000);
    const stopped = JSON.parse(
      silentCommand(APP_ROOT, "pm2", ["jlist"])
    ) as unknown;
    requireRelease(Array.isArray(stopped), "FAILURE_STOP_UNCONFIRMED");
    const app = stopped.filter(item => record(item).name === "creatorvault");
    requireRelease(
      app.length === 1 && record(record(app[0]).pm2_env).status === "stopped",
      "FAILURE_STOP_UNCONFIRMED"
    );
    silentCommand(APP_ROOT, "pm2", ["delete", "creatorvault"], 30000);
  }
  // Two saves also replace the backup, so resurrection cannot re-enable the failed app.
  silentCommand(APP_ROOT, "pm2", ["save", "--force"], 30000);
  silentCommand(APP_ROOT, "pm2", ["save", "--force"], 30000);
  for (const file of ["/root/.pm2/dump.pm2", "/root/.pm2/dump.pm2.bak"]) {
    const meta = await fs.lstat(file);
    requireRelease(
      meta.isFile() &&
        !meta.isSymbolicLink() &&
        meta.uid === 0 &&
        meta.nlink === 1 &&
        meta.size <= 4 * 1024 * 1024,
      "FAILURE_RESURRECTION_STATE_UNVERIFIED"
    );
    const saved = JSON.parse(await fs.readFile(file, "utf8")) as unknown;
    requireRelease(
      Array.isArray(saved) &&
        !saved.some(item => record(item).name === "creatorvault"),
      "FAILURE_RESURRECTION_STATE_UNVERIFIED"
    );
  }
}
export async function failureGuard(sha: string): Promise<void> {
  await protectedRoot();
  let stop = false;
  let ownedAttempt = false;
  try {
    const state = await readJournal(sha);
    ownedAttempt = state !== undefined;
    stop = state !== undefined && needsFailureStop(state, sha);
  } catch {
    stop = true;
  } // An ambiguous durable state is never treated as verified.
  if (stop) await stopFailedRelease();
  await cleanupOwnedFixture(sha);
  const temporary = `${APP_ROOT}/.env.security-rotation-tmp`;
  const temp = await fs.lstat(temporary).catch(() => undefined);
  if (temp && ownedAttempt) {
    assertSecretFile({
      uid: temp.uid,
      gid: temp.gid,
      mode: temp.mode,
      regular: temp.isFile(),
      symlink: temp.isSymbolicLink(),
      links: temp.nlink,
    });
    await fs.unlink(temporary);
  }
  const releaseLock = await fs.lstat(LOCK_PATH).catch(() => undefined);
  if (
    releaseLock?.isDirectory() &&
    !releaseLock.isSymbolicLink() &&
    releaseLock.uid === 0
  )
    await fs.rmdir(LOCK_PATH);
}
export async function checkCheckout(
  workspace: string,
  sha: string,
  ref: string,
  event: string
): Promise<void> {
  checkReleaseCheckout(
    workspace,
    sha,
    ref,
    event,
    process.env.CREATORVAULT_RELEASE_BEFORE ?? ""
  );
}
async function protectedRoot(): Promise<void> {
  requireRelease(
    process.getuid?.() === 0 && process.getgid?.() === 0,
    "RUNNER_ROOT_CONTEXT_REQUIRED"
  );
  const meta = await fs.lstat(APP_ROOT);
  requireRelease(
    meta.isDirectory() &&
      !meta.isSymbolicLink() &&
      meta.uid === 0 &&
      (meta.mode & 0o022) === 0,
    "UNSAFE_APPLICATION_DIRECTORY"
  );
  requireRelease(
    !process.env.PM2_HOME || process.env.PM2_HOME === "/root/.pm2",
    "UNKNOWN_PM2_CONTEXT"
  );
  const socket = await fs.lstat("/root/.pm2/rpc.sock");
  requireRelease(
    socket.isSocket() && socket.uid === 0,
    "EXISTING_PM2_CONTEXT_UNAVAILABLE"
  );
}
export async function secretSnapshot(): Promise<FileSnapshot> {
  const s = await fs.lstat(SECRET_PATH).catch(() => {
    throw new ReleaseFailure("SECRET_FILE_MISSING");
  });
  assertSecretFile({
    uid: s.uid,
    gid: s.gid,
    mode: s.mode,
    regular: s.isFile(),
    symlink: s.isSymbolicLink(),
    links: s.nlink,
  });
  requireRelease(s.size <= 1024 * 1024, "SECRET_FILE_UNBOUNDED");
  return {
    dev: s.dev,
    ino: s.ino,
    size: s.size,
    mtimeMs: s.mtimeMs,
    ctimeMs: s.ctimeMs,
    uid: s.uid,
    gid: s.gid,
    mode: s.mode,
  };
}
function unchanged(a: FileSnapshot, b: FileSnapshot): boolean {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.size === b.size &&
    a.mtimeMs === b.mtimeMs &&
    a.ctimeMs === b.ctimeMs &&
    a.uid === b.uid &&
    a.gid === b.gid &&
    a.mode === b.mode
  );
}
async function proveWritableSource(snapshot: FileSnapshot): Promise<void> {
  let handle: fs.FileHandle | undefined;
  try {
    // No truncation or write: reject immutable/read-only/mismatched sources before mutation.
    handle = await fs.open(
      SECRET_PATH,
      constants.O_WRONLY | constants.O_NOFOLLOW
    );
    const actual = await handle.stat();
    requireRelease(unchanged(snapshot, actual), "SECRET_SOURCE_CHANGED");
  } catch (error: unknown) {
    if (error instanceof ReleaseFailure) throw error;
    throw new ReleaseFailure("JWT_SOURCE_NOT_WRITABLE");
  } finally {
    if (handle) await handle.close();
  }
}
async function readSecretFile(expected: FileSnapshot): Promise<string> {
  const handle = await fs.open(
    SECRET_PATH,
    constants.O_RDONLY | constants.O_NOFOLLOW
  );
  try {
    const actual = await handle.stat();
    requireRelease(
      actual.dev === expected.dev &&
        actual.ino === expected.ino &&
        actual.mtimeMs === expected.mtimeMs &&
        actual.ctimeMs === expected.ctimeMs,
      "SECRET_SOURCE_CHANGED"
    );
    return await handle.readFile("utf8");
  } finally {
    await handle.close();
  }
}
async function procEnvironment(pid: number): Promise<Map<string, string>> {
  const contents = await fs.readFile(`/proc/${pid}/environ`);
  try {
    const values = new Map<string, string>();
    for (const entry of contents.toString("utf8").split("\0")) {
      const equals = entry.indexOf("=");
      if (equals > 0)
        values.set(entry.slice(0, equals), entry.slice(equals + 1));
    }
    return values;
  } finally {
    contents.fill(0);
  }
}
async function pm2Evidence(workspace: string): Promise<Pm2Evidence> {
  let rows: unknown;
  // Captured in memory only. Never print, save, attach or rethrow PM2's full environment-bearing JSON.
  try {
    rows = JSON.parse(silentCommand(workspace, "pm2", ["jlist"])) as unknown;
  } catch {
    throw new ReleaseFailure("PM2_METADATA_UNAVAILABLE");
  }
  requireRelease(Array.isArray(rows), "INVALID_PM2_LIST");
  const apps = rows.filter(item => record(item).name === "creatorvault");
  requireRelease(apps.length === 1, "PM2_APPLICATION_NOT_UNIQUE");
  const app = record(apps[0]);
  const env = record(app.pm2_env);
  requireRelease(
    typeof app.pid === "number" &&
      app.pid > 1 &&
      typeof env.pm_uptime === "number" &&
      typeof env.restart_time === "number",
    "PM2_LIFETIME_METADATA_MISSING"
  );
  requireRelease(
    typeof env.pm_exec_path === "string" &&
      typeof env.pm_cwd === "string" &&
      typeof env.exec_interpreter === "string",
    "PM2_LAUNCHER_METADATA_MISSING"
  );
  return {
    pid: app.pid,
    uptime: env.pm_uptime,
    restarts: env.restart_time,
    launcher: env.pm_exec_path,
    cwd: env.pm_cwd,
    interpreter: env.exec_interpreter,
    nodeArgs: env.node_args,
    raw: env,
    root: app,
  };
}
async function proveRuntime(
  workspace: string,
  original: string
): Promise<Pm2Evidence> {
  const e = await pm2Evidence(workspace);
  const processStatus = await fs.readFile(`/proc/${e.pid}/status`, "utf8");
  const uid = /^Uid:\s+(\d+)/m.exec(processStatus);
  const cwd = await fs.readlink(`/proc/${e.pid}/cwd`);
  const executable = await fs.readlink(`/proc/${e.pid}/exe`);
  const argv = (await fs.readFile(`/proc/${e.pid}/cmdline`))
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  const inherited = await procEnvironment(e.pid);
  const oldKey = locateJwtKey(original).value;
  const liveKey = inherited.get("JWT_SECRET");
  const nodeOptions = inherited.get("NODE_OPTIONS") ?? "";
  requireRelease(
    nodeOptions === "" || /^--max-old-space-size=\d+$/.test(nodeOptions),
    "UNKNOWN_NODE_PRELOAD_OPTIONS"
  );
  const local = parseDotenv(original);
  for (const key of [
    "NODE_DEBUG",
    "NODE_DEBUG_NATIVE",
    "DEBUG",
    "BASH_ENV",
    "ENV",
    "LD_PRELOAD",
    "LD_LIBRARY_PATH",
  ])
    requireRelease(
      !inherited.get(key) && !local[key],
      "UNSAFE_SECRET_LOGGING_OR_PRELOAD_OPTION"
    );
  requireRelease(
    !/\b(?:xtrace|verbose)\b/.test(
      `${inherited.get("SHELLOPTS") ?? ""}:${local.SHELLOPTS ?? ""}`
    ),
    "UNSAFE_SHELL_SECRET_LOGGING"
  );
  for (const key of Object.keys(local)) delete local[key];
  requireRelease(
    !inherited.get("BASH_ENV") &&
      !inherited.get("ENV") &&
      !inherited.get("LD_PRELOAD") &&
      !inherited.get("LD_LIBRARY_PATH") &&
      ![...inherited.keys()].some(key => key.startsWith("BASH_FUNC_")),
    "UNKNOWN_RUNTIME_PRELOAD_HOOK"
  );
  let matchesLauncher = false;
  if (e.launcher === `${APP_ROOT}/start.sh`) {
    assertShellEnvSource(original);
    const emptyArgs = (value: unknown): boolean =>
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);
    requireRelease(
      emptyArgs(e.nodeArgs) &&
        emptyArgs(e.raw.interpreter_args) &&
        emptyArgs(e.raw.args),
      "UNAPPROVED_SHELL_LAUNCHER_ARGUMENTS"
    );
    const meta = await fs.lstat(e.launcher);
    requireRelease(
      meta.isFile() &&
        !meta.isSymbolicLink() &&
        meta.uid === 0 &&
        (meta.mode & 0o022) === 0,
      "UNSAFE_PRODUCTION_LAUNCHER"
    );
    requireRelease(
      meta.mtimeMs <= e.uptime && meta.ctimeMs <= e.uptime,
      "LAUNCHER_CHANGED_SINCE_PROCESS_START"
    );
    matchesLauncher =
      (await fs.readFile(e.launcher, "utf8")) ===
      silentCommand(workspace, "git", [
        "show",
        `${REQUIRED_LIVE_BASELINE}:start.sh`,
      ]);
  }
  const args = Array.isArray(e.nodeArgs)
    ? e.nodeArgs
    : typeof e.nodeArgs === "string"
      ? e.nodeArgs.split(/\s+/)
      : [];
  const preload =
    args.length === 2 && args[0] === "-r" && args[1] === "dotenv/config";
  // Shell exec node, or PM2's documented Node container with the approved absolute script.
  const nodeEntry =
    argv.length === 2 &&
    (argv[1] === "dist/index.js" || argv[1] === NODE_ENTRY);
  const containerPath =
    argv.length === 4 && argv[1] === "-r" && argv[2] === "dotenv/config"
      ? argv[3]
      : argv.length === 2
        ? argv[1]
        : "";
  const pm2Container =
    /\/pm2\/lib\/ProcessContainerFork\.js$/.test(containerPath) &&
    e.launcher === NODE_ENTRY &&
    preload;
  const proof: RuntimeProof = {
    status: String(e.raw.status ?? ""),
    mode: String(e.raw.exec_mode ?? ""),
    instances: Number(e.raw.instances ?? 1),
    watch: e.raw.watch,
    pid: e.pid,
    uid: uid ? Number(uid[1]) : -1,
    cwd,
    launcher: e.launcher,
    interpreter: e.interpreter,
    launcherMatchesApproved: matchesLauncher,
    actualNodeCommand:
      /\/node$/.test(executable) && (nodeEntry || pm2Container),
    processKeyMatchesFile:
      typeof liveKey === "string" && safeEqual(liveKey, oldKey),
    dotenvPath: inherited.get("DOTENV_CONFIG_PATH"),
    dotenvOverride: inherited.get("DOTENV_CONFIG_OVERRIDE"),
    nodePreload: preload,
  };
  e.source = assertRuntime(proof);
  requireRelease(
    e.cwd === APP_ROOT && e.raw.autorestart === true,
    "UNSAFE_PM2_RESTART_CONFIGURATION"
  );
  inherited.clear();
  e.raw = {};
  e.root = {};
  return e;
}
async function assertArtifact(directory: string, sha: string): Promise<void> {
  const stamp = record(
    JSON.parse(
      await fs.readFile(path.join(directory, "public/release.json"), "utf8")
    ) as unknown
  );
  requireRelease(
    stamp.commit === sha &&
      stamp.branch === "main" &&
      stamp.environment === "production",
    "SECURE_ARTIFACT_SHA_MISMATCH"
  );
  for (const entry of [
    "index.js",
    "secure-app.js",
    "security-release-runtime.mjs",
    "public/index.html",
    "ensure-governed-media-schema.js",
  ]) {
    const meta = await fs.lstat(path.join(directory, entry));
    requireRelease(
      meta.isFile() && !meta.isSymbolicLink() && meta.size > 0,
      "SECURE_ARTIFACT_INCOMPLETE"
    );
  }
  const wrapper = await fs.readFile(path.join(directory, "index.js"), "utf8");
  requireRelease(
    wrapper.includes("assertAppBootAuthorized") &&
      wrapper.includes("secure-app.js"),
    "COMPILED_BOOT_GUARD_MISSING"
  );
  const server = await fs.readFile(
    path.join(directory, "secure-app.js"),
    "utf8"
  );
  requireRelease(
    !server.includes("local_kingcam_6") &&
      server.includes('"/api/dev-login"') &&
      server.includes("res.status(404)"),
    "COMPILED_AUTH_PROTECTION_MISSING"
  );
}
async function treeDigest(directory: string): Promise<string> {
  const digest = createHash("sha256");
  async function visit(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const file = path.join(dir, entry.name);
      const rel = path.relative(directory, file);
      requireRelease(
        !entry.isSymbolicLink() && (entry.isFile() || entry.isDirectory()),
        "UNSAFE_ARTIFACT_ENTRY"
      );
      requireRelease(
        !/(^|\/)\.env(?:\.|$)/.test(rel),
        "SECRET_FILE_IN_ARTIFACT"
      );
      digest.update(rel);
      digest.update("\0");
      if (entry.isDirectory()) await visit(file);
      else {
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
  return digest.digest("hex"); // Non-secret build artifact only.
}
async function logCursors(workspace: string): Promise<LogCursor[]> {
  const e = await pm2Evidence(workspace);
  const cursors: LogCursor[] = [];
  for (const key of ["pm_out_log_path", "pm_err_log_path"]) {
    const file = e.raw[key];
    requireRelease(
      typeof file === "string" &&
        (file.startsWith("/root/.pm2/logs/creatorvault-") ||
          file.startsWith(`${APP_ROOT}/logs/`)),
      "UNSAFE_PM2_LOG_PATH"
    );
    const s = await fs.lstat(file);
    requireRelease(
      s.isFile() && !s.isSymbolicLink() && s.uid === 0,
      "UNSAFE_PM2_LOG_FILE"
    );
    cursors.push({ path: file, dev: s.dev, ino: s.ino, size: s.size });
  }
  e.raw = {};
  e.root = {};
  return cursors;
}
async function verifyLogs(cursors: readonly LogCursor[]): Promise<void> {
  for (const cursor of cursors) {
    const handle = await fs.open(
      cursor.path,
      constants.O_RDONLY | constants.O_NOFOLLOW
    );
    try {
      const s = await handle.stat();
      requireRelease(
        s.dev === cursor.dev &&
          s.ino === cursor.ino &&
          s.size >= cursor.size &&
          s.size - cursor.size <= 2 * 1024 * 1024,
        "PM2_LOG_WINDOW_UNVERIFIED"
      );
      const buffer = Buffer.alloc(s.size - cursor.size);
      try {
        await handle.read(buffer, 0, buffer.length, cursor.size);
        // Expected old-session rejection is excluded. Log text, even sanitized, is never printed.
        const unexpected = buffer
          .toString("utf8")
          .split("\n")
          .filter(
            line =>
              !/signature verification failed|Missing session cookie/.test(line)
          );
        requireRelease(
          !unexpected.some(line =>
            /TypeError|ReferenceError|SyntaxError|\[auth\/login\] error|Failed to sync user|EADDRINUSE|uncaught|Unhandled|restart loop|ERR_MODULE|Cannot find module|router.*error/i.test(
              line
            )
          ),
          "AUTH_ROUTER_OR_RESTART_ERROR_IN_LOGS"
        );
      } finally {
        buffer.fill(0);
      }
    } finally {
      await handle.close();
    }
  }
}
export async function atomicPersistKey(
  snapshot: FileSnapshot,
  original: string,
  key: string,
  markRotated: () => void,
  rotationIntent?: () => Promise<void>
): Promise<void> {
  requireRelease(
    unchanged(snapshot, await secretSnapshot()),
    "SECRET_SOURCE_CHANGED"
  );
  const replacement = replaceJwtKey(original, key);
  const temporary = `${APP_ROOT}/.env.security-rotation-tmp`;
  let handle: fs.FileHandle | undefined;
  let created = false;
  try {
    handle = await fs.open(
      temporary,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600
    );
    created = true;
    await handle.chown(snapshot.uid, snapshot.gid);
    await handle.chmod(snapshot.mode & 0o777);
    await handle.writeFile(replacement, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    requireRelease(
      unchanged(snapshot, await secretSnapshot()),
      "SECRET_SOURCE_CHANGED"
    );
    if (rotationIntent) {
      await rotationIntent();
      requireRelease(
        unchanged(snapshot, await secretSnapshot()),
        "SECRET_SOURCE_CHANGED"
      );
    }
    await fs.rename(temporary, SECRET_PATH);
    markRotated(); // Irreversible boundary: no old-secret restoration.
    const directory = await fs.open(
      APP_ROOT,
      constants.O_RDONLY | constants.O_DIRECTORY
    );
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
    const updated = await secretSnapshot();
    const verified = await readSecretFile(updated);
    requireRelease(
      safeEqual(locateJwtKey(verified).value, key),
      "PERSISTED_JWT_KEY_UNVERIFIED"
    );
  } catch (error: unknown) {
    if (error instanceof ReleaseFailure) throw error;
    throw new ReleaseFailure("JWT_PERSISTENCE_FAILED");
  } finally {
    if (handle) await handle.close().catch(() => undefined);
    if (created) await fs.unlink(temporary).catch(() => undefined);
  }
}
export async function runProductionRelease(
  workspace: string,
  sha: string,
  ref: string,
  event: string
): Promise<TransactionResult> {
  let original = "";
  let newKey = "";
  let snapshot: FileSnapshot | undefined;
  let processProof: Pm2Evidence | undefined;
  let loginProof: LoginProof | undefined;
  let cursors: LogCursor[] = [];
  let stagedDigest = "";
  let lockHeld = false;
  const effects: ReleaseEffects = {
    async preflight() {
      await checkCheckout(workspace, sha, ref, event);
      await protectedRoot();
      requireRelease(
        /^[a-f0-9]{32}$/.test(process.env.INVOCATION_ID ?? ""),
        "LOCAL_SUPERVISION_REQUIRED"
      );
      const parentCommand = (await fs.readFile(`/proc/${process.ppid}/cmdline`))
        .toString("utf8")
        .split("\0");
      requireRelease(
        parentCommand[0] === "/usr/bin/flock" &&
          parentCommand.includes(WRITER_LOCK) &&
          parentCommand.includes("--exclusive"),
        "SHARED_ENV_WRITER_LOCK_REQUIRED"
      );
      await assertRequesterAlive();
      await assertArtifact(path.join(workspace, "dist"), sha);
      const live = await requestPublic("/__release");
      requireRelease(live.status === 200, "LIVE_BASELINE_UNAVAILABLE");
      assertBaseline(live.body);
      await writeJournal(sha, "preflight");
      snapshot = await secretSnapshot();
      original = await readSecretFile(snapshot);
      locateJwtKey(original);
      processProof = await proveRuntime(workspace, original);
      await proveWritableSource(snapshot);
      requireRelease(
        snapshot.mtimeMs <= processProof.uptime &&
          snapshot.ctimeMs <= processProof.uptime,
        "SECRET_SOURCE_CHANGED_SINCE_PROCESS_START"
      );
      const env = parseDotenv(original);
      requireRelease(
        safeEqual(env.JWT_SECRET ?? "", locateJwtKey(original).value),
        "SHELL_DOTENV_SOURCE_DISAGREEMENT"
      );
      // Actual ordinary password login, not a signed-token substitute. No existing-user credentials are borrowed.
      const verifier = await provisionLoginVerifier(env, sha, openId =>
        persistFixtureOwnership(sha, openId)
      );
      try {
        loginProof = await prepareLoginProof(verifier);
      } finally {
        for (const key of Object.keys(verifier)) delete verifier[key];
        for (const key of Object.keys(env)) delete env[key];
      }
      cursors = await logCursors(workspace);
      requireRelease(
        !(await fs.lstat(STAGE_PATH).catch(() => undefined)),
        "PREVIOUS_STAGE_REQUIRES_FORWARD_REVIEW"
      );
      requireRelease(
        !(await fs.lstat(PRIOR_PATH).catch(() => undefined)),
        "PREVIOUS_RELEASE_ATTEMPT_REQUIRES_FORWARD_REVIEW"
      );
      // The existing runner already invokes sudo. No runner, settings, sudoers, or repository permission changes.
      await fs.mkdir(LOCK_PATH, { mode: 0o700 });
      lockHeld = true;
      const repeated = await requestPublic("/__release");
      assertBaseline(repeated.body);
      requireRelease(
        snapshot && unchanged(snapshot, await secretSnapshot()),
        "SECRET_SOURCE_CHANGED"
      );
      const current = await proveRuntime(workspace, original);
      requireRelease(
        current.pid === processProof.pid &&
          current.uptime === processProof.uptime,
        "ACTIVE_PROCESS_CHANGED"
      );
    },
    async stage() {
      await assertRequesterAlive();
      await fs.mkdir(STAGE_PATH, { mode: 0o700 });
      const source = path.join(workspace, "dist");
      stagedDigest = await treeDigest(source);
      await fs.cp(source, path.join(STAGE_PATH, "dist"), {
        recursive: true,
        errorOnExist: true,
        force: false,
        dereference: false,
      });
      await assertArtifact(path.join(STAGE_PATH, "dist"), sha);
      requireRelease(
        (await treeDigest(path.join(STAGE_PATH, "dist"))) === stagedDigest,
        "STAGED_ARTIFACT_MISMATCH"
      );
      for (const file of [
        "package.json",
        "pnpm-lock.yaml",
        "deploy_work_to_prod.sh",
      ]) {
        await fs.copyFile(
          path.join(workspace, file),
          path.join(STAGE_PATH, file),
          constants.COPYFILE_EXCL
        );
      }
      // Runtime dependencies must already match: the clean security release adds none.
      const runtimePackage = JSON.parse(
        await fs.readFile(`${APP_ROOT}/package.json`, "utf8")
      ) as unknown;
      const targetPackage = JSON.parse(
        await fs.readFile(`${workspace}/package.json`, "utf8")
      ) as unknown;
      requireRelease(
        JSON.stringify(record(runtimePackage).dependencies) ===
          JSON.stringify(record(targetPackage).dependencies),
        "RUNTIME_DEPENDENCIES_MISMATCH"
      );
      requireRelease(
        (await fs.readFile(`${APP_ROOT}/pnpm-lock.yaml`, "utf8")) ===
          (await fs.readFile(`${workspace}/pnpm-lock.yaml`, "utf8")),
        "RUNTIME_LOCKFILE_MISMATCH"
      );
      requireRelease(
        snapshot && unchanged(snapshot, await secretSnapshot()),
        "SECRET_SOURCE_CHANGED"
      );
      requireRelease(loginProof && processProof, "PREFLIGHT_NOT_COMPLETE");
      // This release changes no schema. Do not run the legacy DDL-producing media-schema initializer.
    },
    async activateSecureArtifact() {
      const last = await requestPublic("/__release");
      assertBaseline(last.body);
      requireRelease(
        snapshot && unchanged(snapshot, await secretSnapshot()),
        "SECRET_SOURCE_CHANGED"
      );
      const current = await proveRuntime(workspace, original);
      requireRelease(
        processProof &&
          current.pid === processProof.pid &&
          current.uptime === processProof.uptime,
        "ACTIVE_PROCESS_CHANGED"
      );
      requireRelease(
        (await treeDigest(path.join(STAGE_PATH, "dist"))) === stagedDigest,
        "STAGED_ARTIFACT_CHANGED"
      );
      const distMeta = await fs.lstat(`${APP_ROOT}/dist`);
      requireRelease(
        distMeta.isDirectory() &&
          !distMeta.isSymbolicLink() &&
          distMeta.uid === 0,
        "UNSAFE_ACTIVE_ARTIFACT"
      );
      await writeJournal(sha, "activation-intent");
      await fs.rename(`${APP_ROOT}/dist`, PRIOR_PATH);
      try {
        await fs.rename(path.join(STAGE_PATH, "dist"), `${APP_ROOT}/dist`);
      } catch {
        throw new ReleaseFailure("SECURE_ACTIVATION_FAILED_FORWARD_ONLY");
      }
      for (const file of [
        "package.json",
        "pnpm-lock.yaml",
        "deploy_work_to_prod.sh",
      ])
        await fs.rename(path.join(STAGE_PATH, file), `${APP_ROOT}/${file}`);
      await assertArtifact(`${APP_ROOT}/dist`, sha);
      requireRelease(
        (await treeDigest(`${APP_ROOT}/dist`)) === stagedDigest,
        "ACTIVE_SECURE_ARTIFACT_UNVERIFIED"
      );
      await writeJournal(sha, "staged");
    },
    async generateKey() {
      await assertRequesterAlive();
      requireRelease(
        snapshot && unchanged(snapshot, await secretSnapshot()),
        "SECRET_SOURCE_CHANGED"
      );
      await assertArtifact(`${APP_ROOT}/dist`, sha);
      const random = randomBytes(64);
      try {
        newKey = random.toString("hex");
        return newKey;
      } finally {
        random.fill(0);
      }
    },
    async persistKey(key, markRotated) {
      requireRelease(snapshot && processProof, "PREFLIGHT_NOT_COMPLETE");
      await atomicPersistKey(snapshot, original, key, markRotated, () =>
        writeJournal(sha, "rotation-intent")
      );
      await writeJournal(sha, "rotated");
    },
    async reload() {
      // Never restart/start/fallback to the pre-security artifact. The fixed launcher now resolves secure dist.
      silentCommand(
        APP_ROOT,
        "pm2",
        ["reload", "creatorvault", "--update-env"],
        60000
      );
    },
    async verify() {
      requireRelease(loginProof && processProof, "PREFLIGHT_NOT_COMPLETE");
      // Bounded readiness, no retry of deployment or rotation and no raw request/log output.
      let ready = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        const health = await requestPublic("/api/health").catch(
          () => undefined
        );
        if (health?.status === 200) {
          ready = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      requireRelease(ready, "POST_RELEASE_HEALTH_FAILED");
      const active = await pm2Evidence(APP_ROOT);
      requireRelease(
        active.raw.status === "online" &&
          active.pid > 1 &&
          active.pid !== processProof.pid &&
          active.restarts <= processProof.restarts + 1,
        "POST_RELEASE_PM2_UNHEALTHY"
      );
      active.raw = {};
      active.root = {};
      if (processProof.source === "shell-env") {
        const env = await procEnvironment(active.pid);
        requireRelease(
          safeEqual(env.get("JWT_SECRET") ?? "", newKey),
          "ACTIVE_PROCESS_NOT_USING_ROTATED_KEY"
        );
        env.clear();
      }
      // /proc/environ is the exec-time snapshot, not subsequent Node process.env writes.
      // For dotenv, the real fresh-login signature below is the effective-key proof.
      await verifyLiveRelease(sha, loginProof, newKey);
      await new Promise(resolve => setTimeout(resolve, 3000));
      const stable = await pm2Evidence(APP_ROOT);
      requireRelease(
        stable.pid === active.pid &&
          stable.restarts === active.restarts &&
          stable.raw.status === "online",
        "POST_RELEASE_RESTART_LOOP"
      );
      stable.raw = {};
      stable.root = {};
      await verifyLogs(cursors);
      await cleanupOwnedFixture(sha);
      // No online resurrection snapshot is saved until every live check passed.
      silentCommand(APP_ROOT, "pm2", ["save"], 30000);
    },
    clearSensitiveMemory() {
      original = "";
      newKey = "";
      if (loginProof) {
        loginProof.password = "";
        loginProof.oldSession = "";
      }
      loginProof = undefined;
    },
  };
  let result: TransactionResult;
  try {
    result = await executeRelease(effects);
    if (result.ok)
      await writeJournal(sha, "verified", "SECURITY_RELEASE_VERIFIED");
    else if (result.rotated) await writeJournal(sha, "failed", result.code);
    if (!result.ok) {
      // Fail closed: retain the secure artifact/key, never restore the old key,
      // retry generation, restart an old process or leave it serving old sessions.
      try {
        await failureGuard(sha);
      } catch {
        result = { ...result, code: "FORWARD_ONLY_APP_STOP_UNCONFIRMED" };
      }
    }
  } finally {
    if (lockHeld) await fs.rmdir(LOCK_PATH).catch(() => undefined);
    // Stage contains no credentials. Leave secure/prior artifacts after mutation for forward-only review.
  }
  return result;
}
async function assertRequesterAlive(): Promise<void> {
  const parent = Number(process.env.CREATORVAULT_RELEASE_PARENT_PID);
  requireRelease(
    Number.isSafeInteger(parent) && parent > 1,
    "MISSING_RELEASE_REQUESTER"
  );
  await fs.access(`/proc/${parent}/status`).catch(() => {
    throw new ReleaseFailure("RELEASE_REQUESTER_TERMINATED_BEFORE_ROTATION");
  });
}
export async function assertAppBootAuthorized(): Promise<void> {
  const release = record(
    JSON.parse(
      await fs.readFile(`${APP_ROOT}/dist/public/release.json`, "utf8")
    ) as unknown
  );
  requireRelease(
    typeof release.commit === "string" && /^[a-f0-9]{40}$/.test(release.commit),
    "BOOT_RELEASE_METADATA_MISSING"
  );
  const state = await readJournal(release.commit);
  requireRelease(state, "BOOT_RELEASE_NOT_AUTHORIZED");
  if (state.phase === "verified") return;
  requireRelease(
    state.phase === "rotated",
    "BOOT_RELEASE_REQUIRES_FORWARD_FIX"
  );
  // After reboot the transient unit is absent, so an incomplete release cannot resurrect.
  const active = silentCommand(APP_ROOT, "/usr/bin/systemctl", [
    "is-active",
    `creatorvault-security-release-${release.commit}.service`,
  ]).trim();
  requireRelease(
    active === "active" || active === "activating",
    "BOOT_RELEASE_REQUIRES_FORWARD_FIX"
  );
}
async function launchSupervisor(
  workspace: string,
  sha: string,
  ref: string,
  event: string
): Promise<TransactionResult> {
  await checkCheckout(workspace, sha, ref, event);
  await protectedRoot();
  await assertArtifact(path.join(workspace, "dist"), sha);
  const live = await requestPublic("/__release");
  requireRelease(live.status === 200, "LIVE_BASELINE_UNAVAILABLE");
  assertBaseline(live.body);
  const snapshot = await secretSnapshot();
  let original = await readSecretFile(snapshot);
  try {
    const runtime = await proveRuntime(workspace, original);
    await proveWritableSource(snapshot);
    requireRelease(
      snapshot.mtimeMs <= runtime.uptime && snapshot.ctimeMs <= runtime.uptime,
      "SECRET_SOURCE_CHANGED_SINCE_PROCESS_START"
    );
    const env = parseDotenv(original);
    requireRelease(
      safeEqual(env.JWT_SECRET ?? "", locateJwtKey(original).value),
      "SHELL_DOTENV_SOURCE_DISAGREEMENT"
    );
    requireRelease(
      env.DATABASE_URL && env.VITE_APP_ID,
      "EXISTING_APP_AUTH_CONFIGURATION_MISSING"
    );
    for (const key of Object.keys(env)) delete env[key];
  } finally {
    original = "";
  }
  for (const executable of [
    "/usr/bin/node",
    "/usr/bin/flock",
    "/usr/bin/systemd-run",
    "/usr/bin/systemctl",
  ]) {
    const actual = await fs.stat(executable);
    requireRelease(
      actual.isFile() && actual.uid === 0 && (actual.mode & 0o022) === 0,
      "REQUIRED_SUPERVISOR_TOOL_UNAVAILABLE"
    );
  }
  const manager = await fs.lstat("/run/systemd/private");
  requireRelease(
    manager.isSocket() && manager.uid === 0,
    "LOCAL_SUPERVISOR_UNAVAILABLE"
  );
  const control = `${APP_ROOT}/.security-release-control-${sha}`;
  requireRelease(
    !(await fs.lstat(control).catch(() => undefined)) &&
      !(await fs.lstat(journalPath(sha)).catch(() => undefined)),
    "PREVIOUS_CONTROLLER_ATTEMPT_REQUIRES_FORWARD_REVIEW"
  );
  requireRelease(
    !(await fs
      .lstat(`${APP_ROOT}/.env.security-rotation-tmp`)
      .catch(() => undefined)),
    "PREVIOUS_SECRET_TEMP_REQUIRES_FORWARD_REVIEW"
  );
  const existingLock = await fs.lstat(WRITER_LOCK).catch(() => undefined);
  if (existingLock)
    assertSecretFile({
      uid: existingLock.uid,
      gid: existingLock.gid,
      mode: existingLock.mode,
      regular: existingLock.isFile(),
      symlink: existingLock.isSymbolicLink(),
      links: existingLock.nlink,
    });
  else {
    const lock = await fs.open(
      WRITER_LOCK,
      constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW |
        constants.O_WRONLY,
      0o600
    );
    await lock.close();
  }
  // No source is read by the worker until flock holds the shared .env writer lock.
  // All legitimate .env maintenance must use this same lock; no forced-lock bypass.
  await fs.mkdir(control, { mode: 0o700 });
  await fs.copyFile(
    path.join(workspace, "dist/security-release-runtime.mjs"),
    `${control}/controller.mjs`,
    constants.COPYFILE_EXCL
  );
  await fs.chmod(`${control}/controller.mjs`, 0o600);
  let completed = true;
  try {
    silentCommand(
      APP_ROOT,
      "/usr/bin/systemd-run",
      supervisorCommand(sha, workspace, process.pid),
      900000
    );
  } catch {
    completed = false;
  }
  const state = await readJournal(sha);
  const ok = completed && state?.phase === "verified";
  return {
    ok,
    rotated:
      state !== undefined &&
      ["rotation-intent", "rotated", "failed", "verified"].includes(
        String(state.phase)
      ),
    phase: state ? String(state.phase) : "supervisor",
    code: ok
      ? "SECURITY_RELEASE_VERIFIED"
      : state && state.code !== "NONE"
        ? String(state.code)
        : "SUPERVISED_RELEASE_FAILED",
  };
}
async function main(): Promise<void> {
  const workspace = process.env.CREATORVAULT_RELEASE_WORKSPACE ?? process.cwd();
  const sha =
    process.env.CREATORVAULT_RELEASE_SHA ?? process.env.GITHUB_SHA ?? "";
  const ref =
    process.env.CREATORVAULT_RELEASE_REF ?? process.env.GITHUB_REF ?? "";
  const event =
    process.env.CREATORVAULT_RELEASE_EVENT ??
    process.env.GITHUB_EVENT_NAME ??
    "";
  try {
    if (process.argv[2] === "--check-checkout") {
      await checkCheckout(workspace, sha, ref, event);
      console.log("CHECKOUT_GATE=PASS");
      return;
    }
    if (process.argv[2] === "--failure-stop") {
      requireRelease(
        process.argv.length === 3 &&
          /^[a-f0-9]{32}$/.test(process.env.INVOCATION_ID ?? ""),
        "LOCAL_SUPERVISION_REQUIRED"
      );
      await failureGuard(sha);
      return;
    }
    requireRelease(
      process.argv.length === 2 ||
        (process.argv.length === 3 && process.argv[2] === "--supervised"),
      "UNSUPPORTED_RELEASE_ARGUMENTS"
    );
    const result =
      process.argv[2] === "--supervised"
        ? await runProductionRelease(workspace, sha, ref, event)
        : await launchSupervisor(workspace, sha, ref, event);
    console.log(
      JSON.stringify({
        result: result.ok ? "PASS" : "FAIL",
        code: result.code,
        phase: result.phase,
        recovery: result.rotated && !result.ok ? "FORWARD_ONLY" : "NONE",
      })
    );
    if (!result.ok) process.exitCode = 1;
  } catch (error: unknown) {
    console.error(
      JSON.stringify({
        result: "FAIL",
        code:
          error instanceof ReleaseFailure
            ? error.code
            : "RELEASE_OPERATION_FAILED",
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
