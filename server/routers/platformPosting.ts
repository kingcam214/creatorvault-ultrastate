/**
 * Platform Posting tRPC Router
 * Handles multi-platform content posting and OAuth connections
 */

import { router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";
import {
  postToSinglePlatform,
  postToMultiplePlatforms,
  getPostHistory,
  deletePost,
  type Platform,
} from "../services/platformPosting";
import { db } from "../db";
import { platformCredentials } from "../../drizzle/schema-multiplatform";
import { eq, and } from "drizzle-orm";

// Creator-only procedure
const creatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "creator" && ctx.user.role !== "king" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Creator access required" });
  }
  return next({ ctx });
});

const platformEnum = z.enum(["tiktok", "instagram", "youtube", "twitter", "facebook", "linkedin", "pinterest", "snapchat"]);
const contentTypeEnum = z.enum(["text", "image", "video", "carousel", "story", "reel", "short"]);

export const platformPostingRouter = router({
  /**
   * Connect a platform account (OAuth)
   * In production, this would initiate OAuth flow and store tokens
   */
  connectPlatform: creatorProcedure
    .input(
      z.object({
        platform: platformEnum,
        accessToken: z.string(),
        refreshToken: z.string().optional(),
        platformUserId: z.string(),
        platformUsername: z.string().optional(),
        followerCount: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if already connected
        const [existing] = await db
          .select()
          .from(platformCredentials)
          .where(
            and(
              eq(platformCredentials.userId, ctx.user.id),
              eq(platformCredentials.platform, input.platform)
            )
          )
          .limit(1);

        if (existing) {
          // Update existing credentials
          await db
            .update(platformCredentials)
            .set({
              accessToken: input.accessToken,
              refreshToken: input.refreshToken,
              platformUserId: input.platformUserId,
              platformUsername: input.platformUsername,
              followerCount: input.followerCount,
              status: "active",
              lastSyncedAt: new Date(),
            })
            .where(eq(platformCredentials.id, existing.id));

          return { success: true, credentialId: existing.id };
        }

        // Create new credential
        const [inserted] = await db
          .insert(platformCredentials)
          .values({
            userId: ctx.user.id,
            platform: input.platform,
            accessToken: input.accessToken,
            refreshToken: input.refreshToken,
            platformUserId: input.platformUserId,
            platformUsername: input.platformUsername,
            followerCount: input.followerCount,
            status: "active",
          })
          .$returningId();

        return { success: true, credentialId: inserted.id };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to connect ${input.platform}: ${error.message}`,
        });
      }
    }),

  /**
   * Disconnect a platform account
   */
  disconnectPlatform: creatorProcedure
    .input(z.object({ platform: platformEnum }))
    .mutation(async ({ ctx, input }) => {
      try {
        await db
          .update(platformCredentials)
          .set({ status: "revoked" })
          .where(
            and(
              eq(platformCredentials.userId, ctx.user.id),
              eq(platformCredentials.platform, input.platform)
            )
          );

        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to disconnect ${input.platform}: ${error.message}`,
        });
      }
    }),

  /**
   * Get connected platforms for current user
   */
  getConnectedPlatforms: creatorProcedure.query(async ({ ctx }) => {
    return await db
      .select()
      .from(platformCredentials)
      .where(
        and(
          eq(platformCredentials.userId, ctx.user.id),
          eq(platformCredentials.status, "active")
        )
      );
  }),

  /**
   * Post to a single platform
   */
  postToSinglePlatform: creatorProcedure
    .input(
      z.object({
        platform: platformEnum,
        contentType: contentTypeEnum,
        caption: z.string().optional(),
        hashtags: z.string().optional(),
        mediaUrls: z.array(z.string()).optional(),
        platformSettings: z.any().optional(),
        scheduledFor: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await postToSinglePlatform({
        userId: ctx.user.id,
        ...input,
      });

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Post failed",
        });
      }

      return result;
    }),

  /**
   * Post to multiple platforms (batch posting)
   */
  postToMultiplePlatforms: creatorProcedure
    .input(
      z.object({
        platforms: z.array(platformEnum),
        contentType: contentTypeEnum,
        caption: z.string().optional(),
        hashtags: z.string().optional(),
        mediaUrls: z.array(z.string()).optional(),
        platformSettings: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { platforms, ...content } = input;
      const results = await postToMultiplePlatforms(ctx.user.id, platforms as Platform[], content);

      // Check if any failed
      const failures = Object.entries(results).filter(([_, r]) => !r.success);
      if (failures.length > 0) {
        const errorMessages = failures.map(([platform, r]) => `${platform}: ${r.error}`).join("; ");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Some posts failed: ${errorMessages}`,
        });
      }

      return results;
    }),

  /**
   * Get post history
   */
  getPostHistory: creatorProcedure
    .input(z.object({ platform: platformEnum.optional() }))
    .query(async ({ ctx, input }) => {
      return await getPostHistory(ctx.user.id, input.platform as Platform | undefined);
    }),

  /**
   * Delete a post
   */
  deletePost: creatorProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await deletePost(input.postId, ctx.user.id);

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Delete failed",
        });
      }

      return result;
    }),
});
