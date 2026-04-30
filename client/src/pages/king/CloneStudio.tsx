import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";

const C = {
  bg: "#0a0a0a",
  panel: "#141414",
  text: "#f5f0e8",
  muted: "rgba(245, 240, 232, 0.65)",
  border: "rgba(245, 240, 232, 0.10)",
  accent: "#c9a84c",
};

const RES_OPTIONS = ["480p", "720p", "1080p"] as const;
const LEN_OPTIONS = ["5s", "10s"] as const;
const MODE_OPTIONS = ["Basic", "Pro"] as const;
const POLLING_STATUSES = new Set(["waiting", "processing", "pending", "running", "queued", "in_progress"]);

function toBase64Payload(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      const base64 = value.includes(",") ? value.split(",")[1] : value;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CloneStudio() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [resolution, setResolution] = useState<(typeof RES_OPTIONS)[number]>("720p");
  const [length, setLength] = useState<(typeof LEN_OPTIONS)[number]>("5s");
  const [mode, setMode] = useState<(typeof MODE_OPTIONS)[number]>("Pro");
  const [selectedGenerationId, setSelectedGenerationId] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  const [status, setStatus] = useState<string>("idle");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const pollo = (trpc as any).pollo;

  const uploadImage = trpc.content.upload.useMutation();
  const generateVideo = pollo.generateVideo.useMutation();
  const historyQuery = pollo.getGenerationHistory.useQuery({ page, limit: 12 }, { keepPreviousData: true });
  const saveToVault = pollo.saveToVault.useMutation();
  const setAsHero = pollo.setAsHero.useMutation();

  const statusQuery = pollo.getTaskStatus.useQuery(
    { taskId },
    {
      enabled: !!taskId && POLLING_STATUSES.has(status.toLowerCase()),
      refetchInterval: (data: any) => {
        const current = String(data?.status ?? status ?? "").toLowerCase();
        return POLLING_STATUSES.has(current) ? 2000 : false;
      },
      onSuccess: (data: any) => {
        const nextStatus = String(data?.status ?? "").toLowerCase();
        if (nextStatus) {
          setStatus(nextStatus);
        }
        if (data?.videoUrl) {
          setVideoUrl(String(data.videoUrl));
        }
      },
    }
  );

  const ownerAllowed = useMemo(() => user?.id === 6 || user?.id === 33, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!ownerAllowed) {
      setLocation("/dashboard");
    }
  }, [authLoading, ownerAllowed, setLocation]);

  const total = Number(historyQuery.data?.total ?? 0);
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const onPickImage = (file: File | null) => {
    if (!file) return;
    setImageFile(file);
    setImageUrl("");
    setImagePreview(URL.createObjectURL(file));
  };

  const onGenerate = async () => {
    if (!imageFile && !imageUrl) {
      setErrorMessage("Upload an image first.");
      return;
    }

    setErrorMessage("");

    try {
      let finalImageUrl = imageUrl;

      if (!finalImageUrl && imageFile) {
        const fileData = await toBase64Payload(imageFile);
        const uploaded = await uploadImage.mutateAsync({
          fileData,
          fileName: imageFile.name,
          mimeType: imageFile.type || "image/png",
          title: "Clone Studio Source",
          contentType: "image",
        });
        finalImageUrl = String(uploaded?.url ?? "");
        setImageUrl(finalImageUrl);
      }

      const response = await generateVideo.mutateAsync({
        imageUrl: finalImageUrl,
        prompt: prompt || undefined,
        resolution,
        length,
        mode: mode.toLowerCase(),
      });

      const nextTaskId = String(response?.taskId ?? "");
      setSelectedGenerationId(String(response?.id ?? ""));
      setTaskId(nextTaskId);
      setStatus(String(response?.status ?? "waiting").toLowerCase());
      setVideoUrl("");
      void historyQuery.refetch();
    } catch (error: any) {
      setErrorMessage(error?.message || "Generation failed.");
      setStatus("failed");
    }
  };

  const onSelectHistory = (item: any) => {
    setSelectedGenerationId(String(item?.id ?? ""));
    setTaskId(String(item?.taskId ?? ""));
    setStatus(String(item?.status ?? "idle").toLowerCase());
    setVideoUrl(String(item?.videoUrl ?? ""));
  };

  const panel: CSSProperties = {
    background: C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: 2,
    padding: 16,
    minHeight: 0,
  };

  if (authLoading || !ownerAllowed) {
    return <div style={{ minHeight: "100vh", background: C.bg }} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Inter, sans-serif", padding: 16 }}>
      <div style={{ maxWidth: 1640, margin: "0 auto", display: "grid", gridTemplateColumns: "320px minmax(0,1fr) 300px", gap: 12 }}>
        <section style={panel}>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 28, margin: "0 0 14px", color: C.text }}>Clone Studio</h1>

          <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 8 }}>Image Upload</label>
          <label style={{ display: "block", border: `1px solid ${C.border}`, borderRadius: 2, padding: 8, marginBottom: 10, cursor: "pointer" }}>
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onPickImage(e.target.files?.[0] ?? null)} />
            <div style={{ fontSize: 12, color: C.muted }}>{imageFile ? imageFile.name : "Click to select source image"}</div>
          </label>
          {imagePreview && <img src={imagePreview} alt="preview" style={{ width: "100%", borderRadius: 2, border: `1px solid ${C.border}`, marginBottom: 10 }} />}

          <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 8 }}>Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe movement, lighting, and style..."
            style={{ width: "100%", minHeight: 96, resize: "vertical", background: "#101010", color: C.text, border: `1px solid ${C.border}`, borderRadius: 2, padding: 8, marginBottom: 12 }}
          />

          <TileGroup label="Resolution" options={RES_OPTIONS} value={resolution} onChange={setResolution} />
          <TileGroup label="Length" options={LEN_OPTIONS} value={length} onChange={setLength} />
          <TileGroup label="Mode" options={MODE_OPTIONS} value={mode} onChange={setMode} />

          <button
            onClick={onGenerate}
  // @ts-ignore
            disabled={generateVideo.isPending || uploadImage.isPending}
            style={{ width: "100%", marginTop: 6, background: C.accent, color: "#16120b", border: "none", borderRadius: 2, padding: "11px 12px", fontWeight: 700, cursor: "pointer" }}
          >
  // @ts-ignore
            {generateVideo.isPending || uploadImage.isPending ? "Generating..." : "Generate"}
          </button>
          {errorMessage && <div style={{ marginTop: 10, color: "#ff8f8f", fontSize: 12 }}>{errorMessage}</div>}
        </section>

        <section style={panel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, margin: 0 }}>Preview</h2>
            <span style={{ border: `1px solid ${C.border}`, borderRadius: 2, padding: "4px 8px", color: status === "succeeded" ? C.accent : C.muted, fontSize: 12 }}>
              {status === "idle" ? "No active task" : `Status: ${status}`}
            </span>
          </div>

          {!videoUrl ? (
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 2, minHeight: 460, display: "grid", placeItems: "center", color: C.muted }}>
              {statusQuery.isFetching ? "Processing..." : "No generation selected yet"}
            </div>
          ) : (
            <video src={videoUrl} controls style={{ width: "100%", border: `1px solid ${C.border}`, borderRadius: 2, background: "#000" }} />
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => saveToVault.mutate({ generationId: selectedGenerationId })}
              disabled={!selectedGenerationId || saveToVault.isPending}
              style={actionButton()}
            >
              Save to Vault
            </button>
            <button
              onClick={() => setAsHero.mutate({ generationId: selectedGenerationId })}
              disabled={!selectedGenerationId || setAsHero.isPending}
              style={actionButton()}
            >
              Set as Hero
            </button>
            <a href={videoUrl || "#"} download style={{ ...actionButton(), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              Download
            </a>
          </div>
        </section>

        <section style={panel}>
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, margin: "0 0 10px" }}>History</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignContent: "start" }}>
            {(historyQuery.data?.generations ?? []).map((item: any) => (
              <button
                key={String(item.id)}
                onClick={() => onSelectHistory(item)}
                style={{ background: "#101010", border: `1px solid ${selectedGenerationId === String(item.id) ? C.accent : C.border}`, borderRadius: 2, color: C.text, padding: 8, textAlign: "left", cursor: "pointer" }}
              >
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{String(item.status ?? "unknown")}</div>
                {item.videoUrl ? (
                  <video src={String(item.videoUrl)} muted style={{ width: "100%", borderRadius: 2, border: `1px solid ${C.border}` }} />
                ) : (
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: 2, height: 80, display: "grid", placeItems: "center", color: C.muted, fontSize: 11 }}>No video yet</div>
                )}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={actionButton()}>
              Prev
            </button>
            <span style={{ fontSize: 12, color: C.muted }}>{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={actionButton()}>
              Next
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function actionButton(): CSSProperties {
  return {
    background: "#101010",
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 2,
    padding: "8px 10px",
    fontSize: 12,
    cursor: "pointer",
  };
}

function TileGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "rgba(245, 240, 232, 0.65)", marginBottom: 7 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))`, gap: 6 }}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              background: value === opt ? "rgba(201, 168, 76, 0.15)" : "#101010",
              color: value === opt ? C.accent : C.text,
              border: `1px solid ${value === opt ? C.accent : C.border}`,
              borderRadius: 2,
              padding: "8px 6px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
