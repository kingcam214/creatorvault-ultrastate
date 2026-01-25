/**
 * 🦁⚡👑 KING OVERRIDE AUTHORITY
 *
 * Allows King (owner) to override commission splits, adjust payouts,
 * and make emergency economic adjustments.
 *
 * All overrides are logged for transparency and audit.
 *
 * Integrated from OMEGA MERGE into ULTRASTATE
 * @version 1.0.0
 */

export interface KingOverrideRecord {
  id: string;
  timestamp: Date;
  kingUserId: string;
  type: "commission_split" | "payout_adjustment" | "revenue_correction" | "emergency_fund";
  originalValue: any;
  overrideValue: any;
  reason: string;
  affectedUserId?: string;
  affectedTransactionId?: string;
}

export class KingOverrideAuthority {
  private static overrideLog: KingOverrideRecord[] = [];
  private static kingCommissionPercentage = 2; // King gets 2% of all revenue

  /**
   * Apply King Override commission (2% of all revenue goes to King)
   */
  static applyKingCommission(params: {
    totalRevenue: number;
    transactionId: string;
  }): {
    kingAmount: number;
    remainingRevenue: number;
  } {
    const kingAmount = Math.floor(params.totalRevenue * (this.kingCommissionPercentage / 100));
    const remainingRevenue = params.totalRevenue - kingAmount;

    console.log(
      `[KING OVERRIDE] Applied ${this.kingCommissionPercentage}% King commission: $${kingAmount} from $${params.totalRevenue}`
    );

    return {
      kingAmount,
      remainingRevenue,
    };
  }

  /**
   * Override commission split for a specific transaction
   * Only King can do this
   */
  static overrideCommissionSplit(params: {
    kingUserId: string;
    transactionId: string;
    originalSplit: { creator: number; platform: number; recruiter?: number };
    newSplit: { creator: number; platform: number; recruiter?: number };
    reason: string;
    affectedUserId: string;
  }): { success: boolean; message: string } {
    if (!this.isKing(params.kingUserId)) {
      return {
        success: false,
        message: "UNAUTHORIZED: Only King can override commission splits",
      };
    }

    // Validate new split totals 100%
    const total =
      params.newSplit.creator + params.newSplit.platform + (params.newSplit.recruiter || 0);
    if (Math.abs(total - 100) > 0.01) {
      return {
        success: false,
        message: `Invalid split: Total is ${total}%, must be 100%`,
      };
    }

    // Log the override
    this.logOverride({
      id: `override_${Date.now()}`,
      timestamp: new Date(),
      kingUserId: params.kingUserId,
      type: "commission_split",
      originalValue: params.originalSplit,
      overrideValue: params.newSplit,
      reason: params.reason,
      affectedUserId: params.affectedUserId,
      affectedTransactionId: params.transactionId,
    });

    return {
      success: true,
      message: `Commission split overridden. Reason: ${params.reason}`,
    };
  }

  /**
   * Adjust a payout amount (for corrections, bonuses, or penalties)
   * Only King can do this
   */
  static adjustPayout(params: {
    kingUserId: string;
    userId: string;
    originalAmount: number;
    adjustedAmount: number;
    reason: string;
  }): { success: boolean; message: string } {
    if (!this.isKing(params.kingUserId)) {
      return {
        success: false,
        message: "UNAUTHORIZED: Only King can adjust payouts",
      };
    }

    // Log the override
    this.logOverride({
      id: `override_${Date.now()}`,
      timestamp: new Date(),
      kingUserId: params.kingUserId,
      type: "payout_adjustment",
      originalValue: params.originalAmount,
      overrideValue: params.adjustedAmount,
      reason: params.reason,
      affectedUserId: params.userId,
    });

    console.log(
      `[KING OVERRIDE] Payout adjusted for user ${params.userId}: $${params.originalAmount} → $${params.adjustedAmount}. Reason: ${params.reason}`
    );

    return {
      success: true,
      message: `Payout adjusted. Reason: ${params.reason}`,
    };
  }

  /**
   * Get all King overrides (for transparency and audit)
   */
  static getOverrideLog(): KingOverrideRecord[] {
    return [...this.overrideLog];
  }

  /**
   * Get override statistics
   */
  static getOverrideStats(): {
    totalOverrides: number;
    commissionSplitOverrides: number;
    payoutAdjustments: number;
    revenueCorrections: number;
  } {
    return {
      totalOverrides: this.overrideLog.length,
      commissionSplitOverrides: this.overrideLog.filter((o) => o.type === "commission_split")
        .length,
      payoutAdjustments: this.overrideLog.filter((o) => o.type === "payout_adjustment").length,
      revenueCorrections: this.overrideLog.filter((o) => o.type === "revenue_correction").length,
    };
  }

  /**
   * Get King commission percentage
   */
  static getKingCommissionPercentage(): number {
    return this.kingCommissionPercentage;
  }

  /**
   * Set King commission percentage (only King can change this)
   */
  static setKingCommissionPercentage(
    kingUserId: string,
    newPercentage: number
  ): { success: boolean; message: string } {
    if (!this.isKing(kingUserId)) {
      return {
        success: false,
        message: "UNAUTHORIZED: Only King can change commission percentage",
      };
    }

    if (newPercentage < 0 || newPercentage > 10) {
      return {
        success: false,
        message: "King commission must be between 0% and 10%",
      };
    }

    const oldPercentage = this.kingCommissionPercentage;
    this.kingCommissionPercentage = newPercentage;

    this.logOverride({
      id: `override_${Date.now()}`,
      timestamp: new Date(),
      kingUserId,
      type: "commission_split",
      originalValue: oldPercentage,
      overrideValue: newPercentage,
      reason: "King commission percentage adjusted",
    });

    return {
      success: true,
      message: `King commission changed from ${oldPercentage}% to ${newPercentage}%`,
    };
  }

  /**
   * Check if user is King
   */
  private static isKing(userId: string): boolean {
    const kingIds = ["king", "kingcam", process.env.KING_USER_ID];
    return kingIds.some((id) => id && userId.toLowerCase().includes(id.toLowerCase()));
  }

  /**
   * Log an override action
   */
  private static logOverride(record: KingOverrideRecord): void {
    this.overrideLog.push(record);
    console.log("[KING OVERRIDE] Override logged:", record);
  }
}
