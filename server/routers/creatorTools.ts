/**
 * Creator Tools tRPC Router
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  generateViralHooks,
  generateCaption,
  generateTelegramBroadcast,
  generateWhatsAppCampaign,
  generateContentStrategy,
  analyzeViralPotential,
} from "../services/creatorTools";
import { runViralOptimizer } from "../services/viralOptimizer";

export const creatorToolsRouter = router({
  /**
   * Generate viral hooks
   */
  generateViralHooks: protectedProcedure
    .input(
      z.object({
        niche: z.string(),
        platform: z.enum(["tiktok", "instagram", "youtube", "twitter"]),
        tone: z.enum(["casual", "professional", "humorous", "inspiring"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const hooks = await generateViralHooks(input);
      return { hooks };
    }),

  /**
   * Generate caption + CTA
   */
  generateCaption: protectedProcedure
    .input(
      z.object({
        content: z.string(),
        platform: z.enum(["tiktok", "instagram", "youtube", "twitter"]),
        includeHashtags: z.boolean().optional(),
        includeCTA: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const caption = await generateCaption(input);
      return { caption };
    }),

  /**
   * Generate Telegram broadcast
   */
  generateTelegramBroadcast: protectedProcedure
    .input(
      z.object({
        audience: z.string(),
        message: z.string(),
        tone: z.enum(["casual", "professional", "urgent"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const broadcast = await generateTelegramBroadcast({
        channel: "telegram",
        ...input,
      });
      return { broadcast };
    }),

  /**
   * Generate WhatsApp campaign
   */
  generateWhatsAppCampaign: protectedProcedure
    .input(
      z.object({
        audience: z.string(),
        message: z.string(),
        tone: z.enum(["casual", "professional", "urgent"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const campaign = await generateWhatsAppCampaign({
        channel: "whatsapp",
        ...input,
      });
      return { campaign };
    }),

  /**
   * Generate content strategy
   */
  generateContentStrategy: protectedProcedure
    .input(
      z.object({
        niche: z.string(),
        goals: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const strategy = await generateContentStrategy(input.niche, input.goals);
      return { strategy };
    }),

  /**
   * Analyze viral potential
   */
  analyzeViralPotential: protectedProcedure
    .input(
      z.object({
        content: z.string(),
        platform: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const analysis = await analyzeViralPotential(input.content, input.platform);
      return analysis;
    }),

  /**
   * Run Viral Optimizer (CANONICAL PIPELINE)
   */
  runViralOptimizer: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        duration: z.number().optional(),
        platform: z.enum(["youtube", "tiktok", "instagram", "twitter"]),
        contentType: z.enum(["video", "image", "text"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await runViralOptimizer({
        userId: ctx.user.id,
        ...input,
      });
      return result;
    }),
});
