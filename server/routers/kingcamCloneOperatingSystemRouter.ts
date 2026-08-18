import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getKingcamCloneOperatingSystem,
  launchKingcamFullBodyMotionProof,
  planKingcamFullBodyMotionProof,
  recordKingcamCloneMemory,
  reviewKingcamFullBodyMotionProof,
  startKingcamCloneTour,
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
