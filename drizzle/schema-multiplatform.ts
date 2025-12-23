import { boolean, index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";
import { users } from "./schema";

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
export const platformCredentials = mysqlTable("platform_credentials", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  platform: mysqlEnum("platform", [
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
  accessToken: text("access_token").notNull(), // Encrypted
  refreshToken: text("refresh_token"), // Encrypted
  tokenExpiresAt: timestamp("token_expires_at"),
  
  // Platform-specific IDs
  platformUserId: varchar("platform_user_id", { length: 255 }).notNull(),
  platformUsername: varchar("platform_username", { length: 255 }),
  platformDisplayName: varchar("platform_display_name", { length: 255 }),
  
  // Account metadata
  followerCount: int("follower_count"),
  isVerified: boolean("is_verified").default(false),
  accountType: varchar("account_type", { length: 50 }), // personal, business, creator
  
  // Status
  status: mysqlEnum("status", ["active", "expired", "revoked", "error"]).default("active").notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  
  // Permissions granted
  permissions: json("permissions").$type<string[]>(), // ["post", "read_analytics", "delete", etc.]
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_platform_credentials_user_id").on(table.userId),
  platformIdx: index("idx_platform_credentials_platform").on(table.platform),
  statusIdx: index("idx_platform_credentials_status").on(table.status),
  userPlatformIdx: index("idx_platform_credentials_user_platform").on(table.userId, table.platform),
}));

// ============ PLATFORM POSTS ============

/**
 * Tracks all posts made to social platforms
 * Links CreatorVault content to external platform posts
 */
export const platformPosts = mysqlTable("platform_posts", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  credentialId: varchar("credential_id", { length: 36 }).notNull().references(() => platformCredentials.id, { onDelete: "cascade" }),
  
  platform: mysqlEnum("platform", [
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
  contentType: mysqlEnum("content_type", ["text", "image", "video", "carousel", "story", "reel", "short"]).notNull(),
  caption: text("caption"),
  hashtags: text("hashtags"), // Comma-separated
  mediaUrls: json("media_urls").$type<string[]>(), // S3 URLs of uploaded media
  
  // Platform-specific post ID
  platformPostId: varchar("platform_post_id", { length: 255 }).notNull(),
  platformPostUrl: text("platform_post_url"),
  
  // Status
  status: mysqlEnum("status", ["pending", "uploading", "published", "failed", "deleted"]).default("pending").notNull(),
  errorMessage: text("error_message"),
  
  // Metadata
  scheduledFor: timestamp("scheduled_for"), // If scheduled
  publishedAt: timestamp("published_at"),
  deletedAt: timestamp("deleted_at"),
  
  // Platform-specific settings
  platformSettings: json("platform_settings").$type<{
    tiktok?: { allowComments?: boolean; allowDuet?: boolean; allowStitch?: boolean };
    instagram?: { location?: string; taggedUsers?: string[] };
    youtube?: { visibility?: "public" | "unlisted" | "private"; category?: string };
    twitter?: { replySettings?: string };
  }>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_platform_posts_user_id").on(table.userId),
  platformIdx: index("idx_platform_posts_platform").on(table.platform),
  statusIdx: index("idx_platform_posts_status").on(table.status),
  publishedAtIdx: index("idx_platform_posts_published_at").on(table.publishedAt),
  scheduledForIdx: index("idx_platform_posts_scheduled_for").on(table.scheduledFor),
}));

// ============ SCHEDULED POSTS ============

/**
 * Content calendar for scheduled posts
 * Supports batch scheduling and optimal timing recommendations
 */
export const scheduledPosts = mysqlTable("scheduled_posts", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Content
  caption: text("caption").notNull(),
  hashtags: text("hashtags"),
  mediaUrls: json("media_urls").$type<string[]>(),
  contentType: mysqlEnum("content_type", ["text", "image", "video", "carousel", "story", "reel", "short"]).notNull(),
  
  // Platforms to post to (multi-platform batch posting)
  platforms: json("platforms").$type<string[]>().notNull(), // ["tiktok", "instagram", "youtube"]
  
  // Scheduling
  scheduledFor: timestamp("scheduled_for").notNull(),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  
  // Status
  status: mysqlEnum("status", ["scheduled", "processing", "published", "failed", "cancelled"]).default("scheduled").notNull(),
  errorMessage: text("error_message"),
  
  // Execution tracking
  executedAt: timestamp("executed_at"),
  platformPostIds: json("platform_post_ids").$type<{ platform: string; postId: string }[]>(), // Links to platform_posts
  
  // Metadata
  isOptimalTime: boolean("is_optimal_time").default(false), // Was this scheduled at AI-recommended time?
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_scheduled_posts_user_id").on(table.userId),
  scheduledForIdx: index("idx_scheduled_posts_scheduled_for").on(table.scheduledFor),
  statusIdx: index("idx_scheduled_posts_status").on(table.status),
}));

// ============ POSTING TIMES ANALYTICS ============

/**
 * Tracks optimal posting times by platform and day/hour
 * Used to recommend best times to schedule content
 */
export const postingTimesAnalytics = mysqlTable("posting_times_analytics", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  platform: mysqlEnum("platform", [
    "tiktok",
    "instagram",
    "youtube",
    "twitter",
    "facebook",
    "linkedin",
    "pinterest",
    "snapchat"
  ]).notNull(),
  
  dayOfWeek: int("day_of_week").notNull(), // 0 = Sunday, 6 = Saturday
  hour: int("hour").notNull(), // 0-23 (UTC)
  
  // Aggregated metrics
  avgEngagementRate: decimal("avg_engagement_rate", { precision: 5, scale: 2 }), // %
  avgViews: int("avg_views"),
  avgLikes: int("avg_likes"),
  avgComments: int("avg_comments"),
  avgShares: int("avg_shares"),
  
  sampleSize: int("sample_size").default(0), // Number of posts analyzed
  
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  platformDayHourIdx: index("idx_posting_times_platform_day_hour").on(table.platform, table.dayOfWeek, table.hour),
}));

// ============ CREATOR METRICS ============

/**
 * Stores analytics data fetched from platform APIs
 * Original vision: "Detailed stats and analytics about the number of views, 
 * likes, shares etc are needed for certain payouts."
 */
export const creatorMetrics = mysqlTable("creator_metrics", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platformPostId: varchar("platform_post_id", { length: 36 }).references(() => platformPosts.id, { onDelete: "cascade" }),
  
  platform: mysqlEnum("platform", [
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
  views: int("views").default(0),
  likes: int("likes").default(0),
  comments: int("comments").default(0),
  shares: int("shares").default(0),
  saves: int("saves").default(0), // Instagram/Pinterest
  
  // Advanced metrics
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }), // %
  clickThroughRate: decimal("click_through_rate", { precision: 5, scale: 2 }), // %
  watchTime: int("watch_time"), // Total seconds watched (video content)
  avgWatchPercentage: decimal("avg_watch_percentage", { precision: 5, scale: 2 }), // %
  
  // Follower impact
  followersGained: int("followers_gained").default(0),
  followersLost: int("followers_lost").default(0),
  
  // Revenue (if applicable)
  revenue: int("revenue").default(0), // In cents
  
  // Timestamp
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_creator_metrics_user_id").on(table.userId),
  platformIdx: index("idx_creator_metrics_platform").on(table.platform),
  platformPostIdIdx: index("idx_creator_metrics_platform_post_id").on(table.platformPostId),
  recordedAtIdx: index("idx_creator_metrics_recorded_at").on(table.recordedAt),
}));

// ============ MONETIZATION MILESTONES ============

/**
 * Tracks creator progress toward platform monetization thresholds
 * Original vision: "Everyone that signs up should be monetized correctly 
 * and earning money as they learn and grow their platforms."
 */
export const monetizationMilestones = mysqlTable("monetization_milestones", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  platform: mysqlEnum("platform", [
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
  thresholdType: mysqlEnum("threshold_type", [
    "youtube_partner", // 1000 subs + 4000 watch hours
    "tiktok_creator_fund", // 10k followers + 100k views/30d
    "instagram_monetization", // 10k followers
    "twitter_monetization", // 500 followers
    "facebook_monetization", // 10k followers + 600k watch minutes
    "custom" // User-defined milestone
  ]).notNull(),
  
  // Progress tracking
  currentValue: int("current_value").default(0),
  targetValue: int("target_value").notNull(),
  unit: varchar("unit", { length: 50 }).notNull(), // "followers", "views", "watch_hours", etc.
  
  // Projections
  estimatedReachDate: timestamp("estimated_reach_date"),
  dailyGrowthRate: decimal("daily_growth_rate", { precision: 10, scale: 2 }),
  
  // Payout info
  payoutAmount: int("payout_amount"), // Expected monthly payout in cents
  payoutCurrency: varchar("payout_currency", { length: 3 }).default("USD"),
  
  // Status
  status: mysqlEnum("status", ["in_progress", "achieved", "stalled"]).default("in_progress").notNull(),
  achievedAt: timestamp("achieved_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_monetization_milestones_user_id").on(table.userId),
  platformIdx: index("idx_monetization_milestones_platform").on(table.platform),
  statusIdx: index("idx_monetization_milestones_status").on(table.status),
}));

// ============ REVENUE PROJECTIONS ============

/**
 * AI-powered revenue projections based on current growth
 * Original vision: "$1M+ revenue within 6 months"
 */
export const revenueProjections = mysqlTable("revenue_projections", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Projections
  projected30dRevenue: int("projected_30d_revenue").notNull(), // In cents
  projected90dRevenue: int("projected_90d_revenue").notNull(),
  projected180dRevenue: int("projected_180d_revenue"),
  projected365dRevenue: int("projected_365d_revenue"),
  
  // Growth metrics
  currentMonthlyRevenue: int("current_monthly_revenue").default(0),
  monthOverMonthGrowth: decimal("month_over_month_growth", { precision: 5, scale: 2 }), // %
  growthRate: decimal("growth_rate", { precision: 5, scale: 2 }), // % per month
  
  // Confidence
  confidenceScore: int("confidence_score").default(50), // 0-100
  
  // Breakdown by platform
  platformBreakdown: json("platform_breakdown").$type<{
    platform: string;
    currentRevenue: number;
    projectedRevenue: number;
    growthRate: number;
  }[]>(),
  
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_revenue_projections_user_id").on(table.userId),
  calculatedAtIdx: index("idx_revenue_projections_calculated_at").on(table.calculatedAt),
}));

// ============ TYPE EXPORTS ============

export type PlatformCredential = typeof platformCredentials.$inferSelect;
export type InsertPlatformCredential = typeof platformCredentials.$inferInsert;
export type PlatformPost = typeof platformPosts.$inferSelect;
export type InsertPlatformPost = typeof platformPosts.$inferInsert;
export type ScheduledPost = typeof scheduledPosts.$inferSelect;
export type InsertScheduledPost = typeof scheduledPosts.$inferInsert;
export type PostingTimesAnalytic = typeof postingTimesAnalytics.$inferSelect;
export type CreatorMetric = typeof creatorMetrics.$inferSelect;
export type InsertCreatorMetric = typeof creatorMetrics.$inferInsert;
export type MonetizationMilestone = typeof monetizationMilestones.$inferSelect;
export type InsertMonetizationMilestone = typeof monetizationMilestones.$inferInsert;
export type RevenueProjection = typeof revenueProjections.$inferSelect;
export type InsertRevenueProjection = typeof revenueProjections.$inferInsert;
