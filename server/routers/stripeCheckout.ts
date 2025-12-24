import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { stripe } from "../_core/stripe";
import { db } from "../db";
import { subscriptionTiers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const stripeCheckoutRouter = router({
  /**
   * Create Stripe Checkout Session for subscription
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        tierId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get tier details
      const [tier] = await db.select().from(subscriptionTiers).where(eq(subscriptionTiers.id, input.tierId));

      if (!tier) {
        throw new Error("Tier not found");
      }

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: tier.name,
                description: tier.description || "Subscription tier",
              },
              unit_amount: tier.priceInCents,
              recurring: {
                interval: tier.billingInterval === "yearly" ? "year" : "month",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${process.env.VITE_APP_URL || "http://localhost:3000"}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.VITE_APP_URL || "http://localhost:3000"}/subscribe/${tier.id}`,
        metadata: {
          tierId: tier.id.toString(),
          creatorId: tier.creatorId.toString(),
          fanId: ctx.user.id.toString(),
        },
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    }),
});
