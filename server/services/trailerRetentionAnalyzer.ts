type BlueprintLike = {
  project?: { type?: string; format?: "16:9" | "9:16" | "1:1"; title?: string | null; concept?: string | null };
  readiness?: { warnings?: string[]; assetCount?: number; visualSceneCount?: number; estimatedDurationSeconds?: number };
  scenes?: Array<{ sceneIndex?: number; role?: string; durationSeconds?: number; overlayText?: string; assetKind?: string; warnings?: string[] }>;
  assetIntelligence?: Array<{ id?: string; kind?: string; suitabilityScore?: number; warnings?: string[]; durationSeconds?: number | null }>;
};

type PacingLike = {
  totalDurationSeconds?: number;
  averageSceneDurationSeconds?: number;
  pacingWarnings?: string[];
  scenes?: Array<{
    sceneIndex: number;
    role: string;
    startSeconds: number;
    endSeconds: number;
    durationSeconds: number;
    intensity: number;
    transitionEnergy: number;
    motionIntensity: number;
    textDensity: number;
    brollDensity: number;
    beatLabel: string;
  }>;
};

type AdaptiveLike = {
  creatorType?: string;
  useCase?: string;
  vertical?: string;
  platformMutations?: Array<{ platform: string; targetDurationSeconds: number; selectedSourceAssetIds?: Array<string | null> }>;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function scoreFromWarnings(base: number, warnings: number, penalty = 6): number {
  return clamp(base - warnings * penalty, 0, 100);
}

function textRisk(density: number): string {
  if (density >= 20) return "severe_text_overload";
  if (density >= 14) return "caption_split_recommended";
  if (density <= 3) return "may_need_stronger_copy";
  return "balanced";
}

export function analyzeTrailerRetention(blueprint: BlueprintLike, pacingPlan: PacingLike, adaptivePlan: AdaptiveLike) {
  const scenes = pacingPlan.scenes ?? [];
  const readinessWarnings = blueprint.readiness?.warnings?.length ?? 0;
  const assetWarnings = (blueprint.assetIntelligence ?? []).reduce((sum, asset) => sum + (asset.warnings?.length ?? 0), 0);
  const pacingWarnings = pacingPlan.pacingWarnings?.length ?? 0;
  const firstScene = scenes[0];
  const ctaScene = scenes.find((scene) => scene.role === "cta") ?? scenes[scenes.length - 1];
  const highEnergyScenes = scenes.filter((scene) => scene.intensity >= 82);
  const lowEnergyRuns = scenes.filter((scene) => scene.intensity < 58 || scene.transitionEnergy < 48);
  const textOverloadScenes = scenes.filter((scene) => scene.textDensity >= 14);
  const longScenes = scenes.filter((scene) => scene.durationSeconds > 8 && scene.role !== "cta");
  const visualCoverageRatio = (blueprint.readiness?.assetCount ?? 0) > 0 ? (blueprint.readiness?.visualSceneCount ?? 0) / Math.max(1, blueprint.readiness?.assetCount ?? 1) : 0;

  const scrollStopStrength = scoreFromWarnings(
    (firstScene?.intensity ?? 60) + (firstScene?.durationSeconds && firstScene.durationSeconds <= 5 ? 6 : -4) + (visualCoverageRatio >= 0.8 ? 4 : -8),
    readinessWarnings,
    4
  );
  const retentionPotential = clamp(
    72 + highEnergyScenes.length * 4 - lowEnergyRuns.length * 7 - longScenes.length * 5 - textOverloadScenes.length * 4 - pacingWarnings * 5,
    0,
    100
  );
  const emotionalImpact = clamp(
    64 + scenes.reduce((sum, scene) => sum + Math.max(0, scene.intensity - 68), 0) / Math.max(1, scenes.length) + (adaptivePlan.useCase === "motivational_sequence" ? 8 : 0),
    0,
    100
  );
  const conversionPressure = clamp(
    (ctaScene?.intensity ?? 62) + (adaptivePlan.useCase === "investor_demo" ? 3 : 0) - (ctaScene?.durationSeconds && ctaScene.durationSeconds > 7 ? 7 : 0) - readinessWarnings * 2,
    0,
    100
  );

  const deadZones = scenes.filter((scene) => scene.intensity < 62 || scene.transitionEnergy < 52).map((scene) => ({
    sceneIndex: scene.sceneIndex,
    startSeconds: scene.startSeconds,
    endSeconds: scene.endSeconds,
    reason: scene.intensity < 62 ? "low emotional intensity" : "transition energy drop",
    fix: "Shorten the beat, increase motion intensity, or move proof/visual action earlier.",
  }));

  const replayMoments = scenes.filter((scene) => scene.intensity >= 84 || scene.role === "hook" || scene.role === "cta").map((scene) => ({
    sceneIndex: scene.sceneIndex,
    timeSeconds: scene.startSeconds,
    reason: scene.role === "hook" ? "strong opener" : scene.role === "cta" ? "conversion moment" : "high-energy spike",
    packaging: "Use a clean caption and sound accent so viewers can understand the beat without audio.",
  }));

  const sceneDiagnostics = scenes.map((scene) => ({
    sceneIndex: scene.sceneIndex,
    role: scene.role,
    score: round(clamp(scene.intensity * 0.48 + scene.transitionEnergy * 0.28 + scene.motionIntensity * 0.14 + (scene.brollDensity * 100) * 0.1 - Math.max(0, scene.textDensity - 12) * 1.4, 0, 100)),
    risk: textRisk(scene.textDensity),
    startSeconds: scene.startSeconds,
    endSeconds: scene.endSeconds,
    directive: scene.textDensity >= 14 ? "Split or shorten captions for this beat." : scene.transitionEnergy < 52 ? "Add a stronger transition or sound accent." : "Pacing is aligned with the current scene role.",
  }));

  const warnings = [
    ...(readinessWarnings > 0 ? [`${readinessWarnings} readiness warning(s) remain from grounded asset validation.`] : []),
    ...(assetWarnings > 0 ? [`${assetWarnings} asset-level warning(s) may affect final render coverage.`] : []),
    ...(textOverloadScenes.length > 0 ? [`${textOverloadScenes.length} scene(s) risk text overload.`] : []),
    ...(longScenes.length > 0 ? [`${longScenes.length} scene(s) are long for short-form retention.`] : []),
    ...(deadZones.length > 0 ? [`${deadZones.length} potential dead zone(s) require edit attention.`] : []),
  ];

  return {
    version: "creatorvault.trailer_retention_analyzer.v1",
    scores: {
      scrollStopStrength: round(scrollStopStrength),
      retentionPotential: round(retentionPotential),
      emotionalImpact: round(emotionalImpact),
      conversionPressure: round(conversionPressure),
      overall: round((scrollStopStrength * 0.28) + (retentionPotential * 0.32) + (emotionalImpact * 0.2) + (conversionPressure * 0.2)),
    },
    deadZones,
    weakHooks: firstScene && scrollStopStrength < 72 ? [{
      sceneIndex: firstScene.sceneIndex,
      issue: "Opening hook may not stop the scroll quickly enough.",
      fix: "Lead with the most specific transformation or proof claim inside the first caption window.",
    }] : [],
    pacingDrops: lowEnergyRuns.map((scene) => ({ sceneIndex: scene.sceneIndex, startSeconds: scene.startSeconds, issue: "Energy falls below the target curve.", fix: "Use a faster cut, stronger motion, or proof visual." })),
    replayMoments,
    highEnergySpikes: highEnergyScenes.map((scene) => ({ sceneIndex: scene.sceneIndex, timeSeconds: scene.startSeconds, intensity: scene.intensity, label: scene.beatLabel })),
    textOverload: textOverloadScenes.map((scene) => ({ sceneIndex: scene.sceneIndex, textDensity: scene.textDensity, fix: "Reduce overlay copy or split the caption across the beat." })),
    ctaFatigue: ctaScene && ctaScene.durationSeconds > 7 ? [{ sceneIndex: ctaScene.sceneIndex, issue: "CTA window is longer than needed for short-form conversion.", fix: "Shorten CTA and hold logo for the final 0.8-1.4 seconds." }] : [],
    sceneDiagnostics,
    platformReadiness: (adaptivePlan.platformMutations ?? []).map((variant) => ({
      platform: variant.platform,
      targetDurationSeconds: variant.targetDurationSeconds,
      readiness: (variant.selectedSourceAssetIds?.length ?? 0) > 0 ? "grounded_variant_plan_ready" : "needs_asset_mapping_review",
    })),
    warnings,
    noRenderClaim: "Retention analysis scores the deterministic manifest only; it does not claim a rendered trailer output.",
  };
}
