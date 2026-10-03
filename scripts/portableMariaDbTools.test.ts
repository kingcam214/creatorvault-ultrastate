import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PortableDbToolError,
  libraryPathForArchitecture,
  portableDownloadArgs,
  portableMariaDbServiceEnvironment,
  preparePortableMariaDbTools,
  requireRoot,
  validPortableMariaDbCliArguments,
} from "./portableMariaDbTools";

const source = readFileSync(
  path.join(import.meta.dirname, "portableMariaDbTools.ts"),
  "utf8"
);
const SHA = "a".repeat(40);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("portable MariaDB tool preparation", () => {
  it("keeps the apt plan download-only and private to the supplied archive path", () => {
    const root = "/tmp/creatorvault-regressions.unit";
    const args = portableDownloadArgs(root);
    const installIndex = args.indexOf("install");
    const downloadOnlyIndex = args.indexOf("--download-only");

    expect(downloadOnlyIndex).toBeGreaterThanOrEqual(0);
    expect(args).toContain("APT::Get::Download-Only=true");
    expect(args).toContain("--no-install-recommends");
    expect(args).toContain(`Dir::Cache::archives=${root}/archives`);
    expect(args).toContain(
      `Dir::Cache::archives::partial=${root}/archives/partial`
    );
    expect(installIndex).toBeGreaterThan(downloadOnlyIndex);
    expect(args).toContain("mariadb-server-core");
    expect(args).toContain("mariadb-client");
    expect(args).toContain("mariadb-common");
    expect(args).not.toContain("upgrade");
    expect(args).not.toContain("remove");
    expect(args.join(" ")).not.toMatch(/--force|allow-unauthenticated/i);
  });

  it("maps supported native architectures without consulting host state", () => {
    expect(libraryPathForArchitecture("x64")).toBe("x86_64-linux-gnu");
    expect(libraryPathForArchitecture("amd64")).toBe("x86_64-linux-gnu");
    expect(libraryPathForArchitecture("arm64")).toBe("aarch64-linux-gnu");
    expect(libraryPathForArchitecture("aarch64-linux-gnu")).toBe(
      "aarch64-linux-gnu"
    );
    expect(() => libraryPathForArchitecture("../../unsafe")).toThrow(
      "PORTABLE_DB_ARCHITECTURE_UNSUPPORTED"
    );
  });

  it("requires a root caller before it inspects the requested filesystem tree", async () => {
    const originalGetuid = process.getuid;
    Object.defineProperty(process, "getuid", {
      configurable: true,
      value: (): number => 1000,
    });
    try {
      expect(() => requireRoot()).toThrow(PortableDbToolError);
      await expect(
        preparePortableMariaDbTools("/tmp/creatorvault-regressions.unit")
      ).rejects.toMatchObject({ code: "PORTABLE_DB_ROOT_REQUIRED" });
    } finally {
      Object.defineProperty(process, "getuid", {
        configurable: true,
        value: originalGetuid,
      });
    }
  });

  it("accepts only the exact two CLI root families", () => {
    expect(
      validPortableMariaDbCliArguments([
        "--prepare",
        "/tmp/creatorvault-regressions.owned_fixture",
      ])
    ).toBe(true);
    expect(
      validPortableMariaDbCliArguments([
        "--prepare",
        `/root/creatorvault/.consolidated-release-control-${SHA}/portable-db-tools`,
      ])
    ).toBe(true);
    expect(
      validPortableMariaDbCliArguments([
        "--prepare",
        "/tmp/creatorvault-regressions.owned_fixture/child",
      ])
    ).toBe(false);
    expect(
      validPortableMariaDbCliArguments([
        "--prepare",
        "/root/creatorvault/.consolidated-release-control-not-a-sha/portable-db-tools",
      ])
    ).toBe(false);
    expect(
      validPortableMariaDbCliArguments([
        "--prepare",
        "/tmp/creatorvault-regressions.owned_fixture",
        "extra",
      ])
    ).toBe(false);
  });

  it("constructs child-only service environment without retaining Node preload settings", () => {
    const original = process.env.LD_LIBRARY_PATH;
    const environment = portableMariaDbServiceEnvironment("/private/libraries");

    expect(environment.LD_LIBRARY_PATH).toBe("/private/libraries");
    expect(environment.NODE_OPTIONS).toBeUndefined();
    expect(environment.NODE_PATH).toBeUndefined();
    expect(environment.LD_PRELOAD).toBeUndefined();
    expect(process.env.LD_LIBRARY_PATH).toBe(original);
  });

  it("contains fixed-code-only command handling and an exact direct-script guard", () => {
    expect(source).toContain('"--download-only"');
    expect(source).toContain('"download"');
    expect(source).toContain("stdio: [\"ignore\", \"pipe\", \"pipe\"]");
    expect(source).toContain('basename !== "portableMariaDbTools.ts"');
    expect(source).toContain('basename !== "portable-root-tools.mjs"');
    expect(source).not.toContain("process.env.LD_LIBRARY_PATH =");
  });
});
