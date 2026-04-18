import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const brandEngine = router({
  buildBrand: protectedProcedure.input(z.object({
    name: z.string(), niche: z.string(), mission: z.string(), audience: z.string(), personality: z.array(z.string()),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Build a complete brand identity for ${input.name}:
Niche: ${input.niche}
Mission: ${input.mission}
Audience: ${input.audience}
Personality: ${input.personality.join(", ")}

Create: brand story, tagline (3 options), voice guidelines, visual direction, and content pillars.` }],
      max_tokens: 800,
    });
    return { brand: completion.choices[0].message.content };
  }),
  refineBrand: protectedProcedure.input(z.object({ currentBrand: z.string(), feedback: z.string(), direction: z.string() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Refine this brand based on feedback:
Current: ${input.currentBrand}
Feedback: ${input.feedback}
Direction: ${input.direction}

Provide updated brand elements.` }],
      max_tokens: 600,
    });
    return { refined: completion.choices[0].message.content };
  }),
  generateBrandAssets: protectedProcedure.input(z.object({ brandName: z.string(), style: z.string() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Generate brand asset specifications for ${input.brandName} in ${input.style} style:

Specify: logo concept, color palette (hex codes), typography, icon style, and usage guidelines.` }],
      max_tokens: 500,
    });
    return { assets: completion.choices[0].message.content };
  }),
});

export const brandEngineRouter = brandEngine;
