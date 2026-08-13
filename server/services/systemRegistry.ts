/**
 * System Registry Service
 * 
 * CONTROL GAP DIRECTIVE: Centralized registry for ALL system components.
 * 
 * This service maintains the source of truth for:
 * - Active deployments
 * - Bots (Telegram, WhatsApp, AI)
 * - Channels and platforms
 * - Generated links
 * - System logs
 * - Feature toggles
 * 
 * OWNER MANDATE: Nothing deploys without registration here.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../db";
import { 
  telegramBots,
  whatsappProviders,
  botEvents,
  users,
} from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export interface SystemDeployment {
  id: string;
  name: string;
  type: "website" | "bot" | "service" | "api";
  url: string;
  status: "active" | "paused" | "error";
  owner: string;
  deployedAt: Date;
  lastHealthCheck?: Date;
  metadata?: Record<string, any>;
}

export interface SystemBot {
  id: string;
  name: string;
  type: "telegram" | "whatsapp" | "ai_assistant" | "live";
  status: "active" | "paused" | "error";
  enabled: boolean;
  broadcastEnabled: boolean;
  messageCount: number;
  lastActivity?: Date;
  metadata?: Record<string, any>;
}

export interface SystemChannel {
  id: string;
  platform: string;
  name: string;
  status: "active" | "paused" | "error";
  enabled: boolean;
  subscriberCount?: number;
  metadata?: Record<string, any>;
}

export interface SystemLink {
  id: string;
  url: string;
  type: "deployment" | "bot" | "channel" | "feature";
  destination: string;
  createdBy: string;
  createdAt: Date;
  accessCount: number;
  lastAccessed?: Date;
}

export interface SystemLog {
  id: string;
  level: "info" | "warn" | "error" | "critical";
  component: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface ReleaseMetadata {
  commit?: string;
  gitSha?: string;
  branch?: string;
  timestamp?: string;
  deployedAt?: string;
  builtAt?: string;
  environment?: string;
}

const CREATORVAULT_PRODUCTION_URL = process.env.CREATORVAULT_PUBLIC_URL || "https://creatorvault.live";
const OWNER_HIDDEN_BOT_NAME = /\b(test|simulated)\b/i;

function isOwnerVisibleBot(name: string | null | undefined) {
  return Boolean(name?.trim()) && !OWNER_HIDDEN_BOT_NAME.test(name);
}

async function readReleaseMetadata(): Promise<ReleaseMetadata | null> {
  const releasePaths = [
    path.resolve(process.cwd(), "dist", "public", "release.json"),
    path.resolve(process.cwd(), "dist", "release.json"),
    path.resolve(process.cwd(), "release.json"),
  ];

  for (const releasePath of releasePaths) {
    try {
      const raw = await readFile(releasePath, "utf8");
      return JSON.parse(raw) as ReleaseMetadata;
    } catch {
      // Try the next production release location. An absent release stamp is not a deployment.
    }
  }

  return null;
}

async function getBroadcastStates() {
  const events = await db
    .select()
    .from(botEvents)
    .where(eq(botEvents.eventType, "broadcast_toggle"))
    .orderBy(desc(botEvents.createdAt));
  const states = new Map<string, boolean>();

  for (const event of events as any[]) {
    const eventData = event.eventData as { botId?: string; enabled?: boolean } | null;
    if (eventData?.botId && !states.has(eventData.botId)) {
      states.set(eventData.botId, eventData.enabled === true);
    }
  }

  return states;
}

/**
 * Get all active deployments
 */
export async function getAllDeployments(): Promise<SystemDeployment[]> {
  const release = await readReleaseMetadata();
  if (!release) return [];

  const deployedAt = new Date(release.deployedAt || release.timestamp || release.builtAt || 0);
  if (Number.isNaN(deployedAt.getTime())) return [];

  return [{
    id: "creatorvault-production",
    name: "CreatorVault Production",
    type: "website",
    url: CREATORVAULT_PRODUCTION_URL,
    status: "active",
    owner: "KINGCAM",
    deployedAt,
    metadata: {
      commit: release.commit || release.gitSha || null,
      branch: release.branch || null,
      environment: release.environment || null,
    },
  }];
}

/**
 * Get all system bots
 */
export async function getAllBots(): Promise<SystemBot[]> {
  const bots: SystemBot[] = [];
  const broadcastStates = await getBroadcastStates();

  // Get Telegram bots
  const telegramBotsData = await db.select().from(telegramBots);
  bots.push(...telegramBotsData.filter((bot: any) => isOwnerVisibleBot(bot.name)).map((bot: any) => ({
    id: bot.id,
    name: bot.name,
    type: "telegram" as const,
    status: bot.status as "active" | "paused" | "error",
    enabled: bot.status === "active",
    broadcastEnabled: broadcastStates.get(bot.id) ?? false,
    messageCount: 0, // Message totals are not yet recorded per bot.
    lastActivity: bot.updatedAt,
    metadata: {
      botToken: "***",
      webhookUrl: bot.webhookUrl,
    },
  })));

  // Get WhatsApp providers
  const whatsappData = await db.select().from(whatsappProviders);
  bots.push(...whatsappData.filter((provider: any) => isOwnerVisibleBot(provider.name)).map((provider: any) => ({
    id: provider.id,
    name: provider.name,
    type: "whatsapp" as const,
    status: provider.status as "active" | "paused" | "error",
    enabled: provider.status === "active",
    broadcastEnabled: broadcastStates.get(provider.id) ?? false,
    messageCount: 0, // Message totals are not yet recorded per provider.
    lastActivity: provider.updatedAt,
    metadata: {
      phoneNumber: provider.phoneNumber,
      provider: provider.provider,
    },
  })));

  return bots;
}

/**
 * Get all system channels
 */
export async function getAllChannels(): Promise<SystemChannel[]> {
  // No durable channel registry exists yet. Return no channels rather than inventing active routes.
  return [];
}

/**
 * Get all system links
 */
export async function getAllLinks(): Promise<SystemLink[]> {
  // No durable generated-link registry exists yet. Return no links rather than inventing traceability.
  return [];
}

/**
 * Get system logs
 */
export async function getSystemLogs(limit: number = 100): Promise<SystemLog[]> {
  // Query bot_events as system logs
  const events = await db
    .select()
    .from(botEvents)
    .orderBy(desc(botEvents.createdAt))
    .limit(limit);

  return events.map((event: any) => ({
    id: event.id,
    level: event.outcome === "error" ? "error" : "info",
    component: event.channel,
    message: event.eventType,
    metadata: event.eventData as Record<string, any>,
    timestamp: event.createdAt,
  }));
}

/**
 * Get database health
 */
export async function getDatabaseHealth() {
  try {
    // Count records in key tables
    const userCount = await db.select().from(users);
    const botEventCount = await db.select().from(botEvents);
    const telegramBotCount = await db.select().from(telegramBots);
    const whatsappProviderCount = await db.select().from(whatsappProviders);

    return {
      status: "healthy",
      tables: {
        users: userCount.length,
        botEvents: botEventCount.length,
        telegramBots: telegramBotCount.length,
        whatsappProviders: whatsappProviderCount.length,
      },
      lastCheck: new Date(),
    };
  } catch (error) {
    return {
      status: "error",
      error: (error as Error).message,
      lastCheck: new Date(),
    };
  }
}

/**
 * Enable/disable bot
 */
export async function toggleBot(botId: string, enabled: boolean) {
  // Check if Telegram bot
  const telegramBot = await db
    .select()
    .from(telegramBots)
    .where(eq(telegramBots.id, botId))
    .limit(1);

  if (telegramBot.length > 0) {
    await db
      .update(telegramBots)
      .set({ status: enabled ? "active" : "paused" })
      .where(eq(telegramBots.id, botId));
    return { success: true, type: "telegram" };
  }

  // Check if WhatsApp provider
  const whatsappProvider = await db
    .select()
    .from(whatsappProviders)
    .where(eq(whatsappProviders.id, botId))
    .limit(1);

  if (whatsappProvider.length > 0) {
    await db
      .update(whatsappProviders)
      .set({ status: enabled ? "active" : "paused" })
      .where(eq(whatsappProviders.id, botId));
    return { success: true, type: "whatsapp" };
  }

  // AI Assistant or other bots would be handled here
  return { success: false, error: "Bot not found" };
}

/**
 * Enable/disable broadcast for bot
 */
export async function toggleBroadcast(botId: string, enabled: boolean) {
  // Log broadcast toggle
  await db.insert(botEvents).values({
    userId: 1, // System user
    channel: "system",
    eventType: "broadcast_toggle",
    eventData: {
      botId,
      enabled,
      timestamp: Date.now(),
    },
    outcome: "success",
  });

  return { success: true, botId, enabled };
}

/**
 * Get system stats
 */
export async function getSystemStats() {
  const deployments = await getAllDeployments();
  const bots = await getAllBots();
  const channels = await getAllChannels();
  const links = await getAllLinks();

  return {
    deployments: {
      total: deployments.length,
      active: deployments.filter((d: any) => d.status === "active").length,
      paused: deployments.filter((d: any) => d.status === "paused").length,
      error: deployments.filter((d: any) => d.status === "error").length,
    },
    bots: {
      total: bots.length,
      active: bots.filter((b: any) => b.status === "active").length,
      paused: bots.filter((b: any) => b.status === "paused").length,
      error: bots.filter((b: any) => b.status === "error").length,
      byType: {
        telegram: bots.filter((b: any) => b.type === "telegram").length,
        whatsapp: bots.filter((b: any) => b.type === "whatsapp").length,
        ai_assistant: bots.filter((b: any) => b.type === "ai_assistant").length,
        live: bots.filter((b: any) => b.type === "live").length,
      },
    },
    channels: {
      total: channels.length,
      active: channels.filter((c: any) => c.status === "active").length,
      paused: channels.filter((c: any) => c.status === "paused").length,
      error: channels.filter((c: any) => c.status === "error").length,
    },
    links: {
      total: links.length,
      totalAccess: links.reduce((sum: any, l: any) => sum + l.accessCount, 0),
    },
  };
}

/**
 * Get role governance stats
 */
export async function getRoleGovernance() {
  const allUsers = await db.select().from(users);

  return {
    total: allUsers.length,
    byRole: {
      owner: allUsers.filter((u: any) => u.role === "king").length,
      admin: allUsers.filter((u: any) => u.role === "admin").length,
      creator: allUsers.filter((u: any) => u.role === "creator").length,
      user: allUsers.filter((u: any) => u.role === "user").length,
    },
    byStatus: {
      active: allUsers.filter((u: any) => u.creatorStatus === "active").length,
      pending: allUsers.filter((u: any) => u.creatorStatus === "pending").length,
      suspended: allUsers.filter((u: any) => u.creatorStatus === "suspended").length,
    },
  };
}
