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
import { generateAIShots } from "./aiShotGenerator.js";

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
const TRANSITIONS = ["fade", "fadeblack", "dissolve", "circleopen", "radial", "smoothleft", "smoothup"];

// ─── Cinematic FX helpers ─────────────────────────────────────────────────────

// Chromatic aberration: RGB channel split — the signature pro-trailer look.
// Splits R/G/B channels by a few pixels, creating a subtle lens-distortion fringe.
const CHROMA_ABERRATION = "split=3[r][g][b];[r]lutrgb=r=val:g=0:b=0[rv];[g]lutrgb=r=0:g=val:b=0[gv];[b]lutrgb=r=0:g=0:b=val[bv];[rv]pad=iw+8:ih:4:0[rp];[gv]pad=iw+8:ih:0:0[gp];[bv]pad=iw+8:ih:8:0[bp];[rp][gp]blend=all_mode=addition[rg];[rg][bp]blend=all_mode=addition,crop=iw-8:ih:4:0";

// Light leak flash: a warm orange bloom that flashes at a cut (0.15s)
// Applied as an overlay on the first frame of a segment.
const LIGHT_LEAK = "fade=t=in:st=0:d=0.08:color=0xFF8C00,fade=t=out:st=0.08:d=0.12:color=0xFF8C00";

// Letterbox: adds 2.35:1 cinematic black bars (top + bottom)
function letterboxFilter(H: number): string {
  const barH = Math.round(H * 0.105); // ~10.5% each side for 2.35:1 feel
  return `drawbox=x=0:y=0:w=iw:h=${barH}:color=black:t=fill,drawbox=x=0:y=ih-${barH}:w=iw:h=${barH}:color=black:t=fill`;
}

// Glitch frame: horizontal offset + color shift for 2 frames at the hook cut
const GLITCH = "geq=r='r(X+3,Y)':g='g(X,Y)':b='b(X-3,Y)',noise=alls=18:allf=t";

export type TrailerVibe = "cinematic_heat" | "luxe_gold" | "neon_night" | "noir_afterdark" | "velvet_midnight";

// ─── Creation modes ───────────────────────────────────────────────────────────
// ai_full_shoot: upload 1 photo/clip → AI generates ALL shots → trailer from AI only
// ai_remix:      upload clips → AI generates new angles → mix AI + original
// original:      your footage only, no AI (fast, pure ffmpeg)
// hybrid:        upload multiple clips → AI generates from each → max variety
// photo_cinematic: upload a photo → AI animates into cinematic shots → trailer
export type TrailerMode = "ai_full_shoot" | "ai_remix" | "original" | "hybrid" | "photo_cinematic";

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
  chromaAberration?: boolean; // RGB channel split on cuts
  lightLeaks?: boolean;    // warm light flash between cuts
  letterbox?: boolean;     // 2.35:1 cinematic bars
  glitch?: boolean;        // glitch frame on hook
  aiRemix?: boolean;       // legacy: same as mode=ai_remix
  aiShotCount?: number;    // how many AI shots to generate (default 4)
  mode?: TrailerMode;      // creation mode (default: original if no AI flags)
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

// Estimate tempo (BPM) from a music file via ffmpeg loudness peaks → beat seconds.
// No external deps: we sample the audio envelope and find the dominant inter-onset
// spacing. Falls back gracefully. Returns seconds-per-beat (clamped to a usable cut length).
function estimateBeatSeconds(musicLocal: string): number | null {
  try {
    // Export a coarse RMS envelope at 20Hz using astats per window
    const raw = execSync(
      `ffmpeg -hide_banner -i ${JSON.stringify(musicLocal)} -t 20 -af "aresample=8000,asetnsamples=400,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level" -f null - 2>&1`,
      { encoding: "utf8", timeout: 30000 }
    );
    const vals: number[] = [];
    for (const m of raw.matchAll(/RMS_level=(-?\d+(?:\.\d+)?)/g)) vals.push(parseFloat(m[1]));
    if (vals.length < 8) return null;
    // window = 400 samples / 8000Hz = 0.05s
    const dt = 0.05;
    // onset = rising energy above local average
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const onsets: number[] = [];
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] > mean && vals[i] - vals[i - 1] > 3) onsets.push(i * dt);
    }
    if (onsets.length < 4) return null;
    // median inter-onset interval
    const iois = [];
    for (let i = 1; i < onsets.length; i++) iois.push(onsets[i] - onsets[i - 1]);
    iois.sort((a, b) => a - b);
    let ioi = iois[Math.floor(iois.length / 2)];
    // fold into a musical cut range (0.45..1.0s) — use half/double beats
    while (ioi > 1.0) ioi /= 2;
    while (ioi < 0.4) ioi *= 2;
    return Math.max(0.45, Math.min(1.1, ioi));
  } catch { return null; }
}

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
  let beat = Math.max(0.35, Math.min(2.5, req.beatSeconds || (req.intensity === "ultra" ? 0.45 : req.intensity === "fast" ? 0.65 : req.intensity === "slow" ? 1.4 : req.intensity === "minimal" ? 2.0 : 0.95)));
  const focuses = (req as any)._aiFocuses || (req.focusRotation && req.focusRotation.length ? req.focusRotation : ["face", "chest", "waist", "abs", "butt", "legs"]);
  const work = path.join(WORK_ROOT, job.id); fs.mkdirSync(work, { recursive: true });
  // Beat-sync: if music is provided, detect tempo and align cut length to it
  let musicLocal: string | null = null;
  if (req.musicUrl) {
    try {
      musicLocal = path.join(work, "music.mp3");
      await fetchLocal(req.musicUrl, musicLocal);
      const detected = estimateBeatSeconds(musicLocal);
      if (detected) { beat = detected; upd(job, { stage: `Synced to music (~${Math.round(60/detected)} BPM)` }); }
    } catch { musicLocal = null; }
  }
  if (!fs.existsSync(TRAILER_DIR)) fs.mkdirSync(TRAILER_DIR, { recursive: true });
  const fitChain = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${fps}`;
  const XFADE = 0.28; // transition overlap seconds

  const mode: TrailerMode = req.mode || (req.aiRemix ? "ai_remix" : "original");
  const useChroma = req.chromaAberration ?? (mode !== "original");
  const useLightLeaks = req.lightLeaks ?? (mode !== "original");
  const useLetterbox = req.letterbox ?? false;
  const useGlitch = req.glitch ?? (mode !== "original");

  try {
    let clips = (req.clips || []).filter(c => c && c.src);
    if (clips.length === 0) throw new Error("No clips provided");

    // ─── MODE ROUTING ──────────────────────────────────────────────────────────
    const needsAI = mode === "ai_full_shoot" || mode === "ai_remix" || mode === "hybrid" || mode === "photo_cinematic";
    if (needsAI) {
      upd(job, { progress: 5, stage: "AI is shooting new angles" });
      try {
        const want = Math.max(2, Math.min(16, req.aiShotCount || (mode === "ai_full_shoot" || mode === "photo_cinematic" ? 8 : 6)));
        const ai = await generateAIShots(clips.map(c => ({ src: c.src })), want, {
          resolution: "720p",
          onProgress: (d, t) => upd(job, { progress: 5 + Math.round((d / t) * 15), stage: `AI generating new shots (${d}/${t})` }),
        });
        if (ai.shots.length > 0) {
          const aiClips = ai.shots.map(s => ({ src: s }));
          if (mode === "ai_full_shoot" || mode === "photo_cinematic") {
            // AI ONLY — trailer is 100% AI-generated shots
            clips = aiClips;
          } else if (mode === "hybrid") {
            // HYBRID — interleave AI shots with originals for max variety
            const merged: typeof clips = [];
            const maxLen = Math.max(aiClips.length, clips.length);
            for (let i = 0; i < maxLen; i++) {
              if (i < aiClips.length) merged.push(aiClips[i]);
              if (i < clips.length) merged.push(clips[i]);
            }
            clips = merged;
          } else {
            // AI REMIX — AI leads, original anchors
            clips = [...aiClips, clips[0]];
          }
          // Override focus rotation with the body-specific focuses the AI used
          if (ai.bodyFocuses.length > 0) {
            const origFocuses = req.focusRotation && req.focusRotation.length ? req.focusRotation : ["face","chest","waist","abs","butt","legs"];
            (req as any)._aiFocuses = [...ai.bodyFocuses, ...origFocuses.slice(0, 2)];
          }
        }
      } catch { /* fall back to original clips if AI fails */ }
    }

    const segments: { path: string; dur: number }[] = [];
    let segIdx = 0;

    // Render one beat segment: fit → focus → grade → speed-ramp → polish → text → flash
    async function makeSegment(clip: TrailerClip, focusId: string, dur: number, opts: { speed?: number; ramp?: boolean; text?: string; flashIn?: boolean; punch?: boolean; lightLeak?: boolean; glitch?: boolean } = {}): Promise<{ path: string; dur: number }> {
      const speed = opts.speed ?? 1.0;
      const localExt = isImage(clip.src) ? ".img" : ".mp4";
      const local = path.join(work, `raw-${segIdx}${localExt}`);
      await fetchLocal(clip.src, local);
      const out = path.join(work, `seg-${segIdx}.mp4`); segIdx++;
      const img = isImage(clip.src);
      const focusMeta = FOCUS[focusId] || FOCUS.none;
      const focus = focusChain(focusId, W, H);
      const gradePart = grade ? `,${grade}` : "";
      const polishPart = usePolish ? `,${POLISH}` : "";
      const textPart = opts.text ? animatedText(opts.text, W, H, dur) : "";
      const flashPart = opts.flashIn ? `,fade=t=in:st=0:d=0.12:color=white` : "";
      const lightLeakPart = opts.lightLeak ? `,${LIGHT_LEAK}` : "";
      const glitchPart = opts.glitch ? `,${GLITCH}` : "";

      // BODY-FOCUSED ZOOM-PUNCH: zooms toward the actual body region (cx,cy) not just center.
      // Uses zoompan with a body-part-aware x/y offset so the punch pushes INTO the feature.
      let punch = "";
      if (opts.punch) {
        const maxZ = 1.18;
        const cx = focusMeta.cx; const cy = focusMeta.cy;
        const d = Math.round(dur * fps);
        // x/y expressions keep the focal point (cx,cy) centered as zoom increases
        punch = `,zoompan=z='min(zoom+0.006,${maxZ})':d=${d}:x='iw*${cx.toFixed(3)}-(iw/zoom)*${cx.toFixed(3)}':y='ih*${cy.toFixed(3)}-(ih/zoom)*${cy.toFixed(3)}':s=${W}x${H}:fps=${fps}`;
      }

      if (img) {
        // Ken-burns push toward the body focus point
        const cx = focusMeta.cx; const cy = focusMeta.cy;
        const d = Math.round(dur * fps);
        const vf = `zoompan=z='min(zoom+0.0018,1.32)':d=${d}:x='iw*${cx.toFixed(3)}-(iw/zoom)*${cx.toFixed(3)}':y='ih*${cy.toFixed(3)}-(ih/zoom)*${cy.toFixed(3)}':s=${W}x${H}:fps=${fps}${focus}${gradePart}${polishPart}${textPart}${flashPart}${lightLeakPart}${glitchPart}`;
        await ff(["-loop", "1", "-t", String(dur), "-i", local, "-f", "lavfi", "-t", String(dur), "-i", "anullsrc=cl=stereo:r=44100", "-vf", vf, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-shortest", out]);
      } else {
        const srcDur = probe(local) || 5;
        const grab = dur * (speed < 1.0 ? speed : 1.0);
        const start = clip.trimStart != null ? clip.trimStart : Math.max(0, Math.min(srcDur * 0.35, Math.max(0, srcDur - Math.max(grab, 0.5))));

        // DYNAMIC SPEED RAMP: fast-in → slow peak → fast-out using a smooth PTS curve.
        // We split the segment into 3 sub-clips and concat them:
        //   phase A (first 25%): normal speed (1.0x) — the snap-in
        //   phase B (middle 50%): slow-mo (speed x) — the cinematic reveal
        //   phase C (last 25%): normal speed (1.0x) — the snap-out
        // This is the real "speed ramp" you see in pro trailers.
        let setpts = "";
        let ramp = "";
        if (opts.ramp && speed < 1.0 && srcDur >= 1.5) {
          const pA = Math.max(0.1, dur * 0.25); // fast-in
          const pB = Math.max(0.2, dur * 0.50); // slow peak
          const pC = Math.max(0.1, dur * 0.25); // fast-out
          const grabA = pA;                      // 1x speed
          const grabB = pB / speed;              // slow-mo grab
          const grabC = pC;                      // 1x speed
          const totalGrab = grabA + grabB + grabC;
          const safeStart = Math.max(0, Math.min(srcDur * 0.3, srcDur - totalGrab));

          // Build 3 sub-segments and concat them
          const subA = path.join(work, `ramp-a-${segIdx-1}.mp4`);
          const subB = path.join(work, `ramp-b-${segIdx-1}.mp4`);
          const subC = path.join(work, `ramp-c-${segIdx-1}.mp4`);
          const vfBase = `${fitChain}${focus}${gradePart}${punch}${polishPart}`;
          await ff(["-ss", String(safeStart), "-t", String(grabA), "-i", local, "-f", "lavfi", "-t", String(pA), "-i", "anullsrc=cl=stereo:r=44100", "-vf", vfBase, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-t", String(pA), subA]);
          await ff(["-ss", String(safeStart + grabA), "-t", String(grabB), "-i", local, "-f", "lavfi", "-t", String(pB), "-i", "anullsrc=cl=stereo:r=44100", "-vf", `${vfBase},setpts=${(1/speed).toFixed(3)}*PTS,tblend=all_mode=average`, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-t", String(pB), subB]);
          await ff(["-ss", String(safeStart + grabA + grabB), "-t", String(grabC), "-i", local, "-f", "lavfi", "-t", String(pC), "-i", "anullsrc=cl=stereo:r=44100", "-vf", vfBase, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-t", String(pC), subC]);
          const rampList = path.join(work, `ramp-list-${segIdx-1}.txt`);
          fs.writeFileSync(rampList, [`file '${subA}'`, `file '${subB}'`, `file '${subC}'`].join("\n"));
          // Add text/flash on top of the stitched ramp
          const rampRaw = path.join(work, `ramp-raw-${segIdx-1}.mp4`);
          await ff(["-f", "concat", "-safe", "0", "-i", rampList, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-ar", "44100", rampRaw]);
          if (textPart || flashPart) {
            await ff(["-i", rampRaw, "-vf", `${textPart.slice(1)}${flashPart}`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "copy", out]);
          } else {
            fs.copyFileSync(rampRaw, out);
          }
          return { path: out, dur };
        }

        // Standard (no ramp): flat speed
        setpts = speed !== 1.0 ? `,setpts=${(1/speed).toFixed(3)}*PTS` : "";
        ramp = speed < 1.0 ? `,tblend=all_mode=average` : "";
        const vf = `${fitChain}${focus}${gradePart}${punch}${setpts}${ramp}${polishPart}${textPart}${flashPart}${lightLeakPart}${glitchPart}`;
        await ff(["-ss", String(start), "-t", String(grab), "-i", local, "-f", "lavfi", "-t", String(dur), "-i", "anullsrc=cl=stereo:r=44100", "-vf", vf, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-t", String(dur), out]);
      }
      return { path: out, dur };
    }

    // 1. HOOK — strongest clip, zoom-punch, flash-in, animated hook text
    upd(job, { progress: 10, stage: "Cutting the hook" });
    segments.push(await makeSegment(clips[0], focuses[0] || "none", Math.max(1.1, beat * 1.15), { text: req.hookText, flashIn: true, punch: true, lightLeak: useLightLeaks, glitch: useGlitch }));

    // 2. BUILD — beat cuts with focus rotation + zoom-punch
    upd(job, { progress: 24, stage: "Building beat cuts" });
    const buildCuts = req.intensity === "fast" ? 10 : req.intensity === "ultra" ? 14 : req.intensity === "slow" ? 5 : req.intensity === "minimal" ? 2 : 7;
    for (let i = 0; i < buildCuts; i++) {
      const clip = clips[(i + 1) % clips.length];
      const focusId = focuses[(i + 1) % focuses.length];
      // accelerate: each cut slightly shorter
      const cutDur = Math.max(0.45, beat * (1 - i * 0.06));
      segments.push(await makeSegment(clip, focusId, cutDur, { punch: i % 2 === 0, lightLeak: useLightLeaks && i % 3 === 0 }));
      upd(job, { progress: 24 + Math.round((i + 1) / buildCuts * 30) });
    }

    // 3. TEASE PEAK — dynamic ramp (fast-in → slow peak → fast-out) + body focus
    upd(job, { progress: 58, stage: "Tease peak" });
    segments.push(await makeSegment(clips[clips.length - 1], focuses[0] || "none", Math.max(2.0, beat * 2.2), { speed: 0.45, ramp: true, punch: true }));

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

    // 6b. Cinematic post-processing: letterbox + chromatic aberration on the full trailer
    if (useLetterbox || useChroma) {
      const fxChain: string[] = [];
      if (useLetterbox) fxChain.push(letterboxFilter(H));
      if (useChroma) fxChain.push(CHROMA_ABERRATION);
      if (fxChain.length) {
        const fxOut = path.join(work, "fx.mp4");
        try {
          await ff(["-i", current, "-vf", fxChain.join(","), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "copy", fxOut]);
          current = fxOut;
        } catch { /* non-fatal: skip FX if filter chain fails */ }
      }
    }

    // 7. Watermark
    if (req.watermarkText) {
      const wm = esc(req.watermarkText.slice(0, 40));
      const out = path.join(work, "wm.mp4");
      await ff(["-i", current, "-vf", `drawtext=fontfile=${FONT}:text='${wm}':fontcolor=white@0.5:fontsize=${Math.round(W*0.03)}:x=w-text_w-${Math.round(W*0.03)}:y=h-text_h-${Math.round(H*0.04)}`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "copy", out]);
      current = out;
    }

    // 8. Music bed (ducked under the built audio)
    if (musicLocal && fs.existsSync(musicLocal)) {
      try {
        const out = path.join(work, "music.mp4");
        await ff(["-i", current, "-stream_loop", "-1", "-i", musicLocal, "-filter_complex", `[1:a]volume=0.65[mu];[0:a][mu]amix=inputs=2:duration=first:dropout_transition=2[a]`, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-shortest", out]);
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
// Uses REAL probed durations each step so the xfade offset is always correct
// (prevents the side-by-side / split-screen artifact from drifted offsets).
async function xfadeConcat(segments: { path: string; dur: number }[], work: string, xfade: number, fps: number): Promise<string> {
  // Safe, full-frame transitions only (no split/slide that can read as 2-up on fast cuts)
  const SAFE = ["fade", "fadeblack", "dissolve", "circleopen", "radial", "smoothleft", "smoothup"];
  let acc = segments[0].path;
  for (let i = 1; i < segments.length; i++) {
    const next = segments[i];
    const mode = SAFE[(i - 1) % SAFE.length];
    const accDur = probe(acc) || segments[0].dur;
    // xfade must overlap strictly inside the accumulator; clamp xfade to < accDur
    const xf = Math.max(0.15, Math.min(xfade, accDur - 0.15, next.dur - 0.05));
    const offset = Math.max(0.05, accDur - xf);
    const out = path.join(work, `xf-${i}.mp4`);
    try {
      await ff([
        "-i", acc, "-i", next.path,
        "-filter_complex",
        `[0:v][1:v]xfade=transition=${mode}:duration=${xf.toFixed(3)}:offset=${offset.toFixed(3)}[v];[0:a][1:a]acrossfade=d=${xf.toFixed(3)}[a]`,
        "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-ar", "44100", out,
      ]);
      acc = out;
    } catch {
      // Fallback: hard concat this pair if xfade fails for any reason
      const lf = path.join(work, `cc-${i}.txt`);
      fs.writeFileSync(lf, [`file '${acc}'`, `file '${next.path}'`].join("\n"));
      const out2 = path.join(work, `cc-${i}.mp4`);
      await ff(["-f", "concat", "-safe", "0", "-i", lf, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", String(fps), "-c:a", "aac", "-ar", "44100", out2]);
      acc = out2;
    }
  }
  return acc;
}
