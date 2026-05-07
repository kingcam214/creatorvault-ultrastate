/**
 * 💰 VAULTPAY - REVENUE SIMULATION & PROJECTION TOOLS
 * 
 * Help creators forecast earnings, plan growth, optimize revenue
 * 
 * Tagline: "Know Your Worth"
 * Voice: Data-driven, transparent, empowering
 */

export interface RevenueProjection {
  platform: string;
  followers: number;
  avgTipPerViewer: number;
  avgViewersPerStream: number;
  streamsPerWeek: number;
  
  // Calculated fields
  weeklyRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  
  // Split breakdown
  creatorAmount: number;
  platformAmount: number;
  recruiterAmount?: number; // For TriLayer
  
  splitPercentage: number; // What creator keeps (85%, 70%, etc.)
}

export interface PlatformComparison {
  platform: string;
  split: number; // Percentage creator keeps
  monthlyRevenue: number;
  creatorAmount: number;
  platformAmount: number;
  difference: number; // Compared to VaultLive
}

export interface GrowthScenario {
  scenario: "conservative" | "moderate" | "aggressive";
  currentFollowers: number;
  projectedFollowers: number;
  timeframe: "3months" | "6months" | "12months";
  currentMonthlyRevenue: number;
  projectedMonthlyRevenue: number;
  growthRate: number; // Percentage
}

/**
 * Calculate VaultLive revenue projection (85/15 split)
 */
export function calculateVaultLiveProjection(params: {
  followers: number;
  avgTipPerViewer?: number;
  avgViewersPerStream?: number;
  streamsPerWeek?: number;
}): RevenueProjection {
  const {
    followers,
    avgTipPerViewer = 5, // $5 default
    avgViewersPerStream = Math.floor(followers * 0.05), // 5% of followers
    streamsPerWeek = 3
  } = params;

  const revenuePerStream = avgViewersPerStream * avgTipPerViewer;
  const weeklyRevenue = revenuePerStream * streamsPerWeek;
  const monthlyRevenue = weeklyRevenue * 4.33; // Average weeks per month
  const yearlyRevenue = monthlyRevenue * 12;

  const creatorAmount = monthlyRevenue * 0.85; // 85% to creator
  const platformAmount = monthlyRevenue * 0.15; // 15% to platform

  return {
    platform: "VaultLive",
    followers,
    avgTipPerViewer,
    avgViewersPerStream,
    streamsPerWeek,
    weeklyRevenue,
    monthlyRevenue,
    yearlyRevenue,
    creatorAmount,
    platformAmount,
    splitPercentage: 85
  };
}

/**
 * Calculate TriLayer revenue projection (70/20/10 split)
 */
export function calculateTriLayerProjection(params: {
  followers: number;
  avgSaleAmount?: number;
  conversionRate?: number; // Percentage of followers who buy
}): RevenueProjection {
  const {
    followers,
    avgSaleAmount = 50, // $50 default
    conversionRate = 0.02 // 2% default
  } = params;

  const monthlyBuyers = followers * conversionRate;
  const monthlyRevenue = monthlyBuyers * avgSaleAmount;
  const weeklyRevenue = monthlyRevenue / 4.33;
  const yearlyRevenue = monthlyRevenue * 12;

  const creatorAmount = monthlyRevenue * 0.70; // 70% to creator
  const recruiterAmount = monthlyRevenue * 0.20; // 20% to recruiter
  const platformAmount = monthlyRevenue * 0.10; // 10% to platform

  return {
    platform: "TriLayer",
    followers,
    avgTipPerViewer: avgSaleAmount,
    avgViewersPerStream: monthlyBuyers,
    streamsPerWeek: 0, // Not applicable for TriLayer
    weeklyRevenue,
    monthlyRevenue,
    yearlyRevenue,
    creatorAmount,
    platformAmount,
    recruiterAmount,
    splitPercentage: 70
  };
}

/**
 * Compare VaultLive (85%) vs competitors
 */
export function comparePlatforms(params: {
  followers: number;
  avgTipPerViewer?: number;
  avgViewersPerStream?: number;
  streamsPerWeek?: number;
}): PlatformComparison[] {
  const vaultLive = calculateVaultLiveProjection(params);

  const competitors = [
    { name: "FANBASE", split: 0.80 },
    { name: "OnlyFans", split: 0.80 },
    { name: "Patreon", split: 0.88 },
    { name: "Twitch", split: 0.50 },
    { name: "YouTube", split: 0.55 }
  ];

  const comparisons: PlatformComparison[] = competitors.map(comp => {
    const creatorAmount = vaultLive.monthlyRevenue * comp.split;
    const platformAmount = vaultLive.monthlyRevenue * (1 - comp.split);
    const difference = vaultLive.creatorAmount - creatorAmount;

    return {
      platform: comp.name,
      split: comp.split * 100,
      monthlyRevenue: vaultLive.monthlyRevenue,
      creatorAmount,
      platformAmount,
      difference
    };
  });

  // Add VaultLive itself for comparison
  comparisons.unshift({
    platform: "VaultLive",
    split: 85,
    monthlyRevenue: vaultLive.monthlyRevenue,
    creatorAmount: vaultLive.creatorAmount,
    platformAmount: vaultLive.platformAmount,
    difference: 0
  });

  return comparisons;
}

/**
 * Project growth scenarios
 */
export function projectGrowth(params: {
  currentFollowers: number;
  currentMonthlyRevenue: number;
  scenario: "conservative" | "moderate" | "aggressive";
  timeframe: "3months" | "6months" | "12months";
}): GrowthScenario {
  const { currentFollowers, currentMonthlyRevenue, scenario, timeframe } = params;

  // Growth rate multipliers
  const growthRates = {
    conservative: { "3months": 1.15, "6months": 1.30, "12months": 1.60 },
    moderate: { "3months": 1.30, "6months": 1.70, "12months": 2.50 },
    aggressive: { "3months": 1.50, "6months": 2.20, "12months": 4.00 }
  };

  const multiplier = growthRates[scenario][timeframe];
  const projectedFollowers = Math.floor(currentFollowers * multiplier);
  const projectedMonthlyRevenue = currentMonthlyRevenue * multiplier;
  const growthRate = ((multiplier - 1) * 100);

  return {
    scenario,
    currentFollowers,
    projectedFollowers,
    timeframe,
    currentMonthlyRevenue,
    projectedMonthlyRevenue,
    growthRate
  };
}

/**
 * Calculate commission split for any percentage
 */
export function calculateCommissionSplit(params: {
  totalAmount: number;
  creatorPercentage: number;
  recruiterPercentage?: number;
}): {
  total: number;
  creator: number;
  platform: number;
  recruiter?: number;
} {
  const { totalAmount, creatorPercentage, recruiterPercentage = 0 } = params;

  const creator = totalAmount * (creatorPercentage / 100);
  const recruiter = recruiterPercentage > 0 ? totalAmount * (recruiterPercentage / 100) : undefined;
  const platform = totalAmount - creator - (recruiter || 0);

  return {
    total: totalAmount,
    creator,
    platform,
    recruiter
  };
}

/**
 * Estimate tax liability (US creators)
 */
export function estimateTaxes(params: {
  annualRevenue: number;
  filingStatus: "single" | "married" | "head_of_household";
  state?: string; // US state code
}): {
  grossRevenue: number;
  federalTax: number;
  stateTax: number;
  selfEmploymentTax: number;
  totalTax: number;
  netRevenue: number;
  effectiveRate: number;
} {
  const { annualRevenue, filingStatus, state } = params;

  // Self-employment tax (15.3% on 92.35% of net earnings)
  const selfEmploymentTax = annualRevenue * 0.9235 * 0.153;

  // Federal tax (simplified progressive rates)
  let federalTax = 0;
  if (filingStatus === "single") {
    if (annualRevenue <= 11000) federalTax = annualRevenue * 0.10;
    else if (annualRevenue <= 44725) federalTax = 1100 + (annualRevenue - 11000) * 0.12;
    else if (annualRevenue <= 95375) federalTax = 5147 + (annualRevenue - 44725) * 0.22;
    else if (annualRevenue <= 182100) federalTax = 16290 + (annualRevenue - 95375) * 0.24;
    else federalTax = 37104 + (annualRevenue - 182100) * 0.32;
  } else {
    // Simplified for married/head of household
    federalTax = annualRevenue * 0.22; // Average rate
  }

  // State tax (simplified - varies by state)
  const stateTaxRates: Record<string, number> = {
    CA: 0.093, // California
    NY: 0.0685, // New York
    TX: 0, // Texas (no state income tax)
    FL: 0, // Florida (no state income tax)
    // Add more states as needed
  };
  const stateTaxRate = state ? (stateTaxRates[state] || 0.05) : 0.05; // Default 5%
  const stateTax = annualRevenue * stateTaxRate;

  const totalTax = federalTax + stateTax + selfEmploymentTax;
  const netRevenue = annualRevenue - totalTax;
  const effectiveRate = (totalTax / annualRevenue) * 100;

  return {
    grossRevenue: annualRevenue,
    federalTax,
    stateTax,
    selfEmploymentTax,
    totalTax,
    netRevenue,
    effectiveRate
  };
}

/**
 * Calculate payout schedule
 */
export function calculatePayoutSchedule(params: {
  monthlyRevenue: number;
  payoutFrequency: "weekly" | "biweekly" | "monthly";
  creatorPercentage: number;
}): {
  frequency: string;
  payoutsPerMonth: number;
  amountPerPayout: number;
  annualPayouts: number;
} {
  const { monthlyRevenue, payoutFrequency, creatorPercentage } = params;

  const creatorMonthlyRevenue = monthlyRevenue * (creatorPercentage / 100);

  const payoutsPerMonth = {
    weekly: 4.33,
    biweekly: 2.17,
    monthly: 1
  }[payoutFrequency];

  const amountPerPayout = creatorMonthlyRevenue / payoutsPerMonth;
  const annualPayouts = payoutsPerMonth * 12;

  return {
    frequency: payoutFrequency,
    payoutsPerMonth,
    amountPerPayout,
    annualPayouts
  };
}

/**
 * Calculate break-even point for creators
 */
export function calculateBreakEven(params: {
  monthlyExpenses: number; // Creator's monthly expenses
  avgRevenuePerFollower: number; // Average monthly revenue per follower
}): {
  followersNeeded: number;
  monthlyRevenueNeeded: number;
  estimatedTimeToBreakEven: string; // In months
} {
  const { monthlyExpenses, avgRevenuePerFollower } = params;

  const followersNeeded = Math.ceil(monthlyExpenses / avgRevenuePerFollower);
  const monthlyRevenueNeeded = monthlyExpenses;

  // Estimate time to break-even (assuming 100 followers/month growth)
  const monthsToBreakEven = Math.ceil(followersNeeded / 100);
  const estimatedTimeToBreakEven = monthsToBreakEven > 12 
    ? `${Math.floor(monthsToBreakEven / 12)} years` 
    : `${monthsToBreakEven} months`;

  return {
    followersNeeded,
    monthlyRevenueNeeded,
    estimatedTimeToBreakEven
  };
}
