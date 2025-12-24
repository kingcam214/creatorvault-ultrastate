/**
 * 🦁 KINGCAM DEMOS ROUTER
 * 
 * Autonomous content generation and demo library management
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc.js";
import { 
  generateKingCamDemo, 
  generateDominicanDemo, 
  generateAdultDemo,
  generatePlatformTour,
  type DemoResult 
} from "../services/kingcamDemoEngine.js";
import { getDb } from "../db.js";
import { videoGenerationJobs, videoAssets } from "../../drizzle/schema.js";
import { eq, desc } from "drizzle-orm";

export const kingcamDemosRouter = router({
  /**
   * Generate demo video
   */
  generate: protectedProcedure
    .input(
      z.object({
        topic: z.string(),
        sector: z.enum(["dominican", "adult", "general"]),
        targetDuration: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { topic, sector, targetDuration } = input;

      const result = await generateKingCamDemo({
        topic,
        sector,
        targetDuration,
        userId: ctx.user.id,
      });

      return {
        success: true,
        demo: result,
      };
    }),

  /**
   * Generate Dominican sector demo
   */
  generateDominican: protectedProcedure
    .input(
      z.object({
        topic: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await generateDominicanDemo(input.topic, ctx.user.id);

      return {
        success: true,
        demo: result,
      };
    }),

  /**
   * Generate Adult sector demo
   */
  generateAdult: protectedProcedure
    .input(
      z.object({
        topic: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await generateAdultDemo(input.topic, ctx.user.id);

      return {
        success: true,
        demo: result,
      };
    }),

  /**
   * Generate platform tour
   */
  generateTour: protectedProcedure
    .input(
      z.object({
        featureName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await generatePlatformTour(input.featureName, ctx.user.id);

      return {
        success: true,
        demo: result,
      };
    }),

  /**
   * Get all demos
   */
  getAll: protectedProcedure
    .input(
      z.object({
        sector: z.enum(["dominican", "adult", "general", "all"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database connection failed");
      }

      // Get all completed video jobs
      const jobs = await db
        .select()
        .from(videoGenerationJobs)
        .where(eq(videoGenerationJobs.status, "complete"))
        .orderBy(desc(videoGenerationJobs.createdAt))
        .limit(50);

      // Filter by sector if specified
      const filteredJobs = input.sector && input.sector !== "all"
        ? jobs.filter(job => job.prompt.toLowerCase().includes(input.sector!))
        : jobs;

      return {
        demos: filteredJobs.map(job => ({
          id: job.id,
          title: job.prompt.split("\n")[0].substring(0, 100),
          videoUrl: job.videoUrl,
          duration: job.duration,
          createdAt: job.createdAt,
          sector: detectSector(job.prompt),
        })),
      };
    }),

  /**
   * Get demo by ID
   */
  getById: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database connection failed");
      }

      const job = await db
        .select()
        .from(videoGenerationJobs)
        .where(eq(videoGenerationJobs.id, input.id))
        .limit(1);

      if (job.length === 0) {
        throw new Error("Demo not found");
      }

      return {
        demo: {
          id: job[0].id,
          title: job[0].prompt.split("\n")[0],
          prompt: job[0].prompt,
          videoUrl: job[0].videoUrl,
          duration: job[0].duration,
          status: job[0].status,
          createdAt: job[0].createdAt,
          sector: detectSector(job[0].prompt),
        },
      };
    }),

  /**
   * Delete demo
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database connection failed");
      }

      // Delete video job (cascades to scenes and assets)
      await db
        .delete(videoGenerationJobs)
        .where(eq(videoGenerationJobs.id, input.id));

      return {
        success: true,
      };
    }),
});

/**
 * Detect sector from prompt text
 */
function detectSector(prompt: string): "dominican" | "adult" | "general" {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes("dominican") || lowerPrompt.includes("república dominicana") || lowerPrompt.includes("cómo ganar")) {
    return "dominican";
  }
  
  if (lowerPrompt.includes("adult") || lowerPrompt.includes("85%") || lowerPrompt.includes("revenue split")) {
    return "adult";
  }
  
  return "general";
}
