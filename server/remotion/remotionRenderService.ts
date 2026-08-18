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

const REMOTION_ROOT = process.env.REMOTION_ROOT || path.resolve(process.cwd(), "server/remotion/Root.tsx");
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

  if (mode === "caption_stage") return "CreatorVaultRuntimeCaptionStage";
  if (mode === "source_preserving_master") return "CreatorVaultSourcePreservingMaster";

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
let flyerBundleCache: { bundleDir: string; timestamp: number } | null = null;
let captionBundleCache: { bundleDir: string; timestamp: number } | null = null;
const BUNDLE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const RUNTIME_FLYER_ENTRY = path.join(os.tmpdir(), "creatorvault-motion-flyer-runtime-entry.tsx");
const RUNTIME_CAPTION_ENTRY = path.join(os.tmpdir(), "creatorvault-caption-stage-runtime-entry.tsx");

const RUNTIME_FLYER_SOURCE = `import React from "react";
import { AbsoluteFill, Composition, Video, interpolate, registerRoot, spring, useCurrentFrame, useVideoConfig } from "remotion";
const color = (value, fallback) => { const raw = String(value || "").trim(); return raw ? (raw.startsWith("#") ? raw : "#" + raw) : fallback; };
const Flyer = ({ artistName = "CreatorVault", songTitle = "THE MOMENT", subtitle = "Make it impossible to ignore.", callToAction = "ENTER THE VAULT", accentColor = "D4AF37", textColor = "FFFFFF", backgroundVideoUrl = "" }) => {
  const frame = useCurrentFrame(); const { fps, width, height } = useVideoConfig(); const accent = color(accentColor, "#D4AF37"); const text = color(textColor, "#FFFFFF");
  const top = spring({ frame: Math.max(0, frame - 4), fps, config: { damping: 18, stiffness: 135 } });
  const title = spring({ frame: Math.max(0, frame - 13), fps, config: { damping: 17, stiffness: 105 } });
  const body = spring({ frame: Math.max(0, frame - 30), fps, config: { damping: 18, stiffness: 110 } });
  const exit = interpolate(frame, [Math.max(0, Math.round(fps * 5.2)), Math.round(fps * 5.85)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ backgroundColor: "#080706", overflow: "hidden" }}>
    {backgroundVideoUrl ? <Video src={backgroundVideoUrl} muted style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center" }} /> : null}
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,7,6,.84) 0%, rgba(8,7,6,.15) 28%, rgba(8,7,6,.22) 56%, rgba(8,7,6,.92) 100%)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(8,7,6,.72) 0%, transparent 57%, rgba(8,7,6,.18) 100%)" }} />
    <div style={{ position: "absolute", top: height * .075, left: width * .07, right: width * .07, opacity: top * (1 - exit), transform: "translateY(" + interpolate(top, [0,1], [-36,0]) + "px)" }}><div style={{ display: "flex", alignItems: "center", gap: 16 }}><div style={{ height: 2, width: 56, backgroundColor: accent }} /><div style={{ color: accent, fontFamily: "Arial, sans-serif", fontSize: Math.min(width*.026,29), fontWeight: 800, letterSpacing: ".24em", textTransform: "uppercase" }}>{artistName}</div></div></div>
    <div style={{ position: "absolute", left: width*.07, right: width*.07, bottom: height*.105, opacity: title * (1-exit), transform: "translateY(" + interpolate(title, [0,1], [72,0]) + "px)" }}><div style={{ color: text, fontFamily: "Arial, sans-serif", fontSize: Math.min(width*.148,154), fontWeight: 900, lineHeight: .82, letterSpacing: "-.075em", textTransform: "uppercase", textShadow: "0 8px 32px rgba(0,0,0,.48)" }}>{songTitle}</div><div style={{ width:76, height:3, marginTop:38, backgroundColor:accent, opacity:body }} /><div style={{ marginTop:28, maxWidth:width*.75, color:text, fontFamily:"Arial, sans-serif", fontSize:Math.min(width*.039,42), fontWeight:600, letterSpacing:"-.018em", lineHeight:1.16, opacity:body }}>{subtitle}</div><div style={{ marginTop:42, display:"inline-flex", border:"1px solid " + accent, color:accent, fontFamily:"Arial, sans-serif", fontSize:Math.min(width*.025,28), fontWeight:800, letterSpacing:".12em", padding:"19px 24px", textTransform:"uppercase", opacity:body }}>{callToAction}</div></div>
  </AbsoluteFill>;
};
const Root = () => <Composition id="CreatorVaultRuntimeMotionFlyer" component={Flyer} durationInFrames={180} fps={30} width={1080} height={1920} defaultProps={{}} />;
registerRoot(Root);`;

const RUNTIME_CAPTION_SOURCE = `import React from "react";
import { AbsoluteFill, Composition, Video, registerRoot, useCurrentFrame, useVideoConfig } from "remotion";
const getTheme = (style) => ({
  command: { fontFamily: "Arial Black, Arial, sans-serif", weight: 900, textTransform: "uppercase", background: "rgba(4,4,6,.78)", color: "#FFFFFF", border: "2px solid rgba(255,255,255,.92)", shadow: "0 12px 36px rgba(0,0,0,.6)", letterSpacing: "-.05em" },
  glow: { fontFamily: "Arial Black, Arial, sans-serif", weight: 900, textTransform: "uppercase", background: "rgba(57,22,87,.62)", color: "#F7EEFF", border: "2px solid #E8D2FF", shadow: "0 0 28px rgba(214,152,255,.9), 0 12px 36px rgba(0,0,0,.6)", letterSpacing: "-.045em" },
  silk: { fontFamily: "Georgia, serif", weight: 700, textTransform: "none", background: "rgba(20,9,14,.72)", color: "#FFF7F0", border: "1px solid rgba(255,236,220,.72)", shadow: "0 12px 36px rgba(0,0,0,.64)", letterSpacing: "-.025em" },
  paper: { fontFamily: "Arial Black, Arial, sans-serif", weight: 900, textTransform: "uppercase", background: "#F7F1E7", color: "#080808", border: "0", shadow: "0 12px 36px rgba(0,0,0,.48)", letterSpacing: "-.045em" },
}[style] || {});
const CaptionMaster = ({ backgroundVideoUrl = "", captionSegments = [], captionStyle = "command", captionPlacement = "lower", captionSafeZone = "vertical" }) => {
  const frame = useCurrentFrame(); const { fps, width, height } = useVideoConfig(); const seconds = frame / fps;
  const active = captionSegments.find((segment) => seconds >= Number(segment.start) && seconds <= Number(segment.end));
  const theme = getTheme(captionStyle); const safeInset = captionSafeZone === "vertical" ? height * .13 : captionSafeZone === "square" ? height * .1 : height * .08;
  const position = captionPlacement === "top" ? { top: safeInset } : captionPlacement === "center" ? { top: height * .5, transform: "translateY(-50%)" } : { bottom: safeInset };
  return <AbsoluteFill style={{ backgroundColor: "#050505", overflow: "hidden" }}>
    {backgroundVideoUrl ? <Video src={backgroundVideoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
    {active ? <div style={{ position: "absolute", left: width * .075, right: width * .075, display: "flex", justifyContent: "center", ...position }}><div style={{ maxWidth: width * .85, padding: Math.max(14, width*.022) + "px " + Math.max(18, width*.032) + "px", borderRadius: Math.max(12, width*.018), textAlign: "center", fontFamily: theme.fontFamily, fontWeight: theme.weight, textTransform: theme.textTransform, background: theme.background, color: theme.color, border: theme.border, boxShadow: theme.shadow, letterSpacing: theme.letterSpacing, fontSize: Math.min(width * .075, height * .064), lineHeight: .9 }}>{String(active.text || "").trim()}</div></div> : null}
  </AbsoluteFill>;
};
const Root = () => <Composition id="CreatorVaultRuntimeCaptionStage" component={CaptionMaster} durationInFrames={180} fps={30} width={1080} height={1920} defaultProps={{}} />;
registerRoot(Root);`;

async function getOrCreateBundle(contract: RenderContract): Promise<string> {
  const isRuntimeFlyer = contract.mode === "flyer";
  const isRuntimeCaption = contract.mode === "caption_stage";
  const now = Date.now();
  const cached = isRuntimeFlyer ? flyerBundleCache : isRuntimeCaption ? captionBundleCache : bundleCache;
  if (cached && now - cached.timestamp < BUNDLE_TTL_MS && fs.existsSync(cached.bundleDir)) return cached.bundleDir;

  if (isRuntimeFlyer) await fs.promises.writeFile(RUNTIME_FLYER_ENTRY, RUNTIME_FLYER_SOURCE, "utf8");
  if (isRuntimeCaption) await fs.promises.writeFile(RUNTIME_CAPTION_ENTRY, RUNTIME_CAPTION_SOURCE, "utf8");
  console.log("[RemotionRender] Bundling compositions...");
  const { bundle } = await import("@remotion/bundler");
  const bundleDir = await bundle({
    entryPoint: isRuntimeFlyer ? RUNTIME_FLYER_ENTRY : isRuntimeCaption ? RUNTIME_CAPTION_ENTRY : REMOTION_ROOT,
    onProgress: (p) => { if (p % 20 === 0) console.log(`[RemotionRender] Bundle progress: ${p}%`); },
  });

  const nextCache = { bundleDir, timestamp: now };
  if (isRuntimeFlyer) flyerBundleCache = nextCache; else if (isRuntimeCaption) captionBundleCache = nextCache; else bundleCache = nextCache;
  console.log("[RemotionRender] Bundle ready:", bundleDir);
  return bundleDir;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RENDER FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
export type SourceVideoInspection = {
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
};

function parseFrameRate(value: unknown): number {
  const [numerator, denominator] = String(value || "").split("/").map(Number);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return numerator / denominator;
}

/** Technical source read only. No frames are edited, generated, or persisted. */
export async function inspectSourceVideoForRemotion(sourceVideoUrl: string): Promise<SourceVideoInspection> {
  if (!/^https:\/\//i.test(String(sourceVideoUrl || ""))) {
    throw new Error("CreatorVault requires a secure approved source URL before it can inspect a video.");
  }
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height,r_frame_rate:format=duration",
    "-of", "json",
    sourceVideoUrl,
  ], { maxBuffer: 1024 * 1024 });
  const parsed = JSON.parse(stdout) as { streams?: Array<{ width?: number; height?: number; r_frame_rate?: string }>; format?: { duration?: string } };
  const stream = parsed.streams?.[0];
  const durationSeconds = Number(parsed.format?.duration || 0);
  const fps = parseFrameRate(stream?.r_frame_rate);
  const width = Number(stream?.width || 0);
  const height = Number(stream?.height || 0);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || !Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || !Number.isFinite(fps) || fps <= 0) {
    throw new Error("CreatorVault could not verify the source video’s duration, frame size, and frame rate.");
  }
  return { durationSeconds, width, height, fps };
}

export type SourcePreservingMasterRequest = {
  jobId: string;
  sourceVideoUrl: string;
  durationSeconds: number;
  width: number;
  height: number;
  fps?: number;
  preserveSourceAudio?: boolean;
};

function assertSourcePreservingMasterRequest(input: SourcePreservingMasterRequest): void {
  if (!/^https:\/\//i.test(String(input.sourceVideoUrl || ""))) {
    throw new Error("CreatorVault Source-Preserving Master requires a secure approved source URL.");
  }
  if (!Number.isFinite(input.durationSeconds) || input.durationSeconds <= 0) {
    throw new Error("CreatorVault Source-Preserving Master requires the verified source duration.");
  }
  if (!Number.isInteger(input.width) || !Number.isInteger(input.height) || input.width <= 0 || input.height <= 0) {
    throw new Error("CreatorVault Source-Preserving Master requires valid output dimensions.");
  }
}

/**
 * Packages an existing CreatorVault video as a durable source-preserving MP4.
 * It is intentionally not a synthetic creation route and accepts no creative props.
 */
export async function renderSourcePreservingMaster(input: SourcePreservingMasterRequest): Promise<RenderResult> {
  assertSourcePreservingMasterRequest(input);
  return renderWithRemotion({
    jobId: input.jobId,
    mode: "source_preserving_master",
    baseImagePath: "",
    baseImageUrl: "",
    sourceVideoUrl: input.sourceVideoUrl,
    width: input.width,
    height: input.height,
    fps: input.fps || 30,
    durationSeconds: input.durationSeconds,
    motionPreset: "neon_pulse",
    premiumMode: false,
    cinematicMode: false,
    artistName: "",
    songTitle: "",
    subtitle: "",
    textPreset: "none",
    accentColor: "",
    textColor: "",
    fontFamily: "",
    preserveSourceAudio: input.preserveSourceAudio !== false,
  });
}

export async function renderVerifiedSourcePreservingMaster(input: {
  jobId: string;
  sourceVideoUrl: string;
  preserveSourceAudio?: boolean;
}): Promise<{ source: SourceVideoInspection; render: RenderResult }> {
  const source = await inspectSourceVideoForRemotion(input.sourceVideoUrl);
  const render = await renderSourcePreservingMaster({
    jobId: input.jobId,
    sourceVideoUrl: input.sourceVideoUrl,
    durationSeconds: source.durationSeconds,
    width: source.width,
    height: source.height,
    fps: source.fps,
    preserveSourceAudio: input.preserveSourceAudio !== false,
  });
  return { source, render };
}

export async function renderWithRemotion(contract: RenderContract & { sourceVideoUrl?: string; preserveSourceAudio?: boolean }): Promise<RenderResult> {
  const startMs = Date.now();
  const { jobId, width, height, fps, durationSeconds, motionPreset } = contract;

  console.log(`[RemotionRender] Starting job ${jobId}: ${motionPreset} ${width}x${height} ${durationSeconds}s`);

  // Remotion renders in a browser context. Preserve an intentionally empty still-image
  // source for motion-first flyers rather than fabricating a broken /uploads/ request.
  const imageFilename = contract.baseImagePath ? path.basename(contract.baseImagePath) : "";
  const imageUrl = imageFilename ? `http://localhost:${process.env.PORT || 3000}/uploads/${imageFilename}` : "";

  const tmpDir = os.tmpdir();
  const rawVideoPath = path.join(tmpDir, `remotion-raw-${jobId}.mp4`);
  const finalVideoPath = path.join(UPLOADS_DIR, `motion-${jobId}.mp4`);
  const thumbnailPath = path.join(UPLOADS_DIR, `motion-thumb-${jobId}.jpg`);

  try {
    // 1. Get or create bundle
    const bundleDir = await getOrCreateBundle(contract);

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

    const compositionId = contract.mode === "flyer" ? "CreatorVaultRuntimeMotionFlyer" : contract.mode === "caption_stage" ? "CreatorVaultRuntimeCaptionStage" : getCompositionId(contract);
    const durationInFrames = Math.round(durationSeconds * fps);

    const composition = await selectComposition({
      serveUrl: bundleDir,
      id: compositionId,
      inputProps: renderProps as unknown as Record<string, unknown>,
      chromiumOptions: {
        // executablePath: CHROMIUM_PATH, // set via env REMOTION_CHROME_EXECUTABLE
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
      inputProps: finalInputProps as unknown as Record<string, unknown>,
      chromiumOptions: {
        // executablePath: CHROMIUM_PATH, // set via env REMOTION_CHROME_EXECUTABLE
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
