import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const emmaCaseStudyRouter = router({
  generateCaseStudy: protectedProcedure.input(z.object({
    creatorName: z.string(),
    niche: z.string(),
    results: z.object({
      metric: z.string(),
      before: z.string(),
      after: z.string(),
      timeframe: z.string(),
    }),
    story: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Write a compelling case study for ${input.creatorName} (${input.niche}):
Result: ${input.results.metric} went from ${input.results.before} to ${input.results.after} in ${input.results.timeframe}
Story: ${input.story}

Write a professional case study with: headline, challenge, solution, results, and testimonial quote.`,
      }],
      max_tokens: 600,
    });
    return { caseStudy: completion.choices[0].message.content };
  }),

  getCaseStudies: protectedProcedure.query(async () => {
    return {
      caseStudies: [
        { creator: "Creator A", result: "0 to $10k/month in 90 days", niche: "fitness" },
        { creator: "Creator B", result: "1k to 100k followers in 6 months", niche: "lifestyle" },
        { creator: "Creator C", result: "First $50k product launch", niche: "business" },
      ],
    };
  }),
});
