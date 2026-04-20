import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const presentationBuilderRouter = router({
  buildPresentation: protectedProcedure.input(z.object({ title: z.string(), topic: z.string(), audience: z.string(), slides: z.number().default(10), style: z.string().optional() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Build a ${input.slides}-slide presentation:
Title: ${input.title}
Topic: ${input.topic}
Audience: ${input.audience}
Style: ${input.style || "professional"}

Create: slide-by-slide outline with title, key points, and visual suggestions for each slide.` }], max_tokens: 800 });
    return { presentation: c.choices[0].message.content };
  }),
  generateSlideContent: protectedProcedure.input(z.object({ slideTitle: z.string(), context: z.string(), slideType: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create content for a ${input.slideType} slide titled "${input.slideTitle}":
Context: ${input.context}

Provide: headline, 3-5 bullet points, and speaker notes.` }], max_tokens: 400 });
    return { content: c.choices[0].message.content };
  }),
  listTemplates: protectedProcedure.query(async () => ({ templates: [{ id: "pitch_deck", name: "Pitch Deck", slides: 10, style: "professional" }, { id: "webinar", name: "Webinar", slides: 15, style: "engaging" }, { id: "course", name: "Course Slides", slides: 20, style: "educational" }, { id: "keynote", name: "Keynote", slides: 12, style: "cinematic" }] })),
});