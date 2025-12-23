/**
 * Creator Analytics Service
 * 
 * Original vision: "Detailed stats and analytics about the number of views, 
 * likes, shares etc are needed for certain payouts. Everyone that signs up 
 * should be monetized correctly and earning money as they learn and grow 
 * their platforms."
 */

import { db } from "../db";
import {
  creatorMetrics,
  monetizationMilestones,
  revenueProjections,
  platformPosts,
  platformCredentials,
  type InsertCreatorMetric,
  type InsertMonetizationMilestone,
  type InsertRevenueProjection,
} from "../../drizzle/schema-multiplatform";

export type Platform = "tiktok" | "instagram" | "youtube" | "twitter" | "facebook" | "linkedin" | "pinterest" | "snapchat";
import { eq, and, desc, gte, sql } from "drizzle-orm";

// ============ TYPES ============

export interface OverviewStats {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgEngagementRate: number;
  totalRevenue: number; // In cents
  totalPosts: number;
  followersGained: number;
}

export interface PlatformBreakdown {
  platform: Platform;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  posts: number;
  revenue: number;
}

export interface MilestoneProgress {
  id: string;
  platform: Platform;
  thresholdType: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  progressPercentage: number;
  estimatedReachDate: Date | null;
  payoutAmount: number | null;
  status: "in_progress" | "achieved" | "stalled";
}

export interface GrowthTrend {
  date: string;
  views: number;
  engagement: number;
  followers: number;
  revenue: number;
}

// ============ PLATFORM API FETCHING ============

/**
 * Fetch metrics from TikTok API
 */
async function fetchTikTokMetrics(
  accessToken: string,
  platformUserId: string,
  postIds: string[]
): Promise<any[]> {
  try {
    // TikTok Creator API
    // https://developers.tiktok.com/doc/creator-api-get-started/
    
    const response = await fetch(
      `https://open.tiktokapis.com/v2/research/video/query/?fields=id,like_count,comment_count,share_count,view_count`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filters: {
            video_id: postIds,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("TikTok API error:", await response.text());
      return [];
    }

    const data = await response.json();
    return data.data?.videos || [];
  } catch (error) {
    console.error("TikTok fetch error:", error);
    return [];
  }
}

/**
 * Fetch metrics from Instagram API
 */
async function fetchInstagramMetrics(
  accessToken: string,
  platformUserId: string,
  postIds: string[]
): Promise<any[]> {
  try {
    // Instagram Graph API
    // https://developers.facebook.com/docs/instagram-api/reference/ig-media/insights
    
    const metrics: any[] = [];

    for (const postId of postIds) {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${postId}/insights?metric=impressions,reach,likes,comments,shares,saves,engagement&access_token=${accessToken}`,
        { method: "GET" }
      );

      if (response.ok) {
        const data = await response.json();
        metrics.push({ postId, insights: data.data });
      }
    }

    return metrics;
  } catch (error) {
    console.error("Instagram fetch error:", error);
    return [];
  }
}

/**
 * Fetch metrics from YouTube API
 */
async function fetchYouTubeMetrics(
  accessToken: string,
  videoIds: string[]
): Promise<any[]> {
  try {
    // YouTube Data API v3
    // https://developers.google.com/youtube/v3/docs/videos/list
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds.join(",")}&access_token=${accessToken}`,
      { method: "GET" }
    );

    if (!response.ok) {
      console.error("YouTube API error:", await response.text());
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("YouTube fetch error:", error);
    return [];
  }
}

/**
 * Fetch metrics from Twitter API
 */
async function fetchTwitterMetrics(
  accessToken: string,
  tweetIds: string[]
): Promise<any[]> {
  try {
    // Twitter API v2
    // https://developer.twitter.com/en/docs/twitter-api/metrics
    
    const response = await fetch(
      `https://api.twitter.com/2/tweets?ids=${tweetIds.join(",")}&tweet.fields=public_metrics`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Twitter API error:", await response.text());
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Twitter fetch error:", error);
    return [];
  }
}

/**
 * Fetch metrics from all platforms for a user
 */
export async function fetchPlatformMetrics(userId: number): Promise<{ success: boolean; synced: number; error?: string }> {
  try {
    let synced = 0;

    // Get user's connected platforms
    const credentials = await db
      .select()
      .from(platformCredentials)
      .where(and(eq(platformCredentials.userId, userId), eq(platformCredentials.status, "active")));

    for (const credential of credentials) {
      // Get posts for this platform
      const posts = await db
        .select()
        .from(platformPosts)
        .where(
          and(
            eq(platformPosts.userId, userId),
            eq(platformPosts.platform, credential.platform),
            eq(platformPosts.status, "published")
          )
        );

      if (posts.length === 0) continue;

      const postIds = posts.map((p) => p.platformPostId);

      // Fetch metrics based on platform
      let metricsData: any[] = [];

      switch (credential.platform) {
        case "tiktok":
          metricsData = await fetchTikTokMetrics(credential.accessToken, credential.platformUserId, postIds);
          break;
        case "instagram":
          metricsData = await fetchInstagramMetrics(credential.accessToken, credential.platformUserId, postIds);
          break;
        case "youtube":
          metricsData = await fetchYouTubeMetrics(credential.accessToken, postIds);
          break;
        case "twitter":
          metricsData = await fetchTwitterMetrics(credential.accessToken, postIds);
          break;
      }

      // Store metrics in database
      for (const post of posts) {
        const metricData = metricsData.find((m: any) =>
          m.id === post.platformPostId || m.postId === post.platformPostId
        );

        if (!metricData) continue;

        // Parse platform-specific metrics
        let views = 0, likes = 0, comments = 0, shares = 0, saves = 0;

        if (credential.platform === "tiktok") {
          views = metricData.view_count || 0;
          likes = metricData.like_count || 0;
          comments = metricData.comment_count || 0;
          shares = metricData.share_count || 0;
        } else if (credential.platform === "instagram") {
          const insights = metricData.insights || [];
          views = insights.find((i: any) => i.name === "impressions")?.values[0]?.value || 0;
          likes = insights.find((i: any) => i.name === "likes")?.values[0]?.value || 0;
          comments = insights.find((i: any) => i.name === "comments")?.values[0]?.value || 0;
          shares = insights.find((i: any) => i.name === "shares")?.values[0]?.value || 0;
          saves = insights.find((i: any) => i.name === "saves")?.values[0]?.value || 0;
        } else if (credential.platform === "youtube") {
          const stats = metricData.statistics || {};
          views = parseInt(stats.viewCount || "0");
          likes = parseInt(stats.likeCount || "0");
          comments = parseInt(stats.commentCount || "0");
        } else if (credential.platform === "twitter") {
          const metrics = metricData.public_metrics || {};
          views = metrics.impression_count || 0;
          likes = metrics.like_count || 0;
          comments = metrics.reply_count || 0;
          shares = metrics.retweet_count || 0;
        }

        // Calculate engagement rate
        const engagementRate = views > 0 ? ((likes + comments + shares) / views) * 100 : 0;

        const metricRecord: InsertCreatorMetric = {
          userId,
          platformPostId: post.id,
          platform: credential.platform,
          views,
          likes,
          comments,
          shares,
          saves,
          engagementRate: engagementRate.toFixed(2),
          recordedAt: new Date(),
        };

        await db.insert(creatorMetrics).values(metricRecord);
        synced++;
      }
    }

    return { success: true, synced };
  } catch (error: any) {
    return { success: false, synced: 0, error: `Fetch failed: ${error.message}` };
  }
}

// ============ ANALYTICS AGGREGATION ============

/**
 * Get overview stats for a user
 */
export async function getOverviewStats(userId: number, days: number = 30): Promise<OverviewStats> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const metrics = await db
    .select()
    .from(creatorMetrics)
    .where(and(eq(creatorMetrics.userId, userId), gte(creatorMetrics.recordedAt, since)));

  const totalViews = metrics.reduce((sum, m) => sum + (m.views || 0), 0);
  const totalLikes = metrics.reduce((sum, m) => sum + (m.likes || 0), 0);
  const totalComments = metrics.reduce((sum, m) => sum + (m.comments || 0), 0);
  const totalShares = metrics.reduce((sum, m) => sum + (m.shares || 0), 0);
  const totalRevenue = metrics.reduce((sum, m) => sum + (m.revenue || 0), 0);
  const followersGained = metrics.reduce((sum, m) => sum + (m.followersGained || 0), 0);

  const avgEngagementRate =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + parseFloat(m.engagementRate || "0"), 0) / metrics.length
      : 0;

  const totalPosts = new Set(metrics.map((m) => m.platformPostId)).size;

  return {
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    avgEngagementRate,
    totalRevenue,
    totalPosts,
    followersGained,
  };
}

/**
 * Get platform breakdown
 */
export async function getPlatformBreakdown(userId: number, days: number = 30): Promise<PlatformBreakdown[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const metrics = await db
    .select()
    .from(creatorMetrics)
    .where(and(eq(creatorMetrics.userId, userId), gte(creatorMetrics.recordedAt, since)));

  const platformMap = new Map<Platform, PlatformBreakdown>();

  for (const metric of metrics) {
    const platform = metric.platform;
    const existing = platformMap.get(platform) || {
      platform,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      engagementRate: 0,
      posts: 0,
      revenue: 0,
    };

    existing.views += metric.views || 0;
    existing.likes += metric.likes || 0;
    existing.comments += metric.comments || 0;
    existing.shares += metric.shares || 0;
    existing.revenue += metric.revenue || 0;
    existing.posts++;

    platformMap.set(platform, existing);
  }

  // Calculate average engagement rates
  const breakdown = Array.from(platformMap.values());
  for (const platform of breakdown) {
    const platformMetrics = metrics.filter((m) => m.platform === platform.platform);
    platform.engagementRate =
      platformMetrics.reduce((sum, m) => sum + parseFloat(m.engagementRate || "0"), 0) /
      platformMetrics.length;
  }

  return breakdown.sort((a, b) => b.views - a.views);
}

/**
 * Get top performing posts
 */
export async function getTopPerformingPosts(userId: number, limit: number = 10) {
  return await db
    .select()
    .from(creatorMetrics)
    .where(eq(creatorMetrics.userId, userId))
    .orderBy(desc(creatorMetrics.views))
    .limit(limit);
}

/**
 * Get growth trends
 */
export async function getGrowthTrends(userId: number, days: number = 30): Promise<GrowthTrend[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const metrics = await db
    .select()
    .from(creatorMetrics)
    .where(and(eq(creatorMetrics.userId, userId), gte(creatorMetrics.recordedAt, since)))
    .orderBy(creatorMetrics.recordedAt);

  // Group by date
  const trendMap = new Map<string, GrowthTrend>();

  for (const metric of metrics) {
    const date = metric.recordedAt.toISOString().split("T")[0];
    const existing = trendMap.get(date) || {
      date,
      views: 0,
      engagement: 0,
      followers: 0,
      revenue: 0,
    };

    existing.views += metric.views || 0;
    existing.engagement += (metric.likes || 0) + (metric.comments || 0) + (metric.shares || 0);
    existing.followers += metric.followersGained || 0;
    existing.revenue += metric.revenue || 0;

    trendMap.set(date, existing);
  }

  return Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ============ MONETIZATION MILESTONES ============

/**
 * Calculate monetization milestones for a user
 */
export async function calculateMonetizationMilestones(userId: number): Promise<void> {
  // Get user's connected platforms
  const credentials = await db
    .select()
    .from(platformCredentials)
    .where(and(eq(platformCredentials.userId, userId), eq(platformCredentials.status, "active")));

  for (const credential of credentials) {
    // Define platform-specific milestones
    const milestones: Array<{
      thresholdType: any;
      targetValue: number;
      unit: string;
      payoutAmount?: number;
    }> = [];

    if (credential.platform === "youtube") {
      milestones.push({
        thresholdType: "youtube_partner",
        targetValue: 1000,
        unit: "subscribers",
        payoutAmount: 10000, // $100/month estimated
      });
    } else if (credential.platform === "tiktok") {
      milestones.push({
        thresholdType: "tiktok_creator_fund",
        targetValue: 10000,
        unit: "followers",
        payoutAmount: 20000, // $200/month estimated
      });
    } else if (credential.platform === "instagram") {
      milestones.push({
        thresholdType: "instagram_monetization",
        targetValue: 10000,
        unit: "followers",
        payoutAmount: 15000, // $150/month estimated
      });
    }

    for (const milestone of milestones) {
      // Check if milestone already exists
      const [existing] = await db
        .select()
        .from(monetizationMilestones)
        .where(
          and(
            eq(monetizationMilestones.userId, userId),
            eq(monetizationMilestones.platform, credential.platform),
            eq(monetizationMilestones.thresholdType, milestone.thresholdType)
          )
        )
        .limit(1);

      if (existing) continue;

      // Create milestone
      const milestoneRecord: InsertMonetizationMilestone = {
        userId,
        platform: credential.platform,
        thresholdType: milestone.thresholdType,
        currentValue: credential.followerCount || 0,
        targetValue: milestone.targetValue,
        unit: milestone.unit,
        payoutAmount: milestone.payoutAmount,
        status: "in_progress",
      };

      await db.insert(monetizationMilestones).values(milestoneRecord);
    }
  }
}

/**
 * Get monetization milestones for a user
 */
export async function getMonetizationMilestones(userId: number): Promise<MilestoneProgress[]> {
  const milestones = await db
    .select()
    .from(monetizationMilestones)
    .where(eq(monetizationMilestones.userId, userId));

  return milestones.map((m) => ({
    id: m.id,
    platform: m.platform,
    thresholdType: m.thresholdType,
    currentValue: m.currentValue || 0,
    targetValue: m.targetValue,
    unit: m.unit,
    progressPercentage: Math.round(((m.currentValue || 0) / m.targetValue) * 100),
    estimatedReachDate: m.estimatedReachDate,
    payoutAmount: m.payoutAmount,
    status: m.status,
  }));
}

// ============ REVENUE PROJECTIONS ============

/**
 * Predict revenue based on current growth
 */
export async function predictRevenue(userId: number): Promise<void> {
  const stats = await getOverviewStats(userId, 30);
  const trends = await getGrowthTrends(userId, 30);

  if (trends.length < 7) {
    // Not enough data
    return;
  }

  // Calculate growth rate
  const recentRevenue = trends.slice(-7).reduce((sum, t) => sum + t.revenue, 0);
  const previousRevenue = trends.slice(-14, -7).reduce((sum, t) => sum + t.revenue, 0);
  const growthRate = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

  // Project revenue
  const currentMonthlyRevenue = stats.totalRevenue;
  const projected30d = Math.round(currentMonthlyRevenue * (1 + growthRate / 100));
  const projected90d = Math.round(currentMonthlyRevenue * Math.pow(1 + growthRate / 100, 3));
  const projected180d = Math.round(currentMonthlyRevenue * Math.pow(1 + growthRate / 100, 6));
  const projected365d = Math.round(currentMonthlyRevenue * Math.pow(1 + growthRate / 100, 12));

  const projectionRecord: InsertRevenueProjection = {
    userId,
    projected30dRevenue: projected30d,
    projected90dRevenue: projected90d,
    projected180dRevenue: projected180d,
    projected365dRevenue: projected365d,
    currentMonthlyRevenue,
    growthRate: growthRate.toFixed(2),
    confidenceScore: trends.length >= 30 ? 80 : 50,
  };

  await db.insert(revenueProjections).values(projectionRecord);
}

/**
 * Get revenue projections for a user
 */
export async function getRevenueProjections(userId: number) {
  return await db
    .select()
    .from(revenueProjections)
    .where(eq(revenueProjections.userId, userId))
    .orderBy(desc(revenueProjections.calculatedAt))
    .limit(1);
}
