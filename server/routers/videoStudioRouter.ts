/**
 * VaultX Video Studio — REST Router
 * ============================================================================
 * Handles all /api/video-studio/* endpoints called by VaultXStudio.tsx
 *
 * Endpoints:
 *   POST /api/video-studio/filter      { video, filter, intensity }
 *   POST /api/video-studio/trim        { video, start, end }
 *   POST /api/video-studio/watermark   { video, mode, text, position, opacity, size, color }
 *   POST /api/video-studio/convert     { video, format, resolution }
 *   POST /api/video-studio/add-text    { video, text, position, fontSize, color, start, end }
 *   POST /api/video-studio/audio       { video, mode, volume, fadeIn, fadeOut }
 *   POST /api/video-studio/color-grade { video, look, brightness, contrast, saturation }
 *
 * All endpoints:
 *   1. Accept multipart/form-data via multer (memStorage)
 *   2. Write input to /tmp
 *   3. Run FFmpeg
 *   4. Upload output to storage via storagePut()
 *   5. Return { url: string }
 * ============================================================================
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import os from "os";
import { storagePut } from "../storage";

const execAsync = promisify(exec);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });
const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function withTempVideo(
  buffer: Buffer,
  fn: (inputPath: string, outputPath: string) => Promise<void>,
  ext = "mp4"
): Promise<Buffer> {
  const id = randomUUID();
  const inputPath = path.join(os.tmpdir(), `vaultx-in-${id}.mp4`);
  const outputPath = path.join(os.tmpdir(), `vaultx-out-${id}.${ext}`);
  try {
    await writeFile(inputPath, buffer);
    await fn(inputPath, outputPath);
    const result = await readFile(outputPath);
    return result;
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

async function uploadAndRespond(res: Response, buffer: Buffer, filename: string) {
  const key = `vaultx-studio/${randomUUID()}/${filename}`;
  const { url } = await storagePut(key, buffer, "video/mp4");
  res.json({ url, filename });
}

function handleError(res: Response, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("[VideoStudio]", msg);
  res.status(500).json({ error: msg });
}

// ─── /filter — beauty, skin smooth, denoise, color filters ───────────────────

router.post("/filter", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file" });
    const filter = (req.body.filter as string) || "beauty";
    const intensity = Math.min(100, Math.max(0, parseInt(req.body.intensity || "70"))) / 100;

    let vfFilter = "";
    switch (filter) {
      case "beauty":
      case "smooth":
        vfFilter = `smartblur=lr=${1 + intensity * 2}:ls=-1:lt=0,eq=brightness=${0.02 * intensity}:saturation=${1 + 0.2 * intensity}`;
        break;
      case "glow":
        vfFilter = `gblur=sigma=${1 + intensity * 3},eq=brightness=${0.05 * intensity}:saturation=${1 + 0.3 * intensity}`;
        break;
      case "warm":
        vfFilter = `colorbalance=rs=${0.1 * intensity}:gs=${0.05 * intensity}:bs=${-0.05 * intensity}`;
        break;
      case "cool":
        vfFilter = `colorbalance=rs=${-0.05 * intensity}:gs=${0.02 * intensity}:bs=${0.1 * intensity}`;
        break;
      case "vintage":
        vfFilter = `curves=vintage,vignette=PI/4`;
        break;
      case "moody":
        vfFilter = `eq=brightness=${-0.05 * intensity}:contrast=${1 + 0.3 * intensity}:saturation=${0.8}`;
        break;
      case "denoise":
        vfFilter = `hqdn3d=${intensity * 5}:${intensity * 5}:${intensity * 10}:${intensity * 10}`;
        break;
      case "sharpen":
        vfFilter = `unsharp=5:5:${intensity}:5:5:0`;
        break;
      default:
        vfFilter = `eq=brightness=0:saturation=1`;
    }

    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -vf "${vfFilter}" -c:a copy -y "${out}"`);
    });

    await uploadAndRespond(res, outputBuffer, `vaultx-filter-${filter}.mp4`);
  } catch (e) { handleError(res, e); }
});

// ─── /trim — cut start/end ────────────────────────────────────────────────────

router.post("/trim", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file" });
    const start = parseFloat(req.body.start || "0");
    const end = parseFloat(req.body.end || "30");
    const duration = end - start;

    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -ss ${start} -t ${duration} -c copy -y "${out}"`);
    });

    await uploadAndRespond(res, outputBuffer, `vaultx-trim-${start}-${end}.mp4`);
  } catch (e) { handleError(res, e); }
});

// ─── /watermark — text/logo watermark ────────────────────────────────────────

router.post("/watermark", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file" });
    const text = (req.body.text as string) || "@creator";
    const position = (req.body.position as string) || "bottom-right";
    const opacity = parseFloat(req.body.opacity || "0.7");
    const fontSize = parseInt(req.body.size || "28");
    const color = (req.body.color as string) || "white";

    const posMap: Record<string, string> = {
      "top-left":     "x=20:y=20",
      "top-right":    "x=w-tw-20:y=20",
      "bottom-left":  "x=20:y=h-th-20",
      "bottom-right": "x=w-tw-20:y=h-th-20",
      "center":       "x=(w-tw)/2:y=(h-th)/2",
    };
    const pos = posMap[position] || posMap["bottom-right"];
    const safeText = text.replace(/'/g, "\\'").replace(/:/g, "\\:");
    const vfFilter = `drawtext=text='${safeText}':fontsize=${fontSize}:fontcolor=${color}@${opacity}:${pos}`;

    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -vf "${vfFilter}" -c:a copy -y "${out}"`);
    });

    await uploadAndRespond(res, outputBuffer, `vaultx-watermark.mp4`);
  } catch (e) { handleError(res, e); }
});

// ─── /convert — format conversion, resolution change ─────────────────────────

router.post("/convert", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file" });
    const format = (req.body.format as string) || "mp4_h264";
    const resolution = (req.body.resolution as string) || "1080p";

    const resMap: Record<string, string> = {
      "720p":  "1280:720",
      "1080p": "1920:1080",
      "4k":    "3840:2160",
      "480p":  "854:480",
      "360p":  "640:360",
    };
    const scaleStr = resMap[resolution] || resMap["1080p"];
    const vfFilter = `scale=${scaleStr}:force_original_aspect_ratio=decrease,pad=${scaleStr}:(ow-iw)/2:(oh-ih)/2`;

    let codec = "-c:v libx264 -crf 23 -preset fast";
    if (format === "mp4_h265") codec = "-c:v libx265 -crf 28 -preset fast";
    if (format === "webm") codec = "-c:v libvpx-vp9 -crf 30 -b:v 0";

    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -vf "${vfFilter}" ${codec} -c:a aac -b:a 128k -y "${out}"`);
    });

    await uploadAndRespond(res, outputBuffer, `vaultx-converted-${resolution}.mp4`);
  } catch (e) { handleError(res, e); }
});

// ─── /add-text — burn-in captions / title cards ───────────────────────────────

router.post("/add-text", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file" });
    const text = (req.body.text as string) || "Caption";
    const position = (req.body.position as string) || "bottom";
    const fontSize = parseInt(req.body.fontSize || "36");
    const color = (req.body.color as string) || "white";
    const startTime = parseFloat(req.body.start || "0");
    const endTime = parseFloat(req.body.end || "999");

    const posMap: Record<string, string> = {
      "top":    "x=(w-tw)/2:y=40",
      "center": "x=(w-tw)/2:y=(h-th)/2",
      "bottom": "x=(w-tw)/2:y=h-th-40",
    };
    const pos = posMap[position] || posMap["bottom"];
    const safeText = text.replace(/'/g, "\\'").replace(/:/g, "\\:");
    const vfFilter = `drawtext=text='${safeText}':fontsize=${fontSize}:fontcolor=${color}:${pos}:enable='between(t,${startTime},${endTime})':box=1:boxcolor=black@0.5:boxborderw=5`;

    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -vf "${vfFilter}" -c:a copy -y "${out}"`);
    });

    await uploadAndRespond(res, outputBuffer, `vaultx-captioned.mp4`);
  } catch (e) { handleError(res, e); }
});

// ─── /audio — volume, fade in/out ────────────────────────────────────────────

router.post("/audio", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file" });
    const mode = (req.body.mode as string) || "volume";
    const volume = parseFloat(req.body.volume || "1.0");
    const fadeIn = parseFloat(req.body.fadeIn || "0");
    const fadeOut = parseFloat(req.body.fadeOut || "0");

    let afFilter = `volume=${volume}`;
    if (fadeIn > 0) afFilter += `,afade=t=in:st=0:d=${fadeIn}`;
    if (fadeOut > 0) afFilter += `,afade=t=out:st=999:d=${fadeOut}`;
    if (mode === "mute") afFilter = "volume=0";

    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -af "${afFilter}" -c:v copy -y "${out}"`);
    });

    await uploadAndRespond(res, outputBuffer, `vaultx-audio.mp4`);
  } catch (e) { handleError(res, e); }
});

// ─── /color-grade — cinematic color grading ──────────────────────────────────

router.post("/color-grade", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file" });
    const look = (req.body.look as string) || "cinematic";
    const brightness = parseFloat(req.body.brightness || "0");
    const contrast = parseFloat(req.body.contrast || "1");
    const saturation = parseFloat(req.body.saturation || "1");

    const gradeMap: Record<string, string> = {
      "cinematic":    `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation * 0.85},colorbalance=rs=-0.05:gs=0:bs=0.05`,
      "moody":        `eq=brightness=${brightness - 0.05}:contrast=${contrast * 1.2}:saturation=${saturation * 0.7},colorbalance=rs=-0.1:gs=-0.05:bs=0.1`,
      "warm":         `eq=brightness=${brightness + 0.02}:contrast=${contrast}:saturation=${saturation * 1.1},colorbalance=rs=0.1:gs=0.05:bs=-0.05`,
      "cool":         `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation * 0.9},colorbalance=rs=-0.05:gs=0:bs=0.1`,
      "neon":         `eq=brightness=${brightness + 0.05}:contrast=${contrast * 1.3}:saturation=${saturation * 1.5},colorbalance=rs=0.2:gs=-0.1:bs=0.2`,
      "vintage":      `curves=vintage,vignette=PI/4,eq=saturation=${saturation * 0.8}`,
      "dark":         `eq=brightness=${brightness - 0.1}:contrast=${contrast * 1.4}:saturation=${saturation * 0.9}`,
      "skin":         `eq=brightness=${brightness + 0.02}:saturation=${saturation * 1.05},colorbalance=rs=0.05:gs=0.02:bs=-0.02`,
    };
    const vfFilter = gradeMap[look] || gradeMap["cinematic"];

    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -vf "${vfFilter}" -c:a copy -y "${out}"`);
    });

    await uploadAndRespond(res, outputBuffer, `vaultx-grade-${look}.mp4`);
  } catch (e) { handleError(res, e); }
});

export default router;
