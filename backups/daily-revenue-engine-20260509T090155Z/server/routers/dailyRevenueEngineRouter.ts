import { router, protectedProcedure } from "../_core/trpc.js";
import { z } from "zod";
import mysql from "mysql2/promise";

async function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for Daily Revenue Engine operations");
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error("Invalid DATABASE_URL");
  const [, user, password, host, port, database] = m;
  return mysql.createConnection({ host, port: Number(port), user, password, database });
}

function asRows(result: any): any[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result;
  return [];
}

function todayIsoDate(input?: string): string {
  if (!input) return new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) throw new Error("date must use YYYY-MM-DD format");
  return input;
}

function priorityBand(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

const targetPlanInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  operatorLabel: z.string().max(160).optional(),
  targetCreators: z.number().int().min(1).max(500).default(25),
  targetActivations: z.number().int().min(0).max(250).default(5),
  targetFirstDollars: z.number().int().min(0).max(250).default(1),
  targetMrrCents: z.number().int().min(0).default(0),
  executionNotes: z.string().max(5000).optional(),
});

const pipelineStageValues = [
  "targeted",
  "queued",
  "contacted",
  "replied",
  "activated",
  "checkout_started",
  "first_dollar",
  "retained",
  "lost",
] as const;

export const dailyRevenueEngineRouter = router({
  upsertTodayPlan: protectedProcedure
    .input(targetPlanInput)
    .mutation(async ({ input }) => {
      const date = todayIsoDate(input.date);
      const conn = await getDb();
      try {
        await conn.execute(
          `INSERT INTO daily_revenue_plans
           (plan_date, status, operator_label, target_creators, target_activations, target_first_dollars, target_mrr_cents, execution_notes)
           VALUES (?, 'active', ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             status = 'active',
             operator_label = VALUES(operator_label),
             target_creators = VALUES(target_creators),
             target_activations = VALUES(target_activations),
             target_first_dollars = VALUES(target_first_dollars),
             target_mrr_cents = VALUES(target_mrr_cents),
             execution_notes = VALUES(execution_notes),
             updated_at = NOW()`,
          [date, input.operatorLabel || null, input.targetCreators, input.targetActivations, input.targetFirstDollars, input.targetMrrCents, input.executionNotes || null]
        );
        const [rows] = await conn.execute("SELECT * FROM daily_revenue_plans WHERE plan_date = ? LIMIT 1", [date]);
        return { success: true, plan: asRows([rows])[0] };
      } finally {
        await conn.end();
      }
    }),

  addTargetCreator: protectedProcedure
    .input(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      handle: z.string().min(1).max(180),
      platform: z.string().min(1).max(80).default("unknown"),
      creatorId: z.number().int().positive().optional(),
      recruiterProfileId: z.number().int().positive().optional(),
      outreachLeadId: z.number().int().positive().optional(),
      conversionPacketId: z.number().int().positive().optional(),
      priorityScore: z.number().int().min(0).max(100).default(50),
      packagePriority: z.string().max(120).optional(),
      nextAction: z.string().min(1).max(255).default("Send money-first activation message"),
      nextActionDueAt: z.string().datetime().optional(),
      evidencePayload: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      const date = todayIsoDate(input.date);
      const conn = await getDb();
      try {
        await conn.execute(
          `INSERT INTO daily_revenue_plans (plan_date, status)
           VALUES (?, 'active')
           ON DUPLICATE KEY UPDATE updated_at = NOW()`,
          [date]
        );
        const [planRows] = await conn.execute("SELECT id FROM daily_revenue_plans WHERE plan_date = ? LIMIT 1", [date]);
        const plan = asRows([planRows])[0];
        if (!plan) throw new Error("Daily revenue plan was not created");
        const band = priorityBand(input.priorityScore);
        await conn.execute(
          `INSERT INTO daily_creator_pipeline
           (plan_id, creator_id, recruiter_profile_id, outreach_lead_id, conversion_packet_id, handle, platform,
            stage, priority_score, priority_band, package_priority, next_action, next_action_due_at, evidence_payload)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'targeted', ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             creator_id = COALESCE(VALUES(creator_id), creator_id),
             recruiter_profile_id = COALESCE(VALUES(recruiter_profile_id), recruiter_profile_id),
             outreach_lead_id = COALESCE(VALUES(outreach_lead_id), outreach_lead_id),
             conversion_packet_id = COALESCE(VALUES(conversion_packet_id), conversion_packet_id),
             priority_score = VALUES(priority_score),
             priority_band = VALUES(priority_band),
             package_priority = VALUES(package_priority),
             next_action = VALUES(next_action),
             next_action_due_at = VALUES(next_action_due_at),
             evidence_payload = VALUES(evidence_payload),
             updated_at = NOW()`,
          [
            plan.id,
            input.creatorId || null,
            input.recruiterProfileId || null,
            input.outreachLeadId || null,
            input.conversionPacketId || null,
            input.handle,
            input.platform,
            input.priorityScore,
            band,
            input.packagePriority || null,
            input.nextAction,
            input.nextActionDueAt ? new Date(input.nextActionDueAt) : null,
            JSON.stringify(input.evidencePayload || { source: "operator_targeting" }),
          ]
        );
        const [pipelineRows] = await conn.execute(
          "SELECT * FROM daily_creator_pipeline WHERE plan_id = ? AND handle = ? AND platform = ? LIMIT 1",
          [plan.id, input.handle, input.platform]
        );
        const pipeline = asRows([pipelineRows])[0];
        await conn.execute(
          `INSERT INTO daily_creator_events (pipeline_id, event_type, event_source, previous_stage, next_stage, event_payload)
           VALUES (?, 'target_added', 'operator', NULL, 'targeted', ?)`,
          [pipeline.id, JSON.stringify({ priorityScore: input.priorityScore, priorityBand: band, realRevenueCents: 0 })]
        );
        return { success: true, pipeline };
      } finally {
        await conn.end();
      }
    }),

  recordStageEvent: protectedProcedure
    .input(z.object({
      pipelineId: z.number().int().positive(),
      nextStage: z.enum(pipelineStageValues),
      eventType: z.string().min(1).max(80).optional(),
      eventSource: z.string().max(80).default("operator"),
      nextAction: z.string().max(255).optional(),
      activationStatus: z.string().max(80).optional(),
      checkoutStatus: z.string().max(80).optional(),
      evidencePayload: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      const conn = await getDb();
      try {
        const [existingRows] = await conn.execute("SELECT * FROM daily_creator_pipeline WHERE id = ? LIMIT 1", [input.pipelineId]);
        const existing = asRows([existingRows])[0];
        if (!existing) throw new Error("Pipeline record not found");
        await conn.execute(
          `UPDATE daily_creator_pipeline
           SET stage = ?,
               next_action = COALESCE(?, next_action),
               activation_status = COALESCE(?, activation_status),
               checkout_status = COALESCE(?, checkout_status),
               evidence_payload = COALESCE(?, evidence_payload),
               updated_at = NOW()
           WHERE id = ?`,
          [
            input.nextStage,
            input.nextAction || null,
            input.activationStatus || null,
            input.checkoutStatus || null,
            input.evidencePayload ? JSON.stringify(input.evidencePayload) : null,
            input.pipelineId,
          ]
        );
        await conn.execute(
          `INSERT INTO daily_creator_events (pipeline_id, event_type, event_source, previous_stage, next_stage, event_payload)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [input.pipelineId, input.eventType || "stage_changed", input.eventSource, existing.stage, input.nextStage, JSON.stringify(input.evidencePayload || {})]
        );
        return { success: true, previousStage: existing.stage, nextStage: input.nextStage };
      } finally {
        await conn.end();
      }
    }),

  attachFirstDollar: protectedProcedure
    .input(z.object({
      pipelineId: z.number().int().positive(),
      transactionId: z.number().int().positive(),
      evidencePayload: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      const conn = await getDb();
      try {
        const [txRows] = await conn.execute(
          `SELECT id, creator_id, amount_in_cents, creator_share_in_cents, platform_share_in_cents, status
           FROM transactions WHERE id = ? AND status = 'completed' LIMIT 1`,
          [input.transactionId]
        );
        const tx = asRows([txRows])[0];
        if (!tx) throw new Error("Completed transaction not found; first-dollar proof must come from the real transaction ledger");
        await conn.execute(
          `UPDATE daily_creator_pipeline
           SET creator_id = COALESCE(creator_id, ?),
               stage = 'first_dollar',
               activation_status = 'activated',
               checkout_status = 'paid',
               first_revenue_transaction_id = ?,
               real_revenue_cents = ?,
               real_revenue_source = 'transactions',
               evidence_payload = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [tx.creator_id, tx.id, tx.amount_in_cents, JSON.stringify(input.evidencePayload || { transactionId: tx.id }), input.pipelineId]
        );
        await conn.execute(
          `INSERT INTO daily_creator_events (pipeline_id, event_type, event_source, previous_stage, next_stage, event_payload)
           VALUES (?, 'first_dollar_attached', 'transactions', NULL, 'first_dollar', ?)`,
          [input.pipelineId, JSON.stringify({ transactionId: tx.id, amountInCents: tx.amount_in_cents })]
        );
        return { success: true, transaction: tx };
      } finally {
        await conn.end();
      }
    }),

  refreshRevenueSnapshot: protectedProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).optional())
    .mutation(async ({ input }) => {
      const date = todayIsoDate(input?.date);
      const conn = await getDb();
      try {
        const [subRows] = await conn.execute(
          `SELECT COUNT(*) AS active_subscriptions FROM subscriptions WHERE status = 'active'`
        );
        const [cashRows] = await conn.execute(
          `SELECT COALESCE(SUM(amount_in_cents), 0) AS cash_collected_cents,
                  COALESCE(SUM(creator_share_in_cents), 0) AS creator_earnings_cents,
                  COALESCE(SUM(platform_share_in_cents), 0) AS platform_share_cents,
                  COUNT(DISTINCT creator_id) AS first_dollar_creators
           FROM transactions
           WHERE status = 'completed' AND DATE(created_at) = ?`,
          [date]
        );
        const [pipelineRows] = await conn.execute(
          `SELECT
              SUM(CASE WHEN stage IN ('contacted','replied','activated','checkout_started','first_dollar','retained') THEN 1 ELSE 0 END) AS contacted,
              SUM(CASE WHEN stage IN ('activated','checkout_started','first_dollar','retained') THEN 1 ELSE 0 END) AS activated,
              SUM(CASE WHEN stage IN ('first_dollar','retained') OR first_revenue_transaction_id IS NOT NULL THEN 1 ELSE 0 END) AS first_dollars,
              SUM(CASE WHEN checkout_status = 'started' OR stage = 'checkout_started' THEN 1 ELSE 0 END) AS checkout_started
           FROM daily_creator_pipeline dcp
           JOIN daily_revenue_plans drp ON drp.id = dcp.plan_id
           WHERE drp.plan_date = ?`,
          [date]
        );
        const sub = asRows([subRows])[0] || {};
        const cash = asRows([cashRows])[0] || {};
        const pipe = asRows([pipelineRows])[0] || {};
        const activeSubscriptions = Number(sub.active_subscriptions || 0);
        const mrrCents = Number(cash.cash_collected_cents || 0);
        const cashCollectedCents = Number(cash.cash_collected_cents || 0);
        const creatorEarningsCents = Number(cash.creator_earnings_cents || 0);
        const platformShareCents = Number(cash.platform_share_cents || 0);
        const firstDollarCreators = Number(pipe.first_dollars || cash.first_dollar_creators || 0);
        const checkoutStartedCount = Number(pipe.checkout_started || 0);
        await conn.execute(
          `INSERT INTO daily_revenue_snapshots
           (snapshot_date, active_subscriptions, mrr_cents, cash_collected_cents, creator_earnings_cents,
            platform_share_cents, first_dollar_creators, checkout_started_count, checkout_recovered_count, source_tables, computed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW())
           ON DUPLICATE KEY UPDATE
             active_subscriptions = VALUES(active_subscriptions),
             mrr_cents = VALUES(mrr_cents),
             cash_collected_cents = VALUES(cash_collected_cents),
             creator_earnings_cents = VALUES(creator_earnings_cents),
             platform_share_cents = VALUES(platform_share_cents),
             first_dollar_creators = VALUES(first_dollar_creators),
             checkout_started_count = VALUES(checkout_started_count),
             source_tables = VALUES(source_tables),
             computed_at = NOW(),
             updated_at = NOW()`,
          [
            date,
            activeSubscriptions,
            mrrCents,
            cashCollectedCents,
            creatorEarningsCents,
            platformShareCents,
            firstDollarCreators,
            checkoutStartedCount,
            JSON.stringify(["subscriptions", "transactions", "daily_creator_pipeline"]),
          ]
        );
        await conn.execute(
          `UPDATE daily_revenue_plans
           SET actual_creators_contacted = ?, actual_activations = ?, actual_first_dollars = ?, actual_mrr_cents = ?, actual_cash_collected_cents = ?, updated_at = NOW()
           WHERE plan_date = ?`,
          [Number(pipe.contacted || 0), Number(pipe.activated || 0), firstDollarCreators, mrrCents, cashCollectedCents, date]
        );
        const [snapshotRows] = await conn.execute("SELECT * FROM daily_revenue_snapshots WHERE snapshot_date = ? LIMIT 1", [date]);
        return { success: true, snapshot: asRows([snapshotRows])[0], sourceTables: ["subscriptions", "transactions", "daily_creator_pipeline"] };
      } finally {
        await conn.end();
      }
    }),

  commandCenter: protectedProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), limit: z.number().int().min(1).max(100).default(50) }).optional())
    .query(async ({ input }) => {
      const date = todayIsoDate(input?.date);
      const limit = input?.limit || 50;
      const conn = await getDb();
      try {
        const [planRows] = await conn.execute("SELECT * FROM daily_revenue_plans WHERE plan_date = ? LIMIT 1", [date]);
        const [snapshotRows] = await conn.execute("SELECT * FROM daily_revenue_snapshots WHERE snapshot_date = ? LIMIT 1", [date]);
        const [pipelineRows] = await conn.execute(
          `SELECT dcp.* FROM daily_creator_pipeline dcp
           JOIN daily_revenue_plans drp ON drp.id = dcp.plan_id
           WHERE drp.plan_date = ?
           ORDER BY dcp.priority_score DESC, dcp.updated_at DESC
           LIMIT ?`,
          [date, limit]
        );
        const [eventRows] = await conn.execute(
          `SELECT dce.* FROM daily_creator_events dce
           JOIN daily_creator_pipeline dcp ON dcp.id = dce.pipeline_id
           JOIN daily_revenue_plans drp ON drp.id = dcp.plan_id
           WHERE drp.plan_date = ?
           ORDER BY dce.occurred_at DESC
           LIMIT 25`,
          [date]
        );
        const [realRevenueRows] = await conn.execute(
          `SELECT COUNT(*) AS completed_transactions,
                  COALESCE(SUM(amount_in_cents), 0) AS cash_collected_cents,
                  COALESCE(SUM(creator_share_in_cents), 0) AS creator_earnings_cents,
                  COALESCE(SUM(platform_share_in_cents), 0) AS platform_share_cents
           FROM transactions WHERE status = 'completed' AND DATE(created_at) = ?`,
          [date]
        );
        const plan = asRows([planRows])[0] || null;
        const snapshot = asRows([snapshotRows])[0] || null;
        const pipeline = asRows([pipelineRows]);
        const realRevenue = asRows([realRevenueRows])[0] || {};
        return {
          date,
          plan,
          snapshot,
          pipeline,
          recentEvents: asRows([eventRows]),
          realRevenueLedger: {
            sourceTables: ["transactions", "subscriptions"],
            completedTransactions: Number(realRevenue.completed_transactions || 0),
            cashCollectedCents: Number(realRevenue.cash_collected_cents || 0),
            creatorEarningsCents: Number(realRevenue.creator_earnings_cents || 0),
            platformShareCents: Number(realRevenue.platform_share_cents || 0),
            syntheticMetricsIncluded: false,
          },
          operatorTruth: {
            targetsAreOperatorEntered: true,
            revenueIsLedgerBacked: true,
            projectionsIncluded: false,
            activationRequiresRecordedStage: true,
          },
        };
      } finally {
        await conn.end();
      }
    }),
});
