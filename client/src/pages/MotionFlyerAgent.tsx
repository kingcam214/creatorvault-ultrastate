import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Layers, Zap } from 'lucide-react';
const T = { bg: '#0a0a0a', surface: '#111', border: '#1e1e1e', gold: '#c9a84c', text: '#f5f0e8', muted: '#6b6b6b', success: '#22c55e' };
export function MotionFlyerAgent() {
  const [form, setForm] = useState({ eventName: '', style: 'modern', platform: 'instagram', cta: '' });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const generateMut = trpc.flyerStudio.generateFlyerCopy.useMutation({ onSuccess: (d) => { setResult(d); setLoading(false); }, onError: () => setLoading(false) });
  const styles = ['modern', 'luxury', 'street', 'cinematic', 'minimal', 'bold'];
  const platforms = ['instagram', 'tiktok', 'twitter', 'facebook', 'youtube'];
  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, padding: '24px 20px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Layers size={26} color={T.gold} />
        <div><h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Motion Flyer Agent</h1><p style={{ margin: 0, fontSize: 12, color: T.muted }}>AI-powered motion flyer creation for events and promos</p></div>
      </div>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 6 }}>Event Name</label>
          <input value={form.eventName} onChange={e => setForm({...form, eventName: e.target.value})} style={{ width: '100%', background: '#1a1a1a', border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 12px', color: T.text, fontSize: 13, boxSizing: 'border-box' }} placeholder="e.g. KingCam Live Workshop" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 6 }}>CTA</label>
          <input value={form.cta} onChange={e => setForm({...form, cta: e.target.value})} style={{ width: '100%', background: '#1a1a1a', border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 12px', color: T.text, fontSize: 13, boxSizing: 'border-box' }} placeholder="e.g. Register at kingcam.com" />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {styles.map(s => <button key={s} onClick={() => setForm({...form, style: s})} style={{ background: form.style === s ? T.gold : '#1a1a1a', color: form.style === s ? '#0a0a0a' : T.muted, border: `1px solid ${form.style === s ? T.gold : T.border}`, borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>{s}</button>)}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {platforms.map(p => <button key={p} onClick={() => setForm({...form, platform: p})} style={{ background: form.platform === p ? '#60a5fa' : '#1a1a1a', color: form.platform === p ? '#0a0a0a' : T.muted, border: `1px solid ${form.platform === p ? '#60a5fa' : T.border}`, borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>{p}</button>)}
        </div>
        <button onClick={() => { setLoading(true); generateMut.mutate({ event: form.eventName || 'KingCam Event', style: form.style }); }} disabled={loading} style={{ background: loading ? '#1a1a1a' : T.gold, color: loading ? T.muted : '#0a0a0a', border: 'none', borderRadius: 8, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} />{loading ? 'Generating...' : 'Generate Motion Flyer'}
        </button>
      </div>
      {result && (<div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}><div style={{ fontSize: 13, fontWeight: 700, color: T.success, marginBottom: 12 }}>Flyer Generated!</div><pre style={{ fontSize: 12, color: T.text, whiteSpace: 'pre-wrap', lineHeight: 1.6, fontFamily: 'monospace' }}>{JSON.stringify(result, null, 2)}</pre></div>)}
    </div>
  );
}
export default MotionFlyerAgent;
