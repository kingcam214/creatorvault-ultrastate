/**
 * VaultLive Backend Tests
 * 
 * Tests for live streaming system:
 * - Stream management (create, start, end)
 * - Viewer tracking
 * - Tips and donations with 85/15 revenue split
 * - Analytics
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as dbVaultLive from "./db-vaultlive";

describe("VaultLive Backend", () => {
  let testUserId: number;
  let testStreamId: number;
  let testViewerId: number;

  beforeAll(async () => {
    testUserId = 1; // Assuming user ID 1 exists
    
    // Create a test stream for all tests
    const stream = await dbVaultLive.createStream({
      userId: testUserId,
      title: "Test Live Stream",
      description: "This is a test stream",
      thumbnailUrl: "https://example.com/thumb.jpg",
    });
    
    testStreamId = stream.id;
  });

  describe("Stream Management", () => {
    it("should have created a stream in beforeAll", async () => {
      const stream = await dbVaultLive.getStreamById(testStreamId);

      expect(stream).toBeDefined();
      expect(stream!.id).toBe(testStreamId);
      expect(stream!.userId).toBe(testUserId);
      expect(stream!.title).toBe("Test Live Stream");
      expect(stream!.status).toBe("pending");
      expect(stream!.viewerCount).toBe(0);
      expect(stream!.totalTips).toBe("0.00");
    });

    it("should get stream by ID", async () => {
      const stream = await dbVaultLive.getStreamById(testStreamId);

      expect(stream).toBeDefined();
      expect(stream!.id).toBe(testStreamId);
      expect(stream!.title).toBe("Test Live Stream");
    });

    it("should start a stream", async () => {
      await dbVaultLive.startStream(testStreamId);

      const stream = await dbVaultLive.getStreamById(testStreamId);
      expect(stream!.status).toBe("live");
      expect(stream!.startedAt).toBeDefined();
    });

    it("should get all live streams", async () => {
      const liveStreams = await dbVaultLive.getLiveStreams();

      expect(liveStreams).toBeDefined();
      expect(Array.isArray(liveStreams)).toBe(true);
      expect(liveStreams.length).toBeGreaterThan(0);
      expect(liveStreams[0].status).toBe("live");
    });

    it("should update viewer count", async () => {
      await dbVaultLive.updateViewerCount(testStreamId, 10);

      const stream = await dbVaultLive.getStreamById(testStreamId);
      expect(stream!.viewerCount).toBe(10);
      expect(stream!.peakViewerCount).toBe(10);
    });

    it("should track peak viewer count", async () => {
      await dbVaultLive.updateViewerCount(testStreamId, 5);

      const stream = await dbVaultLive.getStreamById(testStreamId);
      expect(stream!.viewerCount).toBe(5);
      expect(stream!.peakViewerCount).toBe(10); // Should remain 10
    });
  });

  describe("Viewer Tracking", () => {
    it("should record viewer joining", async () => {
      const viewerId = await dbVaultLive.recordViewerJoin(testStreamId, testUserId);

      expect(viewerId).toBeGreaterThan(0);
      testViewerId = viewerId;
    });

    it("should get current viewer count", async () => {
      const count = await dbVaultLive.getCurrentViewerCount(testStreamId);

      expect(count).toBeGreaterThan(0);
    });

    it("should record viewer leaving", async () => {
      await dbVaultLive.recordViewerLeave(testViewerId, 120); // 2 minutes

      const viewers = await dbVaultLive.getStreamViewers(testStreamId);
      const viewer = viewers.find(v => v.id === testViewerId);

      expect(viewer).toBeDefined();
      expect(viewer!.leftAt).toBeDefined();
      expect(viewer!.watchDuration).toBe(120);
    });

    it("should get all stream viewers", async () => {
      const viewers = await dbVaultLive.getStreamViewers(testStreamId);

      expect(viewers).toBeDefined();
      expect(Array.isArray(viewers)).toBe(true);
      expect(viewers.length).toBeGreaterThan(0);
    });
  });

  describe("Tips and Donations", () => {
    it("should record a tip with 85/15 split", async () => {
      const tip = await dbVaultLive.recordTip(
        testStreamId,
        testUserId,
        100, // $100 tip
        "Great stream!"
      );

      expect(tip).toBeDefined();
      expect(tip.amount).toBe("100.00");
      expect(tip.creatorShare).toBe("85.00"); // 85%
      expect(tip.platformShare).toBe("15.00"); // 15%
      expect(tip.message).toBe("Great stream!");
    });

    it("should update stream total tips", async () => {
      const stream = await dbVaultLive.getStreamById(testStreamId);

      expect(parseFloat(stream!.totalTips)).toBeGreaterThan(0);
    });

    it("should get stream tips", async () => {
      const tips = await dbVaultLive.getStreamTips(testStreamId);

      expect(tips).toBeDefined();
      expect(Array.isArray(tips)).toBe(true);
      expect(tips.length).toBeGreaterThan(0);
    });

    it("should record a donation with 85/15 split", async () => {
      const donation = await dbVaultLive.recordDonation(
        testStreamId,
        testUserId,
        50, // $50 donation
        "cashapp",
        "Keep up the good work!"
      );

      expect(donation).toBeDefined();
      expect(donation.amount).toBe("50.00");
      expect(donation.creatorShare).toBe("42.50"); // 85%
      expect(donation.platformShare).toBe("7.50"); // 15%
      expect(donation.paymentMethod).toBe("cashapp");
      expect(donation.paymentStatus).toBe("pending");
    });

    it("should update donation status", async () => {
      const donations = await dbVaultLive.getStreamDonations(testStreamId);
      const donation = donations[0];

      await dbVaultLive.updateDonationStatus(donation.id, "completed");

      const updatedDonations = await dbVaultLive.getStreamDonations(testStreamId);
      const updatedDonation = updatedDonations.find(d => d.id === donation.id);

      expect(updatedDonation!.paymentStatus).toBe("completed");
    });

    it("should get donations for a stream", async () => {
      const donations = await dbVaultLive.getStreamDonations(testStreamId);

      expect(donations).toBeDefined();
      expect(Array.isArray(donations)).toBe(true);
      expect(donations.length).toBeGreaterThan(0);
    });
  });

  describe("Analytics", () => {
    it("should get stream statistics", async () => {
      const stats = await dbVaultLive.getStreamStats(testUserId);

      expect(stats).toBeDefined();
      expect(stats.totalStreams).toBeGreaterThan(0);
      expect(parseFloat(stats.totalTips)).toBeGreaterThan(0);
      expect(stats.peakViewerCount).toBeGreaterThan(0);
    });
  });

  describe("Revenue Split Verification", () => {
    it("should enforce 85% creator / 15% platform split for tips", async () => {
      const testAmounts = [10, 25, 50];

      for (const amount of testAmounts) {
        const tip = await dbVaultLive.recordTip(testStreamId, testUserId, amount);

        const expectedCreatorShare = (amount * 0.85).toFixed(2);
        const expectedPlatformShare = (amount * 0.15).toFixed(2);

        expect(tip.creatorShare).toBe(expectedCreatorShare);
        expect(tip.platformShare).toBe(expectedPlatformShare);
      }
    });

    it("should enforce 85% creator / 15% platform split for donations", async () => {
      const testAmounts = [10, 25, 50];

      for (const amount of testAmounts) {
        const donation = await dbVaultLive.recordDonation(
          testStreamId,
          testUserId,
          amount,
          "cashapp"
        );

        const expectedCreatorShare = (amount * 0.85).toFixed(2);
        const expectedPlatformShare = (amount * 0.15).toFixed(2);

        expect(donation.creatorShare).toBe(expectedCreatorShare);
        expect(donation.platformShare).toBe(expectedPlatformShare);
      }
    });
  });

  describe("Stream Lifecycle", () => {
    it("should end a stream", async () => {
      await dbVaultLive.endStream(testStreamId);

      const stream = await dbVaultLive.getStreamById(testStreamId);
      expect(stream!.status).toBe("ended");
      expect(stream!.endedAt).toBeDefined();
    });
  });
});
