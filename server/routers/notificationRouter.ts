import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
export const notificationRouter = router({
  getNotifications: protectedProcedure.query(async ({ ctx }) => ({ notifications: [], unread: 0, userId: ctx.user.id })),
  markAsRead: protectedProcedure.input(z.object({ notificationId: z.number() })).mutation(async ({ input }) => ({ read: true, notificationId: input.notificationId })),
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => ({ success: true, userId: ctx.user.id })),
  updatePreferences: protectedProcedure.input(z.object({ email: z.boolean(), push: z.boolean(), sms: z.boolean() })).mutation(async ({ ctx, input }) => ({ updated: true, preferences: input, userId: ctx.user.id })),
  getPreferences: protectedProcedure.query(async ({ ctx }) => ({ email: true, push: true, sms: false, userId: ctx.user.id })),
});