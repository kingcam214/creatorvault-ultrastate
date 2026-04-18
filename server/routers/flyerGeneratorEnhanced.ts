import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const flyerGeneratorEnhanced = router({
  generateEnhancedFlyer: protectedProcedure.input(z.object({ concept: z.string(), style: z.string(), audience: z.string(), cta: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Generate an enhanced flyer design for:
Concept: ${input.concept}
Style: ${input.style}
Audience: ${input.audience}
CTA: ${input.cta}

Provide: layout description, color scheme, typography, visual elements, and complete copy.` }], max_tokens: 600 });
    return { design: c.choices[0].message.content };
  }),
  enhanceExistingFlyer: protectedProcedure.input(z.object({ currentDesign: z.string(), improvements: z.array(z.string()) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Enhance this flyer design:
${input.currentDesign}

Apply improvements: ${input.improvements.join(", ")}` }], max_tokens: 400 });
    return { enhanced: c.choices[0].message.content };
  }),
});
export const flyerGeneratorRouter = flyerGeneratorEnhanced;
