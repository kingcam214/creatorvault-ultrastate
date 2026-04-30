import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const nfcCards = router({
    // @ts-ignore
  createNFCCard: protectedProcedure.input(z.object({ name: z.string(), type: z.string(), destination: z.string(), data: z.record(z.unknown()) })).mutation(async ({ ctx, input }) => ({ id: Date.now(), ...input, userId: ctx.user.id, nfcId: `NFC-${Date.now()}`, createdAt: new Date().toISOString() })),
  getNFCCards: protectedProcedure.query(async ({ ctx }) => ({ cards: [], userId: ctx.user.id })),
  updateNFCCard: protectedProcedure.input(z.object({ cardId: z.number(), destination: z.string() })).mutation(async ({ input }) => ({ updated: true, cardId: input.cardId, destination: input.destination })),
  getNFCAnalytics: protectedProcedure.input(z.object({ cardId: z.number() })).query(async ({ input }) => ({ cardId: input.cardId, scans: 0, uniqueScans: 0, lastScan: null })),
  generateNFCContent: protectedProcedure.input(z.object({ purpose: z.string(), brand: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Design NFC card content for ${input.brand} with purpose: ${input.purpose}. Include: landing page copy, CTA, and data to capture.` }], max_tokens: 300 });
    return { content: c.choices[0].message.content };
  }),
});
export const nfcCardsRouter = nfcCards;
