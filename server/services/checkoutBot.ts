/**
 * Cashflow Checkout Bot
 * 
 * Turn chats into purchases without friction.
 * Features:
 * - Send product/service/course catalog in chat
 * - Generate Stripe checkout session links
 * - Confirm purchase via webhook
 * - Deliver fulfillment instantly
 * - Record commissions (70% creator, 20% recruiter, 10% platform)
 * 
 * KINGCAM MANDATE: Must produce REAL transactions with REAL money.
 */

import { db } from "../db";
import { 
  marketplaceProducts, 
  marketplaceOrders,
  universityCourses,
  universityEnrollments,
  servicesOffers,
  servicesSales,
  commissionEvents,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { stripe } from "../_core/stripe";
import { qualityGate } from "./qualityGate";

export interface ProductCatalogItem {
  id: string;
  type: "product" | "course" | "service";
  title: string;
  description: string;
  price: number;
  currency: string;
  creatorId: number;
  recruiterId?: number;
}

/**
 * Generate product catalog for chat
 */
export async function generateCatalog(params: {
  type?: "product" | "course" | "service";
  creatorId?: number;
  limit?: number;
}): Promise<ProductCatalogItem[]> {
  const catalog: ProductCatalogItem[] = [];

  // Get products
  if (!params.type || params.type === "product") {
    const products = await db
      .select()
      .from(marketplaceProducts)
      .where(eq(marketplaceProducts.status, "active"))
      .limit(params.limit || 10);

    // @ts-ignore
    catalog.push(...products.map(p => ({
      id: p.id,
      type: "product" as const,
      title: p.title,
      description: p.description || "",
      price: p.priceAmount / 100,
      currency: p.currency,
      creatorId: p.creatorId,
      recruiterId: p.recruiterId || undefined,
    })));
  }

  // Get courses
  if (!params.type || params.type === "course") {
    const courses = await db
      .select()
      .from(universityCourses)
      .where(eq(universityCourses.status, "published"))
      .limit(params.limit || 10);

    // @ts-ignore
    catalog.push(...courses.map(c => ({
      id: c.id,
      type: "course" as const,
      title: c.title,
      description: c.description || "",
      price: c.priceAmount / 100,
      currency: c.currency,
      creatorId: c.creatorId,
    })));
  }

  // Get services
  if (!params.type || params.type === "service") {
    const services = await db
      .select()
      .from(servicesOffers)
      .where(eq(servicesOffers.status, "active"))
      .limit(params.limit || 10);

    // @ts-ignore
    catalog.push(...services.map(s => ({
      id: s.id,
      type: "service" as const,
      title: s.title,
      description: s.description || "",
      price: s.priceAmount / 100,
      currency: s.currency,
      creatorId: s.providerId,
    })));
  }

  return catalog;
}

/**
 * Format catalog for Telegram
 */
export function formatCatalogForTelegram(catalog: ProductCatalogItem[]): string {
  let message = "🛍️ *CreatorVault Marketplace*\n\n";
  
  catalog.forEach((item, index) => {
    const emoji = item.type === "product" ? "📦" : item.type === "course" ? "📚" : "⚡";
    message += `${emoji} *${item.title}*\n`;
    message += `${item.description.substring(0, 100)}...\n`;
    message += `💰 $${item.price} ${item.currency}\n`;
    message += `/buy_${item.id}\n\n`;
  });

  return message;
}

/**
 * Format catalog for WhatsApp
 */
export function formatCatalogForWhatsApp(catalog: ProductCatalogItem[]): string {
  const featured = catalog.slice(0, 3);
  const lines = featured.map((item, index) => {
    const shortDescription = item.description ? ` — ${item.description.replace(/\s+/g, " ").slice(0, 58)}` : "";
    return `${index + 1}. ${item.title}${shortDescription} — $${item.price}`;
  });
  const message = [
    "CreatorVault checkout path is live: turn this chat attention into a tracked purchase route.",
    ...lines,
    "Reply with the number you want and I’ll open the checkout link.",
  ].join("\n");

  return qualityGate.check(message, {
    surface: "whatsapp",
    context: "whatsapp",
    recipientKey: "catalog",
    hasActionElement: true,
    requireCreatorVaultPositioning: true,
    requireMessagingDna: true,
  });
}

/**
 * Create Stripe checkout session
 */
export async function createCheckoutSession(params: {
  itemId: string;
  itemType: "product" | "course" | "service";
  buyerId: number;
  successUrl: string;
  cancelUrl: string;
  trackingCode?: string;
  attributionSessionId?: string;
}): Promise<{ sessionId: string; url: string }> {
  // Get item details
  let item: ProductCatalogItem | null = null;

  if (params.itemType === "product") {
    const products = await db
      .select()
      .from(marketplaceProducts)
      .where(eq(marketplaceProducts.id, params.itemId))
      .limit(1);
    
    if (products.length > 0) {
      const p = products[0];
      item = {
        id: p.id,
        type: "product",
        title: p.title,
        description: p.description || "",
        price: p.priceAmount / 100,
        currency: p.currency,
        creatorId: p.creatorId,
        recruiterId: p.recruiterId || undefined,
      };
    }
  } else if (params.itemType === "course") {
    const courses = await db
      .select()
      .from(universityCourses)
      .where(eq(universityCourses.id, params.itemId))
      .limit(1);
    
    if (courses.length > 0) {
      const c = courses[0];
      item = {
        id: c.id,
        type: "course",
        title: c.title,
        description: c.description || "",
        price: c.priceAmount / 100,
        currency: c.currency,
        creatorId: c.creatorId,
      };
    }
  } else if (params.itemType === "service") {
    const services = await db
      .select()
      .from(servicesOffers)
      .where(eq(servicesOffers.id, params.itemId))
      .limit(1);
    
    if (services.length > 0) {
      const s = services[0];
      item = {
        id: s.id,
        type: "service",
        title: s.title,
        description: s.description || "",
        price: s.priceAmount / 100,
        currency: s.currency,
        creatorId: s.providerId,
      };
    }
  }

  if (!item) {
    throw new Error("Item not found");
  }

  // Create Stripe session
    // @ts-ignore
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: item.currency.toLowerCase(),
          product_data: {
            name: item.title,
            description: item.description,
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      itemId: item.id,
      itemType: item.type,
      buyerId: params.buyerId.toString(),
      creatorId: item.creatorId.toString(),
      recruiterId: item.recruiterId?.toString() || "",
      trackingCode: params.trackingCode || "",
      attributionSessionId: params.attributionSessionId || "",
    },
  });

  return {
    sessionId: session.id,
    url: session.url!,
  };
}

/**
 * Process successful payment and record commissions
 */
export async function processPayment(params: {
  sessionId: string;
  itemId: string;
  itemType: "product" | "course" | "service";
  buyerId: number;
  creatorId: number;
  recruiterId?: number;
  amount: number; // in cents
}) {
  // Calculate commission splits
  const creatorAmount = Math.round(params.amount * 0.70); // 70%
  const recruiterAmount = params.recruiterId ? Math.round(params.amount * 0.20) : 0; // 20%
  const platformAmount = params.amount - creatorAmount - recruiterAmount; // 10% or 30%

  // Credit Empire Challenge for every payment
  try {
    const { creditChallengePaymentCents } = await import("../challengePaymentHook");
    await creditChallengePaymentCents(
      params.amount,
      `checkout_${params.itemType}`,
      `${params.itemType} purchase — buyer ${params.buyerId}, creator ${params.creatorId}`
    );
  } catch { /* never block payment */ }

  // Create order/enrollment/sale based on type
  if (params.itemType === "product") {
    const orderId = crypto.randomUUID();
    
    await db.insert(marketplaceOrders).values({
      id: orderId,
      buyerId: params.buyerId,
      productId: params.itemId,
      quantity: 1,
      grossAmount: params.amount,
      currency: "USD",
      creatorAmount,
      recruiterAmount,
      platformAmount,
      stripeSessionId: params.sessionId,
      status: "paid",
    });

    // Record commission events
    await db.insert(commissionEvents).values([
      {
        refType: "order",
        refId: orderId,
        partyType: "creator",
        partyId: params.creatorId,
        amount: creatorAmount,
        currency: "USD",
      },
      ...(params.recruiterId ? [{
        refType: "order" as const,
        refId: orderId,
        partyType: "recruiter" as const,
        partyId: params.recruiterId,
        amount: recruiterAmount,
        currency: "USD",
      }] : []),
      {
        refType: "order" as const,
        refId: orderId,
        partyType: "platform" as const,
        partyId: null,
        amount: platformAmount,
        currency: "USD",
      },
    ]);

    return { orderId, type: "order" };
  } else if (params.itemType === "course") {
    const enrollmentId = crypto.randomUUID();
    
    await db.insert(universityEnrollments).values({
      id: enrollmentId,
      courseId: params.itemId,
      studentId: params.buyerId,
      status: "active",
    });

    // Record commission events
    await db.insert(commissionEvents).values([
      {
        refType: "enrollment",
        refId: enrollmentId,
        partyType: "creator",
        partyId: params.creatorId,
        amount: creatorAmount,
        currency: "USD",
      },
      ...(params.recruiterId ? [{
        refType: "enrollment" as const,
        refId: enrollmentId,
        partyType: "recruiter" as const,
        partyId: params.recruiterId,
        amount: recruiterAmount,
        currency: "USD",
      }] : []),
      {
        refType: "enrollment" as const,
        refId: enrollmentId,
        partyType: "platform" as const,
        partyId: null,
        amount: platformAmount,
        currency: "USD",
      },
    ]);

    return { enrollmentId, type: "enrollment" };
  } else if (params.itemType === "service") {
    const saleId = crypto.randomUUID();
    
    await db.insert(servicesSales).values({
      id: saleId,
      buyerId: params.buyerId,
      offerId: params.itemId,
      grossAmount: params.amount,
      currency: "USD",
      providerAmount: creatorAmount,
      recruiterAmount,
      platformAmount,
      stripeSessionId: params.sessionId,
      status: "paid",
    });

    // Record commission events
    await db.insert(commissionEvents).values([
      {
        refType: "sale",
        refId: saleId,
        partyType: "creator",
        partyId: params.creatorId,
        amount: creatorAmount,
        currency: "USD",
      },
      ...(params.recruiterId ? [{
        refType: "sale" as const,
        refId: saleId,
        partyType: "recruiter" as const,
        partyId: params.recruiterId,
        amount: recruiterAmount,
        currency: "USD",
      }] : []),
      {
        refType: "sale" as const,
        refId: saleId,
        partyType: "platform" as const,
        partyId: null,
        amount: platformAmount,
        currency: "USD",
      },
    ]);

    return { saleId, type: "sale" };
  }

  throw new Error("Invalid item type");
}
