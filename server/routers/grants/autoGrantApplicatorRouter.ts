import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const autoGrantApplicatorRouter = router({
  findGrants: protectedProcedure.input(z.object({
    creatorType: z.string(), niche: z.string(), location: z.string(), fundingNeeded: z.number(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Find grants for a ${input.creatorType} creator in ${input.niche} based in ${input.location} needing $${input.fundingNeeded}:

List: 10 relevant grants with name, amount, deadline, eligibility, and application tips.` }],
      max_tokens: 700,
    });
    return { grants: completion.choices[0].message.content };
  }),
  generateGrantApplication: protectedProcedure.input(z.object({ grantName: z.string(), projectDescription: z.string(), budget: z.number(), impact: z.string() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Write a compelling grant application for ${input.grantName}:
Project: ${input.projectDescription}
Budget: $${input.budget}
Impact: ${input.impact}

Write a professional application with executive summary, project narrative, budget justification, and impact statement.` }],
      max_tokens: 800,
    });
    return { application: completion.choices[0].message.content };
  }),
  trackApplications: protectedProcedure.query(async ({ ctx }) => {
    return { applications: [], submitted: 0, pending: 0, awarded: 0, totalAwarded: 0 };
  }),
});
