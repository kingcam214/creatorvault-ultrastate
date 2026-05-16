#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PREMIUM_METHODS = new Set([
  "sendMessage",
  "sendPhoto",
  "sendVideo",
  "sendDocument",
  "sendAnimation",
  "sendAudio",
  "sendVoice",
  "sendMediaGroup",
  "editMessageText",
  "editMessageCaption",
]);

const RAW_OR_MEDIOCRE_PATTERNS = [
  /\[object Object\]/i,
  /\bundefined\b|\bnull\b|\bNaN\b/i,
  /TODO|FIXME|placeholder|lorem ipsum|dummy|sample caption|test message|coming soon/i,
  /debug|stack trace|console\.log|raw output|raw response|json payload/i,
  /```|<script|SELECT \* FROM|curl -X/i,
  /(?:^|\s)(lol|lmao|idk|yo\b|bro\b|tap in\b|fire drop\b|quick drop\b)/i,
  /\b(make money fast|get rich quick|guaranteed income|easy cash)\b/i,
];

const PLATFORM_SIGNAL = /creatorvault|vaultx|creator empire|ai video|video-first|command center|campaign|funnel|platform|visual drop|creator os/i;
const OUTCOME_SIGNAL = /watch|generate|unlock|join|claim|enter|open|build|launch|review|approve/i;
const MEDIA_SIGNAL = /video|clip|reel|trailer|visual|asset|generated|drop|preview|motion/i;

function printUsageAndExit() {
  console.error(`Usage:
  node scripts/telegram-dry-run-proof.mjs --payload artifacts/campaign.json --reviewer "Name"

Payload JSON must include:
  {
    "method": "sendMessage" | "sendVideo" | "sendPhoto" | ...,
    "text": "premium public copy",
    "caption": "premium media caption if applicable",
    "mediaUrl": "https://... optional for media routes",
    "destinationUrl": "https://... or review path",
    "campaignId": "real campaign identifier"
  }`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--payload") args.payload = argv[++index];
    else if (token === "--reviewer") args.reviewer = argv[++index];
    else if (token === "--help" || token === "-h") printUsageAndExit();
  }
  return args;
}

function uppercaseRatio(text) {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (!letters) return 0;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  return upper / letters.length;
}

function validatePremiumPayload(payload) {
  const method = String(payload.method || "sendMessage");
  if (!PREMIUM_METHODS.has(method)) return `Unsupported premium Telegram method for proof: ${method}`;

  const text = String(payload.text || payload.caption || "").trim();
  const raw = JSON.stringify(payload);
  const isMediaMethod = method !== "sendMessage" && method !== "editMessageText";
  const minimumLength = isMediaMethod ? 120 : 160;
  const hasMedia = Boolean(payload.mediaUrl || payload.photo || payload.video || payload.document || payload.animation || payload.audio || payload.voice || /https?:\/\//i.test(raw));
  const hasDestination = Boolean(payload.destinationUrl || payload.reviewUrl || /https?:\/\//i.test(raw) || payload.reply_markup || payload.inlineKeyboard);
  const hasCallToAction = OUTCOME_SIGNAL.test(text) || Boolean(payload.reply_markup || payload.inlineKeyboard || payload.destinationUrl || payload.reviewUrl);

  if (!text && !isMediaMethod) return "Blocked proof: empty public copy.";
  if (text.length > 0 && text.length < minimumLength) return `Blocked proof: public copy is below the CreatorVault premium floor of ${minimumLength} characters.`;
  if (text.length > 1200) return "Blocked proof: public copy is too long for a clean premium drop.";
  if (RAW_OR_MEDIOCRE_PATTERNS.some((pattern) => pattern.test(text))) return "Blocked proof: raw, debug, placeholder, scammy, or mediocre output detected.";
  if (/[!?]{3,}|\.{4,}/.test(text)) return "Blocked proof: sloppy punctuation does not meet premium standard.";
  if (uppercaseRatio(text) > 0.34) return "Blocked proof: excessive all-caps styling does not meet premium standard.";
  if (!PLATFORM_SIGNAL.test(text)) return "Blocked proof: missing CreatorVault/VaultX platform positioning.";
  if (!hasCallToAction) return "Blocked proof: missing clear premium call-to-action or review path.";
  if (isMediaMethod && !hasMedia) return "Blocked proof: media route has no verified media reference.";
  if (isMediaMethod && !MEDIA_SIGNAL.test(text)) return "Blocked proof: media caption does not position the visual/video asset.";
  if (!hasDestination) return "Blocked proof: missing verified destination, button, or review route.";
  return null;
}

const args = parseArgs(process.argv.slice(2));
if (!args.payload || !args.reviewer) printUsageAndExit();

const reviewer = String(args.reviewer).trim();
if (reviewer.length < 3) {
  console.error("Reviewer name must be at least 3 characters.");
  process.exit(2);
}

const payloadPath = path.resolve(args.payload);
if (!fs.existsSync(payloadPath)) {
  console.error(`Payload file not found: ${payloadPath}`);
  process.exit(2);
}

const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
const validationError = validatePremiumPayload(payload);
if (validationError) {
  console.error(validationError);
  process.exit(1);
}

const payloadCanonical = JSON.stringify(payload, Object.keys(payload).sort(), 2);
const payloadSha256 = crypto.createHash("sha256").update(payloadCanonical).digest("hex");
const proofId = `proof-${crypto.randomUUID()}`;
const createdAt = new Date().toISOString();
const artifactDir = path.resolve("artifacts/quality-lockdown/proofs");
fs.mkdirSync(artifactDir, { recursive: true });
const artifactPath = path.join(artifactDir, `${proofId}.json`);

const proof = {
  proofId,
  createdAt,
  reviewer,
  status: "premium-reviewed-dry-run-only",
  payloadPath,
  payloadSha256,
  method: payload.method || "sendMessage",
  campaignId: payload.campaignId || null,
  gates: {
    premiumCopyValidated: true,
    mediaReferenceValidated: true,
    liveSendPerformed: false,
    requiresRuntimeApprovalState: true,
  },
  reactivationEnv: {
    TELEGRAM_LIVE_SENDS_ENABLED: "true",
    CREATORVAULT_OUTBOUND_APPROVED: "premium-reviewed",
    CREATORVAULT_OUTBOUND_PROOF_ID: proofId,
    CREATORVAULT_OUTBOUND_REVIEWER: reviewer,
  },
};

fs.writeFileSync(artifactPath, `${JSON.stringify(proof, null, 2)}\n`);
console.log(`Dry-run proof created: ${artifactPath}`);
console.log("No Telegram message was sent.");
console.log("Set all four environment variables together only after final human approval:");
console.log(`TELEGRAM_LIVE_SENDS_ENABLED=true`);
console.log(`CREATORVAULT_OUTBOUND_APPROVED=premium-reviewed`);
console.log(`CREATORVAULT_OUTBOUND_PROOF_ID=${proofId}`);
console.log(`CREATORVAULT_OUTBOUND_REVIEWER=${reviewer.replace(/\n/g, " ")}`);
