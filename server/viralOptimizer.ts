import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "creatorvault.db");

export interface ViralAnalysis {
  id: string;
  userId: number;
  contentType: string; // 'video', 'image', 'text', 'thumbnail'
  platform: string; // 'youtube', 'tiktok', 'instagram', 'twitter'
  inputJson: string; // Original content metadata
  viralScore: number; // 0-100
  hookScore: number;
  qualityScore: number;
  trendScore: number;
  audienceScore: number;
  formatScore: number;
  timingScore: number;
  platformScore: number;
  confidenceLevel: number; // 0-100
  weaknesses: string | null; // JSON array
  recommendations: string | null; // JSON array
  optimizedOutputJson: string | null; // Optimized content
  createdAt: number;
}

export interface ViralMetric {
  id: string;
  analysisId: string;
  metricType: string; // 'views', 'engagement', 'ctr', 'retention'
  predictedValue: number;
  actualValue: number | null;
  recordedAt: number | null;
  createdAt: number;
}

export class ViralOptimizerService {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma("foreign_keys = ON");
  }

  // Analyze content for viral potential
  analyzeContent(params: {
    userId: number;
    contentType: string;
    platform: string;
    input: {
      title?: string;
      description?: string;
      thumbnailUrl?: string;
      videoUrl?: string;
      duration?: number;
      tags?: string[];
      category?: string;
    };
  }): ViralAnalysis {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Calculate component scores
    const hookScore = this.calculateHookScore(params.input);
    const qualityScore = this.calculateQualityScore(params.input);
    const trendScore = this.calculateTrendScore(params.input);
    const audienceScore = this.calculateAudienceScore(params.input);
    const formatScore = this.calculateFormatScore(params.input, params.platform);
    const timingScore = this.calculateTimingScore();
    const platformScore = this.calculatePlatformScore(params.input, params.platform);

    // Calculate overall viral score (weighted average)
    const viralScore = Math.round(
      hookScore * 0.25 +
        qualityScore * 0.15 +
        trendScore * 0.20 +
        audienceScore * 0.15 +
        formatScore * 0.10 +
        timingScore * 0.05 +
        platformScore * 0.10
    );

    // Calculate confidence level
    const scores = [hookScore, qualityScore, trendScore, audienceScore, formatScore, timingScore, platformScore];
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
    const confidenceLevel = Math.max(0, Math.min(100, Math.round(100 - variance)));

    // Identify weaknesses
    const weaknesses = [];
    if (hookScore < 60) weaknesses.push({ component: "hook", score: hookScore, issue: "Weak opening hook - needs more curiosity gap" });
    if (qualityScore < 60) weaknesses.push({ component: "quality", score: qualityScore, issue: "Production quality below platform standards" });
    if (trendScore < 60) weaknesses.push({ component: "trend", score: trendScore, issue: "Not aligned with current trending topics" });
    if (audienceScore < 60) weaknesses.push({ component: "audience", score: audienceScore, issue: "Weak audience targeting signals" });
    if (formatScore < 60) weaknesses.push({ component: "format", score: formatScore, issue: `Format not optimized for ${params.platform}` });

    // Generate recommendations
    const recommendations = this.generateRecommendations(params.input, params.platform, {
      hookScore,
      qualityScore,
      trendScore,
      audienceScore,
      formatScore,
      timingScore,
      platformScore,
    });

    // Generate optimized output
    const optimizedOutput = this.generateOptimizedContent(params.input, params.platform, recommendations);

    // Insert analysis
    const stmt = this.db.prepare(`
      INSERT INTO viral_analyses (
        id, userId, contentType, platform, inputJson,
        viralScore, hookScore, qualityScore, trendScore, audienceScore,
        formatScore, timingScore, platformScore, confidenceLevel,
        weaknesses, recommendations, optimizedOutputJson, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.userId,
      params.contentType,
      params.platform,
      JSON.stringify(params.input),
      viralScore,
      hookScore,
      qualityScore,
      trendScore,
      audienceScore,
      formatScore,
      timingScore,
      platformScore,
      confidenceLevel,
      JSON.stringify(weaknesses),
      JSON.stringify(recommendations),
      JSON.stringify(optimizedOutput),
      now
    );

    // Create predicted metrics
    this.createPredictedMetrics(id, viralScore, params.platform);

    // Log event
    const eventStmt = this.db.prepare(`
      INSERT INTO events (eventType, actor, action, featureId, inputsJson, dbWritesJson, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 'success', ?)
    `);

    eventStmt.run(
      "viral.analysis",
      `user_${params.userId}`,
      "analyze_content",
      id,
      JSON.stringify({ contentType: params.contentType, platform: params.platform }),
      JSON.stringify({ analysis_created: id, metrics_created: 4 }),
      now
    );

    return this.getAnalysis(id)!;
  }

  // Helper: Calculate hook score
  private calculateHookScore(input: any): number {
    let score = 50; // baseline

    if (input.title) {
      const title = input.title.toLowerCase();
      // Check for curiosity gaps
      if (title.includes("?") || title.includes("how") || title.includes("why") || title.includes("what")) score += 15;
      // Check for emotional triggers
      if (title.match(/(shocking|insane|crazy|unbelievable|secret|revealed)/i)) score += 10;
      // Check for numbers
      if (title.match(/\d+/)) score += 10;
      // Check for urgency
      if (title.match(/(now|today|urgent|breaking|new)/i)) score += 5;
    }

    return Math.min(100, score);
  }

  // Helper: Calculate quality score
  private calculateQualityScore(input: any): number {
    let score = 60; // baseline

    if (input.thumbnailUrl) score += 15;
    if (input.description && input.description.length > 100) score += 10;
    if (input.tags && input.tags.length >= 5) score += 10;
    if (input.duration && input.duration >= 60 && input.duration <= 600) score += 5; // 1-10 min ideal

    return Math.min(100, score);
  }

  // Helper: Calculate trend score
  private calculateTrendScore(input: any): number {
    let score = 50; // baseline

    if (input.tags) {
      const trendingTopics = ["ai", "viral", "trending", "challenge", "react", "tutorial", "review", "2024", "new"];
      const matches = input.tags.filter((tag: string) =>
        trendingTopics.some((topic) => tag.toLowerCase().includes(topic))
      );
      score += matches.length * 10;
    }

    return Math.min(100, score);
  }

  // Helper: Calculate audience score
  private calculateAudienceScore(input: any): number {
    let score = 55; // baseline

    if (input.category) score += 15;
    if (input.description && input.description.match(/@\w+/)) score += 10; // mentions
    if (input.tags && input.tags.length > 0) score += 10;

    return Math.min(100, score);
  }

  // Helper: Calculate format score
  private calculateFormatScore(input: any, platform: string): number {
    let score = 60; // baseline

    if (platform === "youtube") {
      if (input.duration && input.duration >= 480 && input.duration <= 1200) score += 20; // 8-20 min
      if (input.thumbnailUrl) score += 10;
    } else if (platform === "tiktok") {
      if (input.duration && input.duration >= 15 && input.duration <= 60) score += 20; // 15-60 sec
    } else if (platform === "instagram") {
      if (input.duration && input.duration >= 15 && input.duration <= 90) score += 20; // 15-90 sec
    }

    return Math.min(100, score);
  }

  // Helper: Calculate timing score
  private calculateTimingScore(): number {
    const hour = new Date().getHours();
    // Peak posting times: 6-9am, 12-2pm, 6-9pm
    if ((hour >= 6 && hour <= 9) || (hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 21)) {
      return 85;
    }
    return 60;
  }

  // Helper: Calculate platform score
  private calculatePlatformScore(input: any, platform: string): number {
    let score = 65; // baseline

    // Platform-specific optimizations
    if (platform === "youtube" && input.title && input.title.length >= 40 && input.title.length <= 70) score += 15;
    if (platform === "tiktok" && input.tags && input.tags.includes("fyp")) score += 15;
    if (platform === "instagram" && input.tags && input.tags.length >= 10) score += 15;

    return Math.min(100, score);
  }

  // Helper: Generate recommendations
  private generateRecommendations(input: any, platform: string, scores: any): any[] {
    const recommendations = [];

    if (scores.hookScore < 70) {
      recommendations.push({
        type: "hook",
        priority: "high",
        suggestion: "Add a curiosity gap or question in the first 3 seconds",
        example: `"You won't believe what happened next..." or "Here's the secret nobody tells you about..."`,
      });
    }

    if (scores.trendScore < 70) {
      recommendations.push({
        type: "trend",
        priority: "medium",
        suggestion: "Incorporate trending topics or hashtags",
        example: `Add tags like #viral #trending #${platform} #2024`,
      });
    }

    if (scores.formatScore < 70) {
      recommendations.push({
        type: "format",
        priority: "high",
        suggestion: `Optimize for ${platform} format`,
        example: platform === "youtube" ? "Aim for 8-12 minute duration with strong thumbnail" : "Keep under 60 seconds with fast-paced editing",
      });
    }

    return recommendations;
  }

  // Helper: Generate optimized content
  private generateOptimizedContent(input: any, platform: string, recommendations: any[]): any {
    const optimized: any = { ...input };

    // Optimize title
    if (input.title && !input.title.includes("?")) {
      optimized.title = `${input.title} - You Won't Believe What Happens!`;
    }

    // Optimize tags
    if (!optimized.tags) optimized.tags = [];
    optimized.tags.push("viral", "trending", platform, "2024");

    // Add platform-specific optimizations
    if (platform === "tiktok" && !optimized.tags.includes("fyp")) {
      optimized.tags.push("fyp", "foryou", "foryoupage");
    }

    return optimized;
  }

  // Helper: Create predicted metrics
  private createPredictedMetrics(analysisId: string, viralScore: number, platform: string): void {
    const now = Math.floor(Date.now() / 1000);

    // Predict views based on viral score
    const predictedViews = Math.round((viralScore / 100) * 100000); // 0-100k views

    // Predict engagement rate (likes, comments, shares)
    const predictedEngagement = Math.round((viralScore / 100) * 10); // 0-10% engagement

    // Predict CTR for thumbnails
    const predictedCTR = Math.round((viralScore / 100) * 15); // 0-15% CTR

    // Predict retention
    const predictedRetention = Math.round((viralScore / 100) * 80); // 0-80% retention

    const metrics = [
      { metricType: "views", predictedValue: predictedViews },
      { metricType: "engagement", predictedValue: predictedEngagement },
      { metricType: "ctr", predictedValue: predictedCTR },
      { metricType: "retention", predictedValue: predictedRetention },
    ];

    const stmt = this.db.prepare(`
      INSERT INTO viral_metrics (id, analysisId, metricType, predictedValue, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);

    metrics.forEach((m) => {
      stmt.run(crypto.randomUUID(), analysisId, m.metricType, m.predictedValue, now);
    });
  }

  // Get analysis
  getAnalysis(id: string): ViralAnalysis | null {
    const stmt = this.db.prepare("SELECT * FROM viral_analyses WHERE id = ?");
    return stmt.get(id) as ViralAnalysis | null;
  }

  // Get metrics for analysis
  getMetrics(analysisId: string): ViralMetric[] {
    const stmt = this.db.prepare("SELECT * FROM viral_metrics WHERE analysisId = ? ORDER BY createdAt");
    return stmt.all(analysisId) as ViralMetric[];
  }

  // Update actual metrics (when real data comes in)
  updateActualMetric(analysisId: string, metricType: string, actualValue: number): void {
    const now = Math.floor(Date.now() / 1000);
    const stmt = this.db.prepare(`
      UPDATE viral_metrics
      SET actualValue = ?, recordedAt = ?
      WHERE analysisId = ? AND metricType = ?
    `);
    stmt.run(actualValue, now, analysisId, metricType);
  }

  // Get user analytics
  getUserAnalytics(userId: number): any {
    const analyses = this.db
      .prepare("SELECT * FROM viral_analyses WHERE userId = ? ORDER BY createdAt DESC LIMIT 10")
      .all(userId) as ViralAnalysis[];

    const totalAnalyses = analyses.length;
    const avgViralScore = totalAnalyses > 0 ? Math.round(analyses.reduce((sum, a) => sum + a.viralScore, 0) / totalAnalyses) : 0;

    const platformBreakdown = analyses.reduce((acc: any, a) => {
      acc[a.platform] = (acc[a.platform] || 0) + 1;
      return acc;
    }, {});

    return {
      totalAnalyses,
      avgViralScore,
      platformBreakdown,
      recentAnalyses: analyses.slice(0, 5).map((a) => ({
        id: a.id,
        contentType: a.contentType,
        platform: a.platform,
        viralScore: a.viralScore,
        createdAt: a.createdAt,
      })),
    };
  }

  close() {
    this.db.close();
  }
}

// Export singleton
export const viralOptimizerService = new ViralOptimizerService();
