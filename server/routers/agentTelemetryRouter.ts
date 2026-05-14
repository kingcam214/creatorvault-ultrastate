import { z } from "zod";
import { randomUUID } from "crypto";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { eq, desc, gte, and, sql } from "drizzle-orm";

// Time range helper
function getStartDate(timeRange: string): Date | null {
  const now = new Date();
  switch (timeRange) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "all":
    default:
      return null;
  }
}

export const agentTelemetryRouter = router({
  getSummaryStats: protectedProcedure
    .input(z.object({ timeRange: z.enum(["today", "24h", "week", "all"]).default("24h") }))
    .query(async ({ input }) => {
      const startDate = getStartDate(input.timeRange);
      try {
        // Query agent_telemetry_events for rich data
        let telemetryRows: any[] = [];
        let execRows: any[] = [];

        if (startDate) {
          telemetryRows = await db.db.execute(
            sql`SELECT status, revenue_generated FROM agent_telemetry_events WHERE created_at >= ${startDate}`
          ) as any[];
          execRows = await db.db.execute(
            sql`SELECT status FROM agent_execution_runs WHERE started_at >= ${startDate}`
          ) as any[];
        } else {
          telemetryRows = await db.db.execute(
            sql`SELECT status, revenue_generated FROM agent_telemetry_events`
          ) as any[];
          execRows = await db.db.execute(
            sql`SELECT status FROM agent_execution_runs`
          ) as any[];
        }

        const tRows = Array.isArray(telemetryRows) ? telemetryRows : (telemetryRows as any)[0] ?? [];
        const eRows = Array.isArray(execRows) ? execRows : (execRows as any)[0] ?? [];

        const allRows = [...tRows, ...eRows];
        const totalTasks = allRows.length;
        const successCount = allRows.filter((r: any) => r.status === "success" || r.status === "completed").length;
        const failedCount = allRows.filter((r: any) => r.status === "failed").length;
        const successRate = totalTasks > 0 ? (successCount / totalTasks) * 100 : 0;
        const totalRevenue = tRows.reduce((sum: number, r: any) => sum + (parseFloat(r.revenue_generated) || 0), 0);

        // Active agents count (distinct agents in the time window)
        const agentCountRows = startDate
          ? await db.db.execute(sql`SELECT COUNT(DISTINCT agent_id) as cnt FROM agent_telemetry_events WHERE created_at >= ${startDate}`)
          : await db.db.execute(sql`SELECT COUNT(DISTINCT agent_id) as cnt FROM agent_telemetry_events`);
        const agentCountArr = Array.isArray(agentCountRows) ? agentCountRows : (agentCountRows as any)[0] ?? [];
        const activeAgents = agentCountArr[0]?.cnt ?? 0;

        return {
          totalRevenue,
          tasksCompleted: successCount,
          successRate,
          activeAgents: Number(activeAgents),
          failedCount,
          totalTasks,
        };
      } catch (e) {
        console.error("[agentTelemetry.getSummaryStats]", e);
        return { totalRevenue: 0, tasksCompleted: 0, successRate: 0, activeAgents: 0, failedCount: 0, totalTasks: 0 };
      }
    }),

  getRecentEvents: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(50),
      timeRange: z.enum(["today", "24h", "week", "all"]).default("24h"),
      status: z.string().default("all"),
    }))
    .query(async ({ input }) => {
      const startDate = getStartDate(input.timeRange);
      const offset = (input.page - 1) * input.pageSize;
      try {
        let rows: any[];
        const statusFilter = input.status !== "all" ? `AND status = '${input.status}'` : "";
        const dateFilter = startDate ? `AND created_at >= '${startDate.toISOString().slice(0, 19)}'` : "";

        // Combine telemetry events and execution runs into a unified feed
        // Use CONVERT to ensure consistent utf8mb4_0900_ai_ci collation across UNION
        const query = `
          SELECT id COLLATE utf8mb4_0900_ai_ci as id,
                 agent_id COLLATE utf8mb4_0900_ai_ci as agent_id,
                 agent_name COLLATE utf8mb4_0900_ai_ci as agent_name,
                 agent_category COLLATE utf8mb4_0900_ai_ci as agent_category,
                 task_type COLLATE utf8mb4_0900_ai_ci as task_type,
                 COALESCE(target, '') COLLATE utf8mb4_0900_ai_ci as target,
                 status COLLATE utf8mb4_0900_ai_ci as status,
                 started_at as created_at,
                 COALESCE(outcome, '') COLLATE utf8mb4_0900_ai_ci as outcome,
                 revenue_generated, error_message
          FROM agent_telemetry_events
          WHERE 1=1 ${dateFilter} ${statusFilter}
          UNION ALL
          SELECT CONVERT(CAST(id AS CHAR) USING utf8mb4) COLLATE utf8mb4_0900_ai_ci,
                 CONVERT(CAST(agent_id AS CHAR) USING utf8mb4) COLLATE utf8mb4_0900_ai_ci,
                 agent_name COLLATE utf8mb4_0900_ai_ci,
                 CONVERT('infra' USING utf8mb4) COLLATE utf8mb4_0900_ai_ci,
                 CONVERT('agent_run' USING utf8mb4) COLLATE utf8mb4_0900_ai_ci,
                 CONVERT('' USING utf8mb4) COLLATE utf8mb4_0900_ai_ci,
                 CASE status WHEN 'completed' THEN CONVERT('success' USING utf8mb4) WHEN 'failed' THEN CONVERT('failed' USING utf8mb4) ELSE CONVERT(status USING utf8mb4) END COLLATE utf8mb4_0900_ai_ci,
                 started_at as created_at,
                 CONVERT(COALESCE(result_summary, '') USING utf8mb4) COLLATE utf8mb4_0900_ai_ci,
                 0 as revenue_generated,
                 error_message
          FROM agent_execution_runs
          WHERE 1=1 ${dateFilter.replace(/created_at/g, 'started_at')} ${statusFilter}
          ORDER BY created_at DESC
          LIMIT ${input.pageSize} OFFSET ${offset}
        `;
        const result = await db.db.execute(sql.raw(query));
        rows = Array.isArray(result) ? result : (result as any)[0] ?? [];

        return { data: rows, page: input.page, pageSize: input.pageSize };
      } catch (e) {
        console.error("[agentTelemetry.getRecentEvents]", e);
        return { data: [], page: input.page, pageSize: input.pageSize };
      }
    }),

  getAgentLeaderboard: protectedProcedure
    .input(z.object({
      timeRange: z.enum(["today", "24h", "week", "all"]).default("24h"),
      limit: z.number().default(15),
    }))
    .query(async ({ input }) => {
      const startDate = getStartDate(input.timeRange);
      try {
        const dateFilter = startDate ? `WHERE created_at >= '${startDate.toISOString().slice(0, 19)}'` : "";
        const query = `
          SELECT agent_id, agent_name,
                 COUNT(*) as tasks,
                 SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes,
                 SUM(COALESCE(revenue_generated, 0)) as revenue
          FROM agent_telemetry_events
          ${dateFilter}
          GROUP BY agent_id, agent_name
          ORDER BY revenue DESC, tasks DESC
          LIMIT ${input.limit}
        `;
        const result = await db.db.execute(sql.raw(query));
        const rows = Array.isArray(result) ? result : (result as any)[0] ?? [];
        return rows;
      } catch (e) {
        console.error("[agentTelemetry.getAgentLeaderboard]", e);
        return [];
      }
    }),

  // Log a new telemetry event (used by the challenge automation engine)
  logEvent: protectedProcedure
    .input(z.object({
      agentId: z.string(),
      agentName: z.string(),
      agentCategory: z.enum(["social", "sales", "media", "clone", "comms", "analytics", "infra"]).default("infra"),
      taskType: z.string(),
      target: z.string().optional(),
      status: z.enum(["success", "failed", "warning", "in_progress"]),
      outcome: z.string(),
      revenueGenerated: z.number().default(0),
      errorMessage: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      const id = randomUUID();
      const now = new Date();
      await db.db.execute(sql`
        INSERT INTO agent_telemetry_events
          (id, agent_id, agent_name, agent_category, task_type, target, status,
           started_at, finished_at, outcome, revenue_generated, error_message, metadata)
        VALUES
          (${id}, ${input.agentId}, ${input.agentName}, ${input.agentCategory},
           ${input.taskType}, ${input.target ?? null}, ${input.status},
           ${now}, ${now}, ${input.outcome}, ${input.revenueGenerated},
           ${input.errorMessage ?? null}, ${input.metadata ? JSON.stringify(input.metadata) : null})
      `);
      return { id, logged: true };
    }),
});
