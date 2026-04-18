import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc, or, and } from "drizzle-orm";
export const messageRouter = router({
  getConversations: protectedProcedure.query(async ({ ctx }) => ({ conversations: [], userId: ctx.user.id })),
  sendMessage: protectedProcedure.input(z.object({ recipientId: z.number(), content: z.string(), type: z.string().default("text") })).mutation(async ({ ctx, input }) => ({ id: Date.now(), senderId: ctx.user.id, recipientId: input.recipientId, content: input.content, sentAt: new Date().toISOString() })),
  getMessages: protectedProcedure.input(z.object({ conversationId: z.number(), limit: z.number().default(50) })).query(async ({ input }) => ({ messages: [], conversationId: input.conversationId })),
  markAsRead: protectedProcedure.input(z.object({ messageId: z.number() })).mutation(async ({ input }) => ({ read: true, messageId: input.messageId })),
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => ({ count: 0, userId: ctx.user.id })),
});