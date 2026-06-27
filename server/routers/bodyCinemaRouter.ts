/**
 * Body Cinema tRPC Router — connects the multi-model provider router to the app
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { BodyCinemaRouter, createDefaultProviderProfiles, generateOutputLadder } from "../services/bodyCinemaProviderRouter";
import { complianceVault } from "../services/complianceVault";
import { randomUUID } from "crypto";
import {
  BODY_CINEMA_PRESETS,
  PRESET_CATEGORIES,
  PRESET_STATS,
  getPresetById,
  getPresetsByCategory,
  getPresetsByGoal,
  getTopConvertingPresets,
  getPresetsByPlatform,
  getPresetsByHeatLevel,
  type PresetCategory,
  type PresetGoal,
} from "../services/bodyCinemaPresets";

const cinemaRouter = new BodyCinemaRouter();
const configuredProviders: Record<string, boolean> = {
  pollo: !!process.env.POLLO_API_KEY,
  runway: !!process.env.RUNWAY_API_KEY,
  replicate: !!process.env.REPLICATE_API_TOKEN,
  luma: !!process.env.LUMA_API_KEY,
  minimax: !!process.env.MINIMAX_API_KEY,
};
for (const profile of createDefaultProviderProfiles(configuredProviders)) {
  cinemaRouter.registerProvider(profile);
}

export const bodyCinemaRouter = router({
  getProviders: protectedProcedure.query(() => {
    return cinemaRouter.getProviders().map(p => ({
      name: p.name,
      label: p.label,
      tier: p.tier,
      configured: p.capabilities.apiConfigured,
      healthy: p.capabilities.apiHealthy,
      maxDuration: p.capabilities.maxDurationSeconds,
      costPerSecond: p.capabilities.costPerSecondCents,
      models: p.models.map(m => ({ id: m.id, name: m.name, specialization: m.specialization, quality: m.qualityScore })),
    }));
  }),

  submitJob: protectedProcedure.input(z.object({
    sourceAssetUrl: z.string().url(),
    sourceType: z.enum(["image", "video"]),
    goal: z.string(),
    style: z.string(),
    platform: z.string(),
    aspectRatio: z.string().default("9:16"),
    duration: z.number().min(1).max(30).default(5),
    prompt: z.string().optional(),
    motionDirective: z.string().optional(),
    cameraMovement: z.string().optional(),
    identityLock: z.boolean().default(true),
    preferredProvider: z.string().optional(),
    qualityThreshold: z.number().min(0).max(100).default(70),
  })).mutation(async ({ ctx, input }) => {
    const eligibility = complianceVault.checkGenerationEligibility(String(ctx.user.id), "GLOBAL");
    if (!eligibility.eligible) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Compliance check failed: " + eligibility.blockers.join("; ") });
    }
    const job = {
      id: randomUUID(),
      userId: String(ctx.user.id),
      goal: input.goal as any,
      sourceAssetUrl: input.sourceAssetUrl,
      sourceType: input.sourceType as any,
      style: input.style as any,
      platform: input.platform as any,
      aspectRatio: input.aspectRatio,
      duration: input.duration,
      prompt: input.prompt,
      motionDirective: input.motionDirective,
      cameraMovement: input.cameraMovement,
      identityLock: input.identityLock,
      preferredProvider: input.preferredProvider as any,
      qualityThreshold: input.qualityThreshold,
      maxRetries: 2,
      consentVerified: true,
      ageVerified: true,
    };
    return cinemaRouter.submitJob(job);
  }),

  generateOutputLadder: protectedProcedure.input(z.object({
    sourceAssetUrl: z.string().url(),
    sourceType: z.enum(["image", "video"]),
    style: z.string(),
  })).mutation(({ ctx, input }) => {
    const jobs = generateOutputLadder(String(ctx.user.id), input.sourceAssetUrl, input.sourceType, input.style as any);
    return { jobCount: jobs.length, jobs: jobs.slice(0, 5) };
  }),

  getJobStatus: protectedProcedure.input(z.object({ jobId: z.string() })).query(({ input }) => {
    return cinemaRouter.getJobStatus(input.jobId) || { status: "not_found" };
  }),

  // ── PRESET LIBRARY ──────────────────────────────────────────────────────────

  /**
   * getPresets — full preset library with optional filters
   */
  getPresets: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      goal: z.string().optional(),
      platform: z.string().optional(),
      minHeatLevel: z.number().min(1).max(5).optional(),
      maxHeatLevel: z.number().min(1).max(5).optional(),
      topConverting: z.boolean().optional(),
      limit: z.number().min(1).max(100).optional(),
    }).default({}))
    .query(({ input }) => {
      let presets = [...BODY_CINEMA_PRESETS];

      if (input.category) {
        presets = presets.filter(p => p.category === input.category);
      }
      if (input.goal) {
        presets = presets.filter(p => p.goal === input.goal);
      }
      if (input.platform) {
        presets = presets.filter(p => p.platform === input.platform);
      }
      if (input.minHeatLevel) {
        presets = presets.filter(p => p.heatLevel >= input.minHeatLevel!);
      }
      if (input.maxHeatLevel) {
        presets = presets.filter(p => p.heatLevel <= input.maxHeatLevel!);
      }
      if (input.topConverting) {
        presets = presets.sort((a, b) => b.conversionScore - a.conversionScore);
      }
      if (input.limit) {
        presets = presets.slice(0, input.limit);
      }

      return {
        presets,
        total: presets.length,
        categories: PRESET_CATEGORIES,
        stats: PRESET_STATS,
      };
    }),

  /**
   * getPreset — single preset by ID
   */
  getPreset: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const preset = getPresetById(input.id);
      if (!preset) throw new TRPCError({ code: "NOT_FOUND", message: `Preset ${input.id} not found` });
      return preset;
    }),

  /**
   * getPresetCategories — all categories with metadata
   */
  getPresetCategories: protectedProcedure.query(() => {
    return {
      categories: PRESET_CATEGORIES,
      stats: PRESET_STATS,
      topConverting: getTopConvertingPresets(5),
    };
  }),

  /**
   * applyPreset — apply a preset to a job submission, filling all fields
   */
  applyPreset: protectedProcedure
    .input(z.object({
      presetId: z.string(),
      sourceAssetUrl: z.string().url(),
      sourceType: z.enum(["image", "video"]),
      overrides: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const preset = getPresetById(input.presetId);
      if (!preset) throw new TRPCError({ code: "NOT_FOUND", message: `Preset ${input.presetId} not found` });

      const eligibility = complianceVault.checkGenerationEligibility(String(ctx.user.id), "GLOBAL");
      if (!eligibility.eligible) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Compliance check failed: " + eligibility.blockers.join("; ") });
      }

      const job = {
        id: randomUUID(),
        userId: String(ctx.user.id),
        goal: preset.goal as any,
        sourceAssetUrl: input.sourceAssetUrl,
        sourceType: input.sourceType as any,
        style: preset.style as any,
        platform: preset.platform as any,
        aspectRatio: preset.aspectRatio,
        duration: preset.duration,
        prompt: input.overrides?.prompt || preset.prompt,
        negativePrompt: preset.negativePrompt,
        motionDirective: input.overrides?.motionDirective || preset.motionDirective,
        cameraMovement: input.overrides?.cameraMovement || preset.cameraMovement,
        identityLock: true,
        qualityThreshold: 75,
        maxRetries: 2,
        consentVerified: true,
        ageVerified: true,
        ...(input.overrides || {}),
      };

      const result = await cinemaRouter.submitJob(job);

      return {
        ...result,
        preset,
        suggestedTitle: input.overrides?.title || preset.suggestedTitle,
        suggestedPrice: preset.suggestedPrice,
        suggestedVipPrice: preset.suggestedVipPrice,
        teaserDescription: preset.teaserDescription,
        telegramCaption: preset.telegramCaption,
        dmHook: preset.dmHook,
        ppvUnlockLine: preset.ppvUnlockLine,
      };
    }),
});
