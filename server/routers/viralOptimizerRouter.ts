import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";

const VIRAL_OPTIMIZER_HELD_MESSAGE =
  "Viral Optimizer is being rebuilt around saved CreatorVault footage and connected release evidence. It will not invent a score, reach forecast, or platform result in the meantime.";

function held(): never {
  throw new Error(VIRAL_OPTIMIZER_HELD_MESSAGE);
}

/**
 * Canonical Viral Optimizer boundary.
 *
 * This route formerly mixed ungoverned model calls with an invented
 * video-analysis response. The final tool must start from real creator media
 * and connected evidence before it can make creator-facing performance claims.
 */
export const viralOptimizerRouter = router({
  optimizeForViral: protectedProcedure
    .input(z.object({ content: z.string(), platform: z.string(), niche: z.string() }))
    .mutation(() => held()),

  analyzeViralPotential: protectedProcedure
    .input(z.object({ content: z.string(), platform: z.string() }))
    .mutation(() => held()),

  getViralFormulas: protectedProcedure
    .input(z.object({ platform: z.string(), niche: z.string() }))
    .query(() => held()),

  analyzeVideo: protectedProcedure
    .input(z.object({ videoUrl: z.string(), platform: z.string().optional(), niche: z.string().optional() }))
    .mutation(() => held()),

  getHistory: protectedProcedure.query(async () => []),
});
