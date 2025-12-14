/**
 * Database helpers for Systems F, G, H
 * Marketplace, University, Services
 */

import { getDb } from "./db";
import {
  marketplaceProducts,
  marketplaceOrders,
  universityCourses,
  universityEnrollments,
  servicesOffers,
  servicesSales,
  commissionEvents,
} from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

// ============ MARKETPLACE ============

export async function createProduct(data: {
  creatorId: number;
  recruiterId?: number;
  type: "digital" | "service" | "bundle" | "subscription";
  title: string;
  description?: string;
  priceAmount: number;
  currency: string;
  fulfillmentType: "instant" | "manual" | "scheduled";
  fulfillmentPayload?: any;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(marketplaceProducts).values({
    ...data,
    status: "active",
  });

  return result;
}

export async function getProduct(id: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(marketplaceProducts).where(eq(marketplaceProducts.id, id)).limit(1);
  return result[0] || null;
}

export async function listProducts(filters?: { creatorId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(marketplaceProducts);

  if (filters?.creatorId) {
    query = query.where(eq(marketplaceProducts.creatorId, filters.creatorId)) as any;
  }

  if (filters?.status) {
    query = query.where(eq(marketplaceProducts.status, filters.status as any)) as any;
  }

  return await query;
}

export async function createOrder(data: {
  buyerId: number;
  productId: string;
  quantity: number;
  grossAmount: number;
  currency: string;
  creatorAmount: number;
  recruiterAmount: number;
  platformAmount: number;
  stripeSessionId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(marketplaceOrders).values({
    ...data,
    status: "pending",
  });

  return result;
}

export async function getOrderByStripeSession(stripeSessionId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(marketplaceOrders)
    .where(eq(marketplaceOrders.stripeSessionId, stripeSessionId))
    .limit(1);

  return result[0] || null;
}

export async function updateOrderStatus(orderId: string, status: string, paymentIntentId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { status };
  if (paymentIntentId) {
    updateData.stripePaymentIntentId = paymentIntentId;
  }

  await db.update(marketplaceOrders).set(updateData).where(eq(marketplaceOrders.id, orderId));
}

export async function listOrders(filters?: { buyerId?: number; productId?: string }) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(marketplaceOrders).orderBy(desc(marketplaceOrders.createdAt));

  if (filters?.buyerId) {
    query = query.where(eq(marketplaceOrders.buyerId, filters.buyerId)) as any;
  }

  if (filters?.productId) {
    query = query.where(eq(marketplaceOrders.productId, filters.productId)) as any;
  }

  return await query;
}

// ============ UNIVERSITY ============

export async function createCourse(data: {
  creatorId: number;
  title: string;
  description?: string;
  priceAmount: number;
  currency: string;
  isFree: boolean;
  syllabusJson?: any;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(universityCourses).values({
    ...data,
    status: "draft",
  });

  return result;
}

export async function getCourse(id: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(universityCourses).where(eq(universityCourses.id, id)).limit(1);
  return result[0] || null;
}

export async function listCourses(filters?: { creatorId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(universityCourses);

  if (filters?.creatorId) {
    query = query.where(eq(universityCourses.creatorId, filters.creatorId)) as any;
  }

  if (filters?.status) {
    query = query.where(eq(universityCourses.status, filters.status as any)) as any;
  }

  return await query;
}

export async function publishCourse(courseId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(universityCourses).set({ status: "published" }).where(eq(universityCourses.id, courseId));
}

export async function createEnrollment(data: {
  courseId: string;
  studentId: number;
  orderId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(universityEnrollments).values({
    ...data,
    status: "active",
    progressJson: {
      completedLessons: [],
      lastAccessedAt: Date.now(),
    },
  });

  return result;
}

export async function getEnrollment(courseId: string, studentId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(universityEnrollments)
    .where(and(eq(universityEnrollments.courseId, courseId), eq(universityEnrollments.studentId, studentId)))
    .limit(1);

  return result[0] || null;
}

export async function updateEnrollmentProgress(enrollmentId: string, progressJson: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(universityEnrollments).set({ progressJson }).where(eq(universityEnrollments.id, enrollmentId));
}

export async function listEnrollments(filters?: { studentId?: number; courseId?: string }) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(universityEnrollments).orderBy(desc(universityEnrollments.createdAt));

  if (filters?.studentId) {
    query = query.where(eq(universityEnrollments.studentId, filters.studentId)) as any;
  }

  if (filters?.courseId) {
    query = query.where(eq(universityEnrollments.courseId, filters.courseId)) as any;
  }

  return await query;
}

// ============ SERVICES ============

export async function createServiceOffer(data: {
  providerId: number;
  title: string;
  description?: string;
  tier: "low" | "mid" | "high";
  priceAmount: number;
  currency: string;
  deliveryDays: number;
  fulfillmentStepsJson?: any;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(servicesOffers).values({
    ...data,
    status: "active",
  });

  return result;
}

export async function getServiceOffer(id: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(servicesOffers).where(eq(servicesOffers.id, id)).limit(1);
  return result[0] || null;
}

export async function listServiceOffers(filters?: { providerId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(servicesOffers);

  if (filters?.providerId) {
    query = query.where(eq(servicesOffers.providerId, filters.providerId)) as any;
  }

  if (filters?.status) {
    query = query.where(eq(servicesOffers.status, filters.status as any)) as any;
  }

  return await query;
}

export async function createServiceSale(data: {
  buyerId: number;
  offerId: string;
  grossAmount: number;
  currency: string;
  providerAmount: number;
  affiliateAmount: number;
  recruiterAmount: number;
  platformAmount: number;
  stripeSessionId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(servicesSales).values({
    ...data,
    status: "pending",
  });

  return result;
}

export async function getServiceSaleByStripeSession(stripeSessionId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(servicesSales)
    .where(eq(servicesSales.stripeSessionId, stripeSessionId))
    .limit(1);

  return result[0] || null;
}

export async function updateServiceSaleStatus(saleId: string, status: string, paymentIntentId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = { status };
  if (paymentIntentId) {
    updateData.stripePaymentIntentId = paymentIntentId;
  }

  await db.update(servicesSales).set(updateData).where(eq(servicesSales.id, saleId));
}

export async function listServiceSales(filters?: { buyerId?: number; offerId?: string }) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(servicesSales).orderBy(desc(servicesSales.createdAt));

  if (filters?.buyerId) {
    query = query.where(eq(servicesSales.buyerId, filters.buyerId)) as any;
  }

  if (filters?.offerId) {
    query = query.where(eq(servicesSales.offerId, filters.offerId)) as any;
  }

  return await query;
}

// ============ COMMISSION EVENTS ============

export async function createCommissionEvent(data: {
  refType: "order" | "sale" | "enrollment";
  refId: string;
  partyType: "creator" | "recruiter" | "affiliate" | "platform";
  partyId?: number;
  amount: number;
  currency: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(commissionEvents).values(data);
}

export async function getCommissionsByParty(partyId: number, partyType: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(commissionEvents)
    .where(and(eq(commissionEvents.partyId, partyId), eq(commissionEvents.partyType, partyType as any)))
    .orderBy(desc(commissionEvents.createdAt));
}

export async function getCommissionsByRef(refType: string, refId: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(commissionEvents)
    .where(and(eq(commissionEvents.refType, refType as any), eq(commissionEvents.refId, refId)))
    .orderBy(desc(commissionEvents.createdAt));
}
