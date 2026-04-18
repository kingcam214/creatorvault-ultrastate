import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const creatorVideoEditorRouter = router({
  generateEditingScript: protectedProcedure.input(z.object({
    videoDescription: z.string(),
    targetLength: z.number(),
    style: z.enum(["fast_paced", "cinematic", "educational", "vlog", "documentary"]),
    platform: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Create a video editing script/shot list:
Video: ${input.videoDescription}
Target Length: ${input.targetLength} seconds
Style: ${input.style}
Platform: ${input.platform}

Provide: 1) Opening hook (0-3s), 2) Scene breakdown with timestamps, 3) B-roll suggestions, 4) Music mood, 5) Text overlay suggestions, 6) Closing CTA.`,
      }],
      max_tokens: 600,
    });
    return { script: completion.choices[0].message.content };
  }),

  suggestTransitions: protectedProcedure.input(z.object({
    scenes: z.array(z.string()),
    style: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Suggest transitions between these scenes for a ${input.style} video:
${input.scenes.map((s, i) => `Scene ${i + 1}: ${s}`).join("\n")}

For each transition, suggest: type (cut, dissolve, wipe, etc.), timing, and any visual effects.`,
      }],
      max_tokens: 400,
    });
    return { transitions: completion.choices[0].message.content };
  }),

  generateCaptions: protectedProcedure.input(z.object({
    transcript: z.string(),
    style: z.enum(["standard", "bold", "minimal", "animated"]),
    platform: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Format these captions for ${input.platform} in ${input.style} style:
${input.transcript}

Break into short, readable segments. Highlight key words. Format for maximum readability on mobile.`,
      }],
      max_tokens: 500,
    });
    return { captions: completion.choices[0].message.content };
  }),
});
