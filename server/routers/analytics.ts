/**
 * Creator Analytics tRPC Router
 */

import { router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";
import {
  fetchPlatformMetrics,
  getOverviewStats,
  getPlatformBreakdown,
  getTopPerformingPosts,
  getGrowthTrends,
  getMonetizationMilestones,
  calculateMonetizationMilestones,
  getRevenueProjections,
  predictRevenue,
} from "../services/creatorAnalytics";

// Creator-only procedure
const creatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "creator" && ctx.user.role !== "king" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Creator access required" });
  }
  return next({ ctx });
});

export const analyticsRouter = router({
  /**
   * Refresh metrics from platform APIs
   */
  refreshMetrics: creatorProcedure.mutation(async ({ ctx }) => {
    const result = await fetchPlatformMetrics(ctx.user.id);

    if (!result.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: result.error || "Failed to refresh metrics",
      });
    }

    return result;
  }),

  /**
   * Get overview stats
   */
  getOverviewStats: creatorProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      return await getOverviewStats(ctx.user.id, input.days);
    }),

  /**
   * Get platform breakdown
   */
  getPlatformBreakdown: creatorProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      return await getPlatformBreakdown(ctx.user.id, input.days);
    }),

  /**
   * Get top performing posts
   */
  getTopPerformingPosts: creatorProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      return await getTopPerformingPosts(ctx.user.id, input.limit);
    }),

  /**
   * Get growth trends
   */
  getGrowthTrends: creatorProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      return await getGrowthTrends(ctx.user.id, input.days);
    }),

  /**
   * Get monetization milestones
   */
  getMonetizationMilestones: creatorProcedure.query(async ({ ctx }) => {
    return await getMonetizationMilestones(ctx.user.id);
  }),

  /**
   * Calculate/update monetization milestones
   */
  calculateMonetizationMilestones: creatorProcedure.mutation(async ({ ctx }) => {
    await calculateMonetizationMilestones(ctx.user.id);
    return { success: true };
  }),

  /**
   * Get revenue projections
   */
  getRevenueProjections: creatorProcedure.query(async ({ ctx }) => {
    return await getRevenueProjections(ctx.user.id);
  }),

  /**
   * Calculate/update revenue projections
   */
  calculateRevenueProjections: creatorProcedure.mutation(async ({ ctx }) => {
    await predictRevenue(ctx.user.id);
    return { success: true };
  }),
});
