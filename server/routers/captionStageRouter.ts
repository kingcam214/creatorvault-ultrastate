import { createHash, randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import os from "os";
import mysql from "mysql2/promise";
import OpenAI from "openai";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { analyzeCanonicalAudioAsset, registerCanonicalAudioAsset } from "../services/audioIntelligenceService";
import { renderWithRemotion } from "../remotion/remotionRenderService";

const execFileAsync = promisify(execFile);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PUBLIC_APP_URL = (process.env.PUBLIC_APP_URL || process.env.APP_URL || "https://creatorvault.live").replace(/\/$/, "");
const TEMP_ROOT = path.join(os.tmpdir(), "creatorvault-caption-stage");

const CAPTION_STYLES = ["command", "glow", "silk", "paper"] as const;
const CAPTION_PLACEMENTS = ["top", "center", "lower"] as const;
const CAPTION_SAFE_ZONES = ["vertical", "square", "landscape"] as const;
type CaptionStyle = (typeof CAPTION_STYLES)[number];
type CaptionPlacement = (typeof CAPTION_PLACEMENTS)[number];
type CaptionSafeZone = (typeof CAPTION_SAFE_ZONES)[number];

function normalizeCaptionStyle(value: unknown): CaptionStyle {
  return CAPTION_STYLES.includes(String(value) as CaptionStyle) ? String(value) as CaptionStyle : "command";
}
function normalizeCaptionPlacement(value: unknown): CaptionPlacement {
  return CAPTION_PLACEMENTS.includes(String(value) as CaptionPlacement) ? String(value) as CaptionPlacement : "lower";
}
function normalizeCaptionSafeZone(value: unknown): CaptionSafeZone {
  return CAPTION_SAFE_ZONES.includes(String(value) as CaptionSafeZone) ? String(value) as CaptionSafeZone : "vertical";
}

type CaptionSegment = { start: number; end: number; text: string };
type CaptionTranscription = { transcript: string; segments: CaptionSegment[]; provider: "elevenlabs_scribe" | "creatorvault_local" | "openai_whisper" };

function publicUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `${PUBLIC_APP_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getConnection(): Promise<mysql.Connection> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("CreatorVault storage is not available for Caption Stage right now.");
  const parsed = new URL(databaseUrl);
  return mysql.createConnection({
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
  });
}

async function ensureCaptionStageTable(connection: mysql.Connection): Promise<void> {
  await connection.execute(`CREATE TABLE IF NOT EXISTS caption_stage_projects (
    id VARCHAR(64) PRIMARY KEY,
    creator_id BIGINT NOT NULL,
    source_asset_id VARCHAR(128) NOT NULL,
    source_video_url TEXT NOT NULL,
    source_title VARCHAR(255) NOT NULL,
    source_duration_seconds DECIMAL(12,3) NOT NULL,
    audio_asset_id VARCHAR(64) NULL,
    audio_analysis_id VARCHAR(64) NULL,
    transcript MEDIUMTEXT NULL,
    segments_json JSON NULL,
    caption_style VARCHAR(32) NOT NULL,
    caption_placement VARCHAR(32) NOT NULL,
    safe_zone VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    transcription_provider VARCHAR(64) NULL,
    artifact_url TEXT NULL,
    thumbnail_url TEXT NULL,
    render_error MEDIUMTEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_caption_stage_creator_created (creator_id, created_at),
    INDEX idx_caption_stage_source (creator_id, source_asset_id)
  )`);
  await connection.execute("ALTER TABLE caption_stage_projects ADD COLUMN transcription_provider VARCHAR(64) NULL").catch(() => undefined);
}

async function sourceForCreator(connection: mysql.Connection, creatorId: number, assetId: string) {
  const [rows] = await connection.execute<any[]>(
    `SELECT id, file_name, original_name, public_url, storage_path, mime_type, duration, width, height, status
       FROM media_assets
      WHERE id = ? AND user_id = ? AND status = 'ready' AND source_type = 'upload'
        AND (asset_type = 'video' OR mime_type LIKE 'video/%')
        AND (public_url IS NULL OR public_url NOT LIKE '%/api/media/asset/%')
      LIMIT 1`,
    [assetId, creatorId],
  );
  const source = rows[0];
  if (!source) throw new Error("That saved video is not ready for Caption Stage. Choose a video CreatorVault can open from your vault.");
  const sourceUrl = String(source.public_url || source.storage_path || "").trim();
  const duration = toNumber(source.duration);
  if (!sourceUrl || duration <= 0 || toNumber(source.width) <= 0 || toNumber(source.height) <= 0) {
    throw new Error("That saved video is missing the details Caption Stage needs. Choose a verified source from your vault.");
  }
  return {
    id: String(source.id),
    title: String(source.original_name || source.file_name || "Saved CreatorVault video"),
    sourceUrl: publicUrl(sourceUrl),
    mimeType: String(source.mime_type || "video/mp4"),
    duration,
  };
}

async function downloadSource(url: string, destination: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("CreatorVault could not open that saved video for Caption Stage.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1024) throw new Error("CreatorVault stopped because the selected video file was empty.");
  await writeFile(destination, bytes);
  return bytes;
}

function normalizeSegments(rawSegments: unknown[]): CaptionSegment[] {
  return rawSegments
    .map((segment: any) => ({
      start: Math.max(0, toNumber(segment?.start)),
      end: Math.max(toNumber(segment?.start) + 0.12, toNumber(segment?.end)),
      text: String(segment?.text || "").trim().replace(/\s+/g, " "),
    }))
    .filter((segment): segment is CaptionSegment => segment.text.length > 0 && segment.end > segment.start);
}

function groupScribeWords(words: unknown[]): CaptionSegment[] {
  const result: CaptionSegment[] = [];
  let group: CaptionSegment[] = [];
  const flush = () => {
    if (!group.length) return;
    result.push({
      start: group[0].start,
      end: group[group.length - 1].end,
      text: group.map(word => word.text).join(" ").replace(/\s+([,.!?;:])/g, "$1").trim(),
    });
    group = [];
  };
  for (const entry of words as any[]) {
    if (String(entry?.type || "word") !== "word") continue;
    const word: CaptionSegment = {
      start: Math.max(0, toNumber(entry?.start)),
      end: Math.max(toNumber(entry?.start) + 0.08, toNumber(entry?.end)),
      text: String(entry?.text || "").trim(),
    };
    if (!word.text || word.end <= word.start) continue;
    // Short bursts preserve the moving body and create a real reading rhythm on a phone.
    if (group.length && (group.length >= 3 || word.end - group[0].start > 1.35)) flush();
    group.push(word);
  }
  flush();
  return result;
}

async function transcribeWithElevenLabs(sourceUrl: string): Promise<CaptionTranscription> {
  const apiKey = String(process.env.ELEVENLABS_API_KEY || "").trim();
  if (!apiKey) throw new Error("ElevenLabs is not configured.");
  const body = new FormData();
  body.set("model_id", "scribe_v2");
  body.set("source_url", sourceUrl);
  body.set("language_code", "eng");
  body.set("timestamps_granularity", "word");
  body.set("no_verbatim", "true");
  body.set("tag_audio_events", "false");
  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body,
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`ElevenLabs transcription was unavailable (${response.status}).`);
  const raw = await response.json() as any;
  const segments = groupScribeWords(Array.isArray(raw?.words) ? raw.words : []);
  const transcript = String(raw?.text || "").trim().replace(/\s+/g, " ");
  if (!segments.length || !transcript) throw new Error("ElevenLabs returned no usable timed words.");
  return { transcript, segments, provider: "elevenlabs_scribe" };
}

async function transcribeWithLocalWorker(sourceUrl: string, sourceFingerprint: string): Promise<CaptionTranscription> {
  const workerUrl = String(process.env.CREATORVAULT_CAPTION_WORKER_URL || "").replace(/\/$/, "");
  const workerToken = String(process.env.CREATORVAULT_CAPTION_WORKER_TOKEN || "").trim();
  if (!workerUrl || !workerToken) throw new Error("CreatorVault local caption worker is not connected.");
  const response = await fetch(`${workerUrl}/v1/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CreatorVault-Caption-Token": workerToken },
    body: JSON.stringify({ sourceUrl, sourceFingerprint }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!response.ok) throw new Error(`CreatorVault local caption worker was unavailable (${response.status}).`);
  const raw = await response.json() as any;
  const segments = normalizeSegments(Array.isArray(raw?.segments) ? raw.segments : []);
  const transcript = String(raw?.transcript || "").trim().replace(/\s+/g, " ");
  if (!segments.length || !transcript) throw new Error("CreatorVault local caption worker returned no usable timed words.");
  return { transcript, segments, provider: "creatorvault_local" };
}

async function transcribeWithOpenAi(sourcePath: string): Promise<CaptionTranscription> {
  const audioPath = `${sourcePath}.wav`;
  try {
    await execFileAsync("ffmpeg", ["-y", "-i", sourcePath, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", audioPath]);
    const response = await openai.audio.transcriptions.create({
      file: await readFile(audioPath).then((bytes) => new File([bytes], "source.wav", { type: "audio/wav" })),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment", "word"],
    } as any);
    const raw = response as any;
    const segments = normalizeSegments(Array.isArray(raw?.segments) ? raw.segments : []);
    return { transcript: String(raw?.text || "").trim(), segments, provider: "openai_whisper" };
  } finally {
    await rm(audioPath, { force: true });
  }
}

async function transcribeSourceVideo(input: { sourcePath: string; sourceUrl: string; sourceFingerprint: string }): Promise<CaptionTranscription> {
  const failures: string[] = [];
  try { return await transcribeWithElevenLabs(input.sourceUrl); } catch (error: any) { failures.push(String(error?.message || "ElevenLabs failed")); }
  try { return await transcribeWithLocalWorker(input.sourceUrl, input.sourceFingerprint); } catch (error: any) { failures.push(String(error?.message || "Local worker failed")); }
  try { return await transcribeWithOpenAi(input.sourcePath); } catch (error: any) { failures.push(String(error?.message || "OpenAI failed")); }
  console.error("Caption Stage transcription lanes failed", { failures });
  throw new Error("Caption Stage could not read the spoken words right now. Your selected video is still safe; try again shortly.");
}

function hydrate(row: any) {
  let segments: CaptionSegment[] = [];
  try { segments = typeof row.segments_json === "string" ? JSON.parse(row.segments_json) : (row.segments_json || []); } catch { segments = []; }
  return {
    id: String(row.id),
    sourceAssetId: String(row.source_asset_id),
    sourceVideoUrl: String(row.source_video_url),
    sourceTitle: String(row.source_title),
    sourceDurationSeconds: toNumber(row.source_duration_seconds),
    audioAssetId: row.audio_asset_id ? String(row.audio_asset_id) : null,
    audioAnalysisId: row.audio_analysis_id ? String(row.audio_analysis_id) : null,
    transcript: row.transcript ? String(row.transcript) : "",
    segments,
    captionStyle: normalizeCaptionStyle(row.caption_style),
    captionPlacement: normalizeCaptionPlacement(row.caption_placement),
    safeZone: normalizeCaptionSafeZone(row.safe_zone),
    status: String(row.status),
    artifactUrl: row.artifact_url ? String(row.artifact_url) : null,
    thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : null,
    renderError: row.render_error ? String(row.render_error) : null,
    transcriptionProvider: row.transcription_provider ? String(row.transcription_provider) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const projectInput = z.object({
  sourceAssetId: z.string().min(1),
  captionStyle: z.enum(CAPTION_STYLES).default("command"),
  captionPlacement: z.enum(CAPTION_PLACEMENTS).default("lower"),
  safeZone: z.enum(CAPTION_SAFE_ZONES).default("vertical"),
});

export const captionStageRouter = router({
  createTimedCaptions: protectedProcedure.input(projectInput).mutation(async ({ ctx, input }) => {
    const connection = await getConnection();
    const projectId = randomUUID();
    const tempDir = path.join(TEMP_ROOT, projectId);
    const sourcePath = path.join(tempDir, "source.mp4");
    try {
      await ensureCaptionStageTable(connection);
      const source = await sourceForCreator(connection, ctx.user.id, input.sourceAssetId);
      await connection.execute(
        `INSERT INTO caption_stage_projects
          (id, creator_id, source_asset_id, source_video_url, source_title, source_duration_seconds, caption_style, caption_placement, safe_zone, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'reading_words')`,
        [projectId, ctx.user.id, source.id, source.sourceUrl, source.title, source.duration, input.captionStyle, input.captionPlacement, input.safeZone],
      );
      await mkdir(tempDir, { recursive: true });
      const sourceBytes = await downloadSource(source.sourceUrl, sourcePath);
      const fingerprint = createHash("sha256").update(sourceBytes).digest("hex");
      const sourceAudio = await registerCanonicalAudioAsset({
        creatorId: ctx.user.id,
        mediaAssetId: source.id,
        title: `${source.title} — source sound`,
        assetUrl: source.sourceUrl,
        mimeType: source.mimeType,
        kind: "source_audio",
        fingerprint,
        durationSeconds: source.duration,
        rights: {
          state: "creator_owned",
          source: "creator_upload",
          allowedPlatforms: ["creatorvault", "vaultx", "instagram", "tiktok", "youtube"],
          permittedUses: ["preview", "render", "distribution"],
          attributionRequired: false,
          evidenceNote: "Caption Stage derives timing only from the creator-owned source video selected in CreatorVault.",
        },
      });
      const audioAnalysis = await analyzeCanonicalAudioAsset(ctx.user.id, sourceAudio.id);
      const timed = await transcribeSourceVideo({ sourcePath, sourceUrl: source.sourceUrl, sourceFingerprint: fingerprint });
      if (!timed.segments.length) {
        throw new Error("No clear spoken words were found in this saved video. Caption Stage kept the source intact and did not invent dialogue.");
      }
      await connection.execute(
        `UPDATE caption_stage_projects
            SET audio_asset_id = ?, audio_analysis_id = ?, transcript = ?, segments_json = ?, transcription_provider = ?, status = 'timed_captions_ready'
          WHERE id = ? AND creator_id = ?`,
        [sourceAudio.id, audioAnalysis.id, timed.transcript, JSON.stringify(timed.segments), timed.provider, projectId, ctx.user.id],
      );
      const [rows] = await connection.execute<any[]>("SELECT * FROM caption_stage_projects WHERE id = ? AND creator_id = ? LIMIT 1", [projectId, ctx.user.id]);
      return hydrate(rows[0]);
    } catch (error: any) {
      await connection.execute("UPDATE caption_stage_projects SET status = 'failed', render_error = ? WHERE id = ? AND creator_id = ?", [String(error?.message || "Caption Stage could not read this source."), projectId, ctx.user.id]).catch(() => undefined);
      throw error;
    } finally {
      await rm(tempDir, { recursive: true, force: true });
      await connection.end();
    }
  }),

  renderCaptionedMaster: protectedProcedure.input(z.object({ projectId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const connection = await getConnection();
    try {
      await ensureCaptionStageTable(connection);
      const [rows] = await connection.execute<any[]>("SELECT * FROM caption_stage_projects WHERE id = ? AND creator_id = ? LIMIT 1", [input.projectId, ctx.user.id]);
      const row = rows[0];
      if (!row) throw new Error("That Caption Stage project is not in your CreatorVault.");
      const project = hydrate(row);
      if (!project.segments.length) throw new Error("Caption Stage needs real timed words before it can prepare a captioned master.");
      await connection.execute("UPDATE caption_stage_projects SET status = 'preparing_captioned_master', render_error = NULL WHERE id = ? AND creator_id = ?", [project.id, ctx.user.id]);
      const portrait = project.safeZone === "vertical";
      const square = project.safeZone === "square";
      const render = await renderWithRemotion({
        jobId: project.id,
        mode: "caption_stage",
        baseImagePath: "",
        baseImageUrl: "",
        backgroundVideoUrl: project.sourceVideoUrl,
        width: portrait ? 1080 : square ? 1080 : 1920,
        height: portrait ? 1920 : square ? 1080 : 1080,
        fps: 30,
        durationSeconds: Math.min(60, Math.max(1, project.sourceDurationSeconds)),
        motionPreset: "royal_purple",
        premiumMode: true,
        cinematicMode: true,
        artistName: "CreatorVault",
        songTitle: "Timed Caption Master",
        subtitle: "",
        textPreset: "caption-stage",
        accentColor: "E8D2FF",
        textColor: "FFFFFF",
        fontFamily: "Montserrat",
        captionSegments: project.segments,
        captionStyle: project.captionStyle,
        captionPlacement: project.captionPlacement,
        captionSafeZone: project.safeZone,
      });
      if (!render.success || !render.videoUrl) throw new Error(String(render.error || "CreatorVault could not prepare the captioned master."));
      const artifactUrl = publicUrl(String(render.videoUrl));
      const thumbnailUrl = render.thumbnailUrl ? publicUrl(String(render.thumbnailUrl)) : null;
      await connection.execute(
        `UPDATE caption_stage_projects
            SET status = 'captioned_master_ready', artifact_url = ?, thumbnail_url = ?, render_error = NULL
          WHERE id = ? AND creator_id = ?`,
        [artifactUrl, thumbnailUrl, project.id, ctx.user.id],
      );
      const [finalRows] = await connection.execute<any[]>("SELECT * FROM caption_stage_projects WHERE id = ? AND creator_id = ? LIMIT 1", [project.id, ctx.user.id]);
      return hydrate(finalRows[0]);
    } catch (error: any) {
      await connection.execute("UPDATE caption_stage_projects SET status = 'failed', render_error = ? WHERE id = ? AND creator_id = ?", [String(error?.message || "Caption Stage could not prepare the master."), input.projectId, ctx.user.id]).catch(() => undefined);
      throw error;
    } finally {
      await connection.end();
    }
  }),

  updatePresentation: protectedProcedure.input(z.object({ projectId: z.string().min(1), captionStyle: z.enum(CAPTION_STYLES), captionPlacement: z.enum(CAPTION_PLACEMENTS), safeZone: z.enum(CAPTION_SAFE_ZONES) })).mutation(async ({ ctx, input }) => {
    const connection = await getConnection();
    try {
      await ensureCaptionStageTable(connection);
      await connection.execute(
        `UPDATE caption_stage_projects
            SET caption_style = ?, caption_placement = ?, safe_zone = ?, artifact_url = NULL, thumbnail_url = NULL,
                status = CASE WHEN segments_json IS NULL THEN status ELSE 'timed_captions_ready' END
          WHERE id = ? AND creator_id = ?`,
        [input.captionStyle, input.captionPlacement, input.safeZone, input.projectId, ctx.user.id],
      );
      const [rows] = await connection.execute<any[]>("SELECT * FROM caption_stage_projects WHERE id = ? AND creator_id = ? LIMIT 1", [input.projectId, ctx.user.id]);
      if (!rows[0]) throw new Error("That Caption Stage project is not in your CreatorVault.");
      return hydrate(rows[0]);
    } finally {
      await connection.end();
    }
  }),

  getProject: protectedProcedure.input(z.object({ projectId: z.string().min(1) })).query(async ({ ctx, input }) => {
    const connection = await getConnection();
    try {
      await ensureCaptionStageTable(connection);
      const [rows] = await connection.execute<any[]>("SELECT * FROM caption_stage_projects WHERE id = ? AND creator_id = ? LIMIT 1", [input.projectId, ctx.user.id]);
      return rows[0] ? hydrate(rows[0]) : null;
    } finally {
      await connection.end();
    }
  }),

  listProjects: protectedProcedure.query(async ({ ctx }) => {
    const connection = await getConnection();
    try {
      await ensureCaptionStageTable(connection);
      const [rows] = await connection.execute<any[]>("SELECT * FROM caption_stage_projects WHERE creator_id = ? ORDER BY created_at DESC LIMIT 30", [ctx.user.id]);
      return rows.map(hydrate);
    } finally {
      await connection.end();
    }
  }),
});
