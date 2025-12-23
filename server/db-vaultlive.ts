/**
 * VaultLive Database Helpers
 * 
 * Database operations for live streaming system:
 * - Stream management (create, update, end)
 * - Viewer tracking (join, leave, duration)
 * - Tips and donations with 85/15 revenue split
 * - Real-time stats (viewer count, total tips)
 */

import { getDb } from "./db";
import { liveStreams, liveStreamViewers, liveStreamTips, liveStreamDonations } from "../drizzle/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";

// ============================================================================
// STREAM MANAGEMENT
// ============================================================================

export interface CreateStreamInput {
  userId: number;
  title: string;
  description?: string;
  thumbnailUrl?: string;
}

export interface Stream {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  status: "pending" | "live" | "ended";
  viewerCount: number;
  peakViewerCount: number;
  totalTips: string;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
}

/**
 * Create a new live stream
 */
export async function createStream(input: CreateStreamInput): Promise<Stream> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(liveStreams).values({
    userId: input.userId,
    title: input.title,
    description: input.description || null,
    thumbnailUrl: input.thumbnailUrl || null,
    status: "pending",
  });

  const streamId = Number(result[0].insertId);

  const streams = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId));
  return streams[0] as Stream;
}

/**
 * Get stream by ID
 */
export async function getStreamById(streamId: number): Promise<Stream | null> {
  const db = await getDb();
  if (!db) return null;

  const streams = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId));
  return streams[0] as Stream || null;
}

/**
 * Get streams by user ID
 */
export async function getStreamsByUserId(userId: number): Promise<Stream[]> {
  const db = await getDb();
  if (!db) return [];

  const streams = await db.select().from(liveStreams)
    .where(eq(liveStreams.userId, userId))
    .orderBy(desc(liveStreams.createdAt));

  return streams as Stream[];
}

/**
 * Get all live streams (status = 'live')
 */
export async function getLiveStreams(): Promise<Stream[]> {
  const db = await getDb();
  if (!db) return [];

  const streams = await db.select().from(liveStreams)
    .where(eq(liveStreams.status, "live"))
    .orderBy(desc(liveStreams.viewerCount), desc(liveStreams.createdAt));

  return streams as Stream[];
}

/**
 * Start a stream (change status to 'live')
 */
export async function startStream(streamId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(liveStreams)
    .set({ status: "live", startedAt: new Date() })
    .where(eq(liveStreams.id, streamId));
}

/**
 * End a stream (change status to 'ended')
 */
export async function endStream(streamId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(liveStreams)
    .set({ status: "ended", endedAt: new Date() })
    .where(eq(liveStreams.id, streamId));
}

/**
 * Update viewer count
 */
export async function updateViewerCount(streamId: number, count: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(liveStreams)
    .set({
      viewerCount: count,
      peakViewerCount: sql`GREATEST(peak_viewer_count, ${count})`,
    })
    .where(eq(liveStreams.id, streamId));
}

/**
 * Update total tips
 */
export async function updateTotalTips(streamId: number, amount: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(liveStreams)
    .set({
      totalTips: sql`total_tips + ${amount}`,
    })
    .where(eq(liveStreams.id, streamId));
}

// ============================================================================
// VIEWER TRACKING
// ============================================================================

export interface Viewer {
  id: number;
  streamId: number;
  userId: number | null;
  joinedAt: Date;
  leftAt: Date | null;
  watchDuration: number;
}

/**
 * Record viewer joining a stream
 */
export async function recordViewerJoin(streamId: number, userId: number | null): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(liveStreamViewers).values({
    streamId,
    userId: userId || null,
  });

  return Number(result[0].insertId);
}

/**
 * Record viewer leaving a stream
 */
export async function recordViewerLeave(viewerId: number, watchDuration: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(liveStreamViewers)
    .set({ leftAt: new Date(), watchDuration })
    .where(eq(liveStreamViewers.id, viewerId));
}

/**
 * Get current viewer count for a stream
 */
export async function getCurrentViewerCount(streamId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(liveStreamViewers)
    .where(and(
      eq(liveStreamViewers.streamId, streamId),
      isNull(liveStreamViewers.leftAt)
    ));

  return result[0]?.count || 0;
}

/**
 * Get all viewers for a stream
 */
export async function getStreamViewers(streamId: number): Promise<Viewer[]> {
  const db = await getDb();
  if (!db) return [];

  const viewers = await db.select().from(liveStreamViewers)
    .where(eq(liveStreamViewers.streamId, streamId))
    .orderBy(desc(liveStreamViewers.joinedAt));

  return viewers as Viewer[];
}

// ============================================================================
// TIPS & DONATIONS
// ============================================================================

export interface Tip {
  id: number;
  streamId: number;
  userId: number;
  amount: string;
  message: string | null;
  creatorShare: string;
  platformShare: string;
  createdAt: Date;
}

export interface Donation {
  id: number;
  streamId: number;
  userId: number;
  amount: string;
  message: string | null;
  paymentMethod: string;
  paymentStatus: "pending" | "completed" | "failed";
  creatorShare: string;
  platformShare: string;
  createdAt: Date;
}

/**
 * Record a tip (85% creator, 15% platform)
 */
export async function recordTip(
  streamId: number,
  userId: number,
  amount: number,
  message?: string
): Promise<Tip> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const creatorShare = amount * 0.85;
  const platformShare = amount * 0.15;

  const result = await db.insert(liveStreamTips).values({
    streamId,
    userId,
    amount: amount.toFixed(2),
    message: message || null,
    creatorShare: creatorShare.toFixed(2),
    platformShare: platformShare.toFixed(2),
  });

  const tipId = Number(result[0].insertId);

  // Update stream total tips
  await updateTotalTips(streamId, amount);

  const tips = await db.select().from(liveStreamTips).where(eq(liveStreamTips.id, tipId));
  return tips[0] as Tip;
}

/**
 * Get tips for a stream
 */
export async function getStreamTips(streamId: number): Promise<Tip[]> {
  const db = await getDb();
  if (!db) return [];

  const tips = await db.select().from(liveStreamTips)
    .where(eq(liveStreamTips.streamId, streamId))
    .orderBy(desc(liveStreamTips.createdAt));

  return tips as Tip[];
}

/**
 * Get tips by user
 */
export async function getTipsByUserId(userId: number): Promise<Tip[]> {
  const db = await getDb();
  if (!db) return [];

  const tips = await db.select().from(liveStreamTips)
    .where(eq(liveStreamTips.userId, userId))
    .orderBy(desc(liveStreamTips.createdAt));

  return tips as Tip[];
}

/**
 * Record a donation (85% creator, 15% platform)
 */
export async function recordDonation(
  streamId: number,
  userId: number,
  amount: number,
  paymentMethod: string,
  message?: string
): Promise<Donation> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const creatorShare = amount * 0.85;
  const platformShare = amount * 0.15;

  const result = await db.insert(liveStreamDonations).values({
    streamId,
    userId,
    amount: amount.toFixed(2),
    message: message || null,
    paymentMethod,
    paymentStatus: "pending",
    creatorShare: creatorShare.toFixed(2),
    platformShare: platformShare.toFixed(2),
  });

  const donationId = Number(result[0].insertId);

  const donations = await db.select().from(liveStreamDonations).where(eq(liveStreamDonations.id, donationId));
  return donations[0] as Donation;
}

/**
 * Update donation payment status
 */
export async function updateDonationStatus(
  donationId: number,
  status: "pending" | "completed" | "failed"
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(liveStreamDonations)
    .set({ paymentStatus: status })
    .where(eq(liveStreamDonations.id, donationId));

  // If completed, update stream total tips
  if (status === "completed") {
    const donations = await db.select().from(liveStreamDonations).where(eq(liveStreamDonations.id, donationId));
    if (donations.length > 0) {
      const donation = donations[0];
      await updateTotalTips(donation.streamId, parseFloat(donation.amount));
    }
  }
}

/**
 * Get donations for a stream
 */
export async function getStreamDonations(streamId: number): Promise<Donation[]> {
  const db = await getDb();
  if (!db) return [];

  const donations = await db.select().from(liveStreamDonations)
    .where(eq(liveStreamDonations.streamId, streamId))
    .orderBy(desc(liveStreamDonations.createdAt));

  return donations as Donation[];
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface StreamStats {
  totalStreams: number;
  totalLiveStreams: number;
  totalViewers: number;
  totalTips: string;
  totalDonations: string;
  averageViewerCount: number;
  peakViewerCount: number;
}

/**
 * Get stream statistics for a user
 */
export async function getStreamStats(userId: number): Promise<StreamStats> {
  const db = await getDb();
  if (!db) {
    return {
      totalStreams: 0,
      totalLiveStreams: 0,
      totalViewers: 0,
      totalTips: "0.00",
      totalDonations: "0.00",
      averageViewerCount: 0,
      peakViewerCount: 0,
    };
  }

  const streamStats = await db.select({
    totalStreams: sql<number>`COUNT(*)`,
    totalLiveStreams: sql<number>`SUM(CASE WHEN status = 'live' THEN 1 ELSE 0 END)`,
    totalViewers: sql<number>`SUM(viewer_count)`,
    totalTips: sql<string>`SUM(total_tips)`,
    averageViewerCount: sql<number>`AVG(viewer_count)`,
    peakViewerCount: sql<number>`MAX(peak_viewer_count)`,
  })
    .from(liveStreams)
    .where(eq(liveStreams.userId, userId));

  const donationStats = await db.select({
    totalDonations: sql<string>`SUM(amount)`,
  })
    .from(liveStreamDonations)
    .where(and(
      eq(liveStreamDonations.userId, userId),
      eq(liveStreamDonations.paymentStatus, "completed")
    ));

  const streamRow = streamStats[0];
  const donationRow = donationStats[0];

  return {
    totalStreams: streamRow?.totalStreams || 0,
    totalLiveStreams: streamRow?.totalLiveStreams || 0,
    totalViewers: streamRow?.totalViewers || 0,
    totalTips: streamRow?.totalTips || "0.00",
    totalDonations: donationRow?.totalDonations || "0.00",
    averageViewerCount: streamRow?.averageViewerCount || 0,
    peakViewerCount: streamRow?.peakViewerCount || 0,
  };
}
