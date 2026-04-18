import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
export const socialLinkRouter = router({
  getSocialLinks: protectedProcedure.query(async ({ ctx }) => ({ links: [], userId: ctx.user.id })),
  addSocialLink: protectedProcedure.input(z.object({ platform: z.string(), url: z.string(), username: z.string().optional() })).mutation(async ({ ctx, input }) => ({ id: Date.now(), ...input, userId: ctx.user.id })),
  removeSocialLink: protectedProcedure.input(z.object({ linkId: z.number() })).mutation(async ({ input }) => ({ removed: true, linkId: input.linkId })),
  updateSocialLink: protectedProcedure.input(z.object({ linkId: z.number(), url: z.string() })).mutation(async ({ input }) => ({ updated: true, linkId: input.linkId })),
  getSupportedPlatforms: protectedProcedure.query(async () => ({ platforms: ["instagram", "tiktok", "youtube", "twitter", "facebook", "linkedin", "snapchat", "pinterest", "twitch", "onlyfans", "patreon"] })),
});