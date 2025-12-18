import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";
import Stripe from "stripe";

const DB_PATH = path.join(process.cwd(), "creatorvault.db");

export class StripeWebhookHandler {
  private db: Database.Database;
  private stripe: Stripe;

  constructor(stripeSecretKey: string) {
    this.db = new Database(DB_PATH);
    this.db.pragma("foreign_keys = ON");
    this.stripe = new Stripe(stripeSecretKey);
  }

  // Handle checkout.session.completed
  async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    try {
      // Extract metadata
      const orderId = session.metadata?.orderId;
      const productId = session.metadata?.productId;
      const buyerId = session.metadata?.buyerId;

      if (!orderId || !productId || !buyerId) {
        throw new Error("Missing required metadata in Stripe session");
      }

      // Get product details
      const product = this.db
        .prepare("SELECT * FROM marketplace_products WHERE id = ?")
        .get(productId) as any;

      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      // Calculate commission splits
      const grossAmount = session.amount_total || 0; // in cents
      const creatorAmount = Math.floor(grossAmount * 0.7); // 70%
      const recruiterAmount = product.recruiterId ? Math.floor(grossAmount * 0.2) : 0; // 20%
      const platformAmount = grossAmount - creatorAmount - recruiterAmount; // 10%

      // Update order status
      const updateStmt = this.db.prepare(`
        UPDATE marketplace_orders
        SET status = 'paid',
            stripeSessionId = ?,
            stripePaymentIntentId = ?,
            updatedAt = ?
        WHERE id = ?
      `);

      updateStmt.run(session.id, session.payment_intent, now, orderId);

      // Create payment record
      const paymentStmt = this.db.prepare(`
        INSERT INTO payments (userId, stripePaymentId, amount, currency, status, paymentType, metadata, createdAt)
        VALUES (?, ?, ?, ?, 'succeeded', 'marketplace_order', ?, ?)
      `);

      paymentStmt.run(
        parseInt(buyerId),
        session.payment_intent,
        grossAmount,
        session.currency || "usd",
        JSON.stringify({ orderId, productId }),
        now
      );

      // Log commission events
      const commissionStmt = this.db.prepare(`
        INSERT INTO commission_events (refType, refId, partyType, partyId, amount, currency, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      // Creator commission
      commissionStmt.run(
        "order",
        orderId,
        "creator",
        product.creatorId,
        creatorAmount,
        session.currency || "USD",
        now
      );

      // Recruiter commission (if exists)
      if (product.recruiterId) {
        commissionStmt.run(
          "order",
          orderId,
          "recruiter",
          product.recruiterId,
          recruiterAmount,
          session.currency || "USD",
          now
        );
      }

      // Platform commission
      commissionStmt.run(
        "order",
        orderId,
        "platform",
        null,
        platformAmount,
        session.currency || "USD",
        now
      );

      // Trigger fulfillment if instant
      if (product.fulfillmentType === "instant") {
        this.db
          .prepare("UPDATE marketplace_orders SET status = 'fulfilled' WHERE id = ?")
          .run(orderId);
      }

      // Log event
      const eventStmt = this.db.prepare(`
        INSERT INTO events (eventType, actor, action, featureId, inputsJson, dbWritesJson, moneyJson, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'success', ?)
      `);

      eventStmt.run(
        "stripe.webhook",
        `stripe_session_${session.id}`,
        "checkout_completed",
        orderId,
        JSON.stringify({ sessionId: session.id, productId, buyerId }),
        JSON.stringify({
          order_updated: orderId,
          payment_created: true,
          commissions_logged: product.recruiterId ? 3 : 2,
        }),
        JSON.stringify({
          gross: grossAmount,
          creator: creatorAmount,
          recruiter: recruiterAmount,
          platform: platformAmount,
          currency: session.currency,
        }),
        now
      );

      console.log(`✓ Processed checkout.session.completed: ${session.id}`);
    } catch (err: any) {
      console.error("Error processing checkout.session.completed:", err);

      // Log failure event
      const eventStmt = this.db.prepare(`
        INSERT INTO events (eventType, actor, action, featureId, inputsJson, status, createdAt)
        VALUES (?, ?, ?, ?, ?, 'failure', ?)
      `);

      eventStmt.run(
        "stripe.webhook",
        `stripe_session_${session.id}`,
        "checkout_completed",
        session.metadata?.orderId || null,
        JSON.stringify({ error: err.message }),
        now
      );

      throw err;
    }
  }

  // Handle payment_intent.succeeded
  async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    try {
      // Log event
      const eventStmt = this.db.prepare(`
        INSERT INTO events (eventType, actor, action, featureId, inputsJson, moneyJson, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, 'success', ?)
      `);

      eventStmt.run(
        "stripe.webhook",
        `stripe_pi_${paymentIntent.id}`,
        "payment_succeeded",
        null,
        JSON.stringify({ paymentIntentId: paymentIntent.id }),
        JSON.stringify({
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        }),
        now
      );

      console.log(`✓ Processed payment_intent.succeeded: ${paymentIntent.id}`);
    } catch (err: any) {
      console.error("Error processing payment_intent.succeeded:", err);
      throw err;
    }
  }

  // Main webhook handler
  async handleWebhook(event: Stripe.Event): Promise<{ success: boolean; message?: string }> {
    try {
      switch (event.type) {
        case "checkout.session.completed":
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          return { success: true, message: "Checkout completed" };

        case "payment_intent.succeeded":
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          return { success: true, message: "Payment succeeded" };

        default:
          console.log(`Unhandled event type: ${event.type}`);
          return { success: true, message: `Unhandled event: ${event.type}` };
      }
    } catch (err: any) {
      console.error("Webhook handler error:", err);
      return { success: false, message: err.message };
    }
  }

  close() {
    this.db.close();
  }
}
