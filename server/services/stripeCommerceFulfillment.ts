import type Stripe from "stripe";
import { randomUUID } from "crypto";
import { getStripePayoutDb, getStripePayoutSqlClient, type StripePayoutTransaction } from "../db";
import { stripeCreatorPayouts, type StripeCreatorPayout } from "../../drizzle/schema-stripe-payouts";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import {
  marketplaceProducts,
  marketplaceOrders,
  universityCourses,
  universityEnrollments,
  servicesOffers,
  servicesSales,
  commissionEvents,
} from "../../drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import {
  calculateCommerceRevenueSplit,
  getStripePaymentIntentId,
  isCommerceCheckoutSession,
  parseCommerceCheckoutMetadata,
  type CommerceCheckoutMetadata,
  type CommerceItemType,
  type CommerceRevenueSplit,
} from "./commerceFulfillmentRules";

export {
  calculateCommerceRevenueSplit,
  getStripePaymentIntentId,
  isCommerceCheckoutSession,
  parseCommerceCheckoutMetadata,
};

export type CommerceFulfillmentStatus = "fulfilled" | "already_fulfilled" | "ignored";

export interface CommerceFulfillmentResult {
  status: CommerceFulfillmentStatus;
  refType?: "order" | "sale" | "enrollment";
  refId?: string;
  itemType?: CommerceItemType;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  grossAmount?: number;
  creatorAmount?: number;
  recruiterAmount?: number;
  platformAmount?: number;
  reason?: string;
}

export async function fulfillCommerceCheckoutSession(session: Stripe.Checkout.Session, payout: StripeCreatorPayout): Promise<CommerceFulfillmentResult> {
  const metadata = parseCommerceCheckoutMetadata(session.metadata);
  if (!metadata) return { status: "ignored", stripeSessionId: session.id, reason: "not_creatorvault_commerce_checkout" };
  if (session.payment_status !== "paid" || payout.stripeFeeInCents === null || payout.grossAmountInCents !== session.amount_total) throw new Error("Commerce requires a paid, verified fee-aware creator charge");
  const currency = (session.currency || "usd").toUpperCase();
  const stripePaymentIntentId = getStripePaymentIntentId(session);
  if (payout.stripePaymentIntentId !== stripePaymentIntentId) throw new Error("Commerce payout and payment intent differ");
  const split = calculateCommerceRevenueSplit(payout.grossAmountInCents, metadata.recruiterId, payout.stripeFeeInCents);
  const database = await getStripePayoutDb();
  return database.transaction(async (db) => {
    await db.select({ id: stripeCreatorPayouts.id }).from(stripeCreatorPayouts).where(eq(stripeCreatorPayouts.id, payout.id)).for("update");
    const params = { metadata, split, currency, stripeSessionId: session.id, stripePaymentIntentId, database: db };
    if (metadata.itemType === "product") return fulfillProductCheckout(params);
    if (metadata.itemType === "course") return fulfillCourseCheckout(params);
    return fulfillServiceCheckout(params);
  });
}

async function fulfillProductCheckout(params: {
  database: StripePayoutTransaction;
  metadata: CommerceCheckoutMetadata;
  split: CommerceRevenueSplit;
  currency: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
}): Promise<CommerceFulfillmentResult> {
  const db = params.database;
  const existing = await db
    .select()
    .from(marketplaceOrders)
    .where(eq(marketplaceOrders.stripeSessionId, params.stripeSessionId))
    .limit(1);

  if (existing[0]) {
    await ensureCommissionEvents({ database: db,
      refType: "order",
      refId: existing[0].id,
      creatorId: params.metadata.creatorId || 0,
      recruiterId: params.metadata.recruiterId,
      currency: existing[0].currency,
      grossAmount: existing[0].grossAmount,
      creatorAmount: existing[0].creatorAmount,
      recruiterAmount: existing[0].recruiterAmount,
      platformAmount: existing[0].platformAmount,
    });
    await recordAttributionPurchase({ metadata: params.metadata, grossAmount: existing[0].grossAmount, stripeSessionId: params.stripeSessionId });
    return buildAlreadyFulfilledResult("order", existing[0].id, "product", params);
  }

  const productRows = await db
    .select()
    .from(marketplaceProducts)
    .where(eq(marketplaceProducts.id, params.metadata.itemId))
    .limit(1);
  const product = productRows[0];
  if (!product) throw new Error(`Marketplace product not found for Stripe checkout item ${params.metadata.itemId}`);

  const creatorId = params.metadata.creatorId || product.creatorId;
  const recruiterId = params.metadata.recruiterId || product.recruiterId || undefined;
  const split = params.split;
  const orderId = randomUUID();

  await db.insert(marketplaceOrders).values({
    id: orderId,
    buyerId: params.metadata.buyerId,
    productId: product.id,
    quantity: 1,
    grossAmount: split.grossAmount,
    currency: params.currency,
    creatorAmount: split.creatorAmount,
    recruiterAmount: split.recruiterAmount,
    platformAmount: split.platformAmount,
    paymentProvider: "stripe",
    stripeSessionId: params.stripeSessionId,
    stripePaymentIntentId: params.stripePaymentIntentId,
    status: "paid",
  });

  await ensureCommissionEvents({ database: db, refType: "order", refId: orderId, creatorId, recruiterId, currency: params.currency, ...split });
  await recordAttributionPurchase({ metadata: params.metadata, grossAmount: split.grossAmount, stripeSessionId: params.stripeSessionId });
  return buildFulfilledResult("order", orderId, "product", params, split);
}

async function fulfillCourseCheckout(params: {
  database: StripePayoutTransaction;
  metadata: CommerceCheckoutMetadata;
  split: CommerceRevenueSplit;
  currency: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
}): Promise<CommerceFulfillmentResult> {
  const db = params.database;
  const courseRows = await db
    .select()
    .from(universityCourses)
    .where(eq(universityCourses.id, params.metadata.itemId))
    .limit(1);
  const course = courseRows[0];
  if (!course) throw new Error(`University course not found for Stripe checkout item ${params.metadata.itemId}`);

  const existingEnrollment = await db
    .select()
    .from(universityEnrollments)
    .where(and(eq(universityEnrollments.courseId, course.id), eq(universityEnrollments.studentId, params.metadata.buyerId)))
    .limit(1);

  const creatorId = params.metadata.creatorId || course.creatorId;
  const refId = existingEnrollment[0]?.id || randomUUID();

  if (!existingEnrollment[0]) {
    await db.insert(universityEnrollments).values({
      id: refId,
      courseId: course.id,
      studentId: params.metadata.buyerId,
      status: "active",
      progressJson: {
        completedLessons: [],
        lastAccessedAt: Date.now(),
        stripeSessionId: params.stripeSessionId,
        stripePaymentIntentId: params.stripePaymentIntentId,
      },
    });
  }

  await ensureCommissionEvents({ database: db,
    refType: "enrollment",
    refId,
    creatorId,
    recruiterId: params.metadata.recruiterId,
    currency: params.currency,
    ...params.split,
  });

  await recordAttributionPurchase({ metadata: params.metadata, grossAmount: params.split.grossAmount, stripeSessionId: params.stripeSessionId });

  if (existingEnrollment[0]) {
    return buildAlreadyFulfilledResult("enrollment", refId, "course", params);
  }

  return buildFulfilledResult("enrollment", refId, "course", params, params.split);
}

async function fulfillServiceCheckout(params: {
  database: StripePayoutTransaction;
  metadata: CommerceCheckoutMetadata;
  split: CommerceRevenueSplit;
  currency: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
}): Promise<CommerceFulfillmentResult> {
  const db = params.database;
  const existing = await db
    .select()
    .from(servicesSales)
    .where(eq(servicesSales.stripeSessionId, params.stripeSessionId))
    .limit(1);

  if (existing[0]) {
    await ensureCommissionEvents({ database: db,
      refType: "sale",
      refId: existing[0].id,
      creatorId: params.metadata.creatorId || 0,
      recruiterId: params.metadata.recruiterId,
      currency: existing[0].currency,
      creatorAmount: existing[0].providerAmount,
      recruiterAmount: existing[0].recruiterAmount,
      platformAmount: existing[0].platformAmount,
      grossAmount: existing[0].grossAmount,
    });
    await recordAttributionPurchase({ metadata: params.metadata, grossAmount: existing[0].grossAmount, stripeSessionId: params.stripeSessionId });
    return buildAlreadyFulfilledResult("sale", existing[0].id, "service", params);
  }

  const offerRows = await db
    .select()
    .from(servicesOffers)
    .where(eq(servicesOffers.id, params.metadata.itemId))
    .limit(1);
  const offer = offerRows[0];
  if (!offer) throw new Error(`Service offer not found for Stripe checkout item ${params.metadata.itemId}`);

  const providerId = params.metadata.creatorId || offer.providerId;
  const saleId = randomUUID();

  await db.insert(servicesSales).values({
    id: saleId,
    buyerId: params.metadata.buyerId,
    offerId: offer.id,
    grossAmount: params.split.grossAmount,
    currency: params.currency,
    providerAmount: params.split.creatorAmount,
    affiliateAmount: 0,
    recruiterAmount: params.split.recruiterAmount,
    platformAmount: params.split.platformAmount,
    stripeSessionId: params.stripeSessionId,
    stripePaymentIntentId: params.stripePaymentIntentId,
    status: "paid",
  });

  await ensureCommissionEvents({ database: db,
    refType: "sale",
    refId: saleId,
    creatorId: providerId,
    recruiterId: params.metadata.recruiterId,
    currency: params.currency,
    ...params.split,
  });
  await recordAttributionPurchase({ metadata: params.metadata, grossAmount: params.split.grossAmount, stripeSessionId: params.stripeSessionId });

  return buildFulfilledResult("sale", saleId, "service", params, params.split);
}

async function recordAttributionPurchase(params: {
  metadata: CommerceCheckoutMetadata;
  grossAmount: number;
  stripeSessionId: string;
}): Promise<void> {
  const trackingCode = params.metadata.trackingCode?.trim();
  if (!trackingCode) return;

  try {
    const jobs = await rawQuery(
      `SELECT id, creator_id, content_id, channel_identity_id, platform
         FROM distribution_jobs
        WHERE tracking_code = ?
        LIMIT 1`,
      [trackingCode],
    );
    const job = jobs[0];
    if (!job) return;

    const existing = await rawQuery(
      `SELECT id
         FROM attribution_events
        WHERE tracking_code = ? AND event_type = 'purchase' AND session_id = ?
        LIMIT 1`,
      [trackingCode, params.stripeSessionId],
    );
    if (existing[0]) return;

    await rawExec(
      `INSERT INTO attribution_events
        (tracking_code, distribution_job_id, creator_id, content_id, channel_identity_id, platform, event_type, user_id, session_id, revenue_cents)
       VALUES (?, ?, ?, ?, ?, ?, 'purchase', ?, ?, ?)`,
      [
        trackingCode,
        job.id,
        job.creator_id,
        job.content_id || null,
        job.channel_identity_id,
        job.platform,
        params.metadata.buyerId,
        params.stripeSessionId,
        params.grossAmount,
      ],
    );
  } catch (error) {
    console.warn("[stripeCommerceFulfillment] attribution purchase proof write failed", {
      trackingCode,
      stripeSessionId: params.stripeSessionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function rawQuery<T extends RowDataPacket = RowDataPacket>(query: string, params: readonly unknown[] = []): Promise<T[]> {
  const client = await getStripePayoutSqlClient();
  const [rows] = await client.query<T[]>(query, [...params]);
  return rows;
}

async function rawExec(query: string, params: readonly unknown[] = []): Promise<ResultSetHeader> {
  const client = await getStripePayoutSqlClient();
  const [result] = await client.query<ResultSetHeader>(query, [...params]);
  return result;
}

async function ensureCommissionEvents(params: {
  database: StripePayoutTransaction;
  refType: "order" | "sale" | "enrollment";
  refId: string;
  creatorId: number;
  recruiterId?: number;
  amount?: number;
  grossAmount: number;
  creatorAmount: number;
  recruiterAmount: number;
  platformAmount: number;
  currency: string;
}) {
  const db = params.database;
  const existing = await db
    .select()
    .from(commissionEvents)
    .where(and(eq(commissionEvents.refType, params.refType), eq(commissionEvents.refId, params.refId)))
    .limit(1);

  if (existing[0]) return;

  await db.insert(commissionEvents).values([
    {
      refType: params.refType,
      refId: params.refId,
      partyType: "creator",
      partyId: params.creatorId || null,
      amount: params.creatorAmount,
      currency: params.currency,
    },
    ...(params.recruiterId && params.recruiterAmount > 0
      ? [
          {
            refType: params.refType,
            refId: params.refId,
            partyType: "recruiter" as const,
            partyId: params.recruiterId,
            amount: params.recruiterAmount,
            currency: params.currency,
          },
        ]
      : []),
    {
      refType: params.refType,
      refId: params.refId,
      partyType: "platform",
      partyId: null,
      amount: params.platformAmount,
      currency: params.currency,
    },
  ]);
}

function buildFulfilledResult(
  refType: "order" | "sale" | "enrollment",
  refId: string,
  itemType: CommerceItemType,
  params: { stripeSessionId: string; stripePaymentIntentId?: string },
  split: CommerceRevenueSplit,
): CommerceFulfillmentResult {
  return {
    status: "fulfilled",
    refType,
    refId,
    itemType,
    stripeSessionId: params.stripeSessionId,
    stripePaymentIntentId: params.stripePaymentIntentId,
    ...split,
  };
}

function buildAlreadyFulfilledResult(
  refType: "order" | "sale" | "enrollment",
  refId: string,
  itemType: CommerceItemType,
  params: { stripeSessionId: string; stripePaymentIntentId?: string; split?: CommerceRevenueSplit },
): CommerceFulfillmentResult {
  return {
    status: "already_fulfilled",
    refType,
    refId,
    itemType,
    stripeSessionId: params.stripeSessionId,
    stripePaymentIntentId: params.stripePaymentIntentId,
  };
}
