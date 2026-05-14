import {
  MEDIA_OS_CONTRACT_COVERAGE,
  normalizeWarning,
  type CloneSequenceManifest,
  type DistributionManifest,
  type MediaOSCommandCenterManifest,
  type MediaOSManifestEnvelope,
  type MediaOSStageBoundary,
  type MediaOSStageStatus,
  type MediaOSWarning,
  type MutationManifest,
  type PacingManifest,
  type RenderManifest,
  type RetentionReport,
  type SceneManifest,
  type TimelineManifest,
  type ValidationReport,
  type VoiceoverManifest,
} from "../contracts/mediaContracts";
import { createMediaOSEvent, MEDIA_OS_EVENT_NAMES, sortMediaOSEvents } from "../events/mediaEvents";
import { buildOperationalMediaOSManifest } from "../operational/operationalMediaOS";

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function collectWarnings(source: string, warnings: unknown): MediaOSWarning[] {
  return asArray(warnings).map((warning) => normalizeWarning(source, warning));
}

function buildSceneManifests(blueprint: any): SceneManifest[] {
  let cursor = 0;
  return asArray<any>(blueprint?.scenes).map((scene, index) => {
    const durationSeconds = Math.max(1, asNumber(scene?.durationSeconds, 4));
    const startSecond = cursor;
    const endSecond = cursor + durationSeconds;
    cursor = endSecond;
    const role = asString(scene?.role, index === 0 ? "hook" : "scene");
    return {
      contract: "SceneManifest",
      sceneIndex: asNumber(scene?.sceneIndex, index),
      role,
      sourceAssetId: scene?.sourceAssetId ? String(scene.sourceAssetId) : null,
      sourceUrl: scene?.sourceUrl ? String(scene.sourceUrl) : null,
      assetKind: scene?.assetKind ? String(scene.assetKind) : null,
      durationSeconds,
      startSecond,
      endSecond,
      overlayText: asString(scene?.overlayText, `Scene ${index + 1}`),
      visualDirection: asString(scene?.visualDirection, "Use verified CreatorVault media asset with safe cinematic framing."),
      requiredRenderTreatment: asString(scene?.requiredRenderTreatment, "native_or_safe_fit"),
      logoTiming: index === 0 ? "intro" : role === "cta" ? "outro" : "persistent",
      ctaPlacement: role === "cta" ? "direct" : role === "offer" ? "soft" : "none",
      warnings: collectWarnings(`scene:${index}`, scene?.warnings),
    };
  });
}

function buildPacingManifest(blueprint: any, scenes: SceneManifest[]): PacingManifest {
  const cinematicBeats = asArray<any>(blueprint?.cinematicPacing?.timeline ?? blueprint?.cinematicPacing?.beats ?? blueprint?.timelineInspector?.timeline);
  const beats = scenes.map((scene, index) => {
    const sourceBeat = cinematicBeats[index] ?? {};
    return {
      sceneIndex: scene.sceneIndex,
      startSecond: asNumber(sourceBeat.startSecond ?? sourceBeat.start ?? scene.startSecond, scene.startSecond),
      endSecond: asNumber(sourceBeat.endSecond ?? sourceBeat.end ?? scene.endSecond, scene.endSecond),
      intensity: Math.max(0, Math.min(100, asNumber(sourceBeat.intensity ?? sourceBeat.energy ?? (index === 0 ? 88 : scene.role === "cta" ? 82 : 68), 68))),
      beat: asString(sourceBeat.beat ?? sourceBeat.label, `${scene.role}_beat`),
      retentionIntent: asString(sourceBeat.retentionIntent ?? sourceBeat.intent, scene.role === "hook" ? "stop_scroll" : scene.role === "cta" ? "convert" : "advance_story"),
    };
  });
  const averageIntensity = beats.length > 0 ? Math.round(beats.reduce((sum, beat) => sum + beat.intensity, 0) / beats.length) : 0;
  return {
    contract: "PacingManifest",
    totalDurationSeconds: scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0),
    beats,
    averageIntensity,
    warnings: collectWarnings("cinematicPacing", blueprint?.cinematicPacing?.warnings),
  };
}

function buildVoiceoverManifest(blueprint: any, scenes: SceneManifest[]): VoiceoverManifest {
  const voiceoverSync = blueprint?.voiceoverSync ?? {};
  const segments = asArray<any>(voiceoverSync?.segments).length > 0
    ? asArray<any>(voiceoverSync?.segments).map((segment, index) => ({
        sceneIndex: asNumber(segment?.sceneIndex, index),
        startSecond: asNumber(segment?.startSecond ?? segment?.start, scenes[index]?.startSecond ?? 0),
        endSecond: asNumber(segment?.endSecond ?? segment?.end, scenes[index]?.endSecond ?? 0),
        text: asString(segment?.text ?? segment?.line, scenes[index]?.overlayText ?? ""),
        syncStatus: asString(segment?.syncStatus ?? segment?.status, "planned"),
      }))
    : scenes.map((scene) => ({
        sceneIndex: scene.sceneIndex,
        startSecond: scene.startSecond,
        endSecond: scene.endSecond,
        text: scene.overlayText,
        syncStatus: "planned_from_scene_manifest",
      }));
  return {
    contract: "VoiceoverManifest",
    status: asString(voiceoverSync?.generationStatus, "planned").includes("render") ? "complete" : "planned",
    voiceId: voiceoverSync?.voiceId ? String(voiceoverSync.voiceId) : "rwc11bXCBw5KydM4avHE",
    generationStatus: asString(voiceoverSync?.generationStatus, "planned_not_rendered"),
    segments,
    warnings: collectWarnings("voiceoverSync", voiceoverSync?.warnings),
  };
}

function buildCloneSequenceManifest(blueprint: any): CloneSequenceManifest {
  const cloneIntegration = blueprint?.cloneIntegration ?? {};
  const registryStatus = asString(cloneIntegration?.registryStatus, "registry_status_unknown");
  return {
    contract: "CloneSequenceManifest",
    status: registryStatus.includes("ready") || registryStatus.includes("available") ? "complete" : "planned",
    mode: asString(cloneIntegration?.mode, "clone_aware_trailer_mode"),
    registryStatus,
    cloneSceneOpportunities: asArray(cloneIntegration?.cloneSceneOpportunities),
    warnings: collectWarnings("cloneIntegration", cloneIntegration?.warnings),
  };
}

function buildMutationManifest(blueprint: any): MutationManifest {
  const branches = asArray<any>(blueprint?.platformMutations ?? blueprint?.adaptiveTrailerPlan?.platformMutations).map((variant) => ({
    platform: asString(variant?.platform ?? variant?.name, "platform_variant"),
    format: variant?.format ? String(variant.format) : blueprint?.project?.format ? String(blueprint.project.format) : null,
    targetDurationSeconds: variant?.targetDurationSeconds === undefined ? null : asNumber(variant.targetDurationSeconds, 0),
    hook: variant?.hook ? String(variant.hook) : variant?.openingHook ? String(variant.openingHook) : null,
    cta: variant?.cta ? String(variant.cta) : variant?.callToAction ? String(variant.callToAction) : null,
    status: "planned" as MediaOSStageStatus,
  }));
  return {
    contract: "MutationManifest",
    branchCount: branches.length,
    branches,
    warnings: collectWarnings("adaptiveTrailerPlan", blueprint?.adaptiveTrailerPlan?.warnings),
  };
}

function buildRetentionReport(blueprint: any): RetentionReport {
  const retention = blueprint?.retentionAnalysis ?? {};
  return {
    contract: "RetentionReport",
    status: "complete",
    scores: typeof retention?.scores === "object" && retention.scores ? retention.scores : {},
    deadZones: asArray(retention?.deadZones),
    weakHooks: asArray(retention?.weakHooks),
    replayMoments: asArray(retention?.replayMoments),
    textOverload: asArray(retention?.textOverload),
    ctaFatigue: asArray(retention?.ctaFatigue),
    conversionPressure: asArray(retention?.conversionPressure),
    warnings: collectWarnings("retentionAnalysis", retention?.warnings),
  };
}

function buildTimelineManifest(blueprint: any, scenes: SceneManifest[]): TimelineManifest {
  const transitions = scenes.slice(0, -1).map((scene, index) => ({
    fromSceneIndex: scene.sceneIndex,
    toSceneIndex: scenes[index + 1]?.sceneIndex ?? scene.sceneIndex + 1,
    transition: asString(blueprint?.soundDesign?.transitions?.[index]?.transition, index === 0 ? "cinematic_snap" : "motivated_cut"),
    durationSeconds: asNumber(blueprint?.soundDesign?.transitions?.[index]?.durationSeconds, 0.2),
  }));
  const audioLayers = scenes.flatMap((scene) => [
    {
      layerId: `music-scene-${scene.sceneIndex}`,
      type: "music" as const,
      startSecond: scene.startSecond,
      endSecond: scene.endSecond,
      status: "planned" as MediaOSStageStatus,
      description: `Music bed follows ${scene.role} intensity from pacing manifest.`,
    },
    {
      layerId: `voiceover-scene-${scene.sceneIndex}`,
      type: "voiceover" as const,
      startSecond: scene.startSecond,
      endSecond: scene.endSecond,
      status: "planned" as MediaOSStageStatus,
      description: `Voiceover sync segment for scene ${scene.sceneIndex}.`,
    },
  ]);
  return {
    contract: "TimelineManifest",
    totalDurationSeconds: scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0),
    format: asString(blueprint?.project?.format, "16:9"),
    sceneCount: scenes.length,
    scenes,
    transitions,
    audioLayers,
    logoWindows: scenes.map((scene) => ({ sceneIndex: scene.sceneIndex, startSecond: scene.startSecond, endSecond: Math.min(scene.endSecond, scene.startSecond + 1.5), placement: scene.logoTiming })),
    ctaWindows: scenes.filter((scene) => scene.ctaPlacement !== "none").map((scene) => ({ sceneIndex: scene.sceneIndex, startSecond: Math.max(scene.startSecond, scene.endSecond - 2), endSecond: scene.endSecond, intensity: scene.ctaPlacement })),
    warnings: collectWarnings("timelineInspector", blueprint?.timelineInspector?.warnings),
  };
}

function buildValidationReport(blueprint: any): ValidationReport {
  const readinessWarnings = asArray<string>(blueprint?.readiness?.warnings);
  const integrity = blueprint?.manifestIntegrity ?? {};
  return {
    contract: "ValidationReport",
    status: readinessWarnings.length > 0 ? "warning" : "handoff_prepared",
    independentValidationRequired: true,
    requiredChecks: [
      "asset_existence",
      "logo_authenticity",
      "terminology_integrity",
      "hallucination_prevention",
      "spelling_and_overlay_text",
      "timeline_integrity",
      "render_integrity",
      "audio_presence",
      "deterministic_reference_integrity",
    ],
    blockingWarnings: readinessWarnings,
    warnings: [
      ...collectWarnings("readiness", readinessWarnings),
      normalizeWarning("manifestIntegrity", asString(integrity?.noRenderClaim, "No render output is claimed until renderer validation succeeds."), "info"),
    ],
  };
}

function buildRenderManifest(blueprint: any): RenderManifest {
  const renderHandoff = blueprint?.renderHandoff ?? {};
  return {
    contract: "RenderManifest",
    status: "handoff_prepared",
    recommendedNextEngine: renderHandoff?.recommendedNextEngine ? String(renderHandoff.recommendedNextEngine) : "remotion_or_ffmpeg_with_optional_pollo_scene_extension",
    renderClaim: asString(blueprint?.cinematicOS?.renderClaim ?? renderHandoff?.status, "Manifest only; no rendered video output is claimed until a real render job writes output_url."),
    requiredBeforeRender: asArray<string>(renderHandoff?.requiredBeforeRender),
    consumesValidatedManifestOnly: true,
    warnings: collectWarnings("renderHandoff", renderHandoff?.warnings),
  };
}

function buildDistributionManifest(): DistributionManifest {
  return {
    contract: "DistributionManifest",
    status: "blocked",
    readyWhen: "real_render_output_url_exists_and_validation_passes",
    destinations: ["creatorvault_project_library", "future_platform_distribution_manifest"],
    warnings: [normalizeWarning("distribution", "Distribution remains blocked until render completion and validation proof exist.", "info")],
  };
}

function buildStageBoundaries(): MediaOSStageBoundary[] {
  return [
    { stage: "grounding", producer: "mediaAssets.createTrailerProject", consumes: [], emits: ["SceneManifest"], status: "complete", isolationClaim: "Grounding resolves ready user-owned media assets and does not call renderers or providers." },
    { stage: "narrative_planning", producer: "buildGroundedTrailerBlueprint", consumes: ["SceneManifest"], emits: ["SceneManifest"], status: "complete", isolationClaim: "Narrative planning emits structured scene intent without rendering or distribution side effects." },
    { stage: "pacing", producer: "cinematicPacingEngine", consumes: ["SceneManifest"], emits: ["PacingManifest"], status: "complete", isolationClaim: "Pacing remains analytical and does not mutate render internals." },
    { stage: "voiceover", producer: "kingcamVoiceoverSync", consumes: ["SceneManifest", "PacingManifest"], emits: ["VoiceoverManifest"], status: "planned", isolationClaim: "Voiceover sync describes timing and provider metadata without rendering video." },
    { stage: "clone_integration", producer: "cloneAwareTrailerMode", consumes: ["SceneManifest"], emits: ["CloneSequenceManifest"], status: "planned", isolationClaim: "Clone integration records registry readiness and opportunities without training or provider side effects." },
    { stage: "mutation_planning", producer: "adaptiveTrailerPlanner", consumes: ["SceneManifest", "PacingManifest"], emits: ["MutationManifest"], status: "complete", isolationClaim: "Mutation planning emits branch manifests without modifying render internals." },
    { stage: "retention_analysis", producer: "trailerRetentionAnalyzer", consumes: ["SceneManifest", "PacingManifest", "MutationManifest"], emits: ["RetentionReport"], status: "complete", isolationClaim: "Retention analysis emits scores and warnings but does not mutate timeline or renderer state." },
    { stage: "timeline_assembly", producer: "trailerMediaOSOrchestrator", consumes: ["SceneManifest", "PacingManifest", "VoiceoverManifest", "CloneSequenceManifest", "MutationManifest", "RetentionReport"], emits: ["TimelineManifest"], status: "complete", isolationClaim: "Timeline assembly composes manifests and event metadata only." },
    { stage: "validation", producer: "validationHandoff", consumes: ["TimelineManifest", "RenderManifest"], emits: ["ValidationReport"], status: "handoff_prepared", isolationClaim: "Validation remains independent and mandatory before any real render/distribution claim." },
    { stage: "rendering", producer: "remotionRenderService", consumes: ["ValidationReport", "RenderManifest"], emits: ["RenderManifest"], status: "handoff_prepared", isolationClaim: "Rendering consumes validated contracts and remains separate from planning, pacing, mutation, voice, and clone services." },
    { stage: "distribution", producer: "distributionHandoff", consumes: ["RenderManifest"], emits: ["DistributionManifest"], status: "blocked", isolationClaim: "Distribution remains blocked until a real render output and validation proof exist." },
  ];
}

export function buildTrailerMediaOSManifest(blueprint: any): MediaOSManifestEnvelope {
  const generatedAt = new Date().toISOString();
  const selectedAssetIds = asArray<string>(blueprint?.lineage?.selectedAssetIds).map(String);
  const trailerProjectId = blueprint?.trailerProjectId ? String(blueprint.trailerProjectId) : null;
  const scenes = buildSceneManifests(blueprint);
  const pacing = buildPacingManifest(blueprint, scenes);
  const voiceover = buildVoiceoverManifest(blueprint, scenes);
  const cloneSequence = buildCloneSequenceManifest(blueprint);
  const mutations = buildMutationManifest(blueprint);
  const retention = buildRetentionReport(blueprint);
  const timeline = buildTimelineManifest(blueprint, scenes);
  const validation = buildValidationReport(blueprint);
  const render = buildRenderManifest(blueprint);
  const distribution = buildDistributionManifest();
  const stageBoundaries = buildStageBoundaries();

  const eventLog = sortMediaOSEvents([
    createMediaOSEvent({ sequence: 1, name: MEDIA_OS_EVENT_NAMES.TRAILER_ASSETS_RESOLVED, stage: "grounding", status: "complete", producer: "mediaAssets.createTrailerProject", trailerProjectId, selectedAssetIds, consumes: [], emits: ["SceneManifest"], timestamp: generatedAt, warnings: timeline.warnings, notes: "Ready user-owned media assets were resolved before manifest assembly." }),
    createMediaOSEvent({ sequence: 2, name: MEDIA_OS_EVENT_NAMES.TRAILER_NARRATIVE_COMPLETE, stage: "narrative_planning", status: "complete", producer: "buildGroundedTrailerBlueprint", trailerProjectId, selectedAssetIds, consumes: ["SceneManifest"], emits: ["SceneManifest"], timestamp: generatedAt, warnings: scenes.flatMap((scene) => scene.warnings), notes: "Grounded scene roles, overlay text, visual direction, and render treatment were emitted as scene manifests." }),
    createMediaOSEvent({ sequence: 3, name: MEDIA_OS_EVENT_NAMES.TRAILER_PACING_COMPLETE, stage: "pacing", status: "complete", producer: "cinematicPacingEngine", trailerProjectId, selectedAssetIds, consumes: ["SceneManifest"], emits: ["PacingManifest"], timestamp: generatedAt, warnings: pacing.warnings, notes: "Pacing analysis remains an analytical manifest and does not mutate rendering." }),
    createMediaOSEvent({ sequence: 4, name: MEDIA_OS_EVENT_NAMES.VOICEOVER_RENDERED, stage: "voiceover", status: voiceover.status, producer: "kingcamVoiceoverSync", trailerProjectId, selectedAssetIds, consumes: ["SceneManifest", "PacingManifest"], emits: ["VoiceoverManifest"], timestamp: generatedAt, warnings: voiceover.warnings, notes: "Voiceover timing is synchronized as a manifest; actual provider rendering status is represented explicitly." }),
    createMediaOSEvent({ sequence: 5, name: MEDIA_OS_EVENT_NAMES.CLONE_SEQUENCE_READY, stage: "clone_integration", status: cloneSequence.status, producer: "cloneAwareTrailerMode", trailerProjectId, selectedAssetIds, consumes: ["SceneManifest"], emits: ["CloneSequenceManifest"], timestamp: generatedAt, warnings: cloneSequence.warnings, notes: "Clone opportunities remain provider-isolated and registry-aware." }),
    createMediaOSEvent({ sequence: 6, name: MEDIA_OS_EVENT_NAMES.MUTATIONS_GENERATED, stage: "mutation_planning", status: "complete", producer: "adaptiveTrailerPlanner", trailerProjectId, selectedAssetIds, consumes: ["SceneManifest", "PacingManifest"], emits: ["MutationManifest"], timestamp: generatedAt, warnings: mutations.warnings, notes: "Platform branches were emitted as mutation manifests without altering render internals." }),
    createMediaOSEvent({ sequence: 7, name: MEDIA_OS_EVENT_NAMES.TIMELINE_ASSEMBLED, stage: "timeline_assembly", status: "complete", producer: "trailerMediaOSOrchestrator", trailerProjectId, selectedAssetIds, consumes: ["SceneManifest", "PacingManifest", "VoiceoverManifest", "CloneSequenceManifest", "MutationManifest", "RetentionReport"], emits: ["TimelineManifest"], timestamp: generatedAt, warnings: timeline.warnings, notes: "Timeline command-center data was assembled from manifest inputs only." }),
    createMediaOSEvent({ sequence: 8, name: MEDIA_OS_EVENT_NAMES.VALIDATION_PASSED, stage: "validation", status: validation.status, producer: "validationHandoff", trailerProjectId, selectedAssetIds, consumes: ["TimelineManifest", "RenderManifest"], emits: ["ValidationReport"], timestamp: generatedAt, warnings: validation.warnings, notes: "Independent validation requirements were prepared; this event does not bypass validation." }),
    createMediaOSEvent({ sequence: 9, name: MEDIA_OS_EVENT_NAMES.RENDER_COMPLETE, stage: "rendering", status: render.status, producer: "remotionRenderService", trailerProjectId, selectedAssetIds, consumes: ["ValidationReport", "RenderManifest"], emits: ["RenderManifest"], timestamp: generatedAt, warnings: render.warnings, notes: "Render handoff is prepared only; no video output is claimed by planning." }),
    createMediaOSEvent({ sequence: 10, name: MEDIA_OS_EVENT_NAMES.DISTRIBUTION_READY, stage: "distribution", status: distribution.status, producer: "distributionHandoff", trailerProjectId, selectedAssetIds, consumes: ["RenderManifest"], emits: ["DistributionManifest"], timestamp: generatedAt, warnings: distribution.warnings, notes: "Distribution is blocked until real render output and validation proof exist." }),
  ]);

  const timelineCommandCenter: MediaOSCommandCenterManifest = {
    version: "creatorvault.media_command_center.v1",
    sceneCount: scenes.length,
    totalDurationSeconds: timeline.totalDurationSeconds,
    scenes,
    pacing,
    voiceover,
    cloneSequence,
    mutations,
    retention,
    timeline,
    validation,
    render,
    distribution,
  };

  const mediaOSManifest: MediaOSManifestEnvelope = {
    version: "creatorvault.media_os.v1",
    generatedAt,
    trailerProjectId,
    deterministicBasis: asString(blueprint?.manifestIntegrity?.deterministicBasis, "ordered ready user-owned media_assets plus user project input"),
    contractCoverage: MEDIA_OS_CONTRACT_COVERAGE,
    stageBoundaries,
    eventLog,
    timelineCommandCenter,
    validationHandoff: validation,
    renderHandoff: render,
    distributionHandoff: distribution,
    orchestrationTrace: stageBoundaries.map((boundary) => ({
      stage: boundary.stage,
      inputContracts: boundary.consumes,
      outputContracts: boundary.emits,
      proof: boundary.isolationClaim,
    })),
    architectureGuards: {
      noGodService: true,
      noHiddenProviderCalls: true,
      validationIndependent: true,
      renderPipelineSeparate: true,
      deterministicManifestPreserved: true,
      existingTrailerRoutePreserved: true,
    },
    warnings: [
      ...timeline.warnings,
      ...validation.warnings,
      ...render.warnings,
      ...distribution.warnings,
    ],
  };

  const operationalCommandCenter = buildOperationalMediaOSManifest(mediaOSManifest);
  return {
    ...mediaOSManifest,
    operationalCommandCenter,
  };
}
