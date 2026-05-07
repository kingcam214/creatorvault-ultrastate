/**
 * Podcast Management Service
 * CRUD operations for podcasts and episodes
 */

import { db } from "../db";
import { podcasts, podcastEpisodes, podcastPlatforms, podcastClips } from "../../drizzle/schema-podcasting";
import { eq, and, desc } from "drizzle-orm";
import { storagePut } from "../storage";

export interface CreatePodcastInput {
  userId: number;
  title: string;
  description?: string;
  category?: string;
  language?: string;
  explicit?: boolean;
  author?: string;
  email?: string;
  website?: string;
}

export interface CreateEpisodeInput {
  podcastId: string;
  userId: number;
  title: string;
  description?: string;
  episodeNumber?: number;
  seasonNumber?: number;
  audioFile?: Buffer;
  audioUrl?: string;
  duration?: number;
  scheduledFor?: Date;
  keywords?: string;
}

/**
 * Create a new podcast show
 */
export async function createPodcast(input: CreatePodcastInput) {
  const [podcast] = await db.insert(podcasts).values({
    userId: input.userId,
    title: input.title,
    description: input.description,
    category: input.category,
    language: input.language || "en",
    explicit: input.explicit || false,
    author: input.author,
    email: input.email,
    website: input.website,
    status: "draft",
  }).$returningId();

  return await db.select().from(podcasts).where(eq(podcasts.id, podcast.id)).limit(1);
}

/**
 * Update podcast show
 */
export async function updatePodcast(podcastId: string, userId: number, updates: Partial<CreatePodcastInput>) {
  await db
    .update(podcasts)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(and(eq(podcasts.id, podcastId), eq(podcasts.userId, userId)));

  return await db.select().from(podcasts).where(eq(podcasts.id, podcastId)).limit(1);
}

/**
 * Get user's podcasts
 */
export async function getUserPodcasts(userId: number) {
  return await db
    .select()
    .from(podcasts)
    .where(eq(podcasts.userId, userId))
    .orderBy(desc(podcasts.createdAt));
}

/**
 * Get single podcast
 */
export async function getPodcast(podcastId: string, userId: number) {
  const [podcast] = await db
    .select()
    .from(podcasts)
    .where(and(eq(podcasts.id, podcastId), eq(podcasts.userId, userId)))
    .limit(1);

  return podcast;
}

/**
 * Delete podcast (and all episodes)
 */
export async function deletePodcast(podcastId: string, userId: number) {
  await db
    .delete(podcasts)
    .where(and(eq(podcasts.id, podcastId), eq(podcasts.userId, userId)));

  return { success: true };
}

/**
 * Create podcast episode
 */
export async function createEpisode(input: CreateEpisodeInput) {
  // Upload audio to S3 if buffer provided
  let audioUrl = input.audioUrl;
  if (input.audioFile) {
    const fileKey = `podcasts/${input.podcastId}/episodes/${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
    const { url } = await storagePut(fileKey, input.audioFile, "audio/mpeg");
    audioUrl = url;
  }

  if (!audioUrl) {
    throw new Error("Audio URL or file required");
  }

  const [episode] = await db.insert(podcastEpisodes).values({
    podcastId: input.podcastId,
    userId: input.userId,
    title: input.title,
    description: input.description,
    episodeNumber: input.episodeNumber,
    seasonNumber: input.seasonNumber,
    audioUrl,
    duration: input.duration,
    scheduledFor: input.scheduledFor,
    keywords: input.keywords,
    status: input.scheduledFor ? "scheduled" : "draft",
  }).$returningId();

  return await db.select().from(podcastEpisodes).where(eq(podcastEpisodes.id, episode.id)).limit(1);
}

/**
 * Update episode
 */
export async function updateEpisode(
  episodeId: string,
  userId: number,
  updates: Partial<Omit<CreateEpisodeInput, "podcastId" | "userId" | "audioFile">>
) {
  await db
    .update(podcastEpisodes)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(and(eq(podcastEpisodes.id, episodeId), eq(podcastEpisodes.userId, userId)));

  return await db.select().from(podcastEpisodes).where(eq(podcastEpisodes.id, episodeId)).limit(1);
}

/**
 * Get podcast episodes
 */
export async function getPodcastEpisodes(podcastId: string, userId: number) {
  return await db
    .select()
    .from(podcastEpisodes)
    .where(and(eq(podcastEpisodes.podcastId, podcastId), eq(podcastEpisodes.userId, userId)))
    .orderBy(desc(podcastEpisodes.createdAt));
}

/**
 * Get single episode
 */
export async function getEpisode(episodeId: string, userId: number) {
  const [episode] = await db
    .select()
    .from(podcastEpisodes)
    .where(and(eq(podcastEpisodes.id, episodeId), eq(podcastEpisodes.userId, userId)))
    .limit(1);

  return episode;
}

/**
 * Delete episode
 */
export async function deleteEpisode(episodeId: string, userId: number) {
  await db
    .delete(podcastEpisodes)
    .where(and(eq(podcastEpisodes.id, episodeId), eq(podcastEpisodes.userId, userId)));

  return { success: true };
}

/**
 * Publish episode
 */
export async function publishEpisode(episodeId: string, userId: number) {
  await db
    .update(podcastEpisodes)
    .set({
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(podcastEpisodes.id, episodeId), eq(podcastEpisodes.userId, userId)));

  return await db.select().from(podcastEpisodes).where(eq(podcastEpisodes.id, episodeId)).limit(1);
}

/**
 * Get connected platforms for podcast
 */
export async function getConnectedPlatforms(podcastId: string) {
  return await db
    .select()
    .from(podcastPlatforms)
    .where(eq(podcastPlatforms.podcastId, podcastId))
    .orderBy(desc(podcastPlatforms.createdAt));
}

/**
 * Get episode clips
 */
export async function getEpisodeClips(episodeId: string, userId: number) {
  return await db
    .select()
    .from(podcastClips)
    .where(and(eq(podcastClips.episodeId, episodeId), eq(podcastClips.userId, userId)))
    .orderBy(desc(podcastClips.createdAt));
}

/**
 * Generate RSS feed URL for podcast
 */
export function generateRssFeedUrl(podcastId: string): string {
  // In production, this would be a real RSS feed endpoint
  const baseUrl = process.env.VITE_APP_URL || "https://creatorvault.app";
  return `${baseUrl}/api/podcast/rss/${podcastId}`;
}

/**
 * Update podcast RSS feed URL
 */
export async function updateRssFeedUrl(podcastId: string, userId: number) {
  const rssFeedUrl = generateRssFeedUrl(podcastId);
  
  await db
    .update(podcasts)
    .set({
      rssFeedUrl,
      updatedAt: new Date(),
    })
    .where(and(eq(podcasts.id, podcastId), eq(podcasts.userId, userId)));

  return { rssFeedUrl };
}
