import React from "react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  BodyCinemaLifecycleStatic,
  isBodyCinemaSourceCandidate,
} from "./VaultXDrop";

describe("Body Cinema Phase A lifecycle surface", () => {
  it("keeps selection deliberately narrower than server qualification", () => {
    expect(
      isBodyCinemaSourceCandidate({
        id: "source-1",
        assetType: "video",
        mimeType: "video/mp4",
        fileName: "original.mp4",
        status: "ready",
      })
    ).toBe(true);
    expect(
      isBodyCinemaSourceCandidate({
        id: "image-1",
        assetType: "image",
        mimeType: "image/jpeg",
        fileName: "still.jpg",
        status: "ready",
      })
    ).toBe(false);
    expect(
      isBodyCinemaSourceCandidate({
        id: "pending-video",
        assetType: "video",
        mimeType: "video/mp4",
        fileName: "pending.mp4",
        status: "processing",
      })
    ).toBe(false);
  });

  it("SSR-renders an awaiting-candidate state without presenting an output", () => {
    const markup = renderToStaticMarkup(
      <BodyCinemaLifecycleStatic state="awaiting_candidate" />
    );
    expect(markup).toContain(
      "Awaiting separately authorized candidate attachment."
    );
    expect(markup).toContain("No candidate can be attached from this screen.");
    expect(markup).not.toContain("Download");
    expect(markup).not.toContain("accepted master");
  });

  it("uses only the lifecycle contract and removes the obsolete provider and publishing route calls", () => {
    const pagePath = fileURLToPath(
      new URL("./VaultXDrop.tsx", import.meta.url)
    );
    const source = readFileSync(pagePath, "utf8");

    for (const operation of [
      "listMine",
      "getMine",
      "qualify",
      "freeze",
      "reserve",
      "beginReview",
      "decide",
      "handoff",
    ]) {
      expect(source).toContain(`trpc.bodyCinema.lifecycle.${operation}`);
    }
    expect(source).not.toContain("governedPollo");
    expect(source).not.toContain("creationDirector.prepare");
    expect(source).not.toContain("publishAcceptedBodyCinemaDrop");
    expect(source).not.toContain("adultVerified");
  });
});
