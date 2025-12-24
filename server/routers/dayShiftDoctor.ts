/**
 * 💃 DAYSHIFT DOCTOR ROUTER
 * 
 * Strip club partnerships and dancer monetization
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as dayShiftService from "../services/dayShiftDoctor";

export const dayShiftDoctorRouter = router({
  /**
   * Get Dallas clubs list
   */
  getDallasClubs: publicProcedure.query(() => {
    return dayShiftService.DALLAS_CLUBS;
  }),

  /**
   * Calculate shift revenue split
   */
  calculateShiftSplit: publicProcedure
    .input(z.object({
      totalRevenue: z.number().min(0),
      clubCommissionRate: z.number().min(0).max(100),
      platformCommissionRate: z.number().min(0).max(100).optional()
    }))
    .query(({ input }) => {
      return dayShiftService.calculateShiftSplit(input);
    }),

  /**
   * Calculate VIP room split
   */
  calculateVipSplit: publicProcedure
    .input(z.object({
      roomFee: z.number().min(0),
      tipAmount: z.number().min(0),
      clubCommissionRate: z.number().min(0).max(100),
      platformCommissionRate: z.number().min(0).max(100).optional()
    }))
    .query(({ input }) => {
      return dayShiftService.calculateVipSplit(input);
    }),

  /**
   * Project dancer monthly revenue
   */
  projectDancerRevenue: publicProcedure
    .input(z.object({
      avgRevenuePerShift: z.number().min(0),
      shiftsPerWeek: z.number().min(0),
      clubCommissionRate: z.number().min(0).max(100),
      platformCommissionRate: z.number().min(0).max(100).optional()
    }))
    .query(({ input }) => {
      return dayShiftService.projectDancerRevenue(input);
    }),

  /**
   * Calculate club partnership revenue
   */
  calculateClubRevenue: publicProcedure
    .input(z.object({
      avgDancerCount: z.number().min(0),
      avgRevenuePerDancer: z.number().min(0),
      shiftsPerWeek: z.number().min(0),
      clubCommissionRate: z.number().min(0).max(100),
      platformCommissionRate: z.number().min(0).max(100).optional()
    }))
    .query(({ input }) => {
      return dayShiftService.calculateClubRevenue(input);
    }),

  /**
   * Optimize shift schedule
   */
  optimizeShiftSchedule: protectedProcedure
    .input(z.object({
      dancerAvailability: z.array(z.string()),
      clubBusiestDays: z.array(z.string()),
      targetShiftsPerWeek: z.number().min(1).max(7)
    }))
    .query(({ input }) => {
      return dayShiftService.optimizeShiftSchedule(input);
    }),

  /**
   * Calculate dancer break-even point
   */
  calculateDancerBreakEven: protectedProcedure
    .input(z.object({
      monthlyExpenses: z.number().min(0),
      avgRevenuePerShift: z.number().min(0),
      clubCommissionRate: z.number().min(0).max(100),
      platformCommissionRate: z.number().min(0).max(100).optional()
    }))
    .query(({ input }) => {
      return dayShiftService.calculateDancerBreakEven(input);
    })
});
