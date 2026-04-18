import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const dubbingAIRouter = router({
  generateDubbingScript: protectedProcedure.input(z.object({
    originalScript: z.string(),
    sourceLanguage: z.string(),
    targetLanguage: z.string(),
    preserveTiming: z.boolean().default(true),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Translate and adapt this script for dubbing from ${input.sourceLanguage} to ${input.targetLanguage}:

${input.originalScript}

${input.preserveTiming ? "Adapt the translation to match the original timing and lip movements where possible." : ""}
Maintain the emotional tone and cultural context.`,
      }],
      max_tokens: 700,
    });
    return { dubbedScript: completion.choices[0].message.content };
  }),

  getDubbingLanguages: protectedProcedure.query(async () => {
    return {
      languages: [
        { code: "es", name: "Spanish", nativeName: "Español" },
        { code: "fr", name: "French", nativeName: "Français" },
        { code: "pt", name: "Portuguese", nativeName: "Português" },
        { code: "de", name: "German", nativeName: "Deutsch" },
        { code: "ja", name: "Japanese", nativeName: "日本語" },
        { code: "zh", name: "Chinese", nativeName: "中文" },
        { code: "ar", name: "Arabic", nativeName: "العربية" },
        { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
      ],
    };
  }),
});
