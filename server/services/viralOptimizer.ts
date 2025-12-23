/**
 * Viral Optimizer Service - CANONICAL PIPELINE
 * 
 * Single source of truth for viral content optimization.
 * Consolidates: scoring algorithms + LLM analysis + hook generation + database persistence.
 */

import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { viralAnalyses, viralMetrics } from "../../drizzle/schema";
import crypto from "crypto";

export interface ViralOptimizerInput {
  userId: number;
  title: string;
  description?: string;
  tags?: string[];
  duration?: number;
  platform: "youtube" | "tiktok" | "instagram" | "twitter";
  contentType?: "video" | "image" | "text";
}

export interface ViralOptimizerOutput {
  analysisId: string;
  viralScore: number;
  hookScore: number;
  qualityScore: number;
  trendScore: number;
  audienceScore: number;
  formatScore: number;
  timingScore: number;
  hooks: string[];
  weaknesses: string[];
  recommendations: string[];
  optimizedTitle: string;
  optimizedDescription?: string;
  optimizedTags: string[];
  predictedMetrics: {
    views: number;
    engagement: number;
    ctr: number;
    retention: number;
  };
}

/**
 * CANONICAL VIRAL OPTIMIZER PIPELINE
 * 
 * Single entry point for all viral optimization.
 * Combines: LLM analysis + scoring algorithms + database persistence.
 */
export async function runViralOptimizer(input: ViralOptimizerInput): Promise<ViralOptimizerOutput> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const analysisId = crypto.randomUUID();
  
  // Step 1: Generate viral hooks using LLM
  const hooks = await generateViralHooks(input);
  
  // Step 2: Analyze content using LLM
  const llmAnalysis = await analyzeContentWithLLM(input);
  
  // Step 3: Calculate sub-scores using algorithms
  const hookScore = calculateHookScore(input, hooks);
  const qualityScore = calculateQualityScore(input);
  const trendScore = calculateTrendScore(input);
  const audienceScore = calculateAudienceScore(input);
  const formatScore = calculateFormatScore(input);
  const timingScore = calculateTimingScore();
  const platformScore = calculatePlatformScore(input);
  
  // Step 4: Calculate overall viral score (weighted average)
  const viralScore = Math.round(
    hookScore * 0.25 +
    qualityScore * 0.15 +
    trendScore * 0.20 +
    audienceScore * 0.15 +
    formatScore * 0.10 +
    timingScore * 0.05 +
    platformScore * 0.10
  );
  
  // Step 5: Generate weaknesses and recommendations
  const weaknesses = generateWeaknesses(input, {
    hookScore,
    qualityScore,
    trendScore,
    audienceScore,
    formatScore,
    timingScore,
    platformScore,
  });
  
  const recommendations = generateRecommendations(input, weaknesses, llmAnalysis);
  
  // Step 6: Optimize content
  const optimized = optimizeContent(input, hooks, recommendations);
  
  // Step 7: Predict metrics
  const predictedMetrics = predictMetrics(viralScore, input.platform);
  
  // Step 8: Persist to database
  await db.insert(viralAnalyses).values({
    id: analysisId,
    userId: input.userId,
    title: input.title,
    description: input.description || null,
    tags: input.tags?.join(",") || null,
    duration: input.duration || null,
    platform: input.platform,
    viralScore,
    hookScore,
    qualityScore,
    trendScore,
    audienceScore,
    formatScore,
    timingScore,
    confidenceLevel: calculateConfidenceLevel(viralScore),
    weaknesses: JSON.stringify(weaknesses),
    recommendations: JSON.stringify(recommendations),
    optimizedTitle: optimized.title,
    optimizedDescription: optimized.description || null,
    optimizedTags: optimized.tags.join(","),
  });
  
  await db.insert(viralMetrics).values({
    id: crypto.randomUUID(),
    analysisId,
    predictedViews: predictedMetrics.views,
    predictedEngagement: predictedMetrics.engagement.toString(),
    predictedCtr: predictedMetrics.ctr.toString(),
    predictedRetention: predictedMetrics.retention.toString(),
  });
  
  // Step 9: Return full output
  return {
    analysisId,
    viralScore,
    hookScore,
    qualityScore,
    trendScore,
    audienceScore,
    formatScore,
    timingScore,
    hooks,
    weaknesses,
    recommendations,
    optimizedTitle: optimized.title,
    optimizedDescription: optimized.description,
    optimizedTags: optimized.tags,
    predictedMetrics,
  };
}

/**
 * Generate viral hooks using LLM
 */
async function generateViralHooks(input: ViralOptimizerInput): Promise<string[]> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a viral content expert specializing in ${input.platform}. Generate attention-grabbing hooks that stop scrolling.`,
        },
        {
          role: "user",
          content: `Generate 5 viral hooks for "${input.title}" on ${input.platform}. Each hook should be 1-2 sentences max. Make them scroll-stopping and curiosity-driven.`,
        },
      ],
    });
    
    const content = (response.choices[0]?.message?.content as string) || "";
    const hooks = content
      .split("\n")
      .filter((line: string) => line.trim().length > 0 && !line.match(/^\d+\./)) 
      .map((line: string) => line.replace(/^[-•*]\s*/, "").trim())
      .filter((hook: string) => hook.length > 10);    
    return hooks.slice(0, 5);
  } catch (error) {
    console.error("[Viral Optimizer] Hook generation failed:", error);
    return [input.title]; // Fallback to original title
  }
}

/**
 * Analyze content using LLM
 */
async function analyzeContentWithLLM(input: ViralOptimizerInput): Promise<{
  score: number;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
}> {
  try {
    const content = `Title: ${input.title}\nDescription: ${input.description || "N/A"}\nTags: ${input.tags?.join(", ") || "N/A"}`;
    
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a viral content analyst. Analyze content and provide a viral potential score (0-100) with specific feedback.`,
        },
        {
          role: "user",
          content: `Analyze this ${input.platform} content for viral potential: "${content}". Provide: 1) Viral score (0-100), 2) Strengths (3 points), 3) Improvements needed (3 points), 4) Specific suggestions (3 actionable items). Format as JSON.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "viral_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number", description: "Viral potential score 0-100" },
              strengths: {
                type: "array",
                items: { type: "string" },
                description: "3 strengths",
              },
              improvements: {
                type: "array",
                items: { type: "string" },
                description: "3 improvements needed",
              },
              suggestions: {
                type: "array",
                items: { type: "string" },
                description: "3 actionable suggestions",
              },
            },
            required: ["score", "strengths", "improvements", "suggestions"],
            additionalProperties: false,
          },
        },
      },
    });
    
    const responseContent = (response.choices[0]?.message?.content as string) || "{}";
    const analysis = JSON.parse(responseContent);
    return analysis;
  } catch (error) {
    console.error("[Viral Optimizer] LLM analysis failed:", error);
    return {
      score: 50,
      strengths: ["Content has potential"],
      improvements: ["Optimize title", "Add trending tags"],
      suggestions: ["Use curiosity gap", "Add call-to-action"],
    };
  }
}

/**
 * Calculate hook score (0-100)
 */
function calculateHookScore(input: ViralOptimizerInput, hooks: string[]): number {
  let score = 50; // baseline
  
  const title = input.title.toLowerCase();
  
  // Curiosity triggers
  const curiosityWords = ["secret", "hidden", "revealed", "truth", "why", "how", "what", "never", "always", "shocking"];
  const curiosityMatches = curiosityWords.filter(word => title.includes(word));
  score += curiosityMatches.length * 5;
  
  // Emotional triggers
  const emotionalWords = ["amazing", "insane", "crazy", "unbelievable", "incredible", "mind-blowing"];
  const emotionalMatches = emotionalWords.filter(word => title.includes(word));
  score += emotionalMatches.length * 5;
  
  // Numbers (specific numbers perform better)
  if (/\d+/.test(title)) score += 10;
  
  // Question format
  if (title.includes("?")) score += 10;
  
  // Length (40-60 chars optimal)
  if (title.length >= 40 && title.length <= 60) score += 10;
  
  return Math.min(100, score);
}

/**
 * Calculate quality score (0-100)
 */
function calculateQualityScore(input: ViralOptimizerInput): number {
  let score = 50;
  
  // Title length (not too short, not too long)
  if (input.title.length >= 30 && input.title.length <= 80) score += 15;
  
  // Description exists and is substantial
  if (input.description && input.description.length > 100) score += 15;
  
  // Tags exist
  if (input.tags && input.tags.length > 0) score += 10;
  if (input.tags && input.tags.length >= 5) score += 10;
  
  return Math.min(100, score);
}

/**
 * Calculate trend score (0-100)
 */
function calculateTrendScore(input: ViralOptimizerInput): number {
  let score = 50;
  
  const trendingTopics = ["ai", "viral", "trending", "challenge", "react", "tutorial", "review", "2024", "2025", "new"];
  const allText = `${input.title} ${input.description || ""} ${input.tags?.join(" ") || ""}`.toLowerCase();
  
  const matches = trendingTopics.filter(topic => allText.includes(topic));
  score += matches.length * 8;
  
  return Math.min(100, score);
}

/**
 * Calculate audience score (0-100)
 */
function calculateAudienceScore(input: ViralOptimizerInput): number {
  let score = 60; // baseline
  
  // Platform-specific audience alignment
  const platformKeywords: Record<string, string[]> = {
    tiktok: ["fyp", "viral", "trending", "challenge", "duet", "stitch"],
    youtube: ["tutorial", "how to", "review", "guide", "tips", "best"],
    instagram: ["aesthetic", "reel", "story", "lifestyle", "fashion"],
    twitter: ["thread", "breaking", "news", "opinion", "hot take"],
  };
  
  const keywords = platformKeywords[input.platform] || [];
  const allText = `${input.title} ${input.description || ""} ${input.tags?.join(" ") || ""}`.toLowerCase();
  const matches = keywords.filter(kw => allText.includes(kw));
  
  score += matches.length * 10;
  
  return Math.min(100, score);
}

/**
 * Calculate format score (0-100)
 */
function calculateFormatScore(input: ViralOptimizerInput): number {
  let score = 60;
  
  // Platform-specific format optimization
  if (input.platform === "tiktok" && input.duration && input.duration <= 60) score += 20;
  if (input.platform === "youtube" && input.duration && input.duration >= 480) score += 20;
  if (input.platform === "instagram" && input.duration && input.duration <= 90) score += 20;
  
  return Math.min(100, score);
}

/**
 * Calculate timing score (0-100)
 */
function calculateTimingScore(): number {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  let score = 50;
  
  // Peak hours (6-9 PM)
  if (hour >= 18 && hour <= 21) score += 25;
  
  // Weekdays (better engagement)
  if (day >= 1 && day <= 5) score += 15;
  
  return Math.min(100, score);
}

/**
 * Calculate platform score (0-100)
 */
function calculatePlatformScore(input: ViralOptimizerInput): number {
  let score = 60;
  
  // Platform-specific optimizations
  const platformBestPractices: Record<string, (input: ViralOptimizerInput) => number> = {
    tiktok: (inp) => {
      let s = 0;
      if (inp.tags?.some(t => t.toLowerCase().includes("fyp"))) s += 20;
      if (inp.duration && inp.duration <= 30) s += 20;
      return s;
    },
    youtube: (inp) => {
      let s = 0;
      if (inp.title.length >= 50) s += 20;
      if (inp.description && inp.description.length >= 200) s += 20;
      return s;
    },
    instagram: (inp) => {
      let s = 0;
      if (inp.tags && inp.tags.length >= 10) s += 20;
      if (inp.duration && inp.duration <= 60) s += 20;
      return s;
    },
    twitter: (inp) => {
      let s = 0;
      if (inp.title.length <= 280) s += 20;
      if (inp.tags && inp.tags.length <= 3) s += 20;
      return s;
    },
  };
  
  const platformCheck = platformBestPractices[input.platform];
  if (platformCheck) {
    score += platformCheck(input);
  }
  
  return Math.min(100, score);
}

/**
 * Generate weaknesses based on scores
 */
function generateWeaknesses(input: ViralOptimizerInput, scores: Record<string, number>): string[] {
  const weaknesses: string[] = [];
  
  if (scores.hookScore < 70) weaknesses.push("Title lacks curiosity triggers or emotional hooks");
  if (scores.qualityScore < 70) weaknesses.push("Content metadata incomplete (description, tags)");
  if (scores.trendScore < 70) weaknesses.push("Missing trending topics or hashtags");
  if (scores.audienceScore < 70) weaknesses.push(`Not optimized for ${input.platform} audience`);
  if (scores.formatScore < 70) weaknesses.push(`Duration not optimal for ${input.platform}`);
  if (scores.timingScore < 70) weaknesses.push("Publishing outside peak engagement hours");
  if (scores.platformScore < 70) weaknesses.push(`Missing platform-specific best practices for ${input.platform}`);
  
  return weaknesses.slice(0, 5); // Top 5 weaknesses
}

/**
 * Generate recommendations
 */
function generateRecommendations(
  input: ViralOptimizerInput,
  weaknesses: string[],
  llmAnalysis: { suggestions: string[] }
): string[] {
  const recommendations: string[] = [];
  
  // Add LLM suggestions
  recommendations.push(...llmAnalysis.suggestions);
  
  // Add algorithmic recommendations
  if (weaknesses.some(w => w.includes("hook"))) {
    recommendations.push("Use curiosity gap: 'You won't believe what happened...'");
  }
  
  if (weaknesses.some(w => w.includes("trending"))) {
    recommendations.push(`Add trending tags: #viral #trending #${input.platform} #2025`);
  }
  
  if (weaknesses.some(w => w.includes("duration"))) {
    const optimalDuration = input.platform === "tiktok" ? "15-30s" : input.platform === "youtube" ? "8-12min" : "30-60s";
    recommendations.push(`Optimize duration to ${optimalDuration} for ${input.platform}`);
  }
  
  return recommendations.slice(0, 6); // Top 6 recommendations
}

/**
 * Optimize content
 */
function optimizeContent(
  input: ViralOptimizerInput,
  hooks: string[],
  recommendations: string[]
): {
  title: string;
  description?: string;
  tags: string[];
} {
  // Use best hook as optimized title
  const optimizedTitle = hooks[0] || input.title;
  
  // Add trending tags
  const optimizedTags = [
    ...(input.tags || []),
    "viral",
    "trending",
    input.platform,
    "2025",
  ];
  
  // Add platform-specific tags
  if (input.platform === "tiktok" && !optimizedTags.includes("fyp")) {
    optimizedTags.push("fyp", "foryou");
  }
  
  return {
    title: optimizedTitle,
    description: input.description,
    tags: Array.from(new Set(optimizedTags)), // Remove duplicates
  };
}

/**
 * Predict metrics based on viral score
 */
function predictMetrics(viralScore: number, platform: string): {
  views: number;
  engagement: number;
  ctr: number;
  retention: number;
} {
  // Base multipliers by platform
  const platformMultipliers: Record<string, number> = {
    tiktok: 2.0,
    youtube: 1.5,
    instagram: 1.8,
    twitter: 1.2,
  };
  
  const multiplier = platformMultipliers[platform] || 1.0;
  
  return {
    views: Math.round((viralScore / 100) * 100000 * multiplier),
    engagement: Math.round((viralScore / 100) * 10 * 100) / 100, // Percentage
    ctr: Math.round((viralScore / 100) * 15 * 100) / 100, // Percentage
    retention: Math.round((viralScore / 100) * 80 * 100) / 100, // Percentage
  };
}

/**
 * Calculate confidence level
 */
function calculateConfidenceLevel(viralScore: number): number {
  if (viralScore >= 80) return 90;
  if (viralScore >= 70) return 80;
  if (viralScore >= 60) return 70;
  if (viralScore >= 50) return 60;
  return 50;
}
