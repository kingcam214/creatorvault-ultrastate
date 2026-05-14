import {
  operationalWarning,
  type CostGovernanceManifest,
  type CostLineItem,
  type JobQueueSnapshot,
  type ProviderReliabilityManifest,
} from "../contracts/operationalContracts";

function guard(cost: number, budget: number): CostLineItem["budgetGuard"] {
  if (cost > budget) return "blocked";
  if (cost > budget * 0.8) return "warning";
  return "within_budget";
}

export function buildMediaCostGovernance(input: {
  generatedAt: string;
  jobs: JobQueueSnapshot;
  providers: ProviderReliabilityManifest;
  budgetLimitUsd?: number;
}): CostGovernanceManifest {
  const budgetLimitUsd = input.budgetLimitUsd ?? 5;
  const providerItems: CostLineItem[] = input.providers.providers.map((provider) => ({
    itemId: `provider-cost:${provider.providerId}`,
    category: "provider",
    description: `${provider.capability} via ${provider.providerId}`,
    estimatedCostUsd: provider.estimatedCostUsd,
    budgetGuard: guard(provider.estimatedCostUsd, budgetLimitUsd),
  }));
  const retryExposureUsd = input.jobs.jobs.reduce((sum, job) => sum + Math.max(0, job.retryPolicy.maxAttempts - job.retryPolicy.attempt) * 0.05, 0);
  const failureExposureUsd = input.jobs.failedCount * 0.1 + input.jobs.deadLetterCount * 0.2;
  const lineItems: CostLineItem[] = [
    ...providerItems,
    { itemId: "retry-exposure", category: "retry", description: "Reserved retry budget for pending media jobs", estimatedCostUsd: retryExposureUsd, budgetGuard: guard(retryExposureUsd, budgetLimitUsd) },
    { itemId: "failure-exposure", category: "failure", description: "Visible failure and dead-letter recovery exposure", estimatedCostUsd: failureExposureUsd, budgetGuard: guard(failureExposureUsd, budgetLimitUsd) },
    { itemId: "storage-retention", category: "storage", description: "Manifest and artifact retention overhead", estimatedCostUsd: 0.03, budgetGuard: "within_budget" },
  ];
  const estimatedTotalUsd = lineItems.reduce((sum, item) => sum + item.estimatedCostUsd, 0);
  const blockedByBudget = estimatedTotalUsd > budgetLimitUsd || lineItems.some((item) => item.budgetGuard === "blocked");

  return {
    contract: "CostGovernanceManifest",
    generatedAt: input.generatedAt,
    budgetLimitUsd,
    estimatedTotalUsd,
    retryExposureUsd,
    failureExposureUsd,
    blockedByBudget,
    lineItems,
    warnings: [
      ...(blockedByBudget ? [operationalWarning("mediaCostGovernance", "Estimated operational media cost exceeds configured budget", "blocking")] : []),
      ...(estimatedTotalUsd > budgetLimitUsd * 0.8 && !blockedByBudget ? [operationalWarning("mediaCostGovernance", "Estimated operational media cost is approaching budget", "warning")] : []),
    ],
  };
}

