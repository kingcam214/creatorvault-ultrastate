import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const onlyfansIntegration = router({
  generateOFContent: protectedProcedure.input(z.object({ contentType: z.string(), theme: z.string(), subscriptionTier: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create OnlyFans ${input.contentType} content strategy for ${input.subscriptionTier} tier:
Theme: ${input.theme}

Provide: content calendar, pricing strategy, engagement tactics, and retention methods.` }], max_tokens: 500 });
    return { strategy: c.choices[0].message.content };
  }),
  getPricingStrategy: protectedProcedure.input(z.object({ niche: z.string(), followers: z.number() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Recommend OnlyFans pricing for ${input.niche} creator with ${input.followers.toLocaleString()} followers. Include: subscription price, PPV pricing, tip menu, and bundle offers.` }], max_tokens: 400 });
    return { pricing: c.choices[0].message.content };
  }),
  generateDMScript: protectedProcedure.input(z.object({ purpose: z.string(), tone: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Write an OnlyFans DM script for ${input.purpose} in ${input.tone} tone. Keep it authentic and conversion-focused.` }], max_tokens: 300 });
    return { script: c.choices[0].message.content };
  }),
});
export const onlyfansIntegrationRouter = onlyfansIntegration;
