import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const aiEmpireOrchestratorRouter = router({
  getEmpireStatus: protectedProcedure.query(async ({ ctx }) => {
    const [contentCount] = await db.db.select({ count: db.schema.content.id })
      .from(db.schema.content)
      .where(eq(db.schema.content.userId, ctx.user.id));
    
    const recentRuns = await db.db.select()
      .from(db.schema.orchestrationRuns)
      .where(eq(db.schema.orchestrationRuns.userId, ctx.user.id))
      .orderBy(desc(db.schema.orchestrationRuns.createdAt))
      .limit(5);
    
    return {
      contentPieces: contentCount?.count || 0,
      recentRuns,
      empireHealth: "active",
    };
  }),

  runEmpireOrchestration: protectedProcedure.input(z.object({
    goal: z.string(),
    platforms: z.array(z.string()),
    timeframe: z.enum(["today", "this_week", "this_month"]),
    focus: z.enum(["growth", "revenue", "engagement", "all"]),
  })).mutation(async ({ ctx, input }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `You are an AI Empire Orchestrator. Create a comprehensive action plan:
Goal: ${input.goal}
Platforms: ${input.platforms.join(", ")}
Timeframe: ${input.timeframe}
Focus: ${input.focus}

Provide: 1) Priority actions (ranked), 2) Content schedule, 3) Revenue opportunities, 4) Growth tactics, 5) Automation recommendations.`,
      }],
      max_tokens: 800,
    });

    await db.db.insert(db.schema.orchestrationRuns).values({
      userId: ctx.user.id,
      goal: input.goal,
      platforms: JSON.stringify(input.platforms),
      result: completion.choices[0].message.content || "",
      status: "completed",
      createdAt: new Date(),
    });

    return { plan: completion.choices[0].message.content, runAt: new Date().toISOString() };
  }),
  orchestrateEmpire: protectedProcedure.input(z.object({
    goal: z.string(),
    timeframe: z.string().default("30 days"),
    budget: z.number().optional(),
  })).mutation(async ({ input }) => {
    const { OpenAI } = await import("openai");
    const openai = new OpenAI();
    const c = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are an AI empire orchestrator. Create comprehensive action plans for creator empire goals." },
        { role: "user", content: `Create an empire orchestration plan for: ${input.goal}\nTimeframe: ${input.timeframe}${input.budget ? `\nBudget: $${input.budget}` : ""}` }
      ],
      max_tokens: 1200,
    });
    return { plan: c.choices[0].message.content ?? "", orchestrationId: `orch-${Date.now()}`, goal: input.goal };
  })
});
