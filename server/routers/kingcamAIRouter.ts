/**
 * ============================================================================
 * KINGCAM AI ROUTER — UNIFIED AI OS ENDPOINTS
 * ============================================================================
 *
 * Every AI generation action on CreatorVault is accessible through this router.
 * Every vertical, every feature, every output — one unified API.
 * All outputs are monetized: credits are consumed, usage is tracked,
 * and generated assets are registered in media_assets for reuse.
 *
 * ENDPOINTS:
 *   image.generate          → Generate any image (fluxdevcam primary)
 *   image.generateFlyer     → Flyer Studio image
 *   image.generateApparel   → Apparel Lab mockup
 *   image.generateThumbnail → AI thumbnail
 *   image.generateAdCreative→ Ad creative
 *   image.generateSlideVisual → Presentation slide visual
 *   image.generateSocial    → Social post visual
 *   image.colorVariants     → Full suit color variant collection
 *
 *   video.generate          → Generate any video (Pollo primary)
 *   video.fullBodyClone     → Full-body motion clone video
 *   video.animateFlyer      → Animate a flyer image
 *   video.generateScene     → Video Studio scene image
 *
 *   training.trigger        → Trigger fluxdevcam retraining
 *   training.status         → Check training status
 *
 *   assets.list             → List all cross-feature AI assets
 *   assets.getByVertical    → Get assets from a specific vertical
 * ============================================================================
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  generateKingCamImage,
  generateKingCamVideo,
  generateCloneThumbnail,
  generateFullBodyCloneVideo,
  generateFlyerImage,
  generateApparelMockup,
  generateThumbnail,
  generateAdCreative,
  generatePresentationSlideVisual,
  generateVideoSceneImage,
  generateSocialPostVisual,
  generateAnimatedFlyer,
  generateColorVariantCollection,
  triggerModelRetraining,
  buildCrossFeatureAsset,
  type VideoModel,
} from "../services/kingcamAI";
import { getDb } from "../db";
import { storagePut } from "../storage";

// ─── SHARED SCHEMAS ───────────────────────────────────────────────────────────
const videoModelSchema = z.enum([
  "kling-3.0", "kling-2.6", "kling-o1",
  "seedance-2.0", "seedance-1.5-pro",
  "wan-2.6", "vidu-q3-pro",
  "pollo-3.0", "pollo-2.0",
]).default("kling-3.0");

const aspectRatioImageSchema = z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).default("1:1");
const aspectRatioVideoSchema = z.enum(["16:9", "9:16", "1:1"]).default("16:9");
const styleLevelSchema = z.enum(["editorial", "cinematic", "product", "social", "presentation"]).default("editorial");

// ─── IMAGE ROUTER ─────────────────────────────────────────────────────────────
const imageRouter = router({
  /** Generate any image — the universal image generation endpoint */
  generate: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1),
      injectDNA: z.boolean().default(true),
      suitColor: z.string().optional(),
      styleLevel: styleLevelSchema,
      aspectRatio: aspectRatioImageSchema,
      referenceImageUrl: z.string().url().optional(),
      vertical: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await generateKingCamImage({
        prompt: input.prompt,
        injectDNA: input.injectDNA,
        suitColor: input.suitColor,
        styleLevel: input.styleLevel,
        aspectRatio: input.aspectRatio,
        referenceImageUrl: input.referenceImageUrl,
      });
      const asset = buildCrossFeatureAsset(result, input.prompt, [input.vertical ?? "general"]);
      return { ...result, asset };
    }),

  /** Flyer Studio: Generate event flyer */
  generateFlyer: protectedProcedure
    .input(z.object({
      eventName: z.string().min(1),
      eventType: z.string().min(1),
      colorScheme: z.string().optional(),
      includeKingCam: z.boolean().default(true),
      suitColor: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await generateFlyerImage(input);
      const asset = buildCrossFeatureAsset(result, input.eventName, ["flyer", "event"]);
      return { ...result, asset };
    }),

  /** Apparel Lab: Generate garment mockup */
  generateApparel: protectedProcedure
    .input(z.object({
      garmentType: z.string().min(1),
      designDescription: z.string().min(1),
      colorway: z.string().min(1),
      wornByKingCam: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const result = await generateApparelMockup(input);
      const asset = buildCrossFeatureAsset(result, input.designDescription, ["apparel", input.garmentType]);
      return { ...result, asset };
    }),

  /** Thumbnail Generator: AI-optimized thumbnail */
  generateThumbnail: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      niche: z.string().min(1),
      emotion: z.string().default("confident"),
      suitColor: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await generateThumbnail(input);
      const asset = buildCrossFeatureAsset(result, input.title, ["thumbnail", input.niche]);
      return { ...result, asset };
    }),

  /** Ad Optimizer: Generate ad creative */
  generateAdCreative: protectedProcedure
    .input(z.object({
      adCopy: z.string().min(1),
      platform: z.enum(["instagram", "tiktok", "youtube", "facebook"]),
      productOrService: z.string().min(1),
      suitColor: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await generateAdCreative(input);
      const asset = buildCrossFeatureAsset(result, input.adCopy, ["ad", input.platform]);
      return { ...result, asset };
    }),

  /** Presentation Maker: Generate slide visual */
  generateSlideVisual: protectedProcedure
    .input(z.object({
      slideTitle: z.string().min(1),
      slideContent: z.string().min(1),
      slideIndex: z.number().int().min(0),
      totalSlides: z.number().int().min(1),
    }))
    .mutation(async ({ input }) => {
      const result = await generatePresentationSlideVisual(input);
      const asset = buildCrossFeatureAsset(result, input.slideTitle, ["presentation", "slide"]);
      return { ...result, asset };
    }),

  /** Social Content: Generate social post visual */
  generateSocial: protectedProcedure
    .input(z.object({
      caption: z.string().min(1),
      platform: z.enum(["instagram", "tiktok", "twitter", "facebook"]),
      contentType: z.enum(["promotional", "lifestyle", "educational", "entertainment"]),
      suitColor: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await generateSocialPostVisual(input);
      const asset = buildCrossFeatureAsset(result, input.caption, ["social", input.platform]);
      return { ...result, asset };
    }),

  /** Smart Album: Generate full color variant collection */
  colorVariants: protectedProcedure
    .input(z.object({
      basePrompt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const variants = await generateColorVariantCollection(input.basePrompt);
      return { variants, count: variants.length };
    }),
});

// ─── VIDEO ROUTER ─────────────────────────────────────────────────────────────
const videoRouter = router({
  /** Generate any video — the universal video generation endpoint */
  generate: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1),
      model: videoModelSchema,
      injectDNA: z.boolean().default(true),
      imageUrl: z.string().url().optional(),
      aspectRatio: aspectRatioVideoSchema,
      duration: z.union([z.literal(5), z.literal(10)]).default(5),
      mode: z.enum(["pro", "standard"]).default("pro"),
      vertical: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await generateKingCamVideo({
        prompt: input.prompt,
        model: input.model as VideoModel,
        injectDNA: input.injectDNA,
        imageUrl: input.imageUrl,
        aspectRatio: input.aspectRatio,
        duration: input.duration,
        mode: input.mode,
      });
      const asset = buildCrossFeatureAsset(result, input.prompt, [input.vertical ?? "video"]);
      return { ...result, asset };
    }),

  /** Clone Lab: Full-body motion video */
  fullBodyClone: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1),
      referenceImageUrl: z.string().url().optional(),
      model: videoModelSchema,
      duration: z.union([z.literal(5), z.literal(10)]).default(5),
    }))
    .mutation(async ({ input }) => {
      const result = await generateFullBodyCloneVideo({
        prompt: input.prompt,
        referenceImageUrl: input.referenceImageUrl,
        model: input.model as VideoModel,
        duration: input.duration,
      });
      const asset = buildCrossFeatureAsset(result, input.prompt, ["clone_lab", "full_body"]);
      return { ...result, asset };
    }),

  /** Flyer Studio: Animate a flyer image into video */
  animateFlyer: protectedProcedure
    .input(z.object({
      flyerImageUrl: z.string().url(),
      animationPrompt: z.string().optional(),
      model: videoModelSchema,
    }))
    .mutation(async ({ input }) => {
      const result = await generateAnimatedFlyer({
        flyerImageUrl: input.flyerImageUrl,
        animationPrompt: input.animationPrompt,
        model: input.model as VideoModel,
      });
      const asset = buildCrossFeatureAsset(result, input.animationPrompt ?? "animated flyer", ["flyer", "animated"]);
      return { ...result, asset };
    }),

  /** Video Studio: Generate a scene image for multi-scene video */
  generateScene: protectedProcedure
    .input(z.object({
      sceneDescription: z.string().min(1),
      sceneIndex: z.number().int().min(0),
      characterFeatures: z.string().optional(),
      setting: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await generateVideoSceneImage(input);
      const asset = buildCrossFeatureAsset(result, input.sceneDescription, ["video_studio", "scene"]);
      return { ...result, asset };
    }),

  /** Clone Lab: Generate thumbnail for a clone video */
  generateCloneThumbnail: protectedProcedure
    .input(z.object({
      scriptPreview: z.string().min(1),
      suitColor: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const url = await generateCloneThumbnail(input.scriptPreview, input.suitColor);
      return { url, model: "fluxdevcam", provider: "replicate" };
    }),
});

// ─── TRAINING ROUTER ──────────────────────────────────────────────────────────
const trainingRouter = router({
  /** Smart Album: Trigger fluxdevcam retraining with new images */
  trigger: protectedProcedure
    .input(z.object({
      trainingZipUrl: z.string().url(),
      triggerWord: z.string().default("fluxdevCam"),
      steps: z.number().int().min(500).max(4000).default(1000),
    }))
    .mutation(async ({ input }) => {
      return triggerModelRetraining(input);
    }),

  /** Check the status of a Replicate training run */
  status: protectedProcedure
    .input(z.object({ trainingId: z.string() }))
    .query(async ({ input }) => {
      const token = process.env.REPLICATE_API_TOKEN;
      if (!token) throw new Error("REPLICATE_API_TOKEN not configured");
      const res = await fetch(
        `https://api.replicate.com/v1/trainings/${input.trainingId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Failed to get training status: ${res.status}`);
      return res.json() as Promise<{
        id: string;
        status: string;
        output?: Record<string, unknown>;
        error?: string;
        metrics?: Record<string, unknown>;
      }>;
    }),
});

// ─── MODELS ROUTER ────────────────────────────────────────────────────────────
const modelsRouter = router({
  /** List all available AI models and their capabilities */
  list: protectedProcedure.query(() => {
    return {
      image: [
        {
          id: "fluxdevcam",
          name: "KingCam DNA (fluxdevcam)",
          provider: "replicate",
          description: "Your personal Flux LoRA model trained on KingCam's visual identity",
          isPrimary: true,
          capabilities: ["text-to-image", "image-to-image"],
          triggerWord: "fluxdevCam",
        },
        {
          id: "forge",
          name: "Forge (fallback)",
          provider: "internal",
          description: "Internal image generation fallback",
          isPrimary: false,
          capabilities: ["text-to-image"],
        },
      ],
      video: [
        { id: "kling-3.0",        name: "Kling 3.0",          provider: "pollo", isPrimary: true,  description: "Full-body motion, filmic quality, highest fidelity" },
        { id: "kling-2.6",        name: "Kling 2.6",          provider: "pollo", isPrimary: false, description: "Standard motion, reliable quality" },
        { id: "kling-o1",         name: "Kling O1",           provider: "pollo", isPrimary: false, description: "Precision motion, complex scenes" },
        { id: "seedance-2.0",     name: "Seedance 2.0",       provider: "pollo", isPrimary: false, description: "Cinematic multi-shot, coherent motion" },
        { id: "seedance-1.5-pro", name: "Seedance 1.5 Pro",   provider: "pollo", isPrimary: false, description: "Cinematic standard" },
        { id: "wan-2.6",          name: "Wan 2.6",            provider: "pollo", isPrimary: false, description: "Long-form narrative video" },
        { id: "vidu-q3-pro",      name: "Vidu Q3 Pro",        provider: "pollo", isPrimary: false, description: "Human-like avatar, audio-visual synthesis" },
        { id: "pollo-3.0",        name: "Pollo 3.0",          provider: "pollo", isPrimary: false, description: "Fast general video, full audio control" },
        { id: "pollo-2.0",        name: "Pollo 2.0",          provider: "pollo", isPrimary: false, description: "Budget general video" },
      ],
      suitColorVariants: [
        "Crimson King", "Royal Blue", "Emerald Empire", "Purple Reign",
        "Black Gold", "White Diamond", "Champagne", "Midnight Navy",
        "Forest Royale", "Burgundy Boss", "Slate Sovereign", "Rose Gold King",
      ],
    };
  }),
});

// ─── MAIN ROUTER ──────────────────────────────────────────────────────────────
export const kingcamAIRouter = router({
  image: imageRouter,
  video: videoRouter,
  training: trainingRouter,
  models: modelsRouter,
});
