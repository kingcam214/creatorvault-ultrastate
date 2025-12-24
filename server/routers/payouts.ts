/**
 * Payouts tRPC Router
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
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
});
