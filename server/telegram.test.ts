import { describe, it, expect } from "vitest";
import { ENV } from "./_core/env";
import { callTelegramApiWithGuard } from "./services/telegramOutboundGuard";

describe("Telegram Bot Token Validation", () => {
  it("should validate Telegram bot token by calling getMe API", async () => {
    const token = ENV.telegramBotToken;
    expect(token).toBeDefined();
    expect(token).toMatch(/^\d+:[A-Za-z0-9_-]+$/);

    // Call Telegram getMe API through the shared read-only guard to validate token.
    const data = await callTelegramApiWithGuard({
      botToken: token,
      method: "getMe",
      context: "telegram.test.getMe",
      allowReadOnly: true,
    });
    expect(data.ok).toBe(true);
    expect(data.result).toBeDefined();
    expect(data.result.is_bot).toBe(true);
    
    console.log(`✅ Telegram bot connected: @${data.result.username}`);
  });
});
