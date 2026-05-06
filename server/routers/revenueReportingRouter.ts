/**
 * VaultX Real-Time Revenue Reporting
 * Hourly summary: [Onboarded: X] | [Leads Contacted: Y] | [Total Revenue Generated: $Z] | [Status: Active/Error]
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { db } from "../db";
import { eq, desc, gte, sql, and } from "drizzle-orm";

export const revenueReportingRouter = router({

  // One-line hourly revenue summary
  getHourlySummary: protectedProcedure
    .query(async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const todayStart = new Date(now.setHours(0, 0, 0, 0));

      let onboarded = 0;
      let leadsContacted = 0;
      let totalRevenue = 0;
      let platformFees = 0;
      let status = "Active";
      const errors: string[] = [];

      // Count onboarded creators today
      try {
        const result = await db.db.execute(sql`
          SELECT COUNT(*) as count FROM vaultx_creators 
          WHERE created_at >= ${todayStart.toISOString()}
        `);
        onboarded = Number((result.rows[0] as any)?.count || 0);
      } catch (e: any) {
        errors.push(`onboarded_count: ${e.message}`);
      }

      // Count leads contacted today
      try {
        const result = await db.db.execute(sql`
          SELECT COUNT(*) as count FROM outreach_leads 
          WHERE created_at >= ${todayStart.toISOString()} AND status IN ('sent', 'replied', 'onboarded')
        `);
        leadsContacted = Number((result.rows[0] as any)?.count || 0);
      } catch {
        // outreach_leads table may not exist yet
        leadsContacted = 0;
      }

      // Total revenue today (subscriptions + PPV + tips)
      try {
        const subRevenue = await db.db.execute(sql`
          SELECT COALESCE(SUM(amount), 0) as total FROM vaultx_subscriptions 
          WHERE created_at >= ${todayStart.toISOString()} AND status = 'active'
        `);
        const ppvRevenue = await db.db.execute(sql`
          SELECT COALESCE(SUM(amount), 0) as total FROM vaultx_ppv_purchases 
          WHERE created_at >= ${todayStart.toISOString()}
        `);
        const tipRevenue = await db.db.execute(sql`
          SELECT COALESCE(SUM(amount), 0) as total FROM vaultx_tips 
          WHERE created_at >= ${todayStart.toISOString()}
        `);

        totalRevenue =
          Number((subRevenue.rows[0] as any)?.total || 0) +
          Number((ppvRevenue.rows[0] as any)?.total || 0) +
          Number((tipRevenue.rows[0] as any)?.total || 0);

        platformFees = totalRevenue * 0.15;
      } catch (e: any) {
        errors.push(`revenue_calc: ${e.message}`);
      }

      if (errors.length > 0) status = "Error";

      const summary = `[Onboarded: ${onboarded}] | [Leads Contacted: ${leadsContacted}] | [Total Revenue Generated: $${totalRevenue.toFixed(2)}] | [Platform Fees: $${platformFees.toFixed(2)}] | [Status: ${status}]`;

      return {
        summary,
        onboarded,
        leadsContacted,
        totalRevenue,
        platformFees,
        status,
        errors: errors.length > 0 ? errors : null,
        timestamp: new Date().toISOString(),
        period: "today",
      };
    }),

  // Detailed revenue breakdown
  getRevenueBreakdown: protectedProcedure
    .input(z.object({
      period: z.enum(["hour", "day", "week", "month"]).default("day"),
    }))
    .query(async ({ input }) => {
      const now = new Date();
      const periodMap = {
        hour: new Date(now.getTime() - 60 * 60 * 1000),
        day: new Date(now.setHours(0, 0, 0, 0)),
        week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      };
      const since = periodMap[input.period];

      const breakdown = {
        subscriptions: 0,
        ppv: 0,
        tips: 0,
        customRequests: 0,
        liveStreams: 0,
        total: 0,
        platformFees: 0,
        creatorEarnings: 0,
        activeCreators: 0,
        newSubscribers: 0,
        challengeProgress: {
          fiveKActive: 0,
          fifteenKActive: 0,
          completed5K: 0,
          completed15K: 0,
        },
      };

      try {
        const sub = await db.db.execute(sql`SELECT COALESCE(SUM(amount),0) as t FROM vaultx_subscriptions WHERE created_at >= ${since.toISOString()}`);
        breakdown.subscriptions = Number((sub.rows[0] as any)?.t || 0);
      } catch {}

      try {
        const ppv = await db.db.execute(sql`SELECT COALESCE(SUM(amount),0) as t FROM vaultx_ppv_purchases WHERE created_at >= ${since.toISOString()}`);
        breakdown.ppv = Number((ppv.rows[0] as any)?.t || 0);
      } catch {}

      try {
        const tips = await db.db.execute(sql`SELECT COALESCE(SUM(amount),0) as t FROM vaultx_tips WHERE created_at >= ${since.toISOString()}`);
        breakdown.tips = Number((tips.rows[0] as any)?.t || 0);
      } catch {}

      try {
        const custom = await db.db.execute(sql`SELECT COALESCE(SUM(amount),0) as t FROM vaultx_custom_requests WHERE created_at >= ${since.toISOString()} AND status = 'completed'`);
        breakdown.customRequests = Number((custom.rows[0] as any)?.t || 0);
      } catch {}

      try {
        const creators = await db.db.execute(sql`SELECT COUNT(DISTINCT creator_id) as c FROM vaultx_subscriptions WHERE created_at >= ${since.toISOString()}`);
        breakdown.activeCreators = Number((creators.rows[0] as any)?.c || 0);
      } catch {}

      try {
        const subs = await db.db.execute(sql`SELECT COUNT(*) as c FROM vaultx_subscriptions WHERE created_at >= ${since.toISOString()}`);
        breakdown.newSubscribers = Number((subs.rows[0] as any)?.c || 0);
      } catch {}

      try {
        const challenges = await db.db.execute(sql`
          SELECT 
            SUM(CASE WHEN challenge_type = '5k' AND status = 'active' THEN 1 ELSE 0 END) as five_k_active,
            SUM(CASE WHEN challenge_type = '15k' AND status = 'active' THEN 1 ELSE 0 END) as fifteen_k_active,
            SUM(CASE WHEN challenge_type = '5k' AND status = 'completed' THEN 1 ELSE 0 END) as completed_5k,
            SUM(CASE WHEN challenge_type = '15k' AND status = 'completed' THEN 1 ELSE 0 END) as completed_15k
          FROM empire_challenges
        `);
        const row = challenges.rows[0] as any;
        breakdown.challengeProgress = {
          fiveKActive: Number(row?.five_k_active || 0),
          fifteenKActive: Number(row?.fifteen_k_active || 0),
          completed5K: Number(row?.completed_5k || 0),
          completed15K: Number(row?.completed_15k || 0),
        };
      } catch {}

      breakdown.total = breakdown.subscriptions + breakdown.ppv + breakdown.tips + breakdown.customRequests + breakdown.liveStreams;
      breakdown.platformFees = breakdown.total * 0.15;
      breakdown.creatorEarnings = breakdown.total * 0.85;

      return { breakdown, period: input.period, since: since.toISOString(), timestamp: new Date().toISOString() };
    }),

  // Pipeline health check — reports any backend errors
  getPipelineHealth: protectedProcedure
    .query(async () => {
      const checks = {
        database: false,
        replicateToken: false,
        telegramBot: false,
        openai: false,
        outreachEngine: false,
        automatedDirector: false,
      };
      const errors: Record<string, string> = {};

      // DB check
      try {
        await db.db.execute(sql`SELECT 1`);
        checks.database = true;
      } catch (e: any) {
        errors.database = e.message;
      }

      // Replicate check
      if (process.env.REPLICATE_API_TOKEN) {
        try {
          const res = await fetch("https://api.replicate.com/v1/account", {
            headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
          });
          checks.replicateToken = res.ok;
          if (!res.ok) errors.replicateToken = `HTTP ${res.status}`;
        } catch (e: any) {
          errors.replicateToken = e.message;
        }
      } else {
        errors.replicateToken = "REPLICATE_API_TOKEN not set";
      }

      // Telegram check
      if (process.env.TELEGRAM_BOT_TOKEN) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`);
          const data = await res.json();
          checks.telegramBot = data.ok;
          if (!data.ok) errors.telegramBot = data.description;
        } catch (e: any) {
          errors.telegramBot = e.message;
        }
      } else {
        errors.telegramBot = "TELEGRAM_BOT_TOKEN not set";
      }

      // OpenAI check
      checks.openai = !!process.env.OPENAI_API_KEY;
      if (!checks.openai) errors.openai = "OPENAI_API_KEY not set";

      // Outreach engine check
      checks.outreachEngine = checks.database && checks.openai;

      // Automated director check
      checks.automatedDirector = checks.replicateToken;

      const allHealthy = Object.values(checks).every(Boolean);
      const status = allHealthy ? "Active" : Object.values(checks).some(Boolean) ? "Degraded" : "Error";

      return {
        status,
        checks,
        errors: Object.keys(errors).length > 0 ? errors : null,
        timestamp: new Date().toISOString(),
      };
    }),
});
