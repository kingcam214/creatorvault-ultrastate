import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Users, CheckCircle, XCircle, DollarSign, TrendingUp, Play, Zap, RefreshCw, FileText, Bot } from 'lucide-react';

const T = {
  bg: '#0a0a0a', surface: '#111', surface2: '#161616', border: '#1e1e1e',
  gold: '#c9a84c', goldDim: 'rgba(201,168,76,0.12)', goldBright: '#e8c96d',
  text: '#f5f0e8', muted: '#6b6b6b', muted2: '#4a4a4a',
  success: '#22c55e', successDim: 'rgba(34,197,94,0.1)',
  error: '#ef4444', errorDim: 'rgba(239,68,68,0.1)',
  info: '#60a5fa', infoDim: 'rgba(96,165,250,0.1)',
  purple: '#a855f7',
};

const ROLE_COLORS: Record<string, string> = {
  coordinator: '#c9a84c',
  specialist: '#60a5fa',
  executor: '#22c55e',
  analyst: '#a855f7',
};

export function AgentRoster() {
  const [filter, setFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<Record<string, { outcome: string; status: string; action: string }>>({});
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [cycleError, setCycleError] = useState<string | null>(null);

  const agentsQuery = trpc.empireAgents.getEmpireAgents.useQuery();
  const reportsQuery = trpc.empireAgents.getAgentReports.useQuery({ limit: 50 });
  const runAgentMut = trpc.challengeAutomation.runAgent.useMutation();
  const runAllMut = trpc.challengeAutomation.runFullCycle.useMutation();

  const agents = (agentsQuery.data ?? []) as any[];
  const reports = ((reportsQuery.data as any)?.reports ?? []) as any[];
  const dataSourceError = agentsQuery.error?.message || reportsQuery.error?.message || null;

  const reportMap: Record<string, any> = {};
  for (const r of reports) {
    if (!reportMap[r.agent_slug]) reportMap[r.agent_slug] = r;
  }

  const entities = ['all', ...Array.from(new Set(agents.map((a: any) => a.entity_name).filter(Boolean))) as string[]];

  const filtered = agents.filter((a: any) => {
    const statusMatch = filter === 'all' || a.status === filter;
    const entityMatch = entityFilter === 'all' || a.entity_name === entityFilter;
    return statusMatch && entityMatch;
  });

  const totalRevenue = agents.reduce((s: number, a: any) => s + parseFloat(a.total_revenue_generated ?? '0'), 0);
  const activeCount = agents.filter((a: any) => a.status === 'active').length;
  const forSaleCount = agents.filter((a: any) => a.is_for_sale).length;
  const ranCount = Object.keys(lastRunResult).length;

  const handleRunAgent = async (agent: any) => {
    if (runningAgent) return;
    setRunningAgent(agent.slug);
    try {
      setCycleError(null);
      const result = await runAgentMut.mutateAsync({
        agentSlug: agent.slug,
        agentName: agent.name,
        creditToChallenge: true,
      });
      setLastRunResult(prev => ({
        ...prev,
        [agent.slug]: { outcome: result.outcome, status: result.status, action: result.action },
      }));
      setExpandedAgent(agent.slug);
    } catch (e: any) {
      setLastRunResult(prev => ({
        ...prev,
        [agent.slug]: { outcome: `Error: ${e.message}`, status: 'failed', action: 'error' },
      }));
    } finally {
      setRunningAgent(null);
    }
  };

  const handleRunAll = async () => {
    if (runningAll) return;
    setRunningAll(true);
    try {
      setCycleError(null);
      const result = await runAllMut.mutateAsync({ creditToChallenge: true });
      const newResults: Record<string, { outcome: string; status: string; action: string }> = {};
      for (const r of result.results) {
        newResults[r.agentSlug] = { outcome: r.outcome, status: r.status, action: r.action };
      }
      setLastRunResult(newResults);
    } catch (e: any) {
      setCycleError(e?.message ?? 'Full agent cycle failed before verified DB-backed completion.');
    } finally {
      setRunningAll(false);
      agentsQuery.refetch();
      reportsQuery.refetch();
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, padding: '24px 20px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bot size={28} color={T.gold} />
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px' }}>AI Agents + Platform Tools Challenge Roster</h1>
            <p style={{ margin: 0, fontSize: 12, color: T.muted }}>DB-backed agent inventory, saved reports, and live challenge execution. No synthetic telemetry.</p>
          </div>
        </div>
        <button
          onClick={handleRunAll}
          disabled={runningAll}
          style={{
            background: runningAll ? T.muted2 : `linear-gradient(135deg, ${T.gold}, ${T.goldBright})`,
            color: '#0a0a0a', border: 'none', borderRadius: 10, padding: '10px 20px',
            fontSize: 13, fontWeight: 800, cursor: runningAll ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {runningAll
            ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Running All Agents...</>
            : <><Zap size={14} /> Run All {agents.length} Agents</>}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Agents', value: agents.length, icon: <Users size={14} color={T.gold} />, color: T.gold },
          { label: 'Active', value: activeCount, icon: <CheckCircle size={14} color={T.success} />, color: T.success },
          { label: 'Ran This Session', value: ranCount, icon: <Play size={14} color={T.info} />, color: T.info },
          { label: 'For Sale', value: forSaleCount, icon: <DollarSign size={14} color={T.purple} />, color: T.purple },
          { label: 'Total Revenue', value: `$${totalRevenue.toFixed(0)}`, icon: <TrendingUp size={14} color={T.gold} />, color: T.gold },
        ].map((s, i) => (
          <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>{s.icon}<span style={{ fontSize: 11, color: T.muted }}>{s.label}</span></div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'active', 'inactive', 'paused', 'failed'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? T.gold : T.surface, color: filter === f ? '#0a0a0a' : T.muted,
              border: `1px solid ${filter === f ? T.gold : T.border}`, borderRadius: 6, padding: '6px 14px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
            }}>{f}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 24, background: T.border }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {entities.slice(0, 6).map(e => (
            <button key={e} onClick={() => setEntityFilter(e)} style={{
              background: entityFilter === e ? T.goldDim : T.surface, color: entityFilter === e ? T.gold : T.muted,
              border: `1px solid ${entityFilter === e ? T.gold : T.border}`, borderRadius: 6, padding: '6px 12px',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>{e === 'all' ? 'All Entities' : e}</button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: T.muted }}>{filtered.length} agents</span>
      </div>

      {agentsQuery.isPending && (
        <div style={{ color: T.muted, fontSize: 13, padding: 40, textAlign: 'center' }}>
          <div style={{ marginBottom: 8 }}>⟳ Loading agents...</div>
        </div>
      )}



      {dataSourceError && (
        <div style={{ background: T.errorDim, border: `1px solid ${T.error}66`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.error, marginBottom: 4 }}>Live DB-backed roster failed to load</div>
          <div style={{ fontSize: 12, color: T.text, whiteSpace: 'pre-wrap' }}>{dataSourceError}</div>
        </div>
      )}

      {cycleError && (
        <div style={{ background: T.errorDim, border: `1px solid ${T.error}66`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.error, marginBottom: 4 }}>Full-cycle execution failed before verified completion</div>
          <div style={{ fontSize: 12, color: T.text, whiteSpace: 'pre-wrap' }}>{cycleError}</div>
        </div>
      )}

      {/* Agent Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {filtered.map((agent: any, i: number) => {
          const isRunning = runningAgent === agent.slug;
          const runResult = lastRunResult[agent.slug];
          const latestReport = reportMap[agent.slug];
          const isExpanded = expandedAgent === agent.slug;
          const roleColor = ROLE_COLORS[agent.swarm_role] ?? T.muted;

          return (
            <div key={i} style={{
              background: T.surface,
              border: `1px solid ${runResult ? (runResult.status === 'success' ? T.success + '66' : T.error + '66') : T.border}`,
              borderRadius: 14, padding: 16, transition: 'border-color 0.3s',
              boxShadow: runResult?.status === 'success' ? '0 0 12px rgba(34,197,94,0.1)' : 'none',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1, marginRight: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>{agent.name}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {agent.swarm_role && (
                      <span style={{ background: `${roleColor}22`, color: roleColor, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {agent.swarm_role}
                      </span>
                    )}
                    {agent.entity_name && (
                      <span style={{ background: T.surface2, color: T.muted, fontSize: 9, padding: '2px 6px', borderRadius: 4 }}>
                        {agent.entity_name}
                      </span>
                    )}
                    {agent.is_for_sale && (
                      <span style={{ background: T.goldDim, color: T.gold, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                        FOR SALE ${((agent.base_price_cents ?? 0) / 100).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  {agent.status === 'active' ? <CheckCircle size={14} color={T.success} /> : <XCircle size={14} color={T.error} />}
                  {runResult && (runResult.status === 'success' ? <CheckCircle size={11} color={T.success} /> : <XCircle size={11} color={T.error} />)}
                </div>
              </div>

              {/* Description */}
              {agent.description && (
                <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {agent.description}
                </div>
              )}

              {/* Stats */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 11 }}>
                <span style={{ color: T.muted }}>Win Rate: <span style={{ color: T.success, fontWeight: 600 }}>{agent.win_rate ?? 0}%</span></span>
                <span style={{ color: T.muted }}>Revenue: <span style={{ color: T.gold, fontWeight: 600 }}>${parseFloat(agent.total_revenue_generated ?? '0').toFixed(0)}</span></span>
                {agent.consecutive_failures > 0 && <span style={{ color: T.error, fontWeight: 600 }}>⚠ {agent.consecutive_failures} fails</span>}
              </div>

              {/* Run Result */}
              {runResult && (
                <div style={{
                  background: runResult.status === 'success' ? T.successDim : T.errorDim,
                  border: `1px solid ${runResult.status === 'success' ? T.success : T.error}33`,
                  borderRadius: 8, padding: 10, marginBottom: 10,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: runResult.status === 'success' ? T.success : T.error, marginBottom: 4, textTransform: 'uppercase' }}>
                    {runResult.status === 'success' ? '✓ Executed' : '✗ Failed'} — {runResult.action}
                  </div>
                  <div style={{
                    fontSize: 11, color: T.text, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                    maxHeight: isExpanded ? 'none' : 80, overflow: isExpanded ? 'visible' : 'hidden',
                  }}>
                    {runResult.outcome}
                  </div>
                  {runResult.outcome.length > 200 && (
                    <button onClick={() => setExpandedAgent(isExpanded ? null : agent.slug)} style={{
                      background: 'none', border: 'none', color: T.info, fontSize: 11, cursor: 'pointer', padding: '4px 0 0', fontWeight: 600,
                    }}>
                      {isExpanded ? '▲ Show less' : '▼ Show full output'}
                    </button>
                  )}
                </div>
              )}

              {/* Latest Saved Report (when no run result yet) */}
              {!runResult && latestReport && (
                <div style={{ background: T.surface2, borderRadius: 8, padding: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: T.muted, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FileText size={10} /> {latestReport.report_type} — {new Date(latestReport.created_at).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {latestReport.content}
                  </div>
                </div>
              )}

              {/* Run Button */}
              <button
                onClick={() => handleRunAgent(agent)}
                disabled={isRunning || !!runningAgent || runningAll || agent.status !== 'active'}
                style={{
                  width: '100%',
                  background: isRunning ? T.muted2 : agent.status !== 'active' ? T.surface2 : `${T.gold}22`,
                  color: isRunning ? T.muted : agent.status !== 'active' ? T.muted2 : T.gold,
                  border: `1px solid ${isRunning ? T.muted2 : agent.status !== 'active' ? T.border : T.gold + '44'}`,
                  borderRadius: 8, padding: '8px 0', fontSize: 12, fontWeight: 700,
                  cursor: (isRunning || agent.status !== 'active') ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {isRunning
                  ? '⟳ Running...'
                  : agent.status !== 'active'
                    ? '— Inactive'
                    : <><Play size={12} /> Run Agent</>}
              </button>
            </div>
          );
        })}

        {filtered.length === 0 && !agentsQuery.isPending && (
          <div style={{ color: T.muted, fontSize: 13, gridColumn: '1/-1', padding: 40, textAlign: 'center' }}>
            No DB-backed agents matched the selected filters. Clear the filters or repair the production agent seed data.
          </div>
        )}
      </div>

      {/* Running All Toast */}
      {runningAll && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: T.surface, border: `1px solid ${T.gold}`, borderRadius: 12, padding: '14px 20px', zIndex: 1000, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap size={16} color={T.gold} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.gold }}>Running All {agents.length} Agents...</div>
            <div style={{ fontSize: 11, color: T.muted }}>This may take 2-3 minutes. Real execution in progress.</div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default AgentRoster;
