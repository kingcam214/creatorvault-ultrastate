import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const videoLabProRouter = router({
  getJobs: protectedProcedure.query(async ({ ctx }) => {
    const jobs = await db.db.select().from(db.schema.videoGenerationJobs).where(eq(db.schema.videoGenerationJobs.userId, ctx.user.id)).orderBy(desc(db.schema.videoGenerationJobs.createdAt)).limit(20);
    return jobs;
  }),
  createJob: protectedProcedure.input(z.object({ type: z.string(), input: z.record(z.unknown()), priority: z.string().default("normal") })).mutation(async ({ ctx, input }) => {
    const [job] = await db.db.insert(db.schema.videoGenerationJobs).values({ userId: ctx.user.id, type: input.type, status: "queued", input: JSON.stringify(input.input), createdAt: new Date() }).$returningId();
    return { id: job.id, status: "queued" };
  }),
  generateVideoScript: protectedProcedure.input(z.object({ topic: z.string(), duration: z.string(), style: z.string() })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Generate a ${input.duration} video script about "${input.topic}" in ${input.style} style. Include hook, main content, and CTA.` }], max_tokens: 600 });
    return { script: c.choices[0].message.content };
  }),
  getCapabilities: protectedProcedure.query(async () => ({ capabilities: ["script_generation", "edit_planning", "caption_generation", "thumbnail_concepts"], version: "2.0" })),
});
