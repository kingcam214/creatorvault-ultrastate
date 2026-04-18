import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const hollywoodReplacementRouter = router({
  createProductionPlan: protectedProcedure.input(z.object({ projectType: z.string(), budget: z.number(), timeline: z.string(), concept: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a Hollywood-level production plan for indie creators:
Project: ${input.projectType}
Budget: $${input.budget}
Timeline: ${input.timeline}
Concept: ${input.concept}

Provide: pre-production checklist, production schedule, post-production workflow, and distribution strategy.` }], max_tokens: 700 });
    return { plan: c.choices[0].message.content };
  }),
  generateScript: protectedProcedure.input(z.object({ genre: z.string(), concept: z.string(), length: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Write a ${input.length} ${input.genre} script outline:
Concept: ${input.concept}

Include: logline, character descriptions, act structure, and key scenes.` }], max_tokens: 700 });
    return { script: c.choices[0].message.content };
  }),
  getCastingIdeas: protectedProcedure.input(z.object({ roles: z.array(z.string()), budget: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Casting strategy for ${input.budget} budget production with roles: ${input.roles.join(", ")}. Include: where to find talent, audition process, and rate expectations.` }], max_tokens: 400 });
    return { casting: c.choices[0].message.content };
  }),
});