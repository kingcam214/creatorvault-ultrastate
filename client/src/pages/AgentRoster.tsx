import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Users, CheckCircle, XCircle, DollarSign, TrendingUp } from 'lucide-react';
const T = { bg: '#0a0a0a', surface: '#111', border: '#1e1e1e', gold: '#c9a84c', goldDim: 'rgba(201,168,76,0.12)', text: '#f5f0e8', muted: '#6b6b6b', success: '#22c55e', error: '#ef4444', info: '#60a5fa' };
export function AgentRoster() {
  const [filter, setFilter] = useState('all');
  const agentsQuery = trpc.empireAgents.getEmpireAgents.useQuery();
  const agents = (agentsQuery.data ?? []) as any[];
  const filtered = filter === 'all' ? agents : agents.filter((a) => a.status === filter);
  const totalRevenue = agents.reduce((s, a) => s + parseFloat(a.total_revenue_generated ?? '0'), 0);
  const activeCount = agents.filter((a) => a.status === 'active').length;
  const forSaleCount = agents.filter((a) => a.is_for_sale).length;
  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Users size={26} color={T.gold} />
        <div><h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Agent Roster</h1><p style={{ margin: 0, fontSize: 12, color: T.muted }}>All empire agents — status, revenue, and capabilities</p></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[{ label: 'Total Agents', value: agents.length, icon: <Users size={14} color={T.gold} /> }, { label: 'Active', value: activeCount, icon: <CheckCircle size={14} color={T.success} /> }, { label: 'For Sale', value: forSaleCount, icon: <DollarSign size={14} color={T.info} /> }, { label: 'Total Revenue', value: `$${totalRevenue.toFixed(0)}`, icon: <TrendingUp size={14} color={T.gold} /> }].map((s, i) => (
          <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>{s.icon}<span style={{ fontSize: 11, color: T.muted }}>{s.label}</span></div><div style={{ fontSize: 22, fontWeight: 800, color: T.gold }}>{s.value}</div></div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', 'active', 'inactive'].map(f => (<button key={f} onClick={() => setFilter(f)} style={{ background: filter === f ? T.gold : T.surface, color: filter === f ? '#0a0a0a' : T.muted, border: `1px solid ${filter === f ? T.gold : T.border}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{f}</button>))}
      </div>
      {agentsQuery.isPending && <div style={{ color: T.muted, fontSize: 13, padding: 20 }}>Loading agents...</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {filtered.map((agent, i) => (
          <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, flex: 1, marginRight: 8 }}>{agent.name}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                {agent.is_for_sale && <span style={{ background: T.goldDim, color: T.gold, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>FOR SALE</span>}
                {agent.status === 'active' ? <CheckCircle size={14} color={T.success} /> : <XCircle size={14} color={T.error} />}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {agent.swarm_role && <span style={{ background: 'rgba(96,165,250,0.1)', color: T.info, fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>{agent.swarm_role}</span>}
              {agent.entity_name && <span style={{ background: '#1a1a1a', color: T.muted, fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>{agent.entity_name}</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.muted }}>
              <span>Win Rate: <span style={{ color: T.success }}>{agent.win_rate ?? 0}%</span></span>
              {agent.is_for_sale && <span style={{ color: T.gold }}>${((agent.base_price_cents ?? 0) / 100).toLocaleString()}</span>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && !agentsQuery.isPending && <div style={{ color: T.muted, fontSize: 13, gridColumn: '1/-1', padding: 20, textAlign: 'center' }}>No agents found.</div>}
      </div>
    </div>
  );
}
export default AgentRoster;
