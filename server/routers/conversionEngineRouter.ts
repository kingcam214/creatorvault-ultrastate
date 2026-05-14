import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { db } from "../db";
import {
  creatorAcquisitionPriorities,
  creatorConversionAutomation,
  creatorConversionIntelligence,
  creatorConversionPackets,
  creatorHighTicketPackages,
  recruiterCreatorProfiles,
} from "../../drizzle/schema";

type RecruiterProfile = typeof recruiterCreatorProfiles.$inferSelect;
type ConversionIntelligence = typeof creatorConversionIntelligence.$inferSelect;
type ConversionPacket = typeof creatorConversionPackets.$inferSelect;
type ConversionAutomation = typeof creatorConversionAutomation.$inferSelect;
type AcquisitionPriority = typeof creatorAcquisitionPriorities.$inferSelect;

type GeneratedConversionEngine = {
  profile: ReturnType<typeof serializeProfile>;
  intelligence: ConversionIntelligence;
  packet: ConversionPacket;
  automation: ConversionAutomation;
  priority: AcquisitionPriority;
};

const onboardingStageSchema = z.enum([
  "packet_generated",
  "audit_reviewed",
  "trailer_preview_sent",
  "telegram_invited",
  "telegram_joined",
  "stripe_pending",
  "stripe_connected",
  "vault_setup",
  "subscription_live",
  "vip_offer_live",
  "converted",
]);

const conversionStageSchema = z.enum([
  "queued",
  "nurturing",
  "interested",
  "onboarding",
  "activation",
  "monetized",
  "retained",
  "lost",
]);

const telegramTransitionSchema = z.enum(["not_started", "invite_ready", "invite_sent", "joined", "funnel_enrolled"]);
const stripeActivationSchema = z.enum(["not_started", "pending", "connected", "verified", "blocked"]);

const highTicketPackages = [
  {
    packageKey: "ai_monetization_audit",
    packageName: "AI Monetization Audit",
    description: "Creator-specific revenue leak audit that maps current social demand into immediate paid-vault, subscription, and VIP funnel actions.",
    existingSystems: ["Recruiter OS", "VaultX systems", "Stripe systems"],
    priceFloorCents: 150000,
    recurringPotentialCents: 50000,
    moneyTrigger: "Sell the audit as the first paid diagnostic or bundle it into activation for high-fit creators.",
    activationRoute: "/conversion-engine#packets",
  },
  {
    packageKey: "ai_creator_trailer",
    packageName: "AI Creator Trailer",
    description: "Personalized cinematic trailer brief and production handoff for converting cold audience attention into a paid CreatorVault launch.",
    existingSystems: ["Media OS", "Trailer systems", "Teaser Engine"],
    priceFloorCents: 250000,
    recurringPotentialCents: 75000,
    moneyTrigger: "Use the trailer as the intrigue asset that moves a creator from curiosity to onboarding.",
    activationRoute: "/launch-trailer-studio",
  },
  {
    packageKey: "vip_funnel_setup",
    packageName: "VIP Funnel Setup",
    description: "Paid VIP offer architecture with escalation path, Stripe activation, and content monetization triggers.",
    existingSystems: ["Stripe systems", "VaultX systems", "Telegram systems"],
    priceFloorCents: 300000,
    recurringPotentialCents: 125000,
    moneyTrigger: "Turn warm fans into higher-LTV VIP buyers instead of relying only on low-ticket subscriptions.",
    activationRoute: "/creator-subscription-tiers",
  },
  {
    packageKey: "telegram_money_machine",
    packageName: "Telegram Money Machine",
    description: "Telegram onboarding and campaign transition package using existing funnel, subscriber, and attribution systems.",
    existingSystems: ["Telegram systems", "Recruiter OS", "Stripe systems"],
    priceFloorCents: 200000,
    recurringPotentialCents: 100000,
    moneyTrigger: "Move creators into an owned audience path that can trigger paid drops, VIP offers, and recurring subscription pushes.",
    activationRoute: "/telegram-setup",
  },
  {
    packageKey: "creatorvault_growth_system",
    packageName: "CreatorVault Growth System",
    description: "End-to-end acquisition, onboarding, subscription, VIP, and retention package assembled from existing CreatorVault systems.",
    existingSystems: ["Recruiter OS", "Media OS", "VaultX systems", "Stripe systems", "Telegram systems"],
    priceFloorCents: 500000,
    recurringPotentialCents: 200000,
    moneyTrigger: "Package the complete system for creators with the strongest conversion probability and recurring revenue potential.",
    activationRoute: "/conversion-engine#priority",
  },
  {
    packageKey: "ai_clone_buildout",
    packageName: "AI Clone Buildout",
    description: "Clone-system packaging for creators with strong persona, audience demand, and repeatable content angles.",
    existingSystems: ["Clone systems", "Media OS", "VaultX systems"],
    priceFloorCents: 400000,
    recurringPotentialCents: 150000,
    moneyTrigger: "Convert creator identity into scalable recurring digital leverage without rebuilding clone infrastructure.",
    activationRoute: "/kingcam-ai",
  },
  {
    packageKey: "recurring_revenue_setup",
    packageName: "Recurring Revenue Setup",
    description: "Subscription tier, paid vault, and retention activation package focused on monthly cash flow.",
    existingSystems: ["Stripe systems", "VaultX systems", "Creator subscriptions"],
    priceFloorCents: 250000,
    recurringPotentialCents: 175000,
    moneyTrigger: "Move creators from sporadic posting into a recurring subscription engine with measurable activation state.",
    activationRoute: "/creator-subscriptions",
  },
  {
    packageKey: "subscription_optimization",
    packageName: "Subscription Optimization",
    description: "Subscription offer, price, and activation tune-up using existing tier and payout infrastructure.",
    existingSystems: ["Stripe systems", "Creator subscriptions", "VaultX systems"],
    priceFloorCents: 175000,
    recurringPotentialCents: 90000,
    moneyTrigger: "Increase LTV after activation by improving conversion, upsell, and retention mechanics.",
    activationRoute: "/creator-subscription-tiers",
  },
] as const;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function cents(value: number): number {
  return Math.max(0, Math.round(value));
}

function normalizeText(value: string | null | undefined): string {
  return (value || "").trim();
}

function serializeProfile(profile: RecruiterProfile) {
  return {
    ...profile,
    engagementRate: Number(profile.engagementRate),
  };
}

function profileName(profile: RecruiterProfile): string {
  return profile.displayName || `@${profile.handle}`;
}

function classifyNiche(profile: RecruiterProfile): string {
  const signal = `${profile.niche || ""} ${profile.bio || ""} ${profile.recentPost || ""}`.toLowerCase();
  if (signal.includes("fitness") || signal.includes("wellness")) return "fitness and wellness monetization";
  if (signal.includes("model") || signal.includes("fashion") || signal.includes("beauty")) return "beauty, modeling, and visual brand monetization";
  if (signal.includes("coach") || signal.includes("course") || signal.includes("educator")) return "education and coaching monetization";
  if (signal.includes("artist") || signal.includes("music") || signal.includes("dance")) return "performance and entertainment monetization";
  if (signal.includes("adult") || signal.includes("premium") || signal.includes("vip")) return "premium fan monetization";
  return profile.niche || `${profile.platform} creator monetization`;
}

function hasSignal(profile: RecruiterProfile, terms: string[]): boolean {
  const signal = `${profile.bio || ""} ${profile.niche || ""} ${profile.recentPost || ""} ${(profile.platforms || []).join(" ")}`.toLowerCase();
  return terms.some((term) => signal.includes(term));
}

function buildIntelligence(profile: RecruiterProfile) {
  const engagementRate = Number(profile.engagementRate || 0);
  const platforms = Array.isArray(profile.platforms) ? profile.platforms : [];
  const followerBandScore = profile.followers >= 100_000 ? 82 : profile.followers >= 25_000 ? 76 : profile.followers >= 5_000 ? 66 : profile.followers >= 1_000 ? 48 : 28;
  const engagementQualityScore = clampScore(engagementRate * 12 + (platforms.length >= 2 ? 18 : 8) + (profile.recentPost ? 12 : 4));
  const audienceQualityScore = clampScore(followerBandScore * 0.45 + engagementQualityScore * 0.55);
  const subscriptionOpportunityScore = clampScore(profile.monetizationScore * 0.55 + audienceQualityScore * 0.3 + (hasSignal(profile, ["subscriber", "subscription", "patreon", "onlyfans", "fansly"]) ? 15 : 8));
  const vipOpportunityScore = clampScore(profile.urgencyScore * 0.45 + audienceQualityScore * 0.35 + (hasSignal(profile, ["custom", "vip", "dm", "exclusive", "premium"]) ? 20 : 8));
  const telegramOpportunityScore = clampScore((profile.telegramReady ? 42 : 20) + (platforms.includes("telegram") ? 20 : 0) + profile.fitScore * 0.25 + engagementQualityScore * 0.2);
  const cloneOpportunityScore = clampScore(profile.fitScore * 0.35 + audienceQualityScore * 0.25 + (hasSignal(profile, ["personality", "coach", "model", "artist", "lifestyle"]) ? 28 : 12));
  const signalRichness = [profile.bio, profile.recentPost, profile.profileUrl, profile.telegramUsername].filter(Boolean).length;
  const creatorMaturityLevel = profile.followers >= 50_000 || profile.totalScore >= 85 ? "scale-ready" : profile.followers >= 5_000 || profile.totalScore >= 70 ? "offer-ready" : signalRichness >= 3 ? "nurture-ready" : "qualification-needed";
  const onboardingDifficultyScore = clampScore(100 - (profile.fitScore * 0.42 + (profile.telegramReady ? 18 : 0) + (["connected", "verified"].includes(profile.stripeLinkStatus) ? 20 : 6) + signalRichness * 5));
  const conversionProbabilityScore = clampScore(profile.totalScore * 0.42 + subscriptionOpportunityScore * 0.16 + telegramOpportunityScore * 0.14 + vipOpportunityScore * 0.12 + (100 - onboardingDifficultyScore) * 0.16);
  const recurringRevenuePotentialCents = cents((subscriptionOpportunityScore * 2200) + (vipOpportunityScore * 3100) + (telegramOpportunityScore * 1600) + Math.min(profile.followers, 200_000) * Math.max(0.8, engagementRate) * 0.45);
  const estimatedLostRevenueCents = cents(recurringRevenuePotentialCents * (profile.stripeLinkStatus === "verified" ? 0.35 : profile.stripeLinkStatus === "connected" ? 0.5 : 0.82));
  const gaps = [
    !["connected", "verified"].includes(profile.stripeLinkStatus) ? "Stripe activation is not complete, so paid conversion cannot compound yet." : "Stripe is ready; next leak is offer packaging and recurring conversion.",
    profile.telegramReady ? "Telegram path exists and should be enrolled into onboarding or VIP follow-up." : "Telegram capture path is missing, reducing owned-audience conversion leverage.",
    subscriptionOpportunityScore >= 65 ? "Subscription demand appears strong enough for an immediate paid tier test." : "Subscription offer needs clearer positioning before launch pressure increases.",
    vipOpportunityScore >= 65 ? "VIP buyer path can be packaged into a high-ticket or premium fan funnel." : "VIP funnel needs stronger exclusivity and proof before escalation.",
    cloneOpportunityScore >= 70 ? "AI clone leverage is viable because the creator signal is persona-driven and repeatable." : "AI clone opportunity should stay secondary until persona signal is stronger.",
  ];

  return {
    nicheClassification: classifyNiche(profile),
    monetizationGaps: gaps,
    estimatedLostRevenueCents,
    audienceQualityScore,
    subscriptionOpportunityScore,
    vipOpportunityScore,
    telegramOpportunityScore,
    cloneOpportunityScore,
    recurringRevenuePotentialCents,
    creatorMaturityLevel,
    onboardingDifficultyScore,
    conversionProbabilityScore,
    signalSnapshot: {
      profileId: profile.id,
      platform: profile.platform,
      handle: profile.handle,
      followers: profile.followers,
      engagementRate,
      recruiterOsTotalScore: profile.totalScore,
      recruiterOsPriority: profile.priority,
      stripeLinkStatus: profile.stripeLinkStatus,
      telegramReady: Boolean(profile.telegramReady),
      signalRichness,
      model: "creatorvault_conversion_engine_v1",
    },
  };
}

function buildPacket(profile: RecruiterProfile, intelligence: ReturnType<typeof buildIntelligence>) {
  const name = profileName(profile);
  const niche = intelligence.nicheClassification;
  const formattedLostRevenue = `$${Math.round(intelligence.estimatedLostRevenueCents / 100).toLocaleString()}`;
  const formattedRecurring = `$${Math.round(intelligence.recurringRevenuePotentialCents / 100).toLocaleString()}`;
  const handleLine = `@${profile.handle} on ${profile.platform}`;

  return {
    personalizedSocialAudit: `${name} is showing ${niche} signals with ${profile.followers.toLocaleString()} followers, ${Number(profile.engagementRate).toFixed(2)}% engagement, and a Recruiter OS score of ${profile.totalScore}/100. The immediate acquisition angle is to turn ${handleLine} from audience attention into owned paid conversion, then route the strongest fans into subscription and VIP offers.`,
    monetizationLeakAnalysis: `${name}'s largest visible leak is estimated at ${formattedLostRevenue} in monthly opportunity because the current profile state is not fully connected to recurring CreatorVault activation. Key leaks: ${intelligence.monetizationGaps.join(" ")}`,
    recurringRevenueOpportunity: `Recurring revenue potential is estimated at ${formattedRecurring} from subscription packaging, VIP escalation, Telegram retention, and Stripe activation. The fastest money path is a paid vault tier, a first-subscriber sprint, and a VIP offer for the most responsive fans.`,
    telegramOpportunity: profile.telegramReady
      ? `${name} already has Telegram signal available. Move this creator into the existing Telegram onboarding path, enroll follow-up around the generated packet, and use Telegram as the owned-audience conversion bridge.`
      : `${name} should receive a Telegram transition during onboarding so CreatorVault can move fan attention away from algorithm dependency and into owned follow-up, drops, and VIP pushes.`,
    aiCloneOpportunity: `AI clone opportunity scores ${intelligence.cloneOpportunityScore}/100. Use Clone systems only if the creator accepts the core monetization setup first, then package the persona into scalable recurring digital leverage.`,
    vipFunnelOpportunity: `VIP opportunity scores ${intelligence.vipOpportunityScore}/100. The offer should lead with exclusivity, faster access, and premium fan treatment rather than generic content volume.`,
    platformGrowthOpportunity: `The platform growth path is to use ${profile.platform} as the attention source, CreatorVault onboarding as the conversion path, Telegram as the retention bridge, and Stripe-backed subscriptions/VIP as the revenue capture layer.`,
    creatorvaultLeverageExplanation: `CreatorVault gives ${name} leverage by combining Recruiter OS intelligence, Media OS and Trailer systems for intrigue, VaultX and subscription systems for paid access, Telegram systems for owned follow-up, Stripe systems for activation, and Clone systems when persona leverage is worth scaling.`,
    personalizedTrailerBrief: `${name}: produce a 20-second cinematic CreatorVault trailer that opens with the strongest ${niche} hook, overlays the ${formattedLostRevenue} leak narrative, previews the paid-vault transformation, and closes with a direct onboarding CTA into CreatorVault. Connected to the existing Trailer systems and Teaser Engine; this router stores the conversion brief and system handoff rather than rebuilding video infrastructure.`,
    cinematicOnboardingPreview: `Preview the onboarding as a three-step money sprint for ${name}: activate Stripe, launch the paid vault/subscription offer, then transition warm fans into Telegram and VIP escalation.`,
    monetizationVisuals: {
      revenueLeakVisual: `${formattedLostRevenue} monthly opportunity leak card for ${name}`,
      funnelMapVisual: `${profile.platform} attention → CreatorVault onboarding → Stripe subscription → Telegram retention → VIP offer`,
      trailerFrameVisual: `Cinematic ${niche} hero frame with CreatorVault paid-vault CTA`,
    },
    connectedSystems: ["Recruiter OS", "Media OS", "Trailer systems", "Teaser Engine", "Stripe systems", "Telegram systems", "VaultX systems", "Clone systems"],
  };
}

function buildAutomation(profile: RecruiterProfile, packetId: number, intelligence: ReturnType<typeof buildIntelligence>, assignedRecruiter?: string) {
  const now = Date.now();
  const nextFollowUpAt = new Date(now + (intelligence.conversionProbabilityScore >= 75 ? 4 : 18) * 60 * 60 * 1000);
  const stageHistory = [
    { stage: "packet_generated", at: new Date().toISOString(), reason: "Conversion packet created from Recruiter OS profile and persisted for onboarding." },
  ];
  const cadence = {
    model: "money_first_creator_conversion_v1",
    steps: [
      { offsetHours: 0, action: "send personalized audit and trailer brief" },
      { offsetHours: 24, action: "follow up with revenue leak and recurring revenue angle" },
      { offsetHours: 72, action: "transition to Telegram onboarding or VIP setup call" },
      { offsetHours: 168, action: "close Stripe activation and subscription launch path" },
    ],
    recordsActualResponsesOnly: true,
  };
  const telegramStatus = profile.telegramReady ? "invite_ready" : "not_started";
  const stripeStatus = ["connected", "verified"].includes(profile.stripeLinkStatus) ? profile.stripeLinkStatus : "pending";
  return {
    profileId: profile.id,
    packetId,
    assignedRecruiter: assignedRecruiter || "KingCam revenue desk",
    followUpCadence: cadence,
    nextFollowUpAt,
    lastResponseSignal: null,
    interestScore: intelligence.conversionProbabilityScore,
    onboardingStage: "packet_generated",
    onboardingStageHistory: stageHistory,
    telegramTransitionStatus: telegramStatus,
    telegramTransitionTarget: profile.telegramUsername || "/telegram-setup",
    conversionStage: intelligence.conversionProbabilityScore >= 75 ? "interested" : "nurturing",
    stripeActivationStatus: stripeStatus,
    stripeActivationReference: profile.stripeLinkStatus === "verified" ? "recruiter_os_verified" : "/payout-setup",
    moneyNextAction: intelligence.conversionProbabilityScore >= 75 ? "Send packet, push Telegram transition, and close Stripe-backed paid vault activation." : "Nurture with audit proof, trailer intrigue, and recurring revenue opportunity before activation push.",
  };
}

function buildPriority(profile: RecruiterProfile, intelligence: ReturnType<typeof buildIntelligence>) {
  const engagementRate = Number(profile.engagementRate || 0);
  const monetizationPotentialScore = clampScore(profile.monetizationScore * 0.45 + intelligence.subscriptionOpportunityScore * 0.3 + intelligence.vipOpportunityScore * 0.25);
  const likelihoodToConvertScore = intelligence.conversionProbabilityScore;
  const revenueLeakageScore = clampScore(Math.min(intelligence.estimatedLostRevenueCents / 15000, 100));
  const operationalMaturityScore = clampScore((profile.profileUrl ? 15 : 5) + (profile.recentPost ? 18 : 6) + (profile.platforms?.length || 1) * 12 + (profile.followers >= 5_000 ? 22 : 10));
  const engagementQualityScore = intelligence.audienceQualityScore;
  const telegramReadinessScore = profile.telegramReady ? 100 : intelligence.telegramOpportunityScore;
  const recurringRevenueScore = clampScore(Math.min(intelligence.recurringRevenuePotentialCents / 20000, 100));
  const paidAudienceBehaviorScore = clampScore((hasSignal(profile, ["onlyfans", "fansly", "patreon", "shop", "paid", "vip", "subscription", "custom"]) ? 72 : 36) + Math.min(engagementRate * 4, 24));
  const priorityScore = clampScore(
    monetizationPotentialScore * 0.22 +
    likelihoodToConvertScore * 0.2 +
    revenueLeakageScore * 0.16 +
    operationalMaturityScore * 0.1 +
    engagementQualityScore * 0.12 +
    telegramReadinessScore * 0.08 +
    recurringRevenueScore * 0.08 +
    paidAudienceBehaviorScore * 0.04
  );
  const priorityBand = priorityScore >= 85 ? "critical" : priorityScore >= 70 ? "high" : priorityScore >= 45 ? "medium" : "low";
  return {
    profileId: profile.id,
    intelligenceId: undefined as number | undefined,
    priorityScore,
    priorityBand,
    monetizationPotentialScore,
    likelihoodToConvertScore,
    revenueLeakageScore,
    operationalMaturityScore,
    engagementQualityScore,
    telegramReadinessScore,
    recurringRevenueScore,
    paidAudienceBehaviorScore,
    rankingReason: `${profileName(profile)} ranks ${priorityBand} because conversion probability is ${likelihoodToConvertScore}/100, recurring revenue score is ${recurringRevenueScore}/100, and revenue leakage score is ${revenueLeakageScore}/100. Priority is based on monetization potential and conversion readiness rather than vanity metrics alone.`,
    nextMoneyAction: priorityScore >= 70 ? "Send personalized packet and move directly into Telegram and Stripe activation." : "Use audit proof and trailer intrigue to increase readiness before activation push.",
  };
}

async function ensureDb() {
  if (!db) throw new Error("Database is not configured");
  return db;
}

async function ensureHighTicketPackages() {
  const database = await ensureDb();
  for (const pkg of highTicketPackages) {
    await database.insert(creatorHighTicketPackages).values(pkg).onDuplicateKeyUpdate({
      set: {
        packageName: pkg.packageName,
        description: pkg.description,
        existingSystems: pkg.existingSystems,
        priceFloorCents: pkg.priceFloorCents,
        recurringPotentialCents: pkg.recurringPotentialCents,
        moneyTrigger: pkg.moneyTrigger,
        activationRoute: pkg.activationRoute,
        isActive: true,
        updatedAt: new Date(),
      },
    });
  }
  return database.select().from(creatorHighTicketPackages).where(eq(creatorHighTicketPackages.isActive, true)).orderBy(desc(creatorHighTicketPackages.priceFloorCents));
}

async function getProfile(profileId: number) {
  const database = await ensureDb();
  const [profile] = await database.select().from(recruiterCreatorProfiles).where(eq(recruiterCreatorProfiles.id, profileId)).limit(1);
  if (!profile) throw new Error(`Recruiter OS profile ${profileId} was not found`);
  return profile;
}

async function generateForProfile(profileId: number, assignedRecruiter?: string): Promise<GeneratedConversionEngine> {
  const database = await ensureDb();
  const profile = await getProfile(profileId);
  await ensureHighTicketPackages();

  const intelligenceInput = buildIntelligence(profile);
  await database.insert(creatorConversionIntelligence).values({ profileId: profile.id, ...intelligenceInput }).onDuplicateKeyUpdate({
    set: { ...intelligenceInput, generatedAt: new Date(), updatedAt: new Date() },
  });
  const [intelligence] = await database.select().from(creatorConversionIntelligence).where(eq(creatorConversionIntelligence.profileId, profile.id)).limit(1);
  if (!intelligence) throw new Error("Conversion intelligence was not persisted");

  const packetInput = buildPacket(profile, intelligenceInput);
  await database.insert(creatorConversionPackets).values({ profileId: profile.id, intelligenceId: intelligence.id, ...packetInput }).onDuplicateKeyUpdate({
    set: { intelligenceId: intelligence.id, ...packetInput, packetStatus: "generated", generatedAt: new Date(), updatedAt: new Date() },
  });
  const [packet] = await database.select().from(creatorConversionPackets).where(eq(creatorConversionPackets.profileId, profile.id)).limit(1);
  if (!packet) throw new Error("Conversion packet was not persisted");

  const automationInput = buildAutomation(profile, packet.id, intelligenceInput, assignedRecruiter);
  await database.insert(creatorConversionAutomation).values(automationInput).onDuplicateKeyUpdate({
    set: {
      packetId: packet.id,
      assignedRecruiter: automationInput.assignedRecruiter,
      followUpCadence: automationInput.followUpCadence,
      nextFollowUpAt: automationInput.nextFollowUpAt,
      interestScore: automationInput.interestScore,
      onboardingStage: automationInput.onboardingStage,
      onboardingStageHistory: automationInput.onboardingStageHistory,
      telegramTransitionStatus: automationInput.telegramTransitionStatus,
      telegramTransitionTarget: automationInput.telegramTransitionTarget,
      conversionStage: automationInput.conversionStage,
      stripeActivationStatus: automationInput.stripeActivationStatus,
      stripeActivationReference: automationInput.stripeActivationReference,
      moneyNextAction: automationInput.moneyNextAction,
      updatedAt: new Date(),
    },
  });
  const [automation] = await database.select().from(creatorConversionAutomation).where(eq(creatorConversionAutomation.profileId, profile.id)).limit(1);
  if (!automation) throw new Error("Conversion automation was not persisted");

  const priorityInput = buildPriority(profile, intelligenceInput);
  await database.insert(creatorAcquisitionPriorities).values({ ...priorityInput, intelligenceId: intelligence.id }).onDuplicateKeyUpdate({
    set: { ...priorityInput, intelligenceId: intelligence.id, scoredAt: new Date(), updatedAt: new Date() },
  });
  const [priority] = await database.select().from(creatorAcquisitionPriorities).where(eq(creatorAcquisitionPriorities.profileId, profile.id)).limit(1);
  if (!priority) throw new Error("Acquisition priority was not persisted");

  return { profile: serializeProfile(profile), intelligence, packet, automation, priority };
}

function rowList<T>(result: unknown): T[] {
  const rows = (result as { rows?: T[] })?.rows;
  if (Array.isArray(rows)) return rows;
  if (Array.isArray(result)) return result as T[];
  return [];
}

export const conversionEngineRouter = router({
  seedRevenuePackages: protectedProcedure.mutation(async () => {
    const packages = await ensureHighTicketPackages();
    return { seeded: packages.length, packages };
  }),

  generateForCreator: protectedProcedure
    .input(z.object({ profileId: z.number().int().positive(), assignedRecruiter: z.string().min(1).max(160).optional() }))
    .mutation(async ({ input }) => generateForProfile(input.profileId, input.assignedRecruiter)),

  generateForTopQueue: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(25).default(10), assignedRecruiter: z.string().min(1).max(160).optional() }).default({ limit: 10 }))
    .mutation(async ({ input }) => {
      const database = await ensureDb();
      const profiles = await database.select().from(recruiterCreatorProfiles).orderBy(desc(recruiterCreatorProfiles.totalScore)).limit(input.limit);
      const generated: GeneratedConversionEngine[] = [];
      for (const profile of profiles) {
        generated.push(await generateForProfile(profile.id, input.assignedRecruiter));
      }
      return { generatedCount: generated.length, generated };
    }),

  getCommandCenter: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(25) }).default({ limit: 25 }))
    .query(async ({ input }) => {
      const database = await ensureDb();
      const [summaryResult] = await database.execute(sql`
        SELECT
          COUNT(DISTINCT rcp.id) AS total_profiles,
          COUNT(DISTINCT cci.id) AS intelligence_generated,
          COUNT(DISTINCT ccp.id) AS packets_generated,
          COUNT(DISTINCT cca.id) AS automation_records,
          SUM(CASE WHEN cca.telegram_transition_status IN ('invite_ready','invite_sent','joined','funnel_enrolled') THEN 1 ELSE 0 END) AS telegram_transitions,
          SUM(CASE WHEN cca.stripe_activation_status IN ('connected','verified') THEN 1 ELSE 0 END) AS stripe_activated,
          ROUND(AVG(cap.priority_score), 1) AS average_priority_score,
          COALESCE(SUM(cci.estimated_lost_revenue_cents), 0) AS estimated_lost_revenue_cents,
          COALESCE(SUM(cci.recurring_revenue_potential_cents), 0) AS recurring_revenue_potential_cents
        FROM recruiter_creator_profiles rcp
        LEFT JOIN creator_conversion_intelligence cci ON cci.profile_id = rcp.id
        LEFT JOIN creator_conversion_packets ccp ON ccp.profile_id = rcp.id
        LEFT JOIN creator_conversion_automation cca ON cca.profile_id = rcp.id
        LEFT JOIN creator_acquisition_priorities cap ON cap.profile_id = rcp.id
      `) as unknown as [{ rows?: Record<string, unknown>[] }];

      const [priorityResult] = await database.execute(sql`
        SELECT
          rcp.id AS profile_id,
          rcp.platform,
          rcp.handle,
          rcp.display_name,
          rcp.followers,
          rcp.engagement_rate,
          rcp.total_score,
          rcp.priority AS recruiter_priority,
          cci.niche_classification,
          cci.estimated_lost_revenue_cents,
          cci.recurring_revenue_potential_cents,
          cci.conversion_probability_score,
          ccp.personalized_social_audit,
          ccp.personalized_trailer_brief,
          cca.assigned_recruiter,
          cca.onboarding_stage,
          cca.telegram_transition_status,
          cca.stripe_activation_status,
          cca.money_next_action,
          cap.priority_score,
          cap.priority_band,
          cap.ranking_reason,
          cap.next_money_action
        FROM creator_acquisition_priorities cap
        JOIN recruiter_creator_profiles rcp ON rcp.id = cap.profile_id
        JOIN creator_conversion_intelligence cci ON cci.profile_id = rcp.id
        JOIN creator_conversion_packets ccp ON ccp.profile_id = rcp.id
        JOIN creator_conversion_automation cca ON cca.profile_id = rcp.id
        ORDER BY cap.priority_score DESC, cci.recurring_revenue_potential_cents DESC
        LIMIT ${input.limit}
      `) as unknown as [{ rows?: Record<string, unknown>[] }];

      const packages = await database.select().from(creatorHighTicketPackages).where(eq(creatorHighTicketPackages.isActive, true)).orderBy(desc(creatorHighTicketPackages.priceFloorCents));
      return {
        summary: rowList<Record<string, unknown>>(summaryResult)[0] || {},
        priorityQueue: rowList<Record<string, unknown>>(priorityResult),
        packages,
        generatedAt: new Date().toISOString(),
      };
    }),

  advanceStage: protectedProcedure
    .input(z.object({
      profileId: z.number().int().positive(),
      onboardingStage: onboardingStageSchema,
      conversionStage: conversionStageSchema,
      lastResponseSignal: z.string().min(1).max(120).optional(),
      telegramTransitionStatus: telegramTransitionSchema.optional(),
      stripeActivationStatus: stripeActivationSchema.optional(),
      stripeActivationReference: z.string().max(255).optional(),
      moneyNextAction: z.string().min(1).max(255).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await ensureDb();
      const [existing] = await database.select().from(creatorConversionAutomation).where(eq(creatorConversionAutomation.profileId, input.profileId)).limit(1);
      if (!existing) throw new Error("Generate a conversion packet before advancing onboarding stage");
      const history = Array.isArray(existing.onboardingStageHistory) ? existing.onboardingStageHistory : [];
      const nextHistory = [...history, { stage: input.onboardingStage, conversionStage: input.conversionStage, at: new Date().toISOString(), responseSignal: input.lastResponseSignal || null }];
      const interestDelta = input.conversionStage === "monetized" ? 18 : input.conversionStage === "activation" ? 12 : input.conversionStage === "interested" ? 8 : 3;
      await database.update(creatorConversionAutomation).set({
        onboardingStage: input.onboardingStage,
        conversionStage: input.conversionStage,
        lastResponseSignal: input.lastResponseSignal || existing.lastResponseSignal,
        telegramTransitionStatus: input.telegramTransitionStatus || existing.telegramTransitionStatus,
        stripeActivationStatus: input.stripeActivationStatus || existing.stripeActivationStatus,
        stripeActivationReference: input.stripeActivationReference || existing.stripeActivationReference,
        onboardingStageHistory: nextHistory,
        interestScore: clampScore(existing.interestScore + interestDelta),
        moneyNextAction: input.moneyNextAction || existing.moneyNextAction,
        updatedAt: new Date(),
      }).where(eq(creatorConversionAutomation.profileId, input.profileId));
      const [record] = await database.select().from(creatorConversionAutomation).where(eq(creatorConversionAutomation.profileId, input.profileId)).limit(1);
      return { updated: Boolean(record), automation: record };
    }),

  assignRecruiter: protectedProcedure
    .input(z.object({ profileId: z.number().int().positive(), assignedRecruiter: z.string().min(1).max(160) }))
    .mutation(async ({ input }) => {
      const database = await ensureDb();
      const [existing] = await database.select().from(creatorConversionAutomation).where(eq(creatorConversionAutomation.profileId, input.profileId)).limit(1);
      if (!existing) throw new Error("Generate a conversion packet before assigning a recruiter");
      await database.update(creatorConversionAutomation).set({ assignedRecruiter: input.assignedRecruiter, updatedAt: new Date() }).where(eq(creatorConversionAutomation.profileId, input.profileId));
      const [record] = await database.select().from(creatorConversionAutomation).where(eq(creatorConversionAutomation.profileId, input.profileId)).limit(1);
      return { assigned: Boolean(record), automation: record };
    }),
});
