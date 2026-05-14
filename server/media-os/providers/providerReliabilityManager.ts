import {
  operationalWarning,
  type ProviderReliabilityManifest,
  type ProviderReliabilityRecord,
} from "../contracts/operationalContracts";

export interface ProviderReliabilityInput {
  voiceoverStatus: string;
  cloneRegistryStatus: string;
  renderStatus: string;
  distributionStatus: string;
  generatedAt: string;
}

function normalizeHealth(status: string): ProviderReliabilityRecord["health"] {
  const value = status.toLowerCase();
  if (value.includes("ready") || value.includes("complete") || value.includes("handoff")) return "healthy";
  if (value.includes("planned") || value.includes("blocked")) return "degraded";
  if (value.includes("failed") || value.includes("unavailable")) return "unavailable";
  return "unknown";
}

function provider(input: Omit<ProviderReliabilityRecord, "warnings">): ProviderReliabilityRecord {
  return {
    ...input,
    warnings: [
      ...(input.health === "unavailable" ? [operationalWarning("providerReliabilityManager", `${input.providerId} is unavailable`, "blocking")] : []),
      ...(input.circuitState === "open" ? [operationalWarning("providerReliabilityManager", `${input.providerId} circuit is open`, "warning")] : []),
      ...(input.fallbackProviderIds.length === 0 && input.health !== "healthy" ? [operationalWarning("providerReliabilityManager", `${input.providerId} has no configured fallback`, "warning")] : []),
    ],
  };
}

export function buildProviderReliabilityManifest(input: ProviderReliabilityInput): ProviderReliabilityManifest {
  const providers: ProviderReliabilityRecord[] = [
    provider({
      providerId: "elevenlabs-tts-primary",
      category: "tts",
      capability: "voiceover_audio_generation",
      health: normalizeHealth(input.voiceoverStatus),
      circuitState: normalizeHealth(input.voiceoverStatus) === "unavailable" ? "open" : "closed",
      averageLatencyMs: 1800,
      timeoutMs: 30000,
      failureCount: 0,
      successCount: normalizeHealth(input.voiceoverStatus) === "healthy" ? 1 : 0,
      fallbackProviderIds: ["creatorvault-forge-tts-fallback"],
      estimatedCostUsd: 0.18,
      lastFailureReason: null,
    }),
    provider({
      providerId: "clone-model-registry",
      category: "clone",
      capability: "production_clone_model_lookup",
      health: normalizeHealth(input.cloneRegistryStatus),
      circuitState: "closed",
      averageLatencyMs: 120,
      timeoutMs: 5000,
      failureCount: 0,
      successCount: 1,
      fallbackProviderIds: ["manual-non-clone-scene-path"],
      estimatedCostUsd: 0,
      lastFailureReason: null,
    }),
    provider({
      providerId: "remotion-render-service",
      category: "render",
      capability: "validated_video_render_boundary",
      health: normalizeHealth(input.renderStatus),
      circuitState: "closed",
      averageLatencyMs: 0,
      timeoutMs: 900000,
      failureCount: 0,
      successCount: 0,
      fallbackProviderIds: ["ffmpeg-safe-render-path"],
      estimatedCostUsd: 0.35,
      lastFailureReason: null,
    }),
    provider({
      providerId: "creatorvault-storage-uploads",
      category: "storage",
      capability: "artifact_retention_and_output_urls",
      health: "healthy",
      circuitState: "closed",
      averageLatencyMs: 45,
      timeoutMs: 10000,
      failureCount: 0,
      successCount: 1,
      fallbackProviderIds: [],
      estimatedCostUsd: 0.02,
      lastFailureReason: null,
    }),
    provider({
      providerId: "future-distribution-targets",
      category: "distribution",
      capability: "post_render_distribution_readiness",
      health: normalizeHealth(input.distributionStatus),
      circuitState: "half_open",
      averageLatencyMs: 0,
      timeoutMs: 15000,
      failureCount: 0,
      successCount: 0,
      fallbackProviderIds: ["creatorvault-project-library"],
      estimatedCostUsd: 0,
      lastFailureReason: input.distributionStatus.toLowerCase().includes("blocked") ? "Distribution waits for validated render output." : null,
    }),
  ];

  return {
    contract: "ProviderReliabilityManifest",
    generatedAt: input.generatedAt,
    providers,
    healthyCount: providers.filter((item) => item.health === "healthy").length,
    degradedCount: providers.filter((item) => item.health === "degraded").length,
    unavailableCount: providers.filter((item) => item.health === "unavailable").length,
    fallbackReadyCount: providers.filter((item) => item.fallbackProviderIds.length > 0).length,
    warnings: providers.flatMap((item) => item.warnings),
  };
}

