/**
 * Podcast Analytics Service
 * Aggregates metrics from all platforms and provides insights
 */

import { db } from "../db";
import { podcastAnalytics, podcastEpisodes, podcasts } from "../../drizzle/schema-podcasting";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

export interface AnalyticsTimeRange {
  start: Date;
  end: Date;
}

export interface PodcastOverviewStats {
  totalPlays: number;
  totalDownloads: number;
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  uniqueListeners: number;
  averageCompletionRate: number;
  averageListenTime: number;
}

export interface EpisodePerformance {
  episodeId: string;
  episodeTitle: string;
  plays: number;
  downloads: number;
  completionRate: number;
  averageListenTime: number;
  publishedAt: Date;
}

export interface PlatformBreakdown {
  platform: string;
  plays: number;
  downloads: number;
  completionRate: number;
  percentage: number;
}

/**
 * Record analytics data from platform APIs
 * Called when syncing data from Apple Podcasts, Spotify, etc.
 */
export async function recordAnalytics(data: {
  episodeId: string;
  podcastId: string;
  platform: string;
  plays?: number;
  downloads?: number;
  completionRate?: number;
  averageListenTime?: number;
  likes?: number;
  shares?: number;
  comments?: number;
  uniqueListeners?: number;
  recordedAt: Date;
}) {
  const [analytics] = await db
    .insert(podcastAnalytics)
    .values({
      episodeId: data.episodeId,
      podcastId: data.podcastId,
      platform: data.platform as any,
      plays: data.plays || 0,
      downloads: data.downloads || 0,
      completionRate: data.completionRate?.toString(),
      averageListenTime: data.averageListenTime,
      likes: data.likes || 0,
      shares: data.shares || 0,
      comments: data.comments || 0,
      uniqueListeners: data.uniqueListeners,
      recordedAt: data.recordedAt,
    })
    .$returningId();

  return await db.select().from(podcastAnalytics).where(eq(podcastAnalytics.id, analytics.id)).limit(1);
}

/**
 * Get overview stats for podcast
 */
export async function getPodcastOverview(
  podcastId: string,
  timeRange?: AnalyticsTimeRange
): Promise<PodcastOverviewStats> {
  const conditions = [eq(podcastAnalytics.podcastId, podcastId), eq(podcastAnalytics.platform, "aggregate")];

  if (timeRange) {
    conditions.push(gte(podcastAnalytics.recordedAt, timeRange.start));
    conditions.push(lte(podcastAnalytics.recordedAt, timeRange.end));
  }

  const [result] = await db
    .select({
      totalPlays: sql<number>`SUM(${podcastAnalytics.plays})`,
      totalDownloads: sql<number>`SUM(${podcastAnalytics.downloads})`,
      totalLikes: sql<number>`SUM(${podcastAnalytics.likes})`,
      totalShares: sql<number>`SUM(${podcastAnalytics.shares})`,
      totalComments: sql<number>`SUM(${podcastAnalytics.comments})`,
      uniqueListeners: sql<number>`SUM(${podcastAnalytics.uniqueListeners})`,
      averageCompletionRate: sql<number>`AVG(CAST(${podcastAnalytics.completionRate} AS DECIMAL(5,2)))`,
      averageListenTime: sql<number>`AVG(${podcastAnalytics.averageListenTime})`,
    })
    .from(podcastAnalytics)
    .where(and(...conditions));

  return {
    totalPlays: result?.totalPlays || 0,
    totalDownloads: result?.totalDownloads || 0,
    totalLikes: result?.totalLikes || 0,
    totalShares: result?.totalShares || 0,
    totalComments: result?.totalComments || 0,
    uniqueListeners: result?.uniqueListeners || 0,
    averageCompletionRate: result?.averageCompletionRate || 0,
    averageListenTime: result?.averageListenTime || 0,
  };
}

/**
 * Get platform breakdown
 */
export async function getPlatformBreakdown(
  podcastId: string,
  timeRange?: AnalyticsTimeRange
): Promise<PlatformBreakdown[]> {
  const conditions = [eq(podcastAnalytics.podcastId, podcastId)];

  if (timeRange) {
    conditions.push(gte(podcastAnalytics.recordedAt, timeRange.start));
    conditions.push(lte(podcastAnalytics.recordedAt, timeRange.end));
  }

  const results = await db
    .select({
      platform: podcastAnalytics.platform,
      plays: sql<number>`SUM(${podcastAnalytics.plays})`,
      downloads: sql<number>`SUM(${podcastAnalytics.downloads})`,
      completionRate: sql<number>`AVG(CAST(${podcastAnalytics.completionRate} AS DECIMAL(5,2)))`,
    })
    .from(podcastAnalytics)
    .where(and(...conditions))
    .groupBy(podcastAnalytics.platform);

  // Calculate total plays for percentage
  const totalPlays = results.reduce((sum, r) => sum + (r.plays || 0), 0);

  return results
    .filter((r) => r.platform !== "aggregate") // Exclude aggregate stats
    .map((r) => ({
      platform: r.platform,
      plays: r.plays || 0,
      downloads: r.downloads || 0,
      completionRate: r.completionRate || 0,
      percentage: totalPlays > 0 ? ((r.plays || 0) / totalPlays) * 100 : 0,
    }))
    .sort((a, b) => b.plays - a.plays);
}

/**
 * Get top performing episodes
 */
export async function getTopEpisodes(
  podcastId: string,
  limit: number = 10,
  timeRange?: AnalyticsTimeRange
): Promise<EpisodePerformance[]> {
  const conditions = [eq(podcastAnalytics.podcastId, podcastId), eq(podcastAnalytics.platform, "aggregate")];

  if (timeRange) {
    conditions.push(gte(podcastAnalytics.recordedAt, timeRange.start));
    conditions.push(lte(podcastAnalytics.recordedAt, timeRange.end));
  }

  const results = await db
    .select({
      episodeId: podcastAnalytics.episodeId,
      plays: sql<number>`SUM(${podcastAnalytics.plays})`,
      downloads: sql<number>`SUM(${podcastAnalytics.downloads})`,
      completionRate: sql<number>`AVG(CAST(${podcastAnalytics.completionRate} AS DECIMAL(5,2)))`,
      averageListenTime: sql<number>`AVG(${podcastAnalytics.averageListenTime})`,
    })
    .from(podcastAnalytics)
    .where(and(...conditions))
    .groupBy(podcastAnalytics.episodeId)
    .orderBy(desc(sql`SUM(${podcastAnalytics.plays})`))
    .limit(limit);

  // Get episode details
  const episodeIds = results.map((r) => r.episodeId);
  const episodes = await db.select().from(podcastEpisodes).where(sql`${podcastEpisodes.id} IN (${sql.join(episodeIds.map((id) => sql`${id}`), sql`, `)})`);

  return results.map((r) => {
    const episode = episodes.find((e) => e.id === r.episodeId);
    return {
      episodeId: r.episodeId,
      episodeTitle: episode?.title || "Unknown",
      plays: r.plays || 0,
      downloads: r.downloads || 0,
      completionRate: r.completionRate || 0,
      averageListenTime: r.averageListenTime || 0,
      publishedAt: episode?.publishedAt || new Date(),
    };
  });
}

/**
 * Get episode analytics
 */
export async function getEpisodeAnalytics(episodeId: string, timeRange?: AnalyticsTimeRange) {
  const conditions = [eq(podcastAnalytics.episodeId, episodeId)];

  if (timeRange) {
    conditions.push(gte(podcastAnalytics.recordedAt, timeRange.start));
    conditions.push(lte(podcastAnalytics.recordedAt, timeRange.end));
  }

  return await db
    .select()
    .from(podcastAnalytics)
    .where(and(...conditions))
    .orderBy(desc(podcastAnalytics.recordedAt));
}

/**
 * Get growth trends
 */
export async function getGrowthTrends(podcastId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const results = await db
    .select({
      date: sql<string>`DATE(${podcastAnalytics.recordedAt})`,
      plays: sql<number>`SUM(${podcastAnalytics.plays})`,
      downloads: sql<number>`SUM(${podcastAnalytics.downloads})`,
      uniqueListeners: sql<number>`SUM(${podcastAnalytics.uniqueListeners})`,
    })
    .from(podcastAnalytics)
    .where(
      and(
        eq(podcastAnalytics.podcastId, podcastId),
        eq(podcastAnalytics.platform, "aggregate"),
        gte(podcastAnalytics.recordedAt, startDate)
      )
    )
    .groupBy(sql`DATE(${podcastAnalytics.recordedAt})`)
    .orderBy(sql`DATE(${podcastAnalytics.recordedAt})`);

  return results.map((r) => ({
    date: r.date,
    plays: r.plays || 0,
    downloads: r.downloads || 0,
    uniqueListeners: r.uniqueListeners || 0,
  }));
}

/**
 * Calculate growth rate
 */
export async function calculateGrowthRate(podcastId: string, days: number = 30): Promise<number> {
  const now = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - days);
  const previousPeriodStart = new Date();
  previousPeriodStart.setDate(previousPeriodStart.getDate() - days * 2);

  // Current period
  const [currentPeriod] = await db
    .select({
      plays: sql<number>`SUM(${podcastAnalytics.plays})`,
    })
    .from(podcastAnalytics)
    .where(
      and(
        eq(podcastAnalytics.podcastId, podcastId),
        eq(podcastAnalytics.platform, "aggregate"),
        gte(podcastAnalytics.recordedAt, periodStart),
        lte(podcastAnalytics.recordedAt, now)
      )
    );

  // Previous period
  const [previousPeriod] = await db
    .select({
      plays: sql<number>`SUM(${podcastAnalytics.plays})`,
    })
    .from(podcastAnalytics)
    .where(
      and(
        eq(podcastAnalytics.podcastId, podcastId),
        eq(podcastAnalytics.platform, "aggregate"),
        gte(podcastAnalytics.recordedAt, previousPeriodStart),
        lte(podcastAnalytics.recordedAt, periodStart)
      )
    );

  const currentPlays = currentPeriod?.plays || 0;
  const previousPlays = previousPeriod?.plays || 0;

  if (previousPlays === 0) return 0;

  const growthRate = ((currentPlays - previousPlays) / previousPlays) * 100;
  return Math.round(growthRate * 100) / 100; // Round to 2 decimal places
}

/**
 * Aggregate analytics from all platforms
 * Called periodically to create aggregate records
 */
export async function aggregatePlatformAnalytics(episodeId: string, podcastId: string, recordedAt: Date) {
  // Get all platform analytics for this episode
  const platformStats = await db
    .select()
    .from(podcastAnalytics)
    .where(
      and(
        eq(podcastAnalytics.episodeId, episodeId),
        eq(podcastAnalytics.recordedAt, recordedAt),
        sql`${podcastAnalytics.platform} != 'aggregate'`
      )
    );

  if (platformStats.length === 0) return null;

  // Calculate aggregates
  const totalPlays = platformStats.reduce((sum, s) => sum + (s.plays || 0), 0);
  const totalDownloads = platformStats.reduce((sum, s) => sum + (s.downloads || 0), 0);
  const totalLikes = platformStats.reduce((sum, s) => sum + (s.likes || 0), 0);
  const totalShares = platformStats.reduce((sum, s) => sum + (s.shares || 0), 0);
  const totalComments = platformStats.reduce((sum, s) => sum + (s.comments || 0), 0);
  const totalUniqueListeners = platformStats.reduce((sum, s) => sum + (s.uniqueListeners || 0), 0);

  const avgCompletionRate =
    platformStats.reduce((sum, s) => sum + (Number(s.completionRate) || 0), 0) / platformStats.length;
  const avgListenTime =
    platformStats.reduce((sum, s) => sum + (s.averageListenTime || 0), 0) / platformStats.length;

  // Create or update aggregate record
  return await recordAnalytics({
    episodeId,
    podcastId,
    platform: "aggregate",
    plays: totalPlays,
    downloads: totalDownloads,
    likes: totalLikes,
    shares: totalShares,
    comments: totalComments,
    uniqueListeners: totalUniqueListeners,
    completionRate: avgCompletionRate,
    averageListenTime: Math.round(avgListenTime),
    recordedAt,
  });
}
