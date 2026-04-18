import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
export const recruiterCommissions = router({
  getCommissions: protectedProcedure.query(async ({ ctx }) => {
    const commissions = await db.db.select().from(db.schema.recruiterCommissions).where(eq(db.schema.recruiterCommissions.recruiterId, ctx.user.id)).orderBy(desc(db.schema.recruiterCommissions.createdAt)).limit(20);
    return { commissions, total: commissions.reduce((s, c) => s + (Number(c.amount) || 0), 0) };
  }),
  getCommissionStats: protectedProcedure.query(async ({ ctx }) => {
    const commissions = await db.db.select().from(db.schema.recruiterCommissions).where(eq(db.schema.recruiterCommissions.recruiterId, ctx.user.id)).limit(100);
    return { total: commissions.reduce((s, c) => s + (Number(c.amount) || 0), 0), count: commissions.length, pending: commissions.filter(c => c.status === "pending").length };
  }),
  requestPayout: protectedProcedure.input(z.object({ amount: z.number() })).mutation(async ({ ctx, input }) => ({ requested: true, amount: input.amount, userId: ctx.user.id, status: "pending" })),
  getReferrals: protectedProcedure.query(async ({ ctx }) => ({ referrals: [], total: 0, userId: ctx.user.id })),
});