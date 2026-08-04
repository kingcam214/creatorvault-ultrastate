import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ db: {} }));
import {
  deriveBodyCinemaDirections,
  type BodyCinemaEvidenceRecord,
  type BodyCinemaFrameEvidence,
} from "./bodyCinemaEvidenceService";
import { assessBodyCinemaOutput } from "./bodyCinemaOutputReviewService";

function makeLandmarks(offset = 0) {
  return Array.from({ length: 33 }, (_, index) => ({
    x: Math.max(0.05, Math.min(0.95, 0.5 + offset + ((index % 3) - 1) * 0.01)),
    y: Math.max(0.05, Math.min(0.95, 0.16 + index * 0.018)),
    z: 0,
    visibility: 0.96,
  }));
}

function makeFrames(fingerprint: string): BodyCinemaFrameEvidence[] {
  return [0, 1000, 2000, 3000].map((timestampMs, index) => ({
    timestampMs,
    width: 1080,
    height: 1920,
    frameFingerprint: index < 2 ? fingerprint : fingerprint.split("").reverse().join(""),
    brightness: 0.56,
    sharpness: 0.88,
    landmarks: makeLandmarks(index * 0.004),
  }));
}

function sourceEvidence(): BodyCinemaEvidenceRecord {
  const frameEvidence = makeFrames("1234567890abcdef");
  const derived = deriveBodyCinemaDirections(frameEvidence);
  return {
    id: "00000000-0000-4000-8000-000000000001",
    creatorId: 33,
    sourceMediaUrl: "https://creatorvault.live/uploads/source.mp4",
    sourceType: "video",
    sourceFingerprint: "1".repeat(64),
    analysisStatus: "verified",
    reviewStatus: "ready",
    selectedDirectionId: "portrait-command",
    analysisScore: derived.analysisScore,
    rejectionReasons: [],
    bodyMap: derived.bodyMap,
    frameEvidence,
    scenes: derived.scenes,
    shotRankings: derived.shotRankings,
    directions: derived.directions,
  };
}

describe("Body Cinema no-spend source intelligence", () => {
  it("derives durable scene boundaries, pose-ranked source shots, and three materially distinct direction plans", () => {
    const analysis = deriveBodyCinemaDirections(makeFrames("1234567890abcdef"));

    expect(analysis.scenes.length).toBeGreaterThanOrEqual(1);
    expect(analysis.shotRankings).toHaveLength(4);
    expect(analysis.shotRankings[0].score).toBeGreaterThanOrEqual(65);
    expect(analysis.directions.map((direction) => direction.id)).toEqual([
      "portrait-command",
      "silhouette-control",
      "motion-tension",
    ]);
    expect(new Set(analysis.directions.map((direction) => direction.distinction)).size).toBe(3);
    expect(analysis.directions.every((direction) => direction.evidence.some((item) => item.includes("Best source shot")))).toBe(true);
  });

  it("accepts a sufficiently different, source-supported treatment and records why", () => {
    const source = sourceEvidence();
    const review = assessBodyCinemaOutput(source, {
      outputFingerprint: "a".repeat(64),
      frameEvidence: makeFrames("abcdef1234567890"),
    });

    expect(review.status).toBe("accepted");
    expect(review.treatmentScore).toBeGreaterThanOrEqual(60);
    expect(review.bodyIntegrityScore).toBeGreaterThanOrEqual(65);
    expect(review.reasons.join(" ")).toContain("Accepted: treatment portrait-command");
  });

  it("rejects an output that is identical to the uploaded source or duplicates a prior treatment", () => {
    const source = sourceEvidence();
    const exactSource = assessBodyCinemaOutput(source, {
      outputFingerprint: source.sourceFingerprint,
      frameEvidence: makeFrames("1234567890abcdef"),
    });
    expect(exactSource.status).toBe("rejected");
    expect(exactSource.reasons.join(" ")).toContain("identical to the source asset");

    const duplicateTreatment = assessBodyCinemaOutput(source, {
      outputFingerprint: "b".repeat(64),
      frameEvidence: makeFrames("abcdef1234567890"),
    }, [{
      outputFingerprint: "c".repeat(64),
      frameEvidence: makeFrames("abcdef1234567890"),
    }]);
    expect(duplicateTreatment.status).toBe("rejected");
    expect(duplicateTreatment.reasons.join(" ")).toContain("near-duplicate treatment");
  });
});
