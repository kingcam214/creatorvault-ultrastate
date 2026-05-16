import { qualityGate } from "./qualityGate";

const ORIGINAL_FETCH = globalThis.fetch?.bind(globalThis);

const TELEGRAM_HOST = "api.telegram.org";
const LIVE_SENDS_ENABLED = process.env.TELEGRAM_LIVE_SENDS_ENABLED === "true";
const PREMIUM_APPROVAL = process.env.CREATORVAULT_OUTBOUND_APPROVED === "premium-reviewed";
const PROOF_ID = process.env.CREATORVAULT_OUTBOUND_PROOF_ID || "";
const REVIEWER = process.env.CREATORVAULT_OUTBOUND_REVIEWER || "";
const MIN_INTERVAL_MS = Math.max(Number(process.env.TELEGRAM_MIN_SEND_INTERVAL_MS || 15 * 60 * 1000), 15 * 60 * 1000);

const WRITE_METHODS = new Set([
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
  "createChatInviteLink",
  "approveChatJoinRequest",
  "declineChatJoinRequest",
  "answerCallbackQuery",
  "answerPreCheckoutQuery",
  "setWebhook",
  "deleteWebhook",
  "deleteMessage",
]);

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
  /we are pleased to announce|dear valued|sorry for any inconvenience|unlock your potential|limited time only!!!!|act now!!!!/i,
];

const PLATFORM_SIGNAL = /creatorvault|vaultx|creator empire|ai video|video-first|command center|campaign|funnel|platform|visual drop|creator os/i;
const OUTCOME_SIGNAL = /watch|generate|unlock|join|claim|enter|open|build|launch|review|approve/i;
const MEDIA_SIGNAL = /video|clip|reel|trailer|visual|asset|generated|drop|preview|motion/i;

let lastTelegramWriteAt = 0;

type ParsedTelegramPayload = {
  text: string;
  raw: string;
  hasMedia: boolean;
  hasCallToAction: boolean;
  hasVerifiedDestination: boolean;
};

function telegramJson(status: number, description: string): Response {
  return new Response(JSON.stringify({ ok: false, error_code: status, description }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function parseTelegramMethod(url: URL): string | null {
  const match = url.pathname.match(/\/bot[^/]+\/([^/?#]+)/);
  return match?.[1] || null;
}

function textFromBody(body: unknown): string {
  if (!body) return "";
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return Array.from(body.entries()).map(([key, value]) => `${key}=${typeof value === "string" ? value : "[file]"}`).join("&");
  }
  if (body instanceof Blob) return "[blob]";
  if (body instanceof ArrayBuffer) return "[arraybuffer]";
  return String(body);
}

function decodeMaybe(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function collectTextFromJson(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(collectTextFromJson);

  const obj = value as Record<string, unknown>;
  const pieces: string[] = [];
  for (const key of ["text", "caption", "message", "title", "description"]) {
    if (typeof obj[key] === "string") pieces.push(obj[key] as string);
  }
  for (const key of ["reply_markup", "inline_keyboard", "media"]) {
    pieces.push(...collectTextFromJson(obj[key]));
  }
  return pieces;
}

function chatIdFromBody(body: unknown): string | number | undefined {
  const raw = textFromBody(body);
  const decoded = decodeMaybe(raw);
  if (!decoded) return undefined;
  if (decoded.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(decoded) as Record<string, unknown>;
      const chatId = parsed.chat_id;
      if (typeof chatId === "string" || typeof chatId === "number") return chatId;
    } catch {}
  }
  const params = new URLSearchParams(decoded);
  return params.get("chat_id") || undefined;
}

function parseTelegramPayload(init?: RequestInit): ParsedTelegramPayload {
  const raw = textFromBody(init?.body);
  const decoded = decodeMaybe(raw);
  let text = "";

  if (decoded.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(decoded);
      text = collectTextFromJson(parsed).join("\n");
    } catch {
      text = decoded;
    }
  } else {
    const params = new URLSearchParams(decoded);
    text = [params.get("text"), params.get("caption")].filter(Boolean).join("\n");
    if (!text) text = decoded;
  }

  return {
    text: text.trim(),
    raw: decoded,
    hasMedia: /(?:video|photo|document|animation|audio|voice)=/i.test(decoded) || decoded.includes("[file]") || /https?:\/\//i.test(decoded),
    hasCallToAction: OUTCOME_SIGNAL.test(text) || /inline_keyboard|reply_markup|url=/i.test(decoded),
    hasVerifiedDestination: /https?:\/\//i.test(decoded) || /inline_keyboard|reply_markup/i.test(decoded),
  };
}

function uppercaseRatio(text: string): number {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (!letters) return 0;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  return upper / letters.length;
}

function hasApprovalState(): boolean {
  return LIVE_SENDS_ENABLED && PREMIUM_APPROVAL && /^proof-[a-z0-9-]{8,}$/i.test(PROOF_ID) && REVIEWER.trim().length >= 3;
}

function validatePremiumTelegramPayload(method: string, init?: RequestInit): string | null {
  if (!PREMIUM_METHODS.has(method)) return null;

  const payload = parseTelegramPayload(init);
  const text = payload.text;
  const isMediaMethod = method !== "sendMessage" && method !== "editMessageText";
  const minimumLength = 30;

  if (!text && !isMediaMethod) return "Blocked Telegram send: empty public copy.";
  if (text.length > 0 && text.length < minimumLength) return `Blocked Telegram send: public copy is below the CreatorVault Brand DNA floor of ${minimumLength} characters.`;
  if (text.length > 500) return "Blocked Telegram send: public copy is too long for a clean premium Telegram drop.";
  if (RAW_OR_MEDIOCRE_PATTERNS.some((pattern) => pattern.test(text))) return "Blocked Telegram send: raw, debug, placeholder, scammy, or mediocre output detected.";
  if (/[!?]{3,}|\.{4,}/.test(text)) return "Blocked Telegram send: sloppy punctuation does not meet premium standard.";
  if (uppercaseRatio(text) > 0.34) return "Blocked Telegram send: excessive all-caps styling does not meet premium standard.";
  if (!PLATFORM_SIGNAL.test(text)) return "Blocked Telegram send: missing CreatorVault/VaultX platform positioning.";
  if (!payload.hasCallToAction) return "Blocked Telegram send: missing clear premium call-to-action or review path.";
  if (isMediaMethod && !payload.hasMedia) return "Blocked Telegram send: media route has no verified media reference.";
  if (isMediaMethod && !MEDIA_SIGNAL.test(text)) return "Blocked Telegram send: media caption does not position the visual/video asset.";
  if (!payload.hasVerifiedDestination) return "Blocked Telegram send: missing verified destination, button, or review route.";

  try {
    qualityGate.check(text, {
      surface: method === "sendMessage" ? "telegram-broadcast" : "telegram",
      recipientKey: chatIdFromBody(init?.body),
      hasActionElement: payload.hasCallToAction,
      requireCreatorVaultPositioning: true,
    });
  } catch (error) {
    return error instanceof Error ? error.message : "CreatorVault Brand DNA QualityGate blocked Telegram output.";
  }

  return null;
}

function isTelegramRequest(input: RequestInfo | URL): URL | null {
  try {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    return url.hostname === TELEGRAM_HOST ? url : null;
  } catch {
    return null;
  }
}

function installTelegramOutboundFirewall() {
  if (!ORIGINAL_FETCH) return;
  if ((globalThis as any).__creatorVaultTelegramFirewallInstalled) return;
  (globalThis as any).__creatorVaultTelegramFirewallInstalled = true;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const telegramUrl = isTelegramRequest(input);
    if (!telegramUrl) return ORIGINAL_FETCH(input, init);

    const method = parseTelegramMethod(telegramUrl);
    if (!method || !WRITE_METHODS.has(method)) return ORIGINAL_FETCH(input, init);

    if (!hasApprovalState()) {
      console.warn(`[TelegramFirewall] blocked ${method}: live sends require enable flag, premium approval, reviewer, and dry-run proof id.`);
      return telegramJson(423, "CreatorVault Telegram outbound firewall: live sends disabled until premium review, reviewer identity, and dry-run proof are explicitly approved.");
    }

    const now = Date.now();
    if (now - lastTelegramWriteAt < MIN_INTERVAL_MS) {
      return telegramJson(429, "CreatorVault Telegram outbound firewall: minimum send interval has not elapsed.");
    }

    const qualityError = validatePremiumTelegramPayload(method, init);
    if (qualityError) return telegramJson(422, qualityError);

    lastTelegramWriteAt = now;
    return ORIGINAL_FETCH(input, init);
  };
}

installTelegramOutboundFirewall();

export { validatePremiumTelegramPayload, parseTelegramPayload, hasApprovalState };
