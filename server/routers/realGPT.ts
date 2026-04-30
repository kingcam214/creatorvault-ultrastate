import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const realGPT = router({
  chat: protectedProcedure.input(z.object({ message: z.string(), history: z.array(z.object({ role: z.string(), content: z.string() })).optional(), mode: z.string().optional() })).mutation(async ({ ctx, input }) => {
    // @ts-ignore
    const messages: any[] = [{ role: "system", content: `You are RealGPT — an unfiltered, direct AI assistant for creators. Give real talk, real strategies, real results. No corporate speak. User: ${ctx.user.username || ctx.user.id}` }, ...(input.history || []).slice(-10), { role: "user", content: input.message }];
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages, max_tokens: 600 });
    return { response: c.choices[0].message.content };
  }),
  getCapabilities: protectedProcedure.query(async () => ({ capabilities: ["strategy", "copywriting", "business_advice", "content_creation", "negotiation", "marketing"], version: "1.0" })),
});
export const realGPTRouter = realGPT;
