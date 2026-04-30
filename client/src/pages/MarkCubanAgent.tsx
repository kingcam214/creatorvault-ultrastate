import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { TrendingUp, Zap } from 'lucide-react';
const T = { bg: '#0a0a0a', surface: '#111', border: '#1e1e1e', gold: '#c9a84c', goldDim: 'rgba(201,168,76,0.12)', text: '#f5f0e8', muted: '#6b6b6b', success: '#22c55e' };
export function MarkCubanAgent() {
  const [pitchType, setPitchType] = useState('business');
  const [idea, setIdea] = useState('');
  const [revenue, setRevenue] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const analyzeMut = trpc.markCubanAgent.evaluateBusiness.useMutation({ onSuccess: (d) => { setResult(d); setLoading(false); }, onError: () => setLoading(false) });
  const pitchTypes = ['business', 'deal', 'investment', 'partnership', 'product'];
  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, padding: '24px 20px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <TrendingUp size={26} color={T.gold} />
        <div><h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Mark Cuban Agent</h1><p style={{ margin: 0, fontSize: 12, color: T.muted }}>AI-powered deal analysis and business strategy — Shark Tank style</p></div>
      </div>
      <div style={{ background: 'rgba(201,168,76,0.05)', border: `1px solid ${T.gold}22`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: T.gold, fontWeight: 600, marginBottom: 4 }}>The Mark Cuban Agent analyzes your deals, pitches, and business ideas with brutal honesty.</div>
        <div style={{ fontSize: 12, color: T.muted }}>Get a Shark Tank-style assessment: strengths, weaknesses, valuation, and whether Cuban would invest.</div>
      </div>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>{pitchTypes.map(p => <button key={p} onClick={() => setPitchType(p)} style={{ background: pitchType === p ? T.gold : '#1a1a1a', color: pitchType === p ? '#0a0a0a' : T.muted, border: `1px solid ${pitchType === p ? T.gold : T.border}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>{p}</button>)}</div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 6 }}>Your Business Idea / Pitch</label>
          <textarea value={idea} onChange={e => setIdea(e.target.value)} rows={4} style={{ width: '100%', background: '#1a1a1a', border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 12px', color: T.text, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Describe your business idea, deal, or pitch in detail..." />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 6 }}>Current Revenue / Valuation (optional)</label>
          <input value={revenue} onChange={e => setRevenue(e.target.value)} style={{ width: '100%', background: '#1a1a1a', border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 12px', color: T.text, fontSize: 13, boxSizing: 'border-box' }} placeholder="e.g. $10k MRR, $500k valuation" />
        </div>
        <button onClick={() => { setLoading(true); analyzeMut.mutate({ businessModel: idea || 'Creator monetization platform', revenue: revenue || 'Pre-revenue', growth: `${pitchType} stage` }); }} disabled={loading} style={{ background: loading ? '#1a1a1a' : T.gold, color: loading ? T.muted : '#0a0a0a', border: 'none', borderRadius: 8, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} />{loading ? 'Analyzing...' : "Get Cuban's Analysis"}
        </button>
      </div>
      {result && (<div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}><div style={{ fontSize: 14, fontWeight: 700, color: T.gold, marginBottom: 12 }}>Cuban's Verdict</div><div style={{ fontSize: 13, color: T.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{typeof result === 'string' ? result : result.analysis ?? JSON.stringify(result, null, 2)}</div></div>)}
    </div>
  );
}
export default MarkCubanAgent;
