import { describe, expect, it } from "vitest";
import {
  classifyBodyCinemaProviderFailure,
  isBodyCinemaProviderSubmissionAllowed,
  resolveBodyCinemaFailureState,
  type BodyCinemaProviderHealthShape,
} from "./bodyCinemaProviderResiliencePolicy";

const baseHealth: BodyCinemaProviderHealthShape = {
  providerKey: "runway_aleph",
  healthStatus: "healthy",
  circuitState: "closed",
  lastFailureCode: null,
  lastFailureDetail: null,
  failureCount: 0,
  retryNotBefore: null,
  lastProbeAt: null,
  lastRecoveredAt: null,
  updatedAt: "2026-08-16T00:00:00.000Z",
};

describe("Body Cinema provider resilience", () => {
  it("opens the circuit after an availability outage so a second blind paid call cannot be selected", () => {
    const code = classifyBodyCinemaProviderFailure({ detail: "Services temporarily unavailable" });
    const state = resolveBodyCinemaFailureState(code);

    expect(code).toBe("submission_timeout_no_task");
    expect(state.healthStatus).toBe("unavailable");
    expect(state.circuitState).toBe("open");
    expect(state.retryNotBefore).toBeTruthy();
    expect(isBodyCinemaProviderSubmissionAllowed({ ...baseHealth, ...state })).toBe(false);
  });

  it("holds a workspace-limited route until a real capacity recovery is recorded", () => {
    const code = classifyBodyCinemaProviderFailure({ detail: "Runway workspace limit reached" });
    const state = resolveBodyCinemaFailureState(code);

    expect(code).toBe("workspace_limit");
    expect(state.healthStatus).toBe("unavailable");
    expect(state.circuitState).toBe("open");
    expect(state.retryNotBefore).toBeNull();
    expect(isBodyCinemaProviderSubmissionAllowed({ ...baseHealth, ...state })).toBe(false);
  });

  it("keeps a plan gate closed until the account entitlement is repaired", () => {
    const code = classifyBodyCinemaProviderFailure({ detail: "Aleph is not available in this workspace plan" });
    const state = resolveBodyCinemaFailureState(code);

    expect(code).toBe("plan_gate");
    expect(state.healthStatus).toBe("unavailable");
    expect(state.circuitState).toBe("open");
    expect(state.retryNotBefore).toBeNull();
  });

  it("does not falsely blame the provider for a broken or unsigned source link", () => {
    const code = classifyBodyCinemaProviderFailure({ detail: "Asset invalid: signed source URL is required" });
    const state = resolveBodyCinemaFailureState(code);

    expect(code).toBe("asset_contract");
    expect(state.circuitState).toBe("closed");
    expect(state.healthStatus).toBe("unknown");
  });

  it("holds a visually weak result even when the provider returned a file", () => {
    const code = classifyBodyCinemaProviderFailure({ detail: "quality rejection: body anatomy drift and stiff movement" });
    const state = resolveBodyCinemaFailureState(code);

    expect(code).toBe("quality_rejection");
    expect(state.healthStatus).toBe("degraded");
    expect(state.circuitState).toBe("open");
  });

  it("keeps an unprovisioned CreatorVault VACE worker out of routing until a real GPU health check exists", () => {
    expect(isBodyCinemaProviderSubmissionAllowed({
      ...baseHealth,
      providerKey: "creatorvault_vace",
      healthStatus: "disabled",
      circuitState: "open",
      lastFailureCode: "manual_hold",
    })).toBe(false);
  });
});
