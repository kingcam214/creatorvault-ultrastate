import type { MediaOSContractName, MediaOSStageName, MediaOSStageStatus, MediaOSWarning } from "../contracts/mediaContracts";

export const MEDIA_OS_EVENT_NAMES = {
  TRAILER_ASSETS_RESOLVED: "TRAILER_ASSETS_RESOLVED",
  TRAILER_NARRATIVE_COMPLETE: "TRAILER_NARRATIVE_COMPLETE",
  TRAILER_PACING_COMPLETE: "TRAILER_PACING_COMPLETE",
  VOICEOVER_RENDERED: "VOICEOVER_RENDERED",
  CLONE_SEQUENCE_READY: "CLONE_SEQUENCE_READY",
  MUTATIONS_GENERATED: "MUTATIONS_GENERATED",
  TIMELINE_ASSEMBLED: "TIMELINE_ASSEMBLED",
  VALIDATION_PASSED: "VALIDATION_PASSED",
  RENDER_COMPLETE: "RENDER_COMPLETE",
  DISTRIBUTION_READY: "DISTRIBUTION_READY",
} as const;

export type MediaOSEventName = typeof MEDIA_OS_EVENT_NAMES[keyof typeof MEDIA_OS_EVENT_NAMES];

export interface MediaOSEventPayload {
  version: "creatorvault.media_os_event.v1";
  sequence: number;
  name: MediaOSEventName;
  stage: MediaOSStageName;
  status: MediaOSStageStatus;
  producer: string;
  trailerProjectId: string | null;
  selectedAssetIds: string[];
  consumes: MediaOSContractName[];
  emits: MediaOSContractName[];
  timestamp: string;
  deterministicReference: string;
  warnings: MediaOSWarning[];
  notes: string;
}

export interface CreateMediaOSEventInput {
  sequence: number;
  name: MediaOSEventName;
  stage: MediaOSStageName;
  status: MediaOSStageStatus;
  producer: string;
  trailerProjectId: string | null;
  selectedAssetIds: string[];
  consumes: MediaOSContractName[];
  emits: MediaOSContractName[];
  timestamp: string;
  warnings?: MediaOSWarning[];
  notes: string;
}

export function createMediaOSEvent(input: CreateMediaOSEventInput): MediaOSEventPayload {
  const assetPart = input.selectedAssetIds.length > 0 ? input.selectedAssetIds.join("|") : "no-assets";
  return {
    version: "creatorvault.media_os_event.v1",
    sequence: input.sequence,
    name: input.name,
    stage: input.stage,
    status: input.status,
    producer: input.producer,
    trailerProjectId: input.trailerProjectId,
    selectedAssetIds: input.selectedAssetIds,
    consumes: input.consumes,
    emits: input.emits,
    timestamp: input.timestamp,
    deterministicReference: `${input.sequence}:${input.name}:${input.trailerProjectId ?? "no-project"}:${assetPart}`,
    warnings: input.warnings ?? [],
    notes: input.notes,
  };
}

export function sortMediaOSEvents(events: MediaOSEventPayload[]): MediaOSEventPayload[] {
  return [...events].sort((a, b) => a.sequence - b.sequence || a.name.localeCompare(b.name));
}
