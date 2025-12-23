/**
 * VaultLive tRPC Router
 * 
 * Live streaming system with WebRTC, tipping, and donations
 * - Stream management (create, start, end)
 * - Viewer tracking
 * - Tips and donations with 85/15 revenue split
 * - Real-time stats
 */

import { z } from "zod";
import { router } from "../_core/trpc";
import { protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as dbVaultLive from "../db-vaultlive";

// Creator-only procedure (includes influencers and celebrities)
const creatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowedRoles = ["creator", "influencer", "celebrity", "king", "admin"];
  if (!allowedRoles.includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Creator access required" });
  }
  return next({ ctx });
});

export const vaultLiveRouter = router({
  // ============================================================================
  // STREAM MANAGEMENT
  // ============================================================================

  /**
   * Create a new live stream
   */
  createStream: creatorProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        thumbnailUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const stream = await dbVaultLive.createStream({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        thumbnailUrl: input.thumbnailUrl,
      });

      return stream;
    }),

  /**
   * Get stream by ID
   */
  getStream: protectedProcedure
    .input(z.object({ streamId: z.number() }))
    .query(async ({ input }) => {
      const stream = await dbVaultLive.getStreamById(input.streamId);
      if (!stream) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stream not found" });
      }
      return stream;
    }),

  /**
   * Get my streams
   */
  getMyStreams: creatorProcedure.query(async ({ ctx }) => {
    return await dbVaultLive.getStreamsByUserId(ctx.user.id);
  }),

  /**
   * Get all live streams
   */
  getLiveStreams: protectedProcedure.query(async () => {
    return await dbVaultLive.getLiveStreams();
  }),

  /**
   * Start a stream
   */
  startStream: creatorProcedure
    .input(z.object({ streamId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const stream = await dbVaultLive.getStreamById(input.streamId);
      if (!stream) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stream not found" });
      }
      if (stream.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your stream" });
      }

      await dbVaultLive.startStream(input.streamId);
      return { success: true };
    }),

  /**
   * End a stream
   */
  endStream: creatorProcedure
    .input(z.object({ streamId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const stream = await dbVaultLive.getStreamById(input.streamId);
      if (!stream) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stream not found" });
      }
      if (stream.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your stream" });
      }

      await dbVaultLive.endStream(input.streamId);
      return { success: true };
    }),

  /**
   * Update viewer count
   */
  updateViewerCount: protectedProcedure
    .input(z.object({ streamId: z.number(), count: z.number() }))
    .mutation(async ({ input }) => {
      await dbVaultLive.updateViewerCount(input.streamId, input.count);
      return { success: true };
    }),

  // ============================================================================
  // VIEWER TRACKING
  // ============================================================================

  /**
   * Record viewer joining
   */
  recordViewerJoin: protectedProcedure
    .input(z.object({ streamId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const viewerId = await dbVaultLive.recordViewerJoin(input.streamId, ctx.user.id);
      return { viewerId };
    }),

  /**
   * Record viewer leaving
   */
  recordViewerLeave: protectedProcedure
    .input(z.object({ viewerId: z.number(), watchDuration: z.number() }))
    .mutation(async ({ input }) => {
      await dbVaultLive.recordViewerLeave(input.viewerId, input.watchDuration);
      return { success: true };
    }),

  /**
   * Get current viewer count
   */
  getCurrentViewerCount: protectedProcedure
    .input(z.object({ streamId: z.number() }))
    .query(async ({ input }) => {
      const count = await dbVaultLive.getCurrentViewerCount(input.streamId);
      return { count };
    }),

  /**
   * Get stream viewers
   */
  getStreamViewers: protectedProcedure
    .input(z.object({ streamId: z.number() }))
    .query(async ({ input }) => {
      return await dbVaultLive.getStreamViewers(input.streamId);
    }),

  // ============================================================================
  // TIPS & DONATIONS
  // ============================================================================

  /**
   * Send a tip (85% creator, 15% platform)
   */
  sendTip: protectedProcedure
    .input(
      z.object({
        streamId: z.number(),
        amount: z.number().positive(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tip = await dbVaultLive.recordTip(
        input.streamId,
        ctx.user.id,
        input.amount,
        input.message
      );

      return tip;
    }),

  /**
   * Get tips for a stream
   */
  getStreamTips: protectedProcedure
    .input(z.object({ streamId: z.number() }))
    .query(async ({ input }) => {
      return await dbVaultLive.getStreamTips(input.streamId);
    }),

  /**
   * Get my tips (sent by me)
   */
  getMyTips: protectedProcedure.query(async ({ ctx }) => {
    return await dbVaultLive.getTipsByUserId(ctx.user.id);
  }),

  /**
   * Send a donation (85% creator, 15% platform)
   */
  sendDonation: protectedProcedure
    .input(
      z.object({
        streamId: z.number(),
        amount: z.number().positive(),
        paymentMethod: z.string(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const donation = await dbVaultLive.recordDonation(
        input.streamId,
        ctx.user.id,
        input.amount,
        input.paymentMethod,
        input.message
      );

      return donation;
    }),

  /**
   * Update donation status
   */
  updateDonationStatus: protectedProcedure
    .input(
      z.object({
        donationId: z.number(),
        status: z.enum(["pending", "completed", "failed"]),
      })
    )
    .mutation(async ({ input }) => {
      await dbVaultLive.updateDonationStatus(input.donationId, input.status);
      return { success: true };
    }),

  /**
   * Get donations for a stream
   */
  getStreamDonations: protectedProcedure
    .input(z.object({ streamId: z.number() }))
    .query(async ({ input }) => {
      return await dbVaultLive.getStreamDonations(input.streamId);
    }),

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Get stream statistics
   */
  getStreamStats: creatorProcedure.query(async ({ ctx }) => {
    return await dbVaultLive.getStreamStats(ctx.user.id);
  }),

  /**
   * Get creator statistics for influencer dashboard
   */
  getCreatorStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await dbVaultLive.getStreamStats(ctx.user.id);
    const allStreams = await dbVaultLive.getStreamsByUserId(ctx.user.id);
    const recentStreams = allStreams.slice(0, 5); // Get 5 most recent
    
    // Calculate total revenue from stats
    const totalRevenue = (parseFloat(stats.totalTips) + parseFloat(stats.totalDonations)) * 100; // Convert to cents
    
    return {
      ...stats,
      totalRevenue,
      recentStreams,
    };
  }),
});
