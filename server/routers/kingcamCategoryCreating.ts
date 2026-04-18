import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const kingcamCategoryCreating = router({
  createCategory: protectedProcedure.input(z.object({ niche: z.string(), platform: z.string(), audience: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a new content category for KingCam in ${input.niche} on ${input.platform} for ${input.audience}. Include: category name, description, 10 content ideas, and monetization potential.` }], max_tokens: 500 });
    return { category: c.choices[0].message.content };
  }),
  getCategories: protectedProcedure.query(async () => ({ categories: ["music", "lifestyle", "business", "entertainment", "education", "fitness", "travel", "food"] })),
  buildCategoryContent: protectedProcedure.input(z.object({ category: z.string(), count: z.number().default(10) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Generate ${input.count} content ideas for the "${input.category}" category. Include title, format, and hook for each.` }], max_tokens: 500 });
    return { ideas: c.choices[0].message.content };
  }),
});
export const kingcamCategoryCreatingRouter = kingcamCategoryCreating;
