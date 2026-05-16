#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), "utf8");
const exists = rel => fs.existsSync(path.join(root, rel));
const failures = [];

function requireIncludes(file, needle, label) {
  const body = read(file);
  if (!body.includes(needle)) failures.push(`${label}: missing ${needle} in ${file}`);
}

function requireRegex(file, regex, label) {
  const body = read(file);
  if (!regex.test(body)) failures.push(`${label}: ${regex} not satisfied in ${file}`);
}

function scanFiles(dir, predicate, out = []) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) scanFiles(rel, predicate, out);
    else if (predicate(rel)) out.push(rel);
  }
  return out;
}

// Telegram routing, quality, disabled-by-default, and frequency gates.
requireIncludes("server/services/telegramOutboundGuard.ts", "telegramPostingEnabled = process.env.TELEGRAM_POSTING_ENABLED === \"true\"", "Telegram posting disabled-by-default gate");
requireIncludes("server/services/telegramOutboundGuard.ts", "telegramAutomationEnabled = telegramPostingEnabled && process.env.TELEGRAM_AUTOMATION_ENABLED === \"true\"", "Telegram automation requires posting approval");
requireIncludes("server/services/telegramOutboundGuard.ts", "validateTelegramPayloadQuality", "Telegram payload quality gate");
requireIncludes("server/services/telegramOutboundGuard.ts", "TELEGRAM_MIN_POST_INTERVAL_MS", "Telegram minimum send interval gate");
requireIncludes("server/_core/index.ts", "telegramAutomationEnabled", "Server bootstrap automation routing gate");
requireIncludes("server/services/telegramMoneyLoop.ts", "assertTelegramPostingEnabled(\"telegramMoneyLoop.sendFreeChannelDrop\")", "Money-loop channel drop preflight gate");
requireIncludes("server/services/telegramMoneyLoop.ts", "assertTelegramPostingEnabled(\"telegramMoneyLoop.sendVipUpsell\")", "VIP upsell preflight gate");
requireIncludes("server/services/telegramMoneyLoop.ts", "assertTelegramPostingEnabled(\"telegramMoneyLoop.handleVipJoinRequest\")", "VIP join-request preflight gate");

const serverTs = scanFiles("server", rel => rel.endsWith(".ts"));
for (const rel of serverTs) {
  const body = read(rel);
  if (rel !== "server/services/telegramOutboundGuard.ts" && body.includes("https://api.telegram.org")) {
    failures.push(`Raw Telegram Bot API call outside shared guard: ${rel}`);
  }
}

// Homepage rollback guard: require the new cinematic platform showcase anchors and real asset fallbacks.
requireIncludes("client/src/pages/Home.tsx", "commandCenterReels", "Homepage video-first command center data");
requireIncludes("client/src/pages/Home.tsx", "platformUniverse", "Homepage platform-universe data");
requireIncludes("client/src/pages/Home.tsx", "Polla AI", "Homepage Polla AI replacement slot language");
requireRegex("client/src/pages/Home.tsx", /<video[\s\S]+autoPlay[\s\S]+muted[\s\S]+loop/, "Homepage contains autoplay muted loop video surfaces");

const home = read("client/src/pages/Home.tsx");
const assetRefs = [...home.matchAll(/src:\s*["'`]([^"'`]+\.(?:mp4|webm|png|jpg|jpeg))["'`]/g)].map(match => match[1]);
if (assetRefs.length < 4) failures.push(`Homepage visual slot guard: expected at least 4 verified media src references, found ${assetRefs.length}`);
for (const asset of assetRefs) {
  const relCandidates = asset.startsWith("/")
    ? [path.join("client/public", asset.slice(1)), path.join("public", asset.slice(1))]
    : [asset];
  if (!relCandidates.some(exists)) failures.push(`Homepage visual fallback missing: ${asset} -> ${relCandidates.join(" or ")}`);
}

if (failures.length) {
  console.error("EMERGENCY GUARD FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("EMERGENCY GUARD PASSED: Telegram outbound calls are gated, quality checked, rate-limited, and homepage rollback anchors/media fallbacks are present.");
