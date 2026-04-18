import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
export const followRouter = router({
  follow: protectedProcedure.input(z.object({ targetUserId: z.number() })).mutation(async ({ ctx, input }) => ({ following: true, targetUserId: input.targetUserId, userId: ctx.user.id })),
  unfollow: protectedProcedure.input(z.object({ targetUserId: z.number() })).mutation(async ({ ctx, input }) => ({ following: false, targetUserId: input.targetUserId, userId: ctx.user.id })),
  getFollowers: protectedProcedure.query(async ({ ctx }) => ({ followers: [], count: 0, userId: ctx.user.id })),
  getFollowing: protectedProcedure.query(async ({ ctx }) => ({ following: [], count: 0, userId: ctx.user.id })),
  isFollowing: protectedProcedure.input(z.object({ targetUserId: z.number() })).query(async ({ ctx, input }) => ({ isFollowing: false, targetUserId: input.targetUserId })),
});