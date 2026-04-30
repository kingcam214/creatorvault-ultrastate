/**
 * messageRouter — Production DM + PPV System
 * Real DB queries, real Stripe payment intents, real Socket.IO broadcast
 * Platform fee: 15% (creator keeps 85%)
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "../db";
import { users, creatorBalances, transactions, subscriptions } from "../../drizzle/schema";
import { eq, and, desc, or, sql, lt, gt } from "drizzle-orm";
import { stripe } from "../_core/stripe";
import { getIO } from "../_core/socketio";

// Raw DB access for new tables not yet in Drizzle schema exports
async function rawQuery(query: string, params: any[] = []) {
  return (db as any).execute(sql.raw(query), params);
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

async function getOrCreateConversation(creatorId: number, fanId: number) {
  const [existing] = await (db as any).execute(
    sql`SELECT id, creator_id, fan_id, last_message_at, creator_unread_count, fan_unread_count FROM conversations WHERE creator_id = ${creatorId} AND fan_id = ${fanId} LIMIT 1`
  );
  if (existing && existing.length > 0) return existing[0];
  await (db as any).execute(
    sql`INSERT INTO conversations (creator_id, fan_id, last_message_at, creator_unread_count, fan_unread_count) VALUES (${creatorId}, ${fanId}, NOW(), 0, 0)`
  );
  const [created] = await (db as any).execute(
    sql`SELECT id, creator_id, fan_id FROM conversations WHERE creator_id = ${creatorId} AND fan_id = ${fanId} LIMIT 1`
  );
  return created[0];
}

async function isSubscribed(fanId: number, creatorId: number): Promise<boolean> {
  const [sub] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.fanId, fanId),
        eq(subscriptions.creatorId, creatorId),
        eq(subscriptions.status, "active")
      )
    )
    .limit(1);
  return !!sub;
}

async function creditCreator(creatorId: number, amountCents: number) {
  const creatorShare = Math.floor(amountCents * 0.85); // 85% to creator
  const platformShare = amountCents - creatorShare;     // 15% platform fee

  const [existing] = await db
    .select()
    .from(creatorBalances)
    .where(eq(creatorBalances.creatorId, creatorId))
    .limit(1);

  if (existing) {
    await db
      .update(creatorBalances)
      .set({
        availableBalanceInCents: existing.availableBalanceInCents + creatorShare,
        lifetimeEarningsInCents: existing.lifetimeEarningsInCents + creatorShare,
        updatedAt: new Date(),
      })
      .where(eq(creatorBalances.creatorId, creatorId));
  } else {
    await db.insert(creatorBalances).values({
      creatorId,
      availableBalanceInCents: creatorShare,
      pendingBalanceInCents: 0,
      lifetimeEarningsInCents: creatorShare,
    });
  }
  return { creatorShare, platformShare };
}

async function emitToUser(userId: number, event: string, data: any) {
  try {
    const io = getIO();
    if (io) io.to(`user:${userId}`).emit(event, data);
  } catch (_) {}
}

// ─── ROUTER ─────────────────────────────────────────────────────────────────

export const messageRouter = router({

  // ── Get all conversations for the current user ───────────────────────────
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const [rows] = await (db as any).execute(sql`
      SELECT 
        c.id,
        c.creator_id,
        c.fan_id,
        c.last_message_at,
        c.creator_unread_count,
        c.fan_unread_count,
        c.is_archived,
        creator.name AS creator_name,
        fan.name AS fan_name,
        (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_body,
        (SELECT is_ppv FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_is_ppv
      FROM conversations c
      JOIN users creator ON creator.id = c.creator_id
      JOIN users fan ON fan.id = c.fan_id
      WHERE c.creator_id = ${userId} OR c.fan_id = ${userId}
      ORDER BY c.last_message_at DESC
      LIMIT 100
    `);
    return rows.map((r: any) => ({
      id: r.id,
      creatorId: r.creator_id,
      fanId: r.fan_id,
      lastMessageAt: r.last_message_at,
      unreadCount: userId === r.creator_id ? r.creator_unread_count : r.fan_unread_count,
      isArchived: !!r.is_archived,
      otherUser: {
        id: userId === r.creator_id ? r.fan_id : r.creator_id,
        name: userId === r.creator_id ? r.fan_name : r.creator_name,
      },
      lastMessage: r.last_message_body
        ? { body: r.last_message_is_ppv ? "🔒 PPV Message" : r.last_message_body }
        : null,
    }));
  }),

  // ── Get messages in a conversation ───────────────────────────────────────
  getMessages: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      cursor: z.number().optional(), // last message id for pagination
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify user is part of this conversation
      const [conv] = await (db as any).execute(sql`
        SELECT id, creator_id, fan_id FROM conversations WHERE id = ${input.conversationId} LIMIT 1
      `);
      const conversation = conv?.[0];
      if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      if (conversation.creator_id !== userId && conversation.fan_id !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your conversation" });
      }

      const cursorClause = input.cursor ? sql`AND m.id < ${input.cursor}` : sql``;

      const [rows] = await (db as any).execute(sql`
        SELECT 
          m.id,
          m.conversation_id,
          m.sender_id,
          m.body,
          m.media_url,
          m.media_type,
          m.media_thumbnail_url,
          m.is_ppv,
          m.ppv_price_cents,
          m.ppv_unlock_count,
          m.is_read_by_recipient,
          m.created_at,
          u.name AS sender_name,
          (SELECT COUNT(*) FROM message_unlocks mu WHERE mu.message_id = m.id AND mu.fan_id = ${userId}) AS is_unlocked_by_me
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.conversation_id = ${input.conversationId} ${cursorClause}
        ORDER BY m.created_at DESC
        LIMIT ${input.limit}
      `);

      // Mark messages as read
      if (rows.length > 0) {
        await (db as any).execute(sql`
          UPDATE messages SET is_read_by_recipient = 1, read_at = NOW()
          WHERE conversation_id = ${input.conversationId}
            AND sender_id != ${userId}
            AND is_read_by_recipient = 0
        `);
        // Reset unread count
        if (conversation.creator_id === userId) {
          await (db as any).execute(sql`UPDATE conversations SET creator_unread_count = 0 WHERE id = ${input.conversationId}`);
        } else {
          await (db as any).execute(sql`UPDATE conversations SET fan_unread_count = 0 WHERE id = ${input.conversationId}`);
        }
      }

      return rows.reverse().map((m: any) => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        body: m.is_ppv && !m.is_unlocked_by_me && m.sender_id !== userId ? null : m.body,
        mediaUrl: m.is_ppv && !m.is_unlocked_by_me && m.sender_id !== userId ? null : m.media_url,
        mediaThumbnailUrl: m.media_thumbnail_url, // thumbnail always visible for PPV preview
        mediaType: m.media_type,
        isPpv: !!m.is_ppv,
        ppvPriceCents: m.ppv_price_cents,
        ppvUnlockCount: m.ppv_unlock_count,
        isUnlockedByMe: !!m.is_unlocked_by_me || m.sender_id === userId,
        isReadByRecipient: !!m.is_read_by_recipient,
        createdAt: m.created_at,
      }));
    }),

  // ── Send a message (text or PPV) ─────────────────────────────────────────
  sendMessage: protectedProcedure
    .input(z.object({
      recipientId: z.number(),
      body: z.string().max(5000).optional(),
      mediaUrl: z.string().url().optional(),
      mediaType: z.enum(["image", "video", "audio"]).optional(),
      mediaThumbnailUrl: z.string().url().optional(),
      isPpv: z.boolean().default(false),
      ppvPriceCents: z.number().min(0).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const senderId = ctx.user.id;
      if (senderId === input.recipientId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot message yourself" });
      }
      if (!input.body && !input.mediaUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Message must have body or media" });
      }
      if (input.isPpv && input.ppvPriceCents < 100) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "PPV price must be at least $1.00" });
      }

      // Determine creator/fan orientation
      const [senderRow] = await db.select({ role: users.role }).from(users).where(eq(users.id, senderId)).limit(1);
      const isCreatorSending = senderRow?.role === "creator" || senderRow?.role === "king" || senderRow?.role === "admin";
      const creatorId = isCreatorSending ? senderId : input.recipientId;
      const fanId = isCreatorSending ? input.recipientId : senderId;

      const conversation = await getOrCreateConversation(creatorId, fanId);

      // Insert message
      const [result] = await (db as any).execute(sql`
        INSERT INTO messages (conversation_id, sender_id, body, media_url, media_type, media_thumbnail_url, is_ppv, ppv_price_cents)
        VALUES (${conversation.id}, ${senderId}, ${input.body ?? null}, ${input.mediaUrl ?? null}, ${input.mediaType ?? null}, ${input.mediaThumbnailUrl ?? null}, ${input.isPpv ? 1 : 0}, ${input.ppvPriceCents})
      `);
      const messageId = result.insertId;

      // Update conversation last_message_at and unread count
      const unreadField = isCreatorSending ? "fan_unread_count" : "creator_unread_count";
      await (db as any).execute(sql`
        UPDATE conversations SET last_message_at = NOW(), ${sql.raw(unreadField)} = ${sql.raw(unreadField)} + 1
        WHERE id = ${conversation.id}
      `);

      const newMessage = {
        id: messageId,
        conversationId: conversation.id,
        senderId,
        body: input.isPpv ? null : (input.body ?? null),
        mediaUrl: input.isPpv ? null : (input.mediaUrl ?? null),
        mediaThumbnailUrl: input.mediaThumbnailUrl ?? null,
        mediaType: input.mediaType ?? null,
        isPpv: input.isPpv,
        ppvPriceCents: input.ppvPriceCents,
        isUnlockedByMe: true,
        createdAt: new Date().toISOString(),
      };

      // Real-time delivery via Socket.IO
      await emitToUser(input.recipientId, "new_message", newMessage);
      await emitToUser(senderId, "message_sent", newMessage);

      return newMessage;
    }),

  // ── Create PPV unlock payment intent ─────────────────────────────────────
  createPpvUnlockIntent: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });

      const fanId = ctx.user.id;
      const [rows] = await (db as any).execute(sql`
        SELECT m.id, m.ppv_price_cents, m.sender_id, m.conversation_id,
               c.creator_id, c.fan_id
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE m.id = ${input.messageId} AND m.is_ppv = 1 LIMIT 1
      `);
      const msg = rows?.[0];
      if (!msg) throw new TRPCError({ code: "NOT_FOUND", message: "PPV message not found" });
      if (msg.fan_id !== fanId) throw new TRPCError({ code: "FORBIDDEN", message: "Not your conversation" });

      // Check already unlocked
      const [unlockRows] = await (db as any).execute(sql`
        SELECT id FROM message_unlocks WHERE message_id = ${input.messageId} AND fan_id = ${fanId} LIMIT 1
      `);
      if (unlockRows?.[0]) throw new TRPCError({ code: "CONFLICT", message: "Already unlocked" });

      const intent = await stripe.paymentIntents.create({
        amount: msg.ppv_price_cents,
        currency: "usd",
        metadata: {
          type: "ppv_message",
          messageId: input.messageId.toString(),
          fanId: fanId.toString(),
          creatorId: msg.creator_id.toString(),
        },
      });

      return { clientSecret: intent.client_secret, intentId: intent.id, amountCents: msg.ppv_price_cents };
    }),

  // ── Confirm PPV unlock after Stripe payment ───────────────────────────────
  confirmPpvUnlock: protectedProcedure
    .input(z.object({
      messageId: z.number(),
      paymentIntentId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });

      const fanId = ctx.user.id;

      // Verify payment succeeded with Stripe
      const intent = await stripe.paymentIntents.retrieve(input.paymentIntentId);
      if (intent.status !== "succeeded") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Payment not completed. Status: ${intent.status}` });
      }
      if (intent.metadata.messageId !== input.messageId.toString() || intent.metadata.fanId !== fanId.toString()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Payment intent mismatch" });
      }

      // Record unlock
      await (db as any).execute(sql`
        INSERT IGNORE INTO message_unlocks (message_id, fan_id, amount_paid_cents, stripe_payment_intent_id)
        VALUES (${input.messageId}, ${fanId}, ${intent.amount}, ${input.paymentIntentId})
      `);

      // Update message unlock count and earnings
      await (db as any).execute(sql`
        UPDATE messages 
        SET ppv_unlock_count = ppv_unlock_count + 1,
            ppv_earnings_cents = ppv_earnings_cents + ${intent.amount}
        WHERE id = ${input.messageId}
      `);

      // Credit creator 85%
      const creatorId = parseInt(intent.metadata.creatorId);
      const { creatorShare } = await creditCreator(creatorId, intent.amount);

      // Record transaction
      await db.insert(transactions).values({
        fanId,
        creatorId,
        amountInCents: intent.amount,
        creatorShareInCents: creatorShare,
        platformShareInCents: intent.amount - creatorShare,
        stripePaymentIntentId: input.paymentIntentId,
        status: "completed",
      });

      // Fetch the now-unlocked message
      const [rows] = await (db as any).execute(sql`
        SELECT body, media_url, media_type FROM messages WHERE id = ${input.messageId} LIMIT 1
      `);
      const msg = rows?.[0];

      // Notify creator of PPV purchase
      await emitToUser(creatorId, "ppv_purchase", {
        messageId: input.messageId,
        fanId,
        amountCents: intent.amount,
        creatorEarningsCents: creatorShare,
      });

      return {
        unlocked: true,
        body: msg?.body ?? null,
        mediaUrl: msg?.media_url ?? null,
        mediaType: msg?.media_type ?? null,
        amountPaidCents: intent.amount,
        creatorEarningsCents: creatorShare,
      };
    }),

  // ── Mass DM blast (creator → all subscribers) ────────────────────────────
  massDmBlast: protectedProcedure
    .input(z.object({
      body: z.string().max(5000).optional(),
      mediaUrl: z.string().url().optional(),
      mediaType: z.enum(["image", "video", "audio"]).optional(),
      mediaThumbnailUrl: z.string().url().optional(),
      isPpv: z.boolean().default(false),
      ppvPriceCents: z.number().min(0).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const creatorId = ctx.user.id;
      const role = ctx.user.role;
      if (role !== "creator" && role !== "king" && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only creators can send mass DMs" });
      }
      if (!input.body && !input.mediaUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Mass DM must have body or media" });
      }
      if (input.isPpv && input.ppvPriceCents < 100) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "PPV price must be at least $1.00" });
      }

      // Get all active subscribers
      const activeSubs = await db
        .select({ fanId: subscriptions.fanId })
        .from(subscriptions)
        .where(and(eq(subscriptions.creatorId, creatorId), eq(subscriptions.status, "active")));

      if (activeSubs.length === 0) {
        return { sent: 0, batchId: null };
      }

      const batchId = crypto.randomUUID();
      let sent = 0;

      for (const sub of activeSubs) {
        const conversation = await getOrCreateConversation(creatorId, sub.fanId);
        await (db as any).execute(sql`
          INSERT INTO messages (conversation_id, sender_id, body, media_url, media_type, media_thumbnail_url, is_ppv, ppv_price_cents, is_mass_dm, mass_dm_batch_id)
          VALUES (${conversation.id}, ${creatorId}, ${input.body ?? null}, ${input.mediaUrl ?? null}, ${input.mediaType ?? null}, ${input.mediaThumbnailUrl ?? null}, ${input.isPpv ? 1 : 0}, ${input.ppvPriceCents}, 1, ${batchId})
        `);
        await (db as any).execute(sql`
          UPDATE conversations SET last_message_at = NOW(), fan_unread_count = fan_unread_count + 1
          WHERE id = ${conversation.id}
        `);
        // Real-time notify each fan
        await emitToUser(sub.fanId, "new_message", {
          conversationId: conversation.id,
          senderId: creatorId,
          body: input.isPpv ? null : (input.body ?? null),
          mediaThumbnailUrl: input.mediaThumbnailUrl ?? null,
          isPpv: input.isPpv,
          ppvPriceCents: input.ppvPriceCents,
          isMassDm: true,
        });
        sent++;
      }

      return { sent, batchId };
    }),

  // ── Get unread count ──────────────────────────────────────────────────────
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const [rows] = await (db as any).execute(sql`
      SELECT 
        SUM(CASE WHEN creator_id = ${userId} THEN creator_unread_count ELSE fan_unread_count END) AS total
      FROM conversations
      WHERE creator_id = ${userId} OR fan_id = ${userId}
    `);
    return { count: Number(rows?.[0]?.total ?? 0) };
  }),

  // ── Mark conversation as read ─────────────────────────────────────────────
  markRead: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const [conv] = await (db as any).execute(sql`
        SELECT id, creator_id, fan_id FROM conversations WHERE id = ${input.conversationId} LIMIT 1
      `);
      const conversation = conv?.[0];
      if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });
      if (conversation.creator_id !== userId && conversation.fan_id !== userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (conversation.creator_id === userId) {
        await (db as any).execute(sql`UPDATE conversations SET creator_unread_count = 0 WHERE id = ${input.conversationId}`);
      } else {
        await (db as any).execute(sql`UPDATE conversations SET fan_unread_count = 0 WHERE id = ${input.conversationId}`);
      }
      await (db as any).execute(sql`
        UPDATE messages SET is_read_by_recipient = 1, read_at = NOW()
        WHERE conversation_id = ${input.conversationId} AND sender_id != ${userId} AND is_read_by_recipient = 0
      `);
      return { ok: true };
    }),

  // ── Start or get conversation with a user ────────────────────────────────
  startConversation: protectedProcedure
    .input(z.object({ otherUserId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const [otherRow] = await db.select({ role: users.role, id: users.id }).from(users).where(eq(users.id, input.otherUserId)).limit(1);
      if (!otherRow) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const [selfRow] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
      const selfIsCreator = selfRow?.role === "creator" || selfRow?.role === "king" || selfRow?.role === "admin";
      const otherIsCreator = otherRow.role === "creator" || otherRow.role === "king" || otherRow.role === "admin";

      let creatorId: number, fanId: number;
      if (selfIsCreator && !otherIsCreator) {
        creatorId = userId; fanId = input.otherUserId;
      } else if (!selfIsCreator && otherIsCreator) {
        creatorId = input.otherUserId; fanId = userId;
      } else {
        // Both creators or both fans — use lower id as "creator" side
        creatorId = Math.min(userId, input.otherUserId);
        fanId = Math.max(userId, input.otherUserId);
      }

      const conversation = await getOrCreateConversation(creatorId, fanId);
      return { conversationId: conversation.id };
    }),
});
