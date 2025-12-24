/**
 * Payout Service
 * 
 * Handles creator payout requests and balance management
 */

import { db } from "../db";
import { payoutRequests, creatorBalances } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Request a payout
 */
export async function requestPayout(
  creatorId: number,
  amountInCents: number,
  paymentMethod: string,
  paymentDetails: string
) {
  // Check creator balance
  const [balance] = await db
    .select()
    .from(creatorBalances)
    .where(eq(creatorBalances.creatorId, creatorId));

  if (!balance) {
    throw new Error("Creator balance not found");
  }

  if (balance.availableBalanceInCents < amountInCents) {
    throw new Error(`Insufficient balance. Available: $${(balance.availableBalanceInCents / 100).toFixed(2)}, Requested: $${(amountInCents / 100).toFixed(2)}`);
  }

  // Create payout request
  const result = await db.insert(payoutRequests).values({
    creatorId,
    amountInCents,
    status: "pending",
    paymentMethod,
    paymentDetails,
  });

  // Move from available to pending
  await db
    .update(creatorBalances)
    .set({
      availableBalanceInCents: balance.availableBalanceInCents - amountInCents,
      pendingBalanceInCents: balance.pendingBalanceInCents + amountInCents,
    })
    .where(eq(creatorBalances.creatorId, creatorId));

  return {
    payoutId: Number((result as any).insertId),
    amountInCents,
    status: "pending" as const,
  };
}

/**
 * Get creator's payout requests
 */
export async function getPayoutRequests(creatorId: number) {
  return await db
    .select()
    .from(payoutRequests)
    .where(eq(payoutRequests.creatorId, creatorId))
    .orderBy(payoutRequests.requestedAt);
}

/**
 * Get creator balance
 */
export async function getCreatorBalance(creatorId: number) {
  const [balance] = await db
    .select()
    .from(creatorBalances)
    .where(eq(creatorBalances.creatorId, creatorId));

  if (!balance) {
    // Create initial balance if doesn't exist
    await db.insert(creatorBalances).values({
      creatorId,
      availableBalanceInCents: 0,
      pendingBalanceInCents: 0,
      lifetimeEarningsInCents: 0,
    });

    return {
      availableBalanceInCents: 0,
      pendingBalanceInCents: 0,
      lifetimeEarningsInCents: 0,
    };
  }

  return balance;
}
