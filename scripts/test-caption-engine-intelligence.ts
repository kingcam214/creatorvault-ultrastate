import assert from "node:assert/strict";
import { CAPTION_ENGINE_TEMPLATES } from "../shared/captionEngine";
import { analyzeCaptionTranscript, normalizeCaptionSegments, recommendCaptionTreatmentDecisions } from "../shared/captionEngineIntelligence";

const segments = normalizeCaptionSegments([
  { start: 0, end: 0.9, text: "Stop scrolling right now", words: [
    { text: "Stop", start: 0, end: 0.2 },
    { text: "scrolling", start: 0.22, end: 0.57 },
    { text: "right", start: 0.6, end: 0.72 },
    { text: "now", start: 0.74, end: 0.9 },
  ] },
  { start: 1.55, end: 2.45, text: "This is the first real step" },
  { start: 2.62, end: 3.42, text: "to make your content paid" },
]);
const analysis = analyzeCaptionTranscript({ transcript: segments.map((segment) => segment.text).join(" "), segments, language: "en" });
const decisions = recommendCaptionTreatmentDecisions({ feel: "authority", analysis, templates: CAPTION_ENGINE_TEMPLATES });

assert.equal(segments[0].words?.length, 4);
assert.equal(analysis.language, "en");
assert.equal(analysis.hasHook, true);
assert.ok(analysis.pauses.length >= 1);
assert.equal(decisions.length, 3);
assert.equal(new Set(decisions.map((item) => item.id)).size, 3);
assert.ok(decisions.every((item) => item.reason.length > 25));
console.log(JSON.stringify({ analysis, decisions }, null, 2));
