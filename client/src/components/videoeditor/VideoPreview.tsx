import React, { useRef, useEffect, useState } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface VideoPreviewProps {
  clips?: any[];
  textLayers?: any[];
  audioTracks?: any[];
  colorGrade?: any;
  currentTime?: number;
  isPlaying?: boolean;
  duration?: number;
  onTimeUpdate?: (t: number) => void;
  onTogglePlay?: () => void;
  onSeek?: (t: number) => void;
  onVolumeChange?: (v: number) => void;
}

const C = { bg: "#000000", accent: "#e63946", text: "#f0f0f0", muted: "#555555", border: "#1a1a1a" };

export function VideoPreview({ clips = [], textLayers = [], currentTime = 0, isPlaying = false, duration = 0, onTogglePlay, onSeek, onTimeUpdate }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const activeClip = clips[0] ?? null;
  const videoSrc = activeClip ? (activeClip.assetUrl || activeClip.src || activeClip.url || activeClip.sourceUrl || "") : "";

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;
    if (v.src !== videoSrc) { v.src = videoSrc; }
  }, [videoSrc]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) v.play().catch(() => {});
    else v.pause();
  }, [isPlaying]);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{ width: "100%", height: "100%", background: C.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        {videoSrc ? (
          <video ref={videoRef} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            onTimeUpdate={() => { if (videoRef.current && onTimeUpdate) onTimeUpdate(videoRef.current.currentTime); }}
            muted={isMuted} playsInline />
        ) : (
          <div style={{ textAlign: "center", color: C.muted }}>
            <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.2 }}>&#9654;</div>
            <div style={{ fontSize: 11 }}>No clip selected. Upload media and add to timeline.</div>
          </div>
        )}
        {textLayers.map((layer: any) => (
          <div key={layer.id} style={{ position: "absolute", left: (layer.x ?? 50) + "%", top: (layer.y ?? 50) + "%",
            transform: "translate(-50%,-50%)", fontSize: layer.fontSize ?? 24, color: layer.color ?? "#fff",
            fontFamily: layer.fontFamily ?? "Inter", pointerEvents: "none", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            {layer.text}
          </div>
        ))}
      </div>
      <div style={{ padding: "6px 10px", background: "#0a0a0a", borderTop: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={onTogglePlay} style={{ background: C.accent, border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          {isPlaying ? <Pause size={12} color="#fff" /> : <Play size={12} color="#fff" />}
        </button>
        <div style={{ flex: 1, height: 4, background: "#1a1a1a", borderRadius: 2, cursor: "pointer" }}
          onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onSeek?.((e.clientX - r.left) / r.width * (duration || 0)); }}>
          <div style={{ width: pct + "%", height: "100%", background: C.accent, borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 9, color: C.muted, flexShrink: 0 }}>
          {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")} / {Math.floor((duration || 0) / 60)}:{String(Math.floor((duration || 0) % 60)).padStart(2, "0")}
        </div>
        <button onClick={() => setIsMuted(m => !m)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.muted, padding: 2 }}>
          {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>
      </div>
    </div>
  );
}

export default VideoPreview;
