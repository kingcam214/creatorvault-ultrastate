import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { archiveKingcamMiniMaxH3PresenceLoop, auditPolloAvailableCredits, auditPolloKingcamActionImitationV2Candidate, auditPolloKingcamVideoToVideoCandidate, auditPolloMiniMaxH3ReferenceConfig, auditPolloMiniMaxH3ReferenceCost, quoteGovernedPolloSourceVideoReference } from "../services/governedPolloService";
import {
  createKingcamGuideVoiceTour,
  getKingcamCloneOperatingSystem,
  getKingcamGuideVoiceTour,
  getKingcamCloneTrainingLibrary,
  launchKingcamFullBodyMotionProof,
  launchKingcamWanAnimateFullBodyProof,
  launchKingcamGoEnhanceRealPerformanceProof,
  launchKingcamActionImitationV2FullBodyProof,
  planKingcamFullBodyMotionProof,
  preflightKingcamElevenLabsVoice,
  preflightKingcamReplicateOmniHuman,
  preflightKingcamReplicateWanAnimate,
  registerKingcamPerformanceCapture,
  recordKingcamCloneMemory,
  reviewKingcamFullBodyMotionProof,
  startKingcamCloneTour,
  syncKingcamCloneTrainingLibrary,
} from "../services/kingcamCloneOperatingSystemService";

const OWNER_IDS = new Set([6, 33]);

function ownerOnly(userId: number): void {
  if (!OWNER_IDS.has(Number(userId))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "KingCam Clone Command is reserved for the CreatorVault owner." });
  }
}

export const kingcamCloneOperatingSystemRouter = router({
  getCommandCenter: protectedProcedure.query(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    return getKingcamCloneOperatingSystem(ctx.user.id);
  }),

  auditActionImitationMotionCandidate: protectedProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    try {
      return await auditPolloKingcamActionImitationV2Candidate();
    } catch (error) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Action Imitation V2 configuration could not be audited." });
    }
  }),

  getTrainingLibrary: protectedProcedure.query(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    return getKingcamCloneTrainingLibrary(ctx.user.id);
  }),

  syncTrainingLibrary: protectedProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    try {
      return await syncKingcamCloneTrainingLibrary(ctx.user.id);
    } catch (error) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "KingCam training library could not be synchronized." });
    }
  }),

  beginTour: protectedProcedure
    .input(z.object({ roomId: z.enum(["creator-ownership", "body-cinema", "caption-stage", "trailer-maker", "clone-command"]) }))
    .mutation(async ({ ctx, input }) => {
      ownerOnly(ctx.user.id);
      return startKingcamCloneTour({ ownerId: ctx.user.id, roomId: input.roomId });
    }),

  recordOwnerDirective: protectedProcedure
    .input(z.object({ directive: z.string().trim().min(8).max(3000), focus: z.string().trim().min(2).max(120).optional() }))
    .mutation(async ({ ctx, input }) => {
      ownerOnly(ctx.user.id);
      return recordKingcamCloneMemory({
        ownerId: ctx.user.id,
        kind: "owner_directive",
        room: input.focus || "KingCam Clone Command",
        payload: { directive: input.directive, recordedBy: "owner" },
      });
    }),

  registerPerformanceCapture: protectedProcedure
    .input(z.object({ mediaAssetId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      ownerOnly(ctx.user.id);
      try {
        return await registerKingcamPerformanceCapture({ ownerId: ctx.user.id, mediaAssetId: input.mediaAssetId });
      } catch (error) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "KingCam Performance Capture could not be registered." });
      }
    }),

  planFullBodyProof: protectedProcedure
    .input(z.object({
      hardCreditCap: z.number().int().positive().max(1_000_000),
      sceneBrief: z.string().trim().min(40).max(1800),
    }))
    .mutation(async ({ ctx, input }) => {
      ownerOnly(ctx.user.id);
      try {
        return await planKingcamFullBodyMotionProof({ ownerId: ctx.user.id, ...input });
      } catch (error) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "KingCam motion proof could not be planned." });
      }
    }),

  getGuideVoiceTour: protectedProcedure.query(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    return getKingcamGuideVoiceTour(ctx.user.id);
  }),

  createGuideVoiceTour: protectedProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    try {
      return await createKingcamGuideVoiceTour(ctx.user.id);
    } catch (error) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "KingCam real-voice tour could not be created." });
    }
  }),

  preflightRealKingcamVoice: protectedProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    try {
      return await preflightKingcamElevenLabsVoice(ctx.user.id);
    } catch (error) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "The real KingCam voice could not be checked." });
    }
  }),

  preflightOmniHumanCloneLane: protectedProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    try {
      return await preflightKingcamReplicateOmniHuman(ctx.user.id);
    } catch (error) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "The KingCam-only OmniHuman clone lane could not be checked." });
    }
  }),

  preflightWanAnimateCloneLane: protectedProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    try {
      return await preflightKingcamReplicateWanAnimate(ctx.user.id);
    } catch (error) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "The KingCam-only Wan Animate clone lane could not be checked." });
    }
  }),

  auditNextSourceVideoCandidate: protectedProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    try {
      return await auditPolloKingcamVideoToVideoCandidate();
    } catch (error) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "KingCam provider candidate audit could not run." });
    }
  }),

  archiveMiniMaxPresenceLoop: protectedProcedure
    .input(z.object({ jobId: z.literal(102) }))
    .mutation(async ({ ctx, input }) => {
      ownerOnly(ctx.user.id);
      try {
        return await archiveKingcamMiniMaxH3PresenceLoop({ ownerId: ctx.user.id, jobId: input.jobId });
      } catch (error) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "KingCam presence loop could not be archived." });
      }
    }),

  auditPolloBalance: protectedProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    try {
      return await auditPolloAvailableCredits();
    } catch (error) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "Pollo balance could not be read." });
    }
  }),

  auditMiniMaxH3ReferenceCost: protectedProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    try {
      return await auditPolloMiniMaxH3ReferenceCost();
    } catch (error) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "MiniMax H3 cost could not be read." });
    }
  }),

  auditMiniMaxH3LiveConfig: protectedProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    try {
      return await auditPolloMiniMaxH3ReferenceConfig();
    } catch (error) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "MiniMax H3 configuration could not be read." });
    }
  }),

  auditMiniMaxH3ReferenceQuote: protectedProcedure.mutation(async ({ ctx }) => {
    ownerOnly(ctx.user.id);
    try {
      return await quoteGovernedPolloSourceVideoReference({
        providerModelPath: "pollo/minimax/minimax-h3",
        sourceUrl: "https://creatorvault.live/videos/kingcam-hero-cam.mp4",
        prompt: "KingCam full-body source-preservation proof using the supplied CreatorVault reference video. Preserve face, beard, skin tone, body build, wardrobe, jewelry, hands, feet, natural gait, environment geometry, and the original full-body framing. No text, no extra people, no identity replacement, no wardrobe changes, no shoe changes, no jewelry drift, and no camera invention.",
        durationSeconds: 5,
        resolution: "2K",
        aspectRatio: "9:16",
      });
    } catch (error) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "MiniMax H3 quote could not be verified." });
    }
  }),

  launchFullBodyProof: protectedProcedure
    .input(z.object({ sceneBrief: z.string().trim().min(40).max(1800) }))
    .mutation(async ({ ctx, input }) => {
      ownerOnly(ctx.user.id);
      try {
        return await launchKingcamFullBodyMotionProof({ ownerId: ctx.user.id, sceneBrief: input.sceneBrief });
      } catch (error) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "KingCam full-body proof could not launch." });
      }
    }),

  launchWanAnimateProof: protectedProcedure
    .input(z.object({ sceneBrief: z.string().trim().min(40).max(1800) }))
    .mutation(async ({ ctx, input }) => {
      ownerOnly(ctx.user.id);
      try {
        return await launchKingcamWanAnimateFullBodyProof({ ownerId: ctx.user.id, sceneBrief: input.sceneBrief });
      } catch (error) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "KingCam real-driver motion proof could not launch." });
      }
    }),

  launchGoEnhanceRealPerformanceProof: protectedProcedure
    .input(z.object({ sceneBrief: z.string().trim().min(40).max(1800) }))
    .mutation(async ({ ctx, input }) => {
      ownerOnly(ctx.user.id);
      try {
        return await launchKingcamGoEnhanceRealPerformanceProof({ ownerId: ctx.user.id, sceneBrief: input.sceneBrief });
      } catch (error) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "KingCam real-performance motion proof could not launch." });
      }
    }),

  launchActionImitationV2Proof: protectedProcedure
    .input(z.object({ sceneBrief: z.string().trim().min(40).max(1800) }))
    .mutation(async ({ ctx, input }) => {
      ownerOnly(ctx.user.id);
      try {
        return await launchKingcamActionImitationV2FullBodyProof({ ownerId: ctx.user.id, sceneBrief: input.sceneBrief });
      } catch (error) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "KingCam Action Imitation V2 full-body proof could not launch." });
      }
    }),

  reviewFullBodyProof: protectedProcedure
    .input(z.object({ requestId: z.string().uuid(), accepted: z.boolean(), overallScore: z.number().min(0).max(100), notes: z.string().trim().min(12).max(3000) }))
    .mutation(async ({ ctx, input }) => {
      ownerOnly(ctx.user.id);
      try {
        return await reviewKingcamFullBodyMotionProof({ ownerId: ctx.user.id, ...input });
      } catch (error) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: error instanceof Error ? error.message : "KingCam motion proof could not be reviewed." });
      }
    }),
});
