import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const aiVideoDirector = router({
  directVideo: protectedProcedure.input(z.object({ concept: z.string(), genre: z.string(), budget: z.string(), duration: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Direct a ${input.duration} ${input.genre} video:
Concept: ${input.concept}
Budget: ${input.budget}

Provide: director's vision, shot list, crew requirements, location needs, and post-production plan.` }], max_tokens: 700 });
    return { direction: c.choices[0].message.content };
  }),
  generateShotList: protectedProcedure.input(z.object({ script: z.string(), style: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a detailed shot list for this ${input.style} video:
${input.script}

For each shot: shot type, angle, movement, subject, and duration.` }], max_tokens: 600 });
    return { shotList: c.choices[0].message.content };
  }),
});
export const aiVideoDirectorRouter = aiVideoDirector;
