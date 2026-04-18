import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

/* ═══════════════════════════════════════════════════════════
   MediaPicker — Cinematic Gallery  (Pollo AI / OpenArt AI benchmark)
   ═══════════════════════════════════════════════════════════
   • Full-viewport overlay with frosted-glass backdrop
   • Masonry-style visual grid — NO forms, NO checkboxes
   • Video hover-preview, gold glow selection, skeleton loading
   • Dark canvas: #0a0a0a / #c9a84c / #f5f0e8
   ═══════════════════════════════════════════════════════════ */

type MediaFilter = "all" | "videos" | "images";
type SelectionMode = "single" | "multi";

export interface MediaAssetItem {
  id: string;
  assetType?: string | null;
  mimeType?: string | null;
  fileName: string;
  originalName?: string | null;
  thumbnailUrl?: string | null;
  publicUrl?: string | null;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
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

/* ── design tokens ── */
const T = {
  bg: "#0a0a0a",
  surface: "#111111",
  surfaceHover: "#181818",
  card: "#0e0e0e",
  border: "#1f1f1f",
  borderLight: "#2a2a2a",
  text: "#f5f0e8",
  textSecondary: "#b8b0a4",
  muted: "#736e64",
  gold: "#c9a84c",
  goldDim: "rgba(201,168,76,0.12)",
  goldGlow: "rgba(201,168,76,0.35)",
  goldBright: "#e0c165",
  success: "#5bd48f",
  overlay: "rgba(0,0,0,0.82)",
};

/* ── utility ── */
function isVideo(a: MediaAssetItem) {
  return (a.assetType ?? "").toLowerCase() === "video" || (a.mimeType ?? "").startsWith("video/");
}
function formatDuration(s: number | null | undefined) {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
function formatSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes > 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

/* ═══ COMPONENT ═══ */
export default function MediaPicker({
  open,
  onClose,
  onConfirm,
  mode = "multi",
  initialSelectedIds,
  title = "Media Library",
  subtitle,
  confirmLabel = "Use Selected",
  maxSelect,
}: MediaPickerProps) {
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds ?? []);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const mediaQuery = trpc.mediaAssets.list.useQuery(
    { filter, limit: 120 },
    { enabled: open, staleTime: 30_000 }
  );

  useEffect(() => {
    if (open) {
      setSelectedIds(initialSelectedIds ?? []);
      setHoveredId(null);
    }
  }, [open, initialSelectedIds]);

  /* lock body scroll */
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const assets = (mediaQuery.data ?? []) as MediaAssetItem[];
  const selectedAssets = useMemo(
    () => assets.filter((a) => selectedIds.includes(a.id)),
    [assets, selectedIds]
  );
  const previewAsset = useMemo(() => {
    if (hoveredId) return assets.find((a) => a.id === hoveredId) ?? null;
    if (selectedIds.length) return assets.find((a) => a.id === selectedIds[selectedIds.length - 1]) ?? null;
    return null;
  }, [assets, hoveredId, selectedIds]);

  const toggleSelect = (id: string) => {
    if (mode === "single") { setSelectedIds([id]); return; }
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (maxSelect && prev.length >= maxSelect) return prev;
      return [...prev, id];
    });
  };

  if (!open) return null;

  const filterBtns: [MediaFilter, string, string][] = [
    ["all", "All Media", "⬡"],
    ["videos", "Videos", "▶"],
    ["images", "Images", "◻"],
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: T.overlay,
      backdropFilter: "blur(24px) saturate(1.4)",
      WebkitBackdropFilter: "blur(24px) saturate(1.4)",
      display: "flex", flexDirection: "column",
      animation: "mpFadeIn .28s ease",
    }}>
      <style>{`
        @keyframes mpFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes mpSlideUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
        @keyframes mpPulse { 0%,100% { opacity:.18 } 50% { opacity:.32 } }
        @keyframes mpGoldPing { 0% { box-shadow:0 0 0 0 rgba(201,168,76,.45) } 70% { box-shadow:0 0 0 10px rgba(201,168,76,0) } 100% { box-shadow:0 0 0 0 rgba(201,168,76,0) } }
        .mp-tile { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .mp-tile:hover { transform: scale(1.03); z-index: 2; }
        .mp-filter-btn { transition: all .15s ease; }
        .mp-filter-btn:hover { background: ${T.surfaceHover} !important; }
        .mp-grid::-webkit-scrollbar { width: 6px; }
        .mp-grid::-webkit-scrollbar-track { background: transparent; }
        .mp-grid::-webkit-scrollbar-thumb { background: ${T.borderLight}; border-radius: 3px; }
        .mp-video-preview { object-fit: cover; width:100%; height:100%; }
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 24px",
        borderBottom: `1px solid ${T.border}`,
        background: "rgba(10,10,10,0.92)",
        backdropFilter: "blur(12px)",
        animation: "mpSlideUp .3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `linear-gradient(135deg, ${T.gold}, #a8872f)`,
            display: "grid", placeItems: "center",
            fontSize: 18, fontWeight: 900, color: "#0a0a0a",
          }}>◈</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: "-0.02em" }}>{title}</h2>
            {subtitle && <p style={{ margin: "3px 0 0", fontSize: 13, color: T.muted }}>{subtitle}</p>}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* filter pills */}
          <div style={{ display: "flex", gap: 4, background: T.surface, borderRadius: 10, padding: 3, border: `1px solid ${T.border}` }}>
            {filterBtns.map(([val, label, icon]) => {
              const active = filter === val;
              return (
                <button key={val} className="mp-filter-btn" onClick={() => setFilter(val)} style={{
                  border: "none", borderRadius: 8,
                  background: active ? T.goldDim : "transparent",
                  color: active ? T.gold : T.muted,
                  padding: "7px 14px", cursor: "pointer",
                  fontSize: 12, fontWeight: 600, letterSpacing: "0.03em",
                  display: "flex", alignItems: "center", gap: 5,
                }}><span style={{ fontSize: 10 }}>{icon}</span> {label}</button>
              );
            })}
          </div>

          {/* selection count badge */}
          <div style={{
            background: selectedIds.length > 0 ? T.goldDim : T.surface,
            border: `1px solid ${selectedIds.length > 0 ? T.gold : T.border}`,
            borderRadius: 20, padding: "6px 14px",
            fontSize: 12, fontWeight: 700,
            color: selectedIds.length > 0 ? T.gold : T.muted,
          }}>
            {selectedIds.length} selected{maxSelect ? ` / ${maxSelect}` : ""}
          </div>

          {/* close */}
          <button onClick={onClose} style={{
            border: `1px solid ${T.border}`, background: T.surface,
            color: T.muted, borderRadius: 8, padding: "7px 12px",
            cursor: "pointer", fontSize: 18, lineHeight: 1,
          }}>✕</button>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: previewAsset ? "1fr 320px" : "1fr", minHeight: 0 }}>

        {/* ── GRID ── */}
        <div ref={gridRef} className="mp-grid" style={{
          padding: 20, overflowY: "auto", overflowX: "hidden",
          animation: "mpSlideUp .35s ease .05s both",
        }}>
          {mediaQuery.isLoading ? (
            /* skeleton grid */
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{
                  borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`,
                  overflow: "hidden", animation: "mpPulse 1.8s ease infinite",
                  animationDelay: `${i * 0.08}s`,
                }}>
                  <div style={{ height: 160, background: "#131313" }} />
                  <div style={{ padding: 12 }}>
                    <div style={{ height: 10, borderRadius: 4, background: "#1a1a1a", width: "70%", marginBottom: 8 }} />
                    <div style={{ height: 8, borderRadius: 4, background: "#151515", width: "40%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : assets.length === 0 ? (
            /* empty state — cinematic */
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              minHeight: 400, textAlign: "center", gap: 16,
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: 20,
                background: `linear-gradient(135deg, ${T.goldDim}, transparent)`,
                border: `1px solid ${T.gold}33`,
                display: "grid", placeItems: "center", fontSize: 36,
              }}>🎬</div>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.text }}>
                Your media vault is empty
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: T.muted, maxWidth: 380, lineHeight: 1.6 }}>
                Upload your first video or image to start building cinematic trailers.
                Your content library will appear here as a visual gallery.
              </p>
              <div style={{
                marginTop: 8, padding: "10px 20px", borderRadius: 10,
                border: `1px solid ${T.gold}`, color: T.gold,
                fontSize: 13, fontWeight: 600, letterSpacing: "0.04em",
              }}>
                Go to Media Vault to upload →
              </div>
            </div>
          ) : (
            /* ── visual gallery grid ── */
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
              gap: 14,
            }}>
              {assets.map((asset, idx) => {
                const sel = selectedIds.includes(asset.id);
                const vid = isVideo(asset);
                const url = asset.thumbnailUrl ?? asset.publicUrl ?? "";
                return (
                  <button
                    key={asset.id}
                    className="mp-tile"
                    onClick={() => toggleSelect(asset.id)}
                    onMouseEnter={() => setHoveredId(asset.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      all: "unset", cursor: "pointer", boxSizing: "border-box",
                      borderRadius: 14,
                      border: sel ? `2px solid ${T.gold}` : `1px solid ${T.border}`,
                      background: T.card,
                      overflow: "hidden",
                      position: "relative",
                      boxShadow: sel
                        ? `0 0 20px ${T.goldGlow}, inset 0 0 0 1px ${T.gold}`
                        : "0 2px 12px rgba(0,0,0,0.3)",
                      animation: `mpSlideUp .35s ease ${0.02 * Math.min(idx, 20)}s both`,
                    }}
                  >
                    {/* thumbnail area */}
                    <div style={{
                      position: "relative", height: 170,
                      background: "#080808",
                      overflow: "hidden",
                    }}>
                      {url ? (
                        vid && hoveredId === asset.id && asset.publicUrl ? (
                          <video
                            className="mp-video-preview"
                            src={asset.publicUrl}
                            autoPlay muted loop playsInline
                            style={{ objectFit: "cover", width: "100%", height: "100%" }}
                          />
                        ) : (
                          <img
                            src={url}
                            alt=""
                            loading="lazy"
                            style={{
                              width: "100%", height: "100%", objectFit: "cover",
                              transition: "transform .3s ease",
                              transform: hoveredId === asset.id ? "scale(1.06)" : "scale(1)",
                            }}
                          />
                        )
                      ) : (
                        <div style={{
                          width: "100%", height: "100%",
                          display: "grid", placeItems: "center",
                          background: "linear-gradient(135deg, #0e0e0e, #161616)",
                          color: T.muted, fontSize: 32,
                        }}>
                          {vid ? "▶" : "◻"}
                        </div>
                      )}

                      {/* type badge */}
                      <div style={{
                        position: "absolute", top: 10, left: 10,
                        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
                        borderRadius: 6, padding: "3px 8px",
                        fontSize: 10, fontWeight: 700, color: T.textSecondary,
                        letterSpacing: "0.06em", textTransform: "uppercase",
                      }}>
                        {vid ? "VIDEO" : "IMAGE"}
                      </div>

                      {/* duration badge (videos) */}
                      {vid && asset.duration && (
                        <div style={{
                          position: "absolute", bottom: 10, right: 10,
                          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
                          borderRadius: 6, padding: "3px 8px",
                          fontSize: 11, fontWeight: 600, color: T.text,
                          fontVariantNumeric: "tabular-nums",
                        }}>
                          {formatDuration(asset.duration)}
                        </div>
                      )}

                      {/* selection indicator — gold ring with check */}
                      <div style={{
                        position: "absolute", top: 10, right: 10,
                        width: 26, height: 26, borderRadius: "50%",
                        border: sel ? `2px solid ${T.gold}` : `2px solid rgba(255,255,255,0.25)`,
                        background: sel ? T.gold : "rgba(0,0,0,0.4)",
                        backdropFilter: "blur(4px)",
                        display: "grid", placeItems: "center",
                        transition: "all .15s ease",
                        animation: sel ? "mpGoldPing .5s ease" : "none",
                      }}>
                        {sel && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>

                      {/* hover overlay */}
                      {hoveredId === asset.id && !sel && (
                        <div style={{
                          position: "absolute", inset: 0,
                          background: "rgba(201,168,76,0.06)",
                          transition: "opacity .15s ease",
                        }} />
                      )}
                    </div>

                    {/* info strip */}
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{
                        fontSize: 12, fontWeight: 600, color: T.text,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {asset.originalName ?? asset.fileName}
                      </div>
                      <div style={{
                        marginTop: 4, fontSize: 11, color: T.muted,
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        {asset.width && asset.height && <span>{asset.width}×{asset.height}</span>}
                        {asset.fileSize && <span>{formatSize(asset.fileSize)}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── PREVIEW SIDEBAR ── */}
        {previewAsset && (
          <div style={{
            borderLeft: `1px solid ${T.border}`,
            background: "rgba(10,10,10,0.95)",
            backdropFilter: "blur(12px)",
            padding: 20, overflowY: "auto",
            display: "flex", flexDirection: "column", gap: 16,
            animation: "mpSlideUp .3s ease .1s both",
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: T.muted,
              textTransform: "uppercase", letterSpacing: "0.12em",
            }}>Preview</div>

            {/* preview media */}
            <div style={{
              borderRadius: 12, overflow: "hidden",
              border: `1px solid ${T.border}`, background: "#080808",
              aspectRatio: "16/9",
            }}>
              {isVideo(previewAsset) && previewAsset.publicUrl ? (
                <video
                  key={previewAsset.id}
                  src={previewAsset.publicUrl}
                  autoPlay muted loop playsInline controls
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (previewAsset.thumbnailUrl ?? previewAsset.publicUrl) ? (
                <img
                  src={previewAsset.thumbnailUrl ?? previewAsset.publicUrl ?? ""}
                  alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{
                  width: "100%", height: "100%",
                  display: "grid", placeItems: "center",
                  color: T.muted, fontSize: 28,
                }}>◻</div>
              )}
            </div>

            {/* metadata */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>
                {previewAsset.originalName ?? previewAsset.fileName}
              </div>
              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                {[
                  ["Type", isVideo(previewAsset) ? "Video" : "Image"],
                  previewAsset.duration ? ["Duration", formatDuration(previewAsset.duration)] : null,
                  previewAsset.width && previewAsset.height ? ["Resolution", `${previewAsset.width}×${previewAsset.height}`] : null,
                  previewAsset.fileSize ? ["Size", formatSize(previewAsset.fileSize)] : null,
                  previewAsset.mimeType ? ["Format", previewAsset.mimeType] : null,
                ].filter(Boolean).map(([label, value], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: T.muted }}>{label}</span>
                    <span style={{ color: T.textSecondary, fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* select/deselect button */}
            {previewAsset && (
              <button
                onClick={() => toggleSelect(previewAsset.id)}
                style={{
                  border: selectedIds.includes(previewAsset.id) ? `1px solid ${T.border}` : `1px solid ${T.gold}`,
                  background: selectedIds.includes(previewAsset.id) ? T.surface : T.goldDim,
                  color: selectedIds.includes(previewAsset.id) ? T.muted : T.gold,
                  borderRadius: 10, padding: "10px 0",
                  cursor: "pointer", fontWeight: 700, fontSize: 13,
                  transition: "all .15s ease",
                }}
              >
                {selectedIds.includes(previewAsset.id) ? "Deselect" : "Select This Asset"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── BOTTOM ACTION BAR ── */}
      <div style={{
        padding: "14px 24px",
        borderTop: `1px solid ${T.border}`,
        background: "rgba(10,10,10,0.95)",
        backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* selected thumbnails strip */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden", flex: 1 }}>
          {selectedAssets.length > 0 ? (
            <>
              <span style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap", marginRight: 4 }}>
                Selected:
              </span>
              {selectedAssets.slice(0, 8).map((a) => (
                <div key={a.id} style={{
                  width: 36, height: 36, borderRadius: 8, overflow: "hidden",
                  border: `1.5px solid ${T.gold}`, flexShrink: 0,
                }}>
                  {(a.thumbnailUrl ?? a.publicUrl) ? (
                    <img src={a.thumbnailUrl ?? a.publicUrl ?? ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: T.surface, display: "grid", placeItems: "center", fontSize: 10, color: T.muted }}>
                      {isVideo(a) ? "▶" : "◻"}
                    </div>
                  )}
                </div>
              ))}
              {selectedAssets.length > 8 && (
                <span style={{ fontSize: 11, color: T.muted }}>+{selectedAssets.length - 8} more</span>
              )}
            </>
          ) : (
            <span style={{ fontSize: 12, color: T.muted }}>Click assets above to select them</span>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginLeft: 16 }}>
          <button onClick={onClose} style={{
            border: `1px solid ${T.border}`, background: T.surface,
            color: T.textSecondary, borderRadius: 10, padding: "10px 18px",
            cursor: "pointer", fontWeight: 600, fontSize: 13,
          }}>Cancel</button>
          <button
            onClick={() => { if (selectedAssets.length > 0) onConfirm(selectedAssets); }}
            disabled={selectedAssets.length === 0}
            style={{
              border: "none", borderRadius: 10, padding: "10px 24px",
              background: selectedAssets.length === 0
                ? "#2a2520"
                : `linear-gradient(135deg, ${T.gold}, #a8872f)`,
              color: selectedAssets.length === 0 ? T.muted : "#0a0a0a",
              fontWeight: 800, fontSize: 13,
              cursor: selectedAssets.length === 0 ? "not-allowed" : "pointer",
              letterSpacing: "0.02em",
              boxShadow: selectedAssets.length > 0 ? `0 4px 20px ${T.goldGlow}` : "none",
              transition: "all .2s ease",
            }}
          >
            {confirmLabel} ({selectedAssets.length})
          </button>
        </div>
      </div>
    </div>
  );
}
