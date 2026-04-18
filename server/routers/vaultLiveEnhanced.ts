import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const vaultLiveEnhanced = router({
  startEnhancedLive: protectedProcedure.input(z.object({ title: z.string(), platform: z.string(), features: z.array(z.string()) })).mutation(async ({ ctx, input }) => ({ sessionId: Date.now(), title: input.title, platform: input.platform, features: input.features, userId: ctx.user.id, startedAt: new Date().toISOString() })),
  getLiveSessions: protectedProcedure.query(async ({ ctx }) => ({ sessions: [], active: 0, userId: ctx.user.id })),
  generateLiveContent: protectedProcedure.input(z.object({ topic: z.string(), audience: z.number() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Generate live stream content for ${input.audience} viewers about "${input.topic}". Include: talking points, engagement questions, and monetization moments.` }], max_tokens: 400 });
    return { content: c.choices[0].message.content };
  }),
  endLiveSession: protectedProcedure.input(z.object({ sessionId: z.number() })).mutation(async ({ input }) => ({ ended: true, sessionId: input.sessionId, summary: "Session ended successfully" })),
});
export const vaultLiveEnhancedRouter = vaultLiveEnhanced;
