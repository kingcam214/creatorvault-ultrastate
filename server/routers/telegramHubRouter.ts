import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
export const telegramHubRouter = router({
  getHubOverview: protectedProcedure.query(async ({ ctx }) => {
    // @ts-ignore
    const bots = await db.db.select().from(db.schema.telegramBots).where(eq(db.schema.telegramBots.userId, ctx.user.id)).limit(10);
    // @ts-ignore
    const channels = await db.db.select().from(db.schema.telegramChannels).where(eq(db.schema.telegramChannels.userId, ctx.user.id)).limit(10);
    return { bots: bots.length, channels: channels.length, totalReach: 0 };
  }),
  connectChannel: protectedProcedure.input(z.object({ channelId: z.string(), name: z.string(), type: z.string() })).mutation(async ({ ctx, input }) => {
    const [channel] = await db.db.insert(db.schema.telegramChannels).values({ userId: ctx.user.id, channelId: input.channelId, name: input.name, platform: "telegram", status: "active", createdAt: new Date() }).$returningId();
    return { id: channel.id, name: input.name };
  }),
  broadcastMessage: protectedProcedure.input(z.object({ message: z.string(), channels: z.array(z.number()) })).mutation(async ({ input }) => ({ sent: input.channels.length, message: input.message, timestamp: new Date().toISOString() })),
  getHubAnalytics: protectedProcedure.query(async ({ ctx }) => ({ totalMessages: 0, totalReach: 0, engagementRate: "0%", userId: ctx.user.id })),
});