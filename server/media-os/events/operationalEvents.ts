import type { MediaJobState, OperationalContractName, OperationalSeverity } from "../contracts/operationalContracts";

export const OPERATIONAL_MEDIA_OS_EVENT_NAMES = {
  JOB_CREATED: "JOB_CREATED",
  JOB_QUEUED: "JOB_QUEUED",
  JOB_SCHEDULED: "JOB_SCHEDULED",
  JOB_RUNNING: "JOB_RUNNING",
  JOB_RETRY_WAIT: "JOB_RETRY_WAIT",
  JOB_COMPLETED: "JOB_COMPLETED",
  JOB_FAILED: "JOB_FAILED",
  JOB_DEAD_LETTERED: "JOB_DEAD_LETTERED",
  REPLAY_PLAN_CREATED: "REPLAY_PLAN_CREATED",
  PROVIDER_HEALTH_EVALUATED: "PROVIDER_HEALTH_EVALUATED",
  BUDGET_GUARD_EVALUATED: "BUDGET_GUARD_EVALUATED",
  STORAGE_LIFECYCLE_EVALUATED: "STORAGE_LIFECYCLE_EVALUATED",
  RECOVERY_READINESS_EVALUATED: "RECOVERY_READINESS_EVALUATED",
} as const;

export type OperationalMediaOSEventName = typeof OPERATIONAL_MEDIA_OS_EVENT_NAMES[keyof typeof OPERATIONAL_MEDIA_OS_EVENT_NAMES];

export interface OperationalMediaOSEventPayload {
  version: "creatorvault.operational_media_os_event.v1";
  sequence: number;
  name: OperationalMediaOSEventName;
  jobId: string | null;
  jobState: MediaJobState | null;
  contract: OperationalContractName;
  producer: string;
  severity: OperationalSeverity;
  timestamp: string;
  deterministicReference: string;
  notes: string;
}

export function createOperationalMediaOSEvent(input: Omit<OperationalMediaOSEventPayload, "version" | "deterministicReference">): OperationalMediaOSEventPayload {
  return {
    version: "creatorvault.operational_media_os_event.v1",
    ...input,
    deterministicReference: ["operational-event", input.sequence, input.name, input.jobId ?? "no-job", input.contract].join(":"),
  };
}

export function sortOperationalMediaOSEvents(events: OperationalMediaOSEventPayload[]): OperationalMediaOSEventPayload[] {
  return [...events].sort((a, b) => a.sequence - b.sequence || a.name.localeCompare(b.name));
}

