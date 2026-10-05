import { describe, expect, it, vi } from "vitest";
import {
  BODY_FOCUS_LIBRARY,
  BODY_FOCUS_TREATMENTS,
  BODY_VISUAL_IDENTITIES,
  bodyDirectedFrameEvidenceSchema,
  type BodyDirectedFrameEvidence,
  type BodyDirectedSourceIdentity,
} from "../../shared/bodyCinemaBodyDirection";
import {
  assessBodyDirectedTreatment,
  deriveBodyCinemaSourceMap,
  deriveBodyDirectedSourceMap,
} from "./bodyCinemaSourceMapService";
import {
  bodyDirectedPlanSchema,
  compileBodyDirectedPlan,
  getBodyCinemaEditBlueprint,
  recommendBodyDirectedOptions,
} from "./bodyCinemaEditBlueprintService";

const source: BodyDirectedSourceIdentity = {
  assetId: "asset_body_cinema_test",
  sha256: "a".repeat(64),
  width: 1080,
  height: 1920,
  durationSeconds: 3,
};

function frame(timestampMs: number, torsoShift = 0, diagnostics = true): BodyDirectedFrameEvidence {
  const landmarks = Array.from({ length: 33 }, (_, index) => ({
    x: Math.min(0.9, 0.24 + (index % 6) * 0.08 + (index >= 11 && index <= 24 ? torsoShift : 0)),
    y: Math.min(0.92, 0.08 + Math.floor(index / 6) * 0.14),
    visibility: 0.96,
  }));
  return {
    timestampMs,
    width: source.width,
    height: source.height,
    landmarks,
    face: { present: true, centerX: 0.5, centerY: 0.2, coverage: 0.15 },
    frameFingerprint: `measured-frame-${timestampMs}`,
    ...(diagnostics ? { brightness: 0.62, sharpness: 0.79, contrast: 0.68, subjectCoverage: 0.72 } : {}),
  };
}

function confirmedAbsMap() {
  return deriveBodyDirectedSourceMap({
    source,
    frameEvidence: [frame(0), frame(400, 0.001), frame(800, 0.045)],
    detailObservations: [{
      bodyFocusId: "abs_core",
      startMs: 0,
      endMs: 800,
      confirmedVisible: true,
      provenance: "creator_visible_region_confirmation",
    }],
  });
}

function fullPoseMap() {
  return deriveBodyDirectedSourceMap({
    source,
    frameEvidence: [frame(0), frame(400, 0.001), frame(800, 0.002), frame(1_200, 0.003)],
  });
}

function legsOnlyFrame(timestampMs: number): BodyDirectedFrameEvidence {
  return { ...frame(timestampMs), face: { present: false } };
}

describe("Body Cinema body-directed canonical registry", () => {
  it("keeps all requested focus labels, owner treatments, and named look directions structured and unique", () => {
    expect(BODY_FOCUS_LIBRARY.map((focus) => focus.id)).toEqual([
      "abs_core",
      "glutes_lower_body",
      "full_body",
      "legs",
      "curves_silhouette",
      "dance_movement",
      "face_beauty",
      "style_detail",
      "fitness",
    ]);
    expect(BODY_FOCUS_LIBRARY.map((focus) => focus.label)).toEqual([
      "Abs",
      "Glutes",
      "Full Body",
      "Legs",
      "Curves",
      "Dance & Twerk",
      "Face & Beauty",
      "Style & Drip",
      "Fitness",
    ]);
    expect(new Set(BODY_FOCUS_TREATMENTS.map((treatment) => treatment.id)).size).toBe(BODY_FOCUS_TREATMENTS.length);
    expect(new Set(BODY_VISUAL_IDENTITIES.map((identity) => identity.id)).size).toBe(15);
    expect(BODY_VISUAL_IDENTITIES.map((identity) => identity.name)).toEqual([
      "Obsidian", "Golden Hour", "La Reina", "Midnight Heat", "Melanin Luxe", "Cartel Chic", "Island Girl", "Silk Road", "Drip", "Voodoo", "Southside", "Goddess Mode", "Noche Buena", "Royalty Check", "Pressure",
    ]);
    expect(BODY_FOCUS_TREATMENTS.map((treatment) => treatment.name)).toEqual(expect.arrayContaining([
      "Pressure Core", "Sculpted", "Core Command", "Sun-Kissed Set", "Backstage", "Motion Theory", "Curve Currency", "After Hours",
      "Main Character", "Body Language", "The Reveal", "Runway Heat", "Leg Day Cinema", "Long Story", "Step Out", "Silhouette Season",
      "Hourglass", "Soft Power", "Rhythm Control", "Shake Theory", "Bassline", "Carnival Motion", "Face Card", "Soft Focus", "Drip Detail", "Built Different", "Proof of Work",
    ]));
    for (const focus of BODY_FOCUS_LIBRARY) {
      expect(BODY_FOCUS_TREATMENTS.filter((treatment) => treatment.bodyFocusIds.includes(focus.id)).length).toBeGreaterThanOrEqual(2);
    }
    expect(BODY_FOCUS_TREATMENTS.find((treatment) => treatment.id === "curve_currency")?.bodyFocusIds).toEqual(expect.arrayContaining(["glutes_lower_body", "curves_silhouette"]));
    expect(BODY_FOCUS_TREATMENTS.find((treatment) => treatment.id === "body_language")?.bodyFocusIds).toEqual(expect.arrayContaining(["full_body", "style_detail"]));
  });

  it("requires finite landmark values but preserves out-of-frame coordinates for conservative later exclusion", () => {
    expect(bodyDirectedFrameEvidenceSchema.parse({ ...frame(0), landmarks: [{ x: -0.1, y: 1.2, visibility: 0.9 }] }).landmarks[0]).toMatchObject({ x: -0.1, y: 1.2 });
    expect(() => bodyDirectedFrameEvidenceSchema.parse({ ...frame(0), landmarks: [{ x: 0.2, y: 0.3 }] })).toThrow();
  });
});

describe("Body Cinema conservative body-directed source mapping", () => {
  it("never infers detailed abs, glutes, curves, dance, style, or fitness from sparse or occluded pose samples", () => {
    const occluded = frame(400);
    occluded.landmarks[11] = { x: -0.2, y: 0.4, visibility: 0.99 };
    const sparse = deriveBodyDirectedSourceMap({ source, frameEvidence: [frame(0), occluded] });
    const detailedFocuses = new Set(["abs_core", "glutes_lower_body", "curves_silhouette", "dance_movement", "style_detail", "fitness"]);
    expect(sparse.usableRanges.flatMap((range) => range.visibleFocusIds).some((id) => detailedFocuses.has(id))).toBe(false);
    expect(assessBodyDirectedTreatment(sparse, "abs_core", "pressure_core").supported).toBe(false);
    expect(assessBodyDirectedTreatment(sparse, "glutes_lower_body", "backstage").supported).toBe(false);
  });

  it("marks detailed focus only as a constrained creator confirmation and retains unknown diagnostics", () => {
    const map = confirmedAbsMap();
    const confirmed = map.usableRanges.filter((range) => range.visibleFocusIds.includes("abs_core"));
    expect(confirmed).toHaveLength(2);
    expect(confirmed.every((range) => range.visibilityProvenance === "creator_confirmed_detail")).toBe(true);
    expect(confirmed.every((range) => range.evidence.join(" ").includes("not automated or independently verified detection"))).toBe(true);
    expect(map.detailObservations).toEqual([{
      bodyFocusId: "abs_core",
      startMs: 0,
      endMs: 800,
      confirmedVisible: true,
      provenance: "creator_visible_region_confirmation",
    }]);
    const noDiagnosticMap = deriveBodyDirectedSourceMap({ source, frameEvidence: [frame(0, 0, false), frame(400, 0, false)] });
    expect(noDiagnosticMap.usableRanges.every((range) => range.lightingQuality === null)).toBe(true);
    expect(noDiagnosticMap.usableRanges.every((range) => range.allowedSourceContextCrop === undefined)).toBe(true);
  });

  it("creates a separate own-crop measured range for each supported direct focus and only records source context with fingerprints plus diagnostics", () => {
    const map = deriveBodyDirectedSourceMap({ source, frameEvidence: [frame(0), frame(400)] });
    const directRanges = map.usableRanges.filter((range) => range.visibilityProvenance === "measured_pose");
    expect(directRanges.map((range) => range.id)).toEqual([
      "measured_full_body_1",
      "measured_legs_1",
      "measured_face_beauty_1",
    ]);
    expect(directRanges.map((range) => range.visibleFocusIds)).toEqual([["full_body"], ["legs"], ["face_beauty"]]);
    const fullBody = directRanges.find((range) => range.visibleFocusIds.includes("full_body"));
    const legs = directRanges.find((range) => range.visibleFocusIds.includes("legs"));
    expect(fullBody?.measuredRegions).toEqual(expect.arrayContaining(["face", "arms", "legs", "full_body"]));
    expect(fullBody?.crop).not.toEqual(legs?.crop);
    expect(fullBody?.allowedSourceContextCrop).toMatchObject({
      label: "ORIGINAL SOURCE CONTEXT",
      crop: { left: 0, top: 0, width: 1, height: 1 },
      evidence: { leftFrameFingerprint: "measured-frame-0", rightFrameFingerprint: "measured-frame-400" },
    });
  });

  it("does not manufacture usable duration across wide sample gaps and rejects invalid evidence", () => {
    const gapped = deriveBodyDirectedSourceMap({ source, frameEvidence: [frame(0), frame(2_000)] });
    expect(gapped.usableRanges).toEqual([]);
    expect(gapped.excludedRanges).toEqual([{ startMs: 0, endMs: 3_000, reason: expect.any(String) }]);
    expect(() => deriveBodyDirectedSourceMap({ source, frameEvidence: [{ ...frame(0), width: 1079 }] })).toThrow(/dimension/i);
    expect(() => deriveBodyDirectedSourceMap({ source, frameEvidence: [frame(0), frame(0)] })).toThrow(/unique/i);
    expect(() => deriveBodyDirectedSourceMap({ source, frameEvidence: [frame(0), frame(400)], detailObservations: [{ bodyFocusId: "abs_core", startMs: 1_000, endMs: 1_400, confirmedVisible: true, provenance: "creator_visible_region_confirmation" }] })).toThrow(/does not overlap/i);
  });
});

describe("Body Cinema source-aware plan compiler", () => {
  it("rejects wrong ids, incompatible moods, and unsupported or unselected ranges", () => {
    const sourceMap = confirmedAbsMap();
    expect(() => compileBodyDirectedPlan(sourceMap, { bodyFocusId: "not_a_focus", bodyTreatmentId: "pressure_core", visualIdentityId: "obsidian" })).toThrow(/Unknown Body Cinema body focus/);
    expect(() => compileBodyDirectedPlan(sourceMap, { bodyFocusId: "abs_core", bodyTreatmentId: "main_character", visualIdentityId: "la_reina" })).toThrow(/not compatible/);
    expect(() => compileBodyDirectedPlan(sourceMap, { bodyFocusId: "abs_core", bodyTreatmentId: "pressure_core", visualIdentityId: "golden_hour" })).toThrow(/not compatible/);
    expect(() => compileBodyDirectedPlan(sourceMap, { bodyFocusId: "abs_core", bodyTreatmentId: "pressure_core", visualIdentityId: "obsidian", selectedRangeIds: ["not_a_range"] })).toThrow(/not permitted/);
    const unsupported = deriveBodyDirectedSourceMap({ source, frameEvidence: [frame(0), frame(400)] });
    expect(() => compileBodyDirectedPlan(unsupported, { bodyFocusId: "abs_core", bodyTreatmentId: "pressure_core", visualIdentityId: "obsidian" })).toThrow(/creator-visible-region confirmation/);
  });

  it("creates materially distinct source-only shot plans and frozen immutable snapshots", () => {
    const sourceMap = confirmedAbsMap();
    const pressure = compileBodyDirectedPlan(sourceMap, { bodyFocusId: "abs_core", bodyTreatmentId: "pressure_core", visualIdentityId: "obsidian" });
    const sculpted = compileBodyDirectedPlan(sourceMap, { bodyFocusId: "abs_core", bodyTreatmentId: "sculpted", visualIdentityId: "golden_hour" });
    expect(pressure.editBlueprint.shots).not.toEqual(sculpted.editBlueprint.shots);
    expect(pressure.editBlueprint.shots.map((shot) => shot.pacing)).not.toEqual(sculpted.editBlueprint.shots.map((shot) => shot.pacing));
    expect(pressure.editBlueprint.slowMotion).toEqual({ eligible: false, reason: expect.stringMatching(/frame rate is unverified/i) });
    expect(pressure.providerReadyDirection).toMatch(/PLAN ONLY/);
    expect(pressure.providerReadyDirection).toMatch(/Preserve identity/);
    expect(bodyDirectedPlanSchema.parse(pressure)).toEqual(pressure);

    const originalLabel = BODY_FOCUS_LIBRARY[0].label;
    BODY_FOCUS_LIBRARY[0].label = "Changed only after freeze";
    expect(pressure.bodyFocus.label).toBe("Abs");
    expect(bodyDirectedPlanSchema.parse(pressure).bodyFocus.label).toBe("Abs");
    BODY_FOCUS_LIBRARY[0].label = originalLabel;
  });

  it("uses the proven focus crop when source-context evidence is absent and keeps style Body Language dependent on full form plus arms", () => {
    const noContextMap = deriveBodyDirectedSourceMap({
      source,
      frameEvidence: [frame(0, 0, false), frame(400, 0.001, false)],
      detailObservations: [{
        bodyFocusId: "abs_core",
        startMs: 0,
        endMs: 400,
        confirmedVisible: true,
        provenance: "creator_visible_region_confirmation",
      }],
    });
    const noContextPlan = compileBodyDirectedPlan(noContextMap, {
      bodyFocusId: "abs_core",
      bodyTreatmentId: "pressure_core",
      visualIdentityId: "obsidian",
    });
    expect(noContextPlan.editBlueprint.shots.every((shot) => {
      const range = noContextPlan.sourceMap.usableRanges.find((candidate) => candidate.id === shot.sourceRangeId);
      return range !== undefined
        && shot.crop.left === range.crop.left
        && shot.crop.top === range.crop.top
        && shot.crop.width === range.crop.width
        && shot.crop.height === range.crop.height;
    })).toBe(true);

    const styleMap = deriveBodyDirectedSourceMap({
      source,
      frameEvidence: [frame(0), frame(400)],
      detailObservations: [{
        bodyFocusId: "style_detail",
        startMs: 0,
        endMs: 400,
        confirmedVisible: true,
        provenance: "creator_visible_region_confirmation",
      }],
    });
    const styleAssessment = assessBodyDirectedTreatment(styleMap, "style_detail", "body_language");
    expect(styleAssessment.supported).toBe(true);
    expect(styleAssessment.rangeIds).toHaveLength(1);
    const styleRange = styleMap.usableRanges.find((range) => range.id === styleAssessment.rangeIds[0]);
    expect(styleRange?.measuredRegions).toEqual(expect.arrayContaining(["full_body", "arms"]));
  });

  it("compiles The Reveal as exact same-window face detail, torso mid-frame, and full-body crops", () => {
    const sourceMap = fullPoseMap();
    const fullBodyRanges = sourceMap.usableRanges.filter((range) => range.visibleFocusIds.includes("full_body"));
    const faceRanges = sourceMap.usableRanges.filter((range) => range.visibleFocusIds.includes("face_beauty"));
    expect(fullBodyRanges).toHaveLength(3);
    expect(fullBodyRanges.every((range) => range.measuredFramingCrops?.some((crop) => (
      crop.kind === "measured_torso_frame" && crop.basedOnRegions.join(",") === "shoulders,hips"
    )))).toBe(true);
    expect(sourceMap.bestEligibleTreatmentIds).toContain("the_reveal");
    expect(assessBodyDirectedTreatment(sourceMap, "full_body", "the_reveal").supported).toBe(true);

    const reveal = compileBodyDirectedPlan(sourceMap, {
      bodyFocusId: "full_body",
      bodyTreatmentId: "the_reveal",
      visualIdentityId: "golden_hour",
    });
    const [detail, mid, full] = reveal.editBlueprint.shots;
    const detailSibling = faceRanges.find((range) => range.startMs === fullBodyRanges[0].startMs && range.endMs === fullBodyRanges[0].endMs);
    const torsoFrame = fullBodyRanges[1].measuredFramingCrops?.find((crop) => crop.kind === "measured_torso_frame");
    expect(detail?.crop).toEqual(detailSibling?.crop);
    expect(mid?.crop).toEqual(torsoFrame?.crop);
    expect(full?.crop).toEqual(fullBodyRanges[2].crop);
    expect(new Set([JSON.stringify(detail?.crop), JSON.stringify(mid?.crop), JSON.stringify(full?.crop)]).size).toBe(3);
    expect(detail?.framing).toMatch(/PROVEN FACE DETAIL CROP/);
    expect(mid?.framing).toMatch(/PROVEN TORSO FRAME CROP/);
    expect(full?.framing).toMatch(/PROVEN FOCUS CROP/);

    // Historical validation is self-contained: valid embedded proof survives
    // without consulting the mutable treatment registry, while alternate crops
    // that are otherwise source-map crops still cannot forge this progression.
    const liveReveal = BODY_FOCUS_TREATMENTS.find((treatment) => treatment.id === "the_reveal");
    if (!liveReveal) throw new Error("fixture requires The Reveal treatment");
    const liveSelectionPattern = liveReveal.selectionPattern;
    liveReveal.selectionPattern = "mutated_only_after_freeze";
    expect(bodyDirectedPlanSchema.parse(structuredClone(reveal))).toEqual(reveal);
    liveReveal.selectionPattern = liveSelectionPattern;
    const forgedMid = structuredClone(reveal);
    forgedMid.editBlueprint.shots[1].crop = { left: 0.3, top: 0.3, width: 0.2, height: 0.2 };
    expect(bodyDirectedPlanSchema.safeParse(forgedMid).success).toBe(false);
    const forgedStage = structuredClone(reveal);
    forgedStage.editBlueprint.shots[0].crop = fullBodyRanges[0].crop;
    expect(bodyDirectedPlanSchema.safeParse(forgedStage).success).toBe(false);

    const missingDetailEvidence = structuredClone(sourceMap);
    missingDetailEvidence.usableRanges = missingDetailEvidence.usableRanges.filter((range) => !range.visibleFocusIds.includes("face_beauty"));
    expect(assessBodyDirectedTreatment(missingDetailEvidence, "full_body", "the_reveal")).toMatchObject({
      supported: false,
      reason: expect.stringMatching(/face-detail sibling crop/i),
    });
    expect(recommendBodyDirectedOptions(missingDetailEvidence, "full_body").some((plan) => plan.bodyTreatment.id === "the_reveal")).toBe(false);
  });

  it("requires independently measured full-body sibling evidence before Step Out can promise its final full-form hold", () => {
    const legOnlyMap = deriveBodyDirectedSourceMap({
      source,
      frameEvidence: [legsOnlyFrame(0), legsOnlyFrame(400), legsOnlyFrame(800)],
    });
    expect(assessBodyDirectedTreatment(legOnlyMap, "legs", "step_out").supported).toBe(false);
    expect(() => compileBodyDirectedPlan(legOnlyMap, {
      bodyFocusId: "legs",
      bodyTreatmentId: "step_out",
      visualIdentityId: "cartel_chic",
    })).toThrow();

    const fullPose = fullPoseMap();
    const legs = fullPose.usableRanges.filter((range) => range.visibleFocusIds.includes("legs"));
    const fullBodies = fullPose.usableRanges.filter((range) => range.visibleFocusIds.includes("full_body"));
    const stepOut = compileBodyDirectedPlan(fullPose, {
      bodyFocusId: "legs",
      bodyTreatmentId: "step_out",
      visualIdentityId: "cartel_chic",
    });
    expect(stepOut.editBlueprint.shots[0]?.crop).toEqual(legs[0].crop);
    expect(stepOut.editBlueprint.shots.at(-1)?.crop).toEqual(fullBodies.at(-1)?.crop);
    expect(stepOut.editBlueprint.shots.at(-1)?.framing).toMatch(/PROVEN FULL-BODY CROP/);
    expect(() => compileBodyDirectedPlan(fullPose, {
      bodyFocusId: "legs",
      bodyTreatmentId: "step_out",
      visualIdentityId: "cartel_chic",
      selectedRangeIds: [legs[0].id],
    })).toThrow(/separate measured lower-body and full-body source windows/i);
  });

  it("rejects forged historical snapshot relationships using only embedded evidence", () => {
    const plan = compileBodyDirectedPlan(confirmedAbsMap(), {
      bodyFocusId: "abs_core",
      bodyTreatmentId: "pressure_core",
      visualIdentityId: "obsidian",
    });
    const expectInvalid = (mutate: (candidate: typeof plan) => void) => {
      const candidate = structuredClone(plan);
      mutate(candidate);
      expect(bodyDirectedPlanSchema.safeParse(candidate).success).toBe(false);
    };

    expectInvalid((candidate) => { candidate.treatmentName = "Forged treatment name"; });
    expectInvalid((candidate) => { candidate.bodyFocus.id = "legs"; });
    expectInvalid((candidate) => { candidate.visualIdentity.id = "forged_mood"; });
    expectInvalid((candidate) => {
      const unrelated = candidate.sourceMap.usableRanges.find((range) => range.visibleFocusIds.includes("legs"));
      if (!unrelated) throw new Error("fixture must contain a measured legs range");
      candidate.selectedTimecodes[0] = { rangeId: unrelated.id, startMs: unrelated.startMs, endMs: unrelated.endMs };
    });
    expectInvalid((candidate) => {
      const selected = candidate.sourceMap.usableRanges.find((range) => range.id === candidate.selectedTimecodes[0]?.rangeId);
      if (!selected) throw new Error("fixture must contain its selected range");
      selected.measuredRegions = selected.measuredRegions.filter((region) => region !== "torso");
    });
    expectInvalid((candidate) => { candidate.editBlueprint.excludedRanges = []; });
    expectInvalid((candidate) => {
      const exclusion = { startMs: 0, endMs: 1, reason: "Forged overlap" };
      candidate.sourceMap.excludedRanges = [exclusion];
      candidate.editBlueprint.excludedRanges = [exclusion];
    });
    expectInvalid((candidate) => {
      candidate.editBlueprint.shots[1] = { ...candidate.editBlueprint.shots[0], order: 1 };
    });

    const noContextPlan = compileBodyDirectedPlan(deriveBodyDirectedSourceMap({
      source,
      frameEvidence: [frame(0, 0, false), frame(400, 0.001, false)],
      detailObservations: [{ bodyFocusId: "abs_core", startMs: 0, endMs: 400, confirmedVisible: true, provenance: "creator_visible_region_confirmation" }],
    }), { bodyFocusId: "abs_core", bodyTreatmentId: "pressure_core", visualIdentityId: "obsidian" });
    const forgedWidening = structuredClone(noContextPlan);
    forgedWidening.editBlueprint.shots[0].crop = { left: 0, top: 0, width: 1, height: 1 };
    expect(bodyDirectedPlanSchema.safeParse(forgedWidening).success).toBe(false);
  });

  it("returns only genuine source-supported combinations and makes no fetch or legacy DB call", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const sourceMap = confirmedAbsMap();
    const options = recommendBodyDirectedOptions(sourceMap, "abs_core");
    expect(options.length).toBeGreaterThanOrEqual(3);
    expect(options.length).toBeLessThanOrEqual(5);
    const signatures = options.map((option) => JSON.stringify(option.editBlueprint.shots.map((shot) => ({
      sourceRangeId: shot.sourceRangeId,
      startMs: shot.startMs,
      endMs: shot.endMs,
      crop: shot.crop,
      transition: shot.transition,
      pacing: shot.pacing,
    }))));
    expect(new Set(signatures).size).toBe(options.length);
    const pressureVariants = options.filter((option) => option.bodyTreatment.id === "pressure_core");
    expect(pressureVariants.length).toBeGreaterThanOrEqual(2);
    expect(pressureVariants[0]?.editBlueprint.shots).not.toEqual(pressureVariants[1]?.editBlueprint.shots);
    expect(options.every((option) => option.status === "planning_only" && option.noCandidateGenerated)).toBe(true);
    expect(recommendBodyDirectedOptions(sourceMap, "glutes_lower_body")).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("leaves legacy V1 callable contracts present without executing legacy database methods", () => {
    expect(typeof deriveBodyCinemaSourceMap).toBe("function");
    expect(typeof getBodyCinemaEditBlueprint).toBe("function");
  });
});
