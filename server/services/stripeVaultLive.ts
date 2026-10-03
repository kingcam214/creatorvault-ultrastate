import type Stripe from "stripe";
import { stripe } from "../_core/stripe";
import { ENV } from "../_core/env";
import { CREATOR_NET_PAYOUT_RULE } from "./stripeCreatorPayouts";

export interface CreateTipCheckoutInput {
  streamId: number;
  creatorId: number;
  creatorName: string;
  amount: number; // integer minor units; fees are read after capture, not estimated
  viewerId?: number;
  viewerEmail?: string;
  message?: string;
}
export type CreateDonationCheckoutInput = CreateTipCheckoutInput;

export function getStripe(): Stripe {
  if (!stripe) throw new Error("Stripe not configured");
  return stripe;
}

async function createVaultLiveCheckout(input: CreateTipCheckoutInput, type: "vaultlive_tip" | "vaultlive_donation"): Promise<string> {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) throw new Error("VaultLive charge must be a positive integer minor-unit amount");
  if (!Number.isSafeInteger(input.creatorId) || input.creatorId <= 0 || !Number.isSafeInteger(input.streamId) || input.streamId <= 0) throw new Error("Invalid VaultLive creator/stream source");
  const kind = type === "vaultlive_tip" ? "tip" : "donation";
  const baseUrl = (process.env.APP_URL || process.env.VITE_FRONTEND_FORGE_API_URL || "https://creatorvault.live").replace(/\/$/, "");
  const metadata: Stripe.MetadataParam = {
    type, streamId: String(input.streamId), creatorId: String(input.creatorId),
    ...(input.viewerId ? { viewerId: String(input.viewerId) } : {}),
    grossAmountInCents: String(input.amount), payoutRule: CREATOR_NET_PAYOUT_RULE,
    message: input.message || "",
  };
  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price_data: {
      currency: "usd", product_data: { name: `${kind === "tip" ? "Tip" : "Donation"} for ${input.creatorName}`, description: input.message || `VaultLive stream ${kind}` },
      unit_amount: input.amount,
    }, quantity: 1 }],
    mode: "payment", customer_email: input.viewerEmail,
    success_url: `${baseUrl}/vault-live?${kind}=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/vault-live?${kind}=cancelled`,
    metadata, payment_intent_data: { metadata },
  });
  if (!session.url) throw new Error("Stripe returned no VaultLive Checkout URL");
  return session.url;
}

export async function createTipCheckout(input: CreateTipCheckoutInput): Promise<string> {
  return createVaultLiveCheckout(input, "vaultlive_tip");
}
export async function createDonationCheckout(input: CreateDonationCheckoutInput): Promise<string> {
  return createVaultLiveCheckout(input, "vaultlive_donation");
}
export function verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
  if (!ENV.stripeWebhookSecret) throw new Error("Stripe webhook signing secret is not configured");
  return getStripe().webhooks.constructEvent(payload, signature, ENV.stripeWebhookSecret);
}
