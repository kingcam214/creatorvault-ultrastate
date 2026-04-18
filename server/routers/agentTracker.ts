import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc, and } from "drizzle-orm";

export const agentTrackerRouter = router({
  getAgentStatus: protectedProcedure.query(async ({ ctx }) => {
    const bots = await db.db.select()
      .from(db.schema.botEvents)
      .where(eq(db.schema.botEvents.userId, ctx.user.id))
      .orderBy(desc(db.schema.botEvents.createdAt))
      .limit(20);
    return { agents: bots, userId: ctx.user.id };
  }),

  logAgentEvent: protectedProcedure.input(z.object({
    agentName: z.string(),
    eventType: z.string(),
    payload: z.record(z.unknown()).optional(),
  })).mutation(async ({ ctx, input }) => {
    await db.db.insert(db.schema.botEvents).values({
      userId: ctx.user.id,
      botType: input.agentName,
      eventType: input.eventType,
      payload: JSON.stringify(input.payload || {}),
      createdAt: new Date(),
    });
    return { success: true };
  }),

  getAgentHistory: protectedProcedure.input(z.object({
    agentName: z.string().optional(),
    limit: z.number().default(50),
  })).query(async ({ ctx, input }) => {
    const query = db.db.select()
      .from(db.schema.botEvents)
      .where(eq(db.schema.botEvents.userId, ctx.user.id))
      .orderBy(desc(db.schema.botEvents.createdAt))
      .limit(input.limit);
    return await query;
  }),
});
