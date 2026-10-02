import { describe, expect, it } from "vitest";
import { calculateCommerceRevenueSplit, getStripePaymentIntentId, isCommerceCheckoutSession, parseCommerceCheckoutMetadata } from "./commerceFulfillmentRules";

describe("stripeCommerceFulfillment", () => {
  it("recognizes only complete CreatorVault commerce checkout metadata", () => {
    expect(isCommerceCheckoutSession({ itemId: "prod_1", itemType: "product", buyerId: "42" })).toBe(true);
    expect(isCommerceCheckoutSession({ itemId: "course_1", itemType: "course", buyerId: "42" })).toBe(true);
    expect(isCommerceCheckoutSession({ itemId: "svc_1", itemType: "service", buyerId: "42" })).toBe(true);
    expect(isCommerceCheckoutSession({ type: "vaultlive_tip", streamId: "1", creatorId: "2" })).toBe(false);
    expect(isCommerceCheckoutSession({ itemId: "prod_1", itemType: "product" })).toBe(false);
    expect(isCommerceCheckoutSession({ itemId: "prod_1", itemType: "other", buyerId: "42" })).toBe(false);
  });
  it("parses buyer, creator, and recruiter attribution", () => {
    expect(parseCommerceCheckoutMetadata({ itemId: "prod_1", itemType: "product", buyerId: "42", creatorId: "7", recruiterId: "8", trackingCode: "track_abc", attributionSessionId: "session_xyz" }))
      .toMatchObject({ itemId: "prod_1", itemType: "product", buyerId: 42, creatorId: 7, recruiterId: 8, trackingCode: "track_abc", attributionSessionId: "session_xyz" });
  });
  it("calculates 85% of actual net when recruiter attribution exists", () => {
    expect(calculateCommerceRevenueSplit(10000, 8, 320)).toEqual({ grossAmount: 10000, creatorAmount: 8228, recruiterAmount: 0, platformAmount: 1452 });
  });
  it("uses the same net payout when no recruiter is attributed", () => {
    expect(calculateCommerceRevenueSplit(10000, undefined, 320)).toEqual({ grossAmount: 10000, creatorAmount: 8228, recruiterAmount: 0, platformAmount: 1452 });
  });
  it("rejects non-positive Stripe totals", () => {
    expect(() => calculateCommerceRevenueSplit(0, undefined, 0)).toThrow(/positive integer/);
    expect(() => calculateCommerceRevenueSplit(-100, undefined, 0)).toThrow(/positive integer/);
  });
  it("extracts IDs from expanded and unexpanded payment intents", () => {
    expect(getStripePaymentIntentId({ payment_intent: "pi_123" })).toBe("pi_123");
    expect(getStripePaymentIntentId({ payment_intent: { id: "pi_expanded" } })).toBe("pi_expanded");
    expect(getStripePaymentIntentId({ payment_intent: null })).toBeUndefined();
  });
});
