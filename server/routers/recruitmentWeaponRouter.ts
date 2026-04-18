import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const recruitmentWeaponRouter = router({
  generateRecruitmentMessage: protectedProcedure.input(z.object({
    targetCreator: z.string(),
    platform: z.string(),
    offer: z.string(),
    commissionRate: z.number(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Write a recruitment message to bring ${input.targetCreator} into the CreatorVault network:
Platform: ${input.platform}
Offer: ${input.offer}
Commission: ${input.commissionRate}%

Write a compelling, value-first message that highlights the opportunity. Make it personal and specific to their content.`,
      }],
      max_tokens: 300,
    });
    return { message: completion.choices[0].message.content };
  }),

  getRecruitmentStats: protectedProcedure.query(async ({ ctx }) => {
    const commissions = await db.db.select()
      .from(db.schema.recruiterCommissions)
      .where(eq(db.schema.recruiterCommissions.recruiterId, ctx.user.id))
      .limit(20);
    
    const total = commissions.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    return { totalEarned: total, recruits: commissions.length };
  }),

  buildRecruitmentFunnel: protectedProcedure.input(z.object({
    targetNiche: z.string(),
    incentive: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Build a creator recruitment funnel for ${input.targetNiche} creators:
Incentive: ${input.incentive}

Create: outreach sequence (5 touchpoints), objection handlers, and conversion script.`,
      }],
      max_tokens: 600,
    });
    return { funnel: completion.choices[0].message.content };
  }),
});
