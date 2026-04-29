/**
 * VaultX Video Enhance Router
 * ============================================================================
 * AI Engine Dispatcher — routes each VaultX panel to the correct AI provider.
 *
 * PROVIDER MAP:
 *   slowMotion     → Replicate RIFE v4.6 (frame interpolation)
 *   upscaleVideo   → Replicate Real-ESRGAN Video (4K upscale)
 *   transcribeVideo→ OpenAI Whisper-1 (audio transcription for Caption Studio)
 *   getAIEngineStatus → Reports which AI engines are live vs unavailable
 *
 * VAULTX ENGINE LAW:
 *   FFmpeg is utility/export only (trim, encode, resize, crop, convert,
 *   watermark, burn captions, compression, final export).
 *   FFmpeg is NEVER presented as AI enhancement, smart beauty, cinematic
 *   intelligence, PPV intelligence, or premium transformation.
 * ============================================================================
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import FormData from "form-data";
import fetch from "node-fetch";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const POLLO_API_KEY = process.env.POLLO_API_KEY || "";

// ─── Replicate helpers ────────────────────────────────────────────────────────
async function replicatePost(endpoint: string, body: object): Promise<any> {
  const resp = await fetch(`https://api.replicate.com/v1/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Token ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Replicate API error: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

async function replicateGet(predictionId: string): Promise<any> {
  const resp = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
  });
  if (!resp.ok) throw new Error(`Replicate poll error: ${resp.status}`);
  return resp.json();
}

// ─── Pollo credit check ───────────────────────────────────────────────────────
async function checkPolloCredits(): Promise<{ available: boolean; reason: string }> {
  if (!POLLO_API_KEY) return { available: false, reason: "POLLO_API_KEY not configured" };
  // Pollo returns 403 FORBIDDEN with "Not enough credits" when balance is 0
  // We detect this by attempting a minimal generation request
  try {
    const resp = await fetch("https://pollo.ai/api/platform/generation/pollo/pollo-v1-6", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": POLLO_API_KEY },
      body: JSON.stringify({ input: { image: "https://example.com/test.jpg", prompt: "test", resolution: "480p", length: 5, mode: "basic" } }),
    });
    const data = await resp.json() as any;
    if (data?.code === "FORBIDDEN" && data?.message?.includes("credits")) {
      return { available: false, reason: "Pollo AI account has insufficient credits — add credits at pollo.ai" };
    }
    if (resp.status === 401 || data?.code === "UNAUTHORIZED") {
      return { available: false, reason: "POLLO_API_KEY is invalid" };
    }
    return { available: true, reason: "ok" };
  } catch {
    return { available: false, reason: "Pollo AI unreachable" };
  }
}

export const videoEnhanceRouter = router({

  // ─── AI Engine Status ───────────────────────────────────────────────────────
  /**
   * Returns which AI engines are live vs unavailable.
   * Used by VaultX panels to show honest "AI engine unavailable" states.
   */
  getAIEngineStatus: protectedProcedure.query(async () => {
    const replicateAvailable = !!REPLICATE_TOKEN;
    const openaiAvailable = !!process.env.OPENAI_API_KEY;
    const polloStatus = await checkPolloCredits();

    return {
      engines: {
        replicate: {
          available: replicateAvailable,
          provider: "Replicate",
          reason: replicateAvailable ? "ok" : "REPLICATE_API_TOKEN not configured",
          powers: ["AI Enhance — Slow Motion (RIFE v4.6)", "AI Enhance — Upscale (Real-ESRGAN)"],
        },
        pollo: {
          available: polloStatus.available,
          provider: "Pollo AI / Kling",
          reason: polloStatus.reason,
          powers: ["Velvet Suite — AI beauty (future)", "Desire Grade — AI cinematic (future)"],
        },
        openai: {
          available: openaiAvailable,
          provider: "OpenAI",
          reason: openaiAvailable ? "ok" : "OPENAI_API_KEY not configured",
          powers: ["Caption Studio — Whisper auto-transcription", "Enhancement Plan — GPT-4o-mini"],
        },
        runway: {
          available: false,
          provider: "Runway",
          reason: "Runway API not configured — no RUNWAY_API_KEY in environment",
          powers: [],
        },
      },
    };
  }),

  // ─── Slow Motion — Replicate RIFE v4.6 ─────────────────────────────────────
  /**
   * AI slow motion via Replicate RIFE v4.6 frame interpolation.
   * Provider: Replicate (lucataco/rife-v4.6)
   * Model version: 4f88a16a13673a8b589c18866e540556170a5bcb2ccdc12de201f9f5a851fad1
   * NOT Runway. NOT FFmpeg.
   */
  slowMotion: protectedProcedure
    .input(z.object({
      videoUrl: z.string(),
      targetFps: z.enum(["60", "120", "240"]).default("60"),
      targetResolution: z.string().optional(),
      enableUpscale: z.boolean().optional(),
      upscaleModel: z.string().optional(),
      crf: z.number().optional(),
      startTime: z.number().optional(),
      maxSeconds: z.number().optional(),
      outputFormat: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured — AI slow motion unavailable");
      const multiplierMap: Record<string, number> = { "60": 2, "120": 4, "240": 8 };
      const multiplier = multiplierMap[input.targetFps] ?? 2;
      const prediction = await replicatePost("predictions", {
        version: "4f88a16a13673a8b589c18866e540556170a5bcb2ccdc12de201f9f5a851fad1",
        input: { video: input.videoUrl, multiplier, fps: parseInt(input.targetFps) },
      });
      return {
        predictionId: prediction.id,
        status: prediction.status,
        provider: "Replicate",
        model: "lucataco/rife-v4.6",
        message: `AI slow motion started — Replicate RIFE v4.6 — ${input.targetFps}fps frame interpolation`,
      };
    }),

  // ─── Upscale Video — Replicate Real-ESRGAN ─────────────────────────────────
  /**
   * AI video upscale via Replicate Real-ESRGAN Video.
   * Provider: Replicate (lucataco/real-esrgan-video)
   * Model version: 3e56ce4b57863bd03048b42bc09bdd4db20d427cca5fde9d8ae4dc60e1bb4775
   * Supports: FHD, 2k, 4k output resolutions.
   */
  upscaleVideo: protectedProcedure
    .input(z.object({
      videoUrl: z.string(),
      resolution: z.enum(["FHD", "2k", "4k"]).default("4k"),
      model: z.enum(["RealESRGAN_x4plus", "RealESRGAN_x4plus_anime_6B", "realesr-animevideov3"]).default("RealESRGAN_x4plus"),
    }))
    .mutation(async ({ input }) => {
      if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured — AI upscale unavailable");
      const prediction = await replicatePost("predictions", {
        version: "3e56ce4b57863bd03048b42bc09bdd4db20d427cca5fde9d8ae4dc60e1bb4775",
        input: {
          video_path: input.videoUrl,
          resolution: input.resolution,
          model: input.model,
        },
      });
      return {
        predictionId: prediction.id,
        status: prediction.status,
        provider: "Replicate",
        model: "lucataco/real-esrgan-video",
        resolution: input.resolution,
        message: `AI upscale started — Replicate Real-ESRGAN — ${input.resolution} output`,
      };
    }),

  // ─── Transcribe Video — OpenAI Whisper-1 ───────────────────────────────────
  /**
   * Auto-transcribe video audio using OpenAI Whisper-1.
   * Used by Caption Studio to generate captions from speech.
   * Provider: OpenAI (whisper-1)
   * Input: video URL (must be accessible) or base64 audio data
   */
  transcribeVideo: protectedProcedure
    .input(z.object({
      videoUrl: z.string(),
      language: z.string().optional(),
      prompt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY not configured — Whisper transcription unavailable");
      }

      // Fetch the video/audio from the URL
      const videoResp = await fetch(input.videoUrl);
      if (!videoResp.ok) throw new Error(`Failed to fetch video for transcription: ${videoResp.status}`);
      const videoBuffer = Buffer.from(await videoResp.arrayBuffer());

      if (videoBuffer.length > 25 * 1024 * 1024) {
        throw new Error("Video file exceeds 25MB limit for Whisper transcription. Trim the video first.");
      }

      // Use OpenAI SDK with a File-like object
      const { File } = await import("node:buffer");
      const file = new File([videoBuffer], "audio.mp4", { type: "video/mp4" });

      const transcription = await openai.audio.transcriptions.create({
        file: file as any,
        model: "whisper-1",
        response_format: "verbose_json",
        language: input.language,
        prompt: input.prompt,
      });

      return {
        text: transcription.text,
        language: (transcription as any).language || input.language || "en",
        duration: (transcription as any).duration || 0,
        segments: (transcription as any).segments || [],
        provider: "OpenAI",
        model: "whisper-1",
      };
    }),

  // ─── Get Job Status — Replicate polling ─────────────────────────────────────
  getJob: protectedProcedure
    .input(z.object({ predictionId: z.string() }))
    .query(async ({ input }) => {
      if (!REPLICATE_TOKEN) return { isComplete: false, status: "error", error: "REPLICATE_API_TOKEN not configured" };
      const prediction = await replicateGet(input.predictionId);
      const isComplete = prediction.status === "succeeded";
      const isFailed = prediction.status === "failed" || prediction.status === "canceled";
      return {
        predictionId: prediction.id,
        status: prediction.status,
        isComplete,
        isFailed,
        outputUrl: isComplete && prediction.output ? prediction.output : null,
        error: isFailed ? (prediction.error || "Processing failed") : null,
        progress: prediction.metrics?.predict_time ? 100 : 0,
        provider: "Replicate",
      };
    }),

  // ─── Enhancement Plan — OpenAI GPT-4o-mini ──────────────────────────────────
  generateEnhancementPlan: protectedProcedure
    .input(z.object({ videoDescription: z.string(), targetQuality: z.string() }))
    .mutation(async ({ input }) => {
      const c = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `Create a video enhancement plan for: ${input.videoDescription}\nTarget quality: ${input.targetQuality}\nRecommend: specific enhancements, order of operations, and expected improvement.` }],
        max_tokens: 400,
      });
      return { plan: c.choices[0].message.content, provider: "OpenAI", model: "gpt-4o-mini" };
    }),

  // ─── Legacy stubs (kept for backward compat) ────────────────────────────────
  enhanceVideo: protectedProcedure
    .input(z.object({ videoUrl: z.string(), enhancements: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => ({
      jobId: Date.now(),
      videoUrl: input.videoUrl,
      enhancements: input.enhancements,
      status: "queued",
      userId: ctx.user.id,
    })),
  getEnhancementOptions: protectedProcedure.query(async () => ({
    options: [
      { id: "upscale", name: "4K Upscale", provider: "Replicate Real-ESRGAN", available: !!REPLICATE_TOKEN },
      { id: "slowmo", name: "Slow Motion", provider: "Replicate RIFE v4.6", available: !!REPLICATE_TOKEN },
      { id: "transcribe", name: "Auto-Transcribe", provider: "OpenAI Whisper-1", available: !!process.env.OPENAI_API_KEY },
      { id: "beauty", name: "Beauty Enhancement", provider: "Pollo AI (requires credits)", available: false },
      { id: "cinematic", name: "Cinematic Grade", provider: "Pollo AI (requires credits)", available: false },
    ],
  })),
  getEnhancementStatus: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input }) => ({ jobId: input.jobId, status: "processing", progress: 0, estimatedTime: "2 minutes" })),
});
