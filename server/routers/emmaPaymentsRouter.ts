import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc, sum } from "drizzle-orm";

export const emmaPaymentsRouter = router({
  getPaymentSummary: protectedProcedure.query(async ({ ctx }) => {
    const payments = await db.db.select()
      .from(db.schema.payments)
      .where(eq(db.schema.payments.userId, ctx.user.id))
      .orderBy(desc(db.schema.payments.createdAt))
      .limit(50);
    
    const total = payments.reduce((s: any, p: any) => s + (Number(p.amount) || 0), 0);
    const pending = payments.filter((p: any) => p.status === "pending").reduce((s: any, p: any) => s + (Number(p.amount) || 0), 0);
    
    return { total, pending, count: payments.length, recent: payments.slice(0, 5) };
  }),

  requestPayout: protectedProcedure.input(z.object({
    amount: z.number().positive(),
    method: z.enum(["stripe", "cashapp", "zelle", "paypal"]),
    accountDetails: z.string(),
  })).mutation(async ({ ctx, input }) => {
    const [payout] = await db.db.insert(db.schema.payoutRequests).values({
      userId: ctx.user.id,
      amount: input.amount.toString(),
      method: input.method,
      status: "pending",
      createdAt: new Date(),
    }).$returningId();
    return { id: payout.id, amount: input.amount, status: "pending" };
  }),

  getPayoutHistory: protectedProcedure.query(async ({ ctx }) => {
    const payouts = await db.db.select()
      .from(db.schema.payoutRequests)
    // @ts-ignore
      .where(eq(db.schema.payoutRequests.userId, ctx.user.id))
    // @ts-ignore
      .orderBy(desc(db.schema.payoutRequests.createdAt))
      .limit(20);
    return payouts;
  }),
});
