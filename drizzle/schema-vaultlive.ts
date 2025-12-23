import { mysqlTable, int, text, varchar, timestamp, mysqlEnum, decimal, index } from "drizzle-orm/mysql-core";
import { users } from "./schema";

/**
 * VaultLive Streaming Database Schema
 * 
 * Tables for live streaming infrastructure:
 * - live_streams: Active and past streams
 * - live_stream_viewers: Viewer tracking with watch duration
 * - live_stream_tips: Real-time tips with 85/15 revenue split
 * - live_stream_donations: Donations with payment tracking and 85/15 split
 */

export const liveStreams = mysqlTable("live_streams", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  status: mysqlEnum("status", ["pending", "live", "ended"]).notNull().default("pending"),
  viewerCount: int("viewer_count").notNull().default(0),
  peakViewerCount: int("peak_viewer_count").notNull().default(0),
  totalTips: decimal("total_tips", { precision: 10, scale: 2 }).notNull().default("0.00"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_live_streams_user_id").on(table.userId),
  statusIdx: index("idx_live_streams_status").on(table.status),
  createdAtIdx: index("idx_live_streams_created_at").on(table.createdAt),
}));

export const liveStreamViewers = mysqlTable("live_stream_viewers", {
  id: int("id").autoincrement().primaryKey(),
  streamId: int("stream_id").notNull(),
  userId: int("user_id"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  leftAt: timestamp("left_at"),
  watchDuration: int("watch_duration").notNull().default(0),
}, (table) => ({
  streamIdIdx: index("idx_live_stream_viewers_stream_id").on(table.streamId),
  userIdIdx: index("idx_live_stream_viewers_user_id").on(table.userId),
}));

export const liveStreamTips = mysqlTable("live_stream_tips", {
  id: int("id").autoincrement().primaryKey(),
  streamId: int("stream_id").notNull(),
  userId: int("user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  message: text("message"),
  creatorShare: decimal("creator_share", { precision: 10, scale: 2 }).notNull(),
  platformShare: decimal("platform_share", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  streamIdIdx: index("idx_live_stream_tips_stream_id").on(table.streamId),
  userIdIdx: index("idx_live_stream_tips_user_id").on(table.userId),
}));

export const liveStreamDonations = mysqlTable("live_stream_donations", {
  id: int("id").autoincrement().primaryKey(),
  streamId: int("stream_id").notNull(),
  userId: int("user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  message: text("message"),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  paymentStatus: mysqlEnum("payment_status", ["pending", "completed", "failed"]).notNull().default("pending"),
  creatorShare: decimal("creator_share", { precision: 10, scale: 2 }).notNull(),
  platformShare: decimal("platform_share", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  streamIdIdx: index("idx_live_stream_donations_stream_id").on(table.streamId),
  userIdIdx: index("idx_live_stream_donations_user_id").on(table.userId),
}));
