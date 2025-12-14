/**
 * Stripe Products Configuration
 * Define all products and prices here for centralized management
 */

export interface ProductConfig {
  name: string;
  description: string;
  priceUsd: number; // in cents
  currency: string;
  type: "one_time" | "recurring";
  interval?: "month" | "year";
}

export const PRODUCTS = {
  // Test product for verification
  TEST_PRODUCT: {
    name: "Test Product",
    description: "Test product for payment verification",
    priceUsd: 100, // $1.00
    currency: "usd",
    type: "one_time",
  } as ProductConfig,

  // Marketplace products
  CREATOR_STARTER_PACK: {
    name: "Creator Starter Pack",
    description: "Everything you need to start your creator journey",
    priceUsd: 29700, // $297.00
    currency: "usd",
    type: "one_time",
  } as ProductConfig,

  // University courses
  ADULT_MONETIZATION_COURSE: {
    name: "Adult Creator Monetization Mastery",
    description: "Master adult content monetization strategies",
    priceUsd: 49700, // $497.00
    currency: "usd",
    type: "one_time",
  } as ProductConfig,

  // High-ticket services
  KINGCAM_MENTORSHIP: {
    name: "KingCam 1-on-1 Mentorship",
    description: "Direct access to KingCam for 90 days",
    priceUsd: 1000000, // $10,000.00
    currency: "usd",
    type: "one_time",
  } as ProductConfig,
};
