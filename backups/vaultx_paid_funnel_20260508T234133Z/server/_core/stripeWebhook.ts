/**
 * Stripe webhook handler for CreatorVault live cash-loop events.
 *
 * Production invariants enforced here:
 * - Stripe signature must verify before any side effect.
 * - Subscription accounting is idempotent by Stripe payment reference.
 * - Recurring invoice payments create creator transactions and balance credits.
 * - Stripe subscription lifecycle events synchronize local subscription status.
 * - Checkout metadata must resolve to a real tier/creator/fan relationship.
 */

import type { Request, Response } from "express";
import Stripe from "stripe";
import { verifyWebhookSignature } from "../services/stripeVaultLive";
import * as dbVaultLive from "../db-vaultlive";
import { creditChallengePayment, creditChallengePaymentCents } from "../challengePaymentHook";

type AccountingInput = {
  subscriptionId: number;
  fanId: number;
  creatorId: number;
  amountInCents: number;
  stripePaymentRef: string;
};

/**
 * Stripe webhook endpoint handler.
 *
 * IMPORTANT: This endpoint must use raw body (not JSON parsed).
 * Configure in Express: app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handler)
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const { ENV } = await import("./env");
  if (!ENV.stripeSecretKey || !ENV.stripeWebhookSecret) {
    console.log("[Stripe Webhook] Stripe not configured, skipping");
    return res.json({ received: true, skipped: true });
  }

  const signature = req.headers["stripe-signature"];

  if (!signature || typeof signature !== "string") {
    console.error("[Stripe Webhook] Missing signature");
    return res.status(400).send("Missing signature");
  }

  let event: Stripe.Event;

  try {
    event = verifyWebhookSignature(req.body, signature);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.amount_total && session.amount_total > 0) {
        const desc = session.metadata?.tierId
          ? `Stripe subscription checkout — tier ${session.metadata.tierId}`
          : `Stripe checkout — ${session.metadata?.type || "payment"}`;
        await creditChallengePaymentCents(session.amount_total, "stripe_checkout", desc);
      }

      if (session.metadata?.tierId) {
        await handleSubscriptionCheckout(session);
      } else {
        await handleCheckoutCompleted(session);
      }
    } else if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.amount_paid > 0) {
        await creditChallengePaymentCents(invoice.amount_paid, "stripe_subscription_renewal", `Stripe subscription renewal — ${invoice.customer_email || invoice.customer}`);
        await handleSubscriptionInvoicePaid(invoice);
      }
    } else if (event.type === "customer.subscription.updated") {
      await syncStripeSubscriptionStatus(event.data.object as Stripe.Subscription);
    } else if (event.type === "customer.subscription.deleted") {
      await syncStripeSubscriptionStatus(event.data.object as Stripe.Subscription, true);
    } else if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.amount > 0 && !pi.metadata?.challengeCredited) {
        await creditChallengePaymentCents(pi.amount, "stripe_payment_intent", `Stripe payment — ${pi.description || pi.id}`);
      }
    } else if (event.type === "charge.succeeded") {
      const charge = event.data.object as Stripe.Charge;
      if (charge.amount > 0 && !charge.payment_intent) {
        await creditChallengePaymentCents(charge.amount, "stripe_charge", `Stripe charge — ${charge.description || charge.id}`);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Error processing event:", err);
    res.status(500).send(`Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata;

  if (!metadata) {
    console.error("[Stripe Webhook] No metadata in session");
    return;
  }

  const { type, streamId, creatorId, creatorAmount, platformAmount, message } = metadata;

  if (!type || !streamId || !creatorId || !creatorAmount || !platformAmount) {
    console.error("[Stripe Webhook] Missing required metadata");
    return;
  }

  const streamIdNum = parseInt(streamId, 10);
  const creatorIdNum = parseInt(creatorId, 10);
  const creatorAmountNum = parseInt(creatorAmount, 10);
  const platformAmountNum = parseInt(platformAmount, 10);
  const totalAmount = creatorAmountNum + platformAmountNum;

  console.log(`[Stripe Webhook] Processing ${type} for stream ${streamIdNum}, creator ${creatorIdNum}, amount ${totalAmount}`);

  if (type === "vaultlive_tip") {
    await dbVaultLive.recordTip(streamIdNum, creatorIdNum, totalAmount, message || undefined);
    console.log(`[Stripe Webhook] Tip recorded: $${(totalAmount / 100).toFixed(2)} (Creator: $${(creatorAmountNum / 100).toFixed(2)}, Platform: $${(platformAmountNum / 100).toFixed(2)})`);
  } else if (type === "vaultlive_donation") {
    await dbVaultLive.recordDonation(streamIdNum, creatorIdNum, totalAmount, "stripe", message || undefined);
    console.log(`[Stripe Webhook] Donation recorded: $${(totalAmount / 100).toFixed(2)} (Creator: $${(creatorAmountNum / 100).toFixed(2)}, Platform: $${(platformAmountNum / 100).toFixed(2)})`);
  }

  console.log("[Stripe Webhook] Payment completed successfully");
}

async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const { tierId, creatorId, fanId } = session.metadata!;

  if (!tierId || !creatorId || !fanId) {
    console.error("[Stripe Webhook] Missing subscription metadata");
    return;
  }

  const { db } = await import("../db");
  const { subscriptionTiers, subscriptions } = await import("../../drizzle/schema");
  const { eq, desc } = await import("drizzle-orm");

  const fanIdNum = parseInt(fanId, 10);
  const creatorIdNum = parseInt(creatorId, 10);
  const tierIdNum = parseInt(tierId, 10);
  const stripeSubscriptionId = session.subscription as string;

  if (!fanIdNum || !creatorIdNum || !tierIdNum || !stripeSubscriptionId) {
    console.error("[Stripe Webhook] Invalid subscription metadata", { tierId, creatorId, fanId, hasStripeSubscriptionId: Boolean(stripeSubscriptionId) });
    return;
  }

  const [tier] = await db
    .select()
    .from(subscriptionTiers)
    .where(eq(subscriptionTiers.id, tierIdNum))
    .limit(1);

  if (!tier || tier.creatorId !== creatorIdNum) {
    throw new Error(`Subscription metadata mismatch for tier ${tierIdNum}`);
  }

  const [existingSubscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .orderBy(desc(subscriptions.id))
    .limit(1);

  let subscriptionId = existingSubscription?.id;

  if (!subscriptionId) {
    const subResult = await db.insert(subscriptions).values({
      fanId: fanIdNum,
      creatorId: creatorIdNum,
      tierId: tierIdNum,
      stripeSubscriptionId,
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    subscriptionId = Number((subResult as any)?.[0]?.insertId ?? (subResult as any)?.insertId);

    if (!Number.isFinite(subscriptionId) || subscriptionId <= 0) {
      const [insertedSubscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
        .orderBy(desc(subscriptions.id))
        .limit(1);
      subscriptionId = insertedSubscription?.id;
    }
  }

  if (!Number.isFinite(subscriptionId) || !subscriptionId) {
    throw new Error("Unable to resolve subscription ID after Stripe checkout subscription insert");
  }

  const amountInCents = session.amount_total || 0;
  const stripePaymentRef = (session.payment_intent as string) || (session.invoice as string) || session.id;

  const transactionCreated = await reconcileSubscriptionPayment({
    subscriptionId,
    fanId: fanIdNum,
    creatorId: creatorIdNum,
    amountInCents,
    stripePaymentRef,
  });

  console.log("[Stripe Webhook] Subscription checkout reconciled", {
    subscriptionId,
    creatorId: creatorIdNum,
    transactionCreated,
    amount: `$${(amountInCents / 100).toFixed(2)}`,
  });
}

async function handleSubscriptionInvoicePaid(invoice: Stripe.Invoice) {
  const invoiceWithSubscription = invoice as Stripe.Invoice & {
    subscription?: string | { id?: string } | null;
    payment_intent?: string | { id?: string } | null;
  };
  const stripeSubscriptionId = typeof invoiceWithSubscription.subscription === "string"
    ? invoiceWithSubscription.subscription
    : invoiceWithSubscription.subscription?.id;

  if (!stripeSubscriptionId) {
    console.warn("[Stripe Webhook] invoice.paid without subscription ID", { invoiceId: invoice.id });
    return;
  }

  const { db } = await import("../db");
  const { subscriptions } = await import("../../drizzle/schema");
  const { eq, desc } = await import("drizzle-orm");

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .orderBy(desc(subscriptions.id))
    .limit(1);

  if (!subscription) {
    console.warn("[Stripe Webhook] Orphan renewal invoice has no local subscription", { invoiceId: invoice.id, stripeSubscriptionId });
    return;
  }

  const amountInCents = invoice.amount_paid || 0;
  const stripePaymentRef = (typeof invoiceWithSubscription.payment_intent === "string"
    ? invoiceWithSubscription.payment_intent
    : invoiceWithSubscription.payment_intent?.id) || invoice.id;

  const transactionCreated = await reconcileSubscriptionPayment({
    subscriptionId: subscription.id,
    fanId: subscription.fanId,
    creatorId: subscription.creatorId,
    amountInCents,
    stripePaymentRef,
  });

  console.log("[Stripe Webhook] Subscription renewal reconciled", {
    subscriptionId: subscription.id,
    creatorId: subscription.creatorId,
    transactionCreated,
    invoiceId: invoice.id,
    amount: `$${(amountInCents / 100).toFixed(2)}`,
  });
}

async function reconcileSubscriptionPayment(input: AccountingInput): Promise<boolean> {
  if (!input.amountInCents || input.amountInCents <= 0) {
    throw new Error("Cannot reconcile a subscription payment without a positive amount");
  }

  if (!input.stripePaymentRef) {
    throw new Error("Cannot reconcile a subscription payment without a Stripe payment reference");
  }

  const { db } = await import("../db");
  const { transactions, creatorBalances } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  const [existingTransaction] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.stripePaymentIntentId, input.stripePaymentRef))
    .limit(1);

  if (existingTransaction) {
    return false;
  }

  const creatorShare = Math.floor(input.amountInCents * 0.85);
  const platformShare = input.amountInCents - creatorShare;

  await db.insert(transactions).values({
    subscriptionId: input.subscriptionId,
    fanId: input.fanId,
    creatorId: input.creatorId,
    amountInCents: input.amountInCents,
    creatorShareInCents: creatorShare,
    platformShareInCents: platformShare,
    stripePaymentIntentId: input.stripePaymentRef,
    status: "completed",
  });

  const [existingBalance] = await db
    .select()
    .from(creatorBalances)
    .where(eq(creatorBalances.creatorId, input.creatorId));

  if (existingBalance) {
    await db
      .update(creatorBalances)
      .set({
        availableBalanceInCents: existingBalance.availableBalanceInCents + creatorShare,
        lifetimeEarningsInCents: existingBalance.lifetimeEarningsInCents + creatorShare,
        updatedAt: new Date(),
      })
      .where(eq(creatorBalances.creatorId, input.creatorId));
  } else {
    await db.insert(creatorBalances).values({
      creatorId: input.creatorId,
      availableBalanceInCents: creatorShare,
      pendingBalanceInCents: 0,
      lifetimeEarningsInCents: creatorShare,
    });
  }

  return true;
}

async function syncStripeSubscriptionStatus(stripeSubscription: Stripe.Subscription, forceCanceled = false) {
  const stripeSubscriptionId = stripeSubscription.id;
  if (!stripeSubscriptionId) return;

  const { db } = await import("../db");
  const { subscriptions } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  const mappedStatus = forceCanceled || stripeSubscription.status === "canceled"
    ? "canceled"
    : stripeSubscription.status === "active" || stripeSubscription.status === "trialing"
      ? "active"
      : stripeSubscription.status === "past_due"
        ? "past_due"
        : "unpaid";

  const periodStartSeconds = (stripeSubscription as any).current_period_start || (stripeSubscription.items?.data?.[0] as any)?.current_period_start;
  const periodEndSeconds = (stripeSubscription as any).current_period_end || (stripeSubscription.items?.data?.[0] as any)?.current_period_end;
  const canceledAtSeconds = (stripeSubscription as any).canceled_at;

  await db
    .update(subscriptions)
    .set({
      status: mappedStatus,
      currentPeriodStart: periodStartSeconds ? new Date(periodStartSeconds * 1000) : undefined,
      currentPeriodEnd: periodEndSeconds ? new Date(periodEndSeconds * 1000) : undefined,
      canceledAt: mappedStatus === "canceled" ? new Date((canceledAtSeconds || Math.floor(Date.now() / 1000)) * 1000) : null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));

  console.log("[Stripe Webhook] Stripe subscription status synchronized", {
    stripeSubscriptionId,
    status: mappedStatus,
  });
}
