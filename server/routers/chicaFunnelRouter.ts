import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import { db } from "../db.js";
import { createPool } from "mysql2/promise";

const getPool = () => createPool(process.env.DATABASE_URL || "mysql://creatorvault:KingCam214CreatorVault@localhost:3306/creatorvault");

import { v4 as uuidv4 } from "uuid";

// ─── Chica Funnel Router ──────────────────────────────────────────────────────
// Provisions, manages, and activates Tinder → WhatsApp → Telegram → VaultX
// conversion funnels for each chica. Ready-made templates auto-populate on
// provision. Owner can override any field before activating.
// ─────────────────────────────────────────────────────────────────────────────

function requireKing(role: string) {
  if (role !== "king" && role !== "admin") {
    throw new Error("Unauthorized: King/Admin only");
  }
}

export const chicaFunnelRouter = router({

  // ── List all chica funnels (Owner view) ────────────────────────────────────
  listFunnels: protectedProcedure
    .query(async ({ ctx }) => {
      requireKing(ctx.user.role);
      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        const [rows] = await conn.execute(
          "SELECT cf.id, cf.chica_user_id, cf.funnel_name, cf.locale, cf.status, cf.tinder_bio, cf.tinder_opener, cf.tinder_cta, cf.vaultx_referral_link, cf.vaultx_offer_text, cf.created_at, u.name AS chica_name, u.phone AS chica_phone, (SELECT COUNT(*) FROM chica_funnel_steps cfs WHERE cfs.funnel_id = cf.id) AS totalSteps FROM chica_funnels cf JOIN users u ON u.id = cf.chica_user_id ORDER BY cf.created_at DESC"
        ) as any;
        return rows;
      } finally {
        conn.release();
        await pool.end();
      }
    }),

  // ── Get a single funnel with all its steps ─────────────────────────────────
  getFunnel: protectedProcedure
    .input(z.object({ funnelId: z.string() }))
    .query(async ({ ctx, input }) => {
      requireKing(ctx.user.role);
      try {
        const [[funnel]] = await db.execute(
          `SELECT cf.*, u.name AS chica_name FROM chica_funnels cf
           JOIN users u ON u.id = cf.chica_user_id
           WHERE cf.id = ?`, [input.funnelId]
        ) as any;
        if (!funnel) throw new Error("Funnel not found");

        const [steps] = await db.execute(
          `SELECT * FROM chica_funnel_steps WHERE funnel_id = ? ORDER BY platform, step_order`,
          [input.funnelId]
        );
        return { ...funnel, steps };
      } finally {
      }
    }),

  // ── Provision a ready-made funnel for a chica ──────────────────────────────
  // Auto-populates all steps from the locale template.
  // Owner can then edit before activating.
  provisionFunnel: protectedProcedure
    .input(z.object({
      chicaUserId: z.number(),
      locale: z.enum(["es_DO", "ht_HT", "en_US"]).default("es_DO"),
      whatsappProviderId: z.string().optional(),
      telegramBotId: z.number().optional(),
      vaultxReferralLink: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireKing(ctx.user.role);
      try {
        // Get chica info
        const [[chica]] = await db.execute(
          `SELECT id, name, phone FROM users WHERE id = ? AND role = 'chica'`,
          [input.chicaUserId]
        ) as any;
        if (!chica) throw new Error("Chica not found");

        // Check if funnel already exists
        const [[existing]] = await db.execute(
          `SELECT id FROM chica_funnels WHERE chica_user_id = ? AND status != 'paused'`,
          [input.chicaUserId]
        ) as any;
        if (existing) throw new Error("Active funnel already exists for this chica. Pause it first.");

        const funnelId = uuidv4();
        const templateName = input.locale === 'ht_HT' ? 'Haitian Chica Funnel' : 'Dominican Chica Funnel';

        // Get the template steps for this locale
        const [templateSteps] = await db.execute(
          `SELECT * FROM chica_funnel_templates WHERE template_name = ? AND locale = ? ORDER BY platform, step_order`,
          [templateName, input.locale]
        ) as any;

        // Build tinder bio/opener/cta from template
        const tinderSteps = templateSteps.filter((s: any) => s.platform === 'tinder');
        const tinderBio = `${chica.name} | CreatorVault Empire | ${input.locale === 'ht_HT' ? 'Biznis dijital' : 'Negocio digital'} 🔥`;
        const tinderOpener = tinderSteps.find((s: any) => s.step_order === 1)?.message_text || '';
        const tinderCta = tinderSteps.find((s: any) => s.step_order === 2)?.message_text || '';

        // Create the funnel record
        await db.execute(`
          INSERT INTO chica_funnels (
            id, chica_user_id, funnel_name, tinder_bio, tinder_opener, tinder_cta,
            whatsapp_provider_id, telegram_bot_id, vaultx_referral_link,
            vaultx_offer_text, locale, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
        `, [
          funnelId,
          input.chicaUserId,
          `${chica.name}'s Empire Funnel`,
          tinderBio,
          tinderOpener,
          tinderCta,
          input.whatsappProviderId || null,
          input.telegramBotId || null,
          input.vaultxReferralLink || `https://creatorvault.live/ref/${chica.id}`,
          input.locale === 'ht_HT'
            ? `Rejwenn Vault mwen epi fè lajan avèk mwen 💰`
            : `Únete a mi Vault y gana dinero conmigo 💰`,
          input.locale,
        ]);

        // Insert all steps from template (skip tinder — those are in the funnel header)
        const nonTinderSteps = templateSteps.filter((s: any) => s.platform !== 'tinder');
        for (const step of nonTinderSteps) {
          await db.execute(`
            INSERT INTO chica_funnel_steps (funnel_id, step_order, platform, step_type, message_text, delay_hours)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [funnelId, step.step_order, step.platform, step.step_type, step.message_text, step.delay_hours]);
        }

        return { success: true, funnelId, message: `Funnel provisioned for ${chica.name}. Review and activate.` };
      } finally {
      }
    }),

  // ── Update funnel settings (before or after activation) ───────────────────
  updateFunnel: protectedProcedure
    .input(z.object({
      funnelId: z.string(),
      tinderBio: z.string().optional(),
      tinderOpener: z.string().optional(),
      tinderCta: z.string().optional(),
      whatsappProviderId: z.string().optional(),
      telegramBotId: z.number().optional(),
      vaultxReferralLink: z.string().optional(),
      vaultxOfferText: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireKing(ctx.user.role);
      try {
        const fields: string[] = [];
        const values: any[] = [];
        if (input.tinderBio !== undefined) { fields.push("tinder_bio = ?"); values.push(input.tinderBio); }
        if (input.tinderOpener !== undefined) { fields.push("tinder_opener = ?"); values.push(input.tinderOpener); }
        if (input.tinderCta !== undefined) { fields.push("tinder_cta = ?"); values.push(input.tinderCta); }
        if (input.whatsappProviderId !== undefined) { fields.push("whatsapp_provider_id = ?"); values.push(input.whatsappProviderId); }
        if (input.telegramBotId !== undefined) { fields.push("telegram_bot_id = ?"); values.push(input.telegramBotId); }
        if (input.vaultxReferralLink !== undefined) { fields.push("vaultx_referral_link = ?"); values.push(input.vaultxReferralLink); }
        if (input.vaultxOfferText !== undefined) { fields.push("vaultx_offer_text = ?"); values.push(input.vaultxOfferText); }
        if (fields.length === 0) throw new Error("No fields to update");
        values.push(input.funnelId);
        await db.execute(`UPDATE chica_funnels SET ${fields.join(", ")} WHERE id = ?`, values);
        return { success: true };
      } finally {
      }
    }),

  // ── Update a single funnel step message ────────────────────────────────────
  updateFunnelStep: protectedProcedure
    .input(z.object({
      stepId: z.number(),
      messageText: z.string(),
      delayHours: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireKing(ctx.user.role);
      try {
        await db.execute(
          `UPDATE chica_funnel_steps SET message_text = ?, delay_hours = COALESCE(?, delay_hours) WHERE id = ?`,
          [input.messageText, input.delayHours ?? null, input.stepId]
        );
        return { success: true };
      } finally {
      }
    }),

  // ── Activate a funnel (go live) ────────────────────────────────────────────
  activateFunnel: protectedProcedure
    .input(z.object({ funnelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireKing(ctx.user.role);
      try {
        await db.execute(
          `UPDATE chica_funnels SET status = 'active', provisioned_at = NOW() WHERE id = ?`,
          [input.funnelId]
        );
        // Also create a WhatsApp funnel entry if provider is set
        const [[funnel]] = await db.execute(
          `SELECT * FROM chica_funnels WHERE id = ?`, [input.funnelId]
        ) as any;

        if (funnel.whatsapp_provider_id) {
          const [waSteps] = await db.execute(
            `SELECT * FROM chica_funnel_steps WHERE funnel_id = ? AND platform = 'whatsapp' ORDER BY step_order`,
            [input.funnelId]
          ) as any;
          const waMessages = waSteps.map((s: any) => ({
            type: s.step_type,
            text: s.message_text,
            delay_hours: s.delay_hours,
          }));
          await db.execute(
            `INSERT INTO whatsapp_funnels (id, provider_id, name, messages_json, status) VALUES (?, ?, ?, ?, 'active')
             ON DUPLICATE KEY UPDATE messages_json = VALUES(messages_json), status = 'active'`,
            [input.funnelId, funnel.whatsapp_provider_id, `${funnel.funnel_name} - WA`, JSON.stringify(waMessages)]
          );
        }

        if (funnel.telegram_bot_id) {
          const [tgSteps] = await db.execute(
            `SELECT * FROM chica_funnel_steps WHERE funnel_id = ? AND platform = 'telegram' ORDER BY step_order`,
            [input.funnelId]
          ) as any;
          const tgMessages = tgSteps.map((s: any) => ({
            type: s.step_type,
            text: s.message_text,
            delay_hours: s.delay_hours,
          }));
          await db.execute(
            `INSERT INTO telegram_funnels (id, bot_id, name, messages_json, status) VALUES (?, ?, ?, ?, 'active')
             ON DUPLICATE KEY UPDATE messages_json = VALUES(messages_json), status = 'active'`,
            [input.funnelId, funnel.telegram_bot_id, `${funnel.funnel_name} - TG`, JSON.stringify(tgMessages)]
          );
        }

        return { success: true, message: "Funnel activated. WhatsApp and Telegram sequences are live." };
      } finally {
      }
    }),

  // ── Pause a funnel ─────────────────────────────────────────────────────────
  pauseFunnel: protectedProcedure
    .input(z.object({ funnelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireKing(ctx.user.role);
      try {
        await db.execute(`UPDATE chica_funnels SET status = 'paused' WHERE id = ?`, [input.funnelId]);
        await db.execute(`UPDATE whatsapp_funnels SET status = 'inactive' WHERE id = ?`, [input.funnelId]);
        await db.execute(`UPDATE telegram_funnels SET status = 'inactive' WHERE id = ?`, [input.funnelId]);
        return { success: true };
      } finally {
      }
    }),

  // ── Get rendered funnel card (with variables substituted) ─────────────────
  // Returns the fully rendered Tinder bio/opener/CTA with real chica data
  getRenderedFunnel: protectedProcedure
    .input(z.object({ funnelId: z.string() }))
    .query(async ({ ctx, input }) => {
      requireKing(ctx.user.role);
      try {
        const [[funnel]] = await db.execute(
          `SELECT cf.*, u.name AS chica_name, u.phone AS chica_phone
           FROM chica_funnels cf JOIN users u ON u.id = cf.chica_user_id
           WHERE cf.id = ?`, [input.funnelId]
        ) as any;
        if (!funnel) throw new Error("Funnel not found");

        const [steps] = await db.execute(
          `SELECT * FROM chica_funnel_steps WHERE funnel_id = ? ORDER BY platform, step_order`,
          [input.funnelId]
        ) as any;

        // Variable substitution helper
        const vars: Record<string, string> = {
          '{name}': funnel.chica_name,
          '{city}': 'Sosua',
          '{whatsapp_number}': funnel.chica_phone || '',
          '{telegram_link}': funnel.telegram_bot_id ? `https://t.me/chica_${funnel.chica_user_id}_bot` : '[Telegram Link]',
          '{vaultx_link}': funnel.vaultx_referral_link || `https://creatorvault.live/ref/${funnel.chica_user_id}`,
          '{referral_link}': funnel.vaultx_referral_link || `https://creatorvault.live/ref/${funnel.chica_user_id}`,
        };
        const render = (text: string) => Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(k, v), text);

        return {
          funnelId: funnel.id,
          chicaName: funnel.chica_name,
          status: funnel.status,
          locale: funnel.locale,
          tinder: {
            bio: render(funnel.tinder_bio || ''),
            opener: render(funnel.tinder_opener || ''),
            cta: render(funnel.tinder_cta || ''),
          },
          whatsapp: (steps as any[]).filter(s => s.platform === 'whatsapp').map(s => ({
            ...s, message_text: render(s.message_text)
          })),
          telegram: (steps as any[]).filter(s => s.platform === 'telegram').map(s => ({
            ...s, message_text: render(s.message_text)
          })),
          vaultx: (steps as any[]).filter(s => s.platform === 'vaultx').map(s => ({
            ...s, message_text: render(s.message_text)
          })),
        };
      } finally {
      }
    }),

  // ── Bulk provision all chicas without an active funnel ────────────────────
  provisionAllUnfunneled: protectedProcedure
    .mutation(async ({ ctx }) => {
      requireKing(ctx.user.role);
      const pool = getPool();
      const conn = await pool.getConnection();
      try {
        const [unfunneled] = await conn.execute(
          "SELECT u.id, u.name FROM users u WHERE u.role = 'chica' AND u.id NOT IN (SELECT chica_user_id FROM chica_funnels WHERE status != 'paused')"
        ) as any;
        const results = [];
        for (const chica of unfunneled) {
          const funnelId = uuidv4();
          const bio = chica.name + " | CreatorVault Empire | Negocio digital";
          const opener = "Hola papi, soy " + chica.name + ". Tengo mi propio negocio digital. Tienes WhatsApp?";
          const cta = "Escribeme directo al WhatsApp — ahi te cuento todo";
          const refLink = "https://creatorvault.live/ref/" + chica.id;
          const offerText = "Unete a mi Vault y gana dinero conmigo";
          await conn.execute(
            "INSERT INTO chica_funnels (id, chica_user_id, funnel_name, locale, status, tinder_bio, tinder_opener, tinder_cta, vaultx_referral_link, vaultx_offer_text) VALUES (?, ?, ?, 'es_DO', 'draft', ?, ?, ?, ?, ?)",
            [funnelId, chica.id, chica.name + "'s Empire Funnel", bio, opener, cta, refLink, offerText]
          );
          const [templateSteps] = await conn.execute(
            "SELECT * FROM chica_funnel_templates WHERE template_name = 'Dominican Chica Funnel' AND platform != 'tinder' ORDER BY platform, step_order"
          ) as any;
          for (const step of templateSteps) {
            await conn.execute(
              "INSERT INTO chica_funnel_steps (funnel_id, step_order, platform, step_type, message_text, delay_hours) VALUES (?, ?, ?, ?, ?, ?)",
              [funnelId, step.step_order, step.platform, step.step_type, step.message_text, step.delay_hours]
            );
          }
          results.push({ chicaId: chica.id, chicaName: chica.name, funnelId, steps: (templateSteps as any[]).length });
        }
        return { success: true, provisioned: results.length, funnels: results };
      } finally {
        conn.release();
        await pool.end();
      }
    }),
});
