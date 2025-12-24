/**
 * 💰 VAULTPAY ROUTER
 * 
 * Revenue simulation and projection tools for creators
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as vaultPayService from "../services/vaultPay";

export const vaultPayRouter = router({
  /**
   * Calculate VaultLive revenue projection
   */
  calculateVaultLiveProjection: publicProcedure
    .input(z.object({
      followers: z.number().min(0),
      avgTipPerViewer: z.number().min(0).optional(),
      avgViewersPerStream: z.number().min(0).optional(),
      streamsPerWeek: z.number().min(0).optional()
    }))
    .query(({ input }) => {
      return vaultPayService.calculateVaultLiveProjection(input);
    }),

  /**
   * Calculate TriLayer revenue projection
   */
  calculateTriLayerProjection: publicProcedure
    .input(z.object({
      followers: z.number().min(0),
      avgSaleAmount: z.number().min(0).optional(),
      conversionRate: z.number().min(0).max(1).optional()
    }))
    .query(({ input }) => {
      return vaultPayService.calculateTriLayerProjection(input);
    }),

  /**
   * Compare VaultLive vs competitors
   */
  comparePlatforms: publicProcedure
    .input(z.object({
      followers: z.number().min(0),
      avgTipPerViewer: z.number().min(0).optional(),
      avgViewersPerStream: z.number().min(0).optional(),
      streamsPerWeek: z.number().min(0).optional()
    }))
    .query(({ input }) => {
      return vaultPayService.comparePlatforms(input);
    }),

  /**
   * Project growth scenarios
   */
  projectGrowth: publicProcedure
    .input(z.object({
      currentFollowers: z.number().min(0),
      currentMonthlyRevenue: z.number().min(0),
      scenario: z.enum(["conservative", "moderate", "aggressive"]),
      timeframe: z.enum(["3months", "6months", "12months"])
    }))
    .query(({ input }) => {
      return vaultPayService.projectGrowth(input);
    }),

  /**
   * Calculate commission split
   */
  calculateCommissionSplit: publicProcedure
    .input(z.object({
      totalAmount: z.number().min(0),
      creatorPercentage: z.number().min(0).max(100),
      recruiterPercentage: z.number().min(0).max(100).optional()
    }))
    .query(({ input }) => {
      return vaultPayService.calculateCommissionSplit(input);
    }),

  /**
   * Estimate taxes (US creators)
   */
  estimateTaxes: protectedProcedure
    .input(z.object({
      annualRevenue: z.number().min(0),
      filingStatus: z.enum(["single", "married", "head_of_household"]),
      state: z.string().length(2).optional()
    }))
    .query(({ input }) => {
      return vaultPayService.estimateTaxes(input);
    }),

  /**
   * Calculate payout schedule
   */
  calculatePayoutSchedule: publicProcedure
    .input(z.object({
      monthlyRevenue: z.number().min(0),
      payoutFrequency: z.enum(["weekly", "biweekly", "monthly"]),
      creatorPercentage: z.number().min(0).max(100)
    }))
    .query(({ input }) => {
      return vaultPayService.calculatePayoutSchedule(input);
    }),

  /**
   * Calculate break-even point
   */
  calculateBreakEven: protectedProcedure
    .input(z.object({
      monthlyExpenses: z.number().min(0),
      avgRevenuePerFollower: z.number().min(0)
    }))
    .query(({ input }) => {
      return vaultPayService.calculateBreakEven(input);
    })
});
