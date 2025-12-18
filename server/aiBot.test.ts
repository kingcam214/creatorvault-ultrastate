/**
 * AI Bot Tests
 * 
 * Tests for role-aware AI bot functionality
 */

import { describe, it, expect, beforeAll } from "vitest";
import { db } from "./db";
import { users, botEvents } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  generateBotResponse,
  generateOnboardingPlan,
  generateScript,
  getBotHistory,
  getUserContext,
  logBotEvent,
} from "./services/aiBot";

describe("AI Bot Service", () => {
  let testUserId: number;

  beforeAll(async () => {
    // Create test user
    const openId = `test-aibot-${Date.now()}`;
    await db
      .insert(users)
      .values({
        openId,
        name: "Test AI User",
        email: `test-aibot-${Date.now()}@example.com`,
        role: "creator",
        language: "en",
        country: "US",
      });

    // Get the created user
    const result = await db
      .select()
      .from(users)
      .where(eq(users.openId, openId))
      .limit(1);

    testUserId = result[0].id;
  });

  describe("generateBotResponse", () => {
    it("should generate AI response for creator role", async () => {
      const context = {
        userId: testUserId,
        role: "creator" as const,
        language: "en",
      };

      const response = await generateBotResponse(
        context,
        "How do I get started with content monetization?"
      );

      expect(response).toBeDefined();
      expect(response.message).toBeTruthy();
      expect(typeof response.message).toBe("string");
      expect(response.message.length).toBeGreaterThan(0);
    }, 30000); // 30s timeout for LLM

    it("should generate AI response for field_operator role", async () => {
      const context = {
        userId: testUserId,
        role: "field_operator" as const,
        language: "en",
        location: "DR",
      };

      const response = await generateBotResponse(
        context,
        "What are the best locations in Dominican Republic for recruitment?"
      );

      expect(response).toBeDefined();
      expect(response.message).toBeTruthy();
      expect(typeof response.message).toBe("string");
    }, 30000);

    it("should log bot interaction to database", async () => {
      const context = {
        userId: testUserId,
        role: "creator" as const,
        language: "en",
      };

      await generateBotResponse(context, "Test message for logging");

      // Check if event was logged
      const history = await getBotHistory(testUserId, 10);
      expect(history.length).toBeGreaterThan(0);
      
      const lastEvent = history[history.length - 1];
      expect(lastEvent.userId).toBe(testUserId);
      expect(lastEvent.eventType).toBe("ai_chat");
      expect(lastEvent.channel).toBe("web");
    }, 30000);
  });

  describe("generateOnboardingPlan", () => {
    it("should generate Day 1 onboarding plan", async () => {
      const context = {
        userId: testUserId,
        role: "creator" as const,
        language: "en",
      };

      const plan = await generateOnboardingPlan(context, 1);

      expect(plan).toBeDefined();
      expect(plan.plan).toBeTruthy();
      expect(plan.tasks).toBeDefined();
      expect(Array.isArray(plan.tasks)).toBe(true);
      expect(plan.tasks.length).toBeGreaterThan(0);
      
      // Check task structure
      const firstTask = plan.tasks[0];
      expect(firstTask.title).toBeTruthy();
      expect(firstTask.description).toBeTruthy();
      expect(firstTask.priority).toMatch(/^(high|medium|low)$/);
    }, 30000);

    it("should generate Day 7 onboarding plan", async () => {
      const context = {
        userId: testUserId,
        role: "recruiter" as const,
        language: "en",
      };

      const plan = await generateOnboardingPlan(context, 7);

      expect(plan).toBeDefined();
      expect(plan.plan).toBeTruthy();
      expect(plan.tasks).toBeDefined();
      expect(plan.tasks.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe("generateScript", () => {
    it("should generate recruitment script", async () => {
      const context = {
        userId: testUserId,
        role: "recruiter" as const,
        language: "en",
      };

      const script = await generateScript(context, "recruitment");

      expect(script).toBeDefined();
      expect(script.script).toBeTruthy();
      expect(script.variations).toBeDefined();
      expect(Array.isArray(script.variations)).toBe(true);
      expect(script.variations.length).toBeGreaterThan(0);
      expect(script.tips).toBeDefined();
      expect(Array.isArray(script.tips)).toBe(true);
    }, 30000);

    it("should generate sales script with customization", async () => {
      const context = {
        userId: testUserId,
        role: "creator" as const,
        language: "en",
      };

      const script = await generateScript(context, "sales", {
        targetAudience: "content creators",
        platform: "Instagram",
        goal: "sell digital products",
      });

      expect(script).toBeDefined();
      expect(script.script).toBeTruthy();
      expect(script.variations.length).toBeGreaterThan(0);
      expect(script.tips.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe("logBotEvent", () => {
    it("should log bot event to database", async () => {
      await logBotEvent({
        userId: testUserId,
        channel: "telegram",
        eventType: "test_event",
        eventData: {
          test: "data",
          timestamp: Date.now(),
        },
        outcome: "success",
      });

      const history = await getBotHistory(testUserId, 10);
      const testEvent = history.find((e) => e.eventType === "test_event");

      expect(testEvent).toBeDefined();
      expect(testEvent?.userId).toBe(testUserId);
      expect(testEvent?.channel).toBe("telegram");
      expect(testEvent?.outcome).toBe("success");
    });
  });

  describe("getBotHistory", () => {
    it("should retrieve bot interaction history", async () => {
      // Log multiple events
      await logBotEvent({
        userId: testUserId,
        channel: "web",
        eventType: "history_test_1",
        eventData: {},
      });

      await logBotEvent({
        userId: testUserId,
        channel: "whatsapp",
        eventType: "history_test_2",
        eventData: {},
      });

      const history = await getBotHistory(testUserId, 10);

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      
      // Check that events are for the correct user
      history.forEach((event) => {
        expect(event.userId).toBe(testUserId);
      });
    });

    it("should respect limit parameter", async () => {
      const history = await getBotHistory(testUserId, 2);

      expect(history.length).toBeLessThanOrEqual(2);
    });
  });

  describe("getUserContext", () => {
    it("should retrieve user context", async () => {
      const context = await getUserContext(testUserId);

      expect(context).toBeDefined();
      expect(context?.userId).toBe(testUserId);
      expect(context?.role).toBeDefined();
      expect(context?.language).toBe("en");
      expect(context?.location).toBe("US");
    });

    it("should return null for non-existent user", async () => {
      const context = await getUserContext(999999);

      expect(context).toBeNull();
    });
  });
});
