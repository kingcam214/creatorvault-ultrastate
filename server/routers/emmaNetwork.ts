/**
 * 🌐 EMMA NETWORK ROUTER
 * 
 * tRPC router for Emma's 2,000+ Dominican Republic creator network
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  importEmmaNetwork,
  parseEmmaNetworkCSV,
  getEmmaNetworkStats,
} from "../services/emmaNetwork";
import { db } from "../db";
import { emmaNetwork, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "king") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const emmaNetworkRouter = router({
  /**
   * Get Emma Network statistics
   */
  getStats: adminProcedure.query(async () => {
    return await getEmmaNetworkStats();
  }),

  /**
   * Get all Emma Network creators
   */
  getAll: adminProcedure.query(async () => {
    const creators = await db.select().from(emmaNetwork);
    
    // Fetch user data for each creator
    const creatorsWithUsers = await Promise.all(
      creators.map(async (creator) => {
        const [user] = await db.select().from(users).where(eq(users.id, creator.userId));
        return {
          ...creator,
          user,
        };
      })
    );

    return creatorsWithUsers;
  }),

  /**
   * Import Emma Network creators from CSV
   */
  import: adminProcedure
    .input(
      z.object({
        csvContent: z.string().min(1, "CSV content is required"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Parse CSV
        const records = parseEmmaNetworkCSV(input.csvContent);

        if (records.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No valid records found in CSV",
          });
        }

        // Import records
        const result = await importEmmaNetwork(records);

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Import failed",
        });
      }
    }),

  /**
   * Get Emma Network creator by ID
   */
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [creator] = await db
        .select()
        .from(emmaNetwork)
        .where(eq(emmaNetwork.id, input.id));

      if (!creator) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Creator not found",
        });
      }

      const [user] = await db.select().from(users).where(eq(users.id, creator.userId));

      return {
        ...creator,
        user,
      };
    }),

  /**
   * Update Emma Network creator
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          instagram: z.string().optional(),
          tiktok: z.string().optional(),
          whatsapp: z.string().optional(),
          city: z.string().optional(),
          contentTags: z.array(z.string()).optional(),
          notes: z.string().optional(),
          contactDate: z.date().optional(),
          onboardedDate: z.date().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(emmaNetwork)
        .set(input.data)
        .where(eq(emmaNetwork.id, input.id));

      return { success: true };
    }),

  /**
   * Delete Emma Network creator
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(emmaNetwork).where(eq(emmaNetwork.id, input.id));
      return { success: true };
    }),
});
