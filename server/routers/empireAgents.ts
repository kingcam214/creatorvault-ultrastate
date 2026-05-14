import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { sql } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// drizzle-orm mysql2: db.execute(sql`...`) returns [rows, fields] tuple.
function extractRows(result: any, label = "database query"): any[] {
  if (!result) throw new Error(`${label} returned no database response`);
  if (Array.isArray(result) && result.length >= 1 && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result;
  throw new Error(`${label} returned an unsupported database response shape`);
}

async function ensureAgentReportsTable() {
  await db.db.execute(sql`
    CREATE TABLE IF NOT EXISTS empire_agent_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      agent_slug VARCHAR(128) NOT NULL,
      agent_name VARCHAR(256) NOT NULL,
      report_type VARCHAR(100) NOT NULL,
      content LONGTEXT NOT NULL,
      revenue_impact DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_slug (agent_slug),
      INDEX idx_created (created_at)
    )
  `);
  await db.db.execute(sql`ALTER TABLE empire_agent_reports MODIFY content LONGTEXT NOT NULL`);
  await db.db.execute(sql`ALTER TABLE empire_agent_reports MODIFY agent_slug VARCHAR(128) NOT NULL`);
  await db.db.execute(sql`ALTER TABLE empire_agent_reports MODIFY agent_name VARCHAR(256) NOT NULL`);
  await db.db.execute(sql`ALTER TABLE empire_agent_reports MODIFY report_type VARCHAR(100) NOT NULL`);
}

async function insertAgentReport(agent: any, reportType: string, content: string, revenueImpact = 0) {
  await ensureAgentReportsTable();
  await db.db.execute(sql`
    INSERT INTO empire_agent_reports (agent_slug, agent_name, report_type, content, revenue_impact, created_at)
    VALUES (${agent.slug}, ${agent.name}, ${reportType}, ${content}, ${revenueImpact}, NOW())
  `);
}

async function getAgentById(agentId: number) {
  const result = await db.db.execute(sql`SELECT * FROM empire_agents WHERE id = ${agentId} LIMIT 1`);
  const agent = extractRows(result)[0];
  if (!agent) throw new Error(`Empire agent ${agentId} was not found in the database`);
  return agent;
}

export const empireAgents = router({
  getAgents: protectedProcedure.query(async () => {
    const result = await db.db.execute(sql`
      SELECT ea.*, ee.name as entity_name
      FROM empire_agents ea
      LEFT JOIN empire_entities ee ON ea.entity_id = ee.id
      ORDER BY ea.status DESC, ea.id ASC
      LIMIT 200
    `);
    return extractRows(result);
  }),

  deployAgent: protectedProcedure
    .input(z.object({ agentId: z.number(), mission: z.string().min(3), targets: z.array(z.string()).default([]) }))
    .mutation(async ({ input }) => {
      const agent = await getAgentById(input.agentId);
      const prompt = [
        `Agent: ${agent.name}`,
        `Slug: ${agent.slug}`,
        `Current Status: ${agent.status}`,
        `Mission: ${input.mission}`,
        `Targets: ${input.targets.length ? input.targets.join(", ") : "No explicit targets supplied"}`,
        `Known Tasks: ${agent.tasks ?? "[]"}`,
        `Required Outputs: ${agent.outputs ?? "[]"}`,
        "Create a production execution plan with concrete steps, measurable success metrics, required data sources, owner approval gates, and the next live action. Do not invent completed work.",
      ].join("\n");

      const c = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
      });
      const plan = c.choices[0].message.content?.trim();
      if (!plan) throw new Error(`OpenAI returned an empty deployment plan for ${agent.slug}`);

      await db.db.execute(sql`UPDATE empire_agents SET status = 'active' WHERE id = ${input.agentId}`);
      await insertAgentReport(agent, "deployment_plan", plan);

      return {
        deployed: true,
        agentId: input.agentId,
        agentSlug: agent.slug,
        agentName: agent.name,
        status: "active",
        mission: input.mission,
        targets: input.targets,
        plan,
      };
    }),

  getAgentReports: protectedProcedure
    .input(z.object({ agentSlug: z.string().optional(), limit: z.number().int().positive().max(100).default(50) }).optional())
    .query(async ({ input, ctx }) => {
      await ensureAgentReportsTable();
      const limit = input?.limit ?? 50;
      const result = input?.agentSlug
        ? await db.db.execute(sql`SELECT * FROM empire_agent_reports WHERE agent_slug = ${input.agentSlug} ORDER BY created_at DESC LIMIT ${limit}`)
        : await db.db.execute(sql`SELECT * FROM empire_agent_reports ORDER BY created_at DESC LIMIT ${limit}`);
      return { reports: extractRows(result), userId: ctx.user.id };
    }),

  stopAgent: protectedProcedure.input(z.object({ agentId: z.number(), reason: z.string().optional() })).mutation(async ({ input }) => {
    const agent = await getAgentById(input.agentId);
    await db.db.execute(sql`UPDATE empire_agents SET status = 'inactive', paused_until = NULL WHERE id = ${input.agentId}`);
    await insertAgentReport(agent, "agent_stopped", `Agent stopped by owner${input.reason ? `: ${input.reason}` : "."}`);
    return { stopped: true, agentId: input.agentId, agentSlug: agent.slug, agentName: agent.name, status: "inactive" };
  }),

  getActiveChallenge: protectedProcedure.query(async () => {
    const result = await db.db.execute(sql`
      SELECT * FROM empire_challenges WHERE status = 'active' ORDER BY week_number ASC LIMIT 1
    `);
    const rows = extractRows(result);
    return rows[0] ?? null;
  }),

  getEntityMap: protectedProcedure.query(async () => {
    const entitiesResult = await db.db.execute(sql`SELECT * FROM empire_entities ORDER BY id ASC`);
    const entities = extractRows(entitiesResult);

    const agentsResult = await db.db.execute(sql`
      SELECT id, name, slug, entity_id, status, is_for_sale, base_price_cents,
             total_revenue_generated, win_rate, swarm_role, consecutive_failures
      FROM empire_agents ORDER BY entity_id ASC, id ASC
    `);
    const agents = extractRows(agentsResult);

    const entityMap = entities.map((entity: any) => ({
      ...entity,
      agents: agents.filter((a: any) => a.entity_id === entity.id),
    }));

    return { entities: entityMap, totalAgents: agents.length };
  }),

  getEmpireAgents: protectedProcedure.query(async () => {
    const result = await db.db.execute(sql`
      SELECT ea.*, ee.name as entity_name, ee.type as entity_type
      FROM empire_agents ea
      LEFT JOIN empire_entities ee ON ea.entity_id = ee.id
      ORDER BY ea.status DESC, ea.id ASC
    `);
    return extractRows(result);
  }),

  getChallengeProgress: protectedProcedure.query(async () => {
    const challengeResult = await db.db.execute(sql`SELECT * FROM empire_challenges ORDER BY week_number ASC`);
    const challenges = extractRows(challengeResult);

    const txResult = await db.db.execute(sql`
      SELECT challenge_id, SUM(amount) as total, COUNT(*) as cnt
      FROM empire_challenge_transactions
      GROUP BY challenge_id
    `);
    const txRows = extractRows(txResult);

    return challenges.map((c: any) => {
      const tx = txRows.find((t: any) => t.challenge_id === c.id);
      return {
        ...c,
        transaction_count: Number(tx?.cnt ?? 0),
        verified_revenue: parseFloat(tx?.total ?? "0"),
      };
    });
  }),
});

export const empireAgentsRouter = empireAgents;
