import type Stripe from "stripe";
import { randomUUID } from "crypto";
import { db } from "../db";
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

export async function fulfillCommerceCheckoutSession(session: Stripe.Checkout.Session): Promise<CommerceFulfillmentResult> {
  const metadata = parseCommerceCheckoutMetadata(session.metadata);
  if (!metadata) {
    return { status: "ignored", stripeSessionId: session.id, reason: "not_creatorvault_commerce_checkout" };
  }

  const amountTotal = session.amount_total || 0;
  const currency = (session.currency || "usd").toUpperCase();
  const stripePaymentIntentId = getStripePaymentIntentId(session);
  const split = calculateCommerceRevenueSplit(amountTotal, metadata.recruiterId);

  if (metadata.itemType === "product") {
    return fulfillProductCheckout({ metadata, split, currency, stripeSessionId: session.id, stripePaymentIntentId });
  }

  if (metadata.itemType === "course") {
    return fulfillCourseCheckout({ metadata, split, currency, stripeSessionId: session.id, stripePaymentIntentId });
  }

  return fulfillServiceCheckout({ metadata, split, currency, stripeSessionId: session.id, stripePaymentIntentId });
}

async function fulfillProductCheckout(params: {
  metadata: CommerceCheckoutMetadata;
  split: CommerceRevenueSplit;
  currency: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
}): Promise<CommerceFulfillmentResult> {
  const existing = await db
    .select()
    .from(marketplaceOrders)
    .where(eq(marketplaceOrders.stripeSessionId, params.stripeSessionId))
    .limit(1);

  if (existing[0]) {
    await ensureCommissionEvents({
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
  const split = recruiterId && !params.metadata.recruiterId ? calculateCommerceRevenueSplit(params.split.grossAmount, recruiterId) : params.split;
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

  await ensureCommissionEvents({ refType: "order", refId: orderId, creatorId, recruiterId, currency: params.currency, ...split });
  await recordAttributionPurchase({ metadata: params.metadata, grossAmount: split.grossAmount, stripeSessionId: params.stripeSessionId });
  return buildFulfilledResult("order", orderId, "product", params, split);
}

async function fulfillCourseCheckout(params: {
  metadata: CommerceCheckoutMetadata;
  split: CommerceRevenueSplit;
  currency: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
}): Promise<CommerceFulfillmentResult> {
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

  await ensureCommissionEvents({
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
  metadata: CommerceCheckoutMetadata;
  split: CommerceRevenueSplit;
  currency: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
}): Promise<CommerceFulfillmentResult> {
  const existing = await db
    .select()
    .from(servicesSales)
    .where(eq(servicesSales.stripeSessionId, params.stripeSessionId))
    .limit(1);

  if (existing[0]) {
    await ensureCommissionEvents({
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

  await ensureCommissionEvents({
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

async function rawQuery(query: string, params: any[] = []): Promise<any[]> {
  const pool = (db as any).$client || (db as any).client;
  if (pool && typeof pool.promise === "function") {
    const [rows] = await pool.promise().query(query, params);
    return rows as any[];
  }
  if (pool && typeof pool.execute === "function") {
    const [rows] = await pool.execute(query, params);
    return rows as any[];
  }
  const result = await (db as any).execute(sql.raw(query));
  return (result as any).rows || result || [];
}

async function rawExec(query: string, params: any[] = []): Promise<any> {
  const pool = (db as any).$client || (db as any).client;
  if (pool && typeof pool.promise === "function") {
    const [result] = await pool.promise().query(query, params);
    return result;
  }
  if (pool && typeof pool.execute === "function") {
    const [result] = await pool.execute(query, params);
    return result;
  }
  return await (db as any).execute(sql.raw(query));
}

async function ensureCommissionEvents(params: {
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
