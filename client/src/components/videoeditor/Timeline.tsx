import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Film, Music, Type, Scissors, Undo2, Redo2, Magnet, Copy, Trash2 } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────────
export interface TimelineClip {
  id: string;
  name: string;
  src?: string;
  assetUrl?: string;
  url?: string;
  sourceUrl?: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  trackIndex: number;
  startOffset: number; // position on timeline in seconds
  type: "video" | "image" | "audio" | "text";
  thumbnail?: string;
  waveform?: number[];
  locked?: boolean;
}

export interface TimelineState {
  clips: TimelineClip[];
  playheadTime: number;
  zoom: number;
  scrollX: number;
  selectedClipIds: Set<string>;
  snapEnabled: boolean;
  duration: number;
}

interface HistoryEntry {
  clips: TimelineClip[];
  label: string;
}

interface TimelineProps {
  clips?: any[];
  audioTracks?: any[];
  textLayers?: any[];
  currentTime?: number;
  totalDuration?: number;
  selectedClipId?: string | null;
  onSelectClip?: (id: string) => void;
  onSeek?: (time: number) => void;
  onClipRemove?: (id: string) => void;
  onSplit?: (clipId: string, time: number) => void;
  onReorder?: (clipId: string, newIndex: number) => void;
  onClipUpdate?: (clipId: string, updates: Partial<TimelineClip>) => void;
  onClipsChange?: (clips: TimelineClip[]) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────────
const TRACK_HEIGHT = 48;
const RULER_HEIGHT = 28;
const MIN_CLIP_WIDTH = 24;
const SNAP_THRESHOLD_PX = 6;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 8;
const PIXELS_PER_SECOND_BASE = 80;

const C = {
  bg: "#0a0a0f",
  track: "#111118",
  trackAlt: "#0d0d14",
  border: "#1e1e2a",
  accent: "#e63946",
  accentGlow: "rgba(230, 57, 70, 0.3)",
  gold: "#F2B15B",
  text: "#e8e8f0",
  muted: "#666680",
  clipVideo: "#1a2a4a",
  clipVideoSelected: "#1e3a6a",
  clipAudio: "#1a3a2a",
  clipAudioSelected: "#1e4a3a",
  clipText: "#2a1a3a",
  clipTextSelected: "#3a1e4a",
  snapLine: "#00ff88",
  playhead: "#e63946",
};

// ─── Utility ────────────────────────────────────────────────────────────────────
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function generateId() { return crypto.randomUUID?.() || `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

function normalizeClip(raw: any, index: number): TimelineClip {
  return {
    id: raw.id || generateId(),
    name: raw.name || `Clip ${index + 1}`,
    src: raw.src || raw.assetUrl || raw.url || raw.sourceUrl || "",
    assetUrl: raw.assetUrl || raw.src || raw.url || "",
    duration: raw.duration || raw.trimEnd || 5,
    trimStart: raw.trimStart || 0,
    trimEnd: raw.trimEnd || raw.duration || 5,
    trackIndex: raw.trackIndex ?? 0,
    startOffset: raw.startOffset ?? 0,
    type: raw.type || "video",
    thumbnail: raw.thumbnail,
    waveform: raw.waveform,
    locked: raw.locked || false,
  };
}

// ─── Undo/Redo Engine ───────────────────────────────────────────────────────────
function useUndoRedo(initialClips: TimelineClip[]) {
  const [history, setHistory] = useState<HistoryEntry[]>([{ clips: initialClips, label: "Initial" }]);
  const [pointer, setPointer] = useState(0);

  const current = history[pointer]?.clips || [];

  const push = useCallback((clips: TimelineClip[], label: string) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, pointer + 1);
      const next = [...trimmed, { clips: JSON.parse(JSON.stringify(clips)), label }];
      if (next.length > 100) next.shift();
      return next;
    });
    setPointer(p => Math.min(p + 1, 100));
  }, [pointer]);

  const undo = useCallback(() => {
    setPointer(p => Math.max(0, p - 1));
  }, []);

  const redo = useCallback(() => {
    setPointer(p => Math.min(history.length - 1, p + 1));
  }, [history.length]);

  const canUndo = pointer > 0;
  const canRedo = pointer < history.length - 1;

  return { current, push, undo, redo, canUndo, canRedo };
}

// ─── Snap Engine ────────────────────────────────────────────────────────────────
function findSnapPoints(clips: TimelineClip[], excludeIds: Set<string>): number[] {
  const points: number[] = [0];
  for (const clip of clips) {
    if (excludeIds.has(clip.id)) continue;
    points.push(clip.startOffset);
    points.push(clip.startOffset + (clip.trimEnd - clip.trimStart));
  }
  return [...new Set(points)].sort((a, b) => a - b);
}

function snapToNearest(time: number, snapPoints: number[], pxPerSec: number, threshold: number = SNAP_THRESHOLD_PX): { snapped: number; didSnap: boolean } {
  const thresholdSec = threshold / pxPerSec;
  let closest = time;
  let minDist = Infinity;
  for (const pt of snapPoints) {
    const dist = Math.abs(time - pt);
    if (dist < minDist && dist < thresholdSec) {
      minDist = dist;
      closest = pt;
    }
  }
  return { snapped: closest, didSnap: closest !== time };
}

// ─── Drag State ─────────────────────────────────────────────────────────────────
type DragMode = "move" | "trim-left" | "trim-right" | "split" | null;

interface DragState {
  mode: DragMode;
  clipId: string;
  startX: number;
  startTime: number;
  originalClip: TimelineClip;
  snapLine: number | null;
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export function Timeline({
  clips: externalClips = [],
  audioTracks = [],
  textLayers = [],
  currentTime = 0,
  totalDuration,
  selectedClipId,
  onSelectClip,
  onSeek,
  onClipRemove,
  onSplit,
  onReorder,
  onClipUpdate,
  onClipsChange,
}: TimelineProps) {
  // Normalize incoming clips
  const normalizedExternal = useMemo(() => {
    const videoClips = externalClips.map((c, i) => normalizeClip({ ...c, type: "video", trackIndex: 0 }, i));
    const audioClipsMapped = audioTracks.map((t, i) => normalizeClip({ ...t, type: "audio", trackIndex: 1 }, i));
    const textClipsMapped = textLayers.map((l, i) => normalizeClip({ ...l, type: "text", trackIndex: 2, duration: l.duration || 3 }, i));
    // Compute sequential startOffsets for video track
    let offset = 0;
    for (const clip of videoClips) {
      clip.startOffset = offset;
      offset += clip.trimEnd - clip.trimStart;
    }
    return [...videoClips, ...audioClipsMapped, ...textClipsMapped];
  }, [externalClips, audioTracks, textLayers]);

  const { current: clips, push, undo, redo, canUndo, canRedo } = useUndoRedo(normalizedExternal);

  // Sync external changes
  useEffect(() => {
    if (JSON.stringify(normalizedExternal.map(c => c.id)) !== JSON.stringify(clips.map(c => c.id))) {
      push(normalizedExternal, "External update");
    }
  }, [normalizedExternal]);

  const [zoom, setZoom] = useState(1);
  const [scrollX, setScrollX] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(selectedClipId ? [selectedClipId] : []));
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [splitMode, setSplitMode] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const trackAreaRef = useRef<HTMLDivElement>(null);

  const pxPerSec = PIXELS_PER_SECOND_BASE * zoom;
  const timelineDuration = useMemo(() => {
    if (totalDuration) return totalDuration;
    let maxEnd = 10;
    for (const clip of clips) {
      const end = clip.startOffset + (clip.trimEnd - clip.trimStart);
      if (end > maxEnd) maxEnd = end;
    }
    return maxEnd + 5;
  }, [clips, totalDuration]);
  const totalWidth = timelineDuration * pxPerSec;

  // Sync selectedClipId prop
  useEffect(() => {
    if (selectedClipId) setSelectedIds(new Set([selectedClipId]));
  }, [selectedClipId]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const ctrl = e.metaKey || e.ctrlKey;
      if (ctrl && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.size > 0) {
          e.preventDefault();
          const newClips = clips.filter(c => !selectedIds.has(c.id));
          push(newClips, "Delete clips");
          onClipsChange?.(newClips);
          selectedIds.forEach(id => onClipRemove?.(id));
          setSelectedIds(new Set());
        }
      }
      if (e.key === "s" && !ctrl) { setSplitMode(prev => !prev); }
      if (e.key === "n") { setSnapEnabled(prev => !prev); }
      if (e.key === "=" || e.key === "+") { setZoom(z => clamp(z * 1.25, ZOOM_MIN, ZOOM_MAX)); }
      if (e.key === "-") { setZoom(z => clamp(z / 1.25, ZOOM_MIN, ZOOM_MAX)); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [clips, selectedIds, undo, redo, push, onClipRemove, onClipsChange]);

  // ─── Pointer Handlers (unified mouse + touch) ──────────────────────────────
  const getTimeFromX = useCallback((clientX: number): number => {
    const rect = trackAreaRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const relX = clientX - rect.left + scrollX;
    return Math.max(0, relX / pxPerSec);
  }, [scrollX, pxPerSec]);

  const handleRulerClick = useCallback((e: React.MouseEvent) => {
    const time = getTimeFromX(e.clientX);
    onSeek?.(time);
  }, [getTimeFromX, onSeek]);

  const handleClipPointerDown = useCallback((e: React.PointerEvent, clip: TimelineClip, mode: DragMode) => {
    if (clip.locked) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (splitMode && mode === "move") {
      // Split at pointer position
      const splitTime = getTimeFromX(e.clientX);
      const relativeTime = splitTime - clip.startOffset + clip.trimStart;
      if (relativeTime > clip.trimStart + 0.1 && relativeTime < clip.trimEnd - 0.1) {
        const clipA: TimelineClip = { ...clip, id: generateId(), trimEnd: relativeTime };
        const clipB: TimelineClip = { ...clip, id: generateId(), trimStart: relativeTime, startOffset: clip.startOffset + (relativeTime - clip.trimStart) };
        const newClips = clips.map(c => c.id === clip.id ? clipA : c);
        newClips.splice(newClips.indexOf(clipA) + 1, 0, clipB);
        push(newClips, "Split clip");
        onClipsChange?.(newClips);
        onSplit?.(clip.id, relativeTime);
      }
      return;
    }

    setSelectedIds(new Set([clip.id]));
    onSelectClip?.(clip.id);

    setDragState({
      mode,
      clipId: clip.id,
      startX: e.clientX,
      startTime: getTimeFromX(e.clientX),
      originalClip: { ...clip },
      snapLine: null,
    });
  }, [clips, splitMode, getTimeFromX, push, onClipsChange, onSplit, onSelectClip]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const dtSec = dx / pxPerSec;
    const clip = clips.find(c => c.id === dragState.clipId);
    if (!clip) return;

    const snapPoints = snapEnabled ? findSnapPoints(clips, new Set([dragState.clipId])) : [];
    let newClips = [...clips];
    let snapLine: number | null = null;

    if (dragState.mode === "move") {
      let newStart = Math.max(0, dragState.originalClip.startOffset + dtSec);
      if (snapEnabled) {
        const { snapped, didSnap } = snapToNearest(newStart, snapPoints, pxPerSec);
        if (didSnap) { newStart = snapped; snapLine = snapped; }
        const endTime = newStart + (clip.trimEnd - clip.trimStart);
        const { snapped: snappedEnd, didSnap: didSnapEnd } = snapToNearest(endTime, snapPoints, pxPerSec);
        if (didSnapEnd && !didSnap) { newStart = snappedEnd - (clip.trimEnd - clip.trimStart); snapLine = snappedEnd; }
      }
      newClips = clips.map(c => c.id === clip.id ? { ...c, startOffset: newStart } : c);
    } else if (dragState.mode === "trim-left") {
      const maxTrim = dragState.originalClip.trimEnd - 0.1;
      let newTrimStart = clamp(dragState.originalClip.trimStart + dtSec, 0, maxTrim);
      const newStartOffset = dragState.originalClip.startOffset + (newTrimStart - dragState.originalClip.trimStart);
      if (snapEnabled) {
        const { snapped, didSnap } = snapToNearest(newStartOffset, snapPoints, pxPerSec);
        if (didSnap) { newTrimStart = dragState.originalClip.trimStart + (snapped - dragState.originalClip.startOffset); snapLine = snapped; }
      }
      newClips = clips.map(c => c.id === clip.id ? { ...c, trimStart: newTrimStart, startOffset: dragState.originalClip.startOffset + (newTrimStart - dragState.originalClip.trimStart) } : c);
    } else if (dragState.mode === "trim-right") {
      const minTrim = dragState.originalClip.trimStart + 0.1;
      let newTrimEnd = clamp(dragState.originalClip.trimEnd + dtSec, minTrim, dragState.originalClip.duration);
      if (snapEnabled) {
        const endTime = clip.startOffset + (newTrimEnd - clip.trimStart);
        const { snapped, didSnap } = snapToNearest(endTime, snapPoints, pxPerSec);
        if (didSnap) { newTrimEnd = clip.trimStart + (snapped - clip.startOffset); snapLine = snapped; }
      }
      newClips = clips.map(c => c.id === clip.id ? { ...c, trimEnd: newTrimEnd } : c);
    }

    setDragState(prev => prev ? { ...prev, snapLine } : null);
    // Live update without pushing to history
    push(newClips, dragState.mode === "move" ? "Move" : "Trim");
  }, [dragState, clips, pxPerSec, snapEnabled, push]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragState) return;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    setDragState(null);
    onClipsChange?.(clips);
  }, [dragState, clips, onClipsChange]);

  // ─── Track Rendering ──────────────────────────────────────────────────────
  const tracks = useMemo(() => {
    const trackMap: Record<number, TimelineClip[]> = { 0: [], 1: [], 2: [] };
    for (const clip of clips) {
      const idx = clip.trackIndex ?? 0;
      if (!trackMap[idx]) trackMap[idx] = [];
      trackMap[idx].push(clip);
    }
    return trackMap;
  }, [clips]);

  const trackLabels = [
    { icon: <Film size={11} />, label: "VID" },
    { icon: <Music size={11} />, label: "AUD" },
    { icon: <Type size={11} />, label: "TXT" },
  ];

  const playheadX = currentTime * pxPerSec - scrollX;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="vx-timeline"
      style={{ width: "100%", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden", userSelect: "none", touchAction: "none" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderBottom: `1px solid ${C.border}`, background: "#08080d" }}>
        <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" style={{ background: "transparent", border: "none", cursor: canUndo ? "pointer" : "default", opacity: canUndo ? 1 : 0.3, color: C.text, padding: 4 }}><Undo2 size={14} /></button>
        <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)" style={{ background: "transparent", border: "none", cursor: canRedo ? "pointer" : "default", opacity: canRedo ? 1 : 0.3, color: C.text, padding: 4 }}><Redo2 size={14} /></button>
        <div style={{ width: 1, height: 16, background: C.border, margin: "0 4px" }} />
        <button onClick={() => setSplitMode(s => !s)} title="Split mode (S)" style={{ background: splitMode ? C.accent : "transparent", border: `1px solid ${splitMode ? C.accent : C.border}`, borderRadius: 4, cursor: "pointer", color: C.text, padding: "3px 6px", fontSize: 10, fontWeight: 600 }}><Scissors size={11} /> Split</button>
        <button onClick={() => setSnapEnabled(s => !s)} title="Snap (N)" style={{ background: snapEnabled ? "#1a3a2a" : "transparent", border: `1px solid ${snapEnabled ? "#2a5a3a" : C.border}`, borderRadius: 4, cursor: "pointer", color: C.text, padding: "3px 6px", fontSize: 10, fontWeight: 600 }}><Magnet size={11} /> Snap</button>
        <div style={{ width: 1, height: 16, background: C.border, margin: "0 4px" }} />
        <button onClick={() => {
          if (selectedIds.size === 1) {
            const clipId = [...selectedIds][0];
            const clip = clips.find(c => c.id === clipId);
            if (clip) {
              const dupe: TimelineClip = { ...clip, id: generateId(), name: clip.name + " (copy)", startOffset: clip.startOffset + (clip.trimEnd - clip.trimStart) };
              const newClips = [...clips, dupe];
              push(newClips, "Duplicate");
              onClipsChange?.(newClips);
            }
          }
        }} title="Duplicate" style={{ background: "transparent", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Copy size={12} /></button>
        <button onClick={() => {
          if (selectedIds.size > 0) {
            const newClips = clips.filter(c => !selectedIds.has(c.id));
            push(newClips, "Delete");
            onClipsChange?.(newClips);
            selectedIds.forEach(id => onClipRemove?.(id));
            setSelectedIds(new Set());
          }
        }} title="Delete (Del)" style={{ background: "transparent", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Trash2 size={12} /></button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: C.muted }}>Zoom</span>
        <input type="range" min={ZOOM_MIN * 100} max={ZOOM_MAX * 100} value={zoom * 100} onChange={e => setZoom(Number(e.target.value) / 100)} style={{ width: 60, accentColor: C.accent }} />
        <span style={{ fontSize: 9, color: C.muted, minWidth: 28 }}>{zoom.toFixed(1)}x</span>
      </div>

      {/* Ruler */}
      <div
        style={{ height: RULER_HEIGHT, position: "relative", borderBottom: `1px solid ${C.border}`, overflow: "hidden", cursor: "pointer", background: "#06060a" }}
        onClick={handleRulerClick}
      >
        <div style={{ position: "absolute", left: -scrollX, top: 0, width: totalWidth, height: "100%" }}>
          {Array.from({ length: Math.ceil(timelineDuration) + 1 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: i * pxPerSec, top: 0, height: "100%", borderLeft: `1px solid ${i % 5 === 0 ? C.border : "rgba(255,255,255,0.04)"}`, display: "flex", alignItems: "flex-end", paddingBottom: 3, paddingLeft: 3 }}>
              {i % (zoom > 2 ? 1 : zoom > 1 ? 2 : 5) === 0 && <span style={{ fontSize: 9, color: C.muted }}>{i}s</span>}
            </div>
          ))}
        </div>
        {/* Playhead on ruler */}
        {playheadX >= 0 && playheadX <= (containerRef.current?.clientWidth || 9999) && (
          <div style={{ position: "absolute", left: playheadX, top: 0, width: 2, height: "100%", background: C.playhead, zIndex: 10, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: 0, left: -4, width: 10, height: 10, background: C.playhead, borderRadius: "0 0 50% 50%", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
          </div>
        )}
      </div>

      {/* Tracks */}
      <div
        ref={trackAreaRef}
        style={{ position: "relative", overflow: "auto", maxHeight: TRACK_HEIGHT * 4 }}
        onScroll={(e) => setScrollX((e.target as HTMLElement).scrollLeft)}
      >
        <div style={{ width: totalWidth + 60, minHeight: TRACK_HEIGHT * 3 }}>
          {[0, 1, 2].map(trackIdx => (
            <div key={trackIdx} style={{ height: TRACK_HEIGHT, position: "relative", borderBottom: `1px solid ${C.border}`, display: "flex", background: trackIdx % 2 === 0 ? C.track : C.trackAlt }}>
              {/* Track label */}
              <div style={{ width: 44, flexShrink: 0, fontSize: 9, color: C.muted, textAlign: "center", borderRight: `1px solid ${C.border}`, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 3, background: "#08080d" }}>
                {trackLabels[trackIdx]?.icon}
                <span>{trackLabels[trackIdx]?.label}</span>
              </div>
              {/* Clips area */}
              <div style={{ flex: 1, position: "relative", height: "100%" }}>
                {(tracks[trackIdx] || []).map(clip => {
                  const clipDuration = clip.trimEnd - clip.trimStart;
                  const leftPx = clip.startOffset * pxPerSec;
                  const widthPx = Math.max(MIN_CLIP_WIDTH, clipDuration * pxPerSec);
                  const isSelected = selectedIds.has(clip.id);
                  const clipColor = clip.type === "audio" ? (isSelected ? C.clipAudioSelected : C.clipAudio) : clip.type === "text" ? (isSelected ? C.clipTextSelected : C.clipText) : (isSelected ? C.clipVideoSelected : C.clipVideo);

                  return (
                    <div
                      key={clip.id}
                      style={{
                        position: "absolute",
                        left: leftPx,
                        width: widthPx,
                        height: "80%",
                        top: "10%",
                        background: clipColor,
                        border: `1.5px solid ${isSelected ? C.accent : C.border}`,
                        borderRadius: 5,
                        cursor: splitMode ? "crosshair" : "grab",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        boxShadow: isSelected ? `0 0 8px ${C.accentGlow}` : "none",
                        transition: "box-shadow 0.15s",
                      }}
                      onPointerDown={(e) => handleClipPointerDown(e, clip, "move")}
                    >
                      {/* Left trim handle */}
                      <div
                        style={{ position: "absolute", left: 0, top: 0, width: 6, height: "100%", cursor: "ew-resize", background: isSelected ? "rgba(230,57,70,0.4)" : "transparent", borderRadius: "5px 0 0 5px", zIndex: 2 }}
                        onPointerDown={(e) => { e.stopPropagation(); handleClipPointerDown(e, clip, "trim-left"); }}
                      />
                      {/* Clip content */}
                      <div style={{ flex: 1, padding: "0 8px", overflow: "hidden" }}>
                        <span style={{ fontSize: 9, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block", fontWeight: 500 }}>{clip.name}</span>
                        <span style={{ fontSize: 8, color: C.muted }}>{clipDuration.toFixed(1)}s</span>
                      </div>
                      {/* Waveform visualization */}
                      {clip.waveform && clip.type === "audio" && (
                        <div style={{ position: "absolute", bottom: 2, left: 8, right: 8, height: 12, display: "flex", alignItems: "flex-end", gap: 1 }}>
                          {clip.waveform.slice(0, Math.floor(widthPx / 3)).map((v, i) => (
                            <div key={i} style={{ width: 2, height: `${v * 100}%`, background: "rgba(0,255,136,0.4)", borderRadius: 1 }} />
                          ))}
                        </div>
                      )}
                      {/* Right trim handle */}
                      <div
                        style={{ position: "absolute", right: 0, top: 0, width: 6, height: "100%", cursor: "ew-resize", background: isSelected ? "rgba(230,57,70,0.4)" : "transparent", borderRadius: "0 5px 5px 0", zIndex: 2 }}
                        onPointerDown={(e) => { e.stopPropagation(); handleClipPointerDown(e, clip, "trim-right"); }}
                      />
                      {/* Lock indicator */}
                      {clip.locked && <div style={{ position: "absolute", top: 2, right: 2, fontSize: 8, color: C.gold }}>🔒</div>}
                    </div>
                  );
                })}
                {/* Playhead line on track */}
                <div style={{ position: "absolute", left: currentTime * pxPerSec, top: 0, width: 1.5, height: "100%", background: C.playhead, pointerEvents: "none", zIndex: 5 }} />
                {/* Snap line */}
                {dragState?.snapLine != null && (
                  <div style={{ position: "absolute", left: dragState.snapLine * pxPerSec, top: 0, width: 1, height: "100%", background: C.snapLine, pointerEvents: "none", zIndex: 4, opacity: 0.7 }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 10px", borderTop: `1px solid ${C.border}`, background: "#08080d", fontSize: 9, color: C.muted }}>
        <span>{clips.length} clips | {timelineDuration.toFixed(1)}s total</span>
        <span>Playhead: {currentTime.toFixed(2)}s</span>
        <span>{selectedIds.size > 0 ? `${selectedIds.size} selected` : "No selection"}</span>
      </div>
    </div>
  );
}

export default Timeline;
