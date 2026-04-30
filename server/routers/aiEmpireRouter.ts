import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { eq, sql } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ENGINE_CONFIGS: Record<string, { name: string; isAI: boolean; target: number; unit: string; pricePoint: string }> = {
  presentation_empire: { name: "Presentation Empire", isAI: true, target: 15000, unit: "decks", pricePoint: "$497/deck" },
  agent_swarm: { name: "Agent Swarm", isAI: true, target: 10000, unit: "tasks", pricePoint: "$199-997/agent" },
  hollywood_ai: { name: "Hollywood AI", isAI: true, target: 8000, unit: "videos", pricePoint: "$297/video" },
  vaultu_auto_sales: { name: "VaultU Auto-Sales", isAI: true, target: 7000, unit: "enrollments", pricePoint: "$97-497/course" },
  recruitment_weapon: { name: "Recruitment Weapon", isAI: false, target: 10000, unit: "recruits", pricePoint: "$500-2k/recruit" },
};

export const aiEmpireRouter = router({
  getEmpireStatus: protectedProcedure.query(async ({ ctx }) => {
    const payments = await db.db.select().from(db.schema.payments).where(eq(db.schema.payments.userId, ctx.user.id)).limit(100);
    const revenue = payments.reduce((s: number, p: typeof payments[number]) => s + (Number(p.amount) || 0), 0);
    return { revenue, activeAgents: 0, automationLevel: "0%", empireScore: Math.min(100, Math.floor(revenue / 100)), userId: ctx.user.id };
  }),
  buildEmpire: protectedProcedure.input(z.object({
    goal: z.string(), budget: z.number(), timeline: z.string(), focus: z.array(z.string()),
  })).mutation(async ({ ctx, input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Build an AI-powered creator empire:\nGoal: ${input.goal}\nBudget: $${input.budget}\nTimeline: ${input.timeline}\nFocus areas: ${input.focus.join(", ")}\nCreate: empire architecture, AI agent deployment plan, automation roadmap, revenue projections, and 30/60/90 day milestones.` }],
      max_tokens: 800,
    });
    return { plan: completion.choices[0].message.content, userId: ctx.user.id };
  }),
  deployAgent: protectedProcedure.input(z.object({ agentType: z.string(), mission: z.string(), budget: z.number() })).mutation(async ({ ctx, input }) => {
    return { agentId: Date.now(), type: input.agentType, mission: input.mission, status: "deployed", userId: ctx.user.id };
  }),
  getEmpireAnalytics: protectedProcedure.query(async () => {
    return { totalRevenue: 0, activeStreams: 0, agentsDeployed: 0, contentProduced: 0, audienceReach: 0 };
  }),
  getEmpireDashboard: protectedProcedure.query(async () => {
    try {
      const revenueResult = await db.db.execute(sql`SELECT source, SUM(amount) as total, COUNT(*) as cnt FROM empire_challenge_transactions GROUP BY source`);
      const revenueRows = Array.isArray(revenueResult) ? revenueResult : (revenueResult as any)[0] ?? [];
      const engines: Record<string, any> = {};
      for (const [key, config] of Object.entries(ENGINE_CONFIGS)) {
        const row = revenueRows.find((r: any) => r.source === key);
        engines[key] = { name: config.name, isAI: config.isAI, revenue: parseFloat(row?.total ?? "0"), target: config.target, count: Number(row?.cnt ?? 0), unit: config.unit, pricePoint: config.pricePoint };
      }
      const aiRevenue = Object.entries(engines).filter(([k]) => ENGINE_CONFIGS[k]?.isAI).reduce((s, [, v]) => s + v.revenue, 0);
      const humanRevenue = Object.entries(engines).filter(([k]) => !ENGINE_CONFIGS[k]?.isAI).reduce((s, [, v]) => s + v.revenue, 0);
      const totalRevenue = aiRevenue + humanRevenue;
      const activityResult = await db.db.execute(sql`SELECT agent_id as engine, agent_name, outcome as result, revenue_generated as revenueImpact, created_at as createdAt FROM agent_telemetry_events ORDER BY created_at DESC LIMIT 20`);
      const recentActivity = Array.isArray(activityResult) ? activityResult : (activityResult as any)[0] ?? [];
      const historyResult = await db.db.execute(sql`SELECT DATE(recorded_at) as date, SUM(amount) as totalRevenue, SUM(CASE WHEN source != 'recruitment_weapon' THEN amount ELSE 0 END) as aiRevenue, SUM(CASE WHEN source = 'recruitment_weapon' THEN amount ELSE 0 END) as humanRevenue FROM empire_challenge_transactions GROUP BY DATE(recorded_at) ORDER BY date DESC LIMIT 30`);
      const dailyHistoryRaw = Array.isArray(historyResult) ? historyResult : (historyResult as any)[0] ?? [];
      const dailyHistory = dailyHistoryRaw.map((r: any) => ({ date: String(r.date), aiRevenue: parseFloat(r.aiRevenue) || 0, humanRevenue: parseFloat(r.humanRevenue) || 0, totalRevenue: parseFloat(r.totalRevenue) || 0, kingcamCut: (parseFloat(r.totalRevenue) || 0) * 0.7 }));
      const challengeResult = await db.db.execute(sql`SELECT * FROM empire_challenges WHERE status = 'active' LIMIT 1`);
      const challengeRows = Array.isArray(challengeResult) ? challengeResult : (challengeResult as any)[0] ?? [];
      const activeChallenge = challengeRows[0];
      const pipeline = activeChallenge ? { weeklyTarget: parseFloat(activeChallenge.target_revenue), weeklyRevenue: parseFloat(activeChallenge.current_revenue), weekTitle: activeChallenge.title, weekStatus: activeChallenge.status } : {};
      return { aiRevenue, humanRevenue, totalRevenue, kingcamCut: totalRevenue * 0.7, aiLoadPercent: totalRevenue > 0 ? Math.round((aiRevenue / totalRevenue) * 100) : 80, aiTarget: 40000, humanTarget: 10000, totalTarget: 50000, engines, pipeline, recentActivity, dailyHistory };
    } catch (e) {
      console.error("[aiEmpire.getEmpireDashboard]", e);
      return { aiRevenue: 0, humanRevenue: 0, totalRevenue: 0, kingcamCut: 0, aiLoadPercent: 80, aiTarget: 40000, humanTarget: 10000, totalTarget: 50000, engines: Object.fromEntries(Object.entries(ENGINE_CONFIGS).map(([k, v]) => [k, { ...v, revenue: 0, count: 0 }])), pipeline: {}, recentActivity: [], dailyHistory: [] };
    }
  }),
  triggerEngine: protectedProcedure.input(z.object({ engine: z.enum(["presentation_empire", "agent_swarm", "hollywood_ai", "vaultu_auto_sales", "recruitment_weapon", "daily_report"]) })).mutation(async ({ input }) => {
    const prompts: Record<string, string> = {
      presentation_empire: "You are the Presentation Empire AI. Generate a status report: decks sold today, top clients, revenue generated, and next 3 prospects to target.",
      agent_swarm: "You are the Agent Swarm coordinator. Report on swarm activity: agents active, tasks completed, revenue generated, and top performing agent.",
      hollywood_ai: "You are the Hollywood AI engine. Report on video content produced today: titles, platforms, estimated reach, and monetization actions.",
      vaultu_auto_sales: "You are the VaultU Auto-Sales engine. Report on course enrollments today: courses sold, student names/handles, revenue, and upsell opportunities.",
      recruitment_weapon: "You are the Recruitment Weapon. Report on DR recruits contacted today: names, backgrounds, interest level, and pipeline value.",
      daily_report: "You are the Empire Brain. Generate a comprehensive daily empire report: total revenue, top agents, challenges progress, wins, and tomorrow's priorities.",
    };
    const completion = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompts[input.engine] ?? `Run the ${input.engine} engine and report results.` }], max_tokens: 400 });
    const result = completion.choices[0].message.content ?? "Engine triggered.";
    const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    try {
      await db.db.execute(sql`INSERT INTO agent_telemetry_events (id, agent_id, agent_name, agent_category, task_type, status, started_at, finished_at, outcome, revenue_generated) VALUES (${eventId}, ${input.engine}, ${ENGINE_CONFIGS[input.engine]?.name ?? input.engine}, 'analytics', 'engine_trigger', 'success', ${now}, ${now}, ${result}, 0)`);
    } catch (e) { console.error("[aiEmpire.triggerEngine] telemetry failed", e); }
    return { engine: input.engine, result, triggered: true };
  }),
  logAIRevenue: protectedProcedure.input(z.object({ engine: z.enum(["presentation_empire", "agent_swarm", "hollywood_ai", "vaultu_auto_sales", "recruitment_weapon"]), amount: z.number().positive(), description: z.string().optional() })).mutation(async ({ input }) => {
    const challengeResult = await db.db.execute(sql`SELECT id FROM empire_challenges WHERE status = 'active' LIMIT 1`);
    const challengeRows = Array.isArray(challengeResult) ? challengeResult : (challengeResult as any)[0] ?? [];
    if (!challengeRows[0]) throw new Error("No active challenge");
    const challengeId = challengeRows[0].id;
    await db.db.execute(sql`INSERT INTO empire_challenge_transactions (challenge_id, amount, source, description) VALUES (${challengeId}, ${input.amount}, ${input.engine}, ${input.description ?? `${ENGINE_CONFIGS[input.engine]?.name} revenue`})`);
    await db.db.execute(sql`UPDATE empire_challenges SET current_revenue = current_revenue + ${input.amount}, status = CASE WHEN current_revenue + ${input.amount} >= target_revenue THEN 'met' ELSE status END, timestamp_met = CASE WHEN current_revenue + ${input.amount} >= target_revenue AND timestamp_met IS NULL THEN NOW() ELSE timestamp_met END WHERE id = ${challengeId}`);
    const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    await db.db.execute(sql`INSERT INTO agent_telemetry_events (id, agent_id, agent_name, agent_category, task_type, status, started_at, finished_at, outcome, revenue_generated) VALUES (${eventId}, ${input.engine}, ${ENGINE_CONFIGS[input.engine]?.name ?? input.engine}, 'sales', 'revenue_logged', 'success', ${now}, ${now}, ${input.description ?? `$${input.amount} logged from ${input.engine}`}, ${input.amount})`);
    return { success: true, amount: input.amount, engine: input.engine };
  }),
});
