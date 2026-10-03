import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  APPROVED_RELEASE_PATHS,
  REQUIRED_LIVE_BASELINE,
  REQUIRED_RELEASE_PARENT,
  assertCheckout,
  assertRuntime,
  executeRelease,
  type CheckoutEvidence,
  type ReleaseEffects,
} from "./securityReleasePolicy";
import {
  assertClosure,
  assertPackagePolicy,
  collectReleaseReferences,
  REQUIRED_RELEASE_REFERENCES,
} from "./securityReleaseIntegrity";

const checkout = (patch: Partial<CheckoutEvidence> = {}): CheckoutEvidence => ({
  ref: "refs/heads/main",
  event: "push",
  before: REQUIRED_RELEASE_PARENT,
  sha: "a".repeat(40),
  head: "a".repeat(40),
  parent: REQUIRED_RELEASE_PARENT,
  commitCount: 1,
  baselineDiffPaths: [...APPROVED_RELEASE_PATHS],
  packageUnchanged: true,
  lockfileUnchanged: true,
  ...patch,
});
const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");
const files = [...APPROVED_RELEASE_PATHS, ...REQUIRED_RELEASE_REFERENCES];

describe("final immutable direct-baseline release integrity", () => {
  it("accepts the complete one-commit direct non-merge baseline child", () => {
    expect(() => assertCheckout(checkout())).not.toThrow();
    expect(() =>
      assertClosure({ existingPaths: files, referencedPaths: [], workflow })
    ).not.toThrow();
  });
  it.each([
    ["different parent", { parent: "b".repeat(40) }],
    ["merge commit", { parent: `${REQUIRED_RELEASE_PARENT} ${"b".repeat(40)}` }],
    ["extra commit", { commitCount: 2 }],
    [
      "extra file",
      {
        baselineDiffPaths: [
          ...APPROVED_RELEASE_PATHS,
          "server/features/new.ts",
        ],
      },
    ],
    [
      "missing workflow file",
      {
        baselineDiffPaths: APPROVED_RELEASE_PATHS.filter(
          p => p !== ".github/workflows/deploy.yml"
        ),
      },
    ],
    [
      "missing referenced script",
      {
        baselineDiffPaths: APPROVED_RELEASE_PATHS.filter(
          p => p !== "scripts/securityReleaseRunner.ts"
        ),
      },
    ],
    ["old live baseline is not current main", { before: REQUIRED_LIVE_BASELINE }],
    ["wrong push parent", { before: "b".repeat(40) }],
    ["different checked-out SHA", { head: "b".repeat(40) }],
    [
      "duplicate allowed path",
      {
        baselineDiffPaths: [
          ...APPROVED_RELEASE_PATHS.slice(1),
          APPROVED_RELEASE_PATHS[1],
        ],
      },
    ],
    ["dependency change", { packageUnchanged: false }],
    ["lockfile change", { lockfileUnchanged: false }],
  ] satisfies [string, Partial<CheckoutEvidence>][])(
    "rejects %s fail-closed",
    (_name, patch) => {
      expect(() => assertCheckout(checkout(patch))).toThrow();
    }
  );
  it("rejects missing workflow even when a caller claims the diff is approved", () => {
    expect(() =>
      assertClosure({
        existingPaths: files.filter(p => p !== ".github/workflows/deploy.yml"),
        referencedPaths: [],
        workflow,
      })
    ).toThrow("MISSING_WORKFLOW_FILE");
  });
  it("rejects a missing referenced script", () => {
    expect(() =>
      assertClosure({
        existingPaths: files.filter(
          p => p !== "scripts/securityReleaseRunner.ts"
        ),
        referencedPaths: [],
        workflow,
      })
    ).toThrow("MISSING_REFERENCED_RELEASE_FILE");
  });
  it("rejects a new dangling workflow reference", () => {
    expect(() =>
      assertClosure({
        existingPaths: files,
        referencedPaths: ["scripts/not-committed.ts"],
        workflow,
      })
    ).toThrow("MISSING_REFERENCED_RELEASE_FILE");
  });
  it("uses complete JSON/script/config filename tokens without truncated suffixes", () => {
    expect(
      collectReleaseReferences([
        '"scripts/security-privileged-procedures.json"; pnpm exec tsx scripts/securityReleaseRunner.ts',
        "vitest.security.config.ts scripts/not-a-source.ts.bak",
      ])
    ).toEqual([
      "scripts/security-privileged-procedures.json",
      "scripts/securityReleaseRunner.ts",
      "vitest.security.config.ts",
    ]);
  });
  it("rejects stale intermediate SHA conditions", () => {
    expect(() =>
      assertClosure({
        existingPaths: files,
        referencedPaths: [],
        workflow: workflow + "\n# parent 3076e8c",
      })
    ).toThrow("STALE_INTERMEDIATE_LINEAGE");
  });
  it("rejects a removed release-integrity gate", () => {
    expect(() =>
      assertClosure({
        existingPaths: files,
        referencedPaths: [],
        workflow: workflow.replace(
          "pnpm exec tsx scripts/securityReleaseIntegrity.ts",
          "true"
        ),
      })
    ).toThrow("WORKFLOW_INTEGRITY_GATE_MISSING");
  });
  it("rejects build before mandatory type check", () => {
    expect(() =>
      assertClosure({
        existingPaths: files,
        referencedPaths: [],
        workflow: workflow
          .replace("pnpm check\n", "TEMP_GATE\n")
          .replace("pnpm build\n", "pnpm check\n")
          .replace("TEMP_GATE\n", "pnpm build\n"),
      })
    ).toThrow();
  });
  it("bounds both compiler heaps at 1536 MiB without changing commands or failure gates", () => {
    for (const [name, command] of [
      ["Strict security type check", "pnpm check:security"],
      ["Mandatory whole-project type check", "pnpm check"],
    ]) {
      const block = workflow.split(`- name: ${name}\n`)[1]?.split("\n      - name:")[0];
      expect(block).toContain("NODE_OPTIONS: --max-old-space-size=1536");
      expect(block).toContain("set -euo pipefail");
      expect(block).toContain(`\n          ${command}\n`);
    }
    expect(workflow.match(/NODE_OPTIONS:/g)).toHaveLength(2);
    expect(workflow).not.toMatch(/continue-on-error|\|\|\s*true|always\(\)/);
    expect(workflow.indexOf("pnpm check\n")).toBeLessThan(workflow.indexOf("pnpm build\n"));
    expect(workflow.indexOf("pnpm build\n")).toBeLessThan(workflow.indexOf('bash "$GITHUB_WORKSPACE/deploy_work_to_prod.sh"'));
  });
  const basePackage = {
    dependencies: { pinned: "1.0.0" },
    devDependencies: { compiler: "1.0.0" },
    scripts: { check: "tsc --noEmit", build: "vite build" },
  };
  const finalPackage = {
    ...basePackage,
    scripts: {
      ...basePackage.scripts,
      "test:security": "vitest run --config vitest.security.config.ts",
      "check:security": "tsx scripts/check-security-types.ts",
    },
  };
  it("allows only the approved security command additions", () => {
    expect(() => assertPackagePolicy(basePackage, finalPackage)).not.toThrow();
  });
  it.each([
    { ...finalPackage, dependencies: { pinned: "2.0.0" } },
    { ...finalPackage, scripts: { ...finalPackage.scripts, build: "true" } },
    { ...finalPackage, private: false },
  ])("rejects altered dependency/script/metadata manifest", candidate => {
    expect(() => assertPackagePolicy(basePackage, candidate)).toThrow();
  });
});

function effects(trace: string[]): ReleaseEffects {
  return {
    preflight: async () => {
      trace.push("preflight");
    },
    stage: async () => {
      trace.push("stage");
    },
    activateSecureArtifact: async () => {
      trace.push("activate");
    },
    generateKey: async () => {
      trace.push("generate");
      return "0123456789abcdef".repeat(8);
    },
    persistKey: async (_key, mark) => {
      trace.push("write");
      mark();
    },
    reload: async () => {
      trace.push("reload");
    },
    verify: async () => {
      trace.push("verify");
    },
    clearSensitiveMemory: () => {
      trace.push("clear");
    },
  };
}
describe("final release mutation safety", () => {
  it("unknown runtime source stops before staging, key generation, write or reload", async () => {
    const trace: string[] = [];
    const fixture = effects(trace);
    fixture.preflight = async () => {
      trace.push("preflight");
      assertRuntime({
        status: "online",
        mode: "fork_mode",
        instances: 1,
        watch: false,
        pid: 4242,
        uid: 0,
        cwd: "/root/creatorvault",
        launcher: "/unknown/launcher",
        interpreter: "node",
        launcherMatchesApproved: false,
        actualNodeCommand: true,
        processKeyMatchesFile: true,
      });
    };
    expect(await executeRelease(fixture)).toMatchObject({
      ok: false,
      rotated: false,
      code: "UNKNOWN_RUNTIME_SOURCE",
    });
    expect(trace).toEqual(["preflight", "clear"]);
  });
  it("failed secret persistence stops before reload", async () => {
    const trace: string[] = [];
    const fixture = effects(trace);
    fixture.persistKey = async () => {
      trace.push("write-failed");
      throw new Error("synthetic write failure");
    };
    expect(await executeRelease(fixture)).toMatchObject({
      ok: false,
      rotated: false,
      phase: "persistence",
    });
    expect(trace).not.toContain("reload");
    expect(trace).not.toContain("verify");
  });
});
