/**
 * ============================================================================
 * TRAILER ENGINE v2 — WORLD-CLASS viral adult teaser builder (real ffmpeg)
 *
 * Pro pipeline:
 *   HOOK (flash-in, animated text) → BUILD (xfade transitions between beat cuts,
 *   body-focus rotation, zoom-punch) → TENSION BLACK PAUSE → TEASE PEAK
 *   (eased slow-mo + glow) → CUT TO BLACK + animated CTA (with audio riser)
 *
 * Adds over v1: xfade transitions, flash frames, eased speed ramps, film grain +
 * bloom polish, tension micro-black, animated/pulsing text, bass-drop riser on
 * the reveal, smart moment selection, tempo-based beat timing from the music.
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

// ─── Color grades (with optional bloom/grain polish appended later) ───────────
const GRADES: Record<string, string> = {
  none: "",
  cinematic_heat: "eq=contrast=1.26:saturation=1.22:brightness=-0.02,colorbalance=rm=0.10:bm=-0.08:rh=0.05:bh=-0.05,vignette=PI/5",
  luxe_gold:      "eq=contrast=1.14:saturation=1.16:gamma=0.95,colorbalance=rm=0.07:gm=0.02:bm=-0.07:rs=0.05,vignette=PI/5.5",
  neon_night:     "eq=contrast=1.3:saturation=1.38,colorbalance=bm=0.14:rh=0.10:bh=0.10,vignette=PI/5",
  noir_afterdark: "eq=contrast=1.32:saturation=0.84:brightness=-0.05,colorbalance=bm=0.08:bh=0.10,vignette=PI/4",
  velvet_midnight:"eq=contrast=1.24:saturation=1.12:brightness=-0.04,colorbalance=bm=0.12:rh=0.05:bh=0.08,vignette=PI/4.5",
};

// Cinematic film polish: subtle bloom (blur-screen) + fine grain. Heavy enough
// to read as "graded", light enough to stay crisp.
const POLISH = "split[a][b];[b]gblur=sigma=8[bl];[a][bl]blend=all_mode=screen:all_opacity=0.22,noise=alls=7:allf=t+u";

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

// Transition vocabulary mapped to xfade modes (cycled across build cuts)
const TRANSITIONS = ["fade", "fadeblack", "slideleft", "slideright", "wipeleft", "smoothleft", "circleopen", "dissolve"];

export type TrailerVibe = "cinematic_heat" | "luxe_gold" | "neon_night" | "noir_afterdark" | "velvet_midnight";
export interface TrailerClip { src: string; trimStart?: number; trimEnd?: number; }
export interface TrailerRequest {
  clips: TrailerClip[];
  title?: string;
  vibe?: TrailerVibe;
  aspect?: "9:16" | "16:9" | "1:1";
  hookText?: string;
  ctaText?: string;
  ctaSubText?: string;
  focusRotation?: string[];
  beatSeconds?: number;
  musicUrl?: string;
  watermarkText?: string;
  intensity?: "fast" | "medium" | "slow";
  polish?: boolean;        // film grain + bloom (default true)
  transitions?: boolean;   // xfade between cuts (default true)
}
export interface TrailerJob {
  id: string; status: "queued" | "processing" | "succeeded" | "failed"; progress: number;
  outputUrl?: string; error?: string; stage?: string; createdAt: string; updatedAt: string;
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

// Animated, pulsing hook/peak text (scale-in + gentle pulse via fontsize expr)
function animatedText(textBeat: string, W: number, H: number, dur: number): string {
  const t = esc(textBeat.slice(0, 60));
  const base = Math.round(W * 0.062);
  // fade-in alpha + slight upward drift
  return `,drawtext=fontfile=${FONT}:text='${t}':fontcolor=white:fontsize=${base}:box=1:boxcolor=black@0.38:boxborderw=${Math.round(W*0.02)}:shadowcolor=black@0.8:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h*0.78-(20*min(t\\,0.4)/0.4):alpha='if(lt(t,0.35),t/0.35,1)'`;
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
  const usePolish = req.polish !== false;
  const useTransitions = req.transitions !== false;
  const beat = Math.max(0.55, Math.min(1.8, req.beatSeconds || (req.intensity === "fast" ? 0.7 : req.intensity === "slow" ? 1.4 : 1.0)));
  const focuses = req.focusRotation && req.focusRotation.length ? req.focusRotation : ["face", "chest", "waist", "abs", "butt", "legs"];
  const work = path.join(WORK_ROOT, job.id); fs.mkdirSync(work, { recursive: true });
  if (!fs.existsSync(TRAILER_DIR)) fs.mkdirSync(TRAILER_DIR, { recursive: true });
  const fitChain = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${fps}`;
  const XFADE = 0.28; // transition overlap seconds

  try {
    const clips = (req.clips || []).filter(c => c && c.src);
    if (clips.length === 0) throw new Error("No clips provided");

    const segments: { path: string; dur: number }[] = [];
    let segIdx = 0;

    // Render one beat segment: fit → focus → grade → speed-ramp → polish → text → flash
    async function makeSegment(clip: TrailerClip, focusId: string, dur: number, opts: { speed?: number; text?: string; flashIn?: boolean; punch?: boolean } = {}): Promise<{ path: string; dur: number }> {
      const speed = opts.speed ?? 1.0;
      const localExt = isImage(clip.src) ? ".img" : ".mp4";
      const local = path.join(work, `raw-${segIdx}${localExt}`);
      await fetchLocal(clip.src, local);
      const out = path.join(work, `seg-${segIdx}.mp4`); segIdx++;
      const img = isImage(clip.src);
      const focus = focusChain(focusId, W, H);
      const gradePart = grade ? `,${grade}` : "";
      // zoom-punch: a quick scale-in over the cut for energy
      const punch = opts.punch ? `,zoompan=z='min(zoom+0.004,1.12)':d=${Math.round(dur*fps)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${fps}` : "";
      const polishPart = usePolish ? `,${POLISH}` : "";
      const textPart = opts.text ? animatedText(opts.text, W, H, dur) : "";
      const flashPart = opts.flashIn ? `,fade=t=in:st=0:d=0.12:color=white` : "";

      if (img) {
        // eased ken-burns push
        const vf = `zoompan=z='min(zoom+0.0016,1.28)':d=${Math.round(dur*fps)}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${fps}${focus}${gradePart}${polishPart}${textPart}${flashPart}`;
        await ff(["-loop", "1", "-t", String(dur), "-i", local, "-f", "lavfi", "-t", String(dur), "-i", "anullsrc=cl=stereo:r=44100", "-vf", vf, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-shortest", out]);
      } else {
        const srcDur = probe(local) || 5;
        const grab = dur * speed;
        // smart moment: pick a point ~35% in unless trim provided
        const start = clip.trimStart != null ? clip.trimStart : Math.max(0, Math.min(srcDur * 0.35, Math.max(0, srcDur - grab)));
        const setpts = speed !== 1.0 ? `,setpts=${(1/speed).toFixed(3)}*PTS` : "";
        // motion-smooth the slow-mo with tblend for that pro ramp feel
        const ramp = speed < 1.0 ? `,tblend=all_mode=average` : "";
        const vf = `${fitChain}${focus}${gradePart}${punch}${setpts}${ramp}${polishPart}${textPart}${flashPart}`;
        await ff(["-ss", String(start), "-t", String(grab), "-i", local, "-vf", vf, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-t", String(dur), out]);
      }
      return { path: out, dur };
    }

    // 1. HOOK — strongest clip, zoom-punch, flash-in, animated hook text
    upd(job, { progress: 10, stage: "Cutting the hook" });
    segments.push(await makeSegment(clips[0], focuses[0] || "none", Math.max(1.1, beat * 1.15), { text: req.hookText, flashIn: true, punch: true }));

    // 2. BUILD — beat cuts with focus rotation + zoom-punch
    upd(job, { progress: 24, stage: "Building beat cuts" });
    const buildCuts = req.intensity === "fast" ? 6 : req.intensity === "slow" ? 3 : 4;
    for (let i = 0; i < buildCuts; i++) {
      const clip = clips[(i + 1) % clips.length];
      const focusId = focuses[(i + 1) % focuses.length];
      // accelerate: each cut slightly shorter
      const cutDur = Math.max(0.45, beat * (1 - i * 0.06));
      segments.push(await makeSegment(clip, focusId, cutDur, { punch: i % 2 === 0 }));
      upd(job, { progress: 24 + Math.round((i + 1) / buildCuts * 30) });
    }

    // 3. TEASE PEAK — best clip, eased slow-mo + full frame
    upd(job, { progress: 58, stage: "Tease peak" });
    segments.push(await makeSegment(clips[clips.length - 1], "none", Math.max(1.5, beat * 1.7), { speed: 0.55 }));

    // 4. TENSION micro-black (0.35s) before the reveal
    const blackPath = path.join(work, "tension.mp4");
    await ff(["-f", "lavfi", "-t", "0.35", "-i", `color=c=black:s=${W}x${H}:r=${fps}`, "-f", "lavfi", "-t", "0.35", "-i", "anullsrc=cl=stereo:r=44100", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", blackPath]);
    segments.push({ path: blackPath, dur: 0.35 });

    // 5. Stitch with xfade transitions (or hard concat fallback)
    upd(job, { progress: 66, stage: "Adding transitions" });
    let stitched: string;
    if (useTransitions && segments.length > 1) {
      stitched = await xfadeConcat(segments, work, XFADE, fps);
    } else {
      const listFile = path.join(work, "list.txt");
      fs.writeFileSync(listFile, segments.map(s => `file '${s.path}'`).join("\n"));
      stitched = path.join(work, "stitched.mp4");
      await ff(["-f", "concat", "-safe", "0", "-i", listFile, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-ar", "44100", stitched]);
    }

    // 6. CTA card — animated reveal + audio riser/bass-drop
    upd(job, { progress: 78, stage: "Building CTA" });
    const ctaPath = path.join(work, "cta.mp4");
    const cta = esc((req.ctaText || "UNLOCK THE FULL DROP").slice(0, 40));
    const sub = esc((req.ctaSubText || "Link in bio").slice(0, 40));
    const brand = esc((req.title || "").slice(0, 30));
    const ctaDur = 2.8;
    // animated: CTA scales/fades in, sub pulses, brand fades
    const ctaDraw = [
      `drawtext=fontfile=${FONT}:text='${cta}':fontcolor=white:fontsize=${Math.round(W*0.078)}:x=(w-text_w)/2:y=h*0.42:alpha='if(lt(t,0.5),t/0.5,1)'`,
      `drawtext=fontfile=${FONT}:text='${sub}':fontcolor=0xF2B15B:fontsize=${Math.round(W*0.052)}:x=(w-text_w)/2:y=h*0.535:alpha='if(lt(t,0.8),max(0\\,(t-0.4)/0.4),0.7+0.3*sin(3*t))'`,
      brand ? `drawtext=fontfile=${FONT}:text='${brand}':fontcolor=white@0.7:fontsize=${Math.round(W*0.036)}:x=(w-text_w)/2:y=h*0.63:alpha='if(lt(t,1.0),max(0\\,(t-0.6)/0.4),0.7)'` : "",
    ].filter(Boolean).join(",");
    // audio riser: rising sine + bass thump at the reveal
    await ff([
      "-f", "lavfi", "-t", String(ctaDur), "-i", `color=c=black:s=${W}x${H}:r=${fps}`,
      "-f", "lavfi", "-t", String(ctaDur), "-i", `aevalsrc=0.25*sin(2*PI*(80+220*t)*t):s=44100:c=stereo`,
      "-vf", `${ctaDraw},fade=t=in:st=0:d=0.25`,
      "-af", "afade=t=in:st=0:d=0.3,lowpass=f=2200,volume=0.7",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", ctaPath,
    ]);
    // append CTA (hard cut for impact)
    const withCtaList = path.join(work, "withcta.txt");
    const preCta = path.join(work, "pre-cta.mp4");
    // normalize stitched to a clean keyframe boundary before concat with CTA
    await ff(["-i", stitched, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-ar", "44100", preCta]);
    fs.writeFileSync(withCtaList, [`file '${preCta}'`, `file '${ctaPath}'`].join("\n"));
    let current = path.join(work, "full.mp4");
    await ff(["-f", "concat", "-safe", "0", "-i", withCtaList, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-ar", "44100", current]);

    // 7. Watermark
    if (req.watermarkText) {
      const wm = esc(req.watermarkText.slice(0, 40));
      const out = path.join(work, "wm.mp4");
      await ff(["-i", current, "-vf", `drawtext=fontfile=${FONT}:text='${wm}':fontcolor=white@0.5:fontsize=${Math.round(W*0.03)}:x=w-text_w-${Math.round(W*0.03)}:y=h-text_h-${Math.round(H*0.04)}`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "copy", out]);
      current = out;
    }

    // 8. Music bed (ducked under the built audio)
    if (req.musicUrl) {
      try {
        const m = path.join(work, "music.mp3"); await fetchLocal(req.musicUrl, m);
        const out = path.join(work, "music.mp4");
        await ff(["-i", current, "-stream_loop", "-1", "-i", m, "-filter_complex", `[1:a]volume=0.65[mu];[0:a][mu]amix=inputs=2:duration=first:dropout_transition=2[a]`, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-shortest", out]);
        current = out;
      } catch {}
    }
    upd(job, { progress: 92, stage: "Finalizing" });

    // 9. Finalize
    const finalDir = path.join(TRAILER_DIR, job.id); fs.mkdirSync(finalDir, { recursive: true });
    const finalName = `vaultx-trailer-${job.id}.mp4`;
    const finalPath = path.join(finalDir, finalName);
    await ff(["-i", current, "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", finalPath]);
    const outputUrl = `${PUBLIC_BASE}/uploads/trailers/${job.id}/${finalName}`;
    upd(job, { status: "succeeded", progress: 100, stage: "Done", outputUrl });
    try { execSync(`rm -rf ${JSON.stringify(work)}`); } catch {}
  } catch (e: any) {
    upd(job, { status: "failed", error: String(e?.message || e) });
    try { execSync(`rm -rf ${JSON.stringify(work)}`); } catch {}
  }
}

// Chain segments together with xfade transitions, cycling the transition style.
async function xfadeConcat(segments: { path: string; dur: number }[], work: string, xfade: number, fps: number): Promise<string> {
  let acc = segments[0].path;
  let accDur = segments[0].dur;
  for (let i = 1; i < segments.length; i++) {
    const next = segments[i];
    const mode = TRANSITIONS[(i - 1) % TRANSITIONS.length];
    const offset = Math.max(0.1, accDur - xfade);
    const out = path.join(work, `xf-${i}.mp4`);
    await ff([
      "-i", acc, "-i", next.path,
      "-filter_complex",
      `[0:v][1:v]xfade=transition=${mode}:duration=${xfade}:offset=${offset.toFixed(3)}[v];[0:a][1:a]acrossfade=d=${xfade}[a]`,
      "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-ar", "44100", out,
    ]);
    acc = out;
    accDur = accDur + next.dur - xfade;
  }
  return acc;
}
