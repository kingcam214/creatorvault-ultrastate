import React from "react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CreatorSourceVideoIntake,
  directUploadResponseToMediaAsset,
  parseDirectVideoUploadResponse,
  trailerMakerSourcePath,
} from "@/components/CreatorSourceVideoIntake";

const savedSourceResponse = {
  url: "https://creatorvault.live/uploads/content-vault/source-asset-id/creator-source.mp4",
  filename: "creator-source.mp4",
  storageId: "storage-id",
  mediaAssetId: "source-asset-id",
  size: 123456,
  mime: "video/mp4",
  uploadReceipt: {
    id: "storage-id",
    mediaAssetId: "source-asset-id",
    sha256: "verified-sha256",
    verified: true,
    createdAt: "2026-10-03T00:00:00.000Z",
    codec: "h264",
    width: 1080,
    height: 1920,
    durationSec: 11.25,
  },
};

describe("Creator Video Studio source intake", () => {
  it("shows an ordinary-creator source-video intake without directing intake to KingCam", () => {
    const markup = renderToStaticMarkup(
      <CreatorSourceVideoIntake onSavedSource={() => undefined} />
    );
    expect(markup).toContain("Source video intake");
    expect(markup).toContain("Add a source video from your device");
    expect(markup).toContain('accept="video/*"');
    expect(markup).not.toContain("KingCam Vault");
  });

  it("selects the exact returned mediaAssetId only after a verified saved-source response", () => {
    const response = parseDirectVideoUploadResponse(savedSourceResponse);
    const asset = directUploadResponseToMediaAsset(response);

    expect(asset).toMatchObject({
      id: "source-asset-id",
      publicUrl: savedSourceResponse.url,
      sourceType: "upload",
      status: "ready",
      duration: 11.25,
      width: 1080,
      height: 1920,
    });
  });

  it("rejects an upload response that cannot honestly mark a source as saved", () => {
    expect(() =>
      parseDirectVideoUploadResponse({
        ...savedSourceResponse,
        mediaAssetId: "",
      })
    ).toThrow("complete saved source record");

    expect(() =>
      parseDirectVideoUploadResponse({
        ...savedSourceResponse,
        uploadReceipt: {
          ...savedSourceResponse.uploadReceipt,
          verified: false,
        },
      })
    ).toThrow("could not verify");
  });

  it("hands the exact selected source into Trailer Maker and keeps the existing draft persistence contract", () => {
    expect(trailerMakerSourcePath("source asset/id")).toBe(
      "/trailer-maker?sourceAssetId=source%20asset%2Fid"
    );

    const mediaAssetsPath = fileURLToPath(
      new URL("../../../server/routers/mediaAssets.ts", import.meta.url)
    );
    const mediaAssetsSource = readFileSync(mediaAssetsPath, "utf8");
    expect(mediaAssetsSource).toContain(
      "createTrailerProject: protectedProcedure"
    );
    expect(mediaAssetsSource).toContain("source_asset_id");
    expect(mediaAssetsSource).toContain("${primaryAssetId}");
    expect(mediaAssetsSource).toContain('${"draft"}');
    expect(mediaAssetsSource).toContain(
      "listTrailerProjects: protectedProcedure"
    );
  });
});
