type SceneLike = {
  sceneIndex?: number;
  role?: string;
  durationSeconds?: number;
  overlayText?: string;
  sourceAssetId?: string;
  sourceUrl?: string;
  assetKind?: string;
  warnings?: string[];
};

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
    warnings?: string[];
  };
  hooks?: string[];
  scenes?: SceneLike[];
  assetIntelligence?: Array<{
    id?: string;
    kind?: string;
    durationSeconds?: number | null;
    hasAudio?: boolean;
    hasVideo?: boolean;
    suitabilityScore?: number;
    warnings?: string[];
  }>;
  lineage?: {
    selectedAssetIds?: string[];
  };
};

export type CinematicPacingScene = {
  sceneIndex: number;
  role: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  sourceAssetId: string | null;
  intensity: number;
  transitionEnergy: number;
  motionIntensity: number;
  brollDensity: number;
  textDensity: number;
  captionWindow: { startSeconds: number; endSeconds: number; maxCharacters: number };
  logoWindow: { startSeconds: number; endSeconds: number; treatment: string };
  beatLabel: string;
  editorialDirective: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function roleIntensity(role: string, index: number, total: number): number {
  const normalized = role.toLowerCase();
  if (normalized === "hook") return 92;
  if (normalized === "cta") return 88;
  if (normalized === "offer") return 82;
  if (normalized === "proof") return 74;
  const middleLift = total <= 1 ? 0 : Math.sin((index / Math.max(1, total - 1)) * Math.PI) * 16;
  return clamp(64 + middleLift, 52, 84);
}

function textDensity(text: string | undefined, durationSeconds: number): number {
  const chars = (text ?? "").trim().length;
  if (!durationSeconds) return 0;
  return round(chars / durationSeconds, 2);
}

function beatLabelFor(role: string, index: number, total: number): string {
  if (role === "hook") return "scroll-stop hook";
  if (role === "proof") return "proof acceleration";
  if (role === "offer") return "value compression";
  if (role === "cta") return "conversion close";
  if (index === Math.floor(total / 2)) return "emotional midpoint";
  return "transformation beat";
}

export function buildCinematicPacingPlan(blueprint: BlueprintLike) {
  const scenes = Array.isArray(blueprint.scenes) ? blueprint.scenes : [];
  let cursor = 0;
  const pacedScenes: CinematicPacingScene[] = scenes.map((scene, index) => {
    const total = Math.max(1, scenes.length);
    const role = String(scene.role ?? (index === 0 ? "hook" : index === total - 1 ? "cta" : "transformation")).toLowerCase();
    const rawDuration = Number(scene.durationSeconds ?? 4);
    const durationSeconds = clamp(Number.isFinite(rawDuration) ? rawDuration : 4, 2.5, role === "hook" ? 5 : 10);
    const startSeconds = cursor;
    const endSeconds = startSeconds + durationSeconds;
    cursor = endSeconds;
    const intensity = roleIntensity(role, index, total);
    const density = textDensity(scene.overlayText, durationSeconds);
    const transitionEnergy = clamp(intensity + (index === 0 ? 4 : index === total - 1 ? 2 : 0) - density * 0.8, 35, 98);
    const motionIntensity = clamp(intensity + (scene.assetKind === "video" ? 4 : -3), 30, 98);
    const brollDensity = clamp(scene.assetKind === "video" ? 0.35 + intensity / 220 : 0.18 + intensity / 300, 0.25, 0.86);
    const captionStart = round(startSeconds + Math.min(0.25, durationSeconds * 0.08));
    const captionEnd = round(endSeconds - Math.min(0.35, durationSeconds * 0.1));

    return {
      sceneIndex: Number(scene.sceneIndex ?? index),
      role,
      startSeconds: round(startSeconds),
      endSeconds: round(endSeconds),
      durationSeconds: round(durationSeconds),
      sourceAssetId: scene.sourceAssetId ? String(scene.sourceAssetId) : null,
      intensity: round(intensity, 1),
      transitionEnergy: round(transitionEnergy, 1),
      motionIntensity: round(motionIntensity, 1),
      brollDensity: round(brollDensity, 2),
      textDensity: density,
      captionWindow: {
        startSeconds: captionStart,
        endSeconds: Math.max(captionStart, captionEnd),
        maxCharacters: density > 16 ? 34 : density > 10 ? 46 : 62,
      },
      logoWindow: {
        startSeconds: round(Math.max(startSeconds, endSeconds - Math.min(1.4, durationSeconds * 0.32))),
        endSeconds: round(endSeconds),
        treatment: role === "cta" ? "full creatorvault lockup" : "corner watermark pulse",
      },
      beatLabel: beatLabelFor(role, index, total),
      editorialDirective: `Cut ${role} scene from ${round(startSeconds)}s to ${round(endSeconds)}s with intensity ${round(intensity, 1)}; synchronize overlay, caption, and transition before moving to the next grounded asset.`,
    };
  });

  const totalDurationSeconds = round(pacedScenes.reduce((sum, scene) => sum + scene.durationSeconds, 0));
  const intensityCurve = pacedScenes.map((scene) => ({
    timeSeconds: scene.startSeconds,
    sceneIndex: scene.sceneIndex,
    intensity: scene.intensity,
    label: scene.beatLabel,
  })).concat(pacedScenes.length > 0 ? [{
    timeSeconds: pacedScenes[pacedScenes.length - 1].endSeconds,
    sceneIndex: pacedScenes[pacedScenes.length - 1].sceneIndex,
    intensity: pacedScenes[pacedScenes.length - 1].intensity,
    label: "final frame hold",
  }] : []);

  const pacingWarnings: string[] = [];
  const denseScenes = pacedScenes.filter((scene) => scene.textDensity > 18);
  if (denseScenes.length > 0) pacingWarnings.push(`${denseScenes.length} scene(s) exceed cinematic text density and should use shorter captions.`);
  if (totalDurationSeconds < 7 && pacedScenes.length > 1) pacingWarnings.push("Trailer is very short for multi-scene storytelling; use aggressive cuts and minimal captions.");
  if (totalDurationSeconds > 55) pacingWarnings.push("Trailer exceeds short-form retention norms; prioritize platform mutations under 35 seconds.");

  return {
    version: "creatorvault.cinematic_pacing_engine.v1",
    totalDurationSeconds,
    averageSceneDurationSeconds: pacedScenes.length ? round(totalDurationSeconds / pacedScenes.length) : 0,
    hookWindow: pacedScenes[0] ? { startSeconds: pacedScenes[0].startSeconds, endSeconds: Math.min(pacedScenes[0].endSeconds, 3), target: "scroll-stop decision inside first 3 seconds" } : null,
    climaxWindow: pacedScenes.length ? pacedScenes.reduce((best, scene) => scene.intensity > best.intensity ? scene : best, pacedScenes[0]) : null,
    ctaWindow: pacedScenes.find((scene) => scene.role === "cta") ?? pacedScenes[pacedScenes.length - 1] ?? null,
    scenes: pacedScenes,
    intensityCurve,
    pacingWarnings,
    deterministicInputs: {
      sceneCount: pacedScenes.length,
      selectedAssetIds: blueprint.lineage?.selectedAssetIds ?? pacedScenes.map((scene) => scene.sourceAssetId).filter(Boolean),
      sourceBlueprintGeneratedAt: blueprint.generatedAt ?? null,
    },
  };
}

export function buildSoundDesignPlan(blueprint: BlueprintLike, pacingPlan: ReturnType<typeof buildCinematicPacingPlan>) {
  const scenes = pacingPlan.scenes ?? [];
  return {
    version: "creatorvault.sound_design_plan.v1",
    masterSoundscape: blueprint.project?.format === "9:16" ? "vertical luxury-hype mix with tight bass impacts and fast risers" : "cinematic brand-film mix with warm low-end, gold-impact hits, and controlled ambient tension",
    mixTargets: {
      dialoguePriority: "voiceover and captions remain intelligible over all music beds",
      impactBus: "bass hits, whooshes, and risers are scene-synchronized, not filler background audio",
      loudnessIntent: "short-form punch with safe headroom for social platforms",
    },
    scenes: scenes.map((scene, index) => ({
      sceneIndex: scene.sceneIndex,
      role: scene.role,
      startSeconds: scene.startSeconds,
      endSeconds: scene.endSeconds,
      primaryCue: scene.role === "hook" ? "sub bass hit plus reverse riser" : scene.role === "cta" ? "resolved impact hit with brand shimmer tail" : scene.intensity >= 82 ? "impact whoosh into rhythmic lift" : "ambient tension bed with soft transition swell",
      transitionCue: index === scenes.length - 1 ? "final logo shimmer and micro reverb tail" : scene.transitionEnergy > 80 ? "fast whoosh cut and cymbal lift" : "soft pulse bridge",
      musicTiming: {
        downbeatSeconds: scene.startSeconds,
        accentSeconds: round(scene.startSeconds + scene.durationSeconds * 0.42),
        releaseSeconds: round(scene.endSeconds - 0.18),
      },
      intensity: scene.intensity,
      noFillerRule: "Every cue is tied to a scene beat, caption entrance, transition, or CTA hold.",
    })),
  };
}

export function buildVoiceoverSyncPlan(blueprint: BlueprintLike, pacingPlan: ReturnType<typeof buildCinematicPacingPlan>) {
  const voiceId = process.env.KINGCAM_ELEVEN_VOICE_ID || "rwc11bXCBw5KydM4avHE";
  const providerReady = Boolean(process.env.ELEVENLABS_API_KEY);
  const scenes = pacingPlan.scenes ?? [];
  return {
    version: "creatorvault.kingcam_voiceover_sync.v1",
    provider: "elevenlabs",
    providerReady,
    voiceId,
    voiceProfile: {
      name: "KingCam",
      modes: ["cinematic", "founder", "hype", "motivational", "onboarding", "investor_demo"],
      defaultSpeed: 0.95,
      stability: 0.5,
      similarityBoost: 0.85,
      style: 0.35,
    },
    generationStatus: providerReady ? "ready_for_tts_job" : "planned_only_provider_key_not_present_in_runtime",
    segments: scenes.map((scene) => {
      const sourceScene = (blueprint.scenes ?? [])[scene.sceneIndex] ?? {};
      const text = String(sourceScene.overlayText ?? "").trim();
      const words = text ? text.split(/\s+/).length : 0;
      const estimatedSpeechSeconds = round(Math.max(1.1, words / 2.35 + (text.match(/[.!?]/g) || []).length * 0.28));
      const available = Math.max(0.5, scene.durationSeconds - 0.35);
      const compression = round(estimatedSpeechSeconds / available, 2);
      const emphasisWords = text.split(/\s+/).filter((word) => /[A-Z]{2,}|\$|%|launch|creator|vault|clone|proof|win|scale|offer/i.test(word)).slice(0, 5);
      return {
        sceneIndex: scene.sceneIndex,
        role: scene.role,
        text,
        startSeconds: scene.startSeconds,
        endSeconds: scene.endSeconds,
        estimatedSpeechSeconds,
        pauseBeforeSeconds: scene.role === "hook" ? 0 : 0.12,
        pauseAfterSeconds: scene.role === "cta" ? 0.42 : 0.18,
        compressionRatio: compression,
        syncStatus: compression <= 1.08 ? "fits_scene" : "needs_caption_split_or_faster_read",
        emphasisWords,
        captionWindow: scene.captionWindow,
        transitionSync: scene.role === "cta" ? "land final phrase before logo hold" : "release final syllable into transition cue",
      };
    }),
  };
}

export function buildTimelineInspectorModel(
  blueprint: BlueprintLike,
  pacingPlan: ReturnType<typeof buildCinematicPacingPlan>,
  soundDesign: ReturnType<typeof buildSoundDesignPlan>,
  voiceoverSync: ReturnType<typeof buildVoiceoverSyncPlan>
) {
  const sceneLane = pacingPlan.scenes.map((scene) => ({
    lane: "scenes",
    sceneIndex: scene.sceneIndex,
    label: `${scene.role} · ${scene.beatLabel}`,
    startSeconds: scene.startSeconds,
    endSeconds: scene.endSeconds,
    intensity: scene.intensity,
    sourceAssetId: scene.sourceAssetId,
  }));
  const captionLane = pacingPlan.scenes.map((scene) => ({
    lane: "captions",
    sceneIndex: scene.sceneIndex,
    label: `Caption max ${scene.captionWindow.maxCharacters} chars`,
    startSeconds: scene.captionWindow.startSeconds,
    endSeconds: scene.captionWindow.endSeconds,
    intensity: scene.textDensity,
  }));
  const voiceLane = voiceoverSync.segments.map((segment) => ({
    lane: "voiceover",
    sceneIndex: segment.sceneIndex,
    label: segment.syncStatus,
    startSeconds: segment.startSeconds,
    endSeconds: segment.endSeconds,
    intensity: segment.compressionRatio,
  }));
  const soundLane = soundDesign.scenes.map((scene) => ({
    lane: "sound",
    sceneIndex: scene.sceneIndex,
    label: scene.primaryCue,
    startSeconds: scene.startSeconds,
    endSeconds: scene.endSeconds,
    intensity: scene.intensity,
  }));

  return {
    version: "creatorvault.timeline_inspector.v1",
    totalDurationSeconds: pacingPlan.totalDurationSeconds,
    format: blueprint.project?.format ?? "16:9",
    lanes: [sceneLane, captionLane, voiceLane, soundLane].flat(),
    intensityCurve: pacingPlan.intensityCurve,
    inspectorNotes: [
      "All timeline lanes are derived from verified selected assets and persisted in the trailer project manifest.",
      "Voiceover timings are synchronized as a plan; generated audio is not claimed until a downstream TTS/render job writes a real output.",
    ],
  };
}
