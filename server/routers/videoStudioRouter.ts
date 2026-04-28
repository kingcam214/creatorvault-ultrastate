/**
 * VaultX Video Studio — REST Router
 * ============================================================================
 * All endpoints use local file serving (dist/public/uploads/video-studio/)
 * instead of storagePut() to avoid external storage dependency.
 * ============================================================================
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import os from "os";

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

async function saveLocalAndRespond(res: Response, buffer: Buffer, filename: string) {
  const uuid = randomUUID();
  const uploadsDir = path.resolve(process.cwd(), "dist", "public", "uploads", "video-studio", uuid);
  await mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, filename);
  await writeFile(filePath, buffer);
  const relativePath = `/uploads/video-studio/${uuid}/${filename}`;
  const baseUrl = (process.env.APP_URL || "https://creatorvault.live").replace(/\/$/, "");
  const url = `${baseUrl}${relativePath}`;
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
    const intensity = parseFloat(req.body.intensity || "0.7");
    const filterMap: Record<string, string> = {
      "beauty":    `unsharp=5:5:${intensity * 0.5}:5:5:0,eq=brightness=0.02:saturation=${1 + intensity * 0.1}`,
      "velvet":    `unsharp=3:3:${intensity * 0.3}:3:3:0,eq=brightness=0.03:contrast=1.05:saturation=${1 + intensity * 0.15}`,
      "silk":      `gblur=sigma=${intensity * 0.8},eq=brightness=0.01:saturation=${1 + intensity * 0.05}`,
      "golden":    `eq=brightness=0.04:saturation=${1 + intensity * 0.2},colorbalance=rs=0.05:gs=0.02:bs=-0.03`,
      "smooth":    `gblur=sigma=${intensity * 0.5},unsharp=5:5:${intensity * 0.3}:5:5:0`,
      "boudoir":   `eq=brightness=0.05:contrast=0.95:saturation=${1 + intensity * 0.1},vignette=PI/5`,
      "desire":    `eq=brightness=0.02:contrast=1.1:saturation=${1 + intensity * 0.25},colorbalance=rs=0.08:gs=0:bs=-0.05`,
      "champagne": `eq=brightness=0.06:saturation=${1 + intensity * 0.15},colorbalance=rs=0.06:gs=0.04:bs=-0.02`,
      "denoise":   `hqdn3d=${intensity * 4}:${intensity * 3}:${intensity * 6}:${intensity * 4.5}`,
    };
    const vfFilter = filterMap[filter] || filterMap["beauty"];
    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -vf "${vfFilter}" -c:a copy -y "${out}"`);
    });
    await saveLocalAndRespond(res, outputBuffer, `vaultx-filter-${filter}.mp4`);
  } catch (e) { handleError(res, e); }
});

// ─── /trim — cut video to start/end ──────────────────────────────────────────
router.post("/trim", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file" });
    const start = parseFloat(req.body.start || "0");
    const end = parseFloat(req.body.end || "15");
    const duration = end - start;
    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -ss ${start} -i "${inp}" -t ${duration} -c copy -y "${out}"`);
    });
    await saveLocalAndRespond(res, outputBuffer, `vaultx-trim-${start}-${end}.mp4`);
  } catch (e) { handleError(res, e); }
});

// ─── /watermark — add text/logo watermark ────────────────────────────────────
router.post("/watermark", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file" });
    const text = (req.body.text as string) || "@creator";
    const position = (req.body.position as string) || "bottom_right";
    const opacity = parseFloat(req.body.opacity || "0.8");
    const size = parseInt(req.body.size || "24");
    const color = (req.body.color as string) || "white";
    const posMap: Record<string, string> = {
      "top_left":      "x=20:y=20",
      "top_center":    "x=(w-text_w)/2:y=20",
      "top_right":     "x=w-text_w-20:y=20",
      "center":        "x=(w-text_w)/2:y=(h-text_h)/2",
      "bottom_left":   "x=20:y=h-text_h-20",
      "bottom_center": "x=(w-text_w)/2:y=h-text_h-20",
      "bottom_right":  "x=w-text_w-20:y=h-text_h-20",
    };
    const pos = posMap[position] || posMap["bottom_right"];
    const escaped = text.replace(/'/g, "\\'");
    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -vf "drawtext=text='${escaped}':fontsize=${size}:fontcolor=${color}@${opacity}:${pos}" -c:a copy -y "${out}"`);
    });
    await saveLocalAndRespond(res, outputBuffer, `vaultx-watermark.mp4`);
  } catch (e) { handleError(res, e); }
});

// ─── /convert — format/resolution conversion ─────────────────────────────────
router.post("/convert", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file" });
    const format = (req.body.format as string) || "mp4_h264";
    const resolution = (req.body.resolution as string) || "1080p";
    const resMap: Record<string, string> = {
      "480p": "854:480", "720p": "1280:720", "1080p": "1920:1080",
      "1440p": "2560:1440", "4k": "3840:2160",
    };
    const scale = resMap[resolution] || resMap["1080p"];
    const codecMap: Record<string, string> = {
      "mp4_h264": "-c:v libx264 -preset fast -crf 23 -c:a aac",
      "mp4_h265": "-c:v libx265 -preset fast -crf 28 -c:a aac",
      "webm":     "-c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus",
      "mov":      "-c:v libx264 -preset fast -crf 23 -c:a aac",
    };
    const codec = codecMap[format] || codecMap["mp4_h264"];
    const ext = format === "webm" ? "webm" : format === "mov" ? "mov" : "mp4";
    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -vf "scale=${scale}:force_original_aspect_ratio=decrease,pad=${scale}:(ow-iw)/2:(oh-ih)/2" ${codec} -y "${out}"`);
    }, ext);
    await saveLocalAndRespond(res, outputBuffer, `vaultx-converted-${resolution}.${ext}`);
  } catch (e) { handleError(res, e); }
});

// ─── /add-text — burn captions/text overlays ─────────────────────────────────
router.post("/add-text", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file" });
    const text = (req.body.text as string) || "Caption";
    const position = (req.body.position as string) || "bottom_center";
    const fontSize = parseInt(req.body.fontSize || "32");
    const color = (req.body.color as string) || "white";
    const startTime = parseFloat(req.body.startTime || "0");
    const endTime = parseFloat(req.body.endTime || "10");
    const posMap: Record<string, string> = {
      "top_left":      "x=20:y=20",
      "top_center":    "x=(w-text_w)/2:y=20",
      "top_right":     "x=w-text_w-20:y=20",
      "center":        "x=(w-text_w)/2:y=(h-text_h)/2",
      "bottom_left":   "x=20:y=h-text_h-30",
      "bottom_center": "x=(w-text_w)/2:y=h-text_h-30",
    };
    const pos = posMap[position] || posMap["bottom_center"];
    const escaped = text.replace(/'/g, "\\'").replace(/:/g, "\\:");
    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -vf "drawtext=text='${escaped}':fontsize=${fontSize}:fontcolor=${color}:box=1:boxcolor=black@0.5:boxborderw=5:${pos}:enable='between(t,${startTime},${endTime})'" -c:a copy -y "${out}"`);
    });
    await saveLocalAndRespond(res, outputBuffer, `vaultx-captioned.mp4`);
  } catch (e) { handleError(res, e); }
});

// ─── /audio — audio mixing ────────────────────────────────────────────────────
router.post("/audio", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file" });
    const mode = (req.body.mode as string) || "normalize";
    const volume = parseFloat(req.body.volume || "1.0");
    const fadeIn = parseFloat(req.body.fadeIn || "0");
    const fadeOut = parseFloat(req.body.fadeOut || "0");
    let audioFilter = `volume=${volume}`;
    if (fadeIn > 0) audioFilter += `,afade=t=in:st=0:d=${fadeIn}`;
    if (fadeOut > 0) audioFilter += `,afade=t=out:st=9999:d=${fadeOut}`;
    if (mode === "normalize") audioFilter += ",loudnorm";
    if (mode === "mute") audioFilter = "volume=0";
    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -af "${audioFilter}" -c:v copy -y "${out}"`);
    });
    await saveLocalAndRespond(res, outputBuffer, `vaultx-audio.mp4`);
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
    await saveLocalAndRespond(res, outputBuffer, `vaultx-grade-${look}.mp4`);
  } catch (e) { handleError(res, e); }
});

export default router;
