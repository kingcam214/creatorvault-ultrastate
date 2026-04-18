import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const liveSessionScheduler = router({
  scheduleLive: protectedProcedure.input(z.object({ title: z.string(), platform: z.string(), date: z.string(), time: z.string(), topic: z.string(), duration: z.number() })).mutation(async ({ ctx, input }) => ({ id: Date.now(), ...input, userId: ctx.user.id, status: "scheduled" })),
  getLiveSessions: protectedProcedure.query(async ({ ctx }) => ({ sessions: [], upcoming: 0, userId: ctx.user.id })),
  generateLiveOutline: protectedProcedure.input(z.object({ topic: z.string(), duration: z.number(), audience: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a ${input.duration}-minute live session outline for ${input.audience} about: ${input.topic}. Include: intro, segments with timing, engagement moments, Q&A, and closing.` }], max_tokens: 500 });
    return { outline: c.choices[0].message.content };
  }),
  generateLivePromo: protectedProcedure.input(z.object({ title: z.string(), date: z.string(), platform: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Write promotional content for a live session:
Title: ${input.title}
Date: ${input.date}
Platform: ${input.platform}

Create: announcement post, reminder post, and day-of post.` }], max_tokens: 400 });
    return { promo: c.choices[0].message.content };
  }),
});
export const liveSessionSchedulerRouter = liveSessionScheduler;
