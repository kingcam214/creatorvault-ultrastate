import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const scriptToVideoRouter = router({
  convertScriptToVideo: protectedProcedure.input(z.object({ script: z.string(), style: z.string(), platform: z.string() })).mutation(async ({ ctx, input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Convert this script to a video production plan:
${input.script}

Style: ${input.style}
Platform: ${input.platform}

Create: shot list, visual directions, transition notes, and post-production checklist.` }], max_tokens: 600 });
    return { productionPlan: c.choices[0].message.content, jobId: Date.now(), userId: ctx.user.id };
  }),
  getConversionJobs: protectedProcedure.query(async ({ ctx }) => ({ jobs: [], userId: ctx.user.id })),
  generateStoryboard: protectedProcedure.input(z.object({ script: z.string(), scenes: z.number().default(5) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a ${input.scenes}-scene storyboard for:
${input.script}

For each scene: visual description, camera angle, action, and dialogue/narration.` }], max_tokens: 600 });
    return { storyboard: c.choices[0].message.content };
  }),
});