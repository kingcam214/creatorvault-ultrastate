/**
 * OAuth Platform Configuration
 * 
 * This file contains OAuth configuration for each social media platform.
 * In production, these values should be stored in environment variables.
 */

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scope: string[];
}

export interface PlatformOAuthConfig {
  tiktok: OAuthConfig;
  instagram: OAuthConfig;
  youtube: OAuthConfig;
  twitter: OAuthConfig;
  facebook: OAuthConfig;
}

/**
 * Get OAuth configuration for a platform
 * In production, these should come from environment variables
 */
export function getOAuthConfig(platform: keyof PlatformOAuthConfig): OAuthConfig {
  const baseRedirectUri = process.env.VITE_APP_URL || "http://localhost:3000";
  
  const configs: PlatformOAuthConfig = {
    tiktok: {
      clientId: process.env.TIKTOK_CLIENT_ID || "",
      clientSecret: process.env.TIKTOK_CLIENT_SECRET || "",
      authorizationUrl: "https://www.tiktok.com/v2/auth/authorize/",
      tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
      redirectUri: `${baseRedirectUri}/api/oauth/callback/tiktok`,
      scope: ["user.info.basic", "video.upload", "video.publish"],
    },
    instagram: {
      clientId: process.env.INSTAGRAM_CLIENT_ID || "",
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || "",
      authorizationUrl: "https://api.instagram.com/oauth/authorize",
      tokenUrl: "https://api.instagram.com/oauth/access_token",
      redirectUri: `${baseRedirectUri}/api/oauth/callback/instagram`,
      scope: [
        "instagram_basic",
        "instagram_content_publish",
        "instagram_manage_insights",
        "pages_read_engagement",
      ],
    },
    youtube: {
      clientId: process.env.YOUTUBE_CLIENT_ID || "",
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET || "",
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      redirectUri: `${baseRedirectUri}/api/oauth/callback/youtube`,
      scope: [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube",
        "https://www.googleapis.com/auth/youtube.readonly",
      ],
    },
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID || "",
      clientSecret: process.env.TWITTER_CLIENT_SECRET || "",
      authorizationUrl: "https://twitter.com/i/oauth2/authorize",
      tokenUrl: "https://api.twitter.com/2/oauth2/token",
      redirectUri: `${baseRedirectUri}/api/oauth/callback/twitter`,
      scope: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
      authorizationUrl: "https://www.facebook.com/v18.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
      redirectUri: `${baseRedirectUri}/api/oauth/callback/facebook`,
      scope: [
        "pages_manage_posts",
        "pages_read_engagement",
        "pages_show_list",
        "publish_video",
      ],
    },
  };

  return configs[platform];
}

/**
 * Generate OAuth authorization URL
 */
export function generateAuthUrl(
  platform: keyof PlatformOAuthConfig,
  state: string
): string {
  const config = getOAuthConfig(platform);
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope.join(" "),
    response_type: "code",
    state,
  });

  // Platform-specific parameters
  if (platform === "twitter") {
    params.append("code_challenge", "challenge");
    params.append("code_challenge_method", "plain");
  }

  return `${config.authorizationUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  platform: keyof PlatformOAuthConfig,
  code: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
}> {
  const config = getOAuthConfig(platform);

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  platform: keyof PlatformOAuthConfig,
  refreshToken: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const config = getOAuthConfig(platform);

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Get user info from platform
 */
export async function getPlatformUserInfo(
  platform: keyof PlatformOAuthConfig,
  accessToken: string
): Promise<{
  platformUserId: string;
  platformUsername?: string;
  platformDisplayName?: string;
  followerCount?: number;
}> {
  const endpoints: Record<keyof PlatformOAuthConfig, string> = {
    tiktok: "https://open.tiktokapis.com/v2/user/info/",
    instagram: "https://graph.instagram.com/me",
    youtube: "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
    twitter: "https://api.twitter.com/2/users/me?user.fields=public_metrics",
    facebook: "https://graph.facebook.com/me?fields=id,name",
  };

  const response = await fetch(endpoints[platform], {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info from ${platform}`);
  }

  const data = await response.json();

  // Platform-specific parsing
  switch (platform) {
    case "tiktok":
      return {
        platformUserId: data.data.user.open_id,
        platformUsername: data.data.user.username,
        platformDisplayName: data.data.user.display_name,
        followerCount: data.data.user.follower_count,
      };
    case "instagram":
      return {
        platformUserId: data.id,
        platformUsername: data.username,
      };
    case "youtube":
      return {
        platformUserId: data.items[0].id,
        platformUsername: data.items[0].snippet.customUrl,
        platformDisplayName: data.items[0].snippet.title,
        followerCount: parseInt(data.items[0].statistics.subscriberCount),
      };
    case "twitter":
      return {
        platformUserId: data.data.id,
        platformUsername: data.data.username,
        platformDisplayName: data.data.name,
        followerCount: data.data.public_metrics?.followers_count,
      };
    case "facebook":
      return {
        platformUserId: data.id,
        platformDisplayName: data.name,
      };
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
