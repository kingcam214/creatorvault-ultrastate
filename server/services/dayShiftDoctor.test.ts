/**
 * 💃 DAYSHIFT DOCTOR TESTS
 */

import { describe, it, expect } from "vitest";
import * as dayShift from "./dayShiftDoctor";

describe("DayShift Doctor Service", () => {
  describe("DALLAS_CLUBS", () => {
    it("should have 4 Dallas clubs", () => {
      expect(dayShift.DALLAS_CLUBS).toHaveLength(4);
    });

    it("should include Diamond Girls, Baby Dolls, Onyx, Bucks", () => {
      const clubNames = dayShift.DALLAS_CLUBS.map(c => c.name);
      expect(clubNames).toContain("Diamond Girls");
      expect(clubNames).toContain("Baby Dolls");
      expect(clubNames).toContain("Onyx Cabaret");
      expect(clubNames).toContain("Bucks Cabaret");
    });

    it("should have all clubs with 10% commission rate", () => {
      dayShift.DALLAS_CLUBS.forEach(club => {
        expect(club.commissionRate).toBe(10);
      });
    });
  });

  describe("calculateShiftSplit", () => {
    it("should split 85/10/5 correctly", () => {
      const result = dayShift.calculateShiftSplit({
        totalRevenue: 1000,
        clubCommissionRate: 10,
        platformCommissionRate: 5
      });

      expect(result.total).toBe(1000);
      expect(result.dancer).toBe(850); // 85%
      expect(result.club).toBe(100); // 10%
      expect(result.platform).toBe(50); // 5%
    });

    it("should use default 5% platform rate", () => {
      const result = dayShift.calculateShiftSplit({
        totalRevenue: 1000,
        clubCommissionRate: 10
      });

      expect(result.platform).toBe(50);
    });
  });

  describe("calculateVipSplit", () => {
    it("should combine room fee and tip", () => {
      const result = dayShift.calculateVipSplit({
        roomFee: 200,
        tipAmount: 100,
        clubCommissionRate: 10
      });

      expect(result.total).toBe(300);
      expect(result.dancer).toBe(255); // 85% of 300
      expect(result.club).toBe(30); // 10% of 300
      expect(result.platform).toBe(15); // 5% of 300
    });
  });

  describe("projectDancerRevenue", () => {
    it("should calculate weekly/monthly/yearly correctly", () => {
      const result = dayShift.projectDancerRevenue({
        avgRevenuePerShift: 500,
        shiftsPerWeek: 4,
        clubCommissionRate: 10
      });

      expect(result.weeklyRevenue).toBe(2000); // 500 * 4
      expect(result.monthlyRevenue).toBeCloseTo(2000 * 4.33, 2);
      expect(result.yearlyRevenue).toBeCloseTo(result.monthlyRevenue * 12, 2);

      // Dancer keeps 85%
      expect(result.weeklyDancerAmount).toBe(1700); // 2000 * 0.85
      expect(result.monthlyDancerAmount).toBeCloseTo(1700 * 4.33, 2);
    });
  });

  describe("calculateClubRevenue", () => {
    it("should calculate club and platform revenue", () => {
      const result = dayShift.calculateClubRevenue({
        avgDancerCount: 30,
        avgRevenuePerDancer: 500,
        shiftsPerWeek: 4,
        clubCommissionRate: 10
      });

      const weeklyTotal = 30 * 500 * 4; // 60,000
      expect(result.weeklyClubRevenue).toBe(6000); // 10% of 60,000
      expect(result.weeklyPlatformRevenue).toBe(3000); // 5% of 60,000
    });
  });

  describe("optimizeShiftSchedule", () => {
    it("should prioritize busiest days", () => {
      const result = dayShift.optimizeShiftSchedule({
        dancerAvailability: ["monday", "tuesday", "friday", "saturday"],
        clubBusiestDays: ["friday", "saturday"],
        targetShiftsPerWeek: 3
      });

      expect(result.recommendedDays).toContain("friday");
      expect(result.recommendedDays).toContain("saturday");
      expect(result.recommendedDays).toHaveLength(3);
    });

    it("should handle no overlap with busiest days", () => {
      const result = dayShift.optimizeShiftSchedule({
        dancerAvailability: ["monday", "tuesday"],
        clubBusiestDays: ["friday", "saturday"],
        targetShiftsPerWeek: 2
      });

      expect(result.recommendedDays).toHaveLength(2);
      expect(result.reason).toContain("No overlap");
    });
  });

  describe("calculateDancerBreakEven", () => {
    it("should calculate shifts needed to break even", () => {
      const result = dayShift.calculateDancerBreakEven({
        monthlyExpenses: 3000,
        avgRevenuePerShift: 500,
        clubCommissionRate: 10
      });

      // Dancer keeps 85% of 500 = 425 per shift
      // 3000 / 425 = ~7.06 shifts
      expect(result.shiftsNeededPerMonth).toBe(8); // Rounded up
      expect(result.shiftsNeededPerWeek).toBeGreaterThan(0);
      expect(result.monthlyRevenueNeeded).toBeGreaterThan(3000);
    });
  });
});
