import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const greatestShowStudioRouter = router({
  setupStudio: protectedProcedure.input(z.object({ showName: z.string(), equipment: z.array(z.string()), budget: z.number() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Design a studio setup for "${input.showName}":
Available equipment: ${input.equipment.join(", ")}
Budget: $${input.budget}

Provide: optimal layout, lighting setup, audio configuration, and upgrade priorities.` }], max_tokens: 500 });
    return { setup: c.choices[0].message.content };
  }),
  getStudioTemplates: protectedProcedure.query(async () => ({ templates: [{ name: "Home Studio", budget: 500 }, { name: "Pro Studio", budget: 5000 }, { name: "Mobile Studio", budget: 1000 }] })),
});