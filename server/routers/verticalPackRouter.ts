/**
 * VERTICAL PACK ROUTER
 * 
 * tRPC router for the YouTube Educator Launch Pack v1 and all future vertical packs.
 * 
 * Procedures:
 * - generatePack: Run all 6 artifacts for a given vertical
 * - listVerticals: Get all available verticals (active + pending)
 * - getActiveVerticals: Get only ACTIVE verticals ready for production use
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { runVerticalPack } from "../services/verticalPackService";
import { getAllVerticals, getActiveVerticals } from "../services/verticalConfig";

export const verticalPackRouter = router({
  /**
   * Generate a full vertical pack — all 6 artifacts in one call.
   * Protected: requires auth.
   */
  generatePack: protectedProcedure
    .input(
      z.object({
        verticalId: z.enum([
          "YOUTUBE_EDUCATOR",
          "SHORTFORM_ENTERTAINER",
          "FITNESS_COACH",
          "MUSIC_ARTIST",
          "AGENCY_CONSULTANT",
        ]),
        creatorHandle: z.string().min(1).max(100),
        platform: z.enum(["youtube", "tiktok", "instagram", "twitter"]),
        courseTopic: z.string().optional(),
        targetAudience: z.string().optional(),
        pricePoint: z.string().optional(),
        credibilityProof: z.string().optional(),
        existingFollowers: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await runVerticalPack({
        userId: ctx.user.id,
        ...input,
      });
      return result;
    }),

  /**
   * List all verticals (active + pending) for the UI selector.
   * Public: no auth required.
   */
  listVerticals: publicProcedure.query(() => {
    return getAllVerticals().map((v) => ({
      id: v.id,
      displayName: v.displayName,
      packName: v.packName,
      description: v.description,
      status: v.status,
      artifactCount: v.heroArtifacts.length,
    }));
  }),

  /**
   * Get only ACTIVE verticals (ready for production use).
   * Public: no auth required.
   */
  getActiveVerticals: publicProcedure.query(() => {
    return getActiveVerticals().map((v) => ({
      id: v.id,
      displayName: v.displayName,
      packName: v.packName,
      description: v.description,
      artifactCount: v.heroArtifacts.length,
      primaryPlatform: v.auditPreset.primaryPlatform,
      teaserCount: v.teaserCount,
    }));
  }),
});
