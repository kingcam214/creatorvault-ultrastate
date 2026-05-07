/**
 * SYSTEM H — COURSES & SERVICES ENGINE
 * High-ticket mentorship, low-ticket micro-courses, service products, bundles, upsells, commissions
 */

export type ServiceType =
  | "mentorship"
  | "coaching"
  | "consulting"
  | "done-for-you"
  | "audit"
  | "strategy-session";

export type OfferTier = "low-ticket" | "mid-ticket" | "high-ticket";

export interface ServiceOffer {
  offerId: string;
  providerId: string;
  title: string;
  description: string;
  type: ServiceType;
  tier: OfferTier;
  price: number;
  currency: "USD" | "DOP" | "HTG";
  duration: number; // minutes
  deliveryTime: number; // days
  includes: string[];
  guarantee?: string;
  affiliateCommission: number; // percentage
  recruiterCommission: number; // percentage
  active: boolean;
  createdAt: number;
}

export interface Bundle {
  bundleId: string;
  title: string;
  description: string;
  offers: string[]; // offer IDs
  originalPrice: number;
  bundlePrice: number;
  savings: number;
  currency: "USD" | "DOP" | "HTG";
  active: boolean;
}

export interface ServiceSale {
  saleId: string;
  offerId: string;
  buyerId: string;
  providerId: string;
  affiliateId?: string;
  recruiterId?: string;
  amount: number;
  currency: "USD" | "DOP" | "HTG";
  commissions: {
    provider: number;
    affiliate: number;
    recruiter: number;
    platform: number;
  };
  status: "pending" | "confirmed" | "delivered" | "completed" | "refunded";
  deliveryStatus: "pending" | "in-progress" | "delivered";
  createdAt: number;
  deliveredAt?: number;
  completedAt?: number;
}

export interface Upsell {
  upsellId: string;
  fromOfferId: string;
  toOfferId: string;
  discount: number; // percentage
  reason: string;
  active: boolean;
}

export class CoursesServicesEngine {
  /**
   * Create service offer
   */
  createOffer(input: {
    providerId: string;
    title: string;
    description: string;
    type: ServiceType;
    tier: OfferTier;
    price: number;
    currency: "USD" | "DOP" | "HTG";
    duration: number;
    deliveryTime: number;
    includes: string[];
    guarantee?: string;
  }): ServiceOffer {
    const offerId = `offer-${Date.now()}-${input.providerId}`;

    // Commission structure based on tier
    let affiliateCommission = 0;
    let recruiterCommission = 0;

    if (input.tier === "low-ticket") {
      affiliateCommission = 30;
      recruiterCommission = 10;
    } else if (input.tier === "mid-ticket") {
      affiliateCommission = 25;
      recruiterCommission = 15;
    } else {
      // high-ticket
      affiliateCommission = 20;
      recruiterCommission = 20;
    }

    return {
      offerId,
      providerId: input.providerId,
      title: input.title,
      description: input.description,
      type: input.type,
      tier: input.tier,
      price: input.price,
      currency: input.currency,
      duration: input.duration,
      deliveryTime: input.deliveryTime,
      includes: input.includes,
      guarantee: input.guarantee,
      affiliateCommission,
      recruiterCommission,
      active: true,
      createdAt: Date.now(),
    };
  }

  /**
   * Create bundle
   */
  createBundle(
    title: string,
    description: string,
    offers: ServiceOffer[],
    discount: number
  ): Bundle {
    const bundleId = `bundle-${Date.now()}`;

    const originalPrice = offers.reduce((sum, o) => sum + o.price, 0);
    const bundlePrice = originalPrice * (1 - discount / 100);
    const savings = originalPrice - bundlePrice;

    return {
      bundleId,
      title,
      description,
      offers: offers.map((o) => o.offerId),
      originalPrice,
      bundlePrice,
      savings,
      currency: offers[0].currency,
      active: true,
    };
  }

  /**
   * Process service sale
   */
  processSale(
    offer: ServiceOffer,
    buyerId: string,
    affiliateId?: string,
    recruiterId?: string
  ): ServiceSale {
    const saleId = `sale-${Date.now()}-${buyerId}`;

    // Calculate commissions
    const providerCommission =
      100 -
      (affiliateId ? offer.affiliateCommission : 0) -
      (recruiterId ? offer.recruiterCommission : 0) -
      10; // platform

    const providerAmount = (offer.price * providerCommission) / 100;
    const affiliateAmount = affiliateId ? (offer.price * offer.affiliateCommission) / 100 : 0;
    const recruiterAmount = recruiterId ? (offer.price * offer.recruiterCommission) / 100 : 0;
    const platformAmount = offer.price - providerAmount - affiliateAmount - recruiterAmount;

    return {
      saleId,
      offerId: offer.offerId,
      buyerId,
      providerId: offer.providerId,
      affiliateId,
      recruiterId,
      amount: offer.price,
      currency: offer.currency,
      commissions: {
        provider: providerAmount,
        affiliate: affiliateAmount,
        recruiter: recruiterAmount,
        platform: platformAmount,
      },
      status: "confirmed",
      deliveryStatus: "pending",
      createdAt: Date.now(),
    };
  }

  /**
   * Create upsell
   */
  createUpsell(
    fromOfferId: string,
    toOfferId: string,
    discount: number,
    reason: string
  ): Upsell {
    const upsellId = `upsell-${Date.now()}`;

    return {
      upsellId,
      fromOfferId,
      toOfferId,
      discount,
      reason,
      active: true,
    };
  }

  /**
   * Generate upsell recommendations
   */
  generateUpsells(sale: ServiceSale, offers: ServiceOffer[]): ServiceOffer[] {
    const purchasedOffer = offers.find((o) => o.offerId === sale.offerId);
    if (!purchasedOffer) return [];

    // Find higher-tier offers of same type
    const upsellOffers = offers.filter(
      (o) =>
        o.active &&
        o.offerId !== sale.offerId &&
        o.type === purchasedOffer.type &&
        o.price > purchasedOffer.price
    );

    // Sort by price ascending
    upsellOffers.sort((a, b) => a.price - b.price);

    return upsellOffers.slice(0, 3);
  }

  /**
   * Agent recommendation engine
   */
  recommendOffers(
    buyerProfile: {
      budget: number;
      goals: string[];
      previousPurchases: string[];
    },
    offers: ServiceOffer[]
  ): ServiceOffer[] {
    const affordable = offers.filter((o) => o.active && o.price <= buyerProfile.budget);

    // Score offers
    const scored = affordable.map((offer) => {
      let score = 0;

      // Goal alignment
      const goalMatch = buyerProfile.goals.some((goal) =>
        offer.description.toLowerCase().includes(goal.toLowerCase())
      );
      if (goalMatch) {
        score += 50;
      }

      // Not previously purchased
      if (!buyerProfile.previousPurchases.includes(offer.offerId)) {
        score += 30;
      }

      // Tier preference (prefer high-ticket for high budgets)
      if (buyerProfile.budget > 5000 && offer.tier === "high-ticket") {
        score += 20;
      } else if (buyerProfile.budget < 500 && offer.tier === "low-ticket") {
        score += 20;
      }

      return { offer, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, 5).map((s) => s.offer);
  }

  /**
   * Revenue analytics
   */
  getRevenueAnalytics(sales: ServiceSale[]): {
    totalRevenue: number;
    providerRevenue: number;
    affiliateRevenue: number;
    recruiterRevenue: number;
    platformRevenue: number;
    totalSales: number;
    avgSaleValue: number;
    byTier: Record<OfferTier, { count: number; revenue: number }>;
  } {
    const completedSales = sales.filter((s) => s.status === "completed" || s.status === "confirmed");

    let totalRevenue = 0;
    let providerRevenue = 0;
    let affiliateRevenue = 0;
    let recruiterRevenue = 0;
    let platformRevenue = 0;

    const byTier: Record<OfferTier, { count: number; revenue: number }> = {
      "low-ticket": { count: 0, revenue: 0 },
      "mid-ticket": { count: 0, revenue: 0 },
      "high-ticket": { count: 0, revenue: 0 },
    };

    for (const sale of completedSales) {
      totalRevenue += sale.amount;
      providerRevenue += sale.commissions.provider;
      affiliateRevenue += sale.commissions.affiliate;
      recruiterRevenue += sale.commissions.recruiter;
      platformRevenue += sale.commissions.platform;
    }

    const avgSaleValue = completedSales.length > 0 ? totalRevenue / completedSales.length : 0;

    return {
      totalRevenue,
      providerRevenue,
      affiliateRevenue,
      recruiterRevenue,
      platformRevenue,
      totalSales: completedSales.length,
      avgSaleValue,
      byTier,
    };
  }

  /**
   * KingCam high-ticket mentorship
   */
  createKingCamMentorship(providerId: string): ServiceOffer {
    return this.createOffer({
      providerId,
      title: "KingCam 1-on-1 Mentorship",
      description:
        "Direct access to KingCam. Build your creator empire with proven strategies from Dallas to DR. Adult sector, content creation, monetization, and business scaling.",
      type: "mentorship",
      tier: "high-ticket",
      price: 10000,
      currency: "USD",
      duration: 180, // 3 hours per month for 3 months
      deliveryTime: 90, // 90 days
      includes: [
        "3 months of 1-on-1 access",
        "Weekly strategy calls",
        "Direct messaging support",
        "CreatorVault OS access",
        "Adult sector playbook",
        "Dominican expansion guide",
        "Revenue optimization audit",
        "Lifetime community access",
      ],
      guarantee: "Double your revenue in 90 days or work with me until you do",
    });
  }

  /**
   * Low-ticket micro-course
   */
  createMicroCourse(providerId: string): ServiceOffer {
    return this.createOffer({
      providerId,
      title: "Content Creator Quick Start",
      description:
        "Get started as a content creator in 7 days. Profile setup, first content, monetization basics.",
      type: "coaching",
      tier: "low-ticket",
      price: 97,
      currency: "USD",
      duration: 120, // 2 hours of video
      deliveryTime: 1, // instant
      includes: [
        "7-day action plan",
        "Profile setup templates",
        "Content calendar",
        "Monetization checklist",
        "Community access",
      ],
    });
  }

  /**
   * Done-for-you service
   */
  createDoneForYouService(providerId: string): ServiceOffer {
    return this.createOffer({
      providerId,
      title: "Done-For-You Content Strategy",
      description:
        "We build your entire content strategy. 30 days of content planned, scheduled, and optimized.",
      type: "done-for-you",
      tier: "mid-ticket",
      price: 1997,
      currency: "USD",
      duration: 0, // service, not time-based
      deliveryTime: 7, // 7 days
      includes: [
        "30-day content calendar",
        "Caption templates",
        "Hashtag strategy",
        "Posting schedule",
        "Platform optimization",
        "1 strategy call",
      ],
      guarantee: "Increase engagement by 50% or money back",
    });
  }

  /**
   * Adult sector bundle
   */
  createAdultBundle(offers: ServiceOffer[]): Bundle {
    // Find adult-related offers
    const adultOffers = offers.filter(
      (o) =>
        o.description.toLowerCase().includes("adult") ||
        o.description.toLowerCase().includes("onlyfans") ||
        o.description.toLowerCase().includes("fansly")
    );

    return this.createBundle(
      "Adult Creator Complete Package",
      "Everything you need to dominate adult platforms. Mentorship + strategy + done-for-you setup.",
      adultOffers.slice(0, 3),
      25 // 25% discount
    );
  }
}
