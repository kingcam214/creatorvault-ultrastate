import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { type AudioAnalysis, type AudioAsset, type AudioVisualTimelinePlan, assertAudioRights, getAudioAnalysis, getCanonicalAudioAsset } from "./audioIntelligenceService";
import { type BodyCinemaEvidenceRecord, getBodyCinemaSourceEvidence } from "./bodyCinemaEvidenceService";
import type { TimelineManifest, SceneManifest, TimelineAudioLayer } from "../media-os/contracts/mediaContracts";

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function extractRows(result: unknown): any[] {
  if (!result) return [];
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result as any[];
  return (result as any)?.rows || [];
}

async function rawQuery<T = any>(query: string, params: unknown[] = []): Promise<T[]> {
  const pool = (db as any).$client || (db as any).client;
  if (pool?.promise) {
    const [rows] = await pool.promise().query(query, params);
    return rows as T[];
  }
  if (pool?.execute) {
    const [rows] = await pool.execute(query, params);
    return rows as T[];
  }
  const values = [...params];
  const escaped = query.replace(/\?/g, () => {
    const value = values.shift();
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  });
  return extractRows(await (db as any).execute(sql.raw(escaped))) as T[];
}

async function rawExec(query: string, params: unknown[] = []): Promise<any> {
  const pool = (db as any).$client || (db as any).client;
  if (pool?.promise) {
    const [result] = await pool.promise().query(query, params);
    return result;
  }
  if (pool?.execute) {
    const [result] = await pool.execute(query, params);
    return result;
  }
  const values = [...params];
  const escaped = query.replace(/\?/g, () => {
    const value = values.shift();
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  });
  return (db as any).execute(sql.raw(escaped));
}

function findNearestEvent(timeMs: number, eventsMs: number[], maxDistanceMs = 200): number | null {
  if (!eventsMs.length) return null;
  let nearest = eventsMs[0];
  let minDistance = Math.abs(timeMs - nearest);
  for (const eventMs of eventsMs) {
    const distance = Math.abs(timeMs - eventMs);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = eventMs;
    }
  }
  return minDistance <= maxDistanceMs ? nearest : null;
}

export async function buildAudioDirectedTimeline(input: {
  creatorId: number;
  audioAssetId: string;
  sourceEvidenceId: string;
  treatmentId: string;
  targetDurationSeconds: number;
  preserveSourceAudio: boolean;
  destinationPlatform: string;
}): Promise<AudioVisualTimelinePlan> {
  const audioAsset = await getCanonicalAudioAsset(input.creatorId, input.audioAssetId);
  if (!audioAsset) throw new Error("The selected soundtrack is not available in your CreatorVault library.");
  assertAudioRights({ asset: audioAsset, intendedUse: "render", platform: input.destinationPlatform });

  const analysis = await getAudioAnalysis(input.creatorId, input.audioAssetId);
  if (!analysis || analysis.analysisStatus !== "ready") {
    throw new Error("CreatorVault must finish analyzing the rhythm of this soundtrack before it can direct a timeline.");
  }

  const evidence = await getBodyCinemaSourceEvidence(input.creatorId, input.sourceEvidenceId);
  if (!evidence || evidence.analysisStatus !== "verified" || !evidence.selectedDirectionId) {
    throw new Error("A verified Body Cinema visual analysis and approved direction are required to build a music-directed timeline.");
  }

  const treatment = evidence.directions.find(d => d.id === input.treatmentId || d.id === evidence.selectedDirectionId);
  if (!treatment || !treatment.timeline.length) {
    throw new Error("The selected treatment lacks a verified visual timeline sequence.");
  }

  const durationMs = Math.min(input.targetDurationSeconds * 1000, analysis.durationSeconds * 1000);
  const visualEvents: AudioVisualTimelinePlan["visualEvents"] = [];
  const audioAnchors: AudioVisualTimelinePlan["audioAnchors"] = [];
  let currentAudioTimeMs = 0;

  for (const beat of treatment.timeline) {
    const visualDurationMs = beat.endMs - beat.startMs;
    if (currentAudioTimeMs >= durationMs) break;

    let targetEndMs = currentAudioTimeMs + visualDurationMs;
    const downbeat = findNearestEvent(targetEndMs, analysis.downbeatTimesMs, 300);
    const regularBeat = findNearestEvent(targetEndMs, analysis.beatTimesMs, 150);
    const onset = findNearestEvent(targetEndMs, analysis.onsetTimesMs, 100);

    let anchorType: "downbeat" | "beat" | "onset" | "section" = "beat";
    let anchorReason = "Visual cut aligned to standard musical beat.";

    if (beat.id === "payoff" && downbeat) {
      targetEndMs = downbeat;
      anchorType = "downbeat";
      anchorReason = "Visual payoff aligned to major downbeat for maximum impact.";
    } else if (beat.id === "hook" && onset) {
      targetEndMs = onset;
      anchorType = "onset";
      anchorReason = "Hook sequence aligned to immediate percussive onset.";
    } else if (downbeat) {
      targetEndMs = downbeat;
      anchorType = "downbeat";
      anchorReason = "Visual cut aligned to major downbeat.";
    } else if (regularBeat) {
      targetEndMs = regularBeat;
    }

    const sectionChange = analysis.sections.find(s => s.startMs > currentAudioTimeMs && s.startMs <= targetEndMs + 200);
    if (sectionChange && beat.id !== "payoff") {
      targetEndMs = sectionChange.startMs;
      anchorType = "section";
      anchorReason = `Cut forced early to align with musical transition into ${sectionChange.label} section.`;
    }

    const eventId = `evt-${visualEvents.length + 1}`;
    visualEvents.push({
      id: eventId,
      startMs: currentAudioTimeMs,
      endMs: targetEndMs,
      intent: beat.id,
      sourceTimestampMs: beat.sourceTimestampMs,
      punch: beat.id === "hook" || beat.id === "payoff" || visualEvents.length % 2 === 0,
      lightLeak: visualEvents.length % 3 === 0,
      flashIn: beat.id === "hook",
      glitch: beat.id === "hook",
    });
    audioAnchors.push({
      visualEventId: eventId,
      audioTimeMs: targetEndMs,
      eventType: anchorType,
      reason: anchorReason,
    });

    currentAudioTimeMs = targetEndMs;
  }

  const planId = randomUUID();
  const plan: AudioVisualTimelinePlan = {
    id: planId,
    creatorId: input.creatorId,
    sourceMediaUrl: evidence.sourceMediaUrl,
    sourceEvidenceId: evidence.id,
    audioAssetId: audioAsset.id,
    audioAnalysisId: analysis.id,
    treatmentId: treatment.id,
    timelineVersion: "creatorvault.timeline_manifest.v2",
    visualEvents,
    audioAnchors,
    mix: {
      targetLufs: -14,
      preserveSourceAudio: input.preserveSourceAudio,
      sourceGainDb: input.preserveSourceAudio ? -6 : -60,
      musicGainDb: 0,
      duckingWindows: [],
      fadeInMs: 500,
      fadeOutMs: 1500,
    },
    rightsSnapshot: audioAsset.rights,
    status: "planned",
    createdAt: new Date().toISOString(),
  };

  await rawExec(
    `INSERT INTO canonical_audio_timeline_plans
      (id, creator_id, source_media_url, source_evidence_id, audio_asset_id, audio_analysis_id, treatment_id, timeline_json, mix_json, rights_snapshot_json, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned')`,
    [plan.id, plan.creatorId, plan.sourceMediaUrl, plan.sourceEvidenceId, plan.audioAssetId, plan.audioAnalysisId, plan.treatmentId, JSON.stringify(plan.visualEvents), JSON.stringify(plan.mix), JSON.stringify(plan.rightsSnapshot)]
  );

  return plan;
}

export function toMediaOSManifest(plan: AudioVisualTimelinePlan, analysis: AudioAnalysis): TimelineManifest {
  const scenes: SceneManifest[] = plan.visualEvents.map((evt, idx) => ({
    contract: "SceneManifest",
    sceneIndex: idx,
    role: evt.intent,
    sourceAssetId: plan.sourceEvidenceId,
    sourceUrl: plan.sourceMediaUrl,
    assetKind: "video",
    durationSeconds: Number(((evt.endMs - evt.startMs) / 1000).toFixed(3)),
    startSecond: Number((evt.startMs / 1000).toFixed(3)),
    endSecond: Number((evt.endMs / 1000).toFixed(3)),
    overlayText: "",
    visualDirection: `Source moment near ${Number((evt.sourceTimestampMs / 1000).toFixed(3))}s.`,
    requiredRenderTreatment: plan.treatmentId || "none",
    logoTiming: "none",
    ctaPlacement: "none",
    warnings: [],
  }));

  const totalDurationSeconds = Number((plan.visualEvents[plan.visualEvents.length - 1]?.endMs / 1000 || 0).toFixed(3));
  const audioLayers: TimelineAudioLayer[] = [
    {
      layerId: `music-${plan.audioAssetId}`,
      type: "music",
      startSecond: 0,
      endSecond: totalDurationSeconds,
      status: "planned",
      description: `Governed soundtrack (BPM: ${analysis.bpm || "unknown"})`,
    }
  ];

  return {
    contract: "TimelineManifest",
    totalDurationSeconds,
    format: "9:16",
    sceneCount: scenes.length,
    scenes,
    transitions: [],
    audioLayers,
    logoWindows: [],
    ctaWindows: [],
    warnings: [],
  };
}
