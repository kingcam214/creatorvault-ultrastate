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
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
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

function ensureDirs() {
  [AUDIO_DIR, VIDEO_DIR, PUBLIC_VIDEO_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

async function generateElevenLabsAudio(text: string, outputPath: string): Promise<number> {
  const voiceId = process.env.KINGCAM_ELEVEN_VOICE_ID || "rwc11bXCBw5KydM4avHE";
  const apiKey = process.env.ELEVENLABS_API_KEY || "";
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true }
    })
  });
  if (!res.ok) throw new Error(`ElevenLabs error: ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outputPath, buf);
  return Math.ceil(buf.length / 16000);
}

async function buildVideoFromAudio(audioPath: string, videoPath: string, title: string, style: string): Promise<void> {
  const bgColor = style === "studio" ? "0x0a0a0a" : style === "street" ? "0x1a0a00" : "0x050510";
  const accentHex = style === "studio" ? "00D9FF" : style === "street" ? "FF6B00" : "C9A84C";
  const safeTitle = title.replace(/['"\\:]/g, "").substring(0, 45);
  const fontFile = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
  const cmd = `ffmpeg -y \
    -f lavfi -i "color=c=${bgColor}:size=1080x1920:rate=30" \
    -i "${audioPath}" \
    -filter_complex "[0:v]drawtext=text='KINGCAM':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=h*0.08:fontfile=${fontFile}:alpha=0.8,drawtext=text='${safeTitle}':fontcolor=0x${accentHex}:fontsize=48:x=(w-text_w)/2:y=h*0.15:fontfile=${fontFile}:shadowcolor=black:shadowx=2:shadowy=2[vout]" \
    -map "[vout]" -map 1:a \
    -c:v libx264 -preset fast -crf 23 \
    -c:a aac -b:a 128k \
    -shortest "${videoPath}"`;
  await execAsync(cmd);
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
        "INSERT INTO kingcam_clone_videos (id, user_id, context, title, script, style, render_status, render_provider, created_at) VALUES (?, ?, 'clone_empire', ?, ?, ?, 'rendering', 'elevenlabs_ffmpeg', NOW())",
        [videoId, ctx.user.id, input.title || `Clone Video ${new Date().toLocaleDateString()}`, input.script, input.style]
      );
    } finally { db.end(); }

    const audioPath = path.join(AUDIO_DIR, `${videoId}.mp3`);
    const videoPath = path.join(VIDEO_DIR, `${videoId}.mp4`);
    const publicPath = path.join(PUBLIC_VIDEO_DIR, `${videoId}.mp4`);

    (async () => {
      try {
        const duration = await generateElevenLabsAudio(input.script, audioPath);
        await buildVideoFromAudio(audioPath, videoPath, input.title || "KingCam Clone", input.style);
        fs.copyFileSync(videoPath, publicPath);
        const db2 = await getDb();
        await db2.execute("UPDATE kingcam_clone_videos SET render_status = 'ready', video_url = ?, audio_url = ?, duration_seconds = ?, updated_at = NOW() WHERE id = ?",
          [`/videos/clone/${videoId}.mp4`, `/storage/audio/clone/${videoId}.mp3`, duration, videoId]);
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
        "INSERT INTO kingcam_clone_videos (id, user_id, context, title, script, style, render_status, render_provider, created_at) VALUES (?, ?, 'clone_empire', ?, ?, ?, 'rendering', 'elevenlabs_ffmpeg', NOW())",
        [videoId, ctx.user.id, input.title || `Full Body ${new Date().toLocaleDateString()}`, input.script, input.style]
      );
    } finally { db.end(); }

    const audioPath = path.join(AUDIO_DIR, `${videoId}.mp3`);
    const videoPath = path.join(VIDEO_DIR, `${videoId}.mp4`);
    const publicPath = path.join(PUBLIC_VIDEO_DIR, `${videoId}.mp4`);

    (async () => {
      try {
        const duration = await generateElevenLabsAudio(input.script, audioPath);
        await buildVideoFromAudio(audioPath, videoPath, input.title || "KingCam", input.style);
        fs.copyFileSync(videoPath, publicPath);
        const db2 = await getDb();
        await db2.execute("UPDATE kingcam_clone_videos SET render_status = 'ready', video_url = ?, audio_url = ?, duration_seconds = ?, updated_at = NOW() WHERE id = ?",
          [`/videos/clone/${videoId}.mp4`, `/storage/audio/clone/${videoId}.mp3`, duration, videoId]);
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
    const fullPrompt = `fluxdevCam ${input.prompt}, ${input.style} style, high quality`;
    const res = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: { prompt: fullPrompt, num_outputs: 1, width: 1024, height: 1024 } })
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
