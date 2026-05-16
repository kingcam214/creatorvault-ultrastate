#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function walk(directory, extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"])) {
  const absolute = path.join(root, directory);
  if (!fs.existsSync(absolute)) return [];
  const out = [];
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (["node_modules", "dist", ".git"].includes(entry.name)) continue;
    const entryPath = path.join(absolute, entry.name);
    if (entry.isDirectory()) out.push(...walk(path.relative(root, entryPath), extensions));
    else if (extensions.has(path.extname(entry.name))) out.push(path.relative(root, entryPath));
  }
  return out;
}

function executableImports(source) {
  return source.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("//") && line.startsWith("import "));
}

const bootstrap = read("server/_core/index.ts");
const imports = executableImports(bootstrap).filter((line) => line !== 'import "dotenv/config";');
const firstProductionImport = imports[0];
if (!firstProductionImport?.includes("../services/telegramOutboundFirewall")) {
  fail("server/_core/index.ts must import telegramOutboundFirewall before every production import, with only dotenv/config allowed before it.");
}

const firewall = read("server/services/telegramOutboundFirewall.ts");
const qualityGate = read("server/services/qualityGate.ts");
const brandLaw = read("BRAND_DNA_QUALITY_LAW.md");
const messagingLaw = read("MESSAGING_DNA_LAW.md");
const creatorBible = read("CREATORVAULT_BIBLE.md");
for (const token of [
  "TELEGRAM_LIVE_SENDS_ENABLED",
  "CREATORVAULT_OUTBOUND_APPROVED",
  "CREATORVAULT_OUTBOUND_PROOF_ID",
  "CREATORVAULT_OUTBOUND_REVIEWER",
  "premium-reviewed",
  "proof-[a-z0-9-]{8,}",
  "Math.max(Number(process.env.TELEGRAM_MIN_SEND_INTERVAL_MS",
  "15 * 60 * 1000",
  "globalThis.fetch",
  "validatePremiumTelegramPayload",
  "parseTelegramPayload",
  "hasApprovalState",
  "qualityGate.check",
]) {
  if (!firewall.includes(token)) fail(`telegramOutboundFirewall.ts is missing required gate token: ${token}`);
}

const hasApprovalStateSource = firewall.match(/function hasApprovalState\(\): boolean \{([\s\S]*?)\n\}/)?.[1] || "";
for (const token of ["LIVE_SENDS_ENABLED", "PREMIUM_APPROVAL", "PROOF_ID", "REVIEWER", "proof-[a-z0-9-]{8,}", "length >= 3"]) {
  if (!hasApprovalStateSource.includes(token)) fail(`hasApprovalState is missing required approval token: ${token}`);
}

for (const pattern of [
  /RAW_OR_MEDIOCRE_PATTERNS/s,
  /minimumLength\s*=\s*30/s,
  /PLATFORM_SIGNAL\.test\(text\)/s,
  /payload\.hasCallToAction/s,
  /payload\.hasVerifiedDestination/s,
  /MEDIA_SIGNAL\.test\(text\)/s,
  /uppercaseRatio\(text\)\s*>\s*0\.34/s,
]) {
  if (!pattern.test(firewall)) fail(`telegramOutboundFirewall.ts is missing premium validator pattern: ${pattern}`);
}

for (const token of [
  "BRAND_DNA_QUALITY_LAW.md",
  "brandVoicePrompt()",
  "reviewPrompt(message",
  "tryCheck(message",
  "check(message",
  "tryCheckVisual(imageUrl",
  "checkVisual(imageUrl",
  "MAX_TELEGRAM_BROADCAST_LENGTH = 500",
  "MAX_TELEGRAM_SENTENCES = 4",
  "DEDUPE_WINDOW_MS",
  "isQuietHoursDallas",
  "CREATORVAULT_POSITIONING_PATTERN",
  "MESSAGING_DNA_LAW.md",
  "messagingDnaPrompt(context",
  "withCreatorVaultMessagingDna",
  "REPEATED_VAULTX_CTA_PATTERN",
  "RAW_PROMPT_LEAK_PATTERN",
  "PUBLIC_TEST_PATTERN",
  "VALUE_MECHANISM_PATTERN",
  "VAULTX_MECHANISM_PATTERN",
  "CHALLENGE_MOMENTUM_PATTERN",
  "MAX_WHATSAPP_PUBLIC_LENGTH = 420",
]) {
  if (!qualityGate.includes(token)) fail(`qualityGate.ts is missing Brand DNA enforcement token: ${token}`);
}

for (const token of [
  "Before generating any public-facing content",
  "KingCam",
  "CreatorVault",
  "A$AP Rocky",
  "Apple",
  "Dior",
]) {
  if (!brandLaw.includes(token)) fail(`BRAND_DNA_QUALITY_LAW.md is missing required brand-law token: ${token}`);
}

for (const token of [
  "VaultX",
  "Telegram",
  "WhatsApp",
  "AI Agent Challenge",
  "VaultX Challenge",
  "money mechanism",
  "tracked click",
  "VIP route",
  "No generic filler",
]) {
  if (!messagingLaw.includes(token)) fail(`MESSAGING_DNA_LAW.md is missing required messaging-law token: ${token}`);
}

if (!creatorBible.includes("BRAND DNA QUALITY LAW") || !creatorBible.includes("BRAND_DNA_QUALITY_LAW.md")) {
  fail("CREATORVAULT_BIBLE.md must make BRAND_DNA_QUALITY_LAW.md a required pre-read for public-facing content.");
}

const serverFiles = walk("server");
const telegramTouchpoints = serverFiles.filter((file) => read(file).includes("api.telegram.org"));
const bypassFiles = [];
for (const file of telegramTouchpoints) {
  const source = read(file);
  if (file === "server/services/telegramOutboundFirewall.ts") continue;
  if (/axios\s*\.|node-fetch|new\s+TelegramBot/i.test(source)) bypassFiles.push(file);
  if (!/fetch\s*\(/.test(source)) bypassFiles.push(file);
}

if (telegramTouchpoints.length < 20) {
  fail(`Expected the Telegram audit to see the production sender surface; only found ${telegramTouchpoints.length} Telegram touchpoint files.`);
}

if (bypassFiles.length) {
  fail(`Telegram sender files bypass the global fetch firewall: ${[...new Set(bypassFiles)].join(", ")}`);
}

const sendHelperFiles = serverFiles.filter((file) => /sendTelegramMessage\s*\(/.test(read(file)) || /function sendTelegramMessage/.test(read(file)));
const unwrappedSendHelpers = [];
for (const file of sendHelperFiles) {
  const source = read(file);
  if (file === "server/services/telegramOutboundFirewall.ts") continue;
  if (!source.includes("qualityGate.check")) unwrappedSendHelpers.push(file);
}
if (unwrappedSendHelpers.length) {
  fail(`Telegram sendTelegramMessage helpers must call qualityGate.check before sending: ${[...new Set(unwrappedSendHelpers)].join(", ")}`);
}

const visualTouchpointFiles = serverFiles.filter((file) => /(sendPhoto|sendVideo|generateImage|imageUrl|Replicate|replicate)/i.test(read(file)));
const visualGateFiles = visualTouchpointFiles.filter((file) => read(file).includes("qualityGate.checkVisual") || read(file).includes("tryCheckVisual"));
if (visualGateFiles.length < 2) {
  fail("Expected at least two visual posting/generation surfaces to enforce qualityGate.checkVisual or tryCheckVisual.");
}

const messagingCriticalFiles = [
  "server/services/creatorTools.ts",
  "server/services/telegramMoneyLoop.ts",
  "server/routers/telegramFunnelRouter.ts",
  "server/routers/challengeAutomationRouter.ts",
  "server/services/checkoutBot.ts",
];
for (const file of messagingCriticalFiles) {
  const source = read(file);
  if (!source.includes("qualityGate.check")) fail(`${file} must validate public/channel copy through qualityGate.check.`);
  if (!source.includes("withCreatorVaultMessagingDna") && !source.includes("requireMessagingDna")) fail(`${file} must inject or require CreatorVault Messaging DNA.`);
}

const creatorTools = read("server/services/creatorTools.ts");
for (const banned of ["Include emojis and formatting", "using Telegram markdown", "viral content expert", "WhatsApp marketing expert"] ) {
  if (creatorTools.includes(banned)) fail(`creatorTools.ts still contains generic/pre-law prompt language: ${banned}`);
}
for (const token of ["generateTelegramBroadcast", "generateWhatsAppCampaign", "withCreatorVaultMessagingDna", "qualityGate.check", "telegram-broadcast", "whatsapp"]) {
  if (!creatorTools.includes(token)) fail(`creatorTools.ts is missing Messaging DNA generator enforcement token: ${token}`);
}

const rawLiveEnableMatches = [];
for (const file of [...walk("server"), ...walk("client/src")]) {
  const source = read(file);
  if (/TELEGRAM_LIVE_SENDS_ENABLED\s*=\s*["']?true/i.test(source)) rawLiveEnableMatches.push(file);
}
if (rawLiveEnableMatches.length) {
  fail(`Live Telegram sends must not be hard-enabled in source: ${rawLiveEnableMatches.join(", ")}`);
}

const packageJson = JSON.parse(read("package.json"));
for (const script of ["telegram:dry-run-proof", "quality-governor", "brand-law:verify", "messaging-dna:verify"]) {
  if (!packageJson.scripts?.[script]) fail(`package.json missing script: ${script}`);
}

const proofScript = read("scripts/telegram-dry-run-proof.mjs");
for (const token of ["premium-reviewed-dry-run-only", "liveSendPerformed: false", "CREATORVAULT_OUTBOUND_PROOF_ID", "No Telegram message was sent."]) {
  if (!proofScript.includes(token)) fail(`telegram-dry-run-proof.mjs missing dry-run proof token: ${token}`);
}

if (failures.length) {
  console.error("Quality governor failed:");
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  checked: {
    firewallFirstImport: true,
    telegramTouchpointFiles: telegramTouchpoints.length,
    bypassFiles: 0,
    approvalStateEnforced: true,
    premiumValidatorsEnforced: true,
    dryRunProofGenerator: true,
    brandLawLoaded: true,
    qualityGateEnforced: true,
    wrappedTelegramSendHelpers: sendHelperFiles.length - unwrappedSendHelpers.length,
    visualGateFiles: visualGateFiles.length,
    messagingDnaLawLoaded: true,
    messagingCriticalFiles: messagingCriticalFiles.length,
  },
}, null, 2));
