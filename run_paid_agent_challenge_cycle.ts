import { runChallengeAutomationCycle } from './server/routers/challengeAutomationRouter.ts';

async function main() {
  const mode = (process.argv[2] === 'full' ? 'full' : 'priority') as 'priority' | 'full';
  const startedAt = new Date().toISOString();
  const result: any = await runChallengeAutomationCycle(mode);
  const finishedAt = new Date().toISOString();
  const results = Array.isArray(result?.results) ? result.results : [];
  const summary = {
    startedAt,
    finishedAt,
    mode,
    skipped: Boolean(result?.skipped),
    reason: result?.reason ?? null,
    agentsRan: Number(result?.agentsRan ?? results.length ?? 0),
    totalRevenue: Number(result?.totalRevenue ?? 0),
    successCount: Number(result?.successCount ?? results.filter((r: any) => r.status === 'success').length),
    failedCount: Number(result?.failedCount ?? results.filter((r: any) => r.status === 'failed').length),
    topResults: results.slice(0, 30).map((r: any) => ({
      agentSlug: r.agentSlug,
      status: r.status,
      revenue: Number(r.revenue ?? 0),
      action: String(r.action ?? '').slice(0, 180),
      outcome: String(r.outcome ?? '').slice(0, 240),
    })),
  };
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack?.split('\n').slice(0, 8).join('\n') : null }, null, 2));
    process.exit(1);
  });
