import { describe, expect, it } from "vitest";
import { selectBestVerifiedCreationModel } from "./creationModelSelection";
import type { RoutableCreationModel } from "./creationModelRegistry";

function model(input: Partial<RoutableCreationModel>): RoutableCreationModel {
  return {
    modelKey: "candidate",
    provider: "creatorvault",
    model: "Candidate",
    modelVersion: "current",
    executionLane: "assembly",
    commercialEligibility: "verified",
    licenseName: "CreatorVault",
    licenseReference: null,
    activationState: "active",
    inputModes: ["source_video"],
    outputModes: ["video"],
    maxUsefulDurationSeconds: 60,
    supportedResolutions: ["720p"],
    supportsReferenceImage: false,
    supportsReferenceVideo: true,
    supportsIdentityPreservation: true,
    supportsCameraControl: false,
    supportsPoseControl: false,
    supportsAudio: true,
    knownWeaknesses: [],
    verifiedUseCases: [],
    benchmarkEvidenceVersion: "accepted-proof",
    benchmarkState: "accepted",
    metadata: {},
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
    evidence: {
      benchmarkCount: 1,
      acceptedBenchmarkCount: 1,
      rejectedBenchmarkCount: 0,
      bestAcceptedScore: 96,
      averageAcceptedScore: 96,
      criteria: {
        sourceFidelity: 96,
        motionRealism: 96,
        temporalConsistency: 96,
        cinematicQuality: 96,
        editability: 96,
      },
    },
    ...input,
  };
}

const precisionRequirements = {
  requiresGeneratedShot: false,
  requiresSourceFaithfulFinishing: true,
  requiredInputModes: ["source_video"] as const,
  requiredOutputMode: "video" as const,
  durationSeconds: 5,
  resolution: "720p",
  requiresIdentityPreservation: true,
  requiresAudio: true,
};

describe("Creation model selection", () => {
  it("selects only a dedicated finishing lane for a source-faithful finishing request", () => {
    const assembly = model({ modelKey: "creatorvault/assembly", executionLane: "assembly" });
    const finishing = model({ modelKey: "topaz/proteus", executionLane: "finishing" });

    const decision = selectBestVerifiedCreationModel([assembly, finishing], precisionRequirements);

    expect(decision.selected?.modelKey).toBe("topaz/proteus");
    expect(decision.rejected).toContainEqual({
      modelKey: "creatorvault/assembly",
      reasons: ["source_faithful_finishing_lane_required"],
    });
  });

  it("does not let a finishing lane pretend it can create a new synthetic shot", () => {
    const finishing = model({ modelKey: "topaz/proteus", executionLane: "finishing" });

    const decision = selectBestVerifiedCreationModel([finishing], {
      ...precisionRequirements,
      requiresGeneratedShot: true,
      requiresSourceFaithfulFinishing: false,
    });

    expect(decision.selected).toBeNull();
    expect(decision.rejected[0]?.reasons).toContain("selected_lane_cannot_create_new_shot");
  });
});
