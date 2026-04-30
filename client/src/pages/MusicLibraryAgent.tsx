import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Music, Play, Download, Search } from 'lucide-react';
const T = { bg: '#0a0a0a', surface: '#111', border: '#1e1e1e', gold: '#c9a84c', goldDim: 'rgba(201,168,76,0.12)', text: '#f5f0e8', muted: '#6b6b6b', success: '#22c55e', info: '#60a5fa' };
export function MusicLibraryAgent() {
  const [query, setQuery] = useState('');
  const [mood, setMood] = useState('all');
  const libraryQuery = trpc.musicLibrary.getLibrary.useQuery();
  const searchQuery = trpc.musicLibrary.searchLibrary.useQuery({ query }, { enabled: query.length > 0 });
  const addMut = trpc.musicLibrary.addTrack.useMutation({ onSuccess: () => libraryQuery.refetch() });
  const rawTracks = (query.length > 0 ? (searchQuery.data as any)?.tracks : (libraryQuery.data as any)?.tracks) ?? [];
  const tracks = mood === 'all' ? rawTracks : rawTracks.filter((t: any) => (t.genre ?? '').toLowerCase().includes(mood));
  const moods = ['all', 'hype', 'chill', 'motivational', 'cinematic', 'trap', 'lo-fi'];
  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, padding: '24px 20px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Music size={26} color={T.gold} />
        <div><h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Music Library Agent</h1><p style={{ margin: 0, fontSize: 12, color: T.muted }}>AI-curated music for your content — royalty-free</p></div>
        <div style={{ marginLeft: 'auto' }}><button onClick={() => addMut.mutate({ title: `AI Track - ${mood === 'all' ? 'hype' : mood}`, artist: 'KingCam AI', genre: mood === 'all' ? 'hype' : mood, url: '', duration: 60 })} style={{ background: T.gold, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}><Music size={14} />Add Track</button></div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
          <input value={query} onChange={e => setQuery(e.target.value)} style={{ width: '100%', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 12px 10px 34px', color: T.text, fontSize: 13, boxSizing: 'border-box' }} placeholder="Search tracks..." />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>{moods.map(m => <button key={m} onClick={() => setMood(m)} style={{ background: mood === m ? T.gold : T.surface, color: mood === m ? '#0a0a0a' : T.muted, border: `1px solid ${mood === m ? T.gold : T.border}`, borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>{m}</button>)}</div>
      {(libraryQuery.isLoading || searchQuery.isLoading) && <div style={{ color: T.muted, fontSize: 13 }}>Loading tracks...</div>}
      <div style={{ display: 'grid', gap: 8 }}>
        {tracks.map((track: any, i: number) => (
          <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, background: T.goldDim, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Music size={20} color={T.gold} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{track.title ?? track.name ?? 'Untitled Track'}</div>
              <div style={{ fontSize: 11, color: T.muted }}>{track.mood ?? 'Unknown'} · {track.duration_seconds ? `${Math.floor(track.duration_seconds / 60)}:${String(track.duration_seconds % 60).padStart(2, '0')}` : 'N/A'} · {track.bpm ? `${track.bpm} BPM` : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {track.file_url && <button style={{ background: '#1a1a1a', border: `1px solid ${T.border}`, borderRadius: 6, padding: '6px 10px', color: T.info, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><Play size={12} />Play</button>}
              {track.file_url && <a href={track.file_url} download style={{ background: '#1a1a1a', border: `1px solid ${T.border}`, borderRadius: 6, padding: '6px 10px', color: T.success, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, textDecoration: 'none' }}><Download size={12} />DL</a>}
            </div>
          </div>
        ))}
        {tracks.length === 0 && !libraryQuery.isLoading && <div style={{ color: T.muted, fontSize: 13, padding: 20, textAlign: 'center' }}>No tracks found. Add a track above or connect your music library.</div>}
      </div>
    </div>
  );
}
export default MusicLibraryAgent;
