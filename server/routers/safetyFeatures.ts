import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
export const safetyFeatures = router({
  getSafetySettings: protectedProcedure.query(async ({ ctx }) => ({ twoFactor: false, loginAlerts: true, trustedDevices: [], userId: ctx.user.id })),
  enable2FA: protectedProcedure.mutation(async ({ ctx }) => ({ enabled: true, backupCodes: [], userId: ctx.user.id })),
  blockUser: protectedProcedure.input(z.object({ targetUserId: z.number(), reason: z.string().optional() })).mutation(async ({ ctx, input }) => ({ blocked: true, targetUserId: input.targetUserId, userId: ctx.user.id })),
  reportContent: protectedProcedure.input(z.object({ contentId: z.number(), reason: z.string() })).mutation(async ({ input }) => ({ reported: true, contentId: input.contentId, caseId: Date.now() })),
  getBlockedUsers: protectedProcedure.query(async ({ ctx }) => ({ blocked: [], userId: ctx.user.id })),
});