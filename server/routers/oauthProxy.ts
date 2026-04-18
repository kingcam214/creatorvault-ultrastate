import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
export const oauthProxy = router({
  getConnectedAccounts: protectedProcedure.query(async ({ ctx }) => ({ accounts: [], userId: ctx.user.id })),
  initiateOAuth: protectedProcedure.input(z.object({ provider: z.string(), scopes: z.array(z.string()).optional() })).mutation(async ({ input }) => ({ authUrl: `https://oauth.example.com/${input.provider}`, state: Date.now().toString() })),
  disconnectAccount: protectedProcedure.input(z.object({ provider: z.string() })).mutation(async ({ ctx, input }) => ({ disconnected: true, provider: input.provider })),
  refreshToken: protectedProcedure.input(z.object({ provider: z.string() })).mutation(async ({ input }) => ({ refreshed: true, provider: input.provider })),
});
export const oauthProxyRouter = oauthProxy;
