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
import { getStripe, verifyWebhookSignature } from "../services/stripeVaultLive";
import { settleCreatorCheckout, settleCreatorStripeEvent } from "../services/stripeCreatorPayoutEvents";
import { recordStripeVaultLiveCheckout } from "../services/stripeVaultLiveRevenue";
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
    if (event.account && event.type !== "account.updated") return res.json({ received: true, skipped: true });
    if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
      await settleCreatorStripeEvent(getStripe(), event);
    }
    // Completion alone does not prove an asynchronous payment succeeded.
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") return res.json({ received: true, awaitingPayment: true });
      const payout = await settleCreatorCheckout(getStripe(), session, event.id);
      if (payout && ["review_required", "reversed"].includes(payout.status)) {
        return res.json({ received: true, payoutHeld: true });
      }
      
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
          if (!payout) throw new Error("Creator commerce checkout has no verified net payout");
          const result = await fulfillCommerceCheckoutSession(session, payout);
          console.log("[Stripe Webhook] CreatorVault commerce checkout fulfilled", result);
        } else {
          if (payout && (session.metadata?.type === "vaultlive_tip" || session.metadata?.type === "vaultlive_donation")) {
            await recordStripeVaultLiveCheckout(session, payout);
          }
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

/**
 * Handle subscription checkout
 */
async function handleSubscriptionCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const { positiveMetadataId } = await import("../services/stripeCreatorPayoutEvents");
  const tierId = positiveMetadataId(session.metadata?.tierId);
  const creatorId = positiveMetadataId(session.metadata?.creatorId);
  const fanId = positiveMetadataId(session.metadata?.fanId);
  const subscriptionValue = session.subscription;
  const stripeSubscriptionId = typeof subscriptionValue === "string" ? subscriptionValue : subscriptionValue?.id;
  if (!tierId || !creatorId || !fanId || !stripeSubscriptionId) throw new Error("Missing valid subscription source metadata");
  const { getStripePayoutDb } = await import("../db");
  const { subscriptions, users } = await import("../../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const subscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId);
  const item = subscription.items.data[0];
  if (!item) throw new Error("Stripe subscription has no billing item");
  const database = await getStripePayoutDb();
  await database.transaction(async (tx) => {
    // Serialize creation for this user without silently deleting historical
    // duplicate subscriptions to introduce a new uniqueness constraint.
    await tx.select({ id: users.id }).from(users).where(eq(users.id, creatorId)).for("update");
    const [existing] = await tx.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    if (existing) {
      if (existing.creatorId !== creatorId || existing.fanId !== fanId || existing.tierId !== tierId) throw new Error("Stripe subscription ownership conflicts with its saved record");
      return;
    }
    await tx.insert(subscriptions).values({
      fanId, creatorId, tierId, stripeSubscriptionId,
      status: subscription.status === "canceled" ? "canceled" : subscription.status === "past_due" ? "past_due" : subscription.status === "unpaid" ? "unpaid" : "active",
      currentPeriodStart: new Date(item.current_period_start * 1000),
      currentPeriodEnd: new Date(item.current_period_end * 1000),
    });
  });
  // invoice.paid owns initial-payment and renewal fee calculation, transfers,
  // transaction persistence, and creator balances. Checkout does not credit again.
}
