import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  buildCreationCapabilities,
  getCreationPlan,
  listCreationPlans,
  prepareCreationPlan,
  toCreatorFacingCreationPlan,
  authorizeAndSubmitCreationPlan,
  acceptCreationPlanArtifact,
  type CreationTool,
} from "../services/creationDirector";
import {
  getCreationModelRegistry,
  getRoutableCreationModels,
  invalidateCreationModelBenchmarkEvidence,
  recordCreationModelBenchmark,
  setCreationModelActivation,
} from "../services/creationModelRegistry";

const OWNER_IDS = new Set([6, 33]);

function assertOwner(ctx: { user: { id: number; role: string } }): void {
  if (!OWNER_IDS.has(Number(ctx.user.id)) && !["king", "admin"].includes(String(ctx.user.role))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access is required for CreatorVault arsenal controls." });
  }
}

const sourceSchema = z.object({
  assetUrl: z.string().url(),
  sourceEvidenceId: z.string().uuid().optional(),
  sourceFingerprint: z.string().regex(/^[a-f0-9]{16,128}$/i).optional(),
  ownershipConfirmed: z.boolean(),
  consentConfirmed: z.boolean(),
  adultVerified: z.boolean(),
});

const capabilitiesSchema = z.object({
  requiresGeneratedShot: z.boolean(),
  requiredInputModes: z.array(z.enum(["text", "reference_image", "reference_video", "source_video", "audio", "accepted_shot"]))
    .min(1),
  requiredOutputMode: z.enum(["video", "assembled_master", "social_variant", "analysis"]).default("video"),
  durationSeconds: z.number().int().min(1).max(3600),
  resolution: z.string().min(2).max(32),
  preserveIdentity: z.boolean().optional(),
  naturalBody: z.boolean().optional(),
  preserveProps: z.boolean().optional(),
  cameraControl: z.boolean().optional(),
  audio: z.boolean().optional(),
  minimumQualityScore: z.number().min(0).max(100).optional(),
});

const planInputSchema = z.object({
  tool: z.enum(["body_cinema", "trailer_maker", "kingcam_content", "creator_os"]),
  intent: z.string().min(3).max(500),
  outputPurpose: z.string().min(3).max(191),
  source: sourceSchema,
  capabilities: capabilitiesSchema,
  creativeDirection: z.object({
    treatment: z.string().max(96).optional(),
    prompt: z.string().min(3).max(6000),
    motionPlan: z.string().max(2000).optional(),
    cameraPlan: z.string().max(2000).optional(),
    identityRequirements: z.array(z.string().min(1).max(320)).max(32).optional(),
    sourceAnalysisReference: z.string().max(191).optional(),
    audioAssetId: z.string().uuid().optional(),
  }),
  output: z.object({
    durationSeconds: z.number().int().min(1).max(3600),
    aspectRatio: z.enum(["9:16", "16:9", "1:1"]),
    resolution: z.string().min(2).max(32),
  }),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const creationDirectorRouter = router({
  prepare: protectedProcedure.input(planInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const plan = await prepareCreationPlan({
        creatorId: Number(ctx.user.id),
        requestedBy: Number(ctx.user.id),
        tool: input.tool as CreationTool,
        intent: input.intent,
        outputPurpose: input.outputPurpose,
        source: {
          assetUrl: input.source.assetUrl,
          sourceEvidenceId: input.source.sourceEvidenceId || null,
          sourceFingerprint: input.source.sourceFingerprint || null,
          ownershipConfirmed: input.source.ownershipConfirmed,
          consentConfirmed: input.source.consentConfirmed,
          adultVerified: input.source.adultVerified,
        },
        capabilities: buildCreationCapabilities({
          ...input.capabilities,
          requiredOutputMode: input.capabilities.requiredOutputMode,
          durationSeconds: input.capabilities.durationSeconds,
          resolution: input.capabilities.resolution,
        }),
        creativeDirection: {
          treatment: input.creativeDirection.treatment || null,
          prompt: input.creativeDirection.prompt,
          motionPlan: input.creativeDirection.motionPlan || null,
          cameraPlan: input.creativeDirection.cameraPlan || null,
          identityRequirements: input.creativeDirection.identityRequirements || [],
          sourceAnalysisReference: input.creativeDirection.sourceAnalysisReference || null,
          audioAssetId: input.creativeDirection.audioAssetId || null,
        },
        output: input.output,
        metadata: input.metadata || {},
      });
      return toCreatorFacingCreationPlan(plan);
    } catch (error: any) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error?.message || "CreatorVault could not safely prepare this creation path." });
    }
  }),

  getMine: protectedProcedure.input(z.object({ tool: z.enum(["body_cinema", "trailer_maker", "kingcam_content", "creator_os"]).optional() }).optional()).query(async ({ ctx, input }) => {
    const plans = await listCreationPlans(Number(ctx.user.id), input?.tool as CreationTool | undefined);
    return plans.map(toCreatorFacingCreationPlan);
  }),

  getMineByRequest: protectedProcedure.input(z.object({ requestId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const plan = await getCreationPlan(input.requestId);
    if (!plan || plan.creatorId !== Number(ctx.user.id)) {
      throw new TRPCError({ code: "NOT_FOUND", message: "CreatorVault could not find this creation path." });
    }
    return toCreatorFacingCreationPlan(plan);
  }),

  submitGoverned: protectedProcedure.input(z.object({
    requestId: z.string().uuid(),
    reason: z.string().min(3).max(1200),
  })).mutation(async ({ ctx, input }) => {
    assertOwner(ctx);
    try {
      const plan = await authorizeAndSubmitCreationPlan({
        requestId: input.requestId,
        ownerId: Number(ctx.user.id),
        reason: input.reason,
      });
      return toCreatorFacingCreationPlan(plan);
    } catch (error: any) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error?.message || "CreatorVault could not submit this creation request." });
    }
  }),

  acceptArtifact: protectedProcedure.input(z.object({
    requestId: z.string().uuid(),
    reason: z.string().min(3).max(3000),
  })).mutation(async ({ ctx, input }) => {
    assertOwner(ctx);
    try {
      const plan = await acceptCreationPlanArtifact({
        requestId: input.requestId,
        ownerId: Number(ctx.user.id),
        reason: input.reason,
      });
      return toCreatorFacingCreationPlan(plan);
    } catch (error: any) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error?.message || "CreatorVault could not accept this creation artifact." });
    }
  }),

  getOwnerArsenal: protectedProcedure.query(async ({ ctx }) => {
    assertOwner(ctx);
    return getRoutableCreationModels();
  }),

  getOwnerRegistry: protectedProcedure.query(async ({ ctx }) => {
    assertOwner(ctx);
    return getCreationModelRegistry();
  }),

  recordBenchmark: protectedProcedure.input(z.object({
    modelKey: z.string().min(3).max(191),
    sourceEvidenceId: z.string().min(3).max(96),
    benchmarkVersion: z.string().min(3).max(191),
    inputSignature: z.string().regex(/^[a-f0-9]{32,128}$/i),
    criteria: z.record(z.string(), z.number().min(0).max(100)),
    overallScore: z.number().min(0).max(100),
    qualityState: z.enum(["accepted", "rejected", "conditional"]),
    evidenceReference: z.string().min(3).max(5000),
    notes: z.string().max(5000).optional(),
  })).mutation(async ({ ctx, input }) => {
    assertOwner(ctx);
    try {
      return await recordCreationModelBenchmark({
        ...input,
        criteria: input.criteria,
        notes: input.notes || null,
        reviewedBy: Number(ctx.user.id),
      });
    } catch (error: any) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error?.message || "The benchmark evidence could not be recorded." });
    }
  }),

  invalidateBenchmarkEvidence: protectedProcedure.input(z.object({
    modelKey: z.string().min(3).max(191),
    evidenceReference: z.string().min(3).max(5000),
    reason: z.string().min(12).max(3000),
  })).mutation(async ({ ctx, input }) => {
    assertOwner(ctx);
    try {
      return await invalidateCreationModelBenchmarkEvidence({
        ...input,
        invalidatedBy: Number(ctx.user.id),
      });
    } catch (error: any) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error?.message || "CreatorVault could not invalidate that benchmark evidence." });
    }
  }),

  setModelActivation: protectedProcedure.input(z.object({
    modelKey: z.string().min(3).max(191),
    activationState: z.enum(["planned", "configured", "benchmarking", "active", "deprecated", "blocked"]),
    commercialEligibility: z.enum(["verified", "conditional", "unverified", "ineligible"]).optional(),
    verifiedUseCases: z.array(z.string().min(1).max(500)).max(64).optional(),
    knownWeaknesses: z.array(z.string().min(1).max(500)).max(64).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).mutation(async ({ ctx, input }) => {
    assertOwner(ctx);
    try {
      return await setCreationModelActivation(input);
    } catch (error: any) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error?.message || "CreatorVault did not activate this creation route." });
    }
  }),
});
