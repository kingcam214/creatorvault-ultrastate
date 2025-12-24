/**
 * Performance Feedback tRPC Router
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { recordPerformanceMetrics, getPerformanceSummary, getTopPerformingContent } from "../services/performanceFeedback";

export const performanceFeedbackRouter = router({
  /**
   * Record content performance metrics
   */
  recordMetrics: protectedProcedure
    .input(
      z.object({
        contentId: z.string(),
        platform: z.string(),
        views: z.number().optional(),
        likes: z.number().optional(),
        shares: z.number().optional(),
        comments: z.number().optional(),
        saves: z.number().optional(),
        watchTime: z.number().optional(),
        completionRate: z.number().optional(),
        clickThroughRate: z.number().optional(),
        engagementRate: z.number().optional(),
        revenue: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await recordPerformanceMetrics(input);
    }),

  /**
   * Get performance for specific content
   */
  getContentMetrics: protectedProcedure
    .input(z.object({ contentId: z.string() }))
    .query(async ({ input }) => {
      return await getPerformanceSummary(input.contentId);
    }),

  /**
   * Get top performing content for creator
   */
  getTopContent: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return await getTopPerformingContent(ctx.user.id, input.limit);
    }),
});
