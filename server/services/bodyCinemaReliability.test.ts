import { describe, expect, it } from "vitest";
import {
  buildBodyCinemaGenerationLookup,
  buildVaultxCheckoutIdempotencyKey,
  hasCompleteVaultxCheckout,
  isSupportedBodyCinemaVideoSelection,
  normaliseBodyCinemaGenerationStatus,
  sanitiseBodyCinemaUploadFilename,
} from "./bodyCinemaReliability";

const baseIdentity = {
  userId: 33,
  imageUrl: "https://creatorvault.live/uploads/source-frame-a.jpg",
  prompt: "controlled orbit, warm editorial light",
  resolution: "720p",
  length: "6",
  mode: "pro",
} as const;

describe("Body Cinema generation reliability", () => {
  it.each(["succeed", "success", "succeeded", "completed", "complete", "done"])(
    "normalises ready status %s to succeed",
    status => {
      expect(normaliseBodyCinemaGenerationStatus(status)).toBe("succeed");
    },
  );

  it.each(["failed", "error", "cancelled", "canceled"])(
    "normalises terminal failure %s to failed",
    status => {
      expect(normaliseBodyCinemaGenerationStatus(status)).toBe("failed");
    },
  );

  it("keeps processing and unknown states distinct", () => {
    expect(normaliseBodyCinemaGenerationStatus("in_progress")).toBe("processing");
    expect(normaliseBodyCinemaGenerationStatus("running")).toBe("processing");
    expect(normaliseBodyCinemaGenerationStatus("queued")).toBe("waiting");
    expect(normaliseBodyCinemaGenerationStatus(null)).toBe("waiting");
  });

  it("matches reusable paid generations on every creator, source, prompt, and render field", () => {
    const lookup = buildBodyCinemaGenerationLookup({ ...baseIdentity, state: "ready" });
    expect(lookup.params).toEqual([
      33,
      baseIdentity.imageUrl,
      baseIdentity.prompt,
      "720p",
      "6",
      "pro",
    ]);
    expect(lookup.stateClause).toContain("LOWER(status) IN");
    expect(lookup.stateClause).toContain("videoUrl IS NOT NULL");
  });

  it("does not collapse a changed treatment or render configuration into the same reuse identity", () => {
    const original = buildBodyCinemaGenerationLookup({ ...baseIdentity, state: "ready" });
    const changedPrompt = buildBodyCinemaGenerationLookup({ ...baseIdentity, prompt: "cool noir edge light", state: "ready" });
    const changedResolution = buildBodyCinemaGenerationLookup({ ...baseIdentity, resolution: "1080p", state: "ready" });
    const changedDuration = buildBodyCinemaGenerationLookup({ ...baseIdentity, length: "10", state: "ready" });
    const changedMode = buildBodyCinemaGenerationLookup({ ...baseIdentity, mode: "standard", state: "ready" });

    expect(changedPrompt.params).not.toEqual(original.params);
    expect(changedResolution.params).not.toEqual(original.params);
    expect(changedDuration.params).not.toEqual(original.params);
    expect(changedMode.params).not.toEqual(original.params);
  });

  it("coalesces only nonterminal jobs with no finished video", () => {
    const lookup = buildBodyCinemaGenerationLookup({ ...baseIdentity, state: "in_flight" });
    expect(lookup.stateClause).toContain("LOWER(status) NOT IN");
    expect(lookup.stateClause).toContain("'failed'");
    expect(lookup.stateClause).toContain("'canceled'");
    expect(lookup.stateClause).toContain("videoUrl IS NULL OR videoUrl = ''");
  });
});

describe("Body Cinema release gating", () => {
  it("builds a stable package-scoped Stripe idempotency key", () => {
    expect(buildVaultxCheckoutIdempotencyKey(417)).toBe("vaultx-package-417-checkout-v1");
    expect(buildVaultxCheckoutIdempotencyKey(417)).toBe(buildVaultxCheckoutIdempotencyKey(417));
    expect(buildVaultxCheckoutIdempotencyKey(418)).not.toBe(buildVaultxCheckoutIdempotencyKey(417));
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects invalid package ID %s", packageId => {
    expect(() => buildVaultxCheckoutIdempotencyKey(packageId)).toThrow(/positive integer package ID/i);
  });

  it("requires both a checkout URL and persisted session before publication", () => {
    expect(hasCompleteVaultxCheckout({ checkout_url: "https://checkout.example/session", stripe_checkout_session_id: "cs_123" })).toBe(true);
    expect(hasCompleteVaultxCheckout({ checkout_url: "https://checkout.example/session" })).toBe(false);
    expect(hasCompleteVaultxCheckout({ stripe_checkout_session_id: "cs_123" })).toBe(false);
    expect(hasCompleteVaultxCheckout({ checkout_url: " ", stripe_checkout_session_id: "cs_123" })).toBe(false);
    expect(hasCompleteVaultxCheckout({ checkout_url: "https://checkout.example/session", stripe_checkout_session_id: " " })).toBe(false);
  });
});

describe("Body Cinema creator-owned video intake", () => {
  it("removes path traversal and unsafe filename characters", () => {
    expect(sanitiseBodyCinemaUploadFilename("../../private scene (final).MOV")).toBe("private_scene__final_.MOV");
    expect(sanitiseBodyCinemaUploadFilename("..\\..\\clip.webm")).toBe("clip.webm");
    expect(sanitiseBodyCinemaUploadFilename("....")).toBe("upload.mp4");
  });

  it.each([
    ["scene.mp4", "video/mp4"],
    ["scene.MOV", "video/quicktime"],
    ["scene.webm", "video/webm"],
    ["scene.mkv", "application/octet-stream"],
    ["scene.m4v", "video/x-m4v"],
  ])("accepts supported selection %s with %s", (filename, mime) => {
    expect(isSupportedBodyCinemaVideoSelection(filename, mime)).toBe(true);
  });

  it.each([
    ["scene.jpg", "image/jpeg"],
    ["scene.mp4", "image/jpeg"],
    ["scene.exe", "video/mp4"],
    ["scene", "video/mp4"],
    ["scene.mov", ""],
  ])("rejects unsupported selection %s with %s", (filename, mime) => {
    expect(isSupportedBodyCinemaVideoSelection(filename, mime)).toBe(false);
  });
});
