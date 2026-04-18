import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const loyaltyRouter = router({
  getPoints: protectedProcedure.query(async ({ ctx }) => {
    return { points: 0, tier: "bronze", nextTier: "silver", pointsToNext: 500, userId: ctx.user.id };
  }),
  addPoints: protectedProcedure.input(z.object({ amount: z.number(), reason: z.string() })).mutation(async ({ ctx, input }) => {
    return { added: input.amount, reason: input.reason, userId: ctx.user.id };
  }),
  getRewards: protectedProcedure.query(async () => {
    return { rewards: [
      { id: 1, name: "Free Month Premium", cost: 5000, available: true },
      { id: 2, name: "1-on-1 Strategy Call", cost: 10000, available: true },
      { id: 3, name: "Custom AI Clone", cost: 25000, available: true },
    ]};
  }),
  redeemReward: protectedProcedure.input(z.object({ rewardId: z.number() })).mutation(async ({ ctx, input }) => {
    return { success: true, rewardId: input.rewardId, userId: ctx.user.id };
  }),
});
