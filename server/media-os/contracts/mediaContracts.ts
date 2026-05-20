export type MediaOSContractName =
  | "SceneManifest"
  | "TimelineManifest"
  | "PacingManifest"
  | "RetentionReport"
  | "VoiceoverManifest"
  | "CloneSequenceManifest"
  | "MutationManifest"
  | "ValidationReport"
  | "RenderManifest"
  | "DistributionManifest";

export type MediaOSStageStatus = "complete" | "planned" | "handoff_prepared" | "blocked" | "warning";

export type MediaOSStageName =
  | "grounding"
  | "narrative_planning"
  | "pacing"
  | "voiceover"
  | "clone_integration"
  | "mutation_planning"
  | "retention_analysis"
  | "timeline_assembly"
  | "validation"
  | "rendering"
  | "distribution";

export type MediaOSSeverity = "info" | "warning" | "blocking";

export interface MediaOSWarning {
  severity: MediaOSSeverity;
  source: string;
  message: string;
}

export interface SceneManifest {
  contract: "SceneManifest";
  sceneIndex: number;
  role: string;
  sourceAssetId: string | null;
  sourceUrl: string | null;
  assetKind: string | null;
  durationSeconds: number;
  startSecond: number;
  endSecond: number;
  overlayText: string;
  visualDirection: string;
  requiredRenderTreatment: string;
  logoTiming: "intro" | "persistent" | "outro" | "none";
  ctaPlacement: "none" | "soft" | "direct";
  warnings: MediaOSWarning[];
}

export interface TimelineAudioLayer {
  layerId: string;
  type: "music" | "voiceover" | "sfx" | "silence";
  startSecond: number;
  endSecond: number;
  status: MediaOSStageStatus;
  description: string;
}

export interface TimelineManifest {
  contract: "TimelineManifest";
  totalDurationSeconds: number;
  format: string;
  sceneCount: number;
  scenes: SceneManifest[];
  transitions: Array<{
    fromSceneIndex: number;
    toSceneIndex: number;
    transition: string;
    durationSeconds: number;
  }>;
  audioLayers: TimelineAudioLayer[];
  logoWindows: Array<{ sceneIndex: number; startSecond: number; endSecond: number; placement: string }>;
  ctaWindows: Array<{ sceneIndex: number; startSecond: number; endSecond: number; intensity: string }>;
  warnings: MediaOSWarning[];
}

export interface PacingManifest {
  contract: "PacingManifest";
  totalDurationSeconds: number;
  beats: Array<{
    sceneIndex: number;
    startSecond: number;
    endSecond: number;
    intensity: number;
    beat: string;
    retentionIntent: string;
  }>;
  averageIntensity: number;
  warnings: MediaOSWarning[];
}

export interface RetentionReport {
  contract: "RetentionReport";
  status: MediaOSStageStatus;
  scores: Record<string, number>;
  deadZones: unknown[];
  weakHooks: unknown[];
  replayMoments: unknown[];
  textOverload: unknown[];
  ctaFatigue: unknown[];
  conversionPressure: unknown[];
  warnings: MediaOSWarning[];
}

export interface VoiceoverManifest {
  contract: "VoiceoverManifest";
  status: MediaOSStageStatus;
  voiceId: string | null;
  generationStatus: string;
  segments: Array<{
    sceneIndex: number;
    startSecond: number;
    endSecond: number;
    text: string;
    syncStatus: string;
  }>;
  warnings: MediaOSWarning[];
}

export interface CloneSequenceManifest {
  contract: "CloneSequenceManifest";
  status: MediaOSStageStatus;
  mode: string;
  registryStatus: string;
  cloneSceneOpportunities: unknown[];
  warnings: MediaOSWarning[];
}

export interface MutationManifest {
  contract: "MutationManifest";
  branchCount: number;
  branches: Array<{
    platform: string;
    format: string | null;
    targetDurationSeconds: number | null;
    hook: string | null;
    cta: string | null;
    status: MediaOSStageStatus;
  }>;
  warnings: MediaOSWarning[];
}

export interface ValidationReport {
  contract: "ValidationReport";
  status: MediaOSStageStatus;
  independentValidationRequired: boolean;
  requiredChecks: string[];
  blockingWarnings: string[];
  warnings: MediaOSWarning[];
}

export interface RenderManifest {
  contract: "RenderManifest";
  status: MediaOSStageStatus;
  recommendedNextEngine: string | null;
  renderClaim: string;
  requiredBeforeRender: string[];
  consumesValidatedManifestOnly: boolean;
  warnings: MediaOSWarning[];
}

export interface DistributionManifest {
  contract: "DistributionManifest";
  status: MediaOSStageStatus;
  readyWhen: string;
  destinations: string[];
  warnings: MediaOSWarning[];
}

export interface MediaOSStageBoundary {
  stage: MediaOSStageName;
  producer: string;
  consumes: MediaOSContractName[];
  emits: MediaOSContractName[];
  status: MediaOSStageStatus;
  isolationClaim: string;
}

export interface MediaOSCommandCenterManifest {
  version: "creatorvault.media_command_center.v1";
  sceneCount: number;
  totalDurationSeconds: number;
  scenes: SceneManifest[];
  pacing: PacingManifest;
  voiceover: VoiceoverManifest;
  cloneSequence: CloneSequenceManifest;
  mutations: MutationManifest;
  retention: RetentionReport;
  timeline: TimelineManifest;
  validation: ValidationReport;
  render: RenderManifest;
  distribution: DistributionManifest;
}

export interface MediaOSManifestEnvelope {
  version: "creatorvault.media_os.v1";
  generatedAt: string;
  trailerProjectId: string | null;
  deterministicBasis: string;
  contractCoverage: MediaOSContractName[];
  stageBoundaries: MediaOSStageBoundary[];
  eventLog: import("../events/mediaEvents").MediaOSEventPayload[];
  timelineCommandCenter: MediaOSCommandCenterManifest;
  operationalCommandCenter?: import("./operationalContracts").OperationalCommandCenterManifest;
  validationHandoff: ValidationReport;
  renderHandoff: RenderManifest;
  distributionHandoff: DistributionManifest;
  creatorVaultDeliverySystem?: import("./creatorVaultDeliveryContract").CreatorVaultDeliverySystemContract;
  studioGradeTrailerPackages?: import("./creatorVaultDeliveryContract").CreatorVaultProductPackageInput[];
  brollPackaging?: Record<string, unknown>;
  providerAwareRenderControl?: Record<string, unknown>;
  monetizationSummary?: Record<string, unknown>;
  orchestrationTrace: Array<{
    stage: MediaOSStageName;
    inputContracts: MediaOSContractName[];
    outputContracts: MediaOSContractName[];
    proof: string;
  }>;
  architectureGuards: {
    noGodService: boolean;
    noHiddenProviderCalls: boolean;
    validationIndependent: boolean;
    renderPipelineSeparate: boolean;
    providerRenderBlockedWithoutProof?: boolean;
    brollLineageRequired?: boolean;
      monetizationPackageRequired?: boolean;
      creatorVaultDeliveryContractRequired?: boolean;
      genericMediaOutputBlocked?: boolean;
      deterministicManifestPreserved: boolean;
    existingTrailerRoutePreserved: boolean;
  };
  warnings: MediaOSWarning[];
}

export const MEDIA_OS_CONTRACT_COVERAGE: MediaOSContractName[] = [
  "SceneManifest",
  "TimelineManifest",
  "PacingManifest",
  "RetentionReport",
  "VoiceoverManifest",
  "CloneSequenceManifest",
  "MutationManifest",
  "ValidationReport",
  "RenderManifest",
  "DistributionManifest",
];

export function normalizeWarning(source: string, message: unknown, severity: MediaOSSeverity = "warning"): MediaOSWarning {
  return {
    severity,
    source,
    message: typeof message === "string" ? message : JSON.stringify(message),
  };
}
