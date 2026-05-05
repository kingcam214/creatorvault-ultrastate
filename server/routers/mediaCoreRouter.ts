import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import * as path from "path";
import * as os from "os";
import fetch from "node-fetch";

const execAsync = promisify(exec);

export const mediaCoreRouter = router({
  getMediaAssets: protectedProcedure.query(async ({ ctx }) => {
    const assets = await db.db.select()
      .from(db.schema.videoAssets)
    // @ts-ignore
      .where(eq(db.schema.videoAssets.userId, ctx.user.id))
      .orderBy(desc(db.schema.videoAssets.createdAt))
      .limit(50);
    return assets;
  }),

  uploadMedia: protectedProcedure.input(z.object({
    filename: z.string(),
    type: z.enum(["video", "image", "audio", "document"]),
    url: z.string(),
    size: z.number().optional(),
    // @ts-ignore
    metadata: z.record(z.unknown()).optional(),
  })).mutation(async ({ ctx, input }) => {
    const [asset] = await db.db.insert(db.schema.videoAssets).values({
      userId: ctx.user.id,
      filename: input.filename,
      type: input.type,
      url: input.url,
      size: input.size || 0,
      metadata: JSON.stringify(input.metadata || {}),
      createdAt: new Date(),
    }).$returningId();
    return { id: asset.id, ...input };
  }),

  deleteMedia: protectedProcedure.input(z.object({
    assetId: z.number(),
  })).mutation(async ({ ctx, input }) => {
    await db.db.delete(db.schema.videoAssets)
    // @ts-ignore
      .where(eq(db.schema.videoAssets.id, input.assetId));
    return { success: true };
  }),

  getMediaStats: protectedProcedure.query(async ({ ctx }) => {
    const assets = await db.db.select()
      .from(db.schema.videoAssets)
    // @ts-ignore
      .where(eq(db.schema.videoAssets.userId, ctx.user.id));
    // @ts-ignore
    const byType = assets.reduce((acc: Record<string, number>, a) => {
      acc[a.type || "unknown"] = (acc[a.type || "unknown"] || 0) + 1;
      return acc;
    }, {});
    return { total: assets.length, byType };
  }),

  // ─── Scene Detection via FFmpeg ─────────────────────────────────────────
  detectScenes: protectedProcedure
    .input(z.object({
      videoUrl: z.string().url(),
      threshold: z.number().min(0.1).max(1.0).default(0.4),
    }))
    .mutation(async ({ input }) => {
      const tmpId = randomUUID();
      const videoPath = path.join(os.tmpdir(), `cv-scene-${tmpId}.mp4`);
      const startTime = Date.now();
      console.log(`[SceneDetect] START jobId=${tmpId} url=${input.videoUrl} threshold=${input.threshold}`);
      try {
        // Download video
        console.log(`[SceneDetect] Downloading asset from ${input.videoUrl}`);
        const resp = await fetch(input.videoUrl);
        if (!resp.ok) throw new Error(`Download failed: HTTP ${resp.status} for ${input.videoUrl}`);
        const buf = Buffer.from(await resp.arrayBuffer());
        await writeFile(videoPath, buf);
        console.log(`[SceneDetect] Asset written to ${videoPath} (${buf.length} bytes)`);

        // Run FFmpeg scene detection
        // select=gt(scene\,threshold) outputs the PTS (presentation timestamp) of each scene change
        const { stdout, stderr } = await execAsync(
          `ffprobe -v quiet -show_frames -select_streams v -of json \
           -f lavfi "movie=${videoPath},select=gt(scene\\,${input.threshold})" 2>/dev/null || \
           ffmpeg -i "${videoPath}" -vf "select=gt(scene\\,${input.threshold}),showinfo" \
           -f null - 2>&1 | grep "pts_time" | head -100`
        );

        // Parse timestamps from ffmpeg showinfo output
        const lines = (stdout || stderr || "").split("\n");
        const timestamps: number[] = [0]; // Always include start
        for (const line of lines) {
          const match = line.match(/pts_time:([\d.]+)/);
          if (match) {
            const t = parseFloat(match[1]);
            if (t > 0) timestamps.push(t);
          }
        }

        // Get video duration
        const { stdout: durationOut } = await execAsync(
          `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`
        ).catch(() => ({ stdout: "0" }));
        const duration = parseFloat(durationOut.trim()) || 0;

        // Build scene list
        const scenes = timestamps.map((start, i) => ({
          index: i,
          startTime: start,
          endTime: timestamps[i + 1] || duration,
          duration: (timestamps[i + 1] || duration) - start,
        }));

        const elapsed = Date.now() - startTime;
        console.log(`[SceneDetect] COMPLETE jobId=${tmpId} scenes=${scenes.length} duration=${duration.toFixed(2)}s elapsed=${elapsed}ms`);
        return { scenes, totalDuration: duration, sceneCount: scenes.length };
      } catch (err: any) {
        console.error(`[SceneDetect] FAILED jobId=${tmpId} error=${err.message}`);
        throw err;
      } finally {
        await unlink(videoPath).catch(() => {});
      }
    }),
});
