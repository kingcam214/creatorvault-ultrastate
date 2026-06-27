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

// Distinct cinematic camera treatments — each produces a visibly different shot.
export const AI_CAMERA_SHOTS: { id: string; label: string; prompt: string }[] = [
  { id: "low_push",   label: "Low-Angle Push",   prompt: "slow cinematic camera push in from a low angle, dramatic upward perspective, luxury lighting, shallow depth of field, premium film look" },
  { id: "orbit",      label: "Orbit",            prompt: "smooth orbital camera move circling the subject, parallax, cinematic rim lighting, glossy editorial color, premium film look" },
  { id: "side_glide", label: "Side Glide",       prompt: "lateral tracking shot gliding sideways past the subject, motion parallax, moody key light, cinematic anamorphic feel" },
  { id: "overhead",   label: "Overhead Pan",     prompt: "slow overhead descending camera pan, top-down reveal, soft directional light, high-end editorial mood" },
  { id: "rack_focus", label: "Rack Focus",       prompt: "static frame with a slow rack focus pull onto the subject, bokeh background, intimate close detail, cinematic warmth" },
  { id: "dolly_out",  label: "Dolly Out",        prompt: "slow dolly-out reveal pulling back from a tight detail to a wider frame, dramatic falloff lighting, premium cinematic grade" },
  { id: "slow_tilt",  label: "Slow Tilt",        prompt: "slow vertical camera tilt up the body, elegant reveal, soft glamour lighting, glossy skin, cinematic premium look" },
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

export interface AIShotResult { shots: string[]; framesUsed: number; }

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
    let done = 0;
    const CONC = 3;
    for (let i = 0; i < jobs.length; i += CONC) {
      const batch = jobs.slice(i, i + CONC);
      const results = await Promise.all(batch.map(j => polloShot(j.frame, j.prompt, res, 5)));
      for (const u of results) { if (u) out.push(u); done++; opts.onProgress?.(done, jobs.length); }
    }
    return { shots: out, framesUsed: frames.length };
  } finally {
    try { execSync(`rm -rf ${JSON.stringify(work)}`); } catch {}
  }
}
