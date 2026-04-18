import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc, sum, gte } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const aiRevenueTracker = router({
  getRevenueOverview: protectedProcedure.query(async ({ ctx }) => {
    const payments = await db.db.select().from(db.schema.payments).where(eq(db.schema.payments.userId, ctx.user.id)).limit(200);
    const total = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const thisMonth = payments.filter(p => {
      const d = new Date(p.createdAt || 0);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return { total, thisMonth, transactions: payments.length, avgTransaction: payments.length ? total / payments.length : 0 };
  }),
  trackRevenue: protectedProcedure.input(z.object({
    amount: z.number(), source: z.string(), platform: z.string(), notes: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const [payment] = await db.db.insert(db.schema.payments).values({
      userId: ctx.user.id, amount: input.amount.toString(), source: input.source,
      platform: input.platform, notes: input.notes || "", status: "completed", createdAt: new Date(),
    }).$returningId();
    return { id: payment.id, ...input };
  }),
  getRevenueInsights: protectedProcedure.query(async ({ ctx }) => {
    const payments = await db.db.select().from(db.schema.payments).where(eq(db.schema.payments.userId, ctx.user.id)).limit(100);
    if (payments.length === 0) return { insights: "Start tracking revenue to get AI insights." };
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Analyze this revenue data and provide insights:
Total transactions: ${payments.length}
Total revenue: $${payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)}
Sources: ${[...new Set(payments.map(p => p.source))].join(", ")}

Provide: top insights, growth opportunities, and 3 specific actions to increase revenue.` }],
      max_tokens: 400,
    });
    return { insights: completion.choices[0].message.content };
  }),
  getRevenueProjection: protectedProcedure.input(z.object({ months: z.number().default(3) })).query(async ({ ctx, input }) => {
    return { projection: [], months: input.months, message: "Add more revenue data for accurate projections" };
  }),
});

export const aiRevenueTrackerRouter = aiRevenueTracker;
