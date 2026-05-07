/**
 * Content Orchestrator Tests
 * 
 * Tests the unified content orchestration pipeline.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { orchestrateContent, getContentById } from "./contentOrchestrator";

// Mock dependencies
vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve({
    insert: vi.fn(() => ({ values: vi.fn(() => Promise.resolve()) })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([{
            id: "test-content-123",
            userId: 1,
            title: "Test Content",
            status: "draft",
          }])),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  })),
}));

vi.mock("./viralOptimizer", () => ({
  analyzeViralPotential: vi.fn(() => Promise.resolve({
    viralScore: 85,
    recommendations: ["Add numbers to title", "Use emotional trigger"],
    optimizedTitle: "10 AI Tools That Will BLOW YOUR MIND 🤯",
  })),
}));

vi.mock("./thumbnailGenerator", () => ({
  generateThumbnail: vi.fn(() => Promise.resolve({
    thumbnails: [
      { url: "https://example.com/thumb1.jpg", variant: "bold", score: 0.92 },
    ],
  })),
}));

vi.mock("./platformPosting", () => ({
  postToMultiplePlatforms: vi.fn(() => Promise.resolve({
    results: {
      youtube: { success: true, url: "https://youtube.com/watch?v=test" },
      tiktok: { success: true, url: "https://tiktok.com/@user/video/123" },
    },
  })),
}));

vi.mock("./contentScheduler", () => ({
  schedulePost: vi.fn(() => Promise.resolve({
    scheduleId: "schedule-123",
    scheduledFor: new Date("2025-12-25T10:00:00Z"),
  })),
}));

describe("Content Orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("orchestrateContent", () => {
    it("should create unified content record", async () => {
      const input = {
        userId: 1,
        userId: 1,
        title: "Test Video",
        description: "Test description",
        mediaType: "video" as const,
        targetPlatforms: ["youtube" as const],
        publishStrategy: "draft" as const,
        optimizationLevel: "basic" as const,
        generateThumbnail: false,
        generateAd: false,
        runViralAnalysis: false,
      };

      const result = await orchestrateContent(input);

      expect(result).toBeDefined();
      expect(result.contentId).toBeDefined();
      expect(result.status).toBe("draft");
    });

    it("should run viral analysis when enabled", async () => {
      const input = {
        userId: 1,
        userId: 1,
        title: "AI Tools Video",
        mediaType: "video" as const,
        targetPlatforms: ["youtube" as const],
        publishStrategy: "draft" as const,
        optimizationLevel: "aggressive" as const,
        generateThumbnail: false,
        generateAd: false,
        runViralAnalysis: true,
      };

      const result = await orchestrateContent(input);

      expect(result.viralAnalysis).toBeDefined();
      expect(result.viralAnalysis?.viralScore).toBeGreaterThan(0);
    });

    it("should generate thumbnail when enabled", async () => {
      const input = {
        userId: 1,
        userId: 1,
        title: "Thumbnail Test",
        mediaType: "video" as const,
        targetPlatforms: ["youtube" as const],
        publishStrategy: "draft" as const,
        optimizationLevel: "aggressive" as const,
        generateThumbnail: true,
        generateAd: false,
        runViralAnalysis: false,
      };

      const result = await orchestrateContent(input);

      expect(result.generatedAssets).toBeDefined();
      expect(result.generatedAssets.thumbnails.length).toBeGreaterThan(0);
    });

    it("should adapt content for multiple platforms", async () => {
      const input = {
        userId: 1,
        userId: 1,
        title: "Multi-Platform Test",
        mediaType: "video" as const,
        targetPlatforms: ["youtube" as const, "tiktok" as const, "instagram" as const],
        publishStrategy: "draft" as const,
        optimizationLevel: "basic" as const,
        generateThumbnail: false,
        generateAd: false,
        runViralAnalysis: false,
      };

      const result = await orchestrateContent(input);

      expect(result.platformAdaptations).toBeDefined();
      expect(Object.keys(result.platformAdaptations).length).toBe(3);
      expect(result.platformAdaptations.youtube).toBeDefined();
      expect(result.platformAdaptations.tiktok).toBeDefined();
      expect(result.platformAdaptations.instagram).toBeDefined();
    });

    it("should publish immediately when strategy is immediate", async () => {
      const input = {
        userId: 1,
        userId: 1,
        title: "Immediate Publish Test",
        mediaType: "video" as const,
        targetPlatforms: ["youtube" as const],
        publishStrategy: "immediate" as const,
        optimizationLevel: "basic" as const,
        generateThumbnail: false,
        generateAd: false,
        runViralAnalysis: false,
      };

      const result = await orchestrateContent(input);

      expect(result.status).toBe("published");
      expect(result.distributionResults?.immediate).toBeDefined();
    });

    it("should schedule when strategy is scheduled", async () => {
      const scheduledFor = new Date("2025-12-25T10:00:00Z");
      
      const input = {
        userId: 1,
        userId: 1,
        title: "Scheduled Test",
        mediaType: "video" as const,
        targetPlatforms: ["youtube" as const],
        publishStrategy: "scheduled" as const,
        scheduledFor,
        optimizationLevel: "basic" as const,
        generateThumbnail: false,
        generateAd: false,
        runViralAnalysis: false,
      };

      const result = await orchestrateContent(input);

      expect(result.status).toBe("scheduled");
      expect(result.distributionResults?.scheduled).toBeDefined();
    });

    it("should save as draft when strategy is draft", async () => {
      const input = {
        userId: 1,
        title: "Draft Test",
        mediaType: "video" as const,
        targetPlatforms: ["youtube" as const],
        publishStrategy: "draft" as const,
        optimizationLevel: "basic" as const,
        generateThumbnail: false,
        generateAd: false,
        runViralAnalysis: false,
      };

      const result = await orchestrateContent(input);

      expect(result.status).toBe("draft");
      expect(result.distributionResults).toBeUndefined();
    });

    it("should handle optimization errors gracefully", async () => {
      // Mock viral optimizer to throw error
      const { analyzeViralPotential } = await import("./viralOptimizer");
      vi.mocked(analyzeViralPotential).mockRejectedValueOnce(new Error("API error"));

      const input = {
        userId: 1,
        title: "Error Test",
        mediaType: "video" as const,
        targetPlatforms: ["youtube" as const],
        publishStrategy: "draft" as const,
        optimizationLevel: "aggressive" as const,
        generateThumbnail: false,
        generateAd: false,
        runViralAnalysis: true,
      };

      // Should not throw, should continue without viral analysis
      const result = await orchestrateContent(input);
      
      expect(result).toBeDefined();
      expect(result.contentId).toBeDefined();
    });
  });

  describe("getContentById", () => {
    it("should retrieve content by ID", async () => {
      const content = await getContentById("test-content-123");

      expect(content).toBeDefined();
      expect(content?.id).toBe("test-content-123");
      expect(content?.title).toBe("Test Content");
    });

    it("should return null for non-existent content", async () => {
      const { getDb } = await import("../db");
      vi.mocked(getDb).mockResolvedValueOnce({
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      } as any);

      const content = await getContentById("non-existent");

      expect(content).toBeNull();
    });
  });

  describe("Platform Adaptation", () => {
    it("should apply YouTube-specific formatting", async () => {
      const input = {
        userId: 1,
        title: "YouTube Test",
        description: "Test description",
        mediaType: "video" as const,
        targetPlatforms: ["youtube" as const],
        publishStrategy: "draft" as const,
        optimizationLevel: "basic" as const,
        generateThumbnail: false,
        generateAd: false,
        runViralAnalysis: false,
      };

      const result = await orchestrateContent(input);

      const youtubeAdaptation = result.platformAdaptations.youtube;
      expect(youtubeAdaptation).toBeDefined();
      expect(youtubeAdaptation.title).toBeDefined();
      expect(youtubeAdaptation.description).toBeDefined();
    });

    it("should apply TikTok-specific formatting", async () => {
      const input = {
        userId: 1,
        title: "TikTok Test with lots of hashtags",
        mediaType: "video" as const,
        targetPlatforms: ["tiktok" as const],
        publishStrategy: "draft" as const,
        optimizationLevel: "basic" as const,
        generateThumbnail: false,
        generateAd: false,
        runViralAnalysis: false,
      };

      const result = await orchestrateContent(input);

      const tiktokAdaptation = result.platformAdaptations.tiktok;
      expect(tiktokAdaptation).toBeDefined();
      // TikTok limits hashtags to 3-5
      const hashtags = tiktokAdaptation.hashtags?.split(" ") || [];
      expect(hashtags.length).toBeLessThanOrEqual(5);
    });

    it("should apply Instagram-specific formatting", async () => {
      const input = {
        userId: 1,
        title: "Instagram Test",
        mediaType: "image" as const,
        targetPlatforms: ["instagram" as const],
        publishStrategy: "draft" as const,
        optimizationLevel: "basic" as const,
        generateThumbnail: false,
        generateAd: false,
        runViralAnalysis: false,
      };

      const result = await orchestrateContent(input);

      const instagramAdaptation = result.platformAdaptations.instagram;
      expect(instagramAdaptation).toBeDefined();
      // Instagram allows up to 30 hashtags
      const hashtags = instagramAdaptation.hashtags?.split(" ") || [];
      expect(hashtags.length).toBeLessThanOrEqual(30);
    });

    it("should apply Twitter-specific character limits", async () => {
      const longTitle = "A".repeat(500); // Longer than Twitter's 280 limit
      
      const input = {
        userId: 1,
        title: longTitle,
        mediaType: "text" as const,
        targetPlatforms: ["twitter" as const],
        publishStrategy: "draft" as const,
        optimizationLevel: "basic" as const,
        generateThumbnail: false,
        generateAd: false,
        runViralAnalysis: false,
      };

      const result = await orchestrateContent(input);

      const twitterAdaptation = result.platformAdaptations.twitter;
      expect(twitterAdaptation).toBeDefined();
      expect(twitterAdaptation.title.length).toBeLessThanOrEqual(280);
    });
  });

  describe("Optimization Levels", () => {
    it("should skip optimization when level is none", async () => {
      const input = {
        userId: 1,
        title: "No Optimization Test",
        mediaType: "video" as const,
        targetPlatforms: ["youtube" as const],
        publishStrategy: "draft" as const,
        optimizationLevel: "none" as const,
        generateThumbnail: false,
        generateAd: false,
        runViralAnalysis: false,
      };

      const result = await orchestrateContent(input);

      expect(result.viralAnalysis).toBeUndefined();
      expect(result.generatedAssets.thumbnails.length).toBe(0);
    });

    it("should run basic optimization", async () => {
      const input = {
        userId: 1,
        title: "Basic Optimization Test",
        mediaType: "video" as const,
        targetPlatforms: ["youtube" as const],
        publishStrategy: "draft" as const,
        optimizationLevel: "basic" as const,
        generateThumbnail: false,
        generateAd: false,
        runViralAnalysis: true,
      };

      const result = await orchestrateContent(input);

      expect(result.viralAnalysis).toBeDefined();
    });

    it("should run aggressive optimization", async () => {
      const input = {
        userId: 1,
        title: "Aggressive Optimization Test",
        mediaType: "video" as const,
        targetPlatforms: ["youtube" as const],
        publishStrategy: "draft" as const,
        optimizationLevel: "aggressive" as const,
        generateThumbnail: true,
        generateAd: true,
        runViralAnalysis: true,
      };

      const result = await orchestrateContent(input);

      expect(result.viralAnalysis).toBeDefined();
      expect(result.generatedAssets.thumbnails.length).toBeGreaterThan(0);
    });
  });
});
