import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { assessBodyDirectedTreatment } from "../../../../server/services/bodyCinemaSourceMapService";
import { compileBodyDirectedPlan } from "../../../../server/services/bodyCinemaEditBlueprintService";
import {
  BODY_FOCUS_LIBRARY,
  BODY_FOCUS_TREATMENTS,
  type BodyDirectedSourceMap,
} from "@shared/bodyCinemaBodyDirection";
import {
  BodyDirectedOriginalCaption,
  BodyDirectedPlanSummary,
  BodyDirectionChoice,
  sourceSupportedTreatmentLabels,
  selectedBodyPlanMatchesRanges,
  treatmentsForBodyFocus,
} from "./BodyDirectedDirector";

const sourceMap: BodyDirectedSourceMap = {
  version: "body_cinema.body_directed_source_map.v1",
  provenance: "browser_local_pose_and_creator_marks",
  source: {
    assetId: "owned-video-1",
    sha256: "a".repeat(64),
    width: 1080,
    height: 1920,
    durationSeconds: 12,
  },
  usableRanges: [
    {
      id: "range-full-body",
      startMs: 1000,
      endMs: 4200,
      visibleFocusIds: ["full_body", "legs"],
      movementType: "held_pose",
      framingQuality: 0.82,
      lightingQuality: 0.68,
      stability: 0.9,
      evidence: [
        "Measured full-form landmarks remain inside the source frame.",
      ],
      visibilityProvenance: "measured_pose",
      measuredRegions: ["full_body", "face", "torso", "arms", "hips", "legs"],
      crop: { left: 0.12, top: 0.04, width: 0.76, height: 0.9 },
    },
  ],
  excludedRanges: [
    { startMs: 0, endMs: 800, reason: "No stable measured pose." },
  ],
  limitations: ["Unmeasured detail remains unavailable."],
  detailObservations: [],
  bestEligibleTreatmentIds: ["main_character", "runway_heat"],
};

const compiled = compileBodyDirectedPlan(sourceMap, {
  bodyFocusId: "full_body",
  bodyTreatmentId: "main_character",
  visualIdentityId: "la_reina",
});
const frozenSnapshot = {
  ...compiled,
  treatmentName: "Historic Entrance",
  bodyFocus: { ...compiled.bodyFocus, label: "Historic Full Form" },
  bodyTreatment: { ...compiled.bodyTreatment, name: "Historic Entrance" },
  visualIdentity: {
    ...compiled.visualIdentity,
    name: "Historic Obsidian Name",
  },
};

describe("Body Directed Director", () => {
  it("keeps all canonical focus IDs and treatment IDs unique, with multiple edit languages per focus", () => {
    const focusIds = BODY_FOCUS_LIBRARY.map(focus => focus.id);
    const treatmentIds = BODY_FOCUS_TREATMENTS.map(treatment => treatment.id);
    expect(focusIds).toHaveLength(9);
    expect(new Set(focusIds).size).toBe(focusIds.length);
    expect(new Set(treatmentIds).size).toBe(treatmentIds.length);

    for (const focus of BODY_FOCUS_LIBRARY) {
      const treatments = treatmentsForBodyFocus(focus.id);
      expect(treatments.length).toBeGreaterThanOrEqual(2);
      expect(new Set(treatments.map(treatment => treatment.id)).size).toBe(
        treatments.length
      );
      expect(
        treatments.every(treatment => treatment.bodyFocusIds.includes(focus.id))
      ).toBe(true);
    }
  });

  it("does not claim source support when analysis is unknown and only accepts map-eligible treatment labels", () => {
    expect(sourceSupportedTreatmentLabels("full_body", null)).toEqual([]);
    expect(sourceSupportedTreatmentLabels("abs_core", sourceMap)).toEqual([]);
    expect(
      sourceSupportedTreatmentLabels(
        "full_body",
        sourceMap,
        BODY_FOCUS_TREATMENTS,
        ["main_character", "runway_heat"]
      )
    ).toEqual(["Main Character", "Runway Heat"]);
  });

  it("SSR-renders a focus rail rather than an all-purpose filter grid and labels unknown source truth", () => {
    const markup = renderToStaticMarkup(
      <BodyDirectionChoice selectedFocusId={null} sourceMap={null} />
    );
    expect(markup).toContain("WHAT ARE WE SHOWING OFF?");
    expect(markup).toContain(
      "Source analysis has not established eligible moments yet."
    );
    expect(markup).toContain("Abs");
    expect(markup).toContain("Dance &amp; Twerk");
    expect(markup).not.toContain("filter");
    expect(markup).not.toContain("candidate generated result");
  });

  it("SSR-renders the original caption and never substitutes an invented visual", () => {
    const markup = renderToStaticMarkup(
      <BodyDirectedOriginalCaption durationSeconds={12} />
    );
    expect(markup).toContain("Source analysis");
    expect(markup).toContain("12 seconds · source-bounded only");
    expect(renderToStaticMarkup(<BodyDirectedOriginalCaption />)).toContain(
      "No source substitution. No generated visual."
    );
  });

  it("renders frozen plan names from the persisted snapshot rather than the current registry", () => {
    expect(frozenSnapshot.bodyTreatment.name).not.toBe(
      BODY_FOCUS_TREATMENTS.find(
        treatment => treatment.id === frozenSnapshot.bodyTreatment.id
      )?.name
    );
    const markup = renderToStaticMarkup(
      <BodyDirectedPlanSummary plan={frozenSnapshot} frozen />
    );
    expect(markup).toContain("FROZEN PLAN SNAPSHOT");
    expect(markup).toContain("Historic Entrance");
    expect(markup).toContain("Historic Obsidian Name");
    expect(markup).toContain("00:01–00:04");
    expect(markup).toContain("Original saved plan · separate HD review below.");
    expect(markup).not.toContain("Use this source plan");
  });
});

it("never labels creator-confirmed detail as automatic measurement", () => {
  const creatorMap: BodyDirectedSourceMap = {
    ...sourceMap,
    usableRanges: sourceMap.usableRanges.map(range => ({
      ...range,
      visibleFocusIds: ["abs_core"],
      visibilityProvenance: "creator_confirmed_detail" as const,
    })),
  };
  const markup = renderToStaticMarkup(
    <BodyDirectionChoice selectedFocusId="abs_core" sourceMap={creatorMap} />
  );
  expect(markup).toContain("Confirmed by you · not independently verified");
  expect(markup).not.toContain("Measured in source");
});

it("does not infer selected-focus support from globally eligible shared treatments", () => {
  const styleMap: BodyDirectedSourceMap = {
    ...sourceMap,
    bestEligibleTreatmentIds: [
      ...sourceMap.bestEligibleTreatmentIds,
      "body_language",
      "drip_detail",
    ],
    usableRanges: [
      ...sourceMap.usableRanges,
      {
        ...sourceMap.usableRanges[0],
        id: "style-only",
        visibleFocusIds: ["style_detail"],
        measuredRegions: ["shoulders", "arms"],
        visibilityProvenance: "creator_confirmed_detail",
      },
    ],
  };
  expect(
    assessBodyDirectedTreatment(styleMap, "style_detail", "body_language")
      .supported
  ).toBe(false);
  expect(
    assessBodyDirectedTreatment(styleMap, "style_detail", "drip_detail")
      .supported
  ).toBe(true);
  expect(sourceSupportedTreatmentLabels("style_detail", styleMap)).toEqual([]);
  expect(
    sourceSupportedTreatmentLabels(
      "style_detail",
      styleMap,
      BODY_FOCUS_TREATMENTS,
      ["drip_detail"]
    )
  ).toEqual(["Drip Detail"]);
});
it("locks only the exact currently shown ordered source ranges, not a stale pre-mark subset", () => {
  const ids = frozenSnapshot.selectedTimecodes.map(range => range.rangeId);
  expect(selectedBodyPlanMatchesRanges(frozenSnapshot, ids)).toBe(true);
  expect(selectedBodyPlanMatchesRanges(frozenSnapshot, [])).toBe(false);
  expect(
    selectedBodyPlanMatchesRanges(
      {
        ...frozenSnapshot,
        selectedTimecodes: [
          ...frozenSnapshot.selectedTimecodes,
          { rangeId: "newly-confirmed", startMs: 5000, endMs: 5500 },
        ],
      },
      ids
    )
  ).toBe(false);
  expect(selectedBodyPlanMatchesRanges(null, ids)).toBe(false);
});
