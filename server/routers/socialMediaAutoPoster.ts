import { z } from "zod";
import { randomUUID } from "crypto";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { and, desc, eq } from "drizzle-orm";

function normalizeScheduledDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("scheduledFor must be a valid ISO date string.");
  return date.toISOString();
}

export const socialMediaAutoPoster = router({
  schedulePost: protectedProcedure.input(z.object({
    content: z.string().min(1),
    platforms: z.array(z.string().min(1)).min(1),
    scheduledFor: z.string().min(1),
    mediaUrls: z.array(z.string()).optional(),
  })).mutation(async ({ ctx, input }) => {
    const scheduledFor = normalizeScheduledDate(input.scheduledFor);
    const results = [];
    for (const platform of input.platforms) {
      const fileKey = `scheduled-post-${ctx.user.id}-${platform}-${randomUUID()}`;
      const metadata = { platform, scheduledFor, mediaUrls: input.mediaUrls ?? [], distributionState: "queued", createdBy: ctx.user.id };
      const [post] = await db.db.insert(db.schema.content).values({
        userId: ctx.user.id,
        title: `${platform.toUpperCase()} scheduled post`,
        description: input.content,
        fileUrl: `creatorvault://scheduled-post/${fileKey}`,
        fileKey,
        mimeType: "text/plain",
        fileSize: Buffer.byteLength(input.content, "utf8"),
        contentType: "scheduled_social_post",
        status: "scheduled",
        metadata,
      }).$returningId();
      results.push({ platform, postId: post.id, scheduledFor, persisted: true });
    }
    return { scheduled: results, scheduledFor, persistedCount: results.length };
  }),

  getScheduledPosts: protectedProcedure.query(async ({ ctx }) => {
    const posts = await db.db.select().from(db.schema.content)
      .where(and(eq(db.schema.content.userId, ctx.user.id), eq(db.schema.content.contentType, "scheduled_social_post")))
      .orderBy(desc(db.schema.content.createdAt)).limit(50);
    return { posts: posts.filter((p: any) => p.status === "scheduled") };
  }),

  cancelScheduledPost: protectedProcedure.input(z.object({ postId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await db.db.update(db.schema.content).set({ status: "cancelled", metadata: { cancelledAt: new Date().toISOString(), cancelledBy: ctx.user.id } }).where(and(eq(db.schema.content.id, input.postId), eq(db.schema.content.userId, ctx.user.id)));
    return { cancelled: true, postId: input.postId, userId: ctx.user.id };
  }),

  getPostingHistory: protectedProcedure.query(async ({ ctx }) => {
    const history = await db.db.select().from(db.schema.content)
      .where(and(eq(db.schema.content.userId, ctx.user.id), eq(db.schema.content.contentType, "scheduled_social_post")))
      .orderBy(desc(db.schema.content.createdAt)).limit(100);
    return { history };
  }),
});
export const socialMediaAutoPosterRouter = socialMediaAutoPoster;

