import { z } from "zod";
import { randomUUID } from "crypto";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { and, desc, eq, sql } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TOTAL_STEPS = 7;

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

async function saveOnboardingArtifact(userId: number, contentType: string, title: string, metadata: Record<string, unknown>) {
  const key = `${contentType}-${userId}-${randomUUID()}`;
  const [row] = await db.db.insert(db.schema.content).values({
    userId,
    title,
    description: JSON.stringify(metadata),
    fileUrl: `creatorvault://activation/${key}`,
    fileKey: key,
    mimeType: "application/json",
    fileSize: Buffer.byteLength(JSON.stringify(metadata), "utf8"),
    contentType,
    status: "active",
    metadata,
  }).$returningId();
  return row.id;
}

async function persistOnboardingReport(userId: number, reportType: string, content: string, revenueImpact = 0) {
  await ensureAgentReportsSchema();
  const agentRowsResult = await db.db.execute(sql`SELECT id FROM empire_agents WHERE slug = 'creator-growth-agent' LIMIT 1`);
  const agentRows = Array.isArray(agentRowsResult) ? agentRowsResult : (agentRowsResult as any)[0] ?? [];
  const realAgentId = agentRows[0]?.id ? Number(agentRows[0].id) : null;
  await db.db.execute(sql`
    INSERT INTO empire_agent_reports (agent_id, agent_slug, agent_name, report_type, content, revenue_impact, created_at)
    VALUES (${realAgentId}, 'creator-growth-agent', 'Creator Growth Agent', ${reportType}, ${content}, ${revenueImpact}, NOW())
  `);
}

export const onboarding = router({
  getOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
    const artifacts = await db.db.select().from(db.schema.content)
      .where(and(eq(db.schema.content.userId, ctx.user.id), eq(db.schema.content.contentType, "creator_onboarding_step")))
      .orderBy(desc(db.schema.content.createdAt)).limit(50);
    const completedSteps = Array.from(new Set(artifacts.map((item: any) => Number(item.metadata?.step)).filter((step: number) => Number.isFinite(step) && step > 0)));
    const completed = completedSteps.length >= TOTAL_STEPS;
    return {
      completed,
      completedSteps,
      currentStep: completed ? TOTAL_STEPS : Math.min(TOTAL_STEPS, completedSteps.length + 1),
      totalSteps: TOTAL_STEPS,
      lastArtifactId: artifacts[0]?.id ?? null,
      creatorStatus: completed ? "active" : completedSteps.length > 0 ? "activating" : "pending",
      userId: ctx.user.id,
    };
  }),

  completeStep: protectedProcedure.input(z.object({ step: z.number().int().min(1).max(TOTAL_STEPS), data: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ ctx, input }) => {
    const artifactId = await saveOnboardingArtifact(ctx.user.id, "creator_onboarding_step", `Onboarding Step ${input.step} Completed`, { step: input.step, data: input.data ?? {}, completedAt: new Date().toISOString() });
    await db.db.update(db.schema.users).set({ creatorStatus: input.step >= TOTAL_STEPS ? "active" : "activating" }).where(eq(db.schema.users.id, ctx.user.id));
    await persistOnboardingReport(ctx.user.id, "creator_onboarding_step_completed", JSON.stringify({ userId: ctx.user.id, step: input.step, artifactId, data: input.data ?? {}, completedAt: new Date().toISOString() }));
    return { completed: true, step: input.step, artifactId, persisted: true, userId: ctx.user.id };
  }),

  getPersonalizedPlan: protectedProcedure.input(z.object({ goals: z.array(z.string()).min(1), experience: z.string().min(1), niche: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for personalized onboarding plan generation.");
    const c = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Create a CreatorVault activation plan for a real creator. No placeholders and no generic filler.\nGoals: ${input.goals.join(", ")}\nExperience: ${input.experience}\nNiche: ${input.niche}\n\nDesign a 7-step journey that moves from profile setup to uploaded paid content, Telegram distribution, first buyer conversion, follow-up offer, and operator telemetry. Include exact action, required asset, revenue intent, and completion proof for each step.` }],
      max_tokens: 900,
    });
    const plan = c.choices[0].message.content?.trim();
    if (!plan) throw new Error("OpenAI returned empty onboarding plan content.");
    const artifactId = await saveOnboardingArtifact(ctx.user.id, "creator_onboarding_plan", "CreatorVault Personalized Activation Plan", { input, plan, generatedAt: new Date().toISOString() });
    await db.db.update(db.schema.users).set({ creatorStatus: "activating", contentType: input.goals, primaryBrand: "CREATORVAULT" }).where(eq(db.schema.users.id, ctx.user.id));
    await persistOnboardingReport(ctx.user.id, "creator_onboarding_plan", JSON.stringify({ userId: ctx.user.id, artifactId, input, plan, generatedAt: new Date().toISOString() }), 497);
    return { plan, artifactId, persisted: true, userId: ctx.user.id };
  }),

  skipOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const artifactId = await saveOnboardingArtifact(ctx.user.id, "creator_onboarding_skip", "Creator skipped guided onboarding", { skippedAt: new Date().toISOString(), operatorNote: "Creator manually bypassed guided activation; direct dashboard follow-up required." });
    await db.db.update(db.schema.users).set({ creatorStatus: "manual_review" }).where(eq(db.schema.users.id, ctx.user.id));
    await persistOnboardingReport(ctx.user.id, "creator_onboarding_manual_review", JSON.stringify({ userId: ctx.user.id, artifactId, skippedAt: new Date().toISOString() }));
    return { skipped: true, artifactId, persisted: true, userId: ctx.user.id };
  }),
});
export const onboardingRouter = onboarding;

