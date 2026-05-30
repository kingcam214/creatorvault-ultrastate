/**
 * VaultX Automated Director — Replicate Multi-Model Pipeline
 * Model A (Motion): minimax/video-01 — cinematic image-to-video
 * Model B (Style): Flux 1.1 Pro — Desire-Grade color/LUT application
 * Model C (Enhance): GFPGAN + Real-ESRGAN — facial and texture enhancement
 *
 * Pipeline: raw_clip → enhance → style_grade → motion_add → schedule_post
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { db } from "../db";
import { sql } from "drizzle-orm";

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;

// ── Replicate API Helper ──────────────────────────────────────────────────────
async function replicateRun(
  model: string,
  input: Record<string, any>,
  maxWaitMs: number = 120000
): Promise<{ output: any; status: string; error?: string }> {
  if (!REPLICATE_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN not configured — stopping pipeline as instructed");
  }

  // Determine if model includes a version hash (owner/name:version) or is a model path
  const hasVersion = model.includes(":");
  // When using /models/owner/name/predictions endpoint, body must only contain { input }
  // When using /predictions endpoint with version hash, body must contain { version, input }
  const body = hasVersion
    ? JSON.stringify({ version: model.split(":")[1], input })
    : JSON.stringify({ input });

  const endpoint = hasVersion
    ? "https://api.replicate.com/v1/predictions"
    : "https://api.replicate.com/v1/models/" + model + "/predictions";

  const createRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Token ${REPLICATE_TOKEN}`,
      "Content-Type": "application/json",
      "Prefer": "wait",
    },
    body,
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    if (err.detail?.includes("billing") || err.detail?.includes("credit") || err.detail?.includes("payment")) {
      throw new Error(`REPLICATE_CREDITS_EMPTY: ${err.detail} — stopping pipeline as instructed`);
    }
    throw new Error(`Replicate create failed: ${JSON.stringify(err)}`);
  }

  const prediction = await createRes.json();

  // If Prefer: wait returned a completed prediction immediately
  if (prediction.status === "succeeded") {
    return { output: prediction.output, status: "succeeded" };
  }

  const predictionId = prediction.id;

  // Poll for completion
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(r => setTimeout(r, 3000));

    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
    });
    const poll = await pollRes.json();

    if (poll.status === "succeeded") {
      return { output: poll.output, status: "succeeded" };
    }
    if (poll.status === "failed" || poll.status === "canceled") {
      return { output: null, status: poll.status, error: poll.error };
    }
  }

  return { output: null, status: "timeout", error: "Prediction timed out" };
}

// ── Model A: Motion (minimax/video-01 via Replicate) ─────────────────────────
async function applyMotionEffects(imageUrl: string, prompt: string): Promise<string> {
  // minimax/video-01: image-to-video, takes first_frame_image + prompt
  const result = await replicateRun(
    "minimax/video-01:5aa835260ff7f40f4069c41185f72036accf99e29957bb4a3b3a911f3b6c1912",
    {
      first_frame_image: imageUrl,
      prompt: prompt || "VaultX premium creator teaser: subtle parallax camera glide, luxury low-key lighting, confident adult-safe sensual energy, crisp subject preservation, cinematic depth, platform-ready vertical motion",
      prompt_optimizer: true,
    }
  );
  if (result.status !== "succeeded" || !result.output) {
    throw new Error(`Motion model failed: ${result.error}`);
  }
  return Array.isArray(result.output) ? result.output[0] : result.output;
}

// ── Model B: Style/Color Grade (Flux 1.1 Pro) ────────────────────────────────
async function applyDesireGrade(imageUrl: string, style: string): Promise<string> {
  const stylePrompts: Record<string, string> = {
    "desire": "warm golden tones, soft shadows, cinematic color grade, skin-flattering warm highlights, professional photography",
    "velvet": "deep rich colors, high contrast, velvet texture, moody atmospheric lighting, editorial fashion",
    "sunrise": "warm peach and amber tones, soft diffused light, romantic atmosphere, skin-luminous glow",
    "midnight": "cool blue shadows, warm skin tones, night photography aesthetic, dramatic contrast",
    "natural": "true-to-life colors, natural skin tones, soft natural lighting, clean crisp look",
  };

  const result = await replicateRun(
    "black-forest-labs/flux-1.1-pro",
    {
      prompt: `${stylePrompts[style] || stylePrompts["desire"]}, same composition as reference`,
      image: imageUrl,
      prompt_strength: 0.35,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      aspect_ratio: "9:16",
      output_format: "webp",
      output_quality: 95,
    }
  );
  if (result.status !== "succeeded" || !result.output) {
    throw new Error(`Style model failed: ${result.error}`);
  }
  return Array.isArray(result.output) ? result.output[0] : result.output;
}

// ── Model C: Enhance (Real-ESRGAN + GFPGAN) ───────────────────────────────────
async function applyEnhancement(imageUrl: string, enhanceType: "face" | "texture" | "full"): Promise<string> {
  const modelMap = {
    face: "tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3",
    texture: "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
    full: "tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3",
  };

  const result = await replicateRun(
    modelMap[enhanceType],
    {
      img: imageUrl,
      version: "v1.4",
      scale: 2,
    }
  );
  if (result.status !== "succeeded" || !result.output) {
    throw new Error(`Enhance model failed: ${result.error}`);
  }
  return Array.isArray(result.output) ? result.output[0] : result.output;
}

type VaultXReleaseMode = "premium_teaser" | "ppv_drop" | "vip_funnel" | "clone_motion" | "motion_flyer";

type VaultXDistributionTarget = "vaultx" | "telegram" | "fansly" | "onlyfans" | "tiktok" | "instagram" | "x" | "archive";

function buildVaultXDirectorBrief(input: {
  releaseMode?: VaultXReleaseMode;
  brandLane?: string;
  revenueIntent?: string;
  distributionTargets?: VaultXDistributionTarget[];
  style?: string;
  outputType?: "video" | "image";
  motionPrompt?: string;
}) {
  const mode = input.releaseMode || "premium_teaser";
  const targets = input.distributionTargets?.length ? input.distributionTargets : ["vaultx", "telegram", "archive"];
  const lane = input.brandLane?.trim() || "premium adult-safe creator launch";
  const revenueIntent = input.revenueIntent?.trim() || "turn curiosity into a paid unlock without exposing explicit content publicly";
  const preset: Record<VaultXReleaseMode, { headline: string; motion: string; derivatives: string[]; safety: string }> = {
    premium_teaser: {
      headline: "Premium teaser that creates anticipation before the paid unlock",
      motion: "slow cinematic push-in, controlled breathing motion, luxury shadows, crisp subject preservation, seductive but public-safe teaser energy",
      derivatives: ["9:16 teaser reel", "story-safe cut", "cover frame", "caption hook", "VIP DM opener"],
      safety: "public-safe; imply value and atmosphere without nudity or explicit claims",
    },
    ppv_drop: {
      headline: "Paid drop package with clear conversion path",
      motion: "premium product reveal pacing, soft flashes, confident editorial framing, strong final lockup for PPV cover and unlock CTA",
      derivatives: ["PPV cover", "unlock teaser", "sales caption", "Telegram preview", "archive metadata"],
      safety: "separate public teaser language from paid-content metadata",
    },
    vip_funnel: {
      headline: "VIP funnel asset that moves fans into a private lane",
      motion: "invitation-only lounge atmosphere, warm highlights, close-up detail movement, exclusive-room tension, clear CTA beat",
      derivatives: ["VIP invite reel", "Telegram card", "story sequence", "DM script", "retargeting hook"],
      safety: "premium, discreet, and adult-safe; no platform-risk wording",
    },
    clone_motion: {
      headline: "Clone motion asset with identity consistency and brand control",
      motion: "subtle head and camera movement, stable face identity, luxury lighting, confident creator-brand energy, no uncanny motion",
      derivatives: ["clone teaser", "avatar intro", "short loop", "profile hero", "caption pack"],
      safety: "keep likeness stable and avoid explicit generated-content claims in public copy",
    },
    motion_flyer: {
      headline: "Motion flyer that sells the drop before the viewer scrolls",
      motion: "kinetic typography, glossy light sweeps, vertical trailer rhythm, premium event-poster depth, strong CTA lockup",
      derivatives: ["animated flyer", "static cover", "story export", "square promo", "caption pack"],
      safety: "commercial and polished; suggestive allowed, explicit avoided",
    },
  };
  const selected = preset[mode];
  const motionPrompt = input.motionPrompt?.trim() || `VaultX ${selected.headline}. ${selected.motion}. Brand lane: ${lane}. Revenue goal: ${revenueIntent}. Target destinations: ${targets.join(", ")}. ${selected.safety}. Output must feel premium, alive, vertical-first, and ready for paid creator monetization.`;

  return {
    mode,
    brandLane: lane,
    revenueIntent,
    distributionTargets: targets,
    headline: selected.headline,
    motionPrompt,
    safetyRule: selected.safety,
    derivatives: selected.derivatives,
    providerPlan: [
      { step: "enhance", provider: "Replicate", model: "GFPGAN / Real-ESRGAN", reason: "stabilize face, texture, and perceived production value before stylizing" },
      { step: "style", provider: "Replicate", model: "Flux 1.1 Pro", reason: `apply ${input.style || "desire"} grade while preserving composition` },
      { step: "motion", provider: "Replicate Minimax or Pollo handoff", model: "image-to-video", reason: "turn the finished visual into a premium vertical motion asset" },
      { step: "package", provider: "CreatorVault Media OS", model: "release metadata", reason: "return teaser, paid, social, and archive instructions together" },
    ],
  };
}

// ── Router ────────────────────────────────────────────────────────────────────
export const automatedDirectorRouter = router({

  // Check Replicate credits before running anything
  checkCredits: protectedProcedure
    .query(async () => {
      if (!REPLICATE_TOKEN) {
        return { hasCredits: false, error: "REPLICATE_API_TOKEN not configured", balance: null };
      }
      try {
        const res = await fetch("https://api.replicate.com/v1/account", {
          headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
        });
        if (!res.ok) {
          return { hasCredits: false, error: `Auth failed: ${res.status}`, balance: null };
        }
        const account = await res.json();
        return {
          hasCredits: true,
          username: account.username,
          balance: account.hardware_cache?.credits_remaining ?? "unknown",
          status: "active",
        };
      } catch (e: any) {
        return { hasCredits: false, error: e.message, balance: null };
      }
    }),

  // Model A: Apply cinematic motion to a still image
  applyMotion: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      motionPrompt: z.string().optional(),
      creatorId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const videoUrl = await applyMotionEffects(
        input.imageUrl,
        input.motionPrompt || "Cinematic slow motion, professional film quality, body-positive aesthetic"
      );
      return {
        outputUrl: videoUrl,
        model: "minimax/video-01",
        type: "motion",
        inputUrl: input.imageUrl,
        timestamp: new Date().toISOString(),
      };
    }),

  // Model B: Apply Desire-Grade color/LUT
  applyStyle: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      style: z.enum(["desire", "velvet", "sunrise", "midnight", "natural"]).default("desire"),
      creatorId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const styledUrl = await applyDesireGrade(input.imageUrl, input.style);
      return {
        outputUrl: styledUrl,
        model: "flux-1.1-pro",
        type: "style",
        style: input.style,
        inputUrl: input.imageUrl,
        timestamp: new Date().toISOString(),
      };
    }),

  // Model C: Enhance facial and texture quality
  applyEnhance: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      enhanceType: z.enum(["face", "texture", "full"]).default("full"),
      creatorId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const enhancedUrl = await applyEnhancement(input.imageUrl, input.enhanceType);
      return {
        outputUrl: enhancedUrl,
        model: input.enhanceType === "face" ? "gfpgan-v1.4" : "real-esrgan",
        type: "enhance",
        enhanceType: input.enhanceType,
        inputUrl: input.imageUrl,
        timestamp: new Date().toISOString(),
      };
    }),

  // Full Automated Director Pipeline: enhance → style → motion → output
  runFullPipeline: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      creatorId: z.string(),
      style: z.enum(["desire", "velvet", "sunrise", "midnight", "natural"]).default("desire"),
      enhanceType: z.enum(["face", "texture", "full"]).default("full"),
      motionPrompt: z.string().optional(),
      outputType: z.enum(["video", "image"]).default("video"),
      releaseMode: z.enum(["premium_teaser", "ppv_drop", "vip_funnel", "clone_motion", "motion_flyer"]).default("premium_teaser"),
      brandLane: z.string().max(240).optional(),
      revenueIntent: z.string().max(320).optional(),
      distributionTargets: z.array(z.enum(["vaultx", "telegram", "fansly", "onlyfans", "tiktok", "instagram", "x", "archive"])).default(["vaultx", "telegram", "archive"]),
    }))
    .mutation(async ({ input }) => {
      const directorBrief = buildVaultXDirectorBrief(input);
      const pipeline: Array<{ step: string; status: string; outputUrl?: string }> = [];
      let currentUrl = input.imageUrl;

      // Step 1: Enhance
      pipeline.push({ step: "enhance", status: "running" });
      const enhanced = await applyEnhancement(currentUrl, input.enhanceType);
      currentUrl = enhanced;
      pipeline[0] = { step: "enhance", status: "complete", outputUrl: enhanced };

      // Step 2: Style Grade
      pipeline.push({ step: "style", status: "running" });
      const styled = await applyDesireGrade(currentUrl, input.style);
      currentUrl = styled;
      pipeline[1] = { step: "style", status: "complete", outputUrl: styled };

      // Step 3: Motion (only if video output requested)
      let finalUrl = currentUrl;
      if (input.outputType === "video") {
        pipeline.push({ step: "motion", status: "running" });
        const video = await applyMotionEffects(
          currentUrl,
          directorBrief.motionPrompt
        );
        finalUrl = video;
        pipeline[2] = { step: "motion", status: "complete", outputUrl: video };
      }

      return {
        finalUrl,
        pipeline,
        creatorId: input.creatorId,
        inputUrl: input.imageUrl,
        outputType: input.outputType,
        directorBrief,
        releasePackage: {
          primaryOutput: finalUrl,
          mode: directorBrief.mode,
          headline: directorBrief.headline,
          derivatives: directorBrief.derivatives.map((name, index) => ({
            name,
            status: index === 0 ? "ready_from_primary" : "planned",
            target: directorBrief.distributionTargets[index % directorBrief.distributionTargets.length],
          })),
          safetyRule: directorBrief.safetyRule,
        },
        timestamp: new Date().toISOString(),
      };
    }),

  // VaultX release planner: returns the exact provider/package plan without spending credits.
  createVaultXReleasePlan: protectedProcedure
    .input(z.object({
      releaseMode: z.enum(["premium_teaser", "ppv_drop", "vip_funnel", "clone_motion", "motion_flyer"]).default("premium_teaser"),
      brandLane: z.string().max(240).optional(),
      revenueIntent: z.string().max(320).optional(),
      style: z.enum(["desire", "velvet", "sunrise", "midnight", "natural"]).default("desire"),
      outputType: z.enum(["video", "image"]).default("video"),
      distributionTargets: z.array(z.enum(["vaultx", "telegram", "fansly", "onlyfans", "tiktok", "instagram", "x", "archive"])).default(["vaultx", "telegram", "archive"]),
    }))
    .mutation(async ({ input }) => {
      const directorBrief = buildVaultXDirectorBrief(input);
      return {
        success: true,
        directorBrief,
        releasePackage: {
          mode: directorBrief.mode,
          headline: directorBrief.headline,
          plannedOutputs: directorBrief.derivatives,
          providerPlan: directorBrief.providerPlan,
          safetyRule: directorBrief.safetyRule,
        },
        timestamp: new Date().toISOString(),
      };
    }),

  // Batch process all creator content through the pipeline
  batchProcessCreatorContent: protectedProcedure
    .input(z.object({
      creatorId: z.string(),
      limit: z.number().default(5),
      style: z.enum(["desire", "velvet", "sunrise", "midnight", "natural"]).default("desire"),
    }))
    .mutation(async ({ input }) => {
      const pool = (db as any).$client || (db as any).client;
      let content: any[] = [];
      try {
        if (pool && typeof pool.promise === "function") {
          const [rows] = await pool.promise().query(
            "SELECT id, media_url as mediaUrl FROM vaultx_content WHERE creator_id = ? ORDER BY created_at DESC LIMIT ?",
            [input.creatorId, input.limit]
          );
          content = rows as any[];
        } else {
          const result = await (db as any).execute(
            sql`SELECT id, media_url as mediaUrl FROM vaultx_content WHERE creator_id = ${input.creatorId} ORDER BY created_at DESC LIMIT ${input.limit}`
          );
          content = (result as any).rows || [];
        }
      } catch (e) {
        console.warn("vaultx_content query failed:", e);
      }

      const results = [];
      for (const item of content) {
        if (!item.mediaUrl) continue;
        try {
          const enhanced = await applyEnhancement(item.mediaUrl, "full");
          const styled = await applyDesireGrade(enhanced, input.style);
          results.push({
            contentId: item.id,
            originalUrl: item.mediaUrl,
            processedUrl: styled,
            status: "complete",
          });
        } catch (e: any) {
          results.push({
            contentId: item.id,
            originalUrl: item.mediaUrl,
            processedUrl: null,
            status: "error",
            error: e.message,
          });
        }
      }

      return {
        processed: results.filter(r => r.status === "complete").length,
        errors: results.filter(r => r.status === "error").length,
        results,
        creatorId: input.creatorId,
        timestamp: new Date().toISOString(),
      };
    }),
});
