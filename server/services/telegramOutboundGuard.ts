const TELEGRAM_MIN_POST_INTERVAL_MS = Math.max(30_000, Number(process.env.TELEGRAM_MIN_POST_INTERVAL_MS || 300_000));
let lastTelegramOutboundAt = 0;

export const telegramPostingEnabled = process.env.TELEGRAM_POSTING_ENABLED === "true";
export const telegramAutomationEnabled = telegramPostingEnabled && process.env.TELEGRAM_AUTOMATION_ENABLED === "true";

export function assertTelegramPostingEnabled(context: string) {
  if (!telegramPostingEnabled) {
    throw new Error(`[TelegramGuard] blocked outbound Telegram operation from ${context}; set TELEGRAM_POSTING_ENABLED=true only after explicit quality approval`);
  }
}

function validateTelegramPayloadQuality(method: string, body: Record<string, unknown> | undefined, context: string) {
  if (!body) return;
  const textLike = [body.text, body.caption].filter(value => typeof value === "string") as string[];
  const combinedText = textLike.join("\n").trim();
  const blockedFragments = ["[object Object]", "undefined", "NaN", "```json", "{\"", "raw_output", "TODO", "Lorem ipsum"];

  if ((method === "sendMessage" || method === "sendPhoto" || method === "sendVideo") && combinedText.length < 12) {
    throw new Error(`[TelegramQualityGate] blocked ${context}; message/caption is empty or too short for a public send`);
  }

  for (const fragment of blockedFragments) {
    if (combinedText.includes(fragment)) {
      throw new Error(`[TelegramQualityGate] blocked ${context}; payload contains forbidden raw or placeholder fragment: ${fragment}`);
    }
  }

  const mediaUrl = body.video || body.photo || body.document;
  if (mediaUrl && typeof mediaUrl === "string" && !/^https?:\/\//.test(mediaUrl)) {
    throw new Error(`[TelegramQualityGate] blocked ${context}; media URL must be an absolute http(s) URL`);
  }
}

export async function callTelegramApiWithGuard<T = any>(params: {
  botToken: string;
  method: string;
  body?: Record<string, unknown>;
  context: string;
  minIntervalMs?: number;
  allowReadOnly?: boolean;
}): Promise<T> {
  const readOnlyMethods = new Set(["getMe", "getChat", "getUpdates"]);
  const isReadOnly = params.allowReadOnly === true || readOnlyMethods.has(params.method);
  if (!isReadOnly) {
    assertTelegramPostingEnabled(params.context);
    validateTelegramPayloadQuality(params.method, params.body, params.context);
  }
  if (!params.botToken) throw new Error(`[TelegramGuard] missing bot token for ${params.context}`);

  if (!isReadOnly) {
    const minIntervalMs = Math.max(30_000, Number(params.minIntervalMs || TELEGRAM_MIN_POST_INTERVAL_MS));
    const elapsed = Date.now() - lastTelegramOutboundAt;
    if (elapsed < minIntervalMs) {
      const waitMs = minIntervalMs - elapsed;
      console.warn(`[TelegramGuard] delaying ${params.context} by ${waitMs}ms to enforce minimum outbound spacing`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }

  const response = await fetch(`https://api.telegram.org/bot${params.botToken}/${params.method}`, {
    method: params.body ? "POST" : "GET",
    headers: params.body ? { "Content-Type": "application/json" } : undefined,
    body: params.body ? JSON.stringify(params.body) : undefined,
  });

  if (!isReadOnly) lastTelegramOutboundAt = Date.now();
  return response.json() as Promise<T>;
}

export function logTelegramAutomationDisabled(context: string) {
  console.warn(`[TelegramGuard] ${context} not started. Telegram automation is disabled by default; require TELEGRAM_POSTING_ENABLED=true and TELEGRAM_AUTOMATION_ENABLED=true after approval.`);
}
