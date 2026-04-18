import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const chicasEmpireRouter = router({
  buildEmpireStrategy: protectedProcedure.input(z.object({
    creatorType: z.string(),
    platforms: z.array(z.string()),
    goals: z.array(z.string()),
    currentFollowers: z.number().optional(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Build an empire strategy for a ${input.creatorType} creator:
Platforms: ${input.platforms.join(", ")}
Goals: ${input.goals.join(", ")}
Current reach: ${input.currentFollowers || 0} followers

Create a 90-day empire building plan with content strategy, monetization roadmap, and community building tactics.`,
      }],
      max_tokens: 700,
    });
    return { strategy: completion.choices[0].message.content };
  }),

  getEmpireResources: protectedProcedure.query(async () => {
    return {
      resources: [
        { title: "Content Calendar Template", type: "template" },
        { title: "Brand Deal Negotiation Guide", type: "guide" },
        { title: "Monetization Masterclass", type: "course" },
        { title: "Community Building Playbook", type: "playbook" },
      ],
    };
  }),
});
