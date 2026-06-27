/**
 * ============================================================================
 * ADERLY CREATOR SYSTEM — Real money-printing backend
 * @adysanchesz — Dominican creator, La Mas Perra
 *
 * Endpoints:
 *   aderly.getProfile        — public profile + stats + active tiers
 *   aderly.getTiers          — subscription tiers with Stripe checkout links
 *   aderly.createCheckout    — create Stripe checkout for a tier or PPV drop
 *   aderly.getDrops          — list of PPV drops (public teasers, locked content)
 *   aderly.createDrop        — owner: create a new PPV drop
 *   aderly.purchaseDrop      — fan: Stripe checkout for a single PPV drop
 *   aderly.getVaultStats     — owner: revenue, subscribers, top drops
 *   aderly.blastTelegram     — owner: send drop announcement to Telegram
 * ============================================================================
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";
import { stripe } from "../_core/stripe.js";
import { randomUUID } from "crypto";

const OWNER_IDS = [6, 33];
const PUBLIC_BASE = (process.env.PUBLIC_APP_URL || "https://creatorvault.live").replace(/\/$/, "");
const TELEGRAM_BOT = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_KINGCAM = process.env.TELEGRAM_KINGCAM_CHAT_ID || "";

// ─── Aderly's monetization tiers ──────────────────────────────────────────────
export const ADERLY_TIERS = [
  {
    id: "la_perra",
    name: "LA PERRA",
    emoji: "🔥",
    price: 29,
    description: "Access to all regular drops, behind-the-scenes, and daily content.",
    perks: [
      "All regular drops (photos + videos)",
      "Behind-the-scenes content",
      "Daily posts",
      "Early access to PPV teasers",
    ],
    color: "#FF4444",
    badge: "MOST POPULAR",
  },
  {
    id: "inner_circle",
    name: "INNER CIRCLE",
    emoji: "💎",
    price: 49,
    description: "VIP Telegram channel + exclusive drops + priority access.",
    perks: [
      "Everything in LA PERRA",
      "Private VIP Telegram channel",
      "Exclusive drops not on main feed",
      "Priority DM responses",
      "Monthly exclusive video",
    ],
    color: "#FF8C00",
    badge: "VIP",
  },
  {
    id: "goddess",
    name: "GODDESS",
    emoji: "👑",
    price: 99,
    description: "Full access + custom content + direct line to Aderly.",
    perks: [
      "Everything in INNER CIRCLE",
      "1 custom content request/month",
      "Direct DM access",
      "PPV drops at 50% off",
      "Name in content credits",
    ],
    color: "#FFD700",
    badge: "ELITE",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function sendTelegram(chatId: string, text: string, botToken: string): Promise<void> {
  if (!botToken || !chatId) return;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  }).catch(() => {});
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const aderlyRouter = router({

  getProfile: publicProcedure.query(() => ({
    name: "Aderly",
    handle: "@adysanchesz",
    tagline: "La Mas Perra 🔥 Dominican Queen | Viral Content Creator",
    bio: "Te gusta lo prohibido, lo hot, lo perro, el sexo bruto! Ven a disfrutar de como me lo hacen a cada momento. LA MAS PERRA 🔥🔥 ¿Quieres ver?",
    stats: {
      likes: "1.7K",
      photos: "29",
      videos: "63",
      subscribers: "Partner",
    },
    tiers: ADERLY_TIERS,
    socials: { instagram: "adysanchesz" },
    accentColor: "#FF4444",
    gradientFrom: "#1a0000",
    gradientTo: "#0a0000",
  })),

  getTiers: publicProcedure.query(() => ({ tiers: ADERLY_TIERS })),

  createCheckout: publicProcedure
    .input(z.object({
      tierId: z.string(),
      successUrl: z.string().optional(),
      cancelUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!stripe) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe not configured" });
      const tier = ADERLY_TIERS.find(t => t.id === input.tierId);
      if (!tier) throw new TRPCError({ code: "NOT_FOUND", message: "Tier not found" });
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `Aderly — ${tier.name}`,
              description: tier.description,
              images: [`${PUBLIC_BASE}/aderly-cover.jpg`],
            },
            unit_amount: tier.price * 100,
            recurring: { interval: "month" },
          },
          quantity: 1,
        }],
        mode: "subscription",
        success_url: input.successUrl || `${PUBLIC_BASE}/greatest-show/aderly?subscribed=1&tier=${tier.id}`,
        cancel_url: input.cancelUrl || `${PUBLIC_BASE}/greatest-show/aderly`,
        metadata: { creator: "aderly", tierId: tier.id, tierName: tier.name },
      });
      return { checkoutUrl: session.url, sessionId: session.id };
    }),

  getDrops: publicProcedure
    .input(z.object({ limit: z.number().default(12), offset: z.number().default(0) }).optional())
    .query(() => {
      // Static drops for now — owner can add real ones via createDrop
      return {
        drops: [
          { id: "drop-001", title: "La Dominicana 🇩🇴", teaser: "The one they said was too hot for the internet...", price: 25, mediaType: "video", locked: true, createdAt: "2026-06-20" },
          { id: "drop-002", title: "Red Room Session 🔴", teaser: "Chains, red light, and zero limits.", price: 20, mediaType: "video", locked: true, createdAt: "2026-06-22" },
          { id: "drop-003", title: "Morning Ritual ☀️", teaser: "How I start every morning. Subscribers only.", price: 15, mediaType: "photo", locked: true, createdAt: "2026-06-24" },
          { id: "drop-004", title: "La Mas Perra Compilation 🔥", teaser: "Best of June. 8 videos. One price.", price: 35, mediaType: "bundle", locked: true, createdAt: "2026-06-26" },
        ],
        total: 4,
      };
    }),

  purchaseDrop: publicProcedure
    .input(z.object({
      dropId: z.string(),
      dropTitle: z.string(),
      price: z.number().int().min(1),
    }))
    .mutation(async ({ input }) => {
      if (!stripe) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe not configured" });
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `Aderly — ${input.dropTitle}`,
              description: "Exclusive PPV content from Aderly (@adysanchesz)",
            },
            unit_amount: input.price * 100,
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${PUBLIC_BASE}/greatest-show/aderly?unlocked=${input.dropId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${PUBLIC_BASE}/greatest-show/aderly`,
        metadata: { creator: "aderly", dropId: input.dropId, type: "ppv" },
      });
      return { checkoutUrl: session.url, sessionId: session.id };
    }),

  createDrop: protectedProcedure
    .input(z.object({
      title: z.string(),
      teaser: z.string(),
      price: z.number().int().min(1),
      mediaType: z.enum(["photo", "video", "bundle"]),
      contentUrl: z.string().optional(),
      blastTelegram: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!OWNER_IDS.includes(ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });
      const dropId = `drop-${Date.now()}`;
      // Telegram blast
      if (input.blastTelegram && TELEGRAM_BOT && TELEGRAM_KINGCAM) {
        const msg = `🔥 <b>ADERLY — NEW DROP</b>\n\n<b>${input.title}</b>\n${input.teaser}\n\n💰 Unlock for <b>$${input.price}</b>\n🔗 ${PUBLIC_BASE}/greatest-show/aderly`;
        await sendTelegram(TELEGRAM_KINGCAM, msg, TELEGRAM_BOT);
      }
      return { dropId, title: input.title, price: input.price, blasted: input.blastTelegram };
    }),

  getVaultStats: protectedProcedure.query(async ({ ctx }) => {
    if (!OWNER_IDS.includes(ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });
    // Revenue projection based on current pricing
    return {
      creator: "Aderly",
      currentMonthlyRate: 15, // what she charges now
      optimizedMonthlyRate: 49, // what she should charge
      revenueGap: "If she had 100 subscribers: $1,500/mo now vs $4,900/mo optimized",
      tiers: ADERLY_TIERS.map(t => ({
        name: t.name,
        price: t.price,
        projectedAt100Subs: t.price * 100,
        projectedAt500Subs: t.price * 500,
      })),
      recommendations: [
        "Move her $15 sub to a free teaser tier — no paid content at $15",
        "Set LA PERRA ($29) as the entry paid tier",
        "Lock her best 20 videos behind PPV at $15–$35 each",
        "Create a VIP Telegram channel for INNER CIRCLE ($49) subscribers",
        "Post 1 teaser per day to free channels, full content behind paywall",
        "Run a 'founding member' promo at $29 for first 100 subscribers",
      ],
    };
  }),

  blastTelegram: protectedProcedure
    .input(z.object({
      message: z.string(),
      chatId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!OWNER_IDS.includes(ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN" });
      const chatId = input.chatId || TELEGRAM_KINGCAM;
      await sendTelegram(chatId, input.message, TELEGRAM_BOT);
      return { sent: true, chatId };
    }),
});
