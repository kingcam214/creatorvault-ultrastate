import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const kingcamScriptWriterRouter = router({
  writeScript: protectedProcedure.input(z.object({ type: z.string(), topic: z.string(), duration: z.string(), style: z.string(), platform: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "system", content: "You are KingCam's personal script writer. Write scripts that are authentic, engaging, and built to convert." }, { role: "user", content: `Write a ${input.duration} ${input.type} script for ${input.platform}:
Topic: ${input.topic}
Style: ${input.style}

Include: hook, main content, and strong CTA.` }], max_tokens: 700 });
    return { script: c.choices[0].message.content };
  }),
  improveScript: protectedProcedure.input(z.object({ script: z.string(), focus: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Improve this script focusing on ${input.focus}:

${input.script}` }], max_tokens: 700 });
    return { improved: c.choices[0].message.content };
  }),
  getScriptTemplates: protectedProcedure.query(async () => ({ templates: [{ id: "youtube_long", name: "YouTube Long Form" }, { id: "short_form", name: "Short Form Viral" }, { id: "sales_video", name: "Sales Video" }, { id: "podcast_intro", name: "Podcast Intro" }] })),
});