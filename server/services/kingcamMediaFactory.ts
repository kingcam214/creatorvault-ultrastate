/**
 * ============================================================================
 * KINGCAM MEDIA FACTORY
 * ============================================================================
 *
 * The single entry point for all KingCam autonomous content generation.
 * Runs the complete pipeline: script → voice → image → motion → export
 *
 * Providers:
 *   Script:  OpenAI gpt-4.1-mini (kingcamScriptGenerator)
 *   Voice:   ElevenLabs KingCam clone (rwc11bXCBw5KydM4avHE)
 *   Image:   Replicate fluxdevcam (kingcam214/fluxdevcam)
 *   Motion:  Pollo.ai Kling 3.0 (primary) / Seedance 2.0 (fallback)
 *   Storage: S3 via storagePut
 *   DB:      kingcam_clone_videos + media_assets + pollo_generations
 * ============================================================================
 */

import { generateKingCamScript } from "./kingcamScriptGenerator.js";
import { generateSpeech, KINGCAM_VOICE_PROFILE } from "../_core/tts.js";
import { generateKingCamImage, generateKingCamVideo } from "./kingcamAI.js";
import { storagePut } from "../storage.js";
import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL || "mysql://root:@localhost:3306/creatorvault";
async function getDb() {
  const conn = await mysql.createConnection(DB_URL);
  return conn;
}
import { randomUUID } from "crypto";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type FactoryMode =
  | "FAST"    // Image only, no video (30s, ~$0.02)
  | "BOOST"   // Image + 5s Pollo video (3-5 min, ~$0.15)
  | "FULL";   // Full pipeline: script + voice + image + 10s video (8-12 min, ~$0.40)

export type ContentVertical =
  | "clone_lab"
  | "dominican"
  | "adult"
  | "general"
  | "telegram_drop";

export interface FactoryOptions {
  topic: string;
  vertical?: ContentVertical;
  mode?: FactoryMode;
  userId: number;
  suitColor?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  videoModel?: "kling-3.0" | "kling-2.6" | "seedance-2.0" | "pollo-3.0";
  referenceImageUrl?: string;
  targetDuration?: number;
}

export interface FactoryResult {
  jobId: string;
  status: "complete" | "partial" | "failed";
  scriptText: string;
  audioUrl: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  duration: number;
  provider: {
    script: string;
    voice: string;
    image: string;
    video: string;
  };
  dbRows: {
    cloneVideoId: string | null;
    polloGenerationId: number | null;
    mediaAssetId: string | null;
  };
  errors: string[];
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function insertCloneVideo(params: {
  jobId: string;
  userId: number;
  vertical: ContentVertical;
  topic: string;
  scriptText: string;
  audioUrl: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number;
  renderProvider: string;
  renderStatus: "pending" | "rendering" | "ready" | "failed";
}): Promise<void> {
  const db = getDb();
  await db.execute(
    `INSERT INTO kingcam_clone_videos
       (id, user_id, context, title, script, style, video_url, audio_url,
        thumbnail_url, duration_seconds, render_status, render_provider, is_active)
     VALUES (?, ?, ?, ?, ?, 'studio', ?, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       video_url = VALUES(video_url),
       audio_url = VALUES(audio_url),
       thumbnail_url = VALUES(thumbnail_url),
       render_status = VALUES(render_status),
       updated_at = CURRENT_TIMESTAMP`,
    [
      params.jobId,
      params.userId,
      params.vertical,
      params.topic.slice(0, 200),
      params.scriptText,
      params.videoUrl,
      params.audioUrl,
      params.thumbnailUrl,
      params.durationSeconds,
      params.renderStatus,
      params.renderProvider,
    ]
  );
}

async function insertMediaAsset(params: {
  userId: number;
  assetType: "video" | "image" | "audio";
  fileName: string;
  publicUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  feature: string;
}): Promise<string> {
  const db = getDb();
  const assetId = randomUUID();
  await db.execute(
    `INSERT INTO media_assets
       (id, user_id, source_type, asset_type, file_name, original_name,
        mime_type, storage_path, public_url, thumbnail_url, duration,
        status, created_by_feature)
     VALUES (?, ?, 'generated', ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?)`,
    [
      assetId,
      params.userId,
      params.assetType,
      params.fileName,
      params.fileName,
      params.assetType === "video" ? "video/mp4" : params.assetType === "audio" ? "audio/mpeg" : "image/webp",
      params.publicUrl,
      params.publicUrl,
      params.thumbnailUrl,
      params.duration,
      params.feature,
    ]
  );
  return assetId;
}

// ─── MAIN FACTORY FUNCTION ────────────────────────────────────────────────────

/**
 * Run the full KingCam Media Factory pipeline.
 *
 * FAST:  script → image → DB row
 * BOOST: script → voice → image → 5s video → DB rows
 * FULL:  script → voice → image → 10s video → DB rows + media_assets
 */
export async function runKingCamFactory(
  options: FactoryOptions
): Promise<FactoryResult> {
  const {
    topic,
    vertical = "clone_lab",
    mode = "BOOST",
    userId,
    suitColor,
    aspectRatio = "16:9",
    videoModel = "kling-3.0",
    referenceImageUrl,
    targetDuration = 60,
  } = options;

  const jobId = randomUUID();
  const errors: string[] = [];
  const result: FactoryResult = {
    jobId,
    status: "partial",
    scriptText: "",
    audioUrl: null,
    imageUrl: null,
    videoUrl: null,
    thumbnailUrl: null,
    duration: 0,
    provider: {
      script: "openai/gpt-4.1-mini",
      voice: "elevenlabs/KingCam",
      image: "replicate/fluxdevcam",
      video: `pollo/${videoModel}`,
    },
    dbRows: {
      cloneVideoId: null,
      polloGenerationId: null,
      mediaAssetId: null,
    },
    errors,
  };

  console.log(`[KingCamFactory] Starting ${mode} job ${jobId} — "${topic}"`);

  // ─── STEP 1: SCRIPT ───────────────────────────────────────────────────────
  try {
    const sector = vertical === "dominican" ? "dominican"
      : vertical === "adult" ? "adult"
      : "general";

    const script = await generateKingCamScript({
      topic,
      sector,
      targetDuration: mode === "FAST" ? 30 : targetDuration,
      sceneCount: mode === "FAST" ? 2 : 4,
    });

    result.scriptText = script.fullText;
    result.duration = script.totalDuration;
    console.log(`[KingCamFactory] Script generated (${script.fullText.length} chars)`);
  } catch (err: any) {
    errors.push(`Script generation failed: ${err.message}`);
    result.status = "failed";
    return result;
  }

  // ─── STEP 2: VOICE (BOOST + FULL only) ───────────────────────────────────
  if (mode !== "FAST") {
    try {
      const ttsResult = await generateSpeech(result.scriptText, {
        ...KINGCAM_VOICE_PROFILE,
        language: vertical === "dominican" ? "es-DO" : "en",
      });
      result.audioUrl = ttsResult.audioUrl;
      result.provider.voice = `${ttsResult.provider}/${ttsResult.voiceId ?? "forge"}`;
      console.log(`[KingCamFactory] Voice generated via ${ttsResult.provider}: ${ttsResult.audioUrl}`);
    } catch (err: any) {
      errors.push(`Voice generation failed: ${err.message}`);
      // Non-fatal — continue without audio
    }
  }

  // ─── STEP 3: IMAGE ────────────────────────────────────────────────────────
  try {
    const imageResult = await generateKingCamImage({
      prompt: `KingCam speaking directly to camera about: ${topic}`,
      injectDNA: true,
      suitColor: suitColor ?? "midnight black with gold accents",
      styleLevel: mode === "FAST" ? "social" : "editorial",
      aspectRatio,
      referenceImageUrl,
      vertical,
    });
    result.imageUrl = imageResult.url;
    result.provider.image = `${imageResult.provider}/${imageResult.model}`;
    console.log(`[KingCamFactory] Image generated: ${imageResult.url}`);
  } catch (err: any) {
    errors.push(`Image generation failed: ${err.message}`);
    result.status = "failed";
    return result;
  }

  // ─── STEP 4: VIDEO (BOOST + FULL only) ───────────────────────────────────
  if (mode !== "FAST" && result.imageUrl) {
    try {
      const videoDuration = mode === "FULL" ? 10 : 5;
      const videoResult = await generateKingCamVideo({
        prompt: `KingCam speaking confidently about: ${topic}. Smooth natural motion, direct eye contact, authoritative presence.`,
        model: videoModel,
        injectDNA: true,
        imageUrl: result.imageUrl,
        aspectRatio,
        duration: videoDuration,
        mode: "pro",
        vertical,
      });
      result.videoUrl = videoResult.url;
      result.thumbnailUrl = result.imageUrl; // Use generated image as thumbnail
      result.provider.video = `${videoResult.provider}/${videoResult.model}`;
      console.log(`[KingCamFactory] Video generated: ${videoResult.url}`);
    } catch (err: any) {
      errors.push(`Video generation failed: ${err.message}`);
      // Non-fatal — image-only result is still usable
    }
  }

  // ─── STEP 5: WRITE DB ROWS ────────────────────────────────────────────────
  try {
    const renderStatus = result.videoUrl ? "ready"
      : result.imageUrl ? "ready"
      : "failed";

    const renderProvider = result.videoUrl
      ? `pollo/${videoModel}`
      : result.imageUrl
      ? "replicate/fluxdevcam"
      : "failed";

    await insertCloneVideo({
      jobId,
      userId,
      vertical,
      topic,
      scriptText: result.scriptText,
      audioUrl: result.audioUrl,
      imageUrl: result.imageUrl,
      videoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
      durationSeconds: result.duration,
      renderStatus,
      renderProvider,
    });
    result.dbRows.cloneVideoId = jobId;
    console.log(`[KingCamFactory] kingcam_clone_videos row created: ${jobId}`);
  } catch (err: any) {
    errors.push(`DB write (clone_videos) failed: ${err.message}`);
  }

  // ─── STEP 6: MEDIA ASSET (FULL mode only) ────────────────────────────────
  if (mode === "FULL" && result.videoUrl) {
    try {
      const assetId = await insertMediaAsset({
        userId,
        assetType: "video",
        fileName: `kingcam_${jobId}.mp4`,
        publicUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
        duration: result.duration,
        feature: "kingcam_factory",
      });
      result.dbRows.mediaAssetId = assetId;
      console.log(`[KingCamFactory] media_assets row created: ${assetId}`);
    } catch (err: any) {
      errors.push(`DB write (media_assets) failed: ${err.message}`);
    }
  }

  // ─── FINALIZE ─────────────────────────────────────────────────────────────
  result.status = errors.length === 0 ? "complete"
    : (result.imageUrl || result.videoUrl) ? "partial"
    : "failed";

  console.log(`[KingCamFactory] Job ${jobId} finished — status: ${result.status}, errors: ${errors.length}`);
  return result;
}

/**
 * Quick FAST mode wrapper — generates image + script only (no video, no voice).
 * Used by the Daily Drop Engine for rapid Telegram channel posts.
 */
export async function runFastDrop(params: {
  topic: string;
  userId: number;
  vertical?: ContentVertical;
}): Promise<FactoryResult> {
  return runKingCamFactory({
    ...params,
    mode: "FAST",
    aspectRatio: "16:9",
  });
}

/**
 * BOOST mode wrapper — image + 5s video + voice.
 * Used for Telegram VIP drops and social posts.
 */
export async function runBoostDrop(params: {
  topic: string;
  userId: number;
  vertical?: ContentVertical;
  suitColor?: string;
}): Promise<FactoryResult> {
  return runKingCamFactory({
    ...params,
    mode: "BOOST",
    aspectRatio: "9:16",
    videoModel: "kling-3.0",
  });
}

/**
 * FULL mode wrapper — complete pipeline for high-value content.
 * Used for Clone Studio, course content, and premium drops.
 */
export async function runFullProduction(params: {
  topic: string;
  userId: number;
  vertical?: ContentVertical;
  suitColor?: string;
  referenceImageUrl?: string;
  targetDuration?: number;
}): Promise<FactoryResult> {
  return runKingCamFactory({
    ...params,
    mode: "FULL",
    aspectRatio: "16:9",
    videoModel: "kling-3.0",
  });
}
