/*
 * Emergency default-deny boundary for legacy Pollo calls.
 *
 * A paid generation provider must never be reachable merely because an API key is
 * present. Until the governed control plane is released, every legacy caller is
 * frozen unless an operator deliberately sets BOTH environment values below.
 *
 * This module makes no provider request and contains no account credential.
 */

export type PolloLegacyCallContext = {
  operation: string;
  actorUserId?: number | string | null;
  requestId?: string | null;
};

export const POLLO_EMERGENCY_FREEZE_MESSAGE =
  "Pollo generation is temporarily paused while CreatorVault credit controls are recovered. No chargeable request was sent.";

export const LEGACY_PAID_MEDIA_FREEZE_MESSAGE =
  "Legacy paid media generation is temporarily paused while CreatorVault credit controls are recovered. No chargeable request was sent.";

export function isLegacyPolloExecutionAllowed(): boolean {
  return (
    process.env.CREATORVAULT_POLLO_EXECUTION_MODE === "governed" &&
    process.env.CREATORVAULT_POLLO_EMERGENCY_FREEZE === "off"
  );
}

export function assertLegacyPolloExecutionAllowed(context: PolloLegacyCallContext): void {
  if (isLegacyPolloExecutionAllowed()) return;

  console.warn("[PolloSafety] blocked legacy paid provider call", {
    operation: context.operation,
    actorUserId: context.actorUserId ?? null,
    requestId: context.requestId ?? null,
    executionMode: process.env.CREATORVAULT_POLLO_EXECUTION_MODE || "unset",
  });
  throw new Error(POLLO_EMERGENCY_FREEZE_MESSAGE);
}

/**
 * Hard default-deny for every legacy chargeable media path. New provider work must
 * use the governed control plane; no environment setting re-enables old endpoints.
 */
export function assertLegacyPaidMediaExecutionBlocked(context: PolloLegacyCallContext): void {
  console.warn("[PaidMediaSafety] blocked legacy paid media call", {
    operation: context.operation,
    actorUserId: context.actorUserId ?? null,
    requestId: context.requestId ?? null,
  });
  throw new Error(LEGACY_PAID_MEDIA_FREEZE_MESSAGE);
}
