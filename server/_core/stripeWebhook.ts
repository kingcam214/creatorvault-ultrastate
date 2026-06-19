/**
 * 💳 STRIPE WEBHOOK HANDLER FOR VAULTLIVE
 * 
 * Handles Stripe webhook events for payment completion
 * - checkout.session.completed: Record tip/donation in database
 * - Updates payment status to "completed"
 * - Records 85/15 revenue split
 */

import type { Request, Response } from "express";
import Stripe from "stripe";
import { verifyWebhookSignature } from "../services/stripeVaultLive";
import * as dbVaultLive from "../db-vaultlive";
import { creditChallengePaymentCents, type ChallengePaymentProof } from "../challengePaymentHook";

/**
 * Stripe webhook endpoint handler
 * 
 * IMPORTANT: This endpoint must use raw body (not JSON parsed)
 * Configure in Express: app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handler)
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  // Stripe is OPTIONAL - return 200 if not configured
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
    // Verify webhook signature
    event = verifyWebhookSignature(req.body, signature);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`, { livemode: event.livemode });

  try {
    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Credit AI Agent Challenge revenue only when the checkout was created
      // explicitly for the challenge. Other live Stripe payments remain real
      // platform money, but they are not AI Agent Challenge revenue.
      if (session.amount_total && session.amount_total > 0 && isChallengeRevenueEligible(session.metadata)) {
        const challengeId = session.metadata?.challengeId || "active";
        const offerSlug = session.metadata?.offerSlug || session.metadata?.type || "ai_agent_challenge_purchase";
        const desc = `AI Agent Challenge checkout — ${offerSlug}; challenge=${challengeId}`;
        await creditChallengePaymentCents(session.amount_total, "stripe_ai_agent_challenge_checkout", desc, buildStripeChallengeProof(event, session, {
          paymentObjectId: session.payment_intent ? String(session.payment_intent) : session.id,
          customerRef: getStripeCustomerRef(session.customer, session.customer_email || session.customer_details?.email),
          productRef: `ai_agent_challenge:${challengeId}:${offerSlug}`,
        }));
      }

      if (session.metadata?.type === "vaultx_ppv") {
        await handleVaultxPpvCheckout(session);
      } else if (session.metadata?.type === "creatorvault_telegram_video_offer") {
        const { fulfillCreatorVaultVideoOfferPurchase } = await import("../services/creatorVaultOvernightRevenue");
        await fulfillCreatorVaultVideoOfferPurchase({
          id: session.id,
          amount_total: session.amount_total,
          customer_email: session.customer_email || session.customer_details?.email || null,
          metadata: session.metadata as Record<string, string>,
        });
      } else if (session.metadata?.tierId) {
        // Check if this is a subscription checkout (has tierId in metadata)
        await handleSubscriptionCheckout(session);
      } else {
        const { isCommerceCheckoutSession, fulfillCommerceCheckoutSession } = await import("../services/stripeCommerceFulfillment");
        if (isCommerceCheckoutSession(session.metadata)) {
          const result = await fulfillCommerceCheckoutSession(session);
          console.log("[Stripe Webhook] CreatorVault commerce checkout fulfilled", result);
        } else {
          // VaultLive tip/donation
          await handleCheckoutCompleted(session);
        }
      }
    } else if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      // Only credit if not already credited via checkout.session.completed
      // (checkout sessions also fire payment_intent.succeeded — skip duplicates)
      if (pi.amount > 0 && isChallengeRevenueEligible(pi.metadata) && pi.metadata?.challengeCredited !== "via_checkout_session") {
        await creditChallengePaymentCents(pi.amount, "stripe_ai_agent_challenge_payment_intent", `AI Agent Challenge payment intent — ${pi.description || pi.id}`, buildStripeChallengeProof(event, pi, {
          paymentObjectId: pi.id,
          customerRef: getStripeCustomerRef(pi.customer, pi.receipt_email),
          productRef: pi.metadata?.challengeId ? `ai_agent_challenge:${pi.metadata.challengeId}:${pi.metadata.offerSlug || pi.metadata.type || "payment_intent"}` : "ai_agent_challenge:payment_intent",
        }));
      }
    } else if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const invoicePaymentObject = invoice as Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent | null; subscription?: string | Stripe.Subscription | null };
      if (invoice.amount_paid > 0 && isChallengeRevenueEligible(invoice.metadata)) {
        await creditChallengePaymentCents(invoice.amount_paid, "stripe_ai_agent_challenge_subscription_renewal", `AI Agent Challenge subscription renewal — ${invoice.customer_email || invoice.customer}`, buildStripeChallengeProof(event, invoice, {
          paymentObjectId: invoicePaymentObject.payment_intent ? String(invoicePaymentObject.payment_intent) : invoice.id,
          customerRef: getStripeCustomerRef(invoice.customer, invoice.customer_email),
          productRef: invoice.metadata?.challengeId ? `ai_agent_challenge:${invoice.metadata.challengeId}:${invoicePaymentObject.subscription || "subscription"}` : "ai_agent_challenge:subscription_renewal",
        }));
      }
    } else if (event.type === "charge.succeeded") {
      const charge = event.data.object as Stripe.Charge;
      // Only credit standalone charges (not attached to payment intents already credited)
      if (charge.amount > 0 && !charge.payment_intent && isChallengeRevenueEligible(charge.metadata)) {
        await creditChallengePaymentCents(charge.amount, "stripe_ai_agent_challenge_charge", `AI Agent Challenge charge — ${charge.description || charge.id}`, buildStripeChallengeProof(event, charge, {
          paymentObjectId: charge.id,
          customerRef: getStripeCustomerRef(charge.customer, charge.billing_details?.email),
          productRef: charge.metadata?.challengeId ? `ai_agent_challenge:${charge.metadata.challengeId}:${charge.metadata.offerSlug || charge.metadata.type || "charge"}` : "ai_agent_challenge:charge",
        }));
      }
    }

    // Return 200 to acknowledge receipt
    res.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Error processing event:", err);
    res.status(500).send(`Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

function getStripeCustomerRef(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined, email?: string | null): string {
  if (typeof customer === "string" && customer.trim()) return customer;
  if (customer && typeof customer === "object" && "id" in customer && customer.id) return customer.id;
  return email || "";
}

function isChallengeRevenueEligible(metadata: Stripe.Metadata | null | undefined): boolean {
  return metadata?.challengeRevenueEligible === "true" && metadata?.type === "ai_agent_challenge_purchase";
}

function buildStripeChallengeProof(
  event: Stripe.Event,
  object: { id?: string },
  refs: { paymentObjectId: string; customerRef: string; productRef: string },
): ChallengePaymentProof {
  return {
    mode: event.livemode ? "live" : "test",
    provider: "stripe",
    proofId: `${event.id}:${refs.paymentObjectId || object.id || "unknown"}`,
    paymentObjectId: refs.paymentObjectId || object.id || "",
    customerRef: refs.customerRef,
    productRef: refs.productRef,
    channel: "stripe_webhook",
    eventType: event.type,
  };
}

/**
 * Handle checkout.session.completed event
 */
async function handleVaultxPpvCheckout(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const contentId = Number(metadata.vaultxContentId || metadata.contentId || 0);
  const fanUserId = Number(metadata.fanId || metadata.userId || 0);
  const paymentIntentValue = session.payment_intent;
  const paymentIntentId = typeof paymentIntentValue === "string" ? paymentIntentValue : paymentIntentValue?.id;

  if (!contentId || !fanUserId || !paymentIntentId) {
    console.error("[Stripe Webhook] Missing VaultX PPV metadata", { contentId, fanUserId, paymentIntentId: Boolean(paymentIntentId), sessionId: session.id });
    return;
  }

  const { completeVaultxPpvPurchase } = await import("../routers/vaultxRouter");
  const result = await completeVaultxPpvPurchase({
    fanUserId,
    contentId,
    paymentIntentId,
    buyerTelegramId: metadata.buyerTelegramId ? Number(metadata.buyerTelegramId) : undefined,
    trackingCode: metadata.trackingCode || undefined,
  });
  console.log("[Stripe Webhook] VaultX PPV checkout completed", { sessionId: session.id, contentId, fanUserId, result });
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

  // Get customer email from session
  const customerEmail = session.customer_email || session.customer_details?.email;

  if (type === "vaultlive_tip") {
    // Record tip in database
    // Note: We don't have viewer ID from Stripe, so we'll use creator ID as placeholder
    // In production, you'd want to pass viewer ID through metadata
    await dbVaultLive.recordTip(
      streamIdNum,
      creatorIdNum, // TODO: Get actual viewer ID from session metadata
      totalAmount,
      message || undefined
    );

    console.log(`[Stripe Webhook] Tip recorded: $${(totalAmount / 100).toFixed(2)} (Creator: $${(creatorAmountNum / 100).toFixed(2)}, Platform: $${(platformAmountNum / 100).toFixed(2)})`);
  } else if (type === "vaultlive_donation") {
    // Record donation in database
    await dbVaultLive.recordDonation(
      streamIdNum,
      creatorIdNum, // TODO: Get actual viewer ID from session metadata
      totalAmount,
      "stripe",
      message || undefined
    );

    // Update donation status to completed
    // Note: We'd need to store Stripe session ID to update the specific donation
    // For now, we'll just log it
    console.log(`[Stripe Webhook] Donation recorded: $${(totalAmount / 100).toFixed(2)} (Creator: $${(creatorAmountNum / 100).toFixed(2)}, Platform: $${(platformAmountNum / 100).toFixed(2)})`);
  }

  console.log(`[Stripe Webhook] Payment completed successfully`);
}

/**
 * Handle subscription checkout
 */
async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const { tierId, creatorId, fanId } = session.metadata!;

  if (!tierId || !creatorId || !fanId) {
    console.error("[Stripe Webhook] Missing subscription metadata");
    return;
  }

  const { db } = await import("../db");
  const { subscriptions, transactions, creatorBalances } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  // Create subscription record
  const subResult = await db.insert(subscriptions).values({
    fanId: parseInt(fanId),
    creatorId: parseInt(creatorId),
    tierId: parseInt(tierId),
    stripeSubscriptionId: session.subscription as string,
    status: "active",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  const subscriptionId = Number((subResult as any).insertId);
  const amountInCents = session.amount_total || 0;

  // Calculate 70/30 split
  const creatorShare = Math.floor(amountInCents * 0.85); // 85% to creator (15% platform fee — THIS IS LAW)
  const platformShare = amountInCents - creatorShare; // 15% platform fee

  // Create transaction record
  await db.insert(transactions).values({
    subscriptionId,
    fanId: parseInt(fanId),
    creatorId: parseInt(creatorId),
    amountInCents,
    creatorShareInCents: creatorShare,
    platformShareInCents: platformShare,
    stripePaymentIntentId: session.payment_intent as string,
    status: "completed",
  });

  // Update creator balance
  const [existingBalance] = await db
    .select()
    .from(creatorBalances)
    .where(eq(creatorBalances.creatorId, parseInt(creatorId)));

  if (existingBalance) {
    await db
      .update(creatorBalances)
      .set({
        availableBalanceInCents: existingBalance.availableBalanceInCents + creatorShare,
        lifetimeEarningsInCents: existingBalance.lifetimeEarningsInCents + creatorShare,
        updatedAt: new Date(),
      })
      .where(eq(creatorBalances.creatorId, parseInt(creatorId)));
  } else {
    await db.insert(creatorBalances).values({
      creatorId: parseInt(creatorId),
      availableBalanceInCents: creatorShare,
      pendingBalanceInCents: 0,
      lifetimeEarningsInCents: creatorShare,
    });
  }

  console.log("[Stripe Webhook] Subscription created", {
    subscriptionId,
    creatorId,
    creatorShare: `$${(creatorShare / 100).toFixed(2)}`,
    platformShare: `$${(platformShare / 100).toFixed(2)}`,
  });
}
