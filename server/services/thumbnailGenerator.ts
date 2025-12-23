/**
 * Thumbnail Generator Service
 * 
 * AI-powered YouTube thumbnail generation and CTR optimization.
 * Generates thumbnail image + text overlay + scoring + recommendations.
 * 
 * Architecture mirrors viralOptimizer.ts and adOptimizer.ts for consistency.
 */

import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";
import { getDb } from "../db";
import { thumbnailAnalyses } from "../../drizzle/schema";
import crypto from "crypto";

export interface ThumbnailGeneratorInput {
  videoTitle: string; // Video title
  niche: string; // Content niche (gaming, tech, lifestyle, etc.)
  style?: "bold" | "minimal" | "dramatic" | "playful"; // Thumbnail style
  platform?: string; // Default: youtube
  customPrompt?: string; // Optional custom image prompt
}

export interface ThumbnailGeneratorOutput {
  analysisId: string;
  
  // Generated thumbnail
  imageUrl: string;
  imagePrompt: string;
  textOverlay: string; // Suggested text for thumbnail
  
  // Scores (0-100)
  overallScore: number;
  ctrScore: number; // Click-through rate potential
  clarityScore: number; // Visual clarity
  emotionScore: number; // Emotional impact
  contrastScore: number; // Color contrast
  textScore: number; // Text readability
  
  // Analysis
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  
  // Predicted metrics
  predictedMetrics: {
    ctr: number; // Click-through rate (%)
    views: number; // Expected views boost
  };
}

/**
 * Run complete thumbnail generation pipeline
 */
export async function runThumbnailGenerator(
  userId: number,
  input: ThumbnailGeneratorInput
): Promise<ThumbnailGeneratorOutput> {
  const style = input.style || "bold";
  const platform = input.platform || "youtube";
  
  // Step 1: Generate text overlay with LLM
  const textOverlay = await generateTextOverlay(input);
  
  // Step 2: Generate thumbnail image
  const { imageUrl, imagePrompt } = await generateThumbnailImage(input, textOverlay, style);
  
  // Step 3: Score the thumbnail
  const scores = calculateThumbnailScores(textOverlay, input, style);
  
  // Step 4: Generate strengths/weaknesses/recommendations
  const strengths = generateStrengths(scores);
  const weaknesses = generateWeaknesses(scores);
  const recommendations = generateRecommendations(weaknesses, input, style);
  
  // Step 5: Predict metrics
  const predictedMetrics = predictThumbnailMetrics(scores.overallScore, input.niche);
  
  // Step 6: Persist to database
  const analysisId = crypto.randomUUID();
  const db = await getDb();
  if (db) {
    await db.insert(thumbnailAnalyses).values({
      id: analysisId,
      userId,
      videoTitle: input.videoTitle,
      niche: input.niche,
      style,
      platform,
      imageUrl,
      imagePrompt,
      textOverlay,
      overallScore: scores.overallScore,
      ctrScore: scores.ctrScore,
      clarityScore: scores.clarityScore,
      emotionScore: scores.emotionScore,
      contrastScore: scores.contrastScore,
      textScore: scores.textScore,
      strengths: JSON.stringify(strengths),
      weaknesses: JSON.stringify(weaknesses),
      recommendations: JSON.stringify(recommendations),
      predictedCtr: predictedMetrics.ctr.toString(),
      predictedViews: predictedMetrics.views,
    });
  }
  
  return {
    analysisId,
    imageUrl,
    imagePrompt,
    textOverlay,
    ...scores,
    strengths,
    weaknesses,
    recommendations,
    predictedMetrics,
  };
}

// ============ TEXT OVERLAY GENERATION ============

async function generateTextOverlay(input: ThumbnailGeneratorInput): Promise<string> {
  const prompt = `You are a YouTube thumbnail expert. Generate attention-grabbing text overlay for a thumbnail.

Video Title: ${input.videoTitle}
Niche: ${input.niche}

Best practices:
- Keep text short (3-5 words max)
- Use curiosity gaps
- Create urgency or intrigue
- Avoid clickbait
- Make it readable at small sizes

Examples:
- "This Changed Everything"
- "You Won't Believe This"
- "The Truth About..."
- "How I Made $10K"

Return ONLY JSON with this exact structure:
{
  "textOverlay": "..."
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a YouTube thumbnail expert specializing in high-CTR designs." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "text_overlay",
          strict: true,
          schema: {
            type: "object",
            properties: {
              textOverlay: { type: "string", description: "Text overlay for thumbnail (3-5 words)" },
            },
            required: ["textOverlay"],
            additionalProperties: false,
          },
        },
      },
    });
    
    const content = response.choices[0]?.message?.content;
    if (content && typeof content === "string") {
      const parsed = JSON.parse(content);
      return parsed.textOverlay || "Watch This!";
    }
  } catch (error) {
    console.error("[Thumbnail Generator] Error generating text overlay:", error);
  }
  
  // Fallback
  return "Watch This!";
}

// ============ THUMBNAIL IMAGE GENERATION ============

async function generateThumbnailImage(
  input: ThumbnailGeneratorInput,
  textOverlay: string,
  style: string
): Promise<{
  imageUrl: string;
  imagePrompt: string;
}> {
  const styleDescriptions: Record<string, string> = {
    bold: "Bold, high-contrast colors, dramatic lighting, intense expression, eye-catching",
    minimal: "Clean, simple, minimalist design, soft colors, elegant composition",
    dramatic: "Cinematic lighting, intense shadows, emotional depth, movie poster style",
    playful: "Bright colors, fun energy, dynamic composition, cheerful vibe",
  };
  
  const styleDesc = styleDescriptions[style] || styleDescriptions.bold;
  
  const imagePrompt = input.customPrompt || 
    `YouTube thumbnail for "${input.videoTitle}". ${styleDesc}. ${input.niche} content. Professional photography, 16:9 aspect ratio, high quality, attention-grabbing composition. Text overlay: "${textOverlay}". Face close-up with expressive emotion if relevant to topic.`;
  
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
    console.error("[Thumbnail Generator] Error generating thumbnail image:", error);
    // Return placeholder
    return {
      imageUrl: "https://via.placeholder.com/1280x720?text=Thumbnail",
      imagePrompt,
    };
  }
}

// ============ SCORING ALGORITHMS ============

function calculateThumbnailScores(
  textOverlay: string,
  input: ThumbnailGeneratorInput,
  style: string
): {
  overallScore: number;
  ctrScore: number;
  clarityScore: number;
  emotionScore: number;
  contrastScore: number;
  textScore: number;
} {
  const ctrScore = calculateCTRScore(textOverlay, input);
  const clarityScore = calculateClarityScore(textOverlay);
  const emotionScore = calculateEmotionScore(textOverlay, input);
  const contrastScore = calculateContrastScore(style);
  const textScore = calculateTextScore(textOverlay);
  
  // Weighted average (CTR is most important for thumbnails)
  const overallScore = Math.round(
    ctrScore * 0.35 +
    clarityScore * 0.15 +
    emotionScore * 0.25 +
    contrastScore * 0.10 +
    textScore * 0.15
  );
  
  return {
    overallScore,
    ctrScore,
    clarityScore,
    emotionScore,
    contrastScore,
    textScore,
  };
}

function calculateCTRScore(textOverlay: string, input: ThumbnailGeneratorInput): number {
  let score = 60; // baseline
  
  const lowerText = textOverlay.toLowerCase();
  const lowerTitle = input.videoTitle.toLowerCase();
  
  // Curiosity triggers
  const curiosityWords = ["secret", "truth", "revealed", "shocking", "hidden", "why", "how", "this"];
  if (curiosityWords.some(w => lowerText.includes(w))) score += 15;
  
  // Numbers (high CTR)
  if (/\d+/.test(textOverlay)) score += 10;
  
  // Emotional words
  const emotionalWords = ["amazing", "insane", "crazy", "unbelievable", "epic", "fail", "win"];
  if (emotionalWords.some(w => lowerText.includes(w))) score += 10;
  
  // Length optimization (3-5 words is ideal)
  const wordCount = textOverlay.split(" ").length;
  if (wordCount >= 3 && wordCount <= 5) score += 5;
  
  return Math.min(100, score);
}

function calculateClarityScore(textOverlay: string): number {
  let score = 70; // baseline
  
  // Length check (too long = hard to read)
  if (textOverlay.length <= 30) score += 15;
  
  // Word count (3-5 words is ideal)
  const wordCount = textOverlay.split(" ").length;
  if (wordCount >= 3 && wordCount <= 5) score += 10;
  
  // Avoid complex words
  const avgWordLength = textOverlay.split(" ").reduce((sum, word) => sum + word.length, 0) / wordCount;
  if (avgWordLength < 7) score += 5;
  
  return Math.min(100, score);
}

function calculateEmotionScore(textOverlay: string, input: ThumbnailGeneratorInput): number {
  let score = 60; // baseline
  
  const lowerText = textOverlay.toLowerCase();
  
  // Emotional triggers
  const positiveWords = ["amazing", "incredible", "best", "epic", "perfect", "ultimate"];
  const negativeWords = ["fail", "worst", "disaster", "shocking", "exposed"];
  const intrigueWords = ["secret", "truth", "revealed", "hidden", "mystery"];
  
  if (positiveWords.some(w => lowerText.includes(w))) score += 15;
  if (negativeWords.some(w => lowerText.includes(w))) score += 15;
  if (intrigueWords.some(w => lowerText.includes(w))) score += 10;
  
  // Exclamation marks (adds emotion)
  if (textOverlay.includes("!")) score += 5;
  
  return Math.min(100, score);
}

function calculateContrastScore(style: string): number {
  // Style-based contrast scoring
  const styleScores: Record<string, number> = {
    bold: 90, // High contrast by design
    minimal: 70, // Lower contrast, more subtle
    dramatic: 85, // High contrast with shadows
    playful: 80, // Bright colors, good contrast
  };
  
  return styleScores[style] || 75;
}

function calculateTextScore(textOverlay: string): number {
  let score = 70; // baseline
  
  // Length optimization (short text is more readable)
  if (textOverlay.length <= 20) score += 15;
  
  // Word count (3-5 words is ideal)
  const wordCount = textOverlay.split(" ").length;
  if (wordCount >= 3 && wordCount <= 5) score += 10;
  
  // Avoid all caps (harder to read)
  if (textOverlay !== textOverlay.toUpperCase()) score += 5;
  
  return Math.min(100, score);
}

// ============ ANALYSIS GENERATION ============

function generateStrengths(scores: {
  ctrScore: number;
  clarityScore: number;
  emotionScore: number;
  contrastScore: number;
  textScore: number;
}): string[] {
  const strengths: string[] = [];
  
  if (scores.ctrScore >= 80) strengths.push("High click-through potential");
  if (scores.clarityScore >= 80) strengths.push("Clear and readable text");
  if (scores.emotionScore >= 80) strengths.push("Strong emotional impact");
  if (scores.contrastScore >= 80) strengths.push("Excellent visual contrast");
  if (scores.textScore >= 80) strengths.push("Optimal text length and readability");
  
  // Add at least one strength
  if (strengths.length === 0) {
    strengths.push("Thumbnail design is well-structured");
  }
  
  return strengths;
}

function generateWeaknesses(scores: {
  ctrScore: number;
  clarityScore: number;
  emotionScore: number;
  contrastScore: number;
  textScore: number;
}): string[] {
  const weaknesses: string[] = [];
  
  if (scores.ctrScore < 70) weaknesses.push("Text lacks curiosity triggers");
  if (scores.clarityScore < 70) weaknesses.push("Text may be too long or complex");
  if (scores.emotionScore < 70) weaknesses.push("Missing emotional impact");
  if (scores.contrastScore < 70) weaknesses.push("Low visual contrast");
  if (scores.textScore < 70) weaknesses.push("Text readability could be improved");
  
  return weaknesses;
}

function generateRecommendations(
  weaknesses: string[],
  input: ThumbnailGeneratorInput,
  style: string
): string[] {
  const recommendations: string[] = [];
  
  if (weaknesses.some(w => w.includes("curiosity"))) {
    recommendations.push("Add curiosity gap: 'The Secret to...' or 'What Nobody Tells You About...'");
  }
  
  if (weaknesses.some(w => w.includes("long"))) {
    recommendations.push("Shorten text to 3-5 words for better readability");
  }
  
  if (weaknesses.some(w => w.includes("emotional"))) {
    recommendations.push("Add emotional trigger: 'Amazing', 'Shocking', or 'Epic'");
  }
  
  if (weaknesses.some(w => w.includes("contrast"))) {
    recommendations.push(`Try '${style === "minimal" ? "bold" : "dramatic"}' style for higher contrast`);
  }
  
  if (weaknesses.some(w => w.includes("readability"))) {
    recommendations.push("Use shorter words and larger font size");
  }
  
  // Always add at least one recommendation
  if (recommendations.length === 0) {
    recommendations.push("Test multiple thumbnail variations to find top performer");
  }
  
  return recommendations;
}

// ============ METRICS PREDICTION ============

function predictThumbnailMetrics(
  overallScore: number,
  niche: string
): {
  ctr: number; // Click-through rate (%)
  views: number; // Expected views boost
} {
  // Base CTR by niche
  const nicheCTR: Record<string, number> = {
    gaming: 8.0,
    tech: 6.5,
    lifestyle: 7.0,
    education: 5.5,
    entertainment: 9.0,
    finance: 5.0,
    fitness: 7.5,
  };
  
  const baseCTR = nicheCTR[niche.toLowerCase()] || 6.0;
  const ctr = baseCTR * (overallScore / 100);
  
  // Views boost (compared to average thumbnail)
  const viewsBoost = Math.round((overallScore / 100) * 50000); // 0-50K views boost
  
  return {
    ctr: Math.round(ctr * 100) / 100,
    views: viewsBoost,
  };
}
