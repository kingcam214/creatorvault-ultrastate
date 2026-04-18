import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const autoHousingFinder = router({
  findHousing: protectedProcedure.input(z.object({
    location: z.string(), budget: z.number(), type: z.string(), requirements: z.array(z.string()),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Find housing options in ${input.location}:
Budget: $${input.budget}/month
Type: ${input.type}
Requirements: ${input.requirements.join(", ")}

Provide: search strategy, best neighborhoods, platforms to use, negotiation tips, and red flags to avoid.` }],
      max_tokens: 600,
    });
    return { results: completion.choices[0].message.content };
  }),
  generateHousingApplication: protectedProcedure.input(z.object({ applicantName: z.string(), income: z.number(), creditScore: z.number() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Write a strong rental application cover letter for ${input.applicantName} with $${input.income}/month income and ${input.creditScore} credit score. Make it compelling and professional.` }],
      max_tokens: 400,
    });
    return { letter: completion.choices[0].message.content };
  }),
  getRelocationGuide: protectedProcedure.input(z.object({ fromCity: z.string(), toCity: z.string() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Create a relocation guide from ${input.fromCity} to ${input.toCity}. Include: cost comparison, best neighborhoods, moving checklist, and creator community resources.` }],
      max_tokens: 600,
    });
    return { guide: completion.choices[0].message.content };
  }),
});

export const autoHousingFinderRouter = autoHousingFinder;
