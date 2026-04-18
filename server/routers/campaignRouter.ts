import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const campaignRouter = router({
  getCampaigns: protectedProcedure.query(async ({ ctx }) => {
    const campaigns = await db.db.select()
      .from(db.schema.adCampaigns)
      .where(eq(db.schema.adCampaigns.userId, ctx.user.id))
      .orderBy(desc(db.schema.adCampaigns.createdAt))
      .limit(20);
    return campaigns;
  }),

  createCampaign: protectedProcedure.input(z.object({
    name: z.string(),
    objective: z.string(),
    budget: z.number(),
    platforms: z.array(z.string()),
    startDate: z.string(),
    endDate: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const [campaign] = await db.db.insert(db.schema.adCampaigns).values({
      userId: ctx.user.id,
      name: input.name,
      objective: input.objective,
      budget: input.budget.toString(),
      platforms: JSON.stringify(input.platforms),
      status: "draft",
      startDate: new Date(input.startDate),
      createdAt: new Date(),
    }).$returningId();
    return { id: campaign.id, ...input };
  }),

  generateCampaignStrategy: protectedProcedure.input(z.object({
    objective: z.string(),
    budget: z.number(),
    audience: z.string(),
    duration: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Create a campaign strategy:
Objective: ${input.objective}
Budget: $${input.budget}
Audience: ${input.audience}
Duration: ${input.duration}

Provide: channel mix, budget allocation, content types, KPIs, and week-by-week execution plan.`,
      }],
      max_tokens: 600,
    });
    return { strategy: completion.choices[0].message.content };
  }),
});
