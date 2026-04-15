import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { generateVideo } from "../services/videoStudio";

export const hollywoodReplacementRouter = router({
  igniteProduction: publicProcedure
    .input(z.object({
      provider: z.enum(["runway", "kling", "luma", "pika", "replicate"]),
      prompt: z.string()
    }))
    .mutation(async ({ input }) => {
      // Fires the Arsenal!
      return generateVideo({
        userId: 1, // Defaulting to owner context for now
        prompt: input.prompt,
        provider: input.provider
      });
    })
});
