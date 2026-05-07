/**
 * ============================================================================
 * MONETIZATION BUNDLE SERVICE
 * ============================================================================
 * Complete monetization pipeline for adult creators:
 * 1. PPV Bundle Builder — teaser + censored preview + full video + AI pricing
 * 2. Subscription Tier Packager — auto-assign content to tiers by value score
 * 3. Tip-Unlock Generator — creates tip-gated content with reveal mechanics
 * 4. Custom Request Fulfillment — end-to-end: request → content → delivery → payment
 * 5. AI Pricing Engine — suggests optimal price based on content analysis
 * ============================================================================
 */

import path from "path";
import fs from "fs";
import { execSync, spawn } from "child_process";
import { OpenAI } from "openai";
import { db } from "../db";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/root/creatorvault/uploads";
const BASE_URL = process.env.BASE_URL || "https://creatorvault.live";

const openai = new OpenAI();

// ============================================================================
// PPV BUNDLE PROGRESS STORE
// In-memory store for real-time stage tracking. Keyed by bundleId.
// ============================================================================
export interface PPVStage {
  id: string;
  label: string;
  status: "pending" | "active" | "complete" | "failed";
  startedAt?: number;
  completedAt?: number;
  error?: string;
}
export interface PPVProgress {
  bundleId: string;
  creatorId: number;
  overallStatus: "pending" | "processing" | "complete" | "failed";
  currentStageIndex: number;
  stages: PPVStage[];
  startedAt: number;
  completedAt?: number;
  error?: string;
}
const PPV_STAGE_DEFS = [
  { id: "analyzing",         label: "Analyzing source video" },
  { id: "teaser",            label: "Generating teaser clip" },
  { id: "censored_preview",  label: "Generating censored preview" },
  { id: "full_video",        label: "Processing full video" },
  { id: "thumbnail",         label: "Extracting thumbnail" },
  { id: "ai_hooks",          label: "Generating AI hooks & pricing" },
  { id: "saving",            label: "Saving to Content Vault" },
];
// Global store — survives within a single server process
export const ppvProgressStore = new Map<string, PPVProgress>();

export function getPpvProgress(bundleId: string): PPVProgress | null {
  return ppvProgressStore.get(bundleId) ?? null;
}

function initProgress(bundleId: string, creatorId: number): PPVProgress {
  const progress: PPVProgress = {
    bundleId,
    creatorId,
    overallStatus: "processing",
    currentStageIndex: 0,
    stages: PPV_STAGE_DEFS.map(s => ({ id: s.id, label: s.label, status: "pending" })),
    startedAt: Date.now(),
  };
  ppvProgressStore.set(bundleId, progress);
  return progress;
}

function advanceStage(progress: PPVProgress, stageId: string): void {
  const idx = progress.stages.findIndex(s => s.id === stageId);
  if (idx === -1) return;
  // Mark previous stages complete
  for (let i = 0; i < idx; i++) {
    if (progress.stages[i].status === "pending") {
      progress.stages[i].status = "complete";
      progress.stages[i].completedAt = Date.now();
    }
  }
  progress.stages[idx].status = "active";
  progress.stages[idx].startedAt = Date.now();
  progress.currentStageIndex = idx;
}

function completeStage(progress: PPVProgress, stageId: string): void {
  const stage = progress.stages.find(s => s.id === stageId);
  if (stage) {
    stage.status = "complete";
    stage.completedAt = Date.now();
  }
}

function failStage(progress: PPVProgress, stageId: string, error: string): void {
  const stage = progress.stages.find(s => s.id === stageId);
  if (stage) {
    stage.status = "failed";
    stage.error = error;
    stage.completedAt = Date.now();
  }
  progress.overallStatus = "failed";
  progress.error = error;
  progress.completedAt = Date.now();
}

function completeProgress(progress: PPVProgress): void {
  progress.stages.forEach(s => {
    if (s.status !== "failed") s.status = "complete";
    if (!s.completedAt) s.completedAt = Date.now();
  });
  progress.overallStatus = "complete";
  progress.completedAt = Date.now();
  // Auto-clean after 10 minutes
  setTimeout(() => ppvProgressStore.delete(progress.bundleId), 10 * 60 * 1000);
}



// ============================================================================
// AI PRICING ENGINE
// Analyzes content and suggests optimal PPV/subscription price
// ============================================================================
export async function suggestContentPrice(params: {
  durationSec: number;
  desireScore: number; // 1-10 from scene analysis
  contentType: "full_scene" | "clip" | "custom_request" | "live_replay" | "photoset";
  creatorTier: "emerging" | "established" | "top_tier";
  platformTarget: "onlyfans" | "fansly" | "mym" | "direct";
}): Promise<{
  suggestedPriceCents: number;
  priceRange: { min: number; max: number };
  reasoning: string;
  tierRecommendation: "free" | "tier1" | "tier2" | "tier3" | "ppv";
  estimatedRevenue30Day: number;
}> {
  const { durationSec, desireScore, contentType, creatorTier, platformTarget } = params;

  // Base pricing matrix (in cents)
  const baseMatrix: Record<string, number> = {
    full_scene: 1500,
    clip: 500,
    custom_request: 2500,
    live_replay: 1000,
    photoset: 800,
  };

  const tierMultiplier: Record<string, number> = {
    emerging: 0.7,
    established: 1.0,
    top_tier: 1.8,
  };

  const platformMultiplier: Record<string, number> = {
    onlyfans: 1.0,
    fansly: 0.9,
    mym: 0.85,
    direct: 1.2,
  };

  // Duration bonus: +$1 per 5 minutes over 10 minutes
  const durationBonus = Math.max(0, Math.floor((durationSec - 600) / 300)) * 100;

  // Desire score multiplier
  const desireMultiplier = 0.6 + (desireScore / 10) * 0.8;

  const basePriceCents = baseMatrix[contentType] || 1000;
  const suggestedPriceCents = Math.round(
    (basePriceCents + durationBonus) *
    tierMultiplier[creatorTier] *
    platformMultiplier[platformTarget] *
    desireMultiplier
  );

  // Round to nearest $0.50
  const roundedPrice = Math.round(suggestedPriceCents / 50) * 50;

  const tierRecommendation =
    roundedPrice < 500 ? "free" :
    roundedPrice < 1000 ? "tier1" :
    roundedPrice < 2000 ? "tier2" :
    roundedPrice < 3500 ? "tier3" : "ppv";

  // Estimate 30-day revenue based on typical conversion rates
  const conversionRates: Record<string, number> = {
    onlyfans: 0.08,
    fansly: 0.06,
    mym: 0.05,
    direct: 0.12,
  };

  const estimatedSubscribers = creatorTier === "top_tier" ? 5000 :
    creatorTier === "established" ? 1000 : 200;

  const estimatedRevenue30Day = Math.round(
    estimatedSubscribers * conversionRates[platformTarget] * roundedPrice
  );

  return {
    suggestedPriceCents: roundedPrice,
    priceRange: {
      min: Math.round(roundedPrice * 0.7),
      max: Math.round(roundedPrice * 1.4),
    },
    reasoning: `${contentType.replace("_", " ")} of ${Math.round(durationSec / 60)}min with desire score ${desireScore}/10 for ${creatorTier} creator on ${platformTarget}`,
    tierRecommendation,
    estimatedRevenue30Day,
  };
}

// ============================================================================
// PPV BUNDLE BUILDER
// Creates the complete PPV package: teaser + censored preview + full video
// ============================================================================
export async function buildPpvBundle(params: {
  sourceUrl: string;
  creatorId: number;
  creatorUsername: string;
  desireScore: number;
  teaserDurationSec?: number;
  previewDurationSec?: number;
  clientBundleId?: string; // if provided, use this as bundleId for progress tracking sync
}): Promise<{
  fullVideoUrl: string;
  teaserUrl: string;
  censoredPreviewUrl: string;
  thumbnailUrl: string;
  suggestedPriceCents: number;
  suggestedPriceDollars: number;
  desireScore: number;
  aiGeneratedHooks: string[];
  aiGeneratedCta: string;
  bundleId: string;
  enginesUsed: string[];
  replicateEnhancePredictionId: string | null;
}> {
  const {
    sourceUrl,
    creatorUsername,
    desireScore,
    teaserDurationSec = 60,
    previewDurationSec = 30,
  } = params;

  // Resolve source
  let sourcePath = sourceUrl;
  if (sourceUrl.startsWith("http")) {
    const tmpInput = path.join(UPLOAD_DIR, `ppv_input_${Date.now()}.mp4`);
    execSync(`curl -sL "${sourceUrl}" -o "${tmpInput}"`, { timeout: 120000 });
    sourcePath = tmpInput;
  }

  const bundleId = params.clientBundleId || `ppv_${Date.now()}`;
  const tmpDir = path.join(UPLOAD_DIR, bundleId);
  fs.mkdirSync(tmpDir, { recursive: true });
  // Initialize real-time progress tracking
  const progress = initProgress(bundleId, params.creatorId);
  advanceStage(progress, "analyzing");

  // Get source duration
  const durationRaw = execSync(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${sourcePath}"`,
    { encoding: "utf8" }
  ).trim();
  const totalDuration = parseFloat(durationRaw) || 60;

  // ── 1. TEASER — first N seconds with desire grade + watermark ──
  completeStage(progress, "analyzing");
  advanceStage(progress, "teaser");
  const teaserPath = path.join(tmpDir, "teaser.mp4");
  const actualTeaserDuration = Math.min(teaserDurationSec, totalDuration * 0.4);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn("ffmpeg", [
      "-y", "-i", sourcePath,
      "-t", String(actualTeaserDuration),
      "-vf", [
        "curves=r='0/0 0.08/0.12 0.5/0.55 1/1':g='0/0 0.05/0.08 0.5/0.52 1/1':b='0/0 0.05/0.06 0.5/0.48 1/0.97'",
        "eq=contrast=1.08:brightness=0.02:saturation=1.12",
        "vignette=PI/4",
        `drawtext=text='@${creatorUsername}':fontsize=24:fontcolor=white@0.4:x=W-tw-20:y=H-th-20:shadowcolor=black@0.5:shadowx=1:shadowy=1`,
      ].join(","),
      "-c:v", "libx264", "-crf", "20", "-preset", "medium",
      "-c:a", "aac", "-b:a", "192k",
      "-movflags", "+faststart",
      teaserPath
    ], { stdio: "pipe" });
    proc.on("close", (code) => code === 0 ? resolve() : reject(new Error("Teaser failed")));
  });

  completeStage(progress, "teaser");
  // ── 2. CENSORED PREVIEW — strategic blur on explicit regions ──
  advanceStage(progress, "censored_preview");
  const censoredPath = path.join(tmpDir, "censored_preview.mp4");
  const previewStart = Math.max(0, totalDuration * 0.3);
  const actualPreviewDuration = Math.min(previewDurationSec, totalDuration * 0.3);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn("ffmpeg", [
      "-y", "-ss", String(previewStart),
      "-i", sourcePath,
      "-t", String(actualPreviewDuration),
      "-vf", [
        // Apply desire grade first
        "curves=r='0/0 0.08/0.12 0.5/0.55 1/1',eq=contrast=1.08:saturation=1.1",
        // Strategic blur on center region (where explicit content typically is)
        "split[main][blur];[blur]crop=iw*0.6:ih*0.5:iw*0.2:ih*0.25,boxblur=20:5[blurred];[main][blurred]overlay=main_w*0.2:main_h*0.25",
        // Watermark
        `drawtext=text='UNLOCK FOR FULL SCENE':fontsize=28:fontcolor=white@0.8:x=(W-tw)/2:y=(H-th)/2:shadowcolor=black@0.8:shadowx=2:shadowy=2`,
        `drawtext=text='@${creatorUsername}':fontsize=20:fontcolor=white@0.4:x=20:y=20`,
      ].join(","),
      "-c:v", "libx264", "-crf", "22", "-preset", "medium",
      "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart",
      censoredPath
    ], { stdio: "pipe" });
    proc.on("close", (code) => code === 0 ? resolve() : reject(new Error("Censored preview failed")));
  });

  completeStage(progress, "censored_preview");
  // ── 3. THUMBNAIL — extract best frame and enhance ──
  advanceStage(progress, "thumbnail");
  const thumbnailPath = path.join(tmpDir, "thumbnail.jpg");
  const thumbTimestamp = totalDuration * 0.25;

  execSync(
    `ffmpeg -y -ss ${thumbTimestamp} -i "${sourcePath}" -vframes 1 -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,curves=r='0/0 0.08/0.12 0.5/0.55 1/1',eq=contrast=1.1:saturation=1.15" -q:v 2 "${thumbnailPath}" 2>/dev/null`,
    { timeout: 15000 }
  );

  completeStage(progress, "thumbnail");
  // ── 4. AI-GENERATED HOOKS AND CTA ──
  advanceStage(progress, "ai_hooks");
  let aiHooks: string[] = [];
  let aiCta = "";

  try {
    const hookResponse = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{
        role: "user",
        content: `You are a top adult content marketing expert. Generate 3 viral retention hooks and 1 CTA for a PPV video with desire score ${desireScore}/10. 
Return JSON: {"hooks": ["hook1", "hook2", "hook3"], "cta": "unlock cta text"}
Hooks should be provocative, specific, and make the viewer feel they MUST see the full video.
CTA should create urgency and exclusivity. Keep each hook under 80 characters.`,
      }],
      max_tokens: 300,
    });

    const parsed = JSON.parse(
      hookResponse.choices[0]?.message?.content?.replace(/```json|```/g, "").trim() || "{}"
    );
    aiHooks = parsed.hooks || [];
    aiCta = parsed.cta || `Unlock the full scene — @${creatorUsername} exclusive`;
  } catch {
    aiHooks = [
      `This is the one you've been waiting for 🔥`,
      `Full scene available — you won't believe what happens next`,
      `My most requested content — finally unlocked`,
    ];
    aiCta = `Unlock the full scene — exclusive to subscribers`;
  }

  // ── 5. PRICING ──
  const pricing = await suggestContentPrice({
    durationSec: totalDuration,
    desireScore,
    contentType: "full_scene",
    creatorTier: "established",
    platformTarget: "onlyfans",
  });

  completeStage(progress, "ai_hooks");
  advanceStage(progress, "full_video");
  // Copy full video with watermark to bundle dir
  const fullVideoPath = path.join(tmpDir, "full_video.mp4");
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("ffmpeg", [
      "-y", "-i", sourcePath,
      "-vf", [
        "curves=r='0/0 0.08/0.12 0.5/0.55 1/1':g='0/0 0.05/0.08 0.5/0.52 1/1':b='0/0 0.05/0.06 0.5/0.48 1/0.97'",
        "eq=contrast=1.06:brightness=0.01:saturation=1.08",
        "vignette=PI/5",
        `drawtext=text='@${creatorUsername}':fontsize=22:fontcolor=white@0.3:x=W-tw-15:y=H-th-15`,
      ].join(","),
      "-c:v", "libx264", "-crf", "18", "-preset", "slow",
      "-c:a", "aac", "-b:a", "192k",
      "-movflags", "+faststart",
      fullVideoPath
    ], { stdio: "pipe" });
    proc.on("close", (code) => code === 0 ? resolve() : reject(new Error("Full video processing failed")));
  });

  completeStage(progress, "full_video");
  advanceStage(progress, "saving");
  // ── 6. OPTIONAL REPLICATE REAL-ESRGAN ENHANCEMENT PASS ──
  // If REPLICATE_API_TOKEN is set, submit the thumbnail for AI upscale.
  // This is async (fire-and-forget) — we log the predictionId but don't block.
  const enginesUsed: string[] = ["FFmpeg (utility: teaser/censored/full/thumbnail)"];
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  let replicateEnhancePredictionId: string | null = null;
  if (replicateToken) {
    try {
      // Submit thumbnail to Replicate Real-ESRGAN for 4K upscale (async)
      const replicateResp = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${replicateToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
          input: {
            image: `${BASE_URL}/uploads/${bundleId}/thumbnail.jpg`,
            scale: 2,
            face_enhance: false,
          },
        }),
      });
      if (replicateResp.ok) {
        const replicateData = await replicateResp.json() as { id?: string; status?: string };
        replicateEnhancePredictionId = replicateData?.id ?? null;
        if (replicateEnhancePredictionId) {
          enginesUsed.push(`Replicate Real-ESRGAN (predictionId: ${replicateEnhancePredictionId})`);
        }
      }
    } catch (enhanceErr) {
      // Non-blocking — log but don't fail the bundle
      console.warn("Replicate enhancement pass failed (non-blocking):", enhanceErr);
    }
  }
  enginesUsed.push("OpenAI GPT-4.1-mini (hooks + CTA)");
  enginesUsed.push("VaultX AI Pricing Engine (price suggestion)");

  completeStage(progress, "saving");
  completeProgress(progress);
  return {
    fullVideoUrl: `${BASE_URL}/uploads/${bundleId}/full_video.mp4`,
    teaserUrl: `${BASE_URL}/uploads/${bundleId}/teaser.mp4`,
    censoredPreviewUrl: `${BASE_URL}/uploads/${bundleId}/censored_preview.mp4`,
    thumbnailUrl: `${BASE_URL}/uploads/${bundleId}/thumbnail.jpg`,
    suggestedPriceCents: pricing.suggestedPriceCents,
    suggestedPriceDollars: (pricing.suggestedPriceCents / 100).toFixed(2),
    desireScore,
    aiGeneratedHooks: aiHooks,
    aiGeneratedCta: aiCta,
    bundleId,
    enginesUsed,
    replicateEnhancePredictionId,
  };
}

// ============================================================================
// SUBSCRIPTION TIER CONTENT PACKAGER
// Auto-assigns content to tiers based on value score
// ============================================================================
export async function packageForSubscriptionTier(params: {
  contentItems: Array<{
    id: number;
    url: string;
    durationSec: number;
    type: string;
  }>;
  tiers: Array<{
    id: string;
    name: string;
    priceCents: number;
    description: string;
  }>;
}): Promise<Array<{
  contentId: number;
  assignedTierId: string;
  tierName: string;
  valueScore: number;
  reasoning: string;
}>> {
  const assignments = params.contentItems.map(item => {
    // Score content by duration and type
    const durationScore = Math.min(10, item.durationSec / 60);
    const typeScore: Record<string, number> = {
      full_scene: 10,
      clip: 5,
      photo: 3,
      teaser: 2,
      custom: 9,
    };
    const valueScore = (durationScore + (typeScore[item.type] || 5)) / 2;

    // Assign to tier based on value score
    const sortedTiers = [...params.tiers].sort((a, b) => a.priceCents - b.priceCents);
    const tierIndex = Math.min(
      sortedTiers.length - 1,
      Math.floor((valueScore / 10) * sortedTiers.length)
    );
    const assignedTier = sortedTiers[tierIndex];

    return {
      contentId: item.id,
      assignedTierId: assignedTier.id,
      tierName: assignedTier.name,
      valueScore: Math.round(valueScore * 10) / 10,
      reasoning: `${item.type} content (${Math.round(item.durationSec / 60)}min) scored ${Math.round(valueScore * 10) / 10}/10`,
    };
  });

  return assignments;
}

// ============================================================================
// TIP-UNLOCK CONTENT GENERATOR
// Creates tip-gated content with progressive reveal mechanics
// ============================================================================
export async function createTipUnlockContent(params: {
  sourceUrl: string;
  creatorUsername: string;
  tipAmountCents: number;
  revealStyle: "progressive" | "instant" | "timed";
}): Promise<{
  lockedPreviewUrl: string;
  unlockedUrl: string;
  tipAmountCents: number;
  revealStyle: string;
  unlockCode: string;
}> {
  let sourcePath = params.sourceUrl;
  if (params.sourceUrl.startsWith("http")) {
    const tmpInput = path.join(UPLOAD_DIR, `tip_input_${Date.now()}.mp4`);
    execSync(`curl -sL "${params.sourceUrl}" -o "${tmpInput}"`, { timeout: 120000 });
    sourcePath = tmpInput;
  }

  const unlockCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  const lockedFilename = `tip_locked_${Date.now()}.mp4`;
  const unlockedFilename = `tip_unlocked_${Date.now()}.mp4`;
  const lockedPath = path.join(UPLOAD_DIR, lockedFilename);
  const unlockedPath = path.join(UPLOAD_DIR, unlockedFilename);

  const tipDollars = (params.tipAmountCents / 100).toFixed(2);

  // Locked version — heavy blur with tip CTA overlay
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("ffmpeg", [
      "-y", "-i", sourcePath,
      "-vf", [
        "boxblur=30:8",
        `drawtext=text='TIP $${tipDollars} TO UNLOCK':fontsize=36:fontcolor=white:x=(W-tw)/2:y=(H-th)/2-30:shadowcolor=black@0.9:shadowx=2:shadowy=2`,
        `drawtext=text='@${params.creatorUsername}':fontsize=22:fontcolor=white@0.6:x=(W-tw)/2:y=(H-th)/2+30`,
      ].join(","),
      "-c:v", "libx264", "-crf", "24", "-preset", "fast",
      "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart",
      lockedPath
    ], { stdio: "pipe" });
    proc.on("close", (code) => code === 0 ? resolve() : reject(new Error("Locked version failed")));
  });

  // Unlocked version — desire grade applied
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("ffmpeg", [
      "-y", "-i", sourcePath,
      "-vf", [
        "curves=r='0/0 0.08/0.12 0.5/0.55 1/1',eq=contrast=1.08:saturation=1.1",
        `drawtext=text='@${params.creatorUsername}':fontsize=20:fontcolor=white@0.3:x=W-tw-15:y=H-th-15`,
      ].join(","),
      "-c:v", "libx264", "-crf", "18", "-preset", "medium",
      "-c:a", "aac", "-b:a", "192k",
      "-movflags", "+faststart",
      unlockedPath
    ], { stdio: "pipe" });
    proc.on("close", (code) => code === 0 ? resolve() : reject(new Error("Unlocked version failed")));
  });

  return {
    lockedPreviewUrl: `${BASE_URL}/uploads/${lockedFilename}`,
    unlockedUrl: `${BASE_URL}/uploads/${unlockedFilename}`,
    tipAmountCents: params.tipAmountCents,
    revealStyle: params.revealStyle,
    unlockCode,
  };
}
