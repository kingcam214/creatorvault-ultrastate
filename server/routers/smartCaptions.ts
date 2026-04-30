/**
 * smartCaptionsRouter — Production Smart Captions Router
 * transcribe: OpenAI Whisper-1 (real audio transcription from video URL)
 * getCaptionById: polls DB for caption job status
 * applyCaptionStyle: burns captions onto video via FFmpeg
 * getCaptionStyles: returns available caption styles
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile, mkdir } from "fs/promises";
import fetch from "node-fetch";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

const execAsync = promisify(exec);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const BASE_URL = (process.env.APP_URL || "https://creatorvault.live").replace(/\/$/, "");

async function rawQuery(query: string, params: any[] = []): Promise<any[]> {
  const conn = (db as any).client || (db as any).$client;
  if (conn && typeof conn.query === "function") {
    const [rows] = await conn.query(query, params);
    return rows as any[];
  }
  const result = await (db as any).execute(sql.raw(query));
  return (result as any).rows || result;
}

async function rawExec(query: string, params: any[] = []): Promise<any> {
  const conn = (db as any).client || (db as any).$client;
  if (conn && typeof conn.query === "function") {
    const [result] = await conn.query(query, params);
    return result;
  }
  return (db as any).execute(sql.raw(query));
}

// Download a URL to a temp file, return the path
async function downloadToTemp(url: string, ext: string): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `cv-caption-${randomUUID()}.${ext}`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download: ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  await writeFile(tmpPath, buf);
  return tmpPath;
}

// Save a buffer to the local uploads dir and return the public URL
async function saveAndGetUrl(buffer: Buffer, filename: string, subdir: string): Promise<string> {
  const uuid = randomUUID();
  const uploadsDir = path.resolve(process.cwd(), "dist", "public", "uploads", subdir, uuid);
  await mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, filename);
  await writeFile(filePath, buffer);
  return `${BASE_URL}/uploads/${subdir}/${uuid}/${filename}`;
}

// Process captions asynchronously (transcribe + burn)
async function processCaptionJob(captionId: string, videoUrl: string, style: any, userId: number) {
  let videoPath: string | null = null;
  let audioPath: string | null = null;
  let outputPath: string | null = null;
  try {
    await rawExec(
      "UPDATE caption_jobs SET processing_status = 'processing' WHERE id = ?",
      [captionId]
    );

    // Step 1: Download video
    videoPath = await downloadToTemp(videoUrl, "mp4");

    // Step 2: Extract audio for Whisper
    audioPath = path.join(os.tmpdir(), `cv-audio-${captionId}.mp3`);
    await execAsync(`ffmpeg -i "${videoPath}" -vn -ar 16000 -ac 1 -b:a 64k -y "${audioPath}"`);

    // Step 3: Transcribe with Whisper
    const audioStream = fs.createReadStream(audioPath) as any;
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    const segments = (transcription as any).segments || [];
    const transcript = transcription.text || "";

    // Step 4: Build FFmpeg drawtext filter from segments
    const fontSize = style?.fontSize || 28;
    const fontColor = style?.fontColor || "white";
    const bgColor = style?.bgColor || "black@0.5";
    const position = style?.position || "bottom";
    const yPos = position === "top" ? "h*0.05" : "h*0.85";

    let drawtextFilters: string[] = [];
    if (segments.length > 0) {
      drawtextFilters = segments.map((seg: any) => {
        const text = (seg.text || "").trim().replace(/'/g, "\\'").replace(/:/g, "\\:");
        const start = parseFloat(seg.start || "0");
        const end = parseFloat(seg.end || (start + 3).toString());
        return `drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${fontColor}:box=1:boxcolor=${bgColor}:boxborderw=8:x=(w-text_w)/2:y=${yPos}:enable='between(t,${start},${end})'`;
      });
    } else {
      // No segments — burn full transcript as static caption
      const text = transcript.replace(/'/g, "\\'").replace(/:/g, "\\:").substring(0, 200);
      drawtextFilters = [`drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${fontColor}:box=1:boxcolor=${bgColor}:boxborderw=8:x=(w-text_w)/2:y=${yPos}`];
    }

    // Step 5: Burn captions onto video with FFmpeg
    outputPath = path.join(os.tmpdir(), `cv-captioned-${captionId}.mp4`);
    const vfFilter = drawtextFilters.join(",");
    await execAsync(`ffmpeg -i "${videoPath}" -vf "${vfFilter}" -c:a copy -y "${outputPath}"`);

    // Step 6: Save output and update DB
    const outputBuf = await readFile(outputPath);
    const captionedUrl = await saveAndGetUrl(outputBuf, `captioned-${captionId}.mp4`, "captions");

    await rawExec(
      `UPDATE caption_jobs SET
       processing_status = 'completed',
       transcript = ?,
       segments_json = ?,
       captioned_video_url = ?,
       completed_at = NOW()
       WHERE id = ?`,
      [transcript, JSON.stringify(segments), captionedUrl, captionId]
    );
  } catch (err: any) {
    await rawExec(
      "UPDATE caption_jobs SET processing_status = 'failed', error_message = ? WHERE id = ?",
      [err.message || "Unknown error", captionId]
    );
  } finally {
    if (videoPath) await unlink(videoPath).catch(() => {});
    if (audioPath) await unlink(audioPath).catch(() => {});
    if (outputPath) await unlink(outputPath).catch(() => {});
  }
}

export const smartCaptionsRouter = router({
  // ─── Transcribe Video ──────────────────────────────────────────────────
  transcribe: protectedProcedure
    .input(z.object({
      videoUrl: z.string().url(),
      style: z.object({
        fontSize: z.number().optional(),
        fontColor: z.string().optional(),
        bgColor: z.string().optional(),
        position: z.enum(["top", "bottom", "center"]).optional(),
      }).optional(),
      captionStyleId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const captionId = randomUUID();
      await rawExec(
        `INSERT INTO caption_jobs
         (id, user_id, video_url, style_json, processing_status, created_at)
         VALUES (?, ?, ?, ?, 'queued', NOW())`,
        [captionId, ctx.user.id, input.videoUrl, JSON.stringify(input.style || {})]
      );
      // Fire-and-forget async processing
      processCaptionJob(captionId, input.videoUrl, input.style || {}, ctx.user.id).catch(console.error);
      return { captionId, status: "queued" };
    }),

  // ─── Poll Caption Job ──────────────────────────────────────────────────
  getCaptionById: protectedProcedure
    .input(z.object({ captionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await rawQuery(
        "SELECT * FROM caption_jobs WHERE id = ? AND user_id = ? LIMIT 1",
        [input.captionId, ctx.user.id]
      );
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Caption job not found" });
      const job = rows[0];
      return {
        captionId: job.id,
        processingStatus: job.processing_status,
        transcript: job.transcript || null,
        captionedVideoUrl: job.captioned_video_url || null,
        errorMessage: job.error_message || null,
      };
    }),

  // ─── Apply Caption Style (re-burn with new style) ─────────────────────
  applyCaptionStyle: protectedProcedure
    .input(z.object({
      captionId: z.string(),
      // Accept either a direct style object OR styleId + customizations (from VaultXVideoEditor)
      style: z.object({
        fontSize: z.number().optional(),
        fontColor: z.string().optional(),
        bgColor: z.string().optional(),
        position: z.enum(["top", "bottom", "center"]).optional(),
      }).optional(),
      styleId: z.string().optional(),
      customizations: z.object({
        fontSize: z.number().optional(),
        placement: z.enum(["top", "bottom", "center"]).optional(),
        fontColor: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rows = await rawQuery(
        "SELECT * FROM caption_jobs WHERE id = ? AND user_id = ? LIMIT 1",
        [input.captionId, ctx.user.id]
      );
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Caption job not found" });
      const job = rows[0];
      if (!job.video_url) throw new TRPCError({ code: "BAD_REQUEST", message: "No source video on this job" });
      // Resolve style: if styleId provided, look it up from getCaptionStyles list and merge customizations
      const BUILTIN_STYLES: Record<string, { fontSize: number; fontColor: string; bgColor: string; position: "top"|"bottom"|"center" }> = {
        "clean-white":  { fontSize: 28, fontColor: "white",  bgColor: "black@0.5", position: "bottom" },
        "bold-yellow":  { fontSize: 32, fontColor: "yellow", bgColor: "black@0.7", position: "bottom" },
        "minimal-top":  { fontSize: 24, fontColor: "white",  bgColor: "black@0.3", position: "top"    },
        "cinematic":    { fontSize: 26, fontColor: "white",  bgColor: "black@0.6", position: "bottom" },
        "fire-red":     { fontSize: 30, fontColor: "red",    bgColor: "black@0.5", position: "bottom" },
        "neon-green":   { fontSize: 28, fontColor: "#00FF41",bgColor: "black@0.6", position: "bottom" },
        "luxury-gold":  { fontSize: 30, fontColor: "#FFD700",bgColor: "black@0.7", position: "bottom" },
      };
      let resolvedStyle: { fontSize?: number; fontColor?: string; bgColor?: string; position?: "top"|"bottom"|"center" };
      if (input.styleId) {
        const base = BUILTIN_STYLES[input.styleId] || BUILTIN_STYLES["clean-white"];
        resolvedStyle = {
          ...base,
          ...(input.customizations?.fontSize ? { fontSize: input.customizations.fontSize } : {}),
          ...(input.customizations?.fontColor ? { fontColor: input.customizations.fontColor } : {}),
          ...(input.customizations?.placement ? { position: input.customizations.placement } : {}),
        };
      } else {
        resolvedStyle = input.style || {};
      }
      // Reset and reprocess with resolved style
      await rawExec(
        "UPDATE caption_jobs SET processing_status = \'queued\', style_json = ?, captioned_video_url = NULL WHERE id = ?",
        [JSON.stringify(resolvedStyle), input.captionId]
      );
      processCaptionJob(input.captionId, job.video_url, resolvedStyle, ctx.user.id).catch(console.error);
      return { captionId: input.captionId, status: "queued" };
    }),

  // ─── Get Caption Styles ────────────────────────────────────────────────
  getCaptionStyles: protectedProcedure
    .input(z.object({ premiumOnly: z.boolean().optional() }))
    .query(async () => {
      return [
        { id: "clean-white", name: "Clean White", fontSize: 28, fontColor: "white", bgColor: "black@0.5", position: "bottom", premium: false },
        { id: "bold-yellow", name: "Bold Yellow", fontSize: 32, fontColor: "yellow", bgColor: "black@0.7", position: "bottom", premium: false },
        { id: "minimal-top", name: "Minimal Top", fontSize: 24, fontColor: "white", bgColor: "black@0.3", position: "top", premium: false },
        { id: "cinematic", name: "Cinematic", fontSize: 26, fontColor: "white", bgColor: "black@0.6", position: "bottom", premium: true },
        { id: "fire-red", name: "Fire Red", fontSize: 30, fontColor: "red", bgColor: "black@0.5", position: "bottom", premium: true },
        { id: "neon-pink", name: "Neon Pink", fontSize: 30, fontColor: "#FF1493", bgColor: "black@0.5", position: "bottom", premium: true },
      ];
    }),

  // ─── Text caption generation (kept from original) ─────────────────────
  generateCaption: protectedProcedure
    .input(z.object({
      content: z.string(),
      platform: z.string(),
      tone: z.string().optional(),
      includeHashtags: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const c = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Write a smart caption for ${input.platform}:\nContent: ${input.content}\nTone: ${input.tone || "engaging"}\n${input.includeHashtags ? "Include relevant hashtags." : "No hashtags."}\nMake it scroll-stopping and authentic.`,
        }],
        max_tokens: 300,
      });
      return { caption: c.choices[0].message.content };
    }),

  generateCaptionVariants: protectedProcedure
    .input(z.object({ content: z.string(), platform: z.string(), count: z.number().default(3) }))
    .mutation(async ({ input }) => {
      const c = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Generate ${input.count} different caption variants for this ${input.platform} content:\n${input.content}\nEach should have a different angle/tone.`,
        }],
        max_tokens: 400,
      });
      return { variants: c.choices[0].message.content };
    }),

  analyzeCaption: protectedProcedure
    .input(z.object({ caption: z.string(), platform: z.string() }))
    .mutation(async ({ input }) => {
      const c = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Analyze this ${input.platform} caption and score it:\n"${input.caption}"\nScore (1-10): hook, clarity, engagement potential, CTA strength. Provide improvement suggestions.`,
        }],
        max_tokens: 300,
      });
      return { analysis: c.choices[0].message.content };
    }),
});

export { smartCaptionsRouter as smartCaptions };
