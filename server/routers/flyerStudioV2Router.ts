import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const flyerStudioV2Router = router({
  createFlyer: protectedProcedure.input(z.object({ type: z.string(), data: z.record(z.unknown()) })).mutation(async ({ ctx, input }) => ({ id: Date.now(), type: input.type, status: "created", userId: ctx.user.id })),
  getFlyers: protectedProcedure.query(async ({ ctx }) => ({ flyers: [], userId: ctx.user.id })),
  generateFlyerCopy: protectedProcedure.input(z.object({ event: z.string(), style: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create flyer copy for ${input.event} in ${input.style} style. Include headline, details, and CTA.` }], max_tokens: 300 });
    return { copy: c.choices[0].message.content };
  }),
  deleteFlyer: protectedProcedure.input(z.object({ flyerId: z.number() })).mutation(async ({ input }) => ({ deleted: true, flyerId: input.flyerId })),
});