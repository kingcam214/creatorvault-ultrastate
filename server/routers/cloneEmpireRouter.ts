/**
 * ============================================================================
 * CLONE EMPIRE ROUTER — Real DB-backed procedures for KingCam Clone Empire
 * ============================================================================
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";
import mysql from "mysql2/promise";
import OpenAI from "openai";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { generateSpeech } from "../_core/tts.js";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getDb() {
  const url = process.env.DATABASE_URL || "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error("Invalid DATABASE_URL");
  const [, user, password, host, port, database] = m;
  return mysql.createConnection({ host, port: parseInt(port), user, password, database });
}

function extractRows(result: any): any[] {
  if (Array.isArray(result) && result.length >= 1 && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result;
  return [];
}

const STORAGE_DIR = process.env.STORAGE_DIR || "/root/creatorvault/storage";
const AUDIO_DIR = path.join(STORAGE_DIR, "audio", "clone");
const VIDEO_DIR = path.join(STORAGE_DIR, "videos", "clone");
const PUBLIC_VIDEO_DIR = "/root/creatorvault/dist/public/videos/clone";
const PUBLIC_AUDIO_DIR = "/root/creatorvault/dist/public/storage/audio/clone";

type CloneAudioRender = {
  duration: number;
  provider: "elevenlabs" | "replicate-kokoro" | "forge" | "elevenlabs-direct";
};

function ensureDirs() {
  [AUDIO_DIR, VIDEO_DIR, PUBLIC_VIDEO_DIR, PUBLIC_AUDIO_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

async function generateElevenLabsAudio(text: string, outputPath: string): Promise<CloneAudioRender> {
  try {
    const result = await generateSpeech(text, {
      voice: "kingcam",
      speed: 0.95,
      stability: 0.5,
      similarityBoost: 0.85,
      style: 0.35,
      language: "en",
    });
    const audioResponse = await fetch(result.audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Generated speech download failed: ${audioResponse.status} ${await audioResponse.text().catch(() => audioResponse.statusText)}`);
    }
    const buf = Buffer.from(await audioResponse.arrayBuffer());
    fs.writeFileSync(outputPath, buf);
    return {
      duration: result.duration || Math.ceil(buf.length / 16000),
      provider: result.provider,
    };
  } catch (err) {
    console.error("[CloneEmpire] hardened TTS path failed; attempting direct ElevenLabs final fallback:", err);
  }

  const voiceId = process.env.KINGCAM_ELEVEN_VOICE_ID || "rwc11bXCBw5KydM4avHE";
  const apiKey = process.env.ELEVENLABS_API_KEY || "";
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY missing and hardened TTS fallback failed");
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true }
    })
  });
  if (!res.ok) throw new Error(`ElevenLabs error: ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buf);
  return {
    duration: Math.ceil(buf.length / 16000),
    provider: "elevenlabs-direct",
  };
}

const CLONE_IMAGE_NEGATIVE_PROMPT = "extra fingers, fused fingers, missing fingers, deformed hands, warped face, duplicate face, distorted eyes, bad anatomy, mutated limbs, text artifacts, watermark, logo, blurry, low resolution, plastic skin, uncanny valley, over-smoothed face, ai artifacts";

function buildCloneImagePrompt(prompt: string, style: string): string {
  return [
    `fluxdevCam ${prompt}`,
    `${style} style`,
    "premium editorial portrait quality, realistic skin texture, natural facial symmetry, accurate hands, clean anatomy, cinematic lighting, sharp focus, professional color grading",
    "no text overlays, no watermark, no logos, no distorted hands, no facial warping, no duplicate limbs"
  ].join(", ");
}

async function getCloneVideo(imageUrl: string): Promise<string> {
  const res = await fetch("https://pollo.ai/api/platform/generation/pollo/pollo-v1-6", {
    method: "POST",
    headers: {
      "x-api-key": process.env.POLLO_API_KEY || "",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input: {
        image: imageUrl,
        prompt: "slow cinematic camera push, dramatic luxury lighting, KingCam presence",
        resolution: "720p",
        length: 5,
        mode: "basic"
      }
    })
  });
  if (!res.ok) throw new Error(`Pollo.ai API error: ${res.status} - ${await res.text()}`);
  const job = await res.json();
  const jobId = job?.data?.taskId || job.id || job.job_id || job.task_id;
  if (!jobId) throw new Error(`Pollo.ai did not return a taskId: ${JSON.stringify(job)}`);
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const poll = await fetch(`https://pollo.ai/api/platform/generation/${jobId}/status`, {
      headers: { "x-api-key": process.env.POLLO_API_KEY || "" }
    });
    if (!poll.ok) throw new Error(`Pollo.ai status check error: ${poll.status} - ${await poll.text()}`);
    const result = await poll.json();
    const gen = result?.data?.generations?.[0];
    const status = String(gen?.status || result?.data?.status || "").toLowerCase();
    const url = gen?.url || result.video_url || result.output?.url || result.url;
    if ((status === "succeed" || status === "succeeded" || status === "completed") && url) return url;
    if (status === "failed" || status === "fail" || status === "error") throw new Error(`Pollo: ${gen?.failMsg || result.error || JSON.stringify(result)}`);
  }
  throw new Error('Pollo timeout');
}

export const cloneEmpireRouter = router({
  getCloneProfile: protectedProcedure.query(async () => {
    const db = await getDb();
    try {
      const [rows] = await db.execute("SELECT * FROM kingcam_clone_profile LIMIT 1");
      return { profile: extractRows([rows])[0] || null };
    } finally { db.end(); }
  }),

  updateCloneProfile: protectedProcedure.input(z.object({
    speaking_style: z.string().optional(),
    tone_guidelines: z.string().optional(),
    signature_intro: z.string().optional(),
    signature_outro: z.string().optional(),
    key_phrases: z.array(z.string()).optional(),
    voice_id: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    try {
      const sets: string[] = [];
      const vals: any[] = [];
      if (input.speaking_style) { sets.push("speaking_style = ?"); vals.push(input.speaking_style); }
      if (input.tone_guidelines) { sets.push("tone_guidelines = ?"); vals.push(input.tone_guidelines); }
      if (input.signature_intro) { sets.push("signature_intro = ?"); vals.push(input.signature_intro); }
      if (input.signature_outro) { sets.push("signature_outro = ?"); vals.push(input.signature_outro); }
      if (input.key_phrases) { sets.push("key_phrases = ?"); vals.push(JSON.stringify(input.key_phrases)); }
      if (input.voice_id) { sets.push("voice_id = ?"); vals.push(input.voice_id); }
      if (sets.length > 0) { vals.push(1); await db.execute(`UPDATE kingcam_clone_profile SET ${sets.join(", ")}, updated_at = NOW() WHERE id = ?`, vals); }
      return { success: true };
    } finally { db.end(); }
  }),

  getCloneStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    try {
      const [vr] = await db.execute("SELECT COUNT(*) as cnt FROM kingcam_clone_videos");
      const [sr] = await db.execute("SELECT COUNT(*) as cnt FROM script_projects WHERE user_id = ?", [ctx.user.id]);
      const [gr] = await db.execute("SELECT COUNT(*) as cnt FROM kingcam_clone_generations WHERE user_id = ?", [ctx.user.id]);
      return {
        totalVideos: Number(extractRows([vr])[0]?.cnt || 0),
        totalScripts: Number(extractRows([sr])[0]?.cnt || 0),
        totalImages: Number(extractRows([gr])[0]?.cnt || 0),
        totalClones: 1,
        videos: Number(extractRows([vr])[0]?.cnt || 0),
      };
    } finally { db.end(); }
  }),

  listCloneVideos: protectedProcedure.query(async () => {
    const db = await getDb();
    try {
      const [rows] = await db.execute("SELECT * FROM kingcam_clone_videos ORDER BY created_at DESC LIMIT 50");
      return { videos: extractRows([rows]) };
    } finally { db.end(); }
  }),

  listCloneContent: protectedProcedure.input(z.object({
    limit: z.number().default(50),
    offset: z.number().default(0),
    contentType: z.string().default("all"),
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    try {
      const [vr] = await db.execute("SELECT id, title, script, style, video_url, audio_url, thumbnail_url, render_status, render_provider, duration_seconds, created_at FROM kingcam_clone_videos ORDER BY created_at DESC LIMIT ? OFFSET ?", [input.limit, input.offset]);
      const [sr] = await db.execute("SELECT id, title, script_text as script, genre as style, status, created_at FROM script_projects WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", [ctx.user.id]);
      const videos = extractRows([vr]);
      const scripts = extractRows([sr]);
      const items = input.contentType === "video" ? videos : input.contentType === "script" ? scripts : [...videos, ...scripts].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return { content: items, items, total: items.length };
    } finally { db.end(); }
  }),

  listTrainingJobs: protectedProcedure.query(async () => {
    const db = await getDb();
    try {
      const [rows] = await db.execute("SELECT * FROM clone_training_jobs ORDER BY created_at DESC LIMIT 20");
      return extractRows([rows]);
    } catch { return []; } finally { db.end(); }
  }),

  getVideoStatus: protectedProcedure.input(z.object({ videoId: z.string() })).query(async ({ input }) => {
    const db = await getDb();
    try {
      const [rows] = await db.execute("SELECT * FROM kingcam_clone_videos WHERE id = ?", [input.videoId]);
      const video = extractRows([rows])[0];
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });
      return video;
    } finally { db.end(); }
  }),

  generateTalkingHeadWithScript: protectedProcedure.input(z.object({
    cloneId: z.string().optional(),
    script: z.string(),
    background: z.string().optional(),
    style: z.enum(["studio", "street", "course", "sales", "tour"]).default("studio"),
    title: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    ensureDirs();
    const videoId = crypto.randomUUID();
    const db = await getDb();
    try {
      await db.execute(
        "INSERT INTO kingcam_clone_videos (id, user_id, context, title, script, style, render_status, render_provider, created_at) VALUES (?, ?, 'clone_empire', ?, ?, ?, 'rendering', 'pollo', NOW())",
        [videoId, ctx.user.id, input.title || `Clone Video ${new Date().toLocaleDateString()}`, input.script, input.style]
      );
    } finally { db.end(); }

    const audioPath = path.join(AUDIO_DIR, `${videoId}.mp3`);

    (async () => {
      try {
        const imageUrl = input.background || process.env.KINGCAM_CLONE_IMAGE_URL || process.env.CLONE_VIDEO_IMAGE_URL || "";
        if (!imageUrl) throw new Error("Clone video image URL is required for Pollo generation");
        const audioRender = await generateElevenLabsAudio(input.script, audioPath);
        const polloVideoUrl = await getCloneVideo(imageUrl);
        fs.copyFileSync(audioPath, path.join(PUBLIC_AUDIO_DIR, `${videoId}.mp3`));
        const db2 = await getDb();
        await db2.execute("UPDATE kingcam_clone_videos SET render_status = 'ready', video_url = ?, audio_url = ?, duration_seconds = ?, render_provider = ?, updated_at = NOW() WHERE id = ?",
          [polloVideoUrl, `/storage/audio/clone/${videoId}.mp3`, audioRender.duration, `${audioRender.provider}_pollo`, videoId]);
        db2.end();
      } catch (err: any) {
        const db2 = await getDb();
        await db2.execute("UPDATE kingcam_clone_videos SET render_status = 'failed', render_error = ?, updated_at = NOW() WHERE id = ?", [err.message, videoId]);
        db2.end();
      }
    })();

    return { videoId, status: "rendering", message: "Video generation started. Ready in ~60 seconds." };
  }),

  generateFullBodyVideo: protectedProcedure.input(z.object({
    cloneId: z.string().optional(),
    script: z.string(),
    duration: z.number().default(30),
    style: z.enum(["studio", "street", "course", "sales", "tour"]).default("studio"),
    title: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    ensureDirs();
    const videoId = crypto.randomUUID();
    const db = await getDb();
    try {
      await db.execute(
        "INSERT INTO kingcam_clone_videos (id, user_id, context, title, script, style, render_status, render_provider, created_at) VALUES (?, ?, 'clone_empire', ?, ?, ?, 'rendering', 'pollo', NOW())",
        [videoId, ctx.user.id, input.title || `Full Body ${new Date().toLocaleDateString()}`, input.script, input.style]
      );
    } finally { db.end(); }

    const audioPath = path.join(AUDIO_DIR, `${videoId}.mp3`);

    (async () => {
      try {
        const imageUrl = process.env.KINGCAM_CLONE_IMAGE_URL || process.env.CLONE_VIDEO_IMAGE_URL || "";
        if (!imageUrl) throw new Error("Clone video image URL is required for Pollo generation");
        const audioRender = await generateElevenLabsAudio(input.script, audioPath);
        const polloVideoUrl = await getCloneVideo(imageUrl);
        fs.copyFileSync(audioPath, path.join(PUBLIC_AUDIO_DIR, `${videoId}.mp3`));
        const db2 = await getDb();
        await db2.execute("UPDATE kingcam_clone_videos SET render_status = 'ready', video_url = ?, audio_url = ?, duration_seconds = ?, render_provider = ?, updated_at = NOW() WHERE id = ?",
          [polloVideoUrl, `/storage/audio/clone/${videoId}.mp3`, audioRender.duration, `${audioRender.provider}_pollo`, videoId]);
        db2.end();
      } catch (err: any) {
        const db2 = await getDb();
        await db2.execute("UPDATE kingcam_clone_videos SET render_status = 'failed', render_error = ?, updated_at = NOW() WHERE id = ?", [err.message, videoId]);
        db2.end();
      }
    })();

    return { videoId, status: "rendering", message: "Full body video generation started." };
  }),

  generateCloneImage: protectedProcedure.input(z.object({
    cloneId: z.string().optional(),
    prompt: z.string(),
    style: z.string().default("realistic"),
  })).mutation(async ({ ctx, input }) => {
    const token = process.env.REPLICATE_API_TOKEN || "";
    if (!token) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Replicate not configured" });
    const model = process.env.REPLICATE_CLONE_MODEL_ID || "kingcam214/fluxdevcam";
    const fullPrompt = buildCloneImagePrompt(input.prompt, input.style);
    const res = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: {
          prompt: fullPrompt,
          negative_prompt: CLONE_IMAGE_NEGATIVE_PROMPT,
          num_outputs: 1,
          width: 1024,
          height: 1024,
          guidance_scale: 7.5,
          num_inference_steps: 32,
        }
      })
    });
    if (!res.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Replicate error: ${await res.text()}` });
    const prediction = await res.json();
    try {
      const db = await getDb();
      await db.execute("INSERT INTO kingcam_clone_generations (user_id, replicate_prediction_id, model_id, prompt, num_outputs, status, created_at) VALUES (?, ?, ?, ?, 1, 'starting', NOW())",
        [ctx.user.id, prediction.id, model, fullPrompt]);
      db.end();
    } catch {}
    return { imageId: prediction.id, predictionId: prediction.id, status: "starting", prompt: fullPrompt };
  }),

  trainClone: protectedProcedure.input(z.object({
    cloneId: z.string(),
    samples: z.array(z.string()),
    voiceId: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const jobId = crypto.randomUUID();
    try {
      const db = await getDb();
      await db.execute("INSERT INTO clone_training_jobs (id, user_id, clone_id, status, samples, created_at) VALUES (?, ?, ?, 'queued', ?, NOW())",
        [jobId, ctx.user.id, input.cloneId, JSON.stringify(input.samples)]);
      db.end();
    } catch {}
    return { jobId, cloneId: input.cloneId, status: "queued", estimatedTime: "2-4 hours" };
  }),

  getEmpire: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    try {
      const [vr] = await db.execute("SELECT COUNT(*) as cnt FROM kingcam_clone_videos WHERE render_status = 'ready'");
      const [sr] = await db.execute("SELECT COUNT(*) as cnt FROM script_projects WHERE user_id = ?", [ctx.user.id]);
      const [gr] = await db.execute("SELECT COUNT(*) as cnt FROM kingcam_clone_generations WHERE user_id = ?", [ctx.user.id]);
      return {
        clones: [{ id: 1, name: "KingCam", status: "active", platform: "all" }],
        empireSize: 1,
        totalVideos: Number(extractRows([vr])[0]?.cnt || 0),
        totalScripts: Number(extractRows([sr])[0]?.cnt || 0),
        totalImages: Number(extractRows([gr])[0]?.cnt || 0),
        totalReach: 0,
      };
    } finally { db.end(); }
  }),

  getEmpireRevenue: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    try {
      const [rows] = await db.execute("SELECT SUM(amount) as total FROM payments WHERE user_id = ? AND status = 'completed'", [ctx.user.id]);
      const total = Number(extractRows([rows])[0]?.total || 0);
      return { total, byClone: [{ cloneId: "kingcam", revenue: total }] };
    } finally { db.end(); }
  }),

  expandEmpire: protectedProcedure.input(z.object({
    strategy: z.string(),
    platforms: z.array(z.string()),
    budget: z.number(),
  })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are KingCam's empire strategist. Be direct, specific, and revenue-focused." },
        { role: "user", content: `Create a clone empire expansion plan:\nStrategy: ${input.strategy}\nPlatforms: ${input.platforms.join(", ")}\nBudget: $${input.budget}\n\nDesign: 30-day deployment schedule, platform-specific content strategies, revenue projections, and KPIs.` }
      ],
      max_tokens: 800,
    });
    return { plan: c.choices[0].message.content };
  }),
});
