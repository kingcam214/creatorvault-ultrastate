/**
 * Performance Feedback Service
 * 
 * Closes the learning loop by feeding real performance data back into optimization models.
 * 
 * Flow:
 * 1. Content is published via orchestrator
 * 2. Platform APIs report performance metrics (views, likes, shares, etc.)
 * 3. This service collects and aggregates metrics
 * 4. Metrics are analyzed to identify what worked/didn't work
 * 5. Insights feed back into viral optimizer, thumbnail generator, etc.
 * 6. Future content benefits from learned patterns
 * 
 * This is what makes CreatorVault's AI actually learn and improve over time.
 */

import { getDb } from "../db";
import {
  contentPerformance,
  unifiedContent,
  orchestrationRuns,
  optimizationHistory,
} from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";

/**
 * Performance Metrics Input
 * 
 * Raw metrics from platform APIs.
 */
export interface PerformanceMetricsInput {
  contentId: string;
  platform: string;
  
  // Engagement metrics
  views?: number;
  likes?: number;
  shares?: number;
  comments?: number;
  saves?: number;
  
  // Advanced metrics
  watchTime?: number; // seconds
  completionRate?: number; // 0-1
  clickThroughRate?: number; // 0-1
  engagementRate?: number; // 0-1
  
  // Revenue metrics
  revenue?: number;
  cpm?: number; // Cost per mille (thousand impressions)
  
  // Timestamp
  recordedAt?: Date;
}

/**
 * Performance Analysis
 * 
 * Analyzed performance with insights.
 */
export interface PerformanceAnalysis {
  contentId: string;
  orchestrationId: string;
  
  // Overall performance
  overallScore: number; // 0-100
  performanceLevel: "poor" | "average" | "good" | "excellent" | "viral";
  
  // Metric breakdown
  metrics: {
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    totalComments: number;
    avgEngagementRate: number;
    avgCompletionRate: number;
    totalRevenue: number;
  };
  
  // Platform breakdown
  platformPerformance: Record<string, {
    views: number;
    engagementRate: number;
    performanceScore: number;
  }>;
  
  // Insights
  insights: string[];
  
  // What worked
  successFactors: string[];
  
  // What didn't work
  improvementAreas: string[];
}

/**
 * Optimization Feedback
 * 
 * Feedback to improve optimization models.
 */
export interface OptimizationFeedback {
  // What was predicted
  predicted: {
    viralScore?: number;
    thumbnailScore?: number;
    adScore?: number;
  };
  
  // What actually happened
  actual: {
    performanceScore: number;
    engagementRate: number;
    viralityAchieved: boolean;
  };
  
  // Accuracy
  predictionAccuracy: number; // 0-1
  
  // Learnings
  learnings: {
    titlePatterns?: string[];
    thumbnailPatterns?: string[];
    timingPatterns?: string[];
    platformPatterns?: string[];
  };
}

/**
 * ============================================
 * PERFORMANCE COLLECTION
 * ============================================
 */

/**
 * Record Performance Metrics
 * 
 * Updates aggregate performance metrics for content.
 * This should be called after collecting metrics from platform APIs.
 */
export async function recordPerformanceMetrics(
  metrics: PerformanceMetricsInput
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get content and orchestration info
  const content = await db
    .select()
    .from(unifiedContent)
    .where(eq(unifiedContent.id, metrics.contentId))
    .limit(1);
  
  if (!content[0]) {
    throw new Error(`Content not found: ${metrics.contentId}`);
  }
  
  const orchestrationId = content[0].orchestrationId;
  if (!orchestrationId) {
    throw new Error(`No orchestration ID for content: ${metrics.contentId}`);
  }
  
  // Check if performance record exists
  const existing = await db
    .select()
    .from(contentPerformance)
    .where(eq(contentPerformance.contentId, metrics.contentId))
    .limit(1);
  
  const engagementRate = metrics.engagementRate ? String(metrics.engagementRate) : null;
  const revenueGenerated = metrics.revenue ? String(metrics.revenue) : "0.00";
  
  if (existing[0]) {
    // Update existing record
    await db.update(contentPerformance)
      .set({
        totalViews: (existing[0].totalViews || 0) + (metrics.views || 0),
        totalLikes: (existing[0].totalLikes || 0) + (metrics.likes || 0),
        totalShares: (existing[0].totalShares || 0) + (metrics.shares || 0),
        totalComments: (existing[0].totalComments || 0) + (metrics.comments || 0),
        engagementRate,
        revenueGenerated,
        updatedAt: new Date(),
      })
      .where(eq(contentPerformance.id, existing[0].id));
  } else {
    // Create new record
    await db.insert(contentPerformance).values({
      id: crypto.randomUUID(),
      contentId: metrics.contentId,
      orchestrationId,
      totalViews: metrics.views || 0,
      totalLikes: metrics.likes || 0,
      totalShares: metrics.shares || 0,
      totalComments: metrics.comments || 0,
      engagementRate,
      revenueGenerated,
    });
  }
}

/**
 * ============================================
 * PERFORMANCE ANALYSIS
 * ============================================
 */

/**
 * Analyze Performance
 * 
 * Analyzes collected performance data and generates insights.
 */
export async function analyzePerformance(
  contentId: string
): Promise<PerformanceAnalysis> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get content
  const content = await db
    .select()
    .from(unifiedContent)
    .where(eq(unifiedContent.id, contentId))
    .limit(1);
  
  if (!content[0]) {
    throw new Error(`Content not found: ${contentId}`);
  }
  
  const orchestrationId = content[0].orchestrationId;
  if (!orchestrationId) {
    throw new Error(`No orchestration ID for content: ${contentId}`);
  }
  
  // Get performance record
  const performanceRecords = await db
    .select()
    .from(contentPerformance)
    .where(eq(contentPerformance.contentId, contentId))
    .limit(1);
  
  if (!performanceRecords[0]) {
    throw new Error(`No performance data for content: ${contentId}`);
  }
  
  const perf = performanceRecords[0];
  
  // Build metrics object
  const metrics = {
    totalViews: perf.totalViews || 0,
    totalLikes: perf.totalLikes || 0,
    totalShares: perf.totalShares || 0,
    totalComments: perf.totalComments || 0,
    avgEngagementRate: parseFloat(perf.engagementRate || "0"),
    avgCompletionRate: 0, // Would need to calculate from platform-specific data
    totalRevenue: parseFloat(perf.revenueGenerated || "0"),
  };
  
  // Platform breakdown (simplified - would need creator_metrics table for detailed breakdown)
  const platformPerformance: Record<string, any> = {
    aggregate: {
      views: metrics.totalViews,
      engagementRate: metrics.avgEngagementRate,
      performanceScore: 0, // Will be calculated below
    },
  };
  
  // Calculate overall score (0-100)
  const overallScore = calculatePerformanceScore(metrics);
  
  // Determine performance level
  const performanceLevel = 
    overallScore >= 90 ? "viral" :
    overallScore >= 70 ? "excellent" :
    overallScore >= 50 ? "good" :
    overallScore >= 30 ? "average" :
    "poor";
  
  // Generate insights
  const insights = generateInsights(metrics, platformPerformance, content[0]);
  
  // Identify success factors
  const successFactors = identifySuccessFactors(metrics, platformPerformance);
  
  // Identify improvement areas
  const improvementAreas = identifyImprovementAreas(metrics, platformPerformance);
  
  return {
    contentId,
    orchestrationId,
    overallScore,
    performanceLevel,
    metrics,
    platformPerformance,
    insights,
    successFactors,
    improvementAreas,
  };
}

/**
 * Calculate Performance Score
 * 
 * Converts raw metrics into 0-100 score.
 */
function calculatePerformanceScore(metrics: any): number {
  let score = 0;
  
  // Views contribute 30%
  if (metrics.totalViews > 100000) score += 30;
  else if (metrics.totalViews > 50000) score += 25;
  else if (metrics.totalViews > 10000) score += 20;
  else if (metrics.totalViews > 1000) score += 10;
  else score += 5;
  
  // Engagement rate contributes 40%
  if (metrics.avgEngagementRate > 0.10) score += 40;
  else if (metrics.avgEngagementRate > 0.05) score += 30;
  else if (metrics.avgEngagementRate > 0.02) score += 20;
  else score += 10;
  
  // Completion rate contributes 20%
  if (metrics.avgCompletionRate > 0.80) score += 20;
  else if (metrics.avgCompletionRate > 0.60) score += 15;
  else if (metrics.avgCompletionRate > 0.40) score += 10;
  else score += 5;
  
  // Revenue contributes 10%
  if (metrics.totalRevenue > 1000) score += 10;
  else if (metrics.totalRevenue > 100) score += 7;
  else if (metrics.totalRevenue > 10) score += 4;
  else score += 2;
  
  return Math.min(100, score);
}

/**
 * Generate Insights
 * 
 * Human-readable insights about performance.
 */
function generateInsights(
  metrics: any,
  platformPerformance: any,
  content: any
): string[] {
  const insights: string[] = [];
  
  // View insights
  if (metrics.totalViews > 100000) {
    insights.push("🔥 Viral performance! Content reached over 100K views.");
  } else if (metrics.totalViews > 10000) {
    insights.push("✨ Strong performance with 10K+ views.");
  } else if (metrics.totalViews < 1000) {
    insights.push("📊 Low view count. Consider optimizing title and thumbnail.");
  }
  
  // Engagement insights
  if (metrics.avgEngagementRate > 0.10) {
    insights.push("💬 Exceptional engagement rate (>10%). Audience loves this content!");
  } else if (metrics.avgEngagementRate < 0.02) {
    insights.push("⚠️ Low engagement rate. Content may not resonate with audience.");
  }
  
  // Completion insights
  if (metrics.avgCompletionRate > 0.80) {
    insights.push("⏱️ High completion rate. Content holds attention well.");
  } else if (metrics.avgCompletionRate < 0.40) {
    insights.push("⏭️ Low completion rate. Consider shorter format or stronger hook.");
  }
  
  // Platform insights
  const bestPlatform = Object.entries(platformPerformance)
    .sort(([, a]: any, [, b]: any) => b.views - a.views)[0];
  
  if (bestPlatform) {
    insights.push(`🎯 Best performing platform: ${bestPlatform[0]}`);
  }
  
  return insights;
}

/**
 * Identify Success Factors
 * 
 * What made this content perform well.
 */
function identifySuccessFactors(
  metrics: any,
  platformPerformance: any
): string[] {
  const factors: string[] = [];
  
  if (metrics.totalViews > 50000) {
    factors.push("High view count indicates strong title/thumbnail");
  }
  
  if (metrics.avgEngagementRate > 0.05) {
    factors.push("High engagement shows content resonates with audience");
  }
  
  if (metrics.avgCompletionRate > 0.70) {
    factors.push("High completion rate shows compelling content");
  }
  
  if (metrics.totalShares > metrics.totalLikes * 0.1) {
    factors.push("High share rate indicates viral potential");
  }
  
  return factors;
}

/**
 * Identify Improvement Areas
 * 
 * What could be better next time.
 */
function identifyImprovementAreas(
  metrics: any,
  platformPerformance: any
): string[] {
  const areas: string[] = [];
  
  if (metrics.totalViews < 5000) {
    areas.push("Improve title and thumbnail for better click-through");
  }
  
  if (metrics.avgEngagementRate < 0.03) {
    areas.push("Add stronger call-to-action to boost engagement");
  }
  
  if (metrics.avgCompletionRate < 0.50) {
    areas.push("Tighten content structure and pacing");
  }
  
  if (metrics.totalShares < metrics.totalViews * 0.01) {
    areas.push("Make content more shareable (add hooks, surprises)");
  }
  
  return areas;
}

/**
 * ============================================
 * OPTIMIZATION FEEDBACK
 * ============================================
 */

/**
 * Generate Optimization Feedback
 * 
 * Compares predictions vs actual performance to improve models.
 */
export async function generateOptimizationFeedback(
  contentId: string
): Promise<OptimizationFeedback> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get content and orchestration
  const content = await db
    .select()
    .from(unifiedContent)
    .where(eq(unifiedContent.id, contentId))
    .limit(1);
  
  if (!content[0] || !content[0].orchestrationId) {
    throw new Error("Content or orchestration not found");
  }
  
  const orchestration = await db
    .select()
    .from(orchestrationRuns)
    .where(eq(orchestrationRuns.id, content[0].orchestrationId))
    .limit(1);
  
  if (!orchestration[0]) {
    throw new Error("Orchestration not found");
  }
  
  // Parse optimization results
  const optimizationResults = orchestration[0].optimizationResults 
    ? JSON.parse(orchestration[0].optimizationResults as string)
    : {};
  
  // Get actual performance
  const analysis = await analyzePerformance(contentId);
  
  // Extract predictions
  const predicted = {
    viralScore: optimizationResults.viral?.viralScore,
    thumbnailScore: optimizationResults.thumbnail?.overallScore,
    adScore: optimizationResults.ad?.overallScore,
  };
  
  // Calculate prediction accuracy
  let predictionAccuracy = 0;
  if (predicted.viralScore) {
    const scoreDiff = Math.abs(predicted.viralScore - analysis.overallScore);
    predictionAccuracy = Math.max(0, 1 - (scoreDiff / 100));
  }
  
  // Determine if content went viral
  const viralityAchieved = analysis.performanceLevel === "viral" || analysis.performanceLevel === "excellent";
  
  // Extract learnings
  const learnings = extractLearnings(content[0], analysis, optimizationResults);
  
  return {
    predicted,
    actual: {
      performanceScore: analysis.overallScore,
      engagementRate: analysis.metrics.avgEngagementRate,
      viralityAchieved,
    },
    predictionAccuracy,
    learnings,
  };
}

/**
 * Extract Learnings
 * 
 * Identifies patterns from successful/unsuccessful content.
 */
function extractLearnings(
  content: any,
  analysis: PerformanceAnalysis,
  optimizationResults: any
): OptimizationFeedback["learnings"] {
  const learnings: OptimizationFeedback["learnings"] = {};
  
  // Title patterns
  if (analysis.overallScore > 70) {
    learnings.titlePatterns = [
      `Successful title format: "${content.title}"`,
      `Title length: ${content.title.length} characters`,
    ];
  }
  
  // Thumbnail patterns
  if (optimizationResults.thumbnail && analysis.metrics.totalViews > 10000) {
    learnings.thumbnailPatterns = [
      `High-performing thumbnail style`,
      `Click-through rate: ${(analysis.metrics.totalViews / 100000 * 100).toFixed(2)}%`,
    ];
  }
  
  // Timing patterns
  const publishedAt = content.publishedAt;
  if (publishedAt && analysis.overallScore > 60) {
    const hour = new Date(publishedAt).getHours();
    const day = new Date(publishedAt).getDay();
    learnings.timingPatterns = [
      `Successful posting time: ${hour}:00 on ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]}`,
    ];
  }
  
  // Platform patterns
  const bestPlatform = Object.entries(analysis.platformPerformance)
    .sort(([, a]: any, [, b]: any) => b.performanceScore - a.performanceScore)[0];
  
  if (bestPlatform) {
    learnings.platformPatterns = [
      `Best platform: ${bestPlatform[0]}`,
      `Platform engagement: ${(bestPlatform[1] as any).engagementRate.toFixed(2)}%`,
    ];
  }
  
  return learnings;
}

/**
 * ============================================
 * HELPER FUNCTIONS
 * ============================================
 */

/**
 * Get Performance Summary
 * 
 * Quick summary of content performance.
 */
export async function getPerformanceSummary(contentId: string) {
  const db = await getDb();
  if (!db) return null;
  
  const records = await db
    .select()
    .from(contentPerformance)
    .where(eq(contentPerformance.contentId, contentId));
  
  if (records.length === 0) return null;
  
  // Since contentPerformance is aggregate, just return the first record
  const record = records[0];
  const summary = {
    totalViews: record.totalViews || 0,
    totalLikes: record.totalLikes || 0,
    totalShares: record.totalShares || 0,
    totalComments: record.totalComments || 0,
    platformCount: 1, // Would need to parse platformPostIds JSON to get actual count
  };
  
  return summary;
}

/**
 * Get Top Performing Content
 * 
 * Returns best performing content for learning.
 */
export async function getTopPerformingContent(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  // Get user's content with performance data
  const userContent = await db
    .select()
    .from(unifiedContent)
    .where(eq(unifiedContent.userId, userId));
  
  // Calculate performance score for each
  const contentWithScores = await Promise.all(
    userContent.map(async (content) => {
      const summary = await getPerformanceSummary(content.id);
      const score = summary ? (summary.totalViews + summary.totalLikes * 10 + summary.totalShares * 50) : 0;
      return { content, score, summary };
    })
  );
  
  // Sort by score and return top N
  return contentWithScores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
