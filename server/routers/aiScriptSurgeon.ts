import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const aiScriptSurgeonRouter = router({
  surgeonEdit: protectedProcedure.input(z.object({
    script: z.string(),
    issues: z.array(z.enum(["too_long", "weak_hook", "no_cta", "boring", "off_brand", "unclear"])).optional(),
    targetLength: z.number().optional(),
    platform: z.string().optional(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `You are a script surgeon. Diagnose and fix this script:

ORIGINAL SCRIPT:
${input.script}

Issues to fix: ${(input.issues || []).join(", ") || "general improvement"}
Target length: ${input.targetLength ? `${input.targetLength} words` : "optimize for platform"}
Platform: ${input.platform || "general"}

Provide: 1) Diagnosis of what's wrong, 2) Surgically edited version, 3) What you changed and why.`,
      }],
      max_tokens: 900,
    });
    return { result: completion.choices[0].message.content };
  }),

  improveHook: protectedProcedure.input(z.object({
    currentHook: z.string(),
    topic: z.string(),
    platform: z.string(),
    count: z.number().default(5),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Improve this hook and generate ${input.count} alternatives for ${input.platform}:
Current hook: "${input.currentHook}"
Topic: ${input.topic}

Each hook should be stronger, more scroll-stopping, and platform-optimized.`,
      }],
      max_tokens: 400,
    });
    return { hooks: completion.choices[0].message.content };
  }),
});
