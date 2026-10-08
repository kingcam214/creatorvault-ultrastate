import { describe, expect, it } from "vitest";
import { compileBodyCinemaHdRecipe } from "./bodyCinemaHdBlueprint";
import { compileBodyDirectedPlan } from "./bodyCinemaEditBlueprintService";
import type { BodyDirectedSourceMap } from "../../shared/bodyCinemaBodyDirection";
import type { BodyDirectedLifecycleRecord } from "../../shared/bodyCinemaCandidateLifecycle";
import { bodyCinemaHdExecuteSchema } from "../../shared/bodyCinemaHd";
const source = {
  assetId: "owned-hd-original",
  sha256: "a".repeat(64),
  width: 1280,
  height: 720,
  durationSeconds: 13,
};
const map: BodyDirectedSourceMap = {
  version: "body_cinema.body_directed_source_map.v1",
  source,
  provenance: "browser_local_pose_and_creator_marks",
  usableRanges: Array.from({ length: 12 }, (_, i) => ({
    id: `r${i}`,
    startMs: 500 + i * 1000,
    endMs: 1500 + i * 1000,
    visibleFocusIds: ["full_body"],
    visibilityProvenance: "measured_pose" as const,
    measuredRegions: ["full_body", "face", "torso", "arms", "hips", "legs"],
    crop: { left: 0, top: 0, width: 1, height: 1 },
    allowedSourceContextCrop: {
      label: "ORIGINAL SOURCE CONTEXT" as const,
      crop: { left: 0, top: 0, width: 1, height: 1 },
      evidence: {
        leftFrameFingerprint: `left${i}`,
        rightFrameFingerprint: `right${i}`,
        leftCanvasDiagnostics: {
          width: 1280,
          height: 720,
          brightness: 0.5,
          sharpness: 0.8,
          contrast: 0.5,
          subjectCoverage: 0.5,
        },
        rightCanvasDiagnostics: {
          width: 1280,
          height: 720,
          brightness: 0.5,
          sharpness: 0.8,
          contrast: 0.5,
          subjectCoverage: 0.5,
        },
      },
    },
    movementType: "held_pose",
    framingQuality: 0.9,
    lightingQuality: 0.8,
    stability: 0.9,
    evidence: ["Synthetic test measurements only."],
  })),
  excludedRanges: [{ startMs: 0, endMs: 500, reason: "Not measured." }],
  limitations: ["Synthetic test, not source quality proof."],
  detailObservations: [],
  bestEligibleTreatmentIds: ["main_character"],
};
const plan = compileBodyDirectedPlan(map, {
  bodyFocusId: "full_body",
  bodyTreatmentId: "main_character",
  visualIdentityId: "la_reina",
});
const record = {
  id: "11111111-1111-4111-8111-111111111111",
  projectId: "22222222-2222-4222-8222-222222222222",
  creatorId: 12,
  kind: "body_directed_v2",
  state: "frozen",
  source: {
    ...source,
    fileName: "owned.mp4",
    sizeBytes: 100,
    receiptId: "receipt",
    mimeType: "video/mp4",
    classification: "creator_owned",
  },
  analysis: {
    version: "body_cinema.body_directed_analysis.v1",
    sourceMap: map,
    sourceMapHash: "b".repeat(64),
    frameEvidence: [],
    detailObservations: [],
  },
  treatment: plan,
  treatmentHash: "c".repeat(64),
  candidate: null,
  handoff: null,
  rights: {
    version: "body_cinema.body_directed_assertion.v1",
    ownSource: true,
    performerLikenessConsent: true,
    treatmentScope: "body_directed_source_analysis_and_plan_only",
    intendedUse: "source_analysis_and_plan_only",
    acknowledgesNoIndependentVerification: true,
    verificationStatus: "creator_asserted_not_independently_verified",
    assertedAt: new Date().toISOString(),
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} satisfies BodyDirectedLifecycleRecord;
const cuts = [
  { startMs: 500, endMs: 4000 },
  { startMs: 4000, endMs: 7500 },
  { startMs: 7500, endMs: 11000 },
];
describe("separate source-bound HD blueprint", () => {
  it("inherits the exact selected source, focus, edit and grade without rewriting frozen history", () => {
    const before = JSON.stringify(record);
    const hd = compileBodyCinemaHdRecipe(record, cuts);
    expect(hd.durationSeconds).toBe(10.5);
    expect([hd.width, hd.height]).toEqual([1920, 1080]);
    expect(hd.visualGradeId).toBe("la_reina");
    expect(hd.framing).toBe("complete_native_source");
    expect(JSON.stringify(record)).toBe(before);
  });
  it("rejects short rushed edits, repeated windows and gaps", () => {
    expect(() =>
      compileBodyCinemaHdRecipe(record, [
        { startMs: 500, endMs: 1000 },
        { startMs: 1000, endMs: 1500 },
        { startMs: 1500, endMs: 2000 },
      ])
    ).toThrow();
    expect(() =>
      compileBodyCinemaHdRecipe(record, [cuts[0], cuts[0], cuts[2]])
    ).toThrow();
    expect(() =>
      compileBodyCinemaHdRecipe(record, [
        { startMs: 0, endMs: 3500 },
        cuts[1],
        cuts[2],
      ])
    ).toThrow();
  });
  it("does not reinterpret unsupported moods or qualify an unlocked plan", () => {
    expect(() =>
      compileBodyCinemaHdRecipe(
        { ...record, state: "qualified", treatment: null },
        cuts
      )
    ).toThrow();
    expect(() =>
      compileBodyCinemaHdRecipe(
        {
          ...record,
          treatment: {
            ...plan,
            visualIdentity: { ...plan.visualIdentity, id: "unknown" },
          },
        },
        cuts
      )
    ).toThrow();
  });
  it("does not use a plan-only rights declaration as private render consent", () => {
    expect(
      bodyCinemaHdExecuteSchema.safeParse({
        id: record.id,
        jobId: record.id,
        recipeHash: record.treatmentHash,
        authorization: record.rights,
      }).success
    ).toBe(false);
  });
});
