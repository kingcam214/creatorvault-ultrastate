import type {
  CreationCapabilityRequirements,
  ModelBenchmarkCriteria,
  ModelSelectionDecision,
  RoutableCreationModel,
} from "./creationModelRegistry";

const METRIC_KEYS: Array<keyof ModelBenchmarkCriteria> = [
  "facePreservation",
  "identityPreservation",
  "bodyNaturalness",
  "anatomy",
  "skinTexture",
  "hands",
  "legs",
  "hipsWaistContinuity",
  "clothingPreservation",
  "propPreservation",
  "backgroundStability",
  "sourceFidelity",
  "motionRealism",
  "motionEnergy",
  "cameraMotion",
  "physics",
  "temporalConsistency",
  "lighting",
  "promptAdherence",
  "verticalComposition",
  "socialEnergy",
  "cinematicQuality",
  "editability",
  "artifactRate",
];

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 100) / 100;
}

function requiredEvidenceMetrics(requirements: CreationCapabilityRequirements): Array<keyof ModelBenchmarkCriteria> {
  const metrics: Array<keyof ModelBenchmarkCriteria> = ["sourceFidelity", "motionRealism", "temporalConsistency", "cinematicQuality", "editability"];
  if (requirements.requiresIdentityPreservation) metrics.push("facePreservation", "identityPreservation");
  if (requirements.requiresNaturalBody) metrics.push("bodyNaturalness", "anatomy", "skinTexture", "hands", "legs", "hipsWaistContinuity");
  if (requirements.requiresPropPreservation) metrics.push("clothingPreservation", "propPreservation", "backgroundStability");
  if (requirements.requiresCameraControl) metrics.push("cameraMotion");
  return [...new Set(metrics)];
}

/**
 * Selects only from models with an accepted CreatorVault benchmark. Catalog order,
 * listed price, and model recency never influence the decision.
 */
export function selectBestVerifiedCreationModel(models: RoutableCreationModel[], requirements: CreationCapabilityRequirements): ModelSelectionDecision {
  const rejected: Array<{ modelKey: string; reasons: string[] }> = [];
  const candidates: Array<{ model: RoutableCreationModel; score: number }> = [];

  for (const model of models) {
    const reasons: string[] = [];
    if (model.activationState !== "active") reasons.push("not_active");
    if (model.benchmarkState !== "accepted") reasons.push("benchmark_not_accepted");
    if (model.commercialEligibility !== "verified") reasons.push("commercial_eligibility_not_verified");
    if (!model.outputModes.includes(requirements.requiredOutputMode)) reasons.push("output_mode_not_supported");
    if (requirements.durationSeconds > model.maxUsefulDurationSeconds) reasons.push("duration_exceeds_verified_limit");
    if (requirements.resolution && !model.supportedResolutions.includes(requirements.resolution)) reasons.push("resolution_not_verified");
    for (const inputMode of requirements.requiredInputModes) {
      if (!model.inputModes.includes(inputMode)) reasons.push(`input_mode_not_supported:${inputMode}`);
    }
    if (requirements.requiresReferenceImage && !model.supportsReferenceImage) reasons.push("reference_image_not_supported");
    if (requirements.requiresReferenceVideo && !model.supportsReferenceVideo) reasons.push("reference_video_not_supported");
    if (requirements.requiresIdentityPreservation && !model.supportsIdentityPreservation) reasons.push("identity_preservation_not_supported");
    if (requirements.requiresCameraControl && !model.supportsCameraControl) reasons.push("camera_control_not_supported");
    if (requirements.requiresAudio && !model.supportsAudio) reasons.push("audio_not_supported");

    if (requirements.requiresGeneratedShot && (model.executionLane === "assembly" || model.executionLane === "finishing")) {
      reasons.push("selected_lane_cannot_create_new_shot");
    }
    if (requirements.requiresSourceFaithfulFinishing && model.executionLane !== "finishing") {
      reasons.push("source_faithful_finishing_lane_required");
    }
    if (!requirements.requiresGeneratedShot && !requirements.requiresSourceFaithfulFinishing && model.executionLane !== "assembly") {
      reasons.push("generated_or_finishing_lane_not_needed_for_existing_media_assembly");
    }

    const evidenceMetrics = requiredEvidenceMetrics(requirements);
    const evidenceScores = evidenceMetrics.map((metric) => model.evidence.criteria[metric]).filter((value): value is number => typeof value === "number");
    if (requirements.requiresGeneratedShot && evidenceScores.length !== evidenceMetrics.length) reasons.push("missing_required_benchmark_metrics");
    const evidenceScore = average(evidenceScores);
    if (requirements.requiresGeneratedShot && (evidenceScore === null || evidenceScore < (requirements.minimumQualityScore ?? 75))) {
      reasons.push("benchmark_quality_below_requirement");
    }

    if (reasons.length) {
      rejected.push({ modelKey: model.modelKey, reasons: [...new Set(reasons)] });
      continue;
    }

    const score = requirements.requiresGeneratedShot
      ? Math.round(((evidenceScore || 0) * 0.85 + (model.evidence.averageAcceptedScore || 0) * 0.15) * 100) / 100
      : model.evidence.averageAcceptedScore || 100;
    candidates.push({ model, score });
  }

  candidates.sort((left, right) => right.score - left.score || left.model.modelKey.localeCompare(right.model.modelKey));
  return {
    selected: candidates[0]?.model || null,
    selectionScore: candidates[0]?.score ?? null,
    rejected,
  };
}

export const CREATION_SELECTION_POLICY = {
  acceptedCreatorVaultEvidenceRequired: true,
  catalogOrderIgnored: true,
  costIgnored: true,
  unbenchmarkedModelsRejected: true,
  assemblyCannotCreateSyntheticShot: true,
  sourceFaithfulFinishingRequiresDedicatedFinishingLane: true,
} as const;
