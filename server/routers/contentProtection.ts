/**
 * Content Protection tRPC Router
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { applyWatermark, submitDMCARequest, trackLeaks, getProtectionStatus } from "../services/contentProtection";

export const contentProtectionRouter = router({
  /**
   * Apply watermark to content
   */
  applyWatermark: protectedProcedure
    .input(
      z.object({
        contentUrl: z.string(),
        watermarkText: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await applyWatermark({
        contentUrl: input.contentUrl,
        creatorId: ctx.user.id,
        watermarkText: input.watermarkText,
      });
    }),

  /**
   * Submit DMCA takedown request
   */
  submitDMCA: protectedProcedure
    .input(
      z.object({
        contentId: z.string(),
        infringingUrl: z.string(),
        description: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await submitDMCARequest({
        creatorId: ctx.user.id,
        contentId: input.contentId,
        infringingUrl: input.infringingUrl,
        description: input.description,
      });
    }),

  /**
   * Get leak tracking status
   */
  getLeakStatus: protectedProcedure
    .input(z.object({ contentId: z.string() }))
    .query(async ({ input }) => {
      return await trackLeaks(input.contentId);
    }),

  /**
   * Get overall protection status
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    return await getProtectionStatus(ctx.user.id);
  }),
});
