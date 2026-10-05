import React from "react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  BodyCinemaActionError,
  BodyCinemaLifecycleStatic,
  bodyCinemaActionFailure,
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

  it("renders a server precondition reason as a persistent branded, accessible action alert", () => {
    const reason = "The source URL and stored filename do not match exactly.";
    const failure = bodyCinemaActionFailure(
      "Source qualification stopped",
      new Error(reason),
      "Check your selected source."
    );
    const markup = renderToStaticMarkup(
      <BodyCinemaActionError failure={failure} />
    );
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('tabindex="-1"');
    expect(markup).toContain(
      'aria-labelledby="body-cinema-action-error-title"'
    );
    expect(markup).toContain("body-cinema-state--gold");
    expect(markup).toContain("Source qualification stopped");
    expect(markup).toContain(reason);
    expect(markup).not.toContain("setTimeout");
    expect(markup).not.toContain("stack");
  });

  it.each([
    null,
    undefined,
    {},
    new Error(""),
    new Error('[\n{"code":"invalid_type"}\n]'),
  ])(
    "keeps step-specific plain-language guidance for an unusable error %j",
    error => {
      const fallback =
        "Complete all Crown Reveal fields before freezing the plan.";
      expect(
        bodyCinemaActionFailure("Plan could not be frozen", error, fallback)
      ).toEqual({ action: "Plan could not be frozen", message: fallback });
    }
  );

  it("does not render an error when no action failed, and escapes server text", () => {
    expect(renderToStaticMarkup(<BodyCinemaActionError failure={null} />)).toBe(
      ""
    );
    const markup = renderToStaticMarkup(
      <BodyCinemaActionError
        failure={{
          action: "Source qualification stopped",
          message: "Source <script> is unavailable.",
        }}
      />
    );
    expect(markup).toContain("&lt;script&gt;");
    expect(markup).not.toContain("<script>");
  });

  it("keeps mutation errors on screen rather than depending on a transient toast", () => {
    const source = readFileSync(
      fileURLToPath(new URL("./VaultXDrop.tsx", import.meta.url)),
      "utf8"
    );
    expect(source).toContain(
      "<BodyCinemaActionError failure={actionFailure} />"
    );
    expect(source).not.toContain("toast.error(");
    for (const action of [
      "Source upload stopped",
      "Source qualification stopped",
      "Plan could not be frozen",
      "Candidate slot could not be reserved",
      "Review could not start",
      "Decision could not be saved",
      "Planning handoff could not be saved",
    ]) {
      expect(source).toContain(`showActionError(\n`);
      expect(source).toContain(`"${action}"`);
    }
    expect(source).toContain("focus({ preventScroll: true })");
    expect(source).toContain(
      'scrollIntoView({ block: "center", behavior: "auto" })'
    );
    expect(source).not.toContain("setTimeout(() => setActionFailure");
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
