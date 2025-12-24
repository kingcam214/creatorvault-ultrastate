/**
 * Subscription management for adult creators
 * Handles tier creation, fan subscriptions, revenue splits
 */

import { db } from "../db";
import { subscriptionTiers, subscriptions, creatorBalances, transactions } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export interface SubscriptionTier {
  id: number;
  creatorId: number;
  name: string;
  priceInCents: number;
  billingInterval: "monthly" | "yearly";
  description?: string;
  isActive: boolean;
}

export interface CreateTierInput {
  creatorId: number;
  name: string;
  priceInCents: number;
  billingInterval?: "monthly" | "yearly";
  description?: string;
}

export interface SubscribeInput {
  fanId: number;
  tierId: number;
  stripeSubscriptionId?: string;
}

/**
 * Create subscription tier
 */
export async function createSubscriptionTier(input: CreateTierInput): Promise<SubscriptionTier> {
  const result = await db.insert(subscriptionTiers).values({
    creatorId: input.creatorId,
    name: input.name,
    priceInCents: input.priceInCents,
    billingInterval: input.billingInterval || "monthly",
    description: input.description,
    isActive: true,
  });

  const tierId = Number((result as any).insertId);
  const [tier] = await db.select().from(subscriptionTiers).where(eq(subscriptionTiers.id, tierId));
  return tier as SubscriptionTier;
}

/**
 * Get creator's subscription tiers
 */
export async function getCreatorTiers(creatorId: number): Promise<SubscriptionTier[]> {
  const tiers = await db
    .select()
    .from(subscriptionTiers)
    .where(eq(subscriptionTiers.creatorId, creatorId));

  return tiers as SubscriptionTier[];
}

/**
 * Subscribe fan to tier
 */
export async function subscribeFanToTier(input: SubscribeInput): Promise<{ success: boolean; subscriptionId: number }> {
  // Get tier details
  const [tier] = await db
    .select()
    .from(subscriptionTiers)
    .where(eq(subscriptionTiers.id, input.tierId));

  if (!tier) {
    throw new Error("Tier not found");
  }

  // Create subscription
  const result = await db.insert(subscriptions).values({
    fanId: input.fanId,
    creatorId: tier.creatorId,
    tierId: input.tierId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    status: "active",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  const subscriptionId = Number((result as any).insertId);
  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId));

  return {
    success: true,
    subscriptionId,
  };
}

/**
 * Process subscription payment and update balances
 */
export async function processSubscriptionPayment(
  subscriptionId: number,
  amountInCents: number,
  stripePaymentIntentId?: string
): Promise<{ success: boolean; transactionId: number }> {
  // Get subscription details
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId));

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  // Calculate 70/30 split
  const creatorShare = Math.floor(amountInCents * 0.7);
  const platformShare = amountInCents - creatorShare;

  // Create transaction record
  const txResult = await db.insert(transactions).values({
    subscriptionId,
    fanId: subscription.fanId,
    creatorId: subscription.creatorId,
    amountInCents,
    creatorShareInCents: creatorShare,
    platformShareInCents: platformShare,
    stripePaymentIntentId,
    status: "completed",
  });

  const transactionId = Number((txResult as any).insertId);

  // Update creator balance
  const [existingBalance] = await db
    .select()
    .from(creatorBalances)
    .where(eq(creatorBalances.creatorId, subscription.creatorId));

  if (existingBalance) {
    await db
      .update(creatorBalances)
      .set({
        availableBalanceInCents: existingBalance.availableBalanceInCents + creatorShare,
        lifetimeEarningsInCents: existingBalance.lifetimeEarningsInCents + creatorShare,
        updatedAt: new Date(),
      })
      .where(eq(creatorBalances.creatorId, subscription.creatorId));
  } else {
    await db.insert(creatorBalances).values({
      creatorId: subscription.creatorId,
      availableBalanceInCents: creatorShare,
      pendingBalanceInCents: 0,
      lifetimeEarningsInCents: creatorShare,
    });
  }

  return {
    success: true,
    transactionId,
  };
}

/**
 * Get creator balance
 */
export async function getCreatorBalance(creatorId: number) {
  const [balance] = await db
    .select()
    .from(creatorBalances)
    .where(eq(creatorBalances.creatorId, creatorId));

  return balance || {
    availableBalanceInCents: 0,
    pendingBalanceInCents: 0,
    lifetimeEarningsInCents: 0,
  };
}
