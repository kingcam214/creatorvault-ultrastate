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
  return Array.from({ length: 12 }, (_, index) => {
    const timestampMs = index * 700;
    return {
      timestampMs,
      width: 1080,
      height: 1920,
      frameFingerprint: index < 4 ? fingerprint : index < 8 ? fingerprint.split("").reverse().join("") : fingerprint.slice(4) + fingerprint.slice(0, 4),
      brightness: 0.44 + (index % 4) * 0.07,
      contrast: 0.42 + (index % 5) * 0.09,
      sharpness: 0.58 + (index % 4) * 0.09,
      colorWarmth: 0.35 + (index % 4) * 0.1,
      subjectCoverage: 0.2 + (index % 7) * 0.08,
      face: {
        present: index % 4 !== 0,
        centerX: 0.46 + (index % 3) * 0.03,
        centerY: 0.27 + (index % 2) * 0.02,
        coverage: 0.025 + ((index + 2) % 5) * 0.014,
        expressionSignals: { mouthSmileLeft: 0.1 + (index % 3) * 0.05 },
      },
      landmarks: makeLandmarks(index * 0.004),
    };
  });
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
    analysisVersion: "adaptive-video-source-intelligence/v2",
    analysisStatus: "verified",
    reviewStatus: "ready",
    selectedDirectionId: "luxury-reveal",
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
  it("derives durable scene boundaries, multi-signal shot ranks, and four materially distinct timecoded treatment plans", () => {
    const analysis = deriveBodyCinemaDirections(makeFrames("1234567890abcdef"));

    expect(analysis.scenes.length).toBeGreaterThanOrEqual(1);
    expect(analysis.shotRankings).toHaveLength(12);
    expect(analysis.shotRankings[0].score).toBeGreaterThanOrEqual(55);
    expect(analysis.shotRankings[0]).toMatchObject({
      faceSupport: expect.any(Number),
      subjectCoverage: expect.any(Number),
      cropSafety: expect.any(Number),
    });
    expect(analysis.directions.map((direction) => direction.id)).toEqual([
      "the-arch",
      "silhouette",
      "luxury-reveal",
      "vip-tease",
    ]);
    expect(new Set(analysis.directions.map((direction) => direction.distinction)).size).toBe(4);
    expect(analysis.directions.every((direction) => direction.timeline.length === 5)).toBe(true);
    const treatmentShotSequences = analysis.directions.map((direction) => direction.timeline.map((beat) => beat.sourceTimestampMs).join(","));
    expect(new Set(treatmentShotSequences).size).toBe(4);
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
    expect(review.reasons.join(" ")).toContain("Accepted: treatment luxury-reveal");
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
