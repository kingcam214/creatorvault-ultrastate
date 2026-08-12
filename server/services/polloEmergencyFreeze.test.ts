import { afterEach, describe, expect, it } from "vitest";
import {
  assertLegacyPaidMediaExecutionBlocked,
  assertLegacyPolloExecutionAllowed,
  isLegacyPolloExecutionAllowed,
  LEGACY_PAID_MEDIA_FREEZE_MESSAGE,
  POLLO_EMERGENCY_FREEZE_MESSAGE,
} from "./polloEmergencyFreeze";

const originalExecutionMode = process.env.CREATORVAULT_POLLO_EXECUTION_MODE;
const originalEmergencyFreeze = process.env.CREATORVAULT_POLLO_EMERGENCY_FREEZE;

afterEach(() => {
  if (originalExecutionMode === undefined) {
    delete process.env.CREATORVAULT_POLLO_EXECUTION_MODE;
  } else {
    process.env.CREATORVAULT_POLLO_EXECUTION_MODE = originalExecutionMode;
  }
  if (originalEmergencyFreeze === undefined) {
    delete process.env.CREATORVAULT_POLLO_EMERGENCY_FREEZE;
  } else {
    process.env.CREATORVAULT_POLLO_EMERGENCY_FREEZE = originalEmergencyFreeze;
  }
});

describe("Pollo emergency credit freeze", () => {
  it("blocks every legacy paid submission by default", () => {
    delete process.env.CREATORVAULT_POLLO_EXECUTION_MODE;
    delete process.env.CREATORVAULT_POLLO_EMERGENCY_FREEZE;

    expect(isLegacyPolloExecutionAllowed()).toBe(false);
    expect(() =>
      assertLegacyPolloExecutionAllowed({ operation: "test.default-deny", actorUserId: 33 }),
    ).toThrow(POLLO_EMERGENCY_FREEZE_MESSAGE);
  });

  it.each([
    ["governed", undefined],
    ["governed", "on"],
    ["legacy", "off"],
    [undefined, "off"],
  ])("requires both explicit unlock values (%s, %s)", (mode, freeze) => {
    if (mode === undefined) delete process.env.CREATORVAULT_POLLO_EXECUTION_MODE;
    else process.env.CREATORVAULT_POLLO_EXECUTION_MODE = mode;
    if (freeze === undefined) delete process.env.CREATORVAULT_POLLO_EMERGENCY_FREEZE;
    else process.env.CREATORVAULT_POLLO_EMERGENCY_FREEZE = freeze;

    expect(isLegacyPolloExecutionAllowed()).toBe(false);
  });

  it("never permits legacy Pollo execution, even when governed-mode values are set", () => {
    process.env.CREATORVAULT_POLLO_EXECUTION_MODE = "governed";
    process.env.CREATORVAULT_POLLO_EMERGENCY_FREEZE = "off";

    expect(isLegacyPolloExecutionAllowed()).toBe(false);
    expect(() =>
      assertLegacyPolloExecutionAllowed({ operation: "test.governed-values-still-legacy", actorUserId: 33 }),
    ).toThrow(POLLO_EMERGENCY_FREEZE_MESSAGE);
  });

  it("never permits a legacy paid-media path, even if Pollo override values are set", () => {
    process.env.CREATORVAULT_POLLO_EXECUTION_MODE = "governed";
    process.env.CREATORVAULT_POLLO_EMERGENCY_FREEZE = "off";

    expect(() =>
      assertLegacyPaidMediaExecutionBlocked({ operation: "test.legacy-media", actorUserId: 33 }),
    ).toThrow(LEGACY_PAID_MEDIA_FREEZE_MESSAGE);
  });
});
