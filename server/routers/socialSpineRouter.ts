import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  SOCIAL_SPINE_VERSION,
  addComment,
  bridgeLegacyPlatformCredentials,
  createNativePost,
  createSocialPackage,
  ensureKingcamPersonalChannel,
  getKingcamActivationInventory,
  getSocialCommandSummary,
  upsertManualSocialAccountMap,
  linkVerifiedFanIdentity,
  listNativeFeed,
  listSocialNotifications,
  markSocialNotificationRead,
  prepareCanonicalTelegramJob,
  recordLegacyAdapter,
  toggleFollow,
  toggleReaction,
  toggleSave,
} from "../services/socialSpineService";

const platformSchema = z.enum([
  "native", "telegram", "instagram", "tiktok", "youtube", "twitter", "facebook", "whatsapp", "onlyfans",
]);
const ctaSchema = z.enum(["follow", "message", "tip", "subscribe", "unlock", "shop", "book", "join", "remix", "share"]);

const creatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!["creator", "king", "admin"].includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Creator access is required" });
  }
  return next({ ctx });
});

/**
 * Canonical Social Empire API.
 * No route in this router calls an external platform. Package creation produces
 * approval-gated distribution jobs; native publication stays entirely inside
 * CreatorVault. Existing distribution.job.post remains the only external
 * executor and retains its existing approval/configuration requirements.
 */
export const socialSpineRouter = router({
  canonical: protectedProcedure.query(async () => ({
    version: SOCIAL_SPINE_VERSION,
    owners: {
      accounts: "connected_accounts + account_tokens",
      distribution: "distribution_jobs",
      attribution: "attribution_events",
      media: "media_assets",
      fanRelationships: "users + subscriptions + conversations + transactions",
      messaging: "messageRouter",
      nativeSocial: "social_native_* tables",
    },
    outboundAutomation: "default_deny",
    externalPosting: "not_available_from_social_spine",
  })),

  reconciliationInventory: creatorProcedure.query(async ({ ctx }) => {
    return getKingcamActivationInventory(ctx.user.id);
  }),

  ensureKingcamPersonalChannel: creatorProcedure.mutation(async ({ ctx }) => {
    return ensureKingcamPersonalChannel(ctx.user.id);
  }),

  upsertManualAccountMap: creatorProcedure
    .input(z.object({
      channelIdentityId: z.number().int().positive(),
      platform: z.enum(["instagram", "tiktok", "facebook", "youtube", "telegram", "whatsapp", "onlyfans", "twitter"]),
      username: z.string().trim().min(1).max(255).optional(),
      displayName: z.string().trim().min(1).max(255).optional(),
      provenance: z.enum(["owner_declared_existing", "recovered_legacy_record"]),
    }))
    .mutation(async ({ ctx, input }) => upsertManualSocialAccountMap({ userId: ctx.user.id, ...input })),

  bridgeLegacyAccounts: creatorProcedure.mutation(async ({ ctx }) => {
    return bridgeLegacyPlatformCredentials(ctx.user.id);
  }),

  packageFromMedia: creatorProcedure
    .input(z.object({
      sourceAssetId: z.string().min(1),
      channelIdentityId: z.number().int().positive(),
      destinationUrl: z.string().url(),
      title: z.string().min(2).max(255),
      purpose: z.enum(["audience_growth", "subscriber_conversion", "product_sale", "telegram_distribution", "creator_story"]).default("audience_growth"),
      caption: z.string().max(5000).optional(),
      platforms: z.array(platformSchema).min(1).max(9),
      ctaType: ctaSchema.optional(),
      ctaPayload: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => createSocialPackage({ userId: ctx.user.id, ...input })),

  prepareTelegram: creatorProcedure
    .input(z.object({
      sourceAssetId: z.string().min(1),
      channelIdentityId: z.number().int().positive(),
      destinationUrl: z.string().url(),
      title: z.string().min(2).max(255),
      caption: z.string().max(5000).optional(),
      ctaType: ctaSchema.optional(),
      ctaPayload: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => prepareCanonicalTelegramJob({ userId: ctx.user.id, ...input })),

  recordLegacyVisibility: creatorProcedure
    .input(z.object({
      legacySystem: z.enum(["scheduled_posts", "platform_posting", "social_autoposter", "telegram_funnel", "telegram_campaign"]),
      legacyRecordId: z.string().min(1).max(191),
      distributionJobId: z.number().int().positive().optional(),
      adapterState: z.enum(["visible_only", "bridged", "retired"]),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      await recordLegacyAdapter(input);
      return { recorded: true };
    }),

  createNativePost: creatorProcedure
    .input(z.object({
      sourceAssetId: z.string().min(1),
      body: z.string().max(5000).optional(),
      visibility: z.enum(["public", "followers", "subscribers"]).default("public"),
      accessTier: z.enum(["free", "paid", "subscriber"]).default("free"),
      ctaType: ctaSchema.optional(),
      ctaPayload: z.record(z.string(), z.unknown()).optional(),
      socialPackageId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => createNativePost({ userId: ctx.user.id, ...input })),

  feed: protectedProcedure
    .input(z.object({
      cursor: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(40).default(12),
      mode: z.enum(["for_you", "following"]).default("for_you"),
    }))
    .query(async ({ ctx, input }) => listNativeFeed(ctx.user.id, input)),

  follow: protectedProcedure
    .input(z.object({ creatorUserId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => toggleFollow(ctx.user.id, input.creatorUserId)),

  react: protectedProcedure
    .input(z.object({ postId: z.number().int().positive(), reactionType: z.enum(["like", "fire", "love"]).default("like") }))
    .mutation(async ({ ctx, input }) => toggleReaction(input.postId, ctx.user.id, input.reactionType)),

  comment: protectedProcedure
    .input(z.object({ postId: z.number().int().positive(), body: z.string().trim().min(1).max(2000), parentCommentId: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => addComment({ postId: input.postId, userId: ctx.user.id, body: input.body, parentCommentId: input.parentCommentId })),

  save: protectedProcedure
    .input(z.object({ postId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => toggleSave(input.postId, ctx.user.id)),

  notifications: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(40) }).optional())
    .query(async ({ ctx, input }) => listSocialNotifications(ctx.user.id, input?.limit ?? 40)),

  markNotificationRead: protectedProcedure
    .input(z.object({ notificationId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await markSocialNotificationRead(ctx.user.id, input.notificationId);
      return { read: true };
    }),

  linkVerifiedFanIdentity: creatorProcedure
    .input(z.object({
      fanUserId: z.number().int().positive(),
      creatorUserId: z.number().int().positive().optional(),
      identityType: z.enum(["email", "phone", "telegram", "whatsapp", "platform", "referral"]),
      externalIdentity: z.string().trim().min(1).max(255),
      verificationState: z.enum(["verified", "explicit_connected", "unverified"]),
      evidenceSource: z.string().trim().min(2).max(64),
    }))
    .mutation(async ({ input }) => {
      await linkVerifiedFanIdentity(input);
      return { linked: true };
    }),

  commandSummary: creatorProcedure.query(async ({ ctx }) => getSocialCommandSummary(ctx.user.id)),
});
