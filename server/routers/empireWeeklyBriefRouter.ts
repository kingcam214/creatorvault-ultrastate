import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const empireWeeklyBriefRouter = router({
  generateWeeklyBrief: protectedProcedure.mutation(async ({ ctx }) => {
    const payments = await db.db.select().from(db.schema.payments).where(eq(db.schema.payments.userId, ctx.user.id)).limit(20);
    // @ts-ignore
    const revenue = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Generate a weekly empire brief for a creator with $${revenue} total revenue. Include: wins this week, areas to improve, top 3 priorities for next week, and motivational insight.` }], max_tokens: 500 });
    return { brief: c.choices[0].message.content, generatedAt: new Date().toISOString() };
  }),
  getWeeklyBriefs: protectedProcedure.query(async ({ ctx }) => ({ briefs: [], userId: ctx.user.id })),
});