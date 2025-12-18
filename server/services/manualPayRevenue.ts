/**
 * Manual-Pay Revenue Flow
 * 
 * NO STRIPE DEPENDENCY: Track revenue without payment processor.
 * Manual payment methods: CashApp, Zelle, Apple Pay, Manual Invoice.
 * Auto-generate order records + commission splits.
 */

import { db } from "../db";
import { marketplaceOrders, marketplaceProducts, universityEnrollments, servicesSales } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

export interface ManualPaymentRequest {
  userId: number;
  productType: "marketplace" | "university" | "services";
  productId: string;
  amount: number;
  paymentMethod: "cashapp" | "zelle" | "applepay" | "manual_invoice";
  notes?: string;
}

export interface CommissionSplit {
  creatorAmount: number; // 70%
  recruiterAmount: number; // 20%
  platformAmount: number; // 10%
}

/**
 * Calculate commission splits
 */
export function calculateCommissionSplits(amount: number): CommissionSplit {
  return {
    creatorAmount: Math.round(amount * 0.70 * 100) / 100,
    recruiterAmount: Math.round(amount * 0.20 * 100) / 100,
    platformAmount: Math.round(amount * 0.10 * 100) / 100,
  };
}

/**
 * Generate manual payment order
 */
export async function createManualPaymentOrder(request: ManualPaymentRequest) {
  try {
    const commissions = calculateCommissionSplits(request.amount);

    // Create order record
    const orderId = crypto.randomUUID();
    const amountInCents = Math.round(request.amount * 100);
    await db.insert(marketplaceOrders).values({
      buyerId: request.userId,
      productId: request.productId,
      quantity: 1,
      grossAmount: amountInCents,
      currency: "USD",
      creatorAmount: Math.round(amountInCents * 0.70),
      recruiterAmount: Math.round(amountInCents * 0.20),
      platformAmount: Math.round(amountInCents * 0.10),
      paymentProvider: request.paymentMethod,
      status: "pending",
    });

    // Log commission splits (for tracking, not actual payment)
    console.log("[Manual Pay] Order created:", {
      orderId,
      amount: request.amount,
      method: request.paymentMethod,
      commissions,
    });

    return {
      orderId,
      amount: request.amount,
      paymentMethod: request.paymentMethod,
      commissions,
      paymentInstructions: getPaymentInstructions(request.paymentMethod, request.amount),
    };
  } catch (error) {
    console.error("[Manual Pay] Error creating order:", error);
    throw error;
  }
}

/**
 * Get payment instructions for manual methods
 */
function getPaymentInstructions(method: string, amount: number): string {
  const formattedAmount = `$${amount.toFixed(2)}`;
  
  switch (method) {
    case "cashapp":
      return `Send ${formattedAmount} to $CreatorVault on Cash App. Include your order ID in the note.`;
    case "zelle":
      return `Send ${formattedAmount} to payments@creatorvault.com via Zelle. Include your order ID in the note.`;
    case "applepay":
      return `Send ${formattedAmount} via Apple Pay to payments@creatorvault.com. Include your order ID in the message.`;
    case "manual_invoice":
      return `An invoice for ${formattedAmount} will be sent to your email. Payment due within 7 days.`;
    default:
      return `Payment of ${formattedAmount} required. Contact support for instructions.`;
  }
}

/**
 * Confirm manual payment (owner action)
 */
export async function confirmManualPayment(orderId: string) {
  try {
    // Update order status
    await db
      .update(marketplaceOrders)
      .set({
        status: "paid",
      })
      .where(eq(marketplaceOrders.id, orderId));

    console.log("[Manual Pay] Payment confirmed:", orderId);

    return {
      success: true,
      orderId,
      message: "Payment confirmed. Order is now complete.",
    };
  } catch (error) {
    console.error("[Manual Pay] Error confirming payment:", error);
    throw error;
  }
}

/**
 * Get pending manual payments (for owner review)
 */
export async function getPendingManualPayments() {
  try {
    const pendingOrders = await db
      .select()
      .from(marketplaceOrders)
      .where(eq(marketplaceOrders.status, "pending"))
      .orderBy(desc(marketplaceOrders.createdAt))
      .limit(100);

    return pendingOrders.map(order => ({
      orderId: order.id,
      userId: order.buyerId,
      amount: order.grossAmount / 100,
      paymentMethod: order.paymentProvider,
      createdAt: order.createdAt,
      commissions: {
        creatorAmount: order.creatorAmount / 100,
        recruiterAmount: order.recruiterAmount / 100,
        platformAmount: order.platformAmount / 100,
      },
    }));
  } catch (error) {
    console.error("[Manual Pay] Error fetching pending payments:", error);
    throw error;
  }
}

/**
 * Generate revenue summary (no Stripe dependency)
 */
export async function getRevenueSummary() {
  try {
    const allOrders = await db
      .select()
      .from(marketplaceOrders);

    const totalRevenue = allOrders.reduce((sum, order) => sum + order.grossAmount, 0) / 100;
    const paidRevenue = allOrders
      .filter(order => order.status === "paid" || order.status === "fulfilled")
      .reduce((sum, order) => sum + order.grossAmount, 0) / 100;
    const pendingRevenue = allOrders
      .filter(order => order.status === "pending")
      .reduce((sum, order) => sum + order.grossAmount, 0) / 100;

    const commissions = calculateCommissionSplits(paidRevenue);

    return {
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      orderCount: allOrders.length,
      paidOrderCount: allOrders.filter(o => o.status === "paid" || o.status === "fulfilled").length,
      pendingOrderCount: allOrders.filter(o => o.status === "pending").length,
      commissions,
    };
  } catch (error) {
    console.error("[Manual Pay] Error generating revenue summary:", error);
    throw error;
  }
}
