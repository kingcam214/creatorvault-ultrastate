import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { eq, desc, count } from "drizzle-orm";

const adminGuard = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "king") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const adminRouter = router({
  getStats: adminGuard.query(async ({ ctx }) => {
    const [userCount] = await db.db.select({ count: count() }).from(db.schema.users);
    const [contentCount] = await db.db.select({ count: count() }).from(db.schema.content);
    const [paymentCount] = await db.db.select({ count: count() }).from(db.schema.payments);
    return {
      users: userCount.count,
      content: contentCount.count,
      payments: paymentCount.count,
      timestamp: new Date().toISOString(),
    };
  }),

  getUsers: adminGuard.input(z.object({
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().default(0),
  })).query(async ({ input }) => {
    const users = await db.db.select({
      id: db.schema.users.id,
      email: db.schema.users.email,
      username: db.schema.users.username,
      role: db.schema.users.role,
      createdAt: db.schema.users.createdAt,
    }).from(db.schema.users)
      .limit(input.limit)
      .offset(input.offset)
      .orderBy(desc(db.schema.users.createdAt));
    return users;
  }),

  updateUserRole: adminGuard.input(z.object({
    userId: z.number(),
    role: z.enum(["user", "creator", "admin", "king"]),
  })).mutation(async ({ input }) => {
    await db.db.update(db.schema.users)
      .set({ role: input.role })
      .where(eq(db.schema.users.id, input.userId));
    return { success: true };
  }),

  getRecentPayments: adminGuard.input(z.object({
    limit: z.number().default(20),
  })).query(async ({ input }) => {
    const payments = await db.db.select()
      .from(db.schema.payments)
      .orderBy(desc(db.schema.payments.createdAt))
      .limit(input.limit);
    return payments;
  }),
});
