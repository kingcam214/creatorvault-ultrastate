import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { creatorVideoStudioSourcePath } from "@/pages/CreatorVideoStudio";
import {
  directionPreviewPath,
  directionSceneLabel,
  trailerMakerSourcePath,
  workspaceEditPath,
} from "@/components/TrailerDirectionPreview";

describe("Trailer Direction Preview", () => {
  it("preserves the exact source and workspace identities in every offered internal route", () => {
    const sourceId = "source asset/id";
    const workspaceId = "00000000-0000-4000-8000-000000000001";

    expect(creatorVideoStudioSourcePath(sourceId)).toBe(
      "/creator/video-studio?sourceAssetId=source%20asset%2Fid"
    );
    expect(trailerMakerSourcePath(sourceId)).toBe(
      "/trailer-maker?sourceAssetId=source%20asset%2Fid"
    );
    expect(directionPreviewPath(workspaceId)).toBe(
      "/creator/workspace?draft=00000000-0000-4000-8000-000000000001&view=direction"
    );
    expect(workspaceEditPath(workspaceId)).toBe(
      "/creator/workspace?draft=00000000-0000-4000-8000-000000000001"
    );
  });

  it("uses saved scene values without making up titles or timing", () => {
    expect(
      directionSceneLabel({
        sceneIndex: 2,
        role: "opening_hook",
        durationSeconds: 3,
        overlayText: "Saved hook",
        visualDescription: null,
        sourceAssetId: "source-1",
      })
    ).toBe("opening hook");
    expect(
      directionSceneLabel({
        sceneIndex: 2,
        role: null,
        durationSeconds: null,
        overlayText: null,
        visualDescription: null,
        sourceAssetId: null,
      })
    ).toBe("Scene 3");
  });

  it("keeps the required truth labels and excludes owner-only or execution destinations", () => {
    const previewPath = fileURLToPath(
      new URL("../components/TrailerDirectionPreview.tsx", import.meta.url)
    );
    const previewSource = readFileSync(previewPath, "utf8");

    expect(previewSource).toContain("Your source video is saved.");
    expect(previewSource).toContain("Your trailer direction is saved.");
    expect(previewSource).toContain(
      "This is a direction preview using your original source video."
    );
    expect(previewSource).toContain(
      "A generated or exported trailer has not been created."
    );
    expect(previewSource).toContain("Create local trailer cut");
    expect(previewSource).toContain("Saved local trailer cut");
    expect(previewSource).toContain("pending owner review");
    expect(previewSource).toContain("does not generate");
    expect(previewSource).toContain("footage, call a provider");
    expect(previewSource).toContain(
      "Nothing has been published, sold, or sent."
    );
    expect(previewSource).toContain("/creator/video-studio?sourceAssetId=");
    expect(previewSource).toContain("/trailer-maker?sourceAssetId=");
    expect(previewSource).not.toContain("/kingcam/vault");
    expect(previewSource).not.toContain("/king/media-vault");
    expect(previewSource).not.toContain("renderCaptionedMaster");
    expect(previewSource).not.toContain("stripe");
    expect(previewSource).not.toContain("kingcam");
  });

  it("reads trailer direction only from the current creator’s existing project record", () => {
    const routerPath = fileURLToPath(
      new URL("../../../server/routers/mediaAssets.ts", import.meta.url)
    );
    const routerSource = readFileSync(routerPath, "utf8");

    expect(routerSource).toContain("getTrailerProject: protectedProcedure");
    expect(routerSource).toContain("AND user_id = ${ctx.user.id}");
    expect(routerSource).toContain('project_type <> ${"creator_workspace"}');
    expect(routerSource).toContain("scenes_json");
    expect(routerSource).toContain("trailerDirectionFromRow");
  });

  it("keeps local output creation in the owned workspace router and test-only local FFmpeg lane", () => {
    const workspaceRouterPath = fileURLToPath(
      new URL("../../../server/routers/creatorWorkspace.ts", import.meta.url)
    );
    const workspaceRouter = readFileSync(workspaceRouterPath, "utf8");
    expect(workspaceRouter).toContain(
      "createLocalTrailerCut: protectedProcedure"
    );
    expect(workspaceRouter).toContain("getLocalTrailerCut: protectedProcedure");
    expect(workspaceRouter).toContain('project_type = ${"local_trailer_cut"}');
    expect(workspaceRouter).toContain('ownerDecision: "awaiting_owner_review"');
    expect(workspaceRouter).not.toContain("marketplace_products");
  });
});
