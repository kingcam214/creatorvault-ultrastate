import React from "react";
import { Trash2, Music, Type } from "lucide-react";

interface TimelineProps {
  clips?: any[];
  textLayers?: any[];
  audioTracks?: any[];
  currentTime?: number;
  duration?: number;
  selectedClipId?: string | null;
  selectedTextLayerId?: string | null;
  selectedAudioTrackId?: string | null;
  onSelectClip?: (id: string | null) => void;
  onSelectTextLayer?: (id: string | null) => void;
  onSelectAudioTrack?: (id: string | null) => void;
  onSeek?: (t: number) => void;
  onClipUpdate?: (id: string, updates: any) => void;
  onClipRemove?: (id: string) => void;
  onClipSplit?: (id: string, atTime: number) => void;
  onClipsReorder?: (from: number, to: number) => void;
  onAudioTrackAdd?: (track: any) => void;
  onAudioTrackRemove?: (id: string) => void;
  onTextLayerAdd?: (layer: any) => void;
  onTextLayerRemove?: (id: string) => void;
  projectId?: string | null;
}

const C = { bg: "#0a0a0a", surface: "#111111", border: "#1e1e1e", accent: "#e63946", text: "#f0f0f0", muted: "#666666" };
const TRACK_H = 36;
const RULER_H = 20;

export function Timeline({ clips = [], textLayers = [], audioTracks = [], currentTime = 0, duration = 0, selectedClipId, onSelectClip, onClipRemove, onSeek }: TimelineProps) {
  const totalDur = Math.max(duration, clips.reduce((acc, c) => acc + (c.duration || c.trimEnd || 5), 0), 10);
  const pct = (t: number) => (t / totalDur) * 100;

  return (
    <div style={{ background: C.bg, borderTop: `1px solid ${C.border}`, userSelect: "none" }}>
      <div style={{ height: RULER_H, background: C.surface, borderBottom: `1px solid ${C.border}`, position: "relative", cursor: "pointer" }}
        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onSeek?.((e.clientX - r.left) / r.width * totalDur); }}>
        {Array.from({ length: Math.min(Math.ceil(totalDur) + 1, 61) }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: pct(i) + "%", top: 0, height: "100%", borderLeft: `1px solid ${C.border}`, display: "flex", alignItems: "flex-end", paddingBottom: 2, paddingLeft: 2 }}>
            <span style={{ fontSize: 8, color: C.muted }}>{i}s</span>
          </div>
        ))}
        <div style={{ position: "absolute", left: pct(currentTime) + "%", top: 0, width: 1, height: "100%", background: C.accent, pointerEvents: "none" }} />
      </div>
      <div style={{ height: TRACK_H, position: "relative", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center" }}>
        <div style={{ width: 48, flexShrink: 0, fontSize: 8, color: C.muted, textAlign: "center", borderRight: `1px solid ${C.border}`, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>VID</div>
        <div style={{ flex: 1, position: "relative", height: "100%" }}>
          {clips.map((clip, i) => {
            const start = clips.slice(0, i).reduce((a: number, c: any) => a + (c.duration || c.trimEnd || 5), 0);
            const w = pct(clip.duration || clip.trimEnd || 5);
            const l = pct(start);
            return (
              <div key={clip.id} onClick={() => onSelectClip?.(clip.id)}
                style={{ position: "absolute", left: l + "%", width: w + "%", height: "80%", top: "10%",
                  background: selectedClipId === clip.id ? "#1e3a5a" : "#1a2a3a",
                  border: `1px solid ${selectedClipId === clip.id ? C.accent : C.border}`,
                  borderRadius: 4, cursor: "pointer", overflow: "hidden", display: "flex", alignItems: "center", paddingLeft: 4 }}>
                <span style={{ fontSize: 9, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clip.name || `Clip ${i + 1}`}</span>
                {selectedClipId === clip.id && (
                  <button onClick={(e) => { e.stopPropagation(); onClipRemove?.(clip.id); }}
                    style={{ position: "absolute", right: 2, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: C.accent, padding: 1 }}>
                    <Trash2 size={8} />
                  </button>
                )}
              </div>
            );
          })}
          <div style={{ position: "absolute", left: pct(currentTime) + "%", top: 0, width: 1, height: "100%", background: C.accent, pointerEvents: "none" }} />
        </div>
      </div>
      <div style={{ height: TRACK_H, position: "relative", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center" }}>
        <div style={{ width: 48, flexShrink: 0, fontSize: 8, color: C.muted, textAlign: "center", borderRight: `1px solid ${C.border}`, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Music size={9} /></div>
        <div style={{ flex: 1, position: "relative", height: "100%", display: "flex", alignItems: "center", paddingLeft: 6 }}>
          {audioTracks.length === 0 && <span style={{ fontSize: 9, color: C.muted }}>No audio tracks</span>}
          {audioTracks.map((track: any, i: number) => (
            <div key={track.id} style={{ background: "#1a3a2a", border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px", fontSize: 9, color: C.text, marginRight: 4 }}>
              {track.name || `Audio ${i + 1}`}
            </div>
          ))}
          <div style={{ position: "absolute", left: pct(currentTime) + "%", top: 0, width: 1, height: "100%", background: C.accent, pointerEvents: "none" }} />
        </div>
      </div>
      <div style={{ height: TRACK_H, position: "relative", display: "flex", alignItems: "center" }}>
        <div style={{ width: 48, flexShrink: 0, fontSize: 8, color: C.muted, textAlign: "center", borderRight: `1px solid ${C.border}`, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Type size={9} /></div>
        <div style={{ flex: 1, position: "relative", height: "100%", display: "flex", alignItems: "center", paddingLeft: 6 }}>
          {textLayers.length === 0 && <span style={{ fontSize: 9, color: C.muted }}>No text layers</span>}
          {textLayers.map((layer: any, i: number) => (
            <div key={layer.id} style={{ background: "#2a1a3a", border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px", fontSize: 9, color: C.text, marginRight: 4 }}>
              {(layer.text || "").slice(0, 12) || `Text ${i + 1}`}
            </div>
          ))}
          <div style={{ position: "absolute", left: pct(currentTime) + "%", top: 0, width: 1, height: "100%", background: C.accent, pointerEvents: "none" }} />
        </div>
      </div>
    </div>
  );
}

export default Timeline;;
