export type QualitySurface =
  | "telegram"
  | "telegram-broadcast"
  | "telegram-dm"
  | "visual"
  | "agent-report"
  | "email"
  | "landing-page"
  | "notification"
  | "agent-public-output";

export type QualityGateOptions = {
  surface?: QualitySurface;
  recipientKey?: string | number;
  now?: Date;
  hasActionElement?: boolean;
  allowInternalReport?: boolean;
  requireCreatorVaultPositioning?: boolean;
};

export type VisualGateOptions = {
  width?: number;
  height?: number;
  textElementCount?: number;
  paddingPx?: number;
  contrastRatio?: number;
  hasTextOverlap?: boolean;
  backgroundColor?: string;
  usesDarkOverlay?: boolean;
  prompt?: string;
  publicPost?: boolean;
};

export type QualityGateResult = {
  ok: boolean;
  surface: QualitySurface;
  approvedText?: string;
  violations: string[];
};

const BRAND_LAW_PATH = "BRAND_DNA_QUALITY_LAW.md";
const MIN_PUBLIC_MESSAGE_LENGTH = 30;
const MAX_TELEGRAM_BROADCAST_LENGTH = 500;
const MAX_TELEGRAM_SENTENCES = 4;
const DEDUPE_WINDOW_MS = 48 * 60 * 60 * 1000;

const PLACEHOLDER_PATTERN = /\[(?:name|amount|\$x|link|button|cta|price|url|insert|placeholder|one specific thing)\]|TODO|FIXME|placeholder|lorem ipsum|dummy|sample\s+(?:text|caption|message)|coming soon/gi;
const RAW_MARKDOWN_PATTERN = /(?:^|\s)(?:#{1,6}\s|\*\*|\*{3,}|```|__|>-\s)/;
const RAW_INTERNAL_PATTERN = /raw gpt|raw output|internal agent report|stack trace|debug|console\.log|undefined|null|\[object Object\]|json payload/i;
const CORPORATE_PATTERN = /we are pleased to announce|dear valued|sorry for any inconvenience|unlock your potential|amazing results|limited time only!!!!|act now!!!!|our cutting-edge solution|seamless experience/i;
const DESPERATE_PATTERN = /don't miss out|last chance!!!!|guaranteed income|get rich quick|make money fast|easy cash|risk-free fortune/i;
const CTA_PATTERN = /\b(?:tap|unlock|open|join|claim|watch|review|enter|build|launch|get|start|reply|send|book|lock in|see|visit|click|access)\b|https?:\/\/|\[[^\]]*\]|inline_keyboard|button|url=/i;
const CREATORVAULT_POSITIONING_PATTERN = /creatorvault|vaultx|vaultmoney|kingcam|creator os|creator operating system|creator platform|paid tier|subscription system|telegram funnel|automated follow-up|visual drop|command center|vip access|creatorbot/i;
const BRAND_VOICE_SIGNAL = /creator|income|subscriber|vault|drop|system|platform|funnel|automated|unlock|build|launch|win|premium|founder|setup/i;
const LIGHT_OR_GENERIC_VISUAL_PATTERN = /white background|light mode|generic blue|generic green|gray background|grey background|stock photo|corporate/i;
const REQUIRED_VISUAL_STYLE_PATTERN = /#0A0A0A|near black|dark luxury|black background|cinematic|dramatic|rim lighting|#00D9FF|cyan|#C9A84C|gold|editorial|premium/i;

function sentenceCount(text: string): number {
  const normalized = text.replace(/https?:\/\/\S+/g, "").trim();
  if (!normalized) return 0;
  const matches = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  return matches?.filter(Boolean).length || 1;
}

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function duplicateKey(text: string, recipientKey?: string | number): string {
  return `${recipientKey ?? "public"}:${normalizeText(text).toLowerCase()}`;
}

function isQuietHoursDallas(now: Date): boolean {
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "2-digit",
    hour12: false,
  }).format(now));
  return hour >= 23 || hour < 8;
}

export class QualityGate {
  private recentMessages = new Map<string, number>();
  private telegramPostTimes = new Map<string, number[]>();

  public readonly brandLawPath = BRAND_LAW_PATH;

  brandVoicePrompt(): string {
    return [
      `Before generating any public-facing CreatorVault content, read ${BRAND_LAW_PATH}. This is the governing quality standard.`,
      "Voice law: direct, confident, real, cultural, empowering, premium; never corporate, desperate, generic, robotic, apologetic, or vague.",
      "Telegram law: maximum four sentences, one clear CTA, no placeholders, no visible markdown syntax, no internal reports, no confusing technical notices.",
      "Visual law: dark luxury only, #0A0A0A background energy, #00D9FF electric cyan, #C9A84C gold, one dominant element, one supporting element, one action element.",
      "Owner context: CreatorVault belongs to Cameron Lee White — KingCam — and every output must feel like Apple product launch precision, Dior campaign luxury, NBA playoff energy, and A$AP Rocky cultural taste.",
    ].join("\n");
  }

  reviewPrompt(message: string): string {
    return `Review this Telegram message for a premium creator platform called CreatorVault owned by KingCam. Score it 1-10 on: directness (does it get to the point?), value (does it give the reader something?), tone (does it sound like a confident peer not a corporation?), clarity (is the CTA obvious?). If any score is below 7 — rewrite the message to meet the standard. Return only the final approved message.\n\nMessage:\n${message}`;
  }

  tryCheck(message: string, options: QualityGateOptions = {}): QualityGateResult {
    const surface = options.surface || "agent-public-output";
    const text = normalizeText(message);
    const violations: string[] = [];
    const now = options.now || new Date();
    const isTelegram = surface.startsWith("telegram");
    const isBroadcast = surface === "telegram" || surface === "telegram-broadcast";

    if (!text) violations.push("Message is empty.");
    if (text.length > 0 && text.length < MIN_PUBLIC_MESSAGE_LENGTH) violations.push(`Message is below the ${MIN_PUBLIC_MESSAGE_LENGTH}-character public quality floor.`);
    if (isBroadcast && text.length > MAX_TELEGRAM_BROADCAST_LENGTH) violations.push(`Telegram broadcast exceeds ${MAX_TELEGRAM_BROADCAST_LENGTH} characters.`);
    if (PLACEHOLDER_PATTERN.test(text)) violations.push("Placeholder or unfinished copy detected.");
    PLACEHOLDER_PATTERN.lastIndex = 0;
    if (RAW_MARKDOWN_PATTERN.test(text)) violations.push("Visible raw markdown syntax detected.");
    if (!options.allowInternalReport && RAW_INTERNAL_PATTERN.test(text)) violations.push("Raw/internal/debug output detected.");
    if (CORPORATE_PATTERN.test(text)) violations.push("Corporate, apologetic, vague, or generic startup language detected.");
    if (DESPERATE_PATTERN.test(text)) violations.push("Desperate, scammy, or hype-driven language detected.");
    if ((options.hasActionElement ?? CTA_PATTERN.test(text)) !== true) violations.push("Missing one clear action element, link, button, or instruction.");
    if (isTelegram && sentenceCount(text) > MAX_TELEGRAM_SENTENCES) violations.push(`Telegram copy exceeds the ${MAX_TELEGRAM_SENTENCES}-sentence maximum.`);
    if (isBroadcast && /\n{3,}|(?:^|\n)\s*[-•]\s/m.test(text)) violations.push("Telegram broadcast copy reads like a wall, list, or report instead of a premium message.");
    if ((options.requireCreatorVaultPositioning ?? isTelegram) && !CREATORVAULT_POSITIONING_PATTERN.test(text)) violations.push("Missing CreatorVault, VaultX, KingCam, creator-system, or platform positioning.");
    if (!BRAND_VOICE_SIGNAL.test(text)) violations.push("Missing a concrete creator, subscriber, income, platform, drop, launch, or premium-value signal.");
    if (isBroadcast && isQuietHoursDallas(now)) violations.push("Telegram subscriber channel sends are blocked between 11pm and 8am Dallas time.");

    const key = duplicateKey(text, options.recipientKey);
    const previous = this.recentMessages.get(key);
    if (previous && now.getTime() - previous < DEDUPE_WINDOW_MS) violations.push("Duplicate message to the same recipient inside the 48-hour no-repeat window.");

    if (isBroadcast) {
      const cadenceKey = String(options.recipientKey ?? "broadcast");
      const recent = (this.telegramPostTimes.get(cadenceKey) || []).filter((t) => now.getTime() - t < 24 * 60 * 60 * 1000);
      if (recent.length >= 3) violations.push("Telegram subscriber channel exceeds the maximum of 3 posts per day.");
      const last = recent[recent.length - 1];
      if (last && now.getTime() - last < 4 * 60 * 60 * 1000) violations.push("Telegram subscriber channel posts require at least 4 hours between messages.");
    }

    return { ok: violations.length === 0, surface, approvedText: text, violations };
  }

  check(message: string, options: QualityGateOptions = {}): string {
    const result = this.tryCheck(message, options);
    if (!result.ok) {
      throw new Error(`CreatorVault Brand DNA QualityGate blocked output: ${result.violations.join(" ")}`);
    }
    const now = (options.now || new Date()).getTime();
    const text = result.approvedText || normalizeText(message);
    this.recentMessages.set(duplicateKey(text, options.recipientKey), now);
    if ((result.surface === "telegram" || result.surface === "telegram-broadcast") && options.recipientKey !== undefined) {
      const key = String(options.recipientKey);
      const recent = (this.telegramPostTimes.get(key) || []).filter((t) => now - t < 24 * 60 * 60 * 1000);
      recent.push(now);
      this.telegramPostTimes.set(key, recent);
    }
    return text;
  }

  tryCheckVisual(imageUrl: string, options: VisualGateOptions = {}): QualityGateResult {
    const violations: string[] = [];
    const url = String(imageUrl || "").trim();
    const prompt = options.prompt || "";

    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) violations.push("Visual asset must use a valid platform URL or absolute platform path.");
    if (/replicate\.delivery|replicate\.com|pbxt\.replicate|tmp|localhost|127\.0\.0\.1/i.test(url)) violations.push("Public visuals must not post raw vendor, temporary, or localhost URLs; serve through the platform CDN.");
    if (/placeholder|via\.placeholder|dummy|sample/i.test(url)) violations.push("Placeholder visual asset detected.");
    if (options.width !== undefined && options.width < 1080) violations.push("Visual width is below the 1080px minimum.");
    if (options.height !== undefined && options.height < 1080) violations.push("Visual height is below the 1080px minimum.");
    if (options.textElementCount !== undefined && options.textElementCount > 3) violations.push("Visual card exceeds the three-element maximum.");
    if (options.paddingPx !== undefined && options.paddingPx < 40) violations.push("Visual card violates the 40px minimum padding law.");
    if (options.contrastRatio !== undefined && options.contrastRatio < 4.5) violations.push("Visual contrast ratio is below 4.5:1.");
    if (options.hasTextOverlap === true) violations.push("Visual text overlap detected.");
    if (options.backgroundColor && !/[#]?(?:0A0A0A|1A1A1A|2A2A2A)/i.test(options.backgroundColor) && options.usesDarkOverlay !== true) violations.push("Visual background is not dark CreatorVault identity or protected by a dark overlay.");
    if (prompt && LIGHT_OR_GENERIC_VISUAL_PATTERN.test(prompt)) violations.push("Visual prompt contains banned light/generic/corporate styling.");
    if (options.publicPost === true && prompt && !REQUIRED_VISUAL_STYLE_PATTERN.test(prompt)) violations.push("Public visual prompt is missing dark luxury, cyan, gold, cinematic, or premium CreatorVault styling.");

    return { ok: violations.length === 0, surface: "visual", approvedText: url, violations };
  }

  checkVisual(imageUrl: string, options: VisualGateOptions = {}): string {
    const result = this.tryCheckVisual(imageUrl, options);
    if (!result.ok) {
      throw new Error(`CreatorVault Brand DNA VisualGate blocked output: ${result.violations.join(" ")}`);
    }
    return result.approvedText || imageUrl;
  }
}

export const qualityGate = new QualityGate();

export function withCreatorVaultBrandVoice(prompt: string): string {
  return `${qualityGate.brandVoicePrompt()}\n\nGeneration task:\n${prompt}`;
}
