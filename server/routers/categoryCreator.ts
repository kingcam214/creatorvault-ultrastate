import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const categoryCreatorRouter = router({
  createCategory: protectedProcedure.input(z.object({
    niche: z.string(),
    existingCategories: z.array(z.string()).optional(),
    audience: z.string(),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Help create a new content category for a ${input.niche} creator:
Existing categories: ${(input.existingCategories || []).join(", ")}
Audience: ${input.audience}

Suggest: 5 unique category names, description for each, content examples, and why each would resonate with the audience.`,
      }],
      max_tokens: 600,
    });
    return { categories: completion.choices[0].message.content };
  }),

  buildCategoryContent: protectedProcedure.input(z.object({
    categoryName: z.string(),
    platform: z.string(),
    count: z.number().default(10),
  })).mutation(async ({ input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Generate ${input.count} content ideas for the "${input.categoryName}" category on ${input.platform}. Include title, hook, and format for each.`,
      }],
      max_tokens: 600,
    });
    return { ideas: completion.choices[0].message.content };
  }),
});
