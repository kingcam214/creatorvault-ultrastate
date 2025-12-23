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
import { runAdOptimizer } from "../services/adOptimizer";
import { runThumbnailGenerator } from "../services/thumbnailGenerator";

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
   * Run Ad Optimizer (canonical pipeline)
   */
  runAdOptimizer: protectedProcedure
    .input(
      z.object({
        product: z.string(),
        targetAudience: z.string(),
        goal: z.enum(["awareness", "traffic", "conversions", "engagement"]),
        description: z.string().optional(),
        tone: z.enum(["casual", "professional", "urgent", "playful"]).optional(),
        budget: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await runAdOptimizer(ctx.user.id, input);
      return result;
    }),

  /**
   * Run Thumbnail Generator (canonical pipeline)
   */
  runThumbnailGenerator: protectedProcedure
    .input(
      z.object({
        videoTitle: z.string(),
        niche: z.string(),
        style: z.enum(["bold", "minimal", "dramatic", "playful"]).optional(),
        platform: z.string().optional(),
        customPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await runThumbnailGenerator(ctx.user.id, input);
      return result;
    }),

  /**
   * Get ad generation history
   */
  getAdHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(10),
        offset: z.number().min(0).optional().default(0),
        sortBy: z.enum(["createdAt", "overallScore", "product"]).optional().default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { getDb } = await import("../db");
      const { adAnalyses } = await import("../../drizzle/schema");
      const { desc, asc, eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      const orderCol = input.sortBy === "createdAt" ? adAnalyses.createdAt :
                       input.sortBy === "overallScore" ? adAnalyses.overallScore :
                       adAnalyses.product;
      const orderFn = input.sortOrder === "desc" ? desc : asc;
      
      const results = await db
        .select()
        .from(adAnalyses)
        .where(eq(adAnalyses.userId, ctx.user.id))
        .orderBy(orderFn(orderCol))
        .limit(input.limit)
        .offset(input.offset);
      
      return { analyses: results };
    }),

  /**
   * Get thumbnail generation history
   */
  getThumbnailHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(10),
        offset: z.number().min(0).optional().default(0),
        sortBy: z.enum(["createdAt", "overallScore", "videoTitle"]).optional().default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { getDb } = await import("../db");
      const { thumbnailAnalyses } = await import("../../drizzle/schema");
      const { desc, asc, eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      const orderCol = input.sortBy === "createdAt" ? thumbnailAnalyses.createdAt :
                       input.sortBy === "overallScore" ? thumbnailAnalyses.overallScore :
                       thumbnailAnalyses.videoTitle;
      const orderFn = input.sortOrder === "desc" ? desc : asc;
      
      const results = await db
        .select()
        .from(thumbnailAnalyses)
        .where(eq(thumbnailAnalyses.userId, ctx.user.id))
        .orderBy(orderFn(orderCol))
        .limit(input.limit)
        .offset(input.offset);
      
      return { analyses: results };
    }),

  /**
   * Batch generate ads from CSV data
   */
  batchGenerateAds: protectedProcedure
    .input(
      z.object({
        rows: z.array(
          z.object({
            product: z.string(),
            audience: z.string(),
            goal: z.enum(["awareness", "traffic", "conversions", "engagement"]),
            description: z.string().optional(),
            tone: z.enum(["professional", "casual", "urgent", "playful"]),
            budget: z.number().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { runAdOptimizer } = await import("../services/adOptimizer");
      const results = [];
      
      for (const row of input.rows) {
        try {
          const result = await runAdOptimizer(ctx.user.id, {
            product: row.product,
            targetAudience: row.audience,
            goal: row.goal,
            description: row.description,
            tone: row.tone,
            budget: row.budget,
          });
          results.push({ success: true, data: result, input: row });
        } catch (error: any) {
          results.push({ success: false, error: error.message, input: row });
        }
      }
      
      return { results, total: input.rows.length, successful: results.filter(r => r.success).length };
    }),

  /**
   * Batch generate thumbnails from CSV data
   */
  batchGenerateThumbnails: protectedProcedure
    .input(
      z.object({
        rows: z.array(
          z.object({
            videoTitle: z.string(),
            niche: z.string(),
            style: z.enum(["bold", "minimal", "dramatic", "playful"]),
            customPrompt: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { runThumbnailGenerator } = await import("../services/thumbnailGenerator");
      const results = [];
      
      for (const row of input.rows) {
        try {
          const result = await runThumbnailGenerator(ctx.user.id, row);
          results.push({ success: true, data: result, input: row });
        } catch (error: any) {
          results.push({ success: false, error: error.message, input: row });
        }
      }
      
      return { results, total: input.rows.length, successful: results.filter(r => r.success).length };
    }),

  /**
   * Generate ad variants for A/B testing
   */
  generateAdVariants: protectedProcedure
    .input(
      z.object({
        product: z.string(),
        targetAudience: z.string(),
        goal: z.enum(["awareness", "traffic", "conversions", "engagement"]),
        description: z.string().optional(),
        budget: z.number().optional(),
        variantCount: z.number().min(2).max(3).default(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { runAdOptimizer } = await import("../services/adOptimizer");
      const tones: Array<"professional" | "casual" | "urgent" | "playful"> = ["professional", "casual", "urgent"];
      const variants = [];
      
      for (let i = 0; i < input.variantCount; i++) {
        const tone = tones[i % tones.length];
        const result = await runAdOptimizer(ctx.user.id, {
          product: input.product,
          targetAudience: input.targetAudience,
          goal: input.goal,
          description: input.description,
          tone,
          budget: input.budget,
        });
        variants.push({ ...result, tone, variantIndex: i + 1 });
      }
      
      // Find best performer
      const bestVariant = variants.reduce((best, current) => 
        current.overallScore > best.overallScore ? current : best
      );
      
      return { variants, bestVariantIndex: variants.indexOf(bestVariant) + 1 };
    }),

  /**
   * Generate thumbnail variants for A/B testing
   */
  generateThumbnailVariants: protectedProcedure
    .input(
      z.object({
        videoTitle: z.string(),
        niche: z.string(),
        customPrompt: z.string().optional(),
        variantCount: z.number().min(2).max(3).default(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { runThumbnailGenerator } = await import("../services/thumbnailGenerator");
      const styles: Array<"bold" | "minimal" | "dramatic" | "playful"> = ["bold", "minimal", "dramatic"];
      const variants = [];
      
      for (let i = 0; i < input.variantCount; i++) {
        const style = styles[i % styles.length];
        const result = await runThumbnailGenerator(ctx.user.id, {
          videoTitle: input.videoTitle,
          niche: input.niche,
          style,
          customPrompt: input.customPrompt,
        });
        variants.push({ ...result, style, variantIndex: i + 1 });
      }
      
      // Find best performer
      const bestVariant = variants.reduce((best, current) => 
        current.overallScore > best.overallScore ? current : best
      );
      
      return { variants, bestVariantIndex: variants.indexOf(bestVariant) + 1 };
    }),

  /**
   * Run Viral Optimizer (canonical pipeline)
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
