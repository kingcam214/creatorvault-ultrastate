import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { stripe } from "../_core/stripe";
import { db } from "../db";
import { subscriptionTiers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const VAULTX_PUBLIC_OFFERS: Record<string, {
  name: string;
  description: string;
  amountCents: number;
  productRef: string;
}> = {
  "body-cinema": {
    name: "VaultX Body Cinema Revenue Kit",
    description: "Production VaultX offer for premium creator media packaging, buyer checkout, and revenue attribution.",
    amountCents: 9700,
    productRef: "vaultx:body-cinema",
  },
};

export const stripeCheckoutRouter = router({
  /**
   * Public real-money VaultX offer checkout.
   *
   * This is intentionally payment-only and unauthenticated so buyer traffic can
   * enter from public outreach links. Fulfillment/crediting is handled by the
   * existing Stripe webhook using explicit metadata; this procedure never
   * grants access or reports revenue without Stripe confirming payment.
   */
  createVaultXOfferCheckout: publicProcedure
    .input(z.object({
      offer: z.string().min(1),
      price: z.number().int().positive().optional(),
      ref: z.string().max(80).optional(),
    }))
    .mutation(async ({ input }) => {
      const offer = VAULTX_PUBLIC_OFFERS[input.offer];
      if (!offer) {
        throw new Error("VaultX offer not found");
      }

      if (input.price && input.price * 100 !== offer.amountCents) {
        throw new Error("VaultX offer price mismatch");
      }

      const appUrl = process.env.VITE_APP_URL || process.env.APP_URL || "https://creatorvault.live";
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: offer.name,
                description: offer.description,
              },
              unit_amount: offer.amountCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${appUrl}/vault-x?offer=${encodeURIComponent(input.offer)}&paid=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/vault-x?offer=${encodeURIComponent(input.offer)}&price=${offer.amountCents / 100}&ref=${encodeURIComponent(input.ref || "cancelled")}`,
        metadata: {
          type: "ai_agent_challenge_purchase",
          challengeRevenueEligible: "true",
          challengeId: "active",
          offerSlug: input.offer,
          productRef: offer.productRef,
          source: "vaultx_public_offer",
          ref: input.ref || "direct",
        },
      });

      if (!session.url) {
        throw new Error("Stripe did not return a checkout URL");
      }

      return {
        sessionId: session.id,
        url: session.url,
        amountCents: offer.amountCents,
        offer: input.offer,
      };
    }),
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
    // @ts-ignore
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
