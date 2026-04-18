import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Activity, Crown, DollarSign, Users, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

type TimeFilter = 'today' | '24h' | 'week' | 'all';

const TIME_FILTERS: { label: string; value: TimeFilter }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Last 24h', value: '24h' },
  { label: 'This Week', value: 'week' },
  { label: 'All Time', value: 'all' },
];

const statusColor: Record<string, string> = {
  success: '#22c55e',
  failed: '#ef4444',
  warning: '#f59e0b',
  in_progress: '#60a5fa',
};

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AgentCommandTower() {
  const [timeRange, setTimeRange] = useState<TimeFilter>('24h');

  const summaryQuery = trpc.agentTelemetry.getSummaryStats.useQuery({ timeRange });
  const recentQuery = trpc.agentTelemetry.getRecentEvents.useQuery({
    page: 1,
    pageSize: 80,
    timeRange,
    status: 'all',
  });
  const leaderboardQuery = trpc.agentTelemetry.getAgentLeaderboard.useQuery({ timeRange, limit: 15 });

  const events = recentQuery.data?.data ?? [];

  const failedEvents = useMemo(
    () => events.filter((event: any) => event.status === 'failed').slice(0, 12),
    [events],
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f0e8', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Crown size={26} color="#c9a84c" />
          <div>
            <h1 style={{ margin: 0, fontSize: 28, color: '#f5f0e8' }}>Agent Command Tower</h1>
            <p style={{ margin: 0, color: '#8a8a8a', fontSize: 12 }}>Real-time telemetry for the 49-agent empire</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TIME_FILTERS.map((item) => (
            <button
              key={item.value}
              onClick={() => setTimeRange(item.value)}
              style={{
                background: timeRange === item.value ? '#c9a84c' : '#141414',
                color: timeRange === item.value ? '#0a0a0a' : '#c9c9c9',
                border: `1px solid ${timeRange === item.value ? '#c9a84c' : '#2a2a2a'}`,
                padding: '8px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          {
            label: 'Total Revenue',
            value: `$${Number(summaryQuery.data?.totalRevenue ?? 0).toFixed(2)}`,
            icon: <DollarSign size={18} color="#22c55e" />,
          },
          {
            label: 'Tasks',
            value: String(summaryQuery.data?.tasksCompleted ?? 0),
            icon: <Activity size={18} color="#c9a84c" />,
          },
          {
            label: 'Success Rate',
            value: `${Number(summaryQuery.data?.successRate ?? 0).toFixed(1)}%`,
            icon: <CheckCircle2 size={18} color="#22c55e" />,
          },
          {
            label: 'Active Agents',
            value: String(summaryQuery.data?.activeAgents ?? 0),
            icon: <Users size={18} color="#60a5fa" />,
          },
        ].map((card) => (
          <div key={card.label} style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8d8d8d', fontSize: 12 }}>
              <span>{card.label}</span>
              {card.icon}
            </div>
            <div style={{ marginTop: 8, fontSize: 26, fontWeight: 700 }}>{summaryQuery.isLoading ? '—' : card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }}>
        <section style={{ background: '#101010', border: '1px solid #222', borderRadius: 8, minHeight: 480 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #1f1f1f', fontWeight: 700, color: '#c9a84c' }}>
            NOW Feed
          </div>
          <div style={{ maxHeight: 520, overflowY: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
            {events.map((event: any) => (
              <div key={event.id} style={{ padding: '10px 14px', borderBottom: '1px solid #171717' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ color: statusColor[event.status] ?? '#9ca3af', fontWeight: 700 }}>{event.status.toUpperCase()}</span>
                  <span style={{ color: '#c9a84c', fontWeight: 700 }}>{event.agent_name}</span>
                  <span style={{ color: '#6b7280' }}>{event.task_type}</span>
                  <span style={{ color: '#52525b', marginLeft: 'auto' }}>{timeAgo(event.created_at)}</span>
                </div>
                <div style={{ color: '#d4d4d8', fontSize: 13 }}>{event.outcome}</div>
                {Number(event.revenue_generated) > 0 && (
                  <div style={{ color: '#22c55e', fontSize: 12, marginTop: 2 }}>+${Number(event.revenue_generated).toFixed(2)}</div>
                )}
              </div>
            ))}
            {!recentQuery.isLoading && events.length === 0 && (
              <div style={{ padding: 20, color: '#6b7280' }}>No events found for this time range.</div>
            )}
          </div>
        </section>

        <section style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 8 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #1f1f1f', fontWeight: 700, color: '#c9a84c' }}>
            Leaderboard
          </div>
          <div style={{ padding: 10, display: 'grid', gap: 8 }}>
            {(leaderboardQuery.data ?? []).map((agent: any, idx: number) => (
              <div key={agent.agent_id} style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: 6, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#f5f0e8', fontWeight: 700 }}>{idx + 1}. {agent.agent_name}</div>
                    <div style={{ color: '#8a8a8a', fontSize: 12 }}>{agent.tasks} tasks • {agent.successes} success</div>
                  </div>
                  <div style={{ color: '#22c55e', fontWeight: 700 }}>${Number(agent.revenue ?? 0).toFixed(2)}</div>
                </div>
              </div>
            ))}
            {!leaderboardQuery.isLoading && (leaderboardQuery.data?.length ?? 0) === 0 && (
              <div style={{ color: '#6b7280', padding: 8 }}>No leaderboard data yet.</div>
            )}
          </div>
        </section>
      </div>

      <section style={{ marginTop: 14, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 8 }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', gap: 8 }}>
          <XCircle size={16} color="#ef4444" />
          <span style={{ fontWeight: 700, color: '#c9a84c' }}>Failures</span>
          <span style={{ color: '#ef4444', fontSize: 12 }}>({summaryQuery.data?.failedCount ?? 0})</span>
        </div>
        <div style={{ padding: 12, display: 'grid', gap: 8 }}>
          {failedEvents.map((event: any) => (
            <div key={event.id} style={{ border: '1px solid #3a1717', background: '#190f0f', borderRadius: 6, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{event.agent_name}</strong>
                <span style={{ color: '#9ca3af', fontSize: 12 }}>{timeAgo(event.created_at)}</span>
              </div>
              <div style={{ color: '#b0b0b0', fontSize: 12 }}>{event.task_type}</div>
              <div style={{ marginTop: 4 }}>{event.error_message || event.outcome}</div>
            </div>
          ))}
          {!recentQuery.isLoading && failedEvents.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#22c55e' }}>
              <AlertTriangle size={16} /> No failures in this range.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
