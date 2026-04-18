import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const imageLabRouter = router({
  generateImagePrompt: protectedProcedure.input(z.object({ concept: z.string(), style: z.string(), platform: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a detailed image generation prompt for:
Concept: ${input.concept}
Style: ${input.style}
Platform: ${input.platform}

Write a detailed, specific prompt optimized for AI image generation.` }], max_tokens: 300 });
    return { prompt: c.choices[0].message.content };
  }),
  analyzeImage: protectedProcedure.input(z.object({ imageUrl: z.string(), analysisType: z.string() })).mutation(async ({ input }) => ({ imageUrl: input.imageUrl, analysis: `Image analysis for ${input.analysisType} - connect to vision API for full analysis`, suggestions: [] })),
  getImageStyles: protectedProcedure.query(async () => ({ styles: ["photorealistic", "cinematic", "illustration", "minimalist", "bold", "vintage", "futuristic", "editorial"] })),
  batchGeneratePrompts: protectedProcedure.input(z.object({ concepts: z.array(z.string()), style: z.string() })).mutation(async ({ input }) => {
    const prompts = input.concepts.slice(0, 5).map(c => ({ concept: c, prompt: `${input.style} style: ${c}, high quality, professional` }));
    return { prompts };
  }),
});