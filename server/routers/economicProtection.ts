/**
 * Economic Protection Router
 *
 * Exposes FEPL, Omega Failsafe, and Zero Billing Protection systems
 * Integrated from OMEGA MERGE into ULTRASTATE
 */

import { router, publicProcedure, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { OmegaFailsafeEngine } from "../services/economic/omegaFailsafe";
import { ZeroBillingProtectionEngine } from "../services/economic/zeroBillingProtection";
import { applyFEPL, validateFEPL } from "../services/economic/fepl";
import type { CommissionBreakdown } from "../services/economic/fepl";

export const economicProtectionRouter = router({
  /**
   * Get Omega Failsafe statistics (admin only)
   */
  getFailsafeStats: adminProcedure.query(async () => {
    return OmegaFailsafeEngine.getFailsafeStats();
  }),

  /**
   * Get Omega Failsafe event log (admin only)
   */
  getFailsafeLog: adminProcedure
    .input(
      z.object({
        limit: z.number().optional().default(100),
      })
    )
    .query(async ({ input }) => {
      const log = OmegaFailsafeEngine.getFailsafeLog();
      return log.slice(-input.limit);
    }),

  /**
   * Validate revenue event before processing
   */
  validateRevenueEvent: protectedProcedure
    .input(
      z.object({
        earningUserId: z.string(),
        revenueAmount: z.number(),
        country: z.string(),
        sourceTxnId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await OmegaFailsafeEngine.validateRevenueEvent(input);
    }),

  /**
   * Validate commission split
   */
  validateCommissionSplit: protectedProcedure
    .input(
      z.object({
        creator: z.number(),
        platform: z.number(),
        recruiter: z.number().optional(),
        total: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return OmegaFailsafeEngine.validateCommissionSplit(input);
    }),

  /**
   * Get Zero Billing Protection statistics (admin only)
   */
  getZeroBillingStats: adminProcedure.query(async () => {
    return ZeroBillingProtectionEngine.getBlockedStats();
  }),

  /**
   * Get blocked billing attempts (admin only)
   */
  getBlockedAttempts: adminProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ input }) => {
      const attempts = ZeroBillingProtectionEngine.getBlockedAttempts();
      return attempts.slice(-input.limit);
    }),

  /**
   * Check if a charge should be blocked
   */
  shouldBlockCharge: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        amount: z.number(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const blocked = ZeroBillingProtectionEngine.shouldBlockCharge(
        input.userId,
        input.amount,
        input.reason
      );
      return { blocked };
    }),

  /**
   * Validate FEPL requirements for a commission breakdown
   */
  validateFEPL: protectedProcedure
    .input(
      z.object({
        totalAmount: z.number(),
        platformMargin: z.number(),
        breakdown: z.array(
          z.object({
            recipient: z.string(),
            amount: z.number(),
            percentage: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      return validateFEPL(input as CommissionBreakdown);
    }),

  /**
   * Apply FEPL protection to a commission breakdown
   */
  applyFEPL: protectedProcedure
    .input(
      z.object({
        totalAmount: z.number(),
        platformMargin: z.number(),
        breakdown: z.array(
          z.object({
            recipient: z.string(),
            amount: z.number(),
            percentage: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      return applyFEPL(input as CommissionBreakdown);
    }),
});
