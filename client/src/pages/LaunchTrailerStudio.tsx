import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import MediaPicker, { type MediaAssetItem } from "@/components/MediaPicker";

const colors = {
  bg: "#0a0a0a",
  panel: "#121212",
  border: "#2a2a2a",
  text: "#f5f0e8",
  muted: "#9f988d",
  gold: "#c9a84c",
};

export function LaunchTrailerStudio() {
  const [projectName, setProjectName] = useState("Flagship Trailer");
  const [scriptText, setScriptText] = useState("");
  const [title, setTitle] = useState("");
  const [concept, setConcept] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<MediaAssetItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const createTrailer = trpc.mediaAssets.createTrailerProject.useMutation();
  const projectsQuery = trpc.mediaAssets.listTrailerProjects.useQuery(undefined, { staleTime: 10_000 });

  const canCreate = projectName.trim().length > 0 && selectedMedia.length > 0;

  const selectedIds = useMemo(() => selectedMedia.map((item) => item.id), [selectedMedia]);

  const handleCreate = async () => {
    if (!canCreate) return;

    await createTrailer.mutateAsync({
      projectName: projectName.trim(),
      projectType: "launch_trailer",
      format: "16:9",
      title: title || undefined,
      concept: concept || undefined,
      scriptText: scriptText || undefined,
      selectedAssetIds: selectedIds,
      hooks: scriptText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 4),
    });

    projectsQuery.refetch();
  };

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 34 }}>Launch Trailer Studio</h1>
        <p style={{ color: colors.muted, marginTop: 8 }}>
          Pick your best clips, lock the script, and create a trailer project ready for production.
        </p>

        <div
          style={{
            marginTop: 22,
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 18,
          }}
        >
          <div style={{ border: `1px solid ${colors.border}`, background: colors.panel, borderRadius: 14, padding: 18 }}>
            <h3 style={{ marginTop: 0 }}>Trailer Setup</h3>

            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ fontSize: 13, color: colors.muted }}>
                Project Name
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: "#0f0f0f",
                    color: colors.text,
                    padding: "10px 12px",
                  }}
                />
              </label>

              <label style={{ fontSize: 13, color: colors.muted }}>
                Trailer Title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Optional title shown in trailer project"
                  style={{
                    width: "100%",
                    marginTop: 6,
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: "#0f0f0f",
                    color: colors.text,
                    padding: "10px 12px",
                  }}
                />
              </label>

              <label style={{ fontSize: 13, color: colors.muted }}>
                Concept
                <textarea
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  rows={3}
                  placeholder="Optional creative direction"
                  style={{
                    width: "100%",
                    marginTop: 6,
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: "#0f0f0f",
                    color: colors.text,
                    padding: "10px 12px",
                    resize: "vertical",
                  }}
                />
              </label>

              <label style={{ fontSize: 13, color: colors.muted }}>
                Script / Voiceover
                <textarea
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  rows={7}
                  placeholder="Paste your trailer script. Each line can become a hook or scene cue."
                  style={{
                    width: "100%",
                    marginTop: 6,
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: "#0f0f0f",
                    color: colors.text,
                    padding: "10px 12px",
                    resize: "vertical",
                  }}
                />
              </label>
            </div>
          </div>

          <div style={{ border: `1px solid ${colors.border}`, background: colors.panel, borderRadius: 14, padding: 18 }}>
            <h3 style={{ marginTop: 0 }}>Scene Media</h3>
            <p style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
              Select source clips/images from your media library.
            </p>

            <button
              onClick={() => setPickerOpen(true)}
              style={{
                borderRadius: 9,
                border: `1px solid ${colors.gold}`,
                background: "rgba(201,168,76,0.12)",
                color: colors.gold,
                padding: "9px 14px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Select Media
            </button>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {selectedMedia.map((asset) => (
                <div key={asset.id} style={{ border: `1px solid ${colors.border}`, borderRadius: 8, overflow: "hidden", background: "#0f0f0f" }}>
                  {(asset.thumbnailUrl ?? asset.publicUrl) ? (
                    <img
                      src={asset.thumbnailUrl ?? asset.publicUrl ?? ""}
                      alt={asset.fileName}
                      style={{ width: "100%", height: 70, objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: 70, display: "grid", placeItems: "center", color: colors.muted }}>No preview</div>
                  )}
                  <div style={{ padding: 6, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {asset.fileName}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleCreate}
              disabled={!canCreate || createTrailer.isPending}
              style={{
                width: "100%",
                marginTop: 16,
                borderRadius: 9,
                border: `1px solid ${colors.gold}`,
                background: canCreate ? colors.gold : "#5b513b",
                color: "#141414",
                padding: "10px 14px",
                fontWeight: 800,
                cursor: canCreate ? "pointer" : "not-allowed",
              }}
            >
              {createTrailer.isPending ? "Creating..." : "Create Trailer Project"}
            </button>

            {createTrailer.data?.trailerProjectId && (
              <div style={{ marginTop: 10, color: "#79d48f", fontSize: 13 }}>
                Project created: {createTrailer.data.trailerProjectId}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 22, border: `1px solid ${colors.border}`, background: colors.panel, borderRadius: 14, padding: 16 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Recent Trailer Projects</h3>
          {(projectsQuery.data ?? []).length === 0 ? (
            <div style={{ color: colors.muted, fontSize: 13 }}>No projects yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {(projectsQuery.data ?? []).map((project) => (
                <div
                  key={project.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    padding: "9px 10px",
                    fontSize: 13,
                  }}
                >
                  <span>{project.projectName}</span>
                  <span style={{ color: colors.muted }}>{project.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <MediaPicker
        open={pickerOpen}
        mode="multi"
        title="Trailer Scene Media"
        subtitle="Select all media assets you want available for this trailer"
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
