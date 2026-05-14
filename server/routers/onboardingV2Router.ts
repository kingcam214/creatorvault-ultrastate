import { z } from "zod";
import { randomUUID } from "crypto";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { and, desc, eq, sql } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const V2_STEPS = ["profile-proof", "paid-offer", "content-upload", "telegram-drop", "buyer-followup"];

async function saveV2Artifact(userId: number, contentType: string, title: string, metadata: Record<string, unknown>) {
  const key = `${contentType}-${userId}-${randomUUID()}`;
  const [row] = await db.db.insert(db.schema.content).values({
    userId,
    title,
    description: JSON.stringify(metadata),
    fileUrl: `creatorvault://activation-v2/${key}`,
    fileKey: key,
    mimeType: "application/json",
    fileSize: Buffer.byteLength(JSON.stringify(metadata), "utf8"),
    contentType,
    status: "active",
    metadata,
  }).$returningId();
  return row.id;
}

async function ensureAgentReportsSchema() {
  await db.db.execute(sql`
    CREATE TABLE IF NOT EXISTS empire_agent_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      agent_id INT NULL,
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
  await db.db.execute(sql`ALTER TABLE empire_agent_reports MODIFY agent_id INT NULL`);
}

async function persistV2Report(userId: number, reportType: string, content: string, revenueImpact = 0) {
  await ensureAgentReportsSchema();
  const agentRowsResult = await db.db.execute(sql`SELECT id FROM empire_agents WHERE slug = 'creator-growth-agent' LIMIT 1`);
  const agentRows = Array.isArray(agentRowsResult) ? agentRowsResult : (agentRowsResult as any)[0] ?? [];
  const realAgentId = agentRows[0]?.id ? Number(agentRows[0].id) : null;
  await db.db.execute(sql`
    INSERT INTO empire_agent_reports (agent_id, agent_slug, agent_name, report_type, content, revenue_impact, created_at)
    VALUES (${realAgentId}, 'creator-growth-agent', 'Creator Growth Agent', ${reportType}, ${content}, ${revenueImpact}, NOW())
  `);
}

export const onboardingV2Router = router({
  startV2Onboarding: protectedProcedure.input(z.object({
    creatorType: z.string().min(2),
    primaryGoal: z.string().min(2),
    monthlyIncomeGoal: z.number().min(1),
    platforms: z.array(z.string()).min(1),
  })).mutation(async ({ ctx, input }) => {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for V2 onboarding generation.");
    const c = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Design a CreatorVault V2 activation workflow for a real ${input.creatorType} creator.\nPrimary goal: ${input.primaryGoal}\nIncome goal: $${input.monthlyIncomeGoal}/month\nPlatforms: ${input.platforms.join(", ")}\n\nCreate a concrete welcome, day-one quick wins, week-one roadmap, first paid offer, Telegram distribution move, and exact proof fields the system should track. No placeholders or generic examples.` }],
      max_tokens: 850,
    });
    const onboarding = c.choices[0].message.content?.trim();
    if (!onboarding) throw new Error("OpenAI returned empty V2 onboarding content.");
    const artifactId = await saveV2Artifact(ctx.user.id, "creator_onboarding_v2_start", "CreatorVault V2 Activation Started", { input, onboarding, startedAt: new Date().toISOString(), steps: V2_STEPS });
    await db.db.update(db.schema.users).set({ creatorStatus: "activating", contentType: input.platforms, primaryBrand: "CREATORVAULT" }).where(eq(db.schema.users.id, ctx.user.id));
    await persistV2Report(ctx.user.id, "creator_onboarding_v2_started", JSON.stringify({ userId: ctx.user.id, artifactId, input, onboarding, startedAt: new Date().toISOString() }), Math.min(input.monthlyIncomeGoal, 10000));
    return { onboarding, artifactId, persisted: true, steps: V2_STEPS, userId: ctx.user.id };
  }),

  getV2Progress: protectedProcedure.query(async ({ ctx }) => {
    const artifacts = await db.db.select().from(db.schema.content)
      .where(and(eq(db.schema.content.userId, ctx.user.id), eq(db.schema.content.contentType, "creator_onboarding_v2_step")))
      .orderBy(desc(db.schema.content.createdAt)).limit(50);
    const completedStepIds = Array.from(new Set(artifacts.map((item: any) => String(item.metadata?.stepId || "")).filter(Boolean)));
    const canonicalCompletedStepIds = V2_STEPS.filter((step) => completedStepIds.includes(step));
    const progress = Math.min(100, Math.round((canonicalCompletedStepIds.length / V2_STEPS.length) * 100));
    const nextMilestone = V2_STEPS.find((step) => !canonicalCompletedStepIds.includes(step)) ?? "activation-complete";
    return { progress, level: progress >= 100 ? "activated" : progress >= 60 ? "monetizing" : progress > 0 ? "launching" : "ready", nextMilestone, completedStepIds, canonicalCompletedStepIds, artifactCount: artifacts.length, userId: ctx.user.id };
  }),

  completeV2Step: protectedProcedure.input(z.object({ stepId: z.string().min(1), result: z.string().optional() })).mutation(async ({ ctx, input }) => {
    const artifactId = await saveV2Artifact(ctx.user.id, "creator_onboarding_v2_step", `V2 step completed: ${input.stepId}`, { stepId: input.stepId, result: input.result ?? null, completedAt: new Date().toISOString() });
    const xpEarned = Math.max(50, Math.min(250, input.stepId.length * 10));
    await persistV2Report(ctx.user.id, "creator_onboarding_v2_step_completed", JSON.stringify({ userId: ctx.user.id, artifactId, stepId: input.stepId, result: input.result ?? null, xpEarned, completedAt: new Date().toISOString() }));
    return { completed: true, stepId: input.stepId, artifactId, xpEarned, persisted: true, userId: ctx.user.id };
  }),
});

