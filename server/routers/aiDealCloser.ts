import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const aiDealCloser = router({
  generateClosingScript: protectedProcedure.input(z.object({ dealType: z.string(), objections: z.array(z.string()), price: z.number() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a closing script for a $${input.price} ${input.dealType}:
Common objections: ${input.objections.join(", ")}

Write: opening, value reinforcement, objection handlers, and 3 closing techniques.` }], max_tokens: 600 });
    return { script: c.choices[0].message.content };
  }),
  handleObjection: protectedProcedure.input(z.object({ objection: z.string(), context: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Handle this sales objection: "${input.objection}"
Context: ${input.context}

Provide: acknowledgment, reframe, proof point, and close.` }], max_tokens: 300 });
    return { response: c.choices[0].message.content };
  }),
  analyzeDeal: protectedProcedure.input(z.object({ dealDetails: z.string(), stage: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Analyze this deal at ${input.stage} stage:
${input.dealDetails}

Provide: probability of close, key risks, recommended next action, and timeline.` }], max_tokens: 400 });
    return { analysis: c.choices[0].message.content };
  }),
});
export const aiDealCloserRouter = aiDealCloser;
