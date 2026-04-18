import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const empireAgents = router({
  getAgents: protectedProcedure.query(async ({ ctx }) => {
    const agents = await db.db.select().from(db.schema.aiAgents).where(eq(db.schema.aiAgents.userId, ctx.user.id)).limit(20);
    return agents;
  }),
  deployAgent: protectedProcedure.input(z.object({ agentId: z.number(), mission: z.string(), targets: z.array(z.string()) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Deploy agent #${input.agentId} for mission: ${input.mission}
Targets: ${input.targets.join(", ")}

Create execution plan with steps, timeline, and success metrics.` }], max_tokens: 400 });
    return { deployed: true, agentId: input.agentId, plan: c.choices[0].message.content };
  }),
  getAgentReports: protectedProcedure.query(async ({ ctx }) => ({ reports: [], userId: ctx.user.id })),
  stopAgent: protectedProcedure.input(z.object({ agentId: z.number() })).mutation(async ({ input }) => ({ stopped: true, agentId: input.agentId })),
});
export const empireAgentsRouter = empireAgents;
