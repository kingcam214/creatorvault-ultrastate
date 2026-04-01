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

export interface PlatformStrategyArtifact {
  type: "PLATFORM_STRATEGY";
  primaryPlatform: string;
  secondaryPlatforms: string[];
  contentMix: Array<{ contentType: string; frequency: string; purpose: string }>;
  funnelMap: string;
  growthTactics: string[];
  platformRules: string[];
}

export interface ContentCalendarArtifact {
  type: "CONTENT_CALENDAR";
  weeklySchedule: Array<{
    day: string;
    contentType: string;
    platform: string;
    hook: string;
    goal: string;
  }>;
  monthlyTheme: string;
  contentPillars: string[];
  postingFrequency: string;
}

export interface MonetizationRoadmapArtifact {
  type: "MONETIZATION_ROADMAP";
  currentMonthlyEstimate: string;
  revenueStreams: Array<{
    stream: string;
    currentStatus: string;
    targetMonthly: string;
    actionToActivate: string;
  }>;
  thirtyDayPlan: string[];
  ninetyDayTarget: string;
  keyLeverage: string;
}

export type HeroArtifact =
  | SocialAuditArtifact
  | TrailerScriptArtifact
  | TeaserClipsArtifact
  | LaunchDeckArtifact
  | LandingPageArtifact
  | DMEmailArtifact
  | PlatformStrategyArtifact
  | ContentCalendarArtifact
  | MonetizationRoadmapArtifact;

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

  // Run all artifacts — collect errors but don't abort
  // VAULTX_ADULT_PREMIUM has 8 artifacts; all others have 6
  const isAdult = input.verticalId === "VAULTX_ADULT_PREMIUM";

  const [audit, trailer, teasers, deck, landing, dm, platformStrategy, contentCalendar, monetizationRoadmap] =
    await Promise.allSettled([
      buildSocialAudit(input, config),
      buildTrailerScript(input, config),
      buildTeaserClips(input, config),
      isAdult ? Promise.resolve(null) : buildLaunchDeck(input, config),
      buildLandingPage(input, config),
      buildDMEmailScript(input, config),
      isAdult ? buildPlatformStrategy(input, config) : Promise.resolve(null),
      isAdult ? buildContentCalendar(input, config) : Promise.resolve(null),
      isAdult ? buildMonetizationRoadmap(input, config) : Promise.resolve(null),
    ]);

  if (audit.status === "fulfilled") artifacts.push(audit.value);
  else errors.push(`Social Audit: ${audit.reason?.message || "failed"}`);

  if (trailer.status === "fulfilled") artifacts.push(trailer.value);
  else errors.push(`Flagship Trailer: ${trailer.reason?.message || "failed"}`);

  if (teasers.status === "fulfilled") artifacts.push(teasers.value);
  else errors.push(`Teaser Clips: ${teasers.reason?.message || "failed"}`);

  if (!isAdult) {
    if (deck.status === "fulfilled" && deck.value) artifacts.push(deck.value);
    else errors.push(`Launch Deck: ${deck.status === "rejected" ? deck.reason?.message || "failed" : "skipped"}`);
  }

  if (landing.status === "fulfilled") artifacts.push(landing.value);
  else errors.push(`Landing Page: ${landing.reason?.message || "failed"}`);

  if (dm.status === "fulfilled") artifacts.push(dm.value);
  else errors.push(`DM/Email Script: ${dm.reason?.message || "failed"}`);

  if (isAdult) {
    if (platformStrategy.status === "fulfilled" && platformStrategy.value) artifacts.push(platformStrategy.value);
    else errors.push(`Platform Strategy: ${platformStrategy.status === "rejected" ? platformStrategy.reason?.message || "failed" : "skipped"}`);

    if (contentCalendar.status === "fulfilled" && contentCalendar.value) artifacts.push(contentCalendar.value);
    else errors.push(`Content Calendar: ${contentCalendar.status === "rejected" ? contentCalendar.reason?.message || "failed" : "skipped"}`);

    if (monetizationRoadmap.status === "fulfilled" && monetizationRoadmap.value) artifacts.push(monetizationRoadmap.value);
    else errors.push(`Monetization Roadmap: ${monetizationRoadmap.status === "rejected" ? monetizationRoadmap.reason?.message || "failed" : "skipped"}`);
  }

  const expectedCount = isAdult ? 8 : 6;
  console.log(`[VerticalPack] Completed ${config.packName}: ${artifacts.length}/${expectedCount} artifacts, ${errors.length} errors`);

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

// ============================================================
// ADULT VERTICAL ARTIFACT BUILDERS (VAULTX_ADULT_PREMIUM)
// ============================================================

async function buildPlatformStrategy(
  input: VerticalPackInput,
  config: VerticalConfig
): Promise<PlatformStrategyArtifact> {
  const topic = input.courseTopic ?? "premium content";
  const audience = input.targetAudience ?? "adult content consumers";

  const prompt = `You are a platform strategy consultant for adult content creators.

Creator: @${input.creatorHandle} on ${input.platform}
Content type: ${topic}
Target audience: ${audience}
Monetization angle: ${config.auditPreset.monetizationAngle}

Build a complete platform strategy. Return JSON:
{
  "primaryPlatform": "Main revenue platform (e.g., OnlyFans)",
  "secondaryPlatforms": ["Platform 2", "Platform 3"],
  "contentMix": [
    {"contentType": "Free teaser content", "frequency": "Daily", "purpose": "Top of funnel acquisition"},
    {"contentType": "Paid exclusive content", "frequency": "3x/week", "purpose": "Subscriber retention"},
    {"contentType": "PPV drops", "frequency": "Weekly", "purpose": "Revenue spikes"}
  ],
  "funnelMap": "Describe the full funnel from discovery to paying subscriber in 2-3 sentences",
  "growthTactics": ["Tactic 1", "Tactic 2", "Tactic 3", "Tactic 4", "Tactic 5"],
  "platformRules": ["Rule 1 about what to never do", "Rule 2", "Rule 3"]
}

Be specific. Platform-safe language. Business-minded. No explicit terms.`;

  const result = await invokeRealGPT({ userMessage: prompt, mode: "Architect" });

  let parsed: Partial<PlatformStrategyArtifact> = {};
  try {
    const jsonMatch = (result.content ?? "{}").match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch { parsed = {}; }

  return {
    type: "PLATFORM_STRATEGY",
    primaryPlatform: parsed.primaryPlatform ?? input.platform,
    secondaryPlatforms: parsed.secondaryPlatforms ?? ["Twitter/X", "Reddit"],
    contentMix: parsed.contentMix ?? [
      { contentType: "Free teaser content", frequency: "Daily", purpose: "Acquisition" },
      { contentType: "Exclusive paid content", frequency: "3x/week", purpose: "Retention" },
      { contentType: "PPV drops", frequency: "Weekly", purpose: "Revenue spikes" },
    ],
    funnelMap: parsed.funnelMap ?? "Free social → profile visit → subscribe → PPV upsell",
    growthTactics: parsed.growthTactics ?? config.auditPreset.focusMetrics,
    platformRules: parsed.platformRules ?? config.copyPreset.voiceRules,
  };
}

async function buildContentCalendar(
  input: VerticalPackInput,
  config: VerticalConfig
): Promise<ContentCalendarArtifact> {
  const topic = input.courseTopic ?? "premium content";

  const prompt = `Build a 7-day content calendar for @${input.creatorHandle}, an adult content creator specializing in ${topic}.

Tone: ${config.copyPreset.tone}
Platform: ${input.platform} + secondary platforms
Goal: Maximize subscriber acquisition and retention

Return JSON:
{
  "monthlyTheme": "One-sentence theme for this month's content",
  "contentPillars": ["Pillar 1", "Pillar 2", "Pillar 3"],
  "postingFrequency": "X posts/day across Y platforms",
  "weeklySchedule": [
    {"day": "Monday", "contentType": "Type of content", "platform": "Platform name", "hook": "Opening hook idea", "goal": "What this achieves"},
    ... (7 days)
  ]
}

Platform-safe language. Business-focused. No explicit terms.`;

  const result = await invokeRealGPT({ userMessage: prompt, mode: "KingCam" });

  let parsed: Partial<ContentCalendarArtifact> = {};
  try {
    const jsonMatch = (result.content ?? "{}").match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch { parsed = {}; }

  const defaultSchedule = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => ({
    day,
    contentType: day === "Monday" || day === "Thursday" ? "Exclusive content drop" : "Teaser / engagement post",
    platform: input.platform,
    hook: `${day} exclusive — subscribers only`,
    goal: day === "Monday" || day === "Thursday" ? "Retention + PPV revenue" : "Acquisition + engagement",
  }));

  return {
    type: "CONTENT_CALENDAR",
    monthlyTheme: parsed.monthlyTheme ?? `${topic} — Exclusive Access Month`,
    contentPillars: parsed.contentPillars ?? ["Exclusivity", "Engagement", "Monetization"],
    postingFrequency: parsed.postingFrequency ?? "2-3 posts/day across 2 platforms",
    weeklySchedule: parsed.weeklySchedule ?? defaultSchedule,
  };
}

async function buildMonetizationRoadmap(
  input: VerticalPackInput,
  config: VerticalConfig
): Promise<MonetizationRoadmapArtifact> {
  const followers = input.existingFollowers ?? 0;
  const price = input.pricePoint ?? "$15/month";
  const proof = input.credibilityProof ?? "growing subscriber base";

  const prompt = `Build a monetization roadmap for @${input.creatorHandle}, an adult content creator.

Current followers: ${followers.toLocaleString()}
Subscription price: ${price}
Proof/current status: ${proof}
Monetization angle: ${config.auditPreset.monetizationAngle}

Return JSON:
{
  "currentMonthlyEstimate": "Estimated current MRR based on followers and price",
  "revenueStreams": [
    {"stream": "Monthly subscriptions", "currentStatus": "Active/Inactive", "targetMonthly": "$X,XXX", "actionToActivate": "What to do"},
    {"stream": "PPV content", "currentStatus": "Active/Inactive", "targetMonthly": "$X,XXX", "actionToActivate": "What to do"},
    {"stream": "Tips", "currentStatus": "Active/Inactive", "targetMonthly": "$X,XXX", "actionToActivate": "What to do"},
    {"stream": "Custom requests", "currentStatus": "Active/Inactive", "targetMonthly": "$X,XXX", "actionToActivate": "What to do"},
    {"stream": "Merchandise", "currentStatus": "Inactive", "targetMonthly": "$XXX", "actionToActivate": "What to do"}
  ],
  "thirtyDayPlan": ["Action 1", "Action 2", "Action 3", "Action 4", "Action 5"],
  "ninetyDayTarget": "Specific MRR target in 90 days with the actions above",
  "keyLeverage": "The single highest-leverage action to take this week"
}

Be specific with numbers. Business-minded. Platform-safe language.`;

  const result = await invokeRealGPT({ userMessage: prompt, mode: "Realist" });

  let parsed: Partial<MonetizationRoadmapArtifact> = {};
  try {
    const jsonMatch = (result.content ?? "{}").match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch { parsed = {}; }

  return {
    type: "MONETIZATION_ROADMAP",
    currentMonthlyEstimate: parsed.currentMonthlyEstimate ?? "Calculating based on current metrics...",
    revenueStreams: parsed.revenueStreams ?? [
      { stream: "Monthly subscriptions", currentStatus: "Active", targetMonthly: "$2,000", actionToActivate: "Optimize pricing and free trial conversion" },
      { stream: "PPV content", currentStatus: "Active", targetMonthly: "$1,500", actionToActivate: "Increase drop frequency to weekly" },
      { stream: "Tips", currentStatus: "Active", targetMonthly: "$500", actionToActivate: "Engage subscribers with direct messages" },
      { stream: "Custom requests", currentStatus: "Inactive", targetMonthly: "$1,000", actionToActivate: "Announce custom request availability to subscribers" },
      { stream: "Merchandise", currentStatus: "Inactive", targetMonthly: "$300", actionToActivate: "Launch branded merch store via Printful" },
    ],
    thirtyDayPlan: parsed.thirtyDayPlan ?? [
      "Audit current subscriber retention rate",
      "Launch weekly PPV drop schedule",
      "Activate custom request tier",
      "Build secondary platform funnel",
      "Set up automated welcome DM sequence",
    ],
    ninetyDayTarget: parsed.ninetyDayTarget ?? "$5,000+ MRR across all streams",
    keyLeverage: parsed.keyLeverage ?? "Activate PPV drops — highest margin, lowest effort revenue stream",
  };
}
