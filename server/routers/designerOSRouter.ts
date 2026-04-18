import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const designerOSRouter = router({
  getDesignerDashboard: protectedProcedure.query(async ({ ctx }) => {
    return {
      activeProjects: 0,
      completedProjects: 0,
      totalEarnings: 0,
      pendingRevisions: 0,
      userId: ctx.user.id,
    };
  }),

  createProject: protectedProcedure.input(z.object({
    name: z.string(),
    client: z.string(),
    type: z.string(),
    deadline: z.string().optional(),
    budget: z.number().optional(),
  })).mutation(async ({ ctx, input }) => {
    return {
      id: Date.now(),
      ...input,
      userId: ctx.user.id,
      status: "active",
      createdAt: new Date().toISOString(),
    };
  }),

  generateProjectProposal: protectedProcedure.input(z.object({
    projectType: z.string(),
    clientName: z.string(),
    scope: z.string(),
    timeline: z.string(),
    rate: z.number(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Write a professional design project proposal:
Project: ${input.projectType}
Client: ${input.clientName}
Scope: ${input.scope}
Timeline: ${input.timeline}
Rate: $${input.rate}

Include: project overview, deliverables, timeline breakdown, pricing, and terms.`,
      }],
      max_tokens: 600,
    });
    return { proposal: completion.choices[0].message.content };
  }),
});
