"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.liveStreamDonations = exports.liveStreamTips = exports.liveStreamViewers = exports.liveStreams = void 0;
var mysql_core_1 = require("drizzle-orm/mysql-core");
/**
 * VaultLive Streaming Database Schema
 *
 * Tables for live streaming infrastructure:
 * - live_streams: Active and past streams
 * - live_stream_viewers: Viewer tracking with watch duration
 * - live_stream_tips: Real-time tips with 85/15 revenue split
 * - live_stream_donations: Donations with payment tracking and 85/15 split
 */
exports.liveStreams = (0, mysql_core_1.mysqlTable)("live_streams", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    userId: (0, mysql_core_1.int)("user_id").notNull(),
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    thumbnailUrl: (0, mysql_core_1.varchar)("thumbnail_url", { length: 500 }),
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "live", "ended"]).notNull().default("pending"),
    viewerCount: (0, mysql_core_1.int)("viewer_count").notNull().default(0),
    peakViewerCount: (0, mysql_core_1.int)("peak_viewer_count").notNull().default(0),
    totalTips: (0, mysql_core_1.decimal)("total_tips", { precision: 10, scale: 2 }).notNull().default("0.00"),
    startedAt: (0, mysql_core_1.timestamp)("started_at"),
    endedAt: (0, mysql_core_1.timestamp)("ended_at"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").notNull().defaultNow(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_live_streams_user_id").on(table.userId),
    statusIdx: (0, mysql_core_1.index)("idx_live_streams_status").on(table.status),
    createdAtIdx: (0, mysql_core_1.index)("idx_live_streams_created_at").on(table.createdAt),
}); });
exports.liveStreamViewers = (0, mysql_core_1.mysqlTable)("live_stream_viewers", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    streamId: (0, mysql_core_1.int)("stream_id").notNull(),
    userId: (0, mysql_core_1.int)("user_id"),
    joinedAt: (0, mysql_core_1.timestamp)("joined_at").notNull().defaultNow(),
    leftAt: (0, mysql_core_1.timestamp)("left_at"),
    watchDuration: (0, mysql_core_1.int)("watch_duration").notNull().default(0),
}, function (table) { return ({
    streamIdIdx: (0, mysql_core_1.index)("idx_live_stream_viewers_stream_id").on(table.streamId),
    userIdIdx: (0, mysql_core_1.index)("idx_live_stream_viewers_user_id").on(table.userId),
}); });
exports.liveStreamTips = (0, mysql_core_1.mysqlTable)("live_stream_tips", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    streamId: (0, mysql_core_1.int)("stream_id").notNull(),
    userId: (0, mysql_core_1.int)("user_id").notNull(),
    amount: (0, mysql_core_1.decimal)("amount", { precision: 10, scale: 2 }).notNull(),
    message: (0, mysql_core_1.text)("message"),
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "confirmed", "rejected"]).notNull().default("pending"),
    creatorShare: (0, mysql_core_1.decimal)("creator_share", { precision: 10, scale: 2 }).notNull(),
    platformShare: (0, mysql_core_1.decimal)("platform_share", { precision: 10, scale: 2 }).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").notNull().defaultNow(),
}, function (table) { return ({
    streamIdIdx: (0, mysql_core_1.index)("idx_live_stream_tips_stream_id").on(table.streamId),
    userIdIdx: (0, mysql_core_1.index)("idx_live_stream_tips_user_id").on(table.userId),
}); });
exports.liveStreamDonations = (0, mysql_core_1.mysqlTable)("live_stream_donations", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    streamId: (0, mysql_core_1.int)("stream_id").notNull(),
    userId: (0, mysql_core_1.int)("user_id").notNull(),
    amount: (0, mysql_core_1.decimal)("amount", { precision: 10, scale: 2 }).notNull(),
    message: (0, mysql_core_1.text)("message"),
    paymentMethod: (0, mysql_core_1.varchar)("payment_method", { length: 50 }).notNull(),
    paymentStatus: (0, mysql_core_1.mysqlEnum)("payment_status", ["pending", "completed", "failed"]).notNull().default("pending"),
    creatorShare: (0, mysql_core_1.decimal)("creator_share", { precision: 10, scale: 2 }).notNull(),
    platformShare: (0, mysql_core_1.decimal)("platform_share", { precision: 10, scale: 2 }).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").notNull().defaultNow(),
}, function (table) { return ({
    streamIdIdx: (0, mysql_core_1.index)("idx_live_stream_donations_stream_id").on(table.streamId),
    userIdIdx: (0, mysql_core_1.index)("idx_live_stream_donations_user_id").on(table.userId),
}); });
