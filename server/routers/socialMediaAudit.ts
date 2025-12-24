import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import {
  runSocialMediaAudit,
  getAudit,
  getUserAudits,
} from "../services/socialMediaAudit";

/**
 * Social Media Audit Router
 * 
 * Provides instant value to creators by analyzing their social media presence
 * and generating personalized monetization roadmaps.
 */

export const socialMediaAuditRouter = router({
  /**
   * Run a complete social media audit for a creator
   * PUBLIC: Allow non-authenticated users to try the audit
   */
  runAudit: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(), // Optional for non-authenticated users
        profiles: z.array(
          z.object({
            platform: z.enum(["instagram", "tiktok", "youtube", "twitter"]),
            username: z.string().min(1),
          })
        ).min(1).max(4), // Allow 1-4 social profiles
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Use authenticated user ID if available, otherwise generate temp ID
      const userId = ctx.user?.openId || input.userId || `temp_${Date.now()}`;
      
      const result = await runSocialMediaAudit(userId, input.profiles);
      
      return result;
    }),

  /**
   * Get a specific audit by ID
   */
  getAudit: publicProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ input }) => {
      const audit = await getAudit(input.auditId);
      
      if (!audit) {
        throw new Error("Audit not found");
      }
      
      return audit;
    }),

  /**
   * Get all audits for the current user
   */
  getMyAudits: protectedProcedure.query(async ({ ctx }) => {
    const audits = await getUserAudits(ctx.user.openId);
    return audits;
  }),

  /**
   * Get all audits for a specific user (admin only)
   */
  getUserAudits: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Only allow admins/king to view other users' audits
      if (ctx.user.role !== "admin" && ctx.user.role !== "king") {
        throw new Error("Unauthorized");
      }
      
      const audits = await getUserAudits(input.userId);
      return audits;
    }),
});
