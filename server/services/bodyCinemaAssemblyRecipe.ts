import type { BodyCinemaDirection, BodyCinemaEvidenceRecord } from "./bodyCinemaEvidenceService";
import type { RenderClip, RenderRequest } from "./realRenderEngine";

export type BodyCinemaAudioDirection = {
  assetUrl: string;
  mix: NonNullable<RenderRequest["audioMixPlan"]>;
  visualEvents: Array<{ startMs: number; endMs: number; sourceTimestampMs: number; intent: string }>;
};

export type BodyCinemaAssemblyRecipe = {
  treatmentId: BodyCinemaDirection["id"];
  label: string;
  creatorSummary: string;
  request: RenderRequest;
};

function sourceDurationSeconds(evidence: BodyCinemaEvidenceRecord): number {
  const timestamps = evidence.frameEvidence.map((frame) => Number(frame.timestampMs || 0)).filter(Number.isFinite);
  return Math.max(1, ...timestamps) / 1000;
}

function buildTechnicalSourceClips(input: {
  sourceUrl: string;
  direction: BodyCinemaDirection;
  sourceDuration: number;
  audio?: BodyCinemaAudioDirection;
}): RenderClip[] {
  const beats = input.audio?.visualEvents.length
    ? input.audio.visualEvents.map((event) => ({ sourceTimestampMs: event.sourceTimestampMs, targetDurationMs: Math.max(500, event.endMs - event.startMs) }))
    : input.direction.timeline.map((beat) => ({ sourceTimestampMs: beat.sourceTimestampMs, targetDurationMs: Math.max(500, beat.endMs - beat.startMs) }));

  return beats.map((beat) => {
    const clipLength = Math.max(0.5, Math.min(2.4, beat.targetDurationMs / 1000));
    const preferredStart = Math.max(0, beat.sourceTimestampMs / 1000 - clipLength * 0.34);
    const trimStart = Math.min(preferredStart, Math.max(0, input.sourceDuration - clipLength));
    const trimEnd = Math.max(trimStart + 0.5, Math.min(input.sourceDuration, trimStart + clipLength));
    return {
      src: input.sourceUrl,
      type: "video",
      trimStart: Number(trimStart.toFixed(3)),
      trimEnd: Number(trimEnd.toFixed(3)),
      speed: 1,
      focus: "none",
      colorGrade: "none",
      videoMotion: "none",
    };
  });
}

/**
 * This lane is intentionally technical only. It may trim real source moments,
 * hard-concatenate them, package the requested aspect ratio, and align governed
 * audio. It may not grade, reframe, add text, simulate camera motion, alter
 * timing, freeze frames, transition, or create any visual transformation.
 */
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
  if (input.watermarkText) {
    throw new Error("CreatorVault technical assembly does not burn visual text onto moving media. Use an approved caption architecture instead.");
  }
  const sourceDuration = sourceDurationSeconds(input.evidence);
  const clips = buildTechnicalSourceClips({
    sourceUrl: input.sourceUrl,
    direction: input.direction,
    sourceDuration,
    audio: input.audio,
  });
  if (!clips.length) throw new Error("The approved treatment has no observed source moments to assemble.");

  return {
    treatmentId: input.direction.id,
    label: input.direction.label,
    creatorSummary: "CreatorVault is assembling real moments from this saved source without changing the creator, camera, lighting, movement, wardrobe, room, or framing.",
    request: {
      clips,
      aspect: "9:16",
      colorGrade: "none",
      focus: "none",
      animatedCaptions: false,
      textOverlays: [],
      transitions: false,
      fadeInOut: false,
      polish: false,
      lightLeaks: false,
      watermarkText: undefined,
      technicalLift: undefined,
      durationCap: Math.min(20, Math.max(4, sourceDuration * 1.25)),
      musicUrl: input.audio?.assetUrl,
      audioMixPlan: input.audio?.mix,
    },
  };
}
