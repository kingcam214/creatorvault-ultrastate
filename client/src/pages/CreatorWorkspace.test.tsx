import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  emptyWorkspace,
  isCreatorVaultSource,
  trailerMakerPath,
} from "@/pages/CreatorWorkspace";

describe("Creator workspace", () => {
  it("starts with empty creator-owned context and hands the exact source id to Trailer Maker", () => {
    expect(emptyWorkspace()).toMatchObject({
      entityName: "",
      primaryPromise: "",
      visualIdentityAssetId: null,
    });
    expect(trailerMakerPath("source asset/id")).toBe(
      "/trailer-maker?sourceAssetId=source%20asset%2Fid"
    );
  });

  it("accepts only a ready, hosted, ordinary creator upload as the delivery source", () => {
    const usable = {
      id: "source-1",
      assetType: "video",
      mimeType: "video/mp4",
      fileName: "creator-source.mp4",
      sourceType: "upload",
      publicUrl: "/uploads/content-vault/source-1/creator-source.mp4",
      duration: 12,
      width: 1080,
      height: 1920,
    };
    expect(isCreatorVaultSource(usable)).toBe(true);
    expect(
      isCreatorVaultSource({
        ...usable,
        sourceType: "finished_marketing_maker",
      })
    ).toBe(false);
    expect(
      isCreatorVaultSource({ ...usable, fileName: "kingcam-performance.mp4" })
    ).toBe(false);
    expect(isCreatorVaultSource({ ...usable, duration: 0 })).toBe(false);
  });

  it("uses a dedicated creator_workspace project type in the existing persisted project table", () => {
    const routerPath = fileURLToPath(
      new URL("../../../server/routers/creatorWorkspace.ts", import.meta.url)
    );
    const routerSource = readFileSync(routerPath, "utf8");
    expect(routerSource).toContain('kind: "creator_workspace.v1"');
    expect(routerSource).toContain("project_type = 'creator_workspace'");
    expect(routerSource).toContain("source_type = 'upload'");
    expect(routerSource).toContain("trailer_projects");
    expect(routerSource).not.toContain("INSERT INTO marketplace_products");
  });
});
