import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  LocalTrailerCutError,
  localTrailerCutAvailability,
  requestedLocalCutDuration,
} from "./localTrailerCut";

describe("Local Trailer Cut", () => {
  it("enables only in the disposable test proof environment", () => {
    expect(
      localTrailerCutAvailability({
        NODE_ENV: "test",
        CREATORVAULT_LOCAL_PROOF_MODE: "1",
        CREATORVAULT_LOCAL_TRAILER_CUT_ENABLED: "1",
        CREATORVAULT_LOCAL_PROOF_STORAGE_ROOT:
          "/tmp/creatorvault-cv-video-026-fixture",
      })
    ).toBe(true);
    expect(localTrailerCutAvailability({ NODE_ENV: "production" })).toBe(false);
    expect(() =>
      localTrailerCutAvailability({
        NODE_ENV: "production",
        CREATORVAULT_LOCAL_PROOF_MODE: "1",
        CREATORVAULT_LOCAL_TRAILER_CUT_ENABLED: "1",
        CREATORVAULT_LOCAL_PROOF_STORAGE_ROOT:
          "/tmp/creatorvault-cv-video-026-fixture",
      })
    ).toThrow(LocalTrailerCutError);
  });

  it("keeps encoding disabled during storage-only visual proof", () => {
    for (const enabled of [undefined, "", "0"]) {
      expect(
        localTrailerCutAvailability({
          NODE_ENV: "test",
          CREATORVAULT_LOCAL_PROOF_MODE: "1",
          CREATORVAULT_LOCAL_TRAILER_CUT_ENABLED: enabled,
          CREATORVAULT_LOCAL_PROOF_STORAGE_ROOT:
            "/tmp/creatorvault-cv-video-026-fixture",
        })
      ).toBe(false);
    }
    expect(() =>
      localTrailerCutAvailability({
        NODE_ENV: "test",
        CREATORVAULT_LOCAL_PROOF_MODE: "1",
        CREATORVAULT_LOCAL_TRAILER_CUT_ENABLED: "unexpected",
      })
    ).toThrow(LocalTrailerCutError);
  });

  it("derives a bounded cut duration from actual saved scene timing", () => {
    expect(
      requestedLocalCutDuration(
        [{ durationSeconds: 3 }, { duration: 4.5 }, { durationSeconds: 20 }],
        12
      )
    ).toBe(12);
    expect(requestedLocalCutDuration([], 4.2)).toBe(4.2);
    expect(() => requestedLocalCutDuration([], 0)).toThrow(
      "LOCAL_TRAILER_CUT_SOURCE_DURATION_INVALID"
    );
  });

  it("uses explicit process arguments and test-only local storage rather than a provider or shell command", () => {
    const sourcePath = fileURLToPath(
      new URL("./localTrailerCut.ts", import.meta.url)
    );
    const source = readFileSync(sourcePath, "utf8");
    expect(source).toContain("execFileAsync(");
    expect(source).toContain('"-nostdin"');
    expect(source).toContain("LOCAL_TRAILER_CUT_UNAVAILABLE");
    expect(source).toContain("CREATORVAULT_LOCAL_TRAILER_CUT_ENABLED");
    expect(source).toContain("force_original_aspect_ratio=decrease");
    expect(source).not.toContain("stripe");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("exec(");
  });
});
