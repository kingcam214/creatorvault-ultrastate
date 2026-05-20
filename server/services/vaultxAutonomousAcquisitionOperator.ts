import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { qualityGate } from "./qualityGate";

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

export interface VaultXOwnerAutopilotPolicy {
  enabled: boolean;
  approvedBy?: string;
  approvedAt?: string;
  policyVersion: string;
  minScore: number;
  dailySendLimit: number;
  allowedChannels: string[];
  allowedStages: OutreachStage[];
  requireDirectDelivery: boolean;
  stopOnRiskSignals: boolean;
  plainEnglishSummary: string;
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
  ownerAutopilot: VaultXOwnerAutopilotPolicy;
}

const DEFAULT_CONFIG: VaultXOperatorConfig = {
  enabled: process.env.VAULTX_ACQUISITION_ENABLED === "true",
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
  ownerAutopilot: {
    enabled: process.env.VAULTX_OWNER_AUTOPILOT_ENABLED === "true",
    approvedBy: process.env.VAULTX_OWNER_AUTOPILOT_REVIEWER || undefined,
    approvedAt: process.env.VAULTX_OWNER_AUTOPILOT_APPROVED_AT || undefined,
    policyVersion: "vaultx-owner-autopilot-v1",
    minScore: 85,
    dailySendLimit: 50,
    allowedChannels: ["telegram", "webhook"],
    allowedStages: ["first_touch", "follow_up_1", "follow_up_2", "follow_up_3", "final_cta"],
    requireDirectDelivery: true,
    stopOnRiskSignals: true,
    plainEnglishSummary: "Find hot creator leads, send approved VaultX outreach only through real delivery connections, follow up inside the daily cap, and interrupt the owner only for risk, missing delivery setup, failed sends, or ready-to-close replies.",
  },
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

function getVaultXAcquisitionLiveApproval(config?: VaultXOperatorConfig) {
  const enabled = process.env.VAULTX_ACQUISITION_LIVE_SENDS_ENABLED === "true";
  const outboundApproved = process.env.CREATORVAULT_OUTBOUND_APPROVED === "premium-reviewed";
  const proofId = process.env.CREATORVAULT_OUTBOUND_PROOF_ID?.trim();
  const reviewer = process.env.CREATORVAULT_OUTBOUND_REVIEWER?.trim();
  const envApproved = Boolean(enabled && outboundApproved && proofId && reviewer);
  const autopilot = config?.ownerAutopilot;
  const ownerAutopilotApproved = Boolean(autopilot?.enabled && autopilot?.approvedBy && autopilot?.approvedAt);
  const approved = envApproved || ownerAutopilotApproved;
  return {
    approved,
    envApproved,
    ownerAutopilotApproved,
    mode: envApproved ? "live-approved" : ownerAutopilotApproved ? "owner-autopilot" : "dry-run-only",
    enabled,
    outboundApproved,
    hasProofId: Boolean(proofId),
    hasReviewer: Boolean(reviewer),
    proofId: proofId || null,
    reviewer: reviewer || null,
    ownerAutopilot: autopilot ? {
      enabled: autopilot.enabled,
      approvedBy: autopilot.approvedBy || null,
      approvedAt: autopilot.approvedAt || null,
      policyVersion: autopilot.policyVersion,
      minScore: autopilot.minScore,
      dailySendLimit: autopilot.dailySendLimit,
      allowedChannels: autopilot.allowedChannels,
      allowedStages: autopilot.allowedStages,
      requireDirectDelivery: autopilot.requireDirectDelivery,
      plainEnglishSummary: autopilot.plainEnglishSummary,
    } : null,
  };
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
  return {
    ...DEFAULT_CONFIG,
    ...stored,
    priorityPlatforms: { ...DEFAULT_CONFIG.priorityPlatforms, ...(stored.priorityPlatforms || {}) },
    ownerAutopilot: { ...DEFAULT_CONFIG.ownerAutopilot, ...(stored.ownerAutopilot || {}) },
  };
}

export async function updateVaultXAcquisitionConfig(patch: Partial<VaultXOperatorConfig>) {
  const current = await getVaultXAcquisitionConfig();
  const next = { ...current, ...patch, priorityPlatforms: { ...current.priorityPlatforms, ...(patch.priorityPlatforms || {}) }, ownerAutopilot: { ...current.ownerAutopilot, ...(patch.ownerAutopilot || {}) } };
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

function deliveryPathFor(action: any, lead: any, config: VaultXOperatorConfig) {
  if (action.channel === "telegram" && lead.telegram_chat_id && config.telegramBotToken) return { kind: "direct_telegram", direct: true };
  if (action.channel === "webhook" && lead.webhook_url && config.allowHttpWebhooks) return { kind: "direct_webhook", direct: true };
  if (config.telegramOpsChatId && config.telegramBotToken) return { kind: "ops_relay", direct: false };
  return { kind: "outbox_only", direct: false };
}

async function countAutopilotSendsToday() {
  const rows = await rawQuery<{ cnt: number }>("SELECT COUNT(*) AS cnt FROM vaultx_outreach_actions WHERE status='sent' AND sent_at >= CURRENT_DATE");
  return Number(rows[0]?.cnt || 0);
}

async function evaluateOwnerAutopilot(action: any, lead: any, config: VaultXOperatorConfig) {
  const policy = config.ownerAutopilot;
  const deliveryPath = deliveryPathFor(action, lead, config);
  const scoreBreakdown = safeJson<Record<string, unknown>>(lead.score_breakdown, {});
  const blockedTerms = Array.isArray(scoreBreakdown.blockedTerms) ? scoreBreakdown.blockedTerms : [];
  const sentToday = await countAutopilotSendsToday();
  const guardrails = {
    policyEnabled: Boolean(policy.enabled),
    standingApprovalPresent: Boolean(policy.approvedBy && policy.approvedAt),
    score: Number(lead.score || 0),
    minScore: policy.minScore,
    channel: action.channel,
    channelAllowed: policy.allowedChannels.includes(action.channel),
    stage: action.stage,
    stageAllowed: policy.allowedStages.includes(action.stage),
    deliveryPath: deliveryPath.kind,
    directDelivery: deliveryPath.direct,
    dailySendLimit: policy.dailySendLimit,
    sentToday,
    blockedTerms,
  };

  let approved = true;
  let reason = "inside_owner_approved_guardrails";
  if (!policy.enabled) { approved = false; reason = "owner_autopilot_not_enabled"; }
  else if (!policy.approvedBy || !policy.approvedAt) { approved = false; reason = "owner_standing_approval_missing"; }
  else if (Number(lead.handoff_required || 0) === 1 || lead.handoff_required === true) { approved = false; reason = "lead_already_requires_escalation"; }
  else if (Number(lead.score || 0) < policy.minScore) { approved = false; reason = "lead_score_below_owner_autopilot_threshold"; }
  else if (policy.stopOnRiskSignals && blockedTerms.length) { approved = false; reason = "risk_signal_requires_escalation"; }
  else if (!policy.allowedChannels.includes(action.channel)) { approved = false; reason = "channel_not_inside_owner_autopilot_rules"; }
  else if (!policy.allowedStages.includes(action.stage)) { approved = false; reason = "stage_not_inside_owner_autopilot_rules"; }
  else if (policy.requireDirectDelivery && !deliveryPath.direct) { approved = false; reason = "autopilot_delivery_setup_needed"; }
  else if (sentToday >= policy.dailySendLimit) { approved = false; reason = "owner_autopilot_daily_send_cap_reached"; }

  return {
    approved,
    reason,
    deliveryPath: deliveryPath.kind,
    guardrails,
    policy: {
      enabled: policy.enabled,
      approvedBy: policy.approvedBy || null,
      approvedAt: policy.approvedAt || null,
      policyVersion: policy.policyVersion,
      plainEnglishSummary: policy.plainEnglishSummary,
    },
  };
}

function generateMessage(lead: any, stage: OutreachStage) {
  const handle = lead.display_name || `@${lead.handle}`;
  const niche = lead.niche || lead.vertical || "creator brand";
  const cta = lead.cta_url || lead.onboarding_url;
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
  const message = qualityGate.check(generateMessage(lead, stage), {
    surface: channel === "telegram" || channel === "telegram_username_outbox" ? "telegram-dm" : "agent-public-output",
    context: "vaultx",
    recipientKey: `${lead.platform}:${lead.handle}:${stage}`,
    hasActionElement: true,
    requireCreatorVaultPositioning: true,
    requireMessagingDna: true,
    requireMechanism: true,
    ctaAngle: stage === "first_touch" ? "automation-advantage" : "asset-conversion",
  });
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
  const approvedText = qualityGate.check(text, {
    surface: "telegram-dm",
    context: "vaultx",
    recipientKey: chatId,
    hasActionElement: true,
    requireCreatorVaultPositioning: true,
    requireMessagingDna: true,
    requireMechanism: true,
    ctaAngle: "automation-advantage",
  });
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: approvedText, disable_web_page_preview: false }),
  });
  const json = await response.json() as any;
  if (!response.ok || !json.ok) throw new Error(json?.description || `Telegram HTTP ${response.status}`);
  return json.result?.message_id ? String(json.result.message_id) : null;
}

async function dispatchAction(action: any, config: VaultXOperatorConfig, runId: string, mode: "auto" | "manual" | "test") {
  const [lead] = await rawQuery<any>("SELECT * FROM vaultx_creator_leads WHERE id=? LIMIT 1", [action.lead_id]);
  if (!lead) throw new Error(`Lead ${action.lead_id} not found`);
  let externalId: string | null = null;
  const liveApproval = getVaultXAcquisitionLiveApproval(config);
  const approvedMessage = qualityGate.check(action.message, {
    surface: action.channel === "telegram" || action.channel === "telegram_username_outbox" ? "telegram-dm" : "agent-public-output",
    context: "vaultx",
    recipientKey: `${lead.platform}:${lead.handle}:${action.stage}:dispatch`,
    hasActionElement: true,
    requireCreatorVaultPositioning: true,
    requireMessagingDna: true,
    requireMechanism: true,
    ctaAngle: action.stage === "first_touch" ? "automation-advantage" : "asset-conversion",
  });
  const ownerAutopilot = await evaluateOwnerAutopilot(action, lead, config);
  const liveSendAllowed = mode !== "test" && (liveApproval.envApproved || ownerAutopilot.approved);
  const proof: Record<string, unknown> = {
    channel: action.channel,
    attemptedAt: new Date().toISOString(),
    liveApproval: { mode: liveApproval.mode, enabled: liveApproval.enabled, outboundApproved: liveApproval.outboundApproved, envApproved: liveApproval.envApproved, ownerAutopilotApproved: liveApproval.ownerAutopilotApproved, hasProofId: liveApproval.hasProofId, hasReviewer: liveApproval.hasReviewer, proofId: liveApproval.proofId, reviewer: liveApproval.reviewer, ownerAutopilot: liveApproval.ownerAutopilot },
    ownerAutopilot,
    deliveryPath: ownerAutopilot.deliveryPath,
    dryRunOnly: !liveSendAllowed,
    plainEnglish: liveSendAllowed
      ? "Autopilot is allowed to send this action because it fits the owner-approved rules."
      : "The platform prepared the outreach but did not send it because it was outside the current owner-approved guardrails.",
  };

  if (!liveSendAllowed) {
    proof.reason = mode === "test" ? "test_mode_forces_dry_run" : ownerAutopilot.reason || "live_send_approval_state_missing";
    proof.messagePreview = approvedMessage;
    proof.autopilotHandoffCreated = true;
    const handoffContext = {
      actionId: action.id,
      stage: action.stage,
      channel: action.channel,
      messagePreview: approvedMessage,
      ctaUrl: action.cta_url || lead.cta_url || lead.onboarding_url || null,
      leadHandle: lead.handle ? `@${lead.handle}` : null,
      leadPlatform: lead.platform || null,
      leadProfileUrl: lead.profile_url || null,
      approvalState: proof.liveApproval,
      ownerAutopilot,
      dryRunOnly: proof.dryRunOnly,
      blockedReason: proof.reason,
      plainEnglish: "This is not a normal manual-send task. It is the platform telling the owner exactly what setup or guardrail stopped full autopilot for this one action.",
    };
    await rawExec("UPDATE vaultx_outreach_actions SET status='skipped', proof=?, attempt_count=attempt_count+1 WHERE id=?", [serialize(proof), action.id]);
    await createHandoff(lead.id, runId, String(proof.reason), proof.reason === "autopilot_delivery_setup_needed" ? "medium" : "high", handoffContext);
    await logTelemetry({ runId, leadId: lead.id, eventType: "outreach_dry_run", status: "success", score: lead.score, priorityBand: lead.priority_band, channel: action.channel, outcome: String(proof.reason), metadata: proof });
    return { actionId: action.id, leadId: lead.id, channel: action.channel, externalId: null, proof, dryRun: true, handoffCreated: true, autopilotBlocked: true };
  }

  if (action.channel === "telegram" && lead.telegram_chat_id && config.telegramBotToken) {
    externalId = await sendTelegram(lead.telegram_chat_id, approvedMessage, config.telegramBotToken);
    proof.telegramMessageId = externalId;
  } else if (action.channel === "webhook" && lead.webhook_url && config.allowHttpWebhooks) {
    const response = await fetch(lead.webhook_url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lead, action: { ...action, message: approvedMessage }, source: "vaultx_autonomous_acquisition", liveApproval: { proofId: liveApproval.proofId, reviewer: liveApproval.reviewer } }) });
    proof.webhookStatus = response.status;
    if (!response.ok) throw new Error(`Webhook dispatch failed with HTTP ${response.status}`);
    externalId = response.headers.get("x-message-id") || `webhook_${Date.now()}`;
  } else if (config.telegramOpsChatId && config.telegramBotToken) {
    externalId = await sendTelegram(config.telegramOpsChatId, `[VaultX acquisition outbox]\nLead: ${lead.platform}/@${lead.handle}\nChannel: ${action.channel}\nScore: ${lead.score}\n\n${approvedMessage}`, config.telegramBotToken);
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

async function executeDueActions(runId: string, limit: number, config: VaultXOperatorConfig, mode: "auto" | "manual" | "test") {
  const actions = await rawQuery<any>(`SELECT * FROM vaultx_outreach_actions
    WHERE status='queued' AND due_at <= CURRENT_TIMESTAMP AND attempt_count < max_attempts
    ORDER BY due_at ASC, id ASC LIMIT ?`, [limit]);
  let sent = 0, failed = 0, handoff = 0, dryRun = 0;
  const proofs: any[] = [];
  for (const action of actions) {
    try {
      const proof = await dispatchAction(action, config, runId, mode);
      if (proof.dryRun) {
        dryRun += 1;
        if (proof.handoffCreated) handoff += 1;
      } else sent += 1;
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
  return { sent, failed, handoff, dryRun, proofs };
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
          const execution = await executeDueActions(runId, (options.outreachLimit || config.maxFirstTouchesPerTick) + (options.followUpLimit || config.maxFollowUpsPerTick), config, mode);

    sent = execution.sent; failed = execution.failed; handoff = execution.handoff;
    const escalatedRows = await rawQuery<{ cnt: number }>("SELECT COUNT(*) AS cnt FROM vaultx_creator_leads WHERE status IN ('hot_reply','handoff')");
          const proof = { runId, mode, liveApproval: getVaultXAcquisitionLiveApproval(config), ownerAutopilot: config.ownerAutopilot, platformCapability: config.ownerAutopilot?.enabled ? "Guarded autopilot can send safe creator outreach inside the owner-approved rules and only interrupts for risk, missing delivery setup, failures, or ready-to-close replies." : "Proof-only mode can scout, score, write, and queue outreach, but live sending waits until owner autopilot is enabled.", sourced, queued, sent, dryRun: execution.dryRun, failed, handoff, executedActions: execution.proofs, escalatedCount: Number(escalatedRows[0]?.cnt || 0) };

    await rawExec("UPDATE vaultx_operator_runs SET status='completed', finished_at=CURRENT_TIMESTAMP, sourced_count=?, queued_count=?, sent_count=?, failed_count=?, handoff_count=?, escalated_count=?, proof=? WHERE run_id=?", [sourced, queued, sent, failed, handoff, Number(escalatedRows[0]?.cnt || 0), serialize(proof), runId]);
          await logTelemetry({ runId, eventType: "operator_tick_completed", status: failed ? "warning" : "success", outcome: `sourced=${sourced}, queued=${queued}, sent=${sent}, dryRun=${execution.dryRun}, failed=${failed}`, metadata: proof });

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
