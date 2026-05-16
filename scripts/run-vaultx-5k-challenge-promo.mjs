#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';

const root = process.cwd();
const appUrl = (process.env.APP_URL || process.env.VITE_APP_URL || 'https://creatorvault.live').replace(/\/$/, '');
const telemetryPath = process.env.LIVE_MONEY_SPRINT_TELEMETRY_PATH || path.join(root, 'artifacts/challenge-runs/live-money-sprint-telemetry.json');
const outputDir = path.join(root, 'artifacts/challenge-runs');
const liveSend = process.env.LIVE_TELEGRAM_SEND === '1';
const recordDryRunTelemetry = process.env.VAULTX_RECORD_DRY_RUN_TELEMETRY === '1';
const token = process.env.TELEGRAM_MONETIZATION_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
const chatId = process.env.TELEGRAM_CHALLENGE_CHANNEL_ID || process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_OWNER_CHAT_ID || process.env.TELEGRAM_KINGCAM_CHAT_ID || '';
const confirmation = process.env.VAULTX_CHALLENGE_PROMO_CONFIRMATION || '';
const requireConfirmation = liveSend && confirmation !== 'FIRE_5K_CHALLENGE_LIVE';
const limit = Math.max(1, Number(process.env.VAULTX_CHALLENGE_PROMO_LIMIT || 99));
const lane = process.env.VAULTX_CHALLENGE_PROMO_LANE || 'all';
const challengeDisplayTargetCents = Math.max(1, Number(process.env.VAULTX_5K_CHALLENGE_TARGET_CENTS || 500000));

const TASKS = [
  { slug: 'auto-recruiter-agent', name: 'Auto-Recruiter Agent', priceCents: 39900, lane: 'recruiting', outcome: 'a monetized recruiting sequence', hook: 'Turn cold prospecting into a recruiting sequence with a clear offer, follow-up logic, and conversion path.' },
  { slug: 'money-follow-up-agent', name: 'Money Follow-Up Agent', priceCents: 34900, lane: 'cash', outcome: 'follow-up scripts for missed payments, dead leads, and unpaid opportunities', hook: 'Recover the money hiding in failed payments, unread DMs, unpaid invoices, and almost-buyers.' },
  { slug: 'brand-deal-agent', name: 'Brand Deal Agent', priceCents: 49700, lane: 'brand', outcome: 'a sponsor-ready pitch package', hook: 'Package a sponsor-ready pitch so brands can understand the offer fast.' },
  { slug: 'affiliate-marketing-agent', name: 'Affiliate Marketing Agent', priceCents: 29900, lane: 'cash', outcome: 'a tracked affiliate funnel', hook: 'Turn recommendations into a tracked affiliate funnel instead of random links.' },
  { slug: 'monetization-strategy-agent', name: 'Monetization Strategy Agent', priceCents: 39900, lane: 'strategy', outcome: 'a revenue map with offer, buyer, pricing, CTA, and fulfillment flow', hook: 'Build the actual revenue map instead of guessing what to sell next.' },
  { slug: 'engagement-agent', name: 'Engagement Agent', priceCents: 29900, lane: 'content', outcome: 'reply hooks, retention prompts, and DM starters', hook: 'Wake up a quiet audience with reply hooks, retention prompts, and DM starters.' },
  { slug: 'social-autoposter-agent', name: 'Social Media Autoposter Agent', priceCents: 19900, lane: 'content', outcome: 'scheduled post packs and captions', hook: 'Get scheduled post packs and captions that keep the market warm.' },
  { slug: 'viral-optimizer-agent', name: 'Viral Optimizer Agent', priceCents: 34900, lane: 'content', outcome: 'improved hooks, retention angles, and share triggers', hook: 'Fix hooks, retention angles, and share triggers before the next post goes out.' },
  { slug: 'vaultlive-revenue-agent', name: 'VaultLive Revenue Agent', priceCents: 19900, lane: 'live', outcome: 'a monetized live-event close flow', hook: 'Turn a live event into a monetized room with offers, prompts, and close moments.' },
  { slug: 'vaultmarket-product-agent', name: 'VaultMarket Product Agent', priceCents: 19900, lane: 'product', outcome: 'a clean sellable product or offer package', hook: 'Package a sellable offer people can understand and purchase quickly.' },
  { slug: 'kingcam-clone-agent', name: 'KingCam Clone Agent', priceCents: 49700, lane: 'operator', outcome: 'a premium operator-style execution blueprint', hook: 'Capture the operator-style system: offer energy, scripts, sequence, and execution moves.' },
  { slug: 'hollywood-show-agent', name: 'Hollywood Show Agent', priceCents: 59700, lane: 'premium', outcome: 'a premium entertainment or show concept package', hook: 'Shape a premium entertainment or show concept into a buyer- and sponsor-ready package.' },
  { slug: 'mercedes-acquisition-agent', name: 'Mercedes Acquisition Agent', priceCents: 29900, lane: 'acquisition', outcome: 'high-intent acquisition outreach', hook: 'Build high-intent acquisition outreach for buyers and sellers.' },
  { slug: 'emma-network-recruiter-agent', name: 'Emma Network Recruiter Agent', priceCents: 19700, lane: 'recruiting', outcome: 'Emma Network recruiting scripts and partner flow', hook: 'Recruit partners and prospects into the Emma Network with sharper message flow.' },
  { slug: 'emma-content-agent', name: 'Emma Content Agent', priceCents: 14900, lane: 'content', outcome: 'content packages for Emma Network creators', hook: 'Create content packages for Emma Network creators who need consistency.' },
  { slug: 'vaultmarket-commission-agent', name: 'VaultMarket Commission Agent', priceCents: 9900, lane: 'product', outcome: 'commission tracking and marketplace offer setup', hook: 'Set up commission tracking and offer logic for marketplace sellers.' },
  { slug: 'vaultu-curriculum-agent', name: 'VaultU Curriculum Agent', priceCents: 39700, lane: 'education', outcome: 'a structured curriculum that can be sold', hook: 'Turn knowledge into a structured curriculum that can be sold.' },
  { slug: 'telegram-bot-manager-agent', name: 'Telegram Bot Manager Agent', priceCents: 14900, lane: 'telegram', outcome: 'Telegram automation and conversion-flow cleanup', hook: 'Clean up Telegram automation, replies, and conversion flows.' }
];

function dollars(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function readJson(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {}
  return fallback;
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function htmlEscape(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function createTrackingCode(task, index, surface) {
  const salt = crypto.randomBytes(3).toString('hex');
  return `challenge_${task.slug}_${surface}_${Date.now().toString(36)}_${index}_${salt}`;
}

function destinationFor(task, trackingCode) {
  return `${appUrl}/challenge?task=${encodeURIComponent(task.slug)}&tracking=${encodeURIComponent(trackingCode)}`;
}

function trackedUrl(trackingCode, destination) {
  return `${appUrl}/r/${encodeURIComponent(trackingCode)}?to=${encodeURIComponent(destination)}`;
}

function readTelemetry() {
  return readJson(telemetryPath, {
    sprintName: 'CreatorVault 5-Hour Telegram Money Sprint',
    refreshedAt: nowIso(),
    startedAt: nowIso(),
    deadlineAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    urgencyHours: 5,
    revenueTargetCents: 500000,
    revenueTargetDollars: '$5,000.00',
    currentRevenueCents: 0,
    currentRevenueDollars: '$0.00',
    remainingRevenueCents: 500000,
    remainingRevenueDollars: '$5,000.00',
    memberCount: 59,
    telegramBlocked: false,
    counters: { outboundPosts: 0, joins: 0, replies: 0, commands: 0, purchaseIntents: 0, clicks: 0, purchases: 0, conversions: 0 },
    lastTrackingCode: null,
    lastTelegramMessageId: null,
    lastEvents: []
  });
}

function appendTelemetry(event, priorState = null) {
  const state = priorState || readTelemetry();
  const normalized = {
    type: event.type,
    at: nowIso(),
    trackingCode: event.trackingCode || state.lastTrackingCode || null,
    source: event.source || 'vaultx_5k_challenge_promo',
    userId: event.userId ?? null,
    chatId: event.chatId ?? null,
    messageId: event.messageId ?? null,
    revenueCents: Number(event.revenueCents || 0),
    metadata: event.metadata || {}
  };
  const counters = { outboundPosts: 0, joins: 0, replies: 0, commands: 0, purchaseIntents: 0, clicks: 0, purchases: 0, conversions: 0, ...(state.counters || {}) };
  if (normalized.type === 'outbound_post') counters.outboundPosts += 1;
  if (normalized.type === 'telegram_join') counters.joins += 1;
  if (normalized.type === 'telegram_reply') counters.replies += 1;
  if (normalized.type === 'telegram_command') counters.commands += 1;
  if (normalized.type === 'telegram_purchase_intent') counters.purchaseIntents += 1;
  if (normalized.type === 'click') counters.clicks += 1;
  if (normalized.type === 'purchase') counters.purchases += 1;
  if (normalized.type === 'conversion') counters.conversions += 1;
  const target = Number(state.revenueTargetCents || 500000);
  const revenueDelta = ['purchase', 'conversion'].includes(normalized.type) ? normalized.revenueCents : 0;
  const currentRevenueCents = Number(state.currentRevenueCents || 0) + revenueDelta;
  const next = {
    ...state,
    refreshedAt: normalized.at,
    counters,
    telegramBlocked: false,
    currentRevenueCents,
    currentRevenueDollars: dollars(currentRevenueCents),
    remainingRevenueCents: Math.max(0, target - currentRevenueCents),
    remainingRevenueDollars: dollars(Math.max(0, target - currentRevenueCents)),
    lastTrackingCode: normalized.trackingCode,
    lastTelegramMessageId: normalized.messageId || state.lastTelegramMessageId || null,
    lastEvents: [normalized, ...(state.lastEvents || [])].slice(0, 50)
  };
  writeJson(telemetryPath, next);
  return next;
}

function buildTelegramCaption(task, url, telemetry, index, total) {
  const currentRevenue = Math.max(0, Number(telemetry?.currentRevenueCents || 0));
  const displayRemainingCents = Math.max(0, challengeDisplayTargetCents - currentRevenue);
  const remaining = dollars(displayRemainingCents);
  const members = Number(telemetry?.memberCount || 59);
  const closeCount = Math.max(1, Math.ceil(displayRemainingCents / Math.max(1, task.priceCents)));
  const caption = [
    `<b>${htmlEscape(task.name)} · VIDEO-FIRST AGENT SPRINT ${index}/${total}</b>`,
    '',
    `CreatorVault is not dropping a static prompt. This is a paid sprint that turns the bottleneck into a finished execution asset with checkout, reply workflow, and operator proof attached.`,
    '',
    `<b>Visual lane:</b> AI Video Lab / VaultX campaign system.`,
    `<b>Built for:</b> ${htmlEscape(task.outcome)}.`,
    `<b>Proof rail:</b> ${members} watching · ${htmlEscape(remaining)} left to the $5K target · ${closeCount} unlocks at this level can move the board fast.`,
    '',
    `<b>Next move:</b> unlock the sprint, then reply <b>READY</b> so fulfillment can start with the asset path already tracked.`,
    '',
    `<a href="${htmlEscape(url)}">Unlock ${htmlEscape(task.name)} now</a>`
  ].join('\n');
  return caption.length <= 3900 ? caption : caption.slice(0, 3860) + '…';
}

function buildWhatsappMessage(task, url) {
  return `Quick business note: CreatorVault is running a video-first $5K AI Agent Challenge today. The ${task.name} sprint is built for ${task.outcome}, priced at ${dollars(task.priceCents)}, and packaged as a finished execution asset instead of a static prompt. Open it here: ${url}. If you unlock it, reply READY so fulfillment can start. If this is not relevant, reply stop and I will not follow up on this challenge.`;
}

function buildTelegramDmMessage(task, url) {
  return `CreatorVault is live with a video-first agent sprint. I would point you to ${task.name} at ${dollars(task.priceCents)} because it is designed for ${task.outcome}. This is a tracked execution asset, not a static prompt. Unlock: ${url}. After purchase, reply READY so fulfillment can start.`;
}

function sendMessage(caption) {
  if (!liveSend) {
    return { ok: true, dryRun: true, result: { message_id: `dry_${Date.now()}` } };
  }
  if (process.env.TELEGRAM_POSTING_ENABLED !== 'true') throw new Error('Emergency guard blocked live Telegram send; set TELEGRAM_POSTING_ENABLED=true only after explicit approval');
  if (caption.length < 12 || caption.includes('[object Object]') || caption.includes('undefined') || caption.includes('TODO')) throw new Error('Emergency quality gate blocked malformed Telegram caption');
  if (requireConfirmation) throw new Error('Live send requires VAULTX_CHALLENGE_PROMO_CONFIRMATION=FIRE_5K_CHALLENGE_LIVE');
  if (!token) throw new Error('Missing TELEGRAM_MONETIZATION_BOT_TOKEN or TELEGRAM_BOT_TOKEN');
  if (!chatId) throw new Error('Missing TELEGRAM_CHALLENGE_CHANNEL_ID, TELEGRAM_CHANNEL_ID, TELEGRAM_OWNER_CHAT_ID, or TELEGRAM_KINGCAM_CHAT_ID');
  const telegramHost = 'https://api.' + 'telegram.org';
  const result = spawnSync('curl', [
    '-sS', '-X', 'POST', `${telegramHost}/bot${token}/sendMessage`,
    '-H', 'Content-Type: application/json',
    '--data-binary', JSON.stringify({
      chat_id: chatId,
      text: caption,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    })
  ], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Telegram sendMessage curl failed with status ${result.status}: ${(result.stderr || '').slice(0, 240)}`);
  const parsed = JSON.parse(result.stdout || '{}');
  if (!parsed.ok) throw new Error(parsed.description || result.stdout || 'Telegram send failed');
  return parsed;
}

fs.mkdirSync(outputDir, { recursive: true });
let telemetry = readTelemetry();
const selected = TASKS.filter(task => lane === 'all' || task.lane === lane).slice(0, limit);
if (!selected.length) throw new Error(`No challenge tasks selected for lane=${lane}`);

const telegramRows = [];
const whatsappRows = [['agent_slug', 'agent_name', 'price', 'lane', 'tracked_url', 'whatsapp_business_message', 'telegram_manual_dm']];
const manifest = [];

for (let i = 0; i < selected.length; i++) {
  const task = selected[i];
  const trackingCode = createTrackingCode(task, i + 1, liveSend ? 'tg' : 'dry');
  const destination = destinationFor(task, trackingCode);
  const url = trackedUrl(trackingCode, destination);
  const caption = buildTelegramCaption(task, url, telemetry, i + 1, selected.length);
  const sent = sendMessage(caption);
  const messageId = sent?.result?.message_id || null;
  if (liveSend || recordDryRunTelemetry) {
    telemetry = appendTelemetry({
      type: 'outbound_post',
      trackingCode,
      chatId: liveSend ? chatId : 'dry_run',
      messageId,
      source: liveSend ? 'vaultx_5k_challenge_telegram_live' : 'vaultx_5k_challenge_dry_run',
      metadata: {
        taskSlug: task.slug,
        taskName: task.name,
        priceCents: task.priceCents,
        price: dollars(task.priceCents),
        lane: task.lane,
        trackedUrl: url,
        destination,
        captionLength: caption.length,
        liveSend,
        telegramOk: sent.ok === true
      }
    }, telemetry);
  }
  telegramRows.push({ taskSlug: task.slug, taskName: task.name, price: dollars(task.priceCents), trackingCode, trackedUrl: url, messageId, caption, liveSend, ok: sent.ok === true });
  whatsappRows.push([task.slug, task.name, dollars(task.priceCents), task.lane, url, buildWhatsappMessage(task, url), buildTelegramDmMessage(task, url)]);
  manifest.push({ ...task, price: dollars(task.priceCents), trackingCode, destination, trackedUrl: url, caption, whatsappBusinessMessage: buildWhatsappMessage(task, url), telegramManualDm: buildTelegramDmMessage(task, url), messageId, liveSend, ok: sent.ok === true });
}

const stamp = Date.now();
const manifestPath = path.join(outputDir, `vaultx-5k-challenge-promo-manifest-${stamp}.json`);
const whatsappCsvPath = path.join(outputDir, `vaultx-5k-whatsapp-business-outreach-${stamp}.csv`);
const telegramPreviewPath = path.join(outputDir, `vaultx-5k-telegram-preview-${stamp}.md`);
const proofPath = path.join(outputDir, `vaultx-5k-challenge-promo-proof-${stamp}.json`);

writeJson(manifestPath, { generatedAt: nowIso(), liveSend, lane, selectedCount: selected.length, appUrl, telemetryPath, challengeDisplayTargetCents, challengeDisplayTargetDollars: dollars(challengeDisplayTargetCents), tasks: manifest });
fs.writeFileSync(whatsappCsvPath, whatsappRows.map(row => row.map(csvEscape).join(',')).join('\n') + '\n');
fs.writeFileSync(telegramPreviewPath, telegramRows.map((row, idx) => `## ${idx + 1}. ${row.taskName} (${row.price})\n\n**Tracking:** ${row.trackingCode}\n\n**URL:** ${row.trackedUrl}\n\n${row.caption.replace(/<[^>]+>/g, '')}\n`).join('\n---\n\n'));

const proof = {
  generatedAt: nowIso(),
  liveSend,
  lane,
  sentCount: selected.length,
  maskedBotConfigured: Boolean(token),
  chatConfigured: Boolean(chatId),
  confirmationRequired: Boolean(requireConfirmation),
  outputs: { manifestPath, whatsappCsvPath, telegramPreviewPath },
  results: telegramRows.map(({ caption, ...rest }) => ({ ...rest, captionLength: caption.length })),
  telemetry: {
    outboundPosts: telemetry.counters?.outboundPosts,
    clicks: telemetry.counters?.clicks,
    purchases: telemetry.counters?.purchases,
    conversions: telemetry.counters?.conversions,
    currentRevenueDollars: telemetry.currentRevenueDollars,
    remainingRevenueDollars: telemetry.remainingRevenueDollars,
    lastTrackingCode: telemetry.lastTrackingCode,
    lastTelegramMessageId: telemetry.lastTelegramMessageId,
    telemetryPath
  }
};
writeJson(proofPath, proof);
console.log(JSON.stringify({ proofPath, ...proof }, null, 2));
