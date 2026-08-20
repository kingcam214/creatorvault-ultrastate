import assert from "node:assert/strict";
import { buildCaptionDisplayGroups, resolveCaptionPlatformProfile } from "../shared/captionEnginePresentation";

const segments = [{
  start: 0,
  end: 2.4,
  text: "Every word in this line needs room to breathe.",
  words: [
    { text: "Every", start: 0, end: .25 },
    { text: "word", start: .28, end: .46 },
    { text: "in", start: .49, end: .57 },
    { text: "this", start: .60, end: .75 },
    { text: "line", start: .78, end: .96 },
    { text: "needs", start: .99, end: 1.2 },
    { text: "room", start: 1.23, end: 1.42 },
    { text: "to", start: 1.45, end: 1.54 },
    { text: "breathe.", start: 1.57, end: 2.1 },
  ],
}];
const rapidGroups = buildCaptionDisplayGroups({ segments, maxWords: 3, timing: "phrase" });
const sentenceGroups = buildCaptionDisplayGroups({ segments, maxWords: 9, timing: "sentence" });
const tiktok = resolveCaptionPlatformProfile({ profile: "tiktok", safeZone: "platform_safe", width: 1080, height: 1920 });
const square = resolveCaptionPlatformProfile({ safeZone: "square", width: 1080, height: 1080 });

assert.ok(rapidGroups.length >= 3);
assert.ok(rapidGroups.every((group) => group.words.length <= 3));
assert.equal(sentenceGroups.length, 1);
assert.equal(tiktok.bottom, .27);
assert.equal(square.profile, "instagram_square");
console.log(JSON.stringify({ rapidGroups, sentenceGroups, tiktok, square }, null, 2));
