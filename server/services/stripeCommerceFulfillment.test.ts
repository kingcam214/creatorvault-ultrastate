import { describe, expect, it } from "vitest";
import {
  calculateCommerceRevenueSplit,
  getStripePaymentIntentId,
  isCommerceCheckoutSession,
  parseCommerceCheckoutMetadata,
} from "./commerceFulfillmentRules";

describe("stripeCommerceFulfillment", () => {
  it("recognizes only complete CreatorVault commerce checkout metadata", () => {
    expect(isCommerceCheckoutSession({ itemId: "prod_1", itemType: "product", buyerId: "42" })).toBe(true);
    expect(isCommerceCheckoutSession({ itemId: "course_1", itemType: "course", buyerId: "42" })).toBe(true);
    expect(isCommerceCheckoutSession({ itemId: "svc_1", itemType: "service", buyerId: "42" })).toBe(true);
    expect(isCommerceCheckoutSession({ type: "vaultlive_tip", streamId: "1", creatorId: "2" })).toBe(false);
    expect(isCommerceCheckoutSession({ itemId: "prod_1", itemType: "product" })).toBe(false);
    expect(isCommerceCheckoutSession({ itemId: "prod_1", itemType: "other", buyerId: "42" })).toBe(false);
  });

  it("parses numeric buyer, creator, and recruiter metadata safely", () => {
    const parsed = parseCommerceCheckoutMetadata({
      itemId: "prod_1",
      itemType: "product",
      buyerId: "42",
      creatorId: "7",
      recruiterId: "8",
      trackingCode: "track_abc",
      attributionSessionId: "session_xyz",
    });

    expect(parsed).toMatchObject({
      itemId: "prod_1",
      itemType: "product",
      buyerId: 42,
      creatorId: 7,
      recruiterId: 8,
      trackingCode: "track_abc",
      attributionSessionId: "session_xyz",
    });
  });

  it("calculates the canonical 70/20/10 split when recruiter attribution exists", () => {
    expect(calculateCommerceRevenueSplit(10000, 8)).toEqual({
      grossAmount: 10000,
      creatorAmount: 7000,
      recruiterAmount: 2000,
      platformAmount: 1000,
    });
  });

  it("keeps the recruiter share on platform when no recruiter is attributed", () => {
    expect(calculateCommerceRevenueSplit(10000)).toEqual({
      grossAmount: 10000,
      creatorAmount: 7000,
      recruiterAmount: 0,
      platformAmount: 3000,
    });
  });

  it("rejects non-positive Stripe totals instead of inventing fake revenue", () => {
    expect(() => calculateCommerceRevenueSplit(0)).toThrow(/positive integer/);
    expect(() => calculateCommerceRevenueSplit(-100)).toThrow(/positive integer/);
  });

  it("extracts payment intent IDs from expanded and non-expanded Stripe sessions", () => {
    expect(getStripePaymentIntentId({ payment_intent: "pi_123" })).toBe("pi_123");
    expect(getStripePaymentIntentId({ payment_intent: { id: "pi_expanded" } as any })).toBe("pi_expanded");
    expect(getStripePaymentIntentId({ payment_intent: null })).toBeUndefined();
  });
});
