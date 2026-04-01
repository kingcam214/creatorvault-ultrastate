"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revenueProjections = exports.monetizationMilestones = exports.creatorMetrics = exports.postingTimesAnalytics = exports.scheduledPosts = exports.platformPosts = exports.platformCredentials = void 0;
var mysql_core_1 = require("drizzle-orm/mysql-core");
var schema_1 = require("./schema");
/**
 * ============================================
 * MULTI-PLATFORM POSTING & ANALYTICS SYSTEM
 * ============================================
 *
 * Original vision from first Manus session (August 2024):
 * "This app needs to be able to take content and deploy to each platform
 * and abide by the guidelines of each but it's all powered by AI and does
 * it for the user."
 */
// ============ PLATFORM CREDENTIALS ============
/**
 * OAuth credentials for each social platform
 * Stores access tokens for posting content to creator's accounts
 */
exports.platformCredentials = (0, mysql_core_1.mysqlTable)("platform_credentials", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return schema_1.users.id; }, { onDelete: "cascade" }),
    platform: (0, mysql_core_1.mysqlEnum)("platform", [
        "tiktok",
        "instagram",
        "youtube",
        "twitter",
        "facebook",
        "linkedin",
        "pinterest",
        "snapchat"
    ]).notNull(),
    // OAuth tokens
    accessToken: (0, mysql_core_1.text)("access_token").notNull(), // Encrypted
    refreshToken: (0, mysql_core_1.text)("refresh_token"), // Encrypted
    tokenExpiresAt: (0, mysql_core_1.timestamp)("token_expires_at"),
    // Platform-specific IDs
    platformUserId: (0, mysql_core_1.varchar)("platform_user_id", { length: 255 }).notNull(),
    platformUsername: (0, mysql_core_1.varchar)("platform_username", { length: 255 }),
    platformDisplayName: (0, mysql_core_1.varchar)("platform_display_name", { length: 255 }),
    // Account metadata
    followerCount: (0, mysql_core_1.int)("follower_count"),
    isVerified: (0, mysql_core_1.boolean)("is_verified").default(false),
    accountType: (0, mysql_core_1.varchar)("account_type", { length: 50 }), // personal, business, creator
    // Status
    status: (0, mysql_core_1.mysqlEnum)("status", ["active", "expired", "revoked", "error"]).default("active").notNull(),
    lastSyncedAt: (0, mysql_core_1.timestamp)("last_synced_at"),
    // Permissions granted
    permissions: (0, mysql_core_1.json)("permissions").$type(), // ["post", "read_analytics", "delete", etc.]
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_platform_credentials_user_id").on(table.userId),
    platformIdx: (0, mysql_core_1.index)("idx_platform_credentials_platform").on(table.platform),
    statusIdx: (0, mysql_core_1.index)("idx_platform_credentials_status").on(table.status),
    userPlatformIdx: (0, mysql_core_1.index)("idx_platform_credentials_user_platform").on(table.userId, table.platform),
}); });
// ============ PLATFORM POSTS ============
/**
 * Tracks all posts made to social platforms
 * Links CreatorVault content to external platform posts
 */
exports.platformPosts = (0, mysql_core_1.mysqlTable)("platform_posts", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return schema_1.users.id; }, { onDelete: "cascade" }),
    credentialId: (0, mysql_core_1.varchar)("credential_id", { length: 36 }).notNull().references(function () { return exports.platformCredentials.id; }, { onDelete: "cascade" }),
    platform: (0, mysql_core_1.mysqlEnum)("platform", [
        "tiktok",
        "instagram",
        "youtube",
        "twitter",
        "facebook",
        "linkedin",
        "pinterest",
        "snapchat"
    ]).notNull(),
    // Content
    contentType: (0, mysql_core_1.mysqlEnum)("content_type", ["text", "image", "video", "carousel", "story", "reel", "short"]).notNull(),
    caption: (0, mysql_core_1.text)("caption"),
    hashtags: (0, mysql_core_1.text)("hashtags"), // Comma-separated
    mediaUrls: (0, mysql_core_1.json)("media_urls").$type(), // S3 URLs of uploaded media
    // Platform-specific post ID
    platformPostId: (0, mysql_core_1.varchar)("platform_post_id", { length: 255 }).notNull(),
    platformPostUrl: (0, mysql_core_1.text)("platform_post_url"),
    // Status
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "uploading", "published", "failed", "deleted"]).default("pending").notNull(),
    errorMessage: (0, mysql_core_1.text)("error_message"),
    // Metadata
    scheduledFor: (0, mysql_core_1.timestamp)("scheduled_for"), // If scheduled
    publishedAt: (0, mysql_core_1.timestamp)("published_at"),
    deletedAt: (0, mysql_core_1.timestamp)("deleted_at"),
    // Platform-specific settings
    platformSettings: (0, mysql_core_1.json)("platform_settings").$type(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_platform_posts_user_id").on(table.userId),
    platformIdx: (0, mysql_core_1.index)("idx_platform_posts_platform").on(table.platform),
    statusIdx: (0, mysql_core_1.index)("idx_platform_posts_status").on(table.status),
    publishedAtIdx: (0, mysql_core_1.index)("idx_platform_posts_published_at").on(table.publishedAt),
    scheduledForIdx: (0, mysql_core_1.index)("idx_platform_posts_scheduled_for").on(table.scheduledFor),
}); });
// ============ SCHEDULED POSTS ============
/**
 * Content calendar for scheduled posts
 * Supports batch scheduling and optimal timing recommendations
 */
exports.scheduledPosts = (0, mysql_core_1.mysqlTable)("scheduled_posts", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return schema_1.users.id; }, { onDelete: "cascade" }),
    // Content
    caption: (0, mysql_core_1.text)("caption").notNull(),
    hashtags: (0, mysql_core_1.text)("hashtags"),
    mediaUrls: (0, mysql_core_1.json)("media_urls").$type(),
    contentType: (0, mysql_core_1.mysqlEnum)("content_type", ["text", "image", "video", "carousel", "story", "reel", "short"]).notNull(),
    // Platforms to post to (multi-platform batch posting)
    platforms: (0, mysql_core_1.json)("platforms").$type().notNull(), // ["tiktok", "instagram", "youtube"]
    // Scheduling
    scheduledFor: (0, mysql_core_1.timestamp)("scheduled_for").notNull(),
    timezone: (0, mysql_core_1.varchar)("timezone", { length: 50 }).default("UTC"),
    // Status
    status: (0, mysql_core_1.mysqlEnum)("status", ["scheduled", "processing", "published", "failed", "cancelled"]).default("scheduled").notNull(),
    errorMessage: (0, mysql_core_1.text)("error_message"),
    // Execution tracking
    executedAt: (0, mysql_core_1.timestamp)("executed_at"),
    platformPostIds: (0, mysql_core_1.json)("platform_post_ids").$type(), // Links to platform_posts
    // Metadata
    isOptimalTime: (0, mysql_core_1.boolean)("is_optimal_time").default(false), // Was this scheduled at AI-recommended time?
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_scheduled_posts_user_id").on(table.userId),
    scheduledForIdx: (0, mysql_core_1.index)("idx_scheduled_posts_scheduled_for").on(table.scheduledFor),
    statusIdx: (0, mysql_core_1.index)("idx_scheduled_posts_status").on(table.status),
}); });
// ============ POSTING TIMES ANALYTICS ============
/**
 * Tracks optimal posting times by platform and day/hour
 * Used to recommend best times to schedule content
 */
exports.postingTimesAnalytics = (0, mysql_core_1.mysqlTable)("posting_times_analytics", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    platform: (0, mysql_core_1.mysqlEnum)("platform", [
        "tiktok",
        "instagram",
        "youtube",
        "twitter",
        "facebook",
        "linkedin",
        "pinterest",
        "snapchat"
    ]).notNull(),
    dayOfWeek: (0, mysql_core_1.int)("day_of_week").notNull(), // 0 = Sunday, 6 = Saturday
    hour: (0, mysql_core_1.int)("hour").notNull(), // 0-23 (UTC)
    // Aggregated metrics
    avgEngagementRate: (0, mysql_core_1.decimal)("avg_engagement_rate", { precision: 5, scale: 2 }), // %
    avgViews: (0, mysql_core_1.int)("avg_views"),
    avgLikes: (0, mysql_core_1.int)("avg_likes"),
    avgComments: (0, mysql_core_1.int)("avg_comments"),
    avgShares: (0, mysql_core_1.int)("avg_shares"),
    sampleSize: (0, mysql_core_1.int)("sample_size").default(0), // Number of posts analyzed
    lastUpdatedAt: (0, mysql_core_1.timestamp)("last_updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    platformDayHourIdx: (0, mysql_core_1.index)("idx_posting_times_platform_day_hour").on(table.platform, table.dayOfWeek, table.hour),
}); });
// ============ CREATOR METRICS ============
/**
 * Stores analytics data fetched from platform APIs
 * Original vision: "Detailed stats and analytics about the number of views,
 * likes, shares etc are needed for certain payouts."
 */
exports.creatorMetrics = (0, mysql_core_1.mysqlTable)("creator_metrics", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return schema_1.users.id; }, { onDelete: "cascade" }),
    platformPostId: (0, mysql_core_1.varchar)("platform_post_id", { length: 36 }).references(function () { return exports.platformPosts.id; }, { onDelete: "cascade" }),
    platform: (0, mysql_core_1.mysqlEnum)("platform", [
        "tiktok",
        "instagram",
        "youtube",
        "twitter",
        "facebook",
        "linkedin",
        "pinterest",
        "snapchat"
    ]).notNull(),
    // Engagement metrics
    views: (0, mysql_core_1.int)("views").default(0),
    likes: (0, mysql_core_1.int)("likes").default(0),
    comments: (0, mysql_core_1.int)("comments").default(0),
    shares: (0, mysql_core_1.int)("shares").default(0),
    saves: (0, mysql_core_1.int)("saves").default(0), // Instagram/Pinterest
    // Advanced metrics
    engagementRate: (0, mysql_core_1.decimal)("engagement_rate", { precision: 5, scale: 2 }), // %
    clickThroughRate: (0, mysql_core_1.decimal)("click_through_rate", { precision: 5, scale: 2 }), // %
    watchTime: (0, mysql_core_1.int)("watch_time"), // Total seconds watched (video content)
    avgWatchPercentage: (0, mysql_core_1.decimal)("avg_watch_percentage", { precision: 5, scale: 2 }), // %
    // Follower impact
    followersGained: (0, mysql_core_1.int)("followers_gained").default(0),
    followersLost: (0, mysql_core_1.int)("followers_lost").default(0),
    // Revenue (if applicable)
    revenue: (0, mysql_core_1.int)("revenue").default(0), // In cents
    // Timestamp
    recordedAt: (0, mysql_core_1.timestamp)("recorded_at").defaultNow().notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_creator_metrics_user_id").on(table.userId),
    platformIdx: (0, mysql_core_1.index)("idx_creator_metrics_platform").on(table.platform),
    platformPostIdIdx: (0, mysql_core_1.index)("idx_creator_metrics_platform_post_id").on(table.platformPostId),
    recordedAtIdx: (0, mysql_core_1.index)("idx_creator_metrics_recorded_at").on(table.recordedAt),
}); });
// ============ MONETIZATION MILESTONES ============
/**
 * Tracks creator progress toward platform monetization thresholds
 * Original vision: "Everyone that signs up should be monetized correctly
 * and earning money as they learn and grow their platforms."
 */
exports.monetizationMilestones = (0, mysql_core_1.mysqlTable)("monetization_milestones", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return schema_1.users.id; }, { onDelete: "cascade" }),
    platform: (0, mysql_core_1.mysqlEnum)("platform", [
        "tiktok",
        "instagram",
        "youtube",
        "twitter",
        "facebook",
        "linkedin",
        "pinterest",
        "snapchat"
    ]).notNull(),
    // Milestone type
    thresholdType: (0, mysql_core_1.mysqlEnum)("threshold_type", [
        "youtube_partner", // 1000 subs + 4000 watch hours
        "tiktok_creator_fund", // 10k followers + 100k views/30d
        "instagram_monetization", // 10k followers
        "twitter_monetization", // 500 followers
        "facebook_monetization", // 10k followers + 600k watch minutes
        "custom" // User-defined milestone
    ]).notNull(),
    // Progress tracking
    currentValue: (0, mysql_core_1.int)("current_value").default(0),
    targetValue: (0, mysql_core_1.int)("target_value").notNull(),
    unit: (0, mysql_core_1.varchar)("unit", { length: 50 }).notNull(), // "followers", "views", "watch_hours", etc.
    // Projections
    estimatedReachDate: (0, mysql_core_1.timestamp)("estimated_reach_date"),
    dailyGrowthRate: (0, mysql_core_1.decimal)("daily_growth_rate", { precision: 10, scale: 2 }),
    // Payout info
    payoutAmount: (0, mysql_core_1.int)("payout_amount"), // Expected monthly payout in cents
    payoutCurrency: (0, mysql_core_1.varchar)("payout_currency", { length: 3 }).default("USD"),
    // Status
    status: (0, mysql_core_1.mysqlEnum)("status", ["in_progress", "achieved", "stalled"]).default("in_progress").notNull(),
    achievedAt: (0, mysql_core_1.timestamp)("achieved_at"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_monetization_milestones_user_id").on(table.userId),
    platformIdx: (0, mysql_core_1.index)("idx_monetization_milestones_platform").on(table.platform),
    statusIdx: (0, mysql_core_1.index)("idx_monetization_milestones_status").on(table.status),
}); });
// ============ REVENUE PROJECTIONS ============
/**
 * AI-powered revenue projections based on current growth
 * Original vision: "$1M+ revenue within 6 months"
 */
exports.revenueProjections = (0, mysql_core_1.mysqlTable)("revenue_projections", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return schema_1.users.id; }, { onDelete: "cascade" }),
    // Projections
    projected30dRevenue: (0, mysql_core_1.int)("projected_30d_revenue").notNull(), // In cents
    projected90dRevenue: (0, mysql_core_1.int)("projected_90d_revenue").notNull(),
    projected180dRevenue: (0, mysql_core_1.int)("projected_180d_revenue"),
    projected365dRevenue: (0, mysql_core_1.int)("projected_365d_revenue"),
    // Growth metrics
    currentMonthlyRevenue: (0, mysql_core_1.int)("current_monthly_revenue").default(0),
    monthOverMonthGrowth: (0, mysql_core_1.decimal)("month_over_month_growth", { precision: 5, scale: 2 }), // %
    growthRate: (0, mysql_core_1.decimal)("growth_rate", { precision: 5, scale: 2 }), // % per month
    // Confidence
    confidenceScore: (0, mysql_core_1.int)("confidence_score").default(50), // 0-100
    // Breakdown by platform
    platformBreakdown: (0, mysql_core_1.json)("platform_breakdown").$type(),
    calculatedAt: (0, mysql_core_1.timestamp)("calculated_at").defaultNow().notNull(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_revenue_projections_user_id").on(table.userId),
    calculatedAtIdx: (0, mysql_core_1.index)("idx_revenue_projections_calculated_at").on(table.calculatedAt),
}); });
