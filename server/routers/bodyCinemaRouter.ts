/**
 * Body Cinema tRPC Router — connects the multi-model provider router to the app
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { BodyCinemaRouter, createDefaultProviderProfiles } from "../services/bodyCinemaProviderRouter";
import { complianceVault } from "../services/complianceVault";
import { randomUUID } from "crypto";
import {
  BODY_CINEMA_PRESETS,
  PRESET_CATEGORIES,
  PRESET_STATS,
  getPresetById,
  getPresetsByCategory,
  getPresetsByGoal,
  getPresetsByPlatform,
  getPresetsByHeatLevel,
  type PresetCategory,
  type PresetGoal,
} from "../services/bodyCinemaPresets";
import {
  approveBodyCinemaDirection,
  assertBodyCinemaEvidenceReady,
  buildEvidenceBackedDirectionPrompt,
  getBodyCinemaSourceEvidence,
  persistBodyCinemaSourceEvidence,
} from "../services/bodyCinemaEvidenceService";
import { reviewBodyCinemaOutput } from "../services/bodyCinemaOutputReviewService";

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

const landmarkInput = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite().optional(),
  visibility: z.number().min(0).max(1).optional(),
});

const frameEvidenceInput = z.object({
  timestampMs: z.number().int().min(0),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sceneId: z.number().int().min(0).optional(),
  frameFingerprint: z.string().regex(/^[0-9a-f]{16,256}$/i).optional(),
  brightness: z.number().min(0).max(1).optional(),
  contrast: z.number().min(0).max(1).optional(),
  sharpness: z.number().min(0).max(1).optional(),
  colorWarmth: z.number().min(0).max(1).optional(),
  subjectCoverage: z.number().min(0).max(1).optional(),
  face: z.object({
    present: z.boolean(),
    centerX: z.number().min(0).max(1).optional(),
    centerY: z.number().min(0).max(1).optional(),
    coverage: z.number().min(0).max(1).optional(),
    expressionSignals: z.record(z.string(), z.number().min(0).max(1)).optional(),
  }).optional(),
  landmarks: z.array(landmarkInput).min(1).max(33),
  worldLandmarks: z.array(landmarkInput).max(33).optional(),
});

function evidencePrecondition(message: string): TRPCError {
  return new TRPCError({ code: "PRECONDITION_FAILED", message });
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

  analyzeSource: protectedProcedure.input(z.object({
    sourceMediaUrl: z.string().url(),
    sourceType: z.enum(["image", "video"]),
    sourceFingerprint: z.string().min(16).max(128),
    analysisVersion: z.string().min(1).max(96),
    frameEvidence: z.array(frameEvidenceInput).min(1).max(24),
  })).mutation(async ({ ctx, input }) => {
    const evidence = await persistBodyCinemaSourceEvidence(Number(ctx.user.id), input);
    return evidence;
  }),

  getSourceEvidence: protectedProcedure.input(z.object({ evidenceId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const evidence = await getBodyCinemaSourceEvidence(Number(ctx.user.id), input.evidenceId);
    if (!evidence) throw new TRPCError({ code: "NOT_FOUND", message: "Body Cinema source evidence was not found." });
    return evidence;
  }),

  approveDirection: protectedProcedure.input(z.object({
    evidenceId: z.string().uuid(),
    directionId: z.enum(["portrait-command", "silhouette-control", "motion-tension"]),
  })).mutation(async ({ ctx, input }) => {
    try {
      return await approveBodyCinemaDirection(Number(ctx.user.id), input.evidenceId, input.directionId);
    } catch (error: any) {
      throw evidencePrecondition(error?.message || "Body Cinema direction approval failed.");
    }
  }),

  reviewOutput: protectedProcedure.input(z.object({
    evidenceId: z.string().uuid(),
    outputAssetUrl: z.string().url(),
    outputFingerprint: z.string().regex(/^[0-9a-f]{64}$/i),
    frameEvidence: z.array(frameEvidenceInput).min(1).max(24),
  })).mutation(async ({ ctx, input }) => {
    try {
      return await reviewBodyCinemaOutput(Number(ctx.user.id), input);
    } catch (error: any) {
      throw evidencePrecondition(error?.message || "Body Cinema output review failed.");
    }
  }),

  submitJob: protectedProcedure.input(z.object({
    sourceAssetUrl: z.string().url(),
    sourceType: z.enum(["image", "video"]),
    evidenceId: z.string().uuid(),
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
    let evidenceContext: { direction: { camera: string; movement: string; composition: string; bodyFocus: string[] } };
    try {
      evidenceContext = await assertBodyCinemaEvidenceReady({
        creatorId: Number(ctx.user.id),
        evidenceId: input.evidenceId,
        sourceMediaUrl: input.sourceAssetUrl,
      });
    } catch (error: any) {
      throw evidencePrecondition(error?.message || "Body Cinema source evidence is required before provider submission.");
    }
    const evidencePrompt = buildEvidenceBackedDirectionPrompt(evidenceContext.direction as any);
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
      prompt: [evidencePrompt, input.prompt].filter(Boolean).join(" "),
      motionDirective: [evidenceContext.direction.movement, input.motionDirective].filter(Boolean).join(" "),
      cameraMovement: [evidenceContext.direction.camera, input.cameraMovement].filter(Boolean).join(" "),
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
    evidenceId: z.string().uuid(),
    style: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    let evidenceContext: { evidence: any; direction: any };
    try {
      evidenceContext = await assertBodyCinemaEvidenceReady({ creatorId: Number(ctx.user.id), evidenceId: input.evidenceId, sourceMediaUrl: input.sourceAssetUrl });
    } catch (error: any) {
      throw evidencePrecondition(error?.message || "Verified source evidence and an approved treatment are required before planning a Body Cinema package.");
    }
    return {
      status: "planning_only" as const,
      message: "CreatorVault prepared a review-only treatment package. No provider job, paid request, checkout, campaign, or publication was created.",
      evidenceId: evidenceContext.evidence.id,
      treatment: evidenceContext.direction,
      package: {
        publicPreview: evidenceContext.direction.timeline.filter((beat: any) => ["hook", "build", "restraint"].includes(beat.id)),
        paidPayoff: evidenceContext.direction.timeline.filter((beat: any) => ["payoff", "loop"].includes(beat.id)),
        creatorDecisionRequired: true,
      },
    };
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
      // Preset metadata is not creator-specific performance evidence. Until outcome
      // records exist, templates remain an unranked library.
      void input.topConverting;
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
      stats: { ...PRESET_STATS, performanceStatus: "unmeasured" as const },
      featuredTemplates: BODY_CINEMA_PRESETS.slice(0, 5),
      performanceStatus: "unmeasured" as const,
    };
  }),

  /**
   * applyPreset — select a preset as a review-only treatment template.
   * This endpoint deliberately does not submit a provider job.
   */
  applyPreset: protectedProcedure
    .input(z.object({
      presetId: z.string(),
      sourceAssetUrl: z.string().url(),
      sourceType: z.enum(["image", "video"]),
      evidenceId: z.string().uuid(),
      overrides: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const preset = getPresetById(input.presetId);
      if (!preset) throw new TRPCError({ code: "NOT_FOUND", message: `Preset ${input.presetId} not found` });

      let evidenceContext: { direction: any };
      try {
        evidenceContext = await assertBodyCinemaEvidenceReady({
          creatorId: Number(ctx.user.id),
          evidenceId: input.evidenceId,
          sourceMediaUrl: input.sourceAssetUrl,
        });
      } catch (error: any) {
        throw evidencePrecondition(error?.message || "Body Cinema source evidence and an approved treatment are required before applying a template.");
      }

      return {
        status: "planning_only" as const,
        message: "Template applied to a review-only treatment package. No provider job, paid request, checkout, campaign, or publication was created.",
        preset,
        treatment: evidenceContext.direction,
        promptPreview: [buildEvidenceBackedDirectionPrompt(evidenceContext.direction), input.overrides?.prompt || preset.prompt].filter(Boolean).join(" "),
        suggestedTitle: input.overrides?.title || preset.suggestedTitle,
        startingPriceReference: preset.suggestedPrice,
        startingVipPriceReference: preset.suggestedVipPrice,
        teaserDescription: preset.teaserDescription,
        telegramCaption: preset.telegramCaption,
        dmHook: preset.dmHook,
        ppvUnlockLine: preset.ppvUnlockLine,
      };
    }),
});
