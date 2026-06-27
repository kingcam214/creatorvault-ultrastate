/**
 * CHALLENGE REVENUE INTEGRITY CHECK
 *
 * Runs at server startup. Wipes any empire_challenge_transactions rows that
 * were NOT written by a verified live Stripe webhook (i.e. rows whose source
 * does not match the known Stripe webhook sources AND whose description does
 * not contain the MONEY_TRUTH proof stamp).
 *
 * Also resets empire_challenges.current_revenue to the real SUM of surviving rows.
 *
 * MONEY TRUTH RULE:
 *   Only rows with source IN (stripe_ai_agent_challenge_checkout,
 *   stripe_ai_agent_challenge_payment_intent,
 *   stripe_ai_agent_challenge_subscription_renewal,
 *   stripe_ai_agent_challenge_charge)
 *   AND description LIKE '%MONEY_TRUTH%'
 *   are considered real Stripe-webhook-proven revenue.
 *
 *   Everything else (vaultlive_tip, vaultlive_donation, manual_*, telegram_stars,
 *   presentation_package, checkout_bot, etc.) is NOT challenge revenue and gets
 *   deleted from the ledger.
 *
 * This is idempotent — once the DB is clean it becomes a no-op on every boot.
 */

import mysql from "mysql2/promise";

async function getRawDb() {
  const url =
    process.env.DATABASE_URL ||
    "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error("Invalid DATABASE_URL for challenge integrity check");
  const [, user, password, host, port, database] = m;
  return mysql.createConnection({ host, port: parseInt(port), user, password, database });
}

function extractRows(result: any): any[] {
  if (Array.isArray(result) && result.length >= 1 && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result;
  return [];
}

const STRIPE_SOURCES = [
  "stripe_ai_agent_challenge_checkout",
  "stripe_ai_agent_challenge_payment_intent",
  "stripe_ai_agent_challenge_subscription_renewal",
  "stripe_ai_agent_challenge_charge",
];

export async function runChallengeRevenueIntegrityCheck(): Promise<void> {
  const db = await getRawDb();
  try {
    // 1. Count rows before cleanup
    const beforeResult = await db.execute(
      "SELECT COUNT(*) as cnt, COALESCE(SUM(amount),0) as total FROM empire_challenge_transactions"
    );
    const beforeRow = extractRows(beforeResult)[0] ?? {};
    const beforeCount = Number(beforeRow.cnt ?? 0);
    const beforeTotal = Number(beforeRow.total ?? 0);

    if (beforeCount === 0) {
      console.log("[ChallengeIntegrity] Ledger is empty — nothing to clean. Counter is already $0.");
      return;
    }

    // 2. Delete rows that are NOT from a verified Stripe webhook source
    //    OR do not carry the MONEY_TRUTH proof stamp in the description.
    const sourcePlaceholders = STRIPE_SOURCES.map(() => "?").join(", ");
    const deleteResult = await db.execute(
      `DELETE FROM empire_challenge_transactions
       WHERE source NOT IN (${sourcePlaceholders})
          OR description NOT LIKE '%MONEY_TRUTH%'`,
      STRIPE_SOURCES
    );
    const deletedCount = (deleteResult[0] as any)?.affectedRows ?? 0;

    // 3. Recalculate the real verified sum from surviving rows
    const sumResult = await db.execute(
      "SELECT COALESCE(SUM(amount),0) as real_total, COUNT(*) as real_count FROM empire_challenge_transactions"
    );
    const sumRow = extractRows(sumResult)[0] ?? {};
    const realTotal = Number(sumRow.real_total ?? 0);
    const realCount = Number(sumRow.real_count ?? 0);

    // 4. Reset empire_challenges.current_revenue to the real verified sum
    await db.execute(
      "UPDATE empire_challenges SET current_revenue = ? WHERE status = 'active'",
      [realTotal]
    );

    console.log(
      `[ChallengeIntegrity] Cleanup complete.` +
      ` Before: ${beforeCount} rows / $${beforeTotal.toFixed(2)}.` +
      ` Deleted: ${deletedCount} non-Stripe rows.` +
      ` Surviving: ${realCount} verified Stripe rows / $${realTotal.toFixed(2)}.` +
      ` empire_challenges.current_revenue reset to $${realTotal.toFixed(2)}.`
    );
  } catch (err: any) {
    console.error("[ChallengeIntegrity] Error during integrity check:", err.message);
  } finally {
    db.end();
  }
}
