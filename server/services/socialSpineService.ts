import { randomBytes, randomUUID } from "crypto";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Canonical Social Empire spine.
 *
 * Canonical owners deliberately remain existing systems:
 * - account authority: connected_accounts + account_tokens
 * - publishing authority: distribution_jobs
 * - tracking/revenue authority: attribution_events
 * - owned media authority: media_assets
 * - fan relationship/revenue authority: users, subscriptions, conversations,
 *   message_unlocks and transactions
 *
 * This service only adds bridging, package, and native-social records. It never
 * enables an automation worker or submits outbound posts by itself.
 */

export const SOCIAL_SPINE_VERSION = "creatorvault.social-spine.v1";

export type SocialPackagePlatform =
  | "native"
  | "telegram"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "twitter"
  | "facebook"
  | "whatsapp"
  | "onlyfans";

export type SocialCtaType =
  | "follow"
  | "message"
  | "tip"
  | "subscribe"
  | "unlock"
  | "shop"
  | "book"
  | "join"
  | "remix"
  | "share";

const EXTERNAL_PLATFORMS: SocialPackagePlatform[] = [
  "telegram", "instagram", "tiktok", "youtube", "twitter", "facebook", "whatsapp", "onlyfans",
];

function rowsOf(result: any): any[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.rows)) return result.rows;
  return [];
}

async function rawQuery(query: string, params: unknown[] = []): Promise<any[]> {
  const database = await getDb();
  const client = (database as any).$client || (database as any).client;
  if (client && typeof client.promise === "function") {
    const [rows] = await client.promise().query(query, params);
    return rows as any[];
  }
  if (client && typeof client.execute === "function") {
    const [rows] = await client.execute(query, params);
    return rows as any[];
  }
  const result = await (database as any).execute(sql.raw(query));
  return rowsOf(result);
}

async function rawExec(query: string, params: unknown[] = []): Promise<any> {
  const database = await getDb();
  const client = (database as any).$client || (database as any).client;
  if (client && typeof client.promise === "function") {
    const [result] = await client.promise().query(query, params);
    return result;
  }
  if (client && typeof client.execute === "function") {
    const [result] = await client.execute(query, params);
    return result;
  }
  return (database as any).execute(sql.raw(query));
}

async function addColumnIfMissing(table: string, column: string, definition: string): Promise<void> {
  const existing = await rawQuery(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column],
  );
  if (!existing.length) {
    await rawExec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

export async function ensureSocialSpineSchema(): Promise<{ tables: string[] }> {
  await rawExec(`CREATE TABLE IF NOT EXISTS social_account_bridges (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    platform VARCHAR(48) NOT NULL,
    canonical_connected_account_id BIGINT NULL,
    legacy_platform_credential_id VARCHAR(64) NULL,
    bridge_state VARCHAR(32) NOT NULL DEFAULT 'linked',
    last_successful_read_at DATETIME NULL,
    last_successful_publish_at DATETIME NULL,
    last_error TEXT NULL,
    refresh_state VARCHAR(32) NOT NULL DEFAULT 'unknown',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_social_account_bridge (user_id, platform),
    KEY idx_social_account_bridge_account (canonical_connected_account_id)
  )`);

  await rawExec(`CREATE TABLE IF NOT EXISTS social_packages (
    id CHAR(36) PRIMARY KEY,
    creator_user_id BIGINT NOT NULL,
    source_media_asset_id VARCHAR(191) NOT NULL,
    source_fingerprint VARCHAR(128) NULL,
    title VARCHAR(255) NOT NULL,
    purpose VARCHAR(64) NOT NULL DEFAULT 'audience_growth',
    destination_url TEXT NOT NULL,
    state VARCHAR(32) NOT NULL DEFAULT 'draft',
    approval_state VARCHAR(32) NOT NULL DEFAULT 'awaiting_approval',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_social_packages_creator (creator_user_id, created_at),
    KEY idx_social_packages_source (source_media_asset_id)
  )`);

  await rawExec(`CREATE TABLE IF NOT EXISTS social_package_variants (
    id CHAR(36) PRIMARY KEY,
    package_id CHAR(36) NOT NULL,
    platform VARCHAR(48) NOT NULL,
    variant_role VARCHAR(48) NOT NULL,
    source_media_asset_id VARCHAR(191) NOT NULL,
    asset_url TEXT NULL,
    target_aspect_ratio VARCHAR(16) NOT NULL,
    target_duration_seconds INT NULL,
    caption TEXT NULL,
    cta_type VARCHAR(32) NULL,
    cta_payload_json JSON NULL,
    readiness_state VARCHAR(32) NOT NULL DEFAULT 'prepared',
    generation_state VARCHAR(32) NOT NULL DEFAULT 'not_requested',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_social_package_variants_package (package_id, platform)
  )`);

  await rawExec(`CREATE TABLE IF NOT EXISTS social_legacy_adapters (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    legacy_system VARCHAR(64) NOT NULL,
    legacy_record_id VARCHAR(191) NOT NULL,
    distribution_job_id BIGINT NULL,
    adapter_state VARCHAR(32) NOT NULL DEFAULT 'visible_only',
    metadata_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_social_legacy_adapter (legacy_system, legacy_record_id),
    KEY idx_social_legacy_distribution (distribution_job_id)
  )`);

  await rawExec(`CREATE TABLE IF NOT EXISTS social_native_posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    creator_user_id BIGINT NOT NULL,
    source_media_asset_id VARCHAR(191) NOT NULL,
    social_package_id CHAR(36) NULL,
    body TEXT NULL,
    visibility VARCHAR(32) NOT NULL DEFAULT 'public',
    access_tier VARCHAR(32) NOT NULL DEFAULT 'free',
    cta_type VARCHAR(32) NULL,
    cta_payload_json JSON NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'published',
    published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_social_native_feed (status, visibility, published_at),
    KEY idx_social_native_creator (creator_user_id, published_at)
  )`);

  await rawExec(`CREATE TABLE IF NOT EXISTS social_follows (
    follower_user_id BIGINT NOT NULL,
    creator_user_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_user_id, creator_user_id),
    KEY idx_social_follows_creator (creator_user_id, created_at)
  )`);

  await rawExec(`CREATE TABLE IF NOT EXISTS social_post_reactions (
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    reaction_type VARCHAR(32) NOT NULL DEFAULT 'like',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id, reaction_type),
    KEY idx_social_reactions_post (post_id, created_at)
  )`);

  await rawExec(`CREATE TABLE IF NOT EXISTS social_post_comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    parent_comment_id BIGINT NULL,
    body TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'visible',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_social_comments_post (post_id, created_at),
    KEY idx_social_comments_parent (parent_comment_id)
  )`);

  await rawExec(`CREATE TABLE IF NOT EXISTS social_post_saves (
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
  )`);

  await rawExec(`CREATE TABLE IF NOT EXISTS social_notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    actor_user_id BIGINT NULL,
    event_type VARCHAR(48) NOT NULL,
    entity_type VARCHAR(48) NULL,
    entity_id VARCHAR(191) NULL,
    message TEXT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_social_notifications_user (user_id, is_read, created_at)
  )`);

  await rawExec(`CREATE TABLE IF NOT EXISTS social_fan_identity_links (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fan_user_id BIGINT NOT NULL,
    creator_user_id BIGINT NULL,
    identity_type VARCHAR(48) NOT NULL,
    external_identity VARCHAR(255) NOT NULL,
    verification_state VARCHAR(32) NOT NULL DEFAULT 'unverified',
    evidence_source VARCHAR(64) NOT NULL,
    last_activity_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_social_fan_identity (identity_type, external_identity),
    KEY idx_social_fan_creator (creator_user_id, fan_user_id)
  )`);

  // Enrich the existing canonical distribution ledger; do not create a new job table.
  await addColumnIfMissing("distribution_jobs", "source_media_asset_id", "source_media_asset_id VARCHAR(191) NULL");
  await addColumnIfMissing("distribution_jobs", "social_package_id", "social_package_id CHAR(36) NULL");
  await addColumnIfMissing("distribution_jobs", "origin_system", "origin_system VARCHAR(64) NULL");
  await addColumnIfMissing("distribution_jobs", "approval_state", "approval_state VARCHAR(32) NULL");

  return {
    tables: [
      "social_account_bridges", "social_packages", "social_package_variants", "social_legacy_adapters",
      "social_native_posts", "social_follows", "social_post_reactions", "social_post_comments",
      "social_post_saves", "social_notifications", "social_fan_identity_links", "distribution_jobs",
    ],
  };
}

function trackingCode(): string {
  return randomBytes(12).toString("hex");
}

function safeJson(value: unknown): string | null {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

async function requireReadyOwnedAsset(userId: number, assetId: string): Promise<any> {
  const rows = await rawQuery(
    `SELECT id, user_id, asset_type, source_type, public_url, thumbnail_url, storage_path,
            duration, width, height, mime_type, file_name, original_name, status
     FROM media_assets WHERE id = ? AND user_id = ? AND status = 'ready' LIMIT 1`,
    [assetId, userId],
  );
  if (!rows.length) throw new Error("CreatorVault source media was not found or is not ready");
  const asset = rows[0];
  if (!String(asset.asset_type || asset.mime_type || "").toLowerCase().includes("video")) {
    throw new Error("The Social Empire source must be an owned ready video");
  }
  const publicUrl = asset.public_url || asset.storage_path;
  if (!publicUrl) throw new Error("The selected creator video has no durable source path");
  return asset;
}

async function getCreatorId(userId: number): Promise<number> {
  try {
    const rows = await rawQuery("SELECT id FROM vaultx_creators WHERE user_id = ? LIMIT 1", [userId]);
    return rows.length ? Number(rows[0].id) : userId;
  } catch {
    return userId;
  }
}

async function requireChannel(userId: number, channelIdentityId: number): Promise<any> {
  const rows = await rawQuery(
    `SELECT * FROM channel_identities
     WHERE id = ? AND (owner_id = ? OR owner_type IN ('vaultx_brand', 'creatorvault_brand')) LIMIT 1`,
    [channelIdentityId, userId],
  );
  if (!rows.length) throw new Error("CreatorVault channel identity is not available to this creator");
  return rows[0];
}

async function assertPolicy(platform: SocialPackagePlatform, channel: any, assetType: string): Promise<void> {
  if (platform === "native") return;
  const rows = await rawQuery(
    `SELECT allowed_safety_levels, prohibited_asset_types
     FROM platform_policy_rules WHERE platform = ? AND brand_lane = ? LIMIT 1`,
    [platform, channel.brand_lane],
  );
  if (!rows.length) throw new Error(`No governed platform policy exists for ${platform}`);
  const rule = rows[0];
  const allowed = typeof rule.allowed_safety_levels === "string" ? JSON.parse(rule.allowed_safety_levels) : rule.allowed_safety_levels;
  const prohibited = rule.prohibited_asset_types
    ? (typeof rule.prohibited_asset_types === "string" ? JSON.parse(rule.prohibited_asset_types) : rule.prohibited_asset_types)
    : [];
  if (!Array.isArray(allowed) || !allowed.includes(channel.content_safety_level)) {
    throw new Error(`The channel safety lane is not approved for ${platform}`);
  }
  if (Array.isArray(prohibited) && prohibited.includes(assetType)) {
    throw new Error(`This source asset type is prohibited for ${platform}`);
  }
}

export async function bridgeLegacyPlatformCredentials(userId: number): Promise<{ bridged: number; skipped: number }> {
  // The old platform_credentials table is read as a compatibility source only.
  const legacy = await rawQuery(
    `SELECT id, platform, platform_user_id, platform_username, status
     FROM platform_credentials WHERE user_id = ? AND status = 'active'`,
    [userId],
  ).catch(() => []);
  if (!legacy.length) return { bridged: 0, skipped: 0 };

  const channelRows = await rawQuery(
    `SELECT id FROM channel_identities WHERE owner_id = ? AND owner_type = 'creator_personal'
     ORDER BY created_at ASC LIMIT 1`,
    [userId],
  );
  if (!channelRows.length) throw new Error("Create a canonical CreatorVault channel identity before bridging legacy accounts");
  const channelId = Number(channelRows[0].id);

  let bridged = 0;
  let skipped = 0;
  for (const record of legacy) {
    const platform = String(record.platform || "").toLowerCase();
    if (!EXTERNAL_PLATFORMS.includes(platform as SocialPackagePlatform)) {
      skipped += 1;
      continue;
    }
    const canonical = await rawQuery(
      `SELECT id FROM connected_accounts WHERE channel_identity_id = ? AND platform = ? LIMIT 1`,
      [channelId, platform],
    );
    let canonicalId: number;
    if (canonical.length) {
      canonicalId = Number(canonical[0].id);
    } else {
      const result = await rawExec(
        `INSERT INTO connected_accounts
         (channel_identity_id, platform, platform_account_id, username, connection_status,
          can_post, can_schedule, can_send_dm, can_read_analytics, can_trigger_funnel,
          automation_enabled, requires_approval)
         VALUES (?, ?, ?, ?, 'legacy_imported', 0, 0, 0, 0, 0, 0, 1)`,
        [channelId, platform, record.platform_user_id || null, record.platform_username || null],
      );
      canonicalId = Number((result as any).insertId);
    }
    await rawExec(
      `INSERT INTO social_account_bridges
       (user_id, platform, canonical_connected_account_id, legacy_platform_credential_id, bridge_state, refresh_state)
       VALUES (?, ?, ?, ?, 'linked', 'unknown')
       ON DUPLICATE KEY UPDATE canonical_connected_account_id = VALUES(canonical_connected_account_id),
         legacy_platform_credential_id = VALUES(legacy_platform_credential_id), bridge_state = 'linked'`,
      [userId, platform, canonicalId, String(record.id)],
    );
    bridged += 1;
  }
  return { bridged, skipped };
}

export async function createSocialPackage(input: {
  userId: number;
  sourceAssetId: string;
  channelIdentityId: number;
  destinationUrl: string;
  title: string;
  purpose: string;
  caption?: string;
  platforms: SocialPackagePlatform[];
  ctaType?: SocialCtaType;
  ctaPayload?: unknown;
}): Promise<{ packageId: string; variants: any[]; distributionJobIds: number[] }> {
  const asset = await requireReadyOwnedAsset(input.userId, input.sourceAssetId);
  const channel = await requireChannel(input.userId, input.channelIdentityId);
  const packageId = randomUUID();
  const assetUrl = asset.public_url || asset.storage_path;
  const fingerprint = randomBytes(16).toString("hex");
  await rawExec(
    `INSERT INTO social_packages
     (id, creator_user_id, source_media_asset_id, source_fingerprint, title, purpose, destination_url, state, approval_state)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 'awaiting_approval')`,
    [packageId, input.userId, String(asset.id), fingerprint, input.title, input.purpose, input.destinationUrl],
  );

  const requestedPlatforms = Array.from(new Set(input.platforms));
  const variants: any[] = [];
  const distributionJobIds: number[] = [];
  const creatorId = await getCreatorId(input.userId);
  for (const platform of requestedPlatforms) {
    if (!["native", ...EXTERNAL_PLATFORMS].includes(platform)) throw new Error(`Unsupported Social Empire platform: ${platform}`);
    await assertPolicy(platform, channel, "teaser");
    const variantId = randomUUID();
    const visual = platform === "youtube" ? { ratio: "9:16", seconds: 60, role: "short" }
      : platform === "twitter" ? { ratio: "9:16", seconds: 45, role: "hook" }
      : platform === "native" ? { ratio: "9:16", seconds: Number(asset.duration || 0) || null, role: "native_post" }
      : { ratio: "9:16", seconds: 30, role: "vertical_teaser" };
    await rawExec(
      `INSERT INTO social_package_variants
       (id, package_id, platform, variant_role, source_media_asset_id, asset_url,
        target_aspect_ratio, target_duration_seconds, caption, cta_type, cta_payload_json, readiness_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prepared')`,
      [variantId, packageId, platform, visual.role, String(asset.id), assetUrl, visual.ratio,
        visual.seconds, input.caption || null, input.ctaType || null, safeJson(input.ctaPayload)],
    );
    const variant = { id: variantId, platform, role: visual.role, readinessState: "prepared", sourceAssetId: String(asset.id) };
    variants.push(variant);

    // Native publication is a real first-party post. External records are drafts only.
    if (platform === "native") {
      await rawExec(
        `INSERT INTO social_native_posts
         (creator_user_id, source_media_asset_id, social_package_id, body, visibility, access_tier, cta_type, cta_payload_json, status)
         VALUES (?, ?, ?, ?, 'public', 'free', ?, ?, 'published')`,
        [input.userId, String(asset.id), packageId, input.caption || null, input.ctaType || null, safeJson(input.ctaPayload)],
      );
      continue;
    }

    const code = trackingCode();
    const result = await rawExec(
      `INSERT INTO distribution_jobs
       (creator_id, channel_identity_id, platform, asset_url, asset_type, caption, destination_url,
        tracking_code, status, scheduled_at, source_media_asset_id, social_package_id, origin_system, approval_state)
       VALUES (?, ?, ?, ?, 'teaser', ?, ?, ?, 'draft', NULL, ?, ?, 'social_spine', 'awaiting_approval')`,
      [creatorId, input.channelIdentityId, platform, assetUrl, input.caption || null, input.destinationUrl,
        code, String(asset.id), packageId],
    );
    distributionJobIds.push(Number((result as any).insertId));
  }

  return { packageId, variants, distributionJobIds };
}

export async function createNativePost(input: {
  userId: number;
  sourceAssetId: string;
  body?: string;
  visibility: "public" | "followers" | "subscribers";
  accessTier: "free" | "paid" | "subscriber";
  ctaType?: SocialCtaType;
  ctaPayload?: unknown;
  socialPackageId?: string;
}): Promise<{ postId: number }> {
  await requireReadyOwnedAsset(input.userId, input.sourceAssetId);
  const result = await rawExec(
    `INSERT INTO social_native_posts
     (creator_user_id, source_media_asset_id, social_package_id, body, visibility, access_tier, cta_type, cta_payload_json, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
    [input.userId, input.sourceAssetId, input.socialPackageId || null, input.body || null, input.visibility,
      input.accessTier, input.ctaType || null, safeJson(input.ctaPayload)],
  );
  return { postId: Number((result as any).insertId) };
}

async function notify(userId: number, actorUserId: number | null, eventType: string, entityType: string, entityId: string, message: string): Promise<void> {
  await rawExec(
    `INSERT INTO social_notifications (user_id, actor_user_id, event_type, entity_type, entity_id, message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, actorUserId, eventType, entityType, entityId, message],
  );
}

export async function toggleFollow(followerUserId: number, creatorUserId: number): Promise<{ following: boolean }> {
  if (followerUserId === creatorUserId) throw new Error("Creators cannot follow themselves");
  const exists = await rawQuery(
    "SELECT 1 FROM social_follows WHERE follower_user_id = ? AND creator_user_id = ? LIMIT 1",
    [followerUserId, creatorUserId],
  );
  if (exists.length) {
    await rawExec("DELETE FROM social_follows WHERE follower_user_id = ? AND creator_user_id = ?", [followerUserId, creatorUserId]);
    return { following: false };
  }
  await rawExec("INSERT INTO social_follows (follower_user_id, creator_user_id) VALUES (?, ?)", [followerUserId, creatorUserId]);
  await notify(creatorUserId, followerUserId, "follow", "user", String(followerUserId), "You have a new follower.");
  return { following: true };
}

export async function toggleReaction(postId: number, userId: number, reactionType: string): Promise<{ active: boolean }> {
  const post = await rawQuery("SELECT creator_user_id FROM social_native_posts WHERE id = ? AND status = 'published' LIMIT 1", [postId]);
  if (!post.length) throw new Error("Social post not found");
  const existing = await rawQuery(
    "SELECT 1 FROM social_post_reactions WHERE post_id = ? AND user_id = ? AND reaction_type = ? LIMIT 1",
    [postId, userId, reactionType],
  );
  if (existing.length) {
    await rawExec("DELETE FROM social_post_reactions WHERE post_id = ? AND user_id = ? AND reaction_type = ?", [postId, userId, reactionType]);
    return { active: false };
  }
  await rawExec("INSERT INTO social_post_reactions (post_id, user_id, reaction_type) VALUES (?, ?, ?)", [postId, userId, reactionType]);
  if (Number(post[0].creator_user_id) !== userId) {
    await notify(Number(post[0].creator_user_id), userId, "reaction", "social_post", String(postId), "Your post received a reaction.");
  }
  return { active: true };
}

export async function addComment(input: { postId: number; userId: number; body: string; parentCommentId?: number }): Promise<{ commentId: number }> {
  const post = await rawQuery("SELECT creator_user_id FROM social_native_posts WHERE id = ? AND status = 'published' LIMIT 1", [input.postId]);
  if (!post.length) throw new Error("Social post not found");
  const result = await rawExec(
    `INSERT INTO social_post_comments (post_id, user_id, parent_comment_id, body) VALUES (?, ?, ?, ?)`,
    [input.postId, input.userId, input.parentCommentId || null, input.body],
  );
  const commentId = Number((result as any).insertId);
  const recipient = input.parentCommentId
    ? await rawQuery("SELECT user_id FROM social_post_comments WHERE id = ? LIMIT 1", [input.parentCommentId])
    : post;
  const recipientId = Number(input.parentCommentId ? recipient[0]?.user_id : recipient[0]?.creator_user_id);
  if (recipientId && recipientId !== input.userId) {
    await notify(recipientId, input.userId, input.parentCommentId ? "reply" : "comment", "social_post", String(input.postId), input.parentCommentId ? "Someone replied to your comment." : "Your post received a comment.");
  }
  return { commentId };
}

export async function toggleSave(postId: number, userId: number): Promise<{ saved: boolean }> {
  const existing = await rawQuery("SELECT 1 FROM social_post_saves WHERE post_id = ? AND user_id = ? LIMIT 1", [postId, userId]);
  if (existing.length) {
    await rawExec("DELETE FROM social_post_saves WHERE post_id = ? AND user_id = ?", [postId, userId]);
    return { saved: false };
  }
  await rawExec("INSERT INTO social_post_saves (post_id, user_id) VALUES (?, ?)", [postId, userId]);
  return { saved: true };
}

export async function listNativeFeed(userId: number, input: { cursor?: number; limit: number; mode: "for_you" | "following" }): Promise<{ items: any[]; nextCursor: number | null }> {
  const cursorPredicate = input.cursor ? "AND p.id < ?" : "";
  const params: unknown[] = [userId];
  let followingJoin = "";
  let modePredicate = "";
  if (input.mode === "following") {
    followingJoin = "JOIN social_follows sf ON sf.creator_user_id = p.creator_user_id AND sf.follower_user_id = ?";
  }
  const query = `
    SELECT p.id, p.creator_user_id, p.source_media_asset_id, p.social_package_id, p.body, p.visibility,
           p.access_tier, p.cta_type, p.cta_payload_json, p.published_at,
           COALESCE(u.name, CONCAT('Creator ', u.id)) AS creator_name,
           CAST(u.id AS CHAR) AS creator_username,
           NULL AS creator_avatar,
           ma.public_url, ma.thumbnail_url, ma.duration, ma.width, ma.height,
           (SELECT COUNT(*) FROM social_post_reactions r WHERE r.post_id = p.id) AS reaction_count,
           (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id = p.id AND c.status = 'visible') AS comment_count,
           (SELECT COUNT(*) FROM social_post_saves s WHERE s.post_id = p.id) AS save_count,
           (SELECT COUNT(*) FROM social_post_reactions r WHERE r.post_id = p.id AND r.user_id = ? AND r.reaction_type = 'like') AS liked_by_viewer,
           (SELECT COUNT(*) FROM social_post_saves s WHERE s.post_id = p.id AND s.user_id = ?) AS saved_by_viewer
    FROM social_native_posts p
    JOIN users u ON u.id = p.creator_user_id
    LEFT JOIN media_assets ma ON BINARY CAST(ma.id AS CHAR) = BINARY p.source_media_asset_id
    ${followingJoin}
    WHERE p.status = 'published' AND p.visibility = 'public' ${cursorPredicate}
    ORDER BY p.published_at DESC, p.id DESC
    LIMIT ?`;
  const queryParams = input.mode === "following"
    ? [userId, userId, userId, ...(input.cursor ? [input.cursor] : []), input.limit]
    : [userId, userId, ...(input.cursor ? [input.cursor] : []), input.limit];
  const rows = await rawQuery(query, queryParams);
  const items = rows.map((row) => ({
    id: Number(row.id), creatorId: Number(row.creator_user_id), creator: { name: row.creator_name, username: row.creator_username, avatar: row.creator_avatar },
    sourceAssetId: String(row.source_media_asset_id), mediaUrl: row.public_url || null, thumbnailUrl: row.thumbnail_url || row.public_url || null,
    duration: row.duration ? Number(row.duration) : null, width: row.width ? Number(row.width) : null, height: row.height ? Number(row.height) : null,
    body: row.body, accessTier: row.access_tier, ctaType: row.cta_type, ctaPayload: row.cta_payload_json, publishedAt: row.published_at,
    reactions: Number(row.reaction_count || 0), comments: Number(row.comment_count || 0), saves: Number(row.save_count || 0),
    likedByViewer: Boolean(Number(row.liked_by_viewer)), savedByViewer: Boolean(Number(row.saved_by_viewer)),
  }));
  return { items, nextCursor: items.length === input.limit ? items[items.length - 1].id : null };
}

export async function getSocialCommandSummary(userId: number): Promise<any> {
  const creatorId = await getCreatorId(userId);
  const [accounts, distribution, money, audience, packages] = await Promise.all([
    rawQuery(`SELECT platform, connection_status, can_post, can_schedule, can_read_analytics, automation_enabled,
                     requires_approval, updated_at FROM connected_accounts ca
              JOIN channel_identities ci ON ci.id = ca.channel_identity_id
              WHERE ci.owner_id = ?`, [userId]).catch(() => []),
    rawQuery(`SELECT status, COUNT(*) AS count FROM distribution_jobs dj
              LEFT JOIN vaultx_creators vc ON vc.id = dj.creator_id
              WHERE vc.user_id = ? OR dj.creator_id = ? GROUP BY status`, [userId, userId]).catch(() => []),
    rawQuery(`SELECT COALESCE(SUM(creator_share_cents), 0) AS creator_earnings_cents, COUNT(*) AS paid_unlocks
              FROM transactions WHERE creator_id = ? AND status = 'completed'`, [creatorId]).catch(() => []),
    rawQuery(`SELECT (SELECT COUNT(*) FROM social_follows WHERE creator_user_id = ?) AS followers,
                     (SELECT COUNT(*) FROM subscriptions WHERE creator_id = ? AND status = 'active') AS subscribers,
                     (SELECT COUNT(*) FROM conversations WHERE creator_id = ?) AS conversations`, [userId, creatorId, userId]).catch(() => []),
    rawQuery(`SELECT state, COUNT(*) AS count FROM social_packages WHERE creator_user_id = ? GROUP BY state`, [userId]).catch(() => []),
  ]);
  return { version: SOCIAL_SPINE_VERSION, accounts, distribution, money: money[0] || {}, audience: audience[0] || {}, packages };
}

export async function listSocialNotifications(userId: number, limit: number): Promise<any[]> {
  return rawQuery(
    `SELECT n.*, actor.name AS actor_name, actor.username AS actor_username
     FROM social_notifications n LEFT JOIN users actor ON actor.id = n.actor_user_id
     WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT ?`,
    [userId, limit],
  );
}

export async function markSocialNotificationRead(userId: number, notificationId: number): Promise<void> {
  await rawExec("UPDATE social_notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [notificationId, userId]);
}

export async function linkVerifiedFanIdentity(input: {
  fanUserId: number;
  creatorUserId?: number;
  identityType: "email" | "phone" | "telegram" | "whatsapp" | "platform" | "referral";
  externalIdentity: string;
  verificationState: "verified" | "explicit_connected" | "unverified";
  evidenceSource: string;
}): Promise<void> {
  await rawExec(
    `INSERT INTO social_fan_identity_links
     (fan_user_id, creator_user_id, identity_type, external_identity, verification_state, evidence_source, last_activity_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE fan_user_id = VALUES(fan_user_id), creator_user_id = VALUES(creator_user_id),
       verification_state = VALUES(verification_state), evidence_source = VALUES(evidence_source), last_activity_at = NOW()`,
    [input.fanUserId, input.creatorUserId || null, input.identityType, input.externalIdentity,
      input.verificationState, input.evidenceSource],
  );
}

export async function recordLegacyAdapter(input: {
  legacySystem: "scheduled_posts" | "platform_posting" | "social_autoposter" | "telegram_funnel" | "telegram_campaign";
  legacyRecordId: string;
  distributionJobId?: number;
  adapterState: "visible_only" | "bridged" | "retired";
  metadata?: unknown;
}): Promise<void> {
  await rawExec(
    `INSERT INTO social_legacy_adapters (legacy_system, legacy_record_id, distribution_job_id, adapter_state, metadata_json)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE distribution_job_id = VALUES(distribution_job_id), adapter_state = VALUES(adapter_state), metadata_json = VALUES(metadata_json)`,
    [input.legacySystem, input.legacyRecordId, input.distributionJobId || null, input.adapterState, safeJson(input.metadata)],
  );
}

export async function prepareCanonicalTelegramJob(input: {
  userId: number;
  sourceAssetId: string;
  channelIdentityId: number;
  destinationUrl: string;
  title: string;
  caption?: string;
  ctaType?: SocialCtaType;
  ctaPayload?: unknown;
}): Promise<{ packageId: string; distributionJobId: number }> {
  const created = await createSocialPackage({
    ...input,
    purpose: "telegram_distribution",
    platforms: ["telegram"],
  });
  if (!created.distributionJobIds.length) throw new Error("Canonical Telegram job was not created");
  return { packageId: created.packageId, distributionJobId: created.distributionJobIds[0] };
}

export const socialSpineInternals = { rawQuery, rawExec, rowsOf };


type ReconciliationRead = { state: "available"; rows: any[] } | { state: "unavailable"; rows: []; reason: string };

async function reconciliationRead(query: string, params: unknown[] = []): Promise<ReconciliationRead> {
  try {
    return { state: "available", rows: await rawQuery(query, params) };
  } catch (error) {
    return {
      state: "unavailable",
      rows: [],
      reason: error instanceof Error ? error.message.slice(0, 180) : "read unavailable",
    };
  }
}

/**
 * Read-only reconciliation inventory for the existing account owner. It never
 * reads token material and it does not create identities, accounts, posts, or
 * external jobs. The results are the evidence source for the first real Social
 * Empire activation.
 */
export async function getKingcamActivationInventory(userId: number): Promise<any> {
  const creatorId = await getCreatorId(userId);
  const [owner, creatorProfile, ownedMedia, personalChannels, brandChannels, connectedAccounts, legacyCredentials,
    telegramChannels, whatsappCommunities, distribution, nativePosts, subscriptions, conversations, transactions,
    socialLinks, accountTokens] = await Promise.all([
    reconciliationRead(`SELECT id, name, email, role, creator_status, primary_brand, createdAt
                        FROM users WHERE id = ? LIMIT 1`, [userId]),
    reconciliationRead(`SELECT id, user_id, display_name, bio, profile_image_url, cover_image_url,
                                subscription_price_basic, subscription_price_premium, subscription_price_vip,
                                total_subscribers, language_primary, is_active
                         FROM vaultx_creators WHERE user_id = ? LIMIT 1`, [userId]),
    reconciliationRead(`SELECT id, asset_type, source_type, file_name, original_name, mime_type, public_url,
                                thumbnail_url, duration, width, height, status, created_at
                         FROM media_assets WHERE user_id = ? AND status = 'ready'
                         ORDER BY created_at DESC LIMIT 24`, [userId]),
    reconciliationRead(`SELECT id, owner_type, owner_id, display_name, slug, brand_lane, channel_type,
                                content_safety_level, is_active, created_at
                         FROM channel_identities WHERE owner_id = ? ORDER BY created_at ASC`, [userId]),
    reconciliationRead(`SELECT id, owner_type, owner_id, display_name, slug, brand_lane, channel_type,
                                content_safety_level, is_active, created_at
                         FROM channel_identities
                         WHERE owner_type IN ('vaultx_brand', 'creatorvault_brand') ORDER BY created_at ASC`),
    reconciliationRead(`SELECT ca.id, ca.platform, ca.platform_account_id, ca.username, ca.display_name,
                                ca.connection_status, ca.can_post, ca.can_schedule, ca.can_send_dm,
                                ca.can_read_analytics, ca.can_trigger_funnel, ca.automation_enabled,
                                ca.requires_approval, ca.created_at,
                                ci.id AS channel_identity_id, ci.owner_type, ci.owner_id, ci.display_name AS channel_name
                         FROM connected_accounts ca
                         JOIN channel_identities ci ON ci.id = ca.channel_identity_id
                         WHERE ci.owner_id = ? OR ci.owner_type IN ('vaultx_brand', 'creatorvault_brand')
                         ORDER BY ca.updated_at DESC`, [userId]),
    reconciliationRead(`SELECT id, platform, platform_user_id, platform_username, follower_count, status, last_synced_at
                         FROM platform_credentials WHERE user_id = ? ORDER BY id DESC`, [userId]),
    reconciliationRead(`SELECT id, channel_id, channel_name, channel_type, creator_id, created_at
                         FROM telegram_channels WHERE creator_id = ? ORDER BY created_at DESC`, [userId]),
    reconciliationRead(`SELECT id, creator_id, created_at FROM whatsapp_communities
                         WHERE creator_id = ? ORDER BY created_at DESC LIMIT 50`, [userId]),
    reconciliationRead(`SELECT platform, status, approval_state, origin_system, COUNT(*) AS count,
                                MAX(created_at) AS last_recorded_at
                         FROM distribution_jobs WHERE creator_id = ?
                         GROUP BY platform, status, approval_state, origin_system
                         ORDER BY last_recorded_at DESC`, [creatorId]),
    reconciliationRead(`SELECT id, source_media_asset_id, social_package_id, status, visibility,
                                access_tier, cta_type, published_at
                         FROM social_native_posts WHERE creator_user_id = ?
                         ORDER BY published_at DESC LIMIT 24`, [userId]),
    reconciliationRead(`SELECT COUNT(*) AS count FROM subscriptions WHERE creator_id = ? AND status = 'active'`, [creatorId]),
    reconciliationRead(`SELECT COUNT(*) AS count FROM conversations WHERE creator_id = ?`, [userId]),
    reconciliationRead(`SELECT COUNT(*) AS count FROM transactions WHERE creator_id = ? AND status = 'completed'`, [creatorId]),
    reconciliationRead(`SELECT id, platform, canonical_connected_account_id, legacy_platform_credential_id,
                                bridge_state, refresh_state, last_successful_read_at, last_successful_publish_at, updated_at
                         FROM social_account_bridges WHERE user_id = ? ORDER BY updated_at DESC`, [userId]),
    reconciliationRead(`SELECT ca.id AS connected_account_id, COUNT(at.id) AS token_record_count
                         FROM connected_accounts ca
                         LEFT JOIN account_tokens at ON at.connected_account_id = ca.id
                         JOIN channel_identities ci ON ci.id = ca.channel_identity_id
                         WHERE ci.owner_id = ? OR ci.owner_type IN ('vaultx_brand', 'creatorvault_brand')
                         GROUP BY ca.id`, [userId]),
  ]);

  return {
    ownerUserId: userId,
    creatorId,
    identity: { owner, creatorProfile },
    ownedMedia,
    channels: { personal: personalChannels, creatorvaultBrand: brandChannels },
    accounts: { connected: connectedAccounts, legacyCredentials, tokenPresence: accountTokens, bridges: socialLinks },
    messaging: { telegram: telegramChannels, whatsapp: whatsappCommunities },
    social: { distribution, nativePosts, subscriptions, conversations, transactions },
  };
}

/**
 * Creates a canonical internal personal channel only when the owner has no
 * channel identity at all. It is not an external account and it cannot publish
 * externally; every recovered external account remains approval-gated.
 */
export async function ensureKingcamPersonalChannel(userId: number): Promise<{ channelId: number; created: boolean }> {
  const existing = await rawQuery(
    `SELECT id FROM channel_identities WHERE owner_id = ? AND owner_type = 'creator_personal'
     ORDER BY created_at ASC LIMIT 1`,
    [userId],
  );
  if (existing.length) return { channelId: Number(existing[0].id), created: false };

  const identity = await rawQuery(
    `SELECT COALESCE(vc.display_name, u.name, 'KingCam') AS display_name
     FROM users u LEFT JOIN vaultx_creators vc ON vc.user_id = u.id
     WHERE u.id = ? LIMIT 1`,
    [userId],
  );
  const displayName = String(identity[0]?.display_name || "KingCam").slice(0, 255);
  const slug = `${displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "kingcam"}-${randomBytes(3).toString("hex")}`;
  const result = await rawExec(
    `INSERT INTO channel_identities
     (owner_type, owner_id, display_name, slug, brand_lane, channel_type, content_safety_level, is_active)
     VALUES ('creator_personal', ?, ?, ?, 'vaultx_adult', 'social', 'teaser', 1)`,
    [userId, displayName, slug],
  );
  return { channelId: Number((result as any).insertId), created: true };
}
