import { describe, expect, it } from "vitest";
import { resolveLocalProofUploadStorage } from "../server/routers/videoUploadRouter";

describe("CV-VIDEO-026 local proof upload storage", () => {
  it("permits only the disposable test root and a relative local upload URL", () => {
    expect(
      resolveLocalProofUploadStorage({
        enabled: "1",
        nodeEnv: "test",
        root: "/tmp/creatorvault-cv-video-026-fixture",
        tempDirectory: "/tmp",
      })
    ).toEqual({
      durableUploadsDir: "/tmp/creatorvault-cv-video-026-fixture/content-vault",
      privateReceiptsDir:
        "/tmp/creatorvault-cv-video-026-fixture/content-vault-receipts",
      publicUploadBase: "/uploads/content-vault",
    });
  });

  it("rejects non-test, non-local, and URI-shaped storage targets", () => {
    for (const input of [
      {
        enabled: "1",
        nodeEnv: "production",
        root: "/tmp/creatorvault-cv-video-026-fixture",
      },
      { enabled: "1", nodeEnv: "test", root: "/root/uploads" },
      {
        enabled: "1",
        nodeEnv: "test",
        root: "https://creatorvault.live/uploads",
      },
      {
        enabled: "0",
        nodeEnv: "test",
        root: "/tmp/creatorvault-cv-video-026-fixture",
      },
    ]) {
      expect(() => resolveLocalProofUploadStorage(input)).toThrow(
        "LOCAL_PROOF_STORAGE_CONFIGURATION_REJECTED"
      );
    }
  });
});
