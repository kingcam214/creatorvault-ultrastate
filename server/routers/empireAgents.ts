import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { sql } from "drizzle-orm";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const empireAgents = router({
  getAgents: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Use empire_agents table (raw SQL since drizzle schema may not have aiAgents)
      const result = await db.db.execute(sql`SELECT * FROM empire_agents WHERE status = 'active' LIMIT 20`);
      const rows = Array.isArray(result) ? result : (result as any)[0] ?? [];
      return rows;
    } catch (e) { return []; }
  }),
  deployAgent: protectedProcedure.input(z.object({ agentId: z.number(), mission: z.string(), targets: z.array(z.string()) })).mutation(async ({ input }) => {
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: `Deploy agent #${input.agentId} for mission: ${input.mission}\nTargets: ${input.targets.join(", ")}\nCreate execution plan with steps, timeline, and success metrics.` }], max_tokens: 400 });
    return { deployed: true, agentId: input.agentId, plan: c.choices[0].message.content };
  }),
  getAgentReports: protectedProcedure.query(async ({ ctx }) => ({ reports: [], userId: ctx.user.id })),
  stopAgent: protectedProcedure.input(z.object({ agentId: z.number() })).mutation(async ({ input }) => ({ stopped: true, agentId: input.agentId })),

  // ── NEW: getActiveChallenge ────────────────────────────────────────────────
  // Used by OwnerCockpit and KingHome to show the $5k challenge progress bar
  getActiveChallenge: protectedProcedure.query(async () => {
    try {
      const result = await db.db.execute(sql`
        SELECT * FROM empire_challenges WHERE status = 'active' ORDER BY week_number ASC LIMIT 1
      `);
      const rows = Array.isArray(result) ? result : (result as any)[0] ?? [];
      return rows[0] ?? null;
    } catch (e) {
      console.error("[empireAgents.getActiveChallenge]", e);
      return null;
    }
  }),

  // ── NEW: getEntityMap ──────────────────────────────────────────────────────
  // Used by KingCamCommandCenter to show the empire entity hierarchy
  getEntityMap: protectedProcedure.query(async () => {
    try {
      const entitiesResult = await db.db.execute(sql`SELECT * FROM empire_entities ORDER BY id ASC`);
      const entities = Array.isArray(entitiesResult) ? entitiesResult : (entitiesResult as any)[0] ?? [];

      const agentsResult = await db.db.execute(sql`
        SELECT id, name, slug, entity_id, status, is_for_sale, base_price_cents,
               total_revenue_generated, win_rate, swarm_role, consecutive_failures
        FROM empire_agents ORDER BY entity_id ASC, id ASC
      `);
      const agents = Array.isArray(agentsResult) ? agentsResult : (agentsResult as any)[0] ?? [];

      // Group agents by entity
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

  // ── NEW: getEmpireAgents ───────────────────────────────────────────────────
  // Full list of empire agents from the empire_agents table (not aiAgents)
  getEmpireAgents: protectedProcedure.query(async () => {
    try {
      const result = await db.db.execute(sql`
        SELECT ea.*, ee.name as entity_name, ee.type as entity_type
        FROM empire_agents ea
        LEFT JOIN empire_entities ee ON ea.entity_id = ee.id
        ORDER BY ea.status DESC, ea.id ASC
      `);
      const rows = Array.isArray(result) ? result : (result as any)[0] ?? [];
      return rows;
    } catch (e) {
      console.error("[empireAgents.getEmpireAgents]", e);
      return [];
    }
  }),

  // ── NEW: getChallengeProgress ──────────────────────────────────────────────
  getChallengeProgress: protectedProcedure.query(async () => {
    try {
      const challengeResult = await db.db.execute(sql`SELECT * FROM empire_challenges ORDER BY week_number ASC`);
      const challenges = Array.isArray(challengeResult) ? challengeResult : (challengeResult as any)[0] ?? [];

      const txResult = await db.db.execute(sql`
        SELECT challenge_id, SUM(amount) as total, COUNT(*) as cnt
        FROM empire_challenge_transactions
        GROUP BY challenge_id
      `);
      const txRows = Array.isArray(txResult) ? txResult : (txResult as any)[0] ?? [];

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
