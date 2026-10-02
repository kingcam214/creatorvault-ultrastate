import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getStripe } from "../services/stripeVaultLive";
import { createCreatorConnectOnboarding } from "../services/stripeConnectAccounts";
import * as db from "../db";
import { eq } from "drizzle-orm";

export const stripeIntegration = router({
  createPaymentIntent: protectedProcedure.input(z.object({
    amount: z.number().positive(), currency: z.string().default("usd"), description: z.string(),
  })).mutation(async ({ ctx, input }) => {
    const intent = await getStripe().paymentIntents.create({
      amount: Math.round(input.amount * 100),
      currency: input.currency,
      description: input.description,
      metadata: { userId: ctx.user.id.toString() },
    });
    return { clientSecret: intent.client_secret, intentId: intent.id };
  }),
  createCheckoutSession: protectedProcedure.input(z.object({
    priceId: z.string(), successUrl: z.string(), cancelUrl: z.string(),
  })).mutation(async ({ ctx, input }) => {
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: input.priceId, quantity: 1 }],
      mode: "payment",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: { userId: ctx.user.id.toString() },
    });
    return { sessionId: session.id, url: session.url };
  }),
  getPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
    const payments = await db.db.select().from(db.schema.payments).where(eq(db.schema.payments.userId, ctx.user.id)).limit(50);
    return payments;
  }),
  createConnectedAccount: protectedProcedure.mutation(async ({ ctx }) => {
    return createCreatorConnectOnboarding(getStripe(), ctx.user.id, process.env.APP_URL || process.env.VITE_APP_URL || "https://creatorvault.live");
  }),
});

export const stripeIntegrationRouter = stripeIntegration;
