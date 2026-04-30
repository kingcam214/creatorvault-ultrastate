import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Globe, Send } from 'lucide-react';
const T = { bg: '#0a0a0a', surface: '#111', border: '#1e1e1e', gold: '#c9a84c', text: '#f5f0e8', muted: '#6b6b6b', success: '#22c55e', error: '#ef4444' };
const PLATFORMS = [{ id: 'instagram', label: 'Instagram', color: '#e1306c' }, { id: 'tiktok', label: 'TikTok', color: '#69c9d0' }, { id: 'twitter', label: 'Twitter/X', color: '#1da1f2' }, { id: 'facebook', label: 'Facebook', color: '#1877f2' }, { id: 'youtube', label: 'YouTube', color: '#ff0000' }];
export function SocialAutoposterAgent() {
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'tiktok']);
  const [scheduleTime, setScheduleTime] = useState('now');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const getScheduledFor = (t: string) => { const d = new Date(); if (t === '1h') d.setHours(d.getHours() + 1); else if (t === '6h') d.setHours(d.getHours() + 6); else if (t === '24h') d.setDate(d.getDate() + 1); else if (t === 'optimal') d.setHours(d.getHours() + 3); return d.toISOString(); };
  const postMut = trpc.socialMediaAutoPoster.schedulePost.useMutation({ onSuccess: (d) => { setResult(d); setLoading(false); }, onError: (e) => { setResult({ error: e.message }); setLoading(false); } });
  const togglePlatform = (p: string) => setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, padding: '24px 20px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Globe size={26} color={T.gold} />
        <div><h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Social Autoposter Agent</h1><p style={{ margin: 0, fontSize: 12, color: T.muted }}>AI-powered multi-platform content distribution</p></div>
      </div>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 6 }}>Post Content</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={5} style={{ width: '100%', background: '#1a1a1a', border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 12px', color: T.text, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Write your post content here... The AI will optimize it for each platform." />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 8 }}>Target Platforms</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{PLATFORMS.map(p => <button key={p.id} onClick={() => togglePlatform(p.id)} style={{ background: selectedPlatforms.includes(p.id) ? p.color : '#1a1a1a', color: selectedPlatforms.includes(p.id) ? '#fff' : T.muted, border: `1px solid ${selectedPlatforms.includes(p.id) ? p.color : T.border}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>{p.label}</button>)}</div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: T.muted, display: 'block', marginBottom: 6 }}>Schedule</label>
          <div style={{ display: 'flex', gap: 8 }}>{['now', '1h', '6h', '24h', 'optimal'].map(t => <button key={t} onClick={() => setScheduleTime(t)} style={{ background: scheduleTime === t ? T.gold : '#1a1a1a', color: scheduleTime === t ? '#0a0a0a' : T.muted, border: `1px solid ${scheduleTime === t ? T.gold : T.border}`, borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>{t === 'now' ? 'Post Now' : t === 'optimal' ? 'AI Optimal' : `In ${t}`}</button>)}</div>
        </div>
        <button onClick={() => { setLoading(true); postMut.mutate({ content: content || 'Test post from KingCam Empire', platforms: selectedPlatforms, scheduledFor: getScheduledFor(scheduleTime) }); }} disabled={loading || selectedPlatforms.length === 0} style={{ background: loading ? '#1a1a1a' : T.gold, color: loading ? T.muted : '#0a0a0a', border: 'none', borderRadius: 8, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Send size={16} />{loading ? 'Posting...' : `Post to ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? 's' : ''}`}
        </button>
      </div>
      {result && (<div style={{ background: result.error ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', border: `1px solid ${result.error ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`, borderRadius: 12, padding: 16 }}>{result.error ? <div style={{ color: '#ef4444', fontSize: 13 }}>Error: {result.error}</div> : <><div style={{ fontSize: 13, color: T.success, fontWeight: 700, marginBottom: 8 }}>Post scheduled successfully!</div><pre style={{ fontSize: 12, color: T.text, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{JSON.stringify(result, null, 2)}</pre></>}</div>)}
    </div>
  );
}
export default SocialAutoposterAgent;
