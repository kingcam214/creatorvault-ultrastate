import type { RenderClip, RenderRequest, TextOverlay } from "./realRenderEngine";
import type { BodyCinemaDirection, BodyCinemaEvidenceRecord } from "./bodyCinemaEvidenceService";

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
  captionStyle: "bold_center" | "lower_third" | "minimal_top";
  caption: string;
  overlays: TextOverlay[];
  transitions: boolean;
  fadeInOut: boolean;
  polish?: boolean;
  lightLeaks?: boolean;
  chromaAberration?: boolean;
  glitch?: boolean;
};

const RECIPE_VISUALS: Record<BodyCinemaDirection["id"], RecipeVisuals> = {
  "the-arch": {
    colorGrade: "cinematic_heat",
    focusSequence: ["none", "torso", "hips", "none", "none"],
    speedSequence: [0.96, 0.9, 0.94, 1, 0.98],
    captionStyle: "lower_third",
    caption: "THE ARCH",
    overlays: [{ text: "HOLD THE LINE", x: 0.5, y: 0.11, fontSize: 0.031, color: "#D5B760", startTime: 1.2, endTime: 2.5 }],
    transitions: true,
    fadeInOut: true,
    polish: true,
  },
  silhouette: {
    colorGrade: "noir_afterdark",
    focusSequence: ["silhouette", "silhouette", "none", "silhouette", "none"],
    speedSequence: [1, 0.98, 1, 0.98, 1],
    captionStyle: "minimal_top",
    caption: "FORM IN SHADOW",
    overlays: [{ text: "STAY IN THE FRAME", x: 0.5, y: 0.88, fontSize: 0.026, color: "#FFFFFF", startTime: 2.3, endTime: 3.5 }],
    transitions: true,
    fadeInOut: true,
  },
  "luxury-reveal": {
    colorGrade: "luxe_gold",
    focusSequence: ["face", "chest", "torso", "none", "none"],
    speedSequence: [0.94, 0.96, 0.98, 1, 0.98],
    captionStyle: "minimal_top",
    caption: "PRIVATE RELEASE",
    overlays: [{ text: "DETAIL. THEN REVEAL.", x: 0.5, y: 0.84, fontSize: 0.029, color: "#F4D98B", startTime: 1.4, endTime: 3.2 }],
    transitions: true,
    fadeInOut: true,
    polish: true,
    lightLeaks: true,
  },
  "vip-tease": {
    colorGrade: "neon_night",
    focusSequence: ["torso", "face", "none", "hips", "none"],
    speedSequence: [1.08, 1, 1.04, 0.96, 1.1],
    captionStyle: "bold_center",
    caption: "PRIVATE ACCESS",
    overlays: [{ text: "NOT THE WHOLE STORY", x: 0.5, y: 0.78, fontSize: 0.034, color: "#D5B760", startTime: 0.65, endTime: 1.9 }],
    transitions: true,
    fadeInOut: false,
    polish: true,
    chromaAberration: true,
    glitch: true,
  },
};

function sourceDurationSeconds(evidence: BodyCinemaEvidenceRecord): number {
  const timestamps = evidence.frameEvidence.map((frame) => Number(frame.timestampMs || 0)).filter(Number.isFinite);
  return Math.max(1, ...timestamps) / 1000;
}

function buildSourceClips(sourceUrl: string, direction: BodyCinemaDirection, sourceDuration: number, visuals: RecipeVisuals): RenderClip[] {
  const beats = direction.timeline.length ? direction.timeline : [];
  const clipLength = Math.max(0.55, Math.min(2.4, sourceDuration / Math.max(2, beats.length - 0.5)));
  return beats.map((beat, index) => {
    const preferredStart = Math.max(0, beat.sourceTimestampMs / 1000 - clipLength * 0.34);
    const safeStart = Math.min(preferredStart, Math.max(0, sourceDuration - clipLength));
    const safeEnd = Math.max(safeStart + 0.5, Math.min(sourceDuration, safeStart + clipLength));
    return {
      src: sourceUrl,
      type: "video",
      trimStart: Number(safeStart.toFixed(3)),
      trimEnd: Number(safeEnd.toFixed(3)),
      focus: visuals.focusSequence[index % visuals.focusSequence.length],
      colorGrade: visuals.colorGrade,
      speed: visuals.speedSequence[index % visuals.speedSequence.length],
      punch: direction.id === "vip-tease" && (index === 0 || index === 3),
      flashIn: direction.id === "vip-tease" && index === 0,
      lightLeak: direction.id === "luxury-reveal" && (index === 1 || index === 3),
      glitch: direction.id === "vip-tease" && index === 4,
    };
  });
}

export function buildBodyCinemaAssemblyRecipe(input: {
  sourceUrl: string;
  evidence: BodyCinemaEvidenceRecord;
  direction: BodyCinemaDirection;
  watermarkText?: string | null;
}): BodyCinemaAssemblyRecipe {
  if (input.evidence.sourceMediaUrl !== input.sourceUrl) {
    throw new Error("The approved Body Cinema evidence belongs to a different saved source.");
  }
  const visuals = RECIPE_VISUALS[input.direction.id];
  const sourceDuration = sourceDurationSeconds(input.evidence);
  const clips = buildSourceClips(input.sourceUrl, input.direction, sourceDuration, visuals);
  if (!clips.length) throw new Error("The approved treatment has no observed source moments to finish.");

  return {
    treatmentId: input.direction.id,
    label: input.direction.label,
    creatorSummary: `${input.direction.label} uses ${input.direction.grammar.pace.toLowerCase()} ${input.direction.grammar.ending.toLowerCase()}`,
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
      chromaAberration: visuals.chromaAberration,
      glitch: visuals.glitch,
      watermarkText: input.watermarkText || undefined,
      durationCap: Math.min(20, Math.max(4, sourceDuration * 1.15)),
    },
  };
}
