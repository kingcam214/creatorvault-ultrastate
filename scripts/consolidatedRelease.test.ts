import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  alreadyAppliedSchemaMatches,
  BASELINE_STATIC_HOMEPAGE_ASSETS,
  isBaselineStaticHomepagePath,
  requiresFailureStop,
  validControllerArguments,
  type ReleaseState,
} from "./consolidatedReleaseRunner";
import {
  CONSOLIDATED_RELEASE_CHECKOUT_PARENT,
  CONSOLIDATED_RELEASE_PARENT,
  CONSOLIDATED_SECURITY_BASELINE,
  CONSOLIDATED_BODY_CINEMA_PHASE_A_ALLOWED_PATHS,
  checkConsolidatedCheckout,
} from "./consolidatedReleasePolicy";

const SHA = "a".repeat(40);
const root = path.resolve(import.meta.dirname, "..");
const source = readFileSync(
  path.join(root, "scripts/consolidatedReleaseRunner.ts"),
  "utf8"
);
const policySource = readFileSync(
  path.join(root, "scripts/consolidatedReleasePolicy.ts"),
  "utf8"
);

function state(phase: ReleaseState["phase"]): ReleaseState {
  return { sha: SHA, phase, code: "SYNTHETIC_FIXED_CODE" };
}

describe("consolidated non-rotating guarded release", () => {
  it("contains no second JWT rotation or .env rewrite path", () => {
    expect(source).not.toContain("randomBytes(");
    expect(source).not.toContain("replaceJwtKey");
    expect(source).not.toContain("atomicPersistKey");
    expect(source).toContain("jwtRotation: false");
    expect(source).toContain("activateConsolidatedSigningSource");
    expect(source).toContain("assertNewKey(key)");
  });

  it("pins the verified 552 live baseline and exact corrective checkout parent while preserving the 3762 signing epoch", () => {
    expect(CONSOLIDATED_RELEASE_PARENT).toBe(
      "552aee6aa27a79c717e96b60fefa72703deeb356"
    );
    expect(CONSOLIDATED_RELEASE_CHECKOUT_PARENT).toBe(
      "320d5012d6555b9c576c2164cb0e6d5aff739b2b"
    );
    expect(CONSOLIDATED_SECURITY_BASELINE).toBe(
      "3762e69c7bf5e59b3e6070085f2fbd4b3fb2c8da"
    );
    expect(policySource).toContain("CONSOLIDATED_RELEASE_PARENT_MISMATCH");
    expect(source).toContain("assertLiveConsolidatedRelease");
    expect(source).toContain("CONSOLIDATED_ACTIVE_RELEASE_SECURITY_UNPROVEN");
    expect(source).toContain("rollbackArtifact: priorArtifactPath()");
  });

  it("runs the unchanged private lifecycle fixture with the existing noninteractive root boundary", () => {
    const workflow = readFileSync(
      path.join(root, ".github/workflows/deploy.yml"),
      "utf8"
    );
    const lifecycleStep = workflow
      .split("- name: Native Body Cinema Phase A lifecycle regressions")[1]
      ?.split("- name:")[0];
    expect(lifecycleStep).toContain(
      'sudo -n env PATH="$PATH" bash "$GITHUB_WORKSPACE/scripts/run-body-cinema-phase-a-tests.sh"'
    );
    expect(lifecycleStep).not.toContain("continue-on-error");
    expect(workflow).toContain(
      `checkout_parent='${CONSOLIDATED_RELEASE_CHECKOUT_PARENT}'`
    );
    expect(workflow).toContain(
      'test "$CREATORVAULT_RELEASE_BEFORE" = "$checkout_parent"'
    );
    expect(workflow).toContain(
      'test "$(git rev-parse "$GITHUB_SHA^")" = "$checkout_parent"'
    );
    const harness = readFileSync(
      path.join(root, "scripts/run-body-cinema-phase-a-tests.sh"),
      "utf8"
    );
    expect(harness).toContain('mkdir -m 700 "$fixture"');
    expect(harness).toContain("trap cleanup EXIT");
    expect(harness).toContain("--skip-networking");
    expect(harness).toContain("env -i PATH=");
    expect(CONSOLIDATED_BODY_CINEMA_PHASE_A_ALLOWED_PATHS).toHaveLength(28);
  });

  it("rejects every other push predecessor before accepting a checkout", () => {
    for (const before of [
      CONSOLIDATED_RELEASE_PARENT,
      "afffb824a2eb8f111a55bf73db45eaaab49d0c94",
      "f".repeat(40),
    ])
      expect(() =>
        checkConsolidatedCheckout(root, SHA, "refs/heads/main", "push", before)
      ).toThrow("UNAPPROVED_CONSOLIDATED_BASELINE");
  });

  it("allows only the reviewed Phase A lifecycle and exact-parent controller closure", () => {
    for (const allowed of [
      "drizzle/0026_body_cinema_candidate_lifecycle.sql",
      "scripts/bodyCinemaPhaseAMigration.ts",
      "scripts/bodyCinemaPhaseAMigration.test.ts",
      "scripts/run-body-cinema-phase-a-tests.sh",
      "server/routers/bodyCinemaCandidateLifecycleRouter.ts",
      "server/services/bodyCinemaCandidateLifecycle.ts",
      "server/services/governedPolloService.test.ts",
      "server/services/polloCapabilityRegistryService.ts",
      "shared/bodyCinemaCandidateLifecycle.ts",
      "scripts/consolidatedReleaseRunner.ts",
      ".github/workflows/deploy.yml",
    ])
      expect(CONSOLIDATED_BODY_CINEMA_PHASE_A_ALLOWED_PATHS).toContain(allowed);
    for (const blocked of [
      "package.json",
      "drizzle/schema.ts",
      "server/routers/stripeCheckout.ts",
      "server/services/personaVideoProvider.ts",
      "server/_core/authenticationRoutes.ts",
    ])
      expect(CONSOLIDATED_BODY_CINEMA_PHASE_A_ALLOWED_PATHS).not.toContain(
        blocked
      );
  });

  it("holds the verified security baseline on pre-activation failure and fails closed only after activation intent", () => {
    expect(requiresFailureStop(state("preflight"))).toBe(false);
    expect(requiresFailureStop(state("migrating"))).toBe(false);
    expect(requiresFailureStop(state("activation-intent"))).toBe(true);
    expect(requiresFailureStop(state("ready"))).toBe(true);
    expect(requiresFailureStop(state("failed"))).toBe(true);
    expect(requiresFailureStop(state("verified"))).toBe(false);
    expect(source).toContain('pm2", ["stop", "creatorvault"]');
    expect(source).not.toContain('pm2", ["delete", "creatorvault"]');
  });

  it("requires durable verified boot or ready plus the transient supervisor", () => {
    expect(source).toContain('state.phase === "verified"');
    expect(source).toContain('state.phase === "ready" && (await systemdActive');
    expect(source).toContain("CONSOLIDATED_BOOT_REQUIRES_ACTIVE_SUPERVISOR");
    expect(source).toContain("CONSOLIDATED_SECURITY_BASELINE_RECORD_INVALID");
  });

  it("persists and cleans only the owned temporary verifier fixture", () => {
    expect(source).toContain("persistFixtureOwnership");
    expect(source).toContain("cleanupOwnedFixture");
    expect(source).toContain(
      "cleanupLoginVerifier(databaseUrl, sha, ownership.openId)"
    );
    expect(source).toContain("CONSOLIDATED_FIXTURE_OWNERSHIP_INVALID");
  });

  it("exposes a strict no-argv controller surface and fixed-code-only failures", () => {
    expect(validControllerArguments(["node", "controller"])).toBe(true);
    expect(
      validControllerArguments(["node", "controller", "--check-checkout"])
    ).toBe(true);
    expect(
      validControllerArguments(["node", "controller", "--supervised"])
    ).toBe(true);
    expect(
      validControllerArguments(["node", "controller", "--failure-stop"])
    ).toBe(true);
    expect(validControllerArguments(["node", "controller", "--unsafe"])).toBe(
      false
    );
    expect(
      validControllerArguments(["node", "controller", "--supervised", "extra"])
    ).toBe(false);
    expect(source).toContain("CONSOLIDATED_UNSUPPORTED_RELEASE_ARGUMENTS");
    expect(source).toContain("code: errorCode(error)");
  });

  it("recognizes only both exact already-applied inspector stems with nothing pending", () => {
    const names = [
      "0024_stripe_creator_net_payouts",
      "0025_persona_vault_chained_continuity",
    ];
    expect(
      alreadyAppliedSchemaMatches({ pending: [], alreadyApplied: names })
    ).toBe(true);
    expect(
      alreadyAppliedSchemaMatches({
        pending: [],
        alreadyApplied: [...names].reverse(),
      })
    ).toBe(true);
    for (const alreadyApplied of [
      [],
      names.slice(0, 1),
      [names[0]!, names[0]!],
      [...names, "unknown"],
      names.map(name => `drizzle/${name}.sql`),
      names.map(name => `${name}.sql`),
    ]) {
      expect(alreadyAppliedSchemaMatches({ pending: [], alreadyApplied })).toBe(
        false
      );
    }
    expect(
      alreadyAppliedSchemaMatches({
        pending: [names[0]!],
        alreadyApplied: names,
      })
    ).toBe(false);
  });
  it("keeps root protections, read-only legacy proof, a backup-gated Phase A migration, and one guarded reload explicit", () => {
    expect(source).toContain("CONSOLIDATED_ROOT_CONTEXT_REQUIRED");
    expect(source).toContain("assertRootPrivateFile(lock");
    expect(source).toContain("inspectConsolidatedMigrations");
    expect(source).toContain("verifyExistingApprovedAdditiveSchema");
    expect(source).toContain(
      "CONSOLIDATED_ADDITIVE_SCHEMA_NOT_ALREADY_APPLIED"
    );
    expect(source).not.toContain("applyConsolidatedMigrations");
    expect(source).toContain("applyBodyCinemaPhaseAMigration");
    expect(source).toContain("await protectedDatabaseBackup(");
    expect(source).toContain("CONSOLIDATED_BODY_CINEMA_BACKUP_PROOF_MISSING");
    expect(
      source.match(/\[\s*"reload",\s*"creatorvault",\s*"--update-env",?\s*\]/g)
    ).toHaveLength(1);
    expect(source).toContain("CONSOLIDATED_AUTHORITATIVE_ENV_CHANGED");
  });
  it("retains root, homepage, session, fresh-login, ordinary-role, and owner proofs", () => {
    for (const required of [
      "verifyHomepage",
      "CONSOLIDATED_RETAINED_SESSION_FAILED",
      "CONSOLIDATED_NATIVE_LOGIN_SIGNATURE_FAILED",
      "CONSOLIDATED_ORDINARY_OWNER_READ_NOT_DENIED",
      "CONSOLIDATED_OWNER_READ_FAILED",
      "CONSOLIDATED_DEVELOPMENT_LOGIN_NOT_RETIRED",
    ])
      expect(source).toContain(required);
  });
  it("permits the local trailer cut only under the existing test proof gate", () => {
    expect(policySource).toContain(
      "LOCAL_TRAILER_CUT_PRODUCTION_ENABLEMENT_FORBIDDEN"
    );
    expect(policySource).toContain('environment\\.NODE_ENV !== "test"');
  });
  it("launches the built controller with plain Node and a hook-free environment", () => {
    const launcher = readFileSync(
      path.join(root, "deploy_work_to_prod.sh"),
      "utf8"
    );
    expect(launcher).not.toContain("exec pnpm exec tsx");
    expect(launcher).toContain(
      'node "$PWD/dist/consolidated-release-runtime.mjs"'
    );
    for (const key of [
      "NODE_OPTIONS",
      "NODE_PATH",
      "NODE_DEBUG",
      "NODE_DEBUG_NATIVE",
      "LD_PRELOAD",
      "LD_LIBRARY_PATH",
    ])
      expect(launcher).toContain(`-u ${key}`);
    expect(source).toContain("CONSOLIDATED_UNTRUSTED_PRELOAD_ENVIRONMENT");
  });
  it("permits only exact hash-pinned unchanged static homepage files, never runtime uploads", () => {
    expect(Object.keys(BASELINE_STATIC_HOMEPAGE_ASSETS)).toHaveLength(4);
    for (const [relative, digest] of Object.entries(
      BASELINE_STATIC_HOMEPAGE_ASSETS
    )) {
      expect(isBaselineStaticHomepagePath(relative, false)).toBe(true);
      const bytes = readFileSync(path.join(root, "client", relative));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(digest);
    }
    for (const relative of [
      "uploads",
      "public/uploads/user.mp4",
      "public/uploads/vaultx/homepage-trailer/other.mp4",
      "public/logs",
      "public/.env",
      "public/uploads/../.env",
    ])
      expect(isBaselineStaticHomepagePath(relative, false)).toBe(false);
    expect(isBaselineStaticHomepagePath("public/uploads", true)).toBe(true);
    expect(
      isBaselineStaticHomepagePath("public/uploads/real-users", true)
    ).toBe(false);
    expect(source).toContain("CONSOLIDATED_STATIC_BASELINE_ASSET_CHANGED");
  });
});
