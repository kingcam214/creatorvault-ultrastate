import { boolean, customType, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import { users } from "./schema";

function persistedJson<T>(name: string) {
  return customType<{ data: T; driverData: T | string }>({
    dataType: () => "json",
    toDriver: (value) => JSON.stringify(value),
    fromDriver: (value) => typeof value === "string" ? JSON.parse(value) as T : value,
  })(name);
}

export interface StripeProcessingFeeDetail {
  amount: number;
  currency: string;
  type: string;
  description: string | null;
}

export const stripeCreatorPayoutPolicy = mysqlTable("stripe_creator_payout_policy", {
  rule: varchar("rule", { length: 64 }).primaryKey(),
  enabled: boolean("enabled").default(true).notNull(),
  effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
});

/** All monetary values are integer minor units in currency, never floating-point dollars. */
export const stripeCreatorPayouts = mysqlTable("stripe_creator_payouts", {
  id: int("id").autoincrement().primaryKey(),
  creatorId: int("creator_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  stripeChargeId: varchar("stripe_charge_id", { length: 255 }).notNull().unique(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }),
  stripeEventId: varchar("stripe_event_id", { length: 255 }).notNull(),
  stripeBalanceTransactionId: varchar("stripe_balance_transaction_id", { length: 255 }),
  stripeConnectAccountId: varchar("stripe_connect_account_id", { length: 255 }),
  stripeTransferId: varchar("stripe_transfer_id", { length: 255 }).unique(),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull().unique(),
  transferGroup: varchar("transfer_group", { length: 255 }).notNull().unique(),
  grossAmountInCents: int("gross_amount_in_cents").notNull(),
  stripeFeeInCents: int("stripe_fee_in_cents"),
  netAmountInCents: int("net_amount_in_cents"),
  creatorPayoutInCents: int("creator_payout_in_cents"),
  platformRevenueInCents: int("platform_revenue_in_cents"),
  currency: varchar("currency", { length: 3 }).notNull(),
  feeDetails: persistedJson<StripeProcessingFeeDetail[]>("fee_details"),
  sourceMetadata: persistedJson<Record<string, string>>("source_metadata").notNull(),
  status: mysqlEnum("status", [
    "pending_fee", "blocked_account", "ready", "processing", "transferred",
    "failed", "no_payout", "review_required", "reversed",
  ]).default("pending_fee").notNull(),
  lastError: text("last_error"),
  firstAttemptAt: timestamp("first_attempt_at", { fsp: 3 }),
  leaseExpiresAt: timestamp("lease_expires_at", { fsp: 3 }),
  leaseToken: varchar("lease_token", { length: 36 }),
  revenueRecordedAt: timestamp("revenue_recorded_at", { fsp: 3 }),
  transferredAt: timestamp("transferred_at", { fsp: 3 }),
  createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { fsp: 3 }).defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  creatorStatusIdx: index("idx_stripe_payout_creator_status").on(table.creatorId, table.status),
  paymentIntentIdx: index("idx_stripe_payout_payment_intent").on(table.stripePaymentIntentId),
  retryIdx: index("idx_stripe_payout_retry").on(table.status, table.leaseExpiresAt),
}));

export type StripeCreatorPayout = typeof stripeCreatorPayouts.$inferSelect;
export type InsertStripeCreatorPayout = typeof stripeCreatorPayouts.$inferInsert;
