import { timingSafeEqual } from "node:crypto";

export const REQUIRED_LIVE_BASELINE =
  "46d3021a1bd09222a61ff1390c9cfe8f82d06422";
/** Existing main contains the reviewed security release and its memory-only correction. */
export const REQUIRED_RELEASE_PARENT =
  "bada9255449aa394e9526dcd03da8b1b18e39d47";
export const APPROVED_GUARD_CORRECTION_PATHS: readonly string[] = [
  ".github/workflows/deploy.yml",
  "SECURITY_RELEASE_ROTATION_HANDOFF.md",
  "scripts/securityRelease.test.ts",
  "scripts/securityReleasePolicy.ts",
  "scripts/securityReleaseRunner.ts",
];
export const APP_ROOT = "/root/creatorvault";
export const PUBLIC_ORIGIN = "https://creatorvault.live";
export const APPROVED_RELEASE_PATHS: readonly string[] = [
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
];

export class ReleaseFailure extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "ReleaseFailure";
  }
}
export function requireRelease(
  condition: unknown,
  code: string
): asserts condition {
  if (!condition) throw new ReleaseFailure(code);
}
export function record(value: unknown): Record<string, unknown> {
  requireRelease(
    typeof value === "object" && value !== null && !Array.isArray(value),
    "INVALID_METADATA"
  );
  return value as Record<string, unknown>;
}
export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  try {
    return a.length === b.length && timingSafeEqual(a, b);
  } finally {
    a.fill(0);
    b.fill(0);
  }
}
export type CheckoutEvidence = {
  ref: string;
  event: string;
  before: string;
  sha: string;
  head: string;
  parent: string;
  commitCount: number;
  baselineDiffPaths: readonly string[];
  packageUnchanged: boolean;
  lockfileUnchanged: boolean;
};
export function assertCheckout(e: CheckoutEvidence): void {
  requireRelease(
    e.ref === "refs/heads/main" && e.event === "push",
    "UNAPPROVED_REF_OR_EVENT"
  );
  requireRelease(
    /^[a-f0-9]{40}$/.test(e.sha) && e.sha === e.head,
    "CHECKOUT_SHA_MISMATCH"
  );
  requireRelease(
    e.parent === REQUIRED_RELEASE_PARENT &&
      e.commitCount === 1 &&
      e.before === REQUIRED_RELEASE_PARENT,
    "UNAPPROVED_RELEASE_LINEAGE"
  );
  requireRelease(
    e.baselineDiffPaths.length === APPROVED_RELEASE_PATHS.length &&
      new Set(e.baselineDiffPaths).size === e.baselineDiffPaths.length &&
      e.baselineDiffPaths.every(p => APPROVED_RELEASE_PATHS.includes(p)),
    "EXCLUDED_OR_MISSING_RELEASE_PATH"
  );
  requireRelease(
    e.packageUnchanged && e.lockfileUnchanged,
    "DEPENDENCY_OR_LOCKFILE_CHANGE"
  );
}
export function assertBaseline(value: unknown): void {
  const r = record(value);
  requireRelease(
    r.commit === REQUIRED_LIVE_BASELINE &&
      r.branch === "main" &&
      r.environment === "production",
    "LIVE_BASELINE_MISMATCH"
  );
}
export type FileIdentity = {
  uid: number;
  gid: number;
  mode: number;
  regular: boolean;
  symlink: boolean;
  links: number;
};
export function assertSecretFile(meta: FileIdentity): void {
  requireRelease(
    meta.regular && !meta.symlink && meta.links === 1,
    "UNSAFE_SECRET_FILE_TYPE"
  );
  requireRelease(
    meta.uid === 0 && meta.gid === 0 && (meta.mode & 0o777) === 0o600,
    "UNSAFE_SECRET_FILE_PERMISSIONS"
  );
}
export type EnvKeyLocation = {
  line: number;
  prefix: string;
  suffix: string;
  value: string;
  ending: string;
};
/** Bash source provenance requires a static assignment file, not executable configuration. */
export function assertShellEnvSource(text: string): void {
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(?:#.*)?$/.test(line)) continue;
    requireRelease(
      /^\s*(?:export\s+)?[A-Za-z_][A-Za-z_0-9]*=(?:'[^'\r\n]*'|"[^"\\$`\r\n]*"|[A-Za-z0-9._~:\/@%+,=-]*)(?:\s+#.*|\s*)$/.test(
        line
      ),
      "DYNAMIC_SHELL_ENVIRONMENT"
    );
  }
  locateJwtKey(text);
}
/** Accept only one literal shell/dotenv-compatible assignment; never execute the file. */
export function locateJwtKey(text: string): EnvKeyLocation {
  const lines = text.split(/(?<=\n)/);
  let found: EnvKeyLocation | undefined;
  for (const [line, raw] of lines.entries()) {
    const ending = raw.endsWith("\r\n")
      ? "\r\n"
      : raw.endsWith("\n")
        ? "\n"
        : "";
    const body = ending ? raw.slice(0, -ending.length) : raw;
    if (!body.includes("JWT_SECRET") || /^\s*#/.test(body)) continue;
    const match =
      /^(\s*(?:export\s+)?JWT_SECRET\s*=\s*)(?:'([^'\r\n]*)'|"([^"\r\n]*)"|([^\s#'"|&()<>{}]+))(\s*(?:#.*)?)$/.exec(
        body
      );
    requireRelease(match && !found, "AMBIGUOUS_JWT_SOURCE");
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    requireRelease(
      value.length > 0 && !/[\x00-\x20\x7f$`\\;]/.test(value),
      "UNSUPPORTED_JWT_ASSIGNMENT"
    );
    found = { line, prefix: match[1], suffix: match[5], value, ending };
  }
  requireRelease(found, "JWT_KEY_ABSENT");
  return found;
}
export function assertNewKey(secret: string): void {
  requireRelease(
    /^[a-f0-9]{128}$/.test(secret) && new Set(secret).size >= 8,
    "WEAK_GENERATED_KEY"
  );
}
export function replaceJwtKey(text: string, key: string): string {
  assertNewKey(key);
  const location = locateJwtKey(text);
  const lines = text.split(/(?<=\n)/);
  lines[location.line] =
    `${location.prefix}'${key}'${location.suffix}${location.ending}`;
  return lines.join("");
}
export type RuntimeProof = {
  status: string;
  mode: string;
  instances: number;
  watch: unknown;
  pid: number;
  uid: number;
  cwd: string;
  launcher: string;
  interpreter: string;
  launcherMatchesApproved: boolean;
  actualNodeCommand: boolean;
  processKeyMatchesFile: boolean;
  dotenvPath?: string;
  dotenvOverride?: string;
  nodePreload?: boolean;
};
export function assertRuntime(
  e: RuntimeProof
): "shell-env" | "dotenv-override" {
  requireRelease(
    e.status === "online" &&
      e.mode === "fork_mode" &&
      e.instances === 1 &&
      !e.watch &&
      e.pid > 1 &&
      e.uid === 0,
    "UNSUPPORTED_PM2_PROCESS"
  );
  requireRelease(
    e.cwd === APP_ROOT && e.actualNodeCommand && e.processKeyMatchesFile,
    "UNPROVEN_ACTIVE_SECRET_SOURCE"
  );
  if (
    e.launcher === `${APP_ROOT}/start.sh` &&
    e.interpreter === "bash" &&
    e.launcherMatchesApproved
  )
    return "shell-env";
  if (
    e.launcher === `${APP_ROOT}/dist/index.js` &&
    (e.interpreter === "node" || /\/node$/.test(e.interpreter)) &&
    e.nodePreload &&
    e.dotenvPath === `${APP_ROOT}/.env` &&
    e.dotenvOverride === "true"
  )
    return "dotenv-override";
  throw new ReleaseFailure("UNKNOWN_RUNTIME_SOURCE");
}
export type ReleaseEffects = {
  preflight(): Promise<void>;
  stage(): Promise<void>;
  activateSecureArtifact(): Promise<void>;
  generateKey(): Promise<string>;
  persistKey(key: string, markRotated: () => void): Promise<void>;
  reload(): Promise<void>;
  verify(): Promise<void>;
  clearSensitiveMemory(): void;
};
export type TransactionResult = {
  ok: boolean;
  rotated: boolean;
  code: string;
  phase: string;
};
export type DurablePhase =
  | "preflight"
  | "activation-intent"
  | "staged"
  | "rotation-intent"
  | "rotated"
  | "verified"
  | "failed";
export function needsFailureStop(value: unknown, sha: string): boolean {
  const state = record(value);
  requireRelease(
    state.sha === sha && /^[a-f0-9]{40}$/.test(sha),
    "INVALID_RELEASE_JOURNAL"
  );
  requireRelease(
    typeof state.phase === "string" &&
      [
        "preflight",
        "activation-intent",
        "staged",
        "rotation-intent",
        "rotated",
        "verified",
        "failed",
      ].includes(state.phase),
    "INVALID_RELEASE_JOURNAL"
  );
  return (
    state.phase === "activation-intent" ||
    state.phase === "staged" ||
    state.phase === "rotation-intent" ||
    state.phase === "rotated" ||
    state.phase === "failed"
  );
}
export function supervisorCommand(
  sha: string,
  workspace: string,
  parentPid: number
): string[] {
  requireRelease(
    /^[a-f0-9]{40}$/.test(sha) &&
      workspace.startsWith("/") &&
      !/[\x00-\x1f\x7f]/.test(workspace) &&
      Number.isSafeInteger(parentPid) &&
      parentPid > 1,
    "INVALID_SUPERVISOR_METADATA"
  );
  const controller = `${APP_ROOT}/.security-release-control-${sha}/controller.mjs`;
  return [
    "--quiet",
    "--wait",
    "--collect",
    `--unit=creatorvault-security-release-${sha}`,
    "--property=Type=exec",
    "--property=User=root",
    "--property=Group=root",
    "--property=Restart=no",
    "--property=KillMode=control-group",
    "--property=RuntimeMaxSec=600",
    "--property=TimeoutStopSec=240",
    "--property=UMask=0077",
    "--property=NoNewPrivileges=true",
    "--property=StandardOutput=null",
    "--property=StandardError=null",
    `--property=WorkingDirectory=${APP_ROOT}`,
    `--property=ExecStopPost=/usr/bin/node ${controller} --failure-stop`,
    `--setenv=CREATORVAULT_RELEASE_SHA=${sha}`,
    "--setenv=CREATORVAULT_RELEASE_REF=refs/heads/main",
    "--setenv=CREATORVAULT_RELEASE_EVENT=push",
    `--setenv=CREATORVAULT_RELEASE_BEFORE=${REQUIRED_RELEASE_PARENT}`,
    `--setenv=CREATORVAULT_RELEASE_WORKSPACE=${workspace}`,
    `--setenv=CREATORVAULT_RELEASE_PARENT_PID=${parentPid}`,
    "/usr/bin/flock",
    "--exclusive",
    "--nonblock",
    "--close",
    `${APP_ROOT}/.env.writer.lock`,
    "/usr/bin/node",
    controller,
    "--supervised",
  ];
}
/** No reload until durable write succeeds. Once renamed, forward-only even on reload failure. */
export async function executeRelease(
  effects: ReleaseEffects
): Promise<TransactionResult> {
  let rotated = false;
  let phase = "preflight";
  let key = "";
  try {
    await effects.preflight();
    phase = "staging";
    await effects.stage();
    phase = "secure-activation";
    await effects.activateSecureArtifact();
    phase = "generation";
    key = await effects.generateKey();
    assertNewKey(key);
    phase = "persistence";
    await effects.persistKey(key, () => {
      rotated = true;
    });
    requireRelease(rotated, "ROTATION_NOT_DURABLE");
    phase = "reload";
    await effects.reload();
    phase = "verification";
    await effects.verify();
    return {
      ok: true,
      rotated,
      code: "SECURITY_RELEASE_VERIFIED",
      phase: "complete",
    };
  } catch (error: unknown) {
    return {
      ok: false,
      rotated,
      phase,
      code:
        error instanceof ReleaseFailure
          ? error.code
          : "RELEASE_OPERATION_FAILED",
    };
  } finally {
    key = "";
    try {
      effects.clearSensitiveMemory();
    } catch {
      return { ok: false, rotated, code: "RELEASE_OPERATION_FAILED", phase };
    }
  }
}
