import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const brandCoordinationRouter = router({
  coordinateCampaign: protectedProcedure.input(z.object({
    campaignName: z.string(),
    brands: z.array(z.string()),
    goal: z.string(),
    budget: z.number().optional(),
    timeline: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Coordinate a multi-brand campaign:
Campaign: ${input.campaignName}
Brands: ${input.brands.join(", ")}
Goal: ${input.goal}
Budget: $${input.budget || "TBD"}
Timeline: ${input.timeline}

Create: campaign brief, brand roles, content calendar, cross-promotion strategy, and success metrics.`,
      }],
      max_tokens: 700,
    });
    return { plan: completion.choices[0].message.content };
  }),

  getBrandPartners: protectedProcedure.query(async () => {
    return { partners: [], message: "Connect brands to see coordination opportunities" };
  }),
});
