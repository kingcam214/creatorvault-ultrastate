import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";

export const mediaCoreRouter = router({
  getMediaAssets: protectedProcedure.query(async ({ ctx }) => {
    const assets = await db.db.select()
      .from(db.schema.videoAssets)
      .where(eq(db.schema.videoAssets.userId, ctx.user.id))
      .orderBy(desc(db.schema.videoAssets.createdAt))
      .limit(50);
    return assets;
  }),

  uploadMedia: protectedProcedure.input(z.object({
    filename: z.string(),
    type: z.enum(["video", "image", "audio", "document"]),
    url: z.string(),
    size: z.number().optional(),
    metadata: z.record(z.unknown()).optional(),
  })).mutation(async ({ ctx, input }) => {
    const [asset] = await db.db.insert(db.schema.videoAssets).values({
      userId: ctx.user.id,
      filename: input.filename,
      type: input.type,
      url: input.url,
      size: input.size || 0,
      metadata: JSON.stringify(input.metadata || {}),
      createdAt: new Date(),
    }).$returningId();
    return { id: asset.id, ...input };
  }),

  deleteMedia: protectedProcedure.input(z.object({
    assetId: z.number(),
  })).mutation(async ({ ctx, input }) => {
    await db.db.delete(db.schema.videoAssets)
      .where(eq(db.schema.videoAssets.id, input.assetId));
    return { success: true };
  }),

  getMediaStats: protectedProcedure.query(async ({ ctx }) => {
    const assets = await db.db.select()
      .from(db.schema.videoAssets)
      .where(eq(db.schema.videoAssets.userId, ctx.user.id));
    
    const byType = assets.reduce((acc: Record<string, number>, a) => {
      acc[a.type || "unknown"] = (acc[a.type || "unknown"] || 0) + 1;
      return acc;
    }, {});
    
    return { total: assets.length, byType };
  }),
});
