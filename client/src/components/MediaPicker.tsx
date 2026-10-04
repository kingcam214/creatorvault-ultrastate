import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

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
  status?: string | null;
  storagePath?: string | null;
  sourceType?: string | null;
  classification?: string | null;
  bodyCinemaEligible?: boolean | null;
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
  emptyActionHref?: string;
  emptyActionLabel?: string;
  assetEligibility?: (asset: MediaAssetItem) => boolean;
}

const T = {
  void: "#0A0A0A",
  surface: "#1A1A1A",
  elevated: "#2A2A2A",
  border: "rgba(255,255,255,0.08)",
  borderMedium: "rgba(255,255,255,0.15)",
  text: "#FFFFFF",
  secondary: "rgba(255,255,255,0.6)",
  muted: "rgba(255,255,255,0.3)",
  accent: "#00D9FF",
  accentDim: "rgba(0,217,255,0.15)",
  accentBorder: "rgba(0,217,255,0.3)",
  overlay: "rgba(0,0,0,0.82)",
};

function isVideo(asset: MediaAssetItem) {
  return (
    (asset.assetType ?? "").toLowerCase() === "video" ||
    (asset.mimeType ?? "").startsWith("video/")
  );
}

function isReadySource(asset: MediaAssetItem) {
  const sourceUrl = String(asset.publicUrl || asset.storagePath || "").trim();
  const isCreatorVaultHosted =
    /^(?:https:\/\/creatorvault\.live\/(?:uploads|videos)\/|\/(?:uploads|videos)\/)/i.test(
      sourceUrl
    );
  const video = isVideo(asset);
  const audio =
    (asset.assetType ?? "").toLowerCase() === "audio" ||
    (asset.mimeType ?? "").startsWith("audio/");
  const hasVideoFacts =
    !video ||
    (Number(asset.duration || 0) > 0 &&
      Number(asset.width || 0) > 0 &&
      Number(asset.height || 0) > 0);
  const hasAudioFacts = !audio || Number(asset.duration || 0) > 0;
  const hasImageFacts =
    video ||
    audio ||
    (Number(asset.width || 0) > 0 && Number(asset.height || 0) > 0);
  return (
    String(asset.status || "ready").toLowerCase() === "ready" &&
    isCreatorVaultHosted &&
    hasVideoFacts &&
    hasAudioFacts &&
    hasImageFacts
  );
}

function videoPoster(asset: MediaAssetItem) {
  const candidate = asset.thumbnailUrl ?? "";
  return /\.(avif|gif|jpe?g|png|webp)(?:$|[?#])/i.test(candidate)
    ? candidate
    : undefined;
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return "";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function formatSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes > 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

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
  emptyActionHref,
  emptyActionLabel = "Open Media Vault",
  assetEligibility,
}: MediaPickerProps) {
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialSelectedIds ?? []
  );
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

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const assets = ((mediaQuery.data ?? []) as MediaAssetItem[]).filter(
    asset =>
      isReadySource(asset) &&
      (assetEligibility ? assetEligibility(asset) : true)
  );
  const selectedAssets = useMemo(
    () => assets.filter(asset => selectedIds.includes(asset.id)),
    [assets, selectedIds]
  );
  const previewAsset = useMemo(() => {
    if (hoveredId) return assets.find(asset => asset.id === hoveredId) ?? null;
    if (selectedIds.length) {
      return (
        assets.find(
          asset => asset.id === selectedIds[selectedIds.length - 1]
        ) ?? null
      );
    }
    return null;
  }, [assets, hoveredId, selectedIds]);

  const toggleSelect = (id: string) => {
    if (mode === "single") {
      setSelectedIds([id]);
      return;
    }
    setSelectedIds(previous => {
      if (previous.includes(id)) return previous.filter(value => value !== id);
      if (maxSelect && previous.length >= maxSelect) return previous;
      return [...previous, id];
    });
  };

  if (!open) return null;

  const filters: Array<[MediaFilter, string, string]> = [
    ["all", "All media", "01"],
    ["videos", "Videos", "02"],
    ["images", "Images", "03"],
  ];

  return (
    <div
      className="cv-dna"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        flexDirection: "column",
        background: T.overlay,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <style>{`
        @keyframes mediaPickerEnter { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .cv-media-picker__shell { animation: mediaPickerEnter .35s ease both; }
        .cv-media-picker__tile { transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease; }
        .cv-media-picker__tile:hover { transform: translateY(-3px); border-color: ${T.accentBorder} !important; }
        .cv-media-picker__scroll::-webkit-scrollbar { width: 5px; }
        .cv-media-picker__scroll::-webkit-scrollbar-thumb { background: ${T.elevated}; }
        @media (max-width: 760px) {
          .cv-media-picker__preview { display: none !important; }
          .cv-media-picker__topbar, .cv-media-picker__bottom { padding: 12px !important; gap: 10px !important; }
          .cv-media-picker__filter-label { display: none; }
          .cv-media-picker__selected-strip { display: none !important; }
        }
      `}</style>

      <header
        className="cv-media-picker__topbar cv-media-picker__shell"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "16px 24px",
          borderBottom: `1px solid ${T.border}`,
          background: T.void,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p className="cv-eyebrow" style={{ margin: 0, color: T.accent }}>
            Creator-owned source archive
          </p>
          <h2
            className="heading-xl"
            style={{ margin: "5px 0 0", fontSize: 30 }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className="body-md"
              style={{ margin: "5px 0 0", color: T.secondary }}
            >
              {subtitle}
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div
            aria-label={`${selectedIds.length} selected`}
            className="badge-text"
            style={{
              border: `1px solid ${selectedIds.length ? T.accentBorder : T.border}`,
              background: selectedIds.length ? T.accentDim : T.surface,
              color: selectedIds.length ? T.accent : T.muted,
              borderRadius: 2,
              padding: "8px 10px",
            }}
          >
            {selectedIds.length} SELECTED{maxSelect ? ` / ${maxSelect}` : ""}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cv-ghost"
            aria-label="Close media picker"
            style={{
              minHeight: 38,
              minWidth: 38,
              borderRadius: 2,
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>
      </header>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: "10px 24px",
          borderBottom: `1px solid ${T.border}`,
          background: T.surface,
        }}
      >
        {filters.map(([value, label, index]) => {
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={active ? "cv-cta-outline" : "cv-ghost"}
              aria-pressed={active}
              style={{ minHeight: 38, borderRadius: 2, padding: "8px 12px" }}
            >
              <span
                className="badge-text"
                style={{ color: active ? T.accent : T.muted }}
              >
                {index}
              </span>
              <span className="cv-media-picker__filter-label"> {label}</span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: previewAsset
            ? "minmax(0, 1fr) minmax(280px, 340px)"
            : "1fr",
          flex: 1,
          minHeight: 0,
          background: T.void,
        }}
      >
        <section
          ref={gridRef}
          className="cv-media-picker__scroll"
          aria-live="polite"
          style={{ padding: 20, overflowY: "auto" }}
        >
          {mediaQuery.isLoading ? (
            <div
              aria-label="Loading media library"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                gap: 12,
              }}
            >
              {Array.from({ length: 9 }).map((_, index) => (
                <div
                  key={index}
                  className="cv-panel cv-shimmer"
                  style={{ minHeight: 220, borderRadius: 8 }}
                />
              ))}
            </div>
          ) : mediaQuery.isError ? (
            <section
              className="cv-panel cv-state"
              role="alert"
              style={{
                maxWidth: 560,
                margin: "12vh auto",
                padding: 28,
                borderRadius: 8,
              }}
            >
              <p className="cv-eyebrow" style={{ color: "#FF3B3B" }}>
                Media library unavailable
              </p>
              <h3 className="heading-xl" style={{ margin: "8px 0" }}>
                The saved source list could not be read.
              </h3>
              <p className="body-md" style={{ margin: 0, color: T.secondary }}>
                No media is being substituted. Close this picker and retry when
                your source library is available.
              </p>
            </section>
          ) : assets.length === 0 ? (
            <section
              className="cv-panel cv-state"
              style={{
                maxWidth: 560,
                margin: "12vh auto",
                padding: 28,
                borderRadius: 8,
                textAlign: "left",
              }}
            >
              <p className="cv-eyebrow" style={{ color: T.accent }}>
                Source archive
              </p>
              <h3 className="heading-xl" style={{ margin: "8px 0" }}>
                No verified media is ready yet.
              </h3>
              <p className="body-md" style={{ margin: 0, color: T.secondary }}>
                This picker only offers readable creator-owned sources. It will
                not show unavailable or stale media as a usable input.
              </p>
              {emptyActionHref ? (
                <Link
                  href={emptyActionHref}
                  onClick={onClose}
                  className="cv-cta-outline"
                  style={{
                    display: "inline-flex",
                    marginTop: 20,
                    minHeight: 52,
                    alignItems: "center",
                    borderRadius: 2,
                  }}
                >
                  {emptyActionLabel} →
                </Link>
              ) : (
                <p
                  className="badge-text"
                  style={{ margin: "20px 0 0", color: T.muted }}
                >
                  RETURN WHEN A VERIFIED SOURCE IS READY
                </p>
              )}
            </section>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                gap: 12,
              }}
            >
              {assets.map(asset => {
                const selected = selectedIds.includes(asset.id);
                const video = isVideo(asset);
                const previewUrl = asset.thumbnailUrl ?? asset.publicUrl ?? "";
                return (
                  <button
                    key={asset.id}
                    type="button"
                    className="cv-media-picker__tile cv-panel"
                    onClick={() => toggleSelect(asset.id)}
                    onMouseEnter={() => setHoveredId(asset.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    aria-pressed={selected}
                    style={{
                      appearance: "none",
                      cursor: "pointer",
                      padding: 0,
                      overflow: "hidden",
                      borderRadius: 8,
                      textAlign: "left",
                      border: selected
                        ? `2px solid ${T.accent}`
                        : `1px solid ${T.border}`,
                      background: T.surface,
                      boxShadow: selected
                        ? "0 0 24px rgba(0,217,255,0.22)"
                        : "none",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        height: 168,
                        background: T.void,
                        overflow: "hidden",
                      }}
                    >
                      {video && asset.publicUrl ? (
                        <video
                          src={asset.publicUrl}
                          poster={videoPoster(asset)}
                          autoPlay={hoveredId === asset.id}
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            transform:
                              hoveredId === asset.id
                                ? "scale(1.035)"
                                : "scale(1)",
                            transition: "transform .25s ease",
                          }}
                        />
                      ) : previewUrl ? (
                        <img
                          src={previewUrl}
                          alt=""
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            transform:
                              hoveredId === asset.id
                                ? "scale(1.035)"
                                : "scale(1)",
                            transition: "transform .25s ease",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            placeItems: "center",
                            width: "100%",
                            height: "100%",
                            color: T.muted,
                            fontFamily: "Space Mono, monospace",
                            fontSize: 13,
                          }}
                        >
                          {video ? "VIDEO" : "IMAGE"}
                        </div>
                      )}
                      <span
                        className="badge-text"
                        style={{
                          position: "absolute",
                          top: 10,
                          left: 10,
                          border: `1px solid ${T.borderMedium}`,
                          background: "rgba(10,10,10,0.82)",
                          color: T.secondary,
                          padding: "4px 6px",
                          borderRadius: 2,
                        }}
                      >
                        {video ? "VIDEO" : "IMAGE"}
                      </span>
                      {video && asset.duration && (
                        <span
                          className="badge-text"
                          style={{
                            position: "absolute",
                            right: 10,
                            bottom: 10,
                            background: "rgba(10,10,10,0.82)",
                            color: T.text,
                            padding: "4px 6px",
                            borderRadius: 2,
                          }}
                        >
                          {formatDuration(asset.duration)}
                        </span>
                      )}
                      <span
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          width: 24,
                          height: 24,
                          display: "grid",
                          placeItems: "center",
                          border: selected
                            ? `2px solid ${T.accent}`
                            : `1px solid ${T.borderMedium}`,
                          background: selected
                            ? T.accent
                            : "rgba(10,10,10,0.76)",
                          color: T.void,
                          borderRadius: 2,
                          fontWeight: 800,
                        }}
                      >
                        {selected ? "✓" : ""}
                      </span>
                    </div>
                    <div style={{ padding: "12px" }}>
                      <p
                        className="body-md"
                        style={{
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: T.text,
                        }}
                      >
                        {asset.originalName ?? asset.fileName}
                      </p>
                      <p
                        className="badge-text"
                        style={{ margin: "7px 0 0", color: T.muted }}
                      >
                        {[
                          asset.width && asset.height
                            ? `${asset.width}×${asset.height}`
                            : null,
                          asset.fileSize ? formatSize(asset.fileSize) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "SOURCE RECORD"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {previewAsset && (
          <aside
            className="cv-media-picker__preview cv-panel"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              borderRadius: 0,
              borderTop: 0,
              borderBottom: 0,
              borderRight: 0,
              padding: 20,
              overflowY: "auto",
              background: T.surface,
            }}
          >
            <p className="cv-eyebrow" style={{ margin: 0, color: T.accent }}>
              Source inspection
            </p>
            <div
              style={{
                aspectRatio: "16 / 9",
                overflow: "hidden",
                background: T.void,
                borderRadius: 8,
              }}
            >
              {isVideo(previewAsset) && previewAsset.publicUrl ? (
                <video
                  key={previewAsset.id}
                  src={previewAsset.publicUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (previewAsset.thumbnailUrl ?? previewAsset.publicUrl) ? (
                <img
                  src={
                    previewAsset.thumbnailUrl ?? previewAsset.publicUrl ?? ""
                  }
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    display: "grid",
                    placeItems: "center",
                    height: "100%",
                    color: T.muted,
                  }}
                >
                  NO PREVIEW
                </div>
              )}
            </div>
            <div>
              <h3
                className="heading-xl"
                style={{ margin: 0, fontSize: 26, overflowWrap: "anywhere" }}
              >
                {previewAsset.originalName ?? previewAsset.fileName}
              </h3>
              <dl style={{ display: "grid", gap: 9, margin: "16px 0 0" }}>
                {(
                  [
                    ["TYPE", isVideo(previewAsset) ? "VIDEO" : "IMAGE"],
                    ...(previewAsset.duration
                      ? [["DURATION", formatDuration(previewAsset.duration)]]
                      : []),
                    ...(previewAsset.width && previewAsset.height
                      ? [
                          [
                            "RESOLUTION",
                            `${previewAsset.width}×${previewAsset.height}`,
                          ],
                        ]
                      : []),
                    ...(previewAsset.fileSize
                      ? [["SIZE", formatSize(previewAsset.fileSize)]]
                      : []),
                    ...(previewAsset.mimeType
                      ? [["FORMAT", previewAsset.mimeType]]
                      : []),
                  ] as Array<[string, string]>
                ).map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <dt className="badge-text" style={{ color: T.muted }}>
                      {label}
                    </dt>
                    <dd
                      className="badge-text"
                      style={{
                        margin: 0,
                        color: T.secondary,
                        textAlign: "right",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <button
              type="button"
              onClick={() => toggleSelect(previewAsset.id)}
              className={
                selectedIds.includes(previewAsset.id)
                  ? "cv-ghost"
                  : "cv-cta-outline"
              }
              style={{ marginTop: "auto", minHeight: 52, borderRadius: 2 }}
            >
              {selectedIds.includes(previewAsset.id)
                ? "Deselect source"
                : "Select this source"}
            </button>
          </aside>
        )}
      </div>

      <footer
        className="cv-media-picker__bottom"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "14px 24px",
          borderTop: `1px solid ${T.border}`,
          background: T.void,
        }}
      >
        <div
          className="cv-media-picker__selected-strip"
          style={{ minWidth: 0, flex: 1 }}
        >
          <p
            className="badge-text"
            style={{
              margin: 0,
              color: selectedAssets.length ? T.accent : T.muted,
            }}
          >
            {selectedAssets.length
              ? `${selectedAssets.length} SOURCE${selectedAssets.length === 1 ? "" : "S"} STAGED FOR THIS STEP`
              : "SELECT A VERIFIED SOURCE TO CONTINUE"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <button
            type="button"
            onClick={onClose}
            className="cv-ghost"
            style={{ minHeight: 52, borderRadius: 2 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedAssets.length > 0) onConfirm(selectedAssets);
            }}
            disabled={selectedAssets.length === 0}
            className="cv-cta"
            style={{
              minHeight: 52,
              borderRadius: 2,
              opacity: selectedAssets.length ? 1 : 0.38,
            }}
          >
            {confirmLabel} ({selectedAssets.length})
          </button>
        </div>
      </footer>
    </div>
  );
}
