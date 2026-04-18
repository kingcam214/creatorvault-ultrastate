import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
export const cryptoPayouts = router({
  getCryptoPayouts: protectedProcedure.query(async ({ ctx }) => ({ payouts: [], totalCrypto: "0", userId: ctx.user.id })),
  requestCryptoPayout: protectedProcedure.input(z.object({ amount: z.number(), currency: z.string(), walletAddress: z.string() })).mutation(async ({ ctx, input }) => ({ requestId: Date.now(), amount: input.amount, currency: input.currency, status: "pending", userId: ctx.user.id })),
  getSupportedCurrencies: protectedProcedure.query(async () => ({ currencies: ["BTC", "ETH", "USDC", "SOL"] })),
  getPayoutStatus: protectedProcedure.input(z.object({ requestId: z.number() })).query(async ({ input }) => ({ requestId: input.requestId, status: "pending", txHash: null })),
});
export const cryptoPayoutsRouter = cryptoPayouts;
