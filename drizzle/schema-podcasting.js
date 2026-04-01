"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.podcastClips = exports.podcastSponsors = exports.podcastAnalytics = exports.podcastMonetization = exports.podcastPlatforms = exports.podcastEpisodes = exports.podcasts = void 0;
var mysql_core_1 = require("drizzle-orm/mysql-core");
var schema_1 = require("./schema");
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
exports.podcasts = (0, mysql_core_1.mysqlTable)("podcasts", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return schema_1.users.id; }, { onDelete: "cascade" }),
    // Basic info
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    coverArtUrl: (0, mysql_core_1.text)("cover_art_url"), // S3 URL
    // Metadata
    category: (0, mysql_core_1.varchar)("category", { length: 100 }), // Technology, Business, Comedy, etc.
    language: (0, mysql_core_1.varchar)("language", { length: 10 }).default("en").notNull(),
    explicit: (0, mysql_core_1.boolean)("explicit").default(false).notNull(),
    author: (0, mysql_core_1.varchar)("author", { length: 255 }),
    email: (0, mysql_core_1.varchar)("email", { length: 255 }),
    website: (0, mysql_core_1.text)("website"),
    // RSS Feed
    rssFeedUrl: (0, mysql_core_1.text)("rss_feed_url"), // Generated RSS feed URL
    // Status
    status: (0, mysql_core_1.mysqlEnum)("status", ["draft", "active", "paused", "archived"]).default("draft").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_podcasts_user_id").on(table.userId),
    statusIdx: (0, mysql_core_1.index)("idx_podcasts_status").on(table.status),
}); });
// ============ PODCAST EPISODES ============
/**
 * Individual podcast episodes
 * Linked to parent podcast show
 */
exports.podcastEpisodes = (0, mysql_core_1.mysqlTable)("podcast_episodes", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    podcastId: (0, mysql_core_1.varchar)("podcast_id", { length: 36 }).notNull().references(function () { return exports.podcasts.id; }, { onDelete: "cascade" }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return schema_1.users.id; }, { onDelete: "cascade" }),
    // Episode info
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    episodeNumber: (0, mysql_core_1.int)("episode_number"),
    seasonNumber: (0, mysql_core_1.int)("season_number"),
    // Audio
    audioUrl: (0, mysql_core_1.text)("audio_url").notNull(), // S3 URL of audio file
    duration: (0, mysql_core_1.int)("duration"), // Duration in seconds
    fileSize: (0, mysql_core_1.int)("file_size"), // Size in bytes
    // Transcript
    transcriptUrl: (0, mysql_core_1.text)("transcript_url"), // S3 URL of transcript
    transcriptText: (0, mysql_core_1.text)("transcript_text"), // Full transcript text
    // Publishing
    publishedAt: (0, mysql_core_1.timestamp)("published_at"),
    scheduledFor: (0, mysql_core_1.timestamp)("scheduled_for"),
    // Status
    status: (0, mysql_core_1.mysqlEnum)("status", ["draft", "processing", "scheduled", "published", "archived"]).default("draft").notNull(),
    // SEO
    keywords: (0, mysql_core_1.text)("keywords"), // Comma-separated
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    podcastIdIdx: (0, mysql_core_1.index)("idx_podcast_episodes_podcast_id").on(table.podcastId),
    userIdIdx: (0, mysql_core_1.index)("idx_podcast_episodes_user_id").on(table.userId),
    statusIdx: (0, mysql_core_1.index)("idx_podcast_episodes_status").on(table.status),
    publishedAtIdx: (0, mysql_core_1.index)("idx_podcast_episodes_published_at").on(table.publishedAt),
}); });
// ============ PODCAST PLATFORMS ============
/**
 * Platform distribution tracking
 * Tracks where each podcast is published
 */
exports.podcastPlatforms = (0, mysql_core_1.mysqlTable)("podcast_platforms", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    podcastId: (0, mysql_core_1.varchar)("podcast_id", { length: 36 }).notNull().references(function () { return exports.podcasts.id; }, { onDelete: "cascade" }),
    platform: (0, mysql_core_1.mysqlEnum)("platform", [
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
    platformPodcastId: (0, mysql_core_1.varchar)("platform_podcast_id", { length: 255 }),
    platformUrl: (0, mysql_core_1.text)("platform_url"),
    // OAuth credentials for platform
    accessToken: (0, mysql_core_1.text)("access_token"),
    refreshToken: (0, mysql_core_1.text)("refresh_token"),
    tokenExpiresAt: (0, mysql_core_1.timestamp)("token_expires_at"),
    // Status
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "connected", "syncing", "active", "error", "disconnected"]).default("pending").notNull(),
    lastSyncedAt: (0, mysql_core_1.timestamp)("last_synced_at"),
    errorMessage: (0, mysql_core_1.text)("error_message"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    podcastIdIdx: (0, mysql_core_1.index)("idx_podcast_platforms_podcast_id").on(table.podcastId),
    platformIdx: (0, mysql_core_1.index)("idx_podcast_platforms_platform").on(table.platform),
    statusIdx: (0, mysql_core_1.index)("idx_podcast_platforms_status").on(table.status),
}); });
// ============ PODCAST MONETIZATION ============
/**
 * Monetization tracking for podcasts
 * Tracks ads, sponsorships, and revenue
 */
exports.podcastMonetization = (0, mysql_core_1.mysqlTable)("podcast_monetization", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    podcastId: (0, mysql_core_1.varchar)("podcast_id", { length: 36 }).notNull().references(function () { return exports.podcasts.id; }, { onDelete: "cascade" }),
    episodeId: (0, mysql_core_1.varchar)("episode_id", { length: 36 }).references(function () { return exports.podcastEpisodes.id; }, { onDelete: "cascade" }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return schema_1.users.id; }, { onDelete: "cascade" }),
    // Monetization type
    monetizationType: (0, mysql_core_1.mysqlEnum)("monetization_type", [
        "dynamic_ad",
        "sponsor_read",
        "affiliate",
        "premium_subscription",
        "donation",
        "merchandise"
    ]).notNull(),
    // Sponsor info
    sponsorName: (0, mysql_core_1.varchar)("sponsor_name", { length: 255 }),
    sponsorContactEmail: (0, mysql_core_1.varchar)("sponsor_contact_email", { length: 255 }),
    // Ad placement
    adPlacement: (0, mysql_core_1.mysqlEnum)("ad_placement", ["pre_roll", "mid_roll", "post_roll"]),
    adTimestamp: (0, mysql_core_1.int)("ad_timestamp"), // Timestamp in seconds where ad is inserted
    adDuration: (0, mysql_core_1.int)("ad_duration"), // Duration in seconds
    adAudioUrl: (0, mysql_core_1.text)("ad_audio_url"), // S3 URL of ad audio
    // Revenue
    revenue: (0, mysql_core_1.decimal)("revenue", { precision: 10, scale: 2 }),
    currency: (0, mysql_core_1.varchar)("currency", { length: 3 }).default("USD"),
    // Payment
    paymentStatus: (0, mysql_core_1.mysqlEnum)("payment_status", ["pending", "processing", "paid", "failed"]).default("pending"),
    paidAt: (0, mysql_core_1.timestamp)("paid_at"),
    // Deal terms
    dealTerms: (0, mysql_core_1.text)("deal_terms"),
    commissionRate: (0, mysql_core_1.decimal)("commission_rate", { precision: 5, scale: 2 }), // Percentage
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    podcastIdIdx: (0, mysql_core_1.index)("idx_podcast_monetization_podcast_id").on(table.podcastId),
    episodeIdIdx: (0, mysql_core_1.index)("idx_podcast_monetization_episode_id").on(table.episodeId),
    userIdIdx: (0, mysql_core_1.index)("idx_podcast_monetization_user_id").on(table.userId),
    paymentStatusIdx: (0, mysql_core_1.index)("idx_podcast_monetization_payment_status").on(table.paymentStatus),
}); });
// ============ PODCAST ANALYTICS ============
/**
 * Analytics for podcast episodes
 * Aggregated from all platforms
 */
exports.podcastAnalytics = (0, mysql_core_1.mysqlTable)("podcast_analytics", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    episodeId: (0, mysql_core_1.varchar)("episode_id", { length: 36 }).notNull().references(function () { return exports.podcastEpisodes.id; }, { onDelete: "cascade" }),
    podcastId: (0, mysql_core_1.varchar)("podcast_id", { length: 36 }).notNull().references(function () { return exports.podcasts.id; }, { onDelete: "cascade" }),
    // Platform
    platform: (0, mysql_core_1.mysqlEnum)("platform", [
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
    plays: (0, mysql_core_1.int)("plays").default(0),
    downloads: (0, mysql_core_1.int)("downloads").default(0),
    completionRate: (0, mysql_core_1.decimal)("completion_rate", { precision: 5, scale: 2 }), // Percentage
    averageListenTime: (0, mysql_core_1.int)("average_listen_time"), // Seconds
    // Engagement
    likes: (0, mysql_core_1.int)("likes").default(0),
    shares: (0, mysql_core_1.int)("shares").default(0),
    comments: (0, mysql_core_1.int)("comments").default(0),
    // Audience
    uniqueListeners: (0, mysql_core_1.int)("unique_listeners"),
    // Time period
    recordedAt: (0, mysql_core_1.timestamp)("recorded_at").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
}, function (table) { return ({
    episodeIdIdx: (0, mysql_core_1.index)("idx_podcast_analytics_episode_id").on(table.episodeId),
    podcastIdIdx: (0, mysql_core_1.index)("idx_podcast_analytics_podcast_id").on(table.podcastId),
    platformIdx: (0, mysql_core_1.index)("idx_podcast_analytics_platform").on(table.platform),
    recordedAtIdx: (0, mysql_core_1.index)("idx_podcast_analytics_recorded_at").on(table.recordedAt),
}); });
// ============ PODCAST SPONSORS ============
/**
 * Sponsor database for podcast monetization
 * Manages sponsor relationships and deals
 */
exports.podcastSponsors = (0, mysql_core_1.mysqlTable)("podcast_sponsors", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return schema_1.users.id; }, { onDelete: "cascade" }),
    // Sponsor info
    sponsorName: (0, mysql_core_1.varchar)("sponsor_name", { length: 255 }).notNull(),
    contactName: (0, mysql_core_1.varchar)("contact_name", { length: 255 }),
    contactEmail: (0, mysql_core_1.varchar)("contact_email", { length: 255 }),
    contactPhone: (0, mysql_core_1.varchar)("contact_phone", { length: 50 }),
    website: (0, mysql_core_1.text)("website"),
    // Deal terms
    dealTerms: (0, mysql_core_1.text)("deal_terms"),
    commissionRate: (0, mysql_core_1.decimal)("commission_rate", { precision: 5, scale: 2 }), // Percentage (15-25% typical)
    paymentTerms: (0, mysql_core_1.text)("payment_terms"),
    // Contract
    contractStartDate: (0, mysql_core_1.timestamp)("contract_start_date"),
    contractEndDate: (0, mysql_core_1.timestamp)("contract_end_date"),
    // Status
    status: (0, mysql_core_1.mysqlEnum)("status", ["prospect", "negotiating", "active", "paused", "ended"]).default("prospect").notNull(),
    // Notes
    notes: (0, mysql_core_1.text)("notes"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_podcast_sponsors_user_id").on(table.userId),
    statusIdx: (0, mysql_core_1.index)("idx_podcast_sponsors_status").on(table.status),
}); });
// ============ PODCAST CLIPS ============
/**
 * Social media clips generated from podcast episodes
 * For content repurposing
 */
exports.podcastClips = (0, mysql_core_1.mysqlTable)("podcast_clips", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    episodeId: (0, mysql_core_1.varchar)("episode_id", { length: 36 }).notNull().references(function () { return exports.podcastEpisodes.id; }, { onDelete: "cascade" }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return schema_1.users.id; }, { onDelete: "cascade" }),
    // Clip info
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    // Audio/Video
    clipUrl: (0, mysql_core_1.text)("clip_url").notNull(), // S3 URL
    duration: (0, mysql_core_1.int)("duration").notNull(), // Seconds
    startTime: (0, mysql_core_1.int)("start_time").notNull(), // Start timestamp in original episode
    endTime: (0, mysql_core_1.int)("end_time").notNull(), // End timestamp in original episode
    // Format
    format: (0, mysql_core_1.mysqlEnum)("format", ["audio", "video", "audiogram"]).default("audio").notNull(),
    // Target platforms
    targetPlatforms: (0, mysql_core_1.json)("target_platforms").$type(), // ["tiktok", "instagram", "twitter"]
    // Generated caption
    generatedCaption: (0, mysql_core_1.text)("generated_caption"),
    // Status
    status: (0, mysql_core_1.mysqlEnum)("status", ["generating", "ready", "posted", "failed"]).default("generating").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    episodeIdIdx: (0, mysql_core_1.index)("idx_podcast_clips_episode_id").on(table.episodeId),
    userIdIdx: (0, mysql_core_1.index)("idx_podcast_clips_user_id").on(table.userId),
    statusIdx: (0, mysql_core_1.index)("idx_podcast_clips_status").on(table.status),
}); });
