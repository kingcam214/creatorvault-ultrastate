/**
 * 🦁⚡👑 ZERO BILLING PROTECTION ENGINE
 *
 * Prevents platform from ever charging creators for basic usage.
 * CreatorVault NEVER bills creators - creators EARN, platform takes commission.
 *
 * This engine blocks any attempt to create charges, invoices, or bills for creators.
 *
 * Integrated from OMEGA MERGE into ULTRASTATE
 * @version 1.0.0
 */

export interface BillingAttempt {
  userId: string;
  amount: number;
  reason: string;
  timestamp: Date;
}

export class ZeroBillingProtectionEngine {
  private static blockedAttempts: BillingAttempt[] = [];

  /**
   * Check if a charge attempt should be blocked
   * Returns true if blocked, false if allowed
   */
  static shouldBlockCharge(userId: string, amount: number, reason: string): boolean {
    // RULE 1: Never charge creators for platform usage
    const creatorUsageReasons = [
      "platform_fee",
      "monthly_subscription",
      "storage_fee",
      "bandwidth_fee",
      "api_usage",
      "hosting_fee",
    ];

    if (creatorUsageReasons.some((r) => reason.toLowerCase().includes(r))) {
      this.logBlockedAttempt({ userId, amount, reason, timestamp: new Date() });
      console.error(
        `[ZERO BILLING PROTECTION] BLOCKED attempt to charge creator ${userId} $${amount} for ${reason}`
      );
      return true;
    }

    // RULE 2: Only allow charges for optional premium features explicitly opted-in
    const allowedChargeReasons = [
      "premium_ai_generation", // Optional AI credits beyond free tier
      "verified_badge", // One-time verification badge purchase
      "promoted_listing", // Optional promotion
    ];

    if (!allowedChargeReasons.some((r) => reason.toLowerCase().includes(r))) {
      // Unknown charge reason - block by default
      this.logBlockedAttempt({ userId, amount, reason, timestamp: new Date() });
      console.warn(
        `[ZERO BILLING PROTECTION] BLOCKED unknown charge type: ${reason} for user ${userId}`
      );
      return true;
    }

    return false;
  }

  /**
   * Validate that a transaction is a payout TO creator, not FROM creator
   */
  static validatePayoutDirection(transaction: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    type: string;
  }): { valid: boolean; error?: string } {
    // Platform should be paying creators, not the reverse
    const platformIds = ["platform", "creatorvault", "system"];

    const isFromPlatform = platformIds.some((id) =>
      transaction.fromUserId.toLowerCase().includes(id)
    );
    const isToPlatform = platformIds.some((id) =>
      transaction.toUserId.toLowerCase().includes(id)
    );

    // BLOCK: Creator paying platform (except for optional premium features)
    if (!isFromPlatform && isToPlatform) {
      if (!transaction.type.includes("premium")) {
        return {
          valid: false,
          error: `Zero Billing Protection: Creators cannot pay platform for ${transaction.type}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Log a blocked billing attempt
   */
  private static logBlockedAttempt(attempt: BillingAttempt): void {
    this.blockedAttempts.push(attempt);

    // In production, this would trigger alerts to admin
    console.error("[ZERO BILLING PROTECTION] Blocked attempt logged:", attempt);
  }

  /**
   * Get all blocked billing attempts (for admin review)
   */
  static getBlockedAttempts(): BillingAttempt[] {
    return this.blockedAttempts;
  }

  /**
   * Get statistics on blocked attempts
   */
  static getBlockedStats(): {
    totalBlocked: number;
    totalAmountBlocked: number;
    uniqueUsersProtected: number;
  } {
    return {
      totalBlocked: this.blockedAttempts.length,
      totalAmountBlocked: this.blockedAttempts.reduce((sum, a) => sum + a.amount, 0),
      uniqueUsersProtected: new Set(this.blockedAttempts.map((a) => a.userId)).size,
    };
  }

  /**
   * Clear blocked attempts log (for testing or admin purposes)
   */
  static clearBlockedAttempts(): void {
    this.blockedAttempts = [];
  }
}
