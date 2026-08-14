import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  createSubscriptionTier,
  getCreatorTiers,
  getSubscriptionTierById,
  subscribeFanToTier,
  processSubscriptionPayment,
  getCreatorBalance,
} from "../services/subscriptionManagement";

const subscriptionCheckoutHeld = () => {
  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "Creator subscriptions are held until CreatorVault has a verified checkout-to-access path. No tier, access, or balance record was changed.",
  });
};

export const subscriptionsRouter = router({
  /**
   * Create subscription tier
   */
  createTier: protectedProcedure
    .input(
      z.object({
        creatorId: z.number(),
        name: z.string(),
        priceInCents: z.number(),
        description: z.string().optional(),
      })
    )
    .mutation(async () => {
      return subscriptionCheckoutHeld();
    }),

  /**
   * Get creator's tiers
   */
  getCreatorTiers: publicProcedure
    .input(z.object({ creatorId: z.number() }))
    .query(async ({ input }) => {
      return await getCreatorTiers(input.creatorId);
    }),

  /**
   * Get single tier by ID
   */
  getTier: publicProcedure
    .input(z.object({ tierId: z.number() }))
    .query(async ({ input }) => {
      return await getSubscriptionTierById(input.tierId);
    }),

  /**
   * Subscribe fan to tier
   */
  subscribe: protectedProcedure
    .input(
      z.object({
        fanId: z.number(),
        tierId: z.number(),
        stripeSubscriptionId: z.string().optional(),
      })
    )
    .mutation(async () => {
      return subscriptionCheckoutHeld();
    }),

  /**
   * Create subscription with manual payment
   */
  createSubscription: protectedProcedure
    .input(
      z.object({
        tierId: z.number(),
        fanId: z.number(),
        paymentMethod: z.string(),
        confirmationCode: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async () => {
      return subscriptionCheckoutHeld();
    }),

  /**
   * Process payment
   */
  processPayment: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.number(),
        amountInCents: z.number(),
        stripePaymentIntentId: z.string().optional(),
      })
    )
    .mutation(async () => {
      return subscriptionCheckoutHeld();
    }),

  /**
   * Get creator balance
   */
  getBalance: publicProcedure
    .input(z.object({ creatorId: z.number() }))
    .query(async ({ input }) => {
      return await getCreatorBalance(input.creatorId);
    }),
});
