import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const smartCaptions = router({
  generateCaption: protectedProcedure.input(z.object({ content: z.string(), platform: z.string(), tone: z.string().optional(), includeHashtags: z.boolean().default(true) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Write a smart caption for ${input.platform}:
Content: ${input.content}
Tone: ${input.tone || "engaging"}
${input.includeHashtags ? "Include relevant hashtags." : "No hashtags."}

Make it scroll-stopping and authentic.` }], max_tokens: 300 });
    return { caption: c.choices[0].message.content };
  }),
  generateCaptionVariants: protectedProcedure.input(z.object({ content: z.string(), platform: z.string(), count: z.number().default(3) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Generate ${input.count} different caption variants for this ${input.platform} content:
${input.content}

Each should have a different angle/tone.` }], max_tokens: 400 });
    return { variants: c.choices[0].message.content };
  }),
  analyzeCaption: protectedProcedure.input(z.object({ caption: z.string(), platform: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Analyze this ${input.platform} caption and score it:
"${input.caption}"

Score (1-10): hook, clarity, engagement potential, CTA strength. Provide improvement suggestions.` }], max_tokens: 300 });
    return { analysis: c.choices[0].message.content };
  }),
});
export const smartCaptionsRouter = smartCaptions;
