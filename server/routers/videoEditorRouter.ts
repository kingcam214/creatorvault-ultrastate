import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const videoEditorRouter = router({
  generateEditPlan: protectedProcedure.input(z.object({ rawFootage: z.string(), targetDuration: z.string(), style: z.string(), platform: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create an edit plan for:
Raw footage: ${input.rawFootage}
Target duration: ${input.targetDuration}
Style: ${input.style}
Platform: ${input.platform}

Provide: cut list, transition suggestions, music mood, color grade direction, and text overlay plan.` }], max_tokens: 600 });
    return { editPlan: c.choices[0].message.content };
  }),
  getEditingPresets: protectedProcedure.query(async () => ({ presets: [{ id: "viral_short", name: "Viral Short", duration: "60s" }, { id: "youtube_long", name: "YouTube Long Form", duration: "10min" }, { id: "instagram_reel", name: "Instagram Reel", duration: "30s" }, { id: "tiktok_trend", name: "TikTok Trend", duration: "15s" }] })),
  generateCaptions: protectedProcedure.input(z.object({ transcript: z.string(), style: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Format this transcript as ${input.style} captions for video:
${input.transcript.slice(0, 500)}

Add: timing markers, emphasis on key words, and caption breaks.` }], max_tokens: 500 });
    return { captions: c.choices[0].message.content };
  }),
});