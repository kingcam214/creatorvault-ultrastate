import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { KingCamTourWidget } from "@/components/KingCamTourWidget";

const ENGINE_COLORS: Record<string, string> = {
  presentation_empire: '#a855f7',
  agent_swarm: '#06b6d4',
  hollywood_ai: '#f59e0b',
  vaultu_auto_sales: '#10b981',
  recruitment_weapon: '#ef4444',
  chicas_human: '#ec4899',
};

const ENGINE_ICONS: Record<string, string> = {
  presentation_empire: '🎯',
  agent_swarm: '🤖',
  hollywood_ai: '🎬',
  vaultu_auto_sales: '📚',
  recruitment_weapon: '🔍',
  chicas_human: '👑',
};

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div style={{ background: '#1a1a2e', borderRadius: 8, height: 10, overflow: 'hidden', width: '100%' }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: color,
        borderRadius: 8,
        transition: 'width 0.6s ease',
        boxShadow: `0 0 8px ${color}`,
      }} />
  {/* @ts-expect-error compact prop */}
    <KingCamTourWidget compact={true} />
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{
      background: '#0f0f1a',
      border: `1px solid ${color}33`,
      borderRadius: 12,
      padding: '16px 20px',
      flex: 1,
      minWidth: 140,
    }}>
      <div style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: 26, fontWeight: 800, fontFamily: 'monospace' }}>{value}</div>
      {sub && <div style={{ color: '#666', fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function AIEmpireDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'engines' | 'activity' | 'history'>('overview');
  const [triggerEngine, setTriggerEngine] = useState<string>('');
  const [logAmount, setLogAmount] = useState('');
  const [logEngine, setLogEngine] = useState('presentation_empire');
  const [logDesc, setLogDesc] = useState('');

  const { data, refetch, isLoading } = trpc.aiEmpire.getEmpireDashboard.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const triggerMutation = trpc.aiEmpire.triggerEngine.useMutation({
    onSuccess: () => { refetch(); setTriggerEngine(''); },
  });

  const logMutation = trpc.aiEmpire.logAIRevenue.useMutation({
    onSuccess: () => { refetch(); setLogAmount(''); setLogDesc(''); },
  });

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'engines', label: 'Engines' },
    { id: 'activity', label: 'Activity Log' },
    { id: 'history', label: 'History' },
  ];

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#07071a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#a855f7', fontSize: 18 }}>Loading AI Empire...</div>
      </div>
    );
  }

  const d = data ?? {
    aiRevenue: 0, humanRevenue: 0, totalRevenue: 0, kingcamCut: 0,
    aiLoadPercent: 80, aiTarget: 40000, humanTarget: 10000, totalTarget: 50000,
    engines: {}, pipeline: {}, recentActivity: [], dailyHistory: [],
  };

  const aiPct = Math.min(100, d.aiTarget > 0 ? Math.round((d.aiRevenue / d.aiTarget) * 100) : 0);
  const humanPct = Math.min(100, d.humanTarget > 0 ? Math.round((d.humanRevenue / d.humanTarget) * 100) : 0);
  const totalPct = Math.min(100, d.totalTarget > 0 ? Math.round((d.totalRevenue / d.totalTarget) * 100) : 0);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #07071a 0%, #0d0d2b 50%, #07071a 100%)',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
            borderRadius: 12,
            padding: '8px 12px',
            fontSize: 22,
          }}>🤖</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, background: 'linear-gradient(90deg, #a855f7, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              PURE AI EMPIRE
            </h1>
            <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
              AI carries {d.aiLoadPercent}% of the load — No human dependency
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              onClick={() => refetch()}
              style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, padding: '8px 14px', color: '#888', cursor: 'pointer', fontSize: 12 }}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Top Stats Row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="AI Revenue (7d)" value={`$${d.aiRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} sub={`${aiPct}% of $${(d.aiTarget / 1000).toFixed(0)}K target`} color="#a855f7" />
        <StatCard label="Human Bonus (7d)" value={`$${d.humanRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} sub={`${humanPct}% of $${(d.humanTarget / 1000).toFixed(0)}K target`} color="#ec4899" />
        <StatCard label="Total Empire (7d)" value={`$${d.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} sub={`${totalPct}% of $${(d.totalTarget / 1000).toFixed(0)}K target`} color="#10b981" />
        <StatCard label="Your Cut (50%)" value={`$${d.kingcamCut.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} sub="KingCam net" color="#f59e0b" />
      </div>

      {/* Main Progress Bars */}
      <div style={{ background: '#0f0f1a', border: '1px solid #1a1a3e', borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 14, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Weekly Revenue Progress</h3>
        
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#a855f7', fontWeight: 700, fontSize: 14 }}>🤖 AI Revenue</span>
            <span style={{ color: '#a855f7', fontFamily: 'monospace', fontSize: 14 }}>${d.aiRevenue.toLocaleString()} / $40K</span>
          </div>
          <ProgressBar value={d.aiRevenue} max={40000} color="#a855f7" />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#ec4899', fontWeight: 700, fontSize: 14 }}>👑 Human Bonus (Chicas)</span>
            <span style={{ color: '#ec4899', fontFamily: 'monospace', fontSize: 14 }}>${d.humanRevenue.toLocaleString()} / $10K</span>
          </div>
          <ProgressBar value={d.humanRevenue} max={10000} color="#ec4899" />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#10b981', fontWeight: 700, fontSize: 14 }}>💰 Total Empire</span>
            <span style={{ color: '#10b981', fontFamily: 'monospace', fontSize: 14 }}>${d.totalRevenue.toLocaleString()} / $50K</span>
          </div>
          <ProgressBar value={d.totalRevenue} max={50000} color="#10b981" />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#0f0f1a', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: activeTab === tab.id ? 'linear-gradient(135deg, #a855f7, #06b6d4)' : 'transparent',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              color: activeTab === tab.id ? '#fff' : '#888',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 700 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div>
          {/* Pipeline Status */}
          <div style={{ background: '#0f0f1a', border: '1px solid #1a1a3e', borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Package Pipeline</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {Object.entries(d.pipeline).map(([status, count]) => (
                <div key={status} style={{
                  background: '#1a1a2e',
                  borderRadius: 8,
                  padding: '10px 16px',
                  textAlign: 'center',
                }}>
                  <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, fontFamily: 'monospace' }}>{String(count)}</div>
                  <div style={{ color: '#888', fontSize: 11, textTransform: 'capitalize' }}>{status}</div>
                </div>
              ))}
              {Object.keys(d.pipeline).length === 0 && (
                <div style={{ color: '#555', fontSize: 13 }}>No packages in pipeline yet — Scraper runs at 9AM</div>
              )}
            </div>
          </div>

          {/* Manual Trigger */}
          <div style={{ background: '#0f0f1a', border: '1px solid #1a1a3e', borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Trigger Engine Now</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { id: 'swarm_wake', label: '🤖 Wake Swarm' },
                { id: 'social_autoposter', label: '📱 Autoposter' },
                { id: 'presentation_scraper', label: '🎯 Scraper' },
                { id: 'hollywood_production', label: '🎬 Hollywood' },
                { id: 'vaultu_sales', label: '📚 VaultU' },
                { id: 'daily_report', label: '📊 Send Report' },
              ].map(eng => (
                <button
                  key={eng.id}
                  onClick={() => {
                    setTriggerEngine(eng.id);
                    triggerMutation.mutate({ engine: eng.id as any });
                  }}
                  disabled={triggerMutation.isPending && triggerEngine === eng.id}
                  style={{
                    background: triggerMutation.isPending && triggerEngine === eng.id ? '#333' : '#1a1a2e',
                    border: '1px solid #a855f733',
                    borderRadius: 8,
                    padding: '10px 16px',
                    color: '#a855f7',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {triggerMutation.isPending && triggerEngine === eng.id ? '...' : eng.label}
                </button>
              ))}
            </div>
            {triggerMutation.isSuccess && (
              <div style={{ color: '#10b981', fontSize: 12, marginTop: 10 }}>
                ✓ Engine triggered — check Telegram for results
              </div>
            )}
          </div>

          {/* Log Revenue */}
          <div style={{ background: '#0f0f1a', border: '1px solid #1a1a3e', borderRadius: 16, padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Log Revenue</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>Engine</div>
                <select
                  value={logEngine}
                  onChange={e => setLogEngine(e.target.value)}
                  style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13 }}
                >
                  <option value="presentation_empire">Presentation Empire</option>
                  <option value="agent_swarm">Agent Swarm</option>
                  <option value="hollywood_ai">Hollywood AI</option>
                  <option value="vaultu_auto_sales">VaultU Auto-Sales</option>
                  <option value="recruitment_weapon">Recruitment Weapon</option>
                </select>
              </div>
              <div>
                <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>Amount ($)</div>
                <input
                  type="number"
                  value={logAmount}
                  onChange={e => setLogAmount(e.target.value)}
                  placeholder="497"
                  style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, width: 100 }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>Description</div>
                <input
                  type="text"
                  value={logDesc}
                  onChange={e => setLogDesc(e.target.value)}
                  placeholder="Package sold to @handle"
                  style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, width: '100%' }}
                />
              </div>
              <button
                onClick={() => {
                  if (!logAmount) return;
                  logMutation.mutate({ engine: logEngine as any, amount: Number(logAmount), description: logDesc || undefined });
                }}
                disabled={logMutation.isPending || !logAmount}
                style={{
                  background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 20px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {logMutation.isPending ? '...' : 'Log It'}
              </button>
            </div>
            {logMutation.isSuccess && (
              <div style={{ color: '#10b981', fontSize: 12, marginTop: 10 }}>✓ Revenue logged</div>
            )}
          </div>
        </div>
      )}

      {/* ENGINES TAB */}
      {activeTab === 'engines' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {Object.entries(d.engines).map(([key, engine]: [string, any]) => {
            const color = ENGINE_COLORS[key] ?? '#888';
            const icon = ENGINE_ICONS[key] ?? '⚡';
            const pct = engine.target > 0 ? Math.min(100, Math.round((engine.revenue / engine.target) * 100)) : 0;
            return (
              <div key={key} style={{
                background: '#0f0f1a',
                border: `1px solid ${color}33`,
                borderRadius: 16,
                padding: 20,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{engine.name}</div>
                    <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>
                      {engine.isAI ? '🤖 AI-Powered' : '👥 Human Bonus'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color, fontSize: 22, fontWeight: 800, fontFamily: 'monospace' }}>
                      ${engine.revenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ color: '#555', fontSize: 11 }}>/ ${(engine.target / 1000).toFixed(0)}K target</div>
                  </div>
                </div>

                <ProgressBar value={engine.revenue} max={engine.target} color={color} />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                  <div style={{ color: '#888', fontSize: 12 }}>
                    {engine.count.toLocaleString()} {engine.unit}
                  </div>
                  <div style={{ color, fontSize: 12, fontWeight: 700 }}>
                    {pct}% — {engine.pricePoint}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ACTIVITY LOG TAB */}
      {activeTab === 'activity' && (
        <div style={{ background: '#0f0f1a', border: '1px solid #1a1a3e', borderRadius: 16, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Recent AI Activity</h3>
          {d.recentActivity.length === 0 ? (
            <div style={{ color: '#555', fontSize: 13 }}>No activity yet — engines start at 7AM Eastern</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {d.recentActivity.map((item: any, i: number) => {
                const color = ENGINE_COLORS[item.engine] ?? '#888';
                return (
                  <div key={i} style={{
                    background: '#1a1a2e',
                    borderRadius: 10,
                    padding: '12px 16px',
                    borderLeft: `3px solid ${color}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                        {item.engine.replace(/_/g, ' ')}
                      </span>
                      <span style={{ color: '#555', fontSize: 11 }}>
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ color: '#ccc', fontSize: 13 }}>{item.result}</div>
                    {item.revenueImpact > 0 && (
                      <div style={{ color: '#10b981', fontSize: 12, marginTop: 4 }}>
                        +${item.revenueImpact.toLocaleString()} revenue impact
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div style={{ background: '#0f0f1a', border: '1px solid #1a1a3e', borderRadius: 16, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Daily Revenue History</h3>
          {d.dailyHistory.length === 0 ? (
            <div style={{ color: '#555', fontSize: 13 }}>No history yet — first snapshot saves at 9PM Eastern tonight</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'AI Revenue', 'Human Revenue', 'Total', 'Your Cut'].map(h => (
                    <th key={h} style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #1a1a3e' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.dailyHistory.map((row: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1a1a2e' }}>
                    <td style={{ padding: '10px 12px', color: '#ccc', fontSize: 13 }}>{String(row.date)}</td>
                    <td style={{ padding: '10px 12px', color: '#a855f7', fontFamily: 'monospace', fontSize: 13 }}>${row.aiRevenue.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', color: '#ec4899', fontFamily: 'monospace', fontSize: 13 }}>${row.humanRevenue.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', color: '#10b981', fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>${row.totalRevenue.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', color: '#f59e0b', fontFamily: 'monospace', fontSize: 13 }}>${row.kingcamCut.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
