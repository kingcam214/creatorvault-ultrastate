import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const hollywoodProductionRouter = router({
  createProductionBible: protectedProcedure.input(z.object({ projectTitle: z.string(), genre: z.string(), logline: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a production bible for "${input.projectTitle}":
Genre: ${input.genre}
Logline: ${input.logline}

Include: show overview, characters, world-building, episode structure, and tone guide.` }], max_tokens: 800 });
    return { bible: c.choices[0].message.content };
  }),
  generateCallSheet: protectedProcedure.input(z.object({ shootDate: z.string(), locations: z.array(z.string()), crew: z.array(z.string()) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a call sheet for ${input.shootDate}:
Locations: ${input.locations.join(", ")}
Crew: ${input.crew.join(", ")}

Format as a professional call sheet with times, locations, and crew assignments.` }], max_tokens: 500 });
    return { callSheet: c.choices[0].message.content };
  }),
  getBudgetTemplate: protectedProcedure.input(z.object({ projectType: z.string(), scale: z.string() })).query(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a budget template for a ${input.scale} ${input.projectType} production. Include all line items with typical cost ranges.` }], max_tokens: 500 });
    return { template: c.choices[0].message.content };
  }),
});
export const hollywoodRepurposingRouter = hollywoodProductionRouter;

export const hollywoodDistributionRouter = hollywoodProductionRouter;

export const hollywoodMonetizationRouter = hollywoodProductionRouter;

export const hollywoodCreatorRouter = hollywoodProductionRouter;

export const hollywoodAnalyticsRouter = hollywoodProductionRouter;
