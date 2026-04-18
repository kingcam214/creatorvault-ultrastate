import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const brandExtractionRouter = router({
  extractFromContent: protectedProcedure.input(z.object({
    content: z.array(z.string()),
    platform: z.string().optional(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Analyze these content samples and extract the brand identity:
${input.content.slice(0, 5).join("\n---\n")}

Extract: tone of voice, recurring themes, audience assumptions, brand personality, and content style guide.`,
      }],
      max_tokens: 600,
    });
    return { extracted: completion.choices[0].message.content };
  }),

  extractFromProfile: protectedProcedure.input(z.object({
    bio: z.string(),
    username: z.string(),
    platform: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Extract brand identity from this ${input.platform} profile:
Username: ${input.username}
Bio: ${input.bio}

Identify: niche, target audience, brand personality, and content direction.`,
      }],
      max_tokens: 400,
    });
    return { profile: completion.choices[0].message.content };
  }),
});
