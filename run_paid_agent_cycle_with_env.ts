import { runChallengeAutomationCycle } from "./server/routers/challengeAutomationRouter";
async function main() {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  try {
    const result: any = await runChallengeAutomationCycle("priority");
    const agents = Array.isArray(result?.agents) ? result.agents : [];
    const summary = {
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      mode: result?.mode ?? "priority",
      agentsRan: agents.length,
      successCount: agents.filter((a:any) => a?.status === "success").length,
      failedCount: agents.filter((a:any) => a?.status === "failed").length,
      totalRevenue: result?.totalRevenue ?? null,
      moneyDropActions: agents.filter((a:any) => String(a?.action || "").includes("vaultx_drop") || String(a?.outcome || "").includes("vaultx_drop") || String(a?.action || "").includes("telegram") || String(a?.outcome || "").includes("telegram")).map((a:any) => ({ slug: a.slug || a.agentSlug || a.name, status: a.status, action: a.action })).slice(0, 10),
      agents: agents.map((a:any) => ({ slug: a.slug || a.agentSlug || a.name, status: a.status, revenue: a.revenue, action: a.action, outcome: a.outcome ? String(a.outcome).slice(0, 160) : undefined, error: a.error ? String(a.error).slice(0, 180) : undefined })),
    };
    console.log(JSON.stringify(summary, null, 2));
  } catch (err:any) {
    console.log(JSON.stringify({ ok: false, startedAt, failedAt: new Date().toISOString(), durationMs: Date.now() - started, error: String(err?.stack || err?.message || err).slice(0, 2000) }, null, 2));
    process.exitCode = 1;
  }
}
main();
