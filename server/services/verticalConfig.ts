/**
 * VERTICAL PRESET SYSTEM
 * 
 * Single source of truth for all CreatorVault vertical configurations.
 * Every tool that produces output checks this config when a vertical is set.
 * 
 * Vertical #1: YOUTUBE_EDUCATOR (fully wired)
 * Vertical #2-5: Defined but not yet activated (next passes)
 */

// ============================================================
// VERTICAL ENUM
// ============================================================

export type VerticalId =
  | "YOUTUBE_EDUCATOR"
  | "SHORTFORM_ENTERTAINER"
  | "FITNESS_COACH"
  | "MUSIC_ARTIST"
  | "AGENCY_CONSULTANT"
  | "VAULTX_ADULT_PREMIUM";

// ============================================================
// HERO PACKAGE ARTIFACT TYPES
// ============================================================

export type HeroArtifactType =
  | "SOCIAL_AUDIT_SUMMARY"
  | "FLAGSHIP_TRAILER"
  | "SHORT_TEASER_CLIPS"
  | "LAUNCH_DECK"
  | "LANDING_PAGE_BLOCK"
  | "DM_EMAIL_SCRIPT"
  | "PLATFORM_STRATEGY"
  | "CONTENT_CALENDAR"
  | "MONETIZATION_ROADMAP";

// ============================================================
// VERTICAL PRESET INTERFACE
// ============================================================

export interface TrailerPreset {
  pacingStyle: "slow" | "medium" | "fast";
  sceneDurationSeconds: number; // per scene
  totalDurationSeconds: number;
  textStyle: "clear_structured" | "punchy" | "minimal" | "lyrical";
  openingHookType: "problem_statement" | "bold_claim" | "transformation" | "question";
  closingCTAStyle: "enroll_now" | "follow_now" | "join_now" | "book_now";
  colorMood: "professional_blue" | "energetic_orange" | "dark_cinematic" | "vibrant_gradient";
  musicTone: "inspiring_orchestral" | "hype_trap" | "chill_lofi" | "emotional_piano";
}

export interface DeckPreset {
  slideOrder: string[];
  toneLabel: string;
  focusAreas: string[];
  ctaSlideText: string;
  colorScheme: "blue_authority" | "orange_energy" | "dark_premium" | "green_health";
}

export interface CopyPreset {
  tone: string;
  voiceRules: string[];
  dmTemplate: string;
  emailSubjectTemplate: string;
  landingHeroHeadline: string;
  landingSubheadline: string;
  landingBullets: string[];
  landingCTA: string;
}

export interface AuditPreset {
  focusMetrics: string[];
  primaryPlatform: "youtube" | "tiktok" | "instagram" | "twitter";
  summaryFraming: string;
  monetizationAngle: string;
}

export interface VerticalConfig {
  id: VerticalId;
  displayName: string;
  packName: string;
  description: string;
  status: "ACTIVE" | "PENDING";
  heroArtifacts: HeroArtifactType[];
  trailerPreset: TrailerPreset;
  deckPreset: DeckPreset;
  copyPreset: CopyPreset;
  auditPreset: AuditPreset;
  teaserCount: number;
  teaserDurationSeconds: number;
}

// ============================================================
// VERTICAL #1: YOUTUBE EDUCATOR / COURSE CREATOR
// ============================================================

const YOUTUBE_EDUCATOR: VerticalConfig = {
  id: "YOUTUBE_EDUCATOR",
  displayName: "YouTube Educator / Course Creator",
  packName: "YouTube Educator Launch Pack v1",
  description: "Built for creators who teach, coach, or sell courses on YouTube. Every output is tuned for authority, transformation proof, and course enrollment.",
  status: "ACTIVE",
  heroArtifacts: [
    "SOCIAL_AUDIT_SUMMARY",
    "FLAGSHIP_TRAILER",
    "SHORT_TEASER_CLIPS",
    "LAUNCH_DECK",
    "LANDING_PAGE_BLOCK",
    "DM_EMAIL_SCRIPT",
  ],
  trailerPreset: {
    pacingStyle: "slow",
    sceneDurationSeconds: 8,
    totalDurationSeconds: 90,
    textStyle: "clear_structured",
    openingHookType: "problem_statement",
    closingCTAStyle: "enroll_now",
    colorMood: "professional_blue",
    musicTone: "inspiring_orchestral",
  },
  deckPreset: {
    slideOrder: [
      "Title / Hook",
      "The Problem (What they're struggling with)",
      "Why existing solutions fail",
      "Your Credibility (Proof you solved it)",
      "The Transformation (What's possible)",
      "The Plan (How your course works)",
      "What's Inside (Module breakdown)",
      "Social Proof / Testimonials",
      "The Offer (Price + Bonuses)",
      "FAQ / Objection Handling",
      "Final CTA (Enroll Now)",
    ],
    toneLabel: "Direct, expert, no fluff. Proof-first. Transformation-forward.",
    focusAreas: ["Proof", "Transformation", "Offer"],
    ctaSlideText: "Enroll Now — Limited Spots",
    colorScheme: "blue_authority",
  },
  copyPreset: {
    tone: "Direct, expert, no fluff. Authoritative but accessible. Proof-first.",
    voiceRules: [
      "Lead with the problem, not the solution",
      "Every claim needs a proof point",
      "Use specific numbers when possible",
      "No motivational filler phrases",
      "End every section with a clear next step",
    ],
    dmTemplate: `Hey [NAME] — saw your content on [PLATFORM]. You're clearly teaching [TOPIC] but I noticed [SPECIFIC GAP]. 

I built a system that helps educators like you [SPECIFIC OUTCOME] in [TIMEFRAME]. 

No fluff — just [PROOF POINT]. Would it make sense to show you how it works?`,
    emailSubjectTemplate: "[SPECIFIC RESULT] in [TIMEFRAME] — for [NICHE] educators",
    landingHeroHeadline: "Finally Learn [OUTCOME] — Without [PAIN POINT]",
    landingSubheadline: "The exact system [CREDIBILITY PROOF] used to [SPECIFIC RESULT].",
    landingBullets: [
      "✓ [Specific skill or outcome] — even if [common objection]",
      "✓ [Specific skill or outcome] — without [pain point]",
      "✓ [Specific skill or outcome] — in [timeframe]",
      "✓ [Bonus outcome] — included at no extra cost",
    ],
    landingCTA: "Get Instant Access — [PRICE OR FREE]",
  },
  auditPreset: {
    focusMetrics: [
      "Subscriber growth rate (last 90 days)",
      "Average view duration (retention %)",
      "Click-through rate on thumbnails",
      "Comment sentiment (learning vs entertainment)",
      "Top performing content topics",
    ],
    primaryPlatform: "youtube",
    summaryFraming: "What to fix first to maximize course enrollment from your existing audience",
    monetizationAngle: "Course sales, coaching upsells, community membership",
  },
  teaserCount: 3,
  teaserDurationSeconds: 60,
};

// ============================================================
// VERTICAL #2: SHORT-FORM ENTERTAINER (defined, not yet active)
// ============================================================

const SHORTFORM_ENTERTAINER: VerticalConfig = {
  id: "SHORTFORM_ENTERTAINER",
  displayName: "Short-Form Entertainer / Personality",
  packName: "Short-Form Entertainer Launch Pack v1",
  description: "Built for creators whose content is personality-driven, entertainment-first, and optimized for TikTok/Reels/Shorts virality.",
  status: "PENDING",
  heroArtifacts: ["SOCIAL_AUDIT_SUMMARY", "FLAGSHIP_TRAILER", "SHORT_TEASER_CLIPS", "LAUNCH_DECK", "LANDING_PAGE_BLOCK", "DM_EMAIL_SCRIPT"],
  trailerPreset: {
    pacingStyle: "fast",
    sceneDurationSeconds: 3,
    totalDurationSeconds: 60,
    textStyle: "punchy",
    openingHookType: "bold_claim",
    closingCTAStyle: "follow_now",
    colorMood: "energetic_orange",
    musicTone: "hype_trap",
  },
  deckPreset: {
    slideOrder: ["Hook", "Who You Are", "What You Create", "Audience Stats", "Brand Fit", "Rates / Packages", "CTA"],
    toneLabel: "Energetic, personality-forward, numbers-backed.",
    focusAreas: ["Audience", "Virality", "Brand Deals"],
    ctaSlideText: "Let's Work Together",
    colorScheme: "orange_energy",
  },
  copyPreset: {
    tone: "High energy, personality-first, relatable. FOMO-driven.",
    voiceRules: ["Open with the hook immediately", "Use social proof numbers", "Keep sentences short", "End with urgency"],
    dmTemplate: `Hey [NAME] — your [CONTENT TYPE] is [SPECIFIC COMPLIMENT]. I help creators like you turn [X followers] into [OUTCOME]. DM me "GROWTH" if you want to see how.`,
    emailSubjectTemplate: "Your [PLATFORM] is leaving [MONEY/OPPORTUNITIES] on the table",
    landingHeroHeadline: "Turn Your [PLATFORM] Into [OUTCOME]",
    landingSubheadline: "Join [NUMBER] creators already doing it.",
    landingBullets: ["✓ More brand deals", "✓ Higher rates", "✓ Passive income streams", "✓ Done-for-you content strategy"],
    landingCTA: "Join Now — Free to Start",
  },
  auditPreset: {
    focusMetrics: ["Follower growth rate", "Viral post rate", "Engagement rate", "Platform algorithm score", "Brand deal readiness"],
    primaryPlatform: "tiktok",
    summaryFraming: "What to fix first to maximize brand deals and follower growth",
    monetizationAngle: "Brand deals, merchandise, creator fund, paid community",
  },
  teaserCount: 3,
  teaserDurationSeconds: 30,
};

// ============================================================
// VERTICAL #3: FITNESS / TRANSFORMATION COACH (defined, not yet active)
// ============================================================

const FITNESS_COACH: VerticalConfig = {
  id: "FITNESS_COACH",
  displayName: "Fitness / Transformation Coach",
  packName: "Fitness Coach Launch Pack v1",
  description: "Built for coaches who sell transformation programs, 1:1 coaching, or fitness content.",
  status: "PENDING",
  heroArtifacts: ["SOCIAL_AUDIT_SUMMARY", "FLAGSHIP_TRAILER", "SHORT_TEASER_CLIPS", "LAUNCH_DECK", "LANDING_PAGE_BLOCK", "DM_EMAIL_SCRIPT"],
  trailerPreset: {
    pacingStyle: "medium",
    sceneDurationSeconds: 5,
    totalDurationSeconds: 75,
    textStyle: "clear_structured",
    openingHookType: "transformation",
    closingCTAStyle: "book_now",
    colorMood: "dark_cinematic",
    musicTone: "hype_trap",
  },
  deckPreset: {
    slideOrder: ["Before/After Hook", "The Problem", "Why Diets Fail", "Your Method", "Transformation Proof", "The Program", "Pricing", "CTA"],
    toneLabel: "Motivational but proof-based. Real results, no BS.",
    focusAreas: ["Transformation", "Proof", "Program"],
    ctaSlideText: "Start Your Transformation Today",
    colorScheme: "dark_premium",
  },
  copyPreset: {
    tone: "Motivational, proof-driven, direct. No empty promises.",
    voiceRules: ["Lead with transformation results", "Use client before/after stories", "Address the 'I've tried everything' objection", "Be specific about the method"],
    dmTemplate: `Hey [NAME] — I help [NICHE] people get [SPECIFIC RESULT] in [TIMEFRAME] without [PAIN POINT]. I've done it for [NUMBER] clients. Want to see if you qualify?`,
    emailSubjectTemplate: "[CLIENT NAME] lost [X lbs] in [TIMEFRAME] — here's exactly how",
    landingHeroHeadline: "Lose [X] in [TIMEFRAME] — Or You Don't Pay",
    landingSubheadline: "The exact protocol [NUMBER] clients used to [SPECIFIC RESULT].",
    landingBullets: ["✓ No extreme diets", "✓ No hours in the gym", "✓ Works for [specific audience]", "✓ Guaranteed results or full refund"],
    landingCTA: "Book Your Free Strategy Call",
  },
  auditPreset: {
    focusMetrics: ["Transformation content performance", "Before/after post engagement", "Story views vs feed views", "DM conversion rate", "Email list growth"],
    primaryPlatform: "instagram",
    summaryFraming: "What to fix first to maximize coaching client inquiries",
    monetizationAngle: "1:1 coaching, group programs, digital products",
  },
  teaserCount: 3,
  teaserDurationSeconds: 45,
};

// ============================================================
// VERTICAL #4: MUSIC ARTIST (defined, not yet active)
// ============================================================

const MUSIC_ARTIST: VerticalConfig = {
  id: "MUSIC_ARTIST",
  displayName: "Music Artist",
  packName: "Music Artist Launch Pack v1",
  description: "Built for independent artists launching projects, building fanbases, and monetizing their music.",
  status: "PENDING",
  heroArtifacts: ["SOCIAL_AUDIT_SUMMARY", "FLAGSHIP_TRAILER", "SHORT_TEASER_CLIPS", "LAUNCH_DECK", "LANDING_PAGE_BLOCK", "DM_EMAIL_SCRIPT"],
  trailerPreset: {
    pacingStyle: "medium",
    sceneDurationSeconds: 4,
    totalDurationSeconds: 90,
    textStyle: "minimal",
    openingHookType: "bold_claim",
    closingCTAStyle: "follow_now",
    colorMood: "dark_cinematic",
    musicTone: "emotional_piano",
  },
  deckPreset: {
    slideOrder: ["Artist Identity", "Sound & Vision", "Audience Stats", "Streaming Numbers", "Press / Placements", "Upcoming Project", "Partnership Opportunities", "CTA"],
    toneLabel: "Artistic, authentic, numbers-backed for industry.",
    focusAreas: ["Identity", "Audience", "Project"],
    ctaSlideText: "Stream Now / Partner With Us",
    colorScheme: "dark_premium",
  },
  copyPreset: {
    tone: "Authentic, artistic, community-driven. Real fanbase over hype.",
    voiceRules: ["Lead with the music and vision", "Use streaming numbers as proof", "Speak to the community, not just the industry", "Keep it real"],
    dmTemplate: `Hey [NAME] — I'm [ARTIST NAME], [GENRE] artist from [CITY]. Just dropped [PROJECT]. [STREAMING NUMBER] streams in [TIMEFRAME]. Would love to connect about [OPPORTUNITY].`,
    emailSubjectTemplate: "[ARTIST NAME] — [PROJECT NAME] Press Kit",
    landingHeroHeadline: "[ARTIST NAME] — New [PROJECT TYPE] Out Now",
    landingSubheadline: "[GENRE] from [CITY]. [STREAMING NUMBER] streams. [COMMUNITY SIZE] fans.",
    landingBullets: ["✓ Stream on all platforms", "✓ Exclusive merch available", "✓ Join the fan community", "✓ Tour dates announced"],
    landingCTA: "Stream Now — Free",
  },
  auditPreset: {
    focusMetrics: ["Monthly listeners growth", "Playlist adds rate", "Social engagement vs streaming correlation", "Fan community size", "Content-to-stream conversion"],
    primaryPlatform: "instagram",
    summaryFraming: "What to fix first to grow your fanbase and streaming numbers",
    monetizationAngle: "Streaming, merch, live shows, sync licensing, fan subscriptions",
  },
  teaserCount: 3,
  teaserDurationSeconds: 30,
};

// ============================================================
// VERTICAL #5: AGENCY / CONSULTANT (defined, not yet active)
// ============================================================

const AGENCY_CONSULTANT: VerticalConfig = {
  id: "AGENCY_CONSULTANT",
  displayName: "Agency / Consultant Running Client Accounts",
  packName: "Agency Launch Pack v1",
  description: "Built for agencies and consultants who manage creator accounts or sell social media / content services to clients.",
  status: "PENDING",
  heroArtifacts: ["SOCIAL_AUDIT_SUMMARY", "FLAGSHIP_TRAILER", "SHORT_TEASER_CLIPS", "LAUNCH_DECK", "LANDING_PAGE_BLOCK", "DM_EMAIL_SCRIPT"],
  trailerPreset: {
    pacingStyle: "medium",
    sceneDurationSeconds: 6,
    totalDurationSeconds: 90,
    textStyle: "clear_structured",
    openingHookType: "problem_statement",
    closingCTAStyle: "book_now",
    colorMood: "professional_blue",
    musicTone: "inspiring_orchestral",
  },
  deckPreset: {
    slideOrder: ["Agency Overview", "The Problem for Clients", "Your Process", "Case Studies / Results", "Services & Pricing", "Why You vs Others", "Onboarding Process", "CTA"],
    toneLabel: "Professional, results-first, ROI-focused.",
    focusAreas: ["Results", "Process", "ROI"],
    ctaSlideText: "Book a Discovery Call",
    colorScheme: "blue_authority",
  },
  copyPreset: {
    tone: "Professional, ROI-focused, case-study-driven. No fluff.",
    voiceRules: ["Lead with client results", "Use specific ROI numbers", "Address the 'we tried agencies before' objection", "Make the process clear and simple"],
    dmTemplate: `Hey [NAME] — I help [NICHE] businesses get [SPECIFIC RESULT] from their social media. Just got [CLIENT] to [RESULT] in [TIMEFRAME]. Would a quick call make sense?`,
    emailSubjectTemplate: "How [CLIENT] got [RESULT] in [TIMEFRAME] — case study",
    landingHeroHeadline: "We Grow [NICHE] Brands on Social — Guaranteed",
    landingSubheadline: "[NUMBER] clients. [AVERAGE RESULT]. [TIMEFRAME] average to see results.",
    landingBullets: ["✓ Done-for-you content creation", "✓ Platform growth strategy", "✓ Monthly reporting & analytics", "✓ Dedicated account manager"],
    landingCTA: "Book Your Free Audit Call",
  },
  auditPreset: {
    focusMetrics: ["Client account growth rates", "Content performance by type", "Engagement rate benchmarks", "Competitor gap analysis", "Revenue attribution from social"],
    primaryPlatform: "instagram",
    summaryFraming: "What to fix first to maximize client results and retention",
    monetizationAngle: "Monthly retainers, project fees, performance bonuses, white-label services",
  },
  teaserCount: 3,
  teaserDurationSeconds: 60,
};

// ============================================================
// VERTICAL #6: VAULTX ADULT PREMIUM CREATOR
// ============================================================

const VAULTX_ADULT_PREMIUM: VerticalConfig = {
  id: "VAULTX_ADULT_PREMIUM",
  displayName: "VaultX Adult Premium Creator",
  packName: "VaultX Adult Creator Launch Pack v1",
  description: "Built for adult content creators on OnlyFans, Fansly, and similar platforms. Every output is tuned for subscriber acquisition, retention, and premium monetization — with full platform-safe language.",
  status: "ACTIVE",
  heroArtifacts: [
    "SOCIAL_AUDIT_SUMMARY",
    "FLAGSHIP_TRAILER",
    "SHORT_TEASER_CLIPS",
    "PLATFORM_STRATEGY",
    "CONTENT_CALENDAR",
    "LANDING_PAGE_BLOCK",
    "DM_EMAIL_SCRIPT",
    "MONETIZATION_ROADMAP",
  ],
  trailerPreset: {
    pacingStyle: "medium",
    sceneDurationSeconds: 5,
    totalDurationSeconds: 60,
    textStyle: "punchy",
    openingHookType: "bold_claim",
    closingCTAStyle: "join_now",
    colorMood: "dark_cinematic",
    musicTone: "emotional_piano",
  },
  deckPreset: {
    slideOrder: [
      "Brand Identity & Persona",
      "Platform Overview (OF/Fansly/etc.)",
      "Audience Stats & Demographics",
      "Content Strategy & Niche",
      "Revenue Streams Breakdown",
      "Subscriber Growth Trajectory",
      "Retention & Renewal Strategy",
      "Expansion Plan (PPV, Tips, Custom)",
    ],
    toneLabel: "Confident, brand-first, business-minded. Treat this like a premium media brand.",
    focusAreas: ["Brand", "Retention", "Revenue"],
    ctaSlideText: "Subscribe Now — Exclusive Access",
    colorScheme: "dark_premium",
  },
  copyPreset: {
    tone: "Confident, alluring, brand-forward. Premium positioning. Business-minded.",
    voiceRules: [
      "Lead with exclusivity and premium value",
      "Never sound desperate — scarcity and confidence only",
      "Use subscriber milestones as social proof",
      "Every CTA is about joining an exclusive world",
      "Platform-safe language always — no explicit terms in marketing copy",
    ],
    dmTemplate: `Hey [NAME] — I noticed you follow [RELATED CREATOR/NICHE]. I create exclusive [CONTENT TYPE] content that [SPECIFIC VALUE PROP]. First month is [PRICE/OFFER]. Link in bio — limited spots.`,
    emailSubjectTemplate: "Exclusive access for [NAME] — [CREATOR NAME]'s private world",
    landingHeroHeadline: "Exclusive. Unfiltered. Only for [CREATOR NAME]'s Inner Circle.",
    landingSubheadline: "Join [SUBSCRIBER COUNT]+ subscribers who get access to content you won't find anywhere else.",
    landingBullets: [
      "✓ Daily exclusive content — never posted publicly",
      "✓ Direct messaging — I actually respond",
      "✓ Custom requests available for subscribers",
      "✓ Cancel anytime — no contracts",
    ],
    landingCTA: "Join Now — [PRICE]/month",
  },
  auditPreset: {
    focusMetrics: [
      "Subscriber count and monthly growth rate",
      "Renewal/retention rate (% who rebill)",
      "PPV open rate and conversion",
      "Tip frequency and average tip amount",
      "Free trial to paid conversion rate",
      "Social funnel traffic (which platform drives most subs)",
    ],
    primaryPlatform: "instagram",
    summaryFraming: "What to fix first to maximize subscriber retention and monthly recurring revenue",
    monetizationAngle: "Monthly subscriptions, PPV content, tips, custom requests, merchandise, brand deals",
  },
  teaserCount: 3,
  teaserDurationSeconds: 30,
};

// ============================================================
// VERTICAL REGISTRY
// ============================================================

export const VERTICAL_REGISTRY: Record<VerticalId, VerticalConfig> = {
  YOUTUBE_EDUCATOR,
  SHORTFORM_ENTERTAINER,
  FITNESS_COACH,
  MUSIC_ARTIST,
  AGENCY_CONSULTANT,
  VAULTX_ADULT_PREMIUM,
};

/**
 * Get a vertical config by ID.
 * Throws if the vertical is not ACTIVE.
 */
export function getVerticalConfig(verticalId: VerticalId): VerticalConfig {
  const config = VERTICAL_REGISTRY[verticalId];
  if (!config) throw new Error(`Unknown vertical: ${verticalId}`);
  return config;
}

/**
 * Get only ACTIVE verticals (ready to use in production).
 */
export function getActiveVerticals(): VerticalConfig[] {
  return Object.values(VERTICAL_REGISTRY).filter(v => v.status === "ACTIVE");
}

/**
 * Get all verticals (for UI display, including PENDING).
 */
export function getAllVerticals(): VerticalConfig[] {
  return Object.values(VERTICAL_REGISTRY);
}
