/**
 * FEPL (Founder Earnings Preservation Layer)
 *
 * Ensures founders never earn less than their configured minimum.
 * If an invariant would be violated, adjusts platform margin downward (not founder share).
 *
 * Integrated from OMEGA MERGE into ULTRASTATE
 * @version 1.0.0
 */

export interface CommissionBreakdown {
  totalAmount: number;
  platformMargin: number;
  breakdown: {
    recipient: string;
    amount: number;
    percentage: number;
  }[];
  feplAdjustment?: number;
}

const FOUNDER_MINIMUM_PERCENTAGE = 15; // Founders must earn at least 15% total

/**
 * Apply FEPL protection to a commission breakdown
 * Ensures founders always get their minimum percentage
 */
export function applyFEPL(breakdown: CommissionBreakdown): CommissionBreakdown {
  // Calculate total founder earnings
  const founderEarnings = breakdown.breakdown
    .filter((item) => item.recipient.includes("Founder") || item.recipient.includes("King"))
    .reduce((sum, item) => sum + item.amount, 0);

  const founderPercentage = (founderEarnings / breakdown.totalAmount) * 100;

  // Check if founder minimum is violated
  if (founderPercentage < FOUNDER_MINIMUM_PERCENTAGE) {
    const shortfall = Math.floor(
      (breakdown.totalAmount * FOUNDER_MINIMUM_PERCENTAGE) / 100 - founderEarnings
    );

    // Adjust platform margin downward (not creator share!)
    const adjustedMargin = breakdown.platformMargin - shortfall;

    // Add FEPL adjustment to first founder in breakdown
    const founderItem = breakdown.breakdown.find((item) =>
      item.recipient.includes("Founder") || item.recipient.includes("King")
    );

    if (founderItem) {
      founderItem.amount += shortfall;
      founderItem.percentage = (founderItem.amount / breakdown.totalAmount) * 100;
    }

    console.log(`[FEPL] Applied founder protection: +$${shortfall} (was ${founderPercentage.toFixed(2)}%, now ${FOUNDER_MINIMUM_PERCENTAGE}%)`);

    return {
      ...breakdown,
      platformMargin: adjustedMargin,
      feplAdjustment: shortfall,
    };
  }

  return breakdown;
}

/**
 * Validate that FEPL requirements are met
 */
export function validateFEPL(breakdown: CommissionBreakdown): {
  valid: boolean;
  founderPercentage: number;
  message: string;
} {
  const founderEarnings = breakdown.breakdown
    .filter((item) => item.recipient.includes("Founder") || item.recipient.includes("King"))
    .reduce((sum, item) => sum + item.amount, 0);

  const founderPercentage = (founderEarnings / breakdown.totalAmount) * 100;

  return {
    valid: founderPercentage >= FOUNDER_MINIMUM_PERCENTAGE,
    founderPercentage,
    message: founderPercentage >= FOUNDER_MINIMUM_PERCENTAGE
      ? `FEPL valid: Founder earning ${founderPercentage.toFixed(2)}%`
      : `FEPL violation: Founder only earning ${founderPercentage.toFixed(2)}% (min: ${FOUNDER_MINIMUM_PERCENTAGE}%)`
  };
}
