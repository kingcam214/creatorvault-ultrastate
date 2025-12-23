/**
 * OAuth Callback Router
 * Handles OAuth callbacks from social media platforms
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  generateAuthUrl,
  exchangeCodeForToken,
  getPlatformUserInfo,
  type PlatformOAuthConfig,
} from "../_core/oauth-platforms";
import { db } from "../db";
import { platformCredentials } from "../../drizzle/schema-multiplatform";
import { eq, and } from "drizzle-orm";

const PLATFORM_SCHEMA = z.enum(["tiktok", "instagram", "youtube", "twitter", "facebook"]);

export const oauthCallbackRouter = router({
  /**
   * Step 1: Generate OAuth authorization URL
   */
  getAuthUrl: protectedProcedure
    .input(
      z.object({
        platform: PLATFORM_SCHEMA,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate random state for CSRF protection
      const state = `${ctx.user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Store state in session or database for verification
      // For now, we'll encode userId in state
      const authUrl = generateAuthUrl(input.platform, state);

      return {
        authUrl,
        state,
      };
    }),

  /**
   * Step 2: Handle OAuth callback and exchange code for token
   */
  handleCallback: protectedProcedure
    .input(
      z.object({
        platform: PLATFORM_SCHEMA,
        code: z.string(),
        state: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify state contains user ID (basic CSRF protection)
        if (!input.state.startsWith(ctx.user.id.toString())) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Invalid state parameter",
          });
        }

        // Exchange code for access token
        const tokenData = await exchangeCodeForToken(input.platform, input.code);

        // Get user info from platform
        const userInfo = await getPlatformUserInfo(input.platform, tokenData.accessToken);

        // Calculate token expiration
        const tokenExpiresAt = tokenData.expiresIn
          ? new Date(Date.now() + tokenData.expiresIn * 1000)
          : null;

        // Check if credential already exists
        const existing = await db
          .select()
          .from(platformCredentials)
          .where(
            and(
              eq(platformCredentials.userId, ctx.user.id),
              eq(platformCredentials.platform, input.platform)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Update existing credential
          await db
            .update(platformCredentials)
            .set({
              accessToken: tokenData.accessToken,
              refreshToken: tokenData.refreshToken,
              tokenExpiresAt,
              platformUserId: userInfo.platformUserId,
              platformUsername: userInfo.platformUsername,
              platformDisplayName: userInfo.platformDisplayName,
              followerCount: userInfo.followerCount,
              updatedAt: new Date(),
            })
            .where(eq(platformCredentials.id, existing[0].id));
        } else {
          // Insert new credential
          await db.insert(platformCredentials).values({
            userId: ctx.user.id,
            platform: input.platform,
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            tokenExpiresAt,
            platformUserId: userInfo.platformUserId,
            platformUsername: userInfo.platformUsername,
            platformDisplayName: userInfo.platformDisplayName,
            followerCount: userInfo.followerCount,
          });
        }

        return {
          success: true,
          platform: input.platform,
          username: userInfo.platformUsername || userInfo.platformDisplayName,
          followerCount: userInfo.followerCount,
        };
      } catch (error) {
        console.error(`OAuth callback error for ${input.platform}:`, error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "OAuth callback failed",
        });
      }
    }),

  /**
   * Get connection status for all platforms
   */
  getConnectionStatus: protectedProcedure.query(async ({ ctx }) => {
    const credentials = await db
      .select({
        platform: platformCredentials.platform,
        platformUsername: platformCredentials.platformUsername,
        platformDisplayName: platformCredentials.platformDisplayName,
        followerCount: platformCredentials.followerCount,
        tokenExpiresAt: platformCredentials.tokenExpiresAt,
        connectedAt: platformCredentials.createdAt,
      })
      .from(platformCredentials)
      .where(eq(platformCredentials.userId, ctx.user.id));

    const allPlatforms: Array<keyof PlatformOAuthConfig> = [
      "tiktok",
      "instagram",
      "youtube",
      "twitter",
      "facebook",
    ];

    return allPlatforms.map((platform) => {
      const cred = credentials.find((c) => c.platform === platform);
      return {
        platform,
        connected: !!cred,
        username: cred?.platformUsername || cred?.platformDisplayName,
        followerCount: cred?.followerCount,
        tokenExpiresAt: cred?.tokenExpiresAt,
        connectedAt: cred?.connectedAt,
      };
    });
  }),
});
