import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Users, CheckCircle, XCircle, TrendingUp, Play, Zap, RefreshCw, FileText, Bot } from 'lucide-react';

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


function ShieldCheckIcon() {
  return <CheckCircle size={15} color={T.success} />;
}

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
  const challengeProgressQuery = trpc.empireAgents.getChallengeProgress.useQuery();
  const runAgentMut = trpc.challengeAutomation.runAgent.useMutation();
  const runAllMut = trpc.challengeAutomation.runFullCycle.useMutation();

  const agents = (agentsQuery.data ?? []) as any[];
  const reports = ((reportsQuery.data as any)?.reports ?? []) as any[];
  const challengeProgress = (challengeProgressQuery.data ?? []) as any[];
  const dataSourceError = agentsQuery.error?.message || reportsQuery.error?.message || challengeProgressQuery.error?.message || null;

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

  const savedReportCount = reports.length;
  const verifiedChallengeRevenue = challengeProgress.reduce((s: number, c: any) => s + parseFloat(c.verified_revenue ?? '0'), 0);
  const verifiedTransactionCount = challengeProgress.reduce((s: number, c: any) => s + Number(c.transaction_count ?? 0), 0);
  const activeCount = agents.filter((a: any) => a.status === 'active').length;
  const ranCount = Object.keys(lastRunResult).length;

  const handleRunAgent = async (agent: any) => {
    if (runningAgent) return;
    setRunningAgent(agent.slug);
    try {
      setCycleError(null);
      const result = await runAgentMut.mutateAsync({
        agentSlug: agent.slug,
        agentName: agent.name,
        creditToChallenge: false,
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
      const result = await runAllMut.mutateAsync({ creditToChallenge: false });
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
    <div className="agent-roster-page" style={{ minHeight: '100vh', background: T.bg, color: T.text, padding: '24px 20px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div className="agent-roster-hero" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bot size={28} color={T.gold} />
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px' }}>Your Arsenal</h1>
            <p style={{ margin: 0, fontSize: 12, color: T.muted }}>The weapons meant to move your world forward. Nothing gets opened just because it has a name—only real work earns its place here.</p>
          </div>
        </div>
        <div style={{ background: T.goldDim, color: T.gold, border: `1px solid ${T.gold}44`, borderRadius: 10, padding: '10px 16px', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheckIcon /> Nothing runs loose
        </div>
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <ShieldCheckIcon />
          <div style={{ fontSize: 13, fontWeight: 900, color: T.gold }}>What makes a weapon ready</div>
        </div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.65 }}>
          A name alone does not make a weapon. One gets opened only after it has a real starting point, a real result, and a cost you can see.
        </div>
      </div>

      <section aria-label="Proven creator weapons" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(17,17,17,0.98))', border: `1px solid ${T.gold}44`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: T.gold, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>Proven now</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: T.text }}>Two weapons already earned their place.</div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6, marginTop: 5 }}>These open real CreatorVault creation paths with accepted results you can see. The rest of the arsenal stays held until it can meet the same standard.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 14 }}>
          <a href="/agents/motion-flyer-agent" style={{ display: 'block', textDecoration: 'none', color: T.text, background: 'rgba(0,0,0,0.28)', border: `1px solid ${T.gold}55`, borderRadius: 11, padding: 13 }}>
            <video src="https://creatorvault.live/uploads/motion-b73098d7-098b-4366-a1fd-a83e36e802b6.mp4" autoPlay muted loop playsInline preload="metadata" aria-label="Accepted CreatorVault Motion Flyer proof" style={{ width: '100%', height: 176, objectFit: 'cover', borderRadius: 8, marginBottom: 11, background: '#050505' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><span style={{ fontSize: 13, fontWeight: 900 }}>Motion Flyer</span><Play size={15} color={T.gold} /></div>
            <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, marginTop: 5 }}>Turn a saved CreatorVault moment into a short moving flyer. An accepted flyer is already watchable.</div>
            <div style={{ fontSize: 11, color: T.gold, fontWeight: 800, marginTop: 10 }}>Open Motion Flyer →</div>
          </a>
          <a href="/king/campaign-visual" style={{ display: 'block', textDecoration: 'none', color: T.text, background: 'rgba(0,0,0,0.28)', border: `1px solid ${T.gold}55`, borderRadius: 11, padding: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><span style={{ fontSize: 13, fontWeight: 900 }}>Campaign Visual Studio</span><CheckCircle size={15} color={T.gold} /></div>
            <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, marginTop: 5 }}>Start from a certified source and see the accepted CreatorVault campaign visual already saved for review.</div>
            <div style={{ fontSize: 11, color: T.gold, fontWeight: 800, marginTop: 10 }}>Open Campaign Visual Studio →</div>
          </a>
        </div>
      </section>

      {/* Stats */}
      <div className="agent-roster-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Weapons in your arsenal', value: agents.length, icon: <Users size={14} color={T.gold} />, color: T.gold },
          { label: 'On deck', value: activeCount, icon: <Users size={14} color={T.gold} />, color: T.gold },
          { label: 'Next controlled move', value: 'Held', icon: <ShieldCheckIcon />, color: T.gold },
          { label: 'Proven right now', value: 2, icon: <CheckCircle size={14} color={T.success} />, color: T.success },
        ].map((s, i) => (
          <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>{s.icon}<span style={{ fontSize: 11, color: T.muted }}>{s.label}</span></div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="agent-roster-filters" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
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
          <div style={{ fontSize: 12, fontWeight: 800, color: T.error, marginBottom: 4 }}>Your arsenal did not load</div>
          <div style={{ fontSize: 12, color: T.text }}>The weapon list is not ready to show right now. Nothing has been changed.</div>
        </div>
      )}

      {cycleError && (
        <div style={{ background: T.errorDim, border: `1px solid ${T.error}66`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.error, marginBottom: 4 }}>Full-cycle execution failed before verified completion</div>
          <div style={{ fontSize: 12, color: T.text, whiteSpace: 'pre-wrap' }}>{cycleError}</div>
        </div>
      )}

      {/* Agent Grid */}
      <div className="agent-roster-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
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
                  Built to handle when it earns a real place: {agent.description}
                </div>
              )}

              {/* Operational truth */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10, fontSize: 11 }}>
                <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: 8 }}>
                  <div style={{ color: T.muted, marginBottom: 2 }}>Where it stands</div>
                  <div style={{ color: agent.status === 'active' ? T.gold : T.muted, fontWeight: 700 }}>{agent.status === 'active' ? 'On deck — proof required' : agent.status === 'inactive' ? 'Waiting for proof' : agent.status === 'paused' ? 'Waiting' : 'Needs attention'}</div>
                </div>
                <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 8, padding: 8 }}>
                  <div style={{ color: T.muted, marginBottom: 2 }}>Last real record</div>
                  <div style={{ color: latestReport ? T.gold : T.muted, fontWeight: 700 }}>{latestReport ? `Recorded ${new Date(latestReport.created_at).toLocaleDateString()}` : 'No real record yet'}</div>
                </div>
                {agent.consecutive_failures > 0 && <span style={{ color: T.error, fontWeight: 600, gridColumn: '1 / -1' }}>{agent.consecutive_failures} consecutive failures require owner review</span>}
              </div>

              {/* Run Result */}
              {runResult && (
                <div style={{
                  background: runResult.status === 'success' ? T.successDim : T.errorDim,
                  border: `1px solid ${runResult.status === 'success' ? T.success : T.error}33`,
                  borderRadius: 8, padding: 10, marginBottom: 10,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: runResult.status === 'success' ? T.success : T.error, marginBottom: 4, textTransform: 'uppercase' }}>
                    {runResult.status === 'success' ? 'Executed' : 'Failed'} — {runResult.action}
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
                      {isExpanded ? 'Show less' : 'Show full output'}
                    </button>
                  )}
                </div>
              )}

              {/* Latest Saved Report (when no run result yet) */}
              {!runResult && latestReport && (
                <div style={{ background: T.surface2, border: `1px solid ${T.gold}22`, borderRadius: 8, padding: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: T.gold, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800 }}>
                    <FileText size={10} /> persisted report · {latestReport.report_type} · {new Date(latestReport.created_at).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {latestReport.content}
                  </div>
                </div>
              )}

              {/* Truth boundary — deliberately not an action button */}
              <div
                role="status"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.02)',
                  color: T.muted,
                  borderTop: `1px solid ${T.border}`,
                  padding: '10px 0 0', fontSize: 11, lineHeight: 1.45,
                  display: 'flex', alignItems: 'flex-start', gap: 7,
                }}
              >
                <ShieldCheckIcon />
                <span>This weapon has no finished CreatorVault result to show yet.</span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && !agentsQuery.isPending && (
          <div style={{ color: T.muted, fontSize: 13, gridColumn: '1/-1', padding: 40, textAlign: 'center' }}>
            Nothing in this corner matches right now. Change the view to see the rest of your arsenal.
          </div>
        )}
      </div>

      {/* Running All Toast */}
      {runningAll && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: T.surface, border: `1px solid ${T.gold}`, borderRadius: 12, padding: '14px 20px', zIndex: 1000, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap size={16} color={T.gold} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.gold }}>Running operations cycle...</div>
            <div style={{ fontSize: 11, color: T.muted }}>Reports will be saved; challenge revenue will not move unless Stripe payments prove it.</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 720px) {
          .agent-roster-page { padding: 14px 12px 96px !important; }
          .agent-roster-hero { align-items: flex-start !important; gap: 14px !important; }
          .agent-roster-hero > div:first-child { align-items: flex-start !important; width: 100%; }
          .agent-roster-hero h1 { font-size: 22px !important; line-height: 1.05 !important; }
          .agent-roster-hero p { font-size: 12px !important; line-height: 1.45 !important; max-width: 100% !important; }
          .agent-roster-hero button { width: 100% !important; justify-content: center !important; padding: 13px 16px !important; font-size: 13px !important; }
          .agent-roster-stats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px !important; }
          .agent-roster-filters { overflow-x: auto !important; flex-wrap: nowrap !important; padding-bottom: 8px !important; -webkit-overflow-scrolling: touch; }
          .agent-roster-filters > div { flex-wrap: nowrap !important; flex: 0 0 auto !important; }
          .agent-roster-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
        }
      `}</style>
    </div>
  );
}

export default AgentRoster;
