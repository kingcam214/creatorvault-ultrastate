import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  APPROVED_RELEASE_PATHS,
  APPROVED_GUARD_CORRECTION_PATHS,
  REQUIRED_LIVE_BASELINE,
  REQUIRED_RELEASE_PARENT,
  assertCheckout,
  requireRelease,
  ReleaseFailure,
  record,
  type CheckoutEvidence,
} from "./securityReleasePolicy";

/** Exact reviewed authorization/compiler bytes; no whole-router feature allowance. */
export const APPROVED_APPLICATION_DIGESTS: Readonly<Record<string, string>> = {
  "client/src/pages/KingCamClone.tsx":
    "81aa3fe277e5c085d21294abe2e016db9cb7d26e75063bda72be370e3de18869",
  "client/src/pages/MotionFlyerAgent.tsx":
    "e444696e74671ed55717117955783e6b468958d1e5c1cb5006a1a4fd990121dc",
  "server/_core/authenticationRoutes.ts":
    "ef814575a48f849f6162ea45edcc6952eeaed493161476be0dcad63f11dd439c",
  "server/_core/authorizationPolicy.ts":
    "94e542073511e8501dfe0c5315b7b28a6cf3d138cc99b39cb35d4f9845cf41e0",
  "server/_core/index.ts":
    "e984b7d17bcb6bc2ce458e00c0bf19b29f06c564b63057545507c51bdba62fe7",
  "server/_core/trpc.ts":
    "f2f2080229bf2ed9aa39306c51a0a99259368f60af6781335cef785c74efaa20",
  "server/routers.ts":
    "3c81bd550e709cd024a6e8e267f8b6470e9d70aeccf3d95411f9c47bf24aeb86",
  "server/routers/activationWarRoomRouter.ts":
    "2508b83f4634a816a81518875f4c70a1fcdb306dd2a4f383c8bc471b16c9f2ed",
  "server/routers/aderlyRouter.ts":
    "3cfcbed65b70dc9db829af0e65ccf8761eb38206b8e85073deb3f5550c352aea",
  "server/routers/adminRouter.ts":
    "70a10021e11a44236a3eea46dae4860be716e4b9ff9c7e1bfd97fb3966664202",
  "server/routers/bodyCinemaRouter.ts":
    "99487cdb10942b604080265930200e9dffc58c52227b5184d9592e031a8b04c5",
  "server/routers/campaignVisualRouter.ts":
    "5bc6cff0e1a74a8c8392dcada81003e603973ca6f4107c67811997d67239b052",
  "server/routers/captionStageRouter.ts":
    "8c308311b29221421816011c4072c622a272c57afbee604afea89ec98f6468c8",
  "server/routers/cloneCommandRouter.ts":
    "f2ce84aac62433c494cc25227ba0de94faa26ce7d2bd35e043f6f7fc6a85a3e7",
  "server/routers/cloneTrainingLabRouter.ts":
    "036a5d307a6ca3560128d1a7a064b0c243237314aa4b1ef009f1f0b72656f1a8",
  "server/routers/contentCommandRouter.ts":
    "f026ff7b8adac816ef4bd2252ed461689091d83a734e03869ca538f5acf05f25",
  "server/routers/creationDirectorRouter.ts":
    "9cce5baa24dd0741df730bc20a48538cc69fd1a95b1ec29025d8ad9a71fc2a27",
  "server/routers/creationProofRouter.ts":
    "2748b3397031f4cb967e6291e8c8ce5fb6ebc73a3b91c3de9da383d8734f8b4f",
  "server/routers/creatorOutreachRouter.ts":
    "a650128996c27b2f83e29483787f3bc4dcf18e020232f9c853eb618838f302b9",
  "server/routers/designImagePilotRouter.ts":
    "b320102e1b9f144a49d3836376c67b76a020c213730d9f53390d6ca6d6032072",
  "server/routers/governedKingcamIdentityRouter.ts":
    "54764586a6302445d74cd63831178cfa7815f1f0d3bd6351d34c68beb2bc46b9",
  "server/routers/governedPolloRouter.ts":
    "5f22d749ef90fabcb5f5883dc1527385ea113781eae9e835579f21663eaeb58d",
  "server/routers/homepageMotionPilotRouter.ts":
    "88c6cbf09a4c3f96e687003590fecb8b089e54d1587974ef73ea5499de9ec9df",
  "server/routers/kingWorld3DRouter.ts":
    "a1b90bd5d662165574261189e811003e0a4d4fbc16d8169669e57cbb72c54e60",
  "server/routers/kingcamBrainRouter.ts":
    "ff465e990a60953ce39d1824b1facf44dfc532661c0b760517d83cb3a725d532",
  "server/routers/kingcamCloneOperatingSystemRouter.ts":
    "cf1f98123564658dc18658c05edef96495c2e03cbbe69fae4c79e8d3ccdf0cd5",
  "server/routers/kingcamSupremeSystemRouter.ts":
    "c98e724024125c03af17371a47581b2cbb375c31f7744d20f31703a5f6e2550b",
  "server/routers/ownerCockpitRouter.ts":
    "c5740cdff94e051133c57b05c42526aa8c910b66a9d583d15fe9181805074e5b",
  "server/routers/polloRouter.ts":
    "68e1be525f3311f4272ca9119cde7703d0dc235676a506135e5caf4328eed109",
  "server/routers/vaultxAcquisitionOperatorRouter.ts":
    "cddf48f999fa1128d97f251732d0e496bab34ed5e573b6988426ca2d8733394a",
  "server/routers/vaultxRouter.ts":
    "0799712280d62f2f0e1c171f775255a1927b6dc05ee770046257a6d1e54af833",
  "server/routers/videoUploadRouter.ts":
    "c6996a854880525bee305428790f11e1b4f06309b9dbe005a93ee27837d0d37e",
  "server/routers/waitlistEngine.ts":
    "66adca7a2fcaad1fcaf42e2be44a7ba9cd6c1e41b2c3db677ec6215b5e376fb3",
  "server/services/kingcamFullBodyPerformerService.ts":
    "b09c51afe3604ebd7301d9d0a59554c7717bb01443c6db187e9e690ae151af4d",
};

export const REQUIRED_RELEASE_REFERENCES: readonly string[] = [
  "scripts/securityReleaseRunner.ts",
  "scripts/securityReleasePolicy.ts",
  "scripts/securityReleaseIntegrity.ts",
  "scripts/securityReleaseVerification.ts",
  "scripts/securityReleaseEntrypoint.ts",
  "scripts/prepareSecurityReleaseArtifact.ts",
  "scripts/check-security-types.ts",
  "scripts/check-security-release-types.ts",
  "scripts/securityRelease.test.ts",
  "scripts/securityReleaseIntegrity.test.ts",
  "scripts/githubWorkflowPermissionPreflight.ts",
  "scripts/githubWorkflowPermissionPreflight.test.ts",
  "scripts/securityProcedureInventory.ts",
  "scripts/security-privileged-procedures.json",
  "server/_core/authenticationRoutes.security.test.ts",
  "server/_core/authorization.security.test.ts",
  "server/_core/resourceAuthorization.security.test.ts",
  "server/_core/securityTestSetup.ts",
  "server/typescriptReleaseGate.test.ts",
  "vitest.config.ts",
  "vitest.security.config.ts",
  "vitest.security-release.config.ts",
  "vitest.github-workflow-preflight.config.ts",
  "deploy_work_to_prod.sh",
  "package.json",
  ".github/workflows/deploy.yml",
];

function git(root: string, args: readonly string[]): string {
  try {
    return execFileSync("git", [...args], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 8 * 1024 * 1024,
    }).trim();
  } catch {
    throw new ReleaseFailure("RELEASE_GIT_EVIDENCE_UNAVAILABLE");
  }
}
function lines(text: string): string[] {
  return text.split("\n").filter(Boolean);
}
function content(root: string, tree: string, file: string): string {
  try {
    return execFileSync("git", ["show", `${tree}:${file}`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch {
    throw new ReleaseFailure("MISSING_REFERENCED_RELEASE_FILE");
  }
}
function canonical(value: unknown): string {
  if (Array.isArray(value))
    return JSON.stringify(value.map(v => JSON.parse(canonical(v)) as unknown));
  if (typeof value === "object" && value !== null) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort())
      result[key] = JSON.parse(canonical(record(value)[key])) as unknown;
    return JSON.stringify(result);
  }
  return JSON.stringify(value) ?? "null";
}
/** Only the two reviewed security script entries may differ; every other manifest field is frozen. */
export function assertPackagePolicy(
  baseline: unknown,
  candidate: unknown
): void {
  const a = record(baseline),
    b = record(candidate);
  const { scripts: oldScripts, ...oldRest } = a;
  const { scripts: newScripts, ...newRest } = b;
  requireRelease(
    canonical(oldRest) === canonical(newRest),
    "DEPENDENCY_OR_PACKAGE_METADATA_CHANGE"
  );
  const expected = {
    ...record(oldScripts),
    "test:security": "vitest run --config vitest.security.config.ts",
    "check:security": "tsx scripts/check-security-types.ts",
  };
  requireRelease(
    canonical(expected) === canonical(record(newScripts)),
    "UNAPPROVED_PACKAGE_SCRIPT_CHANGE"
  );
}
export type ClosureEvidence = {
  existingPaths: readonly string[];
  referencedPaths: readonly string[];
  workflow: string;
};
export function assertClosure(e: ClosureEvidence): void {
  const files = new Set(e.existingPaths);
  requireRelease(
    files.has(".github/workflows/deploy.yml"),
    "MISSING_WORKFLOW_FILE"
  );
  requireRelease(
    [...REQUIRED_RELEASE_REFERENCES, ...e.referencedPaths].every(p =>
      files.has(p)
    ),
    "MISSING_REFERENCED_RELEASE_FILE"
  );
  requireRelease(
    e.workflow.includes("pnpm exec tsx scripts/securityReleaseIntegrity.ts") &&
      e.workflow.includes("CREATORVAULT_RELEASE_BEFORE") &&
      e.workflow.includes("github.event.before") &&
      e.workflow.includes(REQUIRED_LIVE_BASELINE) &&
      e.workflow.includes(REQUIRED_RELEASE_PARENT),
    "WORKFLOW_INTEGRITY_GATE_MISSING"
  );
  requireRelease(
    !/1204f479|3076e8c|6c1cbf|APPROVED_SECURITY_PARENT/.test(e.workflow),
    "STALE_INTERMEDIATE_LINEAGE"
  );
  const gates = [
    "pnpm install --frozen-lockfile",
    "pnpm exec tsx scripts/securityReleaseIntegrity.ts",
    "pnpm test:security",
    "pnpm check:security",
    "pnpm exec vitest run --config vitest.security-release.config.ts",
    "pnpm exec tsx scripts/check-security-release-types.ts",
    "pnpm check\n",
    "pnpm build\n",
    "pnpm exec tsx scripts/prepareSecurityReleaseArtifact.ts",
    'bash "$GITHUB_WORKSPACE/deploy_work_to_prod.sh"',
  ];
  let previous = -1;
  for (const gate of gates) {
    const index = e.workflow.indexOf(gate);
    requireRelease(index > previous, "WORKFLOW_GATE_ORDER_INVALID");
    previous = index;
  }
}
export function collectReleaseReferences(sources: readonly string[]): string[] {
  const referenced = new Set<string>();
  for (const source of sources) {
    for (const match of source.matchAll(
      /(?:scripts\/[A-Za-z0-9_.-]+\.(?:ts|mjs|js|json)|vitest[.A-Za-z0-9_-]*\.config\.ts|server\/[A-Za-z0-9_./-]+\.test\.ts)(?![A-Za-z0-9_.-])/g
    ))
      referenced.add(match[0]);
  }
  return [...referenced];
}
export function validateReleaseTree(root: string, tree: string): void {
  const existing = lines(git(root, ["ls-tree", "-r", "--name-only", tree]));
  const records = lines(git(root, ["ls-tree", "-r", tree]));
  const safe = new Set(
    records
      .filter(
        line =>
          line.startsWith("100644 blob ") || line.startsWith("100755 blob ")
      )
      .map(line => line.split("\t")[1])
  );
  requireRelease(
    APPROVED_RELEASE_PATHS.every(p => safe.has(p)),
    "UNSAFE_OR_MISSING_RELEASE_FILE"
  );
  const correctionPaths = lines(
    git(root, ["diff", "--name-only", REQUIRED_RELEASE_PARENT, tree])
  );
  requireRelease(
    correctionPaths.length === APPROVED_GUARD_CORRECTION_PATHS.length &&
      new Set(correctionPaths).size === correctionPaths.length &&
      correctionPaths.every(p => APPROVED_GUARD_CORRECTION_PATHS.includes(p)),
    "UNAPPROVED_GUARD_CORRECTION"
  );
  for (const [file, digest] of Object.entries(APPROVED_APPLICATION_DIGESTS)) {
    requireRelease(
      createHash("sha256")
        .update(content(root, tree, file))
        .digest("hex") === digest,
      "UNAPPROVED_APPLICATION_BYTES"
    );
  }
  assertPackagePolicy(
    JSON.parse(
      content(root, REQUIRED_LIVE_BASELINE, "package.json")
    ) as unknown,
    JSON.parse(content(root, tree, "package.json")) as unknown
  );
  const workflow = content(root, tree, ".github/workflows/deploy.yml");
  const scripts = record(
    record(JSON.parse(content(root, tree, "package.json")) as unknown).scripts
  );
  const sources = [
    workflow,
    ...Object.values(scripts).filter((v): v is string => typeof v === "string"),
    ...REQUIRED_RELEASE_REFERENCES.filter(
      p => p.endsWith(".ts") && !p.endsWith(".test.ts")
    ).map(p => content(root, tree, p)),
  ];
  assertClosure({
    existingPaths: existing,
    referencedPaths: collectReleaseReferences(sources),
    workflow,
  });
}
export function checkoutEvidence(
  root: string,
  sha: string,
  ref: string,
  event: string,
  before: string
): CheckoutEvidence {
  const tree = "HEAD";
  const changes = lines(
    git(root, ["diff", "--name-only", REQUIRED_LIVE_BASELINE, tree])
  );
  const parent = git(root, ["show", "-s", "--format=%P", tree]);
  return {
    ref,
    event,
    before,
    sha,
    head: git(root, ["rev-parse", tree]),
    parent,
    commitCount: Number(
      git(root, ["rev-list", "--count", `${REQUIRED_RELEASE_PARENT}..HEAD`])
    ),
    baselineDiffPaths: changes,
    packageUnchanged: true,
    lockfileUnchanged:
      git(root, [
        "diff",
        "--name-only",
        REQUIRED_LIVE_BASELINE,
        tree,
        "--",
        "pnpm-lock.yaml",
        "package-lock.json",
        "yarn.lock",
      ]) === "",
  };
}
export function checkReleaseCheckout(
  root: string,
  sha: string,
  ref: string,
  event: string,
  before: string
): void {
  assertCheckout(checkoutEvidence(root, sha, ref, event, before));
  requireRelease(
    git(root, ["status", "--porcelain", "--untracked-files=all"]) === "",
    "DIRTY_CHECKOUT"
  );
  validateReleaseTree(root, "HEAD");
}
/** Prospective immutable staged tree; no commit is created by this audit. */
export function checkStagedRelease(root: string): void {
  requireRelease(
    git(root, ["rev-parse", "HEAD"]) === REQUIRED_RELEASE_PARENT,
    "STAGED_RELEASE_NOT_BASELINE"
  );
  requireRelease(
    git(root, ["diff", "--name-only"]) === "",
    "UNSTAGED_RELEASE_CHANGES"
  );
  const tree = git(root, ["write-tree"]);
  const paths = lines(
    git(root, ["diff", "--name-only", REQUIRED_LIVE_BASELINE, tree])
  );
  assertCheckout({
    ref: "refs/heads/main",
    event: "push",
    before: REQUIRED_RELEASE_PARENT,
    sha: "a".repeat(40),
    head: "a".repeat(40),
    parent: REQUIRED_RELEASE_PARENT,
    commitCount: 1,
    baselineDiffPaths: paths,
    packageUnchanged: true,
    lockfileUnchanged:
      git(root, [
        "diff",
        "--name-only",
        REQUIRED_LIVE_BASELINE,
        tree,
        "--",
        "pnpm-lock.yaml",
        "package-lock.json",
        "yarn.lock",
      ]) === "",
  });
  validateReleaseTree(root, tree);
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (process.argv[2] === "--staged") checkStagedRelease(process.cwd());
    else {
      requireRelease(
        process.argv.length === 2,
        "UNSUPPORTED_INTEGRITY_ARGUMENTS"
      );
      checkReleaseCheckout(
        process.cwd(),
        process.env.GITHUB_SHA ?? "",
        process.env.GITHUB_REF ?? "",
        process.env.GITHUB_EVENT_NAME ?? "",
        process.env.CREATORVAULT_RELEASE_BEFORE ?? ""
      );
    }
    console.log("RELEASE_INTEGRITY=PASS");
  } catch (error: unknown) {
    console.error(
      error instanceof ReleaseFailure ? error.code : "RELEASE_INTEGRITY_FAILED"
    );
    process.exitCode = 1;
  }
}
