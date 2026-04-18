import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc, count } from "drizzle-orm";

export const emmaDashboardRouter = router({
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const [contentCount] = await db.db.select({ count: count() })
      .from(db.schema.content)
      .where(eq(db.schema.content.userId, ctx.user.id));
    
    const [networkCount] = await db.db.select({ count: count() })
      .from(db.schema.emmaNetwork)
      .where(eq(db.schema.emmaNetwork.userId, ctx.user.id));
    
    const [leadCount] = await db.db.select({ count: count() })
      .from(db.schema.leads)
      .where(eq(db.schema.leads.userId, ctx.user.id));
    
    return {
      contentCreated: contentCount.count,
      networkSize: networkCount.count,
      leadsGenerated: leadCount.count,
      emmaStatus: "active",
    };
  }),

  getEmmaActivity: protectedProcedure.input(z.object({
    limit: z.number().default(10),
  })).query(async ({ ctx, input }) => {
    const activity = await db.db.select()
      .from(db.schema.content)
      .where(eq(db.schema.content.userId, ctx.user.id))
      .orderBy(desc(db.schema.content.createdAt))
      .limit(input.limit);
    return activity;
  }),

  getEmmaInsights: protectedProcedure.query(async ({ ctx }) => {
    return {
      topPerformingContent: [],
      audienceGrowth: "0%",
      revenueFromEmma: 0,
      nextActions: [
        "Create 3 pieces of content today",
        "Engage with 10 comments",
        "Send 5 DMs to warm leads",
      ],
    };
  }),
});
