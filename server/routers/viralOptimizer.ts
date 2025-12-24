import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { runViralOptimizer } from "../services/viralOptimizer";
import { db } from "../db";
import { viralAnalyses } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const viralOptimizerRouter = router({
  /**
   * Analyze content for virality
   */
  analyze: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        duration: z.number().optional(),
        platform: z.enum(["youtube", "tiktok", "instagram", "twitter"]),
        contentType: z.enum(["video", "image", "text"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await runViralOptimizer({
        userId: ctx.user.id,
        ...input,
      });

      return result;
    }),

  /**
   * Get user's viral analysis history
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const analyses = await db
        .select()
        .from(viralAnalyses)
        .where(eq(viralAnalyses.userId, ctx.user.id))
        .orderBy(desc(viralAnalyses.createdAt))
        .limit(input.limit);

      return analyses;
    }),

  /**
   * Get specific analysis by ID
   */
  getAnalysis: protectedProcedure
    .input(
      z.object({
        analysisId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [analysis] = await db
        .select()
        .from(viralAnalyses)
        .where(eq(viralAnalyses.id, input.analysisId));

      if (!analysis || analysis.userId !== ctx.user.id) {
        throw new Error("Analysis not found");
      }

      return analysis;
    }),
});
