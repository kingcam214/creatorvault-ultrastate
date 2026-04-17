import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Check, Image as ImageIcon, Loader2, Video } from "lucide-react";

type MediaFilter = "all" | "videos" | "images";
type SelectionMode = "single" | "multi";

export interface MediaAssetItem {
  id: string;
  assetType?: string | null;
  mimeType?: string | null;
  fileName: string;
  thumbnailUrl?: string | null;
  publicUrl?: string | null;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  createdAt?: string | null;
}

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selected: MediaAssetItem[]) => void;
  mode?: SelectionMode;
  initialSelectedIds?: string[];
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  maxSelect?: number;
}

const token = {
  bg: "#0a0a0a",
  surface: "#141414",
  border: "#2a2a2a",
  text: "#f5f0e8",
  muted: "#9b9487",
  gold: "#c9a84c",
};

export default function MediaPicker({
  open,
  onClose,
  onConfirm,
  mode = "multi",
  initialSelectedIds,
  title = "Select Media",
  subtitle = "Choose clips and images for your scenes",
  confirmLabel = "Use Selected Media",
  maxSelect,
}: MediaPickerProps) {
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds ?? []);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const mediaQuery = trpc.mediaAssets.list.useQuery(
    { filter, limit: 120 },
    { enabled: open }
  );

  useEffect(() => {
    if (open) {
      setSelectedIds(initialSelectedIds ?? []);
      setHoveredId(null);
    }
  }, [open, initialSelectedIds]);

  const assets = (mediaQuery.data ?? []) as MediaAssetItem[];

  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedIds.includes(asset.id)),
    [assets, selectedIds]
  );

  const previewAsset = useMemo(() => {
    if (hoveredId) {
      return assets.find((asset) => asset.id === hoveredId) ?? null;
    }
    if (selectedIds.length > 0) {
      return assets.find((asset) => asset.id === selectedIds[selectedIds.length - 1]) ?? null;
    }
    return assets[0] ?? null;
  }, [assets, hoveredId, selectedIds]);

  const toggleSelect = (assetId: string) => {
    if (mode === "single") {
      setSelectedIds([assetId]);
      return;
    }

    setSelectedIds((prev) => {
      if (prev.includes(assetId)) {
        return prev.filter((id) => id !== assetId);
      }
      if (maxSelect && prev.length >= maxSelect) {
        return prev;
      }
      return [...prev, assetId];
    });
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "mediaPickerFade 0.3s ease",
      }}
    >
      <style>{`
        @keyframes mediaPickerFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mediaPickerScale { from { opacity: 0; transform: scale(0.96);} to { opacity: 1; transform: scale(1);} }
      `}</style>

      <div
        style={{
          width: "min(1160px, 100%)",
          maxHeight: "88vh",
          overflow: "hidden",
          borderRadius: 14,
          border: `1px solid ${token.border}`,
          background: token.bg,
          color: token.text,
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
          animation: "mediaPickerScale 0.3s ease",
          display: "grid",
          gridTemplateRows: "auto auto 1fr auto",
        }}
      >
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${token.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 20 }}>{title}</h3>
              <p style={{ margin: "6px 0 0", color: token.muted, fontSize: 13 }}>{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              style={{
                border: `1px solid ${token.border}`,
                background: token.surface,
                color: token.text,
                borderRadius: 8,
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>

        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${token.border}`, display: "flex", gap: 8 }}>
          {([
            ["all", "All"],
            ["videos", "Videos"],
            ["images", "Images"],
          ] as Array<[MediaFilter, string]>).map(([value, label]) => {
            const active = filter === value;
            return (
              <button
                key={value}
                onClick={() => setFilter(value)}
                style={{
                  borderRadius: 999,
                  border: `1px solid ${active ? token.gold : token.border}`,
                  background: active ? "rgba(201,168,76,0.16)" : token.surface,
                  color: active ? token.gold : token.text,
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", minHeight: 0 }}>
          <div style={{ padding: 18, overflow: "auto" }}>
            {mediaQuery.isLoading ? (
              <div style={{ display: "grid", placeItems: "center", minHeight: 260, color: token.muted }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Loader2 size={18} className="animate-spin" />
                  Loading media library...
                </div>
              </div>
            ) : assets.length === 0 ? (
              <div style={{ display: "grid", placeItems: "center", minHeight: 260, color: token.muted }}>
                No media found for this filter.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
                {assets.map((asset) => {
                  const selected = selectedIds.includes(asset.id);
                  const url = asset.thumbnailUrl ?? asset.publicUrl ?? "";
                  const isVideo = (asset.assetType ?? "").toLowerCase() === "video" || (asset.mimeType ?? "").startsWith("video/");

                  return (
                    <button
                      key={asset.id}
                      onClick={() => toggleSelect(asset.id)}
                      onMouseEnter={() => setHoveredId(asset.id)}
                      style={{
                        textAlign: "left",
                        borderRadius: 12,
                        border: `1px solid ${selected ? token.gold : token.border}`,
                        background: token.surface,
                        overflow: "hidden",
                        cursor: "pointer",
                        position: "relative",
                        boxShadow: selected ? "0 0 0 1px rgba(201,168,76,0.35)" : "none",
                      }}
                    >
                      <div style={{ height: 110, background: "#090909", position: "relative" }}>
                        {url ? (
                          <img src={url} alt={asset.fileName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: token.muted }}>
                            {isVideo ? <Video size={22} /> : <ImageIcon size={22} />}
                          </div>
                        )}

                        {selected && (
                          <div
                            style={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: token.gold,
                              color: "#151515",
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            <Check size={14} />
                          </div>
                        )}
                      </div>
                      <div style={{ padding: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {asset.fileName}
                        </div>
                        <div style={{ marginTop: 5, color: token.muted, fontSize: 11 }}>
                          {isVideo ? "Video" : "Image"}
                          {asset.duration ? ` • ${asset.duration}s` : ""}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ borderLeft: `1px solid ${token.border}`, padding: 16, background: "#0d0d0d" }}>
            <div style={{ fontSize: 12, color: token.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              Preview
            </div>
            {previewAsset ? (
              <>
                <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${token.border}`, background: token.surface }}>
                  {(previewAsset.thumbnailUrl ?? previewAsset.publicUrl) ? (
                    <img
                      src={previewAsset.thumbnailUrl ?? previewAsset.publicUrl ?? ""}
                      alt={previewAsset.fileName}
                      style={{ width: "100%", height: 180, objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: 180, display: "grid", placeItems: "center", color: token.muted }}>
                      <ImageIcon size={28} />
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 10, fontWeight: 600, fontSize: 13 }}>{previewAsset.fileName}</div>
                <div style={{ marginTop: 4, color: token.muted, fontSize: 12 }}>
                  {previewAsset.mimeType ?? "Unknown type"}
                </div>
              </>
            ) : (
              <div style={{ color: token.muted, fontSize: 13 }}>Hover or select an asset to preview.</div>
            )}

            <div style={{ marginTop: 16, fontSize: 12, color: token.muted }}>
              Selected: <span style={{ color: token.gold, fontWeight: 700 }}>{selectedIds.length}</span>
              {maxSelect ? ` / ${maxSelect}` : ""}
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 20px", borderTop: `1px solid ${token.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              borderRadius: 8,
              border: `1px solid ${token.border}`,
              background: token.surface,
              color: token.text,
              padding: "10px 14px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedAssets)}
            disabled={selectedAssets.length === 0}
            style={{
              borderRadius: 8,
              border: `1px solid ${token.gold}`,
              background: selectedAssets.length === 0 ? "#4c4230" : token.gold,
              color: "#161616",
              fontWeight: 700,
              padding: "10px 16px",
              cursor: selectedAssets.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
