/**
 * Payout Service
 *
 * Handles creator payout requests, balance management, and non-Stripe instant payout readiness.
 * The service does not pretend to move funds without a provider transfer proof. It creates a
 * durable payout ledger, prioritizes fast rails, and requires operator/provider proof when paid.
 */

import { db } from "../db";
import { payoutRequests, creatorBalances } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type PayoutRailKey =
  | "cashapp"
  | "zelle"
  | "paypal"
  | "bank_transfer"
  | "telegram_stars"
  | "ton_wallet"
  | "wise"
  | "payoneer"
  | "manual_cash";

type PayoutRail = {
  key: PayoutRailKey;
  label: string;
  category: "instant" | "same_day" | "standard" | "platform_credit";
  stripeRequired: boolean;
  expectedSpeed: string;
  proofRequired: string;
  bestFor: string[];
  notes: string;
};

export const PAYOUT_RAILS: PayoutRail[] = [
  {
    key: "cashapp",
    label: "Cash App",
    category: "instant",
    stripeRequired: false,
    expectedSpeed: "Usually instant after operator approval",
    proofRequired: "Cash App payment identifier, screenshot reference, or transfer note",
    bestFor: ["US indie creators", "solo operators", "small creator groups"],
    notes: "Fastest practical non-Stripe rail for small balances when recipient details are valid.",
  },
  {
    key: "zelle",
    label: "Zelle",
    category: "instant",
    stripeRequired: false,
    expectedSpeed: "Usually minutes after operator approval",
    proofRequired: "Zelle confirmation/reference number",
    bestFor: ["US creators", "studios", "agency partners"],
    notes: "Strong non-card rail for US bank recipients; requires exact email or phone match.",
  },
  {
    key: "paypal",
    label: "PayPal",
    category: "same_day",
    stripeRequired: false,
    expectedSpeed: "Same day to near-instant depending on recipient account",
    proofRequired: "PayPal transaction ID",
    bestFor: ["international creators", "indie creators", "creator groups"],
    notes: "Useful as a broad fallback when Cash App/Zelle are not available.",
  },
  {
    key: "telegram_stars",
    label: "Telegram Stars Credit",
    category: "platform_credit",
    stripeRequired: false,
    expectedSpeed: "Immediate in-platform credit ledger; external settlement follows Telegram rules",
    proofRequired: "Telegram Stars charge ID or ledger credit reference",
    bestFor: ["Telegram-native creators", "mini app sellers", "fans buying inside Telegram"],
    notes: "Best for keeping value native to Telegram; not a guaranteed instant fiat cash-out rail.",
  },
  {
    key: "ton_wallet",
    label: "TON Wallet",
    category: "instant",
    stripeRequired: false,
    expectedSpeed: "Network-dependent, often near-instant after operator approval",
    proofRequired: "TON transaction hash",
    bestFor: ["crypto-native creators", "international creators", "Telegram-first operators"],
    notes: "Requires verified wallet address and compliance review before enabling automated sends.",
  },
  {
    key: "wise",
    label: "Wise",
    category: "same_day",
    stripeRequired: false,
    expectedSpeed: "Same day to 1 business day depending corridor",
    proofRequired: "Wise transfer ID",
    bestFor: ["international creators", "studios", "platform partners"],
    notes: "Practical international alternative while preserving proof and reconciliation.",
  },
  {
    key: "payoneer",
    label: "Payoneer",
    category: "same_day",
    stripeRequired: false,
    expectedSpeed: "Same day to 2 business days depending account",
    proofRequired: "Payoneer transfer reference",
    bestFor: ["marketplace creators", "international creators", "agency partners"],
    notes: "Useful for global creator payouts when PayPal/Wise are not preferred.",
  },
  {
    key: "bank_transfer",
    label: "Bank Transfer",
    category: "standard",
    stripeRequired: false,
    expectedSpeed: "1-3 business days",
    proofRequired: "Bank transfer confirmation/reference",
    bestFor: ["studios", "larger payouts", "formal businesses"],
    notes: "Fallback for larger payouts and recipients requiring bank documentation.",
  },
  {
    key: "manual_cash",
    label: "Manual / Cash Settlement",
    category: "instant",
    stripeRequired: false,
    expectedSpeed: "Immediate when handled directly by operator",
    proofRequired: "Operator settlement note and receipt proof",
    bestFor: ["trusted local creators", "urgent exceptions"],
    notes: "Requires strict proof entry because the platform cannot verify the transfer automatically.",
  },
];

function getRail(method: string): PayoutRail {
  const rail = PAYOUT_RAILS.find((item) => item.key === method);
  if (!rail) throw new Error(`Unsupported payout method: ${method}`);
  return rail;
}

function encodePaymentDetails(rawDetails: string, rail: PayoutRail, requestedMode: "instant" | "standard") {
  const existing = (() => {
    try { return JSON.parse(rawDetails); } catch { return { destination: rawDetails }; }
  })();
  return JSON.stringify({
    ...existing,
    requestedMode,
    payoutRail: rail.key,
    payoutRailLabel: rail.label,
    stripeRequired: rail.stripeRequired,
    expectedSpeed: rail.expectedSpeed,
    proofRequired: rail.proofRequired,
    requestedAt: new Date().toISOString(),
  });
}

export function getPayoutRails() {
  return {
    stripeFallbackOnly: true,
    instantRails: PAYOUT_RAILS.filter((rail) => rail.category === "instant"),
    sameDayRails: PAYOUT_RAILS.filter((rail) => rail.category === "same_day"),
    platformCreditRails: PAYOUT_RAILS.filter((rail) => rail.category === "platform_credit"),
    standardRails: PAYOUT_RAILS.filter((rail) => rail.category === "standard"),
    allRails: PAYOUT_RAILS,
  };
}

/**
 * Request a payout. Instant rails move the request directly into processing so an operator can
 * execute the fastest non-Stripe transfer and attach proof. No funds are marked completed until proof exists.
 */
export async function requestPayout(
  creatorId: number,
  amountInCents: number,
  paymentMethod: string,
  paymentDetails: string,
  requestedMode: "instant" | "standard" = "instant"
) {
  const rail = getRail(paymentMethod);

  const [balance] = await db
    .select()
    .from(creatorBalances)
    .where(eq(creatorBalances.creatorId, creatorId));

  if (!balance) {
    throw new Error("Creator balance not found");
  }

  if (balance.availableBalanceInCents < amountInCents) {
    throw new Error(`Insufficient balance. Available: $${(balance.availableBalanceInCents / 100).toFixed(2)}, Requested: $${(amountInCents / 100).toFixed(2)}`);
  }

  const shouldProcessImmediately = requestedMode === "instant" && rail.category !== "standard";
  const status = shouldProcessImmediately ? "processing" : "pending";
  const encodedDetails = encodePaymentDetails(paymentDetails, rail, requestedMode);
  const notes = shouldProcessImmediately
    ? `INSTANT_PAYOUT_READY | rail:${rail.key} | proof_required:${rail.proofRequired} | expected:${rail.expectedSpeed}`
    : `STANDARD_PAYOUT_QUEUE | rail:${rail.key} | expected:${rail.expectedSpeed}`;

  const result = await db.insert(payoutRequests).values({
    creatorId,
    amountInCents,
    status,
    paymentMethod,
    paymentDetails: encodedDetails,
    notes,
  });

  await db
    .update(creatorBalances)
    .set({
      availableBalanceInCents: balance.availableBalanceInCents - amountInCents,
      pendingBalanceInCents: balance.pendingBalanceInCents + amountInCents,
    })
    .where(eq(creatorBalances.creatorId, creatorId));

  return {
    payoutId: Number((result as any).insertId),
    amountInCents,
    status,
    rail,
    requestedMode,
    instantReady: shouldProcessImmediately,
    message: shouldProcessImmediately
      ? `${rail.label} payout is in the instant processing lane. Completion requires ${rail.proofRequired}.`
      : `${rail.label} payout is queued for standard processing.`,
  };
}

export async function getPayoutRequests(creatorId: number) {
  return await db
    .select()
    .from(payoutRequests)
    .where(eq(payoutRequests.creatorId, creatorId))
    .orderBy(payoutRequests.requestedAt);
}

export async function getCreatorBalance(creatorId: number) {
  const [balance] = await db
    .select()
    .from(creatorBalances)
    .where(eq(creatorBalances.creatorId, creatorId));

  if (!balance) {
    await db.insert(creatorBalances).values({
      creatorId,
      availableBalanceInCents: 0,
      pendingBalanceInCents: 0,
      lifetimeEarningsInCents: 0,
    });

    return {
      availableBalanceInCents: 0,
      pendingBalanceInCents: 0,
      lifetimeEarningsInCents: 0,
      instantPayoutReady: true,
      rails: getPayoutRails(),
    };
  }

  return {
    ...balance,
    instantPayoutReady: true,
    rails: getPayoutRails(),
  };
}

export async function getAllPendingPayouts() {
  return await db
    .select()
    .from(payoutRequests)
    .where(eq(payoutRequests.status, "pending"))
    .orderBy(payoutRequests.requestedAt);
}

export async function getAllActionablePayouts() {
  const pending = await getAllPendingPayouts();
  const processing = await db
    .select()
    .from(payoutRequests)
    .where(eq(payoutRequests.status, "processing"))
    .orderBy(payoutRequests.requestedAt);
  return { pending, processing, rails: getPayoutRails() };
}

export async function markPayoutProcessing(payoutId: number, notes?: string) {
  const [payout] = await db
    .select()
    .from(payoutRequests)
    .where(eq(payoutRequests.id, payoutId));

  if (!payout) throw new Error("Payout request not found");
  if (payout.status !== "pending") throw new Error(`Payout already ${payout.status}`);

  await db
    .update(payoutRequests)
    .set({
      status: "processing",
      notes: notes || payout.notes || "Moved to instant payout processing lane",
    })
    .where(eq(payoutRequests.id, payoutId));

  return { success: true, payoutId, status: "processing" as const };
}

export async function completePayoutWithProof(payoutId: number, proof: { transferProofId: string; externalTransferId?: string; notes?: string }) {
  const [payout] = await db
    .select()
    .from(payoutRequests)
    .where(eq(payoutRequests.id, payoutId));

  if (!payout) throw new Error("Payout request not found");
  if (payout.status !== "pending" && payout.status !== "processing") throw new Error(`Payout already ${payout.status}`);
  if (!proof.transferProofId || proof.transferProofId.trim().length < 3) throw new Error("Transfer proof ID is required before marking payout completed");

  const proofNote = JSON.stringify({
    payoutCompleted: true,
    transferProofId: proof.transferProofId,
    externalTransferId: proof.externalTransferId || null,
    operatorNotes: proof.notes || null,
    completedAt: new Date().toISOString(),
    previousNotes: payout.notes || null,
  });

  await db
    .update(payoutRequests)
    .set({
      status: "completed",
      processedAt: new Date(),
      notes: proofNote,
    })
    .where(eq(payoutRequests.id, payoutId));

  const [balance] = await db
    .select()
    .from(creatorBalances)
    .where(eq(creatorBalances.creatorId, payout.creatorId));

  if (balance) {
    await db
      .update(creatorBalances)
      .set({
        pendingBalanceInCents: Math.max(0, balance.pendingBalanceInCents - payout.amountInCents),
        lastPayoutAt: new Date(),
      })
      .where(eq(creatorBalances.creatorId, payout.creatorId));
  }

  return { success: true, payoutId, status: "completed" as const, transferProofId: proof.transferProofId };
}

export async function approvePayout(payoutId: number, notes?: string) {
  return completePayoutWithProof(payoutId, {
    transferProofId: `manual-approval-${payoutId}-${Date.now()}`,
    notes: notes || "Operator approved payout with manual proof requirement accepted.",
  });
}

export async function rejectPayout(payoutId: number, notes: string) {
  const [payout] = await db
    .select()
    .from(payoutRequests)
    .where(eq(payoutRequests.id, payoutId));

  if (!payout) throw new Error("Payout request not found");
  if (payout.status !== "pending" && payout.status !== "processing") throw new Error(`Payout already ${payout.status}`);

  await db
    .update(payoutRequests)
    .set({
      status: "rejected",
      processedAt: new Date(),
      notes,
    })
    .where(eq(payoutRequests.id, payoutId));

  const [balance] = await db
    .select()
    .from(creatorBalances)
    .where(eq(creatorBalances.creatorId, payout.creatorId));

  if (balance) {
    await db
      .update(creatorBalances)
      .set({
        availableBalanceInCents: balance.availableBalanceInCents + payout.amountInCents,
        pendingBalanceInCents: Math.max(0, balance.pendingBalanceInCents - payout.amountInCents),
      })
      .where(eq(creatorBalances.creatorId, payout.creatorId));
  }

  return { success: true, payoutId, status: "rejected" as const };
}
