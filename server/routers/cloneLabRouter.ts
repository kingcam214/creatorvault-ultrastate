import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";

/**
 * Minimal compatibility router for Clone Lab queries used by Clone Empire UI.
 */
export const cloneLabRouter = router({
  listCloneVideos: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(200).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional(),
    )
    .query(async () => {
      return {
        items: [],
        total: 0,
      };
    }),
});
