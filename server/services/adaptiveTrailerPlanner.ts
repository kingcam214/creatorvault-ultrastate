import { getProductionModel } from "./cloneModelRegistry";

type BlueprintLike = {
  generatedAt?: string;
  project?: {
    name?: string;
    type?: string;
    title?: string | null;
    concept?: string | null;
    format?: "16:9" | "9:16" | "1:1";
  };
  readiness?: {
    estimatedDurationSeconds?: number;
    assetCount?: number;
    visualSceneCount?: number;
    warnings?: string[];
  };
  hooks?: string[];
  scenes?: Array<{
    sceneIndex?: number;
    role?: string;
    durationSeconds?: number;
    overlayText?: string;
    sourceAssetId?: string;
    assetKind?: string;
    sourceFeature?: string | null;
    warnings?: string[];
  }>;
  assetIntelligence?: Array<{
    id?: string;
    kind?: string;
    fileName?: string;
    sourceType?: string | null;
    createdByFeature?: string | null;
    width?: number | null;
    height?: number | null;
    durationSeconds?: number | null;
    hasAudio?: boolean;
    hasVideo?: boolean;
    suitabilityScore?: number;
  }>;
  lineage?: {
    selectedAssetIds?: string[];
  };
};

type PacingLike = {
  totalDurationSeconds?: number;
  scenes?: Array<{
    sceneIndex: number;
    role: string;
    startSeconds: number;
    endSeconds: number;
    durationSeconds: number;
    sourceAssetId: string | null;
    intensity: number;
    brollDensity: number;
    textDensity: number;
  }>;
};

function lowerText(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function inferCreatorType(blueprint: BlueprintLike): string {
  const text = lowerText(blueprint.project?.name, blueprint.project?.title, blueprint.project?.concept, ...(blueprint.hooks ?? []));
  if (includesAny(text, ["investor", "demo", "pitch", "saas"])) return "founder_operator";
  if (includesAny(text, ["coach", "course", "mentor", "training"])) return "education_creator";
  if (includesAny(text, ["music", "artist", "album", "single", "performance"])) return "music_creator";
  if (includesAny(text, ["clone", "kingcam", "avatar", "talking head"])) return "clone_led_creator";
  if (includesAny(text, ["brand", "product", "launch", "offer"])) return "brand_builder";
  return "creator_business";
}

function inferUseCase(blueprint: BlueprintLike): string {
  const type = blueprint.project?.type ?? "launch_trailer";
  const text = lowerText(blueprint.project?.concept, blueprint.project?.title, ...(blueprint.hooks ?? []));
  if (type === "creator_case_study") return "proof_case_study";
  if (type === "feature_promo") return "feature_promotion";
  if (type === "emma_domination") return "authority_campaign";
  if (includesAny(text, ["onboard", "tutorial", "how to", "walkthrough"])) return "onboarding_narrative";
  if (includesAny(text, ["investor", "demo", "deck"])) return "investor_demo";
  if (includesAny(text, ["motivation", "mindset", "hype"])) return "motivational_sequence";
  return "launch_trailer";
}

function inferVertical(blueprint: BlueprintLike): string {
  const text = lowerText(blueprint.project?.concept, blueprint.project?.title, blueprint.project?.name, ...(blueprint.hooks ?? []));
  if (includesAny(text, ["fitness", "gym", "health"])) return "fitness_health";
  if (includesAny(text, ["finance", "money", "wealth", "invest"])) return "finance_wealth";
  if (includesAny(text, ["real estate", "property", "listing"])) return "real_estate";
  if (includesAny(text, ["ai", "automation", "software", "saas"])) return "ai_software";
  if (includesAny(text, ["music", "artist", "song", "album"])) return "music_entertainment";
  if (includesAny(text, ["course", "coach", "education", "training"])) return "education_coaching";
  return "creator_economy";
}

function selectedAssetIds(blueprint: BlueprintLike): string[] {
  return blueprint.lineage?.selectedAssetIds ?? (blueprint.scenes ?? []).map((scene) => scene.sourceAssetId).filter(Boolean).map(String);
}

function buildStructure(blueprint: BlueprintLike, creatorType: string, useCase: string) {
  const sceneCount = blueprint.scenes?.length ?? 0;
  const hasProof = (blueprint.scenes ?? []).some((scene) => String(scene.role ?? "").toLowerCase() === "proof");
  const structure = [
    { order: 1, segment: "hook", goal: "Earn the first scroll-stop decision with the strongest grounded visual and shortest claim." },
    { order: 2, segment: hasProof ? "proof" : "context", goal: hasProof ? "Show credibility using selected real media." : "Establish why the viewer should care before the midpoint." },
    { order: 3, segment: useCase === "investor_demo" ? "demo_value" : "transformation", goal: creatorType === "clone_led_creator" ? "Use clone presence as authority, not as a gimmick." : "Move from pain or promise into visible transformation." },
    { order: 4, segment: "offer", goal: "Compress value into one high-retention beat." },
    { order: 5, segment: "cta", goal: "Close with one clear action and a brand-safe logo hold." },
  ];

  return {
    sceneCount,
    recommendedSequence: structure.slice(0, Math.max(3, Math.min(structure.length, sceneCount || structure.length))),
    structureRule: "Every segment must map to a selected asset, caption, voiceover segment, and render handoff before any output URL is exposed.",
  };
}

function cropGuidance(platform: string, sourceFormat: string | undefined): string {
  if (["tiktok", "reels", "shorts", "story"].includes(platform)) return sourceFormat === "9:16" ? "native vertical frame" : "center-safe crop to 9:16 with face/text safe zones";
  if (platform === "hero_video_loop" || platform === "website_header_loop") return sourceFormat === "16:9" ? "native landscape frame" : "landscape crop/pad with brand-safe center composition";
  return sourceFormat === "1:1" ? "native square or safe letterbox" : "square-safe crop for chat preview cards";
}

function mutationTarget(platform: string) {
  const targets: Record<string, { duration: number; captionDensity: string; cta: string; hook: string; sound: string }> = {
    tiktok: { duration: 24, captionDensity: "high", cta: "comment/save/DM action", hook: "one-line contradiction or transformation claim", sound: "fast riser and hard beat switches" },
    reels: { duration: 28, captionDensity: "medium_high", cta: "follow/save/share", hook: "visual proof first with creator-value headline", sound: "premium rhythmic lift" },
    shorts: { duration: 32, captionDensity: "medium", cta: "subscribe or watch next", hook: "clear promise inside first 2 seconds", sound: "compressed high-energy bed" },
    story: { duration: 15, captionDensity: "very_high", cta: "tap/link/DM", hook: "single-screen urgency", sound: "impact hit and quick resolves" },
    telegram_promo: { duration: 20, captionDensity: "medium", cta: "join channel or drop keyword", hook: "direct community benefit", sound: "authority pulse and restrained riser" },
    whatsapp_teaser: { duration: 12, captionDensity: "very_high", cta: "reply or forward", hook: "personal direct-response opener", sound: "short luxury impact bed" },
    hero_video_loop: { duration: 8, captionDensity: "low", cta: "no hard CTA; brand atmosphere", hook: "silent visual loop opening", sound: "optional ambient luxury bed" },
    website_header_loop: { duration: 10, captionDensity: "low", cta: "soft brand promise", hook: "brand identity and motion first", sound: "ambient cinematic shimmer" },
  };
  return targets[platform];
}

export function buildAdaptiveTrailerPlan(blueprint: BlueprintLike, pacingPlan: PacingLike) {
  const creatorType = inferCreatorType(blueprint);
  const useCase = inferUseCase(blueprint);
  const vertical = inferVertical(blueprint);
  const format = blueprint.project?.format ?? "16:9";
  const monetizationGoal = useCase === "investor_demo" ? "increase investor or stakeholder confidence" : useCase === "onboarding_narrative" ? "reduce activation friction" : "convert attention into audience, leads, or offer demand";
  const retentionGoal = format === "9:16" ? "win thumb-stop inside 1.5 seconds and retain through CTA" : "sustain cinematic interest while preserving brand clarity";
  const structure = buildStructure(blueprint, creatorType, useCase);
  const platforms = ["tiktok", "reels", "shorts", "story", "telegram_promo", "whatsapp_teaser", "hero_video_loop", "website_header_loop"];

  return {
    version: "creatorvault.adaptive_trailer_planner.v1",
    creatorType,
    useCase,
    vertical,
    targetAudience: vertical === "ai_software" ? "operators and creators evaluating faster production systems" : "high-intent creator economy viewers who need proof before action",
    monetizationGoal,
    retentionGoal,
    structure,
    planningSignals: {
      projectType: blueprint.project?.type ?? "launch_trailer",
      format,
      sourceAssetIds: selectedAssetIds(blueprint),
      sceneCount: blueprint.scenes?.length ?? 0,
      estimatedDurationSeconds: pacingPlan.totalDurationSeconds ?? blueprint.readiness?.estimatedDurationSeconds ?? 0,
      hooksProvided: blueprint.hooks?.length ?? 0,
    },
    platformMutations: platforms.map((platform) => {
      const target = mutationTarget(platform);
      const availableDuration = pacingPlan.totalDurationSeconds ?? blueprint.readiness?.estimatedDurationSeconds ?? target.duration;
      const selectedScenes = (pacingPlan.scenes ?? []).filter((scene, index) => {
        if (target.duration <= 12) return index === 0 || scene.role === "cta" || scene.intensity >= 82;
        if (target.duration <= 20) return index < 3 || scene.role === "cta";
        return true;
      });
      return {
        platform,
        targetDurationSeconds: Math.min(target.duration, Math.max(6, Math.round(availableDuration || target.duration))),
        hookStrategy: target.hook,
        captionDensity: target.captionDensity,
        ctaPressure: target.cta,
        cropLogic: cropGuidance(platform, format),
        pacingAdjustment: target.duration <= 15 ? "compress to hook plus one proof beat plus CTA" : "preserve full sequence with faster midpoint transitions",
        soundDesignBias: target.sound,
        selectedSourceAssetIds: selectedScenes.map((scene) => scene.sourceAssetId).filter(Boolean),
        renderClaim: "mutation plan only; no platform-specific output URL is claimed until a real render job completes",
      };
    }),
  };
}

export async function buildCloneAwareTrailerMode(blueprint: BlueprintLike) {
  const selectedAssets = blueprint.assetIntelligence ?? [];
  const cloneAssets = selectedAssets.filter((asset) => {
    const feature = `${asset.createdByFeature ?? ""} ${asset.sourceType ?? ""} ${asset.fileName ?? ""}`.toLowerCase();
    return feature.includes("clone") || feature.includes("replicate");
  });

  let productionModel: any | null = null;
  let registryError: string | null = null;
  try {
    productionModel = await getProductionModel();
  } catch (error: any) {
    registryError = error?.message ?? "clone registry unavailable";
  }

  const hasProductionModel = Boolean(productionModel);
  return {
    version: "creatorvault.clone_aware_trailer_mode.v1",
    mode: hasProductionModel || cloneAssets.length > 0 ? "kingcam_clone_factory_supported" : "clone_mode_planned_but_not_active",
    productionModel: productionModel ? {
      id: productionModel.id ?? null,
      modelName: productionModel.model_name ?? productionModel.modelName ?? null,
      version: productionModel.version ?? null,
      status: productionModel.status ?? null,
      triggerWord: productionModel.trigger_word ?? productionModel.triggerWord ?? null,
      promotedToProduction: Boolean(productionModel.promoted_to_production ?? productionModel.promotedToProduction),
      hasArtifactUrl: Boolean(productionModel.model_artifact_url ?? productionModel.modelArtifactUrl),
      identityScore: productionModel.identity_score ?? productionModel.identityScore ?? null,
      realismScore: productionModel.realism_score ?? productionModel.realismScore ?? null,
      consistencyScore: productionModel.consistency_score ?? productionModel.consistencyScore ?? null,
    } : null,
    selectedCloneAssetIds: cloneAssets.map((asset) => asset.id).filter(Boolean),
    cloneSceneOpportunities: (blueprint.scenes ?? []).map((scene, index) => {
      const role = String(scene.role ?? "").toLowerCase();
      const opportunity = role === "hook" ? "talking-head founder intro" : role === "proof" ? "clone narration over proof asset" : role === "cta" ? "direct-to-camera clone CTA" : "motivational clone transition or hero shot";
      return {
        sceneIndex: Number(scene.sceneIndex ?? index),
        sourceAssetId: scene.sourceAssetId ?? null,
        role,
        opportunity,
        groundingRequirement: "Use only selected clone media assets or production clone model outputs that are persisted and validated before rendering.",
      };
    }),
    registryStatus: registryError ? "registry_lookup_failed" : hasProductionModel ? "production_model_found" : "no_promoted_production_model",
    warnings: [
      ...(registryError ? [`Clone registry lookup failed: ${registryError}`] : []),
      ...(!hasProductionModel ? ["No promoted production clone model was resolved; clone mode remains a deterministic plan until model evidence exists."] : []),
      ...(cloneAssets.length === 0 ? ["No selected clone-created media asset was detected; clone scenes require future grounded clone assets or model render jobs."] : []),
    ],
  };
}
