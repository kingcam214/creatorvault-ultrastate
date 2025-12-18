/**
 * Owner Control Panel tRPC Router
 * 
 * CONTROL GAP DIRECTIVE: Centralized control for ALL system operations.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAllDeployments,
  getAllBots,
  getAllChannels,
  getAllLinks,
  getSystemLogs,
  getDatabaseHealth,
  toggleBot,
  toggleBroadcast,
  getSystemStats,
  getRoleGovernance,
} from "../services/systemRegistry";

// Owner-only middleware
const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "king" && ctx.user.role !== "admin") {
    throw new TRPCError({ 
      code: "FORBIDDEN", 
      message: "Owner/Admin access required" 
    });
  }
  return next({ ctx });
});

export const ownerControlRouter = router({
  /**
   * Get all deployments
   */
  getDeployments: ownerProcedure.query(async () => {
    return await getAllDeployments();
  }),

  /**
   * Get all bots
   */
  getBots: ownerProcedure.query(async () => {
    return await getAllBots();
  }),

  /**
   * Get all channels
   */
  getChannels: ownerProcedure.query(async () => {
    return await getAllChannels();
  }),

  /**
   * Get all links
   */
  getLinks: ownerProcedure.query(async () => {
    return await getAllLinks();
  }),

  /**
   * Get system logs
   */
  getLogs: ownerProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(500).default(100),
      })
    )
    .query(async ({ input }) => {
      return await getSystemLogs(input.limit);
    }),

  /**
   * Get database health
   */
  getDatabaseHealth: ownerProcedure.query(async () => {
    return await getDatabaseHealth();
  }),

  /**
   * Toggle bot enabled/disabled
   */
  toggleBot: ownerProcedure
    .input(
      z.object({
        botId: z.string(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      return await toggleBot(input.botId, input.enabled);
    }),

  /**
   * Toggle broadcast enabled/disabled
   */
  toggleBroadcast: ownerProcedure
    .input(
      z.object({
        botId: z.string(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      return await toggleBroadcast(input.botId, input.enabled);
    }),

  /**
   * Get system stats
   */
  getStats: ownerProcedure.query(async () => {
    return await getSystemStats();
  }),

  /**
   * Get role governance stats
   */
  getRoleGovernance: ownerProcedure.query(async () => {
    return await getRoleGovernance();
  }),
});
