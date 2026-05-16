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
]) {
  if (!firewall.includes(token)) fail(`telegramOutboundFirewall.ts is missing required gate token: ${token}`);
}

const hasApprovalStateSource = firewall.match(/function hasApprovalState\(\): boolean \{([\s\S]*?)\n\}/)?.[1] || "";
for (const token of ["LIVE_SENDS_ENABLED", "PREMIUM_APPROVAL", "PROOF_ID", "REVIEWER", "proof-[a-z0-9-]{8,}", "length >= 3"]) {
  if (!hasApprovalStateSource.includes(token)) fail(`hasApprovalState is missing required approval token: ${token}`);
}

for (const pattern of [
  /RAW_OR_MEDIOCRE_PATTERNS/s,
  /minimumLength\s*=\s*isMediaMethod\s*\?\s*120\s*:\s*160/s,
  /PLATFORM_SIGNAL\.test\(text\)/s,
  /payload\.hasCallToAction/s,
  /payload\.hasVerifiedDestination/s,
  /MEDIA_SIGNAL\.test\(text\)/s,
  /uppercaseRatio\(text\)\s*>\s*0\.34/s,
]) {
  if (!pattern.test(firewall)) fail(`telegramOutboundFirewall.ts is missing premium validator pattern: ${pattern}`);
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

const rawLiveEnableMatches = [];
for (const file of [...walk("server"), ...walk("client/src")]) {
  const source = read(file);
  if (/TELEGRAM_LIVE_SENDS_ENABLED\s*=\s*["']?true/i.test(source)) rawLiveEnableMatches.push(file);
}
if (rawLiveEnableMatches.length) {
  fail(`Live Telegram sends must not be hard-enabled in source: ${rawLiveEnableMatches.join(", ")}`);
}

const packageJson = JSON.parse(read("package.json"));
for (const script of ["telegram:dry-run-proof", "quality-governor"]) {
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
  },
}, null, 2));
