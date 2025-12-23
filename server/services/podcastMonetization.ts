/**
 * Podcast Monetization Service
 * Handles dynamic ad insertion, sponsor matching, and revenue tracking
 */

import { db } from "../db";
import { podcastMonetization, podcastSponsors, podcastEpisodes } from "../../drizzle/schema-podcasting";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

export interface AdInsertionConfig {
  episodeId: string;
  podcastId: string;
  userId: number;
  sponsorId: string;
  adPlacement: "pre_roll" | "mid_roll" | "post_roll";
  adTimestamp?: number; // For mid-roll, timestamp in seconds
  adDuration: number; // Duration in seconds
  adAudioUrl: string; // S3 URL of ad audio
  revenue: number; // Expected revenue in cents
}

export interface SponsorMatchCriteria {
  category?: string;
  minBudget?: number;
  targetAudience?: string[];
  contentType?: string;
}

/**
 * Insert ad into episode
 * Creates monetization record and returns ad configuration
 */
export async function insertAd(config: AdInsertionConfig) {
  // Get sponsor info
  const [sponsor] = await db
    .select()
    .from(podcastSponsors)
    .where(and(eq(podcastSponsors.id, config.sponsorId), eq(podcastSponsors.userId, config.userId)))
    .limit(1);

  if (!sponsor) {
    throw new Error("Sponsor not found");
  }

  // Calculate commission
  const commissionRate = sponsor.commissionRate ? Number(sponsor.commissionRate) : 20; // Default 20%
  const platformAmount = Math.floor((config.revenue * commissionRate) / 100);
  const creatorAmount = config.revenue - platformAmount;

  // Create monetization record
  const [monetization] = await db
    .insert(podcastMonetization)
    .values({
      podcastId: config.podcastId,
      episodeId: config.episodeId,
      userId: config.userId,
      monetizationType: "dynamic_ad",
      sponsorName: sponsor.sponsorName,
      sponsorContactEmail: sponsor.contactEmail || undefined,
      adPlacement: config.adPlacement,
      adTimestamp: config.adTimestamp,
      adDuration: config.adDuration,
      adAudioUrl: config.adAudioUrl,
      revenue: config.revenue.toString(),
      paymentStatus: "pending",
    })
    .$returningId();

  return await db.select().from(podcastMonetization).where(eq(podcastMonetization.id, monetization.id)).limit(1);
}

/**
 * Get all ads for an episode
 */
export async function getEpisodeAds(episodeId: string, userId: number) {
  return await db
    .select()
    .from(podcastMonetization)
    .where(and(eq(podcastMonetization.episodeId, episodeId), eq(podcastMonetization.userId, userId)))
    .orderBy(podcastMonetization.adTimestamp);
}

/**
 * Remove ad from episode
 */
export async function removeAd(monetizationId: string, userId: number) {
  await db
    .delete(podcastMonetization)
    .where(and(eq(podcastMonetization.id, monetizationId), eq(podcastMonetization.userId, userId)));

  return { success: true };
}

/**
 * Match sponsors to podcast based on criteria
 * Returns ranked list of potential sponsors
 */
export async function matchSponsors(userId: number, criteria: SponsorMatchCriteria) {
  // Get all active sponsors for user
  const sponsors = await db
    .select()
    .from(podcastSponsors)
    .where(and(eq(podcastSponsors.userId, userId), eq(podcastSponsors.status, "active")))
    .orderBy(desc(podcastSponsors.createdAt));

  // In production, this would use ML/AI to match sponsors
  // For now, return all active sponsors with basic scoring
  return sponsors.map((sponsor) => ({
    ...sponsor,
    matchScore: 0.85, // Placeholder score
    estimatedRevenue: 5000, // Placeholder in cents ($50)
    recommendedPlacement: "mid_roll" as const,
  }));
}

/**
 * Create sponsor
 */
export async function createSponsor(
  userId: number,
  sponsorData: {
    sponsorName: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    website?: string;
    dealTerms?: string;
    commissionRate?: number;
    paymentTerms?: string;
    contractStartDate?: Date;
    contractEndDate?: Date;
    notes?: string;
  }
) {
  const [sponsor] = await db
    .insert(podcastSponsors)
    .values({
      userId,
      ...sponsorData,
      commissionRate: sponsorData.commissionRate?.toString(),
      status: "prospect",
    })
    .$returningId();

  return await db.select().from(podcastSponsors).where(eq(podcastSponsors.id, sponsor.id)).limit(1);
}

/**
 * Update sponsor
 */
export async function updateSponsor(
  sponsorId: string,
  userId: number,
  updates: Partial<{
    sponsorName: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    website: string;
    dealTerms: string;
    commissionRate: number;
    paymentTerms: string;
    contractStartDate: Date;
    contractEndDate: Date;
    status: "prospect" | "negotiating" | "active" | "paused" | "ended";
    notes: string;
  }>
) {
  await db
    .update(podcastSponsors)
    .set({
      ...updates,
      commissionRate: updates.commissionRate?.toString(),
      updatedAt: new Date(),
    })
    .where(and(eq(podcastSponsors.id, sponsorId), eq(podcastSponsors.userId, userId)));

  return await db.select().from(podcastSponsors).where(eq(podcastSponsors.id, sponsorId)).limit(1);
}

/**
 * Get user's sponsors
 */
export async function getUserSponsors(userId: number, status?: string) {
  if (status) {
    return await db
      .select()
      .from(podcastSponsors)
      .where(and(eq(podcastSponsors.userId, userId), eq(podcastSponsors.status, status as any)))
      .orderBy(desc(podcastSponsors.createdAt));
  }

  return await db
    .select()
    .from(podcastSponsors)
    .where(eq(podcastSponsors.userId, userId))
    .orderBy(desc(podcastSponsors.createdAt));
}

/**
 * Delete sponsor
 */
export async function deleteSponsor(sponsorId: string, userId: number) {
  await db
    .delete(podcastSponsors)
    .where(and(eq(podcastSponsors.id, sponsorId), eq(podcastSponsors.userId, userId)));

  return { success: true };
}

/**
 * Get revenue summary for podcast
 */
export async function getPodcastRevenue(podcastId: string, userId: number, dateRange?: { start: Date; end: Date }) {
  const conditions = [eq(podcastMonetization.podcastId, podcastId), eq(podcastMonetization.userId, userId)];
  
  if (dateRange) {
    conditions.push(gte(podcastMonetization.createdAt, dateRange.start));
    conditions.push(lte(podcastMonetization.createdAt, dateRange.end));
  }

  const query = db
    .select({
      totalRevenue: sql<number>`SUM(CAST(${podcastMonetization.revenue} AS DECIMAL(10,2)))`,
      totalAds: sql<number>`COUNT(*)`,
      paidAmount: sql<number>`SUM(CASE WHEN ${podcastMonetization.paymentStatus} = 'paid' THEN CAST(${podcastMonetization.revenue} AS DECIMAL(10,2)) ELSE 0 END)`,
      pendingAmount: sql<number>`SUM(CASE WHEN ${podcastMonetization.paymentStatus} = 'pending' THEN CAST(${podcastMonetization.revenue} AS DECIMAL(10,2)) ELSE 0 END)`,
    })
    .from(podcastMonetization)
    .where(and(...conditions));

  const [result] = await query;

  return {
    totalRevenue: result?.totalRevenue || 0,
    totalAds: result?.totalAds || 0,
    paidAmount: result?.paidAmount || 0,
    pendingAmount: result?.pendingAmount || 0,
  };
}

/**
 * Get revenue by sponsor
 */
export async function getRevenueBySponsor(userId: number, dateRange?: { start: Date; end: Date }) {
  const conditions = [eq(podcastMonetization.userId, userId)];
  
  if (dateRange) {
    conditions.push(gte(podcastMonetization.createdAt, dateRange.start));
    conditions.push(lte(podcastMonetization.createdAt, dateRange.end));
  }

  const query = db
    .select({
      sponsorName: podcastMonetization.sponsorName,
      totalRevenue: sql<number>`SUM(CAST(${podcastMonetization.revenue} AS DECIMAL(10,2)))`,
      totalAds: sql<number>`COUNT(*)`,
    })
    .from(podcastMonetization)
    .where(and(...conditions))
    .groupBy(podcastMonetization.sponsorName);

  return await query;
}

/**
 * Mark payment as paid
 */
export async function markPaymentPaid(monetizationId: string, userId: number) {
  await db
    .update(podcastMonetization)
    .set({
      paymentStatus: "paid",
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(podcastMonetization.id, monetizationId), eq(podcastMonetization.userId, userId)));

  return { success: true };
}

/**
 * Calculate recommended ad pricing
 * Based on podcast analytics and industry standards
 */
export function calculateAdPricing(
  downloads: number,
  completionRate: number,
  adPlacement: "pre_roll" | "mid_roll" | "post_roll"
): number {
  // Industry standard CPM (cost per 1000 downloads)
  const baseCPM = 18; // $18 CPM average for podcasts

  // Adjust for completion rate
  const completionMultiplier = completionRate / 100;

  // Adjust for ad placement
  const placementMultiplier = {
    pre_roll: 0.8, // Lower value, easier to skip
    mid_roll: 1.2, // Higher value, more engaged listeners
    post_roll: 0.6, // Lowest value, many drop off
  }[adPlacement];

  // Calculate revenue in cents
  const revenuePerThousand = baseCPM * completionMultiplier * placementMultiplier * 100; // Convert to cents
  const revenue = Math.floor((downloads / 1000) * revenuePerThousand);

  return revenue;
}

/**
 * Generate sponsor read script
 * AI-powered sponsor ad script generation
 */
export async function generateSponsorReadScript(
  sponsorName: string,
  productDescription: string,
  callToAction: string,
  tone: "casual" | "professional" | "enthusiastic" = "casual"
): Promise<string> {
  // In production, this would use LLM to generate custom scripts
  // For now, return template-based script
  
  const scripts = {
    casual: `Hey everyone! Quick word from our sponsor, ${sponsorName}. ${productDescription} I've been using it myself and it's been a game-changer. ${callToAction} Now, back to the show!`,
    professional: `This episode is brought to you by ${sponsorName}. ${productDescription} ${callToAction} We appreciate their support of this podcast.`,
    enthusiastic: `Alright, I'm super excited to tell you about ${sponsorName}! ${productDescription} Seriously, you need to check this out. ${callToAction} Trust me, you won't regret it!`,
  };

  return scripts[tone];
}
