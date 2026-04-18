import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const agentOrchestratorRouter = router({
  getAgents: protectedProcedure.query(async ({ ctx }) => {
    const agents = await db.db.select().from(db.schema.aiAgents).where(eq(db.schema.aiAgents.userId, ctx.user.id)).limit(20);
    return agents;
  }),
  createAgent: protectedProcedure.input(z.object({ name: z.string(), role: z.string(), capabilities: z.array(z.string()) })).mutation(async ({ ctx, input }) => {
    const [agent] = await db.db.insert(db.schema.aiAgents).values({ userId: ctx.user.id, name: input.name, role: input.role, capabilities: JSON.stringify(input.capabilities), status: "active", createdAt: new Date() }).$returningId();
    return { id: agent.id, name: input.name };
  }),
  orchestrateTask: protectedProcedure.input(z.object({ task: z.string(), agents: z.array(z.number()) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Orchestrate this task across ${input.agents.length} agents:
${input.task}

Create: task breakdown, agent assignments, execution order, and success criteria.` }], max_tokens: 500 });
    return { plan: c.choices[0].message.content, taskId: Date.now() };
  }),
  getAgentStatus: protectedProcedure.input(z.object({ agentId: z.number() })).query(async ({ input }) => ({ agentId: input.agentId, status: "idle", lastTask: null, tasksCompleted: 0 })),
});