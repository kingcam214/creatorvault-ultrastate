/**
 * Recruiter Commissions tRPC Router (Emma Network)
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { trackCommission, getRecruiterEarnings, getRecruiterStats, payoutCommission } from "../services/recruiterCommissions";

export const recruiterCommissionsRouter = router({
  /**
   * Get my recruiter earnings
   */
  getMyEarnings: protectedProcedure.query(async ({ ctx }) => {
    return await getRecruiterEarnings(ctx.user.id);
  }),

  /**
   * Get my recruiter stats
   */
  getMyStats: protectedProcedure.query(async ({ ctx }) => {
    return await getRecruiterStats(ctx.user.id);
  }),

  /**
   * Request commission payout
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
      return await payoutCommission({
        recruiterId: ctx.user.id,
        amountInCents: input.amountInCents,
        paymentMethod: input.paymentMethod,
        paymentDetails: input.paymentDetails,
      });
    }),
});
