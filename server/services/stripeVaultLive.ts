/**
 * 💳 STRIPE INTEGRATION FOR VAULTLIVE
 * 
 * Handles Stripe Checkout for tips and donations
 * - 85% goes to creator
 * - 15% platform fee
 */

import Stripe from "stripe";
import { ENV } from "../_core/env";

// Initialize Stripe
const stripe = new Stripe(ENV.stripeSecretKey, {
  apiVersion: "2025-11-17.clover",
});

export interface CreateTipCheckoutInput {
  streamId: number;
  creatorId: number;
  creatorName: string;
  amount: number; // in cents
  viewerEmail?: string;
  message?: string;
}

export interface CreateDonationCheckoutInput {
  streamId: number;
  creatorId: number;
  creatorName: string;
  amount: number; // in cents
  viewerEmail?: string;
  message?: string;
}

/**
 * Create Stripe Checkout session for a tip
 */
export async function createTipCheckout(input: CreateTipCheckoutInput): Promise<string> {
  const { streamId, creatorId, creatorName, amount, viewerEmail, message } = input;

  // Calculate 85/15 split
  const creatorAmount = Math.floor(amount * 0.85);
  const platformAmount = amount - creatorAmount;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Tip for ${creatorName}`,
            description: message || "VaultLive stream tip",
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.VITE_FRONTEND_FORGE_API_URL || "http://localhost:3000"}/vault-live?tip=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.VITE_FRONTEND_FORGE_API_URL || "http://localhost:3000"}/vault-live?tip=cancelled`,
    customer_email: viewerEmail,
    metadata: {
      type: "vaultlive_tip",
      streamId: streamId.toString(),
      creatorId: creatorId.toString(),
      creatorAmount: creatorAmount.toString(),
      platformAmount: platformAmount.toString(),
      message: message || "",
    },
  });

  return session.url!;
}

/**
 * Create Stripe Checkout session for a donation
 */
export async function createDonationCheckout(input: CreateDonationCheckoutInput): Promise<string> {
  const { streamId, creatorId, creatorName, amount, viewerEmail, message } = input;

  // Calculate 85/15 split
  const creatorAmount = Math.floor(amount * 0.85);
  const platformAmount = amount - creatorAmount;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Donation for ${creatorName}`,
            description: message || "VaultLive stream donation",
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.VITE_FRONTEND_FORGE_API_URL || "http://localhost:3000"}/vault-live?donation=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.VITE_FRONTEND_FORGE_API_URL || "http://localhost:3000"}/vault-live?donation=cancelled`,
    customer_email: viewerEmail,
    metadata: {
      type: "vaultlive_donation",
      streamId: streamId.toString(),
      creatorId: creatorId.toString(),
      creatorAmount: creatorAmount.toString(),
      platformAmount: platformAmount.toString(),
      message: message || "",
    },
  });

  return session.url!;
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    ENV.stripeWebhookSecret
  );
}

/**
 * Get Stripe instance for direct usage
 */
export function getStripe(): Stripe {
  return stripe;
}
