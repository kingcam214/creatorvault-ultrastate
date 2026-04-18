import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const competitorIntelRouter = router({
  analyzeCompetitor: protectedProcedure.input(z.object({
    competitorHandle: z.string(),
    platform: z.string(),
    niche: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Analyze competitor ${input.competitorHandle} on ${input.platform} in the ${input.niche} niche.

Provide: 1) Estimated audience size & demographics, 2) Content strategy breakdown, 3) Monetization methods, 4) Their weaknesses/gaps, 5) How to outcompete them.`,
      }],
      max_tokens: 600,
    });
    return { analysis: completion.choices[0].message.content };
  }),

  findGaps: protectedProcedure.input(z.object({
    niche: z.string(),
    platform: z.string(),
    competitors: z.array(z.string()),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Find market gaps in ${input.niche} on ${input.platform}:
Competitors: ${input.competitors.join(", ")}

Identify: underserved audiences, missing content types, pricing gaps, and positioning opportunities.`,
      }],
      max_tokens: 500,
    });
    return { gaps: completion.choices[0].message.content };
  }),
});
