import "./_core/securityTestSetup";
import { describe, expect, it } from "vitest";
import { directiveDraftToClear } from "../client/src/pages/KingCamClone";
import { resolveMediaPreview } from "../client/src/pages/MotionFlyerAgent";
import { normalizeSegments } from "./routers/captionStageRouter";
import { ownerDirectiveFromPayload } from "./routers/kingcamBrainRouter";
import { performerMediaAssetInput } from "./services/kingcamFullBodyPerformerService";

describe("TypeScript release-gate contract repairs", () => {
  it("clears only the known directive draft after a successful mutation", () => {
    expect(directiveDraftToClear("KingCam behavior deck")).toBe("behavior");
    expect(directiveDraftToClear("KingCam truth memory")).toBe("truth");
    expect(directiveDraftToClear(undefined)).toBeNull();
    expect(directiveDraftToClear("unrelated focus")).toBeNull();
  });

  it("resolves both valid media-library and selected-layer preview shapes", () => {
    expect(
      resolveMediaPreview({
        id: "asset-1",
        fileName: "source.mp4",
        assetType: "video",
        publicUrl: null,
        storagePath: "/uploads/source.mp4",
      })
    ).toEqual({
      url: "/uploads/source.mp4",
      isVideo: true,
    });
    expect(
      resolveMediaPreview({
        url: "https://creatorvault.live/uploads/poster.png",
        mediaType: "image",
        role: "hero",
        fileName: "poster.png",
      })
    ).toEqual({
      url: "https://creatorvault.live/uploads/poster.png",
      isVideo: false,
    });
    expect(resolveMediaPreview(null)).toBeNull();
  });

  it("keeps valid caption timing while rejecting malformed provider segment values", () => {
    const segments = normalizeSegments([
      {
        start: "2",
        end: "3.6",
        text: "  Keep   the real timing. ",
        confidence: "0.88",
        speaker_id: "speaker-a",
        words: [
          {
            text: "Keep",
            start: 2,
            end: 2.3,
            confidence: 0.9,
            speaker_id: "speaker-a",
          },
          { text: "", start: 2.3, end: 2.5 },
        ],
      },
      { start: 4, end: 4.5, text: "   " },
      null,
    ]);

    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({
      start: 2,
      end: 3.6,
      text: "Keep",
      confidence: 0.88,
      speaker: "speaker-a",
    });
    expect(segments[0].words).toEqual([
      {
        text: "Keep",
        start: 2,
        end: 2.3,
        confidence: 0.9,
        speaker: "speaker-a",
      },
    ]);
  });

  it("reads owner directives only from object payloads with a string directive", () => {
    expect(
      ownerDirectiveFromPayload({ directive: "Do not invent outcomes." })
    ).toBe("Do not invent outcomes.");
    expect(ownerDirectiveFromPayload({ directive: 42 })).toBeNull();
    expect(ownerDirectiveFromPayload(null)).toBeNull();
    expect(ownerDirectiveFromPayload(["directive"])).toBeNull();
  });

  it("maps the public owner contract to the media-assets user_id contract", () => {
    expect(
      performerMediaAssetInput({
        ownerId: 33,
        workerJobId: "3bbf20d8-e8c5-4d1f-8d59-f4007c5e6e56",
        url: "https://creatorvault.live/uploads/performer.mp4",
        duration: 12.5,
      })
    ).toEqual({
      userId: 33,
      workerJobId: "3bbf20d8-e8c5-4d1f-8d59-f4007c5e6e56",
      url: "https://creatorvault.live/uploads/performer.mp4",
      duration: 12.5,
    });
  });
});
