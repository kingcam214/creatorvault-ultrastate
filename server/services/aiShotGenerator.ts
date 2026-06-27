/**
 * ============================================================================
 * AI SHOT GENERATOR — turns uploaded content into NEW cinematic shots
 *
 * Pipeline:
 *   1. Extract keyframes from the uploaded clip(s) at spread timestamps
 *   2. For each frame, call Pollo image-to-video with a DISTINCT camera prompt
 *      (low-angle push, orbit, side glide, overhead, rack-focus, dolly)
 *   3. Return the new AI-generated video shots — different angles/motion of the
 *      same subject, so a trailer cut from them looks nothing like the original.
 *
 * Used by the trailer engine's "AI Remix" mode.
 * ============================================================================
 */
import { spawn, execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

const PUBLIC_ROOT = "/root/uploads";
const SHOTS_DIR = path.join(PUBLIC_ROOT, "ai-shots");
const PUBLIC_BASE = (process.env.PUBLIC_APP_URL || "https://creatorvault.live").replace(/\/$/, "");
const POLLO_URL = "https://pollo.ai/api/platform/generation/pollo/pollo-v1-6";
const POLLO_KEY = () => process.env.POLLO_API_KEY || "";

// Body-part-specific cinematic camera treatments.
// Each prompt tells Pollo EXACTLY which body feature to frame and how to move.
export const AI_CAMERA_SHOTS: { id: string; label: string; bodyFocus: string; prompt: string }[] = [
  { id: "abs_push",      label: "Abs Push",         bodyFocus: "abs",       prompt: "slow cinematic camera push in tight on a toned midsection, abs as the hero, low angle looking up, dramatic side lighting, shallow depth of field, luxury film grade" },
  { id: "waist_orbit",   label: "Waist Orbit",      bodyFocus: "waist",     prompt: "smooth orbital camera circling the hourglass waist, side-light accentuating the curve, slow 180-degree arc, cinematic rim lighting, premium editorial look" },
  { id: "butt_arch",     label: "Butt Arch",        bodyFocus: "butt",      prompt: "low-angle camera push from behind, rear curves as the hero, backlight creating a halo silhouette on the arch, slow push in, cinematic heat grade" },
  { id: "legs_tilt",     label: "Legs Tilt",        bodyFocus: "legs",      prompt: "slow vertical camera tilt from ankle up the full length of the legs, elongating low angle, soft glamour lighting, cinematic premium look" },
  { id: "thigh_glide",   label: "Thigh Glide",      bodyFocus: "thighs",    prompt: "lateral tracking shot gliding at thigh level, tight framing on inner thighs, soft boudoir lighting, shallow focus, intimate cinematic warmth" },
  { id: "chest_reveal",  label: "Chest Reveal",     bodyFocus: "chest",     prompt: "slow camera tilt from collarbone down to chest, rack focus pulling onto the decollete, rose-warm lighting, cinematic editorial quality" },
  { id: "back_spine",    label: "Back Spine",       bodyFocus: "back",      prompt: "slow camera tilt down the spine from nape to lower back, backlight edge glow, cinematic noir grade, intimate reveal" },
  { id: "lowerback_glow",label: "Lower Back Glow",  bodyFocus: "lowerback", prompt: "tight close-up push on the lower back dimples, warm backlight halo, slow push in, cinematic luxury grade" },
  { id: "hips_sway",     label: "Hip Sway",         bodyFocus: "hips",      prompt: "side tracking shot following the hip sway in motion, parallax, neon-warm lighting, cinematic energy" },
  { id: "face_closeup",  label: "Face Close-Up",    bodyFocus: "face",      prompt: "extreme close-up orbit around the jawline and lips, dramatic side light, soft skin glow, cinematic intimacy" },
  { id: "silhouette",    label: "Silhouette",       bodyFocus: "silhouette",prompt: "full-body silhouette with strong backlight, 360-degree orbit, cinematic noir, every curve visible against the light" },
  { id: "dolly_reveal",  label: "Dolly Reveal",     bodyFocus: "none",      prompt: "slow dolly-out reveal from a tight body detail to a full-frame wide shot, dramatic falloff lighting, premium cinematic grade" },
];

function ffSync(args: string[], timeoutMs = 60000): void {
  execSync(`ffmpeg -y ${args.map(a => (/[^\w.\/:-]/.test(a) ? JSON.stringify(a) : a)).join(" ")}`, { stdio: "ignore", timeout: timeoutMs });
}
function probe(file: string): number {
  try { const o = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 ${JSON.stringify(file)}`, { encoding: "utf8" }); const d = parseFloat(o.trim()); return Number.isFinite(d) ? d : 0; } catch { return 0; }
}
function isImage(s: string) { return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(s); }

async function fetchLocal(src: string, dest: string) {
  if (src.startsWith("/")) { fs.copyFileSync(src, dest); return; }
  const m = src.match(/\/uploads\/(.+)$/);
  if (m) { const local = path.join(PUBLIC_ROOT, decodeURIComponent(m[1])); if (fs.existsSync(local)) { fs.copyFileSync(local, dest); return; } }
  const r = await fetch(src); if (!r.ok) throw new Error(`fetch ${r.status}`); fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
}

// Extract N keyframes spread across a clip, save as public JPGs, return their URLs.
async function extractKeyframes(srcUrl: string, n: number, dir: string, idPrefix: string): Promise<string[]> {
  const local = path.join(dir, `${idPrefix}-src${isImage(srcUrl) ? ".img" : ".mp4"}`);
  await fetchLocal(srcUrl, local);
  if (isImage(srcUrl)) {
    // already an image — just publish it once
    const pub = path.join(SHOTS_DIR, idPrefix); fs.mkdirSync(pub, { recursive: true });
    const dest = path.join(pub, "frame-0.jpg");
    ffSync(["-i", local, "-frames:v", "1", "-q:v", "2", dest]);
    return [`${PUBLIC_BASE}/uploads/ai-shots/${idPrefix}/frame-0.jpg`];
  }
  const dur = probe(local) || 5;
  const urls: string[] = [];
  const pub = path.join(SHOTS_DIR, idPrefix); fs.mkdirSync(pub, { recursive: true });
  for (let i = 0; i < n; i++) {
    const t = Math.max(0.2, (dur * (i + 0.5)) / n);
    const dest = path.join(pub, `frame-${i}.jpg`);
    try { ffSync(["-ss", String(t.toFixed(2)), "-i", local, "-frames:v", "1", "-q:v", "2", dest]); } catch { continue; }
    if (fs.existsSync(dest)) urls.push(`${PUBLIC_BASE}/uploads/ai-shots/${idPrefix}/frame-${i}.jpg`);
  }
  return urls;
}

// Call Pollo image-to-video for one frame + camera prompt. Returns the video URL.
async function polloShot(imageUrl: string, prompt: string, resolution = "720p", length = 5): Promise<string | null> {
  try {
    const res = await fetch(POLLO_URL, {
      method: "POST",
      headers: { "x-api-key": POLLO_KEY(), "Content-Type": "application/json" },
      body: JSON.stringify({ input: { image: imageUrl, prompt, resolution, length, mode: "basic" } }),
    });
    if (!res.ok) return null;
    const job: any = await res.json();
    const jobId = job?.data?.taskId || job?.id || job?.task_id;
    if (!jobId) return null;
    for (let i = 0; i < 48; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const poll = await fetch(`https://pollo.ai/api/platform/generation/${jobId}/status`, { headers: { "x-api-key": POLLO_KEY() } });
      if (!poll.ok) continue;
      const result: any = await poll.json();
      const gen = result?.data?.generations?.[0];
      const status = String(gen?.status || result?.data?.status || "").toLowerCase();
      const url = gen?.url || result?.url;
      if ((status === "succeed" || status === "succeeded" || status === "completed") && url) return url;
      if (status === "failed" || status === "fail" || status === "error") return null;
    }
    return null;
  } catch { return null; }
}

export interface AIShotResult { shots: string[]; bodyFocuses: string[]; framesUsed: number; }

/**
 * Generate `count` NEW AI shots from the provided source clips.
 * - extracts keyframes across the clips
 * - assigns each a distinct camera treatment
 * - runs Pollo in parallel (bounded) to generate new-angle videos
 * Returns the list of new shot video URLs (may be fewer than requested if some fail).
 */
export async function generateAIShots(
  sourceClips: { src: string }[],
  count: number,
  opts: { resolution?: "540p" | "720p"; onProgress?: (done: number, total: number) => void } = {}
): Promise<AIShotResult> {
  if (!POLLO_KEY()) return { shots: [], framesUsed: 0 };
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const work = path.join("/tmp/vaultx-aishots", randomUUID());
  fs.mkdirSync(work, { recursive: true });

  try {
    // 1. Gather candidate frames across all clips
    const framesPerClip = Math.max(1, Math.ceil(count / sourceClips.length));
    let frames: string[] = [];
    for (let i = 0; i < sourceClips.length; i++) {
      const fs2 = await extractKeyframes(sourceClips[i].src, framesPerClip, work, `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`);
      frames = frames.concat(fs2);
    }
    if (frames.length === 0) return { shots: [], framesUsed: 0 };

    // 2. Build (frame, camera) jobs up to `count`
    const jobs: { frame: string; prompt: string }[] = [];
    for (let i = 0; i < count; i++) {
      const frame = frames[i % frames.length];
      const cam = AI_CAMERA_SHOTS[i % AI_CAMERA_SHOTS.length];
      jobs.push({ frame, prompt: cam.prompt });
    }

    // 3. Run Pollo with bounded concurrency (3 at a time)
    const res = opts.resolution || "720p";
    const out: string[] = [];
    const outFocuses: string[] = [];
    let done = 0;
    const CONC = 3;
    for (let i = 0; i < jobs.length; i += CONC) {
      const batch = jobs.slice(i, i + CONC);
      const results = await Promise.all(batch.map(j => polloShot(j.frame, j.prompt, res, 5)));
      for (let k = 0; k < results.length; k++) {
        const u = results[k];
        const cam = AI_CAMERA_SHOTS[(i + k) % AI_CAMERA_SHOTS.length];
        if (u) { out.push(u); outFocuses.push(cam.bodyFocus); }
        done++; opts.onProgress?.(done, jobs.length);
      }
    }
    return { shots: out, bodyFocuses: outFocuses, framesUsed: frames.length };
  } finally {
    try { execSync(`rm -rf ${JSON.stringify(work)}`); } catch {}
  }
}
