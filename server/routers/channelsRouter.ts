import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";

export const channelsRouter = router({
  getChannels: protectedProcedure.query(async ({ ctx }) => {
    const channels = await db.db.select()
      .from(db.schema.telegramChannels)
      .where(eq(db.schema.telegramChannels.userId, ctx.user.id))
      .orderBy(desc(db.schema.telegramChannels.createdAt));
    return channels;
  }),

  addChannel: protectedProcedure.input(z.object({
    name: z.string(),
    platform: z.string(),
    channelId: z.string().optional(),
    url: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const [channel] = await db.db.insert(db.schema.telegramChannels).values({
      userId: ctx.user.id,
      name: input.name,
      channelId: input.channelId || "",
      platform: input.platform,
      status: "active",
      createdAt: new Date(),
    }).$returningId();
    return { id: channel.id, ...input };
  }),

  getChannelStats: protectedProcedure.input(z.object({
    channelId: z.number(),
  })).query(async ({ input }) => {
    return {
      channelId: input.channelId,
      subscribers: 0,
      posts: 0,
      engagement: "0%",
      lastPost: null,
    };
  }),
});
