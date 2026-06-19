import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import * as db from "../db";

export type AgentReceiptStatus = "started" | "success" | "failed" | "skipped";

export type AgentActionReceiptInput = {
  telemetryEventId?: string | null;
  cycleId?: string | null;
  agentSlug: string;
  agentName: string;
  agentCategory: string;
  taskType: string;
  action: string;
  status: AgentReceiptStatus;
  outcomeSummary?: string | null;
  evidence?: Record<string, unknown> | null;
  artifacts?: Record<string, unknown> | null;
  revenueGenerated?: number;
  startedAt?: Date | string | null;
  finishedAt?: Date | string | null;
};

export type AgentActionReceipt = AgentActionReceiptInput & {
  id: string;
  revenueGenerated: number;
  createdAt: Date | string | null;
};

export const PRIMARY_AGENT_RECEIPT_SLUGS = [
  "telegram-bot-manager-agent",
  "auto-recruiter-agent",
  "money-follow-up-agent",
  "stripe-revenue-agent",
  "engagement-agent",
] as const;

function rowsFromExecute(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0];
  if (Array.isArray(result)) return result;
  return result.rows ?? [];
}

function parseJson(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return { raw: value };
  }
}

function mapReceipt(row: any): AgentActionReceipt {
  return {
    id: String(row.id),
    telemetryEventId: row.telemetry_event_id ?? null,
    cycleId: row.cycle_id ?? null,
    agentSlug: String(row.agent_slug),
    agentName: String(row.agent_name),
    agentCategory: String(row.agent_category),
    taskType: String(row.task_type),
    action: String(row.action),
    status: row.status as AgentReceiptStatus,
    outcomeSummary: row.outcome_summary ?? null,
    evidence: parseJson(row.evidence),
    artifacts: parseJson(row.artifacts),
    revenueGenerated: Number(row.revenue_generated ?? 0),
    startedAt: row.started_at ?? null,
    finishedAt: row.finished_at ?? null,
    createdAt: row.created_at ?? null,
  };
}

export function getPrimaryAgentReceiptRank(agentSlug: string): number | null {
  const rank = PRIMARY_AGENT_RECEIPT_SLUGS.indexOf(agentSlug as any);
  return rank >= 0 ? rank + 1 : null;
}

export async function ensureAgentActionReceiptsSchema(): Promise<void> {
  await db.db.execute(sql`
    CREATE TABLE IF NOT EXISTS agent_action_receipts (
      id VARCHAR(36) PRIMARY KEY,
      telemetry_event_id VARCHAR(36),
      cycle_id VARCHAR(36),
      agent_slug VARCHAR(128) NOT NULL,
      agent_name VARCHAR(256) NOT NULL,
      agent_category VARCHAR(64) NOT NULL,
      task_type VARCHAR(100) NOT NULL,
      action VARCHAR(191) NOT NULL,
      status ENUM('started', 'success', 'failed', 'skipped') NOT NULL,
      outcome_summary TEXT,
      evidence JSON,
      artifacts JSON,
      revenue_generated DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      started_at TIMESTAMP NULL,
      finished_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_agent_action_receipts_agent_created (agent_slug, created_at),
      INDEX idx_agent_action_receipts_cycle (cycle_id),
      INDEX idx_agent_action_receipts_status_created (status, created_at),
      INDEX idx_agent_action_receipts_telemetry (telemetry_event_id)
    )
  `);
}

export async function recordAgentActionReceipt(input: AgentActionReceiptInput): Promise<string> {
  const id = randomUUID();
  const startedAt = input.startedAt ? new Date(input.startedAt) : null;
  const finishedAt = input.finishedAt ? new Date(input.finishedAt) : new Date();
  const revenueGenerated = Number.isFinite(input.revenueGenerated) ? Number(input.revenueGenerated) : 0;

  await ensureAgentActionReceiptsSchema();
  await db.db.execute(sql`
    INSERT INTO agent_action_receipts
      (id, telemetry_event_id, cycle_id, agent_slug, agent_name, agent_category, task_type,
       action, status, outcome_summary, evidence, artifacts, revenue_generated, started_at, finished_at, created_at)
    VALUES
      (${id}, ${input.telemetryEventId ?? null}, ${input.cycleId ?? null}, ${input.agentSlug}, ${input.agentName},
       ${input.agentCategory}, ${input.taskType}, ${input.action.slice(0, 191)}, ${input.status},
       ${(input.outcomeSummary || "").slice(0, 4000)}, ${input.evidence ? JSON.stringify(input.evidence) : null},
       ${input.artifacts ? JSON.stringify(input.artifacts) : null}, ${revenueGenerated}, ${startedAt}, ${finishedAt}, NOW())
  `);

  return id;
}

export async function getRecentAgentActionReceipts(params: {
  limit?: number;
  agentSlug?: string;
  onlyPrimary?: boolean;
} = {}): Promise<AgentActionReceipt[]> {
  const limit = Math.max(1, Math.min(100, Math.round(params.limit ?? 25)));
  await ensureAgentActionReceiptsSchema();

  if (params.agentSlug) {
    const result = await db.db.execute(sql`
      SELECT * FROM agent_action_receipts
      WHERE agent_slug = ${params.agentSlug}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
    return rowsFromExecute(result).map(mapReceipt);
  }

  if (params.onlyPrimary) {
    const result = await db.db.execute(sql`
      SELECT * FROM agent_action_receipts
      WHERE agent_slug IN (${sql.join(PRIMARY_AGENT_RECEIPT_SLUGS.map(slug => sql`${slug}`), sql`,`)})
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
    return rowsFromExecute(result).map(mapReceipt);
  }

  const result = await db.db.execute(sql`
    SELECT * FROM agent_action_receipts
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);
  return rowsFromExecute(result).map(mapReceipt);
}
