/**
 * CreatorVault Automated Director — Local Render Script
 * Runs the full pipeline: bundle → render → FFmpeg post-process
 * Uses @remotion/bundler + @remotion/renderer (same as production)
 */
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const REMOTION_ROOT = "/home/ubuntu/creatorvault-build/server/remotion/Root.tsx";
const ASSETS_DIR = "/tmp/remotion_build/assets";
const OUT_DIR = "/tmp/remotion_build";
const OUTPUT_FILE = path.join(OUT_DIR, "automated_director_output.mp4");

// Source video — the royalty-free clip we downloaded
const SOURCE_VIDEO_URL = "https://cdn.pixabay.com/video/2020/07/18/44940-439914545_large.mp4";

// AI-generated overlay assets (served via local file:// for Remotion)
const HOOK_OVERLAY = path.join(ASSETS_DIR, "overlay_hook.png");
const CTA_OVERLAY = path.join(ASSETS_DIR, "overlay_cta.png");
const ENERGY_OVERLAY = path.join(ASSETS_DIR, "scene_energy_high.png");

// ── Verify assets ─────────────────────────────────────────────────────────────
console.log("=== CreatorVault Automated Director Render ===\n");

const hookExists = fs.existsSync(HOOK_OVERLAY);
const ctaExists = fs.existsSync(CTA_OVERLAY);
const energyExists = fs.existsSync(ENERGY_OVERLAY);

console.log(`Assets:`);
console.log(`  Hook overlay:   ${hookExists ? "✓" : "✗"} ${HOOK_OVERLAY}`);
console.log(`  CTA overlay:    ${ctaExists ? "✓" : "✗"} ${CTA_OVERLAY}`);
console.log(`  Energy overlay: ${energyExists ? "✓" : "✗"} ${ENERGY_OVERLAY}`);

if (!hookExists || !ctaExists) {
  console.error("\nERROR: Required overlay assets missing. Run generate_assets_real.py first.");
  process.exit(1);
}

// Serve assets via HTTP — Remotion's browser context blocks file:// URLs
const ASSET_SERVER = 'http://localhost:3001';
const hookUrl = `${ASSET_SERVER}/overlay_hook.png`;
const ctaUrl = `${ASSET_SERVER}/overlay_cta.png`;
const energyUrl = energyExists ? `${ASSET_SERVER}/scene_energy_high.png` : undefined;

const inputProps = {
  sourceVideoUrl: SOURCE_VIDEO_URL,
  hookOverlayUrl: hookUrl,
  ctaOverlayUrl: ctaUrl,
  energyOverlayUrl: energyUrl,
  hookText: "ONLY THE BEST",
  ctaText: "SUBSCRIBE · EXCLUSIVE ACCESS",
  creatorName: "VAULT",
  platform: "onlyfans",
  aiPacingApplied: true,
  scenesDetected: 4,
};

console.log(`\nComposition: AutomatedDirectorLandscape`);
console.log(`Resolution: 1920x1080 @ 30fps`);
console.log(`Duration: 5s (150 frames)`);
console.log(`Hook text: "${inputProps.hookText}"`);
console.log(`CTA text: "${inputProps.ctaText}"`);
console.log(`AI Pacing: ${inputProps.aiPacingApplied}`);
console.log(`\nStarting render...\n`);

const startMs = Date.now();

// ── Step 1: Bundle ────────────────────────────────────────────────────────────
console.log("[1/4] Bundling Remotion compositions...");
const bundleDir = await bundle({
  entryPoint: REMOTION_ROOT,
  onProgress: (p) => {
    if (p % 25 === 0) process.stdout.write(`  Bundle: ${p}%\r`);
  },
});
console.log(`  ✓ Bundle ready: ${bundleDir}`);

// ── Step 2: Select composition ────────────────────────────────────────────────
console.log("\n[2/4] Selecting composition...");
const composition = await selectComposition({
  serveUrl: bundleDir,
  id: "AutomatedDirectorLandscape",
  inputProps,
  chromiumOptions: {
    disableWebSecurity: true,
    headless: true,
  },
});
console.log(`  ✓ Composition: ${composition.id} (${composition.width}x${composition.height}, ${composition.durationInFrames} frames)`);

// ── Step 3: Render ────────────────────────────────────────────────────────────
const rawOutput = path.join(OUT_DIR, "raw_output.mp4");
console.log("\n[3/4] Rendering with Remotion...");

await renderMedia({
  composition: {
    ...composition,
    durationInFrames: 150,
    fps: 30,
    width: 1920,
    height: 1080,
  },
  serveUrl: bundleDir,
  codec: "h264",
  outputLocation: rawOutput,
  inputProps,
  chromiumOptions: {
    disableWebSecurity: true,
    headless: true,
  },
  onProgress: ({ progress }) => {
    const pct = Math.round(progress * 100);
    process.stdout.write(`  Rendering: ${pct}%\r`);
  },
  timeoutInMilliseconds: 300000,
  concurrency: 2,
  crf: 16,
  pixelFormat: "yuv420p",
});
console.log(`\n  ✓ Raw render complete: ${rawOutput}`);

// ── Step 4: FFmpeg post-process (faststart + master quality) ──────────────────
console.log("\n[4/4] FFmpeg post-processing (CRF 14, faststart)...");
await execFileAsync("ffmpeg", [
  "-y",
  "-i", rawOutput,
  "-c:v", "libx264",
  "-preset", "slow",
  "-crf", "14",
  "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  "-an",
  OUTPUT_FILE,
]);
console.log(`  ✓ Final output: ${OUTPUT_FILE}`);

// Cleanup raw
try { fs.unlinkSync(rawOutput); } catch {}

// ── Report ────────────────────────────────────────────────────────────────────
const stat = fs.statSync(OUTPUT_FILE);
const renderMs = Date.now() - startMs;

console.log(`\n${"=".repeat(50)}`);
console.log(`AUTOMATED DIRECTOR RENDER COMPLETE`);
console.log(`${"=".repeat(50)}`);
console.log(`Output:    ${OUTPUT_FILE}`);
console.log(`Size:      ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
console.log(`Duration:  5.0s`);
console.log(`Render:    ${(renderMs / 1000).toFixed(1)}s`);
console.log(`Pipeline:  DALL-E 3 overlays → Remotion render → FFmpeg CRF14`);
console.log(`${"=".repeat(50)}\n`);
