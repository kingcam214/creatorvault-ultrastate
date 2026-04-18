import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const whatsappBot = router({
  getBots: protectedProcedure.query(async ({ ctx }) => {
    const bots = await db.db.select().from(db.schema.whatsappProviders).where(eq(db.schema.whatsappProviders.userId, ctx.user.id)).limit(10);
    return bots;
  }),
  createBot: protectedProcedure.input(z.object({ name: z.string(), phoneNumber: z.string(), purpose: z.string() })).mutation(async ({ ctx, input }) => {
    const [bot] = await db.db.insert(db.schema.whatsappProviders).values({ userId: ctx.user.id, name: input.name, phoneNumber: input.phoneNumber, purpose: input.purpose, status: "active", createdAt: new Date() }).$returningId();
    return { id: bot.id, name: input.name };
  }),
  generateBotMessages: protectedProcedure.input(z.object({ purpose: z.string(), audience: z.string(), count: z.number().default(5) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create ${input.count} WhatsApp bot messages for ${input.purpose} targeting ${input.audience}. Make them conversational and action-oriented.` }], max_tokens: 400 });
    return { messages: c.choices[0].message.content };
  }),
  getBotAnalytics: protectedProcedure.input(z.object({ botId: z.number() })).query(async ({ input }) => ({ botId: input.botId, messages: 0, responses: 0, conversions: 0 })),
});
export const whatsappBotRouter = whatsappBot;
