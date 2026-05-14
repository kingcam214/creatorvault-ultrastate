import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Crown, DollarSign, Zap, TrendingUp, Play, CheckCircle } from 'lucide-react';
const T = { bg: '#0a0a0a', surface: '#111', border: '#1e1e1e', gold: '#c9a84c', goldDim: 'rgba(201,168,76,0.12)', text: '#f5f0e8', muted: '#6b6b6b', success: '#22c55e', error: '#ef4444', info: '#60a5fa' };
function ProgressBar({ value, max, color = T.gold }: { value: number; max: number; color?: string }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return <div style={{ background: '#1a1a1a', borderRadius: 8, height: 14, overflow: 'hidden', width: '100%' }}><div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: 8, transition: 'width 0.6s ease' }} /></div>;
}
export function KingMoneyMission() {
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [cycleError, setCycleError] = useState<string | null>(null);
  const dashQ = trpc.challengeAutomation.getChallengeDashboard.useQuery(undefined, { refetchInterval: 30000 });
  const runCycle = trpc.challengeAutomation.runFullCycle.useMutation({
    onSuccess: (d) => { setLastResult(d); setCycleError(null); setRunning(false); dashQ.refetch(); },
    onError: (e: any) => { setCycleError(e?.message ?? 'Agent cycle failed before verified DB-backed completion.'); setRunning(false); },
  });
  const dash = dashQ.data;
  const active = dash?.activeChallenge as any;
  const txns = dash?.recentTransactions ?? [];
  const stats = dash?.agentStats ?? { totalRuns: 0, successes: 0, totalRevenue: 0 };
  const dashboardError = dashQ.error?.message ?? null;
  const challenges = dash?.challenges ?? [];
  const cur = parseFloat(active?.current_revenue ?? '0');
  const tgt = parseFloat(active?.target_revenue ?? '5000');
  const pct = Math.min(100, tgt > 0 ? (cur / tgt) * 100 : 0);
  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Crown size={28} color={T.gold} />
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>King Money Mission</h1>
          <p style={{ margin: 0, fontSize: 12, color: T.muted }}>$5k Challenge — AI-Powered Revenue Engine</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => { setCycleError(null); setRunning(true); runCycle.mutate({ creditToChallenge: true }); }}
            disabled={running}
            style={{ background: running ? '#1a1a1a' : T.gold, color: running ? T.muted : '#0a0a0a', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: running ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={15} />{running ? 'Running Agents...' : 'Run Full Agent Cycle'}
          </button>
        </div>
      </div>
      {dashboardError && (
        <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.error }}>Live challenge dashboard failed to load</div>
          <div style={{ fontSize: 12, color: T.text, marginTop: 4, whiteSpace: 'pre-wrap' }}>{dashboardError}</div>
        </div>
      )}
      {cycleError && (
        <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.error }}>Full-cycle execution failed before verified completion</div>
          <div style={{ fontSize: 12, color: T.text, marginTop: 4, whiteSpace: 'pre-wrap' }}>{cycleError}</div>
        </div>
      )}
      {active && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Week {active.week_number} — Active Challenge</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{active.title}</div>
            </div>
            <span style={{ background: T.goldDim, color: T.gold, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, textTransform: 'uppercase' }}>{active.status}</span>
          </div>
          <div style={{ display: 'flex', gap: 32, marginBottom: 16 }}>
            <div><div style={{ fontSize: 32, fontWeight: 900, color: T.gold }}>${cur.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div><div style={{ fontSize: 12, color: T.muted }}>earned of ${tgt.toLocaleString()}</div></div>
            <div><div style={{ fontSize: 32, fontWeight: 900 }}>{pct.toFixed(1)}%</div><div style={{ fontSize: 12, color: T.muted }}>complete</div></div>
            <div><div style={{ fontSize: 32, fontWeight: 900, color: T.info }}>${Math.max(0, tgt - cur).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div><div style={{ fontSize: 12, color: T.muted }}>remaining</div></div>
          </div>
          <ProgressBar value={cur} max={tgt} />
          <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>{active.description}</div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Agent Runs (7d)', value: stats.totalRuns.toLocaleString(), icon: <Play size={16} color={T.gold} /> },
          { label: 'Successful Tasks', value: stats.successes.toLocaleString(), icon: <CheckCircle size={16} color={T.success} /> },
          { label: 'AI Revenue (7d)', value: `$${stats.totalRevenue.toFixed(2)}`, icon: <DollarSign size={16} color={T.gold} /> },
          { label: 'Challenge Txns', value: txns.length.toString(), icon: <TrendingUp size={16} color={T.info} /> },
        ].map((s, i) => (
          <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>{s.icon}<span style={{ fontSize: 11, color: T.muted }}>{s.label}</span></div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{s.value}</div>
          </div>
        ))}
      </div>
      {lastResult && (
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.success }}>Last Cycle: {lastResult.agentsRan} agents — ${lastResult.totalRevenue.toFixed(2)} revenue generated</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, marginTop: 4 }}><span style={{ color: T.success }}>{lastResult.successCount} succeeded</span><span style={{ color: T.error }}>{lastResult.failedCount} failed</span></div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>AI Challenge Weeks</div>
          {challenges.map((c: any, i: number) => {
            const cv = parseFloat(c.current_revenue ?? '0');
            const tv = parseFloat(c.target_revenue ?? '5000');
            return (
              <div key={i} style={{ borderBottom: `1px solid ${T.border}`, paddingBottom: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Week {c.week_number}: {c.title}</span>
                  <span style={{ fontSize: 11, color: c.status === 'active' ? T.gold : c.status === 'met' ? T.success : T.muted }}>{c.status}</span>
                </div>
                <ProgressBar value={cv} max={tv} color={c.status === 'met' ? T.success : T.gold} />
                <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>${cv.toFixed(2)} / ${tv.toLocaleString()}</div>
              </div>
            );
          })}
          {challenges.length === 0 && <div style={{ color: T.muted, fontSize: 13 }}>No challenges found.</div>}
        </div>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Recent Revenue Transactions</div>
          {txns.length === 0 && <div style={{ color: T.muted, fontSize: 13 }}>No verified challenge transactions are present in the live database for this ledger.</div>}
          {txns.slice(0, 15).map((tx: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: 8, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{tx.source}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{String(tx.description ?? '').slice(0, 50)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.gold }}>${parseFloat(tx.amount).toFixed(2)}</div>
                <div style={{ fontSize: 10, color: T.muted }}>{tx.recorded_at ? new Date(tx.recorded_at).toLocaleDateString() : ''}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default KingMoneyMission;
