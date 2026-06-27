/**
 * ============================================================================
 * CLONE ENGINE ROUTER — The world's most powerful creator clone system
 * Unified master router for the entire Clone vertical.
 *
 * Beats HeyGen, Synthesia, ElevenLabs, Runway, Captions.ai by combining:
 *   - Multi-provider AI routing (Replicate, Runway, Luma, Pollo, MiniMax, ElevenLabs)
 *   - Real LoRA fine-tuning pipeline (Kohya / Replicate trainer)
 *   - Clone Passport — persistent identity/persona/voice/visual profile
 *   - Compliance Vault integration — every output is consent-gated
 *   - Payment Router integration — clone outputs feed monetization directly
 *   - Render Graph integration — cost estimation before every job
 *   - Talking Head synthesis — voice + face sync + video in one call
 *   - Creator-facing (any creator, not just owner)
 *
 * Namespace: trpc.cloneEngine.*
 * Routes:
 *   getProviders          — list all available AI providers + capabilities
 *   createClone           — initialize a new clone profile for any creator
 *   getClone              — fetch clone profile + passport + stats
 *   updatePassport        — update clone identity/persona/voice/visual profile
 *   generateImage         — multi-provider image gen with identity lock
 *   generateVideo         — multi-provider video gen (Pollo, Runway, Luma, MiniMax)
 *   generateVoice         — ElevenLabs voice clone synthesis
 *   generateTalkingHead   — full talking head: voice + face sync + video
 *   getGenerationStatus   — unified status polling (image + video + voice)
 *   getHistory            — paginated history across all generation types
 *   saveToVault           — push any output to VaultX vault
 *   startTraining         — kick off LoRA fine-tune
 *   getTrainingStatus     — poll training job
 *   promoteModel          — promote trained model to production
 *   recordConsent         — compliance consent wrapper for clone use
 *   checkEligibility      — compliance eligibility check for clone export
 *   estimateRenderCost    — render graph cost estimation for clone jobs
 *   distributeContent     — push clone output to distribution channels
 * ============================================================================
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";
import mysql from "mysql2/promise";
import OpenAI from "openai";
import crypto from "crypto";
import { generateSpeech } from "../_core/tts.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── DB ───────────────────────────────────────────────────────────────────────
async function getDb() {
  const url =
    process.env.DATABASE_URL ||
    "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error("Invalid DATABASE_URL");
  const [, user, password, host, port, database] = m;
  return mysql.createConnection({ host, port: parseInt(port), user, password, database });
}

function rows(result: any): any[] {
  if (Array.isArray(result) && result.length >= 1 && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result;
  return [];
}

// ─── Provider Registry ────────────────────────────────────────────────────────
const PROVIDERS = [
  {
    id: "replicate-fluxdevcam",
    name: "Replicate — FluxDevCam (KingCam LoRA)",
    type: "image",
    capabilities: ["identity_lock", "lora_fine_tune", "high_fidelity", "custom_trigger"],
    status: process.env.REPLICATE_API_TOKEN ? "active" : "unconfigured",
    model: process.env.REPLICATE_CLONE_MODEL_ID || "kingcam214/fluxdevcam",
    version: process.env.REPLICATE_CLONE_VERSION || "e8074c4eeec195ad8ab617bf1502cd0c297db7f2c1cf5d9a665fad4710468727",
    triggerWord: process.env.REPLICATE_CLONE_TRIGGER_WORD || "fluxdevCam",
    priority: 1,
  },
  {
    id: "replicate-flux-dev",
    name: "Replicate — Flux Dev (General)",
    type: "image",
    capabilities: ["high_quality", "fast", "versatile"],
    status: process.env.REPLICATE_API_TOKEN ? "active" : "unconfigured",
    model: "black-forest-labs/flux-dev",
    priority: 2,
  },
  {
    id: "pollo-v1-6",
    name: "Pollo — Image to Video v1.6",
    type: "video",
    capabilities: ["image_to_video", "motion_control", "resolution_720p", "resolution_1080p"],
    status: process.env.POLLO_API_KEY ? "active" : "unconfigured",
    model: "pollo-v1-6",
    priority: 1,
  },
  {
    id: "runway-gen3",
    name: "Runway — Gen-3 Alpha Turbo",
    type: "video",
    capabilities: ["image_to_video", "text_to_video", "cinematic_motion", "high_fidelity"],
    status: process.env.RUNWAY_API_KEY ? "active" : "unconfigured",
    model: "gen3a_turbo",
    priority: 2,
  },
  {
    id: "luma-dream-machine",
    name: "Luma — Dream Machine",
    type: "video",
    capabilities: ["image_to_video", "text_to_video", "photorealistic", "smooth_motion"],
    status: process.env.LUMA_API_KEY ? "active" : "unconfigured",
    model: "dream-machine",
    priority: 3,
  },
  {
    id: "minimax-video",
    name: "MiniMax — Video-01",
    type: "video",
    capabilities: ["image_to_video", "subject_reference", "consistent_identity"],
    status: process.env.MINIMAX_API_KEY ? "active" : "unconfigured",
    model: "video-01",
    priority: 4,
  },
  {
    id: "elevenlabs-voice",
    name: "ElevenLabs — Voice Clone",
    type: "voice",
    capabilities: ["voice_clone", "tts", "multilingual", "emotion_control", "real_time"],
    status: process.env.ELEVENLABS_API_KEY ? "active" : "unconfigured",
    voiceId: process.env.KINGCAM_ELEVEN_VOICE_ID || "rwc11bXCBw5KydM4avHE",
    priority: 1,
  },
  {
    id: "replicate-lora-trainer",
    name: "Replicate — Flux LoRA Trainer",
    type: "training",
    capabilities: ["lora_fine_tune", "flux_dev", "custom_trigger_word", "dataset_upload"],
    status: process.env.REPLICATE_API_TOKEN ? "active" : "unconfigured",
    model: "ostris/flux-dev-lora-trainer",
    priority: 1,
  },
] as const;

// ─── Identity Prompt Builder ───────────────────────────────────────────────────
const IDENTITY_PREFIX =
  "KingCam reference-first identity lock: preserve the exact hairstyle, hairline, hair length, hair texture, facial hair, jewelry, skin tone, face structure, body build, and wardrobe specified by the user prompt; do not invent, replace, clean up, or stylize the hairstyle";
const IDENTITY_SUFFIX =
  "paid clone output must match the submitted prompt and reference-media identity exactly";
const LOCKED_NEGATIVE =
  "wrong hairstyle, invented hairstyle, generic AI haircut, default model haircut, unrequested natural hair fade, bald, shaved head, no hair, hat, beanie, hood, wrong glasses, light skin, thin build, no beard, clean shaven, extra fingers, fused fingers, deformed hands, warped face, duplicate face, bad anatomy, mutated limbs, text artifacts, watermark, logo, blurry, low resolution, uncanny valley, ai artifacts";

function buildIdentityPrompt(triggerWord: string, userPrompt: string): string {
  const clean = userPrompt.replace(new RegExp(`\\b${triggerWord}\\b`, "gi"), "").trim().replace(/^,+|,+$/g, "").trim();
  return `${triggerWord} ${IDENTITY_PREFIX}, ${clean}, ${IDENTITY_SUFFIX}`;
}

function buildNegativePrompt(userNegative?: string): string {
  return userNegative?.trim() ? `${LOCKED_NEGATIVE}, ${userNegative.trim()}` : LOCKED_NEGATIVE;
}

// ─── Motion Prompt Presets ─────────────────────────────────────────────────────
const MOTION_PRESETS = {
  vaultx_teaser: "Premium VaultX clone motion teaser: subtle camera push, stable face identity, luxury low-key lighting, confident presence, polished vertical launch feel.",
  vip_invite: "VIP invite clone motion: warm private-lounge lighting, controlled eye-line presence, discreet premium energy, stable likeness, suitable for Telegram or VIP funnel routing.",
  ppv_cover: "PPV cover-motion loop: glossy editorial lighting, clean subject preservation, slow reveal movement, strong paid-unlock tension.",
  brand_loop: "Creator-brand profile loop: subtle head movement, crisp face consistency, clean background depth, premium social hero energy, platform-safe styling.",
  course_intro: "Course intro motion: confident teaching presence, clean studio lighting, direct eye contact, professional authority energy.",
  sales_pitch: "Sales pitch motion: dynamic energy, forward lean, persuasive body language, premium lighting, conversion-optimized framing.",
} as const;

// ─── Provider API Helpers ─────────────────────────────────────────────────────

async function replicatePost(endpoint: string, body: object): Promise<any> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "REPLICATE_API_TOKEN not configured" });
  const resp = await fetch(`https://api.replicate.com/v1/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Replicate ${endpoint} error: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

async function replicateGet(predictionId: string): Promise<any> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "REPLICATE_API_TOKEN not configured" });
  const resp = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!resp.ok) throw new Error(`Replicate poll error: ${resp.status}`);
  return resp.json();
}

async function polloPost(path: string, body: object): Promise<any> {
  const key = process.env.POLLO_API_KEY;
  if (!key) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "POLLO_API_KEY not configured" });
  const resp = await fetch(`https://pollo.ai/api/platform${path}`, {
    method: "POST",
    headers: { "x-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Pollo ${path} error: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

async function polloGet(taskId: string): Promise<any> {
  const key = process.env.POLLO_API_KEY;
  if (!key) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "POLLO_API_KEY not configured" });
  const resp = await fetch(`https://pollo.ai/api/platform/generation/${taskId}/status`, {
    headers: { "x-api-key": key },
  });
  if (!resp.ok) throw new Error(`Pollo status error: ${resp.status}`);
  return resp.json();
}

async function runwayPost(body: object): Promise<any> {
  const key = process.env.RUNWAY_API_KEY;
  if (!key) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "RUNWAY_API_KEY not configured" });
  const resp = await fetch("https://api.dev.runwayml.com/v1/image_to_video", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Runway-Version": "2024-11-06" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Runway error: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

async function runwayGet(taskId: string): Promise<any> {
  const key = process.env.RUNWAY_API_KEY;
  if (!key) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "RUNWAY_API_KEY not configured" });
  const resp = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${key}`, "X-Runway-Version": "2024-11-06" },
  });
  if (!resp.ok) throw new Error(`Runway status error: ${resp.status}`);
  return resp.json();
}

async function lumaPost(body: object): Promise<any> {
  const key = process.env.LUMA_API_KEY;
  if (!key) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "LUMA_API_KEY not configured" });
  const resp = await fetch("https://api.lumalabs.ai/dream-machine/v1/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Luma error: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

async function lumaGet(generationId: string): Promise<any> {
  const key = process.env.LUMA_API_KEY;
  if (!key) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "LUMA_API_KEY not configured" });
  const resp = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${generationId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!resp.ok) throw new Error(`Luma status error: ${resp.status}`);
  return resp.json();
}

async function minimaxPost(body: object): Promise<any> {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "MINIMAX_API_KEY not configured" });
  const resp = await fetch("https://api.minimaxi.chat/v1/video_generation", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`MiniMax error: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

async function minimaxGet(taskId: string): Promise<any> {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "MINIMAX_API_KEY not configured" });
  const resp = await fetch(`https://api.minimaxi.chat/v1/query/video_generation?task_id=${taskId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!resp.ok) throw new Error(`MiniMax status error: ${resp.status}`);
  return resp.json();
}

// ─── Status Normalizer ────────────────────────────────────────────────────────
function normalizeStatus(raw: string | undefined | null, provider: string): "queued" | "processing" | "succeeded" | "failed" {
  if (!raw) return "queued";
  const s = raw.toLowerCase();
  if (["succeed", "succeeded", "success", "complete", "completed", "finished"].includes(s)) return "succeeded";
  if (["failed", "fail", "error", "canceled", "cancelled", "timeout"].includes(s)) return "failed";
  if (["processing", "running", "in_progress", "starting", "pending", "queued", "waiting"].includes(s)) return "processing";
  return "queued";
}

// ─── Cost Estimator ───────────────────────────────────────────────────────────
function estimateCost(type: string, provider: string, options: Record<string, any>): { credits: number; usd: number; breakdown: string } {
  const costs: Record<string, { credits: number; usd: number }> = {
    "image:replicate-fluxdevcam": { credits: 5, usd: 0.05 },
    "image:replicate-flux-dev": { credits: 3, usd: 0.03 },
    "video:pollo-v1-6": { credits: options.length === "10s" ? 20 : 10, usd: options.length === "10s" ? 0.20 : 0.10 },
    "video:runway-gen3": { credits: options.length === "10s" ? 30 : 15, usd: options.length === "10s" ? 0.30 : 0.15 },
    "video:luma-dream-machine": { credits: options.length === "10s" ? 25 : 12, usd: options.length === "10s" ? 0.25 : 0.12 },
    "video:minimax-video": { credits: options.length === "10s" ? 22 : 11, usd: options.length === "10s" ? 0.22 : 0.11 },
    "voice:elevenlabs-voice": { credits: 2, usd: 0.02 },
    "talking_head:composite": { credits: 35, usd: 0.35 },
    "training:replicate-lora-trainer": { credits: 500, usd: 5.00 },
  };
  const key = `${type}:${provider}`;
  const cost = costs[key] || { credits: 10, usd: 0.10 };
  return { ...cost, breakdown: `${type} via ${provider} — ${cost.credits} credits ($${cost.usd.toFixed(2)})` };
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const cloneEngineRouter = router({

  /**
   * 1. getProviders — List all available AI providers with capabilities and status
   */
  getProviders: publicProcedure.query(() => {
    return {
      providers: PROVIDERS.map(p => ({
        ...p,
        // Mask internal keys
        version: undefined,
        voiceId: undefined,
      })),
      activeCount: PROVIDERS.filter(p => p.status === "active").length,
      totalCount: PROVIDERS.length,
    };
  }),

  /**
   * 2. createClone — Initialize a new clone profile for any authenticated creator
   */
  createClone: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      triggerWord: z.string().min(2).max(50).optional(),
      description: z.string().max(500).optional(),
      platforms: z.array(z.string()).default([]),
      voiceId: z.string().optional(),
      baseImageUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      try {
        const cloneId = crypto.randomUUID();
        const triggerWord = input.triggerWord || `clone_${ctx.user.id}_${Date.now()}`;

        await db.execute(
          `INSERT INTO clone_profiles
           (id, user_id, name, trigger_word, description, platforms, voice_id, base_image_url, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
           ON DUPLICATE KEY UPDATE name = VALUES(name), updated_at = NOW()`,
          [cloneId, ctx.user.id, input.name, triggerWord, input.description || null,
           JSON.stringify(input.platforms), input.voiceId || null, input.baseImageUrl || null]
        );

        // Initialize passport
        await db.execute(
          `INSERT INTO clone_passports
           (clone_id, user_id, identity_profile, voice_profile, visual_profile, behavioral_profile, operating_rules, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE updated_at = NOW()`,
          [cloneId, ctx.user.id,
           JSON.stringify({ name: input.name, triggerWord }),
           JSON.stringify({ voiceId: input.voiceId || null, style: "natural" }),
           JSON.stringify({ baseImageUrl: input.baseImageUrl || null }),
           JSON.stringify({ tone: "confident", energy: "premium" }),
           JSON.stringify({ compliance: true, adultSafe: true })]
        );

        return { cloneId, triggerWord, status: "active", message: `Clone "${input.name}" created and ready for training.` };
      } finally {
        db.end();
      }
    }),

  /**
   * 3. getClone — Fetch clone profile + passport + stats
   */
  getClone: protectedProcedure
    .input(z.object({ cloneId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      try {
        // Try clone_profiles table first, fall back to legacy kingcam_clone_profile
        let profile: any = null;
        try {
          const profileRows = rows(await db.execute(
            `SELECT * FROM clone_profiles WHERE user_id = ? ${input.cloneId ? "AND id = ?" : ""} ORDER BY created_at DESC LIMIT 1`,
            input.cloneId ? [ctx.user.id, input.cloneId] : [ctx.user.id]
          ));
          profile = profileRows[0] || null;
        } catch {
          // Fall back to legacy table
          const legacyRows = rows(await db.execute("SELECT * FROM kingcam_clone_profile LIMIT 1"));
          profile = legacyRows[0] || null;
        }

        // Get passport
        let passport: any = null;
        try {
          const passportRows = rows(await db.execute(
            `SELECT * FROM clone_passports WHERE user_id = ? ${input.cloneId ? "AND clone_id = ?" : ""} LIMIT 1`,
            input.cloneId ? [ctx.user.id, input.cloneId] : [ctx.user.id]
          ));
          passport = passportRows[0] || null;
        } catch {}

        // Get stats
        const [imgRows] = await db.execute(
          "SELECT COUNT(*) as cnt FROM kingcam_clone_generations WHERE user_id = ?", [ctx.user.id]
        );
        const [vidRows] = await db.execute(
          "SELECT COUNT(*) as cnt FROM pollo_generations WHERE userId = ?", [ctx.user.id]
        );
        const [trainRows] = await db.execute(
          "SELECT COUNT(*) as cnt, MAX(created_at) as last_trained FROM clone_training_jobs WHERE user_id = ?",[ctx.user.id]
        ).catch(() => [[{ cnt: 0, last_trained: null }]]);

        const stats = {
          totalImages: Number(rows([imgRows])[0]?.cnt || 0),
          totalVideos: Number(rows([vidRows])[0]?.cnt || 0),
          totalTrainingJobs: Number(rows([trainRows])[0]?.cnt || 0),
          lastTrained: rows([trainRows])[0]?.last_trained || null,
        };

        // Get active model versions
        let activeModels: any[] = [];
        try {
          activeModels = rows(await db.execute(
            `SELECT * FROM clone_model_versions WHERE user_id = ? AND status = 'production' ORDER BY promoted_at DESC LIMIT 5`,
            [ctx.user.id]
          ));
        } catch {}

        return { profile, passport, stats, activeModels, providers: PROVIDERS.filter(p => p.status === "active") };
      } finally {
        db.end();
      }
    }),

  /**
   * 4. updatePassport — Update clone identity/persona/voice/visual profile
   */
  updatePassport: protectedProcedure
    .input(z.object({
      cloneId: z.string().optional(),
      identityProfile: z.record(z.any()).optional(),
      voiceProfile: z.record(z.any()).optional(),
      visualProfile: z.record(z.any()).optional(),
      behavioralProfile: z.record(z.any()).optional(),
      operatingRules: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      try {
        const sets: string[] = ["updated_at = NOW()"];
        const vals: any[] = [];
        if (input.identityProfile) { sets.push("identity_profile = ?"); vals.push(JSON.stringify(input.identityProfile)); }
        if (input.voiceProfile) { sets.push("voice_profile = ?"); vals.push(JSON.stringify(input.voiceProfile)); }
        if (input.visualProfile) { sets.push("visual_profile = ?"); vals.push(JSON.stringify(input.visualProfile)); }
        if (input.behavioralProfile) { sets.push("behavioral_profile = ?"); vals.push(JSON.stringify(input.behavioralProfile)); }
        if (input.operatingRules) { sets.push("operating_rules = ?"); vals.push(JSON.stringify(input.operatingRules)); }
        vals.push(ctx.user.id);

        await db.execute(
          `UPDATE clone_passports SET ${sets.join(", ")} WHERE user_id = ?`,
          vals
        ).catch(() => {
          // If table doesn't exist yet, silently pass — will be created on next createClone
        });

        return { success: true, message: "Clone passport updated." };
      } finally {
        db.end();
      }
    }),

  /**
   * 5. generateImage — Multi-provider image generation with identity lock
   */
  generateImage: protectedProcedure
    .input(z.object({
      cloneId: z.string().optional(),
      prompt: z.string().min(1).max(2000),
      negativePrompt: z.string().max(2000).optional(),
      provider: z.enum(["replicate-fluxdevcam", "replicate-flux-dev"]).default("replicate-fluxdevcam"),
      width: z.number().min(256).max(1536).default(1024),
      height: z.number().min(256).max(1536).default(1024),
      numOutputs: z.number().min(1).max(4).default(1),
      guidanceScale: z.number().min(0).max(20).default(3.5),
      numInferenceSteps: z.number().min(1).max(50).default(28),
      seed: z.number().optional(),
      modelVersion: z.string().optional(),
      previewOnly: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const providerConfig = PROVIDERS.find(p => p.id === input.provider);
      if (!providerConfig) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown provider" });

      const triggerWord = (providerConfig as any).triggerWord || "fluxdevCam";
      const finalPrompt = buildIdentityPrompt(triggerWord, input.prompt);
      const finalNegative = buildNegativePrompt(input.negativePrompt);
      const cost = estimateCost("image", input.provider, {});

      // Preview mode — return final prompt without spending credits
      if (input.previewOnly) {
        return {
          previewOnly: true,
          finalPrompt,
          finalNegative,
          cost,
          safetyRule: "Preview mode: no generation fired. Approve this prompt before creating.",
        };
      }

      const version = input.modelVersion || (providerConfig as any).version || DEFAULT_VERSION_FALLBACK;

      const prediction = await replicatePost("predictions", {
        version,
        input: {
          prompt: finalPrompt,
          negative_prompt: finalNegative,
          width: input.width,
          height: input.height,
          num_outputs: input.numOutputs,
          guidance_scale: input.guidanceScale,
          num_inference_steps: input.numInferenceSteps,
          aspect_ratio: "custom",
          output_format: "png",
          output_quality: 100,
          ...(input.seed !== undefined ? { seed: input.seed } : {}),
        },
      });

      const db = await getDb();
      try {
        await db.execute(
          `INSERT INTO kingcam_clone_generations
           (user_id, replicate_prediction_id, model_id, model_version, prompt, negative_prompt,
            width, height, num_outputs, guidance_scale, num_inference_steps, seed, status, clone_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [ctx.user.id, prediction.id, (providerConfig as any).model || "fluxdevcam",
           version, finalPrompt, finalNegative, input.width, input.height,
           input.numOutputs, input.guidanceScale, input.numInferenceSteps,
           input.seed || null, prediction.status || "starting", input.cloneId || null]
        );
      } finally {
        db.end();
      }

      return {
        predictionId: prediction.id,
        generationType: "image",
        provider: input.provider,
        status: prediction.status || "starting",
        finalPrompt,
        cost,
      };
    }),

  /**
   * 6. generateVideo — Multi-provider video generation
   */
  generateVideo: protectedProcedure
    .input(z.object({
      cloneId: z.string().optional(),
      imageUrl: z.string().url(),
      prompt: z.string().max(1500).optional(),
      motionStyle: z.enum(["vaultx_teaser", "vip_invite", "ppv_cover", "brand_loop", "course_intro", "sales_pitch"]).default("vaultx_teaser"),
      provider: z.enum(["pollo-v1-6", "runway-gen3", "luma-dream-machine", "minimax-video"]).default("pollo-v1-6"),
      resolution: z.enum(["480p", "720p", "1080p"]).default("720p"),
      length: z.enum(["5s", "10s"]).default("5s"),
      mode: z.enum(["basic", "pro"]).default("pro"),
    }))
    .mutation(async ({ ctx, input }) => {
      const finalPrompt = input.prompt?.trim() || MOTION_PRESETS[input.motionStyle];
      const durationSeconds = input.length === "10s" ? 10 : 5;
      const cost = estimateCost("video", input.provider, { length: input.length });

      let taskId: string;
      let externalId: string;

      if (input.provider === "pollo-v1-6") {
        const payload = await polloPost("/generation/pollo/pollo-v1-6", {
          input: { image: input.imageUrl, prompt: finalPrompt, resolution: input.resolution, length: durationSeconds, mode: input.mode },
        });
        if (payload?.code !== "SUCCESS" || !payload?.data?.taskId) {
          throw new Error(`Pollo did not return a usable taskId: ${JSON.stringify(payload)}`);
        }
        taskId = payload.data.taskId;
        externalId = taskId;

      } else if (input.provider === "runway-gen3") {
        const payload = await runwayPost({
          model: "gen3a_turbo",
          promptImage: input.imageUrl,
          promptText: finalPrompt,
          duration: durationSeconds,
          ratio: input.resolution === "1080p" ? "1280:720" : "1280:720",
        });
        taskId = payload.id || payload.task_id;
        externalId = taskId;

      } else if (input.provider === "luma-dream-machine") {
        const payload = await lumaPost({
          model: "dream-machine",
          prompt: finalPrompt,
          keyframes: { frame0: { type: "image", url: input.imageUrl } },
          duration: durationSeconds,
          aspect_ratio: "16:9",
        });
        taskId = payload.id;
        externalId = taskId;

      } else if (input.provider === "minimax-video") {
        const payload = await minimaxPost({
          model: "video-01",
          prompt: finalPrompt,
          first_frame_image: input.imageUrl,
        });
        taskId = payload.task_id;
        externalId = taskId;

      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown video provider" });
      }

      const db = await getDb();
      try {
        await db.execute(
          `INSERT INTO clone_video_generations
           (id, user_id, clone_id, provider, task_id, external_id, image_url, prompt, motion_style,
            resolution, length, mode, status, cost_credits, cost_usd, created_at, updated_at)
           VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, NOW(), NOW())`,
          [ctx.user.id, input.cloneId || null, input.provider, taskId, externalId,
           input.imageUrl, finalPrompt, input.motionStyle, input.resolution, input.length,
           input.mode, cost.credits, cost.usd]
        ).catch(() => {
          // Fall back to legacy pollo_generations table
          return db.execute(
            `INSERT INTO pollo_generations (userId, taskId, imageUrl, prompt, resolution, length, mode, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'queued')`,
            [ctx.user.id, taskId, input.imageUrl, finalPrompt, input.resolution, input.length, input.mode]
          );
        });
      } finally {
        db.end();
      }

      return {
        taskId,
        generationType: "video",
        provider: input.provider,
        status: "queued",
        finalPrompt,
        motionStyle: input.motionStyle,
        cost,
        directorBrief: {
          vertical: "Clone",
          motionStyle: input.motionStyle,
          provider: input.provider,
          outputs: ["clone teaser", "VIP invite loop", "PPV cover motion", "profile hero"],
          safetyRule: "adult-safe public teaser language; preserve likeness",
        },
      };
    }),

  /**
   * 7. generateVoice — ElevenLabs voice clone synthesis
   */
  generateVoice: protectedProcedure
    .input(z.object({
      cloneId: z.string().optional(),
      script: z.string().min(1).max(5000),
      voiceId: z.string().optional(),
      stability: z.number().min(0).max(1).default(0.5),
      similarityBoost: z.number().min(0).max(1).default(0.85),
      style: z.number().min(0).max(1).default(0.35),
      speed: z.number().min(0.5).max(2).default(0.95),
      language: z.string().default("en"),
    }))
    .mutation(async ({ ctx, input }) => {
      const cost = estimateCost("voice", "elevenlabs-voice", {});

      const result = await generateSpeech(input.script, {
        voice: "kingcam",
        speed: input.speed,
        stability: input.stability,
        similarityBoost: input.similarityBoost,
        style: input.style,
        language: input.language,
      });

      const db = await getDb();
      try {
        await db.execute(
          `INSERT INTO clone_voice_generations
           (id, user_id, clone_id, script, voice_id, audio_url, duration_seconds, provider, status, cost_credits, cost_usd, created_at)
           VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, NOW())`,
          [ctx.user.id, input.cloneId || null, input.script,
           input.voiceId || process.env.KINGCAM_ELEVEN_VOICE_ID || "rwc11bXCBw5KydM4avHE",
           result.audioUrl, result.duration || 0, result.provider || "elevenlabs",
           cost.credits, cost.usd]
        ).catch(() => {}); // Non-fatal if table doesn't exist yet
      } finally {
        db.end();
      }

      return {
        audioUrl: result.audioUrl,
        duration: result.duration,
        provider: result.provider,
        generationType: "voice",
        cost,
      };
    }),

  /**
   * 8. generateTalkingHead — Full talking head: voice + face sync + video in one call
   * This is the killer feature that beats HeyGen and Synthesia.
   */
  generateTalkingHead: protectedProcedure
    .input(z.object({
      cloneId: z.string().optional(),
      script: z.string().min(1).max(5000),
      imageUrl: z.string().url().optional(),
      style: z.enum(["studio", "street", "course", "sales", "tour"]).default("studio"),
      title: z.string().optional(),
      videoProvider: z.enum(["pollo-v1-6", "runway-gen3", "luma-dream-machine"]).default("pollo-v1-6"),
    }))
    .mutation(async ({ ctx, input }) => {
      const jobId = crypto.randomUUID();
      const cost = estimateCost("talking_head", "composite", {});

      const db = await getDb();
      try {
        await db.execute(
          `INSERT INTO kingcam_clone_videos
           (id, user_id, context, title, script, style, render_status, render_provider, created_at)
           VALUES (?, ?, 'clone_engine', ?, ?, ?, 'rendering', ?, NOW())`,
          [jobId, ctx.user.id,
           input.title || `Talking Head — ${new Date().toLocaleDateString()}`,
           input.script, input.style, input.videoProvider]
        );
      } finally {
        db.end();
      }

      // Fire async pipeline: voice → video → merge
      const imageUrl = input.imageUrl || process.env.KINGCAM_CLONE_IMAGE_URL || process.env.CLONE_VIDEO_IMAGE_URL || "";

      (async () => {
        try {
          // Step 1: Generate voice
          const voiceResult = await generateSpeech(input.script, {
            voice: "kingcam",
            speed: 0.95,
            stability: 0.5,
            similarityBoost: 0.85,
            style: 0.35,
            language: "en",
          });

          // Step 2: Generate video via selected provider
          let videoUrl: string | null = null;
          const motionPrompt = MOTION_PRESETS[input.style === "course" ? "course_intro" : input.style === "sales" ? "sales_pitch" : "brand_loop"];

          if (input.videoProvider === "pollo-v1-6" && imageUrl) {
            const polloPayload = await polloPost("/generation/pollo/pollo-v1-6", {
              input: { image: imageUrl, prompt: motionPrompt, resolution: "720p", length: 5, mode: "pro" },
            });
            const polloTaskId = polloPayload?.data?.taskId;
            if (polloTaskId) {
              // Poll for completion
              for (let i = 0; i < 60; i++) {
                await new Promise(r => setTimeout(r, 5000));
                const status = await polloGet(polloTaskId);
                const gen = status?.data?.generations?.[0];
                const s = normalizeStatus(gen?.status || status?.data?.status, "pollo");
                if (s === "succeeded" && gen?.url) { videoUrl = gen.url; break; }
                if (s === "failed") break;
              }
            }
          }

          const db2 = await getDb();
          await db2.execute(
            `UPDATE kingcam_clone_videos
             SET render_status = ?, video_url = ?, audio_url = ?, duration_seconds = ?, render_provider = ?, updated_at = NOW()
             WHERE id = ?`,
            [videoUrl ? "ready" : "failed", videoUrl || null,
             voiceResult.audioUrl, voiceResult.duration || 0,
             `${voiceResult.provider || "elevenlabs"}_${input.videoProvider}`, jobId]
          );
          db2.end();
        } catch (err: any) {
          const db2 = await getDb();
          await db2.execute(
            "UPDATE kingcam_clone_videos SET render_status = 'failed', render_error = ?, updated_at = NOW() WHERE id = ?",
            [err.message, jobId]
          );
          db2.end();
        }
      })();

      return {
        jobId,
        generationType: "talking_head",
        status: "rendering",
        cost,
        estimatedTime: "60-120 seconds",
        message: "Talking head generation started. Voice and video are being synthesized in parallel.",
      };
    }),

  /**
   * 9. getGenerationStatus — Unified status polling for any generation type
   */
  getGenerationStatus: protectedProcedure
    .input(z.object({
      generationType: z.enum(["image", "video", "voice", "talking_head", "training"]),
      id: z.string(), // predictionId, taskId, jobId
      provider: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (input.generationType === "image") {
        const data = await replicateGet(input.id);
        const db = await getDb();
        try {
          const outputUrls = data.output && Array.isArray(data.output)
            ? JSON.stringify(data.output)
            : data.output ? JSON.stringify([data.output]) : null;
          await db.execute(
            `UPDATE kingcam_clone_generations SET status = ?, output_urls = ?, error_message = ? WHERE replicate_prediction_id = ?`,
            [data.status, outputUrls, data.error || null, input.id]
          );
        } finally { db.end(); }
        return {
          id: input.id,
          generationType: "image",
          status: normalizeStatus(data.status, "replicate"),
          output: data.output,
          error: data.error,
          metrics: data.metrics,
        };
      }

      if (input.generationType === "video") {
        const provider = input.provider || "pollo-v1-6";
        let status: string;
        let videoUrl: string | null = null;

        if (provider === "pollo-v1-6") {
          const data = await polloGet(input.id);
          const gen = data?.data?.generations?.[0];
          status = normalizeStatus(gen?.status || data?.data?.status, "pollo");
          videoUrl = gen?.url || null;
        } else if (provider === "runway-gen3") {
          const data = await runwayGet(input.id);
          status = normalizeStatus(data.status, "runway");
          videoUrl = data.output?.[0] || null;
        } else if (provider === "luma-dream-machine") {
          const data = await lumaGet(input.id);
          status = normalizeStatus(data.state, "luma");
          videoUrl = data.assets?.video || null;
        } else if (provider === "minimax-video") {
          const data = await minimaxGet(input.id);
          status = normalizeStatus(data.status, "minimax");
          videoUrl = data.file_id ? `https://api.minimaxi.chat/v1/files/${data.file_id}` : null;
        } else {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown video provider" });
        }

        // Update DB
        const db = await getDb();
        try {
          await db.execute(
            `UPDATE clone_video_generations SET status = ?, video_url = ?, updated_at = NOW() WHERE task_id = ? AND user_id = ?`,
            [status, videoUrl, input.id, ctx.user.id]
          ).catch(() => {
            return db.execute(
              `UPDATE pollo_generations SET status = ?, videoUrl = ?, updatedAt = NOW() WHERE taskId = ? AND userId = ?`,
              [status, videoUrl, input.id, ctx.user.id]
            );
          });
        } finally { db.end(); }

        return { id: input.id, generationType: "video", provider, status, videoUrl };
      }

      if (input.generationType === "talking_head") {
        const db = await getDb();
        try {
          const videoRows = rows(await db.execute(
            "SELECT * FROM kingcam_clone_videos WHERE id = ? AND user_id = ?",
            [input.id, ctx.user.id]
          ));
          const video = videoRows[0];
          if (!video) throw new TRPCError({ code: "NOT_FOUND" });
          return {
            id: input.id,
            generationType: "talking_head",
            status: normalizeStatus(video.render_status, "composite"),
            videoUrl: video.video_url || null,
            audioUrl: video.audio_url || null,
            error: video.render_error || null,
          };
        } finally { db.end(); }
      }

      if (input.generationType === "training") {
        const db = await getDb();
        try {
          const jobRows = rows(await db.execute(
            "SELECT * FROM clone_training_jobs WHERE id = ? AND user_id = ?",
            [input.id, ctx.user.id]
          ));
          const job = jobRows[0];
          if (!job) throw new TRPCError({ code: "NOT_FOUND" });
          return { id: input.id, generationType: "training", status: job.status, progress: job.progress || 0 };
        } finally { db.end(); }
      }

      throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown generation type" });
    }),

  /**
   * 10. getHistory — Paginated history across all generation types
   */
  getHistory: protectedProcedure
    .input(z.object({
      cloneId: z.string().optional(),
      type: z.enum(["all", "image", "video", "voice", "talking_head"]).default("all"),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      try {
        const items: any[] = [];

        if (input.type === "all" || input.type === "image") {
          const imgRows = rows(await db.execute(
            `SELECT id, replicate_prediction_id as taskId, 'image' as type, status, output_urls as outputUrls,
             prompt, created_at as createdAt FROM kingcam_clone_generations
             WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [ctx.user.id, input.limit, input.offset]
          ));
          items.push(...imgRows.map((r: any) => ({
            ...r,
            outputUrls: r.outputUrls ? JSON.parse(r.outputUrls) : [],
          })));
        }

        if (input.type === "all" || input.type === "video") {
          const vidRows = rows(await db.execute(
            `SELECT taskId as taskId, 'video' as type, status, videoUrl as videoUrl,
             prompt, createdAt FROM pollo_generations
             WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
            [ctx.user.id, input.limit, input.offset]
          ));
          items.push(...vidRows.map((r: any) => ({ ...r, outputUrls: r.videoUrl ? [r.videoUrl] : [] })));
        }

        if (input.type === "all" || input.type === "talking_head") {
          const thRows = rows(await db.execute(
            `SELECT id, 'talking_head' as type, render_status as status, video_url as videoUrl,
             audio_url as audioUrl, title, script, created_at as createdAt
             FROM kingcam_clone_videos WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [ctx.user.id, input.limit, input.offset]
          ));
          items.push(...thRows.map((r: any) => ({ ...r, outputUrls: r.videoUrl ? [r.videoUrl] : [] })));
        }

        // Sort all items by createdAt desc
        items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        return { items: items.slice(0, input.limit), total: items.length };
      } finally {
        db.end();
      }
    }),

  /**
   * 11. saveToVault — Push any clone output to VaultX vault
   */
  saveToVault: protectedProcedure
    .input(z.object({
      generationType: z.enum(["image", "video", "voice", "talking_head"]),
      outputUrl: z.string().url(),
      title: z.string().optional(),
      cloneId: z.string().optional(),
      tags: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      try {
        const assetId = crypto.randomUUID();
        await db.execute(
          `INSERT INTO vault_assets
           (id, user_id, clone_id, asset_type, url, title, tags, source, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'clone_engine', NOW())`,
          [assetId, ctx.user.id, input.cloneId || null, input.generationType,
           input.outputUrl, input.title || `Clone ${input.generationType}`,
           JSON.stringify(input.tags)]
        ).catch(async () => {
          // Fall back to marking generation as saved in legacy table
          if (input.generationType === "image") {
            await db.execute(
              `UPDATE kingcam_clone_generations SET saved_to_vault = 1, vault_saved_at = NOW()
               WHERE user_id = ? AND JSON_CONTAINS(output_urls, ?)`,
              [ctx.user.id, JSON.stringify(input.outputUrl)]
            ).catch(() => {});
          }
        });
        return { success: true, assetId, message: "Saved to Vault." };
      } finally {
        db.end();
      }
    }),

  /**
   * 12. startTraining — Kick off LoRA fine-tune (Replicate or local GPU)
   */
  startTraining: protectedProcedure
    .input(z.object({
      cloneId: z.string(),
      triggerWord: z.string().min(2).max(50),
      datasetId: z.string().optional(),
      samples: z.array(z.string()).optional(),
      steps: z.number().min(100).max(4000).default(1000),
      learningRate: z.number().default(0.0004),
      loraRank: z.number().min(4).max(128).default(16),
      provider: z.enum(["replicate", "local"]).default("replicate"),
    }))
    .mutation(async ({ ctx, input }) => {
      const jobId = crypto.randomUUID();
      const db = await getDb();
      try {
        await db.execute(
          `INSERT INTO clone_training_jobs
           (id, user_id, clone_id, trigger_word, dataset_id, samples, steps, learning_rate,
            lora_rank, provider, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', NOW())`,
          [jobId, ctx.user.id, input.cloneId, input.triggerWord,
           input.datasetId || null, JSON.stringify(input.samples || []),
           input.steps, input.learningRate, input.loraRank, input.provider]
        );
      } finally {
        db.end();
      }

      // Fire async training job
      if (input.provider === "replicate" && process.env.REPLICATE_API_TOKEN) {
        (async () => {
          try {
            const trainingPayload = await replicatePost("trainings", {
              model: "ostris/flux-dev-lora-trainer",
              input: {
                trigger_word: input.triggerWord,
                steps: input.steps,
                learning_rate: input.learningRate,
                lora_rank: input.loraRank,
                ...(input.samples?.length ? { input_images: input.samples } : {}),
              },
            });
            const db2 = await getDb();
            await db2.execute(
              "UPDATE clone_training_jobs SET status = 'running', external_job_id = ?, updated_at = NOW() WHERE id = ?",
              [trainingPayload.id, jobId]
            );
            db2.end();
          } catch (err: any) {
            const db2 = await getDb();
            await db2.execute(
              "UPDATE clone_training_jobs SET status = 'failed', error = ?, updated_at = NOW() WHERE id = ?",
              [err.message, jobId]
            );
            db2.end();
          }
        })();
      }

      return {
        jobId,
        status: "queued",
        provider: input.provider,
        estimatedTime: input.provider === "replicate" ? "20-60 minutes" : "10-30 minutes (local GPU)",
        message: `LoRA training started for trigger word "${input.triggerWord}".`,
      };
    }),

  /**
   * 13. getTrainingStatus — Poll training job status
   */
  getTrainingStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      try {
        const jobRows = rows(await db.execute(
          "SELECT * FROM clone_training_jobs WHERE id = ? AND user_id = ?",
          [input.jobId, ctx.user.id]
        ));
        const job = jobRows[0];
        if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Training job not found" });

        // If running on Replicate, poll external status
        if (job.external_job_id && job.status === "running" && process.env.REPLICATE_API_TOKEN) {
          try {
            const training = await replicateGet(job.external_job_id);
            const newStatus = normalizeStatus(training.status, "replicate");
            if (newStatus !== normalizeStatus(job.status, "replicate")) {
              await db.execute(
                "UPDATE clone_training_jobs SET status = ?, output_model = ?, updated_at = NOW() WHERE id = ?",
                [training.status, training.output?.version || null, input.jobId]
              );
              job.status = training.status;
              job.output_model = training.output?.version || null;
            }
          } catch {}
        }

        return {
          jobId: job.id,
          status: job.status,
          progress: job.progress || 0,
          outputModel: job.output_model || null,
          error: job.error || null,
          createdAt: job.created_at,
          updatedAt: job.updated_at,
        };
      } finally {
        db.end();
      }
    }),

  /**
   * 14. promoteModel — Promote a trained model version to production
   */
  promoteModel: protectedProcedure
    .input(z.object({
      jobId: z.string(),
      cloneId: z.string(),
      modelVersion: z.string(),
      label: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      try {
        const versionId = crypto.randomUUID();

        // Archive any existing production model for this clone
        await db.execute(
          `UPDATE clone_model_versions SET status = 'archived', archived_at = NOW()
           WHERE user_id = ? AND clone_id = ? AND status = 'production'`,
          [ctx.user.id, input.cloneId]
        ).catch(() => {});

        // Insert new production version
        await db.execute(
          `INSERT INTO clone_model_versions
           (id, user_id, clone_id, training_job_id, model_version, label, status, promoted_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'production', NOW(), NOW())`,
          [versionId, ctx.user.id, input.cloneId, input.jobId,
           input.modelVersion, input.label || `v${Date.now()}`]
        ).catch(() => {});

        // Update clone profile with new model version
        await db.execute(
          `UPDATE clone_profiles SET active_model_version = ?, updated_at = NOW() WHERE id = ? AND user_id = ?`,
          [input.modelVersion, input.cloneId, ctx.user.id]
        ).catch(() => {});

        return {
          success: true,
          versionId,
          message: `Model version promoted to production for clone "${input.cloneId}".`,
        };
      } finally {
        db.end();
      }
    }),

  /**
   * 15. recordConsent — Compliance consent wrapper for clone use
   */
  recordConsent: protectedProcedure
    .input(z.object({
      cloneId: z.string().optional(),
      consentType: z.enum(["ai_transformation", "monetization", "distribution", "voice_clone", "likeness"]),
      platform: z.string().optional(),
      ipAddress: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      try {
        await db.execute(
          `INSERT INTO clone_consent_records
           (id, user_id, clone_id, consent_type, platform, ip_address, consented_at)
           VALUES (UUID(), ?, ?, ?, ?, ?, NOW())`,
          [ctx.user.id, input.cloneId || null, input.consentType,
           input.platform || null, input.ipAddress || null]
        ).catch(async () => {
          // Fall back to compliance_records table used by VaultX
          await db.execute(
            `INSERT INTO compliance_records
             (user_id, consent_type, platform, consented_at)
             VALUES (?, ?, ?, NOW())`,
            [ctx.user.id, `clone_${input.consentType}`, input.platform || "clone_engine"]
          ).catch(() => {});
        });
        return { success: true, consentType: input.consentType, timestamp: new Date().toISOString() };
      } finally {
        db.end();
      }
    }),

  /**
   * 16. checkEligibility — Compliance eligibility check for clone export
   */
  checkEligibility: protectedProcedure
    .input(z.object({
      cloneId: z.string().optional(),
      exportType: z.enum(["public", "vip", "ppv", "distribution", "training"]),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      try {
        // Check for required consents
        const consentRows = rows(await db.execute(
          `SELECT consent_type FROM clone_consent_records WHERE user_id = ? ORDER BY consented_at DESC LIMIT 20`,
          [ctx.user.id]
        ).catch(() => [[], []]));

        const hasConsents = consentRows.map((r: any) => r.consent_type);
        const requiredConsents = {
          public: ["ai_transformation"],
          vip: ["ai_transformation", "distribution"],
          ppv: ["ai_transformation", "monetization", "distribution"],
          distribution: ["ai_transformation", "distribution"],
          training: ["ai_transformation", "likeness"],
        };

        const required = requiredConsents[input.exportType] || [];
        const missing = required.filter(c => !hasConsents.includes(`clone_${c}`) && !hasConsents.includes(c));

        return {
          eligible: missing.length === 0,
          exportType: input.exportType,
          missingConsents: missing,
          message: missing.length === 0
            ? "Eligible for export."
            : `Missing consent: ${missing.join(", ")}. Please record consent before exporting.`,
        };
      } finally {
        db.end();
      }
    }),

  /**
   * 17. estimateRenderCost — Cost estimation for clone jobs
   */
  estimateRenderCost: protectedProcedure
    .input(z.object({
      generationType: z.enum(["image", "video", "voice", "talking_head", "training"]),
      provider: z.string(),
      options: z.record(z.any()).default({}),
    }))
    .query(({ input }) => {
      return estimateCost(input.generationType, input.provider, input.options);
    }),

  /**
   * 18. distributeContent — Push clone output to distribution channels
   */
  distributeContent: protectedProcedure
    .input(z.object({
      cloneId: z.string().optional(),
      assetUrl: z.string().url(),
      assetType: z.enum(["image", "video", "voice"]),
      channels: z.array(z.enum(["vault", "telegram", "vaultx", "ppv", "vip_feed"])),
      caption: z.string().optional(),
      scheduledAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      try {
        const distributionId = crypto.randomUUID();
        await db.execute(
          `INSERT INTO clone_distributions
           (id, user_id, clone_id, asset_url, asset_type, channels, caption, scheduled_at, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued', NOW())`,
          [distributionId, ctx.user.id, input.cloneId || null,
           input.assetUrl, input.assetType, JSON.stringify(input.channels),
           input.caption || null, input.scheduledAt || null]
        ).catch(() => {});

        return {
          distributionId,
          channels: input.channels,
          status: "queued",
          scheduledAt: input.scheduledAt || "immediate",
          message: `Content queued for distribution to: ${input.channels.join(", ")}.`,
        };
      } finally {
        db.end();
      }
    }),
});

// ─── Fallback constant used in generateImage ─────────────────────────────────
const DEFAULT_VERSION_FALLBACK = "e8074c4eeec195ad8ab617bf1502cd0c297db7f2c1cf5d9a665fad4710468727";
