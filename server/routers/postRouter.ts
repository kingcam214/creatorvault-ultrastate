import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
export const postRouter = router({
  getPosts: protectedProcedure.query(async ({ ctx }) => {
    const posts = await db.db.select().from(db.schema.content).where(eq(db.schema.content.userId, ctx.user.id)).orderBy(desc(db.schema.content.createdAt)).limit(20);
    return posts;
  }),
  createPost: protectedProcedure.input(z.object({ body: z.string(), platform: z.string(), type: z.string().default("post"), scheduledFor: z.string().optional() })).mutation(async ({ ctx, input }) => {
    const [post] = await db.db.insert(db.schema.content).values({ userId: ctx.user.id, body: input.body, platform: input.platform, type: input.type, status: input.scheduledFor ? "scheduled" : "draft", createdAt: new Date() }).$returningId();
    return { id: post.id, ...input };
  }),
  updatePost: protectedProcedure.input(z.object({ postId: z.number(), body: z.string() })).mutation(async ({ input }) => {
    await db.db.update(db.schema.content).set({ body: input.body }).where(eq(db.schema.content.id, input.postId));
    return { updated: true };
  }),
  deletePost: protectedProcedure.input(z.object({ postId: z.number() })).mutation(async ({ input }) => {
    await db.db.delete(db.schema.content).where(eq(db.schema.content.id, input.postId));
    return { deleted: true };
  }),
  publishPost: protectedProcedure.input(z.object({ postId: z.number() })).mutation(async ({ input }) => {
    await db.db.update(db.schema.content).set({ status: "published" }).where(eq(db.schema.content.id, input.postId));
    return { published: true };
  }),
});