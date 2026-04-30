/**
 * VaultX Video Studio — REST Router
 * ============================================================================
 * All endpoints use DURABLE storage at /root/creatorvault/uploads/
 * (outside dist/public — survives every frontend redeploy)
 * Served via express.static("/uploads") mounted in server/index.ts
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

// ─── Durable uploads directory (outside dist/ — survives redeploys) ──────────
const DURABLE_UPLOADS_BASE = path.resolve(process.cwd(), "..", "uploads");
const APP_URL = (process.env.APP_URL || "https://creatorvault.live").replace(/\/$/, "");

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

async function saveDurableAndRespond(res: Response, buffer: Buffer, filename: string, subdir = "video-studio") {
  const uuid = randomUUID();
  const uploadsDir = path.join(DURABLE_UPLOADS_BASE, subdir, uuid);
  await mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, filename);
  await writeFile(filePath, buffer);
  const url = `${APP_URL}/uploads/${subdir}/${uuid}/${filename}`;
  res.json({ url, filename });
}

function handleError(res: Response, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("[VideoStudio]", msg);
  res.status(500).json({ error: msg, message: msg, recovery: "Try again or reduce file size." });
}

// ─── /filter — beauty, skin smooth, denoise, censor, color filters ───────────
router.post("/filter", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file", recovery: "Upload a video file first." });
    const filter = (req.body.filter as string) || "beauty";
    const intensity = parseFloat(req.body.intensity || "0.7");
    const filterMap: Record<string, string> = {
      // ── Beauty & Skin ──────────────────────────────────────────────────────
      "beauty":      `smartblur=lr=1.0:ls=-0.5:cr=0:cs=0,eq=brightness=0.02:saturation=${1 + intensity * 0.08}`,
      "velvet":      `smartblur=lr=1.5:ls=-0.3:cr=0:cs=0,eq=brightness=0.03:contrast=1.04:saturation=${1 + intensity * 0.12}`,
      "silk":        `smartblur=lr=${intensity * 1.2}:ls=-0.2:cr=0:cs=0,eq=brightness=0.01:saturation=${1 + intensity * 0.04}`,
      "golden":      `smartblur=lr=0.8:ls=-0.3:cr=0:cs=0,eq=brightness=0.04:saturation=${1 + intensity * 0.18},colorbalance=rs=0.05:gs=0.02:bs=-0.03`,
      "smooth":      `smartblur=lr=${intensity * 1.0}:ls=-0.4:cr=0:cs=0,eq=brightness=0.01:saturation=${1 + intensity * 0.06}`,
      "boudoir":     `smartblur=lr=0.9:ls=-0.3:cr=0:cs=0,eq=brightness=0.05:contrast=0.96:saturation=${1 + intensity * 0.08},vignette=PI/5`,
      "desire":      `smartblur=lr=0.7:ls=-0.2:cr=0:cs=0,eq=brightness=0.02:contrast=1.08:saturation=${1 + intensity * 0.22},colorbalance=rs=0.07:gs=0:bs=-0.04`,
      "champagne":   `smartblur=lr=0.8:ls=-0.2:cr=0:cs=0,eq=brightness=0.06:saturation=${1 + intensity * 0.12},colorbalance=rs=0.06:gs=0.04:bs=-0.02`,
      "denoise":     `hqdn3d=${intensity * 4}:${intensity * 3}:${intensity * 6}:${intensity * 4.5}`,
      // ── Censor & PPV ──────────────────────────────────────────────────────
      "blur":        `gblur=sigma=${Math.max(8, intensity * 20)}`,
      "censor_blur": `gblur=sigma=${Math.max(12, intensity * 30)}`,
      "ppv_censor":  `gblur=sigma=25,eq=brightness=-0.1:contrast=0.8:saturation=0.3`,
      "pixelate":    `scale=iw/${Math.max(4, Math.round(20 * intensity))}:-1,scale=iw*${Math.max(4, Math.round(20 * intensity))}:-1:flags=neighbor`,
      "mosaic":      `scale=iw/10:-1,scale=iw*10:-1:flags=neighbor`,
      "black_bar":   `drawbox=x=0:y=ih*0.35:w=iw:h=ih*0.3:color=black:t=fill`,
    };
    const vfFilter = filterMap[filter];
    if (!vfFilter) {
      return res.status(400).json({ error: `Unknown filter: ${filter}`, recovery: `Valid filters: ${Object.keys(filterMap).join(", ")}` });
    }
    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -vf "${vfFilter}" -c:a copy -y "${out}"`);
    });
    await saveDurableAndRespond(res, outputBuffer, `vaultx-filter-${filter}.mp4`);
  } catch (e) { handleError(res, e); }
});

// ─── /trim — cut video to start/end ──────────────────────────────────────────
router.post("/trim", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file", recovery: "Upload a video file first." });
    const start = parseFloat(req.body.start || "0");
    const end = parseFloat(req.body.end || "15");
    if (end <= start) return res.status(400).json({ error: "End time must be greater than start time.", recovery: "Adjust the trim handles." });
    const duration = end - start;
    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -ss ${start} -i "${inp}" -t ${duration} -c copy -avoid_negative_ts make_zero -y "${out}"`);
    });
    await saveDurableAndRespond(res, outputBuffer, `vaultx-trim-${start}-${end}.mp4`);
  } catch (e) { handleError(res, e); }
});

// ─── /speed — speed ramp and slow motion ─────────────────────────────────────
router.post("/speed", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file", recovery: "Upload a video file first." });
    const speed = parseFloat(req.body.speed || "1.0");
    if (speed <= 0 || speed > 10) {
      return res.status(400).json({ error: "Speed must be between 0.01 and 10.", recovery: "Use 0.5 for half speed, 2.0 for double speed." });
    }
    // FFmpeg setpts for video, atempo for audio (atempo range: 0.5–2.0, chain for extremes)
    const videoFilter = `setpts=${(1 / speed).toFixed(4)}*PTS`;
    let audioFilter: string;
    if (speed <= 0.5) {
      audioFilter = `atempo=0.5,atempo=${(speed / 0.5).toFixed(4)}`;
    } else if (speed >= 2.0) {
      audioFilter = `atempo=2.0,atempo=${(speed / 2.0).toFixed(4)}`;
    } else {
      audioFilter = `atempo=${speed.toFixed(4)}`;
    }
    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -vf "${videoFilter}" -af "${audioFilter}" -y "${out}"`);
    });
    await saveDurableAndRespond(res, outputBuffer, `vaultx-speed-${speed}x.mp4`);
  } catch (e) { handleError(res, e); }
});

// ─── /watermark — add text/logo watermark ────────────────────────────────────
router.post("/watermark", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file", recovery: "Upload a video file first." });
    const text = (req.body.text as string) || "@CreatorVault";
    const position = (req.body.position as string) || "bottom_right";
    const opacity = parseFloat(req.body.opacity || "0.7");
    const fontSize = parseInt(req.body.fontSize || "28");
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
    const escaped = text.replace(/'/g, "\\'").replace(/:/g, "\\:");
    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -vf "drawtext=text='${escaped}':fontsize=${fontSize}:fontcolor=${color}@${opacity}:shadowcolor=black@0.5:shadowx=1:shadowy=1:${pos}" -c:a copy -y "${out}"`);
    });
    await saveDurableAndRespond(res, outputBuffer, `vaultx-watermark.mp4`);
  } catch (e) { handleError(res, e); }
});

// ─── /convert — platform-specific format and resolution ──────────────────────
router.post("/convert", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file", recovery: "Upload a video file first." });
    const format = (req.body.format as string) || "mp4";
    const resolution = (req.body.resolution as string) || "1080p";
    const platform = (req.body.platform as string) || "";

    // Platform-specific aspect ratio enforcement
    const platformAspect: Record<string, string> = {
      "tiktok":    "9:16",
      "instagram": "9:16",
      "reels":     "9:16",
      "twitter":   "16:9",
      "x":         "16:9",
      "onlyfans":  "16:9",
      "fansly":    "16:9",
      "youtube":   "16:9",
    };
    const targetAspect = platformAspect[platform.toLowerCase()] || null;

    const resMap: Record<string, { scale: string; ext: string; codec: string }> = {
      "480p":  { scale: "854:480",   ext: "mp4", codec: "-c:v libx264 -crf 23 -preset fast -c:a aac -b:a 128k" },
      "720p":  { scale: "1280:720",  ext: "mp4", codec: "-c:v libx264 -crf 20 -preset fast -c:a aac -b:a 192k" },
      "1080p": { scale: "1920:1080", ext: "mp4", codec: "-c:v libx264 -crf 18 -preset medium -c:a aac -b:a 256k" },
      "1440p": { scale: "2560:1440", ext: "mp4", codec: "-c:v libx264 -crf 16 -preset slow -c:a aac -b:a 320k" },
      "4k":    { scale: "3840:2160", ext: "mp4", codec: "-c:v libx264 -crf 14 -preset slow -c:a aac -b:a 320k" },
    };
    const res_config = resMap[resolution] || resMap["1080p"];
    const ext = format === "mov" ? "mov" : "mp4";
    const [w, h] = res_config.scale.split(":").map(Number);

    let vfFilter: string;
    if (targetAspect) {
      const [aw, ah] = targetAspect.split(":").map(Number);
      if (aw < ah) {
        // Portrait (9:16) — crop to portrait
        vfFilter = `scale=${h}:${w},crop=${Math.round(h * aw / ah)}:${h}:(iw-${Math.round(h * aw / ah)})/2:0,scale=${Math.round(w * aw / ah)}:${w}`;
      } else {
        // Landscape (16:9) — standard scale with padding
        vfFilter = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`;
      }
    } else {
      vfFilter = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`;
    }

    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -vf "${vfFilter}" ${res_config.codec} -y "${out}"`, { maxBuffer: 200 * 1024 * 1024 });
    }, ext);
    await saveDurableAndRespond(res, outputBuffer, `vaultx-${platform || "export"}-${resolution}.${ext}`);
  } catch (e) { handleError(res, e); }
});

// ─── /add-text — burn captions/text overlays ─────────────────────────────────
router.post("/add-text", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file", recovery: "Upload a video file first." });
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
      "bottom_right":  "x=w-text_w-20:y=h-text_h-30",
    };
    const pos = posMap[position] || posMap["bottom_center"];
    const escaped = text.replace(/'/g, "\\'").replace(/:/g, "\\:");
    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -vf "drawtext=text='${escaped}':fontsize=${fontSize}:fontcolor=${color}:box=1:boxcolor=black@0.5:boxborderw=5:${pos}:enable='between(t,${startTime},${endTime})'" -c:a copy -y "${out}"`);
    });
    await saveDurableAndRespond(res, outputBuffer, `vaultx-captioned.mp4`);
  } catch (e) { handleError(res, e); }
});

// ─── /audio — audio processing: normalize, cleanup, denoise, mute, mix ───────
router.post("/audio", upload.fields([{ name: "video", maxCount: 1 }, { name: "audio", maxCount: 1 }]), async (req: Request, res: Response) => {
  try {
    const files = req.files as Record<string, Express.Multer.File[]>;
    const videoFile = files?.["video"]?.[0] || (req as any).file;
    if (!videoFile) return res.status(400).json({ error: "No video file", recovery: "Upload a video file first." });

    const mode = (req.body.mode as string) || "normalize";
    const volume = parseFloat(req.body.volume || "1.0");
    const fadeIn = parseFloat(req.body.fadeIn || "0");
    const fadeOut = parseFloat(req.body.fadeOut || "0");
    const mixVolume = parseFloat(req.body.mixVolume || "0.5");

    let audioFilter: string;
    switch (mode) {
      case "normalize":
        // EBU R128 loudness normalization — broadcast standard
        audioFilter = `loudnorm=I=-16:TP=-1.5:LRA=11`;
        break;
      case "cleanup":
        // Noise reduction + high-pass + low-pass for voice clarity
        audioFilter = `afftdn=nf=-25,highpass=f=80,lowpass=f=12000,loudnorm=I=-16:TP=-1.5:LRA=11`;
        break;
      case "voice_enhance":
        // Voice enhancement: noise reduction + EQ boost for speech presence
        audioFilter = `afftdn=nf=-20,equalizer=f=3000:t=o:w=1:g=3,equalizer=f=200:t=o:w=1:g=-2,loudnorm=I=-16:TP=-1.5:LRA=11`;
        break;
      case "mute":
        audioFilter = "volume=0";
        break;
      default:
        audioFilter = `volume=${volume}`;
        if (fadeIn > 0) audioFilter += `,afade=t=in:st=0:d=${fadeIn}`;
        if (fadeOut > 0) audioFilter += `,afade=t=out:st=9999:d=${fadeOut}`;
    }

    // If an audio track is provided, mix it in
    const audioTrackFile = files?.["audio"]?.[0];
    if (audioTrackFile && mode === "mix") {
      const id = randomUUID();
      const videoPath = path.join(os.tmpdir(), `vaultx-vid-${id}.mp4`);
      const audioPath = path.join(os.tmpdir(), `vaultx-aud-${id}.mp3`);
      const outputPath = path.join(os.tmpdir(), `vaultx-mix-${id}.mp4`);
      try {
        await writeFile(videoPath, videoFile.buffer);
        await writeFile(audioPath, audioTrackFile.buffer);
        await execAsync(
          `ffmpeg -i "${videoPath}" -i "${audioPath}" ` +
          `-filter_complex "[0:a]volume=${1 - mixVolume}[a0];[1:a]volume=${mixVolume},afade=t=in:st=0:d=1[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]" ` +
          `-map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 256k -y "${outputPath}"`
        );
        const result = await readFile(outputPath);
        await saveDurableAndRespond(res, result, `vaultx-mixed.mp4`);
      } finally {
        await unlink(videoPath).catch(() => {});
        await unlink(audioPath).catch(() => {});
        await unlink(outputPath).catch(() => {});
      }
      return;
    }

    const outputBuffer = await withTempVideo(videoFile.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -af "${audioFilter}" -c:v copy -y "${out}"`);
    });
    await saveDurableAndRespond(res, outputBuffer, `vaultx-audio-${mode}.mp4`);
  } catch (e) { handleError(res, e); }
});

// ─── /color-grade — cinematic color grading with manual overrides ─────────────
router.post("/color-grade", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No video file", recovery: "Upload a video file first." });
    const look = (req.body.look as string) || "cinematic";
    // Manual override params — if provided, they override the preset base values
    const brightness = parseFloat(req.body.brightness || "0");
    const contrast = parseFloat(req.body.contrast || "1");
    const saturation = parseFloat(req.body.saturation || "1");
    const warmth = parseFloat(req.body.warmth || "0"); // -1 to 1, positive = warm, negative = cool

    const warmthFilter = warmth !== 0
      ? `,colorbalance=rs=${warmth * 0.08}:gs=${warmth * 0.02}:bs=${-warmth * 0.06}`
      : "";

    const gradeMap: Record<string, string> = {
      "cinematic":    `eq=brightness=${brightness}:contrast=${contrast * 1.0}:saturation=${saturation * 0.85},colorbalance=rs=-0.05:gs=0:bs=0.05${warmthFilter}`,
      "moody":        `eq=brightness=${brightness - 0.05}:contrast=${contrast * 1.2}:saturation=${saturation * 0.7},colorbalance=rs=-0.1:gs=-0.05:bs=0.1${warmthFilter}`,
      "warm":         `eq=brightness=${brightness + 0.02}:contrast=${contrast}:saturation=${saturation * 1.1},colorbalance=rs=0.1:gs=0.05:bs=-0.05${warmthFilter}`,
      "cool":         `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation * 0.9},colorbalance=rs=-0.05:gs=0:bs=0.1${warmthFilter}`,
      "neon":         `eq=brightness=${brightness + 0.05}:contrast=${contrast * 1.3}:saturation=${saturation * 1.5},colorbalance=rs=0.2:gs=-0.1:bs=0.2${warmthFilter}`,
      "vintage":      `curves=vintage,vignette=PI/4,eq=brightness=${brightness}:saturation=${saturation * 0.8}${warmthFilter}`,
      "dark":         `eq=brightness=${brightness - 0.1}:contrast=${contrast * 1.4}:saturation=${saturation * 0.9}${warmthFilter}`,
      "skin":         `eq=brightness=${brightness + 0.02}:saturation=${saturation * 1.05},colorbalance=rs=0.05:gs=0.02:bs=-0.02${warmthFilter}`,
      // Premium creator-specific grades
      "of_master":    `eq=brightness=${brightness + 0.01}:contrast=${contrast * 1.05}:saturation=${saturation * 0.95},colorbalance=rs=0.04:gs=0.01:bs=-0.03,vignette=PI/6${warmthFilter}`,
      "fansly":       `eq=brightness=${brightness + 0.03}:contrast=${contrast * 1.08}:saturation=${saturation * 1.0},colorbalance=rs=0.03:gs=0.02:bs=-0.02${warmthFilter}`,
      "noir":         `eq=brightness=${brightness - 0.08}:contrast=${contrast * 1.5}:saturation=${saturation * 0.2},vignette=PI/3${warmthFilter}`,
      "golden_hour":  `eq=brightness=${brightness + 0.04}:saturation=${saturation * 1.2},colorbalance=rs=0.12:gs=0.06:bs=-0.08${warmthFilter}`,
      "editorial":    `eq=brightness=${brightness}:contrast=${contrast * 1.15}:saturation=${saturation * 0.75},colorbalance=rs=-0.03:gs=0:bs=0.04${warmthFilter}`,
    };
    const vfFilter = gradeMap[look];
    if (!vfFilter) {
      return res.status(400).json({ error: `Unknown grade: ${look}`, recovery: `Valid grades: ${Object.keys(gradeMap).join(", ")}` });
    }
    const outputBuffer = await withTempVideo(req.file.buffer, async (inp, out) => {
      await execAsync(`ffmpeg -i "${inp}" -vf "${vfFilter}" -c:a copy -y "${out}"`);
    });
    await saveDurableAndRespond(res, outputBuffer, `vaultx-grade-${look}.mp4`);
  } catch (e) { handleError(res, e); }
});

export default router;
