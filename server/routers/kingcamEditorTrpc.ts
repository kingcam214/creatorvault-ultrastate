import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const kingcamEditorTrpc = router({
  generateEditSuggestions: protectedProcedure.input(z.object({
    content: z.string(), contentType: z.string(), platform: z.string(), goal: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Review and improve this ${input.contentType} for ${input.platform}:

${input.content}

Goal: ${input.goal}

Provide: specific edits, improved version, and explanation of changes.` }],
      max_tokens: 600,
    });
    return { suggestions: completion.choices[0].message.content };
  }),
  improveHook: protectedProcedure.input(z.object({ hook: z.string(), platform: z.string() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Improve this ${input.platform} hook:
"${input.hook}"

Provide 3 stronger alternatives that stop the scroll.` }],
      max_tokens: 300,
    });
    return { improved: completion.choices[0].message.content };
  }),
  checkContentScore: protectedProcedure.input(z.object({ content: z.string(), platform: z.string() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Score this ${input.platform} content (1-10) on: hook strength, value delivery, engagement potential, CTA effectiveness, and overall quality. Return JSON with scores and brief explanations.

Content: ${input.content}` }],
      max_tokens: 400,
    });
    try {
      return JSON.parse(completion.choices[0].message.content || "{}");
    } catch {
      return { overall: 7, feedback: completion.choices[0].message.content };
    }
  }),
});

export const kingcamEditorRouter = kingcamEditorTrpc;
