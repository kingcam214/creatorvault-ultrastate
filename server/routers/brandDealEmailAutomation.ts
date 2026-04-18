import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const brandDealEmailAutomation = router({
  generateOutreachEmail: protectedProcedure.input(z.object({
    brandName: z.string(), brandNiche: z.string(), yourNiche: z.string(), followers: z.number(), proposedDeal: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Write a brand deal outreach email to ${input.brandName} (${input.brandNiche}):
My niche: ${input.yourNiche}
Followers: ${input.followers.toLocaleString()}
Proposed deal: ${input.proposedDeal}

Write a professional, compelling pitch that leads with value and includes a clear CTA.` }],
      max_tokens: 400,
    });
    return { email: completion.choices[0].message.content };
  }),
  generateFollowUpSequence: protectedProcedure.input(z.object({ brandName: z.string(), initialEmailDate: z.string(), dealValue: z.number() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Create a 5-email follow-up sequence for ${input.brandName} after initial outreach on ${input.initialEmailDate} for a $${input.dealValue} deal. Space emails appropriately and escalate urgency naturally.` }],
      max_tokens: 700,
    });
    return { sequence: completion.choices[0].message.content };
  }),
  generateNegotiationEmail: protectedProcedure.input(z.object({ brandName: z.string(), offeredAmount: z.number(), targetAmount: z.number(), justification: z.string() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Write a negotiation email to ${input.brandName}:
Their offer: $${input.offeredAmount}
My target: $${input.targetAmount}
Justification: ${input.justification}

Write a professional counter-offer that maintains the relationship while pushing for better terms.` }],
      max_tokens: 400,
    });
    return { email: completion.choices[0].message.content };
  }),
  generateContractEmail: protectedProcedure.input(z.object({ brandName: z.string(), dealTerms: z.string(), amount: z.number() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Write a deal confirmation email to ${input.brandName} for a $${input.amount} deal with terms: ${input.dealTerms}. Include deliverables summary and next steps.` }],
      max_tokens: 400,
    });
    return { email: completion.choices[0].message.content };
  }),
});

export const brandDealEmailAutomationRouter = brandDealEmailAutomation;
