import type Stripe from "stripe";
import { and, eq, sql } from "drizzle-orm";
import { liveStreams, marketplaceProducts, servicesOffers, subscriptionTiers, universityCourses, users } from "../../drizzle/schema";
import { stripeCreatorPayouts, type StripeCreatorPayout } from "../../drizzle/schema-stripe-payouts";
import { getStripeCreatorPayout, getStripePayoutDb } from "../db";
import { executeCreatorChargeTransfer, getSucceededPaymentCharge, prepareCreatorChargePayout, StripePayoutDeferredError } from "./stripeCreatorPayouts";

export function positiveMetadataId(value: string | undefined): number | null {
  if (!value || !/^[1-9][0-9]*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2_147_483_647 ? id : null;
}

/** Signed metadata identifies a source; the database determines the actual creator user. */
export async function resolveStripeCreatorUser(metadata: Stripe.Metadata | null): Promise<number | null> {
  if (!metadata) return null;
  const database = await getStripePayoutDb();
  const creatorId = positiveMetadataId(metadata.creatorId);
  let ownerId: number | undefined;
  if (metadata.type === "vaultlive_tip" || metadata.type === "vaultlive_donation") {
    const streamId = positiveMetadataId(metadata.streamId);
    if (!streamId) throw new Error("Stripe VaultLive metadata has no valid stream");
    const [stream] = await database.select({ ownerId: liveStreams.userId }).from(liveStreams).where(eq(liveStreams.id, streamId));
    ownerId = stream?.ownerId;
  } else if (metadata.tierId) {
    const tierId = positiveMetadataId(metadata.tierId);
    if (!tierId) throw new Error("Stripe subscription metadata has no valid tier");
    const [tier] = await database.select({ ownerId: subscriptionTiers.creatorId }).from(subscriptionTiers).where(eq(subscriptionTiers.id, tierId));
    ownerId = tier?.ownerId;
  } else if (metadata.itemId && ["product", "course", "service"].includes(metadata.itemType)) {
    if (metadata.itemType === "product") {
      const [product] = await database.select({ ownerId: marketplaceProducts.creatorId }).from(marketplaceProducts).where(eq(marketplaceProducts.id, metadata.itemId));
      ownerId = product?.ownerId;
    } else if (metadata.itemType === "course") {
      const [course] = await database.select({ ownerId: universityCourses.creatorId }).from(universityCourses).where(eq(universityCourses.id, metadata.itemId));
      ownerId = course?.ownerId;
    } else {
      const [offer] = await database.select({ ownerId: servicesOffers.providerId }).from(servicesOffers).where(eq(servicesOffers.id, metadata.itemId));
      ownerId = offer?.ownerId;
    }
  } else if (metadata.type === "vaultx_ppv" || metadata.vaultxPackageId) {
    const sourceId = positiveMetadataId(metadata.vaultxPackageId || metadata.vaultxContentId || metadata.contentId);
    if (!sourceId) throw new Error("Stripe VaultX metadata has no valid source");
    const [result] = await database.execute(metadata.vaultxPackageId
      ? sql`SELECT user_id AS owner_id, creator_id AS profile_id FROM vaultx_revenue_packages WHERE id = ${sourceId} LIMIT 1`
      : sql`SELECT vc.user_id AS owner_id, c.creator_id AS profile_id FROM vaultx_content c JOIN vaultx_creators vc ON vc.id = c.creator_id WHERE c.id = ${sourceId} AND c.is_ppv = 1 LIMIT 1`);
    const rows: unknown = result;
    if (!Array.isArray(rows) || rows.length !== 1) throw new Error("VaultX creator ownership could not be resolved");
    const row: unknown = rows[0];
    if (!row || typeof row !== "object" || !("owner_id" in row) || !("profile_id" in row)) throw new Error("Invalid VaultX creator ownership row");
    if (!creatorId || creatorId !== Number(row.profile_id)) throw new Error("Stripe VaultX creator profile differs from the owned source");
    const userId = Number(row.owner_id);
    if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error("VaultX creator has no valid user mapping");
    return userId;
  } else return null; // Platform-owned offers are not inferred to belong to a creator.
  if (!ownerId) throw new Error("Stripe creator source no longer exists");
  if (creatorId && creatorId !== ownerId) throw new Error("Stripe creator metadata conflicts with source ownership");
  return ownerId;
}

export async function settleCreatorCheckout(
  stripe: Stripe,
  session: Pick<Stripe.Checkout.Session, "id" | "payment_status" | "amount_total" | "metadata" | "mode" | "payment_intent" | "currency">,
  eventId: string,
): Promise<StripeCreatorPayout | null> {
  // A completed session with an asynchronous unpaid payment is not money.
  if (session.payment_status !== "paid" || !session.amount_total || session.amount_total <= 0) return null;
  const creatorId = await resolveStripeCreatorUser(session.metadata);
  if (!creatorId) return null;
  if (session.mode === "subscription") {
    // The initial payment and renewals are both owned by invoice.paid. They must
    // not be paid twice via checkout + invoice events for the same source charge.
    return null;
  }
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!paymentIntentId) throw new StripePayoutDeferredError("Paid creator Checkout has no payment intent");
  const charge = await getSucceededPaymentCharge(stripe, paymentIntentId);
  if (charge.amount !== session.amount_total || charge.currency !== session.currency) throw new Error("Creator Checkout and captured charge amount/currency differ");
  await prepareCreatorChargePayout(stripe, charge, { creatorId, eventId, sessionId: session.id, metadata: session.metadata ?? {} });
  return executeCreatorChargeTransfer(stripe, charge.id);
}

export async function settleCreatorStripeEvent(stripe: Stripe, event: Stripe.Event): Promise<void> {
  // The money originates on the platform account, not in a connected account.
  if (event.account && event.type !== "account.updated") return;
  if (event.type === "payment_intent.succeeded" || event.type === "charge.updated" || event.type === "charge.succeeded") {
    const charge = event.type === "payment_intent.succeeded"
      ? await getSucceededPaymentCharge(stripe, event.data.object.id)
      : await stripe.charges.retrieve(event.data.object.id, { expand: ["balance_transaction"] });
    const existing = await getStripeCreatorPayout(charge.id);
    if (existing) {
      await prepareCreatorChargePayout(stripe, charge, {
        creatorId: existing.creatorId, eventId: event.id, metadata: existing.sourceMetadata,
        sessionId: existing.stripeSessionId ?? undefined, invoiceId: existing.stripeInvoiceId ?? undefined,
      });
      await executeCreatorChargeTransfer(stripe, charge.id);
    } else {
      const metadata = event.type === "payment_intent.succeeded" ? event.data.object.metadata : charge.metadata;
      // Checkout and invoice events own source verification and fulfillment.
      // Charge events only advance an already persisted payout. This avoids
      // paying arbitrary customer-supplied/direct-PI creator metadata.
      if (metadata.payoutRule) console.info("[Stripe Payout] Awaiting canonical Checkout/invoice source", { chargeId: charge.id });
    }
  } else if (event.type === "invoice.paid") {
    const invoice = event.data.object;
    if (invoice.amount_paid <= 0) return;
    const legacy = invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null; payment_intent?: string | Stripe.PaymentIntent | null };
    const subValue = invoice.parent?.subscription_details?.subscription ?? legacy.subscription;
    const subscriptionId = typeof subValue === "string" ? subValue : subValue?.id;
    if (!subscriptionId) return;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const metadata = { ...subscription.metadata, ...(invoice.parent?.subscription_details?.metadata ?? {}) };
    const creatorId = await resolveStripeCreatorUser(metadata);
    if (!creatorId) return;
    const legacyIntentId = typeof legacy.payment_intent === "string" ? legacy.payment_intent : legacy.payment_intent?.id;
    const charges: Stripe.Charge[] = [];
    if (legacyIntentId) charges.push(await getSucceededPaymentCharge(stripe, legacyIntentId));
    else {
      // Current Stripe API versions represent invoice payments explicitly.
      for await (const payment of stripe.invoicePayments.list({ invoice: invoice.id, status: "paid", limit: 100 })) {
        const intentValue = payment.payment.payment_intent;
        const chargeValue = payment.payment.charge;
        const charge = intentValue
          ? await getSucceededPaymentCharge(stripe, typeof intentValue === "string" ? intentValue : intentValue.id)
          : chargeValue ? await stripe.charges.retrieve(typeof chargeValue === "string" ? chargeValue : chargeValue.id, { expand: ["balance_transaction"] }) : null;
        if (!charge) throw new Error("Creator invoice has a non-Stripe payment record; transfer requires reconciliation");
        if (payment.amount_paid !== charge.amount || payment.currency !== charge.currency) throw new Error("Creator invoice shares a charge across allocations; no allocation is inferred");
        charges.push(charge);
      }
    }
    if (!charges.length) throw new StripePayoutDeferredError("Paid creator invoice has no captured Stripe charge");
    for (const charge of charges) {
      await prepareCreatorChargePayout(stripe, charge, {
        creatorId, eventId: event.id, invoiceId: invoice.id,
        metadata: { ...metadata, stripeSubscriptionId: subscriptionId },
      });
      await executeCreatorChargeTransfer(stripe, charge.id);
    }
  } else if (event.type === "account.updated") {
    const account = event.data.object;
    if (account.capabilities?.transfers !== "active") return;
    const database = await getStripePayoutDb();
    const pending = await database.select({ payout: stripeCreatorPayouts }).from(stripeCreatorPayouts)
      .innerJoin(users, eq(users.id, stripeCreatorPayouts.creatorId))
      .where(and(eq(users.stripeConnectAccountId, account.id), eq(stripeCreatorPayouts.status, "blocked_account")));
    for (const { payout } of pending) {
      const charge = await stripe.charges.retrieve(payout.stripeChargeId, { expand: ["balance_transaction"] });
      await prepareCreatorChargePayout(stripe, charge, { creatorId: payout.creatorId, eventId: event.id, metadata: payout.sourceMetadata });
      await executeCreatorChargeTransfer(stripe, charge.id);
    }
  } else if (event.type === "transfer.reversed") {
    const transfer = event.data.object;
    const database = await getStripePayoutDb();
    await database.update(stripeCreatorPayouts).set({ status: "reversed", lastError: `Transfer reversed by ${transfer.amount_reversed} minor units; no automatic repayment` })
      .where(eq(stripeCreatorPayouts.stripeTransferId, transfer.id));
  } else if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
    const chargeId = event.type === "charge.refunded" ? event.data.object.id
      : typeof event.data.object.charge === "string" ? event.data.object.charge : event.data.object.charge.id;
    const database = await getStripePayoutDb();
    await database.update(stripeCreatorPayouts).set({ status: "review_required", lastError: "Source charge refunded/disputed; reconcile existing transfers before further settlement" })
      .where(eq(stripeCreatorPayouts.stripeChargeId, chargeId));
  }
}
