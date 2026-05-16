/**
 * VaultX Creator Outreach Engine
 * Autonomous pipeline: scrape → score → personalize → send → track → follow-up
 * 50 outreach messages/day with Magic Links to onboarding portal
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import OpenAI from "openai";
import { db } from "../db";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import crypto from "crypto";
import { callTelegramApiWithGuard } from "../services/telegramOutboundGuard";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function extractRows(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result) && result.length >= 1 && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result.rows)) return result.rows;
  return [];
}

// ── Magic Link Generator ──────────────────────────────────────────────────────
function generateMagicLink(creatorHandle: string, platform: string): string {
  const token = crypto.randomUUID().replace(/-/g, "");
  const base = process.env.VITE_APP_URL || "https://creatorvault.live";
  return `${base}/onboard?token=${token}&ref=${encodeURIComponent(creatorHandle)}&platform=${platform}&utm_source=outreach&utm_campaign=vaultx_ignite`;
}

async function ensureOutreachLeadsTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS outreach_leads (
      id VARCHAR(36) PRIMARY KEY,
      handle VARCHAR(255) NOT NULL,
      platform VARCHAR(50) NOT NULL,
      display_name VARCHAR(255) NULL,
      bio TEXT NULL,
      recent_post TEXT NULL,
      followers INT NOT NULL DEFAULT 0,
      engagement_rate DECIMAL(6,2) NOT NULL DEFAULT 0.00,
      score INT NOT NULL DEFAULT 0,
      monetization_angle TEXT NULL,
      monetization_leak TEXT NULL,
      estimated_revenue_opportunity_cents INT NOT NULL DEFAULT 0,
      outreach_urgency VARCHAR(32) NOT NULL DEFAULT 'standard',
      next_money_cta TEXT NULL,
      message TEXT NOT NULL,
      magic_link TEXT NOT NULL,
      onboarding_packet JSON NULL,
      presentation_packet JSON NULL,
      telegram_followup_payload JSON NULL,
      attribution_code VARCHAR(128) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'queued',
      last_error TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_outreach_handle_platform (handle, platform),
      KEY idx_outreach_status_created (status, created_at),
      KEY idx_outreach_score (score),
      KEY idx_outreach_attribution_code (attribution_code)
    )
  `);

  try {
    await db.execute(sql`ALTER TABLE outreach_leads ADD COLUMN next_money_cta TEXT NULL`);
  } catch (error: any) {
    const code = error?.code || error?.cause?.code || error?.errno || error?.cause?.errno;
    const message = String(error?.message || error?.cause?.message || "").toLowerCase();
    const duplicateColumn = code === "ER_DUP_FIELDNAME" || code === 1060 || message.includes("duplicate column");
    if (!duplicateColumn) throw error;
  }
}

function normalizePlatform(platforms?: string[]): string {
  return (platforms?.[0] || "reddit").toLowerCase();
}

function identifyMonetizationLeak(creator: any): string {
  const followers = Number(creator.followers || creator.karma_score || 0);
  const engagement = Number(creator.engagement_rate || 0);
  if (followers >= 50000 && engagement >= 4) return "High-intent audience without a tracked paid activation funnel";
  if (followers >= 10000) return "Audience attention exists but the first-money CTA is not packaged into a direct offer";
  if (engagement >= 4) return "Engaged niche attention is not being converted into a repeatable buyer follow-up path";
  return "Creator discovery signal exists, but monetization assets and follow-up sequence are not yet systemized";
}

function estimateRevenueOpportunityCents(creator: any): number {
  const followers = Math.max(0, Number(creator.followers || creator.karma_score || 0));
  const engagement = Math.max(0, Number(creator.engagement_rate || 0));
  const engagedAudience = Math.round(followers * Math.min(engagement, 10) / 100);
  const estimatedBuyers = Math.max(1, Math.round(engagedAudience * 0.015));
  return Math.min(2500000, estimatedBuyers * 4900);
}

function buildMonetizationAngle(creator: any): string {
  const platform = normalizePlatform(creator.platforms);
  const topic = creator.recent_post ? ` around “${String(creator.recent_post).slice(0, 120)}”` : " around their strongest current content signal";
  return `Turn @${creator.handle}'s ${platform} attention${topic} into a tracked $49 first-money offer, onboarding packet, Telegram follow-up, and paid presentation CTA.`;
}

function classifyOutreachUrgency(score = 0, revenueCents = 0): string {
  if (score >= 80 || revenueCents >= 1000000) return "immediate";
  if (score >= 60 || revenueCents >= 250000) return "high";
  return "standard";
}

function buildClosingLoopPayloads(creator: any, magicLink: string, message: string) {
  const platform = normalizePlatform(creator.platforms);
  const revenueCents = estimateRevenueOpportunityCents(creator);
  const attributionCode = `cv_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const monetizationLeak = identifyMonetizationLeak(creator);
  const monetizationAngle = buildMonetizationAngle(creator);
  const nextMoneyCta = `Open the activation link, complete the five-step creator onboarding path, and launch the first paid $49 buyer CTA for @${creator.handle}.`;
  const paidOffer = `$49 first-money activation audit for @${creator.handle}`;
  const onboardingPacket = {
    creatorHandle: creator.handle,
    creatorTarget: creator.handle,
    platform,
    magicLink,
    activationLink: magicLink,
    requiredSteps: ["profile-proof", "paid-offer", "content-upload", "telegram-drop", "buyer-followup"],
    firstMoneyAction: nextMoneyCta,
  };
  const presentationPacket = {
    deckTitle: `CreatorVault first-money activation plan for @${creator.handle}`,
    paidOffer,
    creatorTarget: creator.handle,
    monetizationAngle,
    trailerBrief: `Cinematic proof-of-value trailer for @${creator.handle}: expose the revenue leak, show the first paid offer, and end with the activation CTA.`,
    creatorGrowthRoadmap: ["Package the first paid offer", "Push Telegram proof drop", "Track clicks and replies", "Escalate VIP prospects"],
  };
  const telegramFollowupPayload = {
    creatorTarget: creator.handle,
    platform,
    attributionCode,
    followupMessage: `${message}\n\nVIP activation: ${magicLink}`,
    message: `${message}\n\nVIP activation: ${magicLink}`,
    escalationTrigger: "reply_or_tracking_click",
    escalationPath: "owner_vip_review_if_reply_or_click",
    nextMoneyCta,
  };
  return {
    monetizationAngle,
    monetizationLeak,
    estimatedRevenueOpportunityCents: revenueCents,
    outreachUrgency: classifyOutreachUrgency(Number(creator.score || 0), revenueCents),
    nextMoneyCta,
    attributionCode,
    onboardingPacket,
    presentationPacket,
    telegramFollowupPayload,
  };
}

// ── Twitter/X Profile Scraper (live via Twitter API v2) ───────────────────────
async function scrapeTwitterProfiles(niche: string, count: number = 20): Promise<any[]> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    throw new Error("TWITTER_BEARER_TOKEN not configured; creator acquisition must use a real live source such as reddit or a configured Twitter API key.");
  }

  // Live Twitter API v2 search
  try {
    const query = encodeURIComponent(`(${niche} creator OR "content creator" OR "onlyfans" OR "fansly") -is:retweet lang:en`);
    const res = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=20&expansions=author_id&user.fields=public_metrics,description,verified`,
      { headers: { Authorization: `Bearer ${bearerToken}` } }
    );
    if (!res.ok) throw new Error(`Twitter API ${res.status}`);
    const data = await res.json();
    return (data.includes?.users || []).map((u: any) => ({
      handle: u.username,
      display_name: u.name,
      bio: u.description,
      followers: u.public_metrics?.followers_count || 0,
      engagement_rate: ((u.public_metrics?.tweet_count || 0) > 0 ? 3.5 : 2.0),
      recent_post: "Recent content",
      platforms: ["twitter"],
      twitter_id: u.id,
    }));
  } catch (e) {
    throw new Error(`Twitter API live creator discovery failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ── Reddit Profile Scraper (via Reddit JSON API) ──────────────────────────────
async function scrapeRedditProfiles(subreddit: string, count: number = 20): Promise<any[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/top.json?limit=${count}&t=week`,
      { headers: { "User-Agent": "VaultX-Outreach/1.0" } }
    );
    if (!res.ok) throw new Error(`Reddit API ${res.status}`);
    const data = await res.json();
    const posts = data.data?.children || [];
    const authorSet = new Set<string>(posts.map((p: any) => p.data.author as string));
    const authors = Array.from(authorSet).filter(a => a !== "[deleted]");
    return authors.slice(0, count).map((author: string) => {
      // Use real karma scores from the Reddit API response — not Math.random()
      const authorPosts = posts.filter((p: any) => p.data.author === author);
      const topPost = authorPosts.reduce((best: any, p: any) =>
        (p.data.score > (best?.data?.score || 0)) ? p : best, authorPosts[0]);
      const totalKarma = authorPosts.reduce((sum: number, p: any) => sum + (p.data.score || 0), 0);
      // Engagement: comment-to-upvote ratio on top post (real Reddit signal)
      const topComments = topPost?.data?.num_comments || 0;
      const topScore = topPost?.data?.score || 1;
      const engagementRate = parseFloat(Math.min(10, (topComments / topScore) * 100).toFixed(1));
      return {
        handle: author,
        display_name: author,
        bio: `Active creator on r/${subreddit}`,
        // Reddit does not expose follower counts — karma_score is the real metric
        karma_score: totalKarma,
        followers: totalKarma, // use karma as the engagement proxy for scoring
        engagement_rate: engagementRate,
        recent_post: topPost?.data?.title || "Recent post",
        recent_post_score: topPost?.data?.score || 0,
        platforms: ["reddit"],
      };
    });
  } catch (e) {
    console.error("Reddit API error:", e);
    return [];
  }
}

async function scrapeProductionCreatorProfiles(count: number = 20): Promise<any[]> {
  const rows = extractRows(await db.execute(sql`
    SELECT id, stage_name, sub_group, bio, follower_count, engagement_rate, subscription_price, monthly_revenue, status
    FROM greatest_show_creators
    WHERE status = 'active'
    ORDER BY COALESCE(follower_count, 0) DESC, id DESC
    LIMIT ${count}
  `));

  return rows.map((row: any) => {
    const handle = String(row.stage_name || `creator_${row.id}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || `creator_${row.id}`;
    return {
      handle,
      display_name: row.stage_name,
      bio: row.bio,
      followers: Number(row.follower_count || 0),
      engagement_rate: Number(row.engagement_rate || 0),
      recent_post: `${row.sub_group || "creator"} membership offer at $${Number(row.subscription_price || 0).toFixed(2)}`,
      platforms: ["creatorvault"],
      source_table: "greatest_show_creators",
      source_id: row.id,
      subscription_price: Number(row.subscription_price || 0),
      monthly_revenue: Number(row.monthly_revenue || 0),
    };
  });
}

// ── Engagement Scorer ─────────────────────────────────────────────────────────
function scoreCreator(creator: any): number {
  let score = 0;
  // Follower range sweet spot: 5k-100k (micro-influencers convert best)
  if (creator.followers >= 5000 && creator.followers <= 100000) score += 40;
  else if (creator.followers > 100000) score += 20;
  else score += 10;
  // Engagement rate
  if (creator.engagement_rate >= 4) score += 30;
  else if (creator.engagement_rate >= 2) score += 15;
  // Multi-platform presence
  if (creator.platforms?.length > 1) score += 20;
  // Bio relevance
  const relevantKeywords = ["body", "positive", "creator", "content", "adult", "fitness", "wellness", "model"];
  const bioLower = (creator.bio || "").toLowerCase();
  if (relevantKeywords.some(k => bioLower.includes(k))) score += 10;
  return score;
}

// ── Personalized Message Generator ───────────────────────────────────────────
async function generateOutreachMessage(creator: any, magicLink: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "system",
      content: `You are the VaultX Creator Success team. Write personalized, authentic outreach messages to creators. 
      Be direct, value-first, and reference their specific content. Never sound like spam. Max 280 chars for DM, 500 for email.
      Always mention: 85% revenue share (vs 80% on OnlyFans), AI tools that automate their marketing, and the $5K challenge.`,
    }, {
      role: "user",
      content: `Write a personalized DM to @${creator.handle} on ${creator.platforms?.[0] || "Twitter"}.
      Their recent content: "${creator.recent_post}"
      Their bio: "${creator.bio}"
      Their followers: ${creator.followers?.toLocaleString()}
      
      The message must:
      1. Reference their specific recent content or niche authentically
      2. Mention VaultX's 85% revenue share (5% more than OnlyFans)
      3. Mention the AI tools that post for them automatically
      4. Include this exact link: ${magicLink}
      5. Be under 280 characters for Twitter DM
      6. Sound human, not corporate
      
      Return ONLY the message text, nothing else.`,
    }],
    max_tokens: 200,
  });
  return completion.choices[0].message.content?.trim() || "";
}

// ── AI Chat Assistant Response ────────────────────────────────────────────────
async function generateReplyToCreator(
  creatorHandle: string,
  creatorMessage: string,
  conversationHistory: any[]
): Promise<string> {
  const messages = [
    {
      role: "system" as const,
      content: `You are Alex, the VaultX Creator Success Manager. You are warm, direct, and knowledgeable about the creator economy.
      Your job: answer questions about VaultX, handle objections, and guide creators to sign up and submit their tax documentation.
      
      Key facts:
      - VaultX takes 15% (creators keep 85%) vs OnlyFans 20%
      - AI agents handle all social posting automatically
      - $5K Ignite Challenge: structured 30-day plan to earn first $5K
      - $15K Empire Challenge: scale to $15K/month recurring
      - Stripe payments, instant payouts
      - Full content ownership, no arbitrary bans
      - Body-positive, uncensored AI creation tools
      
      When creator is ready to sign up: ask for their email and send them the onboarding link.
      When they ask about taxes: explain W-9 (US) or W-8BEN (international) is collected during onboarding.
      Always be closing — every response should move them one step closer to signing up.`,
    },
    ...conversationHistory.map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    {
      role: "user" as const,
      content: creatorMessage,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 300,
  });
  return completion.choices[0].message.content?.trim() || "";
}

// ── Router ────────────────────────────────────────────────────────────────────
export const creatorOutreachRouter = router({

  // Scrape and score creator profiles from Twitter + Reddit
  scrapeCreators: protectedProcedure
    .input(z.object({
      platform: z.enum(["twitter", "reddit", "both"]),
      niche: z.string().default("body positive adult creator"),
      count: z.number().min(10).max(100).default(50),
    }))
    .mutation(async ({ input }) => {
      const profiles: any[] = [];

      if (input.platform === "twitter" || input.platform === "both") {
        const twitter = await scrapeTwitterProfiles(input.niche, Math.ceil(input.count / 2));
        profiles.push(...twitter);
      }

      if (input.platform === "reddit" || input.platform === "both") {
        const subreddits = ["onlyfans101", "CreatorEconomy", "bodypositive", "SexWorkersOnly"];
        for (const sub of subreddits.slice(0, 2)) {
          const reddit = await scrapeRedditProfiles(sub, Math.ceil(input.count / 4));
          profiles.push(...reddit);
        }
      }

      // Score, enrich, and sort real discovered creators only
      const scored = profiles
        .filter(p => p?.handle)
        .map(p => {
          const base = { ...p, platforms: p.platforms?.length ? p.platforms : [input.platform === "twitter" ? "twitter" : "reddit"] };
          const score = scoreCreator(base);
          const revenueCents = estimateRevenueOpportunityCents(base);
          return {
            ...base,
            score,
            monetizationLeak: identifyMonetizationLeak(base),
            monetizationAngle: buildMonetizationAngle(base),
            estimatedRevenueOpportunityCents: revenueCents,
            outreachUrgency: classifyOutreachUrgency(score, revenueCents),
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, input.count);

      return {
        creators: scored,
        total: scored.length,
        highIntent: scored.filter(c => c.score >= 70).length,
        source: input.platform,
        productionBacked: true,
        timestamp: new Date().toISOString(),
      };
    }),

  // Generate and queue 50 personalized outreach messages
  queueDailyOutreach: protectedProcedure
    .input(z.object({
      creators: z.array(z.object({
        handle: z.string(),
        display_name: z.string().optional(),
        bio: z.string().optional(),
        followers: z.number().optional(),
        engagement_rate: z.number().optional(),
        recent_post: z.string().optional(),
        platforms: z.array(z.string()).optional(),
        score: z.number().optional(),
      })),
      dailyLimit: z.number().default(50),
    }))
    .mutation(async ({ input }) => {
      await ensureOutreachLeadsTable();
      const results = [];
      const toContact = input.creators.slice(0, input.dailyLimit);

      for (const creator of toContact) {
        const platform = normalizePlatform(creator.platforms);
        const magicLink = generateMagicLink(creator.handle, platform);
        const message = await generateOutreachMessage(creator, magicLink);
        const payloads = buildClosingLoopPayloads(creator, magicLink, message);
        const leadId = crypto.randomUUID();

        await db.execute(sql`
          INSERT INTO outreach_leads (
            id, handle, platform, display_name, bio, recent_post, followers, engagement_rate,
            score, monetization_angle, monetization_leak, estimated_revenue_opportunity_cents,
            outreach_urgency, next_money_cta, message, magic_link, onboarding_packet, presentation_packet,
            telegram_followup_payload, attribution_code, status, created_at, updated_at
          ) VALUES (
            ${leadId},
            ${creator.handle},
            ${platform},
            ${creator.display_name || creator.handle},
            ${creator.bio || null},
            ${creator.recent_post || null},
            ${creator.followers || 0},
            ${creator.engagement_rate || 0},
            ${creator.score || 0},
            ${payloads.monetizationAngle},
            ${payloads.monetizationLeak},
            ${payloads.estimatedRevenueOpportunityCents},
            ${payloads.outreachUrgency},
            ${payloads.nextMoneyCta},
            ${message},
            ${magicLink},
            ${JSON.stringify(payloads.onboardingPacket)},
            ${JSON.stringify(payloads.presentationPacket)},
            ${JSON.stringify(payloads.telegramFollowupPayload)},
            ${payloads.attributionCode},
            'queued',
            NOW(),
            NOW()
          )
          ON DUPLICATE KEY UPDATE
            display_name = VALUES(display_name),
            bio = VALUES(bio),
            recent_post = VALUES(recent_post),
            followers = VALUES(followers),
            engagement_rate = VALUES(engagement_rate),
            score = VALUES(score),
            monetization_angle = VALUES(monetization_angle),
            monetization_leak = VALUES(monetization_leak),
            estimated_revenue_opportunity_cents = VALUES(estimated_revenue_opportunity_cents),
            outreach_urgency = VALUES(outreach_urgency),
            next_money_cta = VALUES(next_money_cta),
            message = VALUES(message),
            magic_link = VALUES(magic_link),
            onboarding_packet = VALUES(onboarding_packet),
            presentation_packet = VALUES(presentation_packet),
            telegram_followup_payload = VALUES(telegram_followup_payload),
            attribution_code = VALUES(attribution_code),
            status = 'queued',
            last_error = NULL,
            updated_at = NOW()
        `);

        const rowResult = await db.execute(sql`
          SELECT id FROM outreach_leads WHERE handle = ${creator.handle} AND platform = ${platform} LIMIT 1
        `);
        const persistedId = extractRows(rowResult)[0]?.id || leadId;

        results.push({
          id: persistedId,
          handle: creator.handle,
          platform,
          score: creator.score || 0,
          monetizationAngle: payloads.monetizationAngle,
          monetizationLeak: payloads.monetizationLeak,
          estimatedRevenueOpportunityCents: payloads.estimatedRevenueOpportunityCents,
          outreachUrgency: payloads.outreachUrgency,
          message,
          magicLink,
          onboardingPacket: payloads.onboardingPacket,
          presentationPacket: payloads.presentationPacket,
          telegramFollowupPayload: payloads.telegramFollowupPayload,
          attributionCode: payloads.attributionCode,
          nextMoneyCta: payloads.nextMoneyCta,
          status: "queued",
          persisted: true,
        });
      }

      return {
        queued: results.length,
        messages: results,
        dailyTarget: input.dailyLimit,
        productionBacked: true,
        timestamp: new Date().toISOString(),
      };
    }),

  // Send outreach via Telegram bot (for Telegram creators)
  sendTelegramOutreach: protectedProcedure
    .input(z.object({
      telegramUsername: z.string(),
      message: z.string(),
    }))
    .mutation(async ({ input }) => {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN not configured");

      // Send via Telegram Bot API only when the emergency outbound gate is explicitly enabled.
      const data = await callTelegramApiWithGuard({
        botToken,
        method: "sendMessage",
        body: {
          chat_id: `@${input.telegramUsername}`,
          text: input.message,
          parse_mode: "Markdown",
        },
        context: "creatorOutreachRouter.sendTelegramOutreach",
      }) as any;
      return { sent: data.ok, result: data };
    }),

  // AI Chat Assistant — handles creator replies and closes the deal
  handleCreatorReply: protectedProcedure
    .input(z.object({
      creatorHandle: z.string(),
      creatorMessage: z.string(),
      conversationHistory: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).default([]),
    }))
    .mutation(async ({ input }) => {
      const reply = await generateReplyToCreator(
        input.creatorHandle,
        input.creatorMessage,
        input.conversationHistory
      );

      // Detect if creator is ready to sign up
      const readySignals = ["yes", "sign up", "interested", "how do i", "sounds good", "let's do", "where do i"];
      const isReady = readySignals.some(s => input.creatorMessage.toLowerCase().includes(s));

      // Generate fresh magic link if they're ready
      const magicLink = isReady
        ? generateMagicLink(input.creatorHandle, "direct")
        : null;

      return {
        reply,
        isReady,
        magicLink,
        nextAction: isReady ? "send_onboarding_link" : "continue_conversation",
      };
    }),

  // Run the production-backed acquisition → outreach → distribution → telemetry closing loop
  runCreatorClosingLoop: protectedProcedure
    .input(z.object({
      platform: z.enum(["reddit", "twitter", "production_table"]).default("production_table"),
      niche: z.string().default("creator economy"),
      count: z.number().min(1).max(25).default(5),
    }))
    .mutation(async ({ ctx, input }) => {
      await ensureOutreachLeadsTable();

      const profiles = input.platform === "twitter"
        ? await scrapeTwitterProfiles(input.niche, input.count)
        : input.platform === "production_table"
          ? await scrapeProductionCreatorProfiles(input.count)
          : await scrapeRedditProfiles(input.niche.replace(/^r\//, ""), input.count);

      const scored = profiles
        .filter(p => p?.handle)
        .map(p => {
          const base = { ...p, platforms: p.platforms?.length ? p.platforms : [input.platform] };
          const score = scoreCreator(base);
          const revenueCents = estimateRevenueOpportunityCents(base);
          return {
            ...base,
            score,
            monetizationLeak: identifyMonetizationLeak(base),
            monetizationAngle: buildMonetizationAngle(base),
            estimatedRevenueOpportunityCents: revenueCents,
            outreachUrgency: classifyOutreachUrgency(score, revenueCents),
          };
        })
        .sort((a, b) => b.score - a.score);

      const creator = scored[0];
      if (!creator) {
        throw new Error(`No production-backed ${input.platform} creators were discovered for ${input.niche}; closing-loop proof cannot use synthetic leads.`);
      }

      const platform = normalizePlatform(creator.platforms);
      const magicLink = generateMagicLink(creator.handle, platform);
      const message = await generateOutreachMessage(creator, magicLink);
      const payloads = buildClosingLoopPayloads(creator, magicLink, message);
      const leadId = crypto.randomUUID();

      await db.execute(sql`
        INSERT INTO outreach_leads (
          id, handle, platform, display_name, bio, recent_post, followers, engagement_rate,
          score, monetization_angle, monetization_leak, estimated_revenue_opportunity_cents,
          outreach_urgency, next_money_cta, message, magic_link, onboarding_packet, presentation_packet,
          telegram_followup_payload, attribution_code, status, created_at, updated_at
        ) VALUES (
          ${leadId},
          ${creator.handle},
          ${platform},
          ${creator.display_name || creator.handle},
          ${creator.bio || null},
          ${creator.recent_post || null},
          ${creator.followers || 0},
          ${creator.engagement_rate || 0},
          ${creator.score || 0},
          ${payloads.monetizationAngle},
          ${payloads.monetizationLeak},
          ${payloads.estimatedRevenueOpportunityCents},
          ${payloads.outreachUrgency},
          ${payloads.nextMoneyCta},
          ${message},
          ${magicLink},
          ${JSON.stringify(payloads.onboardingPacket)},
          ${JSON.stringify(payloads.presentationPacket)},
          ${JSON.stringify(payloads.telegramFollowupPayload)},
          ${payloads.attributionCode},
          'queued',
          NOW(),
          NOW()
        )
        ON DUPLICATE KEY UPDATE
          display_name = VALUES(display_name),
          bio = VALUES(bio),
          recent_post = VALUES(recent_post),
          followers = VALUES(followers),
          engagement_rate = VALUES(engagement_rate),
          score = VALUES(score),
          monetization_angle = VALUES(monetization_angle),
          monetization_leak = VALUES(monetization_leak),
          estimated_revenue_opportunity_cents = VALUES(estimated_revenue_opportunity_cents),
          outreach_urgency = VALUES(outreach_urgency),
          next_money_cta = VALUES(next_money_cta),
          message = VALUES(message),
          magic_link = VALUES(magic_link),
          onboarding_packet = VALUES(onboarding_packet),
          presentation_packet = VALUES(presentation_packet),
          telegram_followup_payload = VALUES(telegram_followup_payload),
          attribution_code = VALUES(attribution_code),
          status = 'queued',
          last_error = NULL,
          updated_at = NOW()
      `);

      const leadRows = extractRows(await db.execute(sql`
        SELECT * FROM outreach_leads WHERE handle = ${creator.handle} AND platform = ${platform} LIMIT 1
      `));
      const lead = leadRows[0];
      if (!lead?.id) throw new Error("outreach_leads insert did not return a persisted lead row");

      const channelRows = extractRows(await db.execute(sql`
        SELECT * FROM channel_identities
        WHERE owner_id = ${ctx.user.id} OR owner_type IN ('vaultx_brand','creatorvault_brand')
        ORDER BY owner_type ASC, created_at ASC
        LIMIT 1
      `));
      const channel = channelRows[0];
      if (!channel?.id) {
        throw new Error("No existing distribution channel identity is available for the creator closing loop; create or seed a channel before claiming distribution scheduling success.");
      }

      const creatorRows = extractRows(await db.execute(sql`
        SELECT id FROM vaultx_creators WHERE user_id = ${ctx.user.id} LIMIT 1
      `));
      const creatorId = creatorRows[0]?.id || ctx.user.id;
      const trackingCode = payloads.attributionCode;
      const distributionPlatform = "telegram";
      await db.execute(sql`
        INSERT INTO distribution_jobs
          (creator_id, channel_identity_id, connected_account_id, platform, content_id,
           asset_url, asset_type, caption, destination_url, tracking_code, status, scheduled_at)
        VALUES
          (${creatorId}, ${channel.id}, NULL, ${distributionPlatform}, NULL,
           ${magicLink}, 'text', ${message}, ${magicLink}, ${trackingCode}, 'draft', NULL)
      `);

      const distributionRows = extractRows(await db.execute(sql`
        SELECT * FROM distribution_jobs WHERE tracking_code = ${trackingCode} ORDER BY created_at DESC LIMIT 1
      `));
      const distributionJob = distributionRows[0];
      if (!distributionJob?.id) throw new Error("distribution_jobs insert did not return a persisted tracked job row");

      const telemetryId = crypto.randomUUID();
      const now = new Date();
      await db.execute(sql`
        INSERT INTO agent_telemetry_events
          (id, agent_id, agent_name, agent_category, task_type, target, status,
           started_at, finished_at, outcome, revenue_generated, error_message, metadata)
        VALUES
          (${telemetryId}, 'creator-outreach-closing-loop', 'Creator Outreach Closing Loop', 'sales',
           'creator_acquisition_to_distribution', ${creator.handle}, 'success',
           ${now}, ${now}, ${`Persisted outreach lead ${lead.id}, distribution job ${distributionJob.id}, and tracking code ${trackingCode}`},
           ${payloads.estimatedRevenueOpportunityCents / 100}, NULL,
           ${JSON.stringify({ leadId: lead.id, distributionJobId: distributionJob.id, trackingCode, sourcePlatform: platform, distributionPlatform, creatorHandle: creator.handle, sourceTable: creator.source_table || null, sourceId: creator.source_id || null })})
      `);

      return {
        productionBacked: true,
        lead: {
          id: lead.id,
          handle: lead.handle,
          platform: lead.platform,
          score: Number(lead.score || creator.score || 0),
          status: lead.status,
          monetizationAngle: lead.monetization_angle,
          monetizationLeak: lead.monetization_leak,
          estimatedRevenueOpportunityCents: Number(lead.estimated_revenue_opportunity_cents || 0),
          nextMoneyCta: lead.next_money_cta,
          sourceTable: creator.source_table || null,
          sourceId: creator.source_id || null,
        },
        onboardingPacket: payloads.onboardingPacket,
        presentationPacket: payloads.presentationPacket,
        telegramFollowupPayload: payloads.telegramFollowupPayload,
        distributionJob: {
          id: distributionJob.id,
          trackingCode,
          trackingUrl: `https://creatorvault.live/r/${trackingCode}`,
          status: distributionJob.status,
          channelIdentityId: distributionJob.channel_identity_id,
          platform: distributionJob.platform,
        },
        telemetry: { id: telemetryId, status: "success" },
        timestamp: new Date().toISOString(),
      };
    }),

  getClosingLoopLeads: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(25) }).default({ limit: 25 }))
    .query(async ({ input }) => {
      await ensureOutreachLeadsTable();
      const rows = extractRows(await db.execute(sql`
        SELECT id, handle, platform, display_name, followers, engagement_rate, score,
               monetization_angle, monetization_leak, estimated_revenue_opportunity_cents,
               outreach_urgency, next_money_cta, attribution_code, status, created_at, updated_at
        FROM outreach_leads
        ORDER BY updated_at DESC
        LIMIT ${input.limit}
      `));
      return { leads: rows, productionBacked: true, timestamp: new Date().toISOString() };
    }),

  // Get outreach stats for revenue reporting
  getOutreachStats: protectedProcedure
    .query(async () => {
      try {
        const stats = await db.execute(sql`
          SELECT 
            COUNT(*) as total_contacted,
            SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as total_replied,
            SUM(CASE WHEN status = 'onboarded' THEN 1 ELSE 0 END) as total_onboarded,
            SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
            DATE(created_at) as date
          FROM outreach_leads
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        `);
        return { stats: extractRows(stats), timestamp: new Date().toISOString() };
      } catch (error) {
        throw new Error(`outreach_leads stats unavailable: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  // Mark lead as replied/onboarded
  updateLeadStatus: protectedProcedure
    .input(z.object({
      handle: z.string(),
      status: z.enum(["queued", "sent", "replied", "onboarded", "declined"]),
    }))
    .mutation(async ({ input }) => {
      await ensureOutreachLeadsTable();
      const result = await db.execute(sql`
        UPDATE outreach_leads SET status = ${input.status}, updated_at = NOW()
        WHERE handle = ${input.handle}
      `);
      return { updated: true, result };
    }),

  // Generate the full onboarding portal content for a Magic Link token
  getOnboardingContent: protectedProcedure
    .input(z.object({
      token: z.string(),
      ref: z.string(),
      platform: z.string(),
    }))
    .query(async ({ input }) => {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Generate a personalized onboarding welcome for @${input.ref} from ${input.platform}.
          Include: welcome message, what they get (85% revenue, AI tools, $5K challenge), 
          what to expect in first 30 days, and next steps (upload ID, connect socials, set prices).
          Return as JSON: { welcome, benefits, timeline, next_steps }`,
        }],
        response_format: { type: "json_object" },
        max_tokens: 600,
      });
      const content = JSON.parse(completion.choices[0].message.content || "{}");
      return {
        ...content,
        token: input.token,
        ref: input.ref,
        platform: input.platform,
        challengeUrl: "/challenges",
        studioUrl: "/studio",
      };
    }),
});
