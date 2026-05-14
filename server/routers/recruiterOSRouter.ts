import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { router, protectedProcedure } from "../_core/trpc";
import { db } from "../db";
import { recruiterCreatorProfiles } from "../../drizzle/schema";

const statusSchema = z.enum(["new", "qualified", "queued", "contacted", "replied", "onboarding", "onboarded", "declined"]);
const prioritySchema = z.enum(["low", "medium", "high", "critical"]);
const platformSchema = z.enum(["twitter", "x", "instagram", "tiktok", "reddit", "youtube", "telegram", "other"]);

const creatorInputSchema = z.object({
  platform: platformSchema,
  handle: z.string().min(1).max(160),
  displayName: z.string().max(255).optional(),
  profileUrl: z.string().url().optional(),
  source: z.string().min(1).max(80).default("manual"),
  bio: z.string().max(3000).optional(),
  niche: z.string().max(180).optional(),
  followers: z.number().int().min(0).default(0),
  engagementRate: z.number().min(0).max(100).default(0),
  recentPost: z.string().max(3000).optional(),
  platforms: z.array(z.string().min(1).max(40)).default([]),
  telegramUsername: z.string().max(160).optional(),
  stripeLinkStatus: z.enum(["not_started", "pending", "connected", "verified", "blocked"]).default("not_started"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type CreatorInput = z.infer<typeof creatorInputSchema>;

type WeightedScore = {
  monetizationScore: number;
  fitScore: number;
  urgencyScore: number;
  totalScore: number;
  priority: z.infer<typeof prioritySchema>;
  breakdown: Record<string, number | string>;
};

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@+/, "").toLowerCase();
}

function canonicalPlatform(platform: CreatorInput["platform"]): string {
  return platform === "x" ? "twitter" : platform;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreCreator(input: CreatorInput): WeightedScore {
  const followers = input.followers || 0;
  const engagementRate = input.engagementRate || 0;
  const bio = `${input.bio || ""} ${input.niche || ""} ${input.recentPost || ""}`.toLowerCase();
  const platformCount = new Set([canonicalPlatform(input.platform), ...(input.platforms || []).map((p) => p.toLowerCase())]).size;

  const followerScore = followers >= 5_000 && followers <= 150_000 ? 34 : followers > 150_000 ? 24 : followers >= 1_000 ? 20 : 10;
  const engagementScore = engagementRate >= 6 ? 28 : engagementRate >= 3 ? 22 : engagementRate >= 1.5 ? 14 : 6;
  const platformScore = platformCount >= 3 ? 18 : platformCount === 2 ? 12 : 6;
  const commerceSignals = ["onlyfans", "fansly", "patreon", "shop", "course", "coaching", "fitness", "model", "creator", "subscriber"];
  const commerceScore = commerceSignals.some((signal) => bio.includes(signal)) ? 20 : 8;

  const monetizationScore = clampScore(followerScore + engagementScore + commerceScore + platformScore);

  const valuesSignals = ["body", "positive", "wellness", "fitness", "creator", "artist", "coach", "model", "educator", "lifestyle"];
  const fitScore = clampScore(
    (valuesSignals.filter((signal) => bio.includes(signal)).length * 12) +
    (platformCount >= 2 ? 20 : 10) +
    (input.profileUrl ? 10 : 0) +
    (input.telegramUsername ? 10 : 0) +
    (input.recentPost ? 18 : 8)
  );

  const urgencySignals = ["burnout", "shadowban", "banned", "algorithm", "launch", "new", "link", "dm", "custom", "subs", "subscription"];
  const urgencyScore = clampScore(
    urgencySignals.filter((signal) => bio.includes(signal)).length * 12 +
    (engagementRate >= 4 ? 20 : 10) +
    (followers >= 10_000 ? 16 : 8) +
    (input.stripeLinkStatus === "connected" || input.stripeLinkStatus === "verified" ? 12 : 0)
  );

  const totalScore = clampScore(monetizationScore * 0.45 + fitScore * 0.35 + urgencyScore * 0.2);
  const priority: WeightedScore["priority"] = totalScore >= 85 ? "critical" : totalScore >= 70 ? "high" : totalScore >= 45 ? "medium" : "low";

  return {
    monetizationScore,
    fitScore,
    urgencyScore,
    totalScore,
    priority,
    breakdown: {
      followerScore,
      engagementScore,
      platformScore,
      commerceScore,
      platformCount,
      scoringModel: "recruiter_os_weighted_v1",
    },
  };
}

function buildOnboardingUrl(handle: string, platform: string): string {
  const base = process.env.VITE_APP_URL || "https://creatorvault.app";
  const token = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "creatorvault-recruiter-os")
    .update(`${platform}:${handle}:${new Date().toISOString().slice(0, 10)}`)
    .digest("hex")
    .slice(0, 32);
  const params = new URLSearchParams({ token, ref: handle, platform, utm_source: "recruiter_os", utm_campaign: "creator_acquisition" });
  return `${base}/onboard?${params.toString()}`;
}

function buildAuditPreview(input: CreatorInput, score: WeightedScore): Record<string, unknown> {
  const platformList = [canonicalPlatform(input.platform), ...(input.platforms || [])].filter(Boolean);
  const strengths = [];
  if (input.followers >= 5_000) strengths.push("Audience scale is large enough to test paid conversion immediately.");
  if (input.engagementRate >= 3) strengths.push("Engagement rate suggests fans are responsive enough for direct-offer testing.");
  if (platformList.length >= 2) strengths.push("Multi-platform footprint reduces dependence on a single algorithm.");
  if (input.recentPost) strengths.push("Recent content gives the recruiter a specific personalization hook.");

  return {
    summary: `${input.displayName || `@${normalizeHandle(input.handle)}`} is a ${score.priority}-priority CreatorVault recruiting candidate with a ${score.totalScore}/100 weighted acquisition score.`,
    monetizationAngle: input.niche
      ? `Package the ${input.niche} audience into a paid vault, starter offer, and 30-day conversion challenge.`
      : "Package the existing audience into a paid vault, starter offer, and 30-day conversion challenge.",
    strengths: strengths.length ? strengths : ["Profile has enough available signal for a recruiter to begin a personalized qualification conversation."],
    firstOffer: "Start with a low-friction paid vault launch, AI-assisted posting schedule, and first-subscriber challenge.",
    proofSignals: {
      onboardingUrlReady: true,
      telegramReady: Boolean(input.telegramUsername),
      stripeLinkStatus: input.stripeLinkStatus,
    },
  };
}

function buildTrailerConcept(input: CreatorInput, score: WeightedScore): string {
  const name = input.displayName || `@${normalizeHandle(input.handle)}`;
  const niche = input.niche || "creator brand";
  return `${name}: a 20-second CreatorVault teaser that opens with their strongest ${niche} hook, flashes fan-conversion proof points, and closes on the 85% creator-share vault launch CTA.`;
}

function buildOutreachMessage(input: CreatorInput, score: WeightedScore, onboardingUrl: string): string {
  const name = input.displayName || `@${normalizeHandle(input.handle)}`;
  const hook = input.recentPost ? `Your recent post about “${input.recentPost.slice(0, 70)}” has a clear paid-vault angle.` : `Your ${input.niche || "creator"} audience looks ready for a paid-vault offer.`;
  return `${name}, ${hook} CreatorVault can map it into an 85% creator-share vault, AI posting plan, and first-subscriber sprint. I built your quick audit here: ${onboardingUrl}`;
}

function toRecord(row: typeof recruiterCreatorProfiles.$inferSelect) {
  return {
    ...row,
    engagementRate: Number(row.engagementRate),
  };
}

async function persistCreator(input: CreatorInput) {
  if (!db) throw new Error("Database is not configured");

  const platform = canonicalPlatform(input.platform);
  const handle = normalizeHandle(input.handle);
  const score = scoreCreator({ ...input, platform: platform as CreatorInput["platform"], handle });
  const onboardingUrl = buildOnboardingUrl(handle, platform);
  const auditPreview = buildAuditPreview(input, score);
  const trailerConcept = buildTrailerConcept(input, score);
  const outreachMessage = buildOutreachMessage(input, score, onboardingUrl);
  const platforms = Array.from(new Set([platform, ...(input.platforms || []).map((p) => p.toLowerCase())]));

  const values: typeof recruiterCreatorProfiles.$inferInsert = {
    platform,
    handle,
    displayName: input.displayName,
    profileUrl: input.profileUrl,
    source: input.source,
    bio: input.bio,
    niche: input.niche,
    followers: input.followers,
    engagementRate: input.engagementRate.toFixed(2),
    recentPost: input.recentPost,
    platforms,
    monetizationScore: score.monetizationScore,
    fitScore: score.fitScore,
    urgencyScore: score.urgencyScore,
    totalScore: score.totalScore,
    scoreBreakdown: score.breakdown,
    auditPreview,
    trailerConcept,
    outreachMessage,
    onboardingUrl,
    telegramUsername: input.telegramUsername,
    telegramReady: Boolean(input.telegramUsername),
    stripeLinkStatus: input.stripeLinkStatus,
    status: score.totalScore >= 70 ? "qualified" : "new",
    priority: score.priority,
    metadata: input.metadata,
  };

  await db.insert(recruiterCreatorProfiles).values(values).onDuplicateKeyUpdate({
    set: {
      displayName: values.displayName,
      profileUrl: values.profileUrl,
      source: values.source,
      bio: values.bio,
      niche: values.niche,
      followers: values.followers,
      engagementRate: values.engagementRate,
      recentPost: values.recentPost,
      platforms: values.platforms,
      monetizationScore: values.monetizationScore,
      fitScore: values.fitScore,
      urgencyScore: values.urgencyScore,
      totalScore: values.totalScore,
      scoreBreakdown: values.scoreBreakdown,
      auditPreview: values.auditPreview,
      trailerConcept: values.trailerConcept,
      outreachMessage: values.outreachMessage,
      onboardingUrl: values.onboardingUrl,
      telegramUsername: values.telegramUsername,
      telegramReady: values.telegramReady,
      stripeLinkStatus: values.stripeLinkStatus,
      priority: values.priority,
      metadata: values.metadata,
      updatedAt: new Date(),
    },
  });

  const [record] = await db
    .select()
    .from(recruiterCreatorProfiles)
    .where(and(eq(recruiterCreatorProfiles.platform, platform), eq(recruiterCreatorProfiles.handle, handle)))
    .limit(1);

  return toRecord(record);
}

export const recruiterOSRouter = router({
  ingestCreator: protectedProcedure
    .input(creatorInputSchema)
    .mutation(async ({ input }) => persistCreator(input)),

  ingestBatch: protectedProcedure
    .input(z.object({ creators: z.array(creatorInputSchema).min(1).max(100) }))
    .mutation(async ({ input }) => {
      const records = [];
      for (const creator of input.creators) {
        records.push(await persistCreator(creator));
      }
      return {
        inserted: records.length,
        highPriority: records.filter((record) => ["high", "critical"].includes(record.priority)).length,
        records: records.sort((a, b) => b.totalScore - a.totalScore),
      };
    }),

  getQueue: protectedProcedure
    .input(z.object({ status: statusSchema.optional(), limit: z.number().int().min(1).max(100).default(50) }).default({ limit: 50 }))
    .query(async ({ input }) => {
      if (!db) throw new Error("Database is not configured");
      const rows = input.status
        ? await db.select().from(recruiterCreatorProfiles).where(eq(recruiterCreatorProfiles.status, input.status)).orderBy(desc(recruiterCreatorProfiles.totalScore)).limit(input.limit)
        : await db.select().from(recruiterCreatorProfiles).orderBy(desc(recruiterCreatorProfiles.totalScore)).limit(input.limit);
      return rows.map(toRecord);
    }),

  getDashboard: protectedProcedure.query(async () => {
    if (!db) throw new Error("Database is not configured");
    const [summary] = await db.execute(sql`
      SELECT
        COUNT(*) AS total_profiles,
        SUM(CASE WHEN status IN ('qualified','queued','contacted','replied','onboarding','onboarded') THEN 1 ELSE 0 END) AS qualified_profiles,
        SUM(CASE WHEN priority IN ('high','critical') THEN 1 ELSE 0 END) AS high_priority_profiles,
        SUM(CASE WHEN telegram_ready = 1 THEN 1 ELSE 0 END) AS telegram_ready_profiles,
        SUM(CASE WHEN onboarding_url IS NOT NULL AND onboarding_url <> '' THEN 1 ELSE 0 END) AS onboarding_links_ready,
        SUM(CASE WHEN stripe_link_status IN ('connected','verified') THEN 1 ELSE 0 END) AS stripe_linked_profiles,
        ROUND(AVG(total_score), 1) AS average_score
      FROM recruiter_creator_profiles
    `) as unknown as [{ rows?: Record<string, unknown>[] }];
    const topCreators = await db.select().from(recruiterCreatorProfiles).orderBy(desc(recruiterCreatorProfiles.totalScore)).limit(10);
    return {
      summary: (summary as any)?.rows?.[0] || {},
      topCreators: topCreators.map(toRecord),
      generatedAt: new Date().toISOString(),
    };
  }),

  updateStatus: protectedProcedure
    .input(z.object({ platform: platformSchema, handle: z.string().min(1), status: statusSchema }))
    .mutation(async ({ input }) => {
      if (!db) throw new Error("Database is not configured");
      const platform = canonicalPlatform(input.platform);
      const handle = normalizeHandle(input.handle);
      const patch: Partial<typeof recruiterCreatorProfiles.$inferInsert> = {
        status: input.status,
        lastContactedAt: ["contacted", "replied", "onboarding", "onboarded"].includes(input.status) ? new Date() : undefined,
        onboardedAt: input.status === "onboarded" ? new Date() : undefined,
      };
      await db.update(recruiterCreatorProfiles).set(patch).where(and(eq(recruiterCreatorProfiles.platform, platform), eq(recruiterCreatorProfiles.handle, handle)));
      const [record] = await db.select().from(recruiterCreatorProfiles).where(and(eq(recruiterCreatorProfiles.platform, platform), eq(recruiterCreatorProfiles.handle, handle))).limit(1);
      return { updated: Boolean(record), record: record ? toRecord(record) : null };
    }),
});
