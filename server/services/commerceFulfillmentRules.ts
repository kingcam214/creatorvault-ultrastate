import type Stripe from "stripe";
import { calculateNetCreatorRevenue } from "./stripeCreatorPayouts";

export type CommerceItemType = "product" | "course" | "service";

export interface CommerceCheckoutMetadata {
  itemId: string;
  itemType: CommerceItemType;
  buyerId: number;
  creatorId?: number;
  recruiterId?: number;
  trackingCode?: string;
  attributionSessionId?: string;
}

export interface CommerceRevenueSplit {
  grossAmount: number;
  creatorAmount: number;
  recruiterAmount: number;
  platformAmount: number;
}

export function parseCommerceCheckoutMetadata(metadata: Stripe.Metadata | null | undefined): CommerceCheckoutMetadata | null {
  if (!metadata) return null;

  const itemId = String(metadata.itemId || "").trim();
  const itemType = String(metadata.itemType || "").trim() as CommerceItemType;
  const buyerId = Number.parseInt(String(metadata.buyerId || ""), 10);
  const creatorId = metadata.creatorId ? Number.parseInt(String(metadata.creatorId), 10) : undefined;
  const recruiterId = metadata.recruiterId ? Number.parseInt(String(metadata.recruiterId), 10) : undefined;
  const trackingCode = String(metadata.trackingCode || "").trim();
  const attributionSessionId = String(metadata.attributionSessionId || "").trim();

  if (!itemId || !["product", "course", "service"].includes(itemType) || !Number.isInteger(buyerId) || buyerId <= 0) {
    return null;
  }

  return {
    itemId,
    itemType,
    buyerId,
    creatorId: Number.isInteger(creatorId) && creatorId! > 0 ? creatorId : undefined,
    recruiterId: Number.isInteger(recruiterId) && recruiterId! > 0 ? recruiterId : undefined,
    trackingCode: trackingCode || undefined,
    attributionSessionId: attributionSessionId || undefined,
  };
}

export function isCommerceCheckoutSession(metadata: Stripe.Metadata | null | undefined): boolean {
  return parseCommerceCheckoutMetadata(metadata) !== null;
}

export function getStripePaymentIntentId(session: { payment_intent: string | Pick<Stripe.PaymentIntent, "id"> | null }): string | undefined {
  const paymentIntent = session.payment_intent;
  if (!paymentIntent) return undefined;
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}

export function calculateCommerceRevenueSplit(amountInCents: number, _recruiterId: number | undefined, stripeFeeInCents: number): CommerceRevenueSplit {
  const net = calculateNetCreatorRevenue(amountInCents, stripeFeeInCents);
  // Attribution is preserved, but the old 20%-of-gross recruiter allocation
  // cannot coexist with the owner's explicit 85%-of-net creator payout law.
  return {
    grossAmount: amountInCents,
    creatorAmount: net.creatorPayoutInCents,
    recruiterAmount: 0,
    platformAmount: net.platformRevenueInCents,
  };
}
