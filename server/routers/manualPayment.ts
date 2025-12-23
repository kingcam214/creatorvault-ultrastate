/**
 * Manual Payment tRPC Router
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createManualPaymentOrder,
  confirmManualPayment,
  getPendingManualPayments,
  getRevenueSummary,
} from "../services/manualPayRevenue";

export const manualPaymentRouter = router({
  /**
   * Create manual payment order
   */
  createManualPaymentOrder: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        productType: z.enum(["marketplace", "university", "services"]),
        amount: z.number().positive(),
        paymentMethod: z.enum(["cashapp", "zelle", "applepay", "manual_invoice"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await createManualPaymentOrder({
        userId: ctx.user.id,
        productId: input.productId,
        productType: input.productType,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
      });
    }),

  /**
   * Confirm manual payment (admin only)
   */
  confirmManualPayment: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await confirmManualPayment(input.orderId);
    }),

  /**
   * Get pending manual payments (admin only)
   */
  getPendingPayments: protectedProcedure.query(async () => {
    return await getPendingManualPayments();
  }),

  /**
   * Get revenue summary (admin only)
   */
  getRevenueSummary: protectedProcedure.query(async () => {
    return await getRevenueSummary();
  }),
});
