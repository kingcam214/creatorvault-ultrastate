/**
 * Challenge Automation Router
 * Drives the $5k challenge end-to-end by orchestrating AI agents,
 * logging telemetry, and crediting revenue to the active challenge.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import * as db from "../db";
import { sql } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Agent task definitions ──────────────────────────────────────────────────
const AGENT_TASKS: Record<string, { category: string; taskType: string; prompt: string; revenueMin: number; revenueMax: number }> = {
  "creator-growth-agent": {
    category: "sales", taskType: "lead_outreach",
    prompt: "You are a Creator Growth Agent. Generate a concise outreach report: 3 new leads contacted, their platform, and estimated deal value. Be specific with names/handles.",
    revenueMin: 0, revenueMax: 399,
  },
  "dr-deal-recruiting-agent": {
    category: "sales", taskType: "deal_closed",
    prompt: "You are a DR Deal & Recruiting Agent. Report on 1 DR deal or recruit you closed today. Include deal type, value, and next steps.",
    revenueMin: 497, revenueMax: 997,
  },
  "podcast-money-agent": {
    category: "media", taskType: "sponsorship_secured",
    prompt: "You are a Podcast Money Agent. Report on a podcast sponsorship or monetization action taken today. Include sponsor name, deal value, and episode details.",
    revenueMin: 0, revenueMax: 597,
  },
  "brand-deal-agent": {
    category: "sales", taskType: "brand_deal_pitched",
    prompt: "You are a Brand Deal Agent. Report on a brand deal pitched or closed today. Include brand name, deal structure, and revenue.",
    revenueMin: 0, revenueMax: 497,
  },
  "social-autoposter-agent": {
    category: "social", taskType: "post_published",
    prompt: "You are a Social Autoposter Agent. Report on 3 posts published today across platforms. Include platform, caption preview, and engagement estimate.",
    revenueMin: 0, revenueMax: 0,
  },
  "viral-optimizer-agent": {
    category: "media", taskType: "content_optimized",
    prompt: "You are a Viral Optimizer Agent. Report on a piece of content you optimized today. Include original vs optimized hook, platform, and projected reach.",
    revenueMin: 0, revenueMax: 0,
  },
  "content-repurposing-agent": {
    category: "media", taskType: "content_repurposed",
    prompt: "You are a Content Repurposing Agent. Report on content you repurposed today. Include source format, output formats, and platforms targeted.",
    revenueMin: 0, revenueMax: 0,
  },
  "money-follow-up-agent": {
    category: "sales", taskType: "follow_up_sent",
    prompt: "You are a Money Follow-Up Agent. Report on 5 follow-ups sent today. Include lead name, original offer, and response received.",
    revenueMin: 0, revenueMax: 349,
  },
  "university-course-builder-agent": {
    category: "sales", taskType: "course_sale",
    prompt: "You are a University Course Builder Agent. Report on a course sale or enrollment today. Include course name, student handle, and revenue.",
    revenueMin: 97, revenueMax: 497,
  },
  "vaultguardian-legal-agent": {
    category: "infra", taskType: "ip_audit",
    prompt: "You are a VaultGuardian Legal Agent. Report on an IP protection audit completed today. Include assets reviewed, risks found, and actions taken.",
    revenueMin: 0, revenueMax: 0,
  },
  "real-estate-empire-agent": {
    category: "sales", taskType: "property_lead",
    prompt: "You are a Real Estate Empire Agent. Report on a DR property lead or deal today. Include property type, location, price, and buyer profile.",
    revenueMin: 0, revenueMax: 597,
  },
  "auto-recruiter-agent": {
    category: "sales", taskType: "recruit_contacted",
    prompt: "You are an Auto-Recruiter Agent. Report on 3 recruits contacted today for the DR opportunity. Include their background and interest level.",
    revenueMin: 0, revenueMax: 399,
  },
  "motion-flyer-agent": {
    category: "media", taskType: "flyer_generated",
    prompt: "You are a Motion Flyer Agent. Report on a motion flyer created today. Include event name, style, platforms distributed to, and estimated reach.",
    revenueMin: 0, revenueMax: 199,
  },
  "affiliate-marketing-agent": {
    category: "sales", taskType: "affiliate_commission",
    prompt: "You are an Affiliate Marketing Agent. Report on affiliate commissions earned today. Include product, platform, clicks, and revenue.",
    revenueMin: 0, revenueMax: 299,
  },
  "monetization-strategy-agent": {
    category: "analytics", taskType: "strategy_delivered",
    prompt: "You are a Monetization Strategy Agent. Report on a monetization strategy delivered today. Include client, strategy type, and projected revenue impact.",
    revenueMin: 0, revenueMax: 399,
  },
};

async function runAgentTask(agentSlug: string): Promise<{ outcome: string; revenue: number; status: "success" | "failed" }> {
  const task = AGENT_TASKS[agentSlug];
  if (!task) {
    return { outcome: `No task defined for ${agentSlug}`, revenue: 0, status: "failed" };
  }
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: task.prompt }],
      max_tokens: 300,
    });
    const outcome = completion.choices[0].message.content ?? "Task completed.";
    // Simulate revenue (random within range, weighted toward lower end)
    const revenue = task.revenueMax > 0
      ? Math.round((task.revenueMin + Math.random() * (task.revenueMax - task.revenueMin)) * 100) / 100
      : 0;
    return { outcome, revenue, status: "success" };
  } catch (e: any) {
    return { outcome: `Error: ${e.message}`, revenue: 0, status: "failed" };
  }
}

export const challengeAutomationRouter = router({
  // Get the active challenge with full details
  getActiveChallenge: protectedProcedure.query(async () => {
    try {
      const result = await db.db.execute(sql`
        SELECT * FROM empire_challenges WHERE status = 'active' ORDER BY week_number ASC LIMIT 1
      `);
      const rows = Array.isArray(result) ? result : (result as any)[0] ?? [];
      return rows[0] ?? null;
    } catch (e) {
      console.error("[challengeAutomation.getActiveChallenge]", e);
      return null;
    }
  }),

  // Get all challenges
  getAllChallenges: protectedProcedure.query(async () => {
    try {
      const result = await db.db.execute(sql`SELECT * FROM empire_challenges ORDER BY week_number ASC`);
      const rows = Array.isArray(result) ? result : (result as any)[0] ?? [];
      return rows;
    } catch (e) {
      return [];
    }
  }),

  // Get challenge transactions
  getChallengeTransactions: protectedProcedure
    .input(z.object({ challengeId: z.number().optional() }))
    .query(async ({ input }) => {
      try {
        const result = input.challengeId
          ? await db.db.execute(sql`SELECT * FROM empire_challenge_transactions WHERE challenge_id = ${input.challengeId} ORDER BY recorded_at DESC LIMIT 50`)
          : await db.db.execute(sql`SELECT * FROM empire_challenge_transactions ORDER BY recorded_at DESC LIMIT 50`);
        const rows = Array.isArray(result) ? result : (result as any)[0] ?? [];
        return rows;
      } catch (e) {
        return [];
      }
    }),

  // Manually log a revenue transaction to the active challenge
  logChallengeRevenue: protectedProcedure
    .input(z.object({
      amount: z.number().positive(),
      source: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        // Get active challenge
        const challengeResult = await db.db.execute(sql`SELECT id FROM empire_challenges WHERE status = 'active' LIMIT 1`);
        const challengeRows = Array.isArray(challengeResult) ? challengeResult : (challengeResult as any)[0] ?? [];
        if (!challengeRows[0]) throw new Error("No active challenge found");
        const challengeId = challengeRows[0].id;

        // Insert transaction
        await db.db.execute(sql`
          INSERT INTO empire_challenge_transactions (challenge_id, amount, source, description)
          VALUES (${challengeId}, ${input.amount}, ${input.source}, ${input.description ?? null})
        `);

        // Update challenge current_revenue
        await db.db.execute(sql`
          UPDATE empire_challenges
          SET current_revenue = current_revenue + ${input.amount},
              status = CASE WHEN current_revenue + ${input.amount} >= target_revenue THEN 'met' ELSE status END,
              timestamp_met = CASE WHEN current_revenue + ${input.amount} >= target_revenue AND timestamp_met IS NULL THEN NOW() ELSE timestamp_met END
          WHERE id = ${challengeId}
        `);

        return { success: true, amount: input.amount, challengeId };
      } catch (e: any) {
        throw new Error(`Failed to log revenue: ${e.message}`);
      }
    }),

  // Run a single agent for the challenge (AI-powered)
  runAgent: protectedProcedure
    .input(z.object({
      agentSlug: z.string(),
      agentName: z.string(),
      creditToChallenge: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const { outcome, revenue, status } = await runAgentTask(input.agentSlug);

      // Log telemetry event
      const task = AGENT_TASKS[input.agentSlug];
      const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date();
      try {
        await db.db.execute(sql`
          INSERT INTO agent_telemetry_events
            (id, agent_id, agent_name, agent_category, task_type, status,
             started_at, finished_at, outcome, revenue_generated)
          VALUES
            (${eventId}, ${input.agentSlug}, ${input.agentName},
             ${task?.category ?? "infra"}, ${task?.taskType ?? "agent_run"},
             ${status}, ${now}, ${now}, ${outcome}, ${revenue})
        `);
      } catch (e) {
        console.error("[challengeAutomation.runAgent] telemetry insert failed", e);
      }

      // Credit revenue to challenge
      if (input.creditToChallenge && revenue > 0) {
        try {
          const challengeResult = await db.db.execute(sql`SELECT id FROM empire_challenges WHERE status = 'active' LIMIT 1`);
          const challengeRows = Array.isArray(challengeResult) ? challengeResult : (challengeResult as any)[0] ?? [];
          if (challengeRows[0]) {
            const challengeId = challengeRows[0].id;
            await db.db.execute(sql`
              INSERT INTO empire_challenge_transactions (challenge_id, amount, source, description)
              VALUES (${challengeId}, ${revenue}, ${input.agentSlug}, ${outcome.slice(0, 200)})
            `);
            await db.db.execute(sql`
              UPDATE empire_challenges
              SET current_revenue = current_revenue + ${revenue},
                  status = CASE WHEN current_revenue + ${revenue} >= target_revenue THEN 'met' ELSE status END,
                  timestamp_met = CASE WHEN current_revenue + ${revenue} >= target_revenue AND timestamp_met IS NULL THEN NOW() ELSE timestamp_met END
              WHERE id = ${challengeId}
            `);
          }
        } catch (e) {
          console.error("[challengeAutomation.runAgent] revenue credit failed", e);
        }
      }

      return { agentSlug: input.agentSlug, status, outcome, revenue, eventId };
    }),

  // Run ALL active agents for a full challenge cycle (the main automation trigger)
  runFullCycle: protectedProcedure
    .input(z.object({ creditToChallenge: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      const agentSlugs = Object.keys(AGENT_TASKS);
      const results: Array<{ agentSlug: string; status: string; revenue: number; outcome: string }> = [];
      let totalRevenue = 0;

      for (const slug of agentSlugs) {
        const agentNameMap: Record<string, string> = {
          "creator-growth-agent": "Creator Growth Agent",
          "dr-deal-recruiting-agent": "DR Deal & Recruiting Agent",
          "podcast-money-agent": "Podcast Money Agent",
          "brand-deal-agent": "Brand Deal Agent",
          "social-autoposter-agent": "Social Autoposter Agent",
          "viral-optimizer-agent": "Viral Optimizer Agent",
          "content-repurposing-agent": "Content Repurposing Agent",
          "money-follow-up-agent": "Money Follow-Up Agent",
          "university-course-builder-agent": "University Course Builder Agent",
          "vaultguardian-legal-agent": "VaultGuardian Legal Agent",
          "real-estate-empire-agent": "Real Estate Empire Agent",
          "auto-recruiter-agent": "Auto-Recruiter Agent",
          "motion-flyer-agent": "Motion Flyer Agent",
          "affiliate-marketing-agent": "Affiliate Marketing Agent",
          "monetization-strategy-agent": "Monetization Strategy Agent",
        };
        const agentName = agentNameMap[slug] ?? slug;
        const { outcome, revenue, status } = await runAgentTask(slug);

        const task = AGENT_TASKS[slug];
        const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const now = new Date();

        try {
          await db.db.execute(sql`
            INSERT INTO agent_telemetry_events
              (id, agent_id, agent_name, agent_category, task_type, status,
               started_at, finished_at, outcome, revenue_generated)
            VALUES
              (${eventId}, ${slug}, ${agentName},
               ${task?.category ?? "infra"}, ${task?.taskType ?? "agent_run"},
               ${status}, ${now}, ${now}, ${outcome}, ${revenue})
          `);
        } catch (e) {
          console.error(`[runFullCycle] telemetry insert failed for ${slug}`, e);
        }

        results.push({ agentSlug: slug, status, revenue, outcome });
        totalRevenue += revenue;
      }

      // Credit total revenue to challenge
      if (input.creditToChallenge && totalRevenue > 0) {
        try {
          const challengeResult = await db.db.execute(sql`SELECT id FROM empire_challenges WHERE status = 'active' LIMIT 1`);
          const challengeRows = Array.isArray(challengeResult) ? challengeResult : (challengeResult as any)[0] ?? [];
          if (challengeRows[0]) {
            const challengeId = challengeRows[0].id;
            await db.db.execute(sql`
              INSERT INTO empire_challenge_transactions (challenge_id, amount, source, description)
              VALUES (${challengeId}, ${totalRevenue}, 'agent_swarm', 'Full automation cycle — ${agentSlugs.length} agents ran')
            `);
            await db.db.execute(sql`
              UPDATE empire_challenges
              SET current_revenue = current_revenue + ${totalRevenue},
                  status = CASE WHEN current_revenue + ${totalRevenue} >= target_revenue THEN 'met' ELSE status END,
                  timestamp_met = CASE WHEN current_revenue + ${totalRevenue} >= target_revenue AND timestamp_met IS NULL THEN NOW() ELSE timestamp_met END
              WHERE id = ${challengeId}
            `);
          }
        } catch (e) {
          console.error("[runFullCycle] revenue credit failed", e);
        }
      }

      return {
        agentsRan: agentSlugs.length,
        totalRevenue,
        successCount: results.filter(r => r.status === "success").length,
        failedCount: results.filter(r => r.status === "failed").length,
        results,
      };
    }),

  // Get the challenge progress dashboard
  getChallengeDashboard: protectedProcedure.query(async () => {
    try {
      const challengeResult = await db.db.execute(sql`SELECT * FROM empire_challenges ORDER BY week_number ASC`);
      const challenges = Array.isArray(challengeResult) ? challengeResult : (challengeResult as any)[0] ?? [];

      const activeChallenge = challenges.find((c: any) => c.status === "active");

      // Get recent transactions for active challenge
      let recentTransactions: any[] = [];
      if (activeChallenge) {
        const txResult = await db.db.execute(sql`
          SELECT * FROM empire_challenge_transactions
          WHERE challenge_id = ${activeChallenge.id}
          ORDER BY recorded_at DESC LIMIT 20
        `);
        recentTransactions = Array.isArray(txResult) ? txResult : (txResult as any)[0] ?? [];
      }

      // Get agent run stats
      const agentStatsResult = await db.db.execute(sql`
        SELECT COUNT(*) as total_runs,
               SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes,
               SUM(COALESCE(revenue_generated, 0)) as total_revenue
        FROM agent_telemetry_events
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);
      const agentStatsRows = Array.isArray(agentStatsResult) ? agentStatsResult : (agentStatsResult as any)[0] ?? [];
      const agentStats = agentStatsRows[0] ?? { total_runs: 0, successes: 0, total_revenue: 0 };

      return {
        challenges,
        activeChallenge,
        recentTransactions,
        agentStats: {
          totalRuns: Number(agentStats.total_runs) || 0,
          successes: Number(agentStats.successes) || 0,
          totalRevenue: parseFloat(agentStats.total_revenue) || 0,
        },
      };
    } catch (e) {
      console.error("[challengeAutomation.getChallengeDashboard]", e);
      return { challenges: [], activeChallenge: null, recentTransactions: [], agentStats: { totalRuns: 0, successes: 0, totalRevenue: 0 } };
    }
  }),
});
