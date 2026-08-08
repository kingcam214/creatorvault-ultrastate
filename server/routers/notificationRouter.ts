import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { listSocialNotifications, markSocialNotificationRead, socialSpineInternals } from "../services/socialSpineService";

/** Legacy-compatible notification API backed by canonical durable social events. */
export const notificationRouter = router({
  getNotifications: protectedProcedure.query(async ({ ctx }) => {
    const notifications = await listSocialNotifications(ctx.user.id, 100);
    return { notifications, unread: notifications.filter((notification: any) => !notification.is_read).length, userId: ctx.user.id };
  }),
  markAsRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await markSocialNotificationRead(ctx.user.id, input.notificationId);
    return { read: true, notificationId: input.notificationId };
  }),
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await socialSpineInternals.rawExec("UPDATE social_notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", [ctx.user.id]);
    return { success: true, userId: ctx.user.id };
  }),
  // Delivery preferences stay explicitly unconfigured until a real provider is connected.
  updatePreferences: protectedProcedure.input(z.object({ email: z.boolean(), push: z.boolean(), sms: z.boolean() })).mutation(async ({ ctx, input }) => ({
    updated: false,
    preferences: input,
    userId: ctx.user.id,
    message: "Notification delivery preferences are not yet a configured delivery channel.",
  })),
  getPreferences: protectedProcedure.query(async ({ ctx }) => ({ email: false, push: false, sms: false, userId: ctx.user.id, configured: false })),
});
