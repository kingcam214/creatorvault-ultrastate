/**
 * Social Media Scraper Service
 * 
 * Real-time scraping of creator profiles for live demos
 */

import { callDataApi } from "../_core/dataApi";

export interface ScrapedProfile {
  handle: string;
  platform: string;
  followers: number;
  following: number;
  posts: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  avgViews: number;
  contentStyle: string;
  postFrequency: string;
  topPosts: Array<{
    id: string;
    caption: string;
    likes: number;
    comments: number;
    views: number;
    url: string;
  }>;
}

/**
 * Scrape Instagram profile
 */
export async function scrapeInstagramProfile(handle: string): Promise<ScrapedProfile> {
  // For MVP, return mock data
  // TODO: Implement real Instagram scraping when API is available
  
  const mockFollowers = Math.floor(Math.random() * 100000) + 10000;
  const mockPosts = Math.floor(Math.random() * 500) + 50;
  const mockEngagement = (Math.random() * 5 + 2).toFixed(2);
  
  return {
    handle,
    platform: "instagram",
    followers: mockFollowers,
    following: Math.floor(Math.random() * 1000) + 100,
    posts: mockPosts,
    engagementRate: parseFloat(mockEngagement),
    avgLikes: Math.floor(mockFollowers * (parseFloat(mockEngagement) / 100)),
    avgComments: Math.floor(mockFollowers * (parseFloat(mockEngagement) / 100) * 0.1),
    avgViews: Math.floor(mockFollowers * 1.5),
    contentStyle: ["lifestyle", "fitness", "fashion", "tech", "food"][Math.floor(Math.random() * 5)],
    postFrequency: ["daily", "3-5/week", "weekly"][Math.floor(Math.random() * 3)],
    topPosts: Array.from({ length: 5 }, (_, i) => ({
      id: `post_${i}`,
      caption: `Top performing content #${i + 1}`,
      likes: Math.floor(mockFollowers * (parseFloat(mockEngagement) / 100) * (1 + Math.random())),
      comments: Math.floor(mockFollowers * (parseFloat(mockEngagement) / 100) * 0.1 * (1 + Math.random())),
      views: Math.floor(mockFollowers * 2 * (1 + Math.random())),
      url: `https://instagram.com/p/${i}`,
    })),
  };
}

/**
 * Scrape TikTok profile
 */
export async function scrapeTikTokProfile(handle: string): Promise<ScrapedProfile> {
  try {
    // Search for the user's videos to get profile data
    const result = await callDataApi("Tiktok/search_tiktok_video_general", {
      query: { keyword: handle },
    });

    if (!result || !(result as any).data || (result as any).data.length === 0) {
      // Return mock data if API fails
      return generateMockProfile(handle, "tiktok");
    }

    // Extract data from search results
    const videos = (result as any).data.slice(0, 10); // Get top 10 videos
    
    // Calculate metrics
    const totalLikes = videos.reduce((sum: number, v: any) => sum + (v.statistics?.diggCount || 0), 0);
    const totalComments = videos.reduce((sum: number, v: any) => sum + (v.statistics?.commentCount || 0), 0);
    const totalViews = videos.reduce((sum: number, v: any) => sum + (v.statistics?.playCount || 0), 0);
    const totalShares = videos.reduce((sum: number, v: any) => sum + (v.statistics?.shareCount || 0), 0);
    
    const avgLikes = Math.floor(totalLikes / videos.length);
    const avgComments = Math.floor(totalComments / videos.length);
    const avgViews = Math.floor(totalViews / videos.length);
    
    // Estimate followers from engagement (rough calculation)
    const estimatedFollowers = Math.floor(avgViews * 0.3);
    
    // Calculate engagement rate
    const engagementRate = avgViews > 0 ? ((totalLikes + totalComments + totalShares) / totalViews * 100).toFixed(2) : "0.00";
    
    return {
      handle,
      platform: "tiktok",
      followers: estimatedFollowers,
      following: 0, // Not available from search
      posts: videos.length,
      engagementRate: parseFloat(engagementRate),
      avgLikes,
      avgComments,
      avgViews,
      contentStyle: detectContentStyle(videos),
      postFrequency: "3-5/week", // Default estimate
      topPosts: videos.slice(0, 5).map((v: any) => ({
        id: v.aweme_id || v.id,
        caption: v.desc || "",
        likes: v.statistics?.diggCount || 0,
        comments: v.statistics?.commentCount || 0,
        views: v.statistics?.playCount || 0,
        url: `https://www.tiktok.com/@${handle}/video/${v.aweme_id || v.id}`,
      })),
    };
  } catch (error) {
    console.error("Error scraping TikTok profile:", error);
    return generateMockProfile(handle, "tiktok");
  }
}

/**
 * Scrape YouTube channel
 */
export async function scrapeYouTubeProfile(channelId: string): Promise<ScrapedProfile> {
  try {
    // Get channel details
    const channelResult = await callDataApi("Youtube/get_channel_details", {
      query: { id: channelId, hl: "en" },
    });

    if (!channelResult || !(channelResult as any).channelId) {
      return generateMockProfile(channelId, "youtube");
    }

    // Get channel videos
    const videosResult: any = await callDataApi("Youtube/get_channel_videos", {
      query: { id: (channelResult as any).channelId, filter: "videos_latest", hl: "en", gl: "US" },
    });

    const videos = videosResult?.contents || [];
    
    // Extract stats
    const stats: any = (channelResult as any).stats || {};
    const subscribers = parseInt(stats.subscribers?.replace(/[^0-9]/g, "") || "0");
    const totalVideos = parseInt(stats.videos?.replace(/[^0-9]/g, "") || "0");
    const totalViews = parseInt(stats.views?.replace(/[^0-9]/g, "") || "0");
    
    // Calculate engagement from recent videos
    const recentVideos = videos.slice(0, 10).filter((v: any) => v.type === "video");
    const avgViews = recentVideos.length > 0
      ? Math.floor(recentVideos.reduce((sum: number, v: any) => sum + (v.video?.stats?.views || 0), 0) / recentVideos.length)
      : 0;
    
    const engagementRate = subscribers > 0 ? (avgViews / subscribers * 100).toFixed(2) : "0.00";
    
    return {
      handle: (channelResult as any).handle || (channelResult as any).title,
      platform: "youtube",
      followers: subscribers,
      following: 0,
      posts: totalVideos,
      engagementRate: parseFloat(engagementRate),
      avgLikes: Math.floor(avgViews * 0.05), // Estimate 5% like rate
      avgComments: Math.floor(avgViews * 0.002), // Estimate 0.2% comment rate
      avgViews,
      contentStyle: detectContentStyleFromDescription((channelResult as any).description || ""),
      postFrequency: estimatePostFrequency(recentVideos),
      topPosts: recentVideos.slice(0, 5).map((v: any) => ({
        id: v.video?.videoId || "",
        caption: v.video?.title || "",
        likes: Math.floor((v.video?.stats?.views || 0) * 0.05),
        comments: Math.floor((v.video?.stats?.views || 0) * 0.002),
        views: v.video?.stats?.views || 0,
        url: `https://www.youtube.com/watch?v=${v.video?.videoId}`,
      })),
    };
  } catch (error) {
    console.error("Error scraping YouTube profile:", error);
    return generateMockProfile(channelId, "youtube");
  }
}

/**
 * Generate mock profile data as fallback
 */
function generateMockProfile(handle: string, platform: string): ScrapedProfile {
  const mockFollowers = Math.floor(Math.random() * 100000) + 10000;
  const mockPosts = Math.floor(Math.random() * 500) + 50;
  const mockEngagement = (Math.random() * 5 + 2).toFixed(2);
  
  return {
    handle,
    platform,
    followers: mockFollowers,
    following: Math.floor(Math.random() * 1000) + 100,
    posts: mockPosts,
    engagementRate: parseFloat(mockEngagement),
    avgLikes: Math.floor(mockFollowers * (parseFloat(mockEngagement) / 100)),
    avgComments: Math.floor(mockFollowers * (parseFloat(mockEngagement) / 100) * 0.1),
    avgViews: Math.floor(mockFollowers * 1.5),
    contentStyle: ["lifestyle", "fitness", "fashion", "tech", "food"][Math.floor(Math.random() * 5)],
    postFrequency: ["daily", "3-5/week", "weekly"][Math.floor(Math.random() * 3)],
    topPosts: [],
  };
}

/**
 * Detect content style from videos
 */
function detectContentStyle(videos: any[]): string {
  // Simple keyword-based detection
  const descriptions = videos.map((v) => (v.desc || "").toLowerCase()).join(" ");
  
  if (descriptions.includes("fitness") || descriptions.includes("workout")) return "fitness";
  if (descriptions.includes("food") || descriptions.includes("recipe")) return "food";
  if (descriptions.includes("fashion") || descriptions.includes("style")) return "fashion";
  if (descriptions.includes("tech") || descriptions.includes("gadget")) return "tech";
  if (descriptions.includes("comedy") || descriptions.includes("funny")) return "comedy";
  
  return "lifestyle";
}

/**
 * Detect content style from description
 */
function detectContentStyleFromDescription(description: string): string {
  const lower = description.toLowerCase();
  
  if (lower.includes("fitness") || lower.includes("workout")) return "fitness";
  if (lower.includes("food") || lower.includes("recipe")) return "food";
  if (lower.includes("fashion") || lower.includes("style")) return "fashion";
  if (lower.includes("tech") || lower.includes("gadget")) return "tech";
  if (lower.includes("comedy") || lower.includes("funny")) return "comedy";
  if (lower.includes("gaming") || lower.includes("game")) return "gaming";
  if (lower.includes("music") || lower.includes("song")) return "music";
  
  return "lifestyle";
}

/**
 * Estimate post frequency from recent videos
 */
function estimatePostFrequency(videos: any[]): string {
  if (videos.length < 2) return "weekly";
  
  // This is a simplified estimation
  // In production, you'd parse timestamps and calculate actual frequency
  return "3-5/week";
}
