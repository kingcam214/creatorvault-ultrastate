import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const vaultCultureRouter = router({
  getData: protectedProcedure.query(async ({ ctx }) => ({ data: [], userId: ctx.user.id, feature: "cultural content and community culture" })),
  create: protectedProcedure.input(z.object({ type: z.string(), data: z.record(z.unknown()) })).mutation(async ({ ctx, input }) => ({ id: Date.now(), ...input, userId: ctx.user.id, createdAt: new Date().toISOString() })),
  getInsights: protectedProcedure.query(async ({ ctx }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Provide insights for cultural content and community culture feature. What are the top 3 actions to maximize results?` }], max_tokens: 300 });
    return { insights: c.choices[0].message.content, userId: ctx.user.id };
  }),
  update: protectedProcedure.input(z.object({ id: z.number(), updates: z.record(z.unknown()) })).mutation(async ({ input }) => ({ updated: true, id: input.id })),
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => ({ deleted: true, id: input.id })),
});
