import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const storyRouter = router({
  getStories: protectedProcedure.query(async ({ ctx }) => {
    const stories = await db.db.select().from(db.schema.content).where(eq(db.schema.content.userId, ctx.user.id)).orderBy(desc(db.schema.content.createdAt)).limit(20);
    return stories.filter(s => s.type === "story");
  }),
  createStory: protectedProcedure.input(z.object({ content: z.string(), platform: z.string(), mediaUrl: z.string().optional(), duration: z.number().optional() })).mutation(async ({ ctx, input }) => {
    const [story] = await db.db.insert(db.schema.content).values({ userId: ctx.user.id, body: input.content, platform: input.platform, type: "story", status: "active", createdAt: new Date() }).$returningId();
    return { id: story.id, ...input };
  }),
  generateStoryIdeas: protectedProcedure.input(z.object({ niche: z.string(), platform: z.string(), count: z.number().default(10) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Generate ${input.count} story ideas for a ${input.niche} creator on ${input.platform}. Include: concept, visual direction, and engagement hook for each.` }], max_tokens: 500 });
    return { ideas: c.choices[0].message.content };
  }),
});