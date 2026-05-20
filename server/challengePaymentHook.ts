/**
 * EMPIRE CHALLENGE PAYMENT HOOK
 *
 * Money-truth rule: challenge revenue is credited only from live-mode,
 * provider-confirmed payment evidence. Agent telemetry, manual notes,
 * checkout starts, projections, and test payments are not real revenue.
 */

import { sql } from "drizzle-orm";
import * as db from "./db";

export type ChallengePaymentMode = "live" | "test" | "unknown";

export type ChallengePaymentProof = {
  mode: ChallengePaymentMode;
  provider: "stripe" | "telegram" | "marketplace" | "vaultlive" | "manual" | string;
  proofId: string;
  paymentObjectId: string;
  customerRef: string;
  productRef: string;
  channel: string;
  eventType?: string;
};

export type ChallengeCreditResult = {
  credited: boolean;
  reason?: string;
  challengeId?: number | string;
  amountDollars?: number;
  proofId?: string;
};

function extractRows(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result) && result.length >= 1 && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result;
  return [];
}

function missingProofFields(proof?: Partial<ChallengePaymentProof>): string[] {
  const missing: string[] = [];
  if (!proof) return ["proof"];
  if (proof.mode !== "live") missing.push("live_mode");
  if (!proof.provider) missing.push("provider");
  if (!proof.proofId) missing.push("proof_id");
  if (!proof.paymentObjectId) missing.push("payment_object_id");
  if (!proof.customerRef) missing.push("customer_ref");
  if (!proof.productRef) missing.push("product_ref");
  if (!proof.channel) missing.push("channel");
  return missing;
}

function buildRecordedDescription(description: string, proof: ChallengePaymentProof): string {
  const proofSummary = [
    `proof:${proof.proofId}`,
    `mode:${proof.mode}`,
    `provider:${proof.provider}`,
    `object:${proof.paymentObjectId}`,
    `customer:${proof.customerRef}`,
    `product:${proof.productRef}`,
    `channel:${proof.channel}`,
    proof.eventType ? `event:${proof.eventType}` : null,
  ].filter(Boolean).join(" | ");

  return `${description} | MONEY_TRUTH ${proofSummary}`.slice(0, 500);
}

/**
 * Credit a confirmed live payment amount to the active Empire Challenge.
 * Calls without a complete live proof packet are intentionally refused.
 */
export async function creditChallengePayment(
  amountDollars: number,
  source: string,
  description: string,
  proof?: ChallengePaymentProof,
): Promise<ChallengeCreditResult> {
  if (!amountDollars || amountDollars <= 0) return { credited: false, reason: "non_positive_amount" };

  const missing = missingProofFields(proof);
  if (missing.length > 0) {
    console.warn("[ChallengeHook] Refused challenge credit without live payment proof", {
      source,
      amountDollars,
      missing,
      mode: proof?.mode ?? "unknown",
      proofId: proof?.proofId,
    });
    return { credited: false, reason: `missing_live_payment_proof:${missing.join(",")}` };
  }

  const liveProof = proof as ChallengePaymentProof;

  try {
    const result = await db.db.execute(sql`
      SELECT id, current_revenue, target_revenue FROM empire_challenges WHERE status = 'active' LIMIT 1
    `);
    const rows = extractRows(result);
    if (!rows[0]) return { credited: false, reason: "no_active_challenge", proofId: liveProof.proofId };

    const challenge = rows[0];
    const descriptionWithProof = buildRecordedDescription(description, liveProof);

    const duplicateResult = await db.db.execute(sql`
      SELECT id FROM empire_challenge_transactions
      WHERE challenge_id = ${challenge.id}
        AND source = ${source}
        AND description LIKE ${`%proof:${liveProof.proofId}%`}
      LIMIT 1
    `);
    const duplicateRows = extractRows(duplicateResult);
    if (duplicateRows[0]) {
      return {
        credited: false,
        reason: "duplicate_payment_proof",
        challengeId: challenge.id,
        amountDollars,
        proofId: liveProof.proofId,
      };
    }

    const newRevenue = parseFloat(challenge.current_revenue || 0) + amountDollars;
    const isNowMet = newRevenue >= parseFloat(challenge.target_revenue || 5000);

    await db.db.execute(sql`
      INSERT INTO empire_challenge_transactions (challenge_id, amount, source, description, recorded_at)
      VALUES (${challenge.id}, ${amountDollars}, ${source}, ${descriptionWithProof}, NOW())
    `);

    await db.db.execute(sql`
      UPDATE empire_challenges
      SET
        current_revenue = current_revenue + ${amountDollars},
        status = CASE WHEN current_revenue + ${amountDollars} >= target_revenue THEN 'met' ELSE status END,
        timestamp_met = CASE WHEN current_revenue + ${amountDollars} >= target_revenue AND timestamp_met IS NULL THEN NOW() ELSE timestamp_met END
      WHERE id = ${challenge.id}
    `);

    console.log(`[ChallengeHook] Credited live payment +$${amountDollars.toFixed(2)} from ${source} proof=${liveProof.proofId} → Challenge ${challenge.id} (${newRevenue.toFixed(2)}/${challenge.target_revenue}${isNowMet ? " MET" : ""})`);
    return { credited: true, challengeId: challenge.id, amountDollars, proofId: liveProof.proofId };
  } catch (err) {
    console.error("[ChallengeHook] Failed to credit challenge:", err);
    return { credited: false, reason: err instanceof Error ? err.message : String(err), proofId: liveProof.proofId };
  }
}

/**
 * Credit cents to the challenge after the same live-proof gate.
 */
export async function creditChallengePaymentCents(
  amountCents: number,
  source: string,
  description: string,
  proof?: ChallengePaymentProof,
): Promise<ChallengeCreditResult> {
  return creditChallengePayment(amountCents / 100, source, description, proof);
}
