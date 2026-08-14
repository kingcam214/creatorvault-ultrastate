/**
 * Thumbnail creation boundary.
 *
 * The former implementation could call an ungoverned image path and then save
 * a placeholder URL as if it were a finished thumbnail. That is not a real
 * creator result. Thumbnail creation remains held until its governed image
 * lane can produce a durable, reviewable CreatorVault visual.
 */

export interface ThumbnailGeneratorInput {
  videoTitle: string;
  niche: string;
  style?: "bold" | "minimal" | "dramatic" | "playful";
  platform?: string;
  customPrompt?: string;
}

export interface ThumbnailGeneratorOutput {
  analysisId: string;
  imageUrl: string;
  imagePrompt: string;
  textOverlay: string;
  overallScore: number;
  ctrScore: number;
  clarityScore: number;
  emotionScore: number;
  contrastScore: number;
  textScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  predictedMetrics: {
    ctr: number;
    views: number;
  };
}

export const THUMBNAIL_CREATION_HELD_MESSAGE =
  "Thumbnail creation is being rebuilt around real CreatorVault media. The previous version could show a placeholder instead of a finished visual, so it is not available for new work yet.";

export async function runThumbnailGenerator(
  _userId: number,
  _input: ThumbnailGeneratorInput,
): Promise<ThumbnailGeneratorOutput> {
  throw new Error(THUMBNAIL_CREATION_HELD_MESSAGE);
}
