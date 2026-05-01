import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import OpenAI from "openai";
import mysql from "mysql2/promise";
import crypto from "crypto";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getDb() {
  const url = process.env.DATABASE_URL || "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error("Invalid DATABASE_URL");
  const [, user, password, host, port, database] = m;
  return mysql.createConnection({ host, port: parseInt(port), user, password, database });
}

function extractRows(result: any): any[] {
  if (Array.isArray(result) && result.length >= 1 && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result;
  return [];
}

const KINGCAM_INTRO = "Yo, it's KingCam. Let me show you something ridiculous.";
const KINGCAM_OUTRO = "That's how you build an empire. See you in the Vault.";
const KINGCAM_STYLE = "confident, direct, visionary, street-smart empire builder";

const SCRIPT_TYPES: Record<string, { label: string; systemPrompt: string; maxTokens: number }> = {
  challenge_update: { label: "Challenge Update", systemPrompt: `You are KingCam, a ${KINGCAM_STYLE}. Write a short-form vertical video script (60-90 seconds) announcing a challenge update. Start with: "${KINGCAM_INTRO}" End with: "${KINGCAM_OUTRO}". Include: current progress, what just happened, what is next, call to action. Format with [HOOK] [PROGRESS] [ACTION] [CTA] labels.`, maxTokens: 600 },
  torment_thread: { label: "Torment Thread", systemPrompt: `You are KingCam, a ${KINGCAM_STYLE}. Write a Telegram/social media thread that creates urgency and FOMO. 5-7 posts, each punchy and direct. Topic: empire building, money moves, creator life. Each post should stand alone but build on the last. No fluff. Pure value + entertainment.`, maxTokens: 800 },
  recap_video: { label: "Recap Video", systemPrompt: `You are KingCam, a ${KINGCAM_STYLE}. Write a weekly recap video script (90-120 seconds). Start with: "${KINGCAM_INTRO}" Cover: wins this week, lessons learned, revenue milestones, what is coming. End with: "${KINGCAM_OUTRO}". Format with [HOOK] [WINS] [LESSONS] [PREVIEW] [CTA] labels.`, maxTokens: 700 },
  mini_ebook: { label: "Mini eBook", systemPrompt: `You are KingCam, a ${KINGCAM_STYLE}. Write a 5-chapter mini eBook outline with full content for Chapter 1. Each chapter: title, 3 key points, actionable takeaway. Voice: direct, no-BS, real results. Include: intro, 5 chapters, conclusion with CTA.`, maxTokens: 1200 },
  sales_pitch: { label: "Sales Pitch", systemPrompt: `You are KingCam, a ${KINGCAM_STYLE}. Write a high-converting sales video script (60-90 seconds). Start with: "${KINGCAM_INTRO}" Structure: Problem, Agitation, Solution, Proof, Offer, CTA. End with: "${KINGCAM_OUTRO}". Be specific, use numbers, create urgency.`, maxTokens: 600 },
  telegram_post: { label: "Telegram Post", systemPrompt: `You are KingCam, a ${KINGCAM_STYLE}. Write 3 Telegram channel posts: 1) Value post (teach something), 2) Hype post (build excitement), 3) Revenue post (drive sales). Each 2-4 paragraphs. Include emojis strategically. End each with a clear CTA.`, maxTokens: 700 },
  short_video: { label: "Short Video", systemPrompt: `You are KingCam, a ${KINGCAM_STYLE}. Write a TikTok/Reels/Shorts script (30-45 seconds). Hook in first 3 seconds. Include visual direction notes in [brackets], dialogue, B-roll suggestions. Format for vertical video. End with strong CTA.`, maxTokens: 500 },
  course_intro: { label: "Course Intro", systemPrompt: `You are KingCam, a ${KINGCAM_STYLE}. Write a course introduction video script (2-3 minutes). Start with: "${KINGCAM_INTRO}" Cover: what they will learn, why it matters, your credentials, what to expect, how to use the course. End with: "${KINGCAM_OUTRO}". Motivating and direct.`, maxTokens: 900 },
};

export const kingcamScriptWriterRouter = router({
  generateScript: protectedProcedure.input(z.object({
    scriptType: z.string().default("challenge_update"),
    topic: z.string(),
    context: z.string().optional(),
    platform: z.string().default("telegram"),
    duration: z.number().optional(),
    saveToDb: z.boolean().default(true),
  })).mutation(async ({ ctx, input }) => {
    const typeConfig = SCRIPT_TYPES[input.scriptType] || SCRIPT_TYPES.challenge_update;
    const userPrompt = `Topic: ${input.topic}${input.context ? `\nContext: ${input.context}` : ""}${input.platform ? `\nPlatform: ${input.platform}` : ""}${input.duration ? `\nTarget duration: ${input.duration} seconds` : ""}`;
    const c = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: typeConfig.systemPrompt }, { role: "user", content: userPrompt }],
      max_tokens: typeConfig.maxTokens,
    });
    const scriptText = c.choices[0].message.content || "";
    const title = `${typeConfig.label}: ${input.topic.substring(0, 50)}`;
    const scriptId = crypto.randomUUID();
    if (input.saveToDb) {
      try {
        const db = await getDb();
        await db.execute("INSERT INTO script_projects (id, user_id, title, script_text, genre, platform, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'draft', NOW(), NOW())", [scriptId, ctx.user.id, title, scriptText, input.scriptType, input.platform]);
        db.end();
      } catch (err: any) { console.error("Script save error:", err.message); }
    }
    return { scriptId, title, scriptText, scriptType: input.scriptType, platform: input.platform, wordCount: scriptText.split(" ").length, estimatedDuration: Math.ceil(scriptText.split(" ").length / 2.5), savedToDb: input.saveToDb };
  }),

  writeScript: protectedProcedure.input(z.object({ type: z.string(), topic: z.string(), duration: z.string().optional(), style: z.string().optional(), platform: z.string().optional() })).mutation(async ({ ctx, input }) => {
    const typeConfig = SCRIPT_TYPES[input.type] || SCRIPT_TYPES.challenge_update;
    const c = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "system", content: typeConfig.systemPrompt }, { role: "user", content: `Topic: ${input.topic}\nPlatform: ${input.platform || "telegram"}` }], max_tokens: typeConfig.maxTokens });
    const scriptText = c.choices[0].message.content || "";
    const scriptId = crypto.randomUUID();
    try {
      const db = await getDb();
      await db.execute("INSERT INTO script_projects (id, user_id, title, script_text, genre, platform, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'draft', NOW(), NOW())", [scriptId, ctx.user.id, `${input.type}: ${input.topic.substring(0,50)}`, scriptText, input.type, input.platform || "telegram"]);
      db.end();
    } catch {}
    return { script: scriptText, scriptId };
  }),

  saveScript: protectedProcedure.input(z.object({ title: z.string(), scriptText: z.string(), scriptType: z.string().default("challenge_update"), platform: z.string().default("telegram"), status: z.enum(["draft", "approved", "published"]).default("draft") })).mutation(async ({ ctx, input }) => {
    const scriptId = crypto.randomUUID();
    const db = await getDb();
    try {
      await db.execute("INSERT INTO script_projects (id, user_id, title, script_text, genre, platform, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())", [scriptId, ctx.user.id, input.title, input.scriptText, input.scriptType, input.platform, input.status]);
      return { scriptId, success: true };
    } finally { db.end(); }
  }),

  updateScriptStatus: protectedProcedure.input(z.object({ scriptId: z.string(), status: z.enum(["draft", "approved", "published"]) })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    try {
      await db.execute("UPDATE script_projects SET status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?", [input.status, input.scriptId, ctx.user.id]);
      return { success: true };
    } finally { db.end(); }
  }),

  listScripts: protectedProcedure.input(z.object({ limit: z.number().default(50), offset: z.number().default(0), status: z.string().optional(), scriptType: z.string().optional() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    try {
      let query = "SELECT * FROM script_projects WHERE user_id = ?";
      const params: any[] = [ctx.user.id];
      if (input.status) { query += " AND status = ?"; params.push(input.status); }
      if (input.scriptType) { query += " AND genre = ?"; params.push(input.scriptType); }
      query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
      params.push(input.limit, input.offset);
      const [rows] = await db.execute(query, params);
      return { scripts: extractRows([rows]), total: extractRows([rows]).length };
    } finally { db.end(); }
  }),

  getScript: protectedProcedure.input(z.object({ scriptId: z.string() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    try {
      const [rows] = await db.execute("SELECT * FROM script_projects WHERE id = ? AND user_id = ?", [input.scriptId, ctx.user.id]);
      return extractRows([rows])[0] || null;
    } finally { db.end(); }
  }),

  deleteScript: protectedProcedure.input(z.object({ scriptId: z.string() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    try {
      await db.execute("DELETE FROM script_projects WHERE id = ? AND user_id = ?", [input.scriptId, ctx.user.id]);
      return { success: true };
    } finally { db.end(); }
  }),

  getScriptTypes: protectedProcedure.query(async () => {
    return Object.entries(SCRIPT_TYPES).map(([key, val]) => ({ key, label: val.label }));
  }),

  getScriptTemplates: protectedProcedure.query(async () => ({
    templates: Object.entries(SCRIPT_TYPES).map(([id, val]) => ({ id, name: val.label }))
  })),

  improveScript: protectedProcedure.input(z.object({ scriptText: z.string().optional(), script: z.string().optional(), instruction: z.string().optional(), focus: z.string().optional() })).mutation(async ({ input }) => {
    const text = input.scriptText || input.script || "";
    const instruction = input.instruction || input.focus || "Make it more engaging and punchy";
    const c = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: `You are KingCam's script editor. Improve the script while keeping KingCam's voice: ${KINGCAM_STYLE}. ${instruction}.` }, { role: "user", content: text }],
      max_tokens: 1000,
    });
    return { improvedScript: c.choices[0].message.content, improved: c.choices[0].message.content };
  }),
});
