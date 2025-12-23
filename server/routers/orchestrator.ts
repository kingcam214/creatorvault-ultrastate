/**
 * Content Orchestrator tRPC Router
 * 
 * Exposes the unified content orchestration pipeline to the frontend.
 * This is the SINGLE API for all content creation, optimization, and distribution.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  orchestrateContent,
  getContentById,
  getOrchestrationRun,
  getUserContent,
  type UnifiedContentInput,
} from "../services/contentOrchestrator";

/**
 * Input validation schema
 */
const UnifiedContentInputSchema = z.object({
  // Core content
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  body: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(["image", "video", "audio", "text"]).optional(),
  
  // Metadata
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  niche: z.string().optional(),
  duration: z.number().optional(),
  
  // Distribution
  targetPlatforms: z.array(z.enum(["youtube", "tiktok", "instagram", "twitter", "facebook", "linkedin", "pinterest"])).min(1),
  publishStrategy: z.enum(["immediate", "scheduled", "draft"]),
  scheduledFor: z.date().optional(),
  timezone: z.string().optional(),
  
  // Optimization preferences
  optimizationLevel: z.enum(["none", "basic", "aggressive"]).optional(),
  generateThumbnail: z.boolean().optional(),
  generateAd: z.boolean().optional(),
  runViralAnalysis: z.boolean().optional(),
});

export const orchestratorRouter = router({
  /**
   * Orchestrate Content
   * 
   * Main entry point for content creation.
   * Runs complete pipeline: optimization → asset generation → platform adaptation → distribution.
   */
  orchestrate: protectedProcedure
    .input(UnifiedContentInputSchema)
    .mutation(async ({ ctx, input }) => {
      const contentInput: UnifiedContentInput = {
        userId: ctx.user.id,
        ...input,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
      };
      
      return orchestrateContent(contentInput);
    }),
  
  /**
   * Get Content By ID
   * 
   * Retrieves unified content record with all details.
   */
  getContent: protectedProcedure
    .input(z.object({
      contentId: z.string(),
    }))
    .query(async ({ input }) => {
      return getContentById(input.contentId);
    }),
  
  /**
   * Get Orchestration Run
   * 
   * Retrieves orchestration run details (optimization results, assets, etc.).
   */
  getOrchestrationRun: protectedProcedure
    .input(z.object({
      orchestrationId: z.string(),
    }))
    .query(async ({ input }) => {
      const run = await getOrchestrationRun(input.orchestrationId);
      
      if (!run) return null;
      
      // Parse JSON fields
      return {
        ...run,
        optimizationResults: run.optimizationResults ? JSON.parse(run.optimizationResults as string) : null,
        generatedAssets: run.generatedAssets ? JSON.parse(run.generatedAssets as string) : null,
        platformAdaptations: run.platformAdaptations ? JSON.parse(run.platformAdaptations as string) : null,
      };
    }),
  
  /**
   * Get User Content
   * 
   * Retrieves all content created by the current user.
   */
  getUserContent: protectedProcedure
    .input(z.object({
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const allContent = await getUserContent(ctx.user.id);
      
      // Apply pagination
      const limit = input.limit || 20;
      const offset = input.offset || 0;
      
      return {
        content: allContent.slice(offset, offset + limit),
        total: allContent.length,
        hasMore: offset + limit < allContent.length,
      };
    }),
  
  /**
   * Get Content Stats
   * 
   * Returns statistics about user's content.
   */
  getContentStats: protectedProcedure
    .query(async ({ ctx }) => {
      const allContent = await getUserContent(ctx.user.id);
      
      const stats = {
        total: allContent.length,
        byStatus: {
          draft: 0,
          optimizing: 0,
          ready: 0,
          scheduled: 0,
          publishing: 0,
          published: 0,
          failed: 0,
        },
        byPlatform: {} as Record<string, number>,
        averageOptimizationLevel: "aggressive" as "none" | "basic" | "aggressive",
      };
      
      for (const content of allContent) {
        // Count by status
        stats.byStatus[content.status as keyof typeof stats.byStatus]++;
        
        // Count by platform
        const platforms = JSON.parse(content.targetPlatforms as string) as string[];
        for (const platform of platforms) {
          stats.byPlatform[platform] = (stats.byPlatform[platform] || 0) + 1;
        }
      }
      
      return stats;
    }),
});
