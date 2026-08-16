export type BodyCinemaProviderKey = "runway_aleph" | "topaz_video" | "creatorvault_vace" | "creatorvault_technical_continuity";
export type BodyCinemaProviderHealthStatus = "unknown" | "healthy" | "degraded" | "unavailable" | "disabled";
export type BodyCinemaCircuitState = "closed" | "open" | "half_open";
export type BodyCinemaProviderFailureCode =
  | "service_unavailable"
  | "submission_timeout_no_task"
  | "plan_gate"
  | "workspace_limit"
  | "asset_contract"
  | "safety_block"
  | "provider_output_failure"
  | "visual_output_empty"
  | "quality_rejection"
  | "manual_hold";

export type BodyCinemaProviderHealthShape = {
  providerKey: BodyCinemaProviderKey;
  healthStatus: BodyCinemaProviderHealthStatus;
  circuitState: BodyCinemaCircuitState;
  lastFailureCode: BodyCinemaProviderFailureCode | null;
  lastFailureDetail: string | null;
  failureCount: number;
  retryNotBefore: string | null;
  lastProbeAt: string | null;
  lastRecoveredAt: string | null;
  updatedAt: string;
};

export function classifyBodyCinemaProviderFailure(input: {
  code?: string | null;
  detail?: string | null;
}): BodyCinemaProviderFailureCode {
  const message = `${input.code || ""} ${input.detail || ""}`.toLowerCase();
  if (/(workspace limit|workspace.*capacity|generation.*limit|usage limit|quota exceeded)/.test(message)) return "workspace_limit";
  if (/(plan.?gate|entitlement|subscription|not available in.*workspace)/.test(message)) return "plan_gate";
  if (/(timeout|timed out|no task|submission_unknown|temporarily unavailable|third.party.unavailable|service unavailable|outage|load shedding)/.test(message)) return "submission_timeout_no_task";
  if (/(asset.invalid|invalid asset|signed url|signature|malformed|dimensions|duration)/.test(message)) return "asset_contract";
  if (/(safety|moderation|nsfw|policy)/.test(message)) return "safety_block";
  if (/(black frame|black output|visually empty|empty video|no readable visual stream)/.test(message)) return "visual_output_empty";
  if (/(quality|anatomy|identity drift|plastic|stiff movement|rejected output)/.test(message)) return "quality_rejection";
  return "provider_output_failure";
}

export function resolveBodyCinemaFailureState(code: BodyCinemaProviderFailureCode): Pick<BodyCinemaProviderHealthShape, "healthStatus" | "circuitState" | "retryNotBefore"> {
  if (code === "plan_gate" || code === "workspace_limit" || code === "manual_hold") {
    return { healthStatus: "unavailable", circuitState: "open", retryNotBefore: null };
  }
  if (code === "submission_timeout_no_task" || code === "provider_output_failure") {
    return { healthStatus: "unavailable", circuitState: "open", retryNotBefore: new Date(Date.now() + 30 * 60_000).toISOString() };
  }
  if (code === "visual_output_empty" || code === "quality_rejection") {
    return { healthStatus: "degraded", circuitState: "open", retryNotBefore: null };
  }
  // Request-specific source-link and moderation failures must not cause the
  // system to claim an entire provider is offline.
  return { healthStatus: "unknown", circuitState: "closed", retryNotBefore: null };
}

export function isBodyCinemaProviderSubmissionAllowed(
  health: Pick<BodyCinemaProviderHealthShape, "healthStatus" | "circuitState" | "retryNotBefore">,
  now = new Date(),
): boolean {
  if (health.healthStatus === "disabled" || health.healthStatus === "unavailable") return false;
  if (health.circuitState !== "closed") return false;
  if (health.retryNotBefore && new Date(health.retryNotBefore).getTime() > now.getTime()) return false;
  return true;
}
