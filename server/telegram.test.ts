import { describe, it, expect } from "vitest";
import { ENV } from "./_core/env";

describe("Telegram Bot Token Validation", () => {
  it("should validate Telegram bot token by calling getMe API", async () => {
    const token = ENV.telegramBotToken;
    expect(token).toBeDefined();
    expect(token).toMatch(/^\d+:[A-Za-z0-9_-]+$/);

    // Call Telegram getMe API to validate token
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getMe`
    );
    
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.result).toBeDefined();
    expect(data.result.is_bot).toBe(true);
    
    console.log(`✅ Telegram bot connected: @${data.result.username}`);
  });
});
