import { describe, expect, it } from "vitest";
import type { CreationCapabilityRequirements, RoutableCreationModel } from "./creationModelRegistry";
import { selectBestVerifiedCreationModel } from "./creationModelSelection";

const generatedShotRequirements: CreationCapabilityRequirements = {
  requiresGeneratedShot: true,
  requiredInputModes: ["reference_video"],
  requiredOutputMode: "video",
  durationSeconds: 6,
  resolution: "720p",
  requiresReferenceVideo: true,
  requiresIdentityPreservation: true,
  requiresNaturalBody: true,
  requiresPropPreservation: true,
  requiresCameraControl: true,
  minimumQualityScore: 75,
};

function candidate(overrides: Partial<RoutableCreationModel> = {}): RoutableCreationModel {
  return {
    modelKey: "test/model",
    provider: "test",
    model: "Test Model",
    modelVersion: "1",
    executionLane: "hosted",
    commercialEligibility: "verified",
    licenseName: "Test License",
    licenseReference: null,
    activationState: "active",
    inputModes: ["reference_video"],
    outputModes: ["video"],
    maxUsefulDurationSeconds: 6,
    supportedResolutions: ["720p"],
    supportsReferenceImage: false,
    supportsReferenceVideo: true,
    supportsIdentityPreservation: true,
    supportsCameraControl: true,
    supportsPoseControl: false,
    supportsAudio: false,
    knownWeaknesses: [],
    verifiedUseCases: ["approved test use"],
    benchmarkEvidenceVersion: "test-v1",
    benchmarkState: "accepted",
    metadata: {},
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
    evidence: {
      benchmarkCount: 1,
      acceptedBenchmarkCount: 1,
      rejectedBenchmarkCount: 0,
      bestAcceptedScore: 90,
      averageAcceptedScore: 90,
      criteria: {
        sourceFidelity: 90,
        motionRealism: 90,
        temporalConsistency: 90,
        cinematicQuality: 90,
        editability: 90,
        facePreservation: 90,
        identityPreservation: 90,
        bodyNaturalness: 90,
        anatomy: 90,
        skinTexture: 90,
        hands: 90,
        legs: 90,
        hipsWaistContinuity: 90,
        clothingPreservation: 90,
        propPreservation: 90,
        backgroundStability: 90,
        cameraMotion: 90,
      },
    },
    ...overrides,
  };
}

describe("CreatorVault model registry routing", () => {
  it("rejects an unbenchmarked controlled model even when it matches the requested inputs", () => {
    const result = selectBestVerifiedCreationModel([
      candidate({
        modelKey: "wan/wan-2-2-ti2v-5b",
        executionLane: "controlled",
        activationState: "planned",
        benchmarkState: "unbenchmarked",
      }),
    ], generatedShotRequirements);

    expect(result.selected).toBeNull();
    expect(result.rejected[0]?.reasons).toContain("not_active");
    expect(result.rejected[0]?.reasons).toContain("benchmark_not_accepted");
  });

  it("does not route a model after its benchmark evidence is invalidated", () => {
    const result = selectBestVerifiedCreationModel([
      candidate({
        activationState: "blocked",
        benchmarkState: "unbenchmarked",
        evidence: {
          ...candidate().evidence,
          benchmarkCount: 0,
          acceptedBenchmarkCount: 0,
          rejectedBenchmarkCount: 0,
          bestAcceptedScore: null,
          averageAcceptedScore: null,
          criteria: {},
        },
      }),
    ], generatedShotRequirements);

    expect(result.selected).toBeNull();
    expect(result.rejected[0]?.reasons).toContain("not_active");
    expect(result.rejected[0]?.reasons).toContain("benchmark_not_accepted");
  });

  it("chooses the strongest accepted CreatorVault evidence, not catalog order", () => {
    const weaker = candidate({
      modelKey: "hosted/first-configured",
      evidence: { ...candidate().evidence, averageAcceptedScore: 78, bestAcceptedScore: 78, criteria: Object.fromEntries(Object.entries(candidate().evidence.criteria).map(([key]) => [key, 78])) },
    });
    const stronger = candidate({
      modelKey: "hosted/proven-specialist",
      evidence: { ...candidate().evidence, averageAcceptedScore: 92, bestAcceptedScore: 92, criteria: Object.fromEntries(Object.entries(candidate().evidence.criteria).map(([key]) => [key, 92])) },
    });

    const result = selectBestVerifiedCreationModel([weaker, stronger], generatedShotRequirements);

    expect(result.selected?.modelKey).toBe("hosted/proven-specialist");
    expect(result.selectionScore).toBeGreaterThan(weaker.evidence.averageAcceptedScore || 0);
  });

  it("does not let the assembly lane create a new synthetic shot", () => {
    const result = selectBestVerifiedCreationModel([
      candidate({
        modelKey: "creatorvault/real-render-engine",
        executionLane: "assembly",
        inputModes: ["source_video", "accepted_shot"],
        outputModes: ["video", "assembled_master"],
      }),
    ], generatedShotRequirements);

    expect(result.selected).toBeNull();
    expect(result.rejected[0]?.reasons).toContain("assembly_cannot_create_new_shot");
  });
});
