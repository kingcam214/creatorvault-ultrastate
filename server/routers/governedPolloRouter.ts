import { isOwnerRole } from "../_core/authorizationPolicy";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ownerProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  approveGovernedPolloJob,
  cancelGovernedPolloJob,
  createGovernedPolloDraft,
  getGovernedPolloDashboard,
  getGovernedPolloJob,
  listGovernedPolloEvents,
  listGovernedPolloJobs,
  recordGovernedPolloProviderCompletion,
  pollGovernedPolloProviderJob,
  reviewGovernedPolloOutput,
  setGovernedPolloCostEstimate,
  submitGovernedPolloJob,
  quoteGovernedPolloSourceVideoReference,
  createQuotedGovernedPolloSourceVideoDraft,
  authorizeSingleUseGovernedPolloSubmission,
  createGovernedReplicateWanVideoEditDraft,
  ingestCompletedGovernedReplicateWanVideoEditOutput,
  createGovernedRunwayAlephVideoEditDraft,
  createGovernedTopazPrecisionVideoDraft,
  claimGovernedPolloJob,
  markGovernedPolloSubmitted,
  ingestCompletedGovernedRunwayAlephVideoEditOutput,
  reviewCompletedGovernedRunwayAlephVideoEditOutput,
  ingestCompletedGovernedTopazPrecisionVideoOutput,
  reviewCompletedGovernedTopazPrecisionVideoOutput,
  recordGovernedRunwayAlephVideoEditFailure,
  reclassifyGovernedRunwayAlephWorkspaceLimit,
  reconcileGovernedRunwayAlephSubmissionTimeout,
  createGovernedVaceLightingDraft,
  ingestCompletedGovernedVaceLightingOutput,
  reviewCompletedGovernedVaceLightingOutput,
  reconcileGovernedVaceSubmission,
  createManualCappedKingcamKlingOmniSpokenMotionDraft,
  createManualCappedKingcamHappyHorseAllReferenceDraft,
} from "../services/governedPolloService";
import { assertBodyCinemaEvidenceReady, buildEvidenceBackedDirectionPrompt } from "../services/bodyCinemaEvidenceService";
import { getOrCreateBodyCinemaEditBlueprint } from "../services/bodyCinemaEditBlueprintService";
import {
  buildPolloCapabilitySummary,
  getLatestPolloCapabilitySnapshot,
  getLatestControlledSourceVideoAttemptDetail,
  preflightBodyCinemaSourceVideo,
  refreshPolloCapabilitySnapshot,
  runNextControlledSourceVideoAccessAttempt,
  ingestAndSettleControlledSourceVideoTask,
  reviewIngestedControlledSourceVideoTask,
  settleControlledSourceVideoTask,
} from "../services/polloCapabilityRegistryService";
import {
  buildBodyCinemaRouteReadiness,
  listBodyCinemaProviderHealth,
  recordBodyCinemaProviderHealthy,
} from "../services/bodyCinemaProviderResilienceService";
import { getRoutableCreationModels } from "../services/creationModelRegistry";
import {
  activateTopazProductionCredential,
  getTopazProductionCredentialState,
} from "../services/topazProductionActivationService";
import {
  activateVaceWorkerConnection,
  getVaceWorkerConnectionState,
} from "../services/vaceWorkerConnectionService";
import { probeVaceWorkerHealth } from "../services/vaceWorkerHealthService";
import {
  activateDigitalOceanVaceAutomation,
  getDigitalOceanVaceAutomationState,
} from "../services/digitalOceanVaceAutomationService";
import { getDigitalOceanVaceProvisioningReadiness } from "../services/digitalOceanVaceProvisioningService";
import { destroyCompletedH200VaceWorker, provisionApprovedH100VaceWorker } from "../services/digitalOceanVaceWorkerProvisioner";
import { destroyWanAnimate2ProofWorker, provisionConfirmedWanAnimate2H200ProofWorker } from "../services/digitalOceanWanProofWorkerProvisioner";
import { getWanProofWorkerConnectionState } from "../services/wanAnimateProofWorkerConnectionService";
import { collectWanAnimate2ProofOutput, getWanAnimate2ProofJob, launchOneWanAnimate2Proof, probeWanAnimate2ProofWorker } from "../services/wanAnimate2ProofService";
import { destroyKingcamPerformerWorker, provisionApprovedKingcamPerformerH200Worker } from "../services/digitalOceanKingcamPerformerWorkerProvisioner";
import { auditPriorKingcamDigitalOceanRun } from "../services/digitalOceanKingcamRecoveryAuditService";
import { getKingcamPerformerWorkerConnectionState } from "../services/kingcamPerformerWorkerConnectionService";
import {
  collectKingcamFullBodyPerformerOutput,
  getKingcamFullBodyPerformerRun,
  launchKingcamFullBodyTalkingBenchmark,
  probeKingcamFullBodyPerformerWorker,
} from "../services/kingcamFullBodyPerformerService";

const OWNER_IDS = new Set([6, 33]);

function ownerOnly(userId: number, role: string): void {
  if (!isOwnerRole(role) || !OWNER_IDS.has(Number(userId))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner approval is required for governed media operations." });
  }
}

function canReadJob(userId: number, job: { creatorId: number }, role: string): void {
  if (Number(userId) !== Number(job.creatorId) && !(isOwnerRole(role) && OWNER_IDS.has(Number(userId)))) {
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
  topazProductionCredentialState: ownerProcedure.query(({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    return getTopazProductionCredentialState();
  }),

  activateTopazProductionCredential: ownerProcedure.input(z.object({
    apiKey: z.string().uuid(),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await activateTopazProductionCredential({ apiKey: input.apiKey });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  digitalOceanVaceAutomationState: ownerProcedure.query(({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    return getDigitalOceanVaceAutomationState();
  }),

  activateDigitalOceanVaceAutomation: ownerProcedure.input(z.object({
    token: z.string().trim().min(32).max(512),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await activateDigitalOceanVaceAutomation(input);
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  digitalOceanVaceProvisioningReadiness: ownerProcedure.query(async ({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await getDigitalOceanVaceProvisioningReadiness();
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  priorKingcamDigitalOceanRecoveryAudit: ownerProcedure.query(async ({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await auditPriorKingcamDigitalOceanRun();
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  provisionApprovedH100VaceWorker: ownerProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await provisionApprovedH100VaceWorker();
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  destroyCompletedH200VaceWorker: ownerProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await destroyCompletedH200VaceWorker();
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  wanAnimate2ProofWorkerConnectionState: ownerProcedure.query(({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    return getWanProofWorkerConnectionState();
  }),

  provisionConfirmedWanAnimate2H200ProofWorker: ownerProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await provisionConfirmedWanAnimate2H200ProofWorker();
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  probeWanAnimate2ProofWorker: ownerProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await probeWanAnimate2ProofWorker();
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  launchOneWanAnimate2Proof: ownerProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await launchOneWanAnimate2Proof();
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  wanAnimate2ProofJob: ownerProcedure.input(z.object({ workerJobId: z.string().uuid() })).query(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await getWanAnimate2ProofJob(input.workerJobId);
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  collectWanAnimate2ProofOutput: ownerProcedure.input(z.object({ workerJobId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await collectWanAnimate2ProofOutput({ ownerId: ctx.user.id, workerJobId: input.workerJobId });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  destroyWanAnimate2ProofWorker: ownerProcedure.input(z.object({ dropletId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await destroyWanAnimate2ProofWorker(input.dropletId);
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  kingcamPerformerWorkerConnectionState: ownerProcedure.query(({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    return getKingcamPerformerWorkerConnectionState();
  }),

  provisionApprovedKingcamPerformerH200Worker: ownerProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await provisionApprovedKingcamPerformerH200Worker();
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  probeKingcamFullBodyPerformerWorker: ownerProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await probeKingcamFullBodyPerformerWorker();
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  launchKingcamFullBodyTalkingBenchmark: ownerProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await launchKingcamFullBodyTalkingBenchmark();
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  kingcamFullBodyPerformerRun: ownerProcedure.input(z.object({ workerJobId: z.string().uuid() })).query(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await getKingcamFullBodyPerformerRun(input.workerJobId);
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  collectKingcamFullBodyPerformerOutput: ownerProcedure.input(z.object({ workerJobId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await collectKingcamFullBodyPerformerOutput({ ownerId: ctx.user.id, workerJobId: input.workerJobId });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  destroyKingcamPerformerWorker: ownerProcedure.input(z.object({ dropletId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await destroyKingcamPerformerWorker(input.dropletId);
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  vaceWorkerConnectionState: ownerProcedure.query(({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    return getVaceWorkerConnectionState();
  }),

  activateVaceWorkerConnection: ownerProcedure.input(z.object({
    workerUrl: z.string().url().max(512),
    workerToken: z.string().trim().min(32).max(512),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await activateVaceWorkerConnection(input);
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  probeVaceWorkerAvailability: ownerProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    const health = await probeVaceWorkerHealth();
    if (health.workerReady) {
      await recordBodyCinemaProviderHealthy({
        providerKey: "creatorvault_vace",
        source: "owner_verified_read_only_availability_probe",
        detail: health.detail,
        metadata: { actorId: ctx.user.id, chargeableProviderRequestCreated: false, gpuAvailable: true, modelReady: true },
      });
    }
    return health;
  }),

  bodyCinemaResilienceSnapshot: ownerProcedure.query(async ({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    const [models, providerHealth] = await Promise.all([
      getRoutableCreationModels(),
      listBodyCinemaProviderHealth(),
    ]);
    return {
      providerHealth,
      routeReadiness: buildBodyCinemaRouteReadiness(models, providerHealth),
      policy: {
        noBlindProviderRetry: true,
        continuityIsNotCreativeTreatmentProof: true,
        unconfiguredProviderCandidatesRemainDisabled: true,
      },
    };
  }),

  recordBodyCinemaProviderAvailability: ownerProcedure.input(z.object({
    providerKey: z.enum(["runway_aleph", "topaz_video", "creatorvault_vace", "creatorvault_technical_continuity"]),
    evidence: z.string().trim().min(12).max(2_000),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await recordBodyCinemaProviderHealthy({
        providerKey: input.providerKey,
        source: "owner_verified_read_only_availability_probe",
        detail: input.evidence,
        metadata: { actorId: ctx.user.id, chargeableProviderRequestCreated: false },
      });
    } catch (error) {
      asPrecondition(error);
    }
  }),

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
    if (creatorId !== ctx.user.id) ownerOnly(ctx.user.id, ctx.user.role);
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
    if (creatorId !== ctx.user.id) ownerOnly(ctx.user.id, ctx.user.role);
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
    canReadJob(ctx.user.id, job, ctx.user.role);
    return job;
  }),

  events: protectedProcedure.input(z.object({ jobId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const job = await getGovernedPolloJob(input.jobId);
    if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Governed media request was not found." });
    canReadJob(ctx.user.id, job, ctx.user.role);
    return listGovernedPolloEvents(input.jobId);
  }),

  cancel: protectedProcedure.input(z.object({ jobId: z.number().int().positive(), reason: z.string().trim().min(3).max(1200) })).mutation(async ({ ctx, input }) => {
    try {
      return await cancelGovernedPolloJob({ jobId: input.jobId, actorId: ctx.user.id, reason: input.reason });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  ownerDashboard: ownerProcedure.query(async ({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    return getGovernedPolloDashboard();
  }),

  capabilitySnapshot: ownerProcedure.query(async ({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    const snapshot = await getLatestPolloCapabilitySnapshot();
    return {
      snapshot,
      summary: buildPolloCapabilitySummary(snapshot),
      executionEnabled: false,
      auditOnly: true,
    };
  }),

  refreshCapabilitySnapshot: ownerProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
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

  createKingcamFullBodyTalkingDraft: ownerProcedure.input(z.object({
    prompt: z.string().trim().min(20).max(4_000),
    ownershipConfirmed: z.literal(true),
    consentConfirmed: z.literal(true),
    idempotencyKey: z.string().trim().min(12).max(191).optional(),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await createManualCappedKingcamKlingOmniSpokenMotionDraft({
        creatorId: ctx.user.id,
        requestedBy: ctx.user.id,
        prompt: input.prompt,
        manualCreditCap: 75,
        ownershipConfirmed: input.ownershipConfirmed,
        consentConfirmed: input.consentConfirmed,
        idempotencyKey: input.idempotencyKey,
        metadata: {
          launchStandard: "identity_body_motion_real_voice_creatorvault_teaching",
          draftOnly: true,
          requiresExplicitSeparateSubmissionAuthorization: true,
        },
      });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  createKingcamHappyHorseAllReferenceDraft: ownerProcedure.input(z.object({
    prompt: z.string().trim().min(20).max(4_000),
    ownershipConfirmed: z.literal(true),
    consentConfirmed: z.literal(true),
    idempotencyKey: z.string().trim().min(12).max(191).optional(),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await createManualCappedKingcamHappyHorseAllReferenceDraft({
        creatorId: ctx.user.id,
        requestedBy: ctx.user.id,
        prompt: input.prompt,
        manualCreditCap: 75,
        ownershipConfirmed: input.ownershipConfirmed,
        consentConfirmed: input.consentConfirmed,
        idempotencyKey: input.idempotencyKey,
        metadata: {
          launchStandard: "identity_body_motion_face_voice_creatorvault_teaching",
          draftOnly: true,
          requiresExplicitSeparateSubmissionAuthorization: true,
          rejectedKlingRouteExcluded: true,
        },
      });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  latestControlledSourceVideoAttempt: ownerProcedure.query(async ({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    return getLatestControlledSourceVideoAttemptDetail(ctx.user.id);
  }),

  existingReplicateAccountAccess: ownerProcedure.query(async ({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    const token = String(process.env.REPLICATE_API_TOKEN || "").trim();
    if (!token) return { configured: false, reachable: false, provider: "replicate", message: "No existing Replicate runtime credential is configured for CreatorVault." };
    try {
      const response = await fetch("https://api.replicate.com/v1/account", {
        headers: { Authorization: `Token ${token}`, Accept: "application/json" },
      });
      return {
        configured: true,
        reachable: response.ok,
        provider: "replicate",
        statusCode: response.status,
        message: response.ok
          ? "Existing Replicate account access is available for a separate governed capability review."
          : "Existing Replicate credential did not receive account access.",
      };
    } catch {
      return { configured: true, reachable: false, provider: "replicate", message: "Existing Replicate account could not be reached from CreatorVault." };
    }
  }),

  createReplicateWanVideoEditDraft: ownerProcedure.input(z.object({
    creatorId: z.number().int().positive().optional(),
    evidenceId: z.string().uuid(),
    sourceUrl: z.string().url().max(4000),
    sourceChecksum: z.string().trim().max(128).optional().nullable(),
    prompt: z.string().trim().min(8).max(6000),
    resolution: z.enum(["720p", "1080p"]),
    durationSeconds: z.number().int().min(2).max(10),
    aspectRatio: z.enum(["9:16", "16:9", "1:1"]),
    ownershipConfirmed: z.literal(true),
    consentConfirmed: z.literal(true),
    idempotencyKey: z.string().trim().min(12).max(191).optional(),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    const creatorId = input.creatorId ?? ctx.user.id;
    if (creatorId !== ctx.user.id) ownerOnly(ctx.user.id, ctx.user.role);
    try {
      const evidenceContext = await assertBodyCinemaEvidenceReady({ creatorId, evidenceId: input.evidenceId, sourceMediaUrl: input.sourceUrl });
      return await createGovernedReplicateWanVideoEditDraft({
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
        evidenceId: input.evidenceId,
        idempotencyKey: input.idempotencyKey,
        metadata: {
          bodyCinemaDirectionId: evidenceContext.direction.id,
          bodyCinemaTimeline: evidenceContext.direction.timeline,
        },
      });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  createRunwayAlephVideoEditBenchmarkDraft: ownerProcedure.input(z.object({
    creatorId: z.number().int().positive().optional(),
    evidenceId: z.string().uuid(),
    sourceUrl: z.string().url().max(4000),
    sourceChecksum: z.string().trim().regex(/^[a-f0-9]{64}$/i),
    runwayReferenceVideoUrl: z.string().url().max(4000),
    prompt: z.string().trim().min(8).max(6000),
    resolution: z.enum(["720p", "1080p"]),
    durationSeconds: z.number().min(2).max(30),
    aspectRatio: z.enum(["9:16", "16:9", "1:1"]),
    ownershipConfirmed: z.literal(true),
    consentConfirmed: z.literal(true),
    keyframeUrl: z.string().url().max(4000).optional(),
    keyframeTimestampSeconds: z.number().min(0).max(30).optional(),
    editBlueprintId: z.string().uuid().optional(),
    idempotencyKey: z.string().trim().min(12).max(191).optional(),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    const creatorId = input.creatorId ?? ctx.user.id;
    if (creatorId !== ctx.user.id) ownerOnly(ctx.user.id, ctx.user.role);
    try {
      const providerVideo = new URL(input.runwayReferenceVideoUrl);
      const signedRunwayVideo = providerVideo.hostname === "d2jqrm6oza8nb6.cloudfront.net" && providerVideo.searchParams.has("_jwt");
      if (!signedRunwayVideo) {
        throw new Error("The protected Runway source-video link is incomplete. Re-register the approved source before a video can be prepared.");
      }
      const hasKeyframeUrl = Boolean(input.keyframeUrl);
      const hasKeyframeTimestamp = input.keyframeTimestampSeconds !== undefined;
      if (hasKeyframeUrl !== hasKeyframeTimestamp) {
        throw new Error("A protected Runway keyframe needs both its signed image link and exact source moment.");
      }
      if (input.keyframeUrl) {
        const keyframe = new URL(input.keyframeUrl);
        const signedRunwayKeyframe = keyframe.hostname === "dnznrvs05pmza.cloudfront.net" && keyframe.searchParams.has("_jwt");
        if (!signedRunwayKeyframe) {
          throw new Error("The protected Runway keyframe link is incomplete. Create a fresh reviewed keyframe before a video can be prepared.");
        }
      }
      const evidenceContext = await assertBodyCinemaEvidenceReady({ creatorId, evidenceId: input.evidenceId, sourceMediaUrl: input.sourceUrl });
      const editBlueprint = await getOrCreateBodyCinemaEditBlueprint({ creatorId, evidenceId: input.evidenceId, sourceMediaUrl: input.sourceUrl });
      if (input.editBlueprintId && input.editBlueprintId !== editBlueprint.id) {
        throw new Error("The supplied Body Cinema edit blueprint belongs to a different protected source plan.");
      }
      return await createGovernedRunwayAlephVideoEditDraft({
        creatorId,
        requestedBy: ctx.user.id,
        sourceUrl: input.sourceUrl,
        sourceChecksum: input.sourceChecksum,
        runwayReferenceVideoUrl: input.runwayReferenceVideoUrl,
        prompt: [buildEvidenceBackedDirectionPrompt(evidenceContext.direction), input.prompt].join(" "),
        resolution: input.resolution,
        durationSeconds: input.durationSeconds,
        aspectRatio: input.aspectRatio,
        ownershipConfirmed: input.ownershipConfirmed,
        consentConfirmed: input.consentConfirmed,
        evidenceId: evidenceContext.evidence.id,
        editBlueprintId: editBlueprint.id,
        idempotencyKey: input.idempotencyKey,
        metadata: {
          bodyCinemaDirectionId: evidenceContext.direction.id,
          bodyCinemaTimeline: evidenceContext.direction.timeline,
          bodyCinemaEditBlueprintId: editBlueprint.id,
          runwaySignedSourceVideoUrl: input.runwayReferenceVideoUrl,
          runwayKeyframeUrl: input.keyframeUrl ?? null,
          runwayKeyframeTimestampSeconds: input.keyframeTimestampSeconds ?? null,
        },
      });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  createVaceLightingBenchmarkDraft: ownerProcedure.input(z.object({
    creatorId: z.number().int().positive().optional(),
    evidenceId: z.string().uuid(),
    sourceUrl: z.string().url().max(4000),
    sourceChecksum: z.string().trim().regex(/^[a-f0-9]{64}$/i),
    aspectRatio: z.enum(["9:16", "16:9", "1:1"]),
    ownershipConfirmed: z.literal(true),
    consentConfirmed: z.literal(true),
    editBlueprintId: z.string().uuid().optional(),
    idempotencyKey: z.string().trim().min(12).max(191).optional(),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    const creatorId = input.creatorId ?? ctx.user.id;
    if (creatorId !== ctx.user.id) ownerOnly(ctx.user.id, ctx.user.role);
    try {
      const evidenceContext = await assertBodyCinemaEvidenceReady({ creatorId, evidenceId: input.evidenceId, sourceMediaUrl: input.sourceUrl });
      const editBlueprint = await getOrCreateBodyCinemaEditBlueprint({ creatorId, evidenceId: input.evidenceId, sourceMediaUrl: input.sourceUrl });
      if (input.editBlueprintId && input.editBlueprintId !== editBlueprint.id) {
        throw new Error("The supplied Body Cinema edit blueprint belongs to a different protected source plan.");
      }
      return await createGovernedVaceLightingDraft({
        creatorId,
        requestedBy: ctx.user.id,
        sourceUrl: input.sourceUrl,
        sourceChecksum: input.sourceChecksum,
        aspectRatio: input.aspectRatio,
        ownershipConfirmed: input.ownershipConfirmed,
        consentConfirmed: input.consentConfirmed,
        evidenceId: evidenceContext.evidence.id,
        editBlueprintId: editBlueprint.id,
        idempotencyKey: input.idempotencyKey,
        metadata: {
          bodyCinemaDirectionId: evidenceContext.direction.id,
          bodyCinemaTimeline: evidenceContext.direction.timeline,
          bodyCinemaEditBlueprintId: editBlueprint.id,
        },
      });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  createTopazPrecisionVideoDraft: ownerProcedure.input(z.object({
    creatorId: z.number().int().positive().optional(),
    evidenceId: z.string().uuid(),
    sourceUrl: z.string().url().max(4000),
    sourceChecksum: z.string().trim().regex(/^[a-f0-9]{64}$/i),
    resolution: z.enum(["720p", "1080p"]),
    durationSeconds: z.number().positive().max(3600),
    aspectRatio: z.enum(["9:16", "16:9", "1:1"]),
    ownershipConfirmed: z.literal(true),
    consentConfirmed: z.literal(true),
    editBlueprintId: z.string().uuid().optional(),
    idempotencyKey: z.string().trim().min(12).max(191).optional(),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    const creatorId = input.creatorId ?? ctx.user.id;
    if (creatorId !== ctx.user.id) ownerOnly(ctx.user.id, ctx.user.role);
    try {
      const evidenceContext = await assertBodyCinemaEvidenceReady({ creatorId, evidenceId: input.evidenceId, sourceMediaUrl: input.sourceUrl });
      const editBlueprint = await getOrCreateBodyCinemaEditBlueprint({ creatorId, evidenceId: input.evidenceId, sourceMediaUrl: input.sourceUrl });
      if (input.editBlueprintId && input.editBlueprintId !== editBlueprint.id) {
        throw new Error("The supplied Body Cinema edit blueprint belongs to a different protected source plan.");
      }
      return await createGovernedTopazPrecisionVideoDraft({
        creatorId,
        requestedBy: ctx.user.id,
        sourceUrl: input.sourceUrl,
        sourceChecksum: input.sourceChecksum,
        resolution: input.resolution,
        durationSeconds: input.durationSeconds,
        aspectRatio: input.aspectRatio,
        ownershipConfirmed: input.ownershipConfirmed,
        consentConfirmed: input.consentConfirmed,
        evidenceId: evidenceContext.evidence.id,
        editBlueprintId: editBlueprint.id,
        idempotencyKey: input.idempotencyKey,
        metadata: {
          bodyCinemaDirectionId: evidenceContext.direction.id,
          bodyCinemaTimeline: evidenceContext.direction.timeline,
          bodyCinemaEditBlueprintId: editBlueprint.id,
        },
      });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  leaseRunwayAlephVideoEditPilot: ownerProcedure.input(z.object({ jobId: z.number().int().positive(), workerId: z.string().trim().min(3).max(191) })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      const job = await getGovernedPolloJob(input.jobId);
      if (!job || job.provider !== "runway" || job.mode !== "runway_aleph_2_source_video_edit") throw new Error("A prepared Runway Aleph benchmark is required.");
      return await claimGovernedPolloJob({ jobId: input.jobId, workerId: input.workerId });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  recordRunwayAlephVideoEditSubmission: ownerProcedure.input(z.object({ jobId: z.number().int().positive(), workerId: z.string().trim().min(3).max(191), providerTaskId: z.string().trim().min(2).max(191), providerResponse: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      const job = await getGovernedPolloJob(input.jobId);
      if (!job || job.provider !== "runway" || job.mode !== "runway_aleph_2_source_video_edit") throw new Error("A queued Runway Aleph benchmark is required.");
      return await markGovernedPolloSubmitted({ jobId: input.jobId, workerId: input.workerId, providerJobId: input.providerTaskId, providerResponse: input.providerResponse });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  submitReplicateWanVideoEditPilot: ownerProcedure.input(z.object({ jobId: z.number().int().positive() })).mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Replicate remains reserved for the Clone workflow and cannot be used by Body Cinema." });
  }),

  correctRunwayAlephWorkspaceLimit: ownerProcedure.input(z.object({
    jobId: z.number().int().positive(),
    reason: z.string().trim().min(3).max(1200),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await reclassifyGovernedRunwayAlephWorkspaceLimit({
        jobId: input.jobId,
        ownerId: ctx.user.id,
        reason: input.reason,
      });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  recordRunwayAlephVideoEditFailure: ownerProcedure.input(z.object({ jobId: z.number().int().positive(), reason: z.string().trim().min(3).max(1200) })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await recordGovernedRunwayAlephVideoEditFailure({ jobId: input.jobId, ownerId: ctx.user.id, reason: input.reason });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  reconcileRunwayAlephSubmissionTimeout: ownerProcedure.input(z.object({
    jobId: z.number().int().positive(),
    reason: z.string().trim().min(3).max(1200),
    failureCode: z.enum(["runway_submission_timeout_no_task", "runway_workspace_limit"]).optional(),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await reconcileGovernedRunwayAlephSubmissionTimeout({
        jobId: input.jobId,
        ownerId: ctx.user.id,
        reason: input.reason,
        failureCode: input.failureCode,
      });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  ingestRunwayAlephVideoEditOutput: ownerProcedure.input(z.object({ jobId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await ingestCompletedGovernedRunwayAlephVideoEditOutput({ jobId: input.jobId, ownerId: ctx.user.id });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  reviewRunwayAlephVideoEditOutput: ownerProcedure.input(z.object({ jobId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await reviewCompletedGovernedRunwayAlephVideoEditOutput({ jobId: input.jobId, ownerId: ctx.user.id });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  reconcileVaceSubmission: ownerProcedure.input(z.object({
    jobId: z.number().int().positive(),
    workerId: z.string().trim().min(3).max(191),
    workerJobId: z.string().uuid(),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await reconcileGovernedVaceSubmission({ jobId: input.jobId, ownerId: ctx.user.id, workerId: input.workerId, workerJobId: input.workerJobId });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  ingestVaceLightingOutput: ownerProcedure.input(z.object({ jobId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await ingestCompletedGovernedVaceLightingOutput({ jobId: input.jobId, ownerId: ctx.user.id });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  reviewVaceLightingOutput: ownerProcedure.input(z.object({ jobId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await reviewCompletedGovernedVaceLightingOutput({ jobId: input.jobId, ownerId: ctx.user.id });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  ingestTopazPrecisionVideoOutput: ownerProcedure.input(z.object({ jobId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await ingestCompletedGovernedTopazPrecisionVideoOutput({ jobId: input.jobId, ownerId: ctx.user.id });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  reviewTopazPrecisionVideoOutput: ownerProcedure.input(z.object({ jobId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await reviewCompletedGovernedTopazPrecisionVideoOutput({ jobId: input.jobId, ownerId: ctx.user.id });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  ingestReplicateWanVideoEditOutput: ownerProcedure.input(z.object({ jobId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await ingestCompletedGovernedReplicateWanVideoEditOutput({ jobId: input.jobId, ownerId: ctx.user.id });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  reviewReplicateWanVideoEditOutput: ownerProcedure.input(z.object({ jobId: z.number().int().positive(), evidenceId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      const job = await getGovernedPolloJob(input.jobId);
      if (!job?.providerJobId) throw new Error("A completed governed Replicate prediction is required before review.");
      const output = await reviewIngestedControlledSourceVideoTask({ ownerId: ctx.user.id, evidenceId: input.evidenceId, taskId: job.providerJobId });
      const accepted = output.review.status === "accepted";
      const reason = Array.isArray(output.review.reasons) ? output.review.reasons.join(" ") : "Real-frame Body Cinema output review completed.";
      const reviewedJob = await reviewGovernedPolloOutput({
        jobId: job.id,
        reviewerId: ctx.user.id,
        accepted,
        artifactUrl: accepted ? output.outputAssetUrl : null,
        qualityScore: Number(output.review.overallScore ?? 0),
        reason,
      });
      return { reviewedJob, outputReview: output.review, outputAssetUrl: output.outputAssetUrl, frameCount: output.frameCount };
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
    if (creatorId !== ctx.user.id) ownerOnly(ctx.user.id, ctx.user.role);
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

  runNextControlledSourceVideoAccessAttempt: ownerProcedure.input(z.object({
    creatorId: z.number().int().positive().optional(),
    evidenceId: z.string().uuid(),
    sourceUrl: z.string().url().max(4000),
    prompt: z.string().trim().min(8).max(6000),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    const creatorId = input.creatorId ?? ctx.user.id;
    if (creatorId !== ctx.user.id) ownerOnly(ctx.user.id, ctx.user.role);
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

  ingestAndSettleControlledSourceVideoTask: ownerProcedure.input(z.object({
    taskId: z.string().trim().min(8).max(191),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await ingestAndSettleControlledSourceVideoTask({ ownerId: ctx.user.id, taskId: input.taskId });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  reviewIngestedControlledSourceVideoTask: ownerProcedure.input(z.object({
    evidenceId: z.string().uuid(),
    taskId: z.string().trim().min(8).max(191),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await reviewIngestedControlledSourceVideoTask({ ownerId: ctx.user.id, evidenceId: input.evidenceId, taskId: input.taskId });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  settleControlledSourceVideoTask: ownerProcedure.input(z.object({
    taskId: z.string().trim().min(8).max(191),
    durableOutputUrl: z.string().url().max(4000),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
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

  ownerJobs: ownerProcedure.input(z.object({ creatorId: z.number().int().positive().optional(), limit: z.number().int().min(1).max(200).optional() }).optional()).query(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
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
    if (creatorId !== ctx.user.id) ownerOnly(ctx.user.id, ctx.user.role);
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

  setCostEstimate: ownerProcedure.input(z.object({
    jobId: z.number().int().positive(),
    estimatedCostCredits: z.number().positive().max(1_000_000),
    costEvidenceReference: z.string().trim().min(3).max(3000),
    reason: z.string().trim().max(1200).optional(),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
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

  approve: ownerProcedure.input(z.object({ jobId: z.number().int().positive(), fingerprint: z.string().length(64), reason: z.string().trim().max(1200).optional() })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await approveGovernedPolloJob({ jobId: input.jobId, approverId: ctx.user.id, expectedFingerprint: input.fingerprint, reason: input.reason });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  authorizeSingleUseSubmission: ownerProcedure.input(z.object({
    jobId: z.number().int().positive(),
    fingerprint: z.string().length(64),
    hardCreditCap: z.number().min(0).max(1_000_000),
    reason: z.string().trim().min(3).max(1200),
    expiresInMinutes: z.number().int().min(1).max(30).optional(),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
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

  submitApproved: ownerProcedure.input(z.object({ jobId: z.number().int().positive(), workerId: z.string().trim().min(3).max(191) })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await submitGovernedPolloJob({ jobId: input.jobId, workerId: input.workerId });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  pollProviderStatus: ownerProcedure.input(z.object({ jobId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
    try {
      return await pollGovernedPolloProviderJob({ jobId: input.jobId, actorId: ctx.user.id });
    } catch (error) {
      return asPrecondition(error);
    }
  }),

  recordProviderCompletion: ownerProcedure.input(z.object({ jobId: z.number().int().positive(), providerJobId: z.string().trim().min(2).max(191), outputUrl: z.string().url().max(4000), providerResponse: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
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

  reviewOutput: ownerProcedure.input(z.object({
    jobId: z.number().int().positive(),
    accepted: z.boolean(),
    artifactUrl: z.string().url().max(4000).optional(),
    qualityScore: z.number().min(0).max(100).optional(),
    reason: z.string().trim().min(3).max(3000),
  })).mutation(async ({ ctx, input }) => {
    ownerOnly(ctx.user.id, ctx.user.role);
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
