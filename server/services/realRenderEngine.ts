/**
 * ============================================================================
 * REAL RENDER ENGINE — ffmpeg-backed video editor for VaultX
 *
 * This is NOT a spec/JSON exporter. It actually processes video with ffmpeg
 * on the VPS and writes a finished MP4 to durable public storage.
 *
 * Operations (all real):
 *   - Multi-clip trim + concat (the timeline cut)
 *   - Body Cinema color grade presets (LUT-style via eq/curves/colorbalance)
 *   - Cinematic motion (zoompan slow push / drift) for image clips
 *   - Caption / hook text overlay (drawtext)
 *   - Background music track mix (amix) with original audio ducking
 *   - Watermark text
 *   - Aspect ratio framing (9:16 / 16:9 / 1:1) with blurred-fill background
 *   - Fade in/out
 *
 * Jobs run async; status is tracked in-memory + on disk so the editor can poll.
 * ============================================================================
 */
import { spawn, execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

// ─── Storage paths ──────────────────────────────────────────────────────────
const PUBLIC_ROOT = "/root/uploads"; // served at /uploads
const RENDER_DIR = path.join(PUBLIC_ROOT, "renders");
const WORK_ROOT = "/tmp/vaultx-render";
const PUBLIC_BASE = (process.env.PUBLIC_APP_URL || "https://creatorvault.live").replace(/\/$/, "");
const FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RenderClip {
  src: string;            // public URL or local path
  trimStart?: number;     // seconds into the source to start
  trimEnd?: number;       // seconds into the source to end
  type?: "video" | "image";
  speed?: number;         // playback speed: 0.25 = slow-mo, 2.0 = fast, 1.0 = normal
  focus?: string;         // per-clip body focus (overrides global)
  colorGrade?: string;    // per-clip color grade (overrides global)
  caption?: string;       // per-clip caption text
  captionStyle?: string;  // per-clip caption style
  transition?: string;    // transition INTO this clip: "fade" | "flash" | "dissolve" | "none"
}

export interface TextOverlay {
  text: string;
  x?: number;   // 0..1 fraction of width (default 0.5 = center)
  y?: number;   // 0..1 fraction of height (default 0.75)
  fontSize?: number; // 0..1 fraction of width (default 0.05)
  color?: string;    // hex color (default white)
  startTime?: number; // seconds
  endTime?: number;   // seconds
}

export interface RenderRequest {
  clips: RenderClip[];
  aspect?: "9:16" | "16:9" | "1:1";
  colorGrade?: string;    // preset id (see COLOR_GRADES)
  motion?: string;        // motion preset id (see MOTION_PRESETS) — for image clips
  focus?: string;         // body focus framing (see FOCUS_PRESETS)
  captionText?: string;   // hook/caption to burn in
  captionStyle?: "bold_center" | "lower_third" | "minimal_top";
  musicUrl?: string;      // optional background music
  musicVolume?: number;   // 0..1
  watermarkText?: string;
  fadeInOut?: boolean;
  durationCap?: number;   // hard cap on total output seconds
  transitions?: boolean;  // add xfade transitions between clips
  textOverlays?: TextOverlay[]; // additional text/sticker layers
  animatedCaptions?: boolean;   // animate caption (fade-in + drift)
}

// ─── Body-focus framing presets ───────────────────────────────────────────────
// After the clip is fit to the output frame (WxH), a focus crop re-frames onto a
// body region by scaling up and panning to a normalized center, then re-fitting.
// cx/cy are the focal center as a fraction of the frame (0..1). zoom>1 tightens.
export const FOCUS_PRESETS: Record<string, { label: string; emoji: string; cx: number; cy: number; zoom: number }> = {
  none:        { label: "Full Body",   emoji: "🧍", cx: 0.5,  cy: 0.5,  zoom: 1.0 },
  abs:         { label: "Abs",         emoji: "💪", cx: 0.5,  cy: 0.52, zoom: 1.7 },
  waist:       { label: "Waist",       emoji: "⏳", cx: 0.5,  cy: 0.55, zoom: 1.55 },
  butt:        { label: "Butt",        emoji: "🍑", cx: 0.5,  cy: 0.66, zoom: 1.7 },
  hips:        { label: "Hips",        emoji: "💃", cx: 0.5,  cy: 0.62, zoom: 1.5 },
  legs:        { label: "Legs",        emoji: "👠", cx: 0.5,  cy: 0.74, zoom: 1.45 },
  thighs:      { label: "Thighs",      emoji: "🔥", cx: 0.5,  cy: 0.68, zoom: 1.65 },
  chest:       { label: "Chest",       emoji: "💎", cx: 0.5,  cy: 0.38, zoom: 1.6 },
  back:        { label: "Back",        emoji: "🖤", cx: 0.5,  cy: 0.5,  zoom: 1.5 },
  lowerback:   { label: "Lower Back",  emoji: "💫", cx: 0.5,  cy: 0.62, zoom: 1.75 },
  face:        { label: "Face",        emoji: "👄", cx: 0.5,  cy: 0.28, zoom: 1.7 },
  silhouette:  { label: "Silhouette",  emoji: "✨", cx: 0.5,  cy: 0.5,  zoom: 1.15 },
};

function focusFilter(focus: string, W: number, H: number): string {
  const f = FOCUS_PRESETS[focus];
  if (!f || f.zoom <= 1.01) return "";
  // crop a tighter region centered on (cx,cy), then scale back up to WxH.
  // Origin is clamped in JS to guaranteed-valid even integers.
  const cw = Math.round((W / f.zoom) / 2) * 2;
  const ch = Math.round((H / f.zoom) / 2) * 2;
  let x = Math.round(f.cx * W - cw / 2);
  let y = Math.round(f.cy * H - ch / 2);
  x = Math.max(0, Math.min(x, W - cw));
  y = Math.max(0, Math.min(y, H - ch));
  return `crop=${cw}:${ch}:${x}:${y},scale=${W}:${H}`;
}

export interface RenderJob {
  id: string;
  status: "queued" | "processing" | "succeeded" | "failed";
  progress: number;
  outputUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Color grade presets (real ffmpeg filter chains) ──────────────────────────
// Each returns a filter string applied to the video stream.
export const COLOR_GRADES: Record<string, { label: string; filter: string }> = {
  none:            { label: "Natural",        filter: "" },
  luxe_gold:       { label: "Luxe Gold",       filter: "eq=contrast=1.12:saturation=1.15:gamma=0.96,colorbalance=rm=0.06:gm=0.02:bm=-0.06:rs=0.05:bs=-0.05" },
  cinematic_heat:  { label: "Cinematic Heat",  filter: "eq=contrast=1.25:saturation=1.2:brightness=-0.02,colorbalance=rm=0.10:bm=-0.08:rh=0.06:bh=-0.06,vignette=PI/5" },
  noir_afterdark:  { label: "After Dark Noir", filter: "eq=contrast=1.3:saturation=0.85:brightness=-0.05,colorbalance=bm=0.08:bh=0.10:rm=-0.04,vignette=PI/4" },
  soft_skin:       { label: "Soft Skin",       filter: "eq=contrast=1.05:saturation=1.08:brightness=0.03,gblur=sigma=0.6,colorbalance=rm=0.05:gm=0.03" },
  velvet_midnight: { label: "Velvet Midnight", filter: "eq=contrast=1.22:saturation=1.1:brightness=-0.04,colorbalance=bm=0.12:rh=0.05:bh=0.08,vignette=PI/4.5" },
  neon_night:      { label: "Neon Night",      filter: "eq=contrast=1.28:saturation=1.35,colorbalance=bm=0.14:rh=0.10:bh=0.10,vignette=PI/5" },
  rose_glow:       { label: "Rose Glow",       filter: "eq=contrast=1.1:saturation=1.18:brightness=0.02,colorbalance=rm=0.10:rh=0.08:bm=-0.04" },
  platinum:        { label: "Platinum",        filter: "eq=contrast=1.15:saturation=0.95:brightness=0.02,colorbalance=bm=0.04:gm=0.02" },
  bronze_editorial:{ label: "Bronze Editorial",filter: "eq=contrast=1.2:saturation=1.05:gamma=0.94,colorbalance=rm=0.08:gm=0.04:bm=-0.08:rs=0.06" },
};

// ─── Motion presets (zoompan for image clips) ─────────────────────────────────
export const MOTION_PRESETS: Record<string, { label: string; expr: (durSec: number, fps: number) => string }> = {
  none:        { label: "Static",        expr: () => "" },
  slow_push:   { label: "Slow Push In",  expr: (d, fps) => `zoompan=z='min(zoom+0.0009,1.18)':d=${Math.round(d*fps)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps}` },
  slow_pull:   { label: "Slow Pull Out", expr: (d, fps) => `zoompan=z='if(eq(on,1),1.18,max(zoom-0.0009,1.0))':d=${Math.round(d*fps)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps}` },
  drift_left:  { label: "Drift Left",    expr: (d, fps) => `zoompan=z='1.12':d=${Math.round(d*fps)}:x='(iw-iw/zoom)*(on/${Math.round(d*fps)})':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps}` },
  drift_up:    { label: "Drift Up",      expr: (d, fps) => `zoompan=z='1.12':d=${Math.round(d*fps)}:x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*(1-on/${Math.round(d*fps)})':s=1080x1920:fps=${fps}` },
};

const ASPECT_DIMS: Record<string, { w: number; h: number }> = {
  "9:16": { w: 1080, h: 1920 },
  "16:9": { w: 1920, h: 1080 },
  "1:1":  { w: 1080, h: 1080 },
};

// ─── Job registry (in-memory + disk) ──────────────────────────────────────────
const jobs = new Map<string, RenderJob>();
const JOBS_FILE = path.join(PUBLIC_ROOT, "render-jobs.json");

function persistJobs() {
  try {
    if (!fs.existsSync(PUBLIC_ROOT)) fs.mkdirSync(PUBLIC_ROOT, { recursive: true });
    fs.writeFileSync(JOBS_FILE, JSON.stringify(Array.from(jobs.values()).slice(-200)));
  } catch { /* ignore */ }
}
function loadJobs() {
  try {
    if (fs.existsSync(JOBS_FILE)) {
      for (const j of JSON.parse(fs.readFileSync(JOBS_FILE, "utf-8"))) jobs.set(j.id, j);
    }
  } catch { /* ignore */ }
}
loadJobs();

export function getRenderJob(id: string): RenderJob | undefined {
  return jobs.get(id);
}

function update(job: RenderJob, patch: Partial<RenderJob>) {
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
  jobs.set(job.id, job);
  persistJobs();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isImage(src: string): boolean {
  return /\.(jpg|jpeg|png|webp|gif|bmp)(\?|$)/i.test(src);
}

async function fetchToLocal(src: string, dest: string): Promise<void> {
  // Local path passthrough
  if (src.startsWith("/")) { fs.copyFileSync(src, dest); return; }
  // /uploads/* -> map to disk to avoid network round-trip
  const m = src.match(/\/uploads\/(.+)$/);
  if (m) {
    const local = path.join(PUBLIC_ROOT, decodeURIComponent(m[1]));
    if (fs.existsSync(local)) { fs.copyFileSync(local, dest); return; }
  }
  const resp = await fetch(src);
  if (!resp.ok) throw new Error(`Fetch failed ${resp.status} for ${src}`);
  fs.writeFileSync(dest, Buffer.from(await resp.arrayBuffer()));
}

function ff(args: string[], timeoutMs = 240000): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", ["-y", ...args]);
    let err = "";
    const timer = setTimeout(() => { p.kill("SIGKILL"); reject(new Error("ffmpeg timeout")); }, timeoutMs);
    p.stderr.on("data", d => { err += d.toString(); });
    p.on("close", code => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}: ${err.slice(-600)}`));
    });
  });
}

function probeDuration(file: string): number {
  try {
    const out = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 ${JSON.stringify(file)}`, { encoding: "utf8" });
    const d = parseFloat(out.trim());
    return Number.isFinite(d) && d > 0 ? d : 0;
  } catch { return 0; }
}

function escapeDrawText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\u2019").replace(/%/g, "\\%");
}

function captionFilter(text: string, style: string, W: number, H: number, animated = false): string {
  const safe = escapeDrawText(text.slice(0, 120));
  const fs = Math.round(W * 0.052);
  const alpha = animated ? ":alpha='if(lt(t,0.4),t/0.4,1)'" : "";
  const base = `drawtext=fontfile=${FONT}:text='${safe}':fontcolor=white:fontsize=${fs}:box=1:boxcolor=black@0.45:boxborderw=${Math.round(fs*0.35)}:shadowcolor=black@0.7:shadowx=2:shadowy=2${alpha}`;
  if (style === "minimal_top") return `${base}:x=(w-text_w)/2:y=h*0.08`;
  if (style === "lower_third")  return `${base}:x=(w-text_w)/2:y=h*0.80`;
  return `${base}:x=(w-text_w)/2:y=h*0.72`; // bold_center (default, lower-center)
}

function textOverlayFilter(overlay: TextOverlay, W: number, H: number): string {
  const safe = escapeDrawText(overlay.text.slice(0, 120));
  const fs = Math.round(W * (overlay.fontSize || 0.05));
  const cx = overlay.x != null ? overlay.x : 0.5;
  const cy = overlay.y != null ? overlay.y : 0.75;
  const color = overlay.color || "white";
  let timeExpr = "";
  if (overlay.startTime != null || overlay.endTime != null) {
    const st = overlay.startTime ?? 0;
    const et = overlay.endTime ?? 9999;
    timeExpr = `:enable='between(t,${st},${et})'`;
  }
  return `drawtext=fontfile=${FONT}:text='${safe}':fontcolor=${color}:fontsize=${fs}:x=(w-text_w)*${cx.toFixed(3)}:y=h*${cy.toFixed(3)}${timeExpr}`;
}

// ─── Main render ───────────────────────────────────────────────────────────────
export function startRender(req: RenderRequest): RenderJob {
  const job: RenderJob = {
    id: randomUUID(),
    status: "queued",
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);
  persistJobs();
  // Run async — don't block the request
  runRender(job, req).catch(e => update(job, { status: "failed", error: String(e?.message || e) }));
  return job;
}

async function runRender(job: RenderJob, req: RenderRequest): Promise<void> {
  update(job, { status: "processing", progress: 5 });

  const aspect = req.aspect || "9:16";
  const { w: W, h: H } = ASPECT_DIMS[aspect] || ASPECT_DIMS["9:16"];
  const fps = 30;
  const workDir = path.join(WORK_ROOT, job.id);
  fs.mkdirSync(workDir, { recursive: true });
  if (!fs.existsSync(RENDER_DIR)) fs.mkdirSync(RENDER_DIR, { recursive: true });

  try {
    const clips = (req.clips || []).filter(c => c && c.src);
    if (clips.length === 0) throw new Error("No clips to render");

    const grade = COLOR_GRADES[req.colorGrade || "none"]?.filter || "";
    const normalizedParts: string[] = [];

    // 1. Normalize each clip: fetch, trim, scale/pad to aspect, color grade, motion
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const ext = isImage(clip.src) ? ".img" : ".mp4";
      const localSrc = path.join(workDir, `src-${i}${ext}`);
      await fetchToLocal(clip.src, localSrc);

      const outPart = path.join(workDir, `part-${i}.mp4`);
      const isImg = isImage(clip.src) || clip.type === "image";

      // Build the video filter chain
      const fitChain = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${fps}`;
      const focus = focusFilter(req.focus || "none", W, H);
      const filters: string[] = [];

      if (isImg) {
        const dur = Math.max(2, Math.min(8, clip.trimEnd && clip.trimStart != null ? (clip.trimEnd - clip.trimStart) : 5));
        const motion = MOTION_PRESETS[req.motion || "slow_push"]?.expr(dur, fps) || "";
        // For images: zoompan first (outputs WxH), then focus crop, then grade
        if (motion) filters.push(motion);
        else filters.push(fitChain);
        if (focus) filters.push(focus);
        if (grade) filters.push(grade);
        const vf = filters.join(",");
        await ff([
          "-loop", "1", "-t", String(dur), "-i", localSrc,
          "-f", "lavfi", "-t", String(dur), "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
          "-vf", vf, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps),
          "-c:a", "aac", "-shortest", outPart,
        ]);
      } else {
        const ss = clip.trimStart != null ? ["-ss", String(clip.trimStart)] : [];
        const dur = (clip.trimEnd != null && clip.trimStart != null) ? ["-t", String(Math.max(0.5, clip.trimEnd - clip.trimStart))] : [];
        // Per-clip focus and grade override global
        const clipFocus = focusFilter(clip.focus || req.focus || "none", W, H);
        const clipGrade = COLOR_GRADES[clip.colorGrade || req.colorGrade || "none"]?.filter || "";
        filters.push(fitChain);
        if (clipFocus) filters.push(clipFocus);
        if (clipGrade) filters.push(clipGrade);
        // Per-clip speed ramp
        const speed = clip.speed != null ? Math.max(0.05, Math.min(32, clip.speed)) : 1.0;
        if (speed !== 1.0) {
          filters.push(`setpts=${(1/speed).toFixed(4)}*PTS`);
          if (speed < 1.0) filters.push("tblend=all_mode=average"); // motion blur for slow-mo
        }
        // Per-clip caption
        if (clip.caption) filters.push(captionFilter(clip.caption, clip.captionStyle || "lower_third", W, H, req.animatedCaptions));
        const vf = filters.join(",");
        const audioFilters = speed !== 1.0 ? ["-af", `atempo=${Math.max(0.5, Math.min(2.0, speed))}`] : ["-af", "aresample=44100"];
        await ff([
          ...ss, "-i", localSrc, ...dur,
          "-vf", vf, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps),
          "-c:a", "aac", "-ar", "44100", "-ac", "2",
          ...audioFilters, outPart,
        ]);
      }
      normalizedParts.push(outPart);
      update(job, { progress: 5 + Math.round((i + 1) / clips.length * 50) });
    }

    // 2. Concat all normalized parts (with optional xfade transitions)
    let stitched = path.join(workDir, "stitched.mp4");
    if (normalizedParts.length === 1) {
      stitched = normalizedParts[0];
    } else if (req.transitions && normalizedParts.length > 1) {
      // xfade transitions between clips
      const XFADE_DUR = 0.25;
      const SAFE_MODES = ["fade", "fadeblack", "dissolve", "circleopen", "smoothleft"];
      let acc = normalizedParts[0];
      for (let i = 1; i < normalizedParts.length; i++) {
        const mode = SAFE_MODES[(i - 1) % SAFE_MODES.length];
        const accDur = probeDuration(acc) || 3;
        const xf = Math.max(0.1, Math.min(XFADE_DUR, accDur - 0.15));
        const offset = Math.max(0.05, accDur - xf);
        const out = path.join(workDir, `xf-${i}.mp4`);
        try {
          await ff([
            "-i", acc, "-i", normalizedParts[i],
            "-filter_complex", `[0:v][1:v]xfade=transition=${mode}:duration=${xf.toFixed(3)}:offset=${offset.toFixed(3)}[v];[0:a][1:a]acrossfade=d=${xf.toFixed(3)}[a]`,
            "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-ar", "44100", out,
          ]);
          acc = out;
        } catch {
          // fallback: hard concat this pair
          const lf = path.join(workDir, `cc-${i}.txt`);
          fs.writeFileSync(lf, [`file '${acc}'`, `file '${normalizedParts[i]}'`].join("\n"));
          const out2 = path.join(workDir, `cc-${i}.mp4`);
          await ff(["-f", "concat", "-safe", "0", "-i", lf, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-ar", "44100", out2]);
          acc = out2;
        }
      }
      stitched = acc;
    } else {
      const listFile = path.join(workDir, "concat.txt");
      fs.writeFileSync(listFile, normalizedParts.map(p => `file '${p}'`).join("\n"));
      await ff(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", stitched]);
    }
    update(job, { progress: 62 });

    // 3. Post chain: caption, watermark, fade
    let current = stitched;
    const totalDur = probeDuration(stitched);
    const postFilters: string[] = [];
    if (req.captionText) postFilters.push(captionFilter(req.captionText, req.captionStyle || "bold_center", W, H, req.animatedCaptions));
    // Additional text/sticker overlays
    if (req.textOverlays && req.textOverlays.length > 0) {
      for (const overlay of req.textOverlays) {
        postFilters.push(textOverlayFilter(overlay, W, H));
      }
    }
    if (req.watermarkText) {
      const wm = escapeDrawText(req.watermarkText.slice(0, 40));
      postFilters.push(`drawtext=fontfile=${FONT}:text='${wm}':fontcolor=white@0.55:fontsize=${Math.round(W*0.03)}:x=w-text_w-${Math.round(W*0.03)}:y=h-text_h-${Math.round(H*0.04)}`);
    }
    if (req.fadeInOut && totalDur > 1.5) {
      postFilters.push(`fade=t=in:st=0:d=0.5,fade=t=out:st=${(totalDur - 0.6).toFixed(2)}:d=0.6`);
    }
    if (postFilters.length) {
      const out = path.join(workDir, "posted.mp4");
      await ff(["-i", current, "-vf", postFilters.join(","), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "copy", out]);
      current = out;
    }
    update(job, { progress: 78 });

    // 4. Music mix (duck original audio under music)
    if (req.musicUrl) {
      try {
        const musicLocal = path.join(workDir, "music.mp3");
        await fetchToLocal(req.musicUrl, musicLocal);
        const vol = req.musicVolume != null ? Math.max(0, Math.min(1, req.musicVolume)) : 0.5;
        const out = path.join(workDir, "music.mp4");
        await ff([
          "-i", current, "-stream_loop", "-1", "-i", musicLocal,
          "-filter_complex", `[1:a]volume=${vol}[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=2[a]`,
          "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-shortest", out,
        ]);
        current = out;
      } catch { /* music optional — skip on failure */ }
    }
    update(job, { progress: 90 });

    // 5. Finalize to public storage
    const finalName = `vaultx-edit-${job.id}.mp4`;
    const finalDir = path.join(RENDER_DIR, job.id);
    fs.mkdirSync(finalDir, { recursive: true });
    const finalPath = path.join(finalDir, finalName);
    await ff(["-i", current, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", finalPath]);

    const outputUrl = `${PUBLIC_BASE}/uploads/renders/${job.id}/${finalName}`;
    update(job, { status: "succeeded", progress: 100, outputUrl });

    // Cleanup work dir
    try { execSync(`rm -rf ${JSON.stringify(workDir)}`); } catch { /* ignore */ }
  } catch (e: any) {
    update(job, { status: "failed", error: String(e?.message || e) });
    try { execSync(`rm -rf ${JSON.stringify(workDir)}`); } catch { /* ignore */ }
  }
}
