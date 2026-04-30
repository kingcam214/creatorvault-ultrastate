import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Inbox, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';
const T = { bg: '#0a0a0a', surface: '#111', border: '#1e1e1e', gold: '#c9a84c', goldDim: 'rgba(201,168,76,0.12)', text: '#f5f0e8', muted: '#6b6b6b', success: '#22c55e', error: '#ef4444', info: '#60a5fa' };

export default function AgentApprovalInbox() {
  const [filter, setFilter] = useState('pending');

  // Use the challengeAutomation router to get recent transactions as "approvals"
  const txnsQuery = trpc.challengeAutomation.getChallengeTransactions.useQuery({});
  const logRevMut = trpc.challengeAutomation.logChallengeRevenue.useMutation({
    onSuccess: () => txnsQuery.refetch(),
  });

  // Use agentTelemetry for recent events
  const eventsQuery = trpc.agentTelemetry.getRecentEvents.useQuery({ pageSize: 30 });
  const events = ((eventsQuery.data as any)?.data ?? []) as any[];
  const txns = (txnsQuery.data ?? []) as any[];

  const pending = events.filter((e: any) => e.status === 'pending' || e.status === 'running');
  const completed = events.filter((e: any) => e.status === 'success');
  const failed = events.filter((e: any) => e.status === 'failed');

  const displayed = filter === 'pending' ? pending : filter === 'completed' ? completed : filter === 'failed' ? failed : events;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Inbox size={26} color={T.gold} />
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Agent Approval Inbox</h1>
          <p style={{ margin: 0, fontSize: 12, color: T.muted }}>Review and approve agent actions, revenue credits, and task completions</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Pending', value: pending.length, icon: <Clock size={14} color={T.gold} />, color: T.gold },
          { label: 'Completed', value: completed.length, icon: <CheckCircle size={14} color={T.success} />, color: T.success },
          { label: 'Failed', value: failed.length, icon: <XCircle size={14} color={T.error} />, color: T.error },
          { label: 'Revenue Logged', value: txns.length, icon: <DollarSign size={14} color={T.info} />, color: T.info },
        ].map((s, i) => (
          <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>{s.icon}<span style={{ fontSize: 11, color: T.muted }}>{s.label}</span></div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all', 'pending', 'completed', 'failed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? T.gold : T.surface, color: filter === f ? '#0a0a0a' : T.muted, border: `1px solid ${filter === f ? T.gold : T.border}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{f}</button>
        ))}
      </div>

      {/* Quick approve revenue */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.gold, marginBottom: 10 }}>Manual Revenue Approval</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {[97, 197, 297, 497, 997].map(amt => (
            <button key={amt} onClick={() => logRevMut.mutate({ amount: amt, source: 'manual_approval', description: `Manual revenue approval — $${amt}` })} style={{ background: '#1a1a1a', border: `1px solid ${T.border}`, borderRadius: 6, padding: '6px 14px', color: T.success, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              +${amt}
            </button>
          ))}
          <span style={{ fontSize: 11, color: T.muted }}>Click to credit revenue to active challenge</span>
        </div>
      </div>

      {/* Event list */}
      {eventsQuery.isPending && <div style={{ color: T.muted, fontSize: 13 }}>Loading events...</div>}
      <div style={{ display: 'grid', gap: 8 }}>
        {displayed.map((event: any, i: number) => (
          <div key={i} style={{ background: T.surface, border: `1px solid ${event.status === 'success' ? 'rgba(34,197,94,0.2)' : event.status === 'failed' ? 'rgba(239,68,68,0.2)' : T.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {event.status === 'success' ? <CheckCircle size={14} color={T.success} /> : event.status === 'failed' ? <XCircle size={14} color={T.error} /> : <Clock size={14} color={T.gold} />}
                <span style={{ fontSize: 13, fontWeight: 700 }}>{event.agent_name ?? event.agent_id}</span>
                <span style={{ background: '#1a1a1a', color: T.muted, fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>{event.task_type}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                {parseFloat(event.revenue_generated ?? '0') > 0 && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.gold }}>${parseFloat(event.revenue_generated).toFixed(2)}</span>
                )}
                <div style={{ fontSize: 10, color: T.muted }}>{event.created_at ? new Date(event.created_at).toLocaleString() : ''}</div>
              </div>
            </div>
            {event.outcome && <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{String(event.outcome).slice(0, 200)}</div>}
          </div>
        ))}
        {displayed.length === 0 && !eventsQuery.isPending && (
          <div style={{ color: T.muted, fontSize: 13, padding: 20, textAlign: 'center' }}>
            No {filter === 'all' ? '' : filter} events found. Run an agent cycle from King Money Mission to generate events.
          </div>
        )}
      </div>
    </div>
  );
}
