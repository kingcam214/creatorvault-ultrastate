import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({ db: {} }));
vi.mock("drizzle-orm", () => ({ sql: { raw: (query: string) => query } }));

import {
  buildPolloCapabilitySummary,
  normalizePolloModelCatalog,
  POLLO_CAPABILITY_REGISTRY_AUDIT_POLICY,
  getControlledSourceVideoLadder,
  type PolloCapabilitySnapshot,
} from "./polloCapabilityRegistryService";

describe("Pollo capability registry zero-spend policy", () => {
  it("groups public model rows by canonical provider model and detects source-video capability without granting account access", () => {
    const models = normalizePolloModelCatalog([
      { brand: "pollo-ai", model: "pollo-v3-0", type: "text2video", path: "/v1/generation/pollo-ai/pollo-v3-0/video" },
      { brand: "pollo-ai", model: "pollo-v3-0", type: "ref2video", path: "/v1/generation/pollo-ai/pollo-v3-0/video" },
      { brand: "kling-ai", model: "kling-v3", type: "image2video", path: "/v1/generation/kling-ai/kling-v3/video" },
      { brand: "legacy", model: "deprecated-model", type: "ref2video", path: "/v1/generation/legacy/deprecated/video", deprecated: true },
    ]);

    expect(models).toHaveLength(2);
    const pollo = models.find((model) => model.modelKey === "pollo-ai/pollo-v3-0");
    expect(pollo?.generationTypes).toEqual(["text2video", "ref2video"]);
    expect(pollo?.supportsSourceVideoReference).toBe(true);
    expect(pollo?.accountAccess).toBe("unknown");
    expect(models.some((model) => model.modelKey.includes("deprecated"))).toBe(false);
  });

  it("marks a catalog model enabled only when a read-only account model response explicitly matches it", () => {
    const models = normalizePolloModelCatalog([
      { brand: "pollo-ai", model: "pollo-v3-0", type: "ref2video", path: "/v1/generation/pollo-ai/pollo-v3-0/video" },
      { brand: "alibaba", model: "wan-v2-6", type: "ref2video", path: "/v1/generation/alibaba/wan-v2-6/video" },
    ], new Set(["pollo-ai/pollo-v3-0"]));

    expect(models.find((model) => model.modelKey === "pollo-ai/pollo-v3-0")?.accountAccess).toBe("enabled");
    expect(models.find((model) => model.modelKey === "alibaba/wan-v2-6")?.accountAccess).toBe("disabled");
  });

  it("reports a non-audited provider as unavailable for governed source-video routing", () => {
    expect(buildPolloCapabilitySummary(null)).toEqual({
      state: "not_audited",
      catalogModelCount: 0,
      sourceVideoModelCount: 0,
      enabledSourceVideoModelCount: 0,
      creditBalanceState: "not_audited",
      accountModelAccessState: "not_audited",
    });
  });

  it("keeps the capability audit strictly non-generative", () => {
    expect(POLLO_CAPABILITY_REGISTRY_AUDIT_POLICY).toEqual({
      generationCallsAllowed: false,
      balanceEndpointReadOnly: true,
      modelCatalogReadOnly: true,
      accountModelEndpointReadOnly: true,
      persistedAuditRequiredBeforeSourceVideoExecution: true,
      readOnlyModelEntitlementRequired: false,
      controlledAccessLadderRequired: true,
    });
  });

  it("ranks only documented source-video candidates and never labels unknown pricing as free", () => {
    expect(getControlledSourceVideoLadder()).toEqual([
      expect.objectContaining({ rank: 1, modelKey: "bytedance/seedance-2-5", durationSeconds: 6, resolution: "720p", aspectRatio: "9:16", priceStatus: "price_not_yet_returned" }),
      expect.objectContaining({ rank: 2, modelKey: "kling-ai/kling-v3-omni", durationSeconds: 6, resolution: "720p", aspectRatio: "9:16", priceStatus: "price_not_yet_returned" }),
    ]);
  });

  it("counts only account-enabled reference-video models as actionable", () => {
    const snapshot: PolloCapabilitySnapshot = {
      id: "snapshot-1",
      provider: "pollo",
      state: "ready",
      catalogHash: "a".repeat(64),
      checkedAt: "2026-08-07T00:00:00.000Z",
      account: {
        credentialPresent: true,
        balance: { state: "available", availableCredits: 10, totalCredits: 10, availableAmountUsd: 0.6, totalAmountUsd: 0.6, failureReason: null },
        modelAccess: { state: "available", modelTokens: ["pollo-ai/pollo-v3-0"], failureReason: null },
      },
      warnings: [],
      models: [
        { provider: "pollo", brand: "pollo-ai", model: "pollo-v3-0", modelKey: "pollo-ai/pollo-v3-0", generationTypes: ["ref2video"], apiPaths: ["/v1/generation/pollo-ai/pollo-v3-0/video"], supportsSourceVideoReference: true, accountAccess: "enabled", discoverySource: "public_catalog" },
        { provider: "pollo", brand: "alibaba", model: "wan-v2-6", modelKey: "alibaba/wan-v2-6", generationTypes: ["ref2video"], apiPaths: ["/v1/generation/alibaba/wan-v2-6/video"], supportsSourceVideoReference: true, accountAccess: "disabled", discoverySource: "public_catalog" },
      ],
    };
    expect(buildPolloCapabilitySummary(snapshot)).toMatchObject({
      state: "ready",
      catalogModelCount: 2,
      sourceVideoModelCount: 2,
      enabledSourceVideoModelCount: 1,
    });
  });
});
