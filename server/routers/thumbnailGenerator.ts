import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const thumbnailGenerator = router({
  generateThumbnailConcept: protectedProcedure.input(z.object({ videoTitle: z.string(), niche: z.string(), style: z.string(), platform: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Design a high-CTR thumbnail for:
Video: "${input.videoTitle}"
Niche: ${input.niche}
Style: ${input.style}
Platform: ${input.platform}

Describe: visual layout, text overlay, color scheme, facial expression if applicable, and psychological triggers used.` }], max_tokens: 400 });
    return { concept: c.choices[0].message.content };
  }),
  generateThumbnailText: protectedProcedure.input(z.object({ videoTitle: z.string(), count: z.number().default(5) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Generate ${input.count} thumbnail text options for: "${input.videoTitle}". Each should be 3-5 words max, high contrast, and click-worthy.` }], max_tokens: 200 });
    return { options: c.choices[0].message.content };
  }),
  analyzeThumbnail: protectedProcedure.input(z.object({ imageUrl: z.string(), platform: z.string() })).mutation(async ({ input }) => ({ imageUrl: input.imageUrl, score: 7, feedback: "Connect vision API for detailed thumbnail analysis", suggestions: ["Add more contrast", "Larger text", "Brighter colors"] })),
  getThumbnailTemplates: protectedProcedure.query(async () => ({ templates: [{ id: "face_text", name: "Face + Text" }, { id: "bold_text", name: "Bold Text Only" }, { id: "split_screen", name: "Split Screen" }, { id: "before_after", name: "Before/After" }] })),
});
export const thumbnailGeneratorRouter = thumbnailGenerator;
