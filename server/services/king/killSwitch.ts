/**
 * 🦁⚡👑 KC-KILL-SWITCH-CORE
 *
 * Emergency shutdown system for King (owner) to immediately halt operations
 * if malicious activity, security breach, or critical bug is detected.
 *
 * ONLY the King can activate or deactivate the kill switch.
 *
 * Integrated from OMEGA MERGE into ULTRASTATE
 * @version 1.0.0
 */

export type SystemComponent =
  | "payments"
  | "content_upload"
  | "live_streaming"
  | "marketplace"
  | "messaging"
  | "ai_generation"
  | "all";

export interface KillSwitchState {
  active: boolean;
  activatedAt?: Date;
  activatedBy?: string;
  reason?: string;
  affectedComponents: SystemComponent[];
  allowedUserIds: string[]; // King and admins can still access
}

export class KillSwitchCore {
  private static state: KillSwitchState = {
    active: false,
    affectedComponents: [],
    allowedUserIds: [],
  };

  /**
   * Activate kill switch (emergency shutdown)
   * Only King can activate
   */
  static activate(params: {
    kingUserId: string;
    reason: string;
    components?: SystemComponent[];
  }): { success: boolean; message: string } {
    // Verify King authority
    if (!this.isKing(params.kingUserId)) {
      return {
        success: false,
        message: "UNAUTHORIZED: Only King can activate kill switch",
      };
    }

    this.state = {
      active: true,
      activatedAt: new Date(),
      activatedBy: params.kingUserId,
      reason: params.reason,
      affectedComponents: params.components || ["all"],
      allowedUserIds: [params.kingUserId],
    };

    console.error("🚨🦁 [KILL SWITCH ACTIVATED] 🦁🚨");
    console.error(`Reason: ${params.reason}`);
    console.error(`Components: ${this.state.affectedComponents.join(", ")}`);

    return {
      success: true,
      message: `Kill switch activated. Reason: ${params.reason}`,
    };
  }

  /**
   * Deactivate kill switch (restore normal operations)
   * Only King can deactivate
   */
  static deactivate(kingUserId: string): { success: boolean; message: string } {
    if (!this.isKing(kingUserId)) {
      return {
        success: false,
        message: "UNAUTHORIZED: Only King can deactivate kill switch",
      };
    }

    if (!this.state.active) {
      return {
        success: false,
        message: "Kill switch is not active",
      };
    }

    this.state = {
      active: false,
      affectedComponents: [],
      allowedUserIds: [],
    };

    console.log("✅ [KILL SWITCH DEACTIVATED] Normal operations restored");

    return {
      success: true,
      message: "Kill switch deactivated. System restored.",
    };
  }

  /**
   * Check if a component is blocked by kill switch
   */
  static isComponentBlocked(component: SystemComponent, userId: string): boolean {
    if (!this.state.active) return false;

    // King and allowed users can bypass
    if (this.state.allowedUserIds.includes(userId)) return false;

    // Check if component is affected
    return (
      this.state.affectedComponents.includes("all") ||
      this.state.affectedComponents.includes(component)
    );
  }

  /**
   * Check if kill switch is active
   */
  static isActive(): boolean {
    return this.state.active;
  }

  /**
   * Get current kill switch state
   */
  static getState(): KillSwitchState {
    return { ...this.state };
  }

  /**
   * Check if user is King
   * TODO: Integrate with actual user database
   */
  private static isKing(userId: string): boolean {
    // For now, check if userId contains "king" or is a specific ID
    // In production, this would query the database for role="king"
    const kingIds = ["king", "kingcam", process.env.KING_USER_ID];
    return kingIds.some((id) => id && userId.toLowerCase().includes(id.toLowerCase()));
  }

  /**
   * Add allowed user (King can whitelist admins during emergency)
   */
  static addAllowedUser(kingUserId: string, userIdToAllow: string): boolean {
    if (!this.isKing(kingUserId)) return false;
    if (!this.state.active) return false;

    if (!this.state.allowedUserIds.includes(userIdToAllow)) {
      this.state.allowedUserIds.push(userIdToAllow);
    }

    return true;
  }
}
