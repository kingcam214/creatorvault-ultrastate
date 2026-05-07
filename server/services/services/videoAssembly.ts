/**
 * Video Assembly Service
 * 
 * Stitches scene frames into final MP4 video with:
 * - Ken Burns effect (pan/zoom) on static frames
 * - Scene transitions
 * - Audio support
 * - S3 persistence
 */

import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { getDb } from "../db";
import { videoGenerationJobs, videoScenes, videoAssets } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "../storage";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import crypto from "crypto";
import https from "https";
import http from "http";

const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

interface AssembleVideoOptions {
  jobId: number;
  fps?: number;
  transitionDuration?: number;
  motionIntensity?: number;
}

/**
 * Download image from URL to local file
 */
async function downloadImage(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(outputPath);
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    }).on("error", (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

/**
 * Apply Ken Burns effect to static image
 * Creates a video clip with pan/zoom motion
 */
async function applyKenBurnsEffect(
  inputPath: string,
  outputPath: string,
  duration: number,
  motionIntensity: number = 0.5
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Ken Burns parameters
    const zoom = 1 + (motionIntensity * 0.2); // 1.0 to 1.2 zoom
    const panX = motionIntensity * 50; // 0 to 50 pixels pan
    const panY = motionIntensity * 30; // 0 to 30 pixels pan
    
    // Complex filter for Ken Burns effect
    const filter = `[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='min(zoom+0.0015,${zoom})':x='iw/2-(iw/zoom/2)+${panX}*sin(on/${duration})':y='ih/2-(ih/zoom/2)+${panY}*cos(on/${duration})':d=${duration * 30}:s=1920x1080:fps=30[v]`;
    
    ffmpeg(inputPath)
      .complexFilter(filter)
      .outputOptions([
        "-map", "[v]",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-pix_fmt", "yuv420p"
      ])
      .duration(duration)
      .on("error", (err) => {
        console.error("[Video Assembly] Ken Burns effect failed:", err);
        reject(err);
      })
      .on("end", () => {
        resolve();
      })
      .save(outputPath);
  });
}

/**
 * Concatenate video clips with crossfade transitions
 */
async function concatenateVideos(
  inputPaths: string[],
  outputPath: string,
  transitionDuration: number = 0.5
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (inputPaths.length === 0) {
      reject(new Error("No input videos to concatenate"));
      return;
    }
    
    if (inputPaths.length === 1) {
      // Single video, just copy
      fs.copyFileSync(inputPaths[0], outputPath);
      resolve();
      return;
    }
    
    // Build complex filter for crossfade transitions
    let filterComplex = "";
    let currentLabel = "[0:v]";
    
    for (let i = 1; i < inputPaths.length; i++) {
      const nextLabel = i === inputPaths.length - 1 ? "[v]" : `[v${i}]`;
      filterComplex += `${currentLabel}[${i}:v]xfade=transition=fade:duration=${transitionDuration}:offset=${(i - 1) * 5}${nextLabel};`;
      currentLabel = nextLabel;
    }
    
    const command = ffmpeg();
    
    // Add all input files
    inputPaths.forEach(p => command.input(p));
    
    command
      .complexFilter(filterComplex.slice(0, -1)) // Remove trailing semicolon
      .outputOptions([
        "-map", "[v]",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-pix_fmt", "yuv420p"
      ])
      .on("error", (err) => {
        console.error("[Video Assembly] Concatenation failed:", err);
        reject(err);
      })
      .on("end", () => {
        resolve();
      })
      .save(outputPath);
  });
}

/**
 * Assemble final video from scene frames
 */
export async function assembleVideo(options: AssembleVideoOptions): Promise<string> {
  const { jobId, fps = 30, transitionDuration = 0.5, motionIntensity = 0.5 } = options;
  
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get job and scenes
  const [job] = await db
    .select()
    .from(videoGenerationJobs)
    .where(eq(videoGenerationJobs.id, jobId))
    .limit(1);
  
  if (!job) {
    throw new Error(`Video job ${jobId} not found`);
  }
  
  const scenes = await db
    .select()
    .from(videoScenes)
    .where(eq(videoScenes.jobId, jobId))
    .orderBy(videoScenes.sceneIndex);
  
  if (scenes.length === 0) {
    throw new Error(`No scenes found for job ${jobId}`);
  }
  
  // Check all scenes are complete
  const incompleteScenes = scenes.filter(s => s.status !== "complete" || !s.imageUrl);
  if (incompleteScenes.length > 0) {
    throw new Error(`${incompleteScenes.length} scenes are not complete. Generate all scenes first.`);
  }
  
  // Update job status
  await db
    .update(videoGenerationJobs)
    .set({ status: "processing", progress: 10 })
    .where(eq(videoGenerationJobs.id, jobId));
  
  // Create temp directory for processing
  const tempDir = path.join("/tmp", `video_${jobId}_${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
  
  try {
    // Calculate scene duration
    const totalDuration = job.duration || 30;
    const sceneDuration = Math.max(3, Math.floor(totalDuration / scenes.length));
    
    // Download and process each scene
    const processedVideos: string[] = [];
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const progress = 10 + Math.floor((i / scenes.length) * 70);
      
      await db
        .update(videoGenerationJobs)
        .set({ progress })
        .where(eq(videoGenerationJobs.id, jobId));
      
      // Download scene image
      const imagePath = path.join(tempDir, `scene_${i}.png`);
      await downloadImage(scene.imageUrl!, imagePath);
      
      // Apply Ken Burns effect
      const videoPath = path.join(tempDir, `scene_${i}.mp4`);
      await applyKenBurnsEffect(imagePath, videoPath, sceneDuration, motionIntensity);
      
      processedVideos.push(videoPath);
      
      // Clean up image
      await unlink(imagePath);
    }
    
    // Concatenate all scene videos
    await db
      .update(videoGenerationJobs)
      .set({ progress: 80 })
      .where(eq(videoGenerationJobs.id, jobId));
    
    const finalVideoPath = path.join(tempDir, "final.mp4");
    await concatenateVideos(processedVideos, finalVideoPath, transitionDuration);
    
    // Upload to S3
    await db
      .update(videoGenerationJobs)
      .set({ progress: 90 })
      .where(eq(videoGenerationJobs.id, jobId));
    
    const videoBuffer = fs.readFileSync(finalVideoPath);
    const videoKey = `videos/${jobId}/final_${crypto.randomBytes(8).toString("hex")}.mp4`;
    const { url: videoUrl } = await storagePut(videoKey, videoBuffer, "video/mp4");
    
    // Store video asset
    await db.insert(videoAssets).values({
      id: crypto.randomUUID(),
      jobId,
      assetType: "final_video",
      url: videoUrl,
      fileSize: videoBuffer.length,
      mimeType: "video/mp4",
      duration: totalDuration,
    });
    
    // Update job to complete
    await db
      .update(videoGenerationJobs)
      .set({
        status: "complete",
        progress: 100,
        videoUrl: videoUrl,
      })
      .where(eq(videoGenerationJobs.id, jobId));
    
    // Clean up temp files
    for (const videoPath of processedVideos) {
      await unlink(videoPath);
    }
    await unlink(finalVideoPath);
    await rmdir(tempDir);
    
    return videoUrl;
  } catch (error) {
    // Clean up on error
    try {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        await unlink(path.join(tempDir, file));
      }
      await rmdir(tempDir);
    } catch (cleanupError) {
      console.error("[Video Assembly] Cleanup failed:", cleanupError);
    }
    
    // Update job to failed
    await db
      .update(videoGenerationJobs)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Video assembly failed",
      })
      .where(eq(videoGenerationJobs.id, jobId));
    
    throw error;
  }
}
