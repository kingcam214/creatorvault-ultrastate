import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const categoryCreatorRouters = router({
  createCourseCategory: protectedProcedure.input(z.object({ name: z.string(), description: z.string(), niche: z.string() })).mutation(async ({ ctx, input }) => ({ id: Date.now(), name: input.name, description: input.description, niche: input.niche, userId: ctx.user.id })),
  getCourseCategories: protectedProcedure.query(async () => ({ categories: [{ id: 1, name: "Content Creation" }, { id: 2, name: "Business" }, { id: 3, name: "Marketing" }, { id: 4, name: "Technology" }, { id: 5, name: "Personal Development" }] })),
  generateCategoryContent: protectedProcedure.input(z.object({ category: z.string(), level: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create course content for ${input.category} at ${input.level} level. Include: 5 module titles, learning objectives, and key skills taught.` }], max_tokens: 400 });
    return { content: c.choices[0].message.content };
  }),
});
export const aiCourseGeneratorRouter = categoryCreatorRouters;

export const liveCohortsRouter = categoryCreatorRouters;

export const skillVerificationRouter = categoryCreatorRouters;

export const mentorshipRouter = categoryCreatorRouters;

export const microCredentialsRouter = categoryCreatorRouters;

export const aiTutorRouter = categoryCreatorRouters;

export const jobPlacementRouter = categoryCreatorRouters;
