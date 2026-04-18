import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const mercedesAcquisitionAgent = router({
  findAcquisitionTargets: protectedProcedure.input(z.object({ budget: z.number(), criteria: z.array(z.string()), market: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Find acquisition targets in ${input.market} with budget $${input.budget}:
Criteria: ${input.criteria.join(", ")}

Identify: target types, valuation methods, due diligence checklist, and integration strategy.` }], max_tokens: 600 });
    return { targets: c.choices[0].message.content };
  }),
  valueBusiness: protectedProcedure.input(z.object({ revenue: z.number(), growth: z.number(), assets: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Value a business:
Revenue: $${input.revenue}
Growth: ${input.growth}%
Assets: ${input.assets}

Provide: valuation range (3 methods), key value drivers, and negotiation strategy.` }], max_tokens: 400 });
    return { valuation: c.choices[0].message.content };
  }),
  generateAcquisitionPitch: protectedProcedure.input(z.object({ targetBusiness: z.string(), offerAmount: z.number(), rationale: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Write an acquisition pitch for ${input.targetBusiness} at $${input.offerAmount}:
Rationale: ${input.rationale}

Create a compelling offer letter with vision, terms, and next steps.` }], max_tokens: 500 });
    return { pitch: c.choices[0].message.content };
  }),
});
export const mercedesAcquisitionAgentRouter = mercedesAcquisitionAgent;
