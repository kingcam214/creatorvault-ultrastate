/**
 * Content Orchestrator Database Schema
 * 
 * Unified content model that ties together all optimization systems.
 * Single source of truth for content flowing through the platform.
 */

import { mysqlTable, varchar, int, text, datetime, decimal, boolean, mysqlEnum } from "drizzle-orm/mysql-core";
import { users } from "./schema";
import { viralAnalyses } from "./schema";
import { thumbnailAnalyses } from "./schema";
import { adAnalyses } from "./schema";
import { podcastEpisodes } from "./schema-podcasting";
import crypto from "crypto";

/**
 * Unified Content - Single source of truth for all content
 * 
 * This table represents content at its highest level, before platform-specific adaptations.
 * All optimization, scheduling, and publishing flows through this model.
 */
export const unifiedContent = mysqlTable("unified_content", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Core content
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  body: text("body"), // For long-form content (blog posts, articles)
  mediaUrl: varchar("media_url", { length: 500 }), // S3 URL to primary media
  mediaType: mysqlEnum("media_type", ["image", "video", "audio", "text"]),
  
  // Metadata
  tags: text("tags"), // JSON array of tags
  category: varchar("category", { length: 100 }),
  niche: varchar("niche", { length: 100 }),
  duration: int("duration"), // Duration in seconds (for video/audio)
  
  // Distribution settings
  targetPlatforms: text("target_platforms").notNull(), // JSON array: ["youtube", "tiktok", "instagram", "twitter", "facebook"]
  publishStrategy: mysqlEnum("publish_strategy", ["immediate", "scheduled", "draft"]).notNull().default("draft"),
  scheduledFor: datetime("scheduled_for"),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  
  // Optimization preferences
  optimizationLevel: mysqlEnum("optimization_level", ["none", "basic", "aggressive"]).notNull().default("aggressive"),
  generateThumbnail: boolean("generate_thumbnail").notNull().default(true),
  generateAd: boolean("generate_ad").notNull().default(false),
  runViralAnalysis: boolean("run_viral_analysis").notNull().default(true),
  
  // State tracking
  status: mysqlEnum("status", ["draft", "optimizing", "ready", "scheduled", "publishing", "published", "failed"]).notNull().default("draft"),
  
  // Orchestration tracking
  orchestrationId: varchar("orchestration_id", { length: 36 }), // FK to orchestration_runs
  
  // Timestamps
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  publishedAt: datetime("published_at"),
});

/**
 * Orchestration Runs - Track execution of optimization pipeline
 * 
 * Each content item goes through an orchestration run that coordinates:
 * - Viral analysis
 * - Thumbnail generation
 * - Ad generation
 * - Platform adaptation
 * - Distribution
 */
export const orchestrationRuns = mysqlTable("orchestration_runs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  contentId: varchar("content_id", { length: 36 }).notNull().references(() => unifiedContent.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Pipeline stage references
  viralAnalysisId: varchar("viral_analysis_id", { length: 36 }),
  thumbnailAnalysisId: varchar("thumbnail_analysis_id", { length: 36 }),
  adAnalysisId: varchar("ad_analysis_id", { length: 36 }),
  
  // Execution tracking
  startedAt: datetime("started_at").notNull().$defaultFn(() => new Date()),
  completedAt: datetime("completed_at"),
  durationMs: int("duration_ms"), // Total execution time in milliseconds
  status: mysqlEnum("status", ["running", "completed", "failed"]).notNull().default("running"),
  errorMessage: text("error_message"),
  
  // Results (JSON)
  optimizationResults: text("optimization_results"), // All scores and recommendations from all optimizers
  generatedAssets: text("generated_assets"), // URLs to all generated assets (thumbnails, ads, etc.)
  platformAdaptations: text("platform_adaptations"), // Platform-specific versions of content
  
  // Timestamps
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
});

/**
 * Content Performance - Link published content to actual performance
 * 
 * This table creates the feedback loop: predictions → actual results → model improvement.
 * Critical for continuous learning and improving optimization accuracy.
 */
export const contentPerformance = mysqlTable("content_performance", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  contentId: varchar("content_id", { length: 36 }).notNull().references(() => unifiedContent.id, { onDelete: "cascade" }),
  orchestrationId: varchar("orchestration_id", { length: 36 }).notNull().references(() => orchestrationRuns.id, { onDelete: "cascade" }),
  
  // Links to published posts (JSON arrays)
  platformPostIds: text("platform_post_ids"), // Array of platform_posts.id
  podcastEpisodeId: varchar("podcast_episode_id", { length: 36 }).references(() => podcastEpisodes.id),
  
  // Aggregate performance metrics (collected from creator_metrics)
  totalViews: int("total_views").notNull().default(0),
  totalLikes: int("total_likes").notNull().default(0),
  totalShares: int("total_shares").notNull().default(0),
  totalComments: int("total_comments").notNull().default(0),
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }), // Percentage
  
  // Prediction accuracy tracking
  predictedViralScore: int("predicted_viral_score"), // From viral_analyses
  actualViralScore: int("actual_viral_score"), // Calculated from actual performance
  predictionAccuracy: decimal("prediction_accuracy", { precision: 5, scale: 2 }), // How close was the prediction? (0-100%)
  
  // Revenue tracking (if applicable)
  revenueGenerated: decimal("revenue_generated", { precision: 10, scale: 2 }).default("0.00"),
  
  // Learning/feedback processing
  feedbackProcessed: boolean("feedback_processed").notNull().default(false),
  feedbackProcessedAt: datetime("feedback_processed_at"),
  
  // Timestamps
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
});

/**
 * Platform Adaptations - Store platform-specific versions
 * 
 * Each piece of content is adapted for each target platform.
 * This table stores those adaptations for reference and reuse.
 */
export const platformAdaptations = mysqlTable("platform_adaptations", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  contentId: varchar("content_id", { length: 36 }).notNull().references(() => unifiedContent.id, { onDelete: "cascade" }),
  orchestrationId: varchar("orchestration_id", { length: 36 }).notNull().references(() => orchestrationRuns.id, { onDelete: "cascade" }),
  
  // Platform
  platform: mysqlEnum("platform", ["youtube", "tiktok", "instagram", "twitter", "facebook", "linkedin", "pinterest"]).notNull(),
  
  // Adapted content
  adaptedTitle: varchar("adapted_title", { length: 500 }),
  adaptedDescription: text("adapted_description"),
  adaptedCaption: text("adapted_caption"),
  adaptedHashtags: text("adapted_hashtags"), // JSON array
  
  // Adapted media
  adaptedMediaUrl: varchar("adapted_media_url", { length: 500 }), // Platform-specific media (aspect ratio, format)
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }), // Platform-specific thumbnail
  
  // Platform-specific metadata
  platformMetadata: text("platform_metadata"), // JSON: platform-specific fields (YouTube category, TikTok duet settings, etc.)
  
  // Timestamps
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
});

/**
 * Optimization History - Track how content evolved through optimization
 * 
 * Stores before/after snapshots to show creators the impact of optimization.
 */
export const optimizationHistory = mysqlTable("optimization_history", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  contentId: varchar("content_id", { length: 36 }).notNull().references(() => unifiedContent.id, { onDelete: "cascade" }),
  orchestrationId: varchar("orchestration_id", { length: 36 }).notNull().references(() => orchestrationRuns.id, { onDelete: "cascade" }),
  
  // Before optimization
  originalTitle: varchar("original_title", { length: 500 }).notNull(),
  originalDescription: text("original_description"),
  originalTags: text("original_tags"),
  
  // After optimization
  optimizedTitle: varchar("optimized_title", { length: 500 }).notNull(),
  optimizedDescription: text("optimized_description"),
  optimizedTags: text("optimized_tags"),
  
  // Changes made
  changesSummary: text("changes_summary"), // Human-readable summary of what changed
  improvementScore: int("improvement_score"), // How much better is optimized vs original? (0-100)
  
  // Timestamps
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
});

/**
 * A/B Test Variants - Support A/B testing of optimizations
 * 
 * Allows testing multiple versions of content to determine best optimization strategy.
 * (Table already exists in database, importing to resolve schema drift)
 */
export const abTestVariants = mysqlTable("ab_test_variants", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  contentId: varchar("content_id", { length: 36 }).notNull().references(() => unifiedContent.id, { onDelete: "cascade" }),
  
  // Variant details
  variantName: varchar("variant_name", { length: 100 }).notNull(), // "A", "B", "C", etc.
  variantType: mysqlEnum("variant_type", ["title", "thumbnail", "description", "full"]).notNull(),
  
  // Variant content
  title: varchar("title", { length: 500 }),
  description: text("description"),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  
  // Performance tracking
  impressions: int("impressions").notNull().default(0),
  clicks: int("clicks").notNull().default(0),
  ctr: decimal("ctr", { precision: 5, scale: 2 }), // Click-through rate
  conversions: int("conversions").notNull().default(0),
  
  // Test status
  isControl: boolean("is_control").notNull().default(false), // Is this the control variant?
  isWinner: boolean("is_winner").notNull().default(false), // Did this variant win?
  
  // Timestamps
  createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
});
