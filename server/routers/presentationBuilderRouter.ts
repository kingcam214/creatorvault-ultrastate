import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { sql } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  await db.db.execute(sql`ALTER TABLE empire_agent_reports MODIFY agent_slug VARCHAR(128) NOT NULL`);
  await db.db.execute(sql`ALTER TABLE empire_agent_reports MODIFY agent_name VARCHAR(256) NOT NULL`);
  await db.db.execute(sql`ALTER TABLE empire_agent_reports MODIFY report_type VARCHAR(100) NOT NULL`);
}

async function persistPresentationReport(reportType: string, content: string, revenueImpact = 497) {
  await ensureAgentReportsSchema();
  const agentRowsResult = await db.db.execute(sql`SELECT id FROM empire_agents WHERE slug = 'presentation-empire-agent' LIMIT 1`);
  const agentRows = Array.isArray(agentRowsResult) ? agentRowsResult : (agentRowsResult as any)[0] ?? [];
  const realAgentId = agentRows[0]?.id ? Number(agentRows[0].id) : null;
  await db.db.execute(sql`
    INSERT INTO empire_agent_reports (agent_id, agent_slug, agent_name, report_type, content, revenue_impact, created_at)
    VALUES (${realAgentId}, 'presentation-empire-agent', 'Presentation Empire Agent', ${reportType}, ${content}, ${revenueImpact}, NOW())
  `);
}

function requireOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for Presentation Builder production generation.");
  }
}

const templateCatalog = [
  {
    id: "creator_revenue_audit",
    name: "Creator Revenue Audit",
    slides: 12,
    style: "executive revenue audit",
    useCase: "Sell a $497 creator audit package by exposing revenue leak, conversion path, and immediate paid offer.",
  },
  {
    id: "brand_deal_pitch",
    name: "Brand Deal Pitch",
    slides: 10,
    style: "premium sponsor pitch",
    useCase: "Win sponsor budgets with audience proof, package tiers, deliverables, and closing language.",
  },
  {
    id: "creator_onboarding_activation",
    name: "Creator Onboarding Activation",
    slides: 9,
    style: "operator playbook",
    useCase: "Turn a newly recruited creator into uploaded content, Telegram distribution, first PPV, and follow-up offers.",
  },
  {
    id: "investor_empire_brief",
    name: "Investor Empire Brief",
    slides: 14,
    style: "boardroom operating brief",
    useCase: "Explain CreatorVault revenue engines, verified production proof, unit economics, and next funding asks.",
  },
];

export const presentationBuilderRouter = router({
  buildPresentation: protectedProcedure.input(z.object({
    title: z.string().min(3),
    topic: z.string().min(3),
    audience: z.string().min(2),
    slides: z.number().int().min(3).max(30).default(10),
    style: z.string().optional(),
    creatorHandle: z.string().optional(),
    platform: z.string().optional(),
    monetizationGoal: z.string().optional(),
    offerPriceUsd: z.number().min(0).optional(),
    distributionChannel: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    requireOpenAI();
    const prompt = `You are CreatorVault's Presentation Empire operator. Build a production-ready monetization presentation that can be sent to a real prospect today. Do not include placeholders, mock names, fake metrics, or vague filler. If data is unknown, give a concrete collection step and the exact field needed.\n\nTitle: ${input.title}\nTopic: ${input.topic}\nAudience: ${input.audience}\nSlides: ${input.slides}\nStyle: ${input.style || "premium CreatorVault operating brief"}\nCreator handle: ${input.creatorHandle || "not supplied"}\nPlatform: ${input.platform || "not supplied"}\nMonetization goal: ${input.monetizationGoal || "paid creator activation"}\nOffer price USD: ${input.offerPriceUsd ?? 497}\nDistribution channel: ${input.distributionChannel || "Telegram + direct DM follow-up"}\n\nReturn a structured package with: 1) executive summary, 2) slide-by-slide deck with title, proof point, talk track, visual direction, and CTA, 3) outreach message to send with the deck, 4) Telegram internal notification, 5) monetization checklist, 6) exact missing data fields if any.`;
    const c = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1400,
    });
    const presentation = c.choices[0].message.content?.trim();
    if (!presentation) throw new Error("Presentation Builder returned empty content from OpenAI.");
    const reportPayload = JSON.stringify({ userId: ctx.user.id, input, presentation, generatedAt: new Date().toISOString() });
    await persistPresentationReport("presentation_builder_package", reportPayload, input.offerPriceUsd ?? 497);
    return {
      presentation,
      persisted: true,
      reportType: "presentation_builder_package",
      agentSlug: "presentation-empire-agent",
      revenueImpact: input.offerPriceUsd ?? 497,
      userId: ctx.user.id,
    };
  }),

  generateSlideContent: protectedProcedure.input(z.object({
    slideTitle: z.string().min(2),
    context: z.string().min(3),
    slideType: z.string().min(2),
  })).mutation(async ({ ctx, input }) => {
    requireOpenAI();
    const c = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: `Create production slide copy for CreatorVault. No placeholders.\nSlide type: ${input.slideType}\nSlide title: ${input.slideTitle}\nContext: ${input.context}\n\nProvide: headline, 3-5 proof-driven bullets, speaker notes, visual direction, CTA, and any missing data fields that must be collected before sending.` }],
      max_tokens: 700,
    });
    const content = c.choices[0].message.content?.trim();
    if (!content) throw new Error("Slide generation returned empty content from OpenAI.");
    await persistPresentationReport("presentation_slide_content", JSON.stringify({ userId: ctx.user.id, input, content, generatedAt: new Date().toISOString() }), 97);
    return { content, persisted: true, reportType: "presentation_slide_content", userId: ctx.user.id };
  }),

  listTemplates: protectedProcedure.query(async () => ({ templates: templateCatalog })),
});

