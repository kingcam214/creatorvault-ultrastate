import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import {
  ensureVaultXAcquisitionSchema,
  getVaultXAcquisitionBoard,
  getVaultXAcquisitionConfig,
  getVaultXExecutionProof,
  markVaultXLeadReply,
  runVaultXAcquisitionTick,
  startVaultXAcquisitionCron,
  stopVaultXAcquisitionCron,
  updateVaultXAcquisitionConfig,
  upsertVaultXLead,
} from "../services/vaultxAutonomousAcquisitionOperator";

const leadInput = z.object({
  platform: z.string().min(1).max(64),
  handle: z.string().min(1).max(180),
  displayName: z.string().max(255).optional(),
  profileUrl: z.string().url().optional(),
  source: z.string().max(120).optional(),
  niche: z.string().max(180).optional(),
  vertical: z.string().max(100).optional(),
  bio: z.string().max(5000).optional(),
  audienceFitSignals: z.array(z.string()).optional(),
  recentActivity: z.string().max(2000).optional(),
  followers: z.number().int().nonnegative().optional(),
  engagementRate: z.number().min(0).max(100).optional(),
  monetizationSignals: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  telegramUsername: z.string().max(180).optional(),
  telegramChatId: z.string().max(180).optional(),
  webhookUrl: z.string().url().optional(),
  email: z.string().email().optional(),
  phone: z.string().max(80).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const isOwner = ctx.user.id === 6 || ctx.user.id === 33 || ctx.user.role === "king" || ctx.user.role === "admin";
  if (!isOwner) throw new Error("VaultX acquisition records are private to the owner.");
  return next({ ctx });
});

function requireVaultXAcquisitionExecutionEnabled() {
  if (process.env.CREATORVAULT_VAULTX_ACQUISITION_EXECUTION_ENABLED !== "true") {
    throw new Error("Private creator acquisition is held. No scouting, queueing, follow-up, or delivery can run until a separate owner-controlled execution window is enabled.");
  }
}

const ownerAutopilotPatch = z.object({
  enabled: z.boolean().optional(),
  approvedBy: z.string().max(120).optional(),
  approvedAt: z.string().optional(),
  policyVersion: z.string().max(120).optional(),
  minScore: z.number().int().min(1).max(100).optional(),
  dailySendLimit: z.number().int().min(1).max(500).optional(),
  allowedChannels: z.array(z.string().min(1).max(80)).optional(),
  allowedStages: z.array(z.enum(["first_touch", "follow_up_1", "follow_up_2", "follow_up_3", "final_cta", "handoff"])).optional(),
  requireDirectDelivery: z.boolean().optional(),
  stopOnRiskSignals: z.boolean().optional(),
  plainEnglishSummary: z.string().max(1000).optional(),
});

const configPatch = z.object({
  enabled: z.boolean().optional(),
  tickIntervalMs: z.number().int().min(60_000).optional(),
  maxFirstTouchesPerTick: z.number().int().min(1).max(500).optional(),
  maxFollowUpsPerTick: z.number().int().min(1).max(1000).optional(),
  maxRetries: z.number().int().min(1).max(10).optional(),
  hotThreshold: z.number().int().min(1).max(100).optional(),
  warmThreshold: z.number().int().min(1).max(100).optional(),
  coolThreshold: z.number().int().min(1).max(100).optional(),
  allowedVerticals: z.array(z.string()).optional(),
  blockedTerms: z.array(z.string()).optional(),
  priorityPlatforms: z.record(z.string(), z.number()).optional(),
  followUpDelaysHours: z.array(z.number().positive()).optional(),
  ctaServiceName: z.string().optional(),
  ctaPriceCents: z.number().int().positive().optional(),
  onboardingBaseUrl: z.string().url().optional(),
  checkoutBaseUrl: z.string().url().optional(),
  trackingBaseUrl: z.string().url().optional(),
  telegramBotToken: z.string().optional(),
  telegramOpsChatId: z.string().optional(),
  allowHttpWebhooks: z.boolean().optional(),
  seedCreators: z.array(leadInput).optional(),
  discoverySubreddits: z.array(z.string().min(1).max(120)).optional(),
  sourceHttpEndpoints: z.array(z.string().url()).optional(),
  maxDiscoveryPerTick: z.number().int().min(1).max(1000).optional(),
  ownerAutopilot: ownerAutopilotPatch.optional(),
});

export const vaultxAcquisitionOperatorRouter = router({
  bootstrap: ownerProcedure.mutation(async () => {
    await ensureVaultXAcquisitionSchema();
    return { success: true };
  }),

  getConfig: ownerProcedure.query(async () => {
    return { config: await getVaultXAcquisitionConfig() };
  }),

  configure: ownerProcedure.input(configPatch).mutation(async ({ input }) => {
    return { config: await updateVaultXAcquisitionConfig(input as any) };
  }),

  ingestLead: ownerProcedure.input(leadInput).mutation(async ({ input }) => {
    const lead = await upsertVaultXLead(input, "manual_ingest");
    return { success: true, lead };
  }),

  ingestLeads: ownerProcedure.input(z.object({ leads: z.array(leadInput).min(1).max(500) })).mutation(async ({ input }) => {
    const results = [];
    for (const leadInput of input.leads) results.push(await upsertVaultXLead(leadInput, "manual_bulk_ingest"));
    return { success: true, count: results.length, leads: results };
  }),

  runNow: protectedProcedure.input(z.object({
    mode: z.enum(["auto", "manual", "test"]).default("manual"),
    sourceLimit: z.number().int().min(1).max(1000).optional(),
    outreachLimit: z.number().int().min(1).max(1000).optional(),
    followUpLimit: z.number().int().min(1).max(1000).optional(),
  }).optional()).mutation(async ({ input }) => {
    requireVaultXAcquisitionExecutionEnabled();
    return await runVaultXAcquisitionTick(input || { mode: "manual" });
  }),

  markReply: ownerProcedure.input(z.object({
    leadId: z.number().int().positive().optional(),
    platform: z.string().optional(),
    handle: z.string().optional(),
    replyStatus: z.enum(["positive", "neutral", "negative", "blocked"]),
    intentScore: z.number().int().min(0).max(100).optional(),
    notes: z.string().max(5000).optional(),
  }).refine(v => Boolean(v.leadId || (v.platform && v.handle)), { message: "Provide leadId or platform+handle." })).mutation(async ({ input }) => {
    requireVaultXAcquisitionExecutionEnabled();
    return await markVaultXLeadReply(input);
  }),

  getBoard: ownerProcedure.input(z.object({ limit: z.number().int().min(1).max(500).default(100) }).optional()).query(async ({ input }) => {
    return await getVaultXAcquisitionBoard(input?.limit || 100);
  }),

  getProof: ownerProcedure.input(z.object({ limit: z.number().int().min(1).max(500).default(100) }).optional()).query(async ({ input }) => {
    return await getVaultXExecutionProof(input?.limit || 100);
  }),

  startCron: ownerProcedure.mutation(async () => {
    requireVaultXAcquisitionExecutionEnabled();
    return startVaultXAcquisitionCron();
  }),
  stopCron: ownerProcedure.mutation(async () => stopVaultXAcquisitionCron()),

  publicHealth: publicProcedure.query(async () => ({ ok: true, mode: "private_relationship_acquisition_held" })),
});
