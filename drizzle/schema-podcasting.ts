import { mysqlTable, varchar, text, int, timestamp, boolean, decimal, mysqlEnum, index, json } from "drizzle-orm/mysql-core";
import { users } from "./schema";

/**
 * ============================================
 * PODCASTING INTEGRATION SUITE
 * ============================================
 * 
 * Complete podcast production, distribution, and monetization system
 * From Document 1: "CreatorVault Podcasting Integration Comprehensive Implementation Summary"
 */

// ============ PODCASTS ============

/**
 * Main podcast shows
 * Each user can have multiple podcast shows
 */
export const podcasts = mysqlTable("podcasts", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Basic info
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  coverArtUrl: text("cover_art_url"), // S3 URL
  
  // Metadata
  category: varchar("category", { length: 100 }), // Technology, Business, Comedy, etc.
  language: varchar("language", { length: 10 }).default("en").notNull(),
  explicit: boolean("explicit").default(false).notNull(),
  author: varchar("author", { length: 255 }),
  email: varchar("email", { length: 255 }),
  website: text("website"),
  
  // RSS Feed
  rssFeedUrl: text("rss_feed_url"), // Generated RSS feed URL
  
  // Status
  status: mysqlEnum("status", ["draft", "active", "paused", "archived"]).default("draft").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_podcasts_user_id").on(table.userId),
  statusIdx: index("idx_podcasts_status").on(table.status),
}));

// ============ PODCAST EPISODES ============

/**
 * Individual podcast episodes
 * Linked to parent podcast show
 */
export const podcastEpisodes = mysqlTable("podcast_episodes", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  podcastId: varchar("podcast_id", { length: 36 }).notNull().references(() => podcasts.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Episode info
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  episodeNumber: int("episode_number"),
  seasonNumber: int("season_number"),
  
  // Audio
  audioUrl: text("audio_url").notNull(), // S3 URL of audio file
  duration: int("duration"), // Duration in seconds
  fileSize: int("file_size"), // Size in bytes
  
  // Transcript
  transcriptUrl: text("transcript_url"), // S3 URL of transcript
  transcriptText: text("transcript_text"), // Full transcript text
  
  // Publishing
  publishedAt: timestamp("published_at"),
  scheduledFor: timestamp("scheduled_for"),
  
  // Status
  status: mysqlEnum("status", ["draft", "processing", "scheduled", "published", "archived"]).default("draft").notNull(),
  
  // SEO
  keywords: text("keywords"), // Comma-separated
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  podcastIdIdx: index("idx_podcast_episodes_podcast_id").on(table.podcastId),
  userIdIdx: index("idx_podcast_episodes_user_id").on(table.userId),
  statusIdx: index("idx_podcast_episodes_status").on(table.status),
  publishedAtIdx: index("idx_podcast_episodes_published_at").on(table.publishedAt),
}));

// ============ PODCAST PLATFORMS ============

/**
 * Platform distribution tracking
 * Tracks where each podcast is published
 */
export const podcastPlatforms = mysqlTable("podcast_platforms", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  podcastId: varchar("podcast_id", { length: 36 }).notNull().references(() => podcasts.id, { onDelete: "cascade" }),
  
  platform: mysqlEnum("platform", [
    "apple_podcasts",
    "spotify",
    "google_podcasts",
    "amazon_music",
    "youtube_music",
    "stitcher",
    "tunein",
    "iheartradio",
    "pandora",
    "deezer"
  ]).notNull(),
  
  // Platform-specific IDs
  platformPodcastId: varchar("platform_podcast_id", { length: 255 }),
  platformUrl: text("platform_url"),
  
  // OAuth credentials for platform
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  
  // Status
  status: mysqlEnum("status", ["pending", "connected", "syncing", "active", "error", "disconnected"]).default("pending").notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  podcastIdIdx: index("idx_podcast_platforms_podcast_id").on(table.podcastId),
  platformIdx: index("idx_podcast_platforms_platform").on(table.platform),
  statusIdx: index("idx_podcast_platforms_status").on(table.status),
}));

// ============ PODCAST MONETIZATION ============

/**
 * Monetization tracking for podcasts
 * Tracks ads, sponsorships, and revenue
 */
export const podcastMonetization = mysqlTable("podcast_monetization", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  podcastId: varchar("podcast_id", { length: 36 }).notNull().references(() => podcasts.id, { onDelete: "cascade" }),
  episodeId: varchar("episode_id", { length: 36 }).references(() => podcastEpisodes.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Monetization type
  monetizationType: mysqlEnum("monetization_type", [
    "dynamic_ad",
    "sponsor_read",
    "affiliate",
    "premium_subscription",
    "donation",
    "merchandise"
  ]).notNull(),
  
  // Sponsor info
  sponsorName: varchar("sponsor_name", { length: 255 }),
  sponsorContactEmail: varchar("sponsor_contact_email", { length: 255 }),
  
  // Ad placement
  adPlacement: mysqlEnum("ad_placement", ["pre_roll", "mid_roll", "post_roll"]),
  adTimestamp: int("ad_timestamp"), // Timestamp in seconds where ad is inserted
  adDuration: int("ad_duration"), // Duration in seconds
  adAudioUrl: text("ad_audio_url"), // S3 URL of ad audio
  
  // Revenue
  revenue: decimal("revenue", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  
  // Payment
  paymentStatus: mysqlEnum("payment_status", ["pending", "processing", "paid", "failed"]).default("pending"),
  paidAt: timestamp("paid_at"),
  
  // Deal terms
  dealTerms: text("deal_terms"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }), // Percentage
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  podcastIdIdx: index("idx_podcast_monetization_podcast_id").on(table.podcastId),
  episodeIdIdx: index("idx_podcast_monetization_episode_id").on(table.episodeId),
  userIdIdx: index("idx_podcast_monetization_user_id").on(table.userId),
  paymentStatusIdx: index("idx_podcast_monetization_payment_status").on(table.paymentStatus),
}));

// ============ PODCAST ANALYTICS ============

/**
 * Analytics for podcast episodes
 * Aggregated from all platforms
 */
export const podcastAnalytics = mysqlTable("podcast_analytics", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  episodeId: varchar("episode_id", { length: 36 }).notNull().references(() => podcastEpisodes.id, { onDelete: "cascade" }),
  podcastId: varchar("podcast_id", { length: 36 }).notNull().references(() => podcasts.id, { onDelete: "cascade" }),
  
  // Platform
  platform: mysqlEnum("platform", [
    "apple_podcasts",
    "spotify",
    "google_podcasts",
    "amazon_music",
    "youtube_music",
    "stitcher",
    "tunein",
    "iheartradio",
    "pandora",
    "deezer",
    "aggregate" // Combined stats from all platforms
  ]).notNull(),
  
  // Metrics
  plays: int("plays").default(0),
  downloads: int("downloads").default(0),
  completionRate: decimal("completion_rate", { precision: 5, scale: 2 }), // Percentage
  averageListenTime: int("average_listen_time"), // Seconds
  
  // Engagement
  likes: int("likes").default(0),
  shares: int("shares").default(0),
  comments: int("comments").default(0),
  
  // Audience
  uniqueListeners: int("unique_listeners"),
  
  // Time period
  recordedAt: timestamp("recorded_at").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  episodeIdIdx: index("idx_podcast_analytics_episode_id").on(table.episodeId),
  podcastIdIdx: index("idx_podcast_analytics_podcast_id").on(table.podcastId),
  platformIdx: index("idx_podcast_analytics_platform").on(table.platform),
  recordedAtIdx: index("idx_podcast_analytics_recorded_at").on(table.recordedAt),
}));

// ============ PODCAST SPONSORS ============

/**
 * Sponsor database for podcast monetization
 * Manages sponsor relationships and deals
 */
export const podcastSponsors = mysqlTable("podcast_sponsors", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Sponsor info
  sponsorName: varchar("sponsor_name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  website: text("website"),
  
  // Deal terms
  dealTerms: text("deal_terms"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }), // Percentage (15-25% typical)
  paymentTerms: text("payment_terms"),
  
  // Contract
  contractStartDate: timestamp("contract_start_date"),
  contractEndDate: timestamp("contract_end_date"),
  
  // Status
  status: mysqlEnum("status", ["prospect", "negotiating", "active", "paused", "ended"]).default("prospect").notNull(),
  
  // Notes
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_podcast_sponsors_user_id").on(table.userId),
  statusIdx: index("idx_podcast_sponsors_status").on(table.status),
}));

// ============ PODCAST CLIPS ============

/**
 * Social media clips generated from podcast episodes
 * For content repurposing
 */
export const podcastClips = mysqlTable("podcast_clips", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  episodeId: varchar("episode_id", { length: 36 }).notNull().references(() => podcastEpisodes.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Clip info
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // Audio/Video
  clipUrl: text("clip_url").notNull(), // S3 URL
  duration: int("duration").notNull(), // Seconds
  startTime: int("start_time").notNull(), // Start timestamp in original episode
  endTime: int("end_time").notNull(), // End timestamp in original episode
  
  // Format
  format: mysqlEnum("format", ["audio", "video", "audiogram"]).default("audio").notNull(),
  
  // Target platforms
  targetPlatforms: json("target_platforms").$type<string[]>(), // ["tiktok", "instagram", "twitter"]
  
  // Generated caption
  generatedCaption: text("generated_caption"),
  
  // Status
  status: mysqlEnum("status", ["generating", "ready", "posted", "failed"]).default("generating").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  episodeIdIdx: index("idx_podcast_clips_episode_id").on(table.episodeId),
  userIdIdx: index("idx_podcast_clips_user_id").on(table.userId),
  statusIdx: index("idx_podcast_clips_status").on(table.status),
}));
