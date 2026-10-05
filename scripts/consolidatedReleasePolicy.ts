import { execFileSync } from "node:child_process";
import { readFileSync, lstatSync, realpathSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import {
  requireRelease,
  ReleaseFailure,
  record,
} from "./securityReleasePolicy";
import { collectPrivilegedProcedurePaths } from "./securityProcedureInventory";
import { BODY_CINEMA_PHASE_A_MIGRATION } from "./bodyCinemaPhaseAMigration";

export const CONSOLIDATED_SECURITY_BASELINE =
  "3762e69c7bf5e59b3e6070085f2fbd4b3fb2c8da";
/**
 * The last verified live consolidated artifact remains the Phase A scope,
 * protected-artifact and rollback baseline. The exact checkout parent below
 * is the already-pushed but undeployed corrective main predecessor.
 */
export const CONSOLIDATED_RELEASE_PARENT =
  "552aee6aa27a79c717e96b60fefa72703deeb356";
export const CONSOLIDATED_RELEASE_CHECKOUT_PARENT =
  "320d5012d6555b9c576c2164cb0e6d5aff739b2b";
export const APP_ROOT = "/root/creatorvault";
export const APPROVED_FEATURE_HEADS = {
  stripe: "ccba8cd56f887d041311d4f37d3ec912fd57322d",
  persona: "d0bec580d387f962bb779663f873c9e642f57ae3",
  studio: "be17b8462c926d5f5c9c57111e7e7f328e9e8f2c",
} as const;
export const APPROVED_MIGRATION_HASHES = {
  "drizzle/0024_stripe_creator_net_payouts.sql":
    "a3b210d0e37f82639def85dd451e87bd14fbcf4f0f050cbea17d4ac69b93712c",
  "drizzle/0025_persona_vault_chained_continuity.sql":
    "75ce0eadcb3ee57659a9e3673d39942cc23859a20a41971290c009cc72802715",
} as const;
export const BODY_CINEMA_PHASE_A_MIGRATION_HASHES = {
  [BODY_CINEMA_PHASE_A_MIGRATION.file]: BODY_CINEMA_PHASE_A_MIGRATION.sha256,
} as const;

const featurePaths = [
  "OWNER_HANDOFF.md",
  "PERSONA_VAULT_CHAINED_CONTINUITY_PROOF.md",
  "STRIPE_CONNECT_NET_PAYOUTS_PROOF.md",
  "VIDEO_STUDIO_TIMELINE_PROOF.md",
  "client/src/App.tsx",
  "client/src/components/video-studio/BrandOverlayTrack.tsx",
  "client/src/components/video-studio/VideoStudioTimeline.tsx",
  "client/src/components/video-studio/__tests__/VideoStudioTimeline.test.tsx",
  "client/src/components/video-studio/audioBeatDetector.ts",
  "client/src/components/video-studio/types.ts",
  "client/src/pages/VideoStudioTimelinePage.tsx",
  "drizzle/0024_stripe_creator_net_payouts.sql",
  "drizzle/0025_persona_vault_chained_continuity.sql",
  "drizzle/meta/_journal.json",
  "drizzle/schema-persona-vaults.ts",
  "drizzle/schema-stripe-payouts.ts",
  "drizzle/schema.ts",
  "package.json",
  "scripts/check-persona-continuity-types.ts",
  "scripts/check-stripe-payout-types.ts",
  "scripts/check-video-studio-types.ts",
  "scripts/scope-guard.js",
  "server/_core/index.ts",
  "server/_core/stripeWebhook.ts",
  "server/db.ts",
  "server/routers.ts",
  "server/routers/marketplace.ts",
  "server/routers/personaVaultRouter.ts",
  "server/routers/stripeCheckout.ts",
  "server/routers/stripeIntegration.ts",
  "server/routers/vaultLive.ts",
  "server/routers/vaultxRouter.ts",
  "server/services/commerceFulfillmentRules.ts",
  "server/services/governedPolloService.ts",
  "server/services/personaContinuityProviderContract.ts",
  "server/services/personaContinuitySubmissionGuard.ts",
  "server/services/personaContinuityWorker.ts",
  "server/services/personaVaultContracts.ts",
  "server/services/personaVaultService.ts",
  "server/services/personaVideoProvider.ts",
  "server/services/stripeCommerceFulfillment.test.ts",
  "server/services/stripeCommerceFulfillment.ts",
  "server/services/stripeConnectAccounts.ts",
  "server/services/stripeCreatorPayoutEvents.ts",
  "server/services/stripeCreatorPayouts.integration.test.ts",
  "server/services/stripeCreatorPayouts.test.ts",
  "server/services/stripeCreatorPayouts.ts",
  "server/services/stripeVaultLive.ts",
  "server/services/stripeVaultLiveRevenue.ts",
  "server/services/stripeVaultxPpvSettlement.ts",
  "server/services/videoChainMedia.ts",
  "server/services/videoChainedContinuity.test.ts",
  "server/services/videoChainedContinuity.ts",
  "vitest.config.ts",
  "vitest.persona-continuity.config.ts",
  "vitest.stripe-payouts.config.ts",
  "vitest.video-studio.config.ts",
];
const integrationPaths = [
  ".github/workflows/deploy.yml",
  "deploy_work_to_prod.sh",
  "CONSOLIDATION_DEPLOYMENT_PROOF.md",
  "scripts/consolidatedReleasePolicy.ts",
  "scripts/consolidatedReleaseRunner.ts",
  "scripts/consolidatedReleaseEntrypoint.ts",
  "scripts/prepareConsolidatedReleaseArtifact.ts",
  "scripts/consolidatedRelease.test.ts",
  "scripts/consolidatedMigrations.ts",
  "scripts/consolidatedMigrations.test.ts",
  "scripts/check-consolidated-release-types.ts",
  "scripts/run-consolidation-regressions.sh",
  "scripts/run-historical-security-release-checks.sh",
  "scripts/portableMariaDbTools.ts",
  "scripts/portableMariaDbTools.test.ts",
  "scripts/security-privileged-procedures.json",
  "vitest.consolidated-release.config.ts",
  "server/routers/governedPolloRouter.ts",
  "server/_core/authorization.security.test.ts",
  "server/_core/resourceAuthorization.security.test.ts",
];
export const CONSOLIDATED_ALLOWED_PATHS = [
  ...new Set([...featurePaths, ...integrationPaths]),
].sort();

/**
 * This successor is limited to the Phase A durable candidate lifecycle and
 * its release controller. Auth core, payments, providers, package metadata,
 * lockfiles, historical migrations, and unrelated routes remain excluded.
 */
const bodyCinemaPhaseAReleasePaths = [
  ".github/workflows/deploy.yml",
  "TODO.md",
  "client/src/pages/BodyCinemaLifecycle.test.tsx",
  "client/src/pages/TrailerStudio.tsx",
  "client/src/pages/VaultXDrop.tsx",
  "drizzle/0026_body_cinema_candidate_lifecycle.sql",
  "drizzle/meta/_journal.json",
  "scripts/bodyCinemaPhaseAMigration.test.ts",
  "scripts/bodyCinemaPhaseAMigration.ts",
  "scripts/check-video-studio-types.ts",
  "scripts/check-consolidated-release-types.ts",
  "scripts/consolidatedReleasePolicy.ts",
  "scripts/consolidatedReleaseRunner.ts",
  "scripts/consolidatedRelease.test.ts",
  "scripts/run-body-cinema-phase-a-tests.sh",
  "server/_core/index.ts",
  "server/routers/bodyCinemaCandidateLifecycleRouter.ts",
  "server/routers/bodyCinemaCandidatePlayback.ts",
  "server/routers/bodyCinemaRouter.ts",
  "server/routers/mediaAssets.ts",
  "server/services/bodyCinemaCandidateLifecycle.ts",
  "server/services/bodyCinemaCandidateLifecycle.test.ts",
  "server/services/bodyCinemaLifecycleBoundaries.test.ts",
  "server/services/creationProjectService.ts",
  "server/services/governedPolloService.test.ts",
  "server/services/polloCapabilityRegistryService.ts",
  "shared/bodyCinemaCandidateLifecycle.ts",
  "vitest.body-cinema-lifecycle.config.ts",
];
export const CONSOLIDATED_BODY_CINEMA_PHASE_A_ALLOWED_PATHS = [
  ...new Set(bodyCinemaPhaseAReleasePaths),
].sort();

function git(root: string, args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      timeout: 30000,
      maxBuffer: 4 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    }).trimEnd();
  } catch {
    throw new ReleaseFailure("CONSOLIDATED_GIT_PROOF_FAILED");
  }
}
function gitBytes(root: string, args: string[]): Buffer {
  try {
    return execFileSync("git", args, {
      cwd: root,
      timeout: 30000,
      maxBuffer: 4 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new ReleaseFailure("CONSOLIDATED_GIT_PROOF_FAILED");
  }
}
function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
export function assertConsolidatedPackage(
  before: unknown,
  after: unknown
): void {
  const { scripts: oldScripts, ...oldMetadata } = record(before);
  const { scripts: newScripts, ...newMetadata } = record(after);
  requireRelease(
    isDeepStrictEqual(oldMetadata, newMetadata),
    "DEPENDENCY_OR_PACKAGE_METADATA_CHANGE"
  );
  const expected = {
    ...record(oldScripts),
    "check:stripe-payouts": "tsx scripts/check-stripe-payout-types.ts",
    "check:persona-continuity": "tsx scripts/check-persona-continuity-types.ts",
    "check:video-studio": "tsx scripts/check-video-studio-types.ts",
    "test:stripe-payouts":
      "vitest run --config vitest.stripe-payouts.config.ts",
    "test:persona-continuity":
      "vitest run --config vitest.persona-continuity.config.ts",
    "test:video-studio": "vitest run --config vitest.video-studio.config.ts",
    "check:consolidated-release":
      "tsx scripts/check-consolidated-release-types.ts",
    "test:consolidated-release":
      "vitest run --config vitest.consolidated-release.config.ts",
  };
  requireRelease(
    isDeepStrictEqual(expected, newScripts),
    "UNAPPROVED_PACKAGE_SCRIPT_CHANGE"
  );
}

/** New owner-approved feature consolidation; the completed one-time JWT controller remains immutable. */
export function checkConsolidatedCheckout(
  workspace: string,
  sha: string,
  ref: string,
  event: string,
  before: string
): void {
  requireRelease(/^[a-f0-9]{40}$/.test(sha), "INVALID_RELEASE_SHA");
  requireRelease(
    ref === "refs/heads/main" && event === "push",
    "UNAPPROVED_CONSOLIDATED_TRIGGER"
  );
  requireRelease(
    before === CONSOLIDATED_RELEASE_CHECKOUT_PARENT,
    "UNAPPROVED_CONSOLIDATED_BASELINE"
  );
  const root = realpathSync(workspace);
  requireRelease(
    root !== APP_ROOT && !root.startsWith(`${APP_ROOT}/`),
    "DEPLOYMENT_WORKSPACE_OVERLAPS_APPLICATION"
  );
  requireRelease(
    git(root, ["rev-parse", "--show-toplevel"]) === root &&
      git(root, ["rev-parse", "HEAD"]) === sha,
    "CONSOLIDATED_CHECKOUT_IDENTITY_MISMATCH"
  );
  requireRelease(
    git(root, ["rev-parse", `${sha}^`]) ===
      CONSOLIDATED_RELEASE_CHECKOUT_PARENT,
    "CONSOLIDATED_RELEASE_PARENT_MISMATCH"
  );
  requireRelease(
    git(root, ["status", "--porcelain", "--untracked-files=all"]) === "",
    "DIRTY_CONSOLIDATED_CHECKOUT"
  );
  for (const required of [
    CONSOLIDATED_SECURITY_BASELINE,
    ...Object.values(APPROVED_FEATURE_HEADS),
  ])
    git(root, ["merge-base", "--is-ancestor", required, sha]);
  const names = git(root, [
    "diff",
    "--name-only",
    CONSOLIDATED_RELEASE_PARENT,
    sha,
  ])
    .split("\n")
    .filter(Boolean);
  const allowed = new Set(CONSOLIDATED_BODY_CINEMA_PHASE_A_ALLOWED_PATHS);
  requireRelease(
    names.length > 0 && names.every(name => allowed.has(name)),
    "UNAPPROVED_BODY_CINEMA_PHASE_A_PATH"
  );
  requireRelease(
    !git(root, [
      "diff",
      "--name-only",
      "--diff-filter=DR",
      CONSOLIDATED_RELEASE_PARENT,
      sha,
    ]),
    "BODY_CINEMA_PHASE_A_DELETE_OR_RENAME_FORBIDDEN"
  );
  for (const file of names) {
    const meta = lstatSync(path.join(root, file));
    requireRelease(
      meta.isFile() && !meta.isSymbolicLink() && meta.nlink === 1,
      "UNSAFE_CONSOLIDATED_SOURCE_FILE"
    );
    requireRelease(
      sha256(readFileSync(path.join(root, file))) ===
        sha256(gitBytes(root, ["show", `${sha}:${file}`])),
      "BODY_CINEMA_PHASE_A_SOURCE_BYTES_CHANGED"
    );
  }
  if (names.includes("server/services/localTrailerCut.ts")) {
    const localTrailerCut = readFileSync(
      path.join(root, "server/services/localTrailerCut.ts"),
      "utf8"
    );
    requireRelease(
      /localProofMode !== "1"\s*\|\|\s*environment\.NODE_ENV !== "test"\s*\|\|\s*enabled !== "1"/.test(
        localTrailerCut
      ) &&
        localTrailerCut.includes("LOCAL_TRAILER_CUT_CONFIGURATION_REJECTED") &&
        localTrailerCut.includes("CREATORVAULT_LOCAL_TRAILER_CUT_ENABLED"),
      "LOCAL_TRAILER_CUT_PRODUCTION_ENABLEMENT_FORBIDDEN"
    );
  }
  for (const file of ["pnpm-lock.yaml", "package-lock.json", "yarn.lock"])
    requireRelease(
      !git(root, [
        "diff",
        "--name-only",
        CONSOLIDATED_RELEASE_PARENT,
        sha,
        "--",
        file,
      ]),
      "LOCKFILE_CHANGED"
    );
  assertConsolidatedPackage(
    JSON.parse(
      git(root, ["show", `${CONSOLIDATED_SECURITY_BASELINE}:package.json`])
    ) as unknown,
    JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as unknown
  );
  for (const [file, hash] of Object.entries(APPROVED_MIGRATION_HASHES))
    requireRelease(
      sha256(readFileSync(path.join(root, file))) === hash,
      "APPROVED_MIGRATION_BYTES_CHANGED"
    );
  for (const [file, hash] of Object.entries(
    BODY_CINEMA_PHASE_A_MIGRATION_HASHES
  ))
    requireRelease(
      sha256(readFileSync(path.join(root, file))) === hash,
      "BODY_CINEMA_PHASE_A_MIGRATION_BYTES_CHANGED"
    );
  for (const file of [
    "server/_core/trpc.ts",
    "server/_core/authorizationPolicy.ts",
    "server/_core/authenticationRoutes.ts",
  ])
    requireRelease(
      sha256(readFileSync(path.join(root, file))) ===
        sha256(
          gitBytes(root, ["show", `${CONSOLIDATED_SECURITY_BASELINE}:${file}`])
        ),
      "CORE_AUTHENTICATION_BYTES_CHANGED"
    );
  const oldInventory = JSON.parse(
    git(root, [
      "show",
      `${CONSOLIDATED_SECURITY_BASELINE}:scripts/security-privileged-procedures.json`,
    ])
  ) as unknown;
  const actual = collectPrivilegedProcedurePaths(root);
  requireRelease(
    Array.isArray(oldInventory) &&
      oldInventory.every(
        item => typeof item === "string" && actual.includes(item)
      ),
    "PRIVILEGED_PROCEDURE_REMOVED_OR_UNGUARDED"
  );
  const expectedInventory = JSON.parse(
    readFileSync(
      path.join(root, "scripts/security-privileged-procedures.json"),
      "utf8"
    )
  ) as unknown;
  requireRelease(
    isDeepStrictEqual(actual, expectedInventory) &&
      actual.includes("personaVault.approveVideoChain") &&
      actual.includes("personaVault.reconcileVideoChainSegment"),
    "PRIVILEGED_INVENTORY_MISMATCH"
  );
  const entry = readFileSync(path.join(root, "server/_core/index.ts"), "utf8");
  requireRelease(
    entry.includes("registerAuthenticationRoutes(app)") &&
      !entry.includes("local_kingcam_6"),
    "DEVELOPMENT_LOGIN_REINTRODUCED"
  );
  for (const file of [
    "server/routers/personaVaultRouter.ts",
    "server/services/personaVaultContracts.ts",
    "server/services/governedPolloService.ts",
    "server/routers/governedPolloRouter.ts",
  ])
    requireRelease(
      !/OWNER_IDS|\[6,\s*33\]/.test(
        readFileSync(path.join(root, file), "utf8")
      ),
      "NUMERIC_OWNER_AUTHORITY_REINTRODUCED"
    );
}
