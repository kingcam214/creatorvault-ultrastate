import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const telegramBot = router({
  getBots: protectedProcedure.query(async ({ ctx }) => {
    const bots = await db.db.select().from(db.schema.telegramBots).where(eq(db.schema.telegramBots.userId, ctx.user.id)).limit(10);
    return bots;
  }),
  createBot: protectedProcedure.input(z.object({ name: z.string(), token: z.string(), purpose: z.string() })).mutation(async ({ ctx, input }) => {
    const [bot] = await db.db.insert(db.schema.telegramBots).values({ userId: ctx.user.id, name: input.name, token: input.token, purpose: input.purpose, status: "active", createdAt: new Date() }).$returningId();
    return { id: bot.id, name: input.name };
  }),
  generateBotScript: protectedProcedure.input(z.object({ botPurpose: z.string(), commands: z.array(z.string()) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a Telegram bot script for ${input.botPurpose}:
Commands: ${input.commands.join(", ")}

Write: welcome message, command responses, and conversation flows.` }], max_tokens: 600 });
    return { script: c.choices[0].message.content };
  }),
  getBotStats: protectedProcedure.input(z.object({ botId: z.number() })).query(async ({ input }) => ({ botId: input.botId, users: 0, messages: 0, commands: 0 })),
});
export const telegramBotRouter = telegramBot;
