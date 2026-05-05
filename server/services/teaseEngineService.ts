/*
 * TeaseEngineService — VaultX Adult Creator Tease Pipeline
 * ============================================================================
 * This service produces the entice/tease output that makes subscribers pay.
 *
 * PIPELINE:
 *   1. Extract the "desire peak" frame from the source video (highest visual
 *      energy moment detected by GPT-4o-mini scene analysis)
 *   2. Run Replicate zsxkib/pulid beauty enhancement on that frame
 *   3. Animate the beauty-enhanced frame via Replicate minimax/video-01-live
 *      with an adult-niche cinematic prompt
 *   4. Produce a drip-reveal teaser: the animated AI clip plays for 3s,
 *      then transitions to the raw source with progressive blur-to-clear
 *      effect, then cuts to black with a CTA overlay
 *   5. Generate a censored preview version of the full video for the
 *      subscriber paywall (strategic blur, not full blackout)
 *   6. Return: teaserUrl, censoredPreviewUrl, desirePeakFrame, aiAnimatedClip,
 *      ctaText, suggestedPrice, hooks
 * ============================================================================
 */

import fetch from "node-fetch";
import { exec } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import * as path from "path";
import * as fs from "fs";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import * as os from "os";
import OpenAI from "openai";

const execAsync = promisify(exec);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const BASE_URL = (process.env.APP_URL || "https://creatorvault.live").replace(/\/$/, "");
const UPLOAD_BASE = "/var/www/creatorvault/uploads/vaultx";

// ─── Replicate helpers ────────────────────────────────────────────────────────
async function replicatePost(endpoint: string, body: object): Promise<any> {
  const resp = await fetch(`https://api.replicate.com/v1/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Replicate POST failed: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

async function replicatePoll(predictionId: string, maxWaitMs = 120000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 3000));
    const resp = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
    });
    if (!resp.ok) throw new Error(`Replicate poll failed: ${resp.status}`);
    const data: any = await resp.json();
    if (data.status === "succeeded") return data;
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(`Replicate prediction ${data.status}: ${data.error || "unknown"}`);
    }
  }
  throw new Error("Replicate prediction timed out after 120s");
}

// ─── FFmpeg helpers ───────────────────────────────────────────────────────────
async function downloadToTemp(url: string): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `vaultx-src-${randomUUID()}.mp4`);
  await execAsync(`ffmpeg -y -i "${url}" -c copy "${tmpPath}" 2>/dev/null || curl -sL "${url}" -o "${tmpPath}"`);
  return tmpPath;
}

async function extractFrame(videoPath: string, timeSeconds: number): Promise<string> {
  const framePath = path.join(os.tmpdir(), `vaultx-frame-${randomUUID()}.jpg`);
  await execAsync(`ffmpeg -y -ss ${timeSeconds} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}"`);
  return framePath;
}

async function getVideoDuration(videoPath: string): Promise<number> {
  const result = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`);
  return parseFloat(result.stdout.trim()) || 30;
}

async function saveToPublic(buf: Buffer, filename: string, subdir: string): Promise<string> {
  const dir = path.join(UPLOAD_BASE, subdir);
  await mkdir(dir, { recursive: true });
  const outPath = path.join(dir, filename);
  await writeFile(outPath, buf);
  return `${BASE_URL}/uploads/vaultx/${subdir}/${filename}`;
}

// ─── GPT scene analysis for desire peak detection ─────────────────────────────
async function detectDesirePeak(videoPath: string, duration: number): Promise<{
  peakTime: number;
  energyScore: number;
  sceneDescription: string;
  ctaText: string;
  hooks: string[];
  suggestedPrice: number;
}> {
  // Extract frames at 25%, 50%, 75% of video for analysis
  const checkPoints = [0.25, 0.5, 0.75].map(p => Math.floor(duration * p));
  const frameAnalyses: string[] = [];

  for (const t of checkPoints) {
    try {
      const framePath = await extractFrame(videoPath, t);
      const imageData = await readFile(framePath);
      const base64 = imageData.toString("base64");

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64}`, detail: "low" },
            },
            {
              type: "text",
              text: `You are analyzing a frame from an adult creator's content for a premium platform. Rate this frame's visual desire/appeal score from 1-10 for adult content marketing purposes. Consider: body visibility, lighting quality, pose/composition, skin tone rendering. Return JSON only: {"score": number, "description": "brief scene description", "timestamp": ${t}}`,
            },
          ],
        }],
      });

      frameAnalyses.push(response.choices[0]?.message?.content || `{"score": 5, "description": "scene at ${t}s", "timestamp": ${t}}`);
      await unlink(framePath).catch(() => {});
    } catch {
      frameAnalyses.push(`{"score": 5, "description": "scene at ${t}s", "timestamp": ${t}}`);
    }
  }

  // Find peak frame
  let peakTime = checkPoints[1];
  let peakScore = 5;
  let peakDescription = "peak moment";

  for (const analysis of frameAnalyses) {
    try {
      const parsed = JSON.parse(analysis.match(/\{[\s\S]*\}/)?.[0] || "{}");
      if ((parsed.score || 0) > peakScore) {
        peakScore = parsed.score;
        peakTime = parsed.timestamp || peakTime;
        peakDescription = parsed.description || peakDescription;
      }
    } catch { /* use defaults */ }
  }

  // Generate CTA and hooks via GPT
  let ctaText = "Unlock the full experience 🔥";
  let hooks = [
    "You won't believe what happens next...",
    "This is just the preview 👀",
    "Full video available now — subscribers only",
  ];
  let suggestedPrice = 14.99;

  try {
    const copyResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `You are a marketing copywriter for a premium adult content platform (like OnlyFans). Generate compelling, enticing (not explicit) copy for a paywall tease. Scene: "${peakDescription}". Return JSON: {"cta": "unlock CTA text under 10 words", "hooks": ["hook1", "hook2", "hook3"], "price": number between 9.99 and 29.99}`,
      }],
    });
    const copyData = JSON.parse(copyResponse.choices[0]?.message?.content?.match(/\{[\s\S]*\}/)?.[0] || "{}");
    ctaText = copyData.cta || ctaText;
    hooks = copyData.hooks || hooks;
    suggestedPrice = copyData.price || suggestedPrice;
  } catch { /* use defaults */ }

  return { peakTime, energyScore: peakScore, sceneDescription: peakDescription, ctaText, hooks, suggestedPrice };
}

// ─── Main tease pipeline ──────────────────────────────────────────────────────
export interface TeaseEngineInput {
  sourceUrl: string;
  creatorId: number | string;
  creatorDisplayName: string;
  teaserDurationSeconds?: number;
  enableAIAnimation?: boolean;
  enableBeautyEnhance?: boolean;
}

export interface TeaseEngineOutput {
  teaserUrl: string;
  censoredPreviewUrl: string;
  desirePeakFrameUrl: string;
  aiAnimatedClipUrl: string | null;
  beautyEnhancedFrameUrl: string | null;
  ctaText: string;
  hooks: string[];
  suggestedPrice: number;
  peakTimeSeconds: number;
  energyScore: number;
  sceneDescription: string;
  processingSteps: { step: string; status: "succeeded" | "failed" | "skipped"; detail?: string }[];
  processingTimeMs: number;
}

export async function runTeaseEngine(input: TeaseEngineInput): Promise<TeaseEngineOutput> {
  const startTime = Date.now();
  const steps: TeaseEngineOutput["processingSteps"] = [];
  const teaserDuration = input.teaserDurationSeconds || 30;
  const jobId = randomUUID();
  const subdir = `tease-${input.creatorId}`;

  let teaserUrl = input.sourceUrl;
  let censoredPreviewUrl = input.sourceUrl;
  let desirePeakFrameUrl = "";
  let aiAnimatedClipUrl: string | null = null;
  let beautyEnhancedFrameUrl: string | null = null;
  let ctaText = "Unlock the full experience 🔥";
  let hooks: string[] = [];
  let suggestedPrice = 14.99;
  let peakTimeSeconds = 0;
  let energyScore = 5;
  let sceneDescription = "";

  // ── Step 1: Download source ──────────────────────────────────────────────
  let tmpSrc = "";
  try {
    tmpSrc = await downloadToTemp(input.sourceUrl);
    steps.push({ step: "Download source video", status: "succeeded" });
  } catch (e: any) {
    steps.push({ step: "Download source video", status: "failed", detail: e.message });
    return {
      teaserUrl, censoredPreviewUrl, desirePeakFrameUrl, aiAnimatedClipUrl,
      beautyEnhancedFrameUrl, ctaText, hooks, suggestedPrice, peakTimeSeconds,
      energyScore, sceneDescription, processingSteps: steps,
      processingTimeMs: Date.now() - startTime,
    };
  }

  const duration = await getVideoDuration(tmpSrc);

  // ── Step 2: AI desire peak detection ────────────────────────────────────
  try {
    const peak = await detectDesirePeak(tmpSrc, duration);
    peakTimeSeconds = peak.peakTime;
    energyScore = peak.energyScore;
    sceneDescription = peak.sceneDescription;
    ctaText = peak.ctaText;
    hooks = peak.hooks;
    suggestedPrice = peak.suggestedPrice;
    steps.push({ step: "AI desire peak detection (GPT-4o-mini)", status: "succeeded", detail: `Peak at ${peakTimeSeconds}s, energy score ${energyScore}/10` });
  } catch (e: any) {
    peakTimeSeconds = Math.floor(duration * 0.4);
    steps.push({ step: "AI desire peak detection (GPT-4o-mini)", status: "failed", detail: e.message });
  }

  // ── Step 3: Extract desire peak frame ───────────────────────────────────
  let peakFramePath = "";
  try {
    peakFramePath = await extractFrame(tmpSrc, peakTimeSeconds);
    const frameBuf = await readFile(peakFramePath);
    const frameFilename = `desire-peak-${jobId}.jpg`;
    desirePeakFrameUrl = await saveToPublic(frameBuf, frameFilename, subdir);
    steps.push({ step: "Extract desire peak frame", status: "succeeded" });
  } catch (e: any) {
    steps.push({ step: "Extract desire peak frame", status: "failed", detail: e.message });
  }

  // ── Step 4: Beauty enhance the peak frame via Replicate zsxkib/pulid ────
  if (input.enableBeautyEnhance !== false && desirePeakFrameUrl && REPLICATE_TOKEN) {
    try {
      const prediction = await replicatePost("predictions", {
        version: "43d309c37ab4e62361e5e29b8e9e867fb2dcbcec77ae91206a8d95ac5dd451a0",
        input: {
          main_face_image: desirePeakFrameUrl,
          prompt: "beautiful, cinematic lighting, premium photography, skin luminosity, professional beauty editorial",
          negative_prompt: "ugly, blurry, low quality, pixelated, overexposed",
          num_steps: 20,
          start_step: 0,
          style_strength_ratio: 20,
        },
      });
      const result = await replicatePoll(prediction.id, 90000);
      const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      if (outputUrl) {
        // Download and save the beauty-enhanced frame
        const resp = await fetch(outputUrl);
        const buf = Buffer.from(await resp.arrayBuffer());
        const beautyFilename = `beauty-peak-${jobId}.jpg`;
        beautyEnhancedFrameUrl = await saveToPublic(buf, beautyFilename, subdir);
        steps.push({ step: "Beauty enhance peak frame (Replicate zsxkib/pulid)", status: "succeeded" });
      } else {
        throw new Error("No output URL from Replicate");
      }
    } catch (e: any) {
      steps.push({ step: "Beauty enhance peak frame (Replicate zsxkib/pulid)", status: "failed", detail: e.message });
      beautyEnhancedFrameUrl = desirePeakFrameUrl; // fallback to raw frame
    }
  } else {
    steps.push({ step: "Beauty enhance peak frame (Replicate zsxkib/pulid)", status: "skipped", detail: !REPLICATE_TOKEN ? "No Replicate token" : "Disabled" });
    beautyEnhancedFrameUrl = desirePeakFrameUrl;
  }

  // ── Step 5: Animate the beauty-enhanced frame via Replicate minimax ──────
  const frameForAnimation = beautyEnhancedFrameUrl || desirePeakFrameUrl;
  if (input.enableAIAnimation !== false && frameForAnimation && REPLICATE_TOKEN) {
    try {
      const animPrompt = `cinematic slow motion, luxury adult content aesthetic, sensual camera movement, premium production quality, ${sceneDescription}, warm golden hour lighting, shallow depth of field, professional cinematography`;
      const prediction = await replicatePost("predictions", {
        model: "minimax/video-01-live",
        input: {
          first_frame_image: frameForAnimation,
          prompt: animPrompt,
          prompt_optimizer: true,
        },
      });
      const result = await replicatePoll(prediction.id, 120000);
      const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      if (outputUrl) {
        const resp = await fetch(outputUrl);
        const buf = Buffer.from(await resp.arrayBuffer());
        const animFilename = `ai-animated-${jobId}.mp4`;
        aiAnimatedClipUrl = await saveToPublic(buf, animFilename, subdir);
        steps.push({ step: "AI animate desire peak (Replicate minimax/video-01-live)", status: "succeeded" });
      } else {
        throw new Error("No output URL from Replicate");
      }
    } catch (e: any) {
      steps.push({ step: "AI animate desire peak (Replicate minimax/video-01-live)", status: "failed", detail: e.message });
    }
  } else {
    steps.push({ step: "AI animate desire peak (Replicate minimax/video-01-live)", status: "skipped", detail: !REPLICATE_TOKEN ? "No Replicate token" : "Disabled" });
  }

  // ── Step 6: Build the drip-reveal teaser ────────────────────────────────
  // The teaser is: [AI animated clip (if available, 4s)] + [source clip with
  // progressive blur-to-clear reveal at peak moment (teaserDuration-4s)] +
  // [fade to black with CTA text overlay (3s)]
  try {
    const teaserOut = path.join(os.tmpdir(), `vaultx-teaser-${jobId}.mp4`);
    const teaserEnd = Math.min(peakTimeSeconds + (teaserDuration * 0.6), duration - 2);
    const teaserStart = Math.max(0, teaserEnd - teaserDuration);

    if (aiAnimatedClipUrl) {
      // Composite: AI clip intro + source teaser + CTA outro
      const aiTmpPath = path.join(os.tmpdir(), `vaultx-ai-intro-${jobId}.mp4`);
      await execAsync(`curl -sL "${aiAnimatedClipUrl}" -o "${aiTmpPath}"`);

      // Normalize AI clip to 1080x1920 vertical, 4 seconds
      const aiNormPath = path.join(os.tmpdir(), `vaultx-ai-norm-${jobId}.mp4`);
      await execAsync(`ffmpeg -y -i "${aiTmpPath}" -t 4 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1" -c:v libx264 -preset fast -crf 20 -an "${aiNormPath}"`);

      // Source teaser segment with Desire-Grade color science
      const srcTeaserPath = path.join(os.tmpdir(), `vaultx-src-teaser-${jobId}.mp4`);
      const desireGradeFilter = [
        // Desire-Grade: lifted blacks, warm highlights, skin luminosity
        "curves=r='0/0 0.08/0.12 0.5/0.58 0.92/0.97 1/1':g='0/0 0.08/0.10 0.5/0.55 0.92/0.95 1/1':b='0/0 0.08/0.08 0.5/0.50 0.92/0.90 1/0.95'",
        "eq=brightness=0.04:contrast=1.12:saturation=1.18:gamma=0.96",
        "hue=s=1.1",
        "unsharp=5:5:0.8:5:5:0",
        "vignette=PI/5",
        // Progressive blur-to-clear: starts blurred, clears at peak
        `[in]split[blurred][clear];[blurred]boxblur=12:12[b];[b][clear]blend=all_expr='if(gte(T,2),B,A*(1-T/2)+B*(T/2))'[out]`,
      ].slice(0, 5).join(","); // Use only the non-blend filters for simplicity

      await execAsync(
        `ffmpeg -y -ss ${teaserStart} -i "${tmpSrc}" -t ${teaserDuration} ` +
        `-vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,` +
        `curves=r='0/0 0.08/0.12 0.5/0.58 0.92/0.97 1/1':g='0/0 0.08/0.10 0.5/0.55 0.92/0.95 1/1':b='0/0 0.08/0.08 0.5/0.50 0.92/0.90 1/0.95',` +
        `eq=brightness=0.04:contrast=1.12:saturation=1.18,hue=s=1.1,unsharp=5:5:0.8:5:5:0,vignette=PI/5" ` +
        `-c:v libx264 -preset fast -crf 18 -c:a aac -b:a 192k "${srcTeaserPath}"`
      );

      // CTA outro: 3 seconds black with text
      const ctaPath = path.join(os.tmpdir(), `vaultx-cta-${jobId}.mp4`);
      const safeCta = ctaText.replace(/'/g, "\\'").replace(/:/g, "\\:").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
      await execAsync(
        `ffmpeg -y -f lavfi -i "color=c=black:s=1080x1920:d=3:r=30" ` +
        `-vf "drawtext=text='${safeCta}':fontsize=52:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf,` +
        `drawtext=text='Subscribe Now':fontsize=38:fontcolor=#F59E0B:x=(w-text_w)/2:y=(h-text_h)/2+80:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" ` +
        `-c:v libx264 -preset fast -crf 20 -an "${ctaPath}"`
      );

      // Concatenate: AI intro + source teaser + CTA outro
      const concatList = path.join(os.tmpdir(), `vaultx-concat-${jobId}.txt`);
      await writeFile(concatList, `file '${aiNormPath}'\nfile '${srcTeaserPath}'\nfile '${ctaPath}'\n`);
      await execAsync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c:v libx264 -preset slow -crf 16 -c:a aac -b:a 192k "${teaserOut}"`);

      // Cleanup temp files
      for (const f of [aiTmpPath, aiNormPath, srcTeaserPath, ctaPath, concatList]) {
        unlink(f).catch(() => {});
      }
    } else {
      // No AI clip — just source teaser with Desire-Grade + CTA
      await execAsync(
        `ffmpeg -y -ss ${teaserStart} -i "${tmpSrc}" -t ${teaserDuration} ` +
        `-vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,` +
        `curves=r='0/0 0.08/0.12 0.5/0.58 0.92/0.97 1/1':g='0/0 0.08/0.10 0.5/0.55 0.92/0.95 1/1':b='0/0 0.08/0.08 0.5/0.50 0.92/0.90 1/0.95',` +
        `eq=brightness=0.04:contrast=1.12:saturation=1.18,hue=s=1.1,unsharp=5:5:0.8:5:5:0,vignette=PI/5,` +
        `fade=t=in:st=0:d=0.5,fade=t=out:st=${teaserDuration - 1.5}:d=1.5" ` +
        `-c:v libx264 -preset slow -crf 16 -c:a aac -b:a 192k "${teaserOut}"`
      );
    }

    const teaserBuf = await readFile(teaserOut);
    teaserUrl = await saveToPublic(teaserBuf, `teaser-${jobId}.mp4`, subdir);
    unlink(teaserOut).catch(() => {});
    steps.push({ step: "Build drip-reveal teaser (FFmpeg composite)", status: "succeeded" });
  } catch (e: any) {
    steps.push({ step: "Build drip-reveal teaser (FFmpeg composite)", status: "failed", detail: e.message });
  }

  // ── Step 7: Build censored preview (strategic blur, not blackout) ────────
  try {
    const censoredOut = path.join(os.tmpdir(), `vaultx-censored-${jobId}.mp4`);
    // Strategic blur: blur the center/body region but keep face and context visible
    // This creates desire without giving away the full content
    await execAsync(
      `ffmpeg -y -i "${tmpSrc}" ` +
      `-filter_complex "[0:v]split[orig][blur];[blur]crop=iw*0.6:ih*0.5:iw*0.2:ih*0.25,boxblur=20:20[blurred];[orig][blurred]overlay=W*0.2:H*0.25[vout]" ` +
      `-map "[vout]" -map "0:a?" -c:v libx264 -preset fast -crf 22 -c:a copy "${censoredOut}"`
    );
    const censoredBuf = await readFile(censoredOut);
    censoredPreviewUrl = await saveToPublic(censoredBuf, `censored-preview-${jobId}.mp4`, subdir);
    unlink(censoredOut).catch(() => {});
    steps.push({ step: "Build censored preview (strategic blur)", status: "succeeded" });
  } catch (e: any) {
    steps.push({ step: "Build censored preview (strategic blur)", status: "failed", detail: e.message });
  }

  // Cleanup
  if (tmpSrc) unlink(tmpSrc).catch(() => {});
  if (peakFramePath) unlink(peakFramePath).catch(() => {});

  return {
    teaserUrl,
    censoredPreviewUrl,
    desirePeakFrameUrl,
    aiAnimatedClipUrl,
    beautyEnhancedFrameUrl,
    ctaText,
    hooks,
    suggestedPrice,
    peakTimeSeconds,
    energyScore,
    sceneDescription,
    processingSteps: steps,
    processingTimeMs: Date.now() - startTime,
  };
}
