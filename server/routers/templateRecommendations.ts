import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const templateRecommendations = router({
  getRecommendations: protectedProcedure.input(z.object({ useCase: z.string(), platform: z.string(), style: z.string().optional() })).query(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Recommend templates for ${input.useCase} on ${input.platform}${input.style ? ` in ${input.style} style` : ""}. List 5 template types with descriptions.` }], max_tokens: 400 });
    return { recommendations: c.choices[0].message.content };
  }),
  getPopularTemplates: protectedProcedure.query(async () => ({ templates: [{ id: "viral_hook", name: "Viral Hook Template", uses: 1250 }, { id: "product_launch", name: "Product Launch", uses: 890 }, { id: "story_arc", name: "Story Arc", uses: 760 }, { id: "educational", name: "Educational Series", uses: 650 }] })),
  saveTemplate: protectedProcedure.input(z.object({ name: z.string(), content: z.string(), category: z.string() })).mutation(async ({ ctx, input }) => ({ id: Date.now(), ...input, userId: ctx.user.id })),
});
export const templateRecommendationsRouter = templateRecommendations;
