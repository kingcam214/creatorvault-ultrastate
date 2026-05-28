/**
 * TRAILER ASSEMBLY SERVICE
 * 
 * Builds promotional video packages from creator content:
 * - 30-90s vertical video (9:16)
 * - Platform-specific cuts (TikTok, Twitter, Telegram)
 * - Auto-generated copy (hook, caption, hashtags)
 * - Thumbnail variants
 */

import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import { randomUUID } from "crypto";

export interface TrailerTemplate {
  type: "profile_launch" | "content_drop" | "ppv_tease" | "milestone";
  hookDuration: number; // seconds
  contentDuration: number;
  ctaDuration: number;
  musicBed?: string;
}

export interface TrailerExport {
  tiktok: string; // 15s hook cut
  twitter: string; // 30s full
  telegram: string; // 60s with CTA
  instagram: string; // 9:16 reel
  thumbnail1: string;
  thumbnail2: string;
  thumbnail3: string;
  copy: {
    hook: string;
    caption: string;
    hashtags: string[];
    dmScript: string;
  };
}

/**
 * Validate project context before rendering
 */
export async function validateProjectContext(projectId: number, creatorId: number, db: any): Promise<boolean> {
  try {
    const result = await db.execute(`
      SELECT id, creator_id, status, source_files 
      FROM vaultx_editor_projects 
      WHERE id = ? AND creator_id = ? LIMIT 1
    `, [projectId, creatorId]);

    const rows = Array.isArray(result) && result[0] ? result[0] : [];
    if (!rows.length) {
      console.error(`[Trailer] Project ${projectId} not found for creator ${creatorId}`);
      return false;
    }

    const project = rows[0];
    const sourceFiles = project.source_files ? JSON.parse(project.source_files) : [];
    
    if (!sourceFiles.length) {
      console.error(`[Trailer] Project ${projectId} has no source files`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Trailer] Project validation error:", err);
    return false;
  }
}

/**
 * Assemble trailer from template and source content
 */
export async function assembleTrailer(
  projectId: number,
  creatorId: number,
  template: TrailerTemplate,
  sourceVideoPath: string,
  creatorHandle: string
): Promise<TrailerExport> {
  const outputDir = path.join("/root/creatorvault/dist/public/uploads/trailers", String(creatorId));
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const baseId = `trailer-${projectId}-${Date.now()}`;
  const exports: Partial<TrailerExport> = {};

  try {
    // Extract key moments for trailer assembly
    const moments = await extractKeyMoments(sourceVideoPath, 3);

    // Build trailer segments
    const hookSegment = moments[0];
    const contentSegment = moments[1] || moments[0];
    const ctaSegment = moments[2] || moments[0];

    // Assemble main trailer (60s vertical)
    const mainTrailerPath = path.join(outputDir, `${baseId}-main.mp4`);
    await assembleVerticalTrailer(
      sourceVideoPath,
      mainTrailerPath,
      hookSegment,
      contentSegment,
      ctaSegment,
      template
    );

    // Create platform-specific cuts
    exports.tiktok = await createPlatformCut(mainTrailerPath, outputDir, baseId, "tiktok", 15);
    exports.twitter = await createPlatformCut(mainTrailerPath, outputDir, baseId, "twitter", 30);
    exports.telegram = await createPlatformCut(mainTrailerPath, outputDir, baseId, "telegram", 60);
    exports.instagram = mainTrailerPath; // Full vertical

    // Generate thumbnails
    exports.thumbnail1 = await extractThumbnail(mainTrailerPath, outputDir, baseId, 1);
    exports.thumbnail2 = await extractThumbnail(mainTrailerPath, outputDir, baseId, 15);
    exports.thumbnail3 = await extractThumbnail(mainTrailerPath, outputDir, baseId, 30);

    // Generate copy
    exports.copy = generateTrailerCopy(template, creatorHandle);

    return exports as TrailerExport;
  } catch (err) {
    console.error("[Trailer] Assembly failed:", err);
    throw err;
  }
}

/**
 * Extract key moments from video for trailer assembly
 */
async function extractKeyMoments(videoPath: string, count: number): Promise<Array<{ start: number; end: number }>> {
  // In production, this would use scene detection or ML-based moment scoring
  // For now, return evenly distributed moments
  const moments = [];
  const segmentDuration = 10; // seconds per segment

  for (let i = 0; i < count; i++) {
    moments.push({
      start: i * segmentDuration,
      end: (i + 1) * segmentDuration,
    });
  }

  return moments;
}

/**
 * Assemble vertical trailer with hook, content, and CTA
 */
async function assembleVerticalTrailer(
  sourceVideoPath: string,
  outputPath: string,
  hookSegment: { start: number; end: number },
  contentSegment: { start: number; end: number },
  ctaSegment: { start: number; end: number },
  template: TrailerTemplate
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Extract segments
    const tmpDir = path.dirname(outputPath);
    const hookFile = path.join(tmpDir, `hook-${randomUUID()}.mp4`);
    const contentFile = path.join(tmpDir, `content-${randomUUID()}.mp4`);
    const ctaFile = path.join(tmpDir, `cta-${randomUUID()}.mp4`);

    let completed = 0;
    const checkComplete = () => {
      completed++;
      if (completed === 3) {
        // Concatenate segments
        const listFile = path.join(tmpDir, `concat-${randomUUID()}.txt`);
        fs.writeFileSync(
          listFile,
          [hookFile, contentFile, ctaFile].map((f) => `file '${f}'`).join("\n")
        );

        const proc = spawn("ffmpeg", [
          "-f", "concat",
          "-safe", "0",
          "-i", listFile,
          "-c", "copy",
          "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
          outputPath
        ]);

        proc.on("close", (code) => {
          // Cleanup
          [hookFile, contentFile, ctaFile, listFile].forEach((f) => {
            if (fs.existsSync(f)) fs.unlinkSync(f);
          });

          if (code === 0) resolve();
          else reject(new Error(`Trailer assembly failed: ${code}`));
        });
      }
    };

    // Extract hook
    const hookProc = spawn("ffmpeg", [
      "-i", sourceVideoPath,
      "-ss", String(hookSegment.start),
      "-to", String(hookSegment.end),
      "-c", "copy",
      hookFile
    ]);
    hookProc.on("close", () => checkComplete());

    // Extract content
    const contentProc = spawn("ffmpeg", [
      "-i", sourceVideoPath,
      "-ss", String(contentSegment.start),
      "-to", String(contentSegment.end),
      "-c", "copy",
      contentFile
    ]);
    contentProc.on("close", () => checkComplete());

    // Extract CTA
    const ctaProc = spawn("ffmpeg", [
      "-i", sourceVideoPath,
      "-ss", String(ctaSegment.start),
      "-to", String(ctaSegment.end),
      "-c", "copy",
      ctaFile
    ]);
    ctaProc.on("close", () => checkComplete());
  });
}

/**
 * Create platform-specific cut
 */
async function createPlatformCut(
  sourceVideoPath: string,
  outputDir: string,
  baseId: string,
  platform: string,
  durationSec: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, `${baseId}-${platform}.mp4`);
    const proc = spawn("ffmpeg", [
      "-i", sourceVideoPath,
      "-t", String(durationSec),
      "-c", "copy",
      outputPath
    ]);

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(`/uploads/trailers/${path.basename(outputDir)}/${path.basename(outputPath)}`);
      } else {
        reject(new Error(`Platform cut creation failed: ${code}`));
      }
    });
  });
}

/**
 * Extract thumbnail
 */
async function extractThumbnail(
  videoPath: string,
  outputDir: string,
  baseId: string,
  timestampSec: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, `${baseId}-thumb-${timestampSec}.jpg`);
    const proc = spawn("ffmpeg", [
      "-i", videoPath,
      "-ss", String(timestampSec),
      "-vframes", "1",
      "-vf", "scale=1080:1920",
      outputPath
    ]);

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(`/uploads/trailers/${path.basename(outputDir)}/${path.basename(outputPath)}`);
      } else {
        reject(new Error(`Thumbnail extraction failed: ${code}`));
      }
    });
  });
}

/**
 * Generate auto-copy for trailer
 */
function generateTrailerCopy(template: TrailerTemplate, creatorHandle: string): TrailerExport["copy"] {
  const hooks: Record<string, string> = {
    profile_launch: "New era unlocked 🔥",
    content_drop: "Fresh drop incoming 📲",
    ppv_tease: "Full access inside 🔐",
    milestone: "We hit it 🎉",
  };

  const captions: Record<string, string> = {
    profile_launch: `Join ${creatorHandle} for exclusive content. Subscribe now.`,
    content_drop: `New content just dropped. Don't miss it.`,
    ppv_tease: `Unlock the full experience. Link in bio.`,
    milestone: `Thank you for the support. More coming soon.`,
  };

  const hashtags = ["#creator", "#exclusive", "#vaultx", "#newcontent"];
  const dmScript = `Hey! Just dropped something new. Check it out → [link]`;

  return {
    hook: hooks[template.type] || "Check this out 👀",
    caption: captions[template.type] || "New content available now",
    hashtags,
    dmScript,
  };
}
