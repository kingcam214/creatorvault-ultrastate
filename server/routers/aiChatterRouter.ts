/**
 * VaultX AI Chatter Router
 *
 * Manages the AI fan engagement system:
 * 1. Creator configures their AI persona (name, tone, PPV pitch frequency)
 * 2. When a fan sends a message, processIncomingMessage fires GPT-4o-mini
 * 3. GPT responds in the creator's persona, pitching PPV at the configured frequency
 * 4. All messages and responses are logged to vaultx_ai_chatter_messages
 *
 * NO STUBS. NO MOCKS. Real OpenAI calls. Real DB reads/writes.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import { db } from "../db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function rawQuery(query: string, params: any[] = []): Promise<any[]> {
  const pool = (db as any).$client || (db as any).client;
  if (pool && typeof pool.promise === "function") {
    const [rows] = await pool.promise().query(query, params);
    return rows as any[];
  }
  if (pool && typeof pool.execute === "function") {
    const [rows] = await pool.execute(query, params);
    return rows as any[];
  }
  throw new Error("Cannot access database pool");
}

export const aiChatterRouter = router({

  /**
   * getConfig
   * Returns the creator's AI chatter configuration from vaultx_ai_chatter_config.
   * If no config exists, returns defaults.
   */
  getConfig: protectedProcedure
    .query(async ({ ctx }) => {
      const rows = await rawQuery(
        `SELECT * FROM vaultx_ai_chatter_config WHERE creator_id = ? LIMIT 1`,
        [ctx.user.id]
      ) as Array<{
        id: number;
        creator_id: number;
        persona_name: string;
        persona_description: string | null;
        ppv_pitch_frequency: number;
        tip_request_frequency: number;
        is_enabled: number;
        greeting_message: string | null;
        schedule_hours: string | null;
        total_messages_sent: number;
        total_revenue_generated: number;
        created_at: string;
        updated_at: string;
      }>;

      if (!rows.length) {
        // Return defaults — creator has not configured yet
        return {
          configured: false,
          personaName: "",
          personaDescription: "",
          ppvPitchFrequency: 3,
          tipRequestFrequency: 5,
          isEnabled: false,
          greetingMessage: "",
          scheduleHours: [],
          stats: { totalMessagesSent: 0, totalRevenue: 0 },
        };
      }

      const c = rows[0];
      return {
        configured: true,
        personaName: c.persona_name,
        personaDescription: c.persona_description || "",
        ppvPitchFrequency: c.ppv_pitch_frequency,
        tipRequestFrequency: c.tip_request_frequency,
        isEnabled: !!c.is_enabled,
        greetingMessage: c.greeting_message || "",
        scheduleHours: c.schedule_hours ? JSON.parse(c.schedule_hours) : [],
        stats: {
          totalMessagesSent: c.total_messages_sent,
          totalRevenue: c.total_revenue_generated,
        },
      };
    }),

  /**
   * saveConfig
   * Creates or updates the AI chatter configuration for this creator.
   * Writes to vaultx_ai_chatter_config.
   */
  saveConfig: protectedProcedure
    .input(z.object({
      personaName: z.string().min(1).max(100),
      personaDescription: z.string().max(500).optional(),
      ppvPitchFrequency: z.number().int().min(1).max(10).default(3),
      tipRequestFrequency: z.number().int().min(1).max(10).default(5),
      isEnabled: z.boolean().default(false),
      greetingMessage: z.string().max(300).optional(),
      scheduleHours: z.array(z.number().int().min(0).max(23)).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await rawQuery(
        `SELECT id FROM vaultx_ai_chatter_config WHERE creator_id = ? LIMIT 1`,
        [ctx.user.id]
      ) as Array<{ id: number }>;

      if (existing.length) {
        await rawQuery(
          `UPDATE vaultx_ai_chatter_config SET
             persona_name = ?, persona_description = ?,
             ppv_pitch_frequency = ?, tip_request_frequency = ?, is_enabled = ?,
             greeting_message = ?, schedule_hours = ?,
             updated_at = NOW()
           WHERE creator_id = ?`,
          [
            input.personaName, input.personaDescription || null,
            input.ppvPitchFrequency, input.tipRequestFrequency, input.isEnabled ? 1 : 0,
            input.greetingMessage || null,
            JSON.stringify(input.scheduleHours),
            ctx.user.id,
          ]
        );
      } else {
        await rawQuery(
          `INSERT INTO vaultx_ai_chatter_config
             (creator_id, persona_name, persona_description,
              ppv_pitch_frequency, tip_request_frequency, is_enabled,
              greeting_message, schedule_hours,
              total_messages_sent, total_revenue_generated, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0.00, NOW(), NOW())`,
          [
            ctx.user.id,
            input.personaName, input.personaDescription || null,
            input.ppvPitchFrequency, input.tipRequestFrequency, input.isEnabled ? 1 : 0,
            input.greetingMessage || null,
            JSON.stringify(input.scheduleHours),
          ]
        );
      }

      return { success: true, message: "AI Chatter configuration saved." };
    }),

  /**
   * processIncomingMessage
   *
   * The core AI chatter engine. Called when a fan sends a message.
   * 1. Loads the creator's persona config
   * 2. Loads recent conversation history from vaultx_ai_chatter_messages
   * 3. Determines if this message should include a PPV pitch (based on frequency)
   * 4. Calls GPT-4o-mini with the full persona context
   * 5. Saves both the fan message and AI response to the DB
   *
   * Real OpenAI call. Real DB reads/writes. No mock.
   */
  processIncomingMessage: protectedProcedure
    .input(z.object({
      fanId: z.number(),
      fanMessage: z.string().min(1).max(1000),
      conversationId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Load creator's AI chatter config
      const configRows = await rawQuery(
        `SELECT * FROM vaultx_ai_chatter_config WHERE creator_id = ? AND is_enabled = 1 LIMIT 1`,
        [ctx.user.id]
      ) as Array<{
        persona_name: string;
        persona_description: string | null;
        ppv_pitch_frequency: number;
        tip_request_frequency: number;
        greeting_message: string | null;
        schedule_hours: string | null;
      }>;

      if (!configRows.length) {
        throw new Error("AI Chatter is not configured or not active for this creator");
      }
      const config = configRows[0];

      // 2. Load recent conversation history (last 10 exchanges)
      const historyRows = await rawQuery(
        `SELECT role, content FROM vaultx_ai_chatter_messages
         WHERE creator_id = ? AND fan_id = ?
         ORDER BY created_at DESC LIMIT 20`,
        [ctx.user.id, input.fanId]
      ) as Array<{ role: string; content: string }>;

      const history = historyRows.reverse(); // oldest first

      // 3. Count messages in this conversation to determine PPV pitch timing
      const messageCount = history.filter((m) => m.role === "assistant").length;
      const shouldPitchPPV = (messageCount + 1) % config.ppv_pitch_frequency === 0;

      // 4. Get the creator's latest PPV content for the pitch
      let ppvContent: { title: string; ppv_price: number; id: number } | null = null;
      if (shouldPitchPPV) {
        const ppvRows = await rawQuery(
          `SELECT id, title, ppv_price FROM vaultx_content
           WHERE creator_id = ? AND is_ppv = 1 AND status = 'active'
           AND id NOT IN (
             SELECT content_id FROM vaultx_ppv_purchases
             WHERE fan_id = ? AND status = 'completed'
           )
           ORDER BY created_at DESC LIMIT 1`,
          [ctx.user.id, input.fanId]
        ) as Array<{ id: number; title: string; ppv_price: number }>;
        ppvContent = ppvRows[0] || null;
      }

      // 5. Build the system prompt with the creator's persona
      const ppvInstruction = shouldPitchPPV && ppvContent
        ? `\n\nAt some natural point in this response, naturally mention your exclusive content "${ppvContent.title}" priced at $${ppvContent.ppv_price}. Be enticing but not pushy. Keep it natural.`
        : "";

      const systemPrompt = `You are ${config.persona_name}, an adult content creator on VaultX.
${config.persona_description ? config.persona_description : "You are confident, body-positive, and engaging with your fans."}
${ppvInstruction}

Keep responses conversational, under 150 words. Do not break character. Do not mention AI or automation.`;

      // 6. Build message array for GPT
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
        ...history.slice(-10).map((h) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
        { role: "user", content: input.fanMessage },
      ];

      // 7. Call GPT-4o-mini — real API call
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 200,
        temperature: 0.9,
      });

      const aiResponse = completion.choices[0].message.content || "";

      // 8. Save fan message and AI response to DB
      const convId = input.conversationId || `conv_${ctx.user.id}_${input.fanId}`;

      await rawQuery(
        `INSERT INTO vaultx_ai_chatter_messages
           (creator_id, fan_id, conversation_id, role, content, has_ppv_pitch, ppv_content_id, created_at)
         VALUES (?, ?, ?, 'user', ?, 0, NULL, NOW())`,
        [ctx.user.id, input.fanId, convId, input.fanMessage]
      );

      await rawQuery(
        `INSERT INTO vaultx_ai_chatter_messages
           (creator_id, fan_id, conversation_id, role, content, has_ppv_pitch, ppv_content_id, created_at)
         VALUES (?, ?, ?, 'assistant', ?, ?, ?, NOW())`,
        [
          ctx.user.id, input.fanId, convId, aiResponse,
          shouldPitchPPV && ppvContent ? 1 : 0,
          shouldPitchPPV && ppvContent ? ppvContent.id : null,
        ]
      );

      // 9. Update total_messages_sent counter
      await rawQuery(
        `UPDATE vaultx_ai_chatter_config
         SET total_messages_sent = total_messages_sent + 1, updated_at = NOW()
         WHERE creator_id = ?`,
        [ctx.user.id]
      );

      return {
        response: aiResponse,
        conversationId: convId,
        includedPPVPitch: !!(shouldPitchPPV && ppvContent),
        ppvContentPitched: ppvContent
          ? { id: ppvContent.id, title: ppvContent.title, price: ppvContent.ppv_price }
          : null,
      };
    }),

  /**
   * getConversationHistory
   * Returns the last 50 messages in a fan conversation.
   */
  getConversationHistory: protectedProcedure
    .input(z.object({ fanId: z.number() }))
    .query(async ({ ctx, input }) => {
      const rows = await rawQuery(
        `SELECT role, content, has_ppv_pitch, ppv_content_id, created_at
         FROM vaultx_ai_chatter_messages
         WHERE creator_id = ? AND fan_id = ?
         ORDER BY created_at ASC LIMIT 50`,
        [ctx.user.id, input.fanId]
      ) as Array<{
        role: string;
        content: string;
        has_ppv_pitch: number;
        ppv_content_id: number | null;
        created_at: string;
      }>;

      return rows.map((r) => ({
        role: r.role as "user" | "assistant",
        content: r.content,
        hasPPVPitch: !!r.has_ppv_pitch,
        ppvContentId: r.ppv_content_id,
        timestamp: r.created_at,
      }));
    }),

  /**
   * getChatterStats
   * Returns aggregate stats for the AI chatter system.
   */
  getChatterStats: protectedProcedure
    .query(async ({ ctx }) => {
      const statsRows = await rawQuery(
        `SELECT
           COUNT(DISTINCT fan_id) as unique_fans,
           COUNT(*) as total_messages,
           SUM(CASE WHEN has_ppv_pitch = 1 THEN 1 ELSE 0 END) as ppv_pitches_sent,
           SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as ai_responses
         FROM vaultx_ai_chatter_messages
         WHERE creator_id = ?`,
        [ctx.user.id]
      ) as Array<{
        unique_fans: number;
        total_messages: number;
        ppv_pitches_sent: number;
        ai_responses: number;
      }>;

      const revenueRows = await rawQuery(
        `SELECT COALESCE(SUM(p.amount), 0) as revenue_from_chatter
         FROM vaultx_ppv_purchases p
         WHERE p.creator_id = ?
         AND p.fan_id IN (
           SELECT DISTINCT fan_id FROM vaultx_ai_chatter_messages WHERE creator_id = ?
         )
         AND p.status = 'completed'`,
        [ctx.user.id, ctx.user.id]
      ) as Array<{ revenue_from_chatter: number }>;

      const stats = statsRows[0] || { unique_fans: 0, total_messages: 0, ppv_pitches_sent: 0, ai_responses: 0 };
      const revenue = revenueRows[0]?.revenue_from_chatter || 0;

      // Also get the config stats
      const configStats = await rawQuery(
        `SELECT total_messages_sent, total_revenue_generated FROM vaultx_ai_chatter_config WHERE creator_id = ? LIMIT 1`,
        [ctx.user.id]
      ) as Array<{ total_messages_sent: number; total_revenue_generated: number }>;

      return {
        uniqueFansEngaged: stats.unique_fans,
        totalMessages: configStats[0]?.total_messages_sent || stats.total_messages,
        aiResponsesSent: stats.ai_responses,
        ppvPitchesSent: stats.ppv_pitches_sent,
        revenueAttributedToChatter: revenue,
      };
    }),
});
