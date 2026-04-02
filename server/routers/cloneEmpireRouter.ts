/**
 * ============================================================================
 * CLONE EMPIRE ROUTER — /king/clone-empire
 * The most thorough AI clone vertical on the market.
 *
 * Features:
 *   1. trainClone        — Bulk upload images/videos → Replicate Flux LoRA retraining
 *   2. getTrainingStatus — Poll Replicate training job
 *   3. generateFullBodyVideo — Pollo.ai Kling O1 full-body motion video from reference image
 *   4. generateTalkingHead   — SadTalker talking-head (existing, upgraded)
 *   5. generateScript        — GPT-4 script for any format/tone
 *   6. generateVoiceClone    — Kokoro TTS with KingCam voice settings
 *   7. scheduleContent       — Auto-schedule clone content to DB queue
 *   8. listCloneContent      — All generated content with stats
 *   9. getCloneStats         — Revenue, views, engagement per clone
 *  10. updateCloneProfile    — Update KingCam clone profile settings
 * ============================================================================
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";
import mysql from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";

// ─── DB ───────────────────────────────────────────────────────────────────────
async function getDb() {
  const url = process.env.DATABASE_URL || "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error("Invalid DATABASE_URL");
  const [, user, password, host, port, database] = m;
  return mysql.createConnection({ host, port: parseInt(port), user, password, database });
}

// ─── Owner Guard ──────────────────────────────────────────────────────────────
function ownerGuard(userId: number) {
  if (userId !== 6 && userId !== 33) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner only" });
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const POLLO_API_KEY = process.env.POLLO_API_KEY || "";
const OPENAI_KEY = process.env.BUILT_IN_FORGE_API_KEY || process.env.OPENAI_API_KEY || "";
const OPENAI_BASE = (process.env.BUILT_IN_FORGE_API_URL || "https://api.openai.com/v1").replace(/\/v1\/?$/, "");

// KingCam visual DNA reference image
const KINGCAM_REFERENCE_IMAGE = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663103936327/FIzIdCOGWZnLnrtB.jpg";

// Replicate model IDs
const FLUX_TRAINER_VERSION = "26dce37af90b9d997eeb970d92e47de3064d46c300504ae376c75bef6a9022d2";
const KOKORO_VERSION = "f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13";
const SADTALKER_VERSION = "a519cc0cfebaaeade068b23899165a11ec76aaa1d2b313d40d214f204ec957a3";

// KingCam DNA prompt injection
const KINGCAM_DNA_PROMPT = "fluxdevCam, royal velvet suit with diamond trim, gold crown, gold chains, aviator sunglasses, confident royal pose, cinematic lighting, ultra high quality";

// ─── LLM Helper ──────────────────────────────────────────────────────────────
async function invokeLLM(prompt: string, maxTokens = 1000): Promise<string> {
  const resp = await fetch(`${OPENAI_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85,
      max_tokens: maxTokens,
    }),
  });
  const data = await resp.json() as any;
  if (!data.choices?.[0]?.message?.content) throw new Error("LLM returned no content");
  return data.choices[0].message.content.trim();
}

// ─── Replicate Helpers ────────────────────────────────────────────────────────
async function replicatePost(endpoint: string, body: object): Promise<any> {
  const resp = await fetch(`https://api.replicate.com/v1/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Token ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Replicate ${endpoint} error: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

async function replicatePoll(predictionId: string, maxWaitMs = 300000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 5000));
    const resp = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
    });
    const data = await resp.json() as any;
    if (data.status === "succeeded") return data;
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(`Replicate prediction ${data.status}: ${data.error || "unknown"}`);
    }
  }
  throw new Error("Replicate prediction timed out");
}

// ─── Pollo.ai Helpers ─────────────────────────────────────────────────────────
async function polloSubmit(model: string, input: object): Promise<string> {
  const resp = await fetch(`https://pollo.ai/api/platform/generation/${model}`, {
    method: "POST",
    headers: { "x-api-key": POLLO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  if (!resp.ok) throw new Error(`Pollo submit error: ${resp.status} ${await resp.text()}`);
  const data = await resp.json() as any;
  if (!data.taskId) throw new Error("Pollo returned no taskId: " + JSON.stringify(data));
  return data.taskId;
}

async function polloPoll(taskId: string, maxWaitMs = 300000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 5000));
    const resp = await fetch(`https://pollo.ai/api/platform/generation/${taskId}/status`, {
      headers: { "x-api-key": POLLO_API_KEY },
    });
    if (!resp.ok) continue;
    const data = await resp.json() as any;
    const gen = data.generations?.[0];
    if (!gen) continue;
    if (gen.status === "succeed" && gen.url) return gen.url;
    if (gen.status === "failed") throw new Error("Pollo generation failed: " + (gen.failMsg || "unknown"));
  }
  throw new Error("Pollo generation timed out");
}

// ─── Kokoro TTS ───────────────────────────────────────────────────────────────
async function generateKokoroAudio(text: string, voice = "am_adam"): Promise<string> {
  const safeText = text.substring(0, 480);
  const data = await replicatePost("predictions", {
    version: KOKORO_VERSION,
    input: { text: safeText, voice, speed: 1.0 },
  });
  const result = await replicatePoll(data.id);
  const output = result.output;
  if (typeof output === "string") return output;
  if (Array.isArray(output) && output.length > 0) return output[0];
  throw new Error("Kokoro returned no audio URL");
}

// ─── SadTalker ────────────────────────────────────────────────────────────────
async function generateSadTalkerVideo(audioUrl: string, imageUrl = KINGCAM_REFERENCE_IMAGE): Promise<string> {
  const data = await replicatePost("predictions", {
    version: SADTALKER_VERSION,
    input: {
      source_image: imageUrl,
      driven_audio: audioUrl,
      preprocess: "full",
      still_mode: false,
      use_enhancer: true,
      batch_size: 2,
      size: 256,
      pose_style: 0,
      expression_scale: 1.0,
    },
  });
  const result = await replicatePoll(data.id, 300000);
  const output = result.output;
  if (typeof output === "string") return output;
  if (Array.isArray(output) && output.length > 0) return output[0];
  throw new Error("SadTalker returned no video URL");
}

// ─── DB Schema Helpers ────────────────────────────────────────────────────────
async function ensureCloneEmpireTables(conn: mysql.Connection) {
  // Clone training jobs table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS clone_training_jobs (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      user_id INT NOT NULL,
      job_name VARCHAR(200) NOT NULL,
      status ENUM('pending','training','succeeded','failed') NOT NULL DEFAULT 'pending',
      replicate_training_id VARCHAR(200),
      image_count INT NOT NULL DEFAULT 0,
      zip_url TEXT,
      model_version VARCHAR(200),
      trigger_word VARCHAR(100) DEFAULT 'fluxdevCam',
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_status (status)
    )
  `);

  // Clone content schedule table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS clone_content_schedule (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      user_id INT NOT NULL,
      clone_video_id VARCHAR(36),
      title VARCHAR(200) NOT NULL,
      content_type ENUM('talking_head','full_body','audio_only','image') NOT NULL DEFAULT 'talking_head',
      platform ENUM('instagram','tiktok','youtube','twitter','all') NOT NULL DEFAULT 'all',
      scheduled_for TIMESTAMP,
      status ENUM('draft','scheduled','published','failed') NOT NULL DEFAULT 'draft',
      video_url TEXT,
      audio_url TEXT,
      thumbnail_url TEXT,
      script_text TEXT,
      views INT DEFAULT 0,
      engagement_rate FLOAT DEFAULT 0,
      revenue_generated DECIMAL(10,2) DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_status (status),
      INDEX idx_scheduled_for (scheduled_for)
    )
  `);

  // Clone monetization table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS clone_monetization (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      user_id INT NOT NULL,
      content_id VARCHAR(36),
      revenue_type ENUM('ad_revenue','subscription','licensing','tip','pay_per_view') NOT NULL,
      amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      platform VARCHAR(100),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_revenue_type (revenue_type)
    )
  `);
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const cloneEmpireRouter = router({

  /**
   * trainClone
   * Takes a zip URL of training images and kicks off a Replicate Flux LoRA retraining job.
   * The zip should contain 20-100 high quality images of the creator.
   */
  trainClone: protectedProcedure
    .input(z.object({
      jobName: z.string().min(1).max(200),
      zipUrl: z.string().url("Must be a valid URL to a zip file of training images"),
      imageCount: z.number().int().min(5).max(500).default(20),
      triggerWord: z.string().default("fluxdevCam"),
      steps: z.number().int().min(100).max(4000).default(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      ownerGuard((ctx.user as any).id);
      const userId = (ctx.user as any).id;
      const conn = await getDb();
      try {
        await ensureCloneEmpireTables(conn);
        const jobId = uuidv4();

        // Submit training to Replicate
        const trainingResp = await fetch("https://api.replicate.com/v1/models/kingcam214/fluxdevcam/versions", {
          method: "GET",
          headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
        });

        // Start a new training run using ostris/flux-dev-lora-trainer
        const trainResp = await fetch("https://api.replicate.com/v1/trainings", {
          method: "POST",
          headers: { Authorization: `Token ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            version: FLUX_TRAINER_VERSION,
            input: {
              input_images: input.zipUrl,
              steps: input.steps,
              lora_rank: 16,
              optimizer: "adamw8bit",
              batch_size: 1,
              resolution: "512,768,1024",
              autocaption: true,
              trigger_word: input.triggerWord,
              learning_rate: 0.0004,
            },
            destination: `kingcam214/fluxdevcam`,
          }),
        });

        if (!trainResp.ok) {
          const errText = await trainResp.text();
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Replicate training error: ${trainResp.status} ${errText}` });
        }

        const trainData = await trainResp.json() as any;
        const replicateTrainingId = trainData.id;

        // Save to DB
        await conn.execute(
          `INSERT INTO clone_training_jobs (id, user_id, job_name, status, replicate_training_id, image_count, zip_url, trigger_word)
           VALUES (?, ?, ?, 'training', ?, ?, ?, ?)`,
          [jobId, userId, input.jobName, replicateTrainingId, input.imageCount, input.zipUrl, input.triggerWord]
        );

        return {
          success: true,
          jobId,
          replicateTrainingId,
          status: "training",
          message: `Training job started. Your model will be updated at kingcam214/fluxdevcam when complete.`,
        };
      } finally {
        await conn.end();
      }
    }),

  /**
   * getTrainingStatus
   * Poll the status of a Replicate training job.
   */
  getTrainingStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      ownerGuard((ctx.user as any).id);
      const conn = await getDb();
      try {
        await ensureCloneEmpireTables(conn);
        const [rows] = await conn.execute(
          "SELECT * FROM clone_training_jobs WHERE id = ?",
          [input.jobId]
        ) as any;
        if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Training job not found" });
        const job = rows[0];

        // Poll Replicate if still training
        if (job.status === "training" && job.replicate_training_id) {
          const resp = await fetch(`https://api.replicate.com/v1/trainings/${job.replicate_training_id}`, {
            headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
          });
          if (resp.ok) {
            const data = await resp.json() as any;
            let newStatus = job.status;
            let modelVersion = job.model_version;

            if (data.status === "succeeded") {
              newStatus = "succeeded";
              modelVersion = data.output?.version || null;
            } else if (data.status === "failed" || data.status === "canceled") {
              newStatus = "failed";
            }

            if (newStatus !== job.status) {
              await conn.execute(
                "UPDATE clone_training_jobs SET status=?, model_version=?, updated_at=NOW() WHERE id=?",
                [newStatus, modelVersion, input.jobId]
              );
              job.status = newStatus;
              job.model_version = modelVersion;
            }

            return {
              ...job,
              replicate_status: data.status,
              replicate_logs: data.logs?.slice(-500) || null,
              progress_pct: data.status === "succeeded" ? 100 : (data.status === "processing" ? 50 : 10),
            };
          }
        }

        return { ...job, replicate_status: job.status, progress_pct: job.status === "succeeded" ? 100 : 0 };
      } finally {
        await conn.end();
      }
    }),

  /**
   * listTrainingJobs
   * List all training jobs for the owner.
   */
  listTrainingJobs: protectedProcedure
    .query(async ({ ctx }) => {
      ownerGuard((ctx.user as any).id);
      const conn = await getDb();
      try {
        await ensureCloneEmpireTables(conn);
        const [rows] = await conn.execute(
          "SELECT * FROM clone_training_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
          [(ctx.user as any).id]
        ) as any;
        return rows;
      } finally {
        await conn.end();
      }
    }),

  /**
   * generateFullBodyVideo
   * Uses Pollo.ai Kling O1 to generate a full-body motion video from the KingCam reference image.
   * This is the full-body standing/walking/gesturing video mode.
   */
  generateFullBodyVideo: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1).max(500),
      referenceImageUrl: z.string().url().optional(),
      aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("9:16"),
      duration: z.number().int().min(5).max(10).default(5),
      mode: z.enum(["pro", "standard"]).default("pro"),
      title: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      ownerGuard((ctx.user as any).id);
      const userId = (ctx.user as any).id;
      const conn = await getDb();
      try {
        await ensureCloneEmpireTables(conn);
        const contentId = uuidv4();
        const imageUrl = input.referenceImageUrl || KINGCAM_REFERENCE_IMAGE;

        // Inject KingCam DNA into prompt
        const enhancedPrompt = `${input.prompt}, ${KINGCAM_DNA_PROMPT}, full body shot, cinematic motion`;

        // Save as pending
        await conn.execute(
          `INSERT INTO clone_content_schedule (id, user_id, title, content_type, status, script_text)
           VALUES (?, ?, ?, 'full_body', 'draft', ?)`,
          [contentId, userId, input.title || input.prompt.substring(0, 100), input.prompt]
        );

        // Submit to Pollo Kling O1
        let taskId: string;
        try {
          taskId = await polloSubmit("kling-ai/kling-video-o1", {
            images: [imageUrl],
            prompt: enhancedPrompt,
            aspectRatio: input.aspectRatio,
            length: input.duration,
            mode: input.mode,
          });
        } catch (err: any) {
          await conn.execute(
            "UPDATE clone_content_schedule SET status='failed' WHERE id=?",
            [contentId]
          );
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Pollo submit failed: " + err.message });
        }

        // Poll for result
        let videoUrl: string;
        try {
          videoUrl = await polloPoll(taskId);
        } catch (err: any) {
          await conn.execute(
            "UPDATE clone_content_schedule SET status='failed' WHERE id=?",
            [contentId]
          );
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Pollo poll failed: " + err.message });
        }

        // Save result
        await conn.execute(
          "UPDATE clone_content_schedule SET status='published', video_url=?, updated_at=NOW() WHERE id=?",
          [videoUrl, contentId]
        );

        // Also save to kingcam_clone_videos for unified gallery
        const cloneVideoId = uuidv4();
        await conn.execute(
          `INSERT INTO kingcam_clone_videos 
           (id, user_id, context, title, script, style, video_url, render_status, render_provider, is_active)
           VALUES (?, ?, 'full_body', ?, ?, 'studio', ?, 'ready', 'pollo_kling', 1)`,
          [cloneVideoId, userId, input.title || "Full Body Video", input.prompt, videoUrl]
        );

        return {
          success: true,
          contentId,
          cloneVideoId,
          videoUrl,
          taskId,
          prompt: enhancedPrompt,
        };
      } finally {
        await conn.end();
      }
    }),

  /**
   * generateTalkingHeadWithScript
   * Full pipeline: script → Kokoro TTS → SadTalker talking-head video.
   * Upgraded version with more voice options and better error handling.
   */
  generateTalkingHeadWithScript: protectedProcedure
    .input(z.object({
      topic: z.string().min(1).max(500),
      format: z.enum(["short_clip_15s", "course_lesson", "greatest_show_segment", "ad_30s", "dm_personal_video", "announcement", "motivation"]).default("short_clip_15s"),
      voice: z.string().default("am_adam"),
      style: z.enum(["studio", "street", "course", "sales"]).default("studio"),
      customScript: z.string().optional(),
      referenceImageUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      ownerGuard((ctx.user as any).id);
      const userId = (ctx.user as any).id;
      const conn = await getDb();
      try {
        const cloneId = uuidv4();
        const imageUrl = input.referenceImageUrl || KINGCAM_REFERENCE_IMAGE;

        // Generate script if not provided
        let scriptText = input.customScript;
        if (!scriptText) {
          const formatGuide: Record<string, string> = {
            short_clip_15s: "15-second punchy clip (max 40 words)",
            course_lesson: "2-minute educational lesson (max 300 words)",
            greatest_show_segment: "60-second entertainment segment (max 150 words)",
            ad_30s: "30-second ad (max 75 words)",
            dm_personal_video: "personal direct message video (max 60 words)",
            announcement: "exciting announcement (max 100 words)",
            motivation: "motivational message (max 100 words)",
          };
          scriptText = await invokeLLM(
            `You are KingCam, a confident creator and entrepreneur. Write a ${formatGuide[input.format] || "short video script"} about: ${input.topic}.
Style: ${input.style}. 
Start with: "Yo, it's KingCam."
End with: "That's how you build an empire. See you in the Vault."
Return ONLY the script text, no labels or formatting.`
          );
        }

        // Save to DB as pending
        await conn.execute(
          `INSERT INTO kingcam_clone_videos (id, user_id, context, title, script, style, render_status, render_provider, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 'rendering', 'kokoro_sadtalker', 1)`,
          [cloneId, userId, input.format, input.topic.substring(0, 200), scriptText, input.style]
        );

        // Stage 1: Kokoro TTS
        let audioUrl: string;
        try {
          audioUrl = await generateKokoroAudio(scriptText, input.voice);
        } catch (err: any) {
          await conn.execute(
            "UPDATE kingcam_clone_videos SET render_status='failed', render_error=? WHERE id=?",
            ["TTS: " + err.message, cloneId]
          );
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Voice generation failed: " + err.message });
        }

        await conn.execute(
          "UPDATE kingcam_clone_videos SET audio_url=?, updated_at=NOW() WHERE id=?",
          [audioUrl, cloneId]
        );

        // Stage 2: SadTalker video
        let videoUrl: string;
        try {
          videoUrl = await generateSadTalkerVideo(audioUrl, imageUrl);
        } catch (err: any) {
          await conn.execute(
            "UPDATE kingcam_clone_videos SET render_status='failed', render_error=? WHERE id=?",
            ["SadTalker: " + err.message, cloneId]
          );
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Video render failed: " + err.message });
        }

        // Stage 3: Generate thumbnail using fluxdevcam
        let thumbnailUrl: string | null = null;
        try {
          const thumbData = await replicatePost("predictions", {
            version: "6f76a5fb9645488a56e2fdd36a9f213fc08b5aee638d9aa46253b6cd17c3bcff",
            input: {
              prompt: `fluxdevCam, ${input.topic}, royal velvet suit, gold crown, cinematic thumbnail, professional photography`,
              aspect_ratio: "16:9",
              output_format: "jpg",
              output_quality: 90,
            },
          });
          const thumbResult = await replicatePoll(thumbData.id, 120000);
          const thumbOutput = thumbResult.output;
          thumbnailUrl = typeof thumbOutput === "string" ? thumbOutput : (Array.isArray(thumbOutput) ? thumbOutput[0] : null);
        } catch {
          // Thumbnail is optional — don't fail the whole job
        }

        // Save final result
        await conn.execute(
          `UPDATE kingcam_clone_videos 
           SET video_url=?, thumbnail_url=?, render_status='ready', updated_at=NOW()
           WHERE id=?`,
          [videoUrl, thumbnailUrl, cloneId]
        );

        return {
          success: true,
          cloneId,
          scriptText,
          audioUrl,
          videoUrl,
          thumbnailUrl,
          status: "ready",
        };
      } finally {
        await conn.end();
      }
    }),

  /**
   * generateCloneImage
   * Generate a KingCam clone image using fluxdevcam with DNA injection.
   * Supports color variants, different poses, and custom prompts.
   */
  generateCloneImage: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1).max(500),
      colorVariant: z.enum(["crimson_red", "midnight_blue", "emerald_green", "royal_purple", "champagne_gold", "jet_black", "arctic_white", "burnt_orange", "custom"]).default("crimson_red"),
      aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).default("1:1"),
      outputFormat: z.enum(["jpg", "png", "webp"]).default("jpg"),
    }))
    .mutation(async ({ ctx, input }) => {
      ownerGuard((ctx.user as any).id);

      const colorMap: Record<string, string> = {
        crimson_red: "deep crimson red velvet suit",
        midnight_blue: "midnight blue velvet suit",
        emerald_green: "emerald green velvet suit",
        royal_purple: "royal purple velvet suit",
        champagne_gold: "champagne gold velvet suit",
        jet_black: "jet black velvet suit",
        arctic_white: "arctic white velvet suit",
        burnt_orange: "burnt orange velvet suit",
        custom: "",
      };

      const colorDesc = colorMap[input.colorVariant] || "";
      const fullPrompt = `fluxdevCam, ${colorDesc ? colorDesc + ", " : ""}${input.prompt}, gold crown, gold chains, diamond trim, aviator sunglasses, cinematic lighting, ultra high quality, professional photography`;

      const data = await replicatePost("predictions", {
        version: "6f76a5fb9645488a56e2fdd36a9f213fc08b5aee638d9aa46253b6cd17c3bcff",
        input: {
          prompt: fullPrompt,
          aspect_ratio: input.aspectRatio,
          output_format: input.outputFormat,
          output_quality: 95,
          num_inference_steps: 28,
        },
      });

      const result = await replicatePoll(data.id, 120000);
      const output = result.output;
      const imageUrl = typeof output === "string" ? output : (Array.isArray(output) ? output[0] : null);
      if (!imageUrl) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Image generation returned no URL" });

      return { success: true, imageUrl, prompt: fullPrompt, colorVariant: input.colorVariant };
    }),

  /**
   * scheduleContent
   * Schedule a clone video for auto-posting to a platform.
   */
  scheduleContent: protectedProcedure
    .input(z.object({
      cloneVideoId: z.string(),
      platform: z.enum(["instagram", "tiktok", "youtube", "twitter", "all"]),
      scheduledFor: z.string().datetime(),
      title: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      ownerGuard((ctx.user as any).id);
      const userId = (ctx.user as any).id;
      const conn = await getDb();
      try {
        await ensureCloneEmpireTables(conn);

        // Get the clone video
        const [rows] = await conn.execute(
          "SELECT * FROM kingcam_clone_videos WHERE id = ? AND is_active = 1",
          [input.cloneVideoId]
        ) as any;
        if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Clone video not found" });
        const video = rows[0];

        const scheduleId = uuidv4();
        await conn.execute(
          `INSERT INTO clone_content_schedule 
           (id, user_id, clone_video_id, title, content_type, platform, scheduled_for, status, video_url, audio_url, thumbnail_url, script_text)
           VALUES (?, ?, ?, ?, 'talking_head', ?, ?, 'scheduled', ?, ?, ?, ?)`,
          [scheduleId, userId, input.cloneVideoId, input.title || video.title, input.platform, input.scheduledFor, video.video_url, video.audio_url, video.thumbnail_url, video.script]
        );

        return { success: true, scheduleId, platform: input.platform, scheduledFor: input.scheduledFor };
      } finally {
        await conn.end();
      }
    }),

  /**
   * listCloneContent
   * All generated clone content with stats.
   */
  listCloneContent: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
      contentType: z.enum(["all", "talking_head", "full_body", "audio_only", "image"]).default("all"),
    }))
    .query(async ({ ctx, input }) => {
      ownerGuard((ctx.user as any).id);
      const conn = await getDb();
      try {
        await ensureCloneEmpireTables(conn);
        const whereClause = input.contentType !== "all"
          ? `WHERE user_id = ? AND content_type = '${input.contentType}'`
          : "WHERE user_id = ?";
        const [rows] = await conn.execute(
          `SELECT * FROM clone_content_schedule ${whereClause} ORDER BY created_at DESC LIMIT ${input.limit} OFFSET ${input.offset}`,
          [(ctx.user as any).id]
        ) as any;
        const [countRows] = await conn.execute(
          `SELECT COUNT(*) as total FROM clone_content_schedule ${whereClause}`,
          [(ctx.user as any).id]
        ) as any;
        return { items: rows, total: countRows[0].total };
      } finally {
        await conn.end();
      }
    }),

  /**
   * getCloneStats
   * Revenue, views, engagement stats for the clone empire.
   */
  getCloneStats: protectedProcedure
    .query(async ({ ctx }) => {
      ownerGuard((ctx.user as any).id);
      const userId = (ctx.user as any).id;
      const conn = await getDb();
      try {
        await ensureCloneEmpireTables(conn);

        // Clone video stats
        const [videoStats] = await conn.execute(
          `SELECT 
            COUNT(*) as total_videos,
            SUM(CASE WHEN render_status = 'ready' THEN 1 ELSE 0 END) as ready_videos,
            SUM(CASE WHEN render_status = 'rendering' THEN 1 ELSE 0 END) as rendering_videos,
            SUM(CASE WHEN render_status = 'failed' THEN 1 ELSE 0 END) as failed_videos
           FROM kingcam_clone_videos WHERE user_id = ? AND is_active = 1`,
          [userId]
        ) as any;

        // Training stats
        const [trainingStats] = await conn.execute(
          `SELECT COUNT(*) as total_trainings, 
            SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END) as successful_trainings,
            MAX(created_at) as last_training
           FROM clone_training_jobs WHERE user_id = ?`,
          [userId]
        ) as any;

        // Content schedule stats
        const [scheduleStats] = await conn.execute(
          `SELECT 
            COUNT(*) as total_scheduled,
            SUM(views) as total_views,
            AVG(engagement_rate) as avg_engagement,
            SUM(revenue_generated) as total_revenue
           FROM clone_content_schedule WHERE user_id = ?`,
          [userId]
        ) as any;

        // Monetization stats
        const [monetizationStats] = await conn.execute(
          `SELECT 
            SUM(amount) as total_earnings,
            COUNT(*) as total_transactions,
            source,
            SUM(amount) as type_total
           FROM clone_monetization WHERE user_id = ?
           GROUP BY source`,
          [userId]
        ) as any;

        return {
          videos: videoStats[0],
          training: trainingStats[0],
          content: scheduleStats[0],
          monetization: monetizationStats,
          currentModel: {
            name: "kingcam214/fluxdevcam",
            version: "6f76a5fb9645488a56e2fdd36a9f213fc08b5aee638d9aa46253b6cd17c3bcff",
            triggerWord: "fluxdevCam",
          },
        };
      } finally {
        await conn.end();
      }
    }),

  /**
   * updateCloneProfile
   * Update the KingCam clone profile settings.
   */
  updateCloneProfile: protectedProcedure
    .input(z.object({
      speakingStyle: z.string().optional(),
      toneGuidelines: z.string().optional(),
      signatureIntro: z.string().optional(),
      signatureOutro: z.string().optional(),
      keyPhrases: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      ownerGuard((ctx.user as any).id);
      const conn = await getDb();
      try {
        const updates: string[] = [];
        const values: any[] = [];
        if (input.speakingStyle) { updates.push("speaking_style = ?"); values.push(input.speakingStyle); }
        if (input.toneGuidelines) { updates.push("tone_guidelines = ?"); values.push(input.toneGuidelines); }
        if (input.signatureIntro) { updates.push("signature_intro = ?"); values.push(input.signatureIntro); }
        if (input.signatureOutro) { updates.push("signature_outro = ?"); values.push(input.signatureOutro); }
        if (input.keyPhrases) { updates.push("key_phrases = ?"); values.push(JSON.stringify(input.keyPhrases)); }

        if (updates.length > 0) {
          values.push(1); // profile id is always 1
          await conn.execute(
            `UPDATE kingcam_clone_profile SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`,
            values
          );
        }

        const [rows] = await conn.execute("SELECT * FROM kingcam_clone_profile WHERE id = 1") as any;
        return { success: true, profile: rows[0] || null };
      } finally {
        await conn.end();
      }
    }),

  /**
   * getCloneProfile
   * Get the current KingCam clone profile.
   */
  getCloneProfile: protectedProcedure
    .query(async ({ ctx }) => {
      ownerGuard((ctx.user as any).id);
      const conn = await getDb();
      try {
        const [rows] = await conn.execute("SELECT * FROM kingcam_clone_profile WHERE id = 1") as any;
        return rows[0] || null;
      } finally {
        await conn.end();
      }
    }),
});
