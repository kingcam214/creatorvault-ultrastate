import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import Stripe from "stripe";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import {
  getRecentAgentActionReceipts,
  recordAgentActionReceipt,
} from "../services/agentActionReceipts";

const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "king" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner approval is required for agent command control." });
  }
  return next({ ctx });
});

const AGENT_HOLD_REASON = "Agent arsenal rebuild: real source, owner approval, action receipt, and observed result are required before activation.";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function rowsFromExecute(result: any): any[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0];
  if (Array.isArray(result)) return result;
  return result?.rows ?? [];
}

export const agentExecutorRouter = router({
  getCommandStatus: ownerProcedure.query(async () => {
    const statusRows = rowsFromExecute(await db.db.execute(sql`
      SELECT status, COUNT(*) AS count
      FROM empire_agents
      GROUP BY status
    `));
    const latestReceipts = await getRecentAgentActionReceipts({ limit: 12 });
    const activeCount = Number(statusRows.find((row: any) => row.status === "active")?.count ?? 0);
    const heldCount = Number(statusRows.find((row: any) => row.status === "inactive")?.count ?? 0);

    return {
      autonomousExecutionEnabled: process.env.VAULTX_CHALLENGE_AGENTS_AUTORUN === "true",
      activeCount,
      heldCount,
      statuses: statusRows.map((row: any) => ({ status: String(row.status), count: Number(row.count ?? 0) })),
      activationRequirement: AGENT_HOLD_REASON,
      latestReceipts,
    };
  }),

  holdUnprovenRoster: ownerProcedure
    .input(z.object({ reason: z.string().trim().min(3).max(500).optional() }).optional())
    .mutation(async ({ input, ctx }) => {
      const reason = input?.reason || AGENT_HOLD_REASON;
      const result = await db.db.execute(sql`
        UPDATE empire_agents
        SET status = 'inactive', paused_until = NULL
        WHERE status = 'active'
      `);
      const affectedRows = Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);
      const receiptId = await recordAgentActionReceipt({
        agentSlug: "agent-command-authority",
        agentName: "Agent Command Authority",
        agentCategory: "infra",
        taskType: "roster_truth_hold",
        action: "held_unproven_legacy_agents",
        status: "success",
        outcomeSummary: `Held ${affectedRows} unproven active agent records. ${reason}`,
        evidence: {
          requestedByUserId: ctx.user.id,
          previousState: "active",
          newState: "inactive",
          reason,
        },
        artifacts: { table: "empire_agents" },
      });

      return { heldCount: affectedRows, receiptId, reason };
    }),

  runStripeRevenueTruth: ownerProcedure
    .input(z.object({ chargeLimit: z.number().int().min(1).max(100).default(100) }).optional())
    .mutation(async ({ input, ctx }) => {
      const chargeLimit = input?.chargeLimit ?? 100;
      const startedAt = new Date();
      const [charges, subscriptions, balance] = await Promise.all([
        stripe.charges.list({ limit: chargeLimit }),
        stripe.subscriptions.list({ limit: 100 }),
        stripe.balance.retrieve(),
      ]);
      const succeeded = charges.data.filter(charge => charge.status === "succeeded");
      const recentSucceededChargeTotalCents = succeeded.reduce((sum, charge) => sum + charge.amount, 0);
      const activeSubscriptions = subscriptions.data.filter(subscription => subscription.status === "active");
      const activeSubscriptionMrrCents = activeSubscriptions.reduce(
        (sum, subscription) => sum + (subscription.items.data[0]?.price?.unit_amount ?? 0),
        0,
      );
      const availableBalanceCents = balance.available.find(entry => entry.currency === "usd")?.amount ?? 0;
      const newestCharge = succeeded.sort((a, b) => b.created - a.created)[0] ?? null;
      const snapshot = {
        source: "stripe",
        chargeWindow: `Most recent ${chargeLimit} charges available from Stripe`,
        succeededChargeCount: succeeded.length,
        recentSucceededChargeTotalCents,
        activeSubscriptionCount: activeSubscriptions.length,
        activeSubscriptionMrrCents,
        availableBalanceCents,
        newestSucceededChargeAt: newestCharge ? new Date(newestCharge.created * 1000).toISOString() : null,
        currency: "usd",
      };
      const receiptId = await recordAgentActionReceipt({
        agentSlug: "stripe-revenue-agent",
        agentName: "Stripe Revenue Agent",
        agentCategory: "analytics",
        taskType: "live_revenue_snapshot",
        action: "read_live_stripe_financial_snapshot",
        status: "success",
        outcomeSummary: `Read live Stripe: ${succeeded.length} succeeded charges in the returned window, ${activeSubscriptions.length} active subscriptions, and $${(availableBalanceCents / 100).toFixed(2)} available USD balance.`,
        evidence: { requestedByUserId: ctx.user.id, ...snapshot },
        artifacts: { provider: "stripe", sourceRecord: newestCharge ? { chargeId: newestCharge.id } : null },
        revenueGenerated: 0,
        startedAt,
        finishedAt: new Date(),
      });
      await db.db.execute(sql`UPDATE empire_agents SET status = 'active', paused_until = NULL WHERE slug = 'stripe-revenue-agent'`);
      return { snapshot, receiptId, activated: true, autonomousExecutionEnabled: false };
    }),

  getHeldRoster: ownerProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(60) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 60;
      const rows = rowsFromExecute(await db.db.execute(sql`
        SELECT id, name, slug, status, tasks, inputs, outputs, paused_until, created_at
        FROM empire_agents
        WHERE status = 'inactive'
        ORDER BY id ASC
        LIMIT ${limit}
      `));
      return { agents: rows, activationRequirement: AGENT_HOLD_REASON };
    }),
});
