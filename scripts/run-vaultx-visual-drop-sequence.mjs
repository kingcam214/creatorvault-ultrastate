#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';

const root = process.cwd();
const telemetryPath = process.env.LIVE_MONEY_SPRINT_TELEMETRY_PATH || path.join(root, 'artifacts/challenge-runs/live-money-sprint-telemetry.json');
const manifestPath = process.env.VAULTX_VISUAL_DROP_MANIFEST || path.join(root, 'artifacts/visual-drops/vaultx-premium-asset-manifest.json');
const proofDir = path.join(root, 'artifacts/visual-drops');
const liveSend = process.env.LIVE_TELEGRAM_SEND === '1';
const recordDryRunTelemetry = process.env.VAULTX_RECORD_DRY_RUN_TELEMETRY === '1';
const token = process.env.TELEGRAM_MONETIZATION_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
const chatId = process.env.TELEGRAM_CHALLENGE_CHANNEL_ID || process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_OWNER_CHAT_ID || process.env.TELEGRAM_KINGCAM_CHAT_ID || '';
const appUrl = (process.env.APP_URL || 'https://creatorvault.live').replace(/\/$/, '');
const destination = process.env.VAULTX_DROP_DESTINATION || `${appUrl}/challenge?task=kingcam-clone-agent`;

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

function createTrackingCode(angleId, index) {
  const salt = crypto.randomBytes(3).toString('hex');
  return `vaultx_${angleId}_${Date.now().toString(36)}_${index}_${salt}`;
}

function trackedUrl(code) {
  return `${appUrl}/r/${encodeURIComponent(code)}?to=${encodeURIComponent(destination)}`;
}

function htmlEscape(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function assertPremiumDrop(drop, photoPath, caption) {
  const issues = [];
  if (!drop?.layoutQuality?.verified) issues.push('missing verified layoutQuality metadata from premium generator');
  if (drop?.layoutQuality?.width !== 1080 || drop?.layoutQuality?.height !== 1350) issues.push('asset must be 1080x1350 portrait');
  if (!fs.existsSync(photoPath)) issues.push(`missing visual asset file: ${photoPath}`);
  const assetSizeKb = fs.existsSync(photoPath) ? fs.statSync(photoPath).size / 1024 : 0;
  if (assetSizeKb < 120) issues.push(`visual asset is too small for premium detail: ${assetSizeKb.toFixed(1)} KB`);
  const forbidden = ['[object Object]', 'undefined', 'TODO', 'Lorem ipsum', 'placeholder', 'raw_output'];
  for (const token of forbidden) {
    if (caption.includes(token)) issues.push(`caption contains forbidden token: ${token}`);
  }
  for (const required of ['VIDEO-FIRST', 'Proof rail:', 'Next move:']) {
    if (!caption.includes(required)) issues.push(`caption missing premium standard marker: ${required}`);
  }
  if (caption.length < 180 || caption.length > 1024) issues.push(`caption length must fit Telegram photo caption with substance: ${caption.length}`);
  if (issues.length) throw new Error(`Premium visual drop validation failed for ${drop?.id || 'unknown'}: ${issues.join('; ')}`);
  return {
    assetSizeKb: Number(assetSizeKb.toFixed(1)),
    layoutQuality: drop.layoutQuality,
    captionLength: caption.length,
    verified: true,
  };
}

function buildCaption(drop, url, telemetry) {
  const remaining = telemetry?.remainingRevenueDollars || dollars(telemetry?.remainingRevenueCents || telemetry?.revenueTargetCents || 60000);
  const members = telemetry?.memberCount || 59;
  const line1 = `<b>${htmlEscape(drop.headline)} · VIDEO-FIRST VAULTX DROP</b>`;
  const line2 = `This is a visual platform proof, not a static flyer: the asset shows how CreatorVault packages attention into a tracked offer, reply workflow, and monetization rail.`;
  const line3 = `<b>Built for:</b> ${htmlEscape(drop.body)}`;
  const line4 = `<b>Proof rail:</b> ${members} watching · ${remaining} left to target · every click is tracked.`;
  const line5 = `<b>Next move:</b> ${htmlEscape(drop.replyCta || 'Reply VAULT if you want the next premium drop built around your lane.')}`;
  const line6 = `<a href="${htmlEscape(url)}">Open the VaultX drop</a>`;
  const caption = [line1, '', line2, '', line3, line4, '', line5, '', line6].join('\n');
  return caption.length <= 1024 ? caption : caption.slice(0, 1000) + '…';
}

function appendTelemetry(event) {
  const state = readJson(telemetryPath, {
    sprintName: 'CreatorVault 5-Hour Telegram Money Sprint',
    refreshedAt: nowIso(),
    startedAt: nowIso(),
    deadlineAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    urgencyHours: 5,
    revenueTargetCents: 60000,
    revenueTargetDollars: '$600.00',
    currentRevenueCents: 0,
    currentRevenueDollars: '$0.00',
    remainingRevenueCents: 60000,
    remainingRevenueDollars: '$600.00',
    memberCount: 59,
    telegramBlocked: false,
    counters: { outboundPosts: 0, joins: 0, replies: 0, commands: 0, purchaseIntents: 0, clicks: 0, purchases: 0, conversions: 0 },
    lastTrackingCode: null,
    lastTelegramMessageId: null,
    lastEvents: []
  });
  const normalized = {
    type: event.type,
    at: nowIso(),
    trackingCode: event.trackingCode || state.lastTrackingCode || null,
    source: event.source || 'vaultx_visual_drop_sequence',
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
  const target = Number(state.revenueTargetCents || 60000);
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

function sendPhoto({ photoPath, caption }) {
  if (!liveSend) {
    return { ok: true, dryRun: true, result: { message_id: `dry_${Date.now()}` } };
  }
  if (process.env.TELEGRAM_POSTING_ENABLED !== 'true') throw new Error('Emergency guard blocked live Telegram visual drop; set TELEGRAM_POSTING_ENABLED=true only after explicit approval');
  if (caption.length < 12 || caption.includes('[object Object]') || caption.includes('undefined') || caption.includes('TODO')) throw new Error('Emergency quality gate blocked malformed Telegram visual caption');
  if (!token) throw new Error('Missing TELEGRAM_MONETIZATION_BOT_TOKEN or TELEGRAM_BOT_TOKEN');
  if (!chatId) throw new Error('Missing TELEGRAM_CHALLENGE_CHANNEL_ID, TELEGRAM_CHANNEL_ID, TELEGRAM_OWNER_CHAT_ID, or TELEGRAM_KINGCAM_CHAT_ID');
  if (!fs.existsSync(photoPath)) throw new Error(`Missing visual asset: ${photoPath}`);
  const telegramHost = 'https://api.' + 'telegram.org';
  const result = spawnSync('curl', [
    '-sS', '-X', 'POST', `${telegramHost}/bot${token}/sendPhoto`,
    '--form-string', `chat_id=${chatId}`,
    '-F', `photo=@${photoPath}`,
    '--form-string', `caption=${caption}`,
    '--form-string', 'parse_mode=HTML',
    '--form-string', 'disable_web_page_preview=true'
  ], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`Telegram sendPhoto curl failed with status ${result.status}: ${(result.stderr || '').slice(0, 240)}`);
  }
  const raw = result.stdout || '{}';
  const parsed = JSON.parse(raw);
  if (!parsed.ok) throw new Error(parsed.description || raw);
  return parsed;
}

const manifest = readJson(manifestPath, null);
if (!manifest?.drops?.length) {
  throw new Error(`No visual drop manifest found at ${manifestPath}. Run scripts/build-vaultx-premium-assets.py first.`);
}
if (!manifest.layoutQualityGate?.dominantHeroLines || !manifest.layoutQualityGate?.copyDensity) {
  throw new Error('Premium manifest is missing strict layoutQualityGate rules; rebuild with scripts/build-vaultx-premium-assets.py.');
}

let telemetry = readJson(telemetryPath, {});
const sendLimit = Number(process.env.VAULTX_DROP_LIMIT || manifest.drops.length);
const selected = manifest.drops.slice(0, sendLimit);
const results = [];

for (let i = 0; i < selected.length; i++) {
  const drop = selected[i];
  const code = createTrackingCode(drop.id, i + 1);
  const url = trackedUrl(code);
  const caption = buildCaption(drop, url, telemetry);
  const photoPath = path.isAbsolute(drop.assetPath) ? drop.assetPath : path.join(root, drop.assetPath);
  const validation = assertPremiumDrop(drop, photoPath, caption);
  const sent = sendPhoto({ photoPath, caption });
  const messageId = sent?.result?.message_id || null;
  if (liveSend || recordDryRunTelemetry) {
    telemetry = appendTelemetry({
      type: 'outbound_post',
      trackingCode: code,
      chatId: liveSend ? chatId : 'dry_run',
      messageId,
      source: liveSend ? 'vaultx_visual_telegram_sendPhoto' : 'vaultx_visual_dry_run',
      metadata: {
        angleId: drop.id,
        headline: drop.headline,
        assetPath: photoPath,
        trackedUrl: url,
        captionLength: caption.length,
        liveSend,
        telegramOk: sent.ok === true
      }
    });
  }
  results.push({
    angleId: drop.id,
    trackingCode: code,
    trackedUrl: url,
    messageId,
    assetPath: photoPath,
    captionPreview: caption.slice(0, 360),
    liveSend,
    ok: sent.ok === true,
    validation,
  });
}

const proof = {
  generatedAt: nowIso(),
  liveSend,
  sentCount: results.length,
  maskedBotConfigured: Boolean(token),
  chatConfigured: Boolean(chatId),
  layoutQualityGate: manifest.layoutQualityGate,
  results,
  telemetry: {
    outboundPosts: telemetry.counters?.outboundPosts,
    clicks: telemetry.counters?.clicks,
    currentRevenueDollars: telemetry.currentRevenueDollars,
    remainingRevenueDollars: telemetry.remainingRevenueDollars,
    lastTrackingCode: telemetry.lastTrackingCode,
    lastTelegramMessageId: telemetry.lastTelegramMessageId
  }
};
const proofPath = path.join(proofDir, `vaultx-visual-drop-proof-${Date.now()}.json`);
writeJson(proofPath, proof);
console.log(JSON.stringify({ proofPath, ...proof }, null, 2));
