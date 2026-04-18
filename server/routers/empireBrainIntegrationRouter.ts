import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const empireBrainIntegrationRouter = router({
  integrate: protectedProcedure.input(z.object({ systems: z.array(z.string()), goal: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create an integration plan for empire systems: ${input.systems.join(", ")} to achieve: ${input.goal}. Include data flow, automation triggers, and success metrics.` }], max_tokens: 500 });
    return { plan: c.choices[0].message.content };
  }),
  getIntegrations: protectedProcedure.query(async ({ ctx }) => ({ integrations: [], userId: ctx.user.id })),
  runDiagnostic: protectedProcedure.query(async () => ({ status: "healthy", systems: [], lastCheck: new Date().toISOString() })),
});