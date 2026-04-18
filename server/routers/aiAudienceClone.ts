import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const aiAudienceClone = router({
  analyzeAudience: protectedProcedure.input(z.object({
    platform: z.string(), niche: z.string(), sampleComments: z.array(z.string()).optional(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Analyze this audience profile:
Platform: ${input.platform}
Niche: ${input.niche}
Sample comments: ${(input.sampleComments || []).slice(0, 5).join(" | ")}

Create: demographic profile, psychographic profile, pain points, desires, and content preferences.` }],
      max_tokens: 600,
    });
    return { profile: completion.choices[0].message.content };
  }),
  cloneAudiencePersona: protectedProcedure.input(z.object({ audienceProfile: z.string(), count: z.number().default(3) })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Based on this audience profile, create ${input.count} detailed audience personas:
${input.audienceProfile}

For each: name, age, occupation, goals, fears, and how they consume content.` }],
      max_tokens: 600,
    });
    return { personas: completion.choices[0].message.content };
  }),
  generateAudienceContent: protectedProcedure.input(z.object({ persona: z.string(), platform: z.string(), topic: z.string() })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Create ${input.platform} content about "${input.topic}" specifically for this audience persona:
${input.persona}` }],
      max_tokens: 400,
    });
    return { content: completion.choices[0].message.content };
  }),
});

export const aiAudienceCloneRouter = aiAudienceClone;
