/**
 * Podcasting tRPC Router
 * Complete podcast production, distribution, and monetization API
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as podcastManagement from "../services/podcastManagement";
import * as audioProcessing from "../services/audioProcessing";
import * as podcastDistribution from "../services/podcastDistribution";
import * as podcastMonetization from "../services/podcastMonetization";
import * as podcastAnalytics from "../services/podcastAnalytics";
import { storagePut } from "../storage";

export const podcastingRouter = router({
  // ============ PODCAST MANAGEMENT ============

  createPodcast: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        category: z.string().optional(),
        language: z.string().optional(),
        explicit: z.boolean().optional(),
        author: z.string().optional(),
        email: z.string().email().optional(),
        website: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await podcastManagement.createPodcast({
        userId: ctx.user.id,
        ...input,
      });
    }),

  updatePodcast: protectedProcedure
    .input(
      z.object({
        podcastId: z.string().uuid(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        language: z.string().optional(),
        explicit: z.boolean().optional(),
        author: z.string().optional(),
        email: z.string().email().optional(),
        website: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { podcastId, ...updates } = input;
      return await podcastManagement.updatePodcast(podcastId, ctx.user.id, updates);
    }),

  getUserPodcasts: protectedProcedure.query(async ({ ctx }) => {
    return await podcastManagement.getUserPodcasts(ctx.user.id);
  }),

  getPodcast: protectedProcedure
    .input(z.object({ podcastId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return await podcastManagement.getPodcast(input.podcastId, ctx.user.id);
    }),

  deletePodcast: protectedProcedure
    .input(z.object({ podcastId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return await podcastManagement.deletePodcast(input.podcastId, ctx.user.id);
    }),

  // ============ EPISODE MANAGEMENT ============

  createEpisode: protectedProcedure
    .input(
      z.object({
        podcastId: z.string().uuid(),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        episodeNumber: z.number().int().positive().optional(),
        seasonNumber: z.number().int().positive().optional(),
        audioUrl: z.string().url().optional(),
        duration: z.number().int().positive().optional(),
        scheduledFor: z.date().optional(),
        keywords: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await podcastManagement.createEpisode({
        userId: ctx.user.id,
        ...input,
      });
    }),

  updateEpisode: protectedProcedure
    .input(
      z.object({
        episodeId: z.string().uuid(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        episodeNumber: z.number().int().positive().optional(),
        seasonNumber: z.number().int().positive().optional(),
        duration: z.number().int().positive().optional(),
        scheduledFor: z.date().optional(),
        keywords: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { episodeId, ...updates } = input;
      return await podcastManagement.updateEpisode(episodeId, ctx.user.id, updates);
    }),

  getPodcastEpisodes: protectedProcedure
    .input(z.object({ podcastId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return await podcastManagement.getPodcastEpisodes(input.podcastId, ctx.user.id);
    }),

  getEpisode: protectedProcedure
    .input(z.object({ episodeId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return await podcastManagement.getEpisode(input.episodeId, ctx.user.id);
    }),

  deleteEpisode: protectedProcedure
    .input(z.object({ episodeId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return await podcastManagement.deleteEpisode(input.episodeId, ctx.user.id);
    }),

  publishEpisode: protectedProcedure
    .input(z.object({ episodeId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return await podcastManagement.publishEpisode(input.episodeId, ctx.user.id);
    }),

  // ============ AUDIO PROCESSING ============

  uploadAudio: protectedProcedure
    .input(
      z.object({
        podcastId: z.string().uuid(),
        audioBase64: z.string(), // Base64 encoded audio
        filename: z.string(),
        processOptions: z
          .object({
            normalize: z.boolean().optional(),
            removeNoise: z.boolean().optional(),
            compressAudio: z.boolean().optional(),
            targetFormat: z.enum(["mp3", "wav", "ogg"]).optional(),
            bitrate: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Decode base64
      const audioBuffer = Buffer.from(input.audioBase64, "base64") as Buffer;

      // Process audio if options provided
      let processedBuffer = audioBuffer;
      let metadata = await audioProcessing.getAudioMetadata(audioBuffer);

      if (input.processOptions) {
        const result = await audioProcessing.processAudio(audioBuffer, input.processOptions);
        processedBuffer = result.processedBuffer;
        metadata = result.metadata;
      }

      // Upload to S3
      const fileKey = `podcasts/${input.podcastId}/audio/${Date.now()}-${input.filename}`;
      const { url } = await storagePut(fileKey, processedBuffer, "audio/mpeg");

      return {
        audioUrl: url,
        metadata,
      };
    }),

  getAudioMetadata: protectedProcedure
    .input(z.object({ audioBase64: z.string() }))
    .query(async ({ input }) => {
      const audioBuffer = Buffer.from(input.audioBase64, "base64");
      return await audioProcessing.getAudioMetadata(audioBuffer);
    }),

  // ============ DISTRIBUTION ============

  generateRSSFeed: protectedProcedure
    .input(z.object({ podcastId: z.string().uuid() }))
    .query(async ({ input }) => {
      return await podcastDistribution.generateRSSFeed({ podcastId: input.podcastId });
    }),

  submitToApplePodcasts: protectedProcedure
    .input(z.object({ podcastId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const rssFeedUrl = podcastManagement.generateRssFeedUrl(input.podcastId);
      await podcastManagement.updateRssFeedUrl(input.podcastId, ctx.user.id);
      return await podcastDistribution.submitToApplePodcasts(input.podcastId, rssFeedUrl);
    }),

  submitToSpotify: protectedProcedure
    .input(z.object({ podcastId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const rssFeedUrl = podcastManagement.generateRssFeedUrl(input.podcastId);
      await podcastManagement.updateRssFeedUrl(input.podcastId, ctx.user.id);
      return await podcastDistribution.submitToSpotify(input.podcastId, rssFeedUrl);
    }),

  submitToGooglePodcasts: protectedProcedure
    .input(z.object({ podcastId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const rssFeedUrl = podcastManagement.generateRssFeedUrl(input.podcastId);
      await podcastManagement.updateRssFeedUrl(input.podcastId, ctx.user.id);
      return await podcastDistribution.submitToGooglePodcasts(input.podcastId, rssFeedUrl);
    }),

  submitToAmazonMusic: protectedProcedure
    .input(z.object({ podcastId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const rssFeedUrl = podcastManagement.generateRssFeedUrl(input.podcastId);
      await podcastManagement.updateRssFeedUrl(input.podcastId, ctx.user.id);
      return await podcastDistribution.submitToAmazonMusic(input.podcastId, rssFeedUrl);
    }),

  getPlatformStatus: protectedProcedure
    .input(z.object({ podcastId: z.string().uuid() }))
    .query(async ({ input }) => {
      return await podcastDistribution.getPlatformStatus(input.podcastId);
    }),

  syncEpisodeToAllPlatforms: protectedProcedure
    .input(z.object({ episodeId: z.string().uuid(), podcastId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return await podcastDistribution.syncEpisodeToAllPlatforms(input.episodeId, input.podcastId);
    }),

  // ============ MONETIZATION ============

  insertAd: protectedProcedure
    .input(
      z.object({
        episodeId: z.string().uuid(),
        podcastId: z.string().uuid(),
        sponsorId: z.string().uuid(),
        adPlacement: z.enum(["pre_roll", "mid_roll", "post_roll"]),
        adTimestamp: z.number().int().optional(),
        adDuration: z.number().int().positive(),
        adAudioUrl: z.string().url(),
        revenue: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await podcastMonetization.insertAd({
        userId: ctx.user.id,
        ...input,
      });
    }),

  getEpisodeAds: protectedProcedure
    .input(z.object({ episodeId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return await podcastMonetization.getEpisodeAds(input.episodeId, ctx.user.id);
    }),

  removeAd: protectedProcedure
    .input(z.object({ monetizationId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return await podcastMonetization.removeAd(input.monetizationId, ctx.user.id);
    }),

  createSponsor: protectedProcedure
    .input(
      z.object({
        sponsorName: z.string().min(1).max(255),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        website: z.string().url().optional(),
        dealTerms: z.string().optional(),
        commissionRate: z.number().min(0).max(100).optional(),
        paymentTerms: z.string().optional(),
        contractStartDate: z.date().optional(),
        contractEndDate: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await podcastMonetization.createSponsor(ctx.user.id, input);
    }),

  updateSponsor: protectedProcedure
    .input(
      z.object({
        sponsorId: z.string().uuid(),
        sponsorName: z.string().min(1).max(255).optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        website: z.string().url().optional(),
        dealTerms: z.string().optional(),
        commissionRate: z.number().min(0).max(100).optional(),
        paymentTerms: z.string().optional(),
        contractStartDate: z.date().optional(),
        contractEndDate: z.date().optional(),
        status: z.enum(["prospect", "negotiating", "active", "paused", "ended"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { sponsorId, ...updates } = input;
      return await podcastMonetization.updateSponsor(sponsorId, ctx.user.id, updates);
    }),

  getUserSponsors: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      return await podcastMonetization.getUserSponsors(ctx.user.id, input.status);
    }),

  deleteSponsor: protectedProcedure
    .input(z.object({ sponsorId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return await podcastMonetization.deleteSponsor(input.sponsorId, ctx.user.id);
    }),

  getPodcastRevenue: protectedProcedure
    .input(
      z.object({
        podcastId: z.string().uuid(),
        dateRange: z
          .object({
            start: z.date(),
            end: z.date(),
          })
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await podcastMonetization.getPodcastRevenue(input.podcastId, ctx.user.id, input.dateRange);
    }),

  getRevenueBySponsor: protectedProcedure
    .input(
      z.object({
        dateRange: z
          .object({
            start: z.date(),
            end: z.date(),
          })
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await podcastMonetization.getRevenueBySponsor(ctx.user.id, input.dateRange);
    }),

  // ============ ANALYTICS ============

  getPodcastOverview: protectedProcedure
    .input(
      z.object({
        podcastId: z.string().uuid(),
        timeRange: z
          .object({
            start: z.date(),
            end: z.date(),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      return await podcastAnalytics.getPodcastOverview(input.podcastId, input.timeRange);
    }),

  getPlatformBreakdown: protectedProcedure
    .input(
      z.object({
        podcastId: z.string().uuid(),
        timeRange: z
          .object({
            start: z.date(),
            end: z.date(),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      return await podcastAnalytics.getPlatformBreakdown(input.podcastId, input.timeRange);
    }),

  getTopEpisodes: protectedProcedure
    .input(
      z.object({
        podcastId: z.string().uuid(),
        limit: z.number().int().positive().optional(),
        timeRange: z
          .object({
            start: z.date(),
            end: z.date(),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      return await podcastAnalytics.getTopEpisodes(input.podcastId, input.limit, input.timeRange);
    }),

  getGrowthTrends: protectedProcedure
    .input(
      z.object({
        podcastId: z.string().uuid(),
        days: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      return await podcastAnalytics.getGrowthTrends(input.podcastId, input.days);
    }),

  calculateGrowthRate: protectedProcedure
    .input(
      z.object({
        podcastId: z.string().uuid(),
        days: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      return await podcastAnalytics.calculateGrowthRate(input.podcastId, input.days);
    }),
});
