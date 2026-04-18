import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const brandDNARouter = router({
  extractBrandDNA: protectedProcedure.input(z.object({
    brandName: z.string(),
    description: z.string(),
    existingContent: z.array(z.string()).optional(),
    competitors: z.array(z.string()).optional(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Extract the brand DNA for ${input.brandName}:
Description: ${input.description}
Sample content: ${(input.existingContent || []).slice(0, 3).join(" | ")}
Competitors: ${(input.competitors || []).join(", ")}

Define: core values, brand archetype, unique differentiators, emotional promise, visual DNA, and verbal DNA.`,
      }],
      max_tokens: 700,
    });
    return { dna: completion.choices[0].message.content };
  }),

  applyBrandDNA: protectedProcedure.input(z.object({
    content: z.string(),
    brandDNA: z.string(),
    contentType: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Rewrite this ${input.contentType} to perfectly match this brand DNA:
Brand DNA: ${input.brandDNA}
Content: ${input.content}`,
      }],
      max_tokens: 500,
    });
    return { rewritten: completion.choices[0].message.content };
  }),
});
