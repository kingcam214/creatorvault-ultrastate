import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
export const socialMediaAutoPoster = router({
  schedulePost: protectedProcedure.input(z.object({ content: z.string(), platforms: z.array(z.string()), scheduledFor: z.string(), mediaUrls: z.array(z.string()).optional() })).mutation(async ({ ctx, input }) => {
    const results = await Promise.all(input.platforms.map(async (platform) => {
      const [post] = await db.db.insert(db.schema.content).values({ userId: ctx.user.id, body: input.content, platform, type: "scheduled_post", status: "scheduled", createdAt: new Date() }).$returningId();
      return { platform, postId: post.id };
    }));
    return { scheduled: results, scheduledFor: input.scheduledFor };
  }),
  getScheduledPosts: protectedProcedure.query(async ({ ctx }) => {
    const posts = await db.db.select().from(db.schema.content).where(eq(db.schema.content.userId, ctx.user.id)).orderBy(desc(db.schema.content.createdAt)).limit(20);
    return { posts: posts.filter(p => p.status === "scheduled") };
  }),
  cancelScheduledPost: protectedProcedure.input(z.object({ postId: z.number() })).mutation(async ({ input }) => {
    await db.db.update(db.schema.content).set({ status: "cancelled" }).where(eq(db.schema.content.id, input.postId));
    return { cancelled: true };
  }),
  getPostingHistory: protectedProcedure.query(async ({ ctx }) => {
    const history = await db.db.select().from(db.schema.content).where(eq(db.schema.content.userId, ctx.user.id)).orderBy(desc(db.schema.content.createdAt)).limit(50);
    return { history };
  }),
});
export const socialMediaAutoPosterRouter = socialMediaAutoPoster;
