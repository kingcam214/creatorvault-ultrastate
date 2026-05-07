/**
 * 💰 VAULTPAY TESTS
 */

import { describe, it, expect } from "vitest";
import * as vaultPay from "./vaultPay";

describe("VaultPay Service", () => {
  describe("calculateVaultLiveProjection", () => {
    it("should calculate correct revenue splits for 85/15", () => {
      const result = vaultPay.calculateVaultLiveProjection({
        followers: 1000,
        avgTipPerViewer: 5,
        avgViewersPerStream: 50,
        streamsPerWeek: 3
      });

      expect(result.splitPercentage).toBe(85);
      expect(result.weeklyRevenue).toBe(750); // 50 * 5 * 3
      expect(result.creatorAmount).toBeCloseTo(result.monthlyRevenue * 0.85, 2);
      expect(result.platformAmount).toBeCloseTo(result.monthlyRevenue * 0.15, 2);
    });

    it("should use default values when not provided", () => {
      const result = vaultPay.calculateVaultLiveProjection({
        followers: 1000
      });

      expect(result.avgTipPerViewer).toBe(5);
      expect(result.streamsPerWeek).toBe(3);
      expect(result.avgViewersPerStream).toBe(50); // 5% of 1000
    });
  });

  describe("calculateTriLayerProjection", () => {
    it("should calculate correct 70/20/10 split", () => {
      const result = vaultPay.calculateTriLayerProjection({
        followers: 1000,
        avgSaleAmount: 50,
        conversionRate: 0.02
      });

      expect(result.splitPercentage).toBe(70);
      const monthlyRevenue = 1000 * 0.02 * 50; // 1000
      expect(result.monthlyRevenue).toBe(monthlyRevenue);
      expect(result.creatorAmount).toBe(monthlyRevenue * 0.70);
      expect(result.recruiterAmount).toBe(monthlyRevenue * 0.20);
      expect(result.platformAmount).toBe(monthlyRevenue * 0.10);
    });
  });

  describe("comparePlatforms", () => {
    it("should show VaultLive as best split", () => {
      const result = vaultPay.comparePlatforms({
        followers: 1000,
        avgTipPerViewer: 5,
        streamsPerWeek: 3
      });

      const vaultLive = result.find(p => p.platform === "VaultLive");
      expect(vaultLive).toBeDefined();
      expect(vaultLive!.split).toBe(85);
      expect(vaultLive!.difference).toBe(0);

      // Most competitors should have positive difference (VaultLive earns more)
      // Except Patreon (88%) which is better than VaultLive (85%)
      const patreon = result.find(p => p.platform === "Patreon");
      expect(patreon!.difference).toBeLessThan(0); // Patreon is better
      
      const twitch = result.find(p => p.platform === "Twitch");
      expect(twitch!.difference).toBeGreaterThan(0); // VaultLive is better
    });
  });

  describe("projectGrowth", () => {
    it("should project conservative growth correctly", () => {
      const result = vaultPay.projectGrowth({
        currentFollowers: 1000,
        currentMonthlyRevenue: 1000,
        scenario: "conservative",
        timeframe: "6months"
      });

      expect(result.projectedFollowers).toBeGreaterThan(result.currentFollowers);
      expect(result.projectedMonthlyRevenue).toBeGreaterThan(result.currentMonthlyRevenue);
      expect(result.growthRate).toBeGreaterThan(0);
    });

    it("should show aggressive growth > moderate > conservative", () => {
      const conservative = vaultPay.projectGrowth({
        currentFollowers: 1000,
        currentMonthlyRevenue: 1000,
        scenario: "conservative",
        timeframe: "12months"
      });

      const moderate = vaultPay.projectGrowth({
        currentFollowers: 1000,
        currentMonthlyRevenue: 1000,
        scenario: "moderate",
        timeframe: "12months"
      });

      const aggressive = vaultPay.projectGrowth({
        currentFollowers: 1000,
        currentMonthlyRevenue: 1000,
        scenario: "aggressive",
        timeframe: "12months"
      });

      expect(aggressive.projectedMonthlyRevenue).toBeGreaterThan(moderate.projectedMonthlyRevenue);
      expect(moderate.projectedMonthlyRevenue).toBeGreaterThan(conservative.projectedMonthlyRevenue);
    });
  });

  describe("calculateCommissionSplit", () => {
    it("should split correctly with recruiter", () => {
      const result = vaultPay.calculateCommissionSplit({
        totalAmount: 1000,
        creatorPercentage: 70,
        recruiterPercentage: 20
      });

      expect(result.total).toBe(1000);
      expect(result.creator).toBe(700);
      expect(result.recruiter).toBe(200);
      expect(result.platform).toBe(100);
    });

    it("should split correctly without recruiter", () => {
      const result = vaultPay.calculateCommissionSplit({
        totalAmount: 1000,
        creatorPercentage: 85
      });

      expect(result.total).toBe(1000);
      expect(result.creator).toBe(850);
      expect(result.recruiter).toBeUndefined();
      expect(result.platform).toBe(150);
    });
  });

  describe("estimateTaxes", () => {
    it("should calculate taxes for single filer", () => {
      const result = vaultPay.estimateTaxes({
        annualRevenue: 50000,
        filingStatus: "single",
        state: "TX"
      });

      expect(result.grossRevenue).toBe(50000);
      expect(result.federalTax).toBeGreaterThan(0);
      expect(result.selfEmploymentTax).toBeGreaterThan(0);
      expect(result.stateTax).toBeGreaterThan(0); // Uses default 5% rate
      expect(result.netRevenue).toBeLessThan(result.grossRevenue);
      expect(result.effectiveRate).toBeGreaterThan(0);
    });
  });

  describe("calculatePayoutSchedule", () => {
    it("should calculate weekly payouts correctly", () => {
      const result = vaultPay.calculatePayoutSchedule({
        monthlyRevenue: 1000,
        payoutFrequency: "weekly",
        creatorPercentage: 85
      });

      expect(result.frequency).toBe("weekly");
      expect(result.payoutsPerMonth).toBeCloseTo(4.33, 2);
      expect(result.amountPerPayout).toBeCloseTo(850 / 4.33, 2);
    });

    it("should calculate monthly payouts correctly", () => {
      const result = vaultPay.calculatePayoutSchedule({
        monthlyRevenue: 1000,
        payoutFrequency: "monthly",
        creatorPercentage: 85
      });

      expect(result.frequency).toBe("monthly");
      expect(result.payoutsPerMonth).toBe(1);
      expect(result.amountPerPayout).toBe(850);
    });
  });

  describe("calculateBreakEven", () => {
    it("should calculate followers needed to break even", () => {
      const result = vaultPay.calculateBreakEven({
        monthlyExpenses: 2000,
        avgRevenuePerFollower: 2
      });

      expect(result.followersNeeded).toBe(1000);
      expect(result.monthlyRevenueNeeded).toBe(2000);
      expect(result.estimatedTimeToBreakEven).toContain("months");
    });
  });
});
