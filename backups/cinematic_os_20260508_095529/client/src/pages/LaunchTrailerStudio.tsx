import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import MediaPicker, { type MediaAssetItem } from "@/components/MediaPicker";

/* ═══════════════════════════════════════════════════════════
   Launch Trailer Studio — Canvas-First Design
   Pollo AI / OpenArt AI benchmark — NO FORMS
   ═══════════════════════════════════════════════════════════ */

const T = {
  bg: "#0a0a0a",
  surface: "#111111",
  card: "#0e0e0e",
  border: "#1f1f1f",
  borderLight: "#2a2a2a",
  text: "#f5f0e8",
  textSecondary: "#b8b0a4",
  muted: "#736e64",
  gold: "#c9a84c",
  goldDim: "rgba(201,168,76,0.12)",
  goldGlow: "rgba(201,168,76,0.35)",
  success: "#5bd48f",
};

function isVideo(a: MediaAssetItem) {
  return (a.assetType ?? "").toLowerCase() === "video" || (a.mimeType ?? "").startsWith("video/");
}

export function LaunchTrailerStudio() {
  const [projectName, setProjectName] = useState("Flagship Trailer");
  const [scriptText, setScriptText] = useState("");
  const [title, setTitle] = useState("");
  const [concept, setConcept] = useState("");
  const [format, setFormat] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [selectedMedia, setSelectedMedia] = useState<MediaAssetItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [groundedBlueprint, setGroundedBlueprint] = useState<any | null>(null);

  // @ts-ignore
  const createTrailer = trpc.mediaAssets.createTrailerProject.useMutation();
  // @ts-ignore
  const projectsQuery = trpc.mediaAssets.listTrailerProjects.useQuery(undefined, { staleTime: 10_000 });

  const canCreate = projectName.trim().length > 0 && selectedMedia.length > 0;
  const selectedIds = useMemo(() => selectedMedia.map((item) => item.id), [selectedMedia]);

  const handleCreate = async () => {
    if (!canCreate) return;
    setGroundedBlueprint(null);
    const result = await createTrailer.mutateAsync({
      projectName: projectName.trim(),
      projectType: "launch_trailer",
      format,
      title: title || undefined,
      concept: concept || undefined,
      scriptText: scriptText || undefined,
      selectedAssetIds: selectedIds,
      hooks: scriptText.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 4),
    });
    setGroundedBlueprint((result as any)?.trailerBlueprint ?? null);
    projectsQuery.refetch();
  };

  const formats: ["16:9" | "9:16" | "1:1", string][] = [
    ["16:9", "Landscape"],
    ["9:16", "Portrait"],
    ["1:1", "Square"],
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text }}>
      <style>{`
        @keyframes ltsFade { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .lts-editable { background: transparent; border: none; color: ${T.text}; outline: none; width: 100%; }
        .lts-editable:focus { border-bottom: 1px solid ${T.gold}; }
        .lts-editable::placeholder { color: ${T.muted}; }
      `}</style>

      {/* ── Hero Header ── */}
      <div style={{
        padding: "40px 32px 28px",
        borderBottom: `1px solid ${T.border}`,
        background: `linear-gradient(180deg, rgba(201,168,76,0.04) 0%, transparent 100%)`,
        animation: "ltsFade .4s ease",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
                Launch Trailer Studio
              </div>
              <input
                className="lts-editable"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project Name"
                style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}
              />
              <input
                className="lts-editable"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a trailer title…"
                style={{ fontSize: 16, color: T.textSecondary }}
              />
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {/* Format toggle tiles */}
              <div style={{ display: "flex", gap: 4, background: T.surface, borderRadius: 10, padding: 3, border: `1px solid ${T.border}` }}>
                {formats.map(([val, label]) => (
                  <button key={val} onClick={() => setFormat(val)} style={{
                    border: "none", borderRadius: 7,
                    background: format === val ? T.goldDim : "transparent",
                    color: format === val ? T.gold : T.muted,
                    padding: "6px 12px", cursor: "pointer",
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.03em",
                  }}>{val} {label}</button>
                ))}
              </div>
              <button
                onClick={handleCreate}
                disabled={!canCreate || createTrailer.isPending}
                style={{
                  border: "none", borderRadius: 10, padding: "12px 28px",
                  background: canCreate ? `linear-gradient(135deg, ${T.gold}, #a8872f)` : "#2a2520",
                  color: canCreate ? "#0a0a0a" : T.muted,
                  fontWeight: 800, fontSize: 14, cursor: canCreate ? "pointer" : "not-allowed",
                  boxShadow: canCreate ? `0 4px 20px ${T.goldGlow}` : "none",
                  transition: "all .2s ease",
                }}
              >
                {createTrailer.isPending ? "Creating…" : "Create Trailer →"}
              </button>
            </div>
          </div>
          {createTrailer.error && (
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(255,91,91,0.1)", border: "1px solid rgba(255,91,91,0.3)", color: "#ff8d8d", fontSize: 13, fontWeight: 600 }}>
              Trailer grounding failed: {createTrailer.error.message}
            </div>
          )}
          {createTrailer.data?.trailerProjectId && (
            <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "rgba(91,212,143,0.1)", border: "1px solid rgba(91,212,143,0.3)", color: T.success, fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
              Grounded trailer blueprint created: {createTrailer.data.trailerProjectId}
              <div style={{ color: T.textSecondary, fontSize: 12, fontWeight: 500 }}>
                {(createTrailer.data as any).mediaAssetCount} verified asset{(createTrailer.data as any).mediaAssetCount === 1 ? "" : "s"} · Status {(createTrailer.data as any).status} · No finished render is claimed until a real render job writes output_url.
              </div>
            </div>
          )}

          {groundedBlueprint && (
            <div style={{ marginTop: 16, borderRadius: 16, border: `1px solid ${T.gold}`, background: "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(17,17,17,0.96))", padding: 18, boxShadow: `0 16px 48px rgba(0,0,0,0.35)` }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.gold, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
                    Grounded Asset Intelligence
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>
                    Real trailer blueprint · {(groundedBlueprint as any).readiness?.assetCount ?? 0} verified asset{((groundedBlueprint as any).readiness?.assetCount ?? 0) === 1 ? "" : "s"}
                  </div>
                  <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 4 }}>
                    {(groundedBlueprint as any).readiness?.estimatedDurationSeconds ?? 0}s planned · {(groundedBlueprint as any).readiness?.state ?? "blueprint_ready"} · Render status {(groundedBlueprint as any).renderHandoff?.status ?? "not_rendered"}
                  </div>
                </div>
                <div style={{ borderRadius: 999, border: `1px solid ${T.borderLight}`, color: (groundedBlueprint as any).readiness?.canProceedToRenderPlanning ? T.success : "#ffb36b", padding: "6px 10px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {(groundedBlueprint as any).readiness?.canProceedToRenderPlanning ? "Render-planning ready" : "Needs visual coverage"}
                </div>
              </div>

              {((groundedBlueprint as any).readiness?.warnings ?? []).length > 0 && (
                <div style={{ marginBottom: 14, borderRadius: 12, border: "1px solid rgba(255,179,107,0.35)", background: "rgba(255,179,107,0.08)", padding: 12, color: "#ffcc99", fontSize: 12, lineHeight: 1.5 }}>
                  {((groundedBlueprint as any).readiness.warnings as string[]).slice(0, 4).map((warning, idx) => (
                    <div key={idx}>• {warning}</div>
                  ))}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                {((groundedBlueprint as any).scenes ?? []).slice(0, 6).map((scene: any) => (
                  <div key={scene.sceneIndex} style={{ borderRadius: 12, border: `1px solid ${T.border}`, background: "rgba(10,10,10,0.62)", padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                      <span style={{ color: T.gold, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>Scene {scene.sceneIndex + 1} · {scene.role}</span>
                      <span style={{ color: T.muted, fontSize: 11 }}>{scene.durationSeconds}s</span>
                    </div>
                    <div style={{ color: T.text, fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{scene.overlayText}</div>
                    <div style={{ color: T.textSecondary, fontSize: 11, marginTop: 8, lineHeight: 1.4 }}>
                      Asset {scene.sourceAssetId} · {scene.assetKind} · {scene.requiredRenderTreatment}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 32px" }}>
        {/* ── Media Canvas ── */}
        <div style={{ animation: "ltsFade .45s ease .1s both" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Scene Media · {selectedMedia.length} asset{selectedMedia.length !== 1 ? "s" : ""}
            </div>
            <button onClick={() => setPickerOpen(true)} style={{
              border: `1px solid ${T.gold}`, background: T.goldDim,
              color: T.gold, borderRadius: 8, padding: "8px 16px",
              cursor: "pointer", fontWeight: 700, fontSize: 12,
              transition: "all .15s ease",
            }}>
              + Add Media
            </button>
          </div>

          {selectedMedia.length === 0 ? (
            /* empty canvas prompt */
            <button onClick={() => setPickerOpen(true)} style={{
              all: "unset", cursor: "pointer", boxSizing: "border-box",
              width: "100%", borderRadius: 16,
              border: `2px dashed ${T.borderLight}`,
              background: `linear-gradient(135deg, ${T.surface}, ${T.card})`,
              padding: "60px 32px", textAlign: "center",
              transition: "border-color .2s ease",
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>
                Open your media library
              </div>
              <div style={{ fontSize: 13, color: T.muted, maxWidth: 400, margin: "0 auto", lineHeight: 1.5 }}>
                Select the videos and images that will power your trailer.
                Click to browse your full media vault.
              </div>
            </button>
          ) : (
            /* visual timeline strip */
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(selectedMedia.length, 6)}, 1fr)`,
              gap: 10,
            }}>
              {selectedMedia.map((asset, idx) => (
                <div key={asset.id} style={{
                  borderRadius: 12, overflow: "hidden",
                  border: `1px solid ${T.border}`, background: T.card,
                  position: "relative",
                  animation: `ltsFade .3s ease ${idx * 0.05}s both`,
                }}>
                  <div style={{ position: "relative", aspectRatio: "16/10" }}>
                    {(asset.thumbnailUrl ?? asset.publicUrl) ? (
                      <img
                        src={asset.thumbnailUrl ?? asset.publicUrl ?? ""}
                        alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "#131313", display: "grid", placeItems: "center", color: T.muted, fontSize: 22 }}>
                        {isVideo(asset) ? "▶" : "◻"}
                      </div>
                    )}
                    {/* scene number badge */}
                    <div style={{
                      position: "absolute", top: 8, left: 8,
                      background: T.gold, color: "#0a0a0a",
                      borderRadius: 6, padding: "2px 7px",
                      fontSize: 10, fontWeight: 800,
                    }}>Scene {idx + 1}</div>
                    {isVideo(asset) && (
                      <div style={{
                        position: "absolute", bottom: 8, right: 8,
                        background: "rgba(0,0,0,0.7)", borderRadius: 5,
                        padding: "2px 6px", fontSize: 10, color: T.text, fontWeight: 600,
                      }}>▶</div>
                    )}
                  </div>
                  <div style={{ padding: "8px 10px" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {asset.originalName ?? asset.fileName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Script / Concept Panel (collapsible overlay-style) ── */}
        <div style={{ marginTop: 24, animation: "ltsFade .45s ease .2s both" }}>
          <button onClick={() => setShowScript(!showScript)} style={{
            all: "unset", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 11, fontWeight: 700, color: T.muted,
            textTransform: "uppercase", letterSpacing: "0.1em",
            marginBottom: showScript ? 12 : 0,
          }}>
            <span style={{ transform: showScript ? "rotate(90deg)" : "rotate(0)", transition: "transform .2s ease", display: "inline-block" }}>▸</span>
            Script & Direction
          </button>

          {showScript && (
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
              animation: "ltsFade .3s ease",
            }}>
              <div style={{
                borderRadius: 14, border: `1px solid ${T.border}`,
                background: T.surface, padding: 16,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                  Creative Direction
                </div>
                <textarea
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  rows={4}
                  placeholder="Describe the mood, style, and energy of this trailer…"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "transparent", border: `1px solid ${T.border}`,
                    borderRadius: 8, color: T.text, padding: "10px 12px",
                    fontSize: 13, resize: "vertical", outline: "none",
                    lineHeight: 1.5,
                  }}
                />
              </div>
              <div style={{
                borderRadius: 14, border: `1px solid ${T.border}`,
                background: T.surface, padding: 16,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                  Script / Voiceover Lines
                </div>
                <textarea
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  rows={4}
                  placeholder="Each line becomes a hook or scene cue…"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "transparent", border: `1px solid ${T.border}`,
                    borderRadius: 8, color: T.text, padding: "10px 12px",
                    fontSize: 13, resize: "vertical", outline: "none",
                    lineHeight: 1.5, fontFamily: "monospace",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Recent Projects (visual timeline, not list) ── */}
        <div style={{ marginTop: 32, animation: "ltsFade .45s ease .3s both" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>
            Recent Trailer Projects
          </div>
          {(projectsQuery.data ?? []).length === 0 ? (
            <div style={{ color: T.muted, fontSize: 13, padding: "24px 0" }}>
              No projects yet. Select media and create your first trailer above.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
  // @ts-ignore
              {(projectsQuery.data ?? []).map((project: any, i: number) => (
                <div key={project.id} style={{
                  borderRadius: 12, border: `1px solid ${T.border}`,
                  background: T.surface, padding: 16,
                  animation: `ltsFade .3s ease ${i * 0.05}s both`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{project.projectName}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                      padding: "3px 8px", borderRadius: 6,
                      background: project.status === "draft" ? T.goldDim : "rgba(91,212,143,0.1)",
                      color: project.status === "draft" ? T.gold : T.success,
                      letterSpacing: "0.06em",
                    }}>{project.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.muted }}>
                    {project.projectType?.replace(/_/g, " ")} · {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Media Picker Overlay ── */}
      <MediaPicker
        open={pickerOpen}
        mode="multi"
        title="Trailer Scene Media"
        subtitle="Select clips and images for your trailer scenes"
        initialSelectedIds={selectedIds}
        onClose={() => setPickerOpen(false)}
        onConfirm={(selected) => {
          setSelectedMedia(selected);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

export default LaunchTrailerStudio;
