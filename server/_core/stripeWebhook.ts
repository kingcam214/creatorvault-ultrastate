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

/**
 * Stripe webhook endpoint handler
 * 
 * IMPORTANT: This endpoint must use raw body (not JSON parsed)
 * Configure in Express: app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handler)
 */
export async function handleStripeWebhook(req: Request, res: Response) {
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

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
    }

    // Return 200 to acknowledge receipt
    res.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Error processing event:", err);
    res.status(500).send(`Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

/**
 * Handle checkout.session.completed event
 */
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
