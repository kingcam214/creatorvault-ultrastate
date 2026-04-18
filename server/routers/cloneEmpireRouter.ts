import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const cloneEmpireRouter = router({
  getEmpire: protectedProcedure.query(async ({ ctx }) => {
    const clones = await db.db.select().from(db.schema.creators).where(eq(db.schema.creators.userId, ctx.user.id)).limit(20);
    return { clones, empireSize: clones.length, totalReach: 0 };
  }),
  expandEmpire: protectedProcedure.input(z.object({ strategy: z.string(), platforms: z.array(z.string()), budget: z.number() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a clone empire expansion plan:
Strategy: ${input.strategy}
Platforms: ${input.platforms.join(", ")}
Budget: $${input.budget}

Design: clone deployment schedule, platform-specific strategies, and revenue projections.` }], max_tokens: 600 });
    return { plan: c.choices[0].message.content };
  }),
  getEmpireRevenue: protectedProcedure.query(async ({ ctx }) => {
    const payments = await db.db.select().from(db.schema.payments).where(eq(db.schema.payments.userId, ctx.user.id)).limit(100);
    return { total: payments.reduce((s, p) => s + (Number(p.amount) || 0), 0), byClone: [] };
  }),
});