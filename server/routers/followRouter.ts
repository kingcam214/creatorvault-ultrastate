import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { socialSpineInternals, toggleFollow } from "../services/socialSpineService";

/** Legacy-compatible follow API backed by the canonical Social Spine. */
export const followRouter = router({
  follow: protectedProcedure.input(z.object({ targetUserId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const current = await socialSpineInternals.rawQuery(
      "SELECT 1 FROM social_follows WHERE follower_user_id = ? AND creator_user_id = ? LIMIT 1",
      [ctx.user.id, input.targetUserId],
    );
    if (!current.length) await toggleFollow(ctx.user.id, input.targetUserId);
    return { following: true, targetUserId: input.targetUserId, userId: ctx.user.id };
  }),
  unfollow: protectedProcedure.input(z.object({ targetUserId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await socialSpineInternals.rawExec(
      "DELETE FROM social_follows WHERE follower_user_id = ? AND creator_user_id = ?",
      [ctx.user.id, input.targetUserId],
    );
    return { following: false, targetUserId: input.targetUserId, userId: ctx.user.id };
  }),
  getFollowers: protectedProcedure.query(async ({ ctx }) => {
    const followers = await socialSpineInternals.rawQuery(
      `SELECT u.id, u.name, u.username, u.avatar, f.created_at
       FROM social_follows f JOIN users u ON u.id = f.follower_user_id
       WHERE f.creator_user_id = ? ORDER BY f.created_at DESC LIMIT 200`,
      [ctx.user.id],
    );
    return { followers, count: followers.length, userId: ctx.user.id };
  }),
  getFollowing: protectedProcedure.query(async ({ ctx }) => {
    const following = await socialSpineInternals.rawQuery(
      `SELECT u.id, u.name, u.username, u.avatar, f.created_at
       FROM social_follows f JOIN users u ON u.id = f.creator_user_id
       WHERE f.follower_user_id = ? ORDER BY f.created_at DESC LIMIT 200`,
      [ctx.user.id],
    );
    return { following, count: following.length, userId: ctx.user.id };
  }),
  isFollowing: protectedProcedure.input(z.object({ targetUserId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const rows = await socialSpineInternals.rawQuery(
      "SELECT 1 FROM social_follows WHERE follower_user_id = ? AND creator_user_id = ? LIMIT 1",
      [ctx.user.id, input.targetUserId],
    );
    return { isFollowing: rows.length > 0, targetUserId: input.targetUserId };
  }),
});
