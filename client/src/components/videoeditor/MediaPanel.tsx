import React, { useState, useRef } from "react";
import { Upload, Film, Music, Type, Plus, Trash2, FolderOpen } from "lucide-react";

interface MediaPanelProps {
  projectId?: string | null;
  onAddClip?: (clip: any) => void;
}

const C = { bg: "#0a0a0a", surface: "#111111", border: "#222222", accent: "#e63946", text: "#f0f0f0", muted: "#888888" };

export function MediaPanel({ projectId, onAddClip }: MediaPanelProps) {
  const [tab, setTab] = useState<"video" | "audio" | "text">("video");
  const [mediaItems, setMediaItems] = useState<Array<{ id: string; name: string; url: string; type: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      setMediaItems(prev => [...prev, { id: Math.random().toString(36).slice(2), name: file.name, url, type: file.type }]);
    });
    if (e.target) e.target.value = "";
  };

  const TABS = [{ id: "video", label: "Video", icon: Film }, { id: "audio", label: "Audio", icon: Music }, { id: "text", label: "Text", icon: Type }] as const;

  return (
    <div style={{ background: C.surface, height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 12px 0", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>Media Library</div>
        <div style={{ display: "flex", gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              style={{ flex: 1, padding: "5px 4px", fontSize: 10, fontWeight: 600, borderRadius: "6px 6px 0 0",
                background: tab === t.id ? C.bg : "transparent", color: tab === t.id ? C.accent : C.muted,
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
              <t.icon size={10} />{t.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: "8px 10px" }}>
        <input ref={fileInputRef} type="file" multiple accept={tab === "video" ? "video/*" : tab === "audio" ? "audio/*" : "*"}
          style={{ display: "none" }} onChange={handleFileSelect} />
        <button onClick={() => fileInputRef.current?.click()}
          style={{ width: "100%", padding: "7px", borderRadius: 8, border: `1px dashed ${C.border}`,
            background: "transparent", color: C.muted, cursor: "pointer", fontSize: 10, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <Upload size={11} /> Upload {tab === "video" ? "Video" : tab === "audio" ? "Audio" : "Asset"}
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 10px" }}>
        {mediaItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 8px", color: C.muted }}>
            <FolderOpen size={24} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
            <div style={{ fontSize: 10 }}>No media yet. Upload files to add to timeline.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {mediaItems.map(item => (
              <div key={item.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 8px", display: "flex", alignItems: "center", gap: 6 }}>
                <Film size={12} color={C.accent} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                </div>
                <button onClick={() => onAddClip?.({ assetUrl: item.url, name: item.name, src: item.url })}
                  style={{ padding: "3px 6px", borderRadius: 5, background: C.accent, border: "none", color: "#fff", cursor: "pointer", fontSize: 9, fontWeight: 700 }}>
                  <Plus size={9} />
                </button>
                <button onClick={() => setMediaItems(prev => prev.filter(m => m.id !== item.id))}
                  style={{ padding: 3, borderRadius: 5, background: "transparent", border: "none", color: C.muted, cursor: "pointer" }}>
                  <Trash2 size={9} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MediaPanel;
