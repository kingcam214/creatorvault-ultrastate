import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  approveGovernedPolloJob,
  cancelGovernedPolloJob,
  createGovernedPolloDraft,
  getGovernedPolloDashboard,
  getGovernedPolloJob,
  listGovernedPolloEvents,
  listGovernedPolloJobs,
  recordGovernedPolloProviderCompletion,
  reviewGovernedPolloOutput,
  setGovernedPolloCostEstimate,
  submitGovernedPolloJob,
  quoteGovernedPolloSourceVideoReference,
  createQuotedGovernedPolloSourceVideoDraft,
  authorizeSingleUseGovernedPolloSubmission,
} from "../services/governedPolloService";
import { assertBodyCinemaEvidenceReady, buildEvidenceBackedDirectionPrompt } from "../services/bodyCinemaEvidenceService";
import {
  buildPolloCapabilitySummary,
  getLatestPolloCapabilitySnapshot,
  preflightBodyCinemaSourceVideo,
  refreshPolloCapabilitySnapshot,
  runNextControlledSourceVideoAccessAttempt,
  settleControlledSourceVideoTask,
} from "../services/polloCapabilityRegistryService";

const OWNER_IDS = new Set([6, 33]);

function ownerOnly(userId: number): void {
  if (!OWNER_IDS.has(Number(userId))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner approval is required for governed media operations." });
  }
}

function canReadJob(userId: number, job: { creatorId: number }): void {
  if (Number(userId) !== Number(job.creatorId) && !OWNER_IDS.has(Number(userId))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this governed media request." });
  }
}

function asPrecondition(error: unknown): never {
  const message = error instanceof Error ? error.message : "Governed media operation failed.";
  throw new TRPCError({ code: "PRECONDITION_FAILED", message });
}

const draftInput = z.object({
  creatorId: z.number().int().positive().optional(),
  sourceUrl: z.string().url().max(4000),
  sourceChecksum: z.string().trim().max(128).optional().nullable(),
  evidenceId: z.string().uuid(),
  prompt: z.string().trim().min(8).max(6000),
  providerModelPath: z.string().trim().min(5).max(128).optional(),
  resolution: z.enum(["480p", "720p", "1080p"]),
  durationSeconds: z.number().int().min(1).max(30),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional(),
  mode: z.string().trim().min(1).max(64).optional(),
  estimatedCostCredits: z.number().int().positive().max(1_000_000).optional().nullable(),
  costEvidenceReference: z.string().trim().min(3).max(3000).optional().nullable(),
  ownershipConfirmed: z.literal(true),
  consentConfirmed: z.literal(true),
  idempotencyKey: z.string().trim().min(12).max(191).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const governedPolloRouter = router({
  createQuotedSourceVideoDraft: protectedProcedure.input(z.object({
    creatorId: z.number().int().positive().optional(),
    sourceUrl: z.string().url().max(4000),
    sourceChecksum: z.string().trim().max(128).optional().nullable(),
    evidenceId: z.string().uuid(),
    prompt: z.string().trim().min(8).max(6000),
    resolution: z.enum(["480p", "720p", "1080p"]),
    durationSeconds: z.number().int().min(4).max(15),
    aspectRatio: z.enum(["9:16", "16:9", "1:1"]),
    ownershipConfirmed: z.literal(true),
    consentConfirmed: z.literal(true),
    idempotencyKey: z.string().trim().min(12).max(191).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).mutation(async ({ ctx, input }) => {
    const creatorId = input.creatorId ?? ctx.user.id;
    if (creatorId !== ctx.user.id) ownerOnly(ctx.user.id);
    try {
      const evidenceContext = await assertBodyCinemaEvidenceReady({ creatorId, evidenceId: input.evidenceId, sourceMediaUrl: input.sourceUrl });
      return await createQuotedGovernedPolloSourceVideoDraft({
        creatorId,
        requestedBy: ctx.user.id,
        sourceUrl: input.sourceUrl,
        sourceChecksum: input.sourceChecksum,
        prompt: [buildEvidenceBackedDirectionPrompt(evidenceContext.direction), input.prompt].join(" "),
        resolution: input.resolution,
        durationSeconds: input.durationSeconds,
        aspectRatio: input.aspectRatio,
        ownershipConfirmed: input.ownershipConfirmed,
        consentConfirmed: input.consentConfirmed,
        idempotencyKey: input.idempotencyKey,
        metadata: {
          ...(input.metadata || {}),
          bodyCinemaEvidenceId: evidenceContext.evidence.id,
          bodyCinemaDirectionId: evidenceContext.direction.id,
          bodyCinemaTimeline: evidenceContext.direction.timeline,
        },
      });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  createDraft: protectedProcedure.input(draftInput).mutation(async ({ ctx, input }) => {
    const creatorId = input.creatorId ?? ctx.user.id;
    if (creatorId !== ctx.user.id) ownerOnly(ctx.user.id);
    try {
      const evidenceContext = await assertBodyCinemaEvidenceReady({
        creatorId,
        evidenceId: input.evidenceId,
        sourceMediaUrl: input.sourceUrl,
      });
      return await createGovernedPolloDraft({
        creatorId,
        requestedBy: ctx.user.id,
        sourceUrl: input.sourceUrl,
        sourceChecksum: input.sourceChecksum,
        prompt: [buildEvidenceBackedDirectionPrompt(evidenceContext.direction), input.prompt].join(" "),
        providerModelPath: input.providerModelPath,
        resolution: input.resolution,
        durationSeconds: input.durationSeconds,
        aspectRatio: input.aspectRatio,
        mode: input.mode,
        outputCount: 1,
        estimatedCostCredits: input.estimatedCostCredits,
        costEvidenceReference: input.costEvidenceReference,
        ownershipConfirmed: input.ownershipConfirmed,
        consentConfirmed: input.consentConfirmed,
        idempotencyKey: input.idempotencyKey,
        metadata: {
          ...(input.metadata || {}),
          bodyCinemaEvidenceId: evidenceContext.evidence.id,
          bodyCinemaDirectionId: evidenceContext.direction.id,
          bodyCinemaTimeline: evidenceContext.direction.timeline,
        },
      });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  myJobs: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(200).optional() }).optional()).query(async ({ ctx, input }) => {
    return listGovernedPolloJobs({ creatorId: ctx.user.id, limit: input?.limit });
  }),

  job: protectedProcedure.input(z.object({ jobId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const job = await getGovernedPolloJob(input.jobId);
    if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Governed media request was not found." });
    canReadJob(ctx.user.id, job);
    return job;
  }),

  events: protectedProcedure.input(z.object({ jobId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const job = await getGovernedPolloJob(input.jobId);
    if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Governed media request was not found." });
    canReadJob(ctx.user.id, job);
    return listGovernedPolloEvents(input.jobId);
  }),

  cancel: protectedProcedure.input(z.object({ jobId: z.number().int().positive(), reason: z.string().trim().min(3).max(1200) })).mutation(async ({ ctx, input }) => {
    try {
      return await cancelGovernedPolloJob({ jobId: input.jobId, actorId: ctx.user.id, reason: input.reason });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  ownerDashboard: protectedProcedure.query(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    return getGovernedPolloDashboard();
  }),

  capabilitySnapshot: protectedProcedure.query(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    const snapshot = await getLatestPolloCapabilitySnapshot();
    return {
      snapshot,
      summary: buildPolloCapabilitySummary(snapshot),
      executionEnabled: false,
      auditOnly: true,
    };
  }),

  refreshCapabilitySnapshot: protectedProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    try {
      const snapshot = await refreshPolloCapabilitySnapshot(ctx.user.id);
      return {
        snapshot,
        summary: buildPolloCapabilitySummary(snapshot),
        executionEnabled: false,
        auditOnly: true,
      };
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  preflightSourceVideo: protectedProcedure.input(z.object({
    creatorId: z.number().int().positive().optional(),
    evidenceId: z.string().uuid(),
    sourceUrl: z.string().url().max(4000),
  })).query(async ({ ctx, input }) => {
    const creatorId = input.creatorId ?? ctx.user.id;
    if (creatorId !== ctx.user.id) ownerOnly(ctx.user.id);
    try {
      return await preflightBodyCinemaSourceVideo({
        creatorId,
        evidenceId: input.evidenceId,
        sourceMediaUrl: input.sourceUrl,
      });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  runNextControlledSourceVideoAccessAttempt: protectedProcedure.input(z.object({
    creatorId: z.number().int().positive().optional(),
    evidenceId: z.string().uuid(),
    sourceUrl: z.string().url().max(4000),
    prompt: z.string().trim().min(8).max(6000),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id);
    const creatorId = input.creatorId ?? ctx.user.id;
    if (creatorId !== ctx.user.id) ownerOnly(ctx.user.id);
    try {
      const evidenceContext = await assertBodyCinemaEvidenceReady({ creatorId, evidenceId: input.evidenceId, sourceMediaUrl: input.sourceUrl });
      return await runNextControlledSourceVideoAccessAttempt({
        ownerId: ctx.user.id,
        creatorId,
        evidenceId: input.evidenceId,
        sourceMediaUrl: input.sourceUrl,
        prompt: [buildEvidenceBackedDirectionPrompt(evidenceContext.direction), input.prompt].join(" "),
      });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  settleControlledSourceVideoTask: protectedProcedure.input(z.object({
    taskId: z.string().trim().min(8).max(191),
    durableOutputUrl: z.string().url().max(4000),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id);
    try {
      return await settleControlledSourceVideoTask({
        ownerId: ctx.user.id,
        taskId: input.taskId,
        durableOutputUrl: input.durableOutputUrl,
      });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  ownerJobs: protectedProcedure.input(z.object({ creatorId: z.number().int().positive().optional(), limit: z.number().int().min(1).max(200).optional() }).optional()).query(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id);
    return listGovernedPolloJobs({ creatorId: input?.creatorId, limit: input?.limit });
  }),

  quoteSourceVideoReference: protectedProcedure.input(z.object({
    creatorId: z.number().int().positive().optional(),
    evidenceId: z.string().uuid(),
    sourceUrl: z.string().url().max(4000),
    prompt: z.string().trim().min(8).max(6000),
    resolution: z.enum(["480p", "720p", "1080p"]),
    durationSeconds: z.number().int().min(4).max(15),
    aspectRatio: z.enum(["9:16", "16:9", "1:1"]),
  })).mutation(async ({ ctx, input }) => {
    const creatorId = input.creatorId ?? ctx.user.id;
    if (creatorId !== ctx.user.id) ownerOnly(ctx.user.id);
    try {
      const evidenceContext = await assertBodyCinemaEvidenceReady({ creatorId, evidenceId: input.evidenceId, sourceMediaUrl: input.sourceUrl });
      return await quoteGovernedPolloSourceVideoReference({
        sourceUrl: input.sourceUrl,
        prompt: [buildEvidenceBackedDirectionPrompt(evidenceContext.direction), input.prompt].join(" "),
        durationSeconds: input.durationSeconds,
        resolution: input.resolution,
        aspectRatio: input.aspectRatio,
      });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  setCostEstimate: protectedProcedure.input(z.object({
    jobId: z.number().int().positive(),
    estimatedCostCredits: z.number().positive().max(1_000_000),
    costEvidenceReference: z.string().trim().min(3).max(3000),
    reason: z.string().trim().max(1200).optional(),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id);
    try {
      return await setGovernedPolloCostEstimate({
        jobId: input.jobId,
        ownerId: ctx.user.id,
        estimatedCostCredits: input.estimatedCostCredits,
        costEvidenceReference: input.costEvidenceReference,
        reason: input.reason,
      });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  approve: protectedProcedure.input(z.object({ jobId: z.number().int().positive(), fingerprint: z.string().length(64), reason: z.string().trim().max(1200).optional() })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id);
    try {
      return await approveGovernedPolloJob({ jobId: input.jobId, approverId: ctx.user.id, expectedFingerprint: input.fingerprint, reason: input.reason });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  authorizeSingleUseSubmission: protectedProcedure.input(z.object({
    jobId: z.number().int().positive(),
    fingerprint: z.string().length(64),
    hardCreditCap: z.number().min(0).max(1_000_000),
    reason: z.string().trim().min(3).max(1200),
    expiresInMinutes: z.number().int().min(1).max(30).optional(),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id);
    try {
      return await authorizeSingleUseGovernedPolloSubmission({
        jobId: input.jobId,
        ownerId: ctx.user.id,
        expectedFingerprint: input.fingerprint,
        hardCreditCap: input.hardCreditCap,
        reason: input.reason,
        expiresInMinutes: input.expiresInMinutes,
      });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  submitApproved: protectedProcedure.input(z.object({ jobId: z.number().int().positive(), workerId: z.string().trim().min(3).max(191) })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id);
    try {
      return await submitGovernedPolloJob({ jobId: input.jobId, workerId: input.workerId });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  recordProviderCompletion: protectedProcedure.input(z.object({ jobId: z.number().int().positive(), providerJobId: z.string().trim().min(2).max(191), outputUrl: z.string().url().max(4000), providerResponse: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id);
    try {
      return await recordGovernedPolloProviderCompletion({
        jobId: input.jobId,
        providerJobId: input.providerJobId,
        outputUrl: input.outputUrl,
        providerResponse: input.providerResponse,
      });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  reviewOutput: protectedProcedure.input(z.object({
    jobId: z.number().int().positive(),
    accepted: z.boolean(),
    artifactUrl: z.string().url().max(4000).optional(),
    qualityScore: z.number().min(0).max(100).optional(),
    reason: z.string().trim().min(3).max(3000),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id);
    try {
      return await reviewGovernedPolloOutput({
        jobId: input.jobId,
        reviewerId: ctx.user.id,
        accepted: input.accepted,
        artifactUrl: input.artifactUrl,
        qualityScore: input.qualityScore,
        reason: input.reason,
      });
    } catch (error) {
      return asPrecondition(error);
    }
  }),
});
