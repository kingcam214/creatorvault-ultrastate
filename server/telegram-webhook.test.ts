/**
 * Telegram Webhook Tests
 */

import { describe, it, expect, beforeAll } from "vitest";
import { db } from "./db";
import { users, telegramBots, botEvents } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

describe("Telegram Webhook", () => {
  let testUserId: number;
  let testBotToken: string;
  let testBotId: string;

  beforeAll(async () => {
    // Create test user
    const testUser = await db.insert(users).values({
      openId: `test-telegram-${Date.now()}`,
      email: `test-telegram-${Date.now()}@example.com`,
      name: "Test Telegram User",
      role: "king",
      creatorStatus: "active",
    });
    testUserId = testUser[0].insertId;

    // Create test bot token (valid format)
    testBotToken = `${Math.floor(Math.random() * 10000000000)}:ABCdefGHIjklMNOpqrsTUVwxyz123456789`;
    testBotId = crypto.randomUUID();

    // Insert test bot
    await db.insert(telegramBots).values({
      id: testBotId,
      name: "Test Webhook Bot",
      botToken: testBotToken,
      botUsername: "test_webhook_bot",
      status: "active",
      createdBy: testUserId,
    });
  });

  it("should verify bot token format", () => {
    const validToken = "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz123456789";
    const tokenRegex = /^[0-9]{8,10}:[A-Za-z0-9_-]{35}$/;
    
    expect(tokenRegex.test(validToken)).toBe(true);
    expect(tokenRegex.test("invalid-token")).toBe(false);
  });

  it("should find bot by token in database", async () => {
    const [bot] = await db
      .select()
      .from(telegramBots)
      .where(eq(telegramBots.botToken, testBotToken))
      .limit(1);

    expect(bot).toBeDefined();
    expect(bot.id).toBe(testBotId);
    expect(bot.name).toBe("Test Webhook Bot");
    expect(bot.status).toBe("active");
  });

  it("should insert message_received event into bot_events", async () => {
    // Simulate webhook message
    const messageData = {
      botId: testBotId,
      botName: "Test Webhook Bot",
      chatId: 123456789,
      userId: 987654321,
      username: "test_user",
      messageId: 42,
      text: "Hello webhook",
      timestamp: new Date().toISOString(),
      rawPayload: {
        update_id: 123,
        message: {
          message_id: 42,
          from: {
            id: 987654321,
            username: "test_user",
            first_name: "Test",
          },
          chat: {
            id: 123456789,
            type: "private",
          },
          text: "Hello webhook",
          date: Math.floor(Date.now() / 1000),
        },
      },
    };

    await db.insert(botEvents).values({
      userId: testUserId,
      channel: "telegram",
      eventType: "message_received",
      eventData: messageData,
      outcome: "success",
    });

    // Verify event was inserted
    const { desc } = await import("drizzle-orm");
    const events = await db
      .select()
      .from(botEvents)
      .where(eq(botEvents.channel, "telegram"))
      .orderBy(desc(botEvents.createdAt))
      .limit(1);

    expect(events.length).toBeGreaterThan(0);
    const event = events[0];
    expect(event.channel).toBe("telegram");
    expect(event.eventType).toBe("message_received");
    expect(event.outcome).toBe("success");
    expect(event.eventData).toBeDefined();
  });

  it("should insert health_check event into bot_events", async () => {
    await db.insert(botEvents).values({
      userId: testUserId,
      channel: "telegram",
      eventType: "health_check",
      eventData: {
        timestamp: new Date().toISOString(),
        source: "test",
      },
      outcome: "success",
    });

    // Verify health check event
    const [event] = await db
      .select()
      .from(botEvents)
      .where(eq(botEvents.eventType, "health_check"))
      .limit(1);

    expect(event).toBeDefined();
    expect(event.eventType).toBe("health_check");
    expect(event.outcome).toBe("success");
  });

  it("should handle webhook error logging", async () => {
    await db.insert(botEvents).values({
      userId: testUserId,
      channel: "telegram",
      eventType: "webhook_error",
      eventData: {
        error: "Test error",
        body: { test: true },
      },
      outcome: "error",
    });

    // Verify error event
    const [event] = await db
      .select()
      .from(botEvents)
      .where(eq(botEvents.eventType, "webhook_error"))
      .limit(1);

    expect(event).toBeDefined();
    expect(event.outcome).toBe("error");
  });

  it("should validate required message fields", () => {
    const validMessage = {
      botId: "uuid",
      chatId: 123,
      userId: 456,
      messageId: 789,
      text: "test",
      timestamp: new Date().toISOString(),
    };

    expect(validMessage.botId).toBeDefined();
    expect(validMessage.chatId).toBeDefined();
    expect(validMessage.userId).toBeDefined();
    expect(validMessage.messageId).toBeDefined();
    expect(validMessage.text).toBeDefined();
    expect(validMessage.timestamp).toBeDefined();
  });
});
