/**
 * 🏆 EMPIRE CHALLENGE PAYMENT HOOK
 * 
 * Universal payment interceptor — every dollar that comes in from ANY source
 * automatically credits the active Empire Challenge balance.
 * 
 * Sources wired:
 * - Stripe: checkout.session.completed, payment_intent.succeeded, invoice.paid
 * - Telegram Stars / bot_payments
 * - Marketplace orders
 * - Tips / donations
 * - VaultLive tips
 * - Manual payments
 * - Any future payment source
 */

import { sql } from "drizzle-orm";
import * as db from "./db";

function extractRows(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result) && result.length >= 1 && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result;
  return [];
}

/**
 * Credit a payment amount to the active Empire Challenge.
 * Call this from ANY payment handler when a payment is confirmed.
 * 
 * @param amountDollars - Amount in dollars (not cents)
 * @param source - Payment source identifier (e.g. "stripe_subscription", "telegram_stars", "marketplace")
 * @param description - Human-readable description of the payment
 */
export async function creditChallengePayment(
  amountDollars: number,
  source: string,
  description: string
): Promise<void> {
  if (!amountDollars || amountDollars <= 0) return;

  try {
    const result = await db.db.execute(sql`
      SELECT id, current_revenue, target_revenue FROM empire_challenges WHERE status = 'active' LIMIT 1
    `);
    const rows = extractRows(result);
    if (!rows[0]) return;

    const challenge = rows[0];
    const newRevenue = parseFloat(challenge.current_revenue || 0) + amountDollars;
    const isNowMet = newRevenue >= parseFloat(challenge.target_revenue || 5000);

    // Insert transaction
    await db.db.execute(sql`
      INSERT INTO empire_challenge_transactions (challenge_id, amount, source, description, recorded_at)
      VALUES (${challenge.id}, ${amountDollars}, ${source}, ${description.slice(0, 500)}, NOW())
    `);

    // Update challenge balance
    await db.db.execute(sql`
      UPDATE empire_challenges 
      SET 
        current_revenue = current_revenue + ${amountDollars},
        status = CASE WHEN current_revenue + ${amountDollars} >= target_revenue THEN 'met' ELSE status END,
        timestamp_met = CASE WHEN current_revenue + ${amountDollars} >= target_revenue AND timestamp_met IS NULL THEN NOW() ELSE timestamp_met END
      WHERE id = ${challenge.id}
    `);

    console.log(`[ChallengeHook] +$${amountDollars.toFixed(2)} from ${source} → Challenge ${challenge.id} (${newRevenue.toFixed(2)}/${challenge.target_revenue}${isNowMet ? ' ✅ MET!' : ''})`);
  } catch (err) {
    // Never block payment processing — log and continue
    console.error("[ChallengeHook] Failed to credit challenge:", err);
  }
}

/**
 * Credit cents to the challenge (converts to dollars)
 */
export async function creditChallengePaymentCents(
  amountCents: number,
  source: string,
  description: string
): Promise<void> {
  await creditChallengePayment(amountCents / 100, source, description);
}
