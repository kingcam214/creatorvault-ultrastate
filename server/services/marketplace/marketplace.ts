/**
 * SYSTEM F — CREATORVAULT MARKETPLACE
 * Full transaction flow with products, pricing, commissions, checkout, fulfillment
 */

export type ProductType = "digital" | "service" | "bundle" | "subscription";
export type Currency = "USD" | "DOP" | "HTG";
export type ProductCategory =
  | "course"
  | "ebook"
  | "template"
  | "coaching"
  | "shoutout"
  | "photoset"
  | "bundle"
  | "adult"
  | "service";

export interface Product {
  productId: string;
  creatorId: string;
  title: string;
  description: string;
  category: ProductCategory;
  type: ProductType;
  price: number;
  currency: Currency;
  recurring: boolean;
  recurringInterval?: "monthly" | "yearly";
  commissionSplit: CommissionSplit;
  inventory?: number; // null = unlimited
  fulfillmentType: "instant" | "manual" | "scheduled";
  deliveryInstructions?: string;
  active: boolean;
  createdAt: number;
}

export interface CommissionSplit {
  creator: number; // Percentage
  recruiter: number; // Percentage
  platform: number; // Percentage
}

export interface Order {
  orderId: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  recruiterId?: string;
  amount: number;
  currency: Currency;
  commissions: {
    creator: number;
    recruiter: number;
    platform: number;
  };
  status: "pending" | "completed" | "fulfilled" | "refunded" | "cancelled";
  fulfillmentStatus: "pending" | "in-progress" | "delivered" | "failed";
  createdAt: number;
  completedAt?: number;
  fulfilledAt?: number;
}

export interface CreatorStorefront {
  creatorId: string;
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  products: Product[];
  totalSales: number;
  totalRevenue: number;
  rating: number;
  reviewCount: number;
}

export interface CheckoutSession {
  sessionId: string;
  productId: string;
  buyerId: string;
  amount: number;
  currency: Currency;
  status: "pending" | "completed" | "expired";
  createdAt: number;
  expiresAt: number;
}

export class CreatorVaultMarketplace {
  /**
   * Create product
   */
  createProduct(input: {
    creatorId: string;
    title: string;
    description: string;
    category: ProductCategory;
    type: ProductType;
    price: number;
    currency: Currency;
    recurring?: boolean;
    recurringInterval?: "monthly" | "yearly";
    inventory?: number;
    fulfillmentType: "instant" | "manual" | "scheduled";
    deliveryInstructions?: string;
  }): Product {
    const productId = `prod-${Date.now()}-${input.creatorId}`;

    // Default commission split
    const commissionSplit: CommissionSplit = {
      creator: 70,
      recruiter: 20,
      platform: 10,
    };

    return {
      productId,
      creatorId: input.creatorId,
      title: input.title,
      description: input.description,
      category: input.category,
      type: input.type,
      price: input.price,
      currency: input.currency,
      recurring: input.recurring || false,
      recurringInterval: input.recurringInterval,
      commissionSplit,
      inventory: input.inventory,
      fulfillmentType: input.fulfillmentType,
      deliveryInstructions: input.deliveryInstructions,
      active: true,
      createdAt: Date.now(),
    };
  }

  /**
   * Create checkout session
   */
  createCheckout(productId: string, buyerId: string, product: Product): CheckoutSession {
    const sessionId = `checkout-${Date.now()}-${buyerId}`;

    return {
      sessionId,
      productId,
      buyerId,
      amount: product.price,
      currency: product.currency,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
    };
  }

  /**
   * Complete checkout and create order
   */
  completeCheckout(
    session: CheckoutSession,
    product: Product,
    recruiterId?: string
  ): Order {
    const orderId = `order-${Date.now()}-${session.buyerId}`;

    // Calculate commissions
    const creatorAmount = (product.price * product.commissionSplit.creator) / 100;
    const recruiterAmount = recruiterId
      ? (product.price * product.commissionSplit.recruiter) / 100
      : 0;
    const platformAmount = product.price - creatorAmount - recruiterAmount;

    return {
      orderId,
      productId: product.productId,
      buyerId: session.buyerId,
      sellerId: product.creatorId,
      recruiterId,
      amount: product.price,
      currency: product.currency,
      commissions: {
        creator: creatorAmount,
        recruiter: recruiterAmount,
        platform: platformAmount,
      },
      status: "completed",
      fulfillmentStatus: product.fulfillmentType === "instant" ? "delivered" : "pending",
      createdAt: Date.now(),
      completedAt: Date.now(),
      fulfilledAt: product.fulfillmentType === "instant" ? Date.now() : undefined,
    };
  }

  /**
   * Fulfill order
   */
  fulfillOrder(order: Order): Order {
    return {
      ...order,
      fulfillmentStatus: "delivered",
      fulfilledAt: Date.now(),
    };
  }

  /**
   * Get creator storefront
   */
  getStorefront(creatorId: string, products: Product[], orders: Order[]): CreatorStorefront {
    // Filter products by creator
    const creatorProducts = products.filter((p) => p.creatorId === creatorId && p.active);

    // Calculate total sales and revenue
    const creatorOrders = orders.filter((o) => o.sellerId === creatorId && o.status === "completed");
    const totalSales = creatorOrders.length;
    const totalRevenue = creatorOrders.reduce((sum, o) => sum + o.commissions.creator, 0);

    return {
      creatorId,
      username: `creator-${creatorId}`,
      displayName: `Creator ${creatorId}`,
      bio: "Building my empire on CreatorVault",
      avatar: `https://avatar.example.com/${creatorId}`,
      products: creatorProducts,
      totalSales,
      totalRevenue,
      rating: 4.8,
      reviewCount: totalSales,
    };
  }

  /**
   * Get marketplace inventory (agent-sellable)
   */
  getInventory(products: Product[]): {
    totalProducts: number;
    byCategory: Record<ProductCategory, number>;
    byType: Record<ProductType, number>;
    totalValue: number;
  } {
    const activeProducts = products.filter((p) => p.active);

    const byCategory: Record<ProductCategory, number> = {
      course: 0,
      ebook: 0,
      template: 0,
      coaching: 0,
      shoutout: 0,
      photoset: 0,
      bundle: 0,
      adult: 0,
      service: 0,
    };

    const byType: Record<ProductType, number> = {
      digital: 0,
      service: 0,
      bundle: 0,
      subscription: 0,
    };

    let totalValue = 0;

    for (const product of activeProducts) {
      byCategory[product.category]++;
      byType[product.type]++;
      totalValue += product.price;
    }

    return {
      totalProducts: activeProducts.length,
      byCategory,
      byType,
      totalValue,
    };
  }

  /**
   * Agent recommendation engine
   */
  recommendProducts(
    buyerProfile: {
      interests: string[];
      budget: number;
      previousPurchases: string[];
    },
    products: Product[]
  ): Product[] {
    // Filter active products within budget
    const affordable = products.filter(
      (p) => p.active && p.price <= buyerProfile.budget
    );

    // Score products
    const scored = affordable.map((product) => {
      let score = 0;

      // Interest match
      if (buyerProfile.interests.includes(product.category)) {
        score += 50;
      }

      // Price optimization (prefer mid-range)
      const priceRatio = product.price / buyerProfile.budget;
      if (priceRatio > 0.5 && priceRatio < 0.9) {
        score += 30;
      }

      // Not previously purchased
      if (!buyerProfile.previousPurchases.includes(product.productId)) {
        score += 20;
      }

      return { product, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Return top 5
    return scored.slice(0, 5).map((s) => s.product);
  }

  /**
   * Upsell engine
   */
  generateUpsells(order: Order, products: Product[]): Product[] {
    const purchasedProduct = products.find((p) => p.productId === order.productId);
    if (!purchasedProduct) return [];

    // Find related products
    const related = products.filter(
      (p) =>
        p.active &&
        p.productId !== order.productId &&
        p.category === purchasedProduct.category &&
        p.price > purchasedProduct.price
    );

    // Sort by price ascending (next tier up)
    related.sort((a, b) => a.price - b.price);

    return related.slice(0, 3);
  }

  /**
   * Revenue analytics
   */
  getRevenueAnalytics(orders: Order[]): {
    totalRevenue: number;
    creatorRevenue: number;
    recruiterRevenue: number;
    platformRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    byCurrency: Record<Currency, number>;
  } {
    const completedOrders = orders.filter((o) => o.status === "completed");

    let totalRevenue = 0;
    let creatorRevenue = 0;
    let recruiterRevenue = 0;
    let platformRevenue = 0;

    const byCurrency: Record<Currency, number> = {
      USD: 0,
      DOP: 0,
      HTG: 0,
    };

    for (const order of completedOrders) {
      totalRevenue += order.amount;
      creatorRevenue += order.commissions.creator;
      recruiterRevenue += order.commissions.recruiter;
      platformRevenue += order.commissions.platform;
      byCurrency[order.currency] += order.amount;
    }

    const avgOrderValue =
      completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    return {
      totalRevenue,
      creatorRevenue,
      recruiterRevenue,
      platformRevenue,
      totalOrders: completedOrders.length,
      avgOrderValue,
      byCurrency,
    };
  }

  /**
   * Admin controls
   */
  adminControls = {
    /**
     * Approve product
     */
    approveProduct: (productId: string, products: Product[]): Product | undefined => {
      const product = products.find((p) => p.productId === productId);
      if (product) {
        product.active = true;
      }
      return product;
    },

    /**
     * Suspend product
     */
    suspendProduct: (productId: string, products: Product[]): Product | undefined => {
      const product = products.find((p) => p.productId === productId);
      if (product) {
        product.active = false;
      }
      return product;
    },

    /**
     * Refund order
     */
    refundOrder: (orderId: string, orders: Order[]): Order | undefined => {
      const order = orders.find((o) => o.orderId === orderId);
      if (order) {
        order.status = "refunded";
      }
      return order;
    },

    /**
     * Update commission split
     */
    updateCommissionSplit: (
      productId: string,
      split: CommissionSplit,
      products: Product[]
    ): Product | undefined => {
      const product = products.find((p) => p.productId === productId);
      if (product) {
        product.commissionSplit = split;
      }
      return product;
    },
  };
}
