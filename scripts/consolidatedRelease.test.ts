import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  requiresFailureStop,
  validControllerArguments,
  type ReleaseState,
} from "./consolidatedReleaseRunner";

const SHA = "a".repeat(40);
const root = path.resolve(import.meta.dirname, "..");
const source = readFileSync(
  path.join(root, "scripts/consolidatedReleaseRunner.ts"),
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

  it("keeps root protections, backup-before-migration, and one guarded reload explicit", () => {
    expect(source).toContain("CONSOLIDATED_ROOT_CONTEXT_REQUIRED");
    expect(source).toContain("assertRootPrivateFile(lock");
    expect(source).toContain("CONSOLIDATED_BACKUP_TOOL_UNAVAILABLE");
    expect(source).toContain("beforeApply: async");
    expect(source).toContain("protectedDatabaseBackup");
    expect(
      source.match(/\[\s*"reload",\s*"creatorvault",\s*"--update-env",?\s*\]/g)
    ).toHaveLength(1);
    expect(source).toContain("CONSOLIDATED_AUTHORITATIVE_ENV_CHANGED");
  });
});
