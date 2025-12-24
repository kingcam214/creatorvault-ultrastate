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
        paymentMethod: z.enum(["cashapp", "zelle", "bank_transfer", "paypal"]),
        paymentDetails: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await payoutService.requestPayout(
        ctx.user.id,
        input.amountInCents,
        input.paymentMethod,
        input.paymentDetails
      );
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
