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
});