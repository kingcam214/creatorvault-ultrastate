import OpenAI from "openai";
import Stripe from "stripe";
import { randomBytes } from "crypto";
import { sql } from "drizzle-orm";
import * as db from "../db";

export type ChallengeExecutionMode = "dry_run" | "create_checkout" | "send_telegram";

export interface ChallengeExecutionInput {
  taskSlug: string;
  taskName?: string;
  priceCents?: number;
  mode?: ChallengeExecutionMode;
  audience?: string;
  offerUrl?: string;
  creatorId?: number;
  requireConfirmation?: string;
}

export interface ChallengeExecutionResult {
  ok: boolean;
  mode: ChallengeExecutionMode;
  taskSlug: string;
  taskName: string;
  priceCents: number;
  trackingCode: string;
  checkoutSessionId?: string | null;
  checkoutUrl?: string | null;
  distributionJobId?: number | null;
  telegramMessageId?: number | null;
  executionRunId?: number | null;
  deliverable: ChallengeDeliverable;
  proof: {
    generated: boolean;
    persisted: boolean;
    stripeMetadataLinked: boolean;
    deliveryLogged: boolean;
    externalDeliverySent: boolean;
  };
}

export interface ChallengeDeliverable {
  offerName: string;
  oneLinePromise: string;
  targetBuyer: string;
  premiumPositioning: string;
  landingPageCopy: string;
  telegramPost: string;
  directMessageScript: string;
  fulfillmentPlan: string;
  buyerDeliverable: string;
  proofChecklist: string[];
}

const FRONTEND = (
  process.env.VITE_FRONTEND_FORGE_API_URL?.replace(/\/api\/?$/, "") ||
  process.env.VITE_APP_URL ||
  "https://creatorvault.live"
).replace(/\/$/, "");

const DEFAULT_TASKS: Record<string, { name: string; priceCents: number; audience: string }> = {
  "auto-recruiter-agent": { name: "Auto-Recruiter", priceCents: 39900, audience: "qualified creators and operators who need a monetized recruiting sequence" },
  "money-follow-up-agent": { name: "Money Follow-Up", priceCents: 34900, audience: "creators with failed payments, unpaid invoices, or missed upsell revenue" },
  "brand-deal-agent": { name: "Brand Deal", priceCents: 49700, audience: "creators who need brand pitch assets and sponsor outreach" },
  "affiliate-marketing-agent": { name: "Affiliate Marketing", priceCents: 29900, audience: "creators who want affiliate funnels and revenue tracking" },
  "monetization-strategy-agent": { name: "Monetization Strategy", priceCents: 39900, audience: "creators who need a conversion-first monetization plan" },
  "engagement-agent": { name: "Engagement", priceCents: 29900, audience: "creators with quiet audiences who need retention and reply systems" },
  "social-autoposter-agent": { name: "Social Media Autoposter", priceCents: 19900, audience: "creators who need scheduled post packs and captions" },
  "viral-optimizer-agent": { name: "Viral Optimizer", priceCents: 34900, audience: "creators trying to improve hooks, retention, and shareability" },
  "vaultlive-revenue-agent": { name: "VaultLive Revenue", priceCents: 19900, audience: "creators preparing monetized live events" },
  "vaultmarket-product-agent": { name: "VaultMarket Product", priceCents: 19900, audience: "creators packaging a sellable product or offer" },
  "kingcam-clone-agent": { name: "KingCam Clone Agent", priceCents: 49700, audience: "operators who want the KingCam execution style packaged into a system" },
  "hollywood-show-agent": { name: "Hollywood Show Agent", priceCents: 59700, audience: "creators building a premium entertainment or show concept" },
  "mercedes-acquisition-agent": { name: "Mercedes Acquisition Agent", priceCents: 29900, audience: "buyers and sellers who need high-intent acquisition outreach" },
  "emma-network-recruiter-agent": { name: "Emma Network Recruiter Agent", priceCents: 19700, audience: "Emma Network recruiting prospects and partners" },
  "emma-content-agent": { name: "Emma Content Agent", priceCents: 14900, audience: "Emma Network creators who need content packages" },
  "vaultmarket-commission-agent": { name: "VaultMarket Commission Agent", priceCents: 9900, audience: "marketplace sellers who need commission tracking and offer setup" },
  "vaultu-curriculum-agent": { name: "VaultU Curriculum Agent", priceCents: 39700, audience: "experts turning knowledge into a sellable curriculum" },
  "telegram-bot-manager-agent": { name: "Telegram Bot Manager Agent", priceCents: 14900, audience: "creators who need Telegram automation and conversion flows" },
  "mark-cuban-pitch-agent": { name: "Mark Cuban Pitch Agent", priceCents: 0, audience: "owner-only private pitch execution" },
};

function extractRows(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result;
  return [];
}

function toSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "challenge-task";
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function parseDeliverable(raw: string, fallback: { taskName: string; priceCents: number; audience: string }): ChallengeDeliverable {
  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
      return {
        offerName: String(parsed.offerName || `${fallback.taskName} Sprint`),
        oneLinePromise: String(parsed.oneLinePromise || `A complete ${fallback.taskName} execution package.`),
        targetBuyer: String(parsed.targetBuyer || fallback.audience),
        premiumPositioning: String(parsed.premiumPositioning || `Premium done-for-you execution for ${money(fallback.priceCents)}.`),
        landingPageCopy: String(parsed.landingPageCopy || raw),
        telegramPost: String(parsed.telegramPost || raw.slice(0, 900)),
        directMessageScript: String(parsed.directMessageScript || raw.slice(0, 900)),
        fulfillmentPlan: String(parsed.fulfillmentPlan || "Deliver the packaged output, implementation checklist, and proof log within the agreed turnaround."),
        buyerDeliverable: String(parsed.buyerDeliverable || raw),
        proofChecklist: Array.isArray(parsed.proofChecklist) ? parsed.proofChecklist.map(String) : ["Stripe checkout metadata contains challenge tracking code", "Distribution job exists", "Execution output is persisted"],
      };
    }
  } catch (_) {
    // Fall through to deterministic fallback.
  }
  return {
    offerName: `${fallback.taskName} Sprint`,
    oneLinePromise: `A complete ${fallback.taskName} execution package that turns the buyer's current bottleneck into a finished monetization asset.`,
    targetBuyer: fallback.audience,
    premiumPositioning: `Premium done-for-you execution for ${money(fallback.priceCents)} with measurable proof and a clear fulfillment checklist.`,
    landingPageCopy: raw,
    telegramPost: raw.slice(0, 900),
    directMessageScript: raw.slice(0, 900),
    fulfillmentPlan: "Deliver the finished strategy, copy, assets, implementation checklist, and proof log. No dashboard-only output counts as fulfillment.",
    buyerDeliverable: raw,
    proofChecklist: ["Execution run persisted", "Tracking code generated", "Stripe checkout metadata linked when checkout mode is used", "Telegram message id captured when send mode is used"],
  };
}

async function getDatabase() {
  const database = await db.getDb();
  if (!database) throw new Error("DATABASE_URL is not configured; challenge execution persistence is unavailable");
  return database;
}

async function ensureSchema() {
  const database = await getDatabase();
  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS challenge_execution_runs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_slug VARCHAR(160) NOT NULL,
      task_name VARCHAR(255) NOT NULL,
      mode VARCHAR(40) NOT NULL,
      price_cents INT NOT NULL DEFAULT 0,
      tracking_code VARCHAR(128) NOT NULL,
      checkout_session_id VARCHAR(255) NULL,
      checkout_url TEXT NULL,
      distribution_job_id INT NULL,
      telegram_message_id VARCHAR(80) NULL,
      deliverable_json LONGTEXT NOT NULL,
      proof_json LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_task_slug (task_slug),
      INDEX idx_tracking_code (tracking_code),
      INDEX idx_created_at (created_at)
    )
  `);
}

async function generateDeliverable(taskName: string, priceCents: number, audience: string): Promise<ChallengeDeliverable> {
  const deterministicFallback = `Offer: ${taskName} Sprint\nPrice: ${money(priceCents)}\nAudience: ${audience}\nPromise: finished, buyer-ready execution asset with proof, checkout linkage, and fulfillment checklist.`;

  if (!process.env.OPENAI_API_KEY) {
    return parseDeliverable(deterministicFallback, { taskName, priceCents, audience });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: process.env.AGENT_OPENAI_MODEL || "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: "You are a world-class revenue operator for CreatorVault. Generate buyer-ready assets only. No fluff, no reports about what could be done. Return strict JSON only.",
      },
      {
        role: "user",
        content: `Create a complete sellable deliverable for this challenge task. Task: ${taskName}. Price: ${money(priceCents)}. Audience: ${audience}. Return JSON with exactly these keys: offerName, oneLinePromise, targetBuyer, premiumPositioning, landingPageCopy, telegramPost, directMessageScript, fulfillmentPlan, buyerDeliverable, proofChecklist. The copy must be premium, specific, and worth the price.`,
      },
    ],
    response_format: { type: "json_object" } as any,
    max_tokens: 1800,
  });

  return parseDeliverable(response.choices[0]?.message?.content || deterministicFallback, { taskName, priceCents, audience });
}

async function createTrackedDistributionJob(input: {
  creatorId: number;
  taskSlug: string;
  trackingCode: string;
  caption: string;
  destinationUrl: string;
  status: "draft" | "ready" | "posted";
}): Promise<number | null> {
  try {
    const database = await getDatabase();
    const result = await database.execute(sql`
      INSERT INTO distribution_jobs
        (creator_id, channel_identity_id, platform, asset_url, asset_type, caption, tracking_code, destination_url, status, content_safety_level, brand_lane)
      VALUES
        (${input.creatorId}, 1, 'telegram', ${input.destinationUrl}, 'text', ${input.caption.slice(0, 2000)}, ${input.trackingCode}, ${input.destinationUrl}, ${input.status}, 'explicit', 'vaultx_challenge')
    `);
    const raw: any = Array.isArray(result) ? result[0] : result;
    return Number(raw?.insertId || 0) || null;
  } catch {
    return null;
  }
}

async function createStripeCheckout(input: {
  taskSlug: string;
  taskName: string;
  priceCents: number;
  trackingCode: string;
  audience: string;
}): Promise<{ sessionId: string; url: string }> {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (input.priceCents <= 0) throw new Error("Cannot create a paid checkout for a zero-price internal task");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" } as any);
  const successUrl = `${FRONTEND}/challenge/success?session_id={CHECKOUT_SESSION_ID}&tracking=${encodeURIComponent(input.trackingCode)}`;
  const cancelUrl = `${FRONTEND}/challenge?task=${encodeURIComponent(input.taskSlug)}&tracking=${encodeURIComponent(input.trackingCode)}&status=cancelled`;
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: input.priceCents,
          product_data: {
            name: input.taskName,
            description: `${input.audience}`.slice(0, 1000),
          },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      challenge_task_slug: input.taskSlug,
      challenge_task_name: input.taskName,
      challenge_tracking_code: input.trackingCode,
      agent_attribution_code: input.trackingCode,
      revenue_standard: "external_non_owner_required",
    },
    payment_intent_data: {
      metadata: {
        challenge_task_slug: input.taskSlug,
        challenge_tracking_code: input.trackingCode,
        agent_attribution_code: input.trackingCode,
        revenue_standard: "external_non_owner_required",
      },
    },
  });
  if (!session.url) throw new Error("Stripe created a checkout session without a URL");
  return { sessionId: session.id, url: session.url };
}

async function sendTelegramOffer(caption: string, checkoutUrl: string): Promise<number | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHALLENGE_CHANNEL_ID || process.env.TELEGRAM_OWNER_CHAT_ID || process.env.TELEGRAM_KINGCAM_CHAT_ID;
  if (!token || !chatId) throw new Error("Telegram token or destination is not configured");
  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `${caption}\n\nUnlock: ${checkoutUrl}`.slice(0, 3900),
      parse_mode: "HTML",
      disable_web_page_preview: false,
    }),
  });
  const data: any = await resp.json();
  if (!data?.ok) throw new Error(`Telegram send failed: ${data?.description || "unknown error"}`);
  return Number(data?.result?.message_id || 0) || null;
}

export async function runChallengeEndToEnd(input: ChallengeExecutionInput): Promise<ChallengeExecutionResult> {
  const mode = input.mode || "dry_run";
  const base = DEFAULT_TASKS[input.taskSlug] || {
    name: input.taskName || input.taskSlug.split("-").map(s => s[0]?.toUpperCase() + s.slice(1)).join(" "),
    priceCents: input.priceCents ?? 0,
    audience: input.audience || "qualified buyers who need a finished CreatorVault revenue asset",
  };
  const taskName = input.taskName || base.name;
  const priceCents = input.priceCents ?? base.priceCents;
  const audience = input.audience || base.audience;
  const creatorId = input.creatorId || 1;
  const trackingCode = `challenge_${toSlug(input.taskSlug)}_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;

  if (mode !== "dry_run" && input.requireConfirmation !== "LIVE_CHALLENGE_EXECUTION_APPROVED") {
    throw new Error("Live checkout or Telegram delivery requires requireConfirmation=LIVE_CHALLENGE_EXECUTION_APPROVED");
  }

  await ensureSchema();
  const deliverable = await generateDeliverable(taskName, priceCents, audience);

  let checkoutSessionId: string | null = null;
  let checkoutUrl: string | null = input.offerUrl || null;
  let stripeMetadataLinked = false;
  if (mode === "create_checkout" || mode === "send_telegram") {
    const checkout = await createStripeCheckout({ taskSlug: input.taskSlug, taskName, priceCents, trackingCode, audience });
    checkoutSessionId = checkout.sessionId;
    checkoutUrl = checkout.url;
    stripeMetadataLinked = true;
  }

  const destinationUrl = checkoutUrl || `${FRONTEND}/challenge?task=${encodeURIComponent(input.taskSlug)}&tracking=${encodeURIComponent(trackingCode)}`;
  const distributionJobId = await createTrackedDistributionJob({
    creatorId,
    taskSlug: input.taskSlug,
    trackingCode,
    caption: deliverable.telegramPost,
    destinationUrl,
    status: mode === "send_telegram" ? "posted" : "ready",
  });

  let telegramMessageId: number | null = null;
  if (mode === "send_telegram") {
    if (!checkoutUrl) throw new Error("Telegram send mode requires a checkout URL");
    telegramMessageId = await sendTelegramOffer(deliverable.telegramPost, checkoutUrl);
  }

  const proof = {
    generated: true,
    persisted: true,
    stripeMetadataLinked,
    deliveryLogged: Boolean(distributionJobId),
    externalDeliverySent: Boolean(telegramMessageId),
  };

  const database = await getDatabase();
  const insertResult = await database.execute(sql`
    INSERT INTO challenge_execution_runs
      (task_slug, task_name, mode, price_cents, tracking_code, checkout_session_id, checkout_url, distribution_job_id, telegram_message_id, deliverable_json, proof_json)
    VALUES
      (${input.taskSlug}, ${taskName}, ${mode}, ${priceCents}, ${trackingCode}, ${checkoutSessionId}, ${checkoutUrl}, ${distributionJobId}, ${telegramMessageId ? String(telegramMessageId) : null}, ${JSON.stringify(deliverable)}, ${JSON.stringify(proof)})
  `);
  const raw: any = Array.isArray(insertResult) ? insertResult[0] : insertResult;
  const executionRunId = Number(raw?.insertId || 0) || null;

  return {
    ok: true,
    mode,
    taskSlug: input.taskSlug,
    taskName,
    priceCents,
    trackingCode,
    checkoutSessionId,
    checkoutUrl,
    distributionJobId,
    telegramMessageId,
    executionRunId,
    deliverable,
    proof,
  };
}

export async function getRecentChallengeExecutions(limit = 20) {
  await ensureSchema();
  const database = await getDatabase();
  const rows = extractRows(await database.execute(sql`
    SELECT id, task_slug, task_name, mode, price_cents, tracking_code, checkout_session_id, checkout_url, distribution_job_id, telegram_message_id, proof_json, created_at
    FROM challenge_execution_runs
    ORDER BY id DESC
    LIMIT ${Math.max(1, Math.min(100, limit))}
  `));
  return rows.map((row: any) => ({
    ...row,
    proof: (() => { try { return JSON.parse(row.proof_json || "{}"); } catch { return {}; } })(),
    proof_json: undefined,
  }));
}
