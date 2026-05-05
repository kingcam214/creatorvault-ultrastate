import React from "react";
import { Save, Loader2 } from "lucide-react";

interface ControlsPanelProps {
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  volume?: number;
  isSaving?: boolean;
  onTogglePlay?: () => void;
  onSeek?: (t: number) => void;
  onVolumeChange?: (v: number) => void;
  onSave?: () => void;
}

const C = { bg: "#0a0a0a", accent: "#e63946", text: "#f0f0f0", muted: "#666666", border: "#1e1e1e" };

export function ControlsPanel({ currentTime = 0, duration = 0, isSaving = false, onSave }: ControlsPanelProps) {
  return (
    <div style={{ background: C.bg, borderTop: `1px solid ${C.border}`, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <div style={{ fontSize: 10, color: C.muted }}>
        {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")} / {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, "0")}
      </div>
      <button onClick={onSave} disabled={isSaving}
        style={{ padding: "5px 12px", borderRadius: 6, background: C.accent, border: "none", color: "#fff", cursor: isSaving ? "not-allowed" : "pointer", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, opacity: isSaving ? 0.6 : 1 }}>
        {isSaving ? <Loader2 size={10} /> : <Save size={10} />}
        {isSaving ? "Saving..." : "Save Project"}
      </button>
    </div>
  );
}

export default ControlsPanel;;
