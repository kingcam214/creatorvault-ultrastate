export type CaptionWord = {
  text: string;
  start: number;
  end: number;
  confidence?: number | null;
  speaker?: string | null;
};

export type CaptionSegment = {
  id?: string;
  start: number;
  end: number;
  text: string;
  words?: CaptionWord[];
  confidence?: number | null;
  speaker?: string | null;
};

export type CaptionPacing = "calm" | "balanced" | "quick" | "rapid";
export type CaptionEnergy = "low" | "medium" | "high";

export type CaptionTranscriptAnalysis = {
  language: string | null;
  languageSource: "provider" | "heuristic" | "unknown";
  wordCount: number;
  durationSeconds: number;
  wordsPerMinute: number;
  pacing: CaptionPacing;
  energy: CaptionEnergy;
  hasHook: boolean;
  hookText: string;
  keywords: string[];
  topics: string[];
  pauses: Array<{ afterSeconds: number; durationSeconds: number }>;
  estimatedSpeakerCount: number;
  confidence: number | null;
  transcriptQuality: "strong" | "review" | "weak";
  warnings: string[];
};

export type CaptionTreatmentDecision = {
  id: string;
  score: number;
  reason: string;
  pacing: CaptionPacing;
  emphasis: "light" | "focused" | "strong";
};

export type CaptionTemplateLike = {
  id: string;
  title: string;
  bestFor: readonly string[];
  energy: number;
  maxWords: number;
  timing: "word" | "phrase" | "sentence" | "beat";
  family: string;
  activeWordBehavior: string;
};

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "get", "have", "i", "if", "in", "is", "it", "just", "like", "me", "my", "not", "of", "on", "or", "our", "so", "that", "the", "this", "to", "we", "with", "you", "your",
]);

const TOPIC_SIGNALS: Array<{ topic: string; words: string[] }> = [
  { topic: "teaching", words: ["how", "step", "learn", "lesson", "because", "tip", "first", "second"] },
  { topic: "story", words: ["when", "then", "remember", "happened", "story", "before", "after"] },
  { topic: "authority", words: ["truth", "rule", "must", "never", "real", "listen", "period"] },
  { topic: "money", words: ["money", "paid", "price", "income", "revenue", "sale", "earn"] },
  { topic: "emotion", words: ["feel", "heart", "love", "hurt", "proud", "afraid", "hope"] },
  { topic: "comedy", words: ["funny", "laugh", "crazy", "joke", "wild", "wait"] },
];

function bounded(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanWord(value: unknown): string {
  return cleanText(value).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function deriveCaptionWords(segment: CaptionSegment): CaptionWord[] {
  const supplied = Array.isArray(segment.words) ? segment.words : [];
  const valid = supplied
    .map((word) => ({
      text: cleanText(word.text),
      start: Math.max(segment.start, toNumber(word.start)),
      end: Math.max(segment.start, toNumber(word.end)),
      confidence: word.confidence ?? null,
      speaker: word.speaker ?? segment.speaker ?? null,
    }))
    .filter((word) => word.text && word.end > word.start);
  if (valid.length) return valid;

  const words = cleanText(segment.text).split(/\s+/).filter(Boolean);
  const span = Math.max(0.12, segment.end - segment.start);
  return words.map((text, index) => ({
    text,
    start: segment.start + (span * index) / words.length,
    end: segment.start + (span * (index + 1)) / words.length,
    confidence: segment.confidence ?? null,
    speaker: segment.speaker ?? null,
  }));
}

export function normalizeCaptionSegments(input: CaptionSegment[]): CaptionSegment[] {
  return input
    .map((segment, index) => {
      const start = Math.max(0, toNumber(segment.start));
      const end = Math.max(start + 0.08, toNumber(segment.end));
      const text = cleanText(segment.text);
      const words = deriveCaptionWords({ ...segment, start, end, text });
      return {
        id: segment.id || `segment-${index + 1}`,
        start,
        end,
        text: words.map((word) => word.text).join(" ").replace(/\s+([,.!?;:])/g, "$1"),
        words,
        confidence: segment.confidence ?? null,
        speaker: segment.speaker ?? null,
      };
    })
    .filter((segment) => segment.text && segment.end > segment.start)
    .sort((left, right) => left.start - right.start || left.end - right.end);
}

export function analyzeCaptionTranscript(input: {
  transcript: string;
  segments: CaptionSegment[];
  language?: string | null;
}): CaptionTranscriptAnalysis {
  const segments = normalizeCaptionSegments(input.segments);
  const words = segments.flatMap(deriveCaptionWords);
  const transcript = cleanText(input.transcript || segments.map((segment) => segment.text).join(" "));
  const firstStart = segments[0]?.start ?? 0;
  const finalEnd = segments.at(-1)?.end ?? firstStart;
  const durationSeconds = Math.max(0.01, finalEnd - firstStart);
  const wordsPerMinute = Math.round((words.length / durationSeconds) * 60);
  const pacing: CaptionPacing = wordsPerMinute >= 190 ? "rapid" : wordsPerMinute >= 150 ? "quick" : wordsPerMinute >= 95 ? "balanced" : "calm";
  const emphasisCount = (transcript.match(/[!?!]/g) || []).length;
  const energy: CaptionEnergy = pacing === "rapid" || emphasisCount >= 3 ? "high" : pacing === "quick" || emphasisCount >= 1 ? "medium" : "low";
  const hookWords = words.filter((word) => word.end <= firstStart + 2.8).map((word) => word.text);
  const hookText = cleanText(hookWords.join(" "));
  const hasHook = hookWords.length >= 3 && (/\?|!|\b(?:stop|wait|listen|watch|never|here|this|you)\b/i.test(hookText) || hookWords.length >= 8);
  const normalizedWords = words.map((word) => cleanWord(word.text).toLowerCase()).filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
  const frequency = new Map<string, number>();
  normalizedWords.forEach((word) => frequency.set(word, (frequency.get(word) || 0) + 1));
  const keywords = [...frequency.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, 8).map(([word]) => word);
  const source = normalizedWords.join(" ");
  const topics = TOPIC_SIGNALS.filter((signal) => signal.words.some((word) => new RegExp(`\\b${word}\\b`, "i").test(source))).map((signal) => signal.topic);
  const pauses = segments.slice(0, -1).map((segment, index) => ({ afterSeconds: segment.end, durationSeconds: Math.max(0, segments[index + 1].start - segment.end) })).filter((pause) => pause.durationSeconds >= 0.55);
  const explicitSpeakers = new Set(segments.map((segment) => segment.speaker).filter(Boolean));
  const confidences = words.map((word) => word.confidence).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const confidence = confidences.length ? Math.round((confidences.reduce((sum, value) => sum + value, 0) / confidences.length) * 100) / 100 : null;
  const warnings: string[] = [];
  if (!words.length) warnings.push("No timed words are available yet.");
  if (wordsPerMinute > 250) warnings.push("This delivery is very fast; use shorter caption groups.");
  if (confidence !== null && confidence < 0.72) warnings.push("The transcript confidence is low enough to require a careful word review.");
  if (segments.some((segment) => segment.end - segment.start > 4.5)) warnings.push("One or more caption groups stay on screen too long; review grouping before export.");
  const transcriptQuality: CaptionTranscriptAnalysis["transcriptQuality"] = !words.length || (confidence !== null && confidence < 0.55) ? "weak" : warnings.length ? "review" : "strong";
  const providerLanguage = cleanText(input.language);
  return {
    language: providerLanguage || null,
    languageSource: providerLanguage ? "provider" : /[áéíóúñ¿¡]/i.test(transcript) ? "heuristic" : transcript ? "unknown" : "unknown",
    wordCount: words.length,
    durationSeconds: Math.round(durationSeconds * 100) / 100,
    wordsPerMinute,
    pacing,
    energy,
    hasHook,
    hookText,
    keywords,
    topics,
    pauses,
    estimatedSpeakerCount: explicitSpeakers.size || 1,
    confidence,
    transcriptQuality,
    warnings,
  };
}

export function recommendCaptionTreatmentDecisions(input: {
  feel: string;
  analysis: CaptionTranscriptAnalysis;
  templates: CaptionTemplateLike[];
}): CaptionTreatmentDecision[] {
  const feel = cleanText(input.feel).toLowerCase();
  const { analysis } = input;
  const topicSet = new Set(analysis.topics);
  return input.templates
    .map((template) => {
      let score = template.bestFor.includes(feel) ? 100 : 0;
      score += template.energy * 5;
      if (analysis.pacing === "rapid" && (template.timing === "word" || template.maxWords <= 3)) score += 28;
      if (analysis.pacing === "calm" && (template.timing === "sentence" || template.maxWords >= 7)) score += 22;
      if (analysis.energy === "high" && template.energy >= 4) score += 16;
      if (analysis.energy === "low" && template.energy <= 2) score += 14;
      if (topicSet.has("teaching") && ["specialized", "creator_talking_head"].includes(template.family)) score += 18;
      if (topicSet.has("story") && ["premium_cinematic", "creator_talking_head"].includes(template.family)) score += 18;
      if (topicSet.has("comedy") && template.energy >= 4) score += 12;
      if (analysis.hasHook && ["word_pop", "keyword_blast", "punch"].includes(template.activeWordBehavior)) score += 11;
      const focus = analysis.pacing === "rapid" ? "short groups so fast words stay readable" : analysis.hasHook ? "a stronger opening treatment for the first spoken idea" : analysis.energy === "low" ? "a calmer treatment that lets the thought breathe" : "a balanced treatment that follows the way this source is spoken";
      return {
        id: template.id,
        score,
        reason: `${template.title} fits ${focus}${analysis.keywords[0] ? `, especially around “${analysis.keywords[0]}”.` : "."}`,
        pacing: analysis.pacing,
        emphasis: template.energy >= 4 ? "strong" : template.energy >= 3 ? "focused" : "light",
      } as CaptionTreatmentDecision;
    })
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, 3);
}
