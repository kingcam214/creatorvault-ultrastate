/**
 * Content Scheduler tRPC Router
 */

import { router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";
import {
  schedulePost,
  getScheduledPosts,
  cancelScheduledPost,
  reschedulePost,
  getOptimalPostingTimes,
  recommendNextPostingTime,
  bulkSchedule,
  type Platform,
} from "../services/contentScheduler";

// Creator-only procedure
const creatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "creator" && ctx.user.role !== "king" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Creator access required" });
  }
  return next({ ctx });
});

const platformEnum = z.enum(["tiktok", "instagram", "youtube", "twitter", "facebook", "linkedin", "pinterest", "snapchat"]);
const contentTypeEnum = z.enum(["text", "image", "video", "carousel", "story", "reel", "short"]);

export const schedulerRouter = router({
  /**
   * Schedule a post
   */
  schedulePost: creatorProcedure
    .input(
      z.object({
        caption: z.string(),
        hashtags: z.string().optional(),
        mediaUrls: z.array(z.string()).optional(),
        contentType: contentTypeEnum,
        platforms: z.array(platformEnum),
        scheduledFor: z.date(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await schedulePost({
        userId: ctx.user.id,
        ...input,
        platforms: input.platforms as Platform[],
      });

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Schedule failed",
        });
      }

      return result;
    }),

  /**
   * Get scheduled posts
   */
  getScheduledPosts: creatorProcedure
    .input(
      z.object({
        status: z.enum(["scheduled", "processing", "published", "failed", "cancelled"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getScheduledPosts(ctx.user.id, input.status);
    }),

  /**
   * Cancel a scheduled post
   */
  cancelScheduledPost: creatorProcedure
    .input(z.object({ scheduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await cancelScheduledPost(input.scheduleId, ctx.user.id);

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Cancel failed",
        });
      }

      return result;
    }),

  /**
   * Reschedule a post
   */
  reschedulePost: creatorProcedure
    .input(
      z.object({
        scheduleId: z.string(),
        newScheduledFor: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await reschedulePost(input.scheduleId, ctx.user.id, input.newScheduledFor);

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Reschedule failed",
        });
      }

      return result;
    }),

  /**
   * Get optimal posting times for a platform
   */
  getOptimalPostingTimes: creatorProcedure
    .input(z.object({ platform: platformEnum }))
    .query(async ({ input }) => {
      return await getOptimalPostingTimes(input.platform as Platform);
    }),

  /**
   * Recommend next optimal posting time
   */
  recommendNextPostingTime: creatorProcedure
    .input(z.object({ platform: platformEnum }))
    .query(async ({ input }) => {
      return await recommendNextPostingTime(input.platform as Platform);
    }),

  /**
   * Bulk schedule posts
   */
  bulkSchedule: creatorProcedure
    .input(
      z.object({
        posts: z.array(
          z.object({
            caption: z.string(),
            hashtags: z.string().optional(),
            mediaUrls: z.array(z.string()).optional(),
            contentType: contentTypeEnum,
            platforms: z.array(platformEnum),
            scheduledFor: z.date(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await bulkSchedule(
        ctx.user.id,
        input.posts.map((p) => ({
          ...p,
          platforms: p.platforms as Platform[],
        }))
      );

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Bulk schedule failed: ${result.errors.join("; ")}`,
        });
      }

      return result;
    }),
});
