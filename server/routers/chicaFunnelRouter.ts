import { z } from 'zod';
import { router, kingProcedure, protectedProcedure } from '../_core/trpc.js';
// NOTE: db is imported from '../db' NOT '../_core/db.js' — _core/db.ts does not exist
// NOTE: kingProcedure does not exist — use kingProcedure for owner-only endpoints
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

// Chica business model types
const CHICA_FUNNEL_TYPES = {
  8001: { name: 'Delbania', template: 'Delbania Boutique Funnel', type: 'boutique_fitness', platform: 'boutique' },
  8002: { name: 'Marielka', template: 'Dominican Chica Funnel', type: 'adult_content', platform: 'vaultx' },
  8003: { name: 'Lizzy', template: 'Lizzy Fitness Funnel', type: 'fitness_lifestyle', platform: 'fitness' },
  8004: { name: 'Lirys', template: 'Lirys Airbnb Funnel', type: 'airbnb_lifestyle', platform: 'airbnb' },
} as const;

export const chicaFunnelRouter = router({
  // List all chica funnels
  list: kingProcedure.query(async () => {
    const [rows] = await db.execute(
      `SELECT cf.*, 
        (SELECT COUNT(*) FROM chica_funnel_steps cfs WHERE cfs.funnel_id = cf.id) as step_count
       FROM chica_funnels cf ORDER BY cf.chica_user_id`
    );
    return rows;
  }),

  // Get a single funnel with all steps
  get: kingProcedure
    .input(z.object({ funnelId: z.string() }))
    .query(async ({ input }) => {
      const [funnels] = await db.execute(
        'SELECT * FROM chica_funnels WHERE id = ?',
        [input.funnelId]
      );
      const funnel = (funnels as any[])[0];
      if (!funnel) throw new Error('Funnel not found');

      const [steps] = await db.execute(
        'SELECT * FROM chica_funnel_steps WHERE funnel_id = ? ORDER BY platform, step_order',
        [input.funnelId]
      );
      return { ...funnel, steps };
    }),

  // Provision funnel for a specific chica
  provision: kingProcedure
    .input(z.object({ chicaUserId: z.number() }))
    .mutation(async ({ input }) => {
      const { chicaUserId } = input;
      const chicaConfig = CHICA_FUNNEL_TYPES[chicaUserId as keyof typeof CHICA_FUNNEL_TYPES];
      if (!chicaConfig) throw new Error(`No funnel config for chica ID ${chicaUserId}`);

      // Check if funnel already exists
      const [existing] = await db.execute(
        'SELECT id FROM chica_funnels WHERE chica_user_id = ?',
        [chicaUserId]
      );
      if ((existing as any[]).length > 0) {
        return { message: 'Funnel already exists', funnelId: (existing as any[])[0].id };
      }

      const funnelId = uuidv4();
      await db.execute(
        `INSERT INTO chica_funnels (id, chica_user_id, funnel_name, locale, status, provisioned_at)
         VALUES (?, ?, ?, 'es_DO', 'draft', NOW())`,
        [funnelId, chicaUserId, `${chicaConfig.name}'s ${chicaConfig.type.replace(/_/g, ' ')} Funnel`]
      );

      // Copy steps from template
      const [templates] = await db.execute(
        'SELECT * FROM chica_funnel_templates WHERE template_name = ? ORDER BY platform, step_order',
        [chicaConfig.template]
      );

      for (const tmpl of templates as any[]) {
        await db.execute(
          `INSERT INTO chica_funnel_steps (funnel_id, step_order, platform, step_type, message_text, delay_hours, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [funnelId, tmpl.step_order, tmpl.platform, tmpl.step_type, tmpl.message_text, tmpl.delay_hours]
        );
      }

      return { message: 'Funnel provisioned', funnelId, template: chicaConfig.template };
    }),

  // Provision ALL chicas that don't have funnels yet
  provisionAllUnfunneled: kingProcedure.mutation(async () => {
    const results = [];
    for (const [chicaId, config] of Object.entries(CHICA_FUNNEL_TYPES)) {
      const userId = parseInt(chicaId);
      const [existing] = await db.execute(
        'SELECT id FROM chica_funnels WHERE chica_user_id = ?',
        [userId]
      );
      if ((existing as any[]).length > 0) {
        results.push({ chicaId: userId, name: config.name, status: 'already_exists' });
        continue;
      }

      const funnelId = uuidv4();
      await db.execute(
        `INSERT INTO chica_funnels (id, chica_user_id, funnel_name, locale, status, provisioned_at)
         VALUES (?, ?, ?, 'es_DO', 'draft', NOW())`,
        [funnelId, userId, `${config.name}'s Funnel`]
      );

      const [templates] = await db.execute(
        'SELECT * FROM chica_funnel_templates WHERE template_name = ? ORDER BY platform, step_order',
        [config.template]
      );

      for (const tmpl of templates as any[]) {
        await db.execute(
          `INSERT INTO chica_funnel_steps (funnel_id, step_order, platform, step_type, message_text, delay_hours, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [funnelId, tmpl.step_order, tmpl.platform, tmpl.step_type, tmpl.message_text, tmpl.delay_hours]
        );
      }

      results.push({ chicaId: userId, name: config.name, funnelId, status: 'provisioned' });
    }
    return results;
  }),

  // Update funnel fields
  update: kingProcedure
    .input(z.object({
      funnelId: z.string(),
      tinderBio: z.string().optional(),
      tinderOpener: z.string().optional(),
      tinderCta: z.string().optional(),
      vaultxReferralLink: z.string().optional(),
      vaultxOfferText: z.string().optional(),
      status: z.enum(['draft', 'active', 'paused']).optional(),
    }))
    .mutation(async ({ input }) => {
      const { funnelId, ...fields } = input;
      const updates: string[] = [];
      const values: any[] = [];

      if (fields.tinderBio !== undefined) { updates.push('tinder_bio = ?'); values.push(fields.tinderBio); }
      if (fields.tinderOpener !== undefined) { updates.push('tinder_opener = ?'); values.push(fields.tinderOpener); }
      if (fields.tinderCta !== undefined) { updates.push('tinder_cta = ?'); values.push(fields.tinderCta); }
      if (fields.vaultxReferralLink !== undefined) { updates.push('vaultx_referral_link = ?'); values.push(fields.vaultxReferralLink); }
      if (fields.vaultxOfferText !== undefined) { updates.push('vaultx_offer_text = ?'); values.push(fields.vaultxOfferText); }
      if (fields.status !== undefined) { updates.push('status = ?'); values.push(fields.status); }

      if (updates.length === 0) throw new Error('No fields to update');
      values.push(funnelId);

      await db.execute(
        `UPDATE chica_funnels SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
      return { message: 'Funnel updated' };
    }),

  // Activate a funnel
  activate: kingProcedure
    .input(z.object({ funnelId: z.string() }))
    .mutation(async ({ input }) => {
      await db.execute(
        "UPDATE chica_funnels SET status = 'active' WHERE id = ?",
        [input.funnelId]
      );
      return { message: 'Funnel activated' };
    }),

  // Pause a funnel
  pause: kingProcedure
    .input(z.object({ funnelId: z.string() }))
    .mutation(async ({ input }) => {
      await db.execute(
        "UPDATE chica_funnels SET status = 'paused' WHERE id = ?",
        [input.funnelId]
      );
      return { message: 'Funnel paused' };
    }),

  // Get TikTok content plan for a chica
  getTikTokPlan: kingProcedure
    .input(z.object({ chicaUserId: z.number() }))
    .query(async ({ input }) => {
      const plans: Record<number, any> = {
        8001: {
          name: 'Delbania',
          contentType: 'Fitness + Boutique',
          hooks: [
            'POV: Dominican girl building her empire 💪',
            'Watch me transform this hair in 60 seconds ✨',
            'Day in the life of a single mom boss 👑',
          ],
          cta: 'Link in bio for my boutique + fitness guides',
          linkInBio: 'https://creatorvault.live/chica/8001',
          postingSchedule: '3x daily: 7AM, 12PM, 7PM DR time',
          monetizationPath: 'TikTok → Link in Bio → WhatsApp → Boutique Sales',
          revenueTarget: '$500-$2,000/month from boutique + fitness guides',
        },
        8002: {
          name: 'Marielka (China)',
          contentType: 'Lifestyle + Glow Up (SFW only on TikTok)',
          hooks: [
            'The girl they warned you about 😈',
            'Glow up check — 1 year later ✨',
            'Things I don\'t post on TikTok 🔥 (link in bio)',
          ],
          cta: 'Link in bio for exclusive content',
          linkInBio: 'https://creatorvault.live/chica/8002',
          postingSchedule: '3x daily: 7AM, 12PM, 7PM DR time',
          monetizationPath: 'TikTok → Link in Bio → WhatsApp → VaultX',
          revenueTarget: '$500-$3,000/month from VaultX subscriptions',
          urgent: true,
          urgentNote: 'Rent 2 months overdue — need 10 VaultX subs at $30 = $300 ASAP',
        },
        8003: {
          name: 'Lizzy (Slim)',
          contentType: 'Sexy Fitness + Lifestyle',
          hooks: [
            'How I stay fit as a single mom 💪',
            'My full body workout in 60 seconds 🔥',
            'What I eat in a day to maintain this body 🍑',
          ],
          cta: 'Link in bio for my full workout plan',
          linkInBio: 'https://creatorvault.live/chica/8003',
          postingSchedule: '3x daily: 7AM, 12PM, 7PM DR time',
          monetizationPath: 'TikTok → Link in Bio → WhatsApp → Workout Plan Purchase',
          revenueTarget: '$250-$1,500/month from fitness plans',
        },
        8004: {
          name: 'Lirys (Twin)',
          contentType: 'Airbnb + Dominican Republic Lifestyle',
          hooks: [
            'POV: You\'re staying at the best Airbnb in DR 🌴',
            'Why everyone is moving to the Dominican Republic 🏖️',
            'Tour of my Airbnb — would you stay here? 🏠',
          ],
          cta: 'Link in bio to book my Airbnb',
          linkInBio: 'https://creatorvault.live/chica/8004',
          postingSchedule: '3x daily: 7AM, 12PM, 7PM DR time',
          monetizationPath: 'TikTok → Link in Bio → WhatsApp → Airbnb Booking',
          revenueTarget: '$500-$2,000/month from Airbnb bookings',
        },
      };
      return plans[input.chicaUserId] || null;
    }),

  // Get all TikTok plans
  getAllTikTokPlans: kingProcedure.query(async () => {
    return {
      strategy: 'TikTok = free advertising. Money is made OUTSIDE TikTok. Link-in-bio is the bridge.',
      rule: 'NEVER post adult content on TikTok. NEVER say OnlyFans/VaultX. Use "exclusive content" or "private community".',
      chicas: [
        { id: 8001, name: 'Delbania', model: 'Boutique + Fitness', tiktokContent: 'Hair transformations, fitness routines, single mom boss life' },
        { id: 8002, name: 'Marielka (China)', model: 'Adult Content (VaultX)', tiktokContent: 'Lifestyle, glow ups, fashion — SFW only on TikTok', urgent: true },
        { id: 8003, name: 'Lizzy (Slim)', model: 'Sexy Fitness', tiktokContent: 'Workout videos, body transformation, meal prep' },
        { id: 8004, name: 'Lirys (Twin)', model: 'Airbnb + Lifestyle', tiktokContent: 'Airbnb tours, DR lifestyle, travel content' },
      ],
    };
  }),
});
