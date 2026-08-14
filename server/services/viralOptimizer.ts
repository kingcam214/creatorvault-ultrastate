/**
 * Viral Optimizer truth boundary.
 *
 * The former implementation assigned performance scores from title keywords,
 * invented projected views/CTR/retention, and substituted generic LLM fallback
 * copy when analysis failed. Those are not real creator insights. This service
 * stays held until it can analyze a saved CreatorVault source and ground any
 * performance language in real connected platform evidence.
 */

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

export const VIRAL_OPTIMIZER_HELD_MESSAGE =
  "Viral Optimizer is being rebuilt around your real CreatorVault footage and connected platform evidence. The previous version could show made-up performance scores and forecasts, so it is not available for new analysis yet.";

export async function runViralOptimizer(
  _input: ViralOptimizerInput,
): Promise<ViralOptimizerOutput> {
  throw new Error(VIRAL_OPTIMIZER_HELD_MESSAGE);
}
