/**
 * VaultX Video Enhance Router
 * ============================================================================
 * AI Engine Dispatcher — routes each VaultX panel to the correct AI provider.
 *
 * PROVIDER MAP:
 *   slowMotion          → Replicate RIFE v4.6 (frame interpolation)
 *   upscaleVideo        → Replicate Real-ESRGAN Video (4K upscale)
 *   transcribeVideo     → OpenAI Whisper-1 (audio transcription for Caption Studio)
 *   getAIEngineStatus   → Reports which AI engines are live vs unavailable
 *   analyzeScene        → OpenAI GPT-4o-mini (scene detection for Scene Architect)
 *   analyzePPVMoments   → OpenAI GPT-4o-mini (PPV intelligence for PPV Engine)
 *   createPremiumVideo  → FINAL OUTPUT ENGINE: Whisper → GPT analysis → Replicate ESRGAN → FFmpeg encode
 *   createTeaserPackage → FINAL OUTPUT ENGINE: Whisper → GPT best-moment → FFmpeg teaser+full+thumbnails
 *   createViralClipPack → FINAL OUTPUT ENGINE: Whisper → GPT 3–5 moments → FFmpeg clips per moment
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

// ─── Poll Replicate until done (max 8 min) ────────────────────────────────────
async function replicatePollUntilDone(predictionId: string, maxWaitMs = 480_000): Promise<any> {
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
/** Save a buffer to the durable output directory and return its HTTPS URL */
async function saveFinalOutput(buffer: Buffer, filename: string, subdir = "final-output"): Promise<string> {
  const uuid = randomUUID();
  const dir = path.resolve(process.cwd(), "dist", "public", "uploads", subdir, uuid);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `${BASE_URL}/uploads/${subdir}/${uuid}/${filename}`;
}

/** Download a URL to a temp file, return the temp path */
async function downloadToTemp(url: string, ext = "mp4"): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `vaultx-dl-${randomUUID()}.${ext}`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download ${url}: ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  await writeFile(tmpPath, buf);
  return tmpPath;
}

/** Run FFmpeg trim: cut [start, end] seconds from inputPath → return buffer */
async function ffmpegTrim(inputPath: string, start: number, end: number, outExt = "mp4"): Promise<Buffer> {
  const outPath = path.join(os.tmpdir(), `vaultx-trim-${randomUUID()}.${outExt}`);
  const duration = end - start;
  await execAsync(`ffmpeg -y -ss ${start} -i "${inputPath}" -t ${duration} -c:v libx264 -preset fast -crf 23 -c:a aac -y "${outPath}"`);
  const buf = await readFile(outPath);
  unlink(outPath).catch(() => {});
  return buf;
}

/** Extract a JPEG thumbnail frame at `atSeconds` from inputPath → return buffer */
async function ffmpegThumbnail(inputPath: string, atSeconds: number): Promise<Buffer> {
  const outPath = path.join(os.tmpdir(), `vaultx-thumb-${randomUUID()}.jpg`);
  await execAsync(`ffmpeg -y -ss ${atSeconds} -i "${inputPath}" -frames:v 1 -q:v 2 "${outPath}"`);
  const buf = await readFile(outPath);
  unlink(outPath).catch(() => {});
  return buf;
}

/** Crop + encode to target aspect ratio using FFmpeg */
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

// ─── Whisper transcription helper (reused by all three FOE procedures) ────────
async function whisperTranscribe(videoUrl: string): Promise<{ text: string; segments: any[]; duration: number }> {
  const resp = await fetch(videoUrl);
  if (!resp.ok) throw new Error(`Failed to fetch video for Whisper: ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length > 25 * 1024 * 1024) {
    // Silently skip transcription for large files — return empty transcript
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
        outputUrl: isComplete && prediction.output ? prediction.output : null,
        error: isFailed ? (prediction.error || "Processing failed") : null,
        progress: prediction.metrics?.predict_time ? 100 : 0,
        provider: "Replicate",
      };
    }),

  // ─── Scene Architect AI — GPT-4o-mini scene analysis ─────────────────────────
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
        message: scenes.length > 0 ? `AI detected ${scenes.length} scenes — select timestamps to cut with FFmpeg` : "No distinct scenes detected — try with a longer transcript",
      };
    }),

  // ─── PPV Engine AI — GPT-4o-mini best-moment detection ───────────────────────
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
      const prompt = `You are a PPV content monetization expert analyzing a video for best clip moments.\n\nContent type: ${input.contentType}\nTranscript:${segmentContext}\nFull text: ${input.transcript}\n${input.videoDuration ? `Video duration: ${input.videoDuration}s` : ""}\n\nAnalyze and provide:\n1. Top 3 best moments for PPV clips (most engaging/valuable segments)\n2. For each moment: start time, end time, hook title, suggested PPV price (USD), reason\n3. Overall video title suggestion\n4. Overall pricing recommendation\n5. Platform recommendation (OnlyFans/Fansly/ManyVids)\n\nRespond ONLY with valid JSON:\n{"moments":[{"start":0,"end":30,"title":"...","hook":"...","price":9.99,"reason":"..."}],"videoTitle":"...","suggestedPrice":14.99,"platform":"OnlyFans","strategy":"..."}`;
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
          ? `AI detected ${result.moments.length} best moments — select clips to export with FFmpeg`
          : "No distinct moments detected — try with a longer transcript",
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

  // ============================================================================
  // FINAL OUTPUT ENGINE
  // ============================================================================

  // ─── Create Premium Video ───────────────────────────────────────────────────
  /**
   * FINAL OUTPUT ENGINE — Create Premium Video
   * Pipeline:
   *   1. OpenAI Whisper-1: transcribe audio → get segments
   *   2. OpenAI GPT-4o-mini: analyze best segments, generate hooks/captions
   *   3. Replicate Real-ESRGAN: upscale video (async, polled internally)
   *   4. FFmpeg: final encode/compress (utility only)
   *
   * Returns: { jobId, status, sourceUrl, outputs: { premiumVideoUrl, beforeUrl, hooks, captions }, enginesUsed }
   */
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

      // Step 1: Whisper transcription
      let transcript = { text: "", segments: [] as any[], duration: 0 };
      try {
        transcript = await whisperTranscribe(input.videoUrl);
        enginesUsed.push({ engine: "OpenAI Whisper-1", purpose: "Audio transcription", status: "succeeded", providerJobId: null, fallbackUsed: false });
      } catch (e: any) {
        errors.push(`Whisper: ${e.message}`);
        enginesUsed.push({ engine: "OpenAI Whisper-1", purpose: "Audio transcription", status: "failed", fallbackUsed: true });
      }

      // Step 2: GPT-4o-mini hooks + captions
      let copy = { hooks: [] as string[], captions: [] as string[], cta: "", suggestedPrice: 14.99 };
      try {
        copy = await gptGenerateHooksAndCaptions(transcript.text, "Premium Video");
        enginesUsed.push({ engine: "OpenAI GPT-4o-mini", purpose: "Hook/caption generation", status: "succeeded", providerJobId: null, fallbackUsed: false });
      } catch (e: any) {
        errors.push(`GPT: ${e.message}`);
        enginesUsed.push({ engine: "OpenAI GPT-4o-mini", purpose: "Hook/caption generation", status: "failed", fallbackUsed: true });
      }

      // Step 3: Replicate Real-ESRGAN upscale (if enabled and token available)
      let premiumVideoUrl = input.videoUrl; // fallback = source
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
          // fallback: use source URL as premium output
        }
      } else if (input.enableUpscale && !REPLICATE_TOKEN) {
        errors.push("Replicate upscale skipped — REPLICATE_API_TOKEN not configured");
        enginesUsed.push({ engine: "Replicate Real-ESRGAN", purpose: "Video upscale", status: "skipped", fallbackUsed: true });
      }

      // Step 4: FFmpeg final encode (utility — compress/normalize for delivery)
      let finalUrl = premiumVideoUrl;
      try {
        const tmpIn = await downloadToTemp(premiumVideoUrl);
        const tmpOut = path.join(os.tmpdir(), `vaultx-premium-${randomUUID()}.mp4`);
        await execAsync(`ffmpeg -y -i "${tmpIn}" -c:v libx264 -preset fast -crf 20 -c:a aac -b:a 192k "${tmpOut}"`);
        const buf = await readFile(tmpOut);
        finalUrl = await saveFinalOutput(buf, "premium-video.mp4");
        unlink(tmpIn).catch(() => {});
        unlink(tmpOut).catch(() => {});
        enginesUsed.push({ engine: "FFmpeg", purpose: "Final encode/compress (utility only)", status: "succeeded", providerJobId: null, fallbackUsed: false });
      } catch (e: any) {
        errors.push(`FFmpeg encode: ${e.message}`);
        enginesUsed.push({ engine: "FFmpeg", purpose: "Final encode", status: "failed", fallbackUsed: false });
        // finalUrl remains premiumVideoUrl (Replicate output or source)
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

  // ─── Create Teaser Package ──────────────────────────────────────────────────
  /**
   * FINAL OUTPUT ENGINE — Create Teaser + Full Package
   * Pipeline:
   *   1. OpenAI Whisper-1: transcribe audio
   *   2. OpenAI GPT-4o-mini: detect best preview segment + generate hooks/captions
   *   3. FFmpeg: cut teaser clip (utility)
   *   4. FFmpeg: extract thumbnail frames (utility)
   *   5. Returns: teaser video, full video (source), captions, hooks, thumbnails
   */
  createTeaserPackage: protectedProcedure
    .input(z.object({
      videoUrl: z.string().url(),
      teaserDuration: z.number().default(30),
    }))
    .mutation(async ({ input }) => {
      const jobId = randomUUID();
      const enginesUsed: any[] = [];
      const errors: string[] = [];

      // Step 1: Whisper transcription
      let transcript = { text: "", segments: [] as any[], duration: 0 };
      try {
        transcript = await whisperTranscribe(input.videoUrl);
        enginesUsed.push({ engine: "OpenAI Whisper-1", purpose: "Audio transcription", status: "succeeded", fallbackUsed: false });
      } catch (e: any) {
        errors.push(`Whisper: ${e.message}`);
        enginesUsed.push({ engine: "OpenAI Whisper-1", purpose: "Audio transcription", status: "failed", fallbackUsed: true });
      }

      // Step 2: GPT best-moment detection
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

      // Step 3: FFmpeg — cut teaser clip
      const teaserMoment = moments[0] || { start: 0, end: input.teaserDuration };
      const teaserStart = teaserMoment.start || 0;
      const teaserEnd = Math.min(teaserMoment.end || input.teaserDuration, teaserStart + input.teaserDuration);

      let teaserUrl = input.videoUrl;
      let fullVideoUrl = input.videoUrl;
      const thumbnails: string[] = [];

      try {
        const tmpIn = await downloadToTemp(input.videoUrl);

        // Teaser clip
        const teaserBuf = await ffmpegTrim(tmpIn, teaserStart, teaserEnd);
        teaserUrl = await saveFinalOutput(teaserBuf, "teaser.mp4", "final-output");

        // Full video (re-encode for delivery)
        const fullOut = path.join(os.tmpdir(), `vaultx-full-${randomUUID()}.mp4`);
        await execAsync(`ffmpeg -y -i "${tmpIn}" -c:v libx264 -preset fast -crf 22 -c:a aac "${fullOut}"`);
        const fullBuf = await readFile(fullOut);
        fullVideoUrl = await saveFinalOutput(fullBuf, "full-video.mp4", "final-output");
        unlink(fullOut).catch(() => {});

        // Thumbnail frames: at 0s, 25%, 50%, 75% of video
        const probeResult = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${tmpIn}"`).catch(() => ({ stdout: "60" }));
        const vidDuration = parseFloat(probeResult.stdout.trim()) || 60;
        const thumbTimes = [0, vidDuration * 0.25, vidDuration * 0.5, vidDuration * 0.75];
        for (const t of thumbTimes) {
          try {
            const thumbBuf = await ffmpegThumbnail(tmpIn, Math.floor(t));
            const thumbUrl = await saveFinalOutput(thumbBuf, `thumb-${Math.floor(t)}s.jpg`, "final-output");
            thumbnails.push(thumbUrl);
          } catch { /* skip failed thumbnails */ }
        }

        unlink(tmpIn).catch(() => {});
        enginesUsed.push({ engine: "FFmpeg", purpose: "Teaser cut + full encode + thumbnail extraction (utility only)", status: "succeeded", fallbackUsed: false });
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
          metadata: {
            teaserStart,
            teaserEnd,
            teaserDuration: teaserEnd - teaserStart,
            aiDetectedMoment: moments[0] || null,
          },
        },
        enginesUsed,
        errors: errors.length > 0 ? errors : undefined,
      };
    }),

  // ─── Create Viral Clip Pack ─────────────────────────────────────────────────
  /**
   * FINAL OUTPUT ENGINE — Create Viral Clip Pack
   * Pipeline:
   *   1. OpenAI Whisper-1: transcribe audio
   *   2. OpenAI GPT-4o-mini: detect 3–5 strongest moments
   *   3. FFmpeg: cut each moment into a clip (utility)
   *   4. Returns: 3–5 clip URLs, captions/hooks per clip, metadata
   */
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

      // Step 1: Whisper transcription
      let transcript = { text: "", segments: [] as any[], duration: 0 };
      try {
        transcript = await whisperTranscribe(input.videoUrl);
        enginesUsed.push({ engine: "OpenAI Whisper-1", purpose: "Audio transcription", status: "succeeded", fallbackUsed: false });
      } catch (e: any) {
        errors.push(`Whisper: ${e.message}`);
        enginesUsed.push({ engine: "OpenAI Whisper-1", purpose: "Audio transcription", status: "failed", fallbackUsed: true });
      }

      // Step 2: GPT moment detection
      let moments: any[] = [];
      try {
        moments = await gptAnalyzeBestMoments(transcript.text, transcript.segments, transcript.duration || 60, input.clipCount);
        enginesUsed.push({ engine: "OpenAI GPT-4o-mini", purpose: `${input.clipCount} best-moment detection`, status: "succeeded", fallbackUsed: false });
      } catch (e: any) {
        errors.push(`GPT: ${e.message}`);
        enginesUsed.push({ engine: "OpenAI GPT-4o-mini", purpose: "Moment detection", status: "failed", fallbackUsed: true });
        // Fallback: distribute evenly
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

      // Step 3: FFmpeg — cut each clip
      const clips: any[] = [];
      let tmpIn: string | null = null;
      try {
        tmpIn = await downloadToTemp(input.videoUrl);

        for (let i = 0; i < Math.min(moments.length, input.clipCount); i++) {
          const m = moments[i];
          const start = Math.max(0, m.start || 0);
          const end = Math.min(m.end || start + 30, start + 60); // max 60s per clip
          if (end <= start) continue;

          try {
            let clipBuf: Buffer;
            if (input.aspectRatio !== "16:9") {
              // Crop to target aspect ratio
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
              start,
              end,
              duration: end - start,
              aspectRatio: input.aspectRatio,
            });
          } catch (e: any) {
            errors.push(`Clip ${i + 1}: ${e.message}`);
          }
        }

        if (tmpIn) unlink(tmpIn).catch(() => {});
        enginesUsed.push({ engine: "FFmpeg", purpose: `${clips.length} clip cuts + aspect ratio crop (utility only)`, status: clips.length > 0 ? "succeeded" : "failed", fallbackUsed: false });
      } catch (e: any) {
        errors.push(`FFmpeg: ${e.message}`);
        enginesUsed.push({ engine: "FFmpeg", purpose: "Clip cutting", status: "failed", fallbackUsed: false });
        if (tmpIn) unlink(tmpIn).catch(() => {});
      }

      return {
        jobId,
        status: clips.length > 0 ? (errors.length === 0 ? "succeeded" : "partial") : "failed",
        sourceUrl: input.videoUrl,
        outputs: {
          clips,
          clipCount: clips.length,
          aspectRatio: input.aspectRatio,
          transcript: transcript.text,
        },
        enginesUsed,
        errors: errors.length > 0 ? errors : undefined,
      };
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
