import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { eq } from "drizzle-orm";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const kingcamCloneRouter = router({
  getKingcamClones: protectedProcedure.query(async ({ ctx }) => {
    const clones = await db.db.select().from(db.schema.creators).where(eq(db.schema.creators.userId, ctx.user.id)).limit(10);
    return { clones };
  }),
  createKingcamClone: protectedProcedure.input(z.object({ name: z.string(), style: z.string(), platforms: z.array(z.string()) })).mutation(async ({ ctx, input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Create a KingCam AI clone profile:
Name: ${input.name}
Style: ${input.style}
Platforms: ${input.platforms.join(", ")}

Define: personality, content approach, posting schedule, and monetization strategy.` }], max_tokens: 500 });
    const [clone] = await db.db.insert(db.schema.creators).values({ userId: ctx.user.id, name: input.name, niche: input.style, platform: input.platforms[0], aiProfile: c.choices[0].message.content || "", status: "active", createdAt: new Date() }).$returningId();
    return { id: clone.id, profile: c.choices[0].message.content };
  }),
  trainKingcamClone: protectedProcedure.input(z.object({ cloneId: z.number(), content: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Train AI clone on this content and extract voice/style patterns:
${input.content}` }], max_tokens: 400 });
    return { trained: true, cloneId: input.cloneId, styleGuide: c.choices[0].message.content };
  }),
});