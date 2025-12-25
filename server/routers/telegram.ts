/**
 * Telegram Bot Integration
 * 
 * Webhook handler for Telegram bot commands:
 * /start - Welcome message with onboarding link
 * /balance - Show creator earnings (pending + confirmed)
 * /golive - Quick link to start streaming
 * /payout - Request payout of confirmed balance
 */

import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getCreatorBalance } from "../db-vaultlive";
import { ENV } from "../_core/env";

const TELEGRAM_BOT_TOKEN = ENV.telegramBotToken;
const FRONTEND_URL = process.env.VITE_FRONTEND_FORGE_API_URL?.replace('/api', '') || 'http://localhost:3000';

// Telegram webhook payload schema
const TelegramWebhookSchema = z.object({
  update_id: z.number(),
  message: z.object({
    message_id: z.number(),
    from: z.object({
      id: z.number(),
      first_name: z.string(),
      username: z.string().optional(),
    }),
    chat: z.object({
      id: z.number(),
      type: z.string(),
    }),
    text: z.string().optional(),
  }).optional(),
});

async function sendTelegramMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });

  if (!response.ok) {
    console.error('Failed to send Telegram message:', await response.text());
  }
  
  return response.json();
}

export const telegramRouter = router({
  // Webhook endpoint for Telegram
  webhook: publicProcedure
    .input(TelegramWebhookSchema)
    .mutation(async ({ input }) => {
      const message = input.message;
      if (!message || !message.text) {
        return { ok: true };
      }

      const chatId = message.chat.id;
      const text = message.text;
      const username = message.from.username || message.from.first_name;

      // Handle commands
      if (text === '/start') {
        await sendTelegramMessage(
          chatId,
          `🎉 *Welcome to CreatorVault ULTRASTATE!*\n\n` +
          `The platform where creators keep *85%* of their earnings.\n\n` +
          `🚀 *Get Started:*\n` +
          `${FRONTEND_URL}/start\n\n` +
          `💰 *Available Commands:*\n` +
          `/balance - Check your earnings\n` +
          `/golive - Start streaming\n` +
          `/payout - Request withdrawal`
        );
      }
      
      else if (text === '/balance') {
        // TODO: Link Telegram user to platform user
        await sendTelegramMessage(
          chatId,
          `💰 *Your Balance*\n\n` +
          `To check your balance, please log in at:\n` +
          `${FRONTEND_URL}/vaultlive\n\n` +
          `_Tip: Link your Telegram account in settings to see balance here._`
        );
      }
      
      else if (text === '/golive') {
        await sendTelegramMessage(
          chatId,
          `🔴 *Go Live Now*\n\n` +
          `Start streaming and earning:\n` +
          `${FRONTEND_URL}/vaultlive\n\n` +
          `Remember: You keep *85%* of all tips!`
        );
      }
      
      else if (text === '/payout') {
        await sendTelegramMessage(
          chatId,
          `💸 *Request Payout*\n\n` +
          `To request a payout:\n` +
          `1. Go to ${FRONTEND_URL}/vaultlive\n` +
          `2. Click "Request Payout" button\n` +
          `3. Cameron will process within 24 hours\n\n` +
          `_Payouts sent to your Cash App or PayPal._`
        );
      }
      
      else {
        await sendTelegramMessage(
          chatId,
          `❓ *Unknown Command*\n\n` +
          `Available commands:\n` +
          `/start - Get started\n` +
          `/balance - Check earnings\n` +
          `/golive - Start streaming\n` +
          `/payout - Request withdrawal`
        );
      }

      return { ok: true };
    }),

  // Set webhook URL (call this once to configure Telegram)
  setWebhook: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      const webhookUrl = `${input.url}/api/trpc/telegram.webhook`;
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });

      const result = await response.json();
      return result;
    }),

  // Get webhook info (for debugging)
  getWebhookInfo: protectedProcedure
    .query(async () => {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`;
      const response = await fetch(url);
      return response.json();
    }),
});
