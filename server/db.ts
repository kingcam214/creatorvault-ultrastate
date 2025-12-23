import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  emmaNetwork,
  brandAffiliations,
  culturalContentTemplates,
  waitlist,
  content,
  payments,
  videoGenerationJobs,
  analyticsEvents,
  botEvents,
  viralAnalyses,
  viralMetrics,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Export db instance for direct use
export const db = drizzle(process.env.DATABASE_URL!);

// ============ USER MANAGEMENT ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "language", "country", "primaryBrand", "creatorStatus"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "king";
      updateSet.role = "king";
    }

    if (user.referredBy !== undefined) {
      values.referredBy = user.referredBy;
      updateSet.referredBy = user.referredBy;
    }

    if (user.contentType !== undefined) {
      values.contentType = user.contentType;
      updateSet.contentType = user.contentType;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUsersByRole(role: "user" | "creator" | "admin" | "king") {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).where(eq(users.role, role)).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "creator" | "admin" | "king") {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateCreatorStatus(userId: number, status: string) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(users).set({ creatorStatus: status }).where(eq(users.id, userId));
}

export async function updateUserProfile(
  userId: number, 
  data: Partial<{ 
    name: string; 
    language: string; 
    country: string; 
    cashappHandle: string; 
    zelleHandle: string; 
    applepayHandle: string 
  }>
) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(users).set(data).where(eq(users.id, userId));
}

// ============ EMMA NETWORK ============

export async function createEmmaNetworkEntry(data: typeof emmaNetwork.$inferInsert) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(emmaNetwork).values(data);
  return result;
}

export async function getEmmaNetworkByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(emmaNetwork).where(eq(emmaNetwork.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllEmmaNetwork() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(emmaNetwork).orderBy(desc(emmaNetwork.createdAt));
}

export async function updateEmmaNetwork(id: number, data: Partial<typeof emmaNetwork.$inferInsert>) {
  const db = await getDb();
  if (!db) return;

  await db.update(emmaNetwork).set(data).where(eq(emmaNetwork.id, id));
}

// ============ WAITLIST ============

export async function addToWaitlist(data: typeof waitlist.$inferInsert) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(waitlist).values(data);
  return result;
}

export async function getWaitlistByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(waitlist).where(eq(waitlist.email, email)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllWaitlist() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(waitlist).orderBy(desc(waitlist.createdAt));
}

export async function updateWaitlistStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) return;

  await db.update(waitlist).set({ status }).where(eq(waitlist.id, id));
}

// ============ CONTENT ============

export async function createContent(data: typeof content.$inferInsert) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(content).values(data);
  return result;
}

export async function getContentByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(content).where(eq(content.userId, userId)).orderBy(desc(content.createdAt));
}

export async function getContentById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(content).where(eq(content.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllContent() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(content).orderBy(desc(content.createdAt));
}

export async function updateContentStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) return;

  await db.update(content).set({ status }).where(eq(content.id, id));
}

// ============ PAYMENTS ============

export async function createPayment(data: typeof payments.$inferInsert) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(payments).values(data);
  return result;
}

export async function getPaymentsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(payments).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt));
}

export async function getPaymentByStripeId(stripePaymentId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(payments).where(eq(payments.stripePaymentId, stripePaymentId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ============ VIDEO GENERATION ============

export async function createVideoJob(data: typeof videoGenerationJobs.$inferInsert) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(videoGenerationJobs).values(data);
  return result;
}

export async function getVideoJobById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(videoGenerationJobs).where(eq(videoGenerationJobs.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getVideoJobsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(videoGenerationJobs).where(eq(videoGenerationJobs.userId, userId)).orderBy(desc(videoGenerationJobs.createdAt));
}

export async function updateVideoJob(id: number, data: Partial<typeof videoGenerationJobs.$inferInsert>) {
  const db = await getDb();
  if (!db) return;

  await db.update(videoGenerationJobs).set(data).where(eq(videoGenerationJobs.id, id));
}

// ============ ANALYTICS ============

export async function logAnalyticsEvent(data: typeof analyticsEvents.$inferInsert) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(analyticsEvents).values(data);
  return result;
}

export async function getAnalyticsByUserId(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(analyticsEvents).where(eq(analyticsEvents.userId, userId)).orderBy(desc(analyticsEvents.createdAt)).limit(limit);
}

export async function getAnalyticsByEventType(eventType: string, limit = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(analyticsEvents).where(eq(analyticsEvents.eventType, eventType)).orderBy(desc(analyticsEvents.createdAt)).limit(limit);
}

// ============ CULTURAL TEMPLATES ============

export async function getCulturalTemplates(culture: string, contentType?: string) {
  const db = await getDb();
  if (!db) return [];

  if (contentType) {
    return await db.select().from(culturalContentTemplates)
      .where(and(eq(culturalContentTemplates.culture, culture), eq(culturalContentTemplates.contentType, contentType)))
      .orderBy(desc(culturalContentTemplates.effectivenessScore));
  }

  return await db.select().from(culturalContentTemplates)
    .where(eq(culturalContentTemplates.culture, culture))
    .orderBy(desc(culturalContentTemplates.effectivenessScore));
}

export async function createCulturalTemplate(data: typeof culturalContentTemplates.$inferInsert) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(culturalContentTemplates).values(data);
  return result;
}

// ============ BRAND AFFILIATIONS ============

export async function createBrandAffiliation(data: typeof brandAffiliations.$inferInsert) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(brandAffiliations).values(data);
  return result;
}

export async function getBrandAffiliationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(brandAffiliations).where(eq(brandAffiliations.userId, userId));
}
