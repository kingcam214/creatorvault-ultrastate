import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { runViralOptimizer, VIRAL_OPTIMIZER_HELD_MESSAGE } from "../services/viralOptimizer";

/**
 * Viral Optimizer route boundary.
 *
 * Legacy records contained heuristic scores and invented outcome forecasts.
 * They are intentionally withheld until the rebuilt version can ground every
 * insight in a saved CreatorVault source and connected performance evidence.
 */
export const viralOptimizerRouter = router({
  analyze: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(500),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      duration: z.number().optional(),
      platform: z.enum(["youtube", "tiktok", "instagram", "twitter"]),
      contentType: z.enum(["video", "image", "text"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => runViralOptimizer({ userId: ctx.user.id, ...input })),

  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(async () => []),

  getAnalysis: protectedProcedure
    .input(z.object({ analysisId: z.string() }))
    .query(async () => {
      throw new Error(VIRAL_OPTIMIZER_HELD_MESSAGE);
    }),
});
