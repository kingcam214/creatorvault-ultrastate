/**
 * Podcast Studio tRPC Router
 * 
 * Unified router for all podcast services:
 * - Management (create shows/episodes)
 * - Distribution (RSS, Apple, Spotify)
 * - Monetization (ads, sponsors)
 * - Analytics (metrics, growth)
 * - Audio Processing (enhancement, clips)
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as podcastManagement from "../services/podcastManagement";
import * as podcastDistribution from "../services/podcastDistribution";
import * as podcastMonetization from "../services/podcastMonetization";
import * as podcastAnalytics from "../services/podcastAnalytics";
import * as audioProcessing from "../services/audioProcessing";

export const podcastStudioRouter = router({
  // ============ MANAGEMENT ============
  
  /**
   * Create a podcast show
   */
  createShow: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
        category: z.string(),
        coverImageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await podcastManagement.createPodcast({
        creatorId: ctx.user.id,
        title: input.title,
        description: input.description,
        category: input.category,
        coverImageUrl: input.coverImageUrl,
      });
    }),

  /**
   * Get my podcast shows
   */
  getMyShows: protectedProcedure.query(async ({ ctx }) => {
    return await podcastManagement.getUserPodcasts(ctx.user.id);
  }),

  /**
   * Create an episode
   */
  createEpisode: protectedProcedure
    .input(
      z.object({
        podcastId: z.number(),
        title: z.string(),
        description: z.string(),
        audioUrl: z.string(),
        duration: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await podcastManagement.createEpisode(input);
    }),

  /**
   * Get episodes for a show
   */
  getEpisodes: protectedProcedure
    .input(z.object({ podcastId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await podcastManagement.getPodcastEpisodes(input.podcastId, ctx.user.id);
    }),

  /**
   * Get RSS feed URL
   */
  getRSSFeed: protectedProcedure
    .input(z.object({ podcastId: z.string() }))
    .query(async ({ input }) => {
      return podcastManagement.generateRssFeedUrl(input.podcastId);
    }),

  // ============ DISTRIBUTION ============

  /**
   * Submit to Apple Podcasts
   */
  submitToApple: protectedProcedure
    .input(z.object({ podcastId: z.number() }))
    .mutation(async ({ input }) => {
      return await podcastDistribution.submitToApplePodcasts(input.podcastId);
    }),

  /**
   * Submit to Spotify
   */
  submitToSpotify: protectedProcedure
    .input(z.object({ podcastId: z.number() }))
    .mutation(async ({ input }) => {
      return await podcastDistribution.submitToSpotify(input.podcastId);
    }),

  /**
   * Get distribution status
   */
  getDistributionStatus: protectedProcedure
    .input(z.object({ podcastId: z.number() }))
    .query(async ({ input }) => {
      return await podcastDistribution.getDistributionStatus(input.podcastId);
    }),

  // ============ MONETIZATION ============

  /**
   * Insert dynamic ad
   */
  insertAd: protectedProcedure
    .input(
      z.object({
        episodeId: z.number(),
        adType: z.enum(["pre-roll", "mid-roll", "post-roll"]),
        adUrl: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await podcastMonetization.insertDynamicAd(
        input.episodeId,
        input.adType,
        input.adUrl
      );
    }),

  /**
   * Match sponsor
   */
  matchSponsor: protectedProcedure
    .input(z.object({ podcastId: z.number() }))
    .mutation(async ({ input }) => {
      return await podcastMonetization.matchSponsor(input.podcastId);
    }),

  /**
   * Get monetization stats
   */
  getMonetizationStats: protectedProcedure
    .input(z.object({ podcastId: z.number() }))
    .query(async ({ input }) => {
      return await podcastMonetization.trackRevenue(input.podcastId);
    }),

  // ============ ANALYTICS ============

  /**
   * Get podcast analytics
   */
  getAnalytics: protectedProcedure
    .input(z.object({ podcastId: z.number() }))
    .query(async ({ input }) => {
      return await podcastAnalytics.aggregateCrossPlatformMetrics(input.podcastId);
    }),

  /**
   * Get growth trends
   */
  getGrowthTrends: protectedProcedure
    .input(z.object({ podcastId: z.number() }))
    .query(async ({ input }) => {
      return await podcastAnalytics.getGrowthTrends(input.podcastId);
    }),

  // ============ AUDIO PROCESSING ============

  /**
   * Enhance audio
   */
  enhanceAudio: protectedProcedure
    .input(
      z.object({
        audioUrl: z.string(),
        options: z.object({
          noiseReduction: z.boolean().optional(),
          normalization: z.boolean().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await audioProcessing.enhanceAudio(input.audioUrl, input.options);
    }),

  /**
   * Extract clip
   */
  extractClip: protectedProcedure
    .input(
      z.object({
        audioUrl: z.string(),
        startTime: z.number(),
        endTime: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await audioProcessing.extractClip(
        input.audioUrl,
        input.startTime,
        input.endTime
      );
    }),

  /**
   * Generate waveform
   */
  generateWaveform: protectedProcedure
    .input(z.object({ audioUrl: z.string() }))
    .mutation(async ({ input }) => {
      return await audioProcessing.generateWaveform(input.audioUrl);
    }),
});
