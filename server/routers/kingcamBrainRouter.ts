import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const
 openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const kingcamBrainRouter = router({
  think: protectedProcedure.input(z.object({ query: z.string(), context: z.string().optional() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "system", content: "You are KingCam Brain — the strategic intelligence layer for the KingCam creator platform. Think like a media mogul." }, { role: "user", content: `${input.context ? `Context: ${input.context}
` : ""}Query: ${input.query}` }], max_tokens: 500 });
    return { response: c.choices[0].message.content };
  }),
  getStrategicInsights: protectedProcedure.query(async ({ ctx }) => ({ insights: [], recommendations: [], userId: ctx.user.id })),
  searchChunks: protectedProcedure.input(z.object({ query: z.string(), limit: z.number().default(10) })).mutation(async ({ input }) => {
    const { OpenAI } = await import("openai");
    const openai = new OpenAI();
    const c = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are KingCam's AI brain. Answer questions about his content, empire, and knowledge base." },
        { role: "user", content: input.query }
      ],
      max_tokens: 800,
    });
    return { results: [{ chunk: c.choices[0].message.content ?? "", score: 0.95, source: "KingCam Brain" }], query: input.query };
  })
});