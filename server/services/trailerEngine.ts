/**
 * ============================================================================
 * TRAILER ENGINE — viral adult teaser/trailer builder (real ffmpeg)
 *
 * Auto-assembles a conversion-optimized teaser from uploaded clips:
 *   HOOK  → BUILD (beat cuts, focus highlights) → TEASE PEAK (slow ramp)
 *         → CUT TO BLACK + CTA
 *
 * Every cut, grade, focus crop, speed ramp, text beat, and music mix is a real
 * ffmpeg operation. Output is a finished MP4 in durable public storage.
 * ============================================================================
 */
import { spawn, execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

const PUBLIC_ROOT = "/root/uploads";
const TRAILER_DIR = path.join(PUBLIC_ROOT, "trailers");
const WORK_ROOT = "/tmp/vaultx-trailer";
const PUBLIC_BASE = (process.env.PUBLIC_APP_URL || "https://creatorvault.live").replace(/\/$/, "");
const FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

// ─── Color grades (shared vocabulary with edit engine) ────────────────────────
const GRADES: Record<string, string> = {
  none: "",
  cinematic_heat: "eq=contrast=1.25:saturation=1.2:brightness=-0.02,colorbalance=rm=0.10:bm=-0.08,vignette=PI/5",
  luxe_gold:      "eq=contrast=1.12:saturation=1.15:gamma=0.96,colorbalance=rm=0.06:bm=-0.06",
  neon_night:     "eq=contrast=1.28:saturation=1.35,colorbalance=bm=0.14:rh=0.10,vignette=PI/5",
  noir_afterdark: "eq=contrast=1.3:saturation=0.85:brightness=-0.05,colorbalance=bm=0.08,vignette=PI/4",
  velvet_midnight:"eq=contrast=1.22:saturation=1.1:brightness=-0.04,colorbalance=bm=0.12,vignette=PI/4.5",
};

// ─── Focus regions (crop centers) ─────────────────────────────────────────────
const FOCUS: Record<string, { cx: number; cy: number; zoom: number }> = {
  none:      { cx: 0.5, cy: 0.5,  zoom: 1.0 },
  abs:       { cx: 0.5, cy: 0.52, zoom: 1.6 },
  waist:     { cx: 0.5, cy: 0.55, zoom: 1.5 },
  butt:      { cx: 0.5, cy: 0.66, zoom: 1.6 },
  hips:      { cx: 0.5, cy: 0.62, zoom: 1.5 },
  legs:      { cx: 0.5, cy: 0.74, zoom: 1.4 },
  thighs:    { cx: 0.5, cy: 0.68, zoom: 1.55 },
  chest:     { cx: 0.5, cy: 0.38, zoom: 1.55 },
  back:      { cx: 0.5, cy: 0.5,  zoom: 1.45 },
  lowerback: { cx: 0.5, cy: 0.62, zoom: 1.6 },
  face:      { cx: 0.5, cy: 0.28, zoom: 1.6 },
};

export type TrailerVibe = "cinematic_heat" | "luxe_gold" | "neon_night" | "noir_afterdark" | "velvet_midnight";

export interface TrailerClip { src: string; trimStart?: number; trimEnd?: number; }

export interface TrailerRequest {
  clips: TrailerClip[];
  title?: string;            // creator/brand name shown on CTA card
  vibe?: TrailerVibe;
  aspect?: "9:16" | "16:9" | "1:1";
  hookText?: string;         // text beat over the hook
  ctaText?: string;          // main CTA on cut-to-black
  ctaSubText?: string;       // price / link line
  focusRotation?: string[];  // body focuses to rotate across build cuts
  beatSeconds?: number;      // cut length in build (0.8..1.6)
  musicUrl?: string;
  watermarkText?: string;
  intensity?: "fast" | "medium" | "slow"; // pacing
}

export interface TrailerJob {
  id: string;
  status: "queued" | "processing" | "succeeded" | "failed";
  progress: number;
  outputUrl?: string;
  error?: string;
  stage?: string;
  createdAt: string;
  updatedAt: string;
}

const jobs = new Map<string, TrailerJob>();
const JOBS_FILE = path.join(PUBLIC_ROOT, "trailer-jobs.json");
function persist() { try { if (!fs.existsSync(PUBLIC_ROOT)) fs.mkdirSync(PUBLIC_ROOT, { recursive: true }); fs.writeFileSync(JOBS_FILE, JSON.stringify(Array.from(jobs.values()).slice(-200))); } catch {} }
function load() { try { if (fs.existsSync(JOBS_FILE)) for (const j of JSON.parse(fs.readFileSync(JOBS_FILE, "utf-8"))) jobs.set(j.id, j); } catch {} }
load();
export function getTrailerJob(id: string) { return jobs.get(id); }
function upd(j: TrailerJob, p: Partial<TrailerJob>) { Object.assign(j, p, { updatedAt: new Date().toISOString() }); jobs.set(j.id, j); persist(); }

const ASPECT: Record<string, { w: number; h: number }> = { "9:16": { w: 1080, h: 1920 }, "16:9": { w: 1920, h: 1080 }, "1:1": { w: 1080, h: 1080 } };

function isImage(s: string) { return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(s); }

async function fetchLocal(src: string, dest: string) {
  if (src.startsWith("/")) { fs.copyFileSync(src, dest); return; }
  const m = src.match(/\/uploads\/(.+)$/);
  if (m) { const local = path.join(PUBLIC_ROOT, decodeURIComponent(m[1])); if (fs.existsSync(local)) { fs.copyFileSync(local, dest); return; } }
  const r = await fetch(src); if (!r.ok) throw new Error(`fetch ${r.status}`); fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
}

function ff(args: string[], timeoutMs = 180000): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", ["-y", ...args]);
    let err = ""; const t = setTimeout(() => { p.kill("SIGKILL"); reject(new Error("ffmpeg timeout")); }, timeoutMs);
    p.stderr.on("data", d => err += d.toString());
    p.on("close", c => { clearTimeout(t); c === 0 ? resolve() : reject(new Error(`ffmpeg ${c}: ${err.slice(-500)}`)); });
  });
}

function probe(file: string): number {
  try { const o = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 ${JSON.stringify(file)}`, { encoding: "utf8" }); const d = parseFloat(o.trim()); return Number.isFinite(d) ? d : 0; } catch { return 0; }
}

function esc(s: string) { return s.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\u2019").replace(/%/g, "\\%"); }

function focusChain(focusId: string, W: number, H: number): string {
  const f = FOCUS[focusId]; if (!f || f.zoom <= 1.01) return "";
  const cw = Math.round((W / f.zoom) / 2) * 2, ch = Math.round((H / f.zoom) / 2) * 2;
  let x = Math.round(f.cx * W - cw / 2), y = Math.round(f.cy * H - ch / 2);
  x = Math.max(0, Math.min(x, W - cw)); y = Math.max(0, Math.min(y, H - ch));
  return `,crop=${cw}:${ch}:${x}:${y},scale=${W}:${H}`;
}

export function startTrailer(req: TrailerRequest): TrailerJob {
  const job: TrailerJob = { id: randomUUID(), status: "queued", progress: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  jobs.set(job.id, job); persist();
  build(job, req).catch(e => upd(job, { status: "failed", error: String(e?.message || e) }));
  return job;
}

async function build(job: TrailerJob, req: TrailerRequest) {
  upd(job, { status: "processing", progress: 3, stage: "Preparing footage" });
  const aspect = req.aspect || "9:16";
  const { w: W, h: H } = ASPECT[aspect] || ASPECT["9:16"];
  const fps = 30;
  const grade = GRADES[req.vibe || "cinematic_heat"] || "";
  const beat = Math.max(0.6, Math.min(1.8, req.beatSeconds || (req.intensity === "fast" ? 0.8 : req.intensity === "slow" ? 1.5 : 1.1)));
  const focuses = req.focusRotation && req.focusRotation.length ? req.focusRotation : ["face", "chest", "waist", "abs", "butt", "legs"];
  const work = path.join(WORK_ROOT, job.id); fs.mkdirSync(work, { recursive: true });
  if (!fs.existsSync(TRAILER_DIR)) fs.mkdirSync(TRAILER_DIR, { recursive: true });
  const fitChain = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${fps}`;

  try {
    const clips = (req.clips || []).filter(c => c && c.src);
    if (clips.length === 0) throw new Error("No clips provided");

    const segments: string[] = [];
    let segIdx = 0;

    // Helper: render one beat segment from a clip at a given focus + optional speed
    async function makeSegment(clip: TrailerClip, focusId: string, dur: number, speed = 1.0, textBeat?: string): Promise<string> {
      const localExt = isImage(clip.src) ? ".img" : ".mp4";
      const local = path.join(work, `raw-${segIdx}${localExt}`);
      await fetchLocal(clip.src, local);
      const out = path.join(work, `seg-${segIdx}.mp4`);
      segIdx++;
      const img = isImage(clip.src);
      const focus = focusChain(focusId, W, H);
      const gradePart = grade ? `,${grade}` : "";
      let textPart = "";
      if (textBeat) {
        const t = esc(textBeat.slice(0, 60));
        textPart = `,drawtext=fontfile=${FONT}:text='${t}':fontcolor=white:fontsize=${Math.round(W*0.06)}:box=1:boxcolor=black@0.4:boxborderw=${Math.round(W*0.02)}:shadowcolor=black@0.7:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h*0.80`;
      }
      if (img) {
        // image: ken-burns push for the beat
        const vf = `zoompan=z='min(zoom+0.0015,1.25)':d=${Math.round(dur*fps)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${fps}${focus}${gradePart}${textPart}`;
        await ff(["-loop", "1", "-t", String(dur), "-i", local, "-f", "lavfi", "-t", String(dur), "-i", "anullsrc=cl=stereo:r=44100", "-vf", vf, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-shortest", out]);
      } else {
        const srcDur = probe(local) || 5;
        const start = clip.trimStart != null ? clip.trimStart : Math.max(0, Math.min(srcDur * 0.3, srcDur - dur * speed));
        const grab = dur * speed; // grab more if slowing down
        const setpts = speed !== 1.0 ? `,setpts=${(1/speed).toFixed(3)}*PTS` : "";
        const vf = `${fitChain}${focus}${gradePart}${setpts}${textPart}`;
        await ff(["-ss", String(start), "-t", String(grab), "-i", local, "-vf", vf, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-t", String(dur), out]);
      }
      return out;
    }

    // 1. HOOK — first clip, full frame, biggest, with hook text
    upd(job, { progress: 12, stage: "Cutting the hook" });
    segments.push(await makeSegment(clips[0], focuses[0] || "none", Math.max(1.2, beat * 1.2), 1.0, req.hookText || undefined));

    // 2. BUILD — rotate clips x focuses, beat cuts, escalating
    upd(job, { progress: 28, stage: "Building beat cuts" });
    const buildCuts = req.intensity === "fast" ? 5 : req.intensity === "slow" ? 3 : 4;
    for (let i = 0; i < buildCuts; i++) {
      const clip = clips[(i + 1) % clips.length];
      const focusId = focuses[(i + 1) % focuses.length];
      segments.push(await makeSegment(clip, focusId, beat, 1.0));
      upd(job, { progress: 28 + Math.round((i + 1) / buildCuts * 30) });
    }

    // 3. TEASE PEAK — last/best clip, slight slow ramp, full body
    upd(job, { progress: 62, stage: "Tease peak" });
    segments.push(await makeSegment(clips[clips.length - 1], "none", Math.max(1.6, beat * 1.6), 0.6));

    // 4. CUT TO BLACK + CTA card
    upd(job, { progress: 72, stage: "Building CTA" });
    const ctaPath = path.join(work, "cta.mp4");
    const cta = esc((req.ctaText || "UNLOCK THE FULL DROP").slice(0, 40));
    const sub = esc((req.ctaSubText || "Link in bio").slice(0, 40));
    const brand = esc((req.title || "").slice(0, 30));
    const ctaDraw = [
      `drawtext=fontfile=${FONT}:text='${cta}':fontcolor=white:fontsize=${Math.round(W*0.075)}:x=(w-text_w)/2:y=h*0.42`,
      `drawtext=fontfile=${FONT}:text='${sub}':fontcolor=0xF2B15B:fontsize=${Math.round(W*0.05)}:x=(w-text_w)/2:y=h*0.54`,
      brand ? `drawtext=fontfile=${FONT}:text='${brand}':fontcolor=white@0.7:fontsize=${Math.round(W*0.035)}:x=(w-text_w)/2:y=h*0.64` : "",
    ].filter(Boolean).join(",");
    await ff(["-f", "lavfi", "-t", "2.6", "-i", `color=c=black:s=${W}x${H}:r=${fps}`, "-f", "lavfi", "-t", "2.6", "-i", "anullsrc=cl=stereo:r=44100", "-vf", `${ctaDraw},fade=t=in:st=0:d=0.4`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", ctaPath]);
    segments.push(ctaPath);

    // 5. Concat all segments
    upd(job, { progress: 80, stage: "Stitching trailer" });
    const listFile = path.join(work, "list.txt");
    fs.writeFileSync(listFile, segments.map(s => `file '${s}'`).join("\n"));
    let stitched = path.join(work, "stitched.mp4");
    await ff(["-f", "concat", "-safe", "0", "-i", listFile, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-ar", "44100", stitched]);

    // 6. Watermark + music
    let current = stitched;
    if (req.watermarkText) {
      const wm = esc(req.watermarkText.slice(0, 40));
      const out = path.join(work, "wm.mp4");
      await ff(["-i", current, "-vf", `drawtext=fontfile=${FONT}:text='${wm}':fontcolor=white@0.5:fontsize=${Math.round(W*0.03)}:x=w-text_w-${Math.round(W*0.03)}:y=h-text_h-${Math.round(H*0.04)}`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "copy", out]);
      current = out;
    }
    if (req.musicUrl) {
      try {
        const m = path.join(work, "music.mp3"); await fetchLocal(req.musicUrl, m);
        const out = path.join(work, "music.mp4");
        await ff(["-i", current, "-stream_loop", "-1", "-i", m, "-filter_complex", `[1:a]volume=0.7[mu];[0:a][mu]amix=inputs=2:duration=first:dropout_transition=2[a]`, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-shortest", out]);
        current = out;
      } catch {}
    }
    upd(job, { progress: 92, stage: "Finalizing" });

    // 7. Finalize
    const finalDir = path.join(TRAILER_DIR, job.id); fs.mkdirSync(finalDir, { recursive: true });
    const finalName = `vaultx-trailer-${job.id}.mp4`;
    const finalPath = path.join(finalDir, finalName);
    await ff(["-i", current, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", finalPath]);
    const outputUrl = `${PUBLIC_BASE}/uploads/trailers/${job.id}/${finalName}`;
    upd(job, { status: "succeeded", progress: 100, stage: "Done", outputUrl });
    try { execSync(`rm -rf ${JSON.stringify(work)}`); } catch {}
  } catch (e: any) {
    upd(job, { status: "failed", error: String(e?.message || e) });
    try { execSync(`rm -rf ${JSON.stringify(work)}`); } catch {}
  }
}
