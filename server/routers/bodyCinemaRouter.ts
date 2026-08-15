/**
 * Body Cinema tRPC Router — connects the multi-model provider router to the app
 */
import { z } from "zod";
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { BodyCinemaRouter, createDefaultProviderProfiles } from "../services/bodyCinemaProviderRouter";
import { complianceVault } from "../services/complianceVault";
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
  invalidateBodyCinemaSourceEvidence,
  invalidateBodyCinemaSourceEvidenceForUrl,
  persistBodyCinemaSourceEvidence,
} from "../services/bodyCinemaEvidenceService";
import { getBodyCinemaOutputReview, reviewBodyCinemaOutput } from "../services/bodyCinemaOutputReviewService";
import {
  assertBodyCinemaSourceMapReady,
  getBodyCinemaSourceMap,
  persistBodyCinemaSourceMap,
} from "../services/bodyCinemaSourceMapService";
import { getBodyCinemaSavedSourceInventory } from "../services/bodyCinemaExistingMediaProofService";
import { buildBodyCinemaAssemblyRecipe } from "../services/bodyCinemaAssemblyRecipe";
import { getOrCreateBodyCinemaEditBlueprint } from "../services/bodyCinemaEditBlueprintService";
import { buildAudioDirectedTimeline } from "../services/audioTimelinePlanner";
import { getCanonicalAudioAsset } from "../services/audioIntelligenceService";
import { startRender } from "../services/realRenderEngine";
import { getCreationProject, updateCreationProjectLinks } from "../services/creationProjectService";
import { buildCreationCapabilities, getCreationPlan, prepareCreationPlan, toCreatorFacingCreationPlan } from "../services/creationDirector";

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
  savedSourceInventory: protectedProcedure.query(async ({ ctx }) => {
    if (![6, 33].includes(Number(ctx.user.id))) {
      throw new TRPCError({ code: "FORBIDDEN", message: "This private source inventory is reserved for the owner workspace." });
    }
    return getBodyCinemaSavedSourceInventory();
  }),

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
    const creatorId = Number(ctx.user.id);
    const evidence = await persistBodyCinemaSourceEvidence(creatorId, input);
    const sourceMap = await persistBodyCinemaSourceMap({ creatorId, evidenceId: evidence.id });
    return { ...evidence, sourceMap };
  }),

  getSourceEvidence: protectedProcedure.input(z.object({ evidenceId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const creatorId = Number(ctx.user.id);
    const evidence = await getBodyCinemaSourceEvidence(creatorId, input.evidenceId);
    if (!evidence) throw new TRPCError({ code: "NOT_FOUND", message: "Body Cinema source evidence was not found." });
    return { ...evidence, sourceMap: await getBodyCinemaSourceMap(creatorId, input.evidenceId) };
  }),

  getEditBlueprint: protectedProcedure.input(z.object({
    evidenceId: z.string().uuid(),
    sourceMediaUrl: z.string().url(),
  })).query(async ({ ctx, input }) => {
    try {
      return await getOrCreateBodyCinemaEditBlueprint({
        creatorId: Number(ctx.user.id),
        evidenceId: input.evidenceId,
        sourceMediaUrl: input.sourceMediaUrl,
      });
    } catch (error: any) {
      throw evidencePrecondition(error?.message || "Body Cinema could not prepare this source-backed edit blueprint.");
    }
  }),

  recoverAcceptedSavedSourceToVault: protectedProcedure.input(z.object({ evidenceId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const creatorId = Number(ctx.user.id);
    try {
      const evidence = await getBodyCinemaSourceEvidence(creatorId, input.evidenceId);
      if (!evidence) throw new Error("Body Cinema source evidence was not found.");
      await assertBodyCinemaEvidenceReady({ creatorId, evidenceId: input.evidenceId, sourceMediaUrl: evidence.sourceMediaUrl });
      const sourceMap = await assertBodyCinemaSourceMapReady({
        creatorId,
        evidenceId: input.evidenceId,
        sourceMediaUrl: evidence.sourceMediaUrl,
        route: "source_preserving_assembly",
      });
      const blueprint = await getOrCreateBodyCinemaEditBlueprint({ creatorId, evidenceId: input.evidenceId, sourceMediaUrl: evidence.sourceMediaUrl });
      const db = await getDb();
      if (!db) throw new Error("CreatorVault Media Vault is unavailable.");
      const existingResult = await db.execute(sql`
        SELECT id, status, public_url, source_type, created_by_feature
        FROM media_assets
        WHERE user_id = ${creatorId} AND public_url = ${evidence.sourceMediaUrl}
        LIMIT 1
      ` as any);
      const existingRows: any[] = Array.isArray(existingResult) && Array.isArray((existingResult as any)[0])
        ? (existingResult as any)[0]
        : Array.isArray(existingResult) ? existingResult as any[] : ((existingResult as any)?.rows || []);
      if (existingRows[0]) {
        return { mediaAssetId: String(existingRows[0].id), recovered: false, sourceMapId: sourceMap.id, editBlueprintId: blueprint.id };
      }
      const sourceHead = await fetch(evidence.sourceMediaUrl, { method: "HEAD" });
      if (!sourceHead.ok) throw new Error("CreatorVault could not re-read the verified source file for Media Vault recovery.");
      const fileSize = Number(sourceHead.headers.get("content-length") || 0);
      if (!Number.isFinite(fileSize) || fileSize <= 0) throw new Error("CreatorVault could not confirm the verified source file size for Media Vault recovery.");
      const frame = evidence.frameEvidence[0];
      const durationSeconds = Math.max(1, Math.round(Number(sourceMap.analysis.sourceDurationMs || 0) / 1000));
      const assetId = randomUUID();
      const originalName = evidence.sourceMediaUrl.split("/").pop()?.split("?")[0] || "CreatorVault verified creator source.mp4";
      await db.execute(sql`
        INSERT INTO media_assets
          (id, user_id, source_type, asset_type, file_name, original_name, mime_type, file_size, storage_path, public_url, thumbnail_url, duration, width, height, status, created_by_feature)
        VALUES
          (${assetId}, ${creatorId}, 'creator_upload', 'video', ${originalName}, ${originalName}, 'video/mp4', ${Math.round(fileSize)}, ${evidence.sourceMediaUrl}, ${evidence.sourceMediaUrl}, ${evidence.sourceMediaUrl}, ${durationSeconds}, ${Number(frame?.width || 0)}, ${Number(frame?.height || 0)}, 'ready', 'body_cinema_source_recovery')
      ` as any);
      return {
        mediaAssetId: assetId,
        recovered: true,
        sourceMapId: sourceMap.id,
        editBlueprintId: blueprint.id,
        sourceMediaUrl: evidence.sourceMediaUrl,
        durationSeconds,
      };
    } catch (error: any) {
      throw evidencePrecondition(error?.message || "Body Cinema could not restore this verified source to your Media Vault.");
    }
  }),

  invalidateSourceEvidence: protectedProcedure.input(z.object({
    evidenceId: z.string().uuid(),
    reason: z.string().min(12).max(3000),
  })).mutation(async ({ ctx, input }) => {
    try {
      return await invalidateBodyCinemaSourceEvidence({
        creatorId: Number(ctx.user.id),
        evidenceId: input.evidenceId,
        reason: input.reason,
        invalidatedBy: Number(ctx.user.id),
      });
    } catch (error: any) {
      throw evidencePrecondition(error?.message || "Body Cinema could not block that source analysis.");
    }
  }),

  invalidateSourceUrlEvidence: protectedProcedure.input(z.object({
    sourceMediaUrl: z.string().url(),
    reason: z.string().min(12).max(3000),
  })).mutation(async ({ ctx, input }) => {
    try {
      return await invalidateBodyCinemaSourceEvidenceForUrl({
        creatorId: Number(ctx.user.id),
        sourceMediaUrl: input.sourceMediaUrl,
        reason: input.reason,
        invalidatedBy: Number(ctx.user.id),
      });
    } catch (error: any) {
      throw evidencePrecondition(error?.message || "Body Cinema could not block source analysis for that saved video.");
    }
  }),

  approveDirection: protectedProcedure.input(z.object({
    evidenceId: z.string().uuid(),
    directionId: z.enum(["the-arch", "silhouette", "luxury-reveal", "vip-tease"]),
  })).mutation(async ({ ctx, input }) => {
    try {
      return await approveBodyCinemaDirection(Number(ctx.user.id), input.evidenceId, input.directionId);
    } catch (error: any) {
      throw evidencePrecondition(error?.message || "Body Cinema direction approval failed.");
    }
  }),

  assembleEvidenceBackedMaster: protectedProcedure.input(z.object({
    evidenceId: z.string().uuid(),
    sourceAssetUrl: z.string().url(),
    creationProjectId: z.string().uuid(),
    watermarkText: z.string().trim().min(1).max(40).optional(),
    audioAssetId: z.string().uuid().optional(),
    destinationPlatform: z.enum(["creatorvault", "vaultx", "instagram", "tiktok", "youtube"]).default("creatorvault"),
  })).mutation(async ({ ctx, input }) => {
    const creatorId = Number(ctx.user.id);
    try {
      const evidenceContext = await assertBodyCinemaEvidenceReady({
        creatorId,
        evidenceId: input.evidenceId,
        sourceMediaUrl: input.sourceAssetUrl,
      });
      const sourceMap = await assertBodyCinemaSourceMapReady({
        creatorId,
        evidenceId: input.evidenceId,
        sourceMediaUrl: input.sourceAssetUrl,
        route: "source_preserving_assembly",
      });
      const editBlueprint = await getOrCreateBodyCinemaEditBlueprint({
        creatorId,
        evidenceId: input.evidenceId,
        sourceMediaUrl: input.sourceAssetUrl,
      });
      const project = await getCreationProject(creatorId, input.creationProjectId);
      if (!project) throw new Error("CreatorVault could not find the creation attached to this master.");
      if (project.sourceEvidenceId && project.sourceEvidenceId !== input.evidenceId) {
        throw new Error("This saved creation belongs to a different source understanding.");
      }
      const sourceDurationSeconds = Math.max(4, ...evidenceContext.evidence.frameEvidence.map((frame) => Number(frame.timestampMs || 0) / 1000));
      let audioDirection: Parameters<typeof buildBodyCinemaAssemblyRecipe>[0]["audio"] | undefined;
      if (input.audioAssetId) {
        const audioAsset = await getCanonicalAudioAsset(creatorId, input.audioAssetId);
        if (!audioAsset) throw new Error("The selected soundtrack is not in this CreatorVault library.");
        const audioTimeline = await buildAudioDirectedTimeline({
          creatorId,
          audioAssetId: input.audioAssetId,
          sourceEvidenceId: input.evidenceId,
          treatmentId: evidenceContext.direction.id,
          targetDurationSeconds: Math.min(12, sourceDurationSeconds),
          preserveSourceAudio: false,
          destinationPlatform: input.destinationPlatform,
        });
        audioDirection = {
          assetUrl: audioAsset.assetUrl,
          mix: audioTimeline.mix,
          visualEvents: audioTimeline.visualEvents,
        };
      }
      const recipe = buildBodyCinemaAssemblyRecipe({
        sourceUrl: input.sourceAssetUrl,
        evidence: evidenceContext.evidence,
        direction: evidenceContext.direction,
        watermarkText: input.watermarkText || null,
        audio: audioDirection,
      });
      const job = startRender(recipe.request);
      await updateCreationProjectLinks({
        creatorId,
        projectId: input.creationProjectId,
        actorId: creatorId,
        patch: {
          renderJobId: job.id,
          sourceEvidenceId: evidenceContext.evidence.id,
          treatmentId: evidenceContext.direction.id,
          state: "in_progress",
          metadata: {
            finishingLane: "source_preserving_assembly",
            sourceMapId: sourceMap.id,
            sourceMapVersion: sourceMap.analysisVersion,
            editBlueprintId: editBlueprint.id,
            editBlueprintState: editBlueprint.state,
            editBlueprintSceneCount: editBlueprint.scenes.length,
            treatmentGrammar: evidenceContext.direction.grammar,
            creatorSummary: recipe.creatorSummary,
            assemblyRecipe: recipe.treatmentId,
            audioDirected: Boolean(input.audioAssetId),
            audioAssetId: input.audioAssetId || null,
            destinationPlatform: input.destinationPlatform,
          },
        },
      });
      return {
        jobId: job.id,
        status: job.status,
        treatment: evidenceContext.direction.label,
        creatorMessage: `${recipe.creatorSummary} CreatorVault is building your finished drop from the moments measured in this exact source.`,
      };
    } catch (error: any) {
      throw evidencePrecondition(error?.message || "CreatorVault could not build this source-backed master.");
    }
  }),

  getOutputReview: protectedProcedure.input(z.object({
    outputFingerprint: z.string().regex(/^[a-f0-9]{64}$/i),
  })).query(async ({ ctx, input }) => {
    return getBodyCinemaOutputReview(Number(ctx.user.id), input.outputFingerprint);
  }),

  reviewOutput: protectedProcedure.input(z.object({
    evidenceId: z.string().uuid(),
    outputAssetUrl: z.string().url(),
    outputFingerprint: z.string().regex(/^[0-9a-f]{64}$/i),
    frameEvidence: z.array(frameEvidenceInput).min(1).max(24),
    audioAssetId: z.string().uuid().optional(),
    audioAnalysisId: z.string().uuid().optional(),
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
    audioAssetId: z.string().uuid().optional(),
  })).mutation(async ({ ctx, input }) => {
    const eligibility = complianceVault.checkGenerationEligibility(String(ctx.user.id), "GLOBAL");
    if (!eligibility.eligible) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Compliance check failed: " + eligibility.blockers.join("; ") });
    }
    let evidenceContext: { evidence: { id: string; sourceFingerprint: string }; direction: { id: string; camera: string; movement: string; composition: string; bodyFocus: string[] } };
    try {
      evidenceContext = await assertBodyCinemaEvidenceReady({
        creatorId: Number(ctx.user.id),
        evidenceId: input.evidenceId,
        sourceMediaUrl: input.sourceAssetUrl,
      }) as typeof evidenceContext;
      await assertBodyCinemaSourceMapReady({
        creatorId: Number(ctx.user.id),
        evidenceId: input.evidenceId,
        sourceMediaUrl: input.sourceAssetUrl,
        route: "restricted_generated_transform",
      });
    } catch (error: any) {
      throw evidencePrecondition(error?.message || "Body Cinema needs your saved source understanding before it can prepare this premium drop.");
    }
    const evidencePrompt = buildEvidenceBackedDirectionPrompt(evidenceContext.direction as any);
    const plan = await prepareCreationPlan({
      creatorId: Number(ctx.user.id),
      requestedBy: Number(ctx.user.id),
      tool: "body_cinema",
      intent: input.goal,
      outputPurpose: input.platform,
      source: {
        assetUrl: input.sourceAssetUrl,
        sourceEvidenceId: evidenceContext.evidence.id,
        sourceFingerprint: evidenceContext.evidence.sourceFingerprint,
        ownershipConfirmed: true,
        consentConfirmed: true,
        adultVerified: true,
      },
      capabilities: buildCreationCapabilities({
        requiresGeneratedShot: true,
        requiredInputModes: [input.sourceType === "video" ? "reference_video" : "reference_image"],
        durationSeconds: input.duration,
        resolution: "720p",
        preserveIdentity: input.identityLock,
        naturalBody: true,
        preserveProps: true,
        cameraControl: Boolean(input.cameraMovement || evidenceContext.direction.camera),
        minimumQualityScore: input.qualityThreshold,
      }),
      creativeDirection: {
        treatment: evidenceContext.direction.id,
        prompt: [evidencePrompt, input.prompt].filter(Boolean).join(" "),
        motionPlan: [evidenceContext.direction.movement, input.motionDirective].filter(Boolean).join(" "),
        cameraPlan: [evidenceContext.direction.camera, input.cameraMovement].filter(Boolean).join(" "),
        identityRequirements: input.identityLock ? ["preserve creator identity", "preserve source body continuity", "preserve styling and visible props"] : [],
        sourceAnalysisReference: evidenceContext.evidence.id,
        audioAssetId: input.audioAssetId || null,
      },
      output: {
        durationSeconds: input.duration,
        aspectRatio: input.aspectRatio as "9:16" | "16:9" | "1:1",
        resolution: "720p",
      },
      metadata: {
        bodyCinemaEvidenceId: evidenceContext.evidence.id,
        approvedTreatment: evidenceContext.direction.id,
        creatorSelectedProviderIgnored: Boolean(input.preferredProvider),
        reason: "Body Cinema requests creative capability; the Creation Director selects only a CreatorVault-verified route.",
      },
    });
    return {
      id: plan.requestId,
      directorState: plan.state,
      ...toCreatorFacingCreationPlan(plan),
    };
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

    const { direction, evidence } = evidenceContext;
    const isVip = direction.id === "vip-tease" || direction.id === "luxury-reveal";
    
    return {
      status: "planning_only" as const,
      message: "CreatorVault prepared a complete review-only monetization package. No provider job, paid request, checkout, campaign, or publication was created.",
      evidenceId: evidence.id,
      treatment: direction,
      monetizationPackage: {
        assets: {
          teaser: { format: "9:16", duration: 6, purpose: "Public hook", sourceTimeline: direction.timeline.slice(0, 3) },
          ppvMaster: { format: "9:16", duration: 15, purpose: "Paid payoff", sourceTimeline: direction.timeline },
          socialCut: { format: "9:16", duration: 4, purpose: "Instagram/TikTok", sourceTimeline: [direction.timeline[0], direction.timeline[1]] },
          coverImage: { format: "9:16", purpose: "Gallery cover", sourceTimestampMs: evidence.editorFindings?.strongestRevealTimestampMs || 0 },
          thumbnail: { format: "1:1", purpose: "Message preview", sourceTimestampMs: evidence.editorFindings?.strongestThumbnailTimestampMs || 0 },
        },
        copy: {
          headline: isVip ? "Exclusive Private Reveal" : "The Arch Collection",
          hook: isVip ? "You weren't supposed to see this yet..." : "The shape you've been asking for.",
          telegramCaption: isVip ? "Dropping something special in DMs tonight. Turn notifications on. 🤫" : "New set just landed. Link in bio.",
          ppvUnlockLine: isVip ? "Unlock the full 4K uncensored sequence." : "Unlock the complete set.",
          callToAction: "Unlock Now",
        },
        pricing: {
          suggestedPrice: isVip ? 25 : 15,
          priceFloor: isVip ? 15 : 10,
          bundleStrategy: isVip ? "Include in VIP tier only" : "Available for single purchase",
        }
      },
      creatorDecisionRequired: true,
    };
  }),

  getJobStatus: protectedProcedure.input(z.object({ jobId: z.string() })).query(async ({ ctx, input }) => {
    const plan = await getCreationPlan(input.jobId);
    if (plan && plan.creatorId === Number(ctx.user.id)) return toCreatorFacingCreationPlan(plan);
    return cinemaRouter.getJobStatus(input.jobId) || { state: "not_found" };
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
