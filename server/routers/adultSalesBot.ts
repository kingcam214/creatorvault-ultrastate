/**
 * Adult Sales Bot tRPC Router
 * 
 * Provides API endpoints for Adult Sales Bot with safety guardrails.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  handleInboundMessage,
  getConversationHistory,
  blacklistUser,
} from "../services/adultSalesBot";

export const adultSalesBotRouter = router({
  /**
   * Handle inbound message from buyer
   */
  handleInboundMessage: protectedProcedure
    .input(
      z.object({
        creatorId: z.number(),
        channel: z.enum(["telegram", "whatsapp", "instagram_dm"]),
        message: z.string(),
        chatId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await handleInboundMessage(
        ctx.user.id,
        input.creatorId,
        input.channel,
        input.message,
        input.chatId
      );
    }),

  /**
   * Get conversation history for a user
   */
  getConversationHistory: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        creatorId: z.number(),
        channel: z.enum(["telegram", "whatsapp", "instagram_dm"]),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      return await getConversationHistory(
        input.userId,
        input.creatorId,
        input.channel,
        input.limit
      );
    }),

  /**
   * Blacklist a user
   */
  blacklistUser: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        creatorId: z.number(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await blacklistUser(input.userId, input.creatorId, input.reason);
      return { success: true };
    }),

  /**
   * Get active conversations
   */
  getActiveConversations: protectedProcedure
    .input(
      z.object({
        creatorId: z.number(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      // This would query bot_events for recent conversations
      // For now, return empty array
      return [];
    }),

  /**
   * Get revenue stats
   */
  getRevenueStats: protectedProcedure
    .input(
      z.object({
        creatorId: z.number(),
      })
    )
    .query(async ({ input }) => {
      // This would aggregate revenue from bot conversations
      // For now, return mock data
      return {
        totalRevenue: 0,
        conversionsToday: 0,
        averageOrderValue: 0,
        activeConversations: 0,
      };
    }),
});
