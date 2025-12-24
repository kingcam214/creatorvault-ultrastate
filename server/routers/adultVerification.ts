/**
 * Adult Verification tRPC Router
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { submitVerification, getVerificationStatus, getAllPendingVerifications, approveVerification, rejectVerification } from "../services/adultVerification";

export const adultVerificationRouter = router({
  /**
   * Submit verification documents
   */
  submit: protectedProcedure
    .input(
      z.object({
        documentType: z.enum(["passport", "drivers_license", "national_id"]),
        documentUrl: z.string(),
        selfieUrl: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await submitVerification({
        userId: ctx.user.id,
        documentType: input.documentType,
        documentUrl: input.documentUrl,
        selfieUrl: input.selfieUrl,
      });
    }),

  /**
   * Get my verification status
   */
  getMyStatus: protectedProcedure.query(async ({ ctx }) => {
    return await getVerificationStatus(ctx.user.id);
  }),

  /**
   * Get all pending verifications (admin only)
   */
  getAllPending: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "king") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    return await getAllPendingVerifications();
  }),

  /**
   * Approve verification (admin only)
   */
  approve: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "king") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return await approveVerification(input.userId);
    }),

  /**
   * Reject verification (admin only)
   */
  reject: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "king") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return await rejectVerification(input.userId, input.reason);
    }),
});
