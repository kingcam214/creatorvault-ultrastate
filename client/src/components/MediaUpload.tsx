/**
 * MediaUpload — Universal tap-to-upload component
 * Replaces ALL URL input fields across the platform.
 * No URLs. No pasting. Just tap and upload.
 */
import { useState, useRef, useCallback, ChangeEvent } from "react";
import { Upload, X, Check, Loader2, Image, Video, Music, File } from "lucide-react";

interface MediaUploadProps {
  value?: string;                          // current uploaded URL (internal, never shown to user)
  onChange: (url: string | null) => void;  // called with the uploaded URL
  accept?: string;                         // file types: "video/*", "image/*", "audio/*", etc.
  label?: string;                          // e.g. "Upload your video", "Add a photo"
  sublabel?: string;                       // e.g. "MP4, MOV, or any video format"
  compact?: boolean;                       // smaller version for inline use
  style?: React.CSSProperties;
}

const GOLD = "#F2B15B", GOLD_DIM = "rgba(242,177,91,0.10)", GOLD_BORDER = "rgba(242,177,91,0.3)";
const BORDER = "rgba(255,255,255,0.08)", MUTED = "rgba(255,255,255,0.45)", GREEN = "#00E676";

function getIcon(accept?: string) {
  if (!accept) return <File size={28} color={GOLD} />;
  if (accept.includes("video")) return <Video size={28} color={GOLD} />;
  if (accept.includes("image")) return <Image size={28} color={GOLD} />;
  if (accept.includes("audio")) return <Music size={28} color={GOLD} />;
  return <Upload size={28} color={GOLD} />;
}

function getDefaultLabel(accept?: string) {
  if (!accept) return "Upload file";
  if (accept.includes("video")) return "Upload your video";
  if (accept.includes("image")) return "Upload a photo";
  if (accept.includes("audio")) return "Upload audio";
  return "Upload file";
}

export function MediaUpload({ value, onChange, accept = "video/*,image/*", label, sublabel, compact = false, style }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    setUploading(true); setPct(0); setError(null); setFileName(file.name);
    try {
      const fd = new FormData(); fd.append("file", file);
      const xhr = new XMLHttpRequest();
      const url = await new Promise<string>((resolve, reject) => {
        xhr.upload.onprogress = e => { if (e.lengthComputable) setPct(Math.round(e.loaded / e.total * 100)); };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText).url); }
            catch { reject(new Error("Upload failed — try again")); }
          } else { reject(new Error(`Upload failed (${xhr.status})`)); }
        };
        xhr.onerror = () => reject(new Error("Connection error — check your signal"));
        xhr.open("POST", "/api/video/upload/direct");
        xhr.withCredentials = true;
        xhr.send(fd);
      });
      onChange(url);
    } catch (e: any) {
      setError(e?.message || "Upload failed");
      setFileName(null);
      onChange(null);
    } finally { setUploading(false); }
  }, [onChange]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setFileName(null);
    setError(null);
  };

  const displayLabel = label || getDefaultLabel(accept);

  // Compact version (inline, smaller)
  if (compact) {
    return (
      <div style={{ ...style }}>
        <input ref={ref} type="file" accept={accept} style={{ display: "none" }} onChange={handleChange} />
        {value ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,230,118,0.08)", border: `1px solid rgba(0,230,118,0.3)`, borderRadius: 10, padding: "10px 14px" }}>
            <Check size={16} color={GREEN} />
            <span style={{ fontSize: 13, color: GREEN, fontWeight: 700, flex: 1 }}>{fileName || "File uploaded"}</span>
            <button onClick={clear} style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer", padding: 2 }}><X size={14} /></button>
          </div>
        ) : uploading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, borderRadius: 10, padding: "10px 14px" }}>
            <Loader2 size={16} color={GOLD} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13, color: GOLD, fontWeight: 700 }}>Uploading... {pct}%</span>
            <div style={{ flex: 1, height: 4, background: "rgba(242,177,91,0.2)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: GOLD, transition: "width 0.3s" }} />
            </div>
          </div>
        ) : (
          <button onClick={() => ref.current?.click()} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", color: GOLD, fontSize: 13, fontWeight: 700 }}>
            <Upload size={16} /> {displayLabel}
          </button>
        )}
        {error && <p style={{ fontSize: 11, color: "#FF4444", margin: "4px 0 0" }}>{error}</p>}
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // Full version (large drop zone)
  return (
    <div style={{ ...style }}>
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }} onChange={handleChange} />
      {value ? (
        <div style={{ background: "rgba(0,230,118,0.06)", border: `1px solid rgba(0,230,118,0.25)`, borderRadius: 14, padding: "20px", textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,230,118,0.12)", border: `2px solid rgba(0,230,118,0.4)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
            <Check size={22} color={GREEN} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 800, color: GREEN, margin: "0 0 4px" }}>{fileName || "File uploaded"}</p>
          <p style={{ fontSize: 12, color: MUTED, margin: "0 0 12px" }}>Ready to use</p>
          <button onClick={clear} style={{ fontSize: 12, color: MUTED, background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>Change file</button>
        </div>
      ) : uploading ? (
        <div style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, borderRadius: 14, padding: "24px", textAlign: "center" }}>
          <Loader2 size={32} color={GOLD} style={{ animation: "spin 1s linear infinite", marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 800, color: GOLD, margin: "0 0 12px" }}>Uploading... {pct}%</p>
          <div style={{ maxWidth: 240, margin: "0 auto", height: 6, background: "rgba(242,177,91,0.2)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: GOLD, transition: "width 0.3s" }} />
          </div>
          {fileName && <p style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>{fileName}</p>}
        </div>
      ) : (
        <button onClick={() => ref.current?.click()} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", minHeight: 120, background: GOLD_DIM, border: `2px dashed ${GOLD_BORDER}`, borderRadius: 14, cursor: "pointer", padding: "20px" }}>
          {getIcon(accept)}
          <p style={{ fontSize: 15, fontWeight: 800, color: GOLD, margin: 0 }}>{displayLabel}</p>
          {sublabel && <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>{sublabel}</p>}
          {error && <p style={{ fontSize: 12, color: "#FF4444", margin: 0 }}>{error}</p>}
        </button>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
