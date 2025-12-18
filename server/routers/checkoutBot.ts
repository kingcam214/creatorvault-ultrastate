/**
 * Checkout Bot tRPC Router
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  generateCatalog,
  formatCatalogForTelegram,
  formatCatalogForWhatsApp,
  createCheckoutSession,
  processPayment,
} from "../services/checkoutBot";

export const checkoutBotRouter = router({
  /**
   * Get product catalog
   */
  getCatalog: publicProcedure
    .input(
      z.object({
        type: z.enum(["product", "course", "service"]).optional(),
        creatorId: z.number().optional(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      return await generateCatalog(input);
    }),

  /**
   * Format catalog for Telegram
   */
  formatForTelegram: publicProcedure
    .input(
      z.object({
        type: z.enum(["product", "course", "service"]).optional(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      const catalog = await generateCatalog(input);
      return {
        message: formatCatalogForTelegram(catalog),
        catalog,
      };
    }),

  /**
   * Format catalog for WhatsApp
   */
  formatForWhatsApp: publicProcedure
    .input(
      z.object({
        type: z.enum(["product", "course", "service"]).optional(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      const catalog = await generateCatalog(input);
      return {
        message: formatCatalogForWhatsApp(catalog),
        catalog,
      };
    }),

  /**
   * Create checkout session
   */
  createCheckout: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        itemType: z.enum(["product", "course", "service"]),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await createCheckoutSession({
        ...input,
        buyerId: ctx.user.id,
      });
    }),

  /**
   * Process payment (called by webhook)
   */
  processPayment: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        itemId: z.string(),
        itemType: z.enum(["product", "course", "service"]),
        buyerId: z.number(),
        creatorId: z.number(),
        recruiterId: z.number().optional(),
        amount: z.number(), // in cents
      })
    )
    .mutation(async ({ input }) => {
      return await processPayment(input);
    }),
});
