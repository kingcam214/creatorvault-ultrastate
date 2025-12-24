/**
 * Safety Features tRPC Router (VaultGuardian)
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { reportUser, blockUser, getBlockedUsers, getSafetyAlerts, updateSafetySettings } from "../services/safetyFeatures";

export const safetyFeaturesRouter = router({
  /**
   * Report a user
   */
  reportUser: protectedProcedure
    .input(
      z.object({
        reportedUserId: z.number(),
        reason: z.string(),
        description: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await reportUser({
        reporterId: ctx.user.id,
        reportedUserId: input.reportedUserId,
        reason: input.reason,
        description: input.description,
      });
    }),

  /**
   * Block a user
   */
  blockUser: protectedProcedure
    .input(z.object({ blockedUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await blockUser(ctx.user.id, input.blockedUserId);
    }),

  /**
   * Get blocked users
   */
  getBlockedUsers: protectedProcedure.query(async ({ ctx }) => {
    return await getBlockedUsers(ctx.user.id);
  }),

  /**
   * Get safety alerts
   */
  getSafetyAlerts: protectedProcedure.query(async ({ ctx }) => {
    return await getSafetyAlerts(ctx.user.id);
  }),

  /**
   * Update safety settings
   */
  updateSettings: protectedProcedure
    .input(
      z.object({
        allowMessages: z.boolean().optional(),
        allowComments: z.boolean().optional(),
        autoModeration: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await updateSafetySettings(ctx.user.id, input);
    }),
});
