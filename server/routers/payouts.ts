/**
 * Payouts tRPC Router
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as payoutService from "../services/payoutService";

export const payoutsRouter = router({
  /**
   * Request a payout
   */
  requestPayout: protectedProcedure
    .input(
      z.object({
        amountInCents: z.number().min(1000), // Minimum $10
        paymentMethod: z.enum(["cashapp", "zelle", "bank_transfer", "paypal", "telegram_stars", "ton_wallet", "wise", "payoneer", "manual_cash"]),
        paymentDetails: z.string(),
        requestedMode: z.enum(["instant", "standard"]).default("instant"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await payoutService.requestPayout(
        ctx.user.id,
        input.amountInCents,
        input.paymentMethod,
        input.paymentDetails,
        input.requestedMode
      );
    }),

  /**
   * Get available non-Stripe payout rails
   */
  getRails: protectedProcedure.query(async () => {
    return payoutService.getPayoutRails();
  }),

  /**
   * Get my payout requests
   */
  getMyPayouts: protectedProcedure.query(async ({ ctx }) => {
    return await payoutService.getPayoutRequests(ctx.user.id);
  }),

  /**
   * Get my balance
   */
  getMyBalance: protectedProcedure.query(async ({ ctx }) => {
    return await payoutService.getCreatorBalance(ctx.user.id);
  }),

  /**
   * Get all pending payouts (admin only)
   */
  getAllPending: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "king") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    return await payoutService.getAllPendingPayouts();
  }),

  /**
   * Get actionable payouts including instant processing lane (admin only)
   */
  getActionable: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "king") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    return await payoutService.getAllActionablePayouts();
  }),

  /**
   * Move payout into processing lane (admin only)
   */
  markProcessing: protectedProcedure
    .input(z.object({ payoutId: z.number(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "king") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return await payoutService.markPayoutProcessing(input.payoutId, input.notes);
    }),

  /**
   * Complete payout only after transfer proof is attached (admin only)
   */
  completeWithProof: protectedProcedure
    .input(z.object({ payoutId: z.number(), transferProofId: z.string().min(3), externalTransferId: z.string().optional(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "king") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return await payoutService.completePayoutWithProof(input.payoutId, input);
    }),

  /**
   * Approve payout (admin only)
   */
  approve: protectedProcedure
    .input(
      z.object({
        payoutId: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "king") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return await payoutService.approvePayout(input.payoutId, input.notes);
    }),

  /**
   * Reject payout (admin only)
   */
  reject: protectedProcedure
    .input(
      z.object({
        payoutId: z.number(),
        notes: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "king") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return await payoutService.rejectPayout(input.payoutId, input.notes);
    }),
});
