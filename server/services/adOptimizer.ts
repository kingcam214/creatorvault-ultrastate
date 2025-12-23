/**
 * Ad Optimizer Service
 * 
 * AI-powered Facebook ad generation and optimization.
 * Generates ad copy (headline, body, CTA) + creative image + scoring + recommendations.
 * 
 * Architecture mirrors viralOptimizer.ts for consistency.
 */

import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";
import { getDb } from "../db";
import { adAnalyses } from "../../drizzle/schema";
import crypto from "crypto";

export interface AdOptimizerInput {
  product: string; // Product/service name
  targetAudience: string; // Who is the ad for?
  goal: "awareness" | "traffic" | "conversions" | "engagement"; // Campaign goal
  description?: string; // Optional product description
  tone?: "casual" | "professional" | "urgent" | "playful"; // Ad tone
  budget?: number; // Optional budget for context
}

export interface AdOptimizerOutput {
  analysisId: string;
  
  // Generated ad copy
  headline: string;
  bodyText: string;
  cta: string;
  
  // Generated creative
  imageUrl: string;
  imagePrompt: string;
  
  // Scores (0-100)
  overallScore: number;
  hookScore: number; // Headline attention-grabbing power
  clarityScore: number; // Message clarity
  urgencyScore: number; // Sense of urgency
  valueScore: number; // Value proposition strength
  ctaScore: number; // CTA effectiveness
  
  // Analysis
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  
  // Predicted metrics
  predictedMetrics: {
    ctr: number; // Click-through rate (%)
    cpc: number; // Cost per click (USD)
    conversions: number; // Expected conversions per 1000 impressions
    roas: number; // Return on ad spend (estimated)
  };
}

/**
 * Run complete ad optimization pipeline
 */
export async function runAdOptimizer(
  userId: number,
  input: AdOptimizerInput
): Promise<AdOptimizerOutput> {
  // Step 1: Generate ad copy with LLM
  const adCopy = await generateAdCopy(input);
  
  // Step 2: Generate ad creative image
  const { imageUrl, imagePrompt } = await generateAdCreative(input);
  
  // Step 3: Score the ad
  const scores = calculateAdScores(adCopy, input);
  
  // Step 4: Generate strengths/weaknesses/recommendations
  const strengths = generateStrengths(scores, adCopy);
  const weaknesses = generateWeaknesses(scores);
  const recommendations = generateRecommendations(weaknesses, input);
  
  // Step 5: Predict metrics
  const predictedMetrics = predictAdMetrics(scores.overallScore, input.goal, input.budget);
  
  // Step 6: Persist to database
  const analysisId = crypto.randomUUID();
  const db = await getDb();
  if (db) {
    await db.insert(adAnalyses).values({
      id: analysisId,
      userId,
      product: input.product,
      targetAudience: input.targetAudience,
      goal: input.goal,
      headline: adCopy.headline,
      bodyText: adCopy.bodyText,
      cta: adCopy.cta,
      imageUrl,
      imagePrompt,
      overallScore: scores.overallScore,
      hookScore: scores.hookScore,
      clarityScore: scores.clarityScore,
      urgencyScore: scores.urgencyScore,
      valueScore: scores.valueScore,
      ctaScore: scores.ctaScore,
      strengths: JSON.stringify(strengths),
      weaknesses: JSON.stringify(weaknesses),
      recommendations: JSON.stringify(recommendations),
      predictedCtr: predictedMetrics.ctr.toString(),
      predictedCpc: predictedMetrics.cpc.toString(),
      predictedConversions: predictedMetrics.conversions,
      predictedRoas: predictedMetrics.roas.toString(),
    });
  }
  
  return {
    analysisId,
    ...adCopy,
    imageUrl,
    imagePrompt,
    ...scores,
    strengths,
    weaknesses,
    recommendations,
    predictedMetrics,
  };
}

// ============ AD COPY GENERATION ============

async function generateAdCopy(input: AdOptimizerInput): Promise<{
  headline: string;
  bodyText: string;
  cta: string;
}> {
  const tone = input.tone || "professional";
  const goal = input.goal;
  
  const prompt = `You are a Facebook ads expert. Generate high-converting ad copy for:

Product: ${input.product}
Target Audience: ${input.targetAudience}
Campaign Goal: ${goal}
Tone: ${tone}
${input.description ? `Description: ${input.description}` : ""}

Generate:
1. Headline (max 40 characters) - Attention-grabbing, benefit-focused
2. Body Text (max 125 characters) - Clear value proposition, addresses pain point
3. CTA (max 20 characters) - Action-oriented, urgent

Facebook ad best practices:
- Use curiosity gaps in headlines
- Address audience pain points in body
- Create urgency without being pushy
- Make CTA specific and actionable
- Use social proof when possible

Return ONLY JSON with this exact structure:
{
  "headline": "...",
  "bodyText": "...",
  "cta": "..."
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a Facebook ads expert specializing in direct response marketing." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ad_copy",
          strict: true,
          schema: {
            type: "object",
            properties: {
              headline: { type: "string", description: "Ad headline (max 40 chars)" },
              bodyText: { type: "string", description: "Ad body text (max 125 chars)" },
              cta: { type: "string", description: "Call to action (max 20 chars)" },
            },
            required: ["headline", "bodyText", "cta"],
            additionalProperties: false,
          },
        },
      },
    });
    
    const content = response.choices[0]?.message?.content;
    if (content && typeof content === "string") {
      const parsed = JSON.parse(content);
      return {
        headline: parsed.headline || "Transform Your Life Today",
        bodyText: parsed.bodyText || "Discover the secret that changed everything.",
        cta: parsed.cta || "Learn More",
      };
    }
  } catch (error) {
    console.error("[Ad Optimizer] Error generating ad copy:", error);
  }
  
  // Fallback
  return {
    headline: `${input.product} - Limited Time Offer`,
    bodyText: `Perfect for ${input.targetAudience}. Get started today!`,
    cta: "Shop Now",
  };
}

// ============ AD CREATIVE GENERATION ============

async function generateAdCreative(input: AdOptimizerInput): Promise<{
  imageUrl: string;
  imagePrompt: string;
}> {
  const imagePrompt = `Professional Facebook ad image for ${input.product}. Target audience: ${input.targetAudience}. ${input.description || ""}. Clean, modern, attention-grabbing. Product-focused with lifestyle context. High quality, vibrant colors, professional photography style.`;
  
  try {
    const result = await generateImage({ prompt: imagePrompt });
    if (!result.url) {
      throw new Error("Image generation returned no URL");
    }
    return {
      imageUrl: result.url,
      imagePrompt,
    };
  } catch (error) {
    console.error("[Ad Optimizer] Error generating ad creative:", error);
    // Return placeholder
    return {
      imageUrl: "https://via.placeholder.com/1200x628?text=Ad+Creative",
      imagePrompt,
    };
  }
}

// ============ SCORING ALGORITHMS ============

function calculateAdScores(
  adCopy: { headline: string; bodyText: string; cta: string },
  input: AdOptimizerInput
): {
  overallScore: number;
  hookScore: number;
  clarityScore: number;
  urgencyScore: number;
  valueScore: number;
  ctaScore: number;
} {
  const hookScore = calculateHookScore(adCopy.headline);
  const clarityScore = calculateClarityScore(adCopy.bodyText, input);
  const urgencyScore = calculateUrgencyScore(adCopy.bodyText, adCopy.cta);
  const valueScore = calculateValueScore(adCopy.bodyText, input);
  const ctaScore = calculateCTAScore(adCopy.cta);
  
  // Weighted average (hook and CTA are most important for ads)
  const overallScore = Math.round(
    hookScore * 0.25 +
    clarityScore * 0.15 +
    urgencyScore * 0.20 +
    valueScore * 0.15 +
    ctaScore * 0.25
  );
  
  return {
    overallScore,
    hookScore,
    clarityScore,
    urgencyScore,
    valueScore,
    ctaScore,
  };
}

function calculateHookScore(headline: string): number {
  let score = 60; // baseline
  
  const lowerHeadline = headline.toLowerCase();
  
  // Curiosity triggers
  const curiosityWords = ["secret", "discover", "revealed", "shocking", "truth", "hidden", "why", "how", "what"];
  if (curiosityWords.some(w => lowerHeadline.includes(w))) score += 15;
  
  // Numbers
  if (/\d+/.test(headline)) score += 10;
  
  // Questions
  if (headline.includes("?")) score += 10;
  
  // Length optimization (20-40 chars is ideal)
  if (headline.length >= 20 && headline.length <= 40) score += 5;
  
  return Math.min(100, score);
}

function calculateClarityScore(bodyText: string, input: AdOptimizerInput): number {
  let score = 60; // baseline
  
  // Mentions product
  if (bodyText.toLowerCase().includes(input.product.toLowerCase())) score += 15;
  
  // Mentions target audience
  if (bodyText.toLowerCase().includes(input.targetAudience.toLowerCase())) score += 10;
  
  // Length optimization (80-125 chars is ideal)
  if (bodyText.length >= 80 && bodyText.length <= 125) score += 10;
  
  // Avoids jargon (simple words)
  const avgWordLength = bodyText.split(" ").reduce((sum, word) => sum + word.length, 0) / bodyText.split(" ").length;
  if (avgWordLength < 6) score += 5;
  
  return Math.min(100, score);
}

function calculateUrgencyScore(bodyText: string, cta: string): number {
  let score = 50; // baseline
  
  const urgencyWords = ["now", "today", "limited", "hurry", "fast", "quick", "instant", "immediately", "don't miss"];
  const combined = (bodyText + " " + cta).toLowerCase();
  
  urgencyWords.forEach(word => {
    if (combined.includes(word)) score += 10;
  });
  
  return Math.min(100, score);
}

function calculateValueScore(bodyText: string, input: AdOptimizerInput): number {
  let score = 60; // baseline
  
  const valueWords = ["save", "free", "bonus", "guarantee", "proven", "results", "benefit", "solution", "transform"];
  const lowerBody = bodyText.toLowerCase();
  
  valueWords.forEach(word => {
    if (lowerBody.includes(word)) score += 5;
  });
  
  // Goal alignment
  if (input.goal === "conversions" && (lowerBody.includes("buy") || lowerBody.includes("get"))) score += 10;
  if (input.goal === "awareness" && (lowerBody.includes("discover") || lowerBody.includes("learn"))) score += 10;
  
  return Math.min(100, score);
}

function calculateCTAScore(cta: string): number {
  let score = 60; // baseline
  
  const lowerCTA = cta.toLowerCase();
  
  // Action verbs
  const actionVerbs = ["get", "start", "try", "buy", "shop", "learn", "discover", "claim", "join"];
  if (actionVerbs.some(v => lowerCTA.includes(v))) score += 20;
  
  // Specificity (not generic)
  if (!["click here", "learn more", "sign up"].includes(lowerCTA)) score += 10;
  
  // Length optimization (10-20 chars is ideal)
  if (cta.length >= 10 && cta.length <= 20) score += 10;
  
  return Math.min(100, score);
}

// ============ ANALYSIS GENERATION ============

function generateStrengths(
  scores: { hookScore: number; clarityScore: number; urgencyScore: number; valueScore: number; ctaScore: number },
  adCopy: { headline: string; bodyText: string; cta: string }
): string[] {
  const strengths: string[] = [];
  
  if (scores.hookScore >= 80) strengths.push("Strong attention-grabbing headline");
  if (scores.clarityScore >= 80) strengths.push("Clear and concise messaging");
  if (scores.urgencyScore >= 80) strengths.push("Effective urgency triggers");
  if (scores.valueScore >= 80) strengths.push("Compelling value proposition");
  if (scores.ctaScore >= 80) strengths.push("Action-oriented CTA");
  
  // Add at least one strength
  if (strengths.length === 0) {
    strengths.push("Ad copy is well-structured");
  }
  
  return strengths;
}

function generateWeaknesses(scores: {
  hookScore: number;
  clarityScore: number;
  urgencyScore: number;
  valueScore: number;
  ctaScore: number;
}): string[] {
  const weaknesses: string[] = [];
  
  if (scores.hookScore < 70) weaknesses.push("Headline lacks curiosity triggers");
  if (scores.clarityScore < 70) weaknesses.push("Message could be clearer");
  if (scores.urgencyScore < 70) weaknesses.push("Missing sense of urgency");
  if (scores.valueScore < 70) weaknesses.push("Value proposition not strong enough");
  if (scores.ctaScore < 70) weaknesses.push("CTA could be more specific");
  
  return weaknesses;
}

function generateRecommendations(weaknesses: string[], input: AdOptimizerInput): string[] {
  const recommendations: string[] = [];
  
  if (weaknesses.some(w => w.includes("Headline"))) {
    recommendations.push("Add curiosity gap: 'The Secret to [Benefit] That Nobody Tells You'");
  }
  
  if (weaknesses.some(w => w.includes("urgency"))) {
    recommendations.push("Add time-sensitive language: 'Limited Time Offer' or 'Only X Left'");
  }
  
  if (weaknesses.some(w => w.includes("value"))) {
    recommendations.push("Highlight specific benefit: 'Save $X' or 'Get Y Results in Z Days'");
  }
  
  if (weaknesses.some(w => w.includes("CTA"))) {
    recommendations.push(`Use goal-specific CTA: ${input.goal === "conversions" ? "'Buy Now'" : input.goal === "traffic" ? "'Learn More'" : "'Get Started'"}`);
  }
  
  // Always add at least one recommendation
  if (recommendations.length === 0) {
    recommendations.push("Test multiple variations to find top performer");
  }
  
  return recommendations;
}

// ============ METRICS PREDICTION ============

function predictAdMetrics(
  overallScore: number,
  goal: string,
  budget?: number
): {
  ctr: number; // Click-through rate (%)
  cpc: number; // Cost per click (USD)
  conversions: number; // Per 1000 impressions
  roas: number; // Return on ad spend
} {
  // Base CTR by goal
  const baseCTR: Record<string, number> = {
    awareness: 1.5,
    traffic: 2.0,
    conversions: 1.2,
    engagement: 2.5,
  };
  
  const ctr = (baseCTR[goal] || 1.5) * (overallScore / 100);
  
  // CPC inversely related to score (better ads = lower CPC)
  const cpc = 2.0 - (overallScore / 100) * 1.0; // $1.00 - $2.00 range
  
  // Conversions (per 1000 impressions)
  const conversions = goal === "conversions" ? (ctr / 100) * 1000 * 0.05 : (ctr / 100) * 1000 * 0.02;
  
  // ROAS (simplified estimate)
  const roas = goal === "conversions" ? (overallScore / 100) * 5.0 : (overallScore / 100) * 2.0;
  
  return {
    ctr: Math.round(ctr * 100) / 100,
    cpc: Math.round(cpc * 100) / 100,
    conversions: Math.round(conversions),
    roas: Math.round(roas * 100) / 100,
  };
}
