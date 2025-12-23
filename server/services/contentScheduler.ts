/**
 * Content Scheduler Service
 * 
 * Manages scheduled posts and provides optimal posting time recommendations
 */

import { db } from "../db";
import { scheduledPosts, postingTimesAnalytics, type InsertScheduledPost } from "../../drizzle/schema-multiplatform";
import { eq, and, gte, lte } from "drizzle-orm";
import { postToMultiplePlatforms, type Platform } from "./platformPosting";

// Re-export Platform type
export type { Platform };

// ============ TYPES ============

export interface SchedulePostInput {
  userId: number;
  caption: string;
  hashtags?: string;
  mediaUrls?: string[];
  contentType: "text" | "image" | "video" | "carousel" | "story" | "reel" | "short";
  platforms: Platform[];
  scheduledFor: Date;
  timezone?: string;
}

export interface OptimalPostingTime {
  platform: Platform;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  hour: number; // 0-23 (UTC)
  avgEngagementRate: number;
  score: number; // 0-100
}

// ============ OPTIMAL POSTING TIMES ============

/**
 * Get optimal posting times for a platform
 * Based on historical engagement data
 */
export async function getOptimalPostingTimes(platform: Platform): Promise<OptimalPostingTime[]> {
  const analytics = await db
    .select()
    .from(postingTimesAnalytics)
    .where(eq(postingTimesAnalytics.platform, platform))
    .orderBy(postingTimesAnalytics.avgEngagementRate);

  // Convert to optimal times with scores
  const optimalTimes: OptimalPostingTime[] = analytics.map((record) => {
    const engagementRate = parseFloat(record.avgEngagementRate || "0");
    
    // Score based on engagement rate and sample size
    const sampleWeight = Math.min(record.sampleSize || 0, 100) / 100; // Max weight at 100 samples
    const score = Math.round(engagementRate * sampleWeight);

    return {
      platform,
      dayOfWeek: record.dayOfWeek,
      hour: record.hour,
      avgEngagementRate: engagementRate,
      score,
    };
  });

  // Return top 10 times sorted by score
  return optimalTimes.sort((a, b) => b.score - a.score).slice(0, 10);
}

/**
 * Get default optimal posting times (if no analytics data exists)
 * Based on industry research
 */
function getDefaultOptimalTimes(platform: Platform): OptimalPostingTime[] {
  const defaults: Record<Platform, { day: number; hour: number }[]> = {
    tiktok: [
      { day: 2, hour: 18 }, // Tuesday 6 PM
      { day: 4, hour: 19 }, // Thursday 7 PM
      { day: 5, hour: 17 }, // Friday 5 PM
    ],
    instagram: [
      { day: 3, hour: 17 }, // Wednesday 5 PM
      { day: 5, hour: 11 }, // Friday 11 AM
      { day: 6, hour: 14 }, // Saturday 2 PM
    ],
    youtube: [
      { day: 5, hour: 15 }, // Friday 3 PM
      { day: 6, hour: 10 }, // Saturday 10 AM
      { day: 0, hour: 14 }, // Sunday 2 PM
    ],
    twitter: [
      { day: 3, hour: 12 }, // Wednesday 12 PM
      { day: 4, hour: 9 },  // Thursday 9 AM
      { day: 5, hour: 16 }, // Friday 4 PM
    ],
    facebook: [
      { day: 3, hour: 13 }, // Wednesday 1 PM
      { day: 4, hour: 15 }, // Thursday 3 PM
      { day: 6, hour: 12 }, // Saturday 12 PM
    ],
    linkedin: [
      { day: 2, hour: 10 }, // Tuesday 10 AM
      { day: 3, hour: 12 }, // Wednesday 12 PM
      { day: 4, hour: 9 },  // Thursday 9 AM
    ],
    pinterest: [
      { day: 6, hour: 20 }, // Saturday 8 PM
      { day: 0, hour: 21 }, // Sunday 9 PM
      { day: 5, hour: 15 }, // Friday 3 PM
    ],
    snapchat: [
      { day: 5, hour: 22 }, // Friday 10 PM
      { day: 6, hour: 11 }, // Saturday 11 AM
      { day: 0, hour: 19 }, // Sunday 7 PM
    ],
  };

  return (defaults[platform] || []).map((time) => ({
    platform,
    dayOfWeek: time.day,
    hour: time.hour,
    avgEngagementRate: 5.0, // Default 5% engagement
    score: 75, // Default score
  }));
}

/**
 * Recommend next optimal posting time for a platform
 */
export async function recommendNextPostingTime(platform: Platform): Promise<Date> {
  const optimalTimes = await getOptimalPostingTimes(platform);
  const times = optimalTimes.length > 0 ? optimalTimes : getDefaultOptimalTimes(platform);

  if (times.length === 0) {
    // Fallback: tomorrow at 3 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(15, 0, 0, 0);
    return tomorrow;
  }

  // Find next occurrence of top optimal time
  const topTime = times[0];
  const now = new Date();
  const currentDay = now.getUTCDay();
  const currentHour = now.getUTCHours();

  let daysUntil = topTime.dayOfWeek - currentDay;
  if (daysUntil < 0 || (daysUntil === 0 && currentHour >= topTime.hour)) {
    daysUntil += 7; // Next week
  }

  const nextTime = new Date(now);
  nextTime.setUTCDate(nextTime.getUTCDate() + daysUntil);
  nextTime.setUTCHours(topTime.hour, 0, 0, 0);

  return nextTime;
}

// ============ SCHEDULING ============

/**
 * Schedule a post for future publishing
 */
export async function schedulePost(input: SchedulePostInput): Promise<{ success: boolean; scheduleId?: string; error?: string }> {
  try {
    // Validate scheduled time is in the future
    if (input.scheduledFor <= new Date()) {
      return { success: false, error: "Scheduled time must be in the future" };
    }

    // Check if time is optimal
    const isOptimalTime = await isOptimalPostingTime(input.platforms[0], input.scheduledFor);

    const scheduleRecord: InsertScheduledPost = {
      userId: input.userId,
      caption: input.caption,
      hashtags: input.hashtags,
      mediaUrls: input.mediaUrls,
      contentType: input.contentType,
      platforms: input.platforms,
      scheduledFor: input.scheduledFor,
      timezone: input.timezone || "UTC",
      status: "scheduled",
      isOptimalTime,
    };

    const [inserted] = await db.insert(scheduledPosts).values(scheduleRecord).$returningId();

    return { success: true, scheduleId: inserted.id };
  } catch (error: any) {
    return { success: false, error: `Schedule failed: ${error.message}` };
  }
}

/**
 * Check if a time is optimal for posting
 */
async function isOptimalPostingTime(platform: Platform, scheduledFor: Date): Promise<boolean> {
  const dayOfWeek = scheduledFor.getUTCDay();
  const hour = scheduledFor.getUTCHours();

  const optimalTimes = await getOptimalPostingTimes(platform);
  if (optimalTimes.length === 0) {
    return false;
  }

  // Check if within 1 hour of any optimal time
  return optimalTimes.some(
    (time) => time.dayOfWeek === dayOfWeek && Math.abs(time.hour - hour) <= 1
  );
}

/**
 * Get scheduled posts for a user
 */
export async function getScheduledPosts(userId: number, status?: "scheduled" | "processing" | "published" | "failed" | "cancelled") {
  const conditions = [eq(scheduledPosts.userId, userId)];
  if (status) {
    conditions.push(eq(scheduledPosts.status, status));
  }

  return await db
    .select()
    .from(scheduledPosts)
    .where(and(...conditions))
    .orderBy(scheduledPosts.scheduledFor);
}

/**
 * Cancel a scheduled post
 */
export async function cancelScheduledPost(scheduleId: string, userId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const [post] = await db
      .select()
      .from(scheduledPosts)
      .where(and(eq(scheduledPosts.id, scheduleId), eq(scheduledPosts.userId, userId)))
      .limit(1);

    if (!post) {
      return { success: false, error: "Scheduled post not found" };
    }

    if (post.status !== "scheduled") {
      return { success: false, error: `Cannot cancel post with status: ${post.status}` };
    }

    await db
      .update(scheduledPosts)
      .set({ status: "cancelled" })
      .where(eq(scheduledPosts.id, scheduleId));

    return { success: true };
  } catch (error: any) {
    return { success: false, error: `Cancel failed: ${error.message}` };
  }
}

/**
 * Reschedule a post
 */
export async function reschedulePost(
  scheduleId: string,
  userId: number,
  newScheduledFor: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    if (newScheduledFor <= new Date()) {
      return { success: false, error: "New scheduled time must be in the future" };
    }

    const [post] = await db
      .select()
      .from(scheduledPosts)
      .where(and(eq(scheduledPosts.id, scheduleId), eq(scheduledPosts.userId, userId)))
      .limit(1);

    if (!post) {
      return { success: false, error: "Scheduled post not found" };
    }

    if (post.status !== "scheduled") {
      return { success: false, error: `Cannot reschedule post with status: ${post.status}` };
    }

    const isOptimalTime = await isOptimalPostingTime(post.platforms[0] as Platform, newScheduledFor);

    await db
      .update(scheduledPosts)
      .set({ scheduledFor: newScheduledFor, isOptimalTime })
      .where(eq(scheduledPosts.id, scheduleId));

    return { success: true };
  } catch (error: any) {
    return { success: false, error: `Reschedule failed: ${error.message}` };
  }
}

/**
 * Execute scheduled posts (called by cron job)
 * Processes posts scheduled for the current time
 */
export async function executeScheduledPosts(): Promise<{ processed: number; succeeded: number; failed: number }> {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  // Get posts scheduled between 5 minutes ago and now
  const postsToExecute = await db
    .select()
    .from(scheduledPosts)
    .where(
      and(
        eq(scheduledPosts.status, "scheduled"),
        gte(scheduledPosts.scheduledFor, fiveMinutesAgo),
        lte(scheduledPosts.scheduledFor, now)
      )
    );

  let succeeded = 0;
  let failed = 0;

  for (const post of postsToExecute) {
    try {
      // Mark as processing
      await db
        .update(scheduledPosts)
        .set({ status: "processing" })
        .where(eq(scheduledPosts.id, post.id));

      // Post to platforms
      const results = await postToMultiplePlatforms(post.userId, post.platforms as Platform[], {
        caption: post.caption || "",
        hashtags: post.hashtags || undefined,
        mediaUrls: post.mediaUrls || undefined,
        contentType: post.contentType,
      });

      // Check if all succeeded
      const allSucceeded = Object.values(results).every((r) => r.success);

      if (allSucceeded) {
        // Extract platform post IDs
        const platformPostIds = Object.entries(results).map(([platform, result]) => ({
          platform,
          postId: result.postId || "",
        }));

        await db
          .update(scheduledPosts)
          .set({
            status: "published",
            executedAt: new Date(),
            platformPostIds,
          })
          .where(eq(scheduledPosts.id, post.id));

        succeeded++;
      } else {
        // At least one failed
        const errors = Object.entries(results)
          .filter(([_, r]) => !r.success)
          .map(([platform, r]) => `${platform}: ${r.error}`)
          .join("; ");

        await db
          .update(scheduledPosts)
          .set({
            status: "failed",
            executedAt: new Date(),
            errorMessage: errors,
          })
          .where(eq(scheduledPosts.id, post.id));

        failed++;
      }
    } catch (error: any) {
      await db
        .update(scheduledPosts)
        .set({
          status: "failed",
          errorMessage: `Execution error: ${error.message}`,
        })
        .where(eq(scheduledPosts.id, post.id));

      failed++;
    }
  }

  return {
    processed: postsToExecute.length,
    succeeded,
    failed,
  };
}

/**
 * Bulk schedule posts from CSV data
 */
export async function bulkSchedule(
  userId: number,
  posts: Array<{
    caption: string;
    hashtags?: string;
    mediaUrls?: string[];
    contentType: "text" | "image" | "video" | "carousel" | "story" | "reel" | "short";
    platforms: Platform[];
    scheduledFor: Date;
  }>
): Promise<{ success: boolean; scheduled: number; failed: number; errors: string[] }> {
  let scheduled = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const post of posts) {
    const result = await schedulePost({
      userId,
      ...post,
    });

    if (result.success) {
      scheduled++;
    } else {
      failed++;
      errors.push(result.error || "Unknown error");
    }
  }

  return {
    success: failed === 0,
    scheduled,
    failed,
    errors,
  };
}
