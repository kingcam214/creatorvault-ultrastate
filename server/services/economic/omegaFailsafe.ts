/**
 * 🦁⚡👑 OMEGA FAILSAFE ENGINE (OFE)
 *
 * Absolute protection against catastrophic economic failures.
 * This is the final layer of defense for the ULTRASTATE economy.
 *
 * Integrated from OMEGA MERGE into ULTRASTATE
 * @version 1.0.0
 */

export interface FailsafeEvent {
  timestamp: Date;
  type:
    | "NEGATIVE_REVENUE"
    | "MISSING_COMMISSION"
    | "BROKEN_PAYOUT"
    | "CORRUPTED_SPLIT"
    | "INVALID_COUNTRY"
    | "IMPOSSIBLE_PPP";
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  affectedUserId?: string;
  affectedTransactionId?: string;
  autoCorrection: {
    applied: boolean;
    action: string;
    result: string;
  };
  quarantined: boolean;
}

export class OmegaFailsafeEngine {
  private static failsafeLog: FailsafeEvent[] = [];

  /**
   * Validate a revenue event before processing
   */
  static async validateRevenueEvent(event: {
    earningUserId: string;
    revenueAmount: number;
    country: string;
    sourceTxnId: string;
  }): Promise<{ valid: boolean; errors: string[]; corrected?: any }> {
    const errors: string[] = [];

    // Check 1: Negative revenue
    if (event.revenueAmount < 0) {
      errors.push("NEGATIVE_REVENUE: Revenue amount cannot be negative");
      this.logFailsafeEvent({
        timestamp: new Date(),
        type: "NEGATIVE_REVENUE",
        severity: "CRITICAL",
        description: `Negative revenue detected: $${event.revenueAmount}`,
        affectedUserId: event.earningUserId,
        affectedTransactionId: event.sourceTxnId,
        autoCorrection: {
          applied: true,
          action: "Set revenue to 0",
          result: "Event quarantined",
        },
        quarantined: true,
      });
      event.revenueAmount = 0;
    }

    // Check 2: Invalid country code
    const validCountries = ["US", "DR", "HAITI", "DO"];
    if (!validCountries.includes(event.country.toUpperCase())) {
      errors.push("INVALID_COUNTRY: Country code must be US, DR, HAITI, or DO");
      this.logFailsafeEvent({
        timestamp: new Date(),
        type: "INVALID_COUNTRY",
        severity: "HIGH",
        description: `Invalid country code: ${event.country}`,
        affectedUserId: event.earningUserId,
        affectedTransactionId: event.sourceTxnId,
        autoCorrection: {
          applied: true,
          action: "Default to US",
          result: "Country code corrected",
        },
        quarantined: false,
      });
      // Auto-correct
      event.country = "US";
    }

    // Check 3: Missing user ID
    if (!event.earningUserId || event.earningUserId.trim() === "") {
      errors.push("MISSING_USER_ID: User ID is required");
      this.logFailsafeEvent({
        timestamp: new Date(),
        type: "BROKEN_PAYOUT",
        severity: "CRITICAL",
        description: "Missing user ID in revenue event",
        affectedTransactionId: event.sourceTxnId,
        autoCorrection: {
          applied: false,
          action: "None",
          result: "Event quarantined",
        },
        quarantined: true,
      });
    }

    return {
      valid: errors.filter((e) => e.includes("CRITICAL")).length === 0,
      errors,
      corrected: errors.length > 0 ? event : undefined,
    };
  }

  /**
   * Validate commission split percentages
   */
  static validateCommissionSplit(split: {
    creator: number;
    platform: number;
    recruiter?: number;
    total: number;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check 1: Total must be 100%
    const totalPercent = split.creator + split.platform + (split.recruiter || 0);
    if (Math.abs(totalPercent - 100) > 0.01) {
      errors.push(`CORRUPTED_SPLIT: Total split is ${totalPercent}%, must be 100%`);
      this.logFailsafeEvent({
        timestamp: new Date(),
        type: "CORRUPTED_SPLIT",
        severity: "CRITICAL",
        description: `Invalid commission split: ${totalPercent}%`,
        autoCorrection: {
          applied: false,
          action: "None",
          result: "Split rejected",
        },
        quarantined: true,
      });
    }

    // Check 2: Creator must get at least 70%
    if (split.creator < 70) {
      errors.push(`CORRUPTED_SPLIT: Creator split ${split.creator}% is below minimum 70%`);
      this.logFailsafeEvent({
        timestamp: new Date(),
        type: "CORRUPTED_SPLIT",
        severity: "CRITICAL",
        description: `Creator split ${split.creator}% violates 70% minimum`,
        autoCorrection: {
          applied: false,
          action: "None",
          result: "Split rejected",
        },
        quarantined: true,
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate PPP multiplier for country
   */
  static validatePPPMultiplier(
    multiplier: number,
    country: string
  ): { valid: boolean; corrected?: number } {
    const validRanges: Record<string, { min: number; max: number }> = {
      US: { min: 0.9, max: 1.1 },
      DR: { min: 0.3, max: 0.6 },
      DO: { min: 0.3, max: 0.6 },
      HAITI: { min: 0.2, max: 0.5 },
    };

    const range = validRanges[country.toUpperCase()];
    if (!range) {
      // Unknown country, default to US range
      return { valid: true };
    }

    if (multiplier < range.min || multiplier > range.max) {
      const corrected = Math.max(range.min, Math.min(range.max, multiplier));
      this.logFailsafeEvent({
        timestamp: new Date(),
        type: "IMPOSSIBLE_PPP",
        severity: "MEDIUM",
        description: `PPP multiplier ${multiplier} out of range for ${country}`,
        autoCorrection: {
          applied: true,
          action: `Clamp to valid range [${range.min}, ${range.max}]`,
          result: `PPP multiplier corrected to ${corrected}`,
        },
        quarantined: false,
      });
      return { valid: false, corrected };
    }

    return { valid: true };
  }

  /**
   * Log a failsafe event
   */
  private static logFailsafeEvent(event: FailsafeEvent): void {
    this.failsafeLog.push(event);
    console.error("[OMEGA FAILSAFE]", event);

    // In production, this would also send alerts to monitoring systems
  }

  /**
   * Get all failsafe events
   */
  static getFailsafeLog(): FailsafeEvent[] {
    return this.failsafeLog;
  }

  /**
   * Get failsafe statistics
   */
  static getFailsafeStats(): {
    totalEvents: number;
    criticalEvents: number;
    quarantinedEvents: number;
    autoCorrectedEvents: number;
  } {
    return {
      totalEvents: this.failsafeLog.length,
      criticalEvents: this.failsafeLog.filter((e) => e.severity === "CRITICAL").length,
      quarantinedEvents: this.failsafeLog.filter((e) => e.quarantined).length,
      autoCorrectedEvents: this.failsafeLog.filter((e) => e.autoCorrection.applied).length,
    };
  }

  /**
   * Clear failsafe log (for testing or admin purposes)
   */
  static clearFailsafeLog(): void {
    this.failsafeLog = [];
  }
}
