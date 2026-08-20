import { createHash, randomUUID } from "crypto";
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import os from "os";
import mysql from "mysql2/promise";
import { z } from "zod";
import { CAPTION_ENGINE_FEELS, CAPTION_ENGINE_TEMPLATES, getCaptionEngineTemplate } from "@shared/captionEngine";
import { analyzeCaptionTranscript, normalizeCaptionSegments, recommendCaptionTreatmentDecisions, type CaptionSegment, type CaptionTranscriptAnalysis, type CaptionTreatmentDecision } from "@shared/captionEngineIntelligence";
import { evaluateCaptionQuality, normalizeFocusRegions, type CaptionFocusRegion, type CaptionQualityReport } from "@shared/captionEngineQuality";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { analyzeCanonicalAudioAsset, registerCanonicalAudioAsset } from "../services/audioIntelligenceService";
import { renderWithRemotion } from "../remotion/remotionRenderService";

const PUBLIC_APP_URL = (process.env.PUBLIC_APP_URL || process.env.APP_URL || "https://creatorvault.live").replace(/\/$/, "");
const TEMP_ROOT = path.join(os.tmpdir(), "creatorvault-caption-stage");

const CAPTION_PLACEMENTS = ["top", "center", "lower", "adaptive"] as const;
const CAPTION_SAFE_ZONES = ["vertical", "square", "landscape", "platform_safe"] as const;
const CAPTION_PLATFORM_PROFILES = ["creatorvault", "tiktok", "instagram_reels", "youtube_shorts", "instagram_square", "youtube_landscape"] as const;
type CaptionStyle = string;
type CaptionPlacement = (typeof CAPTION_PLACEMENTS)[number];
type CaptionSafeZone = (typeof CAPTION_SAFE_ZONES)[number];
type CaptionPlatformProfile = (typeof CAPTION_PLATFORM_PROFILES)[number];

function normalizeCaptionStyle(value: unknown): CaptionStyle {
  return getCaptionEngineTemplate(String(value || "founder")).id;
}
function normalizeCaptionPlacement(value: unknown): CaptionPlacement {
  return CAPTION_PLACEMENTS.includes(String(value) as CaptionPlacement) ? String(value) as CaptionPlacement : "adaptive";
}
function normalizeCaptionSafeZone(value: unknown): CaptionSafeZone {
  return CAPTION_SAFE_ZONES.includes(String(value) as CaptionSafeZone) ? String(value) as CaptionSafeZone : "platform_safe";
}
function normalizeCaptionPlatformProfile(value: unknown): CaptionPlatformProfile {
  return CAPTION_PLATFORM_PROFILES.includes(String(value) as CaptionPlatformProfile) ? String(value) as CaptionPlatformProfile : "creatorvault";
}

type CaptionTranscription = { transcript: string; segments: CaptionSegment[]; provider: "elevenlabs_scribe" | "creatorvault_local"; language?: string | null };

function publicUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `${PUBLIC_APP_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseJson<T>(value: unknown, fallback: T): T {
  try {
    return typeof value === "string" ? JSON.parse(value) as T : (value as T || fallback);
  } catch {
    return fallback;
  }
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
    caption_platform_profile VARCHAR(32) NOT NULL DEFAULT 'creatorvault',
    status VARCHAR(32) NOT NULL,
    transcription_provider VARCHAR(64) NULL,
    caption_review_status VARCHAR(32) NOT NULL DEFAULT 'needs_review',
    caption_reviewed_at TIMESTAMP NULL,
    caption_scale DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    caption_text_color VARCHAR(32) NULL,
    caption_highlight_color VARCHAR(32) NULL,
    caption_background VARCHAR(64) NULL,
    language_code VARCHAR(32) NULL,
    transcript_analysis_json JSON NULL,
    caption_style_decision_json JSON NULL,
    caption_focus_regions_json JSON NULL,
    caption_quality_report_json JSON NULL,
    artifact_url TEXT NULL,
    thumbnail_url TEXT NULL,
    render_error MEDIUMTEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_caption_stage_creator_created (creator_id, created_at),
    INDEX idx_caption_stage_source (creator_id, source_asset_id)
  )`);
  await connection.execute("ALTER TABLE caption_stage_projects ADD COLUMN transcription_provider VARCHAR(64) NULL").catch(() => undefined);
  await connection.execute("ALTER TABLE caption_stage_projects ADD COLUMN caption_review_status VARCHAR(32) NOT NULL DEFAULT 'needs_review'").catch(() => undefined);
  await connection.execute("ALTER TABLE caption_stage_projects ADD COLUMN caption_reviewed_at TIMESTAMP NULL").catch(() => undefined);
  await connection.execute("ALTER TABLE caption_stage_projects ADD COLUMN caption_scale DECIMAL(5,2) NOT NULL DEFAULT 1.00").catch(() => undefined);
  await connection.execute("ALTER TABLE caption_stage_projects ADD COLUMN caption_text_color VARCHAR(32) NULL").catch(() => undefined);
  await connection.execute("ALTER TABLE caption_stage_projects ADD COLUMN caption_highlight_color VARCHAR(32) NULL").catch(() => undefined);
  await connection.execute("ALTER TABLE caption_stage_projects ADD COLUMN caption_background VARCHAR(64) NULL").catch(() => undefined);
  await connection.execute("ALTER TABLE caption_stage_projects ADD COLUMN language_code VARCHAR(32) NULL").catch(() => undefined);
  await connection.execute("ALTER TABLE caption_stage_projects ADD COLUMN transcript_analysis_json JSON NULL").catch(() => undefined);
  await connection.execute("ALTER TABLE caption_stage_projects ADD COLUMN caption_style_decision_json JSON NULL").catch(() => undefined);
  await connection.execute("ALTER TABLE caption_stage_projects ADD COLUMN caption_platform_profile VARCHAR(32) NOT NULL DEFAULT 'creatorvault'").catch(() => undefined);
  await connection.execute("ALTER TABLE caption_stage_projects ADD COLUMN caption_focus_regions_json JSON NULL").catch(() => undefined);
  await connection.execute("ALTER TABLE caption_stage_projects ADD COLUMN caption_quality_report_json JSON NULL").catch(() => undefined);
  await connection.execute(`UPDATE caption_stage_projects
    SET status = 'needs_caption_review', artifact_url = NULL, thumbnail_url = NULL
    WHERE status = 'captioned_master_ready' AND COALESCE(caption_review_status, 'needs_review') <> 'creator_approved'`).catch(() => undefined);
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
  return normalizeCaptionSegments(rawSegments
    .map((segment: any) => ({
      start: Math.max(0, toNumber(segment?.start)),
      end: Math.max(toNumber(segment?.start) + 0.12, toNumber(segment?.end)),
      text: String(segment?.text || "").trim().replace(/\s+/g, " "),
      confidence: Number.isFinite(Number(segment?.confidence)) ? Number(segment.confidence) : null,
      speaker: segment?.speaker || segment?.speaker_id || null,
      words: Array.isArray(segment?.words) ? segment.words : undefined,
    }))
    .filter((segment): segment is CaptionSegment => segment.text.length > 0 && segment.end > segment.start));
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
      words: group.map((word) => ({ text: word.text, start: word.start, end: word.end, confidence: word.confidence ?? null, speaker: word.speaker ?? null })),
      confidence: group.map((word) => Number(word.confidence)).filter(Number.isFinite).at(0) ?? null,
      speaker: group.map((word) => word.speaker).find(Boolean) ?? null,
    });
    group = [];
  };
  for (const entry of words as any[]) {
    if (String(entry?.type || "word") !== "word") continue;
    const word: CaptionSegment = {
      start: Math.max(0, toNumber(entry?.start)),
      end: Math.max(toNumber(entry?.start) + 0.08, toNumber(entry?.end)),
      text: String(entry?.text || "").trim(),
      confidence: Number.isFinite(Number(entry?.confidence)) ? Number(entry.confidence) : null,
      speaker: entry?.speaker_id || entry?.speaker || null,
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
  return { transcript, segments, provider: "elevenlabs_scribe", language: String(raw?.language_code || raw?.language || "").trim() || null };
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
  return { transcript, segments, provider: "creatorvault_local", language: String(raw?.language || raw?.languageCode || "").trim() || null };
}


async function transcribeSourceVideo(input: { sourcePath: string; sourceUrl: string; sourceFingerprint: string }): Promise<CaptionTranscription> {
  const failures: string[] = [];
  try { return await transcribeWithElevenLabs(input.sourceUrl); } catch (error: any) { failures.push(String(error?.message || "ElevenLabs failed")); }
  try { return await transcribeWithLocalWorker(input.sourceUrl, input.sourceFingerprint); } catch (error: any) { failures.push(String(error?.message || "Local worker failed")); }
  console.error("Caption Stage transcription lanes failed", { failures });
  throw new Error("Caption Stage could not read the spoken words right now. Your selected video is still safe; try again shortly.");
}

function qualityForProject(project: any, strict = false): CaptionQualityReport {
  const template = getCaptionEngineTemplate(project.captionStyle);
  const background = String(project.captionTypography?.background || template.background || "");
  const contrastBackground = /^#[0-9a-fA-F]{6}$/.test(background) ? background : "#0A0A0A";
  return evaluateCaptionQuality({
    segments: project.segments,
    profile: project.platformProfile,
    preferredPlacement: project.captionPlacement,
    focusRegions: project.focusRegions,
    width: project.platformProfile === "instagram_square" ? 1080 : project.platformProfile === "youtube_landscape" ? 1920 : 1080,
    height: project.platformProfile === "instagram_square" ? 1080 : project.platformProfile === "youtube_landscape" ? 1080 : 1920,
    textColor: project.captionTypography?.color || template.color,
    backgroundColor: contrastBackground,
    strict,
  });
}

function hydrate(row: any) {
  const segments = normalizeCaptionSegments(parseJson<CaptionSegment[]>(row.segments_json, []));
  const transcriptAnalysis = parseJson<CaptionTranscriptAnalysis | null>(row.transcript_analysis_json, null);
  const styleDecision = parseJson<CaptionTreatmentDecision[] | null>(row.caption_style_decision_json, null);
  const focusRegions = normalizeFocusRegions(parseJson<CaptionFocusRegion[]>(row.caption_focus_regions_json, []));
  const captionQualityReport = parseJson<CaptionQualityReport | null>(row.caption_quality_report_json, null);
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
    platformProfile: normalizeCaptionPlatformProfile(row.caption_platform_profile),
    status: String(row.status),
    artifactUrl: row.artifact_url ? String(row.artifact_url) : null,
    thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : null,
    renderError: row.render_error ? String(row.render_error) : null,
    transcriptionProvider: row.transcription_provider ? String(row.transcription_provider) : null,
    language: row.language_code ? String(row.language_code) : null,
    transcriptAnalysis,
    styleDecision,
    focusRegions,
    captionQualityReport,
    captionReviewStatus: row.caption_review_status ? String(row.caption_review_status) : "needs_review",
    captionReviewedAt: row.caption_reviewed_at ? new Date(row.caption_reviewed_at).toISOString() : null,
    captionTypography: {
      size: Math.max(0.65, Math.min(1.45, toNumber(row.caption_scale) || 1)),
      color: row.caption_text_color ? String(row.caption_text_color) : null,
      highlightColor: row.caption_highlight_color ? String(row.caption_highlight_color) : null,
      background: row.caption_background ? String(row.caption_background) : null,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const projectInput = z.object({
  sourceAssetId: z.string().min(1),
  captionStyle: z.string().min(1).max(64).transform((value) => normalizeCaptionStyle(value)).default("founder"),
  captionPlacement: z.enum(CAPTION_PLACEMENTS).default("adaptive"),
  safeZone: z.enum(CAPTION_SAFE_ZONES).default("platform_safe"),
  platformProfile: z.enum(CAPTION_PLATFORM_PROFILES).default("creatorvault"),
});

export const captionStageRouter = router({
  recommendTreatments: protectedProcedure.input(z.object({
    projectId: z.string().min(1).optional(),
    feeling: z.enum(CAPTION_ENGINE_FEELS),
    transcript: z.string().max(20_000).default(""),
    language: z.string().max(32).nullable().optional(),
    segments: z.array(z.object({
      id: z.string().optional(),
      start: z.number(),
      end: z.number(),
      text: z.string().max(280),
      confidence: z.number().nullable().optional(),
      speaker: z.string().nullable().optional(),
      words: z.array(z.object({ text: z.string().max(100), start: z.number(), end: z.number(), confidence: z.number().nullable().optional(), speaker: z.string().nullable().optional() })).optional(),
    })).max(500).default([]),
  })).mutation(async ({ input }) => {
    const analysis = analyzeCaptionTranscript({ transcript: input.transcript, segments: input.segments, language: input.language });
    let decisions = recommendCaptionTreatmentDecisions({ feel: input.feeling, analysis, templates: CAPTION_ENGINE_TEMPLATES });
    let recommendationSource: "ai_reviewed" | "caption_engine" = "caption_engine";
    const catalog = CAPTION_ENGINE_TEMPLATES.map((template) => ({ id: template.id, title: template.title, family: template.family, bestFor: template.bestFor, energy: template.energy, timing: template.timing }));
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are CreatorVault Caption Director. Return JSON only: {\\\"ids\\\":[\\\"style-1\\\",\\\"style-2\\\",\\\"style-3\\\"]}. Select exactly three distinct IDs from the catalog. Honor actual delivery pace, creator-selected feeling, and readability. Never invent an ID." },
          { role: "user", content: JSON.stringify({ feeling: input.feeling, analysis, catalog }) },
        ],
        maxTokens: 180,
        responseFormat: { type: "json_object" },
      });
      const content = response.choices[0]?.message?.content;
      const raw = typeof content === "string" ? content : "";
      const ids = JSON.parse(raw)?.ids;
      const byId = new Map(CAPTION_ENGINE_TEMPLATES.map((template) => [template.id, template]));
      if (Array.isArray(ids) && new Set(ids.map(String)).size === 3 && ids.every((id: unknown) => byId.has(String(id)))) {
        const deterministic = new Map(decisions.map((decision) => [decision.id, decision]));
        decisions = ids.map((id: unknown, index: number) => deterministic.get(String(id)) || {
          id: String(id),
          score: 90 - index,
          reason: `${byId.get(String(id))?.title || "This direction"} matches the real pace and feeling of this source.`,
          pacing: analysis.pacing,
          emphasis: "focused" as const,
        });
        recommendationSource = "ai_reviewed";
      }
    } catch {
      // Deterministic transcript intelligence keeps the creator moving even when the optional review model is unavailable.
    }
    const byId = new Map(CAPTION_ENGINE_TEMPLATES.map((template) => [template.id, template]));
    const treatments = decisions.map((decision) => {
      const template = byId.get(decision.id)!;
      return { id: template.id, title: template.title, eyebrow: template.eyebrow, detail: template.detail, family: template.family, energy: template.energy, reason: decision.reason, pacing: decision.pacing, emphasis: decision.emphasis };
    });
    if (input.projectId) {
      const connection = await getConnection();
      try {
        await ensureCaptionStageTable(connection);
        await connection.execute(
          "UPDATE caption_stage_projects SET transcript_analysis_json = ?, caption_style_decision_json = ? WHERE id = ? AND creator_id = ?",
          [JSON.stringify(analysis), JSON.stringify(decisions), input.projectId, ctx.user.id],
        );
      } finally {
        await connection.end();
      }
    }
    return { source: recommendationSource, analysis, treatments };
  }),

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
          (id, creator_id, source_asset_id, source_video_url, source_title, source_duration_seconds, caption_style, caption_placement, safe_zone, caption_platform_profile, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reading_words')`,
        [projectId, ctx.user.id, source.id, source.sourceUrl, source.title, source.duration, input.captionStyle, input.captionPlacement, input.safeZone, input.platformProfile],
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
      const segments = normalizeCaptionSegments(timed.segments);
      if (!segments.length) {
        throw new Error("No clear spoken words were found in this saved video. Caption Stage kept the source intact and did not invent dialogue.");
      }
      const transcript = String(timed.transcript || segments.map((segment) => segment.text).join(" ")).trim();
      const transcriptAnalysis = analyzeCaptionTranscript({ transcript, segments, language: timed.language });
      await connection.execute(
        `UPDATE caption_stage_projects
            SET audio_asset_id = ?, audio_analysis_id = ?, transcript = ?, segments_json = ?, transcription_provider = ?, language_code = ?, transcript_analysis_json = ?, status = 'timed_captions_ready'
          WHERE id = ? AND creator_id = ?`,
        [sourceAudio.id, audioAnalysis.id, transcript, JSON.stringify(segments), timed.provider, timed.language || null, JSON.stringify(transcriptAnalysis), projectId, ctx.user.id],
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
      if (project.captionReviewStatus !== "creator_approved") throw new Error("Check the timed words against the source before you prepare the captioned master. CreatorVault will not sell an unchecked transcript as finished.");
      const quality = qualityForProject(project, true);
      await connection.execute("UPDATE caption_stage_projects SET caption_quality_report_json = ? WHERE id = ? AND creator_id = ?", [JSON.stringify(quality), project.id, ctx.user.id]);
      if (quality.status === "blocked") {
        const problem = quality.issues.find((issue) => issue.severity === "blocking");
        throw new Error(`${problem?.message || "Caption quality needs attention before export."} ${problem?.proposedFix || "Adjust the look or placement and try again."}`);
      }
      await connection.execute("UPDATE caption_stage_projects SET status = 'preparing_captioned_master', render_error = NULL WHERE id = ? AND creator_id = ?", [project.id, ctx.user.id]);
      const square = project.platformProfile === "instagram_square" || project.safeZone === "square";
      const landscape = project.platformProfile === "youtube_landscape" || project.safeZone === "landscape";
      const renderRevision = `${project.id}-${Date.now().toString(36)}`;
      const render = await renderWithRemotion({
        jobId: renderRevision,
        mode: "caption_stage",
        baseImagePath: "",
        baseImageUrl: "",
        backgroundVideoUrl: project.sourceVideoUrl,
        width: landscape ? 1920 : 1080,
        height: landscape || square ? 1080 : 1920,
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
        captionPlacement: project.captionPlacement === "adaptive" ? quality.resolvedPlacement : project.captionPlacement,
        captionSafeZone: project.safeZone,
        captionPlatformProfile: project.platformProfile,
        captionQualityMode: "strict",
        captionFocusRegions: quality.focusRegions,
        captionTypography: project.captionTypography,
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

  reviewTimedWords: protectedProcedure.input(z.object({
    projectId: z.string().min(1),
    texts: z.array(z.string().trim().min(1).max(140)).min(1).max(500),
    speakers: z.array(z.string().trim().min(1).max(32).nullable()).max(500).default([]),
  })).mutation(async ({ ctx, input }) => {
    const connection = await getConnection();
    try {
      await ensureCaptionStageTable(connection);
      const [rows] = await connection.execute<any[]>("SELECT * FROM caption_stage_projects WHERE id = ? AND creator_id = ? LIMIT 1", [input.projectId, ctx.user.id]);
      if (!rows[0]) throw new Error("That Caption Stage project is not in your CreatorVault.");
      const project = hydrate(rows[0]);
      if (project.segments.length !== input.texts.length) throw new Error("Caption Stage kept the original timing because the review no longer matches this source.");
      if (input.speakers.length && input.speakers.length !== project.segments.length) throw new Error("Caption Stage needs one speaker label for each reviewed caption group.");
      const segments = normalizeCaptionSegments(project.segments.map((segment, index) => ({ ...segment, text: input.texts[index].replace(/\s+/g, " ").trim(), speaker: input.speakers[index] || segment.speaker || null })));
      const transcript = segments.map(segment => segment.text).join(" ").replace(/\s+([,.!?;:])/g, "$1");
      const transcriptAnalysis = analyzeCaptionTranscript({ transcript, segments, language: project.language });
      await connection.execute(
        `UPDATE caption_stage_projects
            SET transcript = ?, segments_json = ?, transcript_analysis_json = ?, caption_review_status = 'creator_approved', caption_reviewed_at = NOW(),
                artifact_url = NULL, thumbnail_url = NULL, status = 'timed_captions_ready', render_error = NULL
          WHERE id = ? AND creator_id = ?`,
        [transcript, JSON.stringify(segments), JSON.stringify(transcriptAnalysis), input.projectId, ctx.user.id],
      );
      const [finalRows] = await connection.execute<any[]>("SELECT * FROM caption_stage_projects WHERE id = ? AND creator_id = ? LIMIT 1", [input.projectId, ctx.user.id]);
      return hydrate(finalRows[0]);
    } finally {
      await connection.end();
    }
  }),

  updatePresentation: protectedProcedure.input(z.object({
    projectId: z.string().min(1),
    captionStyle: z.string().min(1).max(64).transform((value) => normalizeCaptionStyle(value)),
    captionPlacement: z.enum(CAPTION_PLACEMENTS),
    safeZone: z.enum(CAPTION_SAFE_ZONES),
    platformProfile: z.enum(CAPTION_PLATFORM_PROFILES).default("creatorvault"),
    qualityMode: z.enum(["standard", "strict"]).default("standard"),
    focusRegions: z.array(z.object({
      id: z.string().max(64).optional(),
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      width: z.number().min(.02).max(1),
      height: z.number().min(.02).max(1),
      label: z.string().max(64).optional(),
      source: z.enum(["creator_marked", "source_analysis"]).default("creator_marked"),
      confidence: z.number().min(0).max(1).nullable().optional(),
    })).max(12).default([]),
    captionTypography: z.object({
      size: z.number().min(0.65).max(1.45).default(1),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().default(null),
      highlightColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().default(null),
      background: z.string().min(3).max(64).nullable().default(null),
    }).default({ size: 1, color: null, highlightColor: null, background: null }),
  })).mutation(async ({ ctx, input }) => {
    const connection = await getConnection();
    try {
      await ensureCaptionStageTable(connection);
      const [existingRows] = await connection.execute<any[]>("SELECT * FROM caption_stage_projects WHERE id = ? AND creator_id = ? LIMIT 1", [input.projectId, ctx.user.id]);
      if (!existingRows[0]) throw new Error("That Caption Stage project is not in your CreatorVault.");
      const current = hydrate(existingRows[0]);
      const focusRegions = normalizeFocusRegions(input.focusRegions.map((region, index) => ({ ...region, id: region.id || `focus-${index + 1}` })));
      const draft = {
        ...current,
        captionStyle: input.captionStyle,
        captionPlacement: input.captionPlacement,
        safeZone: input.safeZone,
        platformProfile: input.platformProfile,
        focusRegions,
        captionTypography: input.captionTypography,
      };
      const quality = qualityForProject(draft, input.qualityMode === "strict");
      await connection.execute(
          `UPDATE caption_stage_projects
            SET caption_style = ?, caption_placement = ?, safe_zone = ?, caption_platform_profile = ?, caption_scale = ?, caption_text_color = ?, caption_highlight_color = ?, caption_background = ?, caption_focus_regions_json = ?, caption_quality_report_json = ?, artifact_url = NULL, thumbnail_url = NULL,
                status = CASE WHEN segments_json IS NULL THEN status ELSE 'timed_captions_ready' END
          WHERE id = ? AND creator_id = ?`,
          [input.captionStyle, input.captionPlacement, input.safeZone, input.platformProfile, input.captionTypography.size, input.captionTypography.color, input.captionTypography.highlightColor, input.captionTypography.background, JSON.stringify(focusRegions), JSON.stringify(quality), input.projectId, ctx.user.id],
      );
      const [rows] = await connection.execute<any[]>("SELECT * FROM caption_stage_projects WHERE id = ? AND creator_id = ? LIMIT 1", [input.projectId, ctx.user.id]);
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
