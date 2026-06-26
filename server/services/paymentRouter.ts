/**
 * ─── Adult-Safe Payment Router ───────────────────────────────────────────────────
 *
 * Multi-gateway payment routing system designed for adult content platforms.
 * Handles the unique challenges of adult commerce:
 * - High-risk merchant classification
 * - Gateway-specific content policies
 * - Geo-differentiated pricing
 * - Chargeback prevention
 * - Revenue split automation
 * - Subscription + PPV + tip hybrid models
 * - Crypto fallback for restricted regions
 */

import { randomUUID } from "crypto";

// ─── Payment Gateway Definitions ─────────────────────────────────────────────────

export type GatewayName = "stripe" | "ccbill" | "segpay" | "epoch" | "crypto_native" | "wise_payout";

export type PaymentType = "subscription" | "ppv_unlock" | "tip" | "custom_request" | "bundle_purchase" | "dm_sale" | "ai_generation_credit";

export type ContentRisk = "sfw" | "suggestive" | "adult_softcore" | "adult_explicit" | "fetish_niche";

export interface GatewayProfile {
  name: GatewayName;
  label: string;
  supportedPaymentTypes: PaymentType[];
  supportedContentRisk: ContentRisk[];
  supportedCurrencies: string[];
  supportedRegions: string[];       // ISO country codes, or "*" for all
  blockedRegions: string[];
  processingFeePct: number;
  fixedFeeCents: number;
  chargebackFeeCents: number;
  payoutDelayDays: number;
  minimumPayoutCents: number;
  supportsRecurring: boolean;
  supportsInstantPayout: boolean;
  requiresAdultMerchantId: boolean;
  apiConfigured: boolean;
  apiHealthy: boolean;
  monthlyVolumeCapCents?: number;
}

// ─── Transaction Types ───────────────────────────────────────────────────────────

export interface PaymentRequest {
  id: string;
  userId: string;                   // Buyer
  creatorId: string;                // Seller/creator
  type: PaymentType;
  amountCents: number;
  currency: string;
  contentRisk: ContentRisk;
  contentId?: string;
  description: string;
  buyerCountry: string;
  buyerIp: string;
  metadata: Record<string, any>;
}

export interface PaymentResult {
  requestId: string;
  status: "success" | "failed" | "pending" | "requires_action";
  gatewayUsed: GatewayName;
  transactionId?: string;
  amountChargedCents: number;
  feeCents: number;
  netRevenueCents: number;
  creatorPayoutCents: number;
  platformFeeCents: number;
  redirectUrl?: string;             // For 3DS or gateway redirect
  error?: string;
  metadata: Record<string, any>;
}

export interface RevenueSplit {
  creatorPct: number;
  platformPct: number;
  referralPct: number;
  referralUserId?: string;
}

// ─── Geo-Differentiated Pricing ──────────────────────────────────────────────────

export interface GeoPrice {
  baseAmountCents: number;
  currency: string;
  countryMultiplier: Record<string, number>; // ISO code → multiplier
  regionTier: Record<string, "premium" | "standard" | "emerging">;
}

const REGION_TIERS: Record<string, "premium" | "standard" | "emerging"> = {
  US: "premium", CA: "premium", GB: "premium", AU: "premium", DE: "premium",
  FR: "premium", JP: "premium", CH: "premium", NO: "premium", SE: "premium",
  NL: "standard", ES: "standard", IT: "standard", KR: "standard", NZ: "standard",
  BR: "emerging", MX: "emerging", IN: "emerging", PH: "emerging", CO: "emerging",
  DO: "emerging", AR: "emerging", TH: "emerging", VN: "emerging", NG: "emerging",
};

const TIER_MULTIPLIERS: Record<string, number> = {
  premium: 1.0,
  standard: 0.75,
  emerging: 0.45,
};

export function computeGeoPrice(baseCents: number, buyerCountry: string, customMultipliers?: Record<string, number>): number {
  if (customMultipliers?.[buyerCountry] !== undefined) {
    return Math.round(baseCents * customMultipliers[buyerCountry]);
  }
  const tier = REGION_TIERS[buyerCountry] || "standard";
  return Math.round(baseCents * TIER_MULTIPLIERS[tier]);
}

// ─── Chargeback Prevention ───────────────────────────────────────────────────────

export interface ChargebackRiskAssessment {
  riskScore: number;              // 0-100 (higher = riskier)
  factors: string[];
  recommendation: "allow" | "require_3ds" | "block" | "manual_review";
  suggestedActions: string[];
}

export function assessChargebackRisk(request: PaymentRequest, buyerHistory: { totalPurchases: number; chargebacks: number; accountAgeDays: number; emailVerified: boolean }): ChargebackRiskAssessment {
  let score = 0;
  const factors: string[] = [];
  const actions: string[] = [];

  // New account risk
  if (buyerHistory.accountAgeDays < 1) { score += 30; factors.push("Brand new account"); }
  else if (buyerHistory.accountAgeDays < 7) { score += 15; factors.push("Account less than 7 days old"); }

  // Previous chargebacks
  if (buyerHistory.chargebacks > 0) {
    const rate = buyerHistory.chargebacks / Math.max(1, buyerHistory.totalPurchases);
    score += Math.min(50, Math.round(rate * 200));
    factors.push(`Chargeback rate: ${(rate * 100).toFixed(1)}%`);
  }

  // High-value transaction
  if (request.amountCents > 5000) { score += 10; factors.push("High-value transaction (>$50)"); }
  if (request.amountCents > 20000) { score += 15; factors.push("Very high-value transaction (>$200)"); }

  // Email not verified
  if (!buyerHistory.emailVerified) { score += 15; factors.push("Email not verified"); }

  // Content risk factor
  if (request.contentRisk === "adult_explicit") { score += 10; factors.push("Explicit content (higher dispute rate)"); }
  if (request.contentRisk === "fetish_niche") { score += 15; factors.push("Niche content (highest dispute rate)"); }

  // Determine recommendation
  let recommendation: ChargebackRiskAssessment["recommendation"];
  if (score >= 70) { recommendation = "block"; actions.push("Block transaction", "Flag account for review"); }
  else if (score >= 45) { recommendation = "require_3ds"; actions.push("Require 3D Secure authentication", "Add to monitoring list"); }
  else if (score >= 30) { recommendation = "manual_review"; actions.push("Queue for manual review before fulfillment"); }
  else { recommendation = "allow"; }

  return { riskScore: score, factors, recommendation, suggestedActions: actions };
}

// ─── Payment Router ──────────────────────────────────────────────────────────────

export class AdultPaymentRouter {
  private gateways: Map<GatewayName, GatewayProfile> = new Map();
  private defaultSplit: RevenueSplit = { creatorPct: 80, platformPct: 20, referralPct: 0 };
  private transactions: Map<string, PaymentResult> = new Map();

  registerGateway(profile: GatewayProfile): void {
    this.gateways.set(profile.name, profile);
  }

  setDefaultSplit(split: RevenueSplit): void {
    this.defaultSplit = split;
  }

  /**
   * Route a payment to the optimal gateway based on:
   * - Content risk level compatibility
   * - Buyer region support
   * - Payment type support
   * - Fee optimization
   * - Gateway health
   */
  selectGateway(request: PaymentRequest): { gateway: GatewayProfile; reasoning: string[] } | null {
    const reasoning: string[] = [];
    const candidates: Array<{ gateway: GatewayProfile; score: number }> = [];

    for (const [name, gateway] of this.gateways) {
      // Hard filters
      if (!gateway.apiConfigured || !gateway.apiHealthy) {
        reasoning.push(`${name}: skipped (not configured/healthy)`);
        continue;
      }
      if (!gateway.supportedContentRisk.includes(request.contentRisk)) {
        reasoning.push(`${name}: skipped (content risk ${request.contentRisk} not supported)`);
        continue;
      }
      if (!gateway.supportedPaymentTypes.includes(request.type)) {
        reasoning.push(`${name}: skipped (payment type ${request.type} not supported)`);
        continue;
      }
      if (gateway.blockedRegions.includes(request.buyerCountry)) {
        reasoning.push(`${name}: skipped (buyer country ${request.buyerCountry} blocked)`);
        continue;
      }
      if (gateway.supportedRegions[0] !== "*" && !gateway.supportedRegions.includes(request.buyerCountry)) {
        reasoning.push(`${name}: skipped (buyer country ${request.buyerCountry} not in supported regions)`);
        continue;
      }
      if (!gateway.supportedCurrencies.includes(request.currency)) {
        reasoning.push(`${name}: skipped (currency ${request.currency} not supported)`);
        continue;
      }

      // Score by fee efficiency
      const totalFee = Math.round(request.amountCents * gateway.processingFeePct / 100) + gateway.fixedFeeCents;
      const feeScore = 100 - Math.min(100, totalFee / request.amountCents * 100 * 5); // Lower fee = higher score

      // Payout speed bonus
      const payoutScore = Math.max(0, 20 - gateway.payoutDelayDays * 3);

      const totalScore = feeScore + payoutScore;
      candidates.push({ gateway, score: totalScore });
    }

    if (candidates.length === 0) {
      reasoning.push("No eligible gateway found. Consider crypto fallback.");
      return null;
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    reasoning.push(`Selected ${best.gateway.name} (score: ${best.score.toFixed(1)}, fee: ${best.gateway.processingFeePct}% + ${best.gateway.fixedFeeCents}c)`);

    return { gateway: best.gateway, reasoning };
  }

  /**
   * Process a payment through the selected gateway.
   */
  async processPayment(request: PaymentRequest, split?: RevenueSplit): Promise<PaymentResult> {
    const effectiveSplit = split || this.defaultSplit;

    // Select gateway
    const selection = this.selectGateway(request);
    if (!selection) {
      return {
        requestId: request.id,
        status: "failed",
        gatewayUsed: "crypto_native",
        amountChargedCents: 0,
        feeCents: 0,
        netRevenueCents: 0,
        creatorPayoutCents: 0,
        platformFeeCents: 0,
        error: "No eligible payment gateway available for this transaction.",
        metadata: {},
      };
    }

    const gateway = selection.gateway;
    const feeCents = Math.round(request.amountCents * gateway.processingFeePct / 100) + gateway.fixedFeeCents;
    const netRevenue = request.amountCents - feeCents;
    const creatorPayout = Math.round(netRevenue * effectiveSplit.creatorPct / 100);
    const platformFee = netRevenue - creatorPayout;

    const result: PaymentResult = {
      requestId: request.id,
      status: "success", // In production, this would be async with webhook confirmation
      gatewayUsed: gateway.name,
      transactionId: `txn_${randomUUID().slice(0, 12)}`,
      amountChargedCents: request.amountCents,
      feeCents,
      netRevenueCents: netRevenue,
      creatorPayoutCents: creatorPayout,
      platformFeeCents: platformFee,
      metadata: {
        split: effectiveSplit,
        gatewayReasoning: selection.reasoning,
        geoAdjusted: false,
      },
    };

    this.transactions.set(request.id, result);
    return result;
  }

  /**
   * Process a geo-adjusted payment where the price varies by buyer location.
   */
  async processGeoPayment(request: PaymentRequest, basePriceCents: number, customMultipliers?: Record<string, number>, split?: RevenueSplit): Promise<PaymentResult> {
    const adjustedAmount = computeGeoPrice(basePriceCents, request.buyerCountry, customMultipliers);
    const adjustedRequest = { ...request, amountCents: adjustedAmount };
    const result = await this.processPayment(adjustedRequest, split);
    result.metadata.geoAdjusted = true;
    result.metadata.originalPriceCents = basePriceCents;
    result.metadata.adjustedPriceCents = adjustedAmount;
    result.metadata.buyerCountry = request.buyerCountry;
    return result;
  }

  getTransaction(requestId: string): PaymentResult | undefined {
    return this.transactions.get(requestId);
  }
}

// ─── Default Gateway Profiles ────────────────────────────────────────────────────

export function createDefaultGatewayProfiles(configured: Record<string, boolean>): GatewayProfile[] {
  return [
    {
      name: "stripe",
      label: "Stripe (Adult-Approved MCC)",
      supportedPaymentTypes: ["subscription", "ppv_unlock", "tip", "bundle_purchase", "ai_generation_credit"],
      supportedContentRisk: ["sfw", "suggestive", "adult_softcore"],
      supportedCurrencies: ["USD", "EUR", "GBP", "CAD", "AUD"],
      supportedRegions: ["*"],
      blockedRegions: [],
      processingFeePct: 2.9,
      fixedFeeCents: 30,
      chargebackFeeCents: 1500,
      payoutDelayDays: 2,
      minimumPayoutCents: 100,
      supportsRecurring: true,
      supportsInstantPayout: true,
      requiresAdultMerchantId: true,
      apiConfigured: configured.stripe ?? false,
      apiHealthy: configured.stripe ?? false,
    },
    {
      name: "ccbill",
      label: "CCBill (Adult Specialist)",
      supportedPaymentTypes: ["subscription", "ppv_unlock", "tip", "custom_request", "bundle_purchase", "dm_sale"],
      supportedContentRisk: ["sfw", "suggestive", "adult_softcore", "adult_explicit", "fetish_niche"],
      supportedCurrencies: ["USD", "EUR", "GBP"],
      supportedRegions: ["*"],
      blockedRegions: ["IR", "KP", "CU", "SY"],
      processingFeePct: 3.9,
      fixedFeeCents: 0,
      chargebackFeeCents: 2500,
      payoutDelayDays: 7,
      minimumPayoutCents: 5000,
      supportsRecurring: true,
      supportsInstantPayout: false,
      requiresAdultMerchantId: false,
      apiConfigured: configured.ccbill ?? false,
      apiHealthy: configured.ccbill ?? false,
    },
    {
      name: "segpay",
      label: "Segpay (Adult Commerce)",
      supportedPaymentTypes: ["subscription", "ppv_unlock", "tip", "bundle_purchase"],
      supportedContentRisk: ["sfw", "suggestive", "adult_softcore", "adult_explicit"],
      supportedCurrencies: ["USD", "EUR"],
      supportedRegions: ["*"],
      blockedRegions: ["IR", "KP", "CU"],
      processingFeePct: 4.5,
      fixedFeeCents: 0,
      chargebackFeeCents: 2000,
      payoutDelayDays: 14,
      minimumPayoutCents: 10000,
      supportsRecurring: true,
      supportsInstantPayout: false,
      requiresAdultMerchantId: false,
      apiConfigured: configured.segpay ?? false,
      apiHealthy: configured.segpay ?? false,
    },
    {
      name: "crypto_native",
      label: "Crypto (USDC/USDT/BTC)",
      supportedPaymentTypes: ["ppv_unlock", "tip", "custom_request", "bundle_purchase", "dm_sale", "ai_generation_credit"],
      supportedContentRisk: ["sfw", "suggestive", "adult_softcore", "adult_explicit", "fetish_niche"],
      supportedCurrencies: ["USDC", "USDT", "BTC", "ETH", "SOL"],
      supportedRegions: ["*"],
      blockedRegions: [],
      processingFeePct: 1.0,
      fixedFeeCents: 0,
      chargebackFeeCents: 0,
      payoutDelayDays: 0,
      minimumPayoutCents: 0,
      supportsRecurring: false,
      supportsInstantPayout: true,
      requiresAdultMerchantId: false,
      apiConfigured: configured.crypto ?? false,
      apiHealthy: configured.crypto ?? false,
    },
  ];
}

// ─── Output QA Scoring System ────────────────────────────────────────────────────

/**
 * Automated quality assurance scoring for generated content before it reaches
 * payment-gated distribution. Prevents low-quality outputs from damaging
 * creator reputation and triggering refund requests.
 */

export interface OutputQAScore {
  overall: number;                  // 0-100
  technicalQuality: number;         // Resolution, bitrate, encoding
  visualCoherence: number;          // No artifacts, morphing, glitches
  identityMatch: number;            // Face/body consistency with reference
  motionNaturalness: number;        // Realistic movement
  audioSync: number;                // Audio-visual alignment
  platformCompliance: number;       // Meets target platform requirements
  monetizationReadiness: number;    // Suitable for paid distribution
  thumbnailQuality: number;         // Auto-generated thumbnail quality
  hookStrength: number;             // First 2 seconds engagement potential
}

export interface QADecision {
  score: OutputQAScore;
  verdict: "publish" | "review" | "regenerate" | "reject";
  reasoning: string[];
  suggestedImprovements: string[];
  estimatedRevenuePotential: "high" | "medium" | "low";
}

export function scoreOutput(metrics: Partial<OutputQAScore>): QADecision {
  const score: OutputQAScore = {
    overall: 0,
    technicalQuality: metrics.technicalQuality ?? 75,
    visualCoherence: metrics.visualCoherence ?? 70,
    identityMatch: metrics.identityMatch ?? 80,
    motionNaturalness: metrics.motionNaturalness ?? 70,
    audioSync: metrics.audioSync ?? 85,
    platformCompliance: metrics.platformCompliance ?? 90,
    monetizationReadiness: metrics.monetizationReadiness ?? 70,
    thumbnailQuality: metrics.thumbnailQuality ?? 75,
    hookStrength: metrics.hookStrength ?? 65,
  };

  // Weighted composite
  score.overall = Math.round(
    score.technicalQuality * 0.12 +
    score.visualCoherence * 0.18 +
    score.identityMatch * 0.20 +
    score.motionNaturalness * 0.12 +
    score.audioSync * 0.08 +
    score.platformCompliance * 0.08 +
    score.monetizationReadiness * 0.10 +
    score.thumbnailQuality * 0.05 +
    score.hookStrength * 0.07
  );

  const reasoning: string[] = [];
  const improvements: string[] = [];

  // Determine verdict
  let verdict: QADecision["verdict"];
  if (score.overall >= 80) {
    verdict = "publish";
    reasoning.push("Output meets premium quality threshold for paid distribution.");
  } else if (score.overall >= 65) {
    verdict = "review";
    reasoning.push("Output is acceptable but may benefit from creator review before publishing.");
  } else if (score.overall >= 45) {
    verdict = "regenerate";
    reasoning.push("Output quality below monetization threshold. Regeneration recommended.");
  } else {
    verdict = "reject";
    reasoning.push("Output has critical quality issues. Cannot be distributed.");
  }

  // Specific feedback
  if (score.visualCoherence < 60) improvements.push("Visual artifacts detected — try a different style or reduce motion complexity.");
  if (score.identityMatch < 70) improvements.push("Identity drift detected — enable identity lock or use a clearer reference image.");
  if (score.motionNaturalness < 60) improvements.push("Unnatural motion detected — simplify the motion directive.");
  if (score.hookStrength < 50) improvements.push("Weak opening hook — consider a more dynamic first 2 seconds.");
  if (score.thumbnailQuality < 60) improvements.push("Thumbnail quality low — manually select a better frame.");

  // Revenue potential
  let revenuePotential: QADecision["estimatedRevenuePotential"];
  if (score.overall >= 85 && score.hookStrength >= 75) revenuePotential = "high";
  else if (score.overall >= 70) revenuePotential = "medium";
  else revenuePotential = "low";

  return { score, verdict, reasoning, suggestedImprovements: improvements, estimatedRevenuePotential: revenuePotential };
}

// ─── Subscription Tier Management ────────────────────────────────────────────────

export interface SubscriptionTier {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  interval: "monthly" | "quarterly" | "yearly";
  features: string[];
  contentAccess: ContentRisk[];
  maxDmPerMonth: number;
  customRequestsPerMonth: number;
  aiGenerationCredits: number;
  priority: "standard" | "vip" | "diamond";
}

export const DEFAULT_SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: "basic",
    name: "Subscriber",
    priceCents: 999,
    currency: "USD",
    interval: "monthly",
    features: ["Feed access", "Standard content", "1 DM/month"],
    contentAccess: ["sfw", "suggestive"],
    maxDmPerMonth: 1,
    customRequestsPerMonth: 0,
    aiGenerationCredits: 0,
    priority: "standard",
  },
  {
    id: "premium",
    name: "VIP",
    priceCents: 2999,
    currency: "USD",
    interval: "monthly",
    features: ["Full feed", "Premium content", "5 DMs/month", "Priority responses", "Behind-the-scenes"],
    contentAccess: ["sfw", "suggestive", "adult_softcore"],
    maxDmPerMonth: 5,
    customRequestsPerMonth: 1,
    aiGenerationCredits: 5,
    priority: "vip",
  },
  {
    id: "diamond",
    name: "Diamond",
    priceCents: 9999,
    currency: "USD",
    interval: "monthly",
    features: ["Everything", "Exclusive content", "Unlimited DMs", "Custom requests", "AI generation credits", "1-on-1 video calls"],
    contentAccess: ["sfw", "suggestive", "adult_softcore", "adult_explicit"],
    maxDmPerMonth: -1, // unlimited
    customRequestsPerMonth: 5,
    aiGenerationCredits: 25,
    priority: "diamond",
  },
];
