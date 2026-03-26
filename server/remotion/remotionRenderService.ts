/**
 * CreatorVault Remotion Render Service
 * Server-side rendering using @remotion/renderer + @remotion/bundler
 * Handles bundling, rendering, FFmpeg encoding, and output validation
 */
import path from "path";
import fs from "fs";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import type { RenderContract, RenderResult, MotionPreset } from "./types.js";
import { PRESET_REGISTRY } from "./types.js";

const execFileAsync = promisify(execFile);

const REMOTION_ROOT = "/root/creatorvault/server/remotion/Root.tsx";
const UPLOADS_DIR = process.env.STORAGE_DIR || "/root/creatorvault/storage/uploads";
const FONTS_DIR = "/root/creatorvault/assets/fonts";
const CHROMIUM_PATH = "/usr/bin/chromium-browser";

// Font family → TTF path mapping
const FONT_PATH_MAP: Record<string, string> = {
  BebasNeue: path.join(FONTS_DIR, "BebasNeue-Regular.ttf"),
  Anton: path.join(FONTS_DIR, "Anton-Regular.ttf"),
  Oswald: path.join(FONTS_DIR, "Oswald-Bold.ttf"),
  Montserrat: path.join(FONTS_DIR, "Montserrat-ExtraBold.ttf"),
  Raleway: path.join(FONTS_DIR, "Raleway-ExtraBold.ttf"),
  PlayfairDisplay: path.join(FONTS_DIR, "PlayfairDisplay-Bold.ttf"),
  Righteous: path.join(FONTS_DIR, "Righteous.ttf"),
  Orbitron: path.join(FONTS_DIR, "Orbitron-Black.ttf"),
  ChakraPetch: path.join(FONTS_DIR, "ChakraPetch-Bold.ttf"),
  PermanentMarker: path.join(FONTS_DIR, "PermanentMarker.ttf"),
  BarlowCondensed: path.join(FONTS_DIR, "BarlowCondensed-Black.ttf"),
};

// Composition ID selector based on mode and dimensions
function getCompositionId(contract: RenderContract): string {
  const { mode, width, height } = contract;
  const isSquare = Math.abs(width - height) < 100;
  const isPortrait = height > width;

  // Visual DNA compositions — pure CSS/React, no base image required
  if (mode === "visual_dna_portrait") return "VisualDNAPortrait";
  if (mode === "visual_dna_square") return "VisualDNASquare";
  if (mode === "visual_dna_landscape") return "VisualDNALandscape";
  if (mode === "visual_dna_thumbnail") return "VisualDNAThumbnail";
  if (mode === "visual_dna_broll") return "VisualDNABroll";
  if (mode === "visual_dna_title_card") return "VisualDNATitleCard";

  // 3D Empire compositions
  if (mode === "episode_trailer") return "EpisodeTrailer";
  if (mode === "empire_map_snapshot") return "EmpireMapSnapshot";

  if (mode === "album_cover") {
    return isSquare ? "AlbumCoverSquare" : "AlbumCoverPortrait";
  }
  // flyer / promo_art
  if (isSquare) return "MotionFlyerSquare";
  if (isPortrait) return "MotionFlyerPortrait";
  return "MotionFlyerLandscape";
}

// Validate output file with ffprobe
async function validateOutput(videoPath: string, expectedDuration: number): Promise<void> {
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Output file does not exist: ${videoPath}`);
  }
  const stat = fs.statSync(videoPath);
  if (stat.size < 10000) {
    throw new Error(`Output file too small (${stat.size} bytes): ${videoPath}`);
  }

  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "quiet",
      "-print_format", "json",
      "-show_streams",
      "-show_format",
      videoPath,
    ]);
    const probe = JSON.parse(stdout);
    const videoStream = probe.streams?.find((s: any) => s.codec_type === "video");
    if (!videoStream) throw new Error("No video stream found in output");

    const duration = parseFloat(probe.format?.duration || "0");
    const tolerance = Math.max(2, expectedDuration * 0.15);
    if (Math.abs(duration - expectedDuration) > tolerance) {
      throw new Error(`Duration mismatch: expected ${expectedDuration}s, got ${duration.toFixed(2)}s`);
    }
  } catch (err: any) {
    if (err.message.includes("Duration mismatch") || err.message.includes("No video stream")) {
      throw err;
    }
    // ffprobe not found or other error — skip validation
    console.warn("[RemotionRender] ffprobe validation skipped:", err.message);
  }
}

// Extract thumbnail frame
async function extractThumbnail(videoPath: string, outputPath: string): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-i", videoPath,
    "-ss", "1.5",
    "-frames:v", "1",
    "-q:v", "2",
    outputPath,
  ]);
}

// Bundle cache to avoid re-bundling the same composition
let bundleCache: { bundleDir: string; timestamp: number } | null = null;
const BUNDLE_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function getOrCreateBundle(): Promise<string> {
  const now = Date.now();
  if (bundleCache && now - bundleCache.timestamp < BUNDLE_TTL_MS) {
    if (fs.existsSync(bundleCache.bundleDir)) {
      return bundleCache.bundleDir;
    }
  }

  console.log("[RemotionRender] Bundling compositions...");
  const { bundle } = await import("@remotion/bundler");
  const bundleDir = await bundle({
    entryPoint: REMOTION_ROOT,
    onProgress: (p) => {
      if (p % 20 === 0) console.log(`[RemotionRender] Bundle progress: ${p}%`);
    },
  });

  bundleCache = { bundleDir, timestamp: now };
  console.log("[RemotionRender] Bundle ready:", bundleDir);
  return bundleDir;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RENDER FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
export async function renderWithRemotion(contract: RenderContract): Promise<RenderResult> {
  const startMs = Date.now();
  const { jobId, width, height, fps, durationSeconds, motionPreset } = contract;

  console.log(`[RemotionRender] Starting job ${jobId}: ${motionPreset} ${width}x${height} ${durationSeconds}s`);

  // Ensure the image is accessible via URL for Remotion
  // Remotion renders in a browser context, so we need a local HTTP URL
  const imageFilename = path.basename(contract.baseImagePath);
  const imageUrl = `http://localhost:${process.env.PORT || 3000}/uploads/${imageFilename}`;

  const tmpDir = os.tmpdir();
  const rawVideoPath = path.join(tmpDir, `remotion-raw-${jobId}.mp4`);
  const finalVideoPath = path.join(UPLOADS_DIR, `motion-${jobId}.mp4`);
  const thumbnailPath = path.join(UPLOADS_DIR, `motion-thumb-${jobId}.jpg`);

  try {
    // 1. Get or create bundle
    const bundleDir = await getOrCreateBundle();

    // 2. Prepare render props
    const renderProps: RenderContract = {
      ...contract,
      baseImageUrl: imageUrl,
    };

    // 3. Render with Remotion
    // For 3D empire compositions, parse vibe JSON as inputProps
    let finalInputProps: any = renderProps;
    if ((contract.mode === "episode_trailer" || contract.mode === "empire_map_snapshot") && contract.vibe) {
      try {
        const vibeData = JSON.parse(contract.vibe);
        finalInputProps = { ...vibeData };
      } catch (_) {}
    }
    const { renderMedia, selectComposition } = await import("@remotion/renderer");

    const compositionId = getCompositionId(contract);
    const durationInFrames = Math.round(durationSeconds * fps);

    const composition = await selectComposition({
      serveUrl: bundleDir,
      id: compositionId,
      inputProps: renderProps,
      chromiumOptions: {
        executablePath: CHROMIUM_PATH,
        disableWebSecurity: true,
        headless: true,
      },
    });

    await renderMedia({
      composition: {
        ...composition,
        durationInFrames,
        fps,
        width,
        height,
      },
      serveUrl: bundleDir,
      codec: "h264",
      outputLocation: rawVideoPath,
      inputProps: finalInputProps,
      chromiumOptions: {
        executablePath: CHROMIUM_PATH,
        disableWebSecurity: true,
        headless: true,
      },
      onProgress: ({ progress }) => {
        const pct = Math.round(progress * 100);
        if (pct % 10 === 0) console.log(`[RemotionRender] ${jobId} render: ${pct}%`);
      },
      timeoutInMilliseconds: 300000, // 5 minutes max
      concurrency: 2,
      crf: 18,
      pixelFormat: "yuv420p",
    });

    // 4. FFmpeg post-processing: faststart + final encode
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", rawVideoPath,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "20",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      finalVideoPath,
    ]);

    // 5. Validate output
    await validateOutput(finalVideoPath, durationSeconds);

    // 6. Extract thumbnail
    try {
      await extractThumbnail(finalVideoPath, thumbnailPath);
    } catch (thumbErr) {
      console.warn("[RemotionRender] Thumbnail extraction failed:", thumbErr);
    }

    // 7. Cleanup temp
    try { fs.unlinkSync(rawVideoPath); } catch {}

    const renderMs = Date.now() - startMs;
    const videoUrl = `/uploads/motion-${jobId}.mp4`;
    const thumbUrl = fs.existsSync(thumbnailPath) ? `/uploads/motion-thumb-${jobId}.jpg` : undefined;

    console.log(`[RemotionRender] Job ${jobId} complete in ${(renderMs / 1000).toFixed(1)}s → ${videoUrl}`);

    return {
      jobId,
      success: true,
      videoPath: finalVideoPath,
      videoUrl,
      thumbnailPath: fs.existsSync(thumbnailPath) ? thumbnailPath : undefined,
      thumbnailUrl: thumbUrl,
      engine: "remotion",
      durationSeconds,
      width,
      height,
      preset: motionPreset,
      renderMs,
    };

  } catch (err: any) {
    // Cleanup on failure
    try { fs.unlinkSync(rawVideoPath); } catch {}
    try { fs.unlinkSync(finalVideoPath); } catch {}

    console.error(`[RemotionRender] Job ${jobId} FAILED:`, err.message);

    return {
      jobId,
      success: false,
      videoPath: "",
      videoUrl: "",
      engine: "remotion",
      durationSeconds,
      width,
      height,
      preset: motionPreset,
      renderMs: Date.now() - startMs,
      error: err.message,
    };
  }
}
