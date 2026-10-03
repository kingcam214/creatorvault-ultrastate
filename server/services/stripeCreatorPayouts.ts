import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { stripeCreatorPayoutPolicy, type StripeCreatorPayout, type StripeProcessingFeeDetail } from "../../drizzle/schema-stripe-payouts";
import {
  claimStripeCreatorPayout, ensureStripeCreatorPayout, finishStripeCreatorPayout,
  getStripeCreatorPayout, getStripePayoutDb, recordStripeCreatorRevenue, updateStripePayoutBeforeAttempt,
} from "../db";

export const CREATOR_NET_PAYOUT_RULE = "creator_net_85_v1";
const IDEMPOTENCY_REPLAY_WINDOW_MS = 23 * 60 * 60 * 1000;

export interface NetCreatorRevenue {
  grossAmountInCents: number;
  stripeFeeInCents: number;
  netAmountInCents: number;
  creatorPayoutInCents: number;
  platformRevenueInCents: number;
}

export function calculateNetCreatorRevenue(gross: number, stripeFee: number): NetCreatorRevenue {
  if (!Number.isSafeInteger(gross) || gross <= 0 || gross > 2_147_483_647) {
    throw new Error("Gross charge must be a positive integer minor-unit amount within the ledger limit");
  }
  if (!Number.isSafeInteger(stripeFee) || stripeFee < 0 || stripeFee > gross) {
    throw new Error("Stripe processing fee must be an integer between zero and the gross charge");
  }
  const net = gross - stripeFee;
  const creator = Number(BigInt(net) * 85n / 100n);
  return {
    grossAmountInCents: gross, stripeFeeInCents: stripeFee, netAmountInCents: net,
    creatorPayoutInCents: creator, platformRevenueInCents: net - creator,
  };
}

export function creatorTransferIdentity(chargeId: string): { idempotencyKey: string; transferGroup: string } {
  if (!/^ch_[a-zA-Z0-9]+$/.test(chargeId)) throw new Error("Invalid Stripe charge ID");
  return { idempotencyKey: `creatorvault:net85:v1:${chargeId}`, transferGroup: `cv_net85_v1_${chargeId}` };
}

export function buildCreatorTransferParams(payout: StripeCreatorPayout): Stripe.TransferCreateParams {
  if (!payout.stripeConnectAccountId || payout.creatorPayoutInCents === null || payout.creatorPayoutInCents <= 0) {
    throw new Error("A verified destination and positive net creator payout are required");
  }
  return {
    amount: payout.creatorPayoutInCents, currency: payout.currency,
    destination: payout.stripeConnectAccountId, source_transaction: payout.stripeChargeId,
    transfer_group: payout.transferGroup,
    metadata: { creatorPayoutId: String(payout.id), creatorId: String(payout.creatorId), payoutRule: CREATOR_NET_PAYOUT_RULE },
  };
}

export function matchesCreatorTransfer(transfer: Stripe.Transfer, payout: StripeCreatorPayout): boolean {
  const destination = typeof transfer.destination === "string" ? transfer.destination : transfer.destination?.id;
  const source = typeof transfer.source_transaction === "string" ? transfer.source_transaction : transfer.source_transaction?.id;
  return transfer.amount === payout.creatorPayoutInCents && transfer.currency === payout.currency &&
    destination === payout.stripeConnectAccountId && source === payout.stripeChargeId &&
    transfer.transfer_group === payout.transferGroup && transfer.metadata.creatorPayoutId === String(payout.id) &&
    transfer.metadata.creatorId === String(payout.creatorId) && transfer.metadata.payoutRule === CREATOR_NET_PAYOUT_RULE;
}

export class StripePayoutDeferredError extends Error {
  constructor(message: string) { super(message); this.name = "StripePayoutDeferredError"; }
}

export interface CreatorChargeSource {
  creatorId: number;
  eventId: string;
  metadata: Record<string, string>;
  sessionId?: string;
  invoiceId?: string;
}

export async function getSucceededPaymentCharge(stripe: Stripe, paymentIntentId: string): Promise<Stripe.Charge> {
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (intent.status !== "succeeded" || !intent.latest_charge) {
    throw new StripePayoutDeferredError("Creator charge has not succeeded or has no captured charge");
  }
  const chargeId = typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge.id;
  return stripe.charges.retrieve(chargeId, { expand: ["balance_transaction"] });
}

/** Uses actual Stripe balance-transaction fees; never substitutes a pricing estimate. */
export async function prepareCreatorChargePayout(
  stripe: Stripe, charge: Stripe.Charge, source: CreatorChargeSource,
): Promise<StripeCreatorPayout> {
  if (!Number.isSafeInteger(source.creatorId) || source.creatorId <= 0) throw new Error("Invalid creator user ID");
  if (!charge.paid || !charge.captured || charge.status !== "succeeded") {
    throw new StripePayoutDeferredError("Creator transfer requires a succeeded, captured Stripe charge");
  }
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  const payout = await ensureStripeCreatorPayout({
    creatorId: source.creatorId, stripeChargeId: charge.id, stripePaymentIntentId: paymentIntentId,
    stripeSessionId: source.sessionId, stripeInvoiceId: source.invoiceId,
    stripeEventId: source.eventId, sourceMetadata: source.metadata,
    grossAmountInCents: charge.amount, currency: charge.currency,
    ...creatorTransferIdentity(charge.id),
  });
  if (payout.firstAttemptAt || ["transferred", "reversed", "review_required", "no_payout"].includes(payout.status)) return payout;
  const database = await getStripePayoutDb();
  const [policy] = await database.select().from(stripeCreatorPayoutPolicy).where(eq(stripeCreatorPayoutPolicy.rule, CREATOR_NET_PAYOUT_RULE));
  if (!policy || !policy.enabled) throw new StripePayoutDeferredError("Creator net payout policy is not enabled");
  if (!Number.isSafeInteger(charge.created) || charge.created * 1000 < policy.effectiveFrom.getTime()) {
    await updateStripePayoutBeforeAttempt(payout.id, { status: "review_required", lastError: "Historical charge predates automatic payout activation; reconcile manual settlements before any transfer" });
    return (await getStripeCreatorPayout(charge.id)) ?? payout;
  }
  if (charge.refunded || charge.amount_refunded > 0 || charge.disputed || charge.transfer || charge.transfer_data || charge.application_fee) {
    await updateStripePayoutBeforeAttempt(payout.id, { status: "review_required", lastError: "Refunded/disputed or already destination-routed charge requires reconciliation" });
    return (await getStripeCreatorPayout(charge.id)) ?? payout;
  }
  const balance = typeof charge.balance_transaction === "string"
    ? await stripe.balanceTransactions.retrieve(charge.balance_transaction) : charge.balance_transaction;
  if (!balance) throw new StripePayoutDeferredError("Stripe processing fee is not available; awaiting charge.updated");
  if (balance.currency !== charge.currency || balance.amount !== charge.amount || balance.net !== balance.amount - balance.fee) {
    await updateStripePayoutBeforeAttempt(payout.id, { status: "review_required", lastError: "Charge/settlement currency or gross amount mismatch; no currency conversion is inferred" });
    return (await getStripeCreatorPayout(charge.id)) ?? payout;
  }
  const amounts = calculateNetCreatorRevenue(charge.amount, balance.fee);
  if (payout.revenueRecordedAt && (payout.stripeFeeInCents !== amounts.stripeFeeInCents ||
    payout.creatorPayoutInCents !== amounts.creatorPayoutInCents || payout.stripeBalanceTransactionId !== balance.id)) {
    await updateStripePayoutBeforeAttempt(payout.id, { status: "review_required", lastError: "Recorded Stripe fee snapshot changed before transfer; reconcile pending revenue before settlement" });
    return (await getStripeCreatorPayout(charge.id)) ?? payout;
  }
  const feeDetails: StripeProcessingFeeDetail[] = balance.fee_details.map((fee) => ({
    amount: fee.amount, currency: fee.currency, type: fee.type, description: fee.description,
  }));
  const [creator] = await database.select({ accountId: users.stripeConnectAccountId }).from(users)
    .where(eq(users.id, source.creatorId)).limit(1);
  if (!creator) throw new Error("Creator user does not exist");
  let status: "ready" | "blocked_account" | "no_payout" = amounts.creatorPayoutInCents === 0 ? "no_payout" : "blocked_account";
  let lastError: string | null = status === "no_payout" ? null : "Creator has no Stripe Connect account";
  if (creator.accountId && amounts.creatorPayoutInCents > 0) {
    const account = await stripe.accounts.retrieve(creator.accountId);
    if (account.capabilities?.transfers === "active") {
      status = "ready"; lastError = null;
    } else lastError = "Creator Stripe Connect transfers capability is not active";
  }
  await updateStripePayoutBeforeAttempt(payout.id, {
    ...amounts, stripeBalanceTransactionId: balance.id, feeDetails,
    stripeConnectAccountId: creator.accountId, status, lastError,
  });
  const updated = await getStripeCreatorPayout(charge.id);
  if (!updated) throw new Error("Prepared Stripe payout was not persisted");
  return updated;
}

/** A DB lease serializes workers; Stripe idempotency and reconciliation cover crash recovery. */
export async function executeCreatorChargeTransfer(stripe: Stripe, chargeId: string): Promise<StripeCreatorPayout> {
  const current = await getStripeCreatorPayout(chargeId);
  if (!current) throw new Error("Stripe payout does not exist");
  if (current.status === "pending_fee") throw new StripePayoutDeferredError("Stripe processing fees are pending");
  if (["review_required", "reversed"].includes(current.status)) return current;
  await recordStripeCreatorRevenue(chargeId);
  if (["blocked_account", "no_payout", "transferred"].includes(current.status)) return current;
  const database = await getStripePayoutDb();
  const [policy] = await database.select().from(stripeCreatorPayoutPolicy).where(eq(stripeCreatorPayoutPolicy.rule, CREATOR_NET_PAYOUT_RULE));
  if (!policy || !policy.enabled) throw new StripePayoutDeferredError("Creator net payout policy is not enabled");
  const leaseToken = randomUUID();
  const payout = await claimStripeCreatorPayout(chargeId, leaseToken);
  if (!payout) {
    const persisted = await getStripeCreatorPayout(chargeId);
    if (persisted && ["transferred", "no_payout", "review_required", "reversed", "blocked_account"].includes(persisted.status)) return persisted;
    throw new StripePayoutDeferredError("Another worker owns this Stripe payout; retry after its lease completes");
  }
  try {
    // Do not trust stale webhook snapshots after an account block or a failed attempt.
    const charge = await stripe.charges.retrieve(chargeId);
    if (!charge.paid || !charge.captured || charge.status !== "succeeded" || charge.refunded || charge.amount_refunded > 0 || charge.disputed || charge.transfer || charge.transfer_data) {
      await finishStripeCreatorPayout(payout.id, leaseToken, { status: "review_required", error: "Charge is no longer eligible for a new creator transfer" });
    } else {
      const transfers = await stripe.transfers.list({ transfer_group: payout.transferGroup, limit: 100 });
      if (transfers.has_more || transfers.data.length > 1 || (transfers.data[0] && !matchesCreatorTransfer(transfers.data[0], payout))) {
        await finishStripeCreatorPayout(payout.id, leaseToken, { status: "review_required", error: "Transfer-group reconciliation found unexpected or conflicting transfers" });
      } else if (transfers.data[0]) {
        const transfer = transfers.data[0];
        if (transfer.reversed || transfer.amount_reversed > 0) {
          await finishStripeCreatorPayout(payout.id, leaseToken, { status: "review_required", error: "Previously submitted creator transfer has been reversed" });
        } else await finishStripeCreatorPayout(payout.id, leaseToken, { status: "transferred", transferId: transfer.id });
      } else if (payout.firstAttemptAt && Date.now() - payout.firstAttemptAt.getTime() >= IDEMPOTENCY_REPLAY_WINDOW_MS) {
        // Stripe may prune idempotency keys after 24h. Never recreate an ambiguous
        // old transfer merely because a list request did not find it.
        await finishStripeCreatorPayout(payout.id, leaseToken, { status: "review_required", error: "Transfer retry is outside the safe idempotency replay window" });
      } else {
        const transfer = await stripe.transfers.create(buildCreatorTransferParams(payout), {
          idempotencyKey: payout.idempotencyKey, maxNetworkRetries: 0,
        });
        if (!matchesCreatorTransfer(transfer, payout)) throw new Error("Stripe transfer response differs from the frozen payout request");
        await finishStripeCreatorPayout(payout.id, leaseToken, { status: "transferred", transferId: transfer.id });
      }
    }
  } catch (error: unknown) {
    // A provider error is not completion. Keep the immutable first-attempt
    // snapshot for Stripe's own webhook redelivery, with no hidden retry loop.
    await finishStripeCreatorPayout(payout.id, leaseToken, {
      status: "failed", error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
  const completed = await getStripeCreatorPayout(chargeId);
  if (!completed) throw new Error("Stripe payout disappeared during settlement");
  return completed;
}
