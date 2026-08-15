import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Music, Search, ShieldCheck } from 'lucide-react';

const T = {
  bg: '#0a0a0a',
  surface: '#111',
  border: '#1e1e1e',
  gold: '#c9a84c',
  goldDim: 'rgba(201,168,76,0.12)',
  text: '#f5f0e8',
  muted: '#8d8d8d',
  success: '#9bd9b0',
};

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return 'Length not recorded';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function rightsLabel(rightsState?: string) {
  if (rightsState === 'creator_owned') return 'Creator-owned sound';
  if (rightsState === 'licensed_for_creation') return 'Cleared for creation';
  if (rightsState === 'licensed_playback_only') return 'Listening only';
  return 'Permission needs review';
}

export function MusicLibraryAgent() {
  const [query, setQuery] = useState('');
  const libraryQuery = trpc.musicLibrary.getLibrary.useQuery();
  const searchQuery = trpc.musicLibrary.searchLibrary.useQuery(
    { query },
    { enabled: query.trim().length > 0 },
  );

  const isSearching = query.trim().length > 0;
  const tracks = isSearching
    ? ((searchQuery.data as any)?.results ?? [])
    : ((libraryQuery.data as any)?.tracks ?? []);
  const isLoading = libraryQuery.isPending || (isSearching && searchQuery.isPending);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, padding: '28px 20px', maxWidth: 900, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 13, marginBottom: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: T.goldDim, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Music size={23} color={T.gold} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.05, fontWeight: 850 }}>Your Sound Library</h1>
          <p style={{ margin: '7px 0 0', fontSize: 13, lineHeight: 1.5, color: T.muted, maxWidth: 620 }}>
            Sound you own or have recorded permission to use. Every track keeps its use record attached before it ever touches a creation.
          </p>
        </div>
      </header>

      <div style={{ border: `1px solid ${T.border}`, background: '#0e0e0e', borderRadius: 14, padding: '13px 15px', margin: '22px 0 18px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <ShieldCheck size={18} color={T.gold} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.55 }}>
          New sound appears here only after it enters CreatorVault with its ownership and use record. Nothing is made up, added by a button, or called cleared before that record exists.
        </p>
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          style={{ width: '100%', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px 12px 38px', color: T.text, fontSize: 14, boxSizing: 'border-box' }}
          placeholder="Find a sound in your Vault"
        />
      </div>

      {isLoading && <div style={{ color: T.muted, fontSize: 13, padding: '8px 2px 14px' }}>Opening your recorded sound library…</div>}

      <div style={{ display: 'grid', gap: 12 }}>
        {tracks.map((track: any) => (
          <article key={track.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, display: 'grid', gap: 13 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
              <div style={{ width: 46, height: 46, background: T.goldDim, borderRadius: 11, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Music size={20} color={T.gold} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 760, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{track.artist}</div>
                <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', fontSize: 11, marginTop: 10, color: T.muted }}>
                  <span style={{ color: T.success }}>{rightsLabel(track.rightsState)}</span>
                  <span>•</span>
                  <span>{formatDuration(track.duration)}</span>
                  <span>•</span>
                  <span>{track.bpm ? `${Math.round(track.bpm)} BPM` : track.timingState === 'ready' ? 'Rhythm recorded' : 'Timing not recorded'}</span>
                </div>
              </div>
            </div>

            {track.url && (
              <audio controls preload="metadata" style={{ width: '100%', height: 34 }}>
                <source src={track.url} />
                Your browser cannot play this sound here.
              </audio>
            )}

            {track.attributionRequired && track.attributionText && (
              <p style={{ margin: 0, color: T.muted, fontSize: 11, lineHeight: 1.45 }}>Credit required: {track.attributionText}</p>
            )}
          </article>
        ))}

        {!isLoading && tracks.length === 0 && (
          <div style={{ border: `1px dashed ${T.border}`, borderRadius: 14, padding: '28px 22px', color: T.muted, fontSize: 13, lineHeight: 1.55, textAlign: 'center' }}>
            No approved sound is in this part of your Vault yet. Nothing was added, generated, or called ready here.
          </div>
        )}
      </div>
    </div>
  );
}

export default MusicLibraryAgent;
