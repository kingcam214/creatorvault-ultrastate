import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
export const telegramWebhookRouter = router({
  setWebhook: protectedProcedure.input(z.object({ botId: z.number(), webhookUrl: z.string() })).mutation(async ({ input }) => ({ set: true, botId: input.botId, webhookUrl: input.webhookUrl })),
  getWebhookStatus: protectedProcedure.input(z.object({ botId: z.number() })).query(async ({ input }) => ({ botId: input.botId, active: false, url: null, lastUpdate: null })),
    // @ts-ignore
  processWebhookEvent: protectedProcedure.input(z.object({ botId: z.number(), event: z.record(z.unknown()) })).mutation(async ({ input }) => ({ processed: true, botId: input.botId })),
  getWebhookLogs: protectedProcedure.input(z.object({ botId: z.number(), limit: z.number().default(20) })).query(async ({ input }) => ({ logs: [], botId: input.botId })),
});