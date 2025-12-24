import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  createSubscriptionTier,
  getCreatorTiers,
  subscribeFanToTier,
  processSubscriptionPayment,
  getCreatorBalance,
} from "../services/subscriptionManagement";

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
    .mutation(async ({ input }) => {
      return await createSubscriptionTier(input);
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
      const tiers = await getCreatorTiers(0);
      const tier = tiers.find((t: any) => t.id === input.tierId);
      return tier || null;
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
    .mutation(async ({ input }) => {
      return await subscribeFanToTier(input);
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
    .mutation(async ({ input }) => {
      const subscription = await subscribeFanToTier({
        fanId: input.fanId,
        tierId: input.tierId,
      });

      return {
        success: true,
        subscriptionId: subscription.id,
        status: "pending_verification",
      };
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
    .mutation(async ({ input }) => {
      return await processSubscriptionPayment(
        input.subscriptionId,
        input.amountInCents,
        input.stripePaymentIntentId
      );
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
