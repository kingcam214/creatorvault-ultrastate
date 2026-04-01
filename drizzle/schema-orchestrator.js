"use strict";
/**
 * Content Orchestrator Database Schema
 *
 * Unified content model that ties together all optimization systems.
 * Single source of truth for content flowing through the platform.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.optimizationHistory = exports.platformAdaptations = exports.contentPerformance = exports.orchestrationRuns = exports.unifiedContent = void 0;
var mysql_core_1 = require("drizzle-orm/mysql-core");
var schema_1 = require("./schema");
var schema_podcasting_1 = require("./schema-podcasting");
var crypto_1 = require("crypto");
/**
 * Unified Content - Single source of truth for all content
 *
 * This table represents content at its highest level, before platform-specific adaptations.
 * All optimization, scheduling, and publishing flows through this model.
 */
exports.unifiedContent = (0, mysql_core_1.mysqlTable)("unified_content", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto_1.default.randomUUID(); }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return schema_1.users.id; }, { onDelete: "cascade" }),
    // Core content
    title: (0, mysql_core_1.varchar)("title", { length: 500 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    body: (0, mysql_core_1.text)("body"), // For long-form content (blog posts, articles)
    mediaUrl: (0, mysql_core_1.varchar)("media_url", { length: 500 }), // S3 URL to primary media
    mediaType: (0, mysql_core_1.mysqlEnum)("media_type", ["image", "video", "audio", "text"]),
    // Metadata
    tags: (0, mysql_core_1.text)("tags"), // JSON array of tags
    category: (0, mysql_core_1.varchar)("category", { length: 100 }),
    niche: (0, mysql_core_1.varchar)("niche", { length: 100 }),
    duration: (0, mysql_core_1.int)("duration"), // Duration in seconds (for video/audio)
    // Distribution settings
    targetPlatforms: (0, mysql_core_1.text)("target_platforms").notNull(), // JSON array: ["youtube", "tiktok", "instagram", "twitter", "facebook"]
    publishStrategy: (0, mysql_core_1.mysqlEnum)("publish_strategy", ["immediate", "scheduled", "draft"]).notNull().default("draft"),
    scheduledFor: (0, mysql_core_1.datetime)("scheduled_for"),
    timezone: (0, mysql_core_1.varchar)("timezone", { length: 50 }).default("UTC"),
    // Optimization preferences
    optimizationLevel: (0, mysql_core_1.mysqlEnum)("optimization_level", ["none", "basic", "aggressive"]).notNull().default("aggressive"),
    generateThumbnail: (0, mysql_core_1.boolean)("generate_thumbnail").notNull().default(true),
    generateAd: (0, mysql_core_1.boolean)("generate_ad").notNull().default(false),
    runViralAnalysis: (0, mysql_core_1.boolean)("run_viral_analysis").notNull().default(true),
    // State tracking
    status: (0, mysql_core_1.mysqlEnum)("status", ["draft", "optimizing", "ready", "scheduled", "publishing", "published", "failed"]).notNull().default("draft"),
    // Orchestration tracking
    orchestrationId: (0, mysql_core_1.varchar)("orchestration_id", { length: 36 }), // FK to orchestration_runs
    // Timestamps
    createdAt: (0, mysql_core_1.datetime)("created_at").notNull().$defaultFn(function () { return new Date(); }),
    updatedAt: (0, mysql_core_1.datetime)("updated_at").notNull().$defaultFn(function () { return new Date(); }).$onUpdate(function () { return new Date(); }),
    publishedAt: (0, mysql_core_1.datetime)("published_at"),
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
exports.orchestrationRuns = (0, mysql_core_1.mysqlTable)("orchestration_runs", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto_1.default.randomUUID(); }),
    contentId: (0, mysql_core_1.varchar)("content_id", { length: 36 }).notNull().references(function () { return exports.unifiedContent.id; }, { onDelete: "cascade" }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return schema_1.users.id; }, { onDelete: "cascade" }),
    // Pipeline stage references
    viralAnalysisId: (0, mysql_core_1.varchar)("viral_analysis_id", { length: 36 }),
    thumbnailAnalysisId: (0, mysql_core_1.varchar)("thumbnail_analysis_id", { length: 36 }),
    adAnalysisId: (0, mysql_core_1.varchar)("ad_analysis_id", { length: 36 }),
    // Execution tracking
    startedAt: (0, mysql_core_1.datetime)("started_at").notNull().$defaultFn(function () { return new Date(); }),
    completedAt: (0, mysql_core_1.datetime)("completed_at"),
    durationMs: (0, mysql_core_1.int)("duration_ms"), // Total execution time in milliseconds
    status: (0, mysql_core_1.mysqlEnum)("status", ["running", "completed", "failed"]).notNull().default("running"),
    errorMessage: (0, mysql_core_1.text)("error_message"),
    // Results (JSON)
    optimizationResults: (0, mysql_core_1.text)("optimization_results"), // All scores and recommendations from all optimizers
    generatedAssets: (0, mysql_core_1.text)("generated_assets"), // URLs to all generated assets (thumbnails, ads, etc.)
    platformAdaptations: (0, mysql_core_1.text)("platform_adaptations"), // Platform-specific versions of content
    // Timestamps
    createdAt: (0, mysql_core_1.datetime)("created_at").notNull().$defaultFn(function () { return new Date(); }),
});
/**
 * Content Performance - Link published content to actual performance
 *
 * This table creates the feedback loop: predictions → actual results → model improvement.
 * Critical for continuous learning and improving optimization accuracy.
 */
exports.contentPerformance = (0, mysql_core_1.mysqlTable)("content_performance", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto_1.default.randomUUID(); }),
    contentId: (0, mysql_core_1.varchar)("content_id", { length: 36 }).notNull().references(function () { return exports.unifiedContent.id; }, { onDelete: "cascade" }),
    orchestrationId: (0, mysql_core_1.varchar)("orchestration_id", { length: 36 }).notNull().references(function () { return exports.orchestrationRuns.id; }, { onDelete: "cascade" }),
    // Links to published posts (JSON arrays)
    platformPostIds: (0, mysql_core_1.text)("platform_post_ids"), // Array of platform_posts.id
    podcastEpisodeId: (0, mysql_core_1.varchar)("podcast_episode_id", { length: 36 }).references(function () { return schema_podcasting_1.podcastEpisodes.id; }),
    // Aggregate performance metrics (collected from creator_metrics)
    totalViews: (0, mysql_core_1.int)("total_views").notNull().default(0),
    totalLikes: (0, mysql_core_1.int)("total_likes").notNull().default(0),
    totalShares: (0, mysql_core_1.int)("total_shares").notNull().default(0),
    totalComments: (0, mysql_core_1.int)("total_comments").notNull().default(0),
    engagementRate: (0, mysql_core_1.decimal)("engagement_rate", { precision: 5, scale: 2 }), // Percentage
    // Prediction accuracy tracking
    predictedViralScore: (0, mysql_core_1.int)("predicted_viral_score"), // From viral_analyses
    actualViralScore: (0, mysql_core_1.int)("actual_viral_score"), // Calculated from actual performance
    predictionAccuracy: (0, mysql_core_1.decimal)("prediction_accuracy", { precision: 5, scale: 2 }), // How close was the prediction? (0-100%)
    // Revenue tracking (if applicable)
    revenueGenerated: (0, mysql_core_1.decimal)("revenue_generated", { precision: 10, scale: 2 }).default("0.00"),
    // Learning/feedback processing
    feedbackProcessed: (0, mysql_core_1.boolean)("feedback_processed").notNull().default(false),
    feedbackProcessedAt: (0, mysql_core_1.datetime)("feedback_processed_at"),
    // Timestamps
    createdAt: (0, mysql_core_1.datetime)("created_at").notNull().$defaultFn(function () { return new Date(); }),
    updatedAt: (0, mysql_core_1.datetime)("updated_at").notNull().$defaultFn(function () { return new Date(); }).$onUpdate(function () { return new Date(); }),
});
/**
 * Platform Adaptations - Store platform-specific versions
 *
 * Each piece of content is adapted for each target platform.
 * This table stores those adaptations for reference and reuse.
 */
exports.platformAdaptations = (0, mysql_core_1.mysqlTable)("platform_adaptations", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto_1.default.randomUUID(); }),
    contentId: (0, mysql_core_1.varchar)("content_id", { length: 36 }).notNull().references(function () { return exports.unifiedContent.id; }, { onDelete: "cascade" }),
    orchestrationId: (0, mysql_core_1.varchar)("orchestration_id", { length: 36 }).notNull().references(function () { return exports.orchestrationRuns.id; }, { onDelete: "cascade" }),
    // Platform
    platform: (0, mysql_core_1.mysqlEnum)("platform", ["youtube", "tiktok", "instagram", "twitter", "facebook", "linkedin", "pinterest"]).notNull(),
    // Adapted content
    adaptedTitle: (0, mysql_core_1.varchar)("adapted_title", { length: 500 }),
    adaptedDescription: (0, mysql_core_1.text)("adapted_description"),
    adaptedCaption: (0, mysql_core_1.text)("adapted_caption"),
    adaptedHashtags: (0, mysql_core_1.text)("adapted_hashtags"), // JSON array
    // Adapted media
    adaptedMediaUrl: (0, mysql_core_1.varchar)("adapted_media_url", { length: 500 }), // Platform-specific media (aspect ratio, format)
    thumbnailUrl: (0, mysql_core_1.varchar)("thumbnail_url", { length: 500 }), // Platform-specific thumbnail
    // Platform-specific metadata
    platformMetadata: (0, mysql_core_1.text)("platform_metadata"), // JSON: platform-specific fields (YouTube category, TikTok duet settings, etc.)
    // Timestamps
    createdAt: (0, mysql_core_1.datetime)("created_at").notNull().$defaultFn(function () { return new Date(); }),
});
/**
 * Optimization History - Track how content evolved through optimization
 *
 * Stores before/after snapshots to show creators the impact of optimization.
 */
exports.optimizationHistory = (0, mysql_core_1.mysqlTable)("optimization_history", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto_1.default.randomUUID(); }),
    contentId: (0, mysql_core_1.varchar)("content_id", { length: 36 }).notNull().references(function () { return exports.unifiedContent.id; }, { onDelete: "cascade" }),
    orchestrationId: (0, mysql_core_1.varchar)("orchestration_id", { length: 36 }).notNull().references(function () { return exports.orchestrationRuns.id; }, { onDelete: "cascade" }),
    // Before optimization
    originalTitle: (0, mysql_core_1.varchar)("original_title", { length: 500 }).notNull(),
    originalDescription: (0, mysql_core_1.text)("original_description"),
    originalTags: (0, mysql_core_1.text)("original_tags"),
    // After optimization
    optimizedTitle: (0, mysql_core_1.varchar)("optimized_title", { length: 500 }).notNull(),
    optimizedDescription: (0, mysql_core_1.text)("optimized_description"),
    optimizedTags: (0, mysql_core_1.text)("optimized_tags"),
    // Changes made
    changesSummary: (0, mysql_core_1.text)("changes_summary"), // Human-readable summary of what changed
    improvementScore: (0, mysql_core_1.int)("improvement_score"), // How much better is optimized vs original? (0-100)
    // Timestamps
    createdAt: (0, mysql_core_1.datetime)("created_at").notNull().$defaultFn(function () { return new Date(); }),
});
/**
 * A/B Test Variants - Support A/B testing of optimizations
 *
 * Allows testing multiple versions of content to determine best optimization strategy.
 * (Table already exists in database, importing to resolve schema drift)
 */
// export const abTestVariants = mysqlTable("ab_test_variants", {
//   id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
//   contentId: varchar("content_id", { length: 36 }).notNull().references(() => unifiedContent.id, { onDelete: "cascade" }),
//   
//   // Variant details
//   variantName: varchar("variant_name", { length: 100 }).notNull(), // "A", "B", "C", etc.
//   variantType: mysqlEnum("variant_type", ["title", "thumbnail", "description", "full"]).notNull(),
//   
//   // Variant content
//   title: varchar("title", { length: 500 }),
//   description: text("description"),
//   thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
//   
//   // Performance tracking
//   impressions: int("impressions").notNull().default(0),
//   clicks: int("clicks").notNull().default(0),
//   ctr: decimal("ctr", { precision: 5, scale: 2 }), // Click-through rate
//   conversions: int("conversions").notNull().default(0),
//   
//   // Test status
//   isControl: boolean("is_control").notNull().default(false), // Is this the control variant?
//   isWinner: boolean("is_winner").notNull().default(false), // Did this variant win?
//   
//   // Timestamps
//   createdAt: datetime("created_at").notNull().$defaultFn(() => new Date()),
//   updatedAt: datetime("updated_at").notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
// });
