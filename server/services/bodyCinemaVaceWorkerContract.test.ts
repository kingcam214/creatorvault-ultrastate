import { describe, expect, it } from "vitest";
import {
  VACE_MODEL_KEY,
  buildVaceMaskedEditContract,
  vaceContractFingerprint,
} from "./bodyCinemaVaceWorkerContract";

const source = {
  sourceUrl: "https://creatorvault.live/uploads/source.mp4",
  sourceChecksum: "a".repeat(64),
  evidenceId: "evidence-1",
  sourceMapId: "source-map-1",
  editBlueprintId: "blueprint-1",
  clipStartMs: 8_000,
  clipEndMs: 13_000,
};

describe("Body Cinema VACE worker contract", () => {
  it("builds a short masked lighting-only edit contract that preserves every protected source fact", () => {
    const contract = buildVaceMaskedEditContract({
      jobKey: "vace-job-1",
      source,
      aspectRatio: "9:16",
      changeSet: "lighting_only",
    });

    expect(contract.modelKey).toBe(VACE_MODEL_KEY);
    expect(contract.output.preserveSourceAudio).toBe(true);
    expect(contract.changeSet.prohibitedChanges).toContain("identity_or_face_change");
    expect(contract.noPromptExtension).toBe(true);
    expect(contract.noAutomaticRetry).toBe(true);
    expect(vaceContractFingerprint(contract)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects a segment longer than the source-preserving VACE maximum", () => {
    expect(() => buildVaceMaskedEditContract({
      jobKey: "vace-job-2",
      source: { ...source, clipEndMs: 13_001 },
      aspectRatio: "9:16",
      changeSet: "lighting_only",
    })).toThrow(/limited to 5-second source segments/);
  });

  it("rejects any unapproved change set before worker dispatch", () => {
    expect(() => buildVaceMaskedEditContract({
      jobKey: "vace-job-4",
      source,
      aspectRatio: "9:16",
      changeSet: "invent_camera_move" as any,
    })).toThrow(/approved lighting-only change set/);
  });
});
