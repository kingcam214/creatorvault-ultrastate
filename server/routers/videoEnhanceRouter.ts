/*
 * VaultX Video Enhance Router — POWER EDITION
 * ============================================================================
 * Full AI Engine Dispatcher — 16 real Replicate models wired.
 *
 * PROVIDER MAP:
 *   getAIEngineStatus     → Reports all AI engine availability
 *   slowMotion            → Replicate bitflow/video-super-resolution-rife-pro (RIFE + upscale combo)
 *   upscaleVideo          → Replicate lucataco/real-esrgan-video (2x/4x upscale)
 *   transcribeVideo       → OpenAI Whisper-1 (audio transcription)
 *   getJob                → Replicate prediction polling
 *   analyzeScene          → OpenAI GPT-4o-mini (scene detection)
 *   analyzePPVMoments     → OpenAI GPT-4o-mini (PPV intelligence)
 *   generateEnhancementPlan → OpenAI GPT-4o-mini
 *   createPremiumVideo    → Whisper → GPT → Real-ESRGAN → FFmpeg
 *   createTeaserPackage   → Whisper → GPT → FFmpeg teaser+thumbnails
 *   createViralClipPack   → Whisper → GPT → FFmpeg clips
 *   generateVideo         → Replicate minimax/video-01 (text/image → video, 699K runs)
 *   generateVideoAlt      → Replicate anotherjesse/zeroscope-v2-xl (text → video)
 *   animateImage          → Replicate minimax/video-01-live (image → animated video)
 *   imageToVideo          → Replicate stability-ai/stable-video-diffusion (image → video)
 *   addAISound            → Replicate zsxkib/mmaudio (video → AI sound, 5.1M runs)
 *   generateMusic         → Replicate meta/musicgen (text → music, 3.3M runs)
 *   beautyEnhance         → Replicate zsxkib/pulid (face-preserving beauty, 4M runs)
 *   faceStyleTransfer     → Replicate fofr/face-to-many (face → 3D/emoji/beauty, 15M runs)
 *   generateCharacter     → Replicate fofr/consistent-character (character consistency, 1.4M runs)
 *   realisticPortrait     → Replicate zsxkib/instant-id (realistic face photos, 1M runs)
 *   photoMakerStyle       → Replicate tencentarc/photomaker (face + style, 9M runs)
 *   generateGif           → Replicate lucataco/hotshot-xl (text → GIF/short video, 930K runs)
 *   enhanceVideo (legacy) → stub
 *   getEnhancementOptions → stub
 *   getEnhancementStatus  → stub
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
import fetch from "node-fetch";
import { exec } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import * as path from "path";
import * as fs from "fs";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import * as os from "os";

const execAsync = promisify(exec);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const POLLO_API_KEY = process.env.POLLO_API_KEY || "";
const BASE_URL = (process.env.APP_URL || "https://creatorvault.live").replace(/\/$/, "");

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

async function replicatePollUntilDone(predictionId: string, maxWaitMs = 600_000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const pred = await replicateGet(predictionId);
    if (pred.status === "succeeded") return pred;
    if (pred.status === "failed" || pred.status === "canceled") {
      throw new Error(`Replicate job ${predictionId} ${pred.status}: ${pred.error || "unknown error"}`);
    }
    await new Promise(r => setTimeout(r, 8000));
  }
  throw new Error(`Replicate job ${predictionId} timed out after ${maxWaitMs / 1000}s`);
}

// ─── Pollo credit check ───────────────────────────────────────────────────────
async function checkPolloCredits(): Promise<{ available: boolean; reason: string }> {
  if (!POLLO_API_KEY) return { available: false, reason: "POLLO_API_KEY not configured" };
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

// ─── FFmpeg utility helpers ───────────────────────────────────────────────────
async function saveFinalOutput(buffer: Buffer, filename: string, subdir = "final-output"): Promise<string> {
  const uuid = randomUUID();
  const dir = path.resolve(process.cwd(), "dist", "public", "uploads", subdir, uuid);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `${BASE_URL}/uploads/${subdir}/${uuid}/${filename}`;
}

async function downloadToTemp(url: string, ext = "mp4"): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `vaultx-dl-${randomUUID()}.${ext}`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download ${url}: ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  await writeFile(tmpPath, buf);
  return tmpPath;
}

async function ffmpegTrim(inputPath: string, start: number, end: number, outExt = "mp4"): Promise<Buffer> {
  const outPath = path.join(os.tmpdir(), `vaultx-trim-${randomUUID()}.${outExt}`);
  const duration = end - start;
  await execAsync(`ffmpeg -y -ss ${start} -i "${inputPath}" -t ${duration} -c:v libx264 -preset fast -crf 23 -c:a aac -y "${outPath}"`);
  const buf = await readFile(outPath);
  unlink(outPath).catch(() => {});
  return buf;
}

async function ffmpegThumbnail(inputPath: string, atSeconds: number): Promise<Buffer> {
  const outPath = path.join(os.tmpdir(), `vaultx-thumb-${randomUUID()}.jpg`);
  await execAsync(`ffmpeg -y -ss ${atSeconds} -i "${inputPath}" -frames:v 1 -q:v 2 "${outPath}"`);
  const buf = await readFile(outPath);
  unlink(outPath).catch(() => {});
  return buf;
}

async function ffmpegCropAspect(inputPath: string, aspect: "9:16" | "1:1" | "16:9"): Promise<Buffer> {
  const outPath = path.join(os.tmpdir(), `vaultx-crop-${randomUUID()}.mp4`);
  const vfMap: Record<string, string> = {
    "9:16": "crop=ih*9/16:ih,scale=1080:1920",
    "1:1":  "crop=min(iw\\,ih):min(iw\\,ih),scale=1080:1080",
    "16:9": "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
  };
  await execAsync(`ffmpeg -y -i "${inputPath}" -vf "${vfMap[aspect]}" -c:v libx264 -preset fast -crf 23 -c:a aac "${outPath}"`);
  const buf = await readFile(outPath);
  unlink(outPath).catch(() => {});
  return buf;
}

// ─── Whisper transcription helper ────────────────────────────────────────────
async function whisperTranscribe(videoUrl: string): Promise<{ text: string; segments: any[]; duration: number }> {
  const resp = await fetch(videoUrl);
  if (!resp.ok) throw new Error(`Failed to fetch video for Whisper: ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length > 25 * 1024 * 1024) {
    return { text: "", segments: [], duration: 0 };
  }
  const { File } = await import("node:buffer");
  const file = new File([buf], "audio.mp4", { type: "video/mp4" });
  const t = await openai.audio.transcriptions.create({
    file: file as any,
    model: "whisper-1",
    response_format: "verbose_json",
  });
  return {
    text: (t as any).text || "",
    segments: (t as any).segments || [],
    duration: (t as any).duration || 0,
  };
}

// ─── GPT-4o-mini helpers ──────────────────────────────────────────────────────
async function gptAnalyzeBestMoments(transcript: string, segments: any[], videoDuration: number, count: number): Promise<any[]> {
  const segCtx = segments.length > 0
    ? `\nTimestamped segments:\n${segments.map((s: any) => `[${s.start}s–${s.end}s]: ${s.text}`).join("\n")}`
    : "";
  const prompt = `You are an expert adult content monetization editor. Analyze this video transcript and identify the ${count} best moments for short clips.\n\nTranscript:${segCtx}\nFull text: ${transcript || "(no speech detected)"}\nVideo duration: ${videoDuration}s\n\nFor each moment provide: start time (seconds), end time (max 60s clip), hook title (5-8 words, punchy), caption text (1 sentence, platform-safe), suggested PPV price (USD).\n\nIf no transcript is available, distribute moments evenly across the video duration.\n\nRespond ONLY with valid JSON array:\n[{"start":0,"end":30,"title":"...","caption":"...","price":9.99}]`;
  const c = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 600,
    response_format: { type: "json_object" },
  });
  try {
    const raw = JSON.parse(c.choices[0].message.content || "{}");
    return Array.isArray(raw) ? raw : (raw.moments || raw.clips || []);
  } catch { return []; }
}

async function gptGenerateHooksAndCaptions(transcript: string, videoTitle: string): Promise<{ hooks: string[]; captions: string[]; cta: string; suggestedPrice: number }> {
  const prompt = `You are a premium adult content copywriter. Generate marketing copy for this video.\n\nTranscript excerpt: ${transcript.slice(0, 500) || "(no speech)"}\nVideo title: ${videoTitle}\n\nGenerate:\n1. Three hook lines (punchy, 8-12 words each, platform-safe)\n2. Three caption options (1-2 sentences, engaging)\n3. One CTA line\n4. Suggested PPV price (USD)\n\nRespond ONLY with valid JSON:\n{"hooks":["...","...","..."],"captions":["...","...","..."],"cta":"...","suggestedPrice":14.99}`;
  const c = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 400,
    response_format: { type: "json_object" },
  });
  try {
    const raw = JSON.parse(c.choices[0].message.content || "{}");
    return {
      hooks: raw.hooks || [],
      captions: raw.captions || [],
      cta: raw.cta || "",
      suggestedPrice: raw.suggestedPrice || 9.99,
    };
  } catch {
    return { hooks: [], captions: [], cta: "", suggestedPrice: 9.99 };
  }
}

// ============================================================================
// ROUTER
// ============================================================================
export const videoEnhanceRouter = router({

  // ─── AI Engine Status ───────────────────────────────────────────────────────
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
          models: [
            "bitflow/video-super-resolution-rife-pro — Slow Motion + Upscale",
            "lucataco/real-esrgan-video — 4K Video Upscale",
            "minimax/video-01 — Text/Image to Video",
            "minimax/video-01-live — Image to Animated Video",
            "stability-ai/stable-video-diffusion — Image to Video",
            "zsxkib/mmaudio — AI Sound Design",
            "meta/musicgen — Music Generation",
            "zsxkib/pulid — Beauty Enhancement (Face-Preserving)",
            "fofr/face-to-many — Face Style Transfer",
            "fofr/consistent-character — Character Consistency",
            "zsxkib/instant-id — Realistic Portrait",
            "tencentarc/photomaker — Photo Style",
            "anotherjesse/zeroscope-v2-xl — Text to Video",
            "lucataco/hotshot-xl — Text to GIF",
            "openai/whisper — Speech to Text",
          ],
        },
        pollo: {
          available: polloStatus.available,
          provider: "Pollo AI / Kling",
          reason: polloStatus.reason,
          models: ["kling-v2-master", "kling-v1-6"],
        },
        openai: {
          available: openaiAvailable,
          provider: "OpenAI",
          reason: openaiAvailable ? "ok" : "OPENAI_API_KEY not configured",
          models: ["whisper-1 — Transcription", "gpt-4o-mini — Analysis/Copy"],
        },
      },
    };
  }),

  // ─── Slow Motion — Replicate RIFE-Pro (slow motion + upscale combo) ─────────
  slowMotion: protectedProcedure
    .input(z.object({
      videoUrl: z.string(),
      targetFps: z.enum(["60", "120", "240"]).default("60"),
      enableUpscale: z.boolean().default(false),
      upscaleModel: z.enum(["realesr-animevideov3", "RealESRGAN_x4plus"]).default("realesr-animevideov3"),
      maxSeconds: z.number().optional(),
      outputFormat: z.enum(["mp4", "gif"]).default("mp4"),
    }))
    .mutation(async ({ input }) => {
      if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured — AI slow motion unavailable");
      const targetFpsNum = parseInt(input.targetFps);
      const prediction = await replicatePost("predictions", {
        version: "067621002a8a290f6fc0dfa0bec9463da94febe29865cbc741afa8622d5b1ab3",
        model: "bitflow/video-super-resolution-rife-pro",
        input: {
          video: input.videoUrl,
          target_fps: targetFpsNum,
          upscale_model: input.enableUpscale ? input.upscaleModel : undefined,
          max_seconds: input.maxSeconds,
          output_format: input.outputFormat,
          fast_mode: false,
        },
      });
      return {
        predictionId: prediction.id,
        status: prediction.status,
        provider: "Replicate",
        model: "bitflow/video-super-resolution-rife-pro",
        message: `AI slow motion started — RIFE-Pro ${input.targetFps}fps${input.enableUpscale ? " + upscale" : ""}`,
      };
    }),

  // ─── Upscale Video — Replicate Real-ESRGAN ─────────────────────────────────
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
        input: { video_path: input.videoUrl, resolution: input.resolution, model: input.model },
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
  transcribeVideo: protectedProcedure
    .input(z.object({
      videoUrl: z.string(),
      language: z.string().optional(),
      prompt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured — Whisper transcription unavailable");
      const videoResp = await fetch(input.videoUrl);
      if (!videoResp.ok) throw new Error(`Failed to fetch video for transcription: ${videoResp.status}`);
      const videoBuffer = Buffer.from(await videoResp.arrayBuffer());
      if (videoBuffer.length > 25 * 1024 * 1024) throw new Error("Video file exceeds 25MB limit for Whisper transcription. Trim the video first.");
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
        outputUrl: isComplete && prediction.output ? (Array.isArray(prediction.output) ? prediction.output[0] : prediction.output) : null,
        error: isFailed ? (prediction.error || "Processing failed") : null,
        progress: prediction.metrics?.predict_time ? 100 : 0,
        provider: "Replicate",
      };
    }),

  // ─── Scene Architect AI ──────────────────────────────────────────────────────
  analyzeScene: protectedProcedure
    .input(z.object({
      transcript: z.string(),
      segments: z.array(z.object({ start: z.number(), end: z.number(), text: z.string() })).optional(),
      videoDuration: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured — AI scene analysis unavailable");
      const segmentContext = input.segments && input.segments.length
        ? `\n\nTimestamped segments:\n${input.segments.map(s => `[${s.start}s–${s.end}s]: ${s.text}`).join("\n")}`
        : "";
      const prompt = `You are a professional video editor analyzing a video transcript for scene detection.\n\nTranscript:${segmentContext}\n\nFull text: ${input.transcript}\n${input.videoDuration ? `Video duration: ${input.videoDuration}s` : ""}\n\nDetect distinct scenes or segments. For each scene provide:\n1. A short descriptive label (3-5 words)\n2. Recommended start time (seconds)\n3. Recommended end time (seconds)\n4. Scene type (intro/action/dialogue/outro/highlight/transition)\n5. Energy level (low/medium/high)\n\nRespond ONLY with valid JSON array:\n[{"label":"...","start":0,"end":15,"type":"intro","energy":"medium","reason":"..."}]`;
      const c = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        response_format: { type: "json_object" },
      });
      let scenes: any[] = [];
      try {
        const raw = JSON.parse(c.choices[0].message.content || "{}");
        scenes = Array.isArray(raw) ? raw : (raw.scenes || raw.segments || []);
      } catch { scenes = []; }
      return {
        scenes,
        provider: "OpenAI",
        model: "gpt-4o-mini",
        sceneCount: scenes.length,
        message: scenes.length > 0 ? `AI detected ${scenes.length} scenes` : "No distinct scenes detected",
      };
    }),

  // ─── PPV Engine AI ───────────────────────────────────────────────────────────
  analyzePPVMoments: protectedProcedure
    .input(z.object({
      transcript: z.string(),
      segments: z.array(z.object({ start: z.number(), end: z.number(), text: z.string() })).optional(),
      videoDuration: z.number().optional(),
      contentType: z.enum(["adult", "fitness", "gaming", "lifestyle", "other"]).default("adult"),
    }))
    .mutation(async ({ input }) => {
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured — AI PPV analysis unavailable");
      const segmentContext = input.segments && input.segments.length > 0
        ? `\n\nTimestamped segments:\n${input.segments.map(s => `[${s.start}s–${s.end}s]: ${s.text}`).join("\n")}`
        : "";
      const prompt = `You are a PPV content monetization expert analyzing a video for best clip moments.\n\nContent type: ${input.contentType}\nTranscript:${segmentContext}\nFull text: ${input.transcript}\n${input.videoDuration ? `Video duration: ${input.videoDuration}s` : ""}\n\nAnalyze and provide:\n1. Top 3 best moments for PPV clips\n2. For each moment: start time, end time, hook title, suggested PPV price (USD), reason\n3. Overall video title suggestion\n4. Overall pricing recommendation\n5. Platform recommendation\n\nRespond ONLY with valid JSON:\n{"moments":[{"start":0,"end":30,"title":"...","hook":"...","price":9.99,"reason":"..."}],"videoTitle":"...","suggestedPrice":14.99,"platform":"OnlyFans","strategy":"..."}`;
      const c = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        response_format: { type: "json_object" },
      });
      let result: any = {};
      try { result = JSON.parse(c.choices[0].message.content || "{}"); } catch { result = {}; }
      return {
        moments: result.moments || [],
        videoTitle: result.videoTitle || "Untitled",
        suggestedPrice: result.suggestedPrice || 9.99,
        platform: result.platform || "OnlyFans",
        strategy: result.strategy || "",
        provider: "OpenAI",
        model: "gpt-4o-mini",
        message: result.moments?.length > 0
          ? `AI detected ${result.moments.length} best moments`
          : "No distinct moments detected",
      };
    }),

  // ─── Enhancement Plan ────────────────────────────────────────────────────────
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

  // ============================================================================
  // FINAL OUTPUT ENGINE
  // ============================================================================

  createPremiumVideo: protectedProcedure
    .input(z.object({
      videoUrl: z.string().url(),
      enableUpscale: z.boolean().default(true),
      enableSlowMo: z.boolean().default(false),
      targetResolution: z.enum(["FHD", "2k", "4k"]).default("4k"),
    }))
    .mutation(async ({ input }) => {
      const jobId = randomUUID();
      const enginesUsed: any[] = [];
      const errors: string[] = [];

      let transcript = { text: "", segments: [] as any[], duration: 0 };
      try {
        transcript = await whisperTranscribe(input.videoUrl);
        enginesUsed.push({ engine: "OpenAI Whisper-1", purpose: "Audio transcription", status: "succeeded", fallbackUsed: false });
      } catch (e: any) {
        errors.push(`Whisper: ${e.message}`);
        enginesUsed.push({ engine: "OpenAI Whisper-1", purpose: "Audio transcription", status: "failed", fallbackUsed: true });
      }

      let copy = { hooks: [] as string[], captions: [] as string[], cta: "", suggestedPrice: 14.99 };
      try {
        copy = await gptGenerateHooksAndCaptions(transcript.text, "Premium Video");
        enginesUsed.push({ engine: "OpenAI GPT-4o-mini", purpose: "Hook/caption generation", status: "succeeded", fallbackUsed: false });
      } catch (e: any) {
        errors.push(`GPT: ${e.message}`);
        enginesUsed.push({ engine: "OpenAI GPT-4o-mini", purpose: "Hook/caption generation", status: "failed", fallbackUsed: true });
      }

      let premiumVideoUrl = input.videoUrl;
      let upscalePredictionId: string | null = null;
      if (input.enableUpscale && REPLICATE_TOKEN) {
        try {
          const pred = await replicatePost("predictions", {
            version: "3e56ce4b57863bd03048b42bc09bdd4db20d427cca5fde9d8ae4dc60e1bb4775",
            input: { video_path: input.videoUrl, resolution: input.targetResolution, model: "RealESRGAN_x4plus" },
          });
          upscalePredictionId = pred.id;
          const done = await replicatePollUntilDone(pred.id);
          premiumVideoUrl = Array.isArray(done.output) ? done.output[0] : done.output;
          enginesUsed.push({ engine: "Replicate Real-ESRGAN", purpose: `Video upscale to ${input.targetResolution}`, status: "succeeded", providerJobId: pred.id, fallbackUsed: false });
        } catch (e: any) {
          errors.push(`Replicate ESRGAN: ${e.message}`);
          enginesUsed.push({ engine: "Replicate Real-ESRGAN", purpose: "Video upscale", status: "failed", fallbackUsed: true });
        }
      }

      let finalUrl = premiumVideoUrl;
      try {
        const tmpIn = await downloadToTemp(premiumVideoUrl);
        const tmpOut = path.join(os.tmpdir(), `vaultx-premium-${randomUUID()}.mp4`);
        await execAsync(`ffmpeg -y -i "${tmpIn}" -c:v libx264 -preset fast -crf 20 -c:a aac -b:a 192k "${tmpOut}"`);
        const buf = await readFile(tmpOut);
        finalUrl = await saveFinalOutput(buf, "premium-video.mp4");
        unlink(tmpIn).catch(() => {});
        unlink(tmpOut).catch(() => {});
        enginesUsed.push({ engine: "FFmpeg", purpose: "Final encode/compress (utility only)", status: "succeeded", fallbackUsed: false });
      } catch (e: any) {
        errors.push(`FFmpeg encode: ${e.message}`);
        enginesUsed.push({ engine: "FFmpeg", purpose: "Final encode", status: "failed", fallbackUsed: false });
      }

      return {
        jobId,
        status: errors.length === 0 ? "succeeded" : "partial",
        sourceUrl: input.videoUrl,
        outputs: {
          premiumVideoUrl: finalUrl,
          beforeUrl: input.videoUrl,
          hooks: copy.hooks,
          captions: copy.captions,
          cta: copy.cta,
          suggestedPrice: copy.suggestedPrice,
          transcript: transcript.text,
          upscalePredictionId,
        },
        enginesUsed,
        errors: errors.length > 0 ? errors : undefined,
      };
    }),

  createTeaserPackage: protectedProcedure
    .input(z.object({
      videoUrl: z.string().url(),
      teaserDuration: z.number().default(30),
    }))
    .mutation(async ({ input }) => {
      const jobId = randomUUID();
      const enginesUsed: any[] = [];
      const errors: string[] = [];

      let transcript = { text: "", segments: [] as any[], duration: 0 };
      try {
        transcript = await whisperTranscribe(input.videoUrl);
        enginesUsed.push({ engine: "OpenAI Whisper-1", purpose: "Audio transcription", status: "succeeded", fallbackUsed: false });
      } catch (e: any) {
        errors.push(`Whisper: ${e.message}`);
        enginesUsed.push({ engine: "OpenAI Whisper-1", purpose: "Audio transcription", status: "failed", fallbackUsed: true });
      }

      let moments: any[] = [];
      let copy = { hooks: [] as string[], captions: [] as string[], cta: "", suggestedPrice: 9.99 };
      try {
        moments = await gptAnalyzeBestMoments(transcript.text, transcript.segments, transcript.duration || 60, 1);
        copy = await gptGenerateHooksAndCaptions(transcript.text, "Teaser Package");
        enginesUsed.push({ engine: "OpenAI GPT-4o-mini", purpose: "Best-moment detection + copy generation", status: "succeeded", fallbackUsed: false });
      } catch (e: any) {
        errors.push(`GPT: ${e.message}`);
        enginesUsed.push({ engine: "OpenAI GPT-4o-mini", purpose: "Best-moment detection", status: "failed", fallbackUsed: true });
        moments = [{ start: 0, end: Math.min(input.teaserDuration, 30), title: "Preview", caption: "Watch the full video", price: 9.99 }];
      }

      const teaserMoment = moments[0] || { start: 0, end: input.teaserDuration };
      const teaserStart = teaserMoment.start || 0;
      const teaserEnd = Math.min(teaserMoment.end || input.teaserDuration, teaserStart + input.teaserDuration);

      let teaserUrl = input.videoUrl;
      let fullVideoUrl = input.videoUrl;
      const thumbnails: string[] = [];

      try {
        const tmpIn = await downloadToTemp(input.videoUrl);
        const teaserBuf = await ffmpegTrim(tmpIn, teaserStart, teaserEnd);
        teaserUrl = await saveFinalOutput(teaserBuf, "teaser.mp4", "final-output");

        const fullOut = path.join(os.tmpdir(), `vaultx-full-${randomUUID()}.mp4`);
        await execAsync(`ffmpeg -y -i "${tmpIn}" -c:v libx264 -preset fast -crf 22 -c:a aac "${fullOut}"`);
        const fullBuf = await readFile(fullOut);
        fullVideoUrl = await saveFinalOutput(fullBuf, "full-video.mp4", "final-output");
        unlink(fullOut).catch(() => {});

        const probeResult = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${tmpIn}"`).catch(() => ({ stdout: "60" }));
        const vidDuration = parseFloat(probeResult.stdout.trim()) || 60;
        const thumbTimes = [0, vidDuration * 0.25, vidDuration * 0.5, vidDuration * 0.75];
        for (const t of thumbTimes) {
          try {
            const thumbBuf = await ffmpegThumbnail(tmpIn, Math.floor(t));
            const thumbUrl = await saveFinalOutput(thumbBuf, `thumb-${Math.floor(t)}s.jpg`, "final-output");
            thumbnails.push(thumbUrl);
          } catch { /* skip */ }
        }

        unlink(tmpIn).catch(() => {});
        enginesUsed.push({ engine: "FFmpeg", purpose: "Teaser cut + full encode + thumbnails (utility only)", status: "succeeded", fallbackUsed: false });
      } catch (e: any) {
        errors.push(`FFmpeg: ${e.message}`);
        enginesUsed.push({ engine: "FFmpeg", purpose: "Teaser/thumbnail processing", status: "failed", fallbackUsed: false });
      }

      return {
        jobId,
        status: errors.length === 0 ? "succeeded" : "partial",
        sourceUrl: input.videoUrl,
        outputs: {
          teaserUrl,
          fullVideoUrl,
          thumbnails,
          hooks: copy.hooks,
          captions: copy.captions,
          cta: copy.cta,
          suggestedPrice: moments[0]?.price || copy.suggestedPrice,
          teaserTitle: moments[0]?.title || "Preview Clip",
          transcript: transcript.text,
          metadata: { teaserStart, teaserEnd, teaserDuration: teaserEnd - teaserStart },
        },
        enginesUsed,
        errors: errors.length > 0 ? errors : undefined,
      };
    }),

  createViralClipPack: protectedProcedure
    .input(z.object({
      videoUrl: z.string().url(),
      clipCount: z.number().min(3).max(5).default(3),
      aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
    }))
    .mutation(async ({ input }) => {
      const jobId = randomUUID();
      const enginesUsed: any[] = [];
      const errors: string[] = [];

      let transcript = { text: "", segments: [] as any[], duration: 0 };
      try {
        transcript = await whisperTranscribe(input.videoUrl);
        enginesUsed.push({ engine: "OpenAI Whisper-1", purpose: "Audio transcription", status: "succeeded", fallbackUsed: false });
      } catch (e: any) {
        errors.push(`Whisper: ${e.message}`);
        enginesUsed.push({ engine: "OpenAI Whisper-1", purpose: "Audio transcription", status: "failed", fallbackUsed: true });
      }

      let moments: any[] = [];
      try {
        moments = await gptAnalyzeBestMoments(transcript.text, transcript.segments, transcript.duration || 60, input.clipCount);
        enginesUsed.push({ engine: "OpenAI GPT-4o-mini", purpose: `${input.clipCount} best-moment detection`, status: "succeeded", fallbackUsed: false });
      } catch (e: any) {
        errors.push(`GPT: ${e.message}`);
        enginesUsed.push({ engine: "OpenAI GPT-4o-mini", purpose: "Moment detection", status: "failed", fallbackUsed: true });
        const vidDur = transcript.duration || 60;
        const clipDur = Math.floor(vidDur / input.clipCount);
        moments = Array.from({ length: input.clipCount }, (_, i) => ({
          start: i * clipDur,
          end: Math.min((i + 1) * clipDur, vidDur),
          title: `Clip ${i + 1}`,
          caption: `Highlight ${i + 1}`,
          price: 9.99,
        }));
      }

      const clips: any[] = [];
      let tmpIn: string | null = null;
      try {
        tmpIn = await downloadToTemp(input.videoUrl);
        for (let i = 0; i < Math.min(moments.length, input.clipCount); i++) {
          const m = moments[i];
          const start = Math.max(0, m.start || 0);
          const end = Math.min(m.end || start + 30, start + 60);
          if (end <= start) continue;
          try {
            let clipBuf: Buffer;
            if (input.aspectRatio !== "16:9") {
              const tmpClip = path.join(os.tmpdir(), `vaultx-clip-raw-${randomUUID()}.mp4`);
              const clipRaw = await ffmpegTrim(tmpIn, start, end);
              await writeFile(tmpClip, clipRaw);
              clipBuf = await ffmpegCropAspect(tmpClip, input.aspectRatio);
              unlink(tmpClip).catch(() => {});
            } else {
              clipBuf = await ffmpegTrim(tmpIn, start, end);
            }
            const clipUrl = await saveFinalOutput(clipBuf, `clip-${i + 1}.mp4`, "final-output");
            clips.push({
              index: i + 1,
              url: clipUrl,
              title: m.title || `Clip ${i + 1}`,
              caption: m.caption || "",
              hook: m.title || `Clip ${i + 1}`,
              price: m.price || 9.99,
              start, end,
              duration: end - start,
              aspectRatio: input.aspectRatio,
            });
          } catch (e: any) {
            errors.push(`Clip ${i + 1}: ${e.message}`);
          }
        }
        if (tmpIn) unlink(tmpIn).catch(() => {});
        enginesUsed.push({ engine: "FFmpeg", purpose: `${clips.length} clip cuts (utility only)`, status: clips.length > 0 ? "succeeded" : "failed", fallbackUsed: false });
      } catch (e: any) {
        errors.push(`FFmpeg: ${e.message}`);
        enginesUsed.push({ engine: "FFmpeg", purpose: "Clip cutting", status: "failed", fallbackUsed: false });
        if (tmpIn) unlink(tmpIn).catch(() => {});
      }

      return {
        jobId,
        status: clips.length > 0 ? (errors.length === 0 ? "succeeded" : "partial") : "failed",
        sourceUrl: input.videoUrl,
        outputs: { clips, clipCount: clips.length, aspectRatio: input.aspectRatio, transcript: transcript.text },
        enginesUsed,
        errors: errors.length > 0 ? errors : undefined,
      };
    }),

  // ============================================================================
  // AI VIDEO GENERATOR — MiniMax + Zeroscope + DAMO
  // ============================================================================

  // ─── Generate Video — MiniMax video-01 (text/image → 6s video, 699K runs) ───
  generateVideo: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1).max(1000),
      firstFrameImage: z.string().url().optional(),
      subjectReference: z.string().url().optional(),
      promptOptimizer: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured");
      const prediction = await replicatePost("predictions", {
        model: "minimax/video-01",
        input: {
          prompt: input.prompt,
          prompt_optimizer: input.promptOptimizer,
          ...(input.firstFrameImage ? { first_frame_image: input.firstFrameImage } : {}),
          ...(input.subjectReference ? { subject_reference: input.subjectReference } : {}),
        },
      });
      return {
        predictionId: prediction.id,
        status: prediction.status,
        provider: "Replicate",
        model: "minimax/video-01",
        message: "AI video generation started — MiniMax Hailuo — 6s video",
      };
    }),

  // ─── Animate Image — MiniMax video-01-live (image → animated video) ─────────
  animateImage: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      prompt: z.string().min(1).max(500),
      promptOptimizer: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured");
      const prediction = await replicatePost("predictions", {
        model: "minimax/video-01-live",
        input: {
          first_frame_image: input.imageUrl,
          prompt: input.prompt,
          prompt_optimizer: input.promptOptimizer,
        },
      });
      return {
        predictionId: prediction.id,
        status: prediction.status,
        provider: "Replicate",
        model: "minimax/video-01-live",
        message: "Image animation started — MiniMax Live2D",
      };
    }),

  // ─── Image to Video — Stable Video Diffusion (image → video) ────────────────
  imageToVideo: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      motionBucketId: z.number().min(1).max(255).default(127),
      fps: z.number().min(5).max(30).default(24),
      condAug: z.number().min(0).max(1).default(0.02),
    }))
    .mutation(async ({ input }) => {
      if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured");
      const prediction = await replicatePost("predictions", {
        version: "3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
        input: {
          input_image: input.imageUrl,
          motion_bucket_id: input.motionBucketId,
          frames_per_second: input.fps,
          cond_aug: input.condAug,
          video_length: "14_frames_with_svd",
          sizing_strategy: "maintain_aspect_ratio",
        },
      });
      return {
        predictionId: prediction.id,
        status: prediction.status,
        provider: "Replicate",
        model: "stability-ai/stable-video-diffusion",
        message: "Image-to-video started — Stable Video Diffusion",
      };
    }),

  // ─── Text to Video — Zeroscope XL ───────────────────────────────────────────
  generateVideoAlt: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1).max(500),
      negativePrompt: z.string().optional(),
      fps: z.number().min(8).max(24).default(24),
      width: z.number().default(576),
      height: z.number().default(320),
      numFrames: z.number().min(16).max(200).default(24),
    }))
    .mutation(async ({ input }) => {
      if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured");
      const prediction = await replicatePost("predictions", {
        version: "9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351",
        model: "anotherjesse/zeroscope-v2-xl",
        input: {
          prompt: input.prompt,
          fps: input.fps,
          width: input.width,
          height: input.height,
          batch_size: 1,
        },
      });
      return {
        predictionId: prediction.id,
        status: prediction.status,
        provider: "Replicate",
        model: "anotherjesse/zeroscope-v2-xl",
        message: "Text-to-video started — Zeroscope XL",
      };
    }),

  // ─── Generate GIF — Hotshot-XL (text → GIF/short video) ─────────────────────
  generateGif: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1).max(500),
      negativePrompt: z.string().optional(),
      width: z.number().default(672),
      height: z.number().default(384),
      steps: z.number().min(1).max(50).default(30),
      outputMp4: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured");
      const prediction = await replicatePost("predictions", {
        version: "78b3a6257e16e4b241245d65c8b2b81ea2e1ff7ed4c55306b511509ddbfd327a",
        model: "lucataco/hotshot-xl",
        input: {
          prompt: input.prompt,
          negative_prompt: input.negativePrompt,
          width: input.width,
          height: input.height,
          steps: input.steps,
          mp4: input.outputMp4,
        },
      });
      return {
        predictionId: prediction.id,
        status: prediction.status,
        provider: "Replicate",
        model: "lucataco/hotshot-xl",
        message: "AI GIF/video generation started — Hotshot-XL",
      };
    }),

  // ============================================================================
  // AI SOUND STUDIO
  // ============================================================================

  // ─── Add AI Sound — MMAudio (video → AI sound design, 5.1M runs) ────────────
  addAISound: protectedProcedure
    .input(z.object({
      videoUrl: z.string().url(),
      prompt: z.string().min(1).max(500),
      negativePrompt: z.string().optional(),
      duration: z.number().min(1).max(30).default(8),
      numSteps: z.number().min(1).max(100).default(25),
      cfgStrength: z.number().min(1).max(20).default(4.5),
    }))
    .mutation(async ({ input }) => {
      if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured");
      const prediction = await replicatePost("predictions", {
        version: "62871fb59889b2d7c13777f08deb3b36bdff88f7e1d53a50ad7694548a41b484",
        model: "zsxkib/mmaudio",
        input: {
          video: input.videoUrl,
          prompt: input.prompt,
          negative_prompt: input.negativePrompt,
          duration: input.duration,
          num_steps: input.numSteps,
          cfg_strength: input.cfgStrength,
        },
      });
      return {
        predictionId: prediction.id,
        status: prediction.status,
        provider: "Replicate",
        model: "zsxkib/mmaudio",
        message: "AI sound design started — MMAudio V2",
      };
    }),

  // ─── Generate Music — MusicGen (text → music, 3.3M runs) ────────────────────
  generateMusic: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1).max(500),
      duration: z.number().min(5).max(30).default(15),
      inputAudio: z.string().url().optional(),
      continuation: z.boolean().default(false),
      topK: z.number().default(250),
      topP: z.number().default(0),
      temperature: z.number().default(1),
    }))
    .mutation(async ({ input }) => {
      if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured");
      const prediction = await replicatePost("predictions", {
        version: "671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
        model: "meta/musicgen",
        input: {
          prompt: input.prompt,
          duration: input.duration,
          top_k: input.topK,
          top_p: input.topP,
          temperature: input.temperature,
          ...(input.inputAudio ? { input_audio: input.inputAudio, continuation: input.continuation } : {}),
        },
      });
      return {
        predictionId: prediction.id,
        status: prediction.status,
        provider: "Replicate",
        model: "meta/musicgen",
        message: "Music generation started — Meta MusicGen",
      };
    }),

  // ============================================================================
  // FACE STUDIO
  // ============================================================================

  // ─── Beauty Enhance — PuLID (face-preserving beauty, 4M runs) ───────────────
  beautyEnhance: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      prompt: z.string().min(1).max(500),
      negativePrompt: z.string().optional(),
      numSteps: z.number().min(1).max(100).default(20),
      numSamples: z.number().min(1).max(4).default(1),
      cfgScale: z.number().min(1).max(20).default(1.2),
      imageWidth: z.number().default(896),
      imageHeight: z.number().default(1152),
    }))
    .mutation(async ({ input }) => {
      if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured");
      const prediction = await replicatePost("predictions", {
        version: "43d309c37ab4e62361e5e29b8e9e867fb2dcbcec77ae91206a8d95ac5dd451a0",
        model: "zsxkib/pulid",
        input: {
          image: input.imageUrl,
          prompt: input.prompt,
          negative_prompt: input.negativePrompt,
          num_steps: input.numSteps,
          num_samples: input.numSamples,
          cfg_scale: input.cfgScale,
          image_width: input.imageWidth,
          image_height: input.imageHeight,
        },
      });
      return {
        predictionId: prediction.id,
        status: prediction.status,
        provider: "Replicate",
        model: "zsxkib/pulid",
        message: "AI beauty enhancement started — PuLID face-preserving",
      };
    }),

  // ─── Face Style Transfer — Face-to-Many (15M runs) ───────────────────────────
  faceStyleTransfer: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      style: z.enum(["3D", "Emoji", "Video game", "Pixels", "Clay", "Toy", "Realistic"]).default("Realistic"),
      prompt: z.string().optional(),
      loraScale: z.number().min(0).max(1).default(0.6),
      promptStrength: z.number().min(0).max(1).default(4.5),
    }))
    .mutation(async ({ input }) => {
      if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured");
      const prediction = await replicatePost("predictions", {
        version: "a07f252abbbd832009640b27f063ea52d87d7a23a185ca165bec23b5adc8deaf",
        model: "fofr/face-to-many",
        input: {
          image: input.imageUrl,
          style: input.style,
          prompt: input.prompt || `a person in ${input.style} style`,
          lora_scale: input.loraScale,
          prompt_strength: input.promptStrength,
        },
      });
      return {
        predictionId: prediction.id,
        status: prediction.status,
        provider: "Replicate",
        model: "fofr/face-to-many",
        message: `Face style transfer started — ${input.style} style`,
      };
    }),

  // ─── Generate Character — Consistent Character (1.4M runs) ──────────────────
  generateCharacter: protectedProcedure
    .input(z.object({
      subjectImageUrl: z.string().url(),
      prompt: z.string().min(1).max(500),
      negativePrompt: z.string().optional(),
      numOutputs: z.number().min(1).max(4).default(3),
      randomisePoses: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured");
      const prediction = await replicatePost("predictions", {
        version: "9c77a3c2f884193fcee4d89645f02a0b9def9434f9e03cb98460456b831c8772",
        model: "fofr/consistent-character",
        input: {
          subject: input.subjectImageUrl,
          prompt: input.prompt,
          negative_prompt: input.negativePrompt,
          number_of_outputs: input.numOutputs,
          randomise_poses: input.randomisePoses,
          output_format: "webp",
          output_quality: 80,
        },
      });
      return {
        predictionId: prediction.id,
        status: prediction.status,
        provider: "Replicate",
        model: "fofr/consistent-character",
        message: `Character generation started — ${input.numOutputs} poses`,
      };
    }),

  // ─── Realistic Portrait — Instant-ID (1M runs) ───────────────────────────────
  realisticPortrait: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      prompt: z.string().min(1).max(500),
      negativePrompt: z.string().optional(),
      numOutputs: z.number().min(1).max(4).default(1),
      enableLcm: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured");
      const prediction = await replicatePost("predictions", {
        version: "2e4785a4d80dadf580077b2244c8d7c05d8e3faac04a04c02d8e099dd2876789",
        model: "zsxkib/instant-id",
        input: {
          image: input.imageUrl,
          prompt: input.prompt,
          negative_prompt: input.negativePrompt,
          num_outputs: input.numOutputs,
          enable_lcm: input.enableLcm,
        },
      });
      return {
        predictionId: prediction.id,
        status: prediction.status,
        provider: "Replicate",
        model: "zsxkib/instant-id",
        message: "Realistic portrait generation started — Instant-ID",
      };
    }),

  // ─── PhotoMaker Style — PhotoMaker (9M runs) ─────────────────────────────────
  photoMakerStyle: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      prompt: z.string().min(1).max(500),
      styleName: z.enum(["(No style)", "Cinematic", "Disney Charactor", "Digital Art", "Photographic (Default)", "Fantasy art", "Neonpunk", "Enhance", "Comic book", "Lowpoly", "Line art"]).default("Cinematic"),
      numSteps: z.number().min(20).max(100).default(50),
      numOutputs: z.number().min(1).max(4).default(1),
    }))
    .mutation(async ({ input }) => {
      if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured");
      const prediction = await replicatePost("predictions", {
        version: "ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4",
        model: "tencentarc/photomaker",
        input: {
          input_image: input.imageUrl,
          prompt: input.prompt,
          style_name: input.styleName,
          num_steps: input.numSteps,
          num_outputs: input.numOutputs,
        },
      });
      return {
        predictionId: prediction.id,
        status: prediction.status,
        provider: "Replicate",
        model: "tencentarc/photomaker",
        message: `PhotoMaker style started — ${input.styleName}`,
      };
    }),

  // ─── Legacy stubs ────────────────────────────────────────────────────────────
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
      { id: "slowmo", name: "Slow Motion", provider: "Replicate RIFE-Pro", available: !!REPLICATE_TOKEN },
      { id: "transcribe", name: "Auto-Transcribe", provider: "OpenAI Whisper-1", available: !!process.env.OPENAI_API_KEY },
      { id: "generate", name: "AI Video Generation", provider: "Replicate MiniMax", available: !!REPLICATE_TOKEN },
      { id: "sound", name: "AI Sound Design", provider: "Replicate MMAudio", available: !!REPLICATE_TOKEN },
      { id: "beauty", name: "Beauty Enhancement", provider: "Replicate PuLID", available: !!REPLICATE_TOKEN },
    ],
  })),
  getEnhancementStatus: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input }) => ({ jobId: input.jobId, status: "processing", progress: 0, estimatedTime: "2 minutes" })),
});
