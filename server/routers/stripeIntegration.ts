import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import Stripe from "stripe";
import * as db from "../db";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });

export const stripeIntegration = router({
  createPaymentIntent: protectedProcedure.input(z.object({
    amount: z.number().positive(), currency: z.string().default("usd"), description: z.string(),
  })).mutation(async ({ ctx, input }) => {
    const intent = await stripe.paymentIntents.create({
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
    const session = await stripe.checkout.sessions.create({
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
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { userId: ctx.user.id.toString() },
    });
    return { accountId: account.id };
  }),
});

export const stripeIntegrationRouter = stripeIntegration;
