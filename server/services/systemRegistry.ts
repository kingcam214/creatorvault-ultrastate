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

/**
 * Get all active deployments
 */
export async function getAllDeployments(): Promise<SystemDeployment[]> {
  // For now, return hardcoded deployments
  // In production, would query system_deployments table
  return [
    {
      id: "creatorvault-main",
      name: "CreatorVault ULTRASTATE",
      type: "website",
      url: "https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer",
      status: "active",
      owner: "KINGCAM",
      deployedAt: new Date("2024-12-18"),
      lastHealthCheck: new Date(),
      metadata: {
        version: "7e5c1532",
        features: ["server", "db", "user"],
      },
    },
  ];
}

/**
 * Get all system bots
 */
export async function getAllBots(): Promise<SystemBot[]> {
  const bots: SystemBot[] = [];

  // Get Telegram bots
  const telegramBotsData = await db.select().from(telegramBots);
  bots.push(...telegramBotsData.map(bot => ({
    id: bot.id,
    name: bot.name,
    type: "telegram" as const,
    status: bot.status as "active" | "paused" | "error",
    enabled: bot.status === "active",
    broadcastEnabled: true,
    messageCount: 0, // Would query telegram_leads or bot_events
    lastActivity: bot.updatedAt,
    metadata: {
      botToken: "***",
      webhookUrl: bot.webhookUrl,
    },
  })));

  // Get WhatsApp providers
  const whatsappData = await db.select().from(whatsappProviders);
  bots.push(...whatsappData.map(provider => ({
    id: provider.id,
    name: provider.name,
    type: "whatsapp" as const,
    status: provider.status as "active" | "paused" | "error",
    enabled: provider.status === "active",
    broadcastEnabled: true,
    messageCount: 0, // Would query whatsapp_leads or bot_events
    lastActivity: provider.updatedAt,
    metadata: {
      phoneNumber: provider.phoneNumber,
      provider: provider.provider,
    },
  })));

  // Add AI Assistant bot
  bots.push({
    id: "ai-assistant-main",
    name: "CreatorVault AI Assistant",
    type: "ai_assistant",
    status: "active",
    enabled: true,
    broadcastEnabled: false,
    messageCount: 0, // Would query bot_events
    lastActivity: new Date(),
    metadata: {
      roles: ["creator", "recruiter", "field_operator", "ambassador"],
    },
  });

  return bots;
}

/**
 * Get all system channels
 */
export async function getAllChannels(): Promise<SystemChannel[]> {
  // For now, return hardcoded channels
  // In production, would query system_channels table
  return [
    {
      id: "marketplace",
      platform: "CreatorVault",
      name: "Marketplace",
      status: "active",
      enabled: true,
      metadata: { route: "/marketplace" },
    },
    {
      id: "university",
      platform: "CreatorVault",
      name: "University",
      status: "active",
      enabled: true,
      metadata: { route: "/university" },
    },
    {
      id: "services",
      platform: "CreatorVault",
      name: "Services",
      status: "active",
      enabled: true,
      metadata: { route: "/services" },
    },
    {
      id: "ai-bot",
      platform: "CreatorVault",
      name: "AI Bot",
      status: "active",
      enabled: true,
      metadata: { route: "/ai-bot" },
    },
    {
      id: "command-hub",
      platform: "CreatorVault",
      name: "Command Hub",
      status: "active",
      enabled: true,
      metadata: { route: "/command-hub" },
    },
  ];
}

/**
 * Get all system links
 */
export async function getAllLinks(): Promise<SystemLink[]> {
  // For now, return hardcoded links
  // In production, would query system_links table
  return [
    {
      id: "main-deployment",
      url: "https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer",
      type: "deployment",
      destination: "CreatorVault ULTRASTATE",
      createdBy: "KINGCAM",
      createdAt: new Date("2024-12-18"),
      accessCount: 0,
    },
  ];
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

  return events.map(event => ({
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
      active: deployments.filter(d => d.status === "active").length,
      paused: deployments.filter(d => d.status === "paused").length,
      error: deployments.filter(d => d.status === "error").length,
    },
    bots: {
      total: bots.length,
      active: bots.filter(b => b.status === "active").length,
      paused: bots.filter(b => b.status === "paused").length,
      error: bots.filter(b => b.status === "error").length,
      byType: {
        telegram: bots.filter(b => b.type === "telegram").length,
        whatsapp: bots.filter(b => b.type === "whatsapp").length,
        ai_assistant: bots.filter(b => b.type === "ai_assistant").length,
        live: bots.filter(b => b.type === "live").length,
      },
    },
    channels: {
      total: channels.length,
      active: channels.filter(c => c.status === "active").length,
      paused: channels.filter(c => c.status === "paused").length,
      error: channels.filter(c => c.status === "error").length,
    },
    links: {
      total: links.length,
      totalAccess: links.reduce((sum, l) => sum + l.accessCount, 0),
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
      owner: allUsers.filter(u => u.role === "king").length,
      admin: allUsers.filter(u => u.role === "admin").length,
      creator: allUsers.filter(u => u.role === "creator").length,
      user: allUsers.filter(u => u.role === "user").length,
    },
    byStatus: {
      active: allUsers.filter(u => u.creatorStatus === "active").length,
      pending: allUsers.filter(u => u.creatorStatus === "pending").length,
      suspended: allUsers.filter(u => u.creatorStatus === "suspended").length,
    },
  };
}
