/**
 * Owner Control Panel Tests
 * 
 * Tests for system registry and owner control functionality
 */

import { describe, it, expect, beforeAll } from "vitest";
import { db } from "./db";
import { users, telegramBots, whatsappProviders, botEvents } from "../drizzle/schema";
import {
  getAllDeployments,
  getAllBots,
  getAllChannels,
  getAllLinks,
  getSystemLogs,
  getDatabaseHealth,
  toggleBot,
  toggleBroadcast,
  getSystemStats,
  getRoleGovernance,
} from "./services/systemRegistry";
import crypto from "crypto";

describe("Owner Control Panel", () => {
  let testUserId: number;
  let testTelegramBotId: string;
  let testWhatsAppProviderId: string;

  beforeAll(async () => {
    // Create test user
    const testUser = await db.insert(users).values({
      openId: `test-owner-${Date.now()}`,
      email: `test-owner-${Date.now()}@example.com`,
      name: "Test Owner",
      role: "king",
      creatorStatus: "active",
    });
    testUserId = testUser[0].insertId;

    // Create test Telegram bot
    testTelegramBotId = crypto.randomUUID();
    await db.insert(telegramBots).values({
      id: testTelegramBotId,
      name: "Test Telegram Bot",
      botToken: "test-token-123",
      status: "active",
      createdBy: testUserId,
    });

    // Create test WhatsApp provider
    testWhatsAppProviderId = crypto.randomUUID();
    await db.insert(whatsappProviders).values({
      id: testWhatsAppProviderId,
      name: "Test WhatsApp Provider",
      provider: "twilio",
      credentialsJson: JSON.stringify({ apiKey: "test" }),
      phoneNumber: "+1234567890",
      status: "active",
      createdBy: testUserId,
    });

    // Create test bot event
    await db.insert(botEvents).values({
      userId: testUserId,
      channel: "telegram",
      eventType: "test_event",
      eventData: { test: true },
      outcome: "success",
    });
  });

  it("should get all deployments", async () => {
    const deployments = await getAllDeployments();
    
    expect(deployments).toBeDefined();
    expect(Array.isArray(deployments)).toBe(true);
    expect(deployments.length).toBeGreaterThan(0);
    
    const mainDeployment = deployments[0];
    expect(mainDeployment.id).toBe("creatorvault-main");
    expect(mainDeployment.name).toBe("CreatorVault ULTRASTATE");
    expect(mainDeployment.type).toBe("website");
    expect(mainDeployment.status).toBe("active");
    expect(mainDeployment.owner).toBe("KINGCAM");
  });

  it("should get all bots", async () => {
    const bots = await getAllBots();
    
    expect(bots).toBeDefined();
    expect(Array.isArray(bots)).toBe(true);
    expect(bots.length).toBeGreaterThan(0);
    
    // Check Telegram bot
    const telegramBot = bots.find(b => b.id === testTelegramBotId);
    expect(telegramBot).toBeDefined();
    expect(telegramBot?.type).toBe("telegram");
    expect(telegramBot?.status).toBe("active");
    expect(telegramBot?.enabled).toBe(true);
    
    // Check WhatsApp provider
    const whatsappBot = bots.find(b => b.id === testWhatsAppProviderId);
    expect(whatsappBot).toBeDefined();
    expect(whatsappBot?.type).toBe("whatsapp");
    expect(whatsappBot?.status).toBe("active");
    
    // Check AI Assistant bot
    const aiBot = bots.find(b => b.id === "ai-assistant-main");
    expect(aiBot).toBeDefined();
    expect(aiBot?.type).toBe("ai_assistant");
    expect(aiBot?.status).toBe("active");
  });

  it("should get all channels", async () => {
    const channels = await getAllChannels();
    
    expect(channels).toBeDefined();
    expect(Array.isArray(channels)).toBe(true);
    expect(channels.length).toBeGreaterThan(0);
    
    const channelNames = channels.map(c => c.name);
    expect(channelNames).toContain("Marketplace");
    expect(channelNames).toContain("University");
    expect(channelNames).toContain("Services");
    expect(channelNames).toContain("AI Bot");
    expect(channelNames).toContain("Command Hub");
  });

  it("should get all links", async () => {
    const links = await getAllLinks();
    
    expect(links).toBeDefined();
    expect(Array.isArray(links)).toBe(true);
    expect(links.length).toBeGreaterThan(0);
    
    const mainLink = links[0];
    expect(mainLink.type).toBe("deployment");
    expect(mainLink.destination).toBe("CreatorVault ULTRASTATE");
    expect(mainLink.createdBy).toBe("KINGCAM");
  });

  it("should get system logs", async () => {
    const logs = await getSystemLogs(10);
    
    expect(logs).toBeDefined();
    expect(Array.isArray(logs)).toBe(true);
    
    if (logs.length > 0) {
      const log = logs[0];
      expect(log.level).toBeDefined();
      expect(log.component).toBeDefined();
      expect(log.message).toBeDefined();
      expect(log.timestamp).toBeDefined();
    }
  });

  it("should get database health", async () => {
    const health = await getDatabaseHealth();
    
    expect(health).toBeDefined();
    expect(health.status).toBe("healthy");
    expect(health.tables).toBeDefined();
    expect(health.tables.users).toBeGreaterThan(0);
    expect(health.tables.botEvents).toBeGreaterThan(0);
    expect(health.tables.telegramBots).toBeGreaterThan(0);
    expect(health.tables.whatsappProviders).toBeGreaterThan(0);
    expect(health.lastCheck).toBeDefined();
  });

  it("should toggle Telegram bot", async () => {
    // Disable bot
    const disableResult = await toggleBot(testTelegramBotId, false);
    expect(disableResult.success).toBe(true);
    expect(disableResult.type).toBe("telegram");
    
    // Verify bot is disabled
    const botsAfterDisable = await getAllBots();
    const disabledBot = botsAfterDisable.find(b => b.id === testTelegramBotId);
    expect(disabledBot?.status).toBe("paused");
    expect(disabledBot?.enabled).toBe(false);
    
    // Enable bot
    const enableResult = await toggleBot(testTelegramBotId, true);
    expect(enableResult.success).toBe(true);
    
    // Verify bot is enabled
    const botsAfterEnable = await getAllBots();
    const enabledBot = botsAfterEnable.find(b => b.id === testTelegramBotId);
    expect(enabledBot?.status).toBe("active");
    expect(enabledBot?.enabled).toBe(true);
  });

  it("should toggle WhatsApp provider", async () => {
    // Disable provider
    const disableResult = await toggleBot(testWhatsAppProviderId, false);
    expect(disableResult.success).toBe(true);
    expect(disableResult.type).toBe("whatsapp");
    
    // Enable provider
    const enableResult = await toggleBot(testWhatsAppProviderId, true);
    expect(enableResult.success).toBe(true);
  });

  it("should toggle broadcast", async () => {
    const result = await toggleBroadcast(testTelegramBotId, false);
    
    expect(result.success).toBe(true);
    expect(result.botId).toBe(testTelegramBotId);
    expect(result.enabled).toBe(false);
    
    // Verify broadcast toggle was logged
    const logs = await getSystemLogs(10);
    const broadcastLog = logs.find(l => l.message === "broadcast_toggle");
    expect(broadcastLog).toBeDefined();
  });

  it("should get system stats", async () => {
    const stats = await getSystemStats();
    
    expect(stats).toBeDefined();
    expect(stats.deployments).toBeDefined();
    expect(stats.deployments.total).toBeGreaterThan(0);
    expect(stats.deployments.active).toBeGreaterThan(0);
    
    expect(stats.bots).toBeDefined();
    expect(stats.bots.total).toBeGreaterThan(0);
    expect(stats.bots.byType).toBeDefined();
    expect(stats.bots.byType.telegram).toBeGreaterThan(0);
    expect(stats.bots.byType.whatsapp).toBeGreaterThan(0);
    expect(stats.bots.byType.ai_assistant).toBeGreaterThan(0);
    
    expect(stats.channels).toBeDefined();
    expect(stats.channels.total).toBeGreaterThan(0);
    
    expect(stats.links).toBeDefined();
    expect(stats.links.total).toBeGreaterThan(0);
  });

  it("should get role governance", async () => {
    const governance = await getRoleGovernance();
    
    expect(governance).toBeDefined();
    expect(governance.total).toBeGreaterThan(0);
    expect(governance.byRole).toBeDefined();
    expect(governance.byRole.owner).toBeDefined();
    expect(governance.byRole.admin).toBeDefined();
    expect(governance.byRole.creator).toBeDefined();
    expect(governance.byRole.user).toBeDefined();
    
    expect(governance.byStatus).toBeDefined();
    expect(governance.byStatus.active).toBeDefined();
    expect(governance.byStatus.pending).toBeDefined();
    expect(governance.byStatus.suspended).toBeDefined();
  });

  it("should handle invalid bot ID in toggleBot", async () => {
    const result = await toggleBot("invalid-bot-id", true);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe("Bot not found");
  });

  it("should verify all channels are active", async () => {
    const channels = await getAllChannels();
    
    channels.forEach(channel => {
      expect(channel.status).toBe("active");
      expect(channel.enabled).toBe(true);
    });
  });

  it("should verify AI Assistant bot metadata", async () => {
    const bots = await getAllBots();
    const aiBot = bots.find(b => b.type === "ai_assistant");
    
    expect(aiBot).toBeDefined();
    expect(aiBot?.metadata).toBeDefined();
    expect(aiBot?.metadata?.roles).toEqual([
      "creator",
      "recruiter",
      "field_operator",
      "ambassador",
    ]);
  });
});
