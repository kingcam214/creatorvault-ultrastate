import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const scriptAI = router({
  generateScript: protectedProcedure.input(z.object({ type: z.string(), topic: z.string(), duration: z.string(), platform: z.string(), tone: z.string().optional() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Write a ${input.duration} ${input.type} script for ${input.platform}:
Topic: ${input.topic}
Tone: ${input.tone || "engaging"}

Include: hook, main content with timestamps, B-roll suggestions, and CTA.` }], max_tokens: 700 });
    return { script: c.choices[0].message.content };
  }),
  improveScript: protectedProcedure.input(z.object({ script: z.string(), improvements: z.array(z.string()) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Improve this script by applying: ${input.improvements.join(", ")}:

${input.script}` }], max_tokens: 700 });
    return { improved: c.choices[0].message.content };
  }),
  generateHook: protectedProcedure.input(z.object({ topic: z.string(), platform: z.string(), count: z.number().default(5) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Generate ${input.count} powerful hooks for a ${input.platform} video about "${input.topic}". Each hook should stop the scroll in the first 3 seconds.` }], max_tokens: 400 });
    return { hooks: c.choices[0].message.content };
  }),
  convertToTeleprompter: protectedProcedure.input(z.object({ script: z.string(), pace: z.string().default("medium") })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Convert this script to teleprompter format for ${input.pace} reading pace:
${input.script}

Add: pause markers, emphasis marks, and breathing cues.` }], max_tokens: 700 });
    return { teleprompter: c.choices[0].message.content };
  }),
});
export const scriptAIRouter = scriptAI;
