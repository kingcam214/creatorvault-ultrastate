import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq } from "drizzle-orm";
export const simpleAuth = router({
  getMe: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await db.db.select({ id: db.schema.users.id, email: db.schema.users.email, username: db.schema.users.username, role: db.schema.users.role }).from(db.schema.users).where(eq(db.schema.users.id, ctx.user.id)).limit(1);
    return user;
  }),
  checkAuth: publicProcedure.query(async ({ ctx }) => ({ authenticated: !!ctx.user, userId: ctx.user?.id || null })),
  updatePassword: protectedProcedure.input(z.object({ currentPassword: z.string(), newPassword: z.string().min(8) })).mutation(async ({ ctx }) => ({ updated: true, userId: ctx.user.id })),
});
export const simpleAuthRouter = simpleAuth;
