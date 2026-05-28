import mysql from "mysql2/promise";
import Stripe from "stripe";
import { runBoostDrop, type FactoryResult } from "./kingcamMediaFactory.js";
import { notifyOwner } from "../_core/notification.js";

const DB_URL = process.env.DATABASE_URL || "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const DEFAULT_FREE_CHAT_ID = process.env.TELEGRAM_FREE_CHANNEL_CHAT_ID || process.env.TELEGRAM_FREE_CHANNEL_ID || "-1003749459281";
const DEFAULT_VIP_CHAT_ID = process.env.TELEGRAM_VIP_CHANNEL_CHAT_ID || process.env.TELEGRAM_VIP_CHANNEL_ID || "-1003817770263";
const OWNER_NOTIFY_CHAT_ID = process.env.TELEGRAM_OWNER_CHAT_ID || process.env.TELEGRAM_KINGCAM_CHAT_ID || process.env.CREATORVAULT_OWNER_TELEGRAM_ID || "";
const BASE_URL = (process.env.APP_URL || process.env.PUBLIC_APP_URL || "https://creatorvault.live").replace(/\/$/, "");
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || "";
const OWNER_USER_ID = Number(process.env.CREATORVAULT_OWNER_USER_ID || process.env.DEFAULT_CREATOR_ID || 1);
const BOT_USERNAME = (process.env.TELEGRAM_BOT_USERNAME || process.env.VAULTX_TELEGRAM_BOT_USERNAME || process.env.BOT_USERNAME || "").replace(/^@/, "");
const MIN_PUBLIC_POST_GAP_MS = Number(process.env.CREATORVAULT_VIDEO_DROP_MIN_GAP_MS || 45 * 60 * 1000);
const LOOP_INTERVAL_MS = Number(process.env.CREATORVAULT_VIDEO_REVENUE_LOOP_MS || 15 * 60 * 1000);

let loopStarted = false;
let tickInFlight = false;

const stripe = STRIPE_SECRET
  ? new Stripe(STRIPE_SECRET, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion })
  : null;

type RevenueOffer = {
  slug: string;
  title: string;
  workflow: string;
  priceCents: number;
  buyer: string;
  deliverable: string;
  productionTopic: string;
  ctaLabel: string;
  channel: "free" | "vip";
  fulfillment: "membership" | "challenge" | "dm_access" | "template_pack" | "vault_unlock" | "vip_access" | "teaser_system" | "digital_asset" | "proof_challenge" | "dfy_install";
};

type TelegramBuyer = {
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
};

const OFFERS: RevenueOffer[] = [
  {
    slug: "telegram-paid-video-membership",
    title: "CreatorVault Paid Video Membership",
    workflow: "Telegram paid channel / membership route",
    priceCents: 4900,
    buyer: "creators and buyers who want recurring video-first monetization drops inside Telegram",
    deliverable: "VIP Telegram access with native video drops, monetization workflows, and private paid-channel delivery",
    productionTopic: "CreatorVault paid Telegram video membership: finished video drops, creator monetization plays, paid channel access, and native Telegram delivery with no output-link handoff",
    ctaLabel: "Join the Paid Video Vault",
    channel: "free",
    fulfillment: "membership",
  },
  {
    slug: "telegram-paid-challenge",
    title: "Telegram Paid Launch Challenge",
    workflow: "Telegram paid challenge route",
    priceCents: 15000,
    buyer: "creators who need a fast proof-based path to launch a paid Telegram offer",
    deliverable: "challenge entry, native video prompt pack, proof submission lane, launch checklist, and paid review path",
    productionTopic: "Telegram paid launch challenge: creators post native video teasers, open a paid channel, submit proof, and convert fast with CreatorVault workflows",
    ctaLabel: "Join the Paid Challenge",
    channel: "free",
    fulfillment: "challenge",
  },
  {
    slug: "telegram-paid-dm-access",
    title: "Paid Telegram DM Access",
    workflow: "Telegram direct-message paid access route",
    priceCents: 9700,
    buyer: "creators who want direct private access, review, and fast monetization help",
    deliverable: "paid DM access, native video audit drop, close-flow script, and one automated priority follow-up",
    productionTopic: "paid Telegram DM access: native video audit, CreatorVault monetization diagnosis, VIP close path, and direct paid-access conversion without spam",
    ctaLabel: "Unlock Paid DM Access",
    channel: "free",
    fulfillment: "dm_access",
  },
  {
    slug: "telegram-funnel-template-pack",
    title: "Telegram Funnel Template Pack",
    workflow: "Telegram funnel-template / workflow product route",
    priceCents: 7900,
    buyer: "operators who need copy-paste Telegram monetization workflows",
    deliverable: "native video sales drop, pinned post script, welcome DM, paid-channel CTA, checkout copy, and follow-up sequence",
    productionTopic: "CreatorVault Telegram funnel template pack: scripts become native video drops, pinned posts, paid access CTAs, DM follow-ups, and workflow products that can sell today",
    ctaLabel: "Get the Template Pack",
    channel: "free",
    fulfillment: "template_pack",
  },
  {
    slug: "creatorvault-vaultx-paid-unlock",
    title: "CreatorVault / VaultX Paid Unlock",
    workflow: "CreatorVault/VaultX offer route for paid unlocks",
    priceCents: 6900,
    buyer: "buyers who want a specific CreatorVault system unlocked instead of a broad membership",
    deliverable: "paid VaultX unlock, native Telegram video proof, workflow asset, and private delivery confirmation",
    productionTopic: "CreatorVault VaultX paid unlock: a finished native video proof asset plus monetization workflow delivered after checkout as a premium unlock",
    ctaLabel: "Unlock the VaultX Offer",
    channel: "free",
    fulfillment: "vault_unlock",
  },
  {
    slug: "instant-payout-vip-consult",
    title: "Instant Payout / VIP Access Lane",
    workflow: "Instant payout / consultation / VIP access route",
    priceCents: 25000,
    buyer: "creators and operators who want same-day priority execution instead of self-serve templates",
    deliverable: "VIP access, same-day monetization diagnosis, native video offer asset, Telegram routing plan, and priority setup lane",
    productionTopic: "CreatorVault instant payout VIP lane: same-day creator monetization setup, native video offer, Telegram paid access, and priority conversion support",
    ctaLabel: "Open the VIP Lane",
    channel: "free",
    fulfillment: "vip_access",
  },
  {
    slug: "public-teaser-to-paid-telegram",
    title: "Public Teaser to Paid Telegram System",
    workflow: "Public teaser → Telegram → paid conversion route",
    priceCents: 7900,
    buyer: "creators with public attention but no clean paid conversion path",
    deliverable: "public teaser script, native Telegram video post, paid unlock button, and conversion follow-up",
    productionTopic: "public teaser to paid Telegram conversion: a CreatorVault system that turns public attention into paid native video access and VIP upgrades",
    ctaLabel: "Get the Conversion System",
    channel: "free",
    fulfillment: "teaser_system",
  },
  {
    slug: "digital-asset-video-package",
    title: "Digital Asset / Video Package",
    workflow: "Digital asset / template / package route",
    priceCents: 5900,
    buyer: "creators who want immediate assets they can post, sell, or adapt",
    deliverable: "native video asset, caption pack, DM script, offer copy, and paid delivery checklist sent in Telegram",
    productionTopic: "CreatorVault digital asset video package: finished native video asset, creator captions, Telegram DM close scripts, and paid package delivery inside Telegram",
    ctaLabel: "Buy the Asset Package",
    channel: "free",
    fulfillment: "digital_asset",
  },
  {
    slug: "video-first-proof-challenge",
    title: "Video-First Proof Challenge",
    workflow: "Challenge-based route tied to proof and conversion",
    priceCents: 15000,
    buyer: "creators who need proof-based accountability to launch and convert fast",
    deliverable: "challenge entry, native video prompt pack, proof submission lane, and paid review path",
    productionTopic: "video-first proof challenge: creators launch a paid Telegram offer, post a native video teaser, submit proof, and convert without generic creator advice",
    ctaLabel: "Join the Proof Challenge",
    channel: "free",
    fulfillment: "proof_challenge",
  },
  {
    slug: "same-day-telegram-funnel-install",
    title: "Same-Day Telegram Funnel Install",
    workflow: "Done-for-you Telegram funnel install route",
    priceCents: 50000,
    buyer: "operators who want the funnel installed instead of learning the setup",
    deliverable: "paid Telegram channel structure, conversion post, native video teaser, automated follow-up sequence, and VIP install lane",
    productionTopic: "same-day CreatorVault Telegram funnel install: paid channel, native video teaser, VIP access path, checkout conversion, and automation that sells without spam",
    ctaLabel: "Book Same-Day Install",
    channel: "free",
    fulfillment: "dfy_install",
  },
];

function getDb() {
  return mysql.createConnection(DB_URL);
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function pickOffer(): RevenueOffer {
  const idx = Math.floor(Date.now() / MIN_PUBLIC_POST_GAP_MS) % OFFERS.length;
  return OFFERS[idx];
}

async function tgPost(method: string, body: Record<string, unknown>): Promise<{ ok: boolean; result?: any; description?: string }> {
  if (!BOT_TOKEN) return { ok: false, description: "TELEGRAM_BOT_TOKEN is not configured" };
  const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return resp.json() as Promise<{ ok: boolean; result?: any; description?: string }>;
}

function findOffer(slug: string | undefined | null): RevenueOffer {
  return OFFERS.find((offer) => offer.slug === slug) || OFFERS[0];
}

function createOfferStartUrl(offer: RevenueOffer): string | null {
  return BOT_USERNAME ? `https://t.me/${BOT_USERNAME}?start=cv_offer_${encodeURIComponent(offer.slug)}` : null;
}

async function createCheckoutUrl(offer: RevenueOffer, buyer?: TelegramBuyer): Promise<string> {
  if (!stripe) {
    return `${BASE_URL}/vaultx?offer=${encodeURIComponent(offer.slug)}`;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "cashapp"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: offer.title,
            description: `${offer.deliverable} For ${offer.buyer}.`,
            metadata: { offerSlug: offer.slug },
          },
          unit_amount: offer.priceCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${BASE_URL}/vaultx?paid=1&offer=${encodeURIComponent(offer.slug)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/vaultx?offer=${encodeURIComponent(offer.slug)}&cancelled=1`,
    metadata: {
      type: "creatorvault_telegram_video_offer",
      offerSlug: offer.slug,
      source: "creatorvault_video_revenue_autopilot",
      title: offer.title,
      deliverable: offer.deliverable,
      channel: "telegram",
      telegramId: buyer?.telegramId || "",
      telegramUsername: buyer?.username || "",
      telegramFirstName: buyer?.firstName || "",
    },
  });

  return session.url || `${BASE_URL}/vaultx?offer=${encodeURIComponent(offer.slug)}`;
}

function buildCaption(offer: RevenueOffer): string {
  return [
    `<b>${offer.title}</b>`,
    "",
    `Native CreatorVault video drop. Not a teaser link. Not an output URL. The asset is posted directly inside Telegram and the paid workflow unlocks the execution package behind it.`,
    "",
    `<b>Money path:</b> ${offer.workflow}.`,
    `<b>Built for:</b> ${offer.buyer}.`,
    `<b>Unlock:</b> ${offer.deliverable}.`,
    `<b>Price:</b> ${money(offer.priceCents)}.`,
    "",
    "Tap the offer button if you want the workflow, access, or install lane. The system delivers paid value in Telegram after checkout.",
  ].join("\n");
}

function buildPaidWorkflowPackage(offer: RevenueOffer): string {
  const shared = [
    `<b>${offer.title} — paid CreatorVault package</b>`,
    "",
    `<b>Money path:</b> ${offer.workflow}.`,
    `<b>Who it is for:</b> ${offer.buyer}.`,
    `<b>Paid deliverable:</b> ${offer.deliverable}.`,
    "",
  ];

  const packages: Record<RevenueOffer["fulfillment"], string[]> = {
    membership: [
      "<b>Turn-on sequence</b>",
      "1. Use the native video as the public proof asset.",
      "2. Pin one paid-access CTA: unlock VIP video drops plus CreatorVault workflows.",
      "3. Sell membership first, then upsell VIP install after engagement.",
      "4. Follow up with one value drop and one proof drop; stop unless the buyer engages.",
    ],
    challenge: [
      "<b>Paid challenge sequence</b>",
      "1. Day 1: publish native teaser video and open paid Telegram access.",
      "2. Day 2: submit proof of the paid offer and channel setup.",
      "3. Day 3: run conversion follow-up and push VIP review.",
      "4. Winner metric: proof posted, offer live, paid CTA clicked, sale attempted.",
    ],
    dm_access: [
      "<b>Paid DM close flow</b>",
      "1. Ask for the buyer's current offer, traffic source, and Telegram channel status.",
      "2. Send the native video audit angle and one paid-access CTA.",
      "3. Offer VIP setup if they want hands-off execution.",
      "4. Do not chase; one value follow-up and one proof follow-up only.",
    ],
    template_pack: [
      "<b>Template pack</b>",
      "Pinned CTA: This is the native video proof. Unlock the workflow and install the same paid Telegram funnel.",
      "Welcome DM: You are in the CreatorVault money lane. Pick membership, challenge, template pack, or VIP install.",
      "Follow-up 1: Here's the video-first offer structure you can copy today.",
      "Follow-up 2: If you want it installed, take the VIP lane.",
    ],
    vault_unlock: [
      "<b>VaultX unlock sequence</b>",
      "1. Use the native video as proof of the VaultX output standard.",
      "2. Gate the workflow as a paid unlock.",
      "3. Deliver the package in Telegram after checkout.",
      "4. Push the buyer into membership or VIP install if they need execution.",
    ],
    vip_access: [
      "<b>VIP lane</b>",
      "1. Buyer gets same-day priority diagnosis.",
      "2. Native video offer asset is the first proof piece.",
      "3. Telegram money path is selected: membership, challenge, paid DM, or install.",
      "4. Escalate directly into done-for-you install when buyer wants speed.",
    ],
    teaser_system: [
      "<b>Public teaser system</b>",
      "1. Post the native teaser publicly.",
      "2. Route all clicks into Telegram.",
      "3. Sell paid unlock inside Telegram, not through a dead external handoff.",
      "4. Follow up with one native proof post and one direct paid-access CTA.",
    ],
    digital_asset: [
      "<b>Digital asset package</b>",
      "Caption angle: Here is the finished native video asset. Unlock the captions, DM script, and paid delivery checklist.",
      "DM script: Want this converted into your paid Telegram offer? Reply with your niche and current audience source.",
      "Delivery checklist: video asset, caption, paid CTA, proof follow-up, VIP upsell.",
    ],
    proof_challenge: [
      "<b>Proof challenge package</b>",
      "1. Submit your native video teaser proof.",
      "2. Submit your paid Telegram CTA proof.",
      "3. Submit your checkout/payment route proof.",
      "4. Unlock review or VIP setup after proof is posted.",
    ],
    dfy_install: [
      "<b>Done-for-you install package</b>",
      "1. Paid channel structure.",
      "2. Native video teaser and pinned conversion post.",
      "3. Checkout button and paid fulfillment route.",
      "4. Anti-spam follow-up sequence and owner update alerts.",
    ],
  };

  return [...shared, ...packages[offer.fulfillment], "", "<b>CreatorVault rule:</b> finished value is delivered natively in Telegram. Links are only for checkout or access when required."].join("\n");
}

async function lastPublicVideoDropAt(conn: mysql.Connection): Promise<number> {
  try {
    const [rows] = await conn.execute(
      `SELECT created_at FROM telegram_message_events
       WHERE direction='outbound' AND message_type='video' AND tracking_code LIKE 'cv_video_%'
       ORDER BY created_at DESC LIMIT 1`
    ) as any;
    const value = rows?.[0]?.created_at ? new Date(rows[0].created_at).getTime() : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

async function logEvent(conn: mysql.Connection, params: {
  telegramId: string;
  messageType: string;
  text: string;
  trackingCode?: string | null;
}): Promise<void> {
  try {
    await conn.execute(
      `INSERT INTO telegram_message_events (telegram_id, direction, message_type, message_text, tracking_code)
       VALUES (?, 'outbound', ?, ?, ?)`,
      [params.telegramId, params.messageType, params.text.slice(0, 4000), params.trackingCode || null]
    );
  } catch (err: any) {
    console.warn("[CreatorVaultRevenue] event log failed:", err.message);
  }
}

async function createDistributionJob(conn: mysql.Connection, offer: RevenueOffer, videoUrl: string, checkoutUrl: string, caption: string, messageId: number | null): Promise<void> {
  const trackingCode = `cvvideo${Date.now().toString(36)}${Math.random().toString(16).slice(2, 8)}`;
  try {
    await conn.execute(
      `INSERT INTO distribution_jobs
       (creator_id, channel_identity_id, platform, asset_url, asset_type, caption, tracking_code, destination_url, status, content_safety_level, brand_lane, platform_post_id)
       VALUES (?, 1, 'telegram', ?, 'teaser', ?, ?, ?, 'posted', 'sensitive', 'vaultx_adult', ?)`,
      [OWNER_USER_ID, videoUrl, caption, trackingCode, checkoutUrl, messageId ? String(messageId) : null]
    );
  } catch (err: any) {
    console.warn("[CreatorVaultRevenue] distribution job log failed:", err.message);
  }
}

async function getLatestFinishedVideo(conn: mysql.Connection): Promise<string | null> {
  try {
    const [assetRows] = await conn.execute(
      `SELECT public_url AS video_url FROM media_assets
       WHERE asset_type='video' AND status='ready' AND public_url IS NOT NULL AND public_url <> ''
       ORDER BY created_at DESC LIMIT 1`
    ) as any;
    if (assetRows?.[0]?.video_url) return String(assetRows[0].video_url);
  } catch { /* ignore and try clone inventory */ }

  try {
    const [cloneRows] = await conn.execute(
      `SELECT video_url FROM kingcam_clone_videos
       WHERE video_url IS NOT NULL AND video_url <> '' AND render_status='ready'
       ORDER BY updated_at DESC LIMIT 1`
    ) as any;
    if (cloneRows?.[0]?.video_url) return String(cloneRows[0].video_url);
  } catch { /* ignore */ }

  return null;
}

async function ensureNativeVideoUrl(generated: FactoryResult): Promise<{ videoUrl: string | null; source: "generated" | "inventory" | "none" }> {
  if (generated.videoUrl) return { videoUrl: generated.videoUrl, source: "generated" };
  const conn = await getDb();
  try {
    const inventoryVideo = await getLatestFinishedVideo(conn);
    return inventoryVideo ? { videoUrl: inventoryVideo, source: "inventory" } : { videoUrl: null, source: "none" };
  } finally {
    await conn.end();
  }
}

async function publishNativeVideoDrop(offer: RevenueOffer, generated: FactoryResult, checkoutUrl: string): Promise<{ ok: boolean; messageId?: number; error?: string; videoUrl?: string; videoSource?: string }> {
  const nativeVideo = await ensureNativeVideoUrl(generated);
  if (!nativeVideo.videoUrl) {
    return { ok: false, error: "no finished video available from generator or production inventory" };
  }

  const channelChatId = offer.channel === "vip" ? DEFAULT_VIP_CHAT_ID : DEFAULT_FREE_CHAT_ID;
  const caption = buildCaption(offer);
  const startUrl = createOfferStartUrl(offer);
  const inline_keyboard: Array<Array<Record<string, string>>> = [
    [{ text: `${offer.ctaLabel} — ${money(offer.priceCents)}`, callback_data: `cv_offer:${offer.slug}` }],
  ];
  if (startUrl) inline_keyboard.push([{ text: "Open private checkout DM", url: startUrl }]);
  inline_keyboard.push([{ text: "Open CreatorVault", url: `${BASE_URL}/vaultx?offer=${encodeURIComponent(offer.slug)}` }]);
  const reply_markup = { inline_keyboard };

  const sent = await tgPost("sendVideo", {
    chat_id: channelChatId,
    video: nativeVideo.videoUrl,
    caption,
    parse_mode: "HTML",
    supports_streaming: true,
    reply_markup,
  });

  const conn = await getDb();
  try {
    await logEvent(conn, {
      telegramId: channelChatId,
      messageType: "video",
      text: `${offer.slug} | ${caption}`,
      trackingCode: `cv_video_${offer.slug.slice(0, 12)}`,
    });
    await createDistributionJob(conn, offer, nativeVideo.videoUrl, checkoutUrl, caption, sent.result?.message_id || null);
  } finally {
    await conn.end();
  }

  return sent.ok
    ? { ok: true, messageId: sent.result?.message_id, videoUrl: nativeVideo.videoUrl, videoSource: nativeVideo.source }
    : { ok: false, error: sent.description || "Telegram sendVideo failed", videoUrl: nativeVideo.videoUrl, videoSource: nativeVideo.source };
}

async function createVipInviteLink(offer: RevenueOffer): Promise<string | null> {
  const configured = process.env.TELEGRAM_VIP_INVITE_LINK || process.env.TELEGRAM_PAID_CHANNEL_INVITE_LINK || "";
  if (configured) return configured;
  if (!BOT_TOKEN || !DEFAULT_VIP_CHAT_ID) return null;
  const resp = await tgPost("createChatInviteLink", {
    chat_id: DEFAULT_VIP_CHAT_ID,
    name: `CreatorVault ${offer.slug} ${Date.now()}`,
    creates_join_request: false,
  });
  return resp.ok && resp.result?.invite_link ? String(resp.result.invite_link) : null;
}

async function sendNativePaidDeliverable(chatId: string, offer: RevenueOffer, videoUrl: string | null): Promise<boolean> {
  const intro = await tgPost("sendMessage", {
    chat_id: chatId,
    text: [
      `<b>${offer.title} unlocked.</b>`,
      "",
      "Your paid CreatorVault deliverable is being delivered directly in Telegram. No output-link handoff.",
      `<b>Included:</b> ${offer.deliverable}.`,
    ].join("\n"),
    parse_mode: "HTML",
  });

  let videoOk = true;
  if (videoUrl) {
    const video = await tgPost("sendVideo", {
      chat_id: chatId,
      video: videoUrl,
      caption: `<b>${offer.title}</b> — native paid video deliverable.`,
      parse_mode: "HTML",
      supports_streaming: true,
    });
    videoOk = video.ok;
  }

  const packageMsg = await tgPost("sendMessage", {
    chat_id: chatId,
    text: buildPaidWorkflowPackage(offer),
    parse_mode: "HTML",
  });

  let accessOk = true;
  if (["membership", "challenge", "vip_access", "dfy_install"].includes(offer.fulfillment)) {
    const invite = await createVipInviteLink(offer);
    if (invite) {
      const access = await tgPost("sendMessage", {
        chat_id: chatId,
        text: [`<b>Private access lane</b>`, "", "Use this access route for the paid CreatorVault Telegram lane attached to your purchase.", invite].join("\n"),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
      accessOk = access.ok;
    }
  }

  return Boolean(intro.ok && videoOk && packageMsg.ok && accessOk);
}

export async function handleCreatorVaultOfferCallback(params: TelegramBuyer & { offerSlug: string }): Promise<void> {
  const offer = findOffer(params.offerSlug);
  const checkoutUrl = await createCheckoutUrl(offer, params);
  await tgPost("sendMessage", {
    chat_id: params.telegramId,
    text: [
      `<b>${offer.title}</b>`,
      "",
      `Built for ${offer.buyer}.`,
      `Unlock: ${offer.deliverable}.`,
      `Price: ${money(offer.priceCents)}.`,
      "",
      "Tap checkout. After payment, CreatorVault automatically sends the finished video/workflow deliverable here in Telegram.",
    ].join("\n"),
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: [[{ text: `Pay ${money(offer.priceCents)} and unlock`, url: checkoutUrl }]] },
  });
  await notifyStatus("CreatorVault buyer checkout opened", `${params.username || params.telegramId} requested ${offer.title}. Checkout was sent by DM with automatic paid Telegram fulfillment metadata.`);
}

export async function fulfillCreatorVaultVideoOfferPurchase(sessionLike: { id?: string; amount_total?: number | null; customer_email?: string | null; metadata?: Record<string, string> | null }): Promise<void> {
  const metadata = sessionLike.metadata || {};
  if (metadata.type !== "creatorvault_telegram_video_offer") return;
  const offer = findOffer(metadata.offerSlug);
  const telegramId = metadata.telegramId;
  const conn = await getDb();
  let videoUrl: string | null = null;
  try {
    videoUrl = await getLatestFinishedVideo(conn);
  } finally {
    await conn.end();
  }

  if (telegramId) {
    const delivered = await sendNativePaidDeliverable(telegramId, offer, videoUrl);
    await notifyStatus(
      delivered ? "CreatorVault paid Telegram deliverable sent" : "CreatorVault paid Telegram delivery attempted",
      [`Offer: ${offer.title}`, `Amount: ${money(sessionLike.amount_total || offer.priceCents)}`, `Buyer Telegram: ${telegramId}`, `Session: ${sessionLike.id || "unknown"}`, `Native video attached: ${videoUrl ? "yes" : "no"}`].join("\n")
    );
  } else {
    await notifyStatus("CreatorVault purchase captured without Telegram ID", [`Offer: ${offer.title}`, `Amount: ${money(sessionLike.amount_total || offer.priceCents)}`, `Session: ${sessionLike.id || "unknown"}`, `Customer: ${sessionLike.customer_email || "unknown"}`].join("\n"));
  }
}

async function notifyStatus(title: string, content: string): Promise<void> {
  let delivered = false;
  try {
    delivered = await notifyOwner({ title, content });
  } catch (err: any) {
    console.warn("[CreatorVaultRevenue] owner notification failed:", err.message);
  }

  if (!delivered && OWNER_NOTIFY_CHAT_ID && BOT_TOKEN) {
    const fallback = await tgPost("sendMessage", {
      chat_id: OWNER_NOTIFY_CHAT_ID,
      text: [`<b>${title}</b>`, "", content].join("\n"),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    if (!fallback.ok) {
      console.warn("[CreatorVaultRevenue] Telegram owner notification fallback failed:", fallback.description);
    }
  }
}

export async function runCreatorVaultRevenueTick(reason = "scheduled"): Promise<void> {
  if (tickInFlight) return;
  tickInFlight = true;
  try {
    const conn = await getDb();
    try {
      const last = await lastPublicVideoDropAt(conn);
      if (last && Date.now() - last < MIN_PUBLIC_POST_GAP_MS && reason !== "manual-force") {
        const minutesLeft = Math.ceil((MIN_PUBLIC_POST_GAP_MS - (Date.now() - last)) / 60000);
        console.log(`[CreatorVaultRevenue] anti-spam hold: next native video drop in ~${minutesLeft}m (reason=${reason})`);
        return;
      }
    } finally {
      await conn.end();
    }

    const offer = pickOffer();
    await notifyStatus(
      "CreatorVault video revenue automation started",
      `Generating/posting native Telegram video money path for ${offer.title} (${money(offer.priceCents)}). Workflow: ${offer.workflow}. Reason: ${reason}.`
    );

    let generated: FactoryResult;
    try {
      generated = await runBoostDrop({
        topic: offer.productionTopic,
        userId: OWNER_USER_ID,
        vertical: "telegram_drop",
        suitColor: "midnight black with gold CreatorVault accents",
      });
    } catch (err: any) {
      console.warn("[CreatorVaultRevenue] generator failed; falling back to finished production inventory:", err?.message || err);
      generated = { jobId: `inventory-fallback-${Date.now()}`, videoUrl: null } as FactoryResult;
    }

    const checkoutUrl = await createCheckoutUrl(offer);
    const posted = await publishNativeVideoDrop(offer, generated, checkoutUrl);

    if (posted.ok) {
      await notifyStatus(
        "CreatorVault native video money path is live",
        [
          `Workflow: ${offer.workflow}`,
          `Offer: ${offer.title}`,
          `Price: ${money(offer.priceCents)}`,
          `Telegram message ID: ${posted.messageId}`,
          `Factory job: ${(generated as any).jobId || "inventory-fallback"}`,
          `Delivery rule: native Telegram video was sent; caption does not expose the generated output URL.`,
          `Video source: ${posted.videoSource || "generated"}`,
          `Conversion: checkout button is attached to the Telegram post.`,
        ].join("\n")
      );
    } else {
      await notifyStatus(
        "CreatorVault native video post attempted",
        `Workflow: ${offer.workflow}\nOffer: ${offer.title}\nTelegram native delivery result: ${posted.error}\nThe loop remains active and will continue rotating the next money path without locking.`
      );
    }
  } finally {
    tickInFlight = false;
  }
}

export function startCreatorVaultOvernightRevenueCron(): void {
  if (loopStarted) return;
  loopStarted = true;
  console.log(`[CreatorVaultRevenue] Native video-first revenue loop started — interval=${Math.round(LOOP_INTERVAL_MS / 60000)}m, min_public_gap=${Math.round(MIN_PUBLIC_POST_GAP_MS / 60000)}m`);
  runCreatorVaultRevenueTick("startup-force").catch((err) => {
    tickInFlight = false;
    console.error("[CreatorVaultRevenue] startup tick failed:", err.message);
  });
  setInterval(() => {
    runCreatorVaultRevenueTick("scheduled").catch((err) => {
      tickInFlight = false;
      console.error("[CreatorVaultRevenue] scheduled tick failed:", err.message);
    });
  }, LOOP_INTERVAL_MS);
}
