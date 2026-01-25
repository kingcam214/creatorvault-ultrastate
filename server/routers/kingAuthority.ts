/**
 * King Authority Router
 *
 * Exposes Kill Switch and King Override systems
 * ONLY accessible to King (owner) role
 *
 * Integrated from OMEGA MERGE into ULTRASTATE
 */

import { router, publicProcedure, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { KillSwitchCore } from "../services/king/killSwitch";
import { KingOverrideAuthority } from "../services/king/kingOverride";
import { TRPCError } from "@trpc/server";

// King-only procedure (more restrictive than admin)
const kingProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "king") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only King can access this endpoint",
    });
  }
  return next();
});

export const kingAuthorityRouter = router({
  // ═══════════════════════════════════════════════════════════════
  // KILL SWITCH ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Activate kill switch (emergency shutdown)
   */
  activateKillSwitch: kingProcedure
    .input(
      z.object({
        reason: z.string().min(10, "Reason must be at least 10 characters"),
        components: z
          .array(
            z.enum([
              "payments",
              "content_upload",
              "live_streaming",
              "marketplace",
              "messaging",
              "ai_generation",
              "all",
            ])
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return KillSwitchCore.activate({
        kingUserId: ctx.user.id.toString(),
        reason: input.reason,
        components: input.components,
      });
    }),

  /**
   * Deactivate kill switch (restore operations)
   */
  deactivateKillSwitch: kingProcedure.mutation(async ({ ctx }) => {
    return KillSwitchCore.deactivate(ctx.user.id.toString());
  }),

  /**
   * Get kill switch status (public - users need to know if system is down)
   */
  getKillSwitchStatus: publicProcedure.query(async () => {
    const state = KillSwitchCore.getState();
    return {
      active: state.active,
      reason: state.reason,
      affectedComponents: state.affectedComponents,
      activatedAt: state.activatedAt,
    };
  }),

  /**
   * Check if a component is blocked
   */
  isComponentBlocked: protectedProcedure
    .input(
      z.object({
        component: z.enum([
          "payments",
          "content_upload",
          "live_streaming",
          "marketplace",
          "messaging",
          "ai_generation",
          "all",
        ]),
      })
    )
    .query(async ({ ctx, input }) => {
      return {
        blocked: KillSwitchCore.isComponentBlocked(input.component, ctx.user.id.toString()),
      };
    }),

  /**
   * Add allowed user during emergency
   */
  addAllowedUser: kingProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const success = KillSwitchCore.addAllowedUser(ctx.user.id.toString(), input.userId);
      return { success };
    }),

  // ═══════════════════════════════════════════════════════════════
  // KING OVERRIDE ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Override commission split for a transaction
   */
  overrideCommissionSplit: kingProcedure
    .input(
      z.object({
        transactionId: z.string(),
        originalSplit: z.object({
          creator: z.number(),
          platform: z.number(),
          recruiter: z.number().optional(),
        }),
        newSplit: z.object({
          creator: z.number(),
          platform: z.number(),
          recruiter: z.number().optional(),
        }),
        reason: z.string().min(10),
        affectedUserId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return KingOverrideAuthority.overrideCommissionSplit({
        kingUserId: ctx.user.id.toString(),
        ...input,
      });
    }),

  /**
   * Adjust a payout amount
   */
  adjustPayout: kingProcedure
    .input(
      z.object({
        userId: z.string(),
        originalAmount: z.number(),
        adjustedAmount: z.number(),
        reason: z.string().min(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return KingOverrideAuthority.adjustPayout({
        kingUserId: ctx.user.id.toString(),
        ...input,
      });
    }),

  /**
   * Get King override log (for transparency)
   */
  getOverrideLog: adminProcedure
    .input(
      z.object({
        limit: z.number().optional().default(100),
      })
    )
    .query(async ({ input }) => {
      const log = KingOverrideAuthority.getOverrideLog();
      return log.slice(-input.limit);
    }),

  /**
   * Get override statistics
   */
  getOverrideStats: adminProcedure.query(async () => {
    return KingOverrideAuthority.getOverrideStats();
  }),

  /**
   * Get King commission percentage
   */
  getKingCommissionPercentage: protectedProcedure.query(async () => {
    return {
      percentage: KingOverrideAuthority.getKingCommissionPercentage(),
    };
  }),

  /**
   * Set King commission percentage
   */
  setKingCommissionPercentage: kingProcedure
    .input(
      z.object({
        percentage: z.number().min(0).max(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return KingOverrideAuthority.setKingCommissionPercentage(
        ctx.user.id.toString(),
        input.percentage
      );
    }),
});
