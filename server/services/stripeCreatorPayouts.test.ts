import { describe, expect, it } from "vitest";
import { calculateNetCreatorRevenue, creatorTransferIdentity } from "./stripeCreatorPayouts";
import { positiveMetadataId } from "./stripeCreatorPayoutEvents";

describe("Stripe 85% net creator revenue", () => {
  it("deducts the actual processing fee before splitting", () => {
    expect(calculateNetCreatorRevenue(10_000, 320)).toEqual({
      grossAmountInCents: 10_000, stripeFeeInCents: 320, netAmountInCents: 9_680,
      creatorPayoutInCents: 8_228, platformRevenueInCents: 1_452,
    });
  });
  it("rounds down once in integer minor units and assigns the remainder to the platform", () => {
    expect(calculateNetCreatorRevenue(1_000, 59)).toEqual({
      grossAmountInCents: 1_000, stripeFeeInCents: 59, netAmountInCents: 941,
      creatorPayoutInCents: 799, platformRevenueInCents: 142,
    });
  });
  it("handles genuinely zero-fee charges", () => expect(calculateNetCreatorRevenue(100, 0).creatorPayoutInCents).toBe(85));
  it("handles a fee that consumes the charge without a zero-value transfer", () => expect(calculateNetCreatorRevenue(100, 100).creatorPayoutInCents).toBe(0));
  it.each([0, -1, 1.5, NaN, Infinity, 2_147_483_648])("rejects invalid gross amounts: %s", (gross) => {
    expect(() => calculateNetCreatorRevenue(gross, 0)).toThrow(/positive integer/);
  });
  it.each([-1, 1.5, NaN, Infinity, 101])("rejects invalid actual fees: %s", (fee) => {
    expect(() => calculateNetCreatorRevenue(100, fee)).toThrow(/processing fee/);
  });
  it("conserves every minor unit over a broad deterministic input range", () => {
    for (let gross = 1; gross <= 20_000; gross += 37) {
      const fee = Math.min(gross, Math.floor(gross / 29) + 30);
      const split = calculateNetCreatorRevenue(gross, fee);
      expect(split.stripeFeeInCents + split.creatorPayoutInCents + split.platformRevenueInCents).toBe(gross);
      expect(Number.isSafeInteger(split.creatorPayoutInCents)).toBe(true);
      expect(split.creatorPayoutInCents).toBeLessThanOrEqual(split.netAmountInCents);
    }
  });
  it("uses one versioned identity for a source charge regardless of event/retry", () => {
    expect(creatorTransferIdentity("ch_valid123")).toEqual({
      idempotencyKey: "creatorvault:net85:v1:ch_valid123", transferGroup: "cv_net85_v1_ch_valid123",
    });
    expect(creatorTransferIdentity("ch_valid123")).toEqual(creatorTransferIdentity("ch_valid123"));
    expect(creatorTransferIdentity("ch_other")).not.toEqual(creatorTransferIdentity("ch_valid123"));
  });
  it("rejects untrusted malformed charge IDs", () => expect(() => creatorTransferIdentity("ch_x:retry" )).toThrow(/Invalid/));
  it.each(["", "1junk", "1.5", "-1", "0", "2147483648", undefined])("does not parse malformed metadata IDs: %s", (value) => {
    expect(positiveMetadataId(value)).toBeNull();
  });
  it("parses valid owner IDs exactly", () => expect(positiveMetadataId("42")).toBe(42));
});
