import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { callTelegramApiWithGuard } from "./telegramOutboundGuard";

export type LeadBand = "hot" | "warm" | "cool" | "cold";
export type OutreachStage = "first_touch" | "follow_up_1" | "follow_up_2" | "follow_up_3" | "final_cta" | "handoff";
export type ActionStatus = "queued" | "sent" | "failed" | "skipped" | "handoff_required";

export interface VaultXLeadInput {
  platform: string;
  handle: string;
  displayName?: string;
  profileUrl?: string;
  source?: string;
  niche?: string;
  vertical?: string;
  bio?: string;
  audienceFitSignals?: string[];
  recentActivity?: string;
  followers?: number;
  engagementRate?: number;
  monetizationSignals?: string[];
  platforms?: string[];
  telegramUsername?: string;
  telegramChatId?: string;
  webhookUrl?: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

export interface VaultXOperatorConfig {
  enabled: boolean;
  tickIntervalMs: number;
  maxFirstTouchesPerTick: number;
  maxFollowUpsPerTick: number;
  maxRetries: number;
  hotThreshold: number;
  warmThreshold: number;
  coolThreshold: number;
  allowedVerticals: string[];
  blockedTerms: string[];
  priorityPlatforms: Record<string, number>;
  followUpDelaysHours: number[];
  ctaServiceName: string;
  ctaPriceCents: number;
  onboardingBaseUrl: string;
  checkoutBaseUrl: string;
  trackingBaseUrl: string;
  telegramBotToken?: string;
  telegramOpsChatId?: string;
  allowHttpWebhooks: boolean;
  seedCreators: VaultXLeadInput[];
  discoverySubreddits: string[];
  sourceHttpEndpoints: string[];
  maxDiscoveryPerTick: number;
}

const DEFAULT_CONFIG: VaultXOperatorConfig = {
  enabled: true,
  tickIntervalMs: 15 * 60 * 1000,
  maxFirstTouchesPerTick: 25,
  maxFollowUpsPerTick: 40,
  maxRetries: 3,
  hotThreshold: 85,
  warmThreshold: 70,
  coolThreshold: 55,
  allowedVerticals: ["adult", "body_positive", "fitness", "glamour", "cosplay", "lifestyle", "creator_education", "music", "gaming"],
  blockedTerms: ["minor", "underage", "teen", "schoolgirl", "illegal", "nonconsensual", "leak"],
  priorityPlatforms: { onlyfans: 10, fansly: 9, instagram: 8, tiktok: 7, twitter: 7, x: 7, reddit: 6, telegram: 9, youtube: 5 },
  followUpDelaysHours: [4, 24, 72, 168],
  ctaServiceName: "VaultX Creator Monetization Audit",
  ctaPriceCents: 30000,
  onboardingBaseUrl: process.env.VAULTX_ONBOARDING_URL || "https://creatorvault.app/onboarding/vaultx",
  checkoutBaseUrl: process.env.VAULTX_CHECKOUT_BASE_URL || "https://creatorvault.app/checkout/service/vaultx-audit",
  trackingBaseUrl: process.env.PUBLIC_BASE_URL || "https://creatorvault.app",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramOpsChatId: process.env.VAULTX_TELEGRAM_OPS_CHAT_ID,
  allowHttpWebhooks: process.env.VAULTX_ALLOW_OUTREACH_WEBHOOKS === "true",
  seedCreators: [],
  discoverySubreddits: ["CreatorsAdvice", "onlyfansadvice", "Fansly_Advice", "bodypositive", "cosplaygirls", "fitnessgirls"],
  sourceHttpEndpoints: [],
  maxDiscoveryPerTick: 50,
};

let cronHandle: NodeJS.Timeout | null = null;
let running = false;

function assertDb() {
  if (!db) throw new Error("DATABASE_URL is required for VaultX autonomous acquisition execution.");
}

function serialize(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function safeJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value as T;
  try { return JSON.parse(String(value)) as T; } catch { return fallback; }
}

function nowPlusHours(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@+/, "").toLowerCase();
}

function normalizePlatform(platform: string): string {
  return platform.trim().toLowerCase();
}

function bandFor(score: number, config: VaultXOperatorConfig): LeadBand {
  if (score >= config.hotThreshold) return "hot";
  if (score >= config.warmThreshold) return "warm";
  if (score >= config.coolThreshold) return "cool";
  return "cold";
}

async function rawQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  assertDb();
  const pool = (db as any).$client || (db as any).client;
  if (pool && typeof pool.promise === "function") {
    const [rows] = await pool.promise().query(query, params);
    return rows as T[];
  }
  if (pool && typeof pool.execute === "function") {
    const [rows] = await pool.execute(query, params);
    return rows as T[];
  }
  const escaped = query.replace(/\?/g, () => {
    const value = params.shift();
    if (value === null || value === undefined) return "NULL";
    if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace("T", " ")}'`;
    if (typeof value === "number") return String(value);
    return `'${String(value).replace(/'/g, "''")}'`;
  });
  const result = await (db as any).execute(sql.raw(escaped));
  return ((result as any).rows || result) as T[];
}

async function rawExec(query: string, params: any[] = []): Promise<any> {
  assertDb();
  const pool = (db as any).$client || (db as any).client;
  if (pool && typeof pool.promise === "function") {
    const [result] = await pool.promise().query(query, params);
    return result;
  }
  if (pool && typeof pool.execute === "function") {
    const [result] = await pool.execute(query, params);
    return result;
  }
  await rawQuery(query, params);
  return { affectedRows: 0 };
}

export async function ensureVaultXAcquisitionSchema() {
  await rawExec(`CREATE TABLE IF NOT EXISTS vaultx_acquisition_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(120) NOT NULL UNIQUE,
    config_json JSON NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await rawExec(`CREATE TABLE IF NOT EXISTS vaultx_creator_leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL UNIQUE,
    platform VARCHAR(64) NOT NULL,
    handle VARCHAR(180) NOT NULL,
    display_name VARCHAR(255),
    profile_url TEXT,
    source VARCHAR(120) NOT NULL DEFAULT 'operator',
    niche VARCHAR(180),
    vertical VARCHAR(100),
    bio TEXT,
    audience_fit_signals JSON,
    recent_activity TEXT,
    followers INT NOT NULL DEFAULT 0,
    engagement_rate DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    monetization_signals JSON,
    platforms JSON,
    telegram_username VARCHAR(180),
    telegram_chat_id VARCHAR(180),
    webhook_url TEXT,
    email VARCHAR(320),
    phone VARCHAR(80),
    score INT NOT NULL DEFAULT 0,
    score_breakdown JSON,
    priority_band VARCHAR(20) NOT NULL DEFAULT 'cold',
    status VARCHAR(40) NOT NULL DEFAULT 'new',
    reply_status VARCHAR(40) NOT NULL DEFAULT 'none',
    follow_up_count INT NOT NULL DEFAULT 0,
    last_outreach_at TIMESTAMP NULL,
    next_follow_up_at TIMESTAMP NULL,
    cta_url TEXT,
    cta_tracking_code VARCHAR(80),
    onboarding_url TEXT,
    handoff_required BOOLEAN NOT NULL DEFAULT FALSE,
    handoff_reason TEXT,
    metadata JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_vaultx_creator_leads_platform_handle (platform, handle),
    KEY idx_vaultx_creator_leads_score (score),
    KEY idx_vaultx_creator_leads_band (priority_band),
    KEY idx_vaultx_creator_leads_status (status),
    KEY idx_vaultx_creator_leads_next_follow (next_follow_up_at)
  )`);

  await rawExec(`CREATE TABLE IF NOT EXISTS vaultx_outreach_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL UNIQUE,
    lead_id INT NOT NULL,
    run_id VARCHAR(64),
    stage VARCHAR(40) NOT NULL,
    channel VARCHAR(40) NOT NULL,
    message TEXT NOT NULL,
    cta_url TEXT,
    status VARCHAR(40) NOT NULL DEFAULT 'queued',
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    due_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    external_message_id VARCHAR(255),
    error_message TEXT,
    proof JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_vaultx_actions_due (status, due_at),
    KEY idx_vaultx_actions_lead (lead_id),
    KEY idx_vaultx_actions_run (run_id)
  )`);

  await rawExec(`CREATE TABLE IF NOT EXISTS vaultx_operator_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    run_id VARCHAR(64) NOT NULL UNIQUE,
    mode VARCHAR(40) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'running',
    sourced_count INT NOT NULL DEFAULT 0,
    scored_count INT NOT NULL DEFAULT 0,
    queued_count INT NOT NULL DEFAULT 0,
    sent_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    escalated_count INT NOT NULL DEFAULT 0,
    handoff_count INT NOT NULL DEFAULT 0,
    proof JSON,
    error_message TEXT
  )`);

  await rawExec(`CREATE TABLE IF NOT EXISTS vaultx_handoff_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(64) NOT NULL UNIQUE,
    lead_id INT NOT NULL,
    run_id VARCHAR(64),
    reason VARCHAR(255) NOT NULL,
    severity VARCHAR(40) NOT NULL DEFAULT 'medium',
    status VARCHAR(40) NOT NULL DEFAULT 'open',
    context JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    KEY idx_vaultx_handoff_status (status),
    KEY idx_vaultx_handoff_lead (lead_id)
  )`);

  await rawExec(`CREATE TABLE IF NOT EXISTS vaultx_acquisition_telemetry (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL UNIQUE,
    run_id VARCHAR(64),
    lead_id INT,
    event_type VARCHAR(80) NOT NULL,
    status VARCHAR(40) NOT NULL,
    source VARCHAR(120),
    score INT,
    priority_band VARCHAR(20),
    channel VARCHAR(40),
    outcome TEXT,
    metadata JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_vaultx_telemetry_event_type (event_type),
    KEY idx_vaultx_telemetry_run (run_id),
    KEY idx_vaultx_telemetry_lead (lead_id),
    KEY idx_vaultx_telemetry_created (created_at)
  )`);
}

async function logTelemetry(input: { runId?: string; leadId?: number; eventType: string; status: string; source?: string; score?: number; priorityBand?: string; channel?: string; outcome?: string; metadata?: Record<string, unknown> }) {
  await rawExec(`INSERT INTO vaultx_acquisition_telemetry
    (event_id, run_id, lead_id, event_type, status, source, score, priority_band, channel, outcome, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
    randomUUID(), input.runId || null, input.leadId || null, input.eventType, input.status,
    input.source || null, input.score ?? null, input.priorityBand || null, input.channel || null,
    input.outcome || null, serialize(input.metadata || {}),
  ]);
}

export async function getVaultXAcquisitionConfig(): Promise<VaultXOperatorConfig> {
  await ensureVaultXAcquisitionSchema();
  const rows = await rawQuery<{ config_json: any }>("SELECT config_json FROM vaultx_acquisition_config WHERE config_key='default' LIMIT 1");
  if (!rows[0]) {
    await rawExec("INSERT INTO vaultx_acquisition_config (config_key, config_json, enabled) VALUES ('default', ?, TRUE)", [serialize(DEFAULT_CONFIG)]);
    return DEFAULT_CONFIG;
  }
  const stored = safeJson<Partial<VaultXOperatorConfig>>(rows[0].config_json, {});
  return { ...DEFAULT_CONFIG, ...stored, priorityPlatforms: { ...DEFAULT_CONFIG.priorityPlatforms, ...(stored.priorityPlatforms || {}) } };
}

export async function updateVaultXAcquisitionConfig(patch: Partial<VaultXOperatorConfig>) {
  const current = await getVaultXAcquisitionConfig();
  const next = { ...current, ...patch, priorityPlatforms: { ...current.priorityPlatforms, ...(patch.priorityPlatforms || {}) } };
  await rawExec(`INSERT INTO vaultx_acquisition_config (config_key, config_json, enabled) VALUES ('default', ?, ?)
    ON DUPLICATE KEY UPDATE config_json=VALUES(config_json), enabled=VALUES(enabled)`, [serialize(next), next.enabled ? 1 : 0]);
  return next;
}

function scoreLead(lead: VaultXLeadInput, config: VaultXOperatorConfig) {
  const platform = normalizePlatform(lead.platform);
  const text = `${lead.niche || ""} ${lead.vertical || ""} ${lead.bio || ""} ${(lead.audienceFitSignals || []).join(" ")} ${(lead.monetizationSignals || []).join(" ")}`.toLowerCase();
  const blocked = config.blockedTerms.filter(term => text.includes(term.toLowerCase()));
  const verticalFit = config.allowedVerticals.some(v => text.includes(v.replace(/_/g, " ")) || lead.vertical === v || lead.niche?.toLowerCase().includes(v)) ? 20 : 10;
  const platformScore = Math.min(10, config.priorityPlatforms[platform] || 4);
  const audienceScore = Math.min(15, Math.round(Math.log10(Math.max(lead.followers || 0, 1)) * 4));
  const engagementScore = Math.min(20, Math.round(Number(lead.engagementRate || 0) * 4));
  const monetizationScore = Math.min(20, (lead.monetizationSignals || []).length * 5 + (/onlyfans|fansly|paid|vip|subscription|telegram|cashapp|wishlist/.test(text) ? 8 : 0));
  const contactScore = lead.telegramChatId || lead.webhookUrl || lead.email ? 10 : lead.telegramUsername ? 7 : 3;
  const recencyScore = lead.recentActivity ? 10 : 4;
  const riskPenalty = blocked.length ? 45 : 0;
  const score = Math.max(0, Math.min(100, verticalFit + platformScore + audienceScore + engagementScore + monetizationScore + contactScore + recencyScore - riskPenalty));
  return {
    score,
    band: bandFor(score, config),
    blocked,
    breakdown: { verticalFit, platformScore, audienceScore, engagementScore, monetizationScore, contactScore, recencyScore, riskPenalty, blockedTerms: blocked },
  };
}

export async function upsertVaultXLead(lead: VaultXLeadInput, runId?: string) {
  const config = await getVaultXAcquisitionConfig();
  const platform = normalizePlatform(lead.platform);
  const handle = normalizeHandle(lead.handle);
  const scored = scoreLead({ ...lead, platform, handle }, config);
  const onboardingUrl = `${config.onboardingBaseUrl}?platform=${encodeURIComponent(platform)}&handle=${encodeURIComponent(handle)}`;
  const trackingCode = `vx_${platform}_${handle}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 78);
  const ctaUrl = `${config.checkoutBaseUrl}?lead=${encodeURIComponent(handle)}&src=vaultx_acquisition&tracking=${encodeURIComponent(trackingCode)}`;
  await rawExec(`INSERT INTO vaultx_creator_leads
    (uuid, platform, handle, display_name, profile_url, source, niche, vertical, bio, audience_fit_signals, recent_activity, followers, engagement_rate, monetization_signals, platforms, telegram_username, telegram_chat_id, webhook_url, email, phone, score, score_breakdown, priority_band, cta_url, cta_tracking_code, onboarding_url, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE display_name=VALUES(display_name), profile_url=VALUES(profile_url), source=VALUES(source), niche=VALUES(niche), vertical=VALUES(vertical), bio=VALUES(bio), audience_fit_signals=VALUES(audience_fit_signals), recent_activity=VALUES(recent_activity), followers=VALUES(followers), engagement_rate=VALUES(engagement_rate), monetization_signals=VALUES(monetization_signals), platforms=VALUES(platforms), telegram_username=VALUES(telegram_username), telegram_chat_id=VALUES(telegram_chat_id), webhook_url=VALUES(webhook_url), email=VALUES(email), phone=VALUES(phone), score=VALUES(score), score_breakdown=VALUES(score_breakdown), priority_band=VALUES(priority_band), cta_url=VALUES(cta_url), cta_tracking_code=VALUES(cta_tracking_code), onboarding_url=VALUES(onboarding_url), metadata=VALUES(metadata), updated_at=CURRENT_TIMESTAMP`, [
    randomUUID(), platform, handle, lead.displayName || null, lead.profileUrl || null, lead.source || "operator", lead.niche || null, lead.vertical || null, lead.bio || null,
    serialize(lead.audienceFitSignals || []), lead.recentActivity || null, lead.followers || 0, lead.engagementRate || 0,
    serialize(lead.monetizationSignals || []), serialize(lead.platforms || [platform]), lead.telegramUsername || null, lead.telegramChatId || null, lead.webhookUrl || null, lead.email || null, lead.phone || null,
    scored.score, serialize(scored.breakdown), scored.band, ctaUrl, trackingCode, onboardingUrl, serialize(lead.metadata || {}),
  ]);
  const [row] = await rawQuery<any>("SELECT * FROM vaultx_creator_leads WHERE platform=? AND handle=? LIMIT 1", [platform, handle]);
  await logTelemetry({ runId, leadId: row?.id, eventType: "lead_scored", status: scored.blocked.length ? "warning" : "success", source: lead.source, score: scored.score, priorityBand: scored.band, outcome: `Lead scored ${scored.score} (${scored.band})`, metadata: scored.breakdown });
  if (scored.blocked.length && row?.id) await createHandoff(row.id, runId, "blocked_or_age_risk_signal", "critical", { blockedTerms: scored.blocked });
  return row;
}

async function createHandoff(leadId: number, runId: string | undefined, reason: string, severity: "low" | "medium" | "high" | "critical", context: Record<string, unknown>) {
  await rawExec("UPDATE vaultx_creator_leads SET handoff_required=TRUE, handoff_reason=?, status='handoff' WHERE id=?", [reason, leadId]);
  await rawExec("INSERT INTO vaultx_handoff_cases (uuid, lead_id, run_id, reason, severity, context) VALUES (?, ?, ?, ?, ?, ?)", [randomUUID(), leadId, runId || null, reason, severity, serialize(context)]);
  await logTelemetry({ runId, leadId, eventType: "human_handoff", status: "warning", outcome: reason, metadata: context });
}

function chooseChannel(lead: any): string {
  if (lead.telegram_chat_id) return "telegram";
  if (lead.webhook_url) return "webhook";
  if (lead.email) return "email_outbox";
  if (lead.telegram_username) return "telegram_username_outbox";
  return "platform_outbox";
}

function generateMessage(lead: any, stage: OutreachStage) {
  const handle = lead.display_name || `@${lead.handle}`;
  const niche = lead.niche || lead.vertical || "creator brand";
  const cta = lead.cta_url || lead.onboarding_url;
  const metadata = safeJson<Record<string, any>>(lead.metadata, {});
  const spanishFirst = metadata.languagePrimary === "es" || metadata.locale === "es-DO" || metadata.dialect === "dr";
  const dominicanVoice = metadata.dialect === "dr" || metadata.locale === "es-DO";

  if (spanishFirst) {
    if (stage === "first_touch") {
      return dominicanVoice
        ? `${handle}, te escribo directo: tú ya tienes atención y vibra, pero esa atención tiene que caer en un camino pago claro: DM → link → Telegram/VIP → Fansly/VaultX. Te dejé el paso rápido pa' activar eso sin mareo: ${cta}`
        : `${handle}, nota directa: ya tienes audiencia y señales de compra, pero hace falta ordenar el camino pago: DM, checkout, Telegram/VIP y destino monetizado. Empieza aquí: ${cta}`;
    }
    if (stage === "final_cta") {
      return dominicanVoice
        ? `${handle}, cierro por aquí: si vamos a mover esto, el próximo paso es activar el link pago y el canal VIP hoy. Entra aquí: ${cta}`
        : `${handle}, cierro el seguimiento: el siguiente paso es activar el link pago y el canal VIP hoy. Entra aquí: ${cta}`;
    }
    const n = stage.replace("follow_up_", "");
    return dominicanVoice
      ? `${handle}, follow-up ${n}: la vuelta sigue igual de simple—un solo mensaje, un solo link y Telegram/VIP pa' retener. Dale aquí: ${cta}`
      : `${handle}, seguimiento ${n}: la ruta sigue simple—un mensaje, un link y Telegram/VIP para retención. Entra aquí: ${cta}`;
  }

  const activity = lead.recent_activity ? ` I saw the recent angle around ${lead.recent_activity}.` : "";
  if (stage === "first_touch") {
    return `${handle} — direct note. VaultX is looking for ${niche} creators who already have audience heat but are leaking paid conversions.${activity} I built a quick monetization path for you: audit the profile, tighten the VIP/Telegram/payment loop, and turn interest into paid subscribers without you manually chasing every fan. If you want the fast path, start here: ${cta}`;
  }
  if (stage === "final_cta") {
    return `${handle}, closing the loop here. Your audience fit is strong enough that VaultX should either activate your paid funnel now or stop taking your time. The next step is the monetization audit/payment CTA: ${cta}`;
  }
  const n = stage.replace("follow_up_", "");
  return `${handle} — follow-up ${n}. The opportunity is still the same: convert the attention you already have into a clean VaultX paid path with onboarding, Telegram/VIP routing, and payment tracking. Next step: ${cta}`;
}

async function queueAction(lead: any, stage: OutreachStage, dueAt: Date, runId?: string) {
  const channel = chooseChannel(lead);
  const message = generateMessage(lead, stage);
  await rawExec(`INSERT INTO vaultx_outreach_actions (uuid, lead_id, run_id, stage, channel, message, cta_url, status, due_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?)`, [randomUUID(), lead.id, runId || null, stage, channel, message, lead.cta_url || null, dueAt]);
  await logTelemetry({ runId, leadId: lead.id, eventType: "outreach_queued", status: "success", score: lead.score, priorityBand: lead.priority_band, channel, outcome: stage, metadata: { dueAt } });
}

async function queueFirstTouches(runId: string, limit: number) {
  const leads = await rawQuery<any>(`SELECT * FROM vaultx_creator_leads
    WHERE status IN ('new','qualified') AND handoff_required=FALSE AND priority_band IN ('hot','warm')
    ORDER BY score DESC, created_at ASC LIMIT ?`, [limit]);
  for (const lead of leads) {
    await queueAction(lead, "first_touch", new Date(), runId);
    await rawExec("UPDATE vaultx_creator_leads SET status='queued' WHERE id=?", [lead.id]);
  }
  return leads.length;
}

async function queueDueFollowUps(runId: string, limit: number, config: VaultXOperatorConfig) {
  const leads = await rawQuery<any>(`SELECT * FROM vaultx_creator_leads
    WHERE status='contacted' AND reply_status='none' AND handoff_required=FALSE AND follow_up_count < ?
      AND next_follow_up_at IS NOT NULL AND next_follow_up_at <= CURRENT_TIMESTAMP
    ORDER BY score DESC, next_follow_up_at ASC LIMIT ?`, [config.followUpDelaysHours.length, limit]);
  for (const lead of leads) {
    const nextCount = Number(lead.follow_up_count || 0) + 1;
    const stage = nextCount >= config.followUpDelaysHours.length ? "final_cta" : (`follow_up_${nextCount}` as OutreachStage);
    await queueAction(lead, stage, new Date(), runId);
  }
  return leads.length;
}

async function sendTelegram(chatId: string, text: string, token: string) {
  const json = await callTelegramApiWithGuard({
    botToken: token,
    method: "sendMessage",
    body: { chat_id: chatId, text, disable_web_page_preview: false },
    context: "vaultxAutonomousAcquisitionOperator.sendTelegram",
  }) as any;
  if (!json.ok) throw new Error(json?.description || "Telegram send blocked by emergency guard");
  return json.result?.message_id ? String(json.result.message_id) : null;
}

async function dispatchAction(action: any, config: VaultXOperatorConfig, runId: string) {
  const [lead] = await rawQuery<any>("SELECT * FROM vaultx_creator_leads WHERE id=? LIMIT 1", [action.lead_id]);
  if (!lead) throw new Error(`Lead ${action.lead_id} not found`);
  let externalId: string | null = null;
  const proof: Record<string, unknown> = { channel: action.channel, attemptedAt: new Date().toISOString() };

  if (action.channel === "telegram" && lead.telegram_chat_id && config.telegramBotToken) {
    externalId = await sendTelegram(lead.telegram_chat_id, action.message, config.telegramBotToken);
    proof.telegramMessageId = externalId;
  } else if (action.channel === "webhook" && lead.webhook_url && config.allowHttpWebhooks) {
    const response = await fetch(lead.webhook_url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lead, action, source: "vaultx_autonomous_acquisition" }) });
    proof.webhookStatus = response.status;
    if (!response.ok) throw new Error(`Webhook dispatch failed with HTTP ${response.status}`);
    externalId = response.headers.get("x-message-id") || `webhook_${Date.now()}`;
  } else if (config.telegramOpsChatId && config.telegramBotToken) {
    externalId = await sendTelegram(config.telegramOpsChatId, `[VaultX acquisition outbox]\nLead: ${lead.platform}/@${lead.handle}\nChannel: ${action.channel}\nScore: ${lead.score}\n\n${action.message}`, config.telegramBotToken);
    proof.opsRelayMessageId = externalId;
  } else {
    proof.outboxOnly = true;
    proof.reason = "No direct delivery credential or configured relay is available; action is persisted for external connector pickup.";
  }

  await rawExec("UPDATE vaultx_outreach_actions SET status='sent', sent_at=CURRENT_TIMESTAMP, external_message_id=?, proof=?, attempt_count=attempt_count+1 WHERE id=?", [externalId, serialize(proof), action.id]);
  const followCountIncrement = action.stage === "first_touch" ? 0 : 1;
  const nextFollowCount = Number(lead.follow_up_count || 0) + followCountIncrement;
  const nextDelay = config.followUpDelaysHours[Math.min(nextFollowCount, config.followUpDelaysHours.length - 1)];
  const nextFollow = action.stage === "final_cta" ? null : nowPlusHours(nextDelay || 24);
  await rawExec("UPDATE vaultx_creator_leads SET status='contacted', last_outreach_at=CURRENT_TIMESTAMP, follow_up_count=?, next_follow_up_at=? WHERE id=?", [nextFollowCount, nextFollow, lead.id]);
  await logTelemetry({ runId, leadId: lead.id, eventType: "outreach_sent", status: "success", score: lead.score, priorityBand: lead.priority_band, channel: action.channel, outcome: action.stage, metadata: proof });
  return { actionId: action.id, leadId: lead.id, channel: action.channel, externalId, proof };
}

async function executeDueActions(runId: string, limit: number, config: VaultXOperatorConfig) {
  const actions = await rawQuery<any>(`SELECT * FROM vaultx_outreach_actions
    WHERE status='queued' AND due_at <= CURRENT_TIMESTAMP AND attempt_count < max_attempts
    ORDER BY due_at ASC, id ASC LIMIT ?`, [limit]);
  let sent = 0, failed = 0, handoff = 0;
  const proofs: any[] = [];
  for (const action of actions) {
    try {
      const proof = await dispatchAction(action, config, runId);
      sent += 1;
      proofs.push(proof);
    } catch (error: any) {
      failed += 1;
      const attempts = Number(action.attempt_count || 0) + 1;
      const terminal = attempts >= Number(action.max_attempts || config.maxRetries);
      await rawExec("UPDATE vaultx_outreach_actions SET attempt_count=?, status=?, error_message=?, due_at=? WHERE id=?", [attempts, terminal ? "handoff_required" : "queued", error?.message || String(error), nowPlusHours(terminal ? 0 : 1), action.id]);
      await logTelemetry({ runId, leadId: action.lead_id, eventType: "outreach_retry", status: terminal ? "failed" : "warning", channel: action.channel, outcome: error?.message || String(error), metadata: { attempts, terminal } });
      if (terminal) {
        handoff += 1;
        await createHandoff(action.lead_id, runId, "dispatch_failed_after_retries", "high", { actionId: action.id, error: error?.message || String(error) });
      }
    }
  }
  return { sent, failed, handoff, proofs };
}

export async function markVaultXLeadReply(input: { leadId?: number; platform?: string; handle?: string; replyStatus: "positive" | "neutral" | "negative" | "blocked"; intentScore?: number; notes?: string; runId?: string }) {
  await ensureVaultXAcquisitionSchema();
  const rows = input.leadId ? await rawQuery<any>("SELECT * FROM vaultx_creator_leads WHERE id=? LIMIT 1", [input.leadId]) : await rawQuery<any>("SELECT * FROM vaultx_creator_leads WHERE platform=? AND handle=? LIMIT 1", [normalizePlatform(input.platform || ""), normalizeHandle(input.handle || "")]);
  const lead = rows[0];
  if (!lead) throw new Error("Lead not found");
  const status = input.replyStatus === "positive" ? "hot_reply" : input.replyStatus === "negative" || input.replyStatus === "blocked" ? "closed" : "replied";
  await rawExec("UPDATE vaultx_creator_leads SET reply_status=?, status=?, next_follow_up_at=NULL, metadata=JSON_SET(COALESCE(metadata, JSON_OBJECT()), '$.replyNotes', ?, '$.intentScore', ?) WHERE id=?", [input.replyStatus, status, input.notes || null, input.intentScore ?? null, lead.id]);
  await logTelemetry({ runId: input.runId, leadId: lead.id, eventType: "reply_recorded", status: "success", score: lead.score, priorityBand: lead.priority_band, outcome: input.replyStatus, metadata: { intentScore: input.intentScore, notes: input.notes } });
  if (input.replyStatus === "positive" || (input.intentScore || 0) >= 80) {
    await queueAction({ ...lead, status }, "handoff", new Date(), input.runId);
    await createHandoff(lead.id, input.runId, "high_intent_reply_needs_onboarding_and_payment_close", "critical", { intentScore: input.intentScore, ctaUrl: lead.cta_url, onboardingUrl: lead.onboarding_url });
  }
  return { leadId: lead.id, status };
}

async function importConfiguredSeeds(config: VaultXOperatorConfig, runId: string) {
  let count = 0;
  for (const lead of config.seedCreators || []) {
    if (!lead.platform || !lead.handle) continue;
    await upsertVaultXLead({ ...lead, source: lead.source || "configured_seed" }, runId);
    count += 1;
  }
  return count;
}

async function discoverFromReddit(config: VaultXOperatorConfig, runId: string, limit: number) {
  let count = 0;
  for (const subreddit of config.discoverySubreddits || []) {
    if (count >= limit) break;
    try {
      const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new.json?limit=${Math.min(25, limit - count)}`;
      const response = await fetch(url, { headers: { "user-agent": "VaultXCreatorAcquisition/1.0" } });
      if (!response.ok) throw new Error(`Reddit HTTP ${response.status}`);
      const json = await response.json() as any;
      const posts = json?.data?.children || [];
      for (const child of posts) {
        if (count >= limit) break;
        const post = child?.data;
        if (!post?.author || post.author === "[deleted]" || post.over_18 === false && /onlyfans|fansly|adult|nsfw/i.test(subreddit)) continue;
        const title = String(post.title || "");
        const selftext = String(post.selftext || "").slice(0, 1000);
        await upsertVaultXLead({
          platform: "reddit",
          handle: post.author,
          displayName: post.author,
          profileUrl: `https://www.reddit.com/user/${post.author}`,
          source: `reddit:r/${subreddit}`,
          niche: subreddit,
          vertical: /onlyfans|fansly|adult|nsfw/i.test(`${subreddit} ${title}`) ? "adult" : /bodypositive|fitness/i.test(`${subreddit} ${title}`) ? "body_positive" : "creator_education",
          bio: `${title}\n${selftext}`.trim(),
          audienceFitSignals: [subreddit, title].filter(Boolean),
          recentActivity: title,
          followers: Math.max(0, Number(post.subreddit_subscribers || 0)),
          engagementRate: Math.min(20, Number(post.score || 0) / Math.max(1, Number(post.subreddit_subscribers || 1)) * 10000 + Number(post.num_comments || 0) / 10),
          monetizationSignals: /onlyfans|fansly|vip|telegram|paid|subscription|link in bio/i.test(`${title} ${selftext}`) ? ["monetization_language"] : [],
          platforms: ["reddit"],
          metadata: { redditPostId: post.id, permalink: post.permalink, subreddit, score: post.score, comments: post.num_comments },
        }, runId);
        count += 1;
      }
      await logTelemetry({ runId, eventType: "source_discovery", status: "success", source: `reddit:r/${subreddit}`, outcome: `imported up to ${count} leads`, metadata: { subreddit } });
    } catch (error: any) {
      await logTelemetry({ runId, eventType: "source_discovery", status: "warning", source: `reddit:r/${subreddit}`, outcome: error?.message || String(error), metadata: { subreddit } });
    }
  }
  return count;
}

async function discoverFromHttpEndpoints(config: VaultXOperatorConfig, runId: string, limit: number) {
  let count = 0;
  for (const endpoint of config.sourceHttpEndpoints || []) {
    if (count >= limit) break;
    try {
      const response = await fetch(endpoint, { headers: { "accept": "application/json", "user-agent": "VaultXCreatorAcquisition/1.0" } });
      if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
      const json = await response.json() as any;
      const leads = Array.isArray(json) ? json : Array.isArray(json?.leads) ? json.leads : Array.isArray(json?.creators) ? json.creators : [];
      for (const rawLead of leads.slice(0, limit - count)) {
        if (!rawLead?.platform || !rawLead?.handle) continue;
        await upsertVaultXLead({ ...rawLead, source: rawLead.source || `http:${endpoint}` }, runId);
        count += 1;
      }
      await logTelemetry({ runId, eventType: "source_discovery", status: "success", source: endpoint, outcome: `imported ${count} leads`, metadata: { endpoint } });
    } catch (error: any) {
      await logTelemetry({ runId, eventType: "source_discovery", status: "warning", source: endpoint, outcome: error?.message || String(error), metadata: { endpoint } });
    }
  }
  return count;
}

async function importRecruiterProfiles(runId: string, limit: number) {
  try {
    const rows = await rawQuery<any>(`SELECT platform, handle, display_name, profile_url, source, bio, niche, followers, engagement_rate, recent_post, platforms, telegram_username, metadata
      FROM recruiter_creator_profiles ORDER BY total_score DESC LIMIT ?`, [limit]);
    for (const row of rows) {
      await upsertVaultXLead({
        platform: row.platform, handle: row.handle, displayName: row.display_name, profileUrl: row.profile_url, source: `recruiter_os:${row.source || "unknown"}`,
        bio: row.bio, niche: row.niche, vertical: row.niche, followers: Number(row.followers || 0), engagementRate: Number(row.engagement_rate || 0), recentActivity: row.recent_post,
        platforms: safeJson<string[]>(row.platforms, [row.platform]), telegramUsername: row.telegram_username || undefined,
        metadata: { importedFrom: "recruiter_creator_profiles", originalMetadata: safeJson<Record<string, unknown>>(row.metadata, {}) },
      }, runId);
    }
    return rows.length;
  } catch (error) {
    await logTelemetry({ runId, eventType: "source_import_skipped", status: "warning", source: "recruiter_creator_profiles", outcome: error instanceof Error ? error.message : String(error) });
    return 0;
  }
}

export async function runVaultXAcquisitionTick(options: { mode?: "auto" | "manual" | "test"; sourceLimit?: number; outreachLimit?: number; followUpLimit?: number } = {}) {
  if (running) return { skipped: true, reason: "previous_run_still_active" };
  running = true;
  const runId = randomUUID();
  const mode = options.mode || "auto";
  let sourced = 0, queued = 0, sent = 0, failed = 0, handoff = 0;
  try {
    await ensureVaultXAcquisitionSchema();
    const config = await getVaultXAcquisitionConfig();
    await rawExec("INSERT INTO vaultx_operator_runs (run_id, mode, status) VALUES (?, ?, 'running')", [runId, mode]);
    if (!config.enabled) {
      await rawExec("UPDATE vaultx_operator_runs SET status='skipped', finished_at=CURRENT_TIMESTAMP, proof=? WHERE run_id=?", [serialize({ reason: "disabled" }), runId]);
      return { runId, skipped: true, reason: "disabled" };
    }
    const sourceLimit = options.sourceLimit || config.maxDiscoveryPerTick || 100;
    sourced += await importConfiguredSeeds(config, runId);
    sourced += await discoverFromHttpEndpoints(config, runId, sourceLimit);
    sourced += await discoverFromReddit(config, runId, Math.max(0, sourceLimit - sourced));
    sourced += await importRecruiterProfiles(runId, sourceLimit);
    queued += await queueFirstTouches(runId, options.outreachLimit || config.maxFirstTouchesPerTick);
    queued += await queueDueFollowUps(runId, options.followUpLimit || config.maxFollowUpsPerTick, config);
    const execution = await executeDueActions(runId, (options.outreachLimit || config.maxFirstTouchesPerTick) + (options.followUpLimit || config.maxFollowUpsPerTick), config);
    sent = execution.sent; failed = execution.failed; handoff = execution.handoff;
    const escalatedRows = await rawQuery<{ cnt: number }>("SELECT COUNT(*) AS cnt FROM vaultx_creator_leads WHERE status IN ('hot_reply','handoff')");
    const proof = { runId, sourced, queued, sent, failed, handoff, executedActions: execution.proofs, escalatedCount: Number(escalatedRows[0]?.cnt || 0) };
    await rawExec("UPDATE vaultx_operator_runs SET status='completed', finished_at=CURRENT_TIMESTAMP, sourced_count=?, queued_count=?, sent_count=?, failed_count=?, handoff_count=?, escalated_count=?, proof=? WHERE run_id=?", [sourced, queued, sent, failed, handoff, Number(escalatedRows[0]?.cnt || 0), serialize(proof), runId]);
    await logTelemetry({ runId, eventType: "operator_tick_completed", status: failed ? "warning" : "success", outcome: `sourced=${sourced}, queued=${queued}, sent=${sent}, failed=${failed}`, metadata: proof });
    return proof;
  } catch (error: any) {
    try { await rawExec("UPDATE vaultx_operator_runs SET status='failed', finished_at=CURRENT_TIMESTAMP, error_message=? WHERE run_id=?", [error?.message || String(error), runId]); } catch { /* ignore */ }
    try { await logTelemetry({ runId, eventType: "operator_tick_failed", status: "failed", outcome: error?.message || String(error) }); } catch { /* ignore */ }
    throw error;
  } finally {
    running = false;
  }
}

export async function getVaultXAcquisitionBoard(limit = 100) {
  await ensureVaultXAcquisitionSchema();
  const leads = await rawQuery<any>(`SELECT id, uuid, platform, handle, display_name, profile_url, source, niche, vertical, followers, engagement_rate, score, score_breakdown, priority_band, status, reply_status, follow_up_count, last_outreach_at, next_follow_up_at, cta_url, onboarding_url, handoff_required, handoff_reason, created_at, updated_at
    FROM vaultx_creator_leads ORDER BY FIELD(priority_band, 'hot','warm','cool','cold'), score DESC, updated_at DESC LIMIT ?`, [limit]);
  const actions = await rawQuery<any>(`SELECT a.id, a.uuid, a.lead_id, l.platform, l.handle, a.stage, a.channel, a.status, a.attempt_count, a.due_at, a.sent_at, a.external_message_id, a.error_message, a.message, a.cta_url, a.proof
    FROM vaultx_outreach_actions a JOIN vaultx_creator_leads l ON l.id=a.lead_id ORDER BY a.created_at DESC LIMIT ?`, [limit]);
  const handoffs = await rawQuery<any>(`SELECT h.*, l.platform, l.handle, l.score, l.priority_band FROM vaultx_handoff_cases h JOIN vaultx_creator_leads l ON l.id=h.lead_id WHERE h.status='open' ORDER BY FIELD(h.severity,'critical','high','medium','low'), h.created_at DESC LIMIT ?`, [limit]);
  const runs = await rawQuery<any>("SELECT * FROM vaultx_operator_runs ORDER BY started_at DESC LIMIT 25");
  return { leads, actions, handoffs, runs };
}

export async function getVaultXExecutionProof(limit = 100) {
  await ensureVaultXAcquisitionSchema();
  const telemetry = await rawQuery<any>("SELECT * FROM vaultx_acquisition_telemetry ORDER BY created_at DESC LIMIT ?", [limit]);
  const summary = await rawQuery<any>(`SELECT
    COUNT(*) AS total_leads,
    SUM(priority_band='hot') AS hot_leads,
    SUM(priority_band='warm') AS warm_leads,
    SUM(status='contacted') AS contacted,
    SUM(status IN ('hot_reply','handoff')) AS escalated,
    SUM(handoff_required=TRUE) AS handoff_required
    FROM vaultx_creator_leads`);
  return { summary: summary[0], telemetry };
}

export async function startVaultXAcquisitionCron() {
  if (cronHandle) return { started: false, reason: "already_started" };
  const config = await getVaultXAcquisitionConfig();
  if (!config.enabled) return { started: false, reason: "disabled" };
  cronHandle = setInterval(() => {
    runVaultXAcquisitionTick({ mode: "auto" }).catch(error => console.error("[VaultX Acquisition] tick failed", error));
  }, Math.max(60_000, config.tickIntervalMs || DEFAULT_CONFIG.tickIntervalMs));
  runVaultXAcquisitionTick({ mode: "auto" }).catch(error => console.error("[VaultX Acquisition] startup tick failed", error));
  console.log(`[VaultX Acquisition] autonomous operator started; interval=${Math.max(60_000, config.tickIntervalMs || DEFAULT_CONFIG.tickIntervalMs)}ms`);
  return { started: true, intervalMs: Math.max(60_000, config.tickIntervalMs || DEFAULT_CONFIG.tickIntervalMs) };
}

export function stopVaultXAcquisitionCron() {
  if (cronHandle) clearInterval(cronHandle);
  cronHandle = null;
  return { stopped: true };
}
