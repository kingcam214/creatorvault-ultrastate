import { beforeEach, describe, expect, it, vi } from "vitest";

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}));

vi.mock("../db", () => ({
  db: {
    execute: executeMock,
  },
}));

import {
  getPrimaryAgentReceiptRank,
  getRecentAgentActionReceipts,
  PRIMARY_AGENT_RECEIPT_SLUGS,
  recordAgentActionReceipt,
} from "./agentActionReceipts";

describe("agentActionReceipts", () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  it("records a durable action receipt with telemetry and proof metadata", async () => {
    executeMock.mockResolvedValueOnce([]); // schema ensure
    executeMock.mockResolvedValueOnce([]); // insert

    const receiptId = await recordAgentActionReceipt({
      telemetryEventId: "telemetry-1",
      cycleId: "cycle-1",
      agentSlug: "stripe-revenue-agent",
      agentName: "Stripe Revenue Agent",
      agentCategory: "analytics",
      taskType: "revenue_report",
      action: "real_stripe_data_pulled + analysis_generated",
      status: "success",
      outcomeSummary: "Stripe data pulled and summarized.",
      evidence: { primaryAgentRank: 4, source: "test" },
      artifacts: { telemetryTable: "agent_telemetry_events" },
      revenueGenerated: 123.45,
      startedAt: new Date("2026-06-19T10:00:00Z"),
      finishedAt: new Date("2026-06-19T10:00:02Z"),
    });

    expect(receiptId).toMatch(/^[0-9a-f-]{36}$/);
    expect(executeMock).toHaveBeenCalledTimes(2);
    expect(executeMock.mock.calls[1][0]).toEqual(expect.any(Object));
  });

  it("returns primary agent ranks for the top receipt-enabled agents", () => {
    expect(PRIMARY_AGENT_RECEIPT_SLUGS).toEqual([
      "telegram-bot-manager-agent",
      "auto-recruiter-agent",
      "money-follow-up-agent",
      "stripe-revenue-agent",
      "engagement-agent",
    ]);
    expect(getPrimaryAgentReceiptRank("telegram-bot-manager-agent")).toBe(1);
    expect(getPrimaryAgentReceiptRank("engagement-agent")).toBe(5);
    expect(getPrimaryAgentReceiptRank("viral-optimizer-agent")).toBeNull();
  });

  it("retrieves and normalizes recent primary action receipts", async () => {
    executeMock.mockResolvedValueOnce([]); // schema ensure
    executeMock.mockResolvedValueOnce([[{
      id: "receipt-1",
      telemetry_event_id: "telemetry-1",
      cycle_id: "cycle-1",
      agent_slug: "telegram-bot-manager-agent",
      agent_name: "Telegram Bot Manager Agent",
      agent_category: "infra",
      task_type: "bot_health_check",
      action: "real_bot_health_checked",
      status: "success",
      outcome_summary: "All bots checked.",
      evidence: JSON.stringify({ primaryAgentRank: 1 }),
      artifacts: JSON.stringify({ telemetryTable: "agent_telemetry_events" }),
      revenue_generated: "0.00",
      started_at: "2026-06-19 10:00:00",
      finished_at: "2026-06-19 10:00:01",
      created_at: "2026-06-19 10:00:01",
    }]]);

    const receipts = await getRecentAgentActionReceipts({ onlyPrimary: true, limit: 5 });

    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      id: "receipt-1",
      agentSlug: "telegram-bot-manager-agent",
      agentName: "Telegram Bot Manager Agent",
      status: "success",
      evidence: { primaryAgentRank: 1 },
      artifacts: { telemetryTable: "agent_telemetry_events" },
      revenueGenerated: 0,
    });
    expect(executeMock.mock.calls[1][0]).toEqual(expect.any(Object));
  });
});
