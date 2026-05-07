import { describe, it, expect, beforeEach, vi } from "vitest";
import { formatContentForPlatform, validateMediaForPlatform } from "./platformPosting";

// Mock the database
vi.mock("../db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    $returningId: vi.fn().mockResolvedValue([{ id: "test-id" }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

describe("Platform Posting Service", () => {
  describe("Content Formatting", () => {
    it("should truncate caption for Twitter", () => {
      const longCaption = "a".repeat(300);
      const result = formatContentForPlatform("twitter", longCaption, "");
      expect(result.caption.length).toBeLessThanOrEqual(280);
    });

    it("should limit hashtags for Twitter", () => {
      const hashtags = "#one, #two, #three, #four, #five";
      const result = formatContentForPlatform("twitter", "", hashtags);
      const hashtagCount = result.hashtags.split(",").length;
      expect(hashtagCount).toBeLessThanOrEqual(2);
    });

    it("should allow more hashtags for Instagram", () => {
      const hashtags = Array.from({ length: 35 }, (_, i) => `#tag${i}`).join(", ");
      const result = formatContentForPlatform("instagram", "", hashtags);
      const hashtagCount = result.hashtags.split(",").length;
      expect(hashtagCount).toBeLessThanOrEqual(30);
    });

    it("should not truncate short captions", () => {
      const caption = "Short caption";
      const result = formatContentForPlatform("instagram", caption, "");
      expect(result.caption).toBe(caption);
    });
  });

  describe("Media Validation", () => {
    it("should reject video content without media", () => {
      const result = validateMediaForPlatform("tiktok", "video", undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("requires media");
    });

    it("should allow text posts without media", () => {
      const result = validateMediaForPlatform("twitter", "text", undefined);
      expect(result.valid).toBe(true);
    });

    it("should reject multiple videos for TikTok", () => {
      const result = validateMediaForPlatform("tiktok", "video", ["url1", "url2"]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("max 1 video");
    });

    it("should allow multiple images for Instagram carousel", () => {
      const result = validateMediaForPlatform("instagram", "carousel", ["url1", "url2", "url3"]);
      expect(result.valid).toBe(true);
    });

    it("should reject too many images for Twitter", () => {
      const result = validateMediaForPlatform("twitter", "image", ["url1", "url2", "url3", "url4", "url5"]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("max 4 image");
    });
  });
});
