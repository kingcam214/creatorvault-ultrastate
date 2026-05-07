/**
 * CLONE FRAME EXTRACTOR
 * Uses real FFmpeg to extract frames from uploaded videos.
 * Extracts keyframes + interval frames, generates thumbnails, saves metadata.
 */
import { execSync, spawn } from "child_process";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getDb } from "../db";
import { CLONE_LAB_BASE, ensureDir } from "./cloneTrainingLab";

export interface ExtractedFrame {
  framePath: string;
  timestampSeconds: number;
  width: number;
  height: number;
}

export async function extractFramesFromVideo(
  uploadId: number,
  videoPath: string,
  intervalSeconds: number = 2
): Promise<{ framesExtracted: number; frameDir: string }> {
  const db = await getDb();
  const frameDir = ensureDir(path.join(CLONE_LAB_BASE, "frames", `upload_${uploadId}`));

  // Get video duration using ffprobe
  let duration = 0;
  try {
    const probeOut = execSync(
      `ffprobe -v quiet -print_format json -show_streams "${videoPath}" 2>/dev/null`,
      { encoding: "utf8", timeout: 30000 }
    );
    const probe = JSON.parse(probeOut);
    const videoStream = probe.streams?.find((s: any) => s.codec_type === "video");
    duration = parseFloat(videoStream?.duration || "0");
  } catch (e) {
    console.error("[FrameExtractor] ffprobe failed:", e);
  }

  // Extract frames every N seconds
  const outputPattern = path.join(frameDir, "frame_%05d.jpg");
  try {
    execSync(
      `ffmpeg -i "${videoPath}" -vf "fps=1/${intervalSeconds},scale=1024:-1" -q:v 2 "${outputPattern}" -y 2>/dev/null`,
      { timeout: 300000 }
    );
  } catch (e) {
    console.error("[FrameExtractor] ffmpeg extraction failed:", e);
    throw new Error(`FFmpeg frame extraction failed: ${(e as Error).message}`);
  }

  // Also extract keyframes
  const keyframePattern = path.join(frameDir, "keyframe_%05d.jpg");
  try {
    execSync(
      `ffmpeg -i "${videoPath}" -vf "select=eq(pict_type\\,I),scale=1024:-1" -vsync vfr -q:v 2 "${keyframePattern}" -y 2>/dev/null`,
      { timeout: 300000 }
    );
  } catch (e) {
    // Keyframe extraction is best-effort
    console.warn("[FrameExtractor] Keyframe extraction failed (non-fatal):", e);
  }

  // Read extracted frames and insert into DB
  const frameFiles = fs.readdirSync(frameDir)
    .filter(f => f.endsWith(".jpg"))
    .sort();

  let framesExtracted = 0;
  for (let i = 0; i < frameFiles.length; i++) {
    const framePath = path.join(frameDir, frameFiles[i]);
    const isKeyframe = frameFiles[i].startsWith("keyframe_");
    const frameIndex = i;
    const timestampSeconds = isKeyframe ? 0 : frameIndex * intervalSeconds;

    // Compute duplicate hash
    let duplicateHash = "";
    try {
      const buf = fs.readFileSync(framePath);
      duplicateHash = crypto.createHash("md5").update(buf).digest("hex");
    } catch (_) {}

    // Get frame dimensions
    let width = 0, height = 0;
    try {
      const dimOut = execSync(
        `ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${framePath}" 2>/dev/null`,
        { encoding: "utf8", timeout: 10000 }
      );
      const parts = dimOut.trim().split(",");
      width = parseInt(parts[0]) || 0;
      height = parseInt(parts[1]) || 0;
    } catch (_) {}

    // Check for duplicate
    const [existing] = await db.execute<any[]>(
      `SELECT id FROM clone_training_frames WHERE duplicate_hash = ? AND upload_id != ? LIMIT 1`,
      [duplicateHash, uploadId]
    );
    const isDuplicate = (existing as any[]).length > 0;

    await db.execute(
      `INSERT INTO clone_training_frames 
       (upload_id, frame_path, timestamp_seconds, duplicate_hash, approved_for_training, rejection_reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        uploadId,
        framePath,
        timestampSeconds,
        duplicateHash,
        isDuplicate ? 0 : 1,
        isDuplicate ? "Duplicate frame detected" : null,
      ]
    );
    framesExtracted++;
  }

  // Update upload record
  await db.execute(
    `UPDATE clone_training_uploads SET processing_status='done', duration_seconds=? WHERE id=?`,
    [duration, uploadId]
  );

  return { framesExtracted, frameDir };
}

export async function generateVideoThumbnail(
  videoPath: string,
  outputPath: string
): Promise<string> {
  try {
    execSync(
      `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -q:v 2 "${outputPath}" -y 2>/dev/null`,
      { timeout: 30000 }
    );
    return outputPath;
  } catch (e) {
    throw new Error(`Thumbnail generation failed: ${(e as Error).message}`);
  }
}
