import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

const DUBBING_HOLD_MESSAGE = "Voice direction is held until CreatorVault can analyze the saved source, create a governed spoken track, and return a real playable dub. No language model or audio provider was called.";

export const dubbingAIRouter = router({
  generateDubbingScript: protectedProcedure.input(z.object({
    originalScript: z.string(),
    sourceLanguage: z.string(),
    targetLanguage: z.string(),
    preserveTiming: z.boolean().default(true),
  })).mutation(async () => {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: DUBBING_HOLD_MESSAGE,
    });
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
      availability: "held",
      message: DUBBING_HOLD_MESSAGE,
    };
  }),
});
