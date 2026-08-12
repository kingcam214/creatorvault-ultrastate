import type { BodyCinemaDirection, BodyCinemaEvidenceRecord } from "./bodyCinemaEvidenceService";
import type { RenderClip, RenderRequest, TextOverlay } from "./realRenderEngine";

export type BodyCinemaAudioDirection = {
  assetUrl: string;
  mix: NonNullable<RenderRequest["audioMixPlan"]>;
  visualEvents: Array<{ startMs: number; endMs: number; sourceTimestampMs: number; intent: string; punch?: boolean; lightLeak?: boolean; flashIn?: boolean; glitch?: boolean }>;
};

export type BodyCinemaAssemblyRecipe = {
  treatmentId: BodyCinemaDirection["id"];
  label: string;
  creatorSummary: string;
  request: RenderRequest;
};

type RecipeVisuals = {
  colorGrade: string;
  focusSequence: string[];
  speedSequence: number[];
  videoMotionSequence: Array<NonNullable<RenderClip["videoMotion"]>>;
  caption?: string;
  captionStyle?: "bold_center" | "lower_third" | "minimal_top";
  overlays: TextOverlay[];
  transitions: boolean;
  fadeInOut: boolean;
  polish?: boolean;
  lightLeaks?: boolean;
  shadowEcho?: boolean;
  holds?: Record<number, number>;
  clipPunches?: number[];
  clipFlashes?: number[];
};

/**
 * Canonical cinematic grammar. A treatment is no longer a grade plus a label:
 * it has an independent source order, camera behavior, framing sequence,
 * motion tempo, reveal architecture, and payoff behavior.
 */
const RECIPE_VISUALS: Record<BodyCinemaDirection["id"], RecipeVisuals> = {
  "the-arch": {
    colorGrade: "cinematic_heat",
    focusSequence: ["none", "torso", "none", "hips", "none"],
    speedSequence: [0.82, 0.76, 0.9, 0.74, 0.92],
    videoMotionSequence: ["pull_out", "rise", "push_in", "rise", "none"],
    overlays: [{ text: "THE LINE HOLDS", x: 0.5, y: 0.12, fontSize: 0.026, color: "#E8D8A0", startTime: 3.8, endTime: 5.4 }],
    transitions: true,
    fadeInOut: true,
    polish: true,
    holds: { 3: 0.8 },
  },
  silhouette: {
    colorGrade: "noir_afterdark",
    focusSequence: ["none", "silhouette", "none", "silhouette", "none"],
    speedSequence: [0.96, 0.9, 0.86, 0.92, 1],
    videoMotionSequence: ["none", "drift_left", "none", "pull_out", "none"],
    overlays: [{ text: "AFTER THE LIGHT", x: 0.5, y: 0.08, fontSize: 0.022, color: "#D6E6FF", startTime: 1.8, endTime: 3.1 }],
    transitions: true,
    fadeInOut: false,
    shadowEcho: true,
    holds: { 2: 0.45 },
  },
  "luxury-reveal": {
    colorGrade: "luxe_gold",
    focusSequence: ["face", "chest", "torso", "none", "none"],
    speedSequence: [0.72, 0.76, 0.84, 0.9, 0.96],
    videoMotionSequence: ["push_in", "rise", "drift_left", "pull_out", "none"],
    overlays: [{ text: "TAKE YOUR TIME", x: 0.5, y: 0.84, fontSize: 0.024, color: "#F7E4A8", startTime: 2.5, endTime: 4.1 }],
    transitions: true,
    fadeInOut: true,
    polish: true,
    lightLeaks: true,
    holds: { 3: 0.62 },
  },
  "vip-tease": {
    colorGrade: "rose_glow",
    focusSequence: ["face", "none", "torso", "hips", "none"],
    speedSequence: [1.16, 0.94, 1.06, 0.82, 1.18],
    videoMotionSequence: ["peek", "drift_left", "push_in", "rise", "none"],
    overlays: [
      { text: "NOT YET.", x: 0.5, y: 0.78, fontSize: 0.035, color: "#F5D58B", startTime: 0.22, endTime: 0.78 },
      { text: "ONE MORE LOOK", x: 0.5, y: 0.12, fontSize: 0.023, color: "#FFFFFF", startTime: 4.25, endTime: 5.1 },
    ],
    transitions: true,
    fadeInOut: false,
    polish: true,
    holds: { 3: 0.55 },
    clipPunches: [0, 2],
    clipFlashes: [0],
  },
};

function sourceDurationSeconds(evidence: BodyCinemaEvidenceRecord): number {
  const timestamps = evidence.frameEvidence.map((frame) => Number(frame.timestampMs || 0)).filter(Number.isFinite);
  return Math.max(1, ...timestamps) / 1000;
}

function sourceBeats(input: {
  direction: BodyCinemaDirection;
  audio?: BodyCinemaAudioDirection;
}): Array<{ sourceTimestampMs: number; targetDurationMs: number; intent: string; punch?: boolean; lightLeak?: boolean; flashIn?: boolean; glitch?: boolean }> {
  if (input.audio?.visualEvents.length) {
    return input.audio.visualEvents.map((event) => ({
      sourceTimestampMs: event.sourceTimestampMs,
      targetDurationMs: Math.max(450, event.endMs - event.startMs),
      intent: event.intent,
      punch: event.punch,
      lightLeak: event.lightLeak,
      flashIn: event.flashIn,
      glitch: event.glitch,
    }));
  }
  return input.direction.timeline.map((beat) => ({
    sourceTimestampMs: beat.sourceTimestampMs,
    targetDurationMs: Math.max(500, beat.endMs - beat.startMs),
    intent: beat.id,
  }));
}

function buildSourceClips(input: {
  sourceUrl: string;
  direction: BodyCinemaDirection;
  sourceDuration: number;
  visuals: RecipeVisuals;
  audio?: BodyCinemaAudioDirection;
}): RenderClip[] {
  const beats = sourceBeats({ direction: input.direction, audio: input.audio });
  return beats.map((beat, index) => {
    const speed = input.visuals.speedSequence[index % input.visuals.speedSequence.length];
    // Because slow motion lengthens a clip, take only the source duration that
    // maps to the music-directed target window after speed is applied.
    const targetSeconds = Math.max(0.55, Math.min(2.4, beat.targetDurationMs / 1000));
    const rawLength = Math.max(0.55, Math.min(2.4, targetSeconds * speed));
    const preferredStart = Math.max(0, beat.sourceTimestampMs / 1000 - rawLength * 0.34);
    const safeStart = Math.min(preferredStart, Math.max(0, input.sourceDuration - rawLength));
    const safeEnd = Math.max(safeStart + 0.5, Math.min(input.sourceDuration, safeStart + rawLength));
    return {
      src: input.sourceUrl,
      type: "video",
      trimStart: Number(safeStart.toFixed(3)),
      trimEnd: Number(safeEnd.toFixed(3)),
      focus: input.visuals.focusSequence[index % input.visuals.focusSequence.length],
      colorGrade: input.visuals.colorGrade,
      speed,
      videoMotion: input.visuals.videoMotionSequence[index % input.visuals.videoMotionSequence.length],
      holdFinalFrameSeconds: input.visuals.holds?.[index],
      shadowEcho: Boolean(input.visuals.shadowEcho && (index === 1 || index === 2 || index === 3)),
      punch: Boolean(input.visuals.clipPunches?.includes(index) || beat.punch),
      flashIn: Boolean(input.visuals.clipFlashes?.includes(index) || beat.flashIn),
      lightLeak: Boolean(input.visuals.lightLeaks && (index === 1 || index === 3) || beat.lightLeak),
      glitch: Boolean(beat.glitch && input.direction.id === "vip-tease"),
    };
  });
}

export function buildBodyCinemaAssemblyRecipe(input: {
  sourceUrl: string;
  evidence: BodyCinemaEvidenceRecord;
  direction: BodyCinemaDirection;
  watermarkText?: string | null;
  audio?: BodyCinemaAudioDirection;
}): BodyCinemaAssemblyRecipe {
  if (input.evidence.sourceMediaUrl !== input.sourceUrl) {
    throw new Error("The approved Body Cinema evidence belongs to a different saved source.");
  }
  const baseVisuals = RECIPE_VISUALS[input.direction.id];
  const strictShowcaseSource = input.evidence.analysisVersion === "creatorvault-showcase-cinematic-1080/v1";
  // Luxury needs a close material invitation, not a parade of crops. For the
  // strict public proof, make that invitation one beat and let the full-body
  // campaign frame carry the rest of the visual run.
  const visuals: RecipeVisuals = strictShowcaseSource && input.direction.id === "luxury-reveal"
    ? { ...baseVisuals, focusSequence: ["chest", "none", "none", "none", "none"] }
    : baseVisuals;
  const sourceDuration = sourceDurationSeconds(input.evidence);
  const clips = buildSourceClips({
    sourceUrl: input.sourceUrl,
    direction: input.direction,
    sourceDuration,
    visuals,
    audio: input.audio,
  });
  if (!clips.length) throw new Error("The approved treatment has no observed source moments to finish.");

  const beatDirected = Boolean(input.audio?.visualEvents.length);
  return {
    treatmentId: input.direction.id,
    label: input.direction.label,
    creatorSummary: beatDirected
      ? `${input.direction.label} is timing its camera, motion, text, and payoff to a measured soundtrack rhythm.`
      : `${input.direction.label} is building ${input.direction.grammar.pace.toLowerCase()} with ${input.direction.grammar.ending.toLowerCase()}`,
    request: {
      clips,
      aspect: "9:16",
      colorGrade: visuals.colorGrade,
      focus: "none",
      captionText: visuals.caption,
      captionStyle: visuals.captionStyle,
      animatedCaptions: true,
      textOverlays: visuals.overlays,
      transitions: visuals.transitions,
      fadeInOut: visuals.fadeInOut,
      polish: visuals.polish,
      lightLeaks: visuals.lightLeaks,
      watermarkText: input.watermarkText || undefined,
      technicalLift: strictShowcaseSource ? "showcase_crisp" : input.direction.id === "silhouette" ? "noir_safe" : "balanced",
      durationCap: Math.min(20, Math.max(4, sourceDuration * 1.25)),
      musicUrl: input.audio?.assetUrl,
      audioMixPlan: input.audio?.mix,
    },
  };
}
