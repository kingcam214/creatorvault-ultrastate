import { createHash, randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import os from "os";
import { createRequire } from "module";
import { sql } from "drizzle-orm";
import { db } from "../db";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const MusicTempo: new (audio: Float32Array, options?: Record<string, unknown>) => {
  tempo: string | number;
  beats: number[];
  events: number[];
  spectralFlux?: number[];
} = require("music-tempo");

const AUDIO_ANALYSIS_VERSION = "creatorvault.audio-intelligence/v1";
const MAX_ANALYSIS_SECONDS = 600;
const TEMP_ROOT = path.join(os.tmpdir(), "creatorvault-audio-intelligence");
const PUBLIC_APP_URL = (process.env.PUBLIC_APP_URL || "https://creatorvault.live").replace(/\/$/, "");

export const AUDIO_RIGHTS_STATES = [
  "creator_owned",
  "licensed_for_creation",
  "licensed_playback_only",
  "restricted",
  "unknown",
] as const;
export type AudioRightsState = (typeof AUDIO_RIGHTS_STATES)[number];

export const AUDIO_ASSET_KINDS = ["music", "voiceover", "sfx", "source_audio"] as const;
export type AudioAssetKind = (typeof AUDIO_ASSET_KINDS)[number];

export const AUDIO_INTENDED_USES = ["preview", "render", "distribution"] as const;
export type AudioIntendedUse = (typeof AUDIO_INTENDED_USES)[number];

export type AudioRights = {
  state: AudioRightsState;
  source: "creator_upload" | "first_party_fixture" | "licensed_catalog" | "creator_sfx" | "generated_voice";
  providerName?: string | null;
  licenseReference?: string | null;
  allowedPlatforms: string[];
  permittedUses: AudioIntendedUse[];
  attributionRequired: boolean;
  attributionText?: string | null;
  territory?: string | null;
  expiresAt?: string | null;
  evidenceNote: string;
};

export type AudioAsset = {
  id: string;
  creatorId: number;
  mediaAssetId: string | null;
  kind: AudioAssetKind;
  title: string;
  assetUrl: string;
  mimeType: string;
  durationSeconds: number | null;
  sampleRate: number | null;
  channels: number | null;
  fingerprint: string;
  rights: AudioRights;
  status: "ready" | "blocked" | "archived";
  createdAt: string;
};

export type AudioEnergyPoint = { startMs: number; endMs: number; energy: number };
export type AudioSection = {
  id: string;
  label: "opening" | "build" | "peak" | "release" | "closing";
  startMs: number;
  endMs: number;
  energy: number;
  confidence: number;
};

export type AudioAnalysis = {
  id: string;
  audioAssetId: string;
  version: string;
  durationSeconds: number;
  bpm: number | null;
  beatTimesMs: number[];
  downbeatTimesMs: number[];
  onsetTimesMs: number[];
  waveform: number[];
  energyMap: AudioEnergyPoint[];
  sections: AudioSection[];
  silenceWindows: Array<{ startMs: number; endMs: number }>;
  integratedLoudnessEstimate: number | null;
  confidence: number;
  analysisStatus: "ready" | "insufficient_signal" | "failed";
  sourceFingerprint: string;
  createdAt: string;
};

export type AudioMixLayer = {
  assetId: string;
  kind: AudioAssetKind;
  startMs: number;
  endMs: number;
  gainDb: number;
  role: "music" | "voiceover" | "sfx" | "source_audio";
};

export type AudioVisualTimelinePlan = {
  id: string;
  creatorId: number;
  sourceMediaUrl: string;
  sourceEvidenceId: string | null;
  audioAssetId: string;
  audioAnalysisId: string;
  treatmentId: string | null;
  timelineVersion: "creatorvault.timeline_manifest.v2";
  visualEvents: Array<{ id: string; startMs: number; endMs: number; intent: string; sourceTimestampMs: number; punch?: boolean; lightLeak?: boolean; flashIn?: boolean; glitch?: boolean }>;
  audioAnchors: Array<{ visualEventId: string; audioTimeMs: number; eventType: "beat" | "downbeat" | "section" | "onset"; reason: string }>;
  mix: {
    targetLufs: number;
    preserveSourceAudio: boolean;
    sourceGainDb: number;
    musicGainDb: number;
    duckingWindows: Array<{ startMs: number; endMs: number; reductionDb: number; reason: string }>;
    fadeInMs: number;
    fadeOutMs: number;
  };
  rightsSnapshot: AudioRights;
  status: "planned" | "rendered" | "blocked";
  createdAt: string;
};

type AudioProbe = {
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  mimeType: string;
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function safeJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
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

export async function ensureAudioIntelligenceSchema(): Promise<void> {
  await rawExec(`CREATE TABLE IF NOT EXISTS canonical_audio_assets (
    id VARCHAR(36) PRIMARY KEY,
    creator_id BIGINT NOT NULL,
    media_asset_id VARCHAR(64) NULL,
    asset_kind VARCHAR(24) NOT NULL,
    title VARCHAR(255) NOT NULL,
    asset_url TEXT NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    duration_seconds DECIMAL(12,3) NULL,
    sample_rate INT NULL,
    channels INT NULL,
    source_fingerprint CHAR(64) NOT NULL,
    rights_json JSON NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'ready',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_audio_creator_fingerprint (creator_id, source_fingerprint),
    INDEX idx_audio_creator_status (creator_id, status),
    INDEX idx_audio_media_asset (media_asset_id)
  )`);
  await rawExec(`CREATE TABLE IF NOT EXISTS canonical_audio_analysis_records (
    id VARCHAR(36) PRIMARY KEY,
    audio_asset_id VARCHAR(36) NOT NULL,
    analysis_version VARCHAR(96) NOT NULL,
    analysis_json JSON NOT NULL,
    source_fingerprint CHAR(64) NOT NULL,
    analysis_status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_audio_analysis_asset_version (audio_asset_id, analysis_version),
    INDEX idx_audio_analysis_asset (audio_asset_id)
  )`);
  await rawExec(`CREATE TABLE IF NOT EXISTS canonical_audio_timeline_plans (
    id VARCHAR(36) PRIMARY KEY,
    creator_id BIGINT NOT NULL,
    source_media_url TEXT NOT NULL,
    source_evidence_id VARCHAR(36) NULL,
    audio_asset_id VARCHAR(36) NOT NULL,
    audio_analysis_id VARCHAR(36) NOT NULL,
    treatment_id VARCHAR(64) NULL,
    timeline_json JSON NOT NULL,
    mix_json JSON NOT NULL,
    rights_snapshot_json JSON NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'planned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_audio_timeline_creator (creator_id, status),
    INDEX idx_audio_timeline_asset (audio_asset_id)
  )`);
  await rawExec(`CREATE TABLE IF NOT EXISTS canonical_audio_usage_records (
    id VARCHAR(36) PRIMARY KEY,
    creator_id BIGINT NOT NULL,
    audio_asset_id VARCHAR(36) NOT NULL,
    timeline_plan_id VARCHAR(36) NULL,
    destination VARCHAR(64) NOT NULL,
    intended_use VARCHAR(24) NOT NULL,
    rights_snapshot_json JSON NOT NULL,
    attribution_text TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audio_usage_asset (audio_asset_id),
    INDEX idx_audio_usage_creator (creator_id, created_at)
  )`);
}

function canonicalizeRights(input: Partial<AudioRights>, fallbackSource: AudioRights["source"]): AudioRights {
  const state = AUDIO_RIGHTS_STATES.includes(input.state as AudioRightsState) ? input.state as AudioRightsState : "unknown";
  const permittedUses: AudioIntendedUse[] = Array.isArray(input.permittedUses)
    ? input.permittedUses.filter((use): use is AudioIntendedUse => AUDIO_INTENDED_USES.includes(use as AudioIntendedUse))
    : state === "creator_owned" || state === "licensed_for_creation"
      ? ["preview", "render", "distribution"]
      : state === "licensed_playback_only"
        ? ["preview"]
        : [];
  return {
    state,
    source: input.source || fallbackSource,
    providerName: input.providerName || null,
    licenseReference: input.licenseReference || null,
    allowedPlatforms: Array.isArray(input.allowedPlatforms) && input.allowedPlatforms.length ? input.allowedPlatforms.map(String) : ["creatorvault"],
    permittedUses,
    attributionRequired: Boolean(input.attributionRequired),
    attributionText: input.attributionText || null,
    territory: input.territory || null,
    expiresAt: input.expiresAt || null,
    evidenceNote: String(input.evidenceNote || "Rights evidence has not yet been verified.").slice(0, 2000),
  };
}

function hydrateAsset(row: any): AudioAsset {
  return {
    id: String(row.id),
    creatorId: toNumber(row.creator_id),
    mediaAssetId: row.media_asset_id ? String(row.media_asset_id) : null,
    kind: row.asset_kind as AudioAssetKind,
    title: String(row.title),
    assetUrl: String(row.asset_url),
    mimeType: String(row.mime_type),
    durationSeconds: row.duration_seconds === null || row.duration_seconds === undefined ? null : toNumber(row.duration_seconds),
    sampleRate: row.sample_rate === null || row.sample_rate === undefined ? null : toNumber(row.sample_rate),
    channels: row.channels === null || row.channels === undefined ? null : toNumber(row.channels),
    fingerprint: String(row.source_fingerprint),
    rights: canonicalizeRights(safeJson<Partial<AudioRights>>(row.rights_json, {}), "creator_upload"),
    status: row.status as AudioAsset["status"],
    createdAt: new Date(row.created_at || Date.now()).toISOString(),
  };
}

function hydrateAnalysis(row: any): AudioAnalysis {
  const analysis = safeJson<Partial<AudioAnalysis>>(row.analysis_json, {});
  return {
    id: String(row.id),
    audioAssetId: String(row.audio_asset_id),
    version: String(row.analysis_version),
    durationSeconds: toNumber(analysis.durationSeconds),
    bpm: analysis.bpm === null || analysis.bpm === undefined ? null : toNumber(analysis.bpm),
    beatTimesMs: Array.isArray(analysis.beatTimesMs) ? analysis.beatTimesMs.map(value => toNumber(value)).filter(value => value >= 0) : [],
    downbeatTimesMs: Array.isArray(analysis.downbeatTimesMs) ? analysis.downbeatTimesMs.map(value => toNumber(value)).filter(value => value >= 0) : [],
    onsetTimesMs: Array.isArray(analysis.onsetTimesMs) ? analysis.onsetTimesMs.map(value => toNumber(value)).filter(value => value >= 0) : [],
    waveform: Array.isArray(analysis.waveform) ? analysis.waveform.map(value => clamp(toNumber(value))) : [],
    energyMap: Array.isArray(analysis.energyMap) ? analysis.energyMap as AudioEnergyPoint[] : [],
    sections: Array.isArray(analysis.sections) ? analysis.sections as AudioSection[] : [],
    silenceWindows: Array.isArray(analysis.silenceWindows) ? analysis.silenceWindows as AudioAnalysis["silenceWindows"] : [],
    integratedLoudnessEstimate: analysis.integratedLoudnessEstimate === null || analysis.integratedLoudnessEstimate === undefined ? null : toNumber(analysis.integratedLoudnessEstimate),
    confidence: clamp(toNumber(analysis.confidence)),
    analysisStatus: analysis.analysisStatus === "ready" || analysis.analysisStatus === "insufficient_signal" ? analysis.analysisStatus : "failed",
    sourceFingerprint: String(row.source_fingerprint),
    createdAt: new Date(row.created_at || Date.now()).toISOString(),
  };
}

async function probeAudio(filePath: string): Promise<AudioProbe> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=sample_rate,channels,codec_name:format=duration,format_name", "-of", "json", filePath,
  ], { timeout: 20_000, maxBuffer: 1024 * 1024, encoding: "utf8" });
  const data = JSON.parse(String(stdout || "{}"));
  const stream = data?.streams?.[0];
  const durationSeconds = toNumber(data?.format?.duration ?? stream?.duration);
  const sampleRate = toNumber(stream?.sample_rate);
  const channels = toNumber(stream?.channels);
  if (!stream?.codec_name || durationSeconds < 0.1 || sampleRate < 8000 || channels < 1) {
    throw new Error("The selected audio cannot be read as a valid sound file.");
  }
  if (durationSeconds > MAX_ANALYSIS_SECONDS) {
    throw new Error("CreatorVault can analyze tracks up to 10 minutes in this release.");
  }
  return { durationSeconds, sampleRate, channels, mimeType: String(data?.format?.format_name || "audio/unknown") };
}

async function downloadAudio(url: string, tempPath: string): Promise<Buffer> {
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`CreatorVault could not retrieve the selected audio (${response.status}).`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 512) throw new Error("The selected audio is empty or incomplete.");
  await writeFile(tempPath, buffer);
  return buffer;
}

async function decodeMonoPcm(filePath: string): Promise<Float32Array> {
  const { stdout } = await execFileAsync("ffmpeg", ["-v", "error", "-i", filePath, "-ac", "1", "-ar", "44100", "-f", "f32le", "pipe:1"], {
    timeout: 120_000,
    maxBuffer: 128 * 1024 * 1024,
    encoding: "buffer",
  });
  const buffer = Buffer.from(stdout as unknown as Uint8Array);
  const alignedBytes = buffer.length - (buffer.length % 4);
  const samples = new Float32Array(alignedBytes / 4);
  for (let index = 0; index < samples.length; index += 1) samples[index] = buffer.readFloatLE(index * 4);
  return samples;
}

function buildWaveform(samples: Float32Array, bins = 240): number[] {
  const stride = Math.max(1, Math.floor(samples.length / bins));
  const waveform: number[] = [];
  for (let start = 0; start < samples.length; start += stride) {
    const end = Math.min(samples.length, start + stride);
    let sum = 0;
    for (let index = start; index < end; index += 1) sum += samples[index] * samples[index];
    waveform.push(Number(clamp(Math.sqrt(sum / Math.max(1, end - start)) * 3).toFixed(4)));
  }
  return waveform.slice(0, bins);
}

function buildEnergyMap(samples: Float32Array, sampleRate: number): AudioEnergyPoint[] {
  const window = Math.max(1, Math.round(sampleRate * 0.5));
  const values: AudioEnergyPoint[] = [];
  for (let start = 0; start < samples.length; start += window) {
    const end = Math.min(samples.length, start + window);
    let sum = 0;
    for (let index = start; index < end; index += 1) sum += samples[index] * samples[index];
    values.push({ startMs: Math.round(start / sampleRate * 1000), endMs: Math.round(end / sampleRate * 1000), energy: Math.sqrt(sum / Math.max(1, end - start)) });
  }
  const max = Math.max(...values.map(point => point.energy), 0.0001);
  return values.map(point => ({ ...point, energy: Number(clamp(point.energy / max).toFixed(4)) }));
}

function buildSections(energyMap: AudioEnergyPoint[]): AudioSection[] {
  if (energyMap.length === 0) return [];
  const labels: AudioSection["label"][] = ["opening", "build", "peak", "release", "closing"];
  const targetCount = Math.min(5, Math.max(2, Math.ceil(energyMap.length / 8)));
  const sections: AudioSection[] = [];
  for (let index = 0; index < targetCount; index += 1) {
    const startIndex = Math.floor(index * energyMap.length / targetCount);
    const endIndex = Math.max(startIndex, Math.floor((index + 1) * energyMap.length / targetCount) - 1);
    const slice = energyMap.slice(startIndex, endIndex + 1);
    const averageEnergy = slice.reduce((sum, point) => sum + point.energy, 0) / Math.max(1, slice.length);
    sections.push({
      id: `section-${index + 1}`,
      label: index === 0 ? "opening" : index === targetCount - 1 ? "closing" : index === Math.floor(targetCount / 2) ? "peak" : averageEnergy >= 0.58 ? "build" : "release",
      startMs: slice[0].startMs,
      endMs: slice[slice.length - 1].endMs,
      energy: Number(averageEnergy.toFixed(4)),
      confidence: Number(clamp(0.45 + Math.min(0.45, slice.length / 20)).toFixed(3)),
    });
  }
  return sections;
}

function buildSilenceWindows(energyMap: AudioEnergyPoint[]): Array<{ startMs: number; endMs: number }> {
  const windows: Array<{ startMs: number; endMs: number }> = [];
  let start: number | null = null;
  let end = 0;
  for (const point of energyMap) {
    if (point.energy < 0.08) {
      if (start === null) start = point.startMs;
      end = point.endMs;
    } else if (start !== null) {
      if (end - start >= 500) windows.push({ startMs: start, endMs: end });
      start = null;
    }
  }
  if (start !== null && end - start >= 500) windows.push({ startMs: start, endMs: end });
  return windows;
}

function calculateLoudnessEstimate(samples: Float32Array): number | null {
  if (!samples.length) return null;
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  const rms = Math.sqrt(sum / samples.length);
  return rms > 0 ? Number((20 * Math.log10(rms)).toFixed(2)) : null;
}

export function analyzePcmForCreatorVault(samples: Float32Array, durationSeconds: number): Omit<AudioAnalysis, "id" | "audioAssetId" | "version" | "sourceFingerprint" | "createdAt"> {
  const energyMap = buildEnergyMap(samples, 44100);
  const waveform = buildWaveform(samples);
  const silenceWindows = buildSilenceWindows(energyMap);
  try {
    const tempoResult = new MusicTempo(samples, { timeStep: 0.01, minBeatInterval: 0.3, maxBeatInterval: 1.0 });
    const beatTimesMs = Array.isArray(tempoResult.beats) ? tempoResult.beats.map(value => Math.round(toNumber(value) * 1000)).filter(value => value >= 0 && value <= durationSeconds * 1000) : [];
    const onsetTimesMs = Array.isArray(tempoResult.events) ? tempoResult.events.map(value => Math.round(toNumber(value) * 1000)).filter(value => value >= 0 && value <= durationSeconds * 1000) : [];
    const bpm = Number(tempoResult.tempo);
    const confidence = clamp((beatTimesMs.length >= 4 ? 0.52 : 0.22) + Math.min(0.3, onsetTimesMs.length / 140) + (Number.isFinite(bpm) && bpm >= 40 && bpm <= 208 ? 0.15 : 0));
    return {
      durationSeconds,
      bpm: Number.isFinite(bpm) ? Number(bpm.toFixed(3)) : null,
      beatTimesMs,
      downbeatTimesMs: beatTimesMs.filter((_, index) => index % 4 === 0),
      onsetTimesMs,
      waveform,
      energyMap,
      sections: buildSections(energyMap),
      silenceWindows,
      integratedLoudnessEstimate: calculateLoudnessEstimate(samples),
      confidence: Number(confidence.toFixed(3)),
      analysisStatus: beatTimesMs.length >= 2 ? "ready" : "insufficient_signal",
    };
  } catch {
    return {
      durationSeconds,
      bpm: null,
      beatTimesMs: [],
      downbeatTimesMs: [],
      onsetTimesMs: [],
      waveform,
      energyMap,
      sections: buildSections(energyMap),
      silenceWindows,
      integratedLoudnessEstimate: calculateLoudnessEstimate(samples),
      confidence: 0,
      analysisStatus: "insufficient_signal",
    };
  }
}

export async function listCanonicalAudioAssets(creatorId: number): Promise<AudioAsset[]> {
  await ensureAudioIntelligenceSchema();
  const rows = await rawQuery("SELECT * FROM canonical_audio_assets WHERE creator_id = ? AND status = 'ready' ORDER BY created_at DESC", [creatorId]);
  return rows.map(hydrateAsset);
}

export async function getCanonicalAudioAsset(creatorId: number, assetId: string): Promise<AudioAsset | null> {
  await ensureAudioIntelligenceSchema();
  const rows = await rawQuery("SELECT * FROM canonical_audio_assets WHERE id = ? AND creator_id = ? LIMIT 1", [assetId, creatorId]);
  return rows[0] ? hydrateAsset(rows[0]) : null;
}

export async function registerCanonicalAudioAsset(input: {
  creatorId: number;
  title: string;
  assetUrl: string;
  mimeType: string;
  kind: AudioAssetKind;
  fingerprint: string;
  durationSeconds?: number | null;
  sampleRate?: number | null;
  channels?: number | null;
  mediaAssetId?: string | null;
  rights: Partial<AudioRights>;
}): Promise<AudioAsset> {
  await ensureAudioIntelligenceSchema();
  const rights = canonicalizeRights(input.rights, input.rights.source || "creator_upload");
  const existing = await rawQuery("SELECT * FROM canonical_audio_assets WHERE creator_id = ? AND source_fingerprint = ? LIMIT 1", [input.creatorId, input.fingerprint]);
  if (existing[0]) return hydrateAsset(existing[0]);
  const id = randomUUID();
  await rawExec(
    `INSERT INTO canonical_audio_assets (id, creator_id, media_asset_id, asset_kind, title, asset_url, mime_type, duration_seconds, sample_rate, channels, source_fingerprint, rights_json, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready')`,
    [id, input.creatorId, input.mediaAssetId || null, input.kind, input.title.slice(0, 255), input.assetUrl, input.mimeType, input.durationSeconds ?? null, input.sampleRate ?? null, input.channels ?? null, input.fingerprint, JSON.stringify(rights)]
  );
  const created = await getCanonicalAudioAsset(input.creatorId, id);
  if (!created) throw new Error("CreatorVault could not save the selected audio.");
  return created;
}

export async function registerCreatorOwnedAudioUpload(input: {
  creatorId: number;
  title: string;
  assetUrl: string;
  mimeType: string;
  fileFingerprint: string;
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  mediaAssetId?: string | null;
}): Promise<AudioAsset> {
  return registerCanonicalAudioAsset({
    ...input,
    kind: "music",
    fingerprint: input.fileFingerprint,
    rights: {
      state: "creator_owned",
      source: "creator_upload",
      allowedPlatforms: ["creatorvault", "vaultx", "telegram", "instagram", "tiktok", "youtube"],
      permittedUses: ["preview", "render", "distribution"],
      attributionRequired: false,
      evidenceNote: "Creator-uploaded audio stored with an owner-bound receipt and source checksum.",
    },
  });
}

export function assertAudioRights(input: { asset: AudioAsset; intendedUse: AudioIntendedUse; platform: string }): void {
  const rights = input.asset.rights;
  if (rights.expiresAt && new Date(rights.expiresAt).getTime() < Date.now()) throw new Error("This soundtrack’s permission window has ended. Choose another track for this release.");
  if (rights.state === "unknown" || rights.state === "restricted") throw new Error("CreatorVault cannot prepare this soundtrack for release until its usage permission is recorded.");
  if (!rights.permittedUses.includes(input.intendedUse)) {
    throw new Error(input.intendedUse === "preview"
      ? "This soundtrack is not available for preview."
      : "This soundtrack can be previewed, but its current permission does not allow it to be included in a finished release.");
  }
  const platformAllowed = rights.allowedPlatforms.includes("all") || rights.allowedPlatforms.includes(input.platform);
  if (!platformAllowed) throw new Error(`This soundtrack is not cleared for ${input.platform} in the current usage record.`);
}

export async function analyzeCanonicalAudioAsset(creatorId: number, assetId: string): Promise<AudioAnalysis> {
  await ensureAudioIntelligenceSchema();
  const asset = await getCanonicalAudioAsset(creatorId, assetId);
  if (!asset) throw new Error("That soundtrack is not available in your CreatorVault library.");
  assertAudioRights({ asset, intendedUse: "preview", platform: "creatorvault" });
  const existing = await rawQuery("SELECT * FROM canonical_audio_analysis_records WHERE audio_asset_id = ? AND analysis_version = ? LIMIT 1", [asset.id, AUDIO_ANALYSIS_VERSION]);
  if (existing[0]) return hydrateAnalysis(existing[0]);

  await mkdir(TEMP_ROOT, { recursive: true });
  const tempDir = path.join(TEMP_ROOT, randomUUID());
  const tempPath = path.join(tempDir, "source-audio");
  await mkdir(tempDir, { recursive: true });
  try {
    const bytes = await downloadAudio(asset.assetUrl, tempPath);
    const sourceFingerprint = createHash("sha256").update(bytes).digest("hex");
    if (sourceFingerprint !== asset.fingerprint) throw new Error("The soundtrack changed after it was approved. CreatorVault stopped before using a mismatched file.");
    const probe = await probeAudio(tempPath);
    const pcm = await decodeMonoPcm(tempPath);
    const analysisPayload = analyzePcmForCreatorVault(pcm, probe.durationSeconds);
    const id = randomUUID();
    await rawExec(
      `INSERT INTO canonical_audio_analysis_records (id, audio_asset_id, analysis_version, analysis_json, source_fingerprint, analysis_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, asset.id, AUDIO_ANALYSIS_VERSION, JSON.stringify(analysisPayload), sourceFingerprint, analysisPayload.analysisStatus]
    );
    const rows = await rawQuery("SELECT * FROM canonical_audio_analysis_records WHERE id = ? LIMIT 1", [id]);
    if (!rows[0]) throw new Error("CreatorVault could not preserve the soundtrack analysis.");
    return hydrateAnalysis(rows[0]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function getAudioAnalysis(creatorId: number, audioAssetId: string): Promise<AudioAnalysis | null> {
  const asset = await getCanonicalAudioAsset(creatorId, audioAssetId);
  if (!asset) return null;
  const rows = await rawQuery("SELECT * FROM canonical_audio_analysis_records WHERE audio_asset_id = ? AND analysis_version = ? LIMIT 1", [audioAssetId, AUDIO_ANALYSIS_VERSION]);
  return rows[0] ? hydrateAnalysis(rows[0]) : null;
}

export async function recordAudioUsage(input: {
  creatorId: number;
  audioAsset: AudioAsset;
  timelinePlanId?: string | null;
  destination: string;
  intendedUse: AudioIntendedUse;
}): Promise<void> {
  assertAudioRights({ asset: input.audioAsset, intendedUse: input.intendedUse, platform: input.destination });
  await rawExec(
    `INSERT INTO canonical_audio_usage_records (id, creator_id, audio_asset_id, timeline_plan_id, destination, intended_use, rights_snapshot_json, attribution_text)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), input.creatorId, input.audioAsset.id, input.timelinePlanId || null, input.destination, input.intendedUse, JSON.stringify(input.audioAsset.rights), input.audioAsset.rights.attributionText || null]
  );
}

export async function registerFirstPartyFixtureAudio(input: { creatorId: number; assetUrl: string; title: string; fingerprint: string; durationSeconds: number; sampleRate: number; channels: number }): Promise<AudioAsset> {
  return registerCanonicalAudioAsset({
    creatorId: input.creatorId,
    title: input.title,
    assetUrl: input.assetUrl,
    mimeType: "audio/wav",
    kind: "music",
    fingerprint: input.fingerprint,
    durationSeconds: input.durationSeconds,
    sampleRate: input.sampleRate,
    channels: input.channels,
    rights: {
      state: "creator_owned",
      source: "first_party_fixture",
      allowedPlatforms: ["creatorvault"],
      permittedUses: ["preview", "render"],
      attributionRequired: false,
      evidenceNote: "First-party CreatorVault test music generated from the checked-in deterministic source script; allowed only for internal creation proof, not public catalog licensing claims.",
    },
  });
}

export function getCanonicalAudioAnalysisVersion(): string {
  return AUDIO_ANALYSIS_VERSION;
}

export function getCanonicalPublicBase(): string {
  return PUBLIC_APP_URL;
}
