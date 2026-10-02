import { eq, sql } from "drizzle-orm";
import type { ResultSetHeader } from "mysql2";
import { stripeCreatorPayouts } from "../../drizzle/schema-stripe-payouts";
import { getStripePayoutDb, type StripePayoutTransaction } from "../db";
import { positiveMetadataId } from "./stripeCreatorPayoutEvents";

export interface StripePpvPurchaseInput {
  fanUserId: number;
  contentId: number;
  paymentIntentId: string;
}
export interface StripePpvPurchaseResult {
  purchaseId?: number;
  success: boolean;
  alreadyPurchased?: boolean;
  paymentIntentId?: string;
}
interface PpvContentRow {
  id: number;
  creator_id: number;
  creator_user_id: number;
  ppv_price: string;
}
interface PpvPurchaseRow { id: number; fan_id: number; content_id: number; stripe_payment_intent_id: string | null }

async function queryRows<T extends object>(tx: StripePayoutTransaction, query: ReturnType<typeof sql>): Promise<T[]> {
  const [result] = await tx.execute(query);
  const rows: unknown = result;
  if (!Array.isArray(rows)) throw new Error("PPV query returned no row set");
  return rows as T[];
}

/** Client confirmation can read a signed-webhook receipt; it cannot authorize a transfer. */
export async function completeStripeVaultxPpvPurchase(input: StripePpvPurchaseInput): Promise<StripePpvPurchaseResult> {
  if (!Number.isSafeInteger(input.fanUserId) || input.fanUserId <= 0 || !Number.isSafeInteger(input.contentId) || input.contentId <= 0) throw new Error("Invalid VaultX PPV purchase identity");
  const database = await getStripePayoutDb();
  return database.transaction(async (tx) => {
    const contentRows = await queryRows<PpvContentRow>(tx, sql`
      SELECT c.id, c.creator_id, vc.user_id AS creator_user_id, c.ppv_price
      FROM vaultx_content c JOIN vaultx_creators vc ON vc.id = c.creator_id
      WHERE c.id = ${input.contentId} AND c.is_ppv = 1 LIMIT 1 FOR UPDATE`);
    const content = contentRows[0];
    if (!content) throw new Error("VaultX PPV content/creator mapping not found");
    const existing = await queryRows<PpvPurchaseRow>(tx, sql`
      SELECT id, fan_id, content_id, stripe_payment_intent_id FROM vaultx_ppv_purchases
      WHERE fan_id = ${input.fanUserId} AND content_id = ${input.contentId} AND status = 'completed' LIMIT 1`);
    if (existing[0]) return { success: true, alreadyPurchased: true, purchaseId: Number(existing[0].id) };
    const payouts = await tx.select().from(stripeCreatorPayouts)
      .where(eq(stripeCreatorPayouts.stripePaymentIntentId, input.paymentIntentId));
    const payout = payouts[0];
    if (payouts.length !== 1 || !payout || payout.creatorPayoutInCents === null || payout.platformRevenueInCents === null ||
      payout.creatorId !== Number(content.creator_user_id) || payout.currency !== "usd" ||
      ["pending_fee", "review_required", "reversed"].includes(payout.status)) {
      throw new Error("VaultX payment is awaiting a verified, fee-aware signed webhook receipt");
    }
    if (payout.sourceMetadata.type !== "vaultx_ppv" ||
      positiveMetadataId(payout.sourceMetadata.vaultxContentId || payout.sourceMetadata.contentId) !== input.contentId ||
      positiveMetadataId(payout.sourceMetadata.fanId || payout.sourceMetadata.userId) !== input.fanUserId) {
      throw new Error("VaultX payment belongs to a different buyer or content source");
    }
    const expected = Math.round(Number(content.ppv_price) * 100);
    if (payout.grossAmountInCents !== expected) throw new Error("VaultX captured charge differs from the unlock price");
    const duplicate = await queryRows<PpvPurchaseRow>(tx, sql`
      SELECT id, fan_id, content_id, stripe_payment_intent_id FROM vaultx_ppv_purchases
      WHERE stripe_payment_intent_id = ${input.paymentIntentId} AND status = 'completed' LIMIT 1`);
    if (duplicate[0]) throw new Error("Stripe payment is already allocated to another VaultX purchase");
    const [result] = await tx.execute(sql`
      INSERT INTO vaultx_ppv_purchases
      (fan_id, creator_id, content_id, amount_paid, stripe_payment_intent_id, status, platform_fee_cents, creator_revenue_cents)
      VALUES (${input.fanUserId}, ${content.creator_id}, ${input.contentId}, ${content.ppv_price}, ${input.paymentIntentId},
      'completed', ${payout.platformRevenueInCents}, ${payout.creatorPayoutInCents})`);
    const header = result as unknown as ResultSetHeader;
    if (!Number.isSafeInteger(header.insertId) || header.insertId <= 0) throw new Error("VaultX PPV purchase was not persisted");
    await tx.execute(sql`UPDATE vaultx_content SET purchase_count = purchase_count + 1,
      revenue_generated = revenue_generated + ${content.ppv_price} WHERE id = ${input.contentId}`);
    await tx.execute(sql`UPDATE vaultx_creators SET total_revenue = total_revenue + ${payout.creatorPayoutInCents / 100}
      WHERE id = ${content.creator_id}`);
    // Canonical transactions and balances were recorded once by the payout
    // engine, using users.id. Do not duplicate them or credit manual availability.
    return { success: true, purchaseId: header.insertId, paymentIntentId: input.paymentIntentId };
  });
}
