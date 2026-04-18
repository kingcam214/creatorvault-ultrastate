import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const emmaVoiceRouter = router({
  generateVoiceScript: protectedProcedure.input(z.object({ message: z.string(), tone: z.string(), context: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "system", content: "You are Emma, a professional AI voice assistant for creators. Speak in a warm, professional, and encouraging tone." }, { role: "user", content: `Generate a voice script for: ${input.message}
Tone: ${input.tone}
Context: ${input.context}` }], max_tokens: 300 });
    return { script: c.choices[0].message.content };
  }),
  getVoiceSettings: protectedProcedure.query(async ({ ctx }) => ({ voice: "emma", speed: 1.0, pitch: 1.0, userId: ctx.user.id })),
  updateVoiceSettings: protectedProcedure.input(z.object({ voice: z.string().optional(), speed: z.number().optional(), pitch: z.number().optional() })).mutation(async ({ ctx, input }) => ({ updated: true, settings: input, userId: ctx.user.id })),
});