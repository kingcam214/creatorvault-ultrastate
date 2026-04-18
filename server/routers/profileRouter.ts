import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq } from "drizzle-orm";
export const profileRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await db.db.select().from(db.schema.users).where(eq(db.schema.users.id, ctx.user.id)).limit(1);
    if (!user) throw new Error("Profile not found");
    const { password, ...profile } = user;
    return profile;
  }),
  updateProfile: protectedProcedure.input(z.object({ username: z.string().optional(), bio: z.string().optional(), avatar: z.string().optional(), website: z.string().optional(), niche: z.string().optional() })).mutation(async ({ ctx, input }) => {
    await db.db.update(db.schema.users).set({ ...input, updatedAt: new Date() }).where(eq(db.schema.users.id, ctx.user.id));
    return { updated: true };
  }),
  getPublicProfile: protectedProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => {
    const [user] = await db.db.select({ id: db.schema.users.id, username: db.schema.users.username, bio: db.schema.users.bio, avatar: db.schema.users.avatar }).from(db.schema.users).where(eq(db.schema.users.id, input.userId)).limit(1);
    return user;
  }),
  updateSocialLinks: protectedProcedure.input(z.object({ links: z.record(z.string()) })).mutation(async ({ ctx, input }) => ({ updated: true, links: input.links, userId: ctx.user.id })),
});