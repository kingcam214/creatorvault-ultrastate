import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const storiesCompilationRouter = router({
  compileStories: protectedProcedure.input(z.object({ stories: z.array(z.string()), theme: z.string(), platform: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Compile these stories into a cohesive ${input.platform} story series:
Theme: ${input.theme}
Stories: ${input.stories.slice(0, 5).join(" | ")}

Create: narrative arc, transition suggestions, and engagement hooks between stories.` }], max_tokens: 500 });
    return { compilation: c.choices[0].message.content };
  }),
  generateStorySequence: protectedProcedure.input(z.object({ topic: z.string(), count: z.number().default(5), platform: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a ${input.count}-part story sequence about "${input.topic}" for ${input.platform}. Each story should build on the last and keep viewers engaged.` }], max_tokens: 500 });
    return { sequence: c.choices[0].message.content };
  }),
  getStoryTemplates: protectedProcedure.query(async () => ({ templates: [{ id: "day_in_life", name: "Day in the Life" }, { id: "behind_scenes", name: "Behind the Scenes" }, { id: "tutorial", name: "Tutorial Series" }, { id: "transformation", name: "Transformation Story" }] })),
});