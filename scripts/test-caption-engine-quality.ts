import assert from "node:assert/strict";
import { evaluateCaptionQuality, resolveCollisionAwarePlacement } from "../shared/captionEngineQuality";

const focusRegions = [{ id: "speaker", x: .08, y: .56, width: .84, height: .26, label: "speaker", source: "creator_marked" as const }];
const placement = resolveCollisionAwarePlacement({ preferred: "adaptive", profile: "tiktok", width: 1080, height: 1920, focusRegions });
const strictQuality = evaluateCaptionQuality({
  segments: [{ start: 0, end: 2, text: "This line is readable against the dark treatment." }],
  profile: "tiktok",
  preferredPlacement: "adaptive",
  focusRegions,
  width: 1080,
  height: 1920,
  textColor: "#FFFFFF",
  backgroundColor: "#0A0A0A",
  strict: true,
});
const blockedQuality = evaluateCaptionQuality({
  segments: [{ start: 0, end: 2, text: "A short line." }],
  profile: "tiktok",
  preferredPlacement: "adaptive",
  focusRegions: [{ id: "full", x: 0, y: 0, width: 1, height: 1, source: "creator_marked" as const }],
  width: 1080,
  height: 1920,
  textColor: "#777777",
  backgroundColor: "#666666",
  strict: true,
});

assert.equal(placement.placement, "top");
assert.notEqual(strictQuality.status, "blocked");
assert.equal(blockedQuality.status, "blocked");
assert.ok(blockedQuality.issues.some((issue) => issue.code === "low_contrast"));
assert.ok(blockedQuality.issues.some((issue) => issue.code === "focus_collision"));
console.log(JSON.stringify({ placement, strictQuality, blockedQuality }, null, 2));
