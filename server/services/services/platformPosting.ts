/**
 * Multi-Platform Posting Service
 * 
 * Original vision from first Manus session (August 2024):
 * "This app needs to be able to take content and deploy to each platform 
 * and abide by the guidelines of each but it's all powered by AI and does 
 * it for the user."
 * 
 * Supports: TikTok, Instagram, YouTube, Twitter/X, Facebook
 */

import { db } from "../db";
import { platformCredentials, platformPosts, type InsertPlatformPost } from "../../drizzle/schema-multiplatform";
import { eq, and } from "drizzle-orm";

// ============ TYPES ============

export type Platform = "tiktok" | "instagram" | "youtube" | "twitter" | "facebook" | "linkedin" | "pinterest" | "snapchat";

export type ContentType = "text" | "image" | "video" | "carousel" | "story" | "reel" | "short";

export interface PostContentInput {
  userId: number;
  platform: Platform;
  contentType: ContentType;
  caption?: string;
  hashtags?: string;
  mediaUrls?: string[];
  platformSettings?: any;
  scheduledFor?: Date;
}

export interface PostContentOutput {
  success: boolean;
  postId?: string;
  platformPostId?: string;
  platformPostUrl?: string;
  error?: string;
}

// ============ PLATFORM-SPECIFIC FORMATTING ============

/**
 * Format content according to platform guidelines
 */
export function formatContentForPlatform(
  platform: Platform,
  caption: string | undefined,
  hashtags: string | undefined
): { caption: string; hashtags: string } {
  const maxLengths: Record<Platform, number> = {
    tiktok: 2200,
    instagram: 2200,
    youtube: 5000,
    twitter: 280,
    facebook: 63206,
    linkedin: 3000,
    pinterest: 500,
    snapchat: 250,
  };

  const maxHashtags: Record<Platform, number> = {
    tiktok: 30,
    instagram: 30,
    youtube: 15,
    twitter: 2,
    facebook: 10,
    linkedin: 5,
    pinterest: 20,
    snapchat: 0,
  };

  let formattedCaption = caption || "";
  let formattedHashtags = hashtags || "";

  // Truncate caption if needed
  if (formattedCaption.length > maxLengths[platform]) {
    formattedCaption = formattedCaption.substring(0, maxLengths[platform] - 3) + "...";
  }

  // Limit hashtags
  const hashtagArray = formattedHashtags.split(",").map((h) => h.trim()).filter(Boolean);
  if (hashtagArray.length > maxHashtags[platform]) {
    formattedHashtags = hashtagArray.slice(0, maxHashtags[platform]).join(", ");
  }

  return { caption: formattedCaption, hashtags: formattedHashtags };
}

/**
 * Validate media for platform requirements
 */
export function validateMediaForPlatform(
  platform: Platform,
  contentType: ContentType,
  mediaUrls: string[] | undefined
): { valid: boolean; error?: string } {
  if (!mediaUrls || mediaUrls.length === 0) {
    if (contentType !== "text") {
      return { valid: false, error: `${contentType} requires media files` };
    }
    return { valid: true };
  }

  // Platform-specific media limits
  const mediaLimits: Record<Platform, { maxImages: number; maxVideos: number }> = {
    tiktok: { maxImages: 0, maxVideos: 1 },
    instagram: { maxImages: 10, maxVideos: 1 },
    youtube: { maxImages: 1, maxVideos: 1 },
    twitter: { maxImages: 4, maxVideos: 1 },
    facebook: { maxImages: 10, maxVideos: 1 },
    linkedin: { maxImages: 9, maxVideos: 1 },
    pinterest: { maxImages: 5, maxVideos: 1 },
    snapchat: { maxImages: 1, maxVideos: 1 },
  };

  const limits = mediaLimits[platform];

  if (contentType === "video" && mediaUrls.length > limits.maxVideos) {
    return { valid: false, error: `${platform} allows max ${limits.maxVideos} video(s)` };
  }

  if (contentType === "image" && mediaUrls.length > limits.maxImages) {
    return { valid: false, error: `${platform} allows max ${limits.maxImages} image(s)` };
  }

  return { valid: true };
}

// ============ PLATFORM API INTEGRATIONS ============

/**
 * Post to TikTok
 * Requires TikTok OAuth and Content Posting API access
 */
async function postToTikTok(
  accessToken: string,
  content: PostContentInput
): Promise<PostContentOutput> {
  try {
    // TikTok Content Posting API v2
    // https://developers.tiktok.com/doc/content-posting-api-get-started/
    
    const { caption, hashtags } = formatContentForPlatform("tiktok", content.caption, content.hashtags);
    const fullCaption = `${caption}\n\n${hashtags}`;

    // Step 1: Initialize upload
    const initResponse = await fetch("https://open.tiktokapis.com/v2/post/publish/inbox/video/init/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_info: {
          source: "FILE_UPLOAD",
          video_size: 0, // Will be filled by actual file size
          chunk_size: 10485760, // 10MB chunks
          total_chunk_count: 1,
        },
      }),
    });

    if (!initResponse.ok) {
      const error = await initResponse.json();
      return { success: false, error: `TikTok init failed: ${JSON.stringify(error)}` };
    }

    const initData = await initResponse.json();
    const uploadUrl = initData.data.upload_url;
    const publishId = initData.data.publish_id;

    // Step 2: Upload video (simplified - would need actual file upload logic)
    // In production, download from mediaUrls[0], upload to uploadUrl

    // Step 3: Publish
    const publishResponse = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: fullCaption,
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_url: content.mediaUrls?.[0] || "",
        },
      }),
    });

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      return { success: false, error: `TikTok publish failed: ${JSON.stringify(error)}` };
    }

    const publishData = await publishResponse.json();

    return {
      success: true,
      platformPostId: publishData.data.publish_id,
      platformPostUrl: publishData.data.share_url,
    };
  } catch (error: any) {
    return { success: false, error: `TikTok error: ${error.message}` };
  }
}

/**
 * Post to Instagram
 * Requires Instagram Graph API access
 */
async function postToInstagram(
  accessToken: string,
  platformUserId: string,
  content: PostContentInput
): Promise<PostContentOutput> {
  try {
    // Instagram Graph API
    // https://developers.facebook.com/docs/instagram-api/guides/content-publishing
    
    const { caption, hashtags } = formatContentForPlatform("instagram", content.caption, content.hashtags);
    const fullCaption = `${caption}\n\n${hashtags}`;

    let endpoint = "";
    let params: any = {
      access_token: accessToken,
      caption: fullCaption,
    };

    // Different endpoints for different content types
    if (content.contentType === "reel") {
      endpoint = `https://graph.facebook.com/v18.0/${platformUserId}/media`;
      params.media_type = "REELS";
      params.video_url = content.mediaUrls?.[0];
    } else if (content.contentType === "video") {
      endpoint = `https://graph.facebook.com/v18.0/${platformUserId}/media`;
      params.media_type = "VIDEO";
      params.video_url = content.mediaUrls?.[0];
    } else if (content.contentType === "carousel") {
      endpoint = `https://graph.facebook.com/v18.0/${platformUserId}/media`;
      params.media_type = "CAROUSEL";
      // Would need to create child media containers first
    } else {
      // Single image
      endpoint = `https://graph.facebook.com/v18.0/${platformUserId}/media`;
      params.image_url = content.mediaUrls?.[0];
    }

    // Step 1: Create media container
    const createResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      return { success: false, error: `Instagram create failed: ${JSON.stringify(error)}` };
    }

    const createData = await createResponse.json();
    const creationId = createData.id;

    // Step 2: Publish media container
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${platformUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.json();
      return { success: false, error: `Instagram publish failed: ${JSON.stringify(error)}` };
    }

    const publishData = await publishResponse.json();

    return {
      success: true,
      platformPostId: publishData.id,
      platformPostUrl: `https://www.instagram.com/p/${publishData.id}/`,
    };
  } catch (error: any) {
    return { success: false, error: `Instagram error: ${error.message}` };
  }
}

/**
 * Post to YouTube
 * Requires YouTube Data API v3 access
 */
async function postToYouTube(
  accessToken: string,
  content: PostContentInput
): Promise<PostContentOutput> {
  try {
    // YouTube Data API v3
    // https://developers.google.com/youtube/v3/docs/videos/insert
    
    const { caption, hashtags } = formatContentForPlatform("youtube", content.caption, content.hashtags);
    const title = content.caption?.substring(0, 100) || "Untitled Video";
    const description = `${caption}\n\n${hashtags}`;

    // YouTube requires multipart upload
    // Simplified version - production would use resumable upload
    const response = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snippet: {
            title,
            description,
            tags: hashtags.split(",").map((h) => h.trim()),
            categoryId: "22", // People & Blogs
          },
          status: {
            privacyStatus: content.platformSettings?.youtube?.visibility || "public",
            selfDeclaredMadeForKids: false,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: `YouTube failed: ${JSON.stringify(error)}` };
    }

    const data = await response.json();

    return {
      success: true,
      platformPostId: data.id,
      platformPostUrl: `https://www.youtube.com/watch?v=${data.id}`,
    };
  } catch (error: any) {
    return { success: false, error: `YouTube error: ${error.message}` };
  }
}

/**
 * Post to Twitter/X
 * Requires Twitter API v2 access
 */
async function postToTwitter(
  accessToken: string,
  content: PostContentInput
): Promise<PostContentOutput> {
  try {
    // Twitter API v2
    // https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
    
    const { caption, hashtags } = formatContentForPlatform("twitter", content.caption, content.hashtags);
    const fullText = `${caption} ${hashtags}`.trim();

    const params: any = {
      text: fullText,
    };

    // Add media if present (would need to upload media first)
    if (content.mediaUrls && content.mediaUrls.length > 0) {
      // Twitter requires media upload via separate endpoint first
      // params.media = { media_ids: [...] };
    }

    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: `Twitter failed: ${JSON.stringify(error)}` };
    }

    const data = await response.json();

    return {
      success: true,
      platformPostId: data.data.id,
      platformPostUrl: `https://twitter.com/i/web/status/${data.data.id}`,
    };
  } catch (error: any) {
    return { success: false, error: `Twitter error: ${error.message}` };
  }
}

/**
 * Post to Facebook
 * Requires Facebook Graph API access
 */
async function postToFacebook(
  accessToken: string,
  platformUserId: string,
  content: PostContentInput
): Promise<PostContentOutput> {
  try {
    // Facebook Graph API
    // https://developers.facebook.com/docs/graph-api/reference/user/feed
    
    const { caption, hashtags } = formatContentForPlatform("facebook", content.caption, content.hashtags);
    const message = `${caption}\n\n${hashtags}`;

    const params: any = {
      message,
      access_token: accessToken,
    };

    // Add media if present
    if (content.mediaUrls && content.mediaUrls.length > 0) {
      if (content.contentType === "video") {
        params.source = content.mediaUrls[0];
      } else {
        params.url = content.mediaUrls[0];
      }
    }

    const endpoint =
      content.contentType === "video"
        ? `https://graph.facebook.com/v18.0/${platformUserId}/videos`
        : `https://graph.facebook.com/v18.0/${platformUserId}/feed`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: `Facebook failed: ${JSON.stringify(error)}` };
    }

    const data = await response.json();

    return {
      success: true,
      platformPostId: data.id || data.post_id,
      platformPostUrl: `https://www.facebook.com/${data.id}`,
    };
  } catch (error: any) {
    return { success: false, error: `Facebook error: ${error.message}` };
  }
}

// ============ MAIN POSTING FUNCTION ============

/**
 * Post content to a single platform
 */
export async function postToSinglePlatform(input: PostContentInput): Promise<PostContentOutput> {
  try {
    // Validate content format
    const { valid, error } = validateMediaForPlatform(input.platform, input.contentType, input.mediaUrls);
    if (!valid) {
      return { success: false, error };
    }

    // Get platform credentials
    const [credential] = await db
      .select()
      .from(platformCredentials)
      .where(
        and(
          eq(platformCredentials.userId, input.userId),
          eq(platformCredentials.platform, input.platform),
          eq(platformCredentials.status, "active")
        )
      )
      .limit(1);

    if (!credential) {
      return {
        success: false,
        error: `No active ${input.platform} account connected. Please connect your account first.`,
      };
    }

    // Route to platform-specific function
    let result: PostContentOutput;

    switch (input.platform) {
      case "tiktok":
        result = await postToTikTok(credential.accessToken, input);
        break;
      case "instagram":
        result = await postToInstagram(credential.accessToken, credential.platformUserId, input);
        break;
      case "youtube":
        result = await postToYouTube(credential.accessToken, input);
        break;
      case "twitter":
        result = await postToTwitter(credential.accessToken, input);
        break;
      case "facebook":
        result = await postToFacebook(credential.accessToken, credential.platformUserId, input);
        break;
      default:
        result = { success: false, error: `Platform ${input.platform} not yet supported` };
    }

    // Save post record to database
    const postRecord: InsertPlatformPost = {
      userId: input.userId,
      credentialId: credential.id,
      platform: input.platform,
      contentType: input.contentType,
      caption: input.caption,
      hashtags: input.hashtags,
      mediaUrls: input.mediaUrls,
      platformPostId: result.platformPostId || "",
      platformPostUrl: result.platformPostUrl,
      status: result.success ? "published" : "failed",
      errorMessage: result.error,
      publishedAt: result.success ? new Date() : undefined,
      platformSettings: input.platformSettings,
      scheduledFor: input.scheduledFor,
    };

    const [insertedPost] = await db.insert(platformPosts).values(postRecord).$returningId();

    return {
      ...result,
      postId: insertedPost.id,
    };
  } catch (error: any) {
    return { success: false, error: `System error: ${error.message}` };
  }
}

/**
 * Post content to multiple platforms (batch posting)
 */
export async function postToMultiplePlatforms(
  userId: number,
  platforms: Platform[],
  content: Omit<PostContentInput, "userId" | "platform">
): Promise<Record<Platform, PostContentOutput>> {
  const results: Record<string, PostContentOutput> = {};

  for (const platform of platforms) {
    results[platform] = await postToSinglePlatform({
      ...content,
      userId,
      platform,
    });
  }

  return results as Record<Platform, PostContentOutput>;
}

/**
 * Get post history for a user
 */
export async function getPostHistory(userId: number, platform?: Platform) {
  const conditions = [eq(platformPosts.userId, userId)];
  if (platform) {
    conditions.push(eq(platformPosts.platform, platform));
  }

  return await db
    .select()
    .from(platformPosts)
    .where(and(...conditions))
    .orderBy(platformPosts.createdAt);
}

/**
 * Delete a post from a platform (if supported)
 */
export async function deletePost(postId: string, userId: number): Promise<PostContentOutput> {
  try {
    const [post] = await db
      .select()
      .from(platformPosts)
      .where(and(eq(platformPosts.id, postId), eq(platformPosts.userId, userId)))
      .limit(1);

    if (!post) {
      return { success: false, error: "Post not found" };
    }

    // Platform-specific deletion logic would go here
    // For now, just mark as deleted in database

    await db
      .update(platformPosts)
      .set({ status: "deleted", deletedAt: new Date() })
      .where(eq(platformPosts.id, postId));

    return { success: true };
  } catch (error: any) {
    return { success: false, error: `Delete failed: ${error.message}` };
  }
}
