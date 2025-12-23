/**
 * Podcast Distribution Service
 * Handles RSS feed generation and multi-platform distribution
 */

import { db } from "../db";
import { podcasts, podcastEpisodes, podcastPlatforms } from "../../drizzle/schema-podcasting";
import { eq, and, desc } from "drizzle-orm";

export interface RSSFeedOptions {
  podcastId: string;
  includeExplicit?: boolean;
}

/**
 * Generate RSS 2.0 feed for podcast
 * Compliant with Apple Podcasts, Spotify, Google Podcasts standards
 */
export async function generateRSSFeed(options: RSSFeedOptions): Promise<string> {
  // Get podcast
  const [podcast] = await db.select().from(podcasts).where(eq(podcasts.id, options.podcastId)).limit(1);

  if (!podcast) {
    throw new Error("Podcast not found");
  }

  // Get published episodes
  const episodes = await db
    .select()
    .from(podcastEpisodes)
    .where(and(eq(podcastEpisodes.podcastId, options.podcastId), eq(podcastEpisodes.status, "published")))
    .orderBy(desc(podcastEpisodes.publishedAt));

  const baseUrl = process.env.VITE_APP_URL || "https://creatorvault.app";

  // Build RSS feed
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(podcast.title)}</title>
    <link>${escapeXml(podcast.website || baseUrl)}</link>
    <language>${podcast.language}</language>
    <copyright>© ${new Date().getFullYear()} ${escapeXml(podcast.author || podcast.title)}</copyright>
    <description>${escapeXml(podcast.description || "")}</description>
    <atom:link href="${baseUrl}/api/podcast/rss/${podcast.id}" rel="self" type="application/rss+xml"/>
    
    <!-- iTunes/Apple Podcasts tags -->
    <itunes:author>${escapeXml(podcast.author || "")}</itunes:author>
    <itunes:summary>${escapeXml(podcast.description || "")}</itunes:summary>
    <itunes:type>episodic</itunes:type>
    <itunes:owner>
      <itunes:name>${escapeXml(podcast.author || "")}</itunes:name>
      <itunes:email>${escapeXml(podcast.email || "")}</itunes:email>
    </itunes:owner>
    <itunes:image href="${escapeXml(podcast.coverArtUrl || "")}"/>
    <itunes:category text="${escapeXml(podcast.category || "Technology")}"/>
    <itunes:explicit>${podcast.explicit ? "yes" : "no"}</itunes:explicit>
    
    ${episodes
      .map(
        (episode) => `
    <item>
      <title>${escapeXml(episode.title)}</title>
      <description>${escapeXml(episode.description || "")}</description>
      <link>${baseUrl}/podcast/${podcast.id}/episode/${episode.id}</link>
      <guid isPermaLink="false">${episode.id}</guid>
      <pubDate>${episode.publishedAt ? new Date(episode.publishedAt).toUTCString() : ""}</pubDate>
      <enclosure url="${escapeXml(episode.audioUrl)}" type="audio/mpeg" length="${episode.fileSize || 0}"/>
      <itunes:duration>${episode.duration || 0}</itunes:duration>
      <itunes:summary>${escapeXml(episode.description || "")}</itunes:summary>
      <itunes:image href="${escapeXml(podcast.coverArtUrl || "")}"/>
      ${episode.episodeNumber ? `<itunes:episode>${episode.episodeNumber}</itunes:episode>` : ""}
      ${episode.seasonNumber ? `<itunes:season>${episode.seasonNumber}</itunes:season>` : ""}
      <itunes:episodeType>full</itunes:episodeType>
    </item>`
      )
      .join("\n")}
  </channel>
</rss>`;

  return rss;
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Connect podcast to platform
 * Stores OAuth credentials and platform-specific IDs
 */
export async function connectPlatform(
  podcastId: string,
  platform: "apple_podcasts" | "spotify" | "google_podcasts" | "amazon_music",
  credentials: {
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    platformPodcastId?: string;
    platformUrl?: string;
  }
) {
  // Check if already connected
  const [existing] = await db
    .select()
    .from(podcastPlatforms)
    .where(and(eq(podcastPlatforms.podcastId, podcastId), eq(podcastPlatforms.platform, platform)))
    .limit(1);

  if (existing) {
    // Update existing connection
    await db
      .update(podcastPlatforms)
      .set({
        ...credentials,
        status: "connected",
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(podcastPlatforms.id, existing.id));

    return existing;
  }

  // Create new connection
  const [connection] = await db
    .insert(podcastPlatforms)
    .values({
      podcastId,
      platform,
      ...credentials,
      status: "connected",
      lastSyncedAt: new Date(),
    })
    .$returningId();

  return await db.select().from(podcastPlatforms).where(eq(podcastPlatforms.id, connection.id)).limit(1);
}

/**
 * Disconnect platform
 */
export async function disconnectPlatform(podcastId: string, platform: string) {
  await db
    .update(podcastPlatforms)
    .set({
      status: "disconnected",
      updatedAt: new Date(),
    })
    .where(and(eq(podcastPlatforms.podcastId, podcastId), eq(podcastPlatforms.platform, platform as any)));

  return { success: true };
}

/**
 * Submit podcast to Apple Podcasts
 * Requires Apple Podcasts Connect API credentials
 */
export async function submitToApplePodcasts(podcastId: string, rssFeedUrl: string) {
  // In production, this would use Apple Podcasts Connect API
  // For now, return instructions for manual submission
  
  return {
    platform: "apple_podcasts",
    status: "pending",
    instructions: [
      "1. Go to https://podcastsconnect.apple.com",
      "2. Sign in with your Apple ID",
      `3. Click 'Add a Show' and enter RSS feed URL: ${rssFeedUrl}`,
      "4. Verify ownership and submit for review",
      "5. Apple will review your podcast (typically 5-10 business days)",
    ],
    rssFeedUrl,
  };
}

/**
 * Submit podcast to Spotify
 * Requires Spotify for Podcasters API credentials
 */
export async function submitToSpotify(podcastId: string, rssFeedUrl: string) {
  // In production, this would use Spotify for Podcasters API
  // For now, return instructions for manual submission
  
  return {
    platform: "spotify",
    status: "pending",
    instructions: [
      "1. Go to https://podcasters.spotify.com",
      "2. Sign in with your Spotify account",
      `3. Click 'Get Started' and enter RSS feed URL: ${rssFeedUrl}`,
      "4. Complete podcast details and submit",
      "5. Spotify will review your podcast (typically 24-48 hours)",
    ],
    rssFeedUrl,
  };
}

/**
 * Submit podcast to Google Podcasts
 * Requires Google Podcasts Manager credentials
 */
export async function submitToGooglePodcasts(podcastId: string, rssFeedUrl: string) {
  // In production, this would use Google Podcasts Manager API
  // For now, return instructions for manual submission
  
  return {
    platform: "google_podcasts",
    status: "pending",
    instructions: [
      "1. Go to https://podcastsmanager.google.com",
      "2. Sign in with your Google account",
      `3. Click 'Add a show' and enter RSS feed URL: ${rssFeedUrl}`,
      "4. Verify ownership via email or DNS",
      "5. Your podcast will appear on Google Podcasts within 24 hours",
    ],
    rssFeedUrl,
  };
}

/**
 * Submit podcast to Amazon Music
 * Requires Amazon Music for Podcasters credentials
 */
export async function submitToAmazonMusic(podcastId: string, rssFeedUrl: string) {
  // In production, this would use Amazon Music for Podcasters API
  // For now, return instructions for manual submission
  
  return {
    platform: "amazon_music",
    status: "pending",
    instructions: [
      "1. Go to https://music.amazon.com/podcasters",
      "2. Sign in with your Amazon account",
      `3. Click 'Add Your Podcast' and enter RSS feed URL: ${rssFeedUrl}`,
      "4. Complete podcast details and submit",
      "5. Amazon will review your podcast (typically 3-5 business days)",
    ],
    rssFeedUrl,
  };
}

/**
 * Sync episode to all connected platforms
 * In production, this would push new episodes to platform APIs
 */
export async function syncEpisodeToAllPlatforms(episodeId: string, podcastId: string) {
  const platforms = await db
    .select()
    .from(podcastPlatforms)
    .where(and(eq(podcastPlatforms.podcastId, podcastId), eq(podcastPlatforms.status, "connected")));

  const results = [];

  for (const platform of platforms) {
    try {
      // In production, call platform-specific APIs here
      // For now, just update sync timestamp
      await db
        .update(podcastPlatforms)
        .set({
          lastSyncedAt: new Date(),
          status: "syncing",
          updatedAt: new Date(),
        })
        .where(eq(podcastPlatforms.id, platform.id));

      results.push({
        platform: platform.platform,
        status: "syncing",
        message: "Episode will appear on platform within 24 hours",
      });
    } catch (error: any) {
      results.push({
        platform: platform.platform,
        status: "error",
        message: error.message,
      });
    }
  }

  return results;
}

/**
 * Get platform submission status
 */
export async function getPlatformStatus(podcastId: string) {
  const platforms = await db
    .select()
    .from(podcastPlatforms)
    .where(eq(podcastPlatforms.podcastId, podcastId));

  return platforms.map((p) => ({
    platform: p.platform,
    status: p.status,
    platformUrl: p.platformUrl,
    lastSynced: p.lastSyncedAt,
    error: p.errorMessage,
  }));
}
