import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const brandDealsRouter = router({
  getDeals: protectedProcedure.query(async ({ ctx }) => {
    const deals = await db.db.select().from(db.schema.brandDeals).where(eq(db.schema.brandDeals.userId, ctx.user.id)).orderBy(desc(db.schema.brandDeals.createdAt)).limit(20);
    return deals;
  }),
  createDeal: protectedProcedure.input(z.object({ brand: z.string(), value: z.number(), type: z.string(), deliverables: z.array(z.string()) })).mutation(async ({ ctx, input }) => {
    const [deal] = await db.db.insert(db.schema.brandDeals).values({ userId: ctx.user.id, brand: input.brand, value: input.value.toString(), type: input.type, status: "negotiating", deliverables: JSON.stringify(input.deliverables), createdAt: new Date() }).$returningId();
    return { id: deal.id, brand: input.brand };
  }),
  generatePitchEmail: protectedProcedure.input(z.object({ brand: z.string(), myStats: z.string(), proposedDeal: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Write a brand deal pitch email to ${input.brand}:
My stats: ${input.myStats}
Proposed deal: ${input.proposedDeal}

Write a compelling, professional pitch that gets a response.` }], max_tokens: 500 });
    return { email: c.choices[0].message.content };
  }),
  negotiateDeal: protectedProcedure.input(z.object({ dealId: z.number(), counterOffer: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Help negotiate this brand deal. Counter offer: ${input.counterOffer}

Provide: negotiation strategy, key points to emphasize, and response template.` }], max_tokens: 400 });
    return { strategy: c.choices[0].message.content };
  }),
});