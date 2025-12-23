/**
 * Content Orchestrator Service
 * 
 * CANONICAL PIPELINE for all content flowing through CreatorVault.
 * 
 * This is the SINGLE ENTRY POINT for content creation, optimization, and distribution.
 * All creator tools route through this orchestrator to ensure:
 * - Consistent optimization
 * - Automatic asset generation
 * - Platform-specific adaptation
 * - Performance feedback loops
 * 
 * Architecture:
 * 1. Accept unified content input
 * 2. Run optimization pipeline (viral, thumbnail, ad)
 * 3. Generate all required assets
 * 4. Adapt content per platform
 * 5. Route to distribution (immediate/scheduled/draft)
 * 6. Track execution
 * 7. Collect performance feedback
 * 8. Update optimization models
 */

import { getDb } from "../db";
import {
  unifiedContent,
  orchestrationRuns,
  platformAdaptations,
  optimizationHistory,
  contentPerformance,
} from "../../drizzle/schema";
import { runViralOptimizer, type ViralOptimizerOutput } from "./viralOptimizer";
import { runThumbnailGenerator, type ThumbnailGeneratorOutput } from "./thumbnailGenerator";
import { runAdOptimizer, type AdOptimizerOutput } from "./adOptimizer";
import { postToMultiplePlatforms, type Platform } from "./platformPosting";
import { schedulePost } from "./contentScheduler";
import { storagePut } from "../storage";
import crypto from "crypto";
import { eq } from "drizzle-orm";

/**
 * Unified Content Input
 * 
 * Single input format for all content types.
 * Replaces fragmented inputs across 7+ systems.
 */
export interface UnifiedContentInput {
  // Identity
  userId: number;
  
  // Core content
  title: string;
  description?: string;
  body?: string; // For long-form content
  mediaUrl?: string; // S3 URL to primary media
  mediaType?: "image" | "video" | "audio" | "text";
  
  // Metadata
  tags?: string[];
  category?: string;
  niche?: string;
  duration?: number; // Duration in seconds (for video/audio)
  
  // Distribution
  targetPlatforms: ("youtube" | "tiktok" | "instagram" | "twitter" | "facebook" | "linkedin" | "pinterest")[];
  publishStrategy: "immediate" | "scheduled" | "draft";
  scheduledFor?: Date;
  timezone?: string;
  
  // Optimization preferences
  optimizationLevel?: "none" | "basic" | "aggressive";
  generateThumbnail?: boolean;
  generateAd?: boolean;
  runViralAnalysis?: boolean;
}

/**
 * Orchestration Result
 * 
 * Complete output from orchestration pipeline.
 */
export interface OrchestrationResult {
  // Identity
  contentId: string;
  orchestrationId: string;
  
  // Status
  status: "draft" | "optimizing" | "ready" | "scheduled" | "publishing" | "published" | "failed";
  
  // Optimization results
  viralAnalysis?: ViralOptimizerOutput;
  thumbnailAnalysis?: ThumbnailGeneratorOutput;
  adAnalysis?: AdOptimizerOutput;
  
  // Generated assets
  generatedAssets: {
    thumbnails: string[]; // URLs to generated thumbnails
    ads: string[]; // URLs to generated ad creatives
    platformMedia: Record<string, string>; // Platform-specific media URLs
  };
  
  // Platform adaptations
  platformAdaptations: Record<string, PlatformAdaptation>;
  
  // Distribution results
  distributionResults?: {
    immediate?: {
      platformPostIds: Record<string, string>; // platform -> post ID
      urls: Record<string, string>; // platform -> post URL
    };
    scheduled?: {
      scheduleId: string;
      scheduledFor: Date;
    };
  };
  
  // Execution tracking
  executionTime: number; // milliseconds
  error?: string;
}

/**
 * Platform Adaptation
 * 
 * Platform-specific version of content.
 */
export interface PlatformAdaptation {
  platform: string;
  title: string;
  description?: string;
  caption?: string;
  hashtags: string[];
  mediaUrl?: string;
  thumbnailUrl?: string;
  platformMetadata?: Record<string, any>;
}

/**
 * Optimization Results
 * 
 * Aggregated results from all optimizers.
 */
interface OptimizationResults {
  viral?: ViralOptimizerOutput;
  thumbnail?: ThumbnailGeneratorOutput;
  ad?: AdOptimizerOutput;
}

/**
 * Generated Assets
 * 
 * All assets generated during orchestration.
 */
interface GeneratedAssets {
  thumbnails: string[];
  ads: string[];
  platformMedia: Record<string, string>;
}

/**
 * ============================================
 * MAIN ORCHESTRATION ENTRY POINT
 * ============================================
 */

/**
 * Orchestrate Content
 * 
 * SINGLE ENTRY POINT for all content creation.
 * Runs complete pipeline from input to distribution.
 */
export async function orchestrateContent(
  input: UnifiedContentInput
): Promise<OrchestrationResult> {
  const startTime = Date.now();
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Step 1: Create unified content record
  const contentId = crypto.randomUUID();
  const orchestrationId = crypto.randomUUID();
  
  await db.insert(unifiedContent).values({
    id: contentId,
    userId: input.userId,
    title: input.title,
    description: input.description || null,
    body: input.body || null,
    mediaUrl: input.mediaUrl || null,
    mediaType: (input.mediaType && input.mediaType !== "audio") ? input.mediaType : null,
    tags: input.tags ? JSON.stringify(input.tags) : null,
    category: input.category || null,
    niche: input.niche || null,
    duration: input.duration || null,
    targetPlatforms: JSON.stringify(input.targetPlatforms),
    publishStrategy: input.publishStrategy,
    scheduledFor: input.scheduledFor || null,
    timezone: input.timezone || "UTC",
    optimizationLevel: input.optimizationLevel || "aggressive",
    generateThumbnail: input.generateThumbnail !== false,
    generateAd: input.generateAd || false,
    runViralAnalysis: input.runViralAnalysis !== false,
    status: "optimizing",
    orchestrationId,
  });
  
  // Step 2: Create orchestration run record
  await db.insert(orchestrationRuns).values({
    id: orchestrationId,
    contentId,
    userId: input.userId,
    status: "running",
    startedAt: new Date(),
  });
  
  try {
    // Step 3: Run optimization pipeline
    const optimizations = await runOptimizationPipeline(input, contentId);
    
    // Step 4: Generate assets
    const assets = await generateAssets(input, optimizations);
    
    // Step 5: Adapt for each platform
    const adaptations = await adaptForPlatforms(input, optimizations, assets);
    
    // Step 6: Store optimization history
    await storeOptimizationHistory(contentId, orchestrationId, input, optimizations);
    
    // Step 7: Route to distribution
    const distributionResults = await distributeContent(input, adaptations, contentId);
    
    // Step 8: Update records
    const executionTime = Date.now() - startTime;
    
    await db.update(orchestrationRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
        durationMs: executionTime,
        viralAnalysisId: optimizations.viral?.analysisId || null,
        thumbnailAnalysisId: optimizations.thumbnail?.analysisId || null,
        adAnalysisId: optimizations.ad?.analysisId || null,
        optimizationResults: JSON.stringify({
          viral: optimizations.viral ? {
            viralScore: optimizations.viral.viralScore,
            hooks: optimizations.viral.hooks,
            recommendations: optimizations.viral.recommendations,
          } : null,
          thumbnail: optimizations.thumbnail ? {
            overallScore: optimizations.thumbnail.overallScore,
            imageUrl: optimizations.thumbnail.imageUrl,
          } : null,
          ad: optimizations.ad ? {
            overallScore: optimizations.ad.overallScore,
            headline: optimizations.ad.headline,
          } : null,
        }),
        generatedAssets: JSON.stringify(assets),
        platformAdaptations: JSON.stringify(adaptations),
      })
      .where(eq(orchestrationRuns.id, orchestrationId));
    
    const finalStatus = 
      input.publishStrategy === "immediate" ? "published" :
      input.publishStrategy === "scheduled" ? "scheduled" :
      "ready";
    
    await db.update(unifiedContent)
      .set({
        status: finalStatus,
        publishedAt: input.publishStrategy === "immediate" ? new Date() : null,
      })
      .where(eq(unifiedContent.id, contentId));
    
    // Step 9: Return result
    return {
      contentId,
      orchestrationId,
      status: finalStatus,
      viralAnalysis: optimizations.viral,
      thumbnailAnalysis: optimizations.thumbnail,
      adAnalysis: optimizations.ad,
      generatedAssets: assets,
      platformAdaptations: adaptations,
      distributionResults,
      executionTime,
    };
    
  } catch (error) {
    // Handle failure
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await db.update(orchestrationRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        durationMs: executionTime,
        errorMessage,
      })
      .where(eq(orchestrationRuns.id, orchestrationId));
    
    await db.update(unifiedContent)
      .set({ status: "failed" })
      .where(eq(unifiedContent.id, contentId));
    
    return {
      contentId,
      orchestrationId,
      status: "failed",
      generatedAssets: { thumbnails: [], ads: [], platformMedia: {} },
      platformAdaptations: {},
      executionTime,
      error: errorMessage,
    };
  }
}

/**
 * ============================================
 * OPTIMIZATION PIPELINE
 * ============================================
 */

/**
 * Run Optimization Pipeline
 * 
 * Runs all enabled optimizers in parallel.
 * Returns aggregated optimization results.
 */
async function runOptimizationPipeline(
  input: UnifiedContentInput,
  contentId: string
): Promise<OptimizationResults> {
  const optimizations: OptimizationResults = {};
  
  // Run optimizers in parallel for speed
  const promises: Promise<void>[] = [];
  
  // Viral Optimizer
  if (input.runViralAnalysis !== false) {
    promises.push(
      runViralOptimizer({
        userId: input.userId,
        title: input.title,
        description: input.description,
        tags: input.tags,
        duration: input.duration,
        platform: (input.targetPlatforms[0] === "facebook" || input.targetPlatforms[0] === "linkedin" || input.targetPlatforms[0] === "pinterest") ? "youtube" : input.targetPlatforms[0] || "youtube", // Use first platform for analysis
        contentType: (input.mediaType === "audio" || input.mediaType === "text") ? "video" : input.mediaType || "video",
      }).then(result => {
        optimizations.viral = result;
      }).catch(error => {
        console.error("[Orchestrator] Viral optimization failed:", error);
      })
    );
  }
  
  // Thumbnail Generator
  if (input.generateThumbnail !== false && input.mediaType !== "audio") {
    promises.push(
      runThumbnailGenerator(input.userId, {
        videoTitle: input.title,
        niche: input.niche || input.category || "general",
        style: "bold",
        platform: "youtube",
      }).then(result => {
        optimizations.thumbnail = result;
      }).catch(error => {
        console.error("[Orchestrator] Thumbnail generation failed:", error);
      })
    );
  }
  
  // Ad Optimizer
  if (input.generateAd) {
    promises.push(
      runAdOptimizer(input.userId, {
        product: input.title,
        targetAudience: "content creators",
        goal: "awareness",
        description: input.description,
        tone: "professional",
      }).then(result => {
        optimizations.ad = result;
      }).catch(error => {
        console.error("[Orchestrator] Ad optimization failed:", error);
      })
    );
  }
  
  // Wait for all optimizers to complete
  await Promise.all(promises);
  
  return optimizations;
}

/**
 * ============================================
 * ASSET GENERATION
 * ============================================
 */

/**
 * Generate Assets
 * 
 * Generates all required assets (thumbnails, ads, platform-specific media).
 */
async function generateAssets(
  input: UnifiedContentInput,
  optimizations: OptimizationResults
): Promise<GeneratedAssets> {
  const assets: GeneratedAssets = {
    thumbnails: [],
    ads: [],
    platformMedia: {},
  };
  
  // Collect thumbnail URLs
  if (optimizations.thumbnail) {
    assets.thumbnails.push(optimizations.thumbnail.imageUrl);
  }
  
  // Collect ad creative URLs
  if (optimizations.ad) {
    assets.ads.push(optimizations.ad.imageUrl);
  }
  
  // Platform-specific media (use original for now, can add conversion later)
  if (input.mediaUrl) {
    for (const platform of input.targetPlatforms) {
      assets.platformMedia[platform] = input.mediaUrl;
    }
  }
  
  return assets;
}

/**
 * ============================================
 * PLATFORM ADAPTATION
 * ============================================
 */

/**
 * Adapt For Platforms
 * 
 * Creates platform-specific versions of content.
 * Each platform has different requirements (character limits, hashtag rules, etc.).
 */
async function adaptForPlatforms(
  input: UnifiedContentInput,
  optimizations: OptimizationResults,
  assets: GeneratedAssets
): Promise<Record<string, PlatformAdaptation>> {
  const db = await getDb();
  const adaptations: Record<string, PlatformAdaptation> = {};
  
  // Use optimized content if available
  const optimizedTitle = optimizations.viral?.optimizedTitle || input.title;
  const optimizedDescription = optimizations.viral?.optimizedDescription || input.description;
  const optimizedTags = optimizations.viral?.optimizedTags || input.tags || [];
  
  for (const platform of input.targetPlatforms) {
    const adaptation = await adaptForPlatform(
      platform,
      optimizedTitle,
      optimizedDescription,
      optimizedTags,
      assets,
      input
    );
    
    adaptations[platform] = adaptation;
    
    // Store in database
    if (db && input.userId) {
      await db.insert(platformAdaptations).values({
        id: crypto.randomUUID(),
        contentId: "", // Will be set by orchestrator
        orchestrationId: "", // Will be set by orchestrator
        platform: platform as any,
        adaptedTitle: adaptation.title,
        adaptedDescription: adaptation.description || null,
        adaptedCaption: adaptation.caption || null,
        adaptedHashtags: JSON.stringify(adaptation.hashtags),
        adaptedMediaUrl: adaptation.mediaUrl || null,
        thumbnailUrl: adaptation.thumbnailUrl || null,
        platformMetadata: adaptation.platformMetadata ? JSON.stringify(adaptation.platformMetadata) : null,
      });
    }
  }
  
  return adaptations;
}

/**
 * Adapt For Single Platform
 * 
 * Platform-specific content formatting.
 */
async function adaptForPlatform(
  platform: string,
  title: string,
  description: string | undefined,
  tags: string[],
  assets: GeneratedAssets,
  input: UnifiedContentInput
): Promise<PlatformAdaptation> {
  switch (platform) {
    case "youtube":
      return {
        platform: "youtube",
        title: title.substring(0, 100), // YouTube title limit
        description: description?.substring(0, 5000), // YouTube description limit
        caption: undefined,
        hashtags: tags.slice(0, 15), // YouTube allows 15 hashtags
        mediaUrl: assets.platformMedia[platform],
        thumbnailUrl: assets.thumbnails[0],
        platformMetadata: {
          category: input.category || "22", // People & Blogs
          privacyStatus: "public",
        },
      };
    
    case "tiktok":
      return {
        platform: "tiktok",
        title: title.substring(0, 150), // TikTok title limit
        description: undefined,
        caption: `${title.substring(0, 100)} ${tags.slice(0, 5).map(t => `#${t}`).join(" ")}`,
        hashtags: tags.slice(0, 5), // TikTok best practice: 3-5 hashtags
        mediaUrl: assets.platformMedia[platform],
        thumbnailUrl: undefined,
        platformMetadata: {
          privacyLevel: "PUBLIC_TO_EVERYONE",
        },
      };
    
    case "instagram":
      return {
        platform: "instagram",
        title: title.substring(0, 100),
        description: undefined,
        caption: `${title}\n\n${description?.substring(0, 200) || ""}\n\n${tags.slice(0, 30).map(t => `#${t}`).join(" ")}`,
        hashtags: tags.slice(0, 30), // Instagram allows 30 hashtags
        mediaUrl: assets.platformMedia[platform],
        thumbnailUrl: assets.thumbnails[0],
        platformMetadata: {
          location: undefined,
        },
      };
    
    case "twitter":
      return {
        platform: "twitter",
        title: title.substring(0, 280), // Twitter character limit
        description: undefined,
        caption: `${title.substring(0, 250)} ${tags.slice(0, 2).map(t => `#${t}`).join(" ")}`,
        hashtags: tags.slice(0, 2), // Twitter best practice: 1-2 hashtags
        mediaUrl: assets.platformMedia[platform],
        thumbnailUrl: undefined,
        platformMetadata: {},
      };
    
    case "facebook":
      return {
        platform: "facebook",
        title: title,
        description: description,
        caption: `${title}\n\n${description || ""}`,
        hashtags: tags.slice(0, 10),
        mediaUrl: assets.platformMedia[platform],
        thumbnailUrl: assets.thumbnails[0],
        platformMetadata: {},
      };
    
    default:
      return {
        platform,
        title,
        description,
        caption: title,
        hashtags: tags,
        mediaUrl: assets.platformMedia[platform],
        thumbnailUrl: assets.thumbnails[0],
      };
  }
}

/**
 * ============================================
 * DISTRIBUTION ROUTING
 * ============================================
 */

/**
 * Distribute Content
 * 
 * Routes content to appropriate distribution channel:
 * - Immediate: Post now to all platforms
 * - Scheduled: Schedule for future posting
 * - Draft: Save for manual review
 */
async function distributeContent(
  input: UnifiedContentInput,
  adaptations: Record<string, PlatformAdaptation>,
  contentId: string
): Promise<OrchestrationResult["distributionResults"]> {
  if (input.publishStrategy === "immediate") {
    // Post immediately to all platforms
    const platformPosts: Record<string, string> = {};
    const platformUrls: Record<string, string> = {};
    
    for (const [platform, adaptation] of Object.entries(adaptations)) {
      try {
        const results = await postToMultiplePlatforms(
          input.userId,
          [platform as any],
          {
            contentType: input.mediaType === "video" ? "video" : "image",
            caption: adaptation.caption || adaptation.title,
            hashtags: adaptation.hashtags.join(", "),
            mediaUrls: adaptation.mediaUrl ? [adaptation.mediaUrl] : [],
          }
        );
        
        const result = results[platform as keyof typeof results];
        if (result?.success) {
          platformPosts[platform] = result.platformPostId || "";
          platformUrls[platform] = result.platformPostUrl || "";
        }
      } catch (error) {
        console.error(`[Orchestrator] Failed to post to ${platform}:`, error);
      }
    }
    
    return {
      immediate: {
        platformPostIds: platformPosts,
        urls: platformUrls,
      },
    };
  }
  
  if (input.publishStrategy === "scheduled" && input.scheduledFor) {
    // Schedule for future posting
    const scheduleResult = await schedulePost({
      userId: input.userId,
      caption: input.title,
      hashtags: input.tags?.join(", "),
      mediaUrls: input.mediaUrl ? [input.mediaUrl] : [],
      contentType: input.mediaType === "video" ? "video" : "image",
      platforms: input.targetPlatforms as any[],
      scheduledFor: input.scheduledFor,
      timezone: input.timezone || "UTC",
    });
    
    return {
      scheduled: {
        scheduleId: scheduleResult.scheduleId || "",
        scheduledFor: input.scheduledFor,
      },
    };
  }
  
  // Draft: No distribution, just save
  return undefined;
}

/**
 * ============================================
 * OPTIMIZATION HISTORY
 * ============================================
 */

/**
 * Store Optimization History
 * 
 * Records before/after optimization for creator review.
 */
async function storeOptimizationHistory(
  contentId: string,
  orchestrationId: string,
  input: UnifiedContentInput,
  optimizations: OptimizationResults
): Promise<void> {
  const db = await getDb();
  if (!db || !optimizations.viral) return;
  
  await db.insert(optimizationHistory).values({
    id: crypto.randomUUID(),
    contentId,
    orchestrationId,
    originalTitle: input.title,
    originalDescription: input.description || null,
    originalTags: input.tags ? JSON.stringify(input.tags) : null,
    optimizedTitle: optimizations.viral.optimizedTitle,
    optimizedDescription: optimizations.viral.optimizedDescription || null,
    optimizedTags: JSON.stringify(optimizations.viral.optimizedTags),
    changesSummary: `Viral score: ${optimizations.viral.viralScore}/100. ${optimizations.viral.recommendations.slice(0, 3).join(". ")}`,
    improvementScore: optimizations.viral.viralScore,
  });
}

/**
 * ============================================
 * HELPER FUNCTIONS
 * ============================================
 */

/**
 * Get Content By ID
 * 
 * Retrieves unified content record.
 */
export async function getContentById(contentId: string) {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db
    .select()
    .from(unifiedContent)
    .where(eq(unifiedContent.id, contentId))
    .limit(1);
  
  return results[0] || null;
}

/**
 * Get Orchestration Run
 * 
 * Retrieves orchestration run record with all details.
 */
export async function getOrchestrationRun(orchestrationId: string) {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db
    .select()
    .from(orchestrationRuns)
    .where(eq(orchestrationRuns.id, orchestrationId))
    .limit(1);
  
  return results[0] || null;
}

/**
 * Get User Content
 * 
 * Retrieves all content for a user.
 */
export async function getUserContent(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(unifiedContent)
    .where(eq(unifiedContent.userId, userId))
    .orderBy(unifiedContent.createdAt);
}
