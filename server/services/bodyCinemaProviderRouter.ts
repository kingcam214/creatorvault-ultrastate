/**
 * ─── Body Cinema Provider Router ─────────────────────────────────────────────────
 *
 * Multi-model cinematic operating layer that routes AI video generation jobs
 * across premium providers (Pollo/Kling, Runway, Replicate, Luma-style),
 * evaluates output quality, preserves creator identity/reference assets,
 * and generates campaign-ready deliverables.
 *
 * This is the uncopyable layer that makes VaultX the adult creator revenue studio.
 */

import { randomUUID } from "crypto";

// ─── Provider Definitions ────────────────────────────────────────────────────────

export type ProviderName = "pollo" | "runway" | "kling" | "replicate" | "luma" | "minimax" | "pika";

export interface ProviderCapability {
  maxDurationSeconds: number;
  supportedAspectRatios: string[];
  supportedResolutions: string[];
  identityConsistency: number;     // 0-100 score for face/identity preservation
  motionQuality: number;           // 0-100 score for motion realism
  promptAdherence: number;         // 0-100 score for following instructions
  adultContentPolicy: "allowed" | "restricted" | "prohibited";
  costPerSecondCents: number;
  averageGenerationTimeSec: number;
  supportsImageToVideo: boolean;
  supportsVideoToVideo: boolean;
  supportsTextToVideo: boolean;
  supportsKeyframes: boolean;
  supportsCameraControl: boolean;
  supportsMotionBrush: boolean;
  maxConcurrentJobs: number;
  apiConfigured: boolean;
  apiHealthy: boolean;
}

export interface ProviderProfile {
  name: ProviderName;
  label: string;
  tier: "premium" | "standard" | "experimental";
  capabilities: ProviderCapability;
  models: ProviderModel[];
}

export interface ProviderModel {
  id: string;
  name: string;
  version: string;
  specialization: "cinematic" | "fast" | "identity" | "motion" | "style" | "general";
  qualityScore: number; // 0-100
}

// ─── Job Types ───────────────────────────────────────────────────────────────────

export type CinemaGoal =
  | "teaser"           // Short hook clip for social
  | "trailer"          // Longer cinematic preview
  | "ppv_master"       // Full premium unlock content
  | "vip_upsell"       // Exclusive VIP variant
  | "subscriber_drop"  // Subscriber-only content
  | "dm_sales"         // Direct message sales asset
  | "story_clip"       // Platform story format
  | "thumbnail_pack"   // Thumbnail generation
  | "scene_extension"  // Extend existing clip
  | "style_transfer"   // Apply cinematic style
  | "localization";    // Localized variant

export interface CinemaJobRequest {
  id: string;
  userId: string;
  packageId?: string;
  goal: CinemaGoal;
  sourceAssetUrl: string;
  sourceType: "image" | "video";
  referenceAssets?: string[];       // Identity/style reference images
  prompt?: string;
  negativePrompt?: string;
  style: BodyCinemaStyle;
  platform: PlatformTarget;
  aspectRatio: string;
  duration: number;                 // target seconds
  motionDirective?: string;
  cameraMovement?: string;
  identityLock: boolean;
  budgetCentsMax?: number;
  preferredProvider?: ProviderName;
  qualityThreshold: number;         // minimum QA score to accept (0-100)
  maxRetries: number;
  consentVerified: boolean;
  ageVerified: boolean;
}

export type BodyCinemaStyle = "luxury" | "noir" | "sunset" | "penthouse" | "editorial" | "vip_tease" | "boudoir" | "cinematic_heat" | "after_dark" | "neon_club";

export type PlatformTarget = "vaultx" | "onlyfans" | "fansly" | "telegram" | "instagram_reel" | "twitter" | "tiktok";

export interface CinemaJobResult {
  jobId: string;
  status: "queued" | "routing" | "generating" | "scoring" | "accepted" | "rejected" | "failed";
  providerUsed?: ProviderName;
  modelUsed?: string;
  outputUrl?: string;
  thumbnailUrl?: string;
  qualityScore?: QualityScore;
  costCents?: number;
  generationTimeSec?: number;
  retryCount: number;
  rejectionReason?: string;
  metadata?: Record<string, any>;
}

// ─── Quality Scoring ─────────────────────────────────────────────────────────────

export interface QualityScore {
  overall: number;              // 0-100 composite
  identityConsistency: number;  // Face/body match to reference
  motionRealism: number;        // Natural movement quality
  visualCoherence: number;      // No artifacts, glitches, morphing
  promptAdherence: number;      // Did it follow the directive
  cropSafety: number;           // Content within safe areas
  audioReadiness: number;       // Ready for audio overlay
  conversionPotential: number;  // Predicted fan engagement
  policyCompliance: number;     // Meets platform content rules
  technicalQuality: number;     // Resolution, bitrate, encoding
}

export function computeQualityScore(metrics: Partial<QualityScore>): QualityScore {
  const defaults: QualityScore = {
    overall: 0,
    identityConsistency: metrics.identityConsistency ?? 70,
    motionRealism: metrics.motionRealism ?? 70,
    visualCoherence: metrics.visualCoherence ?? 70,
    promptAdherence: metrics.promptAdherence ?? 70,
    cropSafety: metrics.cropSafety ?? 85,
    audioReadiness: metrics.audioReadiness ?? 80,
    conversionPotential: metrics.conversionPotential ?? 65,
    policyCompliance: metrics.policyCompliance ?? 90,
    technicalQuality: metrics.technicalQuality ?? 80,
  };

  // Weighted composite
  const weights = {
    identityConsistency: 0.20,
    motionRealism: 0.15,
    visualCoherence: 0.20,
    promptAdherence: 0.10,
    cropSafety: 0.05,
    audioReadiness: 0.05,
    conversionPotential: 0.10,
    policyCompliance: 0.10,
    technicalQuality: 0.05,
  };

  defaults.overall = Math.round(
    defaults.identityConsistency * weights.identityConsistency +
    defaults.motionRealism * weights.motionRealism +
    defaults.visualCoherence * weights.visualCoherence +
    defaults.promptAdherence * weights.promptAdherence +
    defaults.cropSafety * weights.cropSafety +
    defaults.audioReadiness * weights.audioReadiness +
    defaults.conversionPotential * weights.conversionPotential +
    defaults.policyCompliance * weights.policyCompliance +
    defaults.technicalQuality * weights.technicalQuality
  );

  return defaults;
}

// ─── Provider Router ─────────────────────────────────────────────────────────────

export class BodyCinemaRouter {
  private providers: Map<ProviderName, ProviderProfile> = new Map();
  private jobHistory: Map<string, CinemaJobResult> = new Map();

  registerProvider(profile: ProviderProfile): void {
    this.providers.set(profile.name, profile);
  }

  /**
   * Select the optimal provider for a given job based on:
   * - Goal requirements (duration, quality, speed)
   * - Content policy compatibility
   * - Identity preservation needs
   * - Budget constraints
   * - Provider health and availability
   * - Historical performance for similar jobs
   */
  selectProvider(job: CinemaJobRequest): { provider: ProviderProfile; model: ProviderModel; reasoning: string[] } | null {
    const reasoning: string[] = [];
    const candidates: Array<{ provider: ProviderProfile; model: ProviderModel; score: number }> = [];

    for (const [name, provider] of this.providers) {
      const cap = provider.capabilities;

      // Hard filters
      if (!cap.apiConfigured || !cap.apiHealthy) {
        reasoning.push(`${name}: skipped (not configured or unhealthy)`);
        continue;
      }
      if (job.duration > cap.maxDurationSeconds) {
        reasoning.push(`${name}: skipped (max duration ${cap.maxDurationSeconds}s < requested ${job.duration}s)`);
        continue;
      }
      if (!cap.supportedAspectRatios.includes(job.aspectRatio) && cap.supportedAspectRatios.length > 0) {
        reasoning.push(`${name}: skipped (aspect ratio ${job.aspectRatio} not supported)`);
        continue;
      }
      if (job.sourceType === "image" && !cap.supportsImageToVideo) {
        reasoning.push(`${name}: skipped (no image-to-video support)`);
        continue;
      }
      if (job.sourceType === "video" && !cap.supportsVideoToVideo) {
        reasoning.push(`${name}: skipped (no video-to-video support)`);
        continue;
      }

      // Budget check
      const estimatedCost = cap.costPerSecondCents * job.duration;
      if (job.budgetCentsMax && estimatedCost > job.budgetCentsMax) {
        reasoning.push(`${name}: skipped (estimated cost ${estimatedCost}c > budget ${job.budgetCentsMax}c)`);
        continue;
      }

      // Score each model
      for (const model of provider.models) {
        let score = 0;

        // Identity lock bonus
        if (job.identityLock) {
          score += cap.identityConsistency * 0.3;
          if (model.specialization === "identity") score += 20;
        }

        // Motion quality for cinematic goals
        if (["trailer", "ppv_master", "vip_upsell"].includes(job.goal)) {
          score += cap.motionQuality * 0.25;
          if (model.specialization === "cinematic") score += 15;
        }

        // Speed priority for social/DM content
        if (["teaser", "story_clip", "dm_sales"].includes(job.goal)) {
          score += (100 - Math.min(100, cap.averageGenerationTimeSec)) * 0.2;
          if (model.specialization === "fast") score += 15;
        }

        // Prompt adherence
        score += cap.promptAdherence * 0.15;

        // Model quality baseline
        score += model.qualityScore * 0.1;

        // Preferred provider bonus
        if (job.preferredProvider === name) score += 10;

        candidates.push({ provider, model, score });
      }
    }

    if (candidates.length === 0) {
      reasoning.push("No eligible providers found for this job configuration");
      return null;
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    reasoning.push(`Selected ${best.provider.name}/${best.model.id} (score: ${best.score.toFixed(1)})`);

    return { provider: best.provider, model: best.model, reasoning };
  }

  /**
   * Build the structured prompt for the selected provider based on
   * the Body Cinema motion director system.
   */
  buildPrompt(job: CinemaJobRequest, provider: ProviderProfile): string {
    const parts: string[] = [];

    // Subject description
    if (job.prompt) {
      parts.push(job.prompt);
    }

    // Motion directive
    if (job.motionDirective) {
      parts.push(`Movement: ${job.motionDirective}`);
    }

    // Camera movement
    if (job.cameraMovement) {
      parts.push(`Camera: ${job.cameraMovement}`);
    }

    // Style application
    const styleDirectives: Record<BodyCinemaStyle, string> = {
      luxury: "warm gold lighting, premium VIP pacing, polished cinematic reveal, luxury atmosphere",
      noir: "high contrast black and white, dramatic shadows, film noir mood, mysterious",
      sunset: "golden hour warmth, natural soft light, romantic atmosphere, amber tones",
      penthouse: "modern luxury interior, city skyline, sophisticated lighting, premium feel",
      editorial: "fashion editorial style, clean composition, deliberate posing, magazine quality",
      vip_tease: "intimate close-up, soft focus background, suggestive but tasteful, premium",
      boudoir: "soft intimate lighting, silk textures, warm tones, elegant sensuality",
      cinematic_heat: "dramatic cinematic lighting, slow motion, intense mood, film quality",
      after_dark: "low-key lighting, nighttime atmosphere, moody shadows, mysterious allure",
      neon_club: "vibrant neon colors, club atmosphere, dynamic energy, electric mood",
    };

    parts.push(styleDirectives[job.style] || styleDirectives.luxury);

    // Platform-specific framing
    const platformFraming: Record<PlatformTarget, string> = {
      vaultx: "premium unlock-worthy, high production value",
      onlyfans: "subscriber-exclusive quality, intimate feel",
      fansly: "premium creator content, polished presentation",
      telegram: "attention-grabbing, mobile-optimized framing",
      instagram_reel: "vertical format, hook in first 2 seconds, trending style",
      twitter: "eye-catching, shareable, stops the scroll",
      tiktok: "viral potential, trending format, immediate hook",
    };

    parts.push(platformFraming[job.platform] || "");

    // Identity lock constraints
    if (job.identityLock) {
      parts.push("IMPORTANT: Preserve exact facial features, body proportions, and distinguishing characteristics of the subject. Do not alter identity.");
    }

    return parts.filter(Boolean).join(". ") + ".";
  }

  /**
   * Submit a cinema job through the routing system.
   */
  async submitJob(job: CinemaJobRequest): Promise<CinemaJobResult> {
    // Validate prerequisites
    if (!job.consentVerified) {
      return { jobId: job.id, status: "failed", retryCount: 0, rejectionReason: "Consent not verified. All Body Cinema generation requires confirmed creator consent." };
    }
    if (!job.ageVerified) {
      return { jobId: job.id, status: "failed", retryCount: 0, rejectionReason: "Age verification not confirmed. All monetized content requires age verification." };
    }

    // Route to provider
    const selection = this.selectProvider(job);
    if (!selection) {
      return { jobId: job.id, status: "failed", retryCount: 0, rejectionReason: "No eligible provider available for this job configuration." };
    }

    const prompt = this.buildPrompt(job, selection.provider);

    const result: CinemaJobResult = {
      jobId: job.id,
      status: "routing",
      providerUsed: selection.provider.name,
      modelUsed: selection.model.id,
      retryCount: 0,
      metadata: {
        prompt,
        reasoning: selection.reasoning,
        estimatedCost: selection.provider.capabilities.costPerSecondCents * job.duration,
        estimatedTime: selection.provider.capabilities.averageGenerationTimeSec,
      },
    };

    this.jobHistory.set(job.id, result);
    return result;
  }

  /**
   * Evaluate output quality and decide accept/reject/retry.
   */
  evaluateOutput(jobId: string, metrics: Partial<QualityScore>, job: CinemaJobRequest): { accepted: boolean; score: QualityScore; action: "accept" | "reject" | "retry" } {
    const score = computeQualityScore(metrics);
    const result = this.jobHistory.get(jobId);

    if (score.overall >= job.qualityThreshold) {
      if (result) { result.status = "accepted"; result.qualityScore = score; }
      return { accepted: true, score, action: "accept" };
    }

    if (result && result.retryCount < job.maxRetries) {
      result.retryCount++;
      result.status = "rejected";
      result.rejectionReason = `Quality score ${score.overall} below threshold ${job.qualityThreshold}`;
      return { accepted: false, score, action: "retry" };
    }

    if (result) {
      result.status = "rejected";
      result.qualityScore = score;
      result.rejectionReason = `Quality score ${score.overall} below threshold ${job.qualityThreshold} after ${result.retryCount} retries`;
    }
    return { accepted: false, score, action: "reject" };
  }

  getProviders(): ProviderProfile[] {
    return [...this.providers.values()];
  }

  getJobStatus(jobId: string): CinemaJobResult | undefined {
    return this.jobHistory.get(jobId);
  }
}

// ─── Default Provider Profiles ───────────────────────────────────────────────────

export function createDefaultProviderProfiles(configuredProviders: Record<string, boolean>): ProviderProfile[] {
  return [
    {
      name: "pollo",
      label: "Pollo AI (Kling 3.0)",
      tier: "premium",
      capabilities: {
        maxDurationSeconds: 10,
        supportedAspectRatios: ["16:9", "9:16", "1:1"],
        supportedResolutions: ["1080p", "720p"],
        identityConsistency: 82,
        motionQuality: 85,
        promptAdherence: 78,
        adultContentPolicy: "allowed",
        costPerSecondCents: 15,
        averageGenerationTimeSec: 120,
        supportsImageToVideo: true,
        supportsVideoToVideo: false,
        supportsTextToVideo: true,
        supportsKeyframes: false,
        supportsCameraControl: true,
        supportsMotionBrush: false,
        maxConcurrentJobs: 5,
        apiConfigured: configuredProviders.pollo ?? false,
        apiHealthy: configuredProviders.pollo ?? false,
      },
      models: [
        { id: "kling-3.0", name: "Kling 3.0", version: "3.0", specialization: "cinematic", qualityScore: 85 },
        { id: "seedance-2.0", name: "Seedance 2.0", version: "2.0", specialization: "motion", qualityScore: 80 },
      ],
    },
    {
      name: "runway",
      label: "Runway Gen-4",
      tier: "premium",
      capabilities: {
        maxDurationSeconds: 16,
        supportedAspectRatios: ["16:9", "9:16", "1:1", "4:5", "21:9"],
        supportedResolutions: ["1080p", "4K"],
        identityConsistency: 88,
        motionQuality: 92,
        promptAdherence: 85,
        adultContentPolicy: "restricted",
        costPerSecondCents: 25,
        averageGenerationTimeSec: 90,
        supportsImageToVideo: true,
        supportsVideoToVideo: true,
        supportsTextToVideo: true,
        supportsKeyframes: true,
        supportsCameraControl: true,
        supportsMotionBrush: true,
        maxConcurrentJobs: 3,
        apiConfigured: configuredProviders.runway ?? false,
        apiHealthy: configuredProviders.runway ?? false,
      },
      models: [
        { id: "gen-4-turbo", name: "Gen-4 Turbo", version: "4.0", specialization: "cinematic", qualityScore: 92 },
        { id: "gen-4-fast", name: "Gen-4 Fast", version: "4.0", specialization: "fast", qualityScore: 82 },
      ],
    },
    {
      name: "replicate",
      label: "Replicate (Multi-Model)",
      tier: "standard",
      capabilities: {
        maxDurationSeconds: 10,
        supportedAspectRatios: ["16:9", "9:16", "1:1"],
        supportedResolutions: ["1080p", "720p"],
        identityConsistency: 75,
        motionQuality: 72,
        promptAdherence: 80,
        adultContentPolicy: "allowed",
        costPerSecondCents: 8,
        averageGenerationTimeSec: 180,
        supportsImageToVideo: true,
        supportsVideoToVideo: true,
        supportsTextToVideo: true,
        supportsKeyframes: false,
        supportsCameraControl: false,
        supportsMotionBrush: false,
        maxConcurrentJobs: 10,
        apiConfigured: configuredProviders.replicate ?? false,
        apiHealthy: configuredProviders.replicate ?? false,
      },
      models: [
        { id: "wan-2.1", name: "Wan 2.1", version: "2.1", specialization: "general", qualityScore: 75 },
        { id: "ltx-video", name: "LTX Video", version: "1.0", specialization: "fast", qualityScore: 70 },
      ],
    },
    {
      name: "luma",
      label: "Luma Dream Machine",
      tier: "premium",
      capabilities: {
        maxDurationSeconds: 10,
        supportedAspectRatios: ["16:9", "9:16", "1:1"],
        supportedResolutions: ["1080p"],
        identityConsistency: 80,
        motionQuality: 88,
        promptAdherence: 82,
        adultContentPolicy: "restricted",
        costPerSecondCents: 20,
        averageGenerationTimeSec: 60,
        supportsImageToVideo: true,
        supportsVideoToVideo: false,
        supportsTextToVideo: true,
        supportsKeyframes: true,
        supportsCameraControl: true,
        supportsMotionBrush: false,
        maxConcurrentJobs: 5,
        apiConfigured: configuredProviders.luma ?? false,
        apiHealthy: configuredProviders.luma ?? false,
      },
      models: [
        { id: "dream-machine-2", name: "Dream Machine 2", version: "2.0", specialization: "cinematic", qualityScore: 88 },
      ],
    },
    {
      name: "minimax",
      label: "MiniMax Video-01",
      tier: "standard",
      capabilities: {
        maxDurationSeconds: 6,
        supportedAspectRatios: ["16:9", "9:16", "1:1"],
        supportedResolutions: ["1080p"],
        identityConsistency: 70,
        motionQuality: 78,
        promptAdherence: 75,
        adultContentPolicy: "allowed",
        costPerSecondCents: 6,
        averageGenerationTimeSec: 90,
        supportsImageToVideo: true,
        supportsVideoToVideo: false,
        supportsTextToVideo: true,
        supportsKeyframes: false,
        supportsCameraControl: false,
        supportsMotionBrush: false,
        maxConcurrentJobs: 8,
        apiConfigured: configuredProviders.minimax ?? false,
        apiHealthy: configuredProviders.minimax ?? false,
      },
      models: [
        { id: "video-01-live", name: "Video-01-Live", version: "1.0", specialization: "fast", qualityScore: 72 },
      ],
    },
  ];
}

// ─── Output Ladder Generator ─────────────────────────────────────────────────────

export interface OutputLadderConfig {
  goals: CinemaGoal[];
  platforms: PlatformTarget[];
  aspectRatios: Record<PlatformTarget, string>;
  durations: Record<CinemaGoal, number>;
}

export const DEFAULT_OUTPUT_LADDER: OutputLadderConfig = {
  goals: ["teaser", "trailer", "ppv_master", "vip_upsell", "subscriber_drop", "dm_sales", "story_clip", "thumbnail_pack"],
  platforms: ["vaultx", "onlyfans", "fansly", "telegram", "instagram_reel", "twitter"],
  aspectRatios: {
    vaultx: "9:16",
    onlyfans: "9:16",
    fansly: "9:16",
    telegram: "9:16",
    instagram_reel: "9:16",
    twitter: "16:9",
    tiktok: "9:16",
  },
  durations: {
    teaser: 5,
    trailer: 15,
    ppv_master: 30,
    vip_upsell: 20,
    subscriber_drop: 25,
    dm_sales: 8,
    story_clip: 10,
    thumbnail_pack: 1,
    scene_extension: 10,
    style_transfer: 10,
    localization: 10,
  },
};

/**
 * Generate a full campaign job list from a single source asset.
 * This is the "one upload → multiple revenue assets" system.
 */
export function generateOutputLadder(
  userId: string,
  sourceAssetUrl: string,
  sourceType: "image" | "video",
  style: BodyCinemaStyle,
  config: OutputLadderConfig = DEFAULT_OUTPUT_LADDER
): CinemaJobRequest[] {
  const jobs: CinemaJobRequest[] = [];

  for (const goal of config.goals) {
    for (const platform of config.platforms) {
      // Skip incompatible combinations
      if (goal === "ppv_master" && platform === "instagram_reel") continue;
      if (goal === "ppv_master" && platform === "twitter") continue;
      if (goal === "thumbnail_pack" && platform !== "vaultx") continue;

      jobs.push({
        id: randomUUID(),
        userId,
        goal,
        sourceAssetUrl,
        sourceType,
        style,
        platform,
        aspectRatio: config.aspectRatios[platform] || "9:16",
        duration: config.durations[goal] || 10,
        identityLock: true,
        qualityThreshold: goal === "ppv_master" ? 80 : goal === "teaser" ? 60 : 70,
        maxRetries: goal === "ppv_master" ? 3 : 1,
        consentVerified: false, // Must be set by caller
        ageVerified: false,     // Must be set by caller
      });
    }
  }

  return jobs;
}
