/**
 * Command Hub tRPC Router
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  executeCreateProduct,
  executeCreateCourse,
  executeCreateService,
  executeTelegramBroadcast,
  executeWhatsAppCampaign,
  executeViralAnalysis,
  getCommandHistory,
  getCommandStats,
} from "../services/commandHub";

export const commandHubRouter = router({
  /**
   * Create marketplace product
   */
  createProduct: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(2000),
        price: z.number().min(0),
        type: z.enum(["digital", "service", "bundle", "subscription"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await executeCreateProduct({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * Create university course
   */
  createCourse: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(2000),
        price: z.number().min(0),
        isFree: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await executeCreateCourse({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * Create service offer
   */
  createService: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(2000),
        price: z.number().min(0),
        tier: z.enum(["low", "mid", "high"]),
        deliveryDays: z.number().min(1).max(90),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await executeCreateService({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * Send Telegram broadcast
   */
  sendTelegramBroadcast: protectedProcedure
    .input(
      z.object({
        botId: z.string(),
        message: z.string().min(1).max(4000),
        targetCount: z.number().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await executeTelegramBroadcast({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * Send WhatsApp campaign
   */
  sendWhatsAppCampaign: protectedProcedure
    .input(
      z.object({
        providerId: z.string(),
        message: z.string().min(1).max(1600),
        targetCount: z.number().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await executeWhatsAppCampaign({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * Run viral analysis
   */
  runViralAnalysis: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(2000),
        platform: z.string(),
        duration: z.number().optional(),
        tags: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await executeViralAnalysis({
        userId: ctx.user.id,
        ...input,
      });
    }),

  /**
   * Get command history
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getCommandHistory(ctx.user.id, input.limit);
    }),

  /**
   * Get command stats
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    return await getCommandStats(ctx.user.id);
  }),
});
