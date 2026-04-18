import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const brollGeneratorRouter = router({
  generateBrollList: protectedProcedure.input(z.object({
    script: z.string(),
    videoType: z.string(),
    style: z.enum(["cinematic", "documentary", "vlog", "corporate"]).default("cinematic"),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Generate a B-roll shot list for this script:
Script: ${input.script}
Type: ${input.videoType}
Style: ${input.style}

For each section of the script, suggest: specific B-roll shots, camera angles, movement, and stock footage search terms.`,
      }],
      max_tokens: 600,
    });
    return { brollList: completion.choices[0].message.content };
  }),

  suggestStockFootage: protectedProcedure.input(z.object({
    scene: z.string(),
    mood: z.string(),
    count: z.number().default(5),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Suggest ${input.count} stock footage search terms for:
Scene: ${input.scene}
Mood: ${input.mood}

Provide specific, searchable terms for Pexels, Unsplash, and Shutterstock.`,
      }],
      max_tokens: 300,
    });
    return { suggestions: completion.choices[0].message.content };
  }),
});
