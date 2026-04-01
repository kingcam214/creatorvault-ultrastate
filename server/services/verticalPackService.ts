/**
 * VERTICAL PACK SERVICE
 * 
 * The engine behind the "YouTube Educator Launch Pack v1" and all future vertical packs.
 * One call. One vertical. Six artifacts. All real.
 * 
 * This service orchestrates:
 * 1. Social Audit Summary (via socialMediaAudit service)
 * 2. Flagship Trailer Script (via kingcamScriptGenerator with educator preset)
 * 3. 3x Short Teaser Scripts (via invokeRealGPT with educator tone)
 * 4. Launch Deck Outline (via invokeRealGPT with educator deck order)
 * 5. Landing Page Copy Block (via invokeRealGPT with educator copy preset)
 * 6. DM / Email Script (via invokeRealGPT with educator DM template)
 */

import { invokeRealGPT } from "../_core/llm";
import { generateKingCamScript } from "./kingcamScriptGenerator";
import { runSocialMediaAudit } from "./socialMediaAudit";
import {
  getVerticalConfig,
  VerticalId,
  VerticalConfig,
} from "./verticalConfig";

// ============================================================
// OUTPUT INTERFACES
// ============================================================

export interface SocialAuditArtifact {
  type: "SOCIAL_AUDIT_SUMMARY";
  profiles: Array<{
    platform: string;
    username: string;
    followers: number;
    engagementRate: number;
  }>;
  monetizationScore: number;
  topRecommendation: string;
  fullSummary: string;
  verticalFocus: string;
}

export interface TrailerScriptArtifact {
  type: "FLAGSHIP_TRAILER";
  title: string;
  totalDurationSeconds: number;
  pacingStyle: string;
  segments: Array<{
    sceneIndex: number;
    text: string;
    visualDescription: string;
    duration: number;
  }>;
  openingHook: string;
  closingCTA: string;
}

export interface TeaserClipsArtifact {
  type: "SHORT_TEASER_CLIPS";
  clips: Array<{
    clipNumber: number;
    title: string;
    durationSeconds: number;
    hook: string;
    body: string;
    cta: string;
    platform: string;
  }>;
}

export interface LaunchDeckArtifact {
  type: "LAUNCH_DECK";
  deckTitle: string;
  slideCount: number;
  slides: Array<{
    slideNumber: number;
    title: string;
    headline: string;
    bodyPoints: string[];
    visualNote: string;
  }>;
  colorScheme: string;
  toneLabel: string;
}

export interface LandingPageArtifact {
  type: "LANDING_PAGE_BLOCK";
  heroHeadline: string;
  subheadline: string;
  bullets: string[];
  ctaText: string;
  socialProofLine: string;
  fullCopyBlock: string;
}

export interface DMEmailArtifact {
  type: "DM_EMAIL_SCRIPT";
  dmScript: string;
  emailSubject: string;
  emailBody: string;
  followUpDM: string;
}

export type HeroArtifact =
  | SocialAuditArtifact
  | TrailerScriptArtifact
  | TeaserClipsArtifact
  | LaunchDeckArtifact
  | LandingPageArtifact
  | DMEmailArtifact;

export interface VerticalPackResult {
  packId: string;
  verticalId: VerticalId;
  packName: string;
  creatorHandle: string;
  platform: string;
  generatedAt: string;
  artifacts: HeroArtifact[];
  artifactCount: number;
  errors: string[];
}

// ============================================================
// INPUT INTERFACE
// ============================================================

export interface VerticalPackInput {
  userId: string | number;
  verticalId: VerticalId;
  creatorHandle: string;
  platform: "youtube" | "tiktok" | "instagram" | "twitter";
  courseTopic?: string;       // For YOUTUBE_EDUCATOR: what the course is about
  targetAudience?: string;    // Who the creator teaches
  pricePoint?: string;        // Course price (e.g., "$297", "Free + upsell")
  credibilityProof?: string;  // Their biggest result / proof point
  existingFollowers?: number; // Known follower count (skip scrape if provided)
}

// ============================================================
// MAIN PACK RUNNER
// ============================================================

export async function runVerticalPack(input: VerticalPackInput): Promise<VerticalPackResult> {
  const config = getVerticalConfig(input.verticalId);
  const packId = `pack_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const errors: string[] = [];
  const artifacts: HeroArtifact[] = [];

  console.log(`[VerticalPack] Starting ${config.packName} for @${input.creatorHandle}`);

  // Run all 6 artifacts — collect errors but don't abort
  const [audit, trailer, teasers, deck, landing, dm] = await Promise.allSettled([
    buildSocialAudit(input, config),
    buildTrailerScript(input, config),
    buildTeaserClips(input, config),
    buildLaunchDeck(input, config),
    buildLandingPage(input, config),
    buildDMEmailScript(input, config),
  ]);

  if (audit.status === "fulfilled") artifacts.push(audit.value);
  else errors.push(`Social Audit: ${audit.reason?.message || "failed"}`);

  if (trailer.status === "fulfilled") artifacts.push(trailer.value);
  else errors.push(`Flagship Trailer: ${trailer.reason?.message || "failed"}`);

  if (teasers.status === "fulfilled") artifacts.push(teasers.value);
  else errors.push(`Teaser Clips: ${teasers.reason?.message || "failed"}`);

  if (deck.status === "fulfilled") artifacts.push(deck.value);
  else errors.push(`Launch Deck: ${deck.reason?.message || "failed"}`);

  if (landing.status === "fulfilled") artifacts.push(landing.value);
  else errors.push(`Landing Page: ${landing.reason?.message || "failed"}`);

  if (dm.status === "fulfilled") artifacts.push(dm.value);
  else errors.push(`DM/Email Script: ${dm.reason?.message || "failed"}`);

  console.log(`[VerticalPack] Completed ${config.packName}: ${artifacts.length}/6 artifacts, ${errors.length} errors`);

  return {
    packId,
    verticalId: input.verticalId,
    packName: config.packName,
    creatorHandle: input.creatorHandle,
    platform: input.platform,
    generatedAt: new Date().toISOString(),
    artifacts,
    artifactCount: artifacts.length,
    errors,
  };
}

// ============================================================
// ARTIFACT BUILDERS
// ============================================================

async function buildSocialAudit(
  input: VerticalPackInput,
  config: VerticalConfig
): Promise<SocialAuditArtifact> {
  const userId = String(input.userId);
  const auditResult = await runSocialMediaAudit(userId, [
    { platform: input.platform, username: input.creatorHandle },
  ]);

  const profile = auditResult.profiles?.[0];
  const followers = profile?.followers ?? input.existingFollowers ?? 0;
  const engagementRate = profile?.engagementRate ?? 0;

  // Build vertical-specific summary framing
  const summaryPrompt = `You are RealGPT analyzing a creator audit for the ${config.displayName} vertical.

Creator: @${input.creatorHandle} on ${input.platform}
Followers: ${followers.toLocaleString()}
Engagement Rate: ${engagementRate.toFixed(2)}%
Monetization Score: ${auditResult.monetizationScore ?? 0}/100
Vertical Focus: ${config.auditPreset.summaryFraming}
Monetization Angle: ${config.auditPreset.monetizationAngle}

Write a 3-paragraph audit summary:
1. What they're doing well (specific, based on their numbers)
2. The #1 gap holding them back from ${config.auditPreset.monetizationAngle}
3. The single most important action to take first

Be direct. No fluff. Use specific numbers. KingCam voice.`;

  const summaryResult = await invokeRealGPT({
    userMessage: summaryPrompt,
    mode: "Realist",
  });

  return {
    type: "SOCIAL_AUDIT_SUMMARY",
    profiles: [
      {
        platform: input.platform,
        username: input.creatorHandle,
        followers,
        engagementRate,
      },
    ],
    monetizationScore: auditResult.monetizationScore ?? 0,
    topRecommendation: auditResult.recommendations?.[0] ?? config.auditPreset.summaryFraming,
    fullSummary: summaryResult.content ?? "",
    verticalFocus: config.auditPreset.summaryFraming,
  };
}

async function buildTrailerScript(
  input: VerticalPackInput,
  config: VerticalConfig
): Promise<TrailerScriptArtifact> {
  const preset = config.trailerPreset;
  const topic = input.courseTopic ?? `${config.displayName} mastery`;

  const script = await generateKingCamScript(topic, {
    sector: "general",
    targetDuration: preset.totalDurationSeconds,
    sceneCount: Math.floor(preset.totalDurationSeconds / preset.sceneDurationSeconds),
    tone: "educational",
  });

  // Build opening hook and closing CTA based on preset
  const hookPrompt = `Write a ${preset.openingHookType === "problem_statement" ? "problem-statement" : "bold-claim"} opening hook for a ${preset.totalDurationSeconds}-second trailer for a ${config.displayName} named @${input.creatorHandle} who teaches ${topic}. 
Target audience: ${input.targetAudience ?? "aspiring creators"}.
Max 2 sentences. Direct. No fluff. KingCam voice.`;

  const ctaPrompt = `Write a ${preset.closingCTAStyle} closing CTA for a ${config.displayName} trailer. 
Course topic: ${topic}. Price: ${input.pricePoint ?? "check the link"}.
Max 1 sentence. Urgent. Direct.`;

  const [hookResult, ctaResult] = await Promise.all([
    invokeRealGPT({ userMessage: hookPrompt, mode: "Lion" }),
    invokeRealGPT({ userMessage: ctaPrompt, mode: "KingCam" }),
  ]);

  return {
    type: "FLAGSHIP_TRAILER",
    title: script.title,
    totalDurationSeconds: preset.totalDurationSeconds,
    pacingStyle: preset.pacingStyle,
    segments: script.segments.map((seg) => ({
      sceneIndex: seg.sceneIndex,
      text: seg.text,
      visualDescription: seg.visualDescription,
      duration: seg.duration,
    })),
    openingHook: hookResult.content ?? "",
    closingCTA: ctaResult.content ?? "",
  };
}

async function buildTeaserClips(
  input: VerticalPackInput,
  config: VerticalConfig
): Promise<TeaserClipsArtifact> {
  const topic = input.courseTopic ?? `${config.displayName} mastery`;
  const audience = input.targetAudience ?? "aspiring creators";
  const duration = config.teaserDurationSeconds;

  const teaserPrompt = `Generate ${config.teaserCount} short-form teaser clip scripts for @${input.creatorHandle}, a ${config.displayName} who teaches ${topic}.

Each clip is ${duration} seconds. Target audience: ${audience}.
Tone: ${config.copyPreset.tone}
Voice rules: ${config.copyPreset.voiceRules.join(", ")}

Return JSON array with this structure:
[
  {
    "clipNumber": 1,
    "title": "Clip title for internal reference",
    "hook": "Opening 5-second hook (must stop the scroll)",
    "body": "Main content (${Math.floor(duration * 0.7)} seconds worth)",
    "cta": "Closing call to action (${Math.floor(duration * 0.15)} seconds)",
    "platform": "youtube_shorts"
  }
]

Make each clip different — different angles, different hooks, different CTAs. All must be real, specific, no generic motivational phrases.`;

  const result = await invokeRealGPT({
    userMessage: teaserPrompt,
    mode: "KingCam",
  });

  let clips: TeaserClipsArtifact["clips"] = [];
  try {
    const contentStr = result.content ?? "[]";
    const jsonMatch = contentStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      clips = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fallback: parse as text
    clips = [
      {
        clipNumber: 1,
        title: `${topic} Teaser 1`,
        durationSeconds: duration,
        hook: result.content?.slice(0, 100) ?? "",
        body: result.content?.slice(100, 300) ?? "",
        cta: `Learn more at CreatorVault`,
        platform: "youtube_shorts",
      },
    ];
  }

  // Ensure durationSeconds is set
  clips = clips.map((c, i) => ({ ...c, clipNumber: i + 1, durationSeconds: duration }));

  return {
    type: "SHORT_TEASER_CLIPS",
    clips,
  };
}

async function buildLaunchDeck(
  input: VerticalPackInput,
  config: VerticalConfig
): Promise<LaunchDeckArtifact> {
  const preset = config.deckPreset;
  const topic = input.courseTopic ?? `${config.displayName} mastery`;
  const proof = input.credibilityProof ?? "proven results with real students";

  const deckPrompt = `Build a complete launch deck outline for @${input.creatorHandle}, a ${config.displayName} selling a course on ${topic}.

Slide order to follow: ${preset.slideOrder.join(" → ")}
Tone: ${preset.toneLabel}
Focus areas: ${preset.focusAreas.join(", ")}
Credibility proof: ${proof}
Price point: ${input.pricePoint ?? "premium"}
Target audience: ${input.targetAudience ?? "aspiring creators"}
CTA slide text: ${preset.ctaSlideText}

Return JSON array with this structure:
[
  {
    "slideNumber": 1,
    "title": "Slide section name",
    "headline": "The main headline for this slide",
    "bodyPoints": ["Point 1", "Point 2", "Point 3"],
    "visualNote": "What should be shown visually on this slide"
  }
]

Be specific. Use real language. No generic filler. Every slide must earn its place.`;

  const result = await invokeRealGPT({
    userMessage: deckPrompt,
    mode: "Architect",
  });

  let slides: LaunchDeckArtifact["slides"] = [];
  try {
    const contentStr = result.content ?? "[]";
    const jsonMatch = contentStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      slides = JSON.parse(jsonMatch[0]);
    }
  } catch {
    slides = preset.slideOrder.map((title, i) => ({
      slideNumber: i + 1,
      title,
      headline: `${title} — ${topic}`,
      bodyPoints: ["Content to be filled in"],
      visualNote: "Visual to be determined",
    }));
  }

  return {
    type: "LAUNCH_DECK",
    deckTitle: `${input.creatorHandle} — ${topic} Launch Deck`,
    slideCount: slides.length,
    slides,
    colorScheme: preset.colorScheme,
    toneLabel: preset.toneLabel,
  };
}

async function buildLandingPage(
  input: VerticalPackInput,
  config: VerticalConfig
): Promise<LandingPageArtifact> {
  const preset = config.copyPreset;
  const topic = input.courseTopic ?? `${config.displayName} mastery`;
  const audience = input.targetAudience ?? "aspiring creators";
  const proof = input.credibilityProof ?? "proven results";
  const price = input.pricePoint ?? "premium pricing";

  const landingPrompt = `Write a complete landing page copy block for @${input.creatorHandle}'s course on ${topic}.

Target audience: ${audience}
Credibility proof: ${proof}
Price: ${price}
Tone: ${preset.tone}
Voice rules: ${preset.voiceRules.join("; ")}

Return JSON with this structure:
{
  "heroHeadline": "The main headline (max 10 words, problem or transformation focused)",
  "subheadline": "Supporting line with proof point (max 20 words)",
  "bullets": ["✓ Benefit 1", "✓ Benefit 2", "✓ Benefit 3", "✓ Benefit 4"],
  "ctaText": "CTA button text (max 5 words)",
  "socialProofLine": "One line of social proof (e.g., '247 students enrolled')",
  "fullCopyBlock": "Full above-the-fold copy section (3-4 paragraphs, no fluff, direct)"
}

Use specific numbers. Lead with the problem. No generic motivational phrases.`;

  const result = await invokeRealGPT({
    userMessage: landingPrompt,
    mode: "Realist",
  });

  let parsed: Partial<LandingPageArtifact> = {};
  try {
    const contentStr = result.content ?? "{}";
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    parsed = {};
  }

  return {
    type: "LANDING_PAGE_BLOCK",
    heroHeadline: parsed.heroHeadline ?? preset.landingHeroHeadline,
    subheadline: parsed.subheadline ?? preset.landingSubheadline,
    bullets: parsed.bullets ?? preset.landingBullets,
    ctaText: parsed.ctaText ?? preset.landingCTA,
    socialProofLine: parsed.socialProofLine ?? "Join creators already inside",
    fullCopyBlock: parsed.fullCopyBlock ?? result.content ?? "",
  };
}

async function buildDMEmailScript(
  input: VerticalPackInput,
  config: VerticalConfig
): Promise<DMEmailArtifact> {
  const preset = config.copyPreset;
  const topic = input.courseTopic ?? `${config.displayName} mastery`;
  const audience = input.targetAudience ?? "aspiring creators";
  const proof = input.credibilityProof ?? "proven results";
  const price = input.pricePoint ?? "premium";

  const dmPrompt = `Write outreach scripts for @${input.creatorHandle}'s ${topic} course.

Target audience: ${audience}
Proof: ${proof}
Price: ${price}
Tone: ${preset.tone}
Voice rules: ${preset.voiceRules.join("; ")}

DM template to adapt: ${preset.dmTemplate}
Email subject template: ${preset.emailSubjectTemplate}

Return JSON with this structure:
{
  "dmScript": "Complete DM script (under 150 words, direct, specific, no fluff)",
  "emailSubject": "Email subject line (specific, curiosity-driven, no clickbait)",
  "emailBody": "Full email body (3-4 paragraphs, proof-first, clear CTA at end)",
  "followUpDM": "48-hour follow-up DM if no response (under 50 words)"
}

Use real language. No 'I hope this finds you well'. No generic opener. Get to the point.`;

  const result = await invokeRealGPT({
    userMessage: dmPrompt,
    mode: "Lion",
  });

  let parsed: Partial<DMEmailArtifact> = {};
  try {
    const contentStr = result.content ?? "{}";
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    parsed = {};
  }

  return {
    type: "DM_EMAIL_SCRIPT",
    dmScript: parsed.dmScript ?? preset.dmTemplate,
    emailSubject: parsed.emailSubject ?? preset.emailSubjectTemplate,
    emailBody: parsed.emailBody ?? result.content ?? "",
    followUpDM: parsed.followUpDM ?? "Hey — sent you something yesterday. Worth 2 mins. Check it?",
  };
}
