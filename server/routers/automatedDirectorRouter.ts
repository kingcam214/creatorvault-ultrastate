/**
 * VaultX Automated Director — Replicate Multi-Model Pipeline
 * Model A (Motion): Kling 2.1 / Stable Video Diffusion — cinematic motion effects
 * Model B (Style): Flux + ControlNet — Desire-Grade color/LUT application
 * Model C (Enhance): GFPGAN + Real-ESRGAN — facial and texture enhancement
 * 
 * Pipeline: raw_clip → enhance → style_grade → motion_add → schedule_post
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { db } from "../db";
import { eq, desc, sql } from "drizzle-orm";

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

  // Create prediction
  const createRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${REPLICATE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ version: model, input }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    if (err.detail?.includes("billing") || err.detail?.includes("credit") || err.detail?.includes("payment")) {
      throw new Error(`REPLICATE_CREDITS_EMPTY: ${err.detail} — stopping pipeline as instructed`);
    }
    throw new Error(`Replicate create failed: ${JSON.stringify(err)}`);
  }

  const prediction = await createRes.json();
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

// ── Model A: Motion (Kling 2.1 via Replicate) ─────────────────────────────────
async function applyMotionEffects(imageUrl: string, prompt: string): Promise<string> {
  // Kling 2.1 image-to-video
  const result = await replicateRun(
    "klingai/kling-v2-1-standard-image-to-video:latest",
    {
      image: imageUrl,
      prompt: prompt || "Cinematic slow motion, soft bokeh, golden hour lighting, professional film look",
      duration: 5,
      aspect_ratio: "9:16",
      cfg_scale: 0.5,
    }
  );
  if (result.status !== "succeeded" || !result.output) {
    throw new Error(`Motion model failed: ${result.error}`);
  }
  return Array.isArray(result.output) ? result.output[0] : result.output;
}

// ── Model B: Style/Color Grade (Flux + SDXL ControlNet) ──────────────────────
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
        model: "kling-v2.1",
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
    }))
    .mutation(async ({ input }) => {
      const pipeline = [];
      let currentUrl = input.imageUrl;

      // Step 1: Enhance
      pipeline.push({ step: "enhance", status: "running" });
      const enhanced = await applyEnhancement(currentUrl, input.enhanceType);
      currentUrl = enhanced;
      pipeline[0].status = "complete";

      // Step 2: Style Grade
      pipeline.push({ step: "style", status: "running" });
      const styled = await applyDesireGrade(currentUrl, input.style);
      currentUrl = styled;
      pipeline[1].status = "complete";

      // Step 3: Motion (only if video output requested)
      let finalUrl = currentUrl;
      if (input.outputType === "video") {
        pipeline.push({ step: "motion", status: "running" });
        const video = await applyMotionEffects(
          currentUrl,
          input.motionPrompt || "Cinematic slow motion, professional quality"
        );
        finalUrl = video;
        pipeline[2].status = "complete";
      }

      return {
        finalUrl,
        pipeline,
        creatorId: input.creatorId,
        inputUrl: input.imageUrl,
        outputType: input.outputType,
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
      // Pull creator's best performing raw content via raw query
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
