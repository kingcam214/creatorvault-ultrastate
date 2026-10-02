import type Stripe from "stripe";
import { eq, sql } from "drizzle-orm";
import { liveStreamDonations, liveStreamTips, liveStreams } from "../../drizzle/schema";
import { stripeCreatorPayouts, type StripeCreatorPayout } from "../../drizzle/schema-stripe-payouts";
import { getStripePayoutDb } from "../db";
import { positiveMetadataId } from "./stripeCreatorPayoutEvents";

export async function recordStripeVaultLiveCheckout(session: Stripe.Checkout.Session, payout: StripeCreatorPayout): Promise<void> {
  const type = session.metadata?.type;
  const streamId = positiveMetadataId(session.metadata?.streamId);
  const viewerId = positiveMetadataId(session.metadata?.viewerId);
  if (!streamId || !["vaultlive_tip", "vaultlive_donation"].includes(type ?? "")) throw new Error("Invalid Stripe VaultLive source");
  if (!viewerId) {
    // Legacy Checkout sessions lack a viewer ID. Their real revenue/transfer
    // remains in the canonical ledger; do not invent the creator as a viewer.
    console.warn("[Stripe Payout] Legacy VaultLive payment has no viewer attribution", { payoutId: payout.id });
    return;
  }
  if (payout.creatorPayoutInCents === null || payout.platformRevenueInCents === null) throw new Error("Stripe VaultLive net revenue is pending");
  const database = await getStripePayoutDb();
  await database.transaction(async (tx) => {
    await tx.select({ id: stripeCreatorPayouts.id }).from(stripeCreatorPayouts)
      .where(eq(stripeCreatorPayouts.id, payout.id)).for("update");
    const common = {
      streamId, userId: viewerId, amount: (payout.grossAmountInCents / 100).toFixed(2),
      creatorShare: (payout.creatorPayoutInCents! / 100).toFixed(2),
      platformShare: (payout.platformRevenueInCents! / 100).toFixed(2),
      message: session.metadata?.message || null, stripeCreatorPayoutId: payout.id,
    };
    if (type === "vaultlive_tip") {
      const [existing] = await tx.select({ id: liveStreamTips.id }).from(liveStreamTips)
        .where(eq(liveStreamTips.stripeCreatorPayoutId, payout.id));
      if (existing) return;
      await tx.insert(liveStreamTips).values({ ...common, status: "confirmed", confirmedAt: new Date() });
    } else {
      const [existing] = await tx.select({ id: liveStreamDonations.id }).from(liveStreamDonations)
        .where(eq(liveStreamDonations.stripeCreatorPayoutId, payout.id));
      if (existing) return;
      await tx.insert(liveStreamDonations).values({
        ...common, paymentMethod: "stripe", paymentStatus: "completed", completedAt: new Date(),
        stripePaymentIntentId: payout.stripePaymentIntentId,
      });
    }
    await tx.update(liveStreams).set({ totalTips: sql`${liveStreams.totalTips} + ${common.amount}` }).where(eq(liveStreams.id, streamId));
  });
}
