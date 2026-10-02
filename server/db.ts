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
  creatorAudits,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

type DatabaseLike = {
  execute: <T = unknown>(...args: any[]) => Promise<T>;
  select: (...args: any[]) => any;
  insert: (...args: any[]) => any;
  update: (...args: any[]) => any;
  delete: (...args: any[]) => any;
  [key: string]: any;
};

let _db: DatabaseLike | null = null;

export async function getDb(): Promise<DatabaseLike> {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL) as unknown as DatabaseLike;
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  if (!_db) throw new Error("Database is not configured");
  return _db;
}

// Export db instance for direct use
// Only initialize if DATABASE_URL is set
export const db: DatabaseLike = process.env.DATABASE_URL ? (drizzle(process.env.DATABASE_URL) as unknown as DatabaseLike) : (null as unknown as DatabaseLike);

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

export async function updateUserRole(userId: number, role: "user" | "creator" | "influencer" | "celebrity" | "admin" | "king") {
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

export async function getWaitlistCount() {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(waitlist);

  return Number(result[0]?.count ?? 0);
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

// Re-export schema so routers can use: import * as db from "../db"; db.schema.tableName
import * as schema from "../drizzle/schema";
export { schema };

// ============ STRIPE CONNECT NET PAYOUTS ============
// Use the real Drizzle contract for financial writes; the legacy facade above is
// retained for existing unrelated callers and is not used by this pipeline.
export type StripePayoutDatabase = import("drizzle-orm/mysql2").MySql2Database<typeof schema>;
export type StripePayoutTransaction = Parameters<Parameters<StripePayoutDatabase["transaction"]>[0]>[0];

export async function getStripePayoutDb(): Promise<StripePayoutDatabase> {
  return await getDb() as unknown as StripePayoutDatabase;
}

export async function getStripeCreatorPayout(chargeId: string): Promise<schema.StripeCreatorPayout | null> {
  const database = await getStripePayoutDb();
  const [payout] = await database.select().from(schema.stripeCreatorPayouts)
    .where(eq(schema.stripeCreatorPayouts.stripeChargeId, chargeId)).limit(1);
  return payout ?? null;
}

export async function ensureStripeCreatorPayout(
  input: import("../drizzle/schema-stripe-payouts").InsertStripeCreatorPayout,
): Promise<import("../drizzle/schema-stripe-payouts").StripeCreatorPayout> {
  const database = await getStripePayoutDb();
  return database.transaction(async (tx) => {
    await tx.insert(schema.stripeCreatorPayouts).values(input).onDuplicateKeyUpdate({
      set: { stripeChargeId: sql`${schema.stripeCreatorPayouts.stripeChargeId}` },
    });
    const [payout] = await tx.select().from(schema.stripeCreatorPayouts)
      .where(eq(schema.stripeCreatorPayouts.stripeChargeId, input.stripeChargeId)).for("update");
    if (!payout || payout.creatorId !== input.creatorId || payout.currency !== input.currency ||
      payout.grossAmountInCents !== input.grossAmountInCents ||
      payout.stripePaymentIntentId !== (input.stripePaymentIntentId ?? null)) {
      throw new Error("Stripe payout source conflicts with the persisted charge");
    }
    return payout;
  });
}

export async function updateStripePayoutBeforeAttempt(
  payoutId: number,
  values: Partial<import("../drizzle/schema-stripe-payouts").InsertStripeCreatorPayout>,
): Promise<void> {
  const database = await getStripePayoutDb();
  // A transfer's amount, destination, metadata, and currency are immutable once
  // its first attempt begins. A retry must replay exactly the same request.
  await database.update(schema.stripeCreatorPayouts).set(values)
    .where(and(eq(schema.stripeCreatorPayouts.id, payoutId), sql`${schema.stripeCreatorPayouts.firstAttemptAt} IS NULL`));
}

export async function claimStripeCreatorPayout(
  chargeId: string,
  leaseToken: string,
  now = new Date(),
): Promise<import("../drizzle/schema-stripe-payouts").StripeCreatorPayout | null> {
  const database = await getStripePayoutDb();
  return database.transaction(async (tx) => {
    const [payout] = await tx.select().from(schema.stripeCreatorPayouts)
      .where(eq(schema.stripeCreatorPayouts.stripeChargeId, chargeId)).for("update");
    if (!payout) throw new Error("Stripe payout is not persisted");
    if (["transferred", "no_payout", "review_required", "reversed"].includes(payout.status)) return null;
    if (payout.status === "pending_fee" || payout.status === "blocked_account") return null;
    if (payout.leaseExpiresAt && payout.leaseExpiresAt > now) return null;
    if (!payout.stripeConnectAccountId || payout.creatorPayoutInCents === null || payout.creatorPayoutInCents <= 0) {
      throw new Error("Stripe payout has no verified transfer calculation or destination");
    }
    const leaseExpiresAt = new Date(now.getTime() + 5 * 60 * 1000);
    await tx.update(schema.stripeCreatorPayouts).set({
      status: "processing", leaseToken, leaseExpiresAt,
      firstAttemptAt: payout.firstAttemptAt ?? now, lastError: null,
    }).where(eq(schema.stripeCreatorPayouts.id, payout.id));
    return { ...payout, status: "processing", leaseToken, leaseExpiresAt, firstAttemptAt: payout.firstAttemptAt ?? now };
  });
}

export async function finishStripeCreatorPayout(
  payoutId: number,
  leaseToken: string,
  result: { status: "transferred"; transferId: string } | { status: "failed" | "review_required"; error: string },
): Promise<void> {
  const database = await getStripePayoutDb();
  await database.transaction(async (tx) => {
    const [payout] = await tx.select().from(schema.stripeCreatorPayouts)
      .where(eq(schema.stripeCreatorPayouts.id, payoutId)).for("update");
    if (!payout || payout.leaseToken !== leaseToken) throw new Error("Stripe payout lease changed; reconcile before retrying");
    if (result.status === "transferred" && payout.currency === "usd" && payout.revenueRecordedAt && payout.creatorPayoutInCents !== null && !payout.stripeTransferId) {
      await tx.update(schema.creatorBalances).set({
        pendingBalanceInCents: sql`${schema.creatorBalances.pendingBalanceInCents} - ${payout.creatorPayoutInCents}`,
        lastPayoutAt: new Date(),
      }).where(eq(schema.creatorBalances.creatorId, payout.creatorId));
    }
    const reviewed = payout.status === "review_required";
    await tx.update(schema.stripeCreatorPayouts).set({
      status: reviewed ? "review_required" : result.status,
      stripeTransferId: result.status === "transferred" ? result.transferId : payout.stripeTransferId,
      transferredAt: result.status === "transferred" ? new Date() : payout.transferredAt,
      lastError: reviewed ? payout.lastError : result.status === "transferred" ? null : result.error,
      leaseToken: null, leaseExpiresAt: null,
    }).where(eq(schema.stripeCreatorPayouts.id, payoutId));
  });
}

/** Stripe revenue is never made available to the separate manual payout rails. */
export async function recordStripeCreatorRevenue(chargeId: string): Promise<void> {
  const database = await getStripePayoutDb();
  await database.transaction(async (tx) => {
    const [payout] = await tx.select().from(schema.stripeCreatorPayouts)
      .where(eq(schema.stripeCreatorPayouts.stripeChargeId, chargeId)).for("update");
    if (!payout || payout.creatorPayoutInCents === null || payout.platformRevenueInCents === null || payout.stripeFeeInCents === null) {
      throw new Error("Stripe processing fees are not yet available");
    }
    if (payout.revenueRecordedAt) return;
    // Legacy aggregate balances/transactions have no currency column and are
    // USD-only. Other currencies remain fully accounted in the canonical payout
    // ledger; never sum EUR/JPY minor units into a USD withdrawal balance.
    if (payout.currency === "usd") {
      const amount = payout.creatorPayoutInCents;
      const pending = payout.status === "transferred" ? 0 : amount;
      await tx.insert(schema.creatorBalances).values({
        creatorId: payout.creatorId, availableBalanceInCents: 0,
        pendingBalanceInCents: pending, lifetimeEarningsInCents: amount,
      }).onDuplicateKeyUpdate({ set: {
        pendingBalanceInCents: sql`${schema.creatorBalances.pendingBalanceInCents} + ${pending}`,
        lifetimeEarningsInCents: sql`${schema.creatorBalances.lifetimeEarningsInCents} + ${amount}`,
      } });
      const fanId = Number(payout.sourceMetadata.fanId || payout.sourceMetadata.viewerId || payout.sourceMetadata.buyerId);
      if (Number.isSafeInteger(fanId) && fanId > 0) {
        await tx.insert(schema.transactions).values({
          fanId, creatorId: payout.creatorId,
          amountInCents: payout.grossAmountInCents,
          creatorShareInCents: amount, platformShareInCents: payout.platformRevenueInCents,
          stripeFeeInCents: payout.stripeFeeInCents, stripeCreatorPayoutId: payout.id,
          stripePaymentIntentId: payout.stripePaymentIntentId, status: "completed",
        });
      }
    }
    await tx.update(schema.stripeCreatorPayouts).set({ revenueRecordedAt: new Date() })
      .where(eq(schema.stripeCreatorPayouts.id, payout.id));
  });
}

export async function saveCreatorStripeConnectAccount(creatorId: number, accountId: string): Promise<void> {
  if (!/^acct_[a-zA-Z0-9]+$/.test(accountId)) throw new Error("Invalid Stripe Connect account ID");
  const database = await getStripePayoutDb();
  await database.transaction(async (tx) => {
    const [creator] = await tx.select({ accountId: schema.users.stripeConnectAccountId }).from(schema.users)
      .where(eq(schema.users.id, creatorId)).for("update");
    if (!creator) throw new Error("Creator account not found");
    if (creator.accountId && creator.accountId !== accountId) throw new Error("Creator already has a different Stripe Connect account");
    await tx.update(schema.users).set({ stripeConnectAccountId: accountId }).where(eq(schema.users.id, creatorId));
  });
}

export async function getStripePayoutSqlClient(): Promise<import("mysql2/promise").Pool> {
  const database = await getDb() as unknown as { $client: import("mysql2").Pool };
  return database.$client.promise();
}

// ============ PERSONA VAULT / CHAINED CONTINUITY ============
export type PersonaVaultDatabase = import("drizzle-orm/mysql2").MySql2Database<typeof schema>;
export type PersonaVaultTransaction = Parameters<Parameters<PersonaVaultDatabase["transaction"]>[0]>[0];
export async function getPersonaVaultDb(): Promise<PersonaVaultDatabase> {
  return await getDb() as unknown as PersonaVaultDatabase;
}
export async function getPersonaVaultSqlClient(): Promise<import("mysql2/promise").Pool> {
  const database = await getDb() as unknown as { $client: import("mysql2").Pool };
  return database.$client.promise();
}
