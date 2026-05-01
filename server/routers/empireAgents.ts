import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { sql } from "drizzle-orm";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// drizzle-orm mysql2: db.execute(sql`...`) returns [rows, fields] tuple
// So result[0] is the actual rows array
function extractRows(result: any): any[] {
  if (!result) return [];
  // mysql2 returns [rows, fields] — result[0] is the rows
  if (Array.isArray(result) && result.length >= 1 && Array.isArray(result[0])) {
    return result[0] as any[];
  }
  // Some drizzle versions return the rows directly
  if (Array.isArray(result)) return result;
  return [];
}

export const empireAgents = router({
  getAgents: protectedProcedure.query(async () => {
    try {
      const result = await db.db.execute(sql`
        SELECT ea.*, ee.name as entity_name
        FROM empire_agents ea
        LEFT JOIN empire_entities ee ON ea.entity_id = ee.id
        ORDER BY ea.status DESC, ea.id ASC
        LIMIT 200
      `);
      return extractRows(result);
    } catch (e) { return []; }
  }),

  deployAgent: protectedProcedure.input(z.object({ agentId: z.number(), mission: z.string(), targets: z.array(z.string()) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Deploy agent #${input.agentId} for mission: ${input.mission}\nTargets: ${input.targets.join(", ")}\nCreate execution plan with steps, timeline, and success metrics.` }], max_tokens: 400 });
    return { deployed: true, agentId: input.agentId, plan: c.choices[0].message.content };
  }),

  getAgentReports: protectedProcedure.query(async ({ ctx }) => ({ reports: [], userId: ctx.user.id })),

  stopAgent: protectedProcedure.input(z.object({ agentId: z.number() })).mutation(async ({ input }) => ({ stopped: true, agentId: input.agentId })),

  // ── getActiveChallenge ────────────────────────────────────────────────────
  getActiveChallenge: protectedProcedure.query(async () => {
    try {
      const result = await db.db.execute(sql`
        SELECT * FROM empire_challenges WHERE status = 'active' ORDER BY week_number ASC LIMIT 1
      `);
      const rows = extractRows(result);
      return rows[0] ?? null;
    } catch (e) {
      console.error("[empireAgents.getActiveChallenge]", e);
      return null;
    }
  }),

  // ── getEntityMap ──────────────────────────────────────────────────────────
  getEntityMap: protectedProcedure.query(async () => {
    try {
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
    } catch (e) {
      console.error("[empireAgents.getEntityMap]", e);
      return { entities: [], totalAgents: 0 };
    }
  }),

  // ── getEmpireAgents ───────────────────────────────────────────────────────
  getEmpireAgents: protectedProcedure.query(async () => {
    try {
      const result = await db.db.execute(sql`
        SELECT ea.*, ee.name as entity_name, ee.type as entity_type
        FROM empire_agents ea
        LEFT JOIN empire_entities ee ON ea.entity_id = ee.id
        ORDER BY ea.status DESC, ea.id ASC
      `);
      return extractRows(result);
    } catch (e) {
      console.error("[empireAgents.getEmpireAgents]", e);
      return [];
    }
  }),

  // ── getChallengeProgress ──────────────────────────────────────────────────
  getChallengeProgress: protectedProcedure.query(async () => {
    try {
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
    } catch (e) {
      return [];
    }
  }),
});

export const empireAgentsRouter = empireAgents;
