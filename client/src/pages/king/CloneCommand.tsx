/**
 * ============================================================================
 * CLONE COMMAND CENTER — /king/clone-command
 * Three-panel cinematic interface for KingCam AI clone image generation.
 *
 * Left Panel:   Controls — prompt, dimensions, advanced settings
 * Center Panel: Output Stage — live generation result display
 * Right Panel:  Vault History — past generations grid
 *
 * Visual Law: #0A0A0A background, #00D9FF cyan accent, bold white type
 * ============================================================================
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

// ─── Constants ────────────────────────────────────────────────────────────────
const CYAN = "#00D9FF";
const BG = "#0A0A0A";
const SURFACE = "#111111";
const SURFACE2 = "#1A1A1A";
const BORDER = "#222222";
const MUTED = "#666666";
const TRIGGER = "fluxdevCam";

// Preset dimensions
const PRESETS = [
  { label: "1:1", w: 1024, h: 1024 },
  { label: "16:9", w: 1344, h: 768 },
  { label: "9:16", w: 768, h: 1344 },
  { label: "4:3", w: 1152, h: 896 },
  { label: "3:4", w: 896, h: 1152 },
];

export default function CloneCommand() {
  const { toast } = useToast();

  // ─── State: Controls ────────────────────────────────────────────────
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [preset, setPreset] = useState(0);
  const [numOutputs, setNumOutputs] = useState(1);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [steps, setSteps] = useState(28);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ─── State: Generation ──────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [activePredictionId, setActivePredictionId] = useState<string | null>(null);
  const [outputImages, setOutputImages] = useState<string[]>([]);
  const [selectedOutput, setSelectedOutput] = useState(0);
  const [genStatus, setGenStatus] = useState<string>("");
  const [genError, setGenError] = useState<string>("");
  const [genMetrics, setGenMetrics] = useState<any>(null);

  // ─── State: Vault ───────────────────────────────────────────────────
  const [vaultPage, setVaultPage] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── tRPC ───────────────────────────────────────────────────────────
  // @ts-ignore
  const generateMutation = trpc.cloneCommand.generateImage.useMutation();
  // @ts-ignore
  const saveToVaultMutation = trpc.cloneCommand.saveToVault.useMutation();
  // @ts-ignore
  const setHeroMutation = trpc.cloneCommand.setHeroImage.useMutation();

  // @ts-ignore
  const historyQuery = trpc.cloneCommand.getGenerationHistory.useQuery(
    { limit: 20, offset: vaultPage * 20 },
    { refetchInterval: generating ? 10000 : 30000 },
  );

  // @ts-ignore
  const statusQuery = trpc.cloneCommand.getPredictionStatus.useQuery(
    { predictionId: activePredictionId! },
    { enabled: !!activePredictionId && generating, refetchInterval: 2000 },
  );

  // ─── Poll status effect ────────────────────────────────────────────
  useEffect(() => {
    if (!statusQuery.data) return;
    const { status, output, error, metrics } = statusQuery.data;
    setGenStatus(status);

    if (status === "succeeded" && output) {
      const urls = Array.isArray(output) ? output : [output];
      setOutputImages(urls);
      setSelectedOutput(0);
      setGenerating(false);
      setActivePredictionId(null);
      setGenMetrics(metrics);
      historyQuery.refetch();
      toast({ title: "Generation complete", description: `${urls.length} image(s) ready` });
    } else if (status === "failed" || status === "canceled") {
      setGenError(error || "Generation failed");
      setGenerating(false);
      setActivePredictionId(null);
    }
  }, [statusQuery.data]);

  // ─── Generate handler ──────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast({ title: "Enter a prompt", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setOutputImages([]);
    setGenError("");
    setGenStatus("starting");
    setGenMetrics(null);

    try {
      const result = await generateMutation.mutateAsync({
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        width: PRESETS[preset].w,
        height: PRESETS[preset].h,
        numOutputs,
        guidanceScale,
        numInferenceSteps: steps,
      });
      setActivePredictionId(result.predictionId);
    } catch (err: any) {
      setGenError(err.message || "Failed to start generation");
      setGenerating(false);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }, [prompt, negativePrompt, preset, numOutputs, guidanceScale, steps]);

  // ─── Save to vault handler ─────────────────────────────────────────
  const handleSaveToVault = useCallback(
    async (imageUrl: string) => {
      // Find the generation id from history
      const gen = historyQuery.data?.generations?.find(
        (g: any) => g.outputUrls?.includes(imageUrl),
      );
      if (!gen) {
        toast({ title: "Save error", description: "Generation not found in history", variant: "destructive" });
        return;
      }
      try {
        await saveToVaultMutation.mutateAsync({
          generationId: gen.id,
          imageUrl,
        });
        historyQuery.refetch();
        toast({ title: "Saved to Vault" });
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    },
    [historyQuery.data],
  );

  // ─── Set hero image handler ────────────────────────────────────────
  const handleSetHero = useCallback(async (imageUrl: string) => {
    try {
      await setHeroMutation.mutateAsync({ imageUrl });
      toast({ title: "Hero image updated", description: "Homepage hero set" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }, []);

  // ─── Status indicator ──────────────────────────────────────────────
  const statusColor =
    genStatus === "succeeded"
      ? "#00FF88"
      : genStatus === "failed" || genStatus === "canceled"
        ? "#FF4444"
        : CYAN;

  return (
    <div
      style={{
        background: BG,
        minHeight: "100vh",
        color: "#fff",
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
      }}
    >
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "24px 32px 16px",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${CYAN}33, ${CYAN}11)`,
              border: `1px solid ${CYAN}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            👑
          </div>
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                margin: 0,
                background: `linear-gradient(135deg, #fff, ${CYAN})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              CLONE COMMAND CENTER
            </h1>
            <p style={{ fontSize: 12, color: MUTED, margin: 0, marginTop: 2 }}>
              KingCam AI Image Generation · {TRIGGER} Model
            </p>
          </div>
        </div>
        {generating && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 20,
              background: `${CYAN}15`,
              border: `1px solid ${CYAN}33`,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: CYAN,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: CYAN }}>
              GENERATING
            </span>
          </div>
        )}
      </div>

      {/* ─── Main 3-Panel Layout ────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr 300px",
          height: "calc(100vh - 90px)",
          overflow: "hidden",
        }}
      >
        {/* ═══ LEFT PANEL: Controls ═══ */}
        <div
          style={{
            borderRight: `1px solid ${BORDER}`,
            padding: 20,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Prompt */}
          <div>
            <label style={labelStyle}>PROMPT</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Describe your image... (${TRIGGER} is auto-prepended)`}
              rows={5}
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: 100,
                fontFamily: "inherit",
              }}
            />
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
              Trigger word <span style={{ color: CYAN, fontWeight: 700 }}>{TRIGGER}</span> is
              automatically included
            </div>
          </div>

          {/* Negative Prompt */}
          <div>
            <label style={labelStyle}>NEGATIVE PROMPT</label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="What to exclude..."
              rows={2}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </div>

          {/* Aspect Ratio Presets */}
          <div>
            <label style={labelStyle}>ASPECT RATIO</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => setPreset(i)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: `1px solid ${i === preset ? CYAN : BORDER}`,
                    background: i === preset ? `${CYAN}20` : SURFACE,
                    color: i === preset ? CYAN : "#aaa",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {p.label}
                  <span style={{ display: "block", fontSize: 10, opacity: 0.6, marginTop: 2 }}>
                    {p.w}×{p.h}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Outputs */}
          <div>
            <label style={labelStyle}>OUTPUTS</label>
            <div style={{ display: "flex", gap: 6 }}>
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setNumOutputs(n)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    border: `1px solid ${n === numOutputs ? CYAN : BORDER}`,
                    background: n === numOutputs ? `${CYAN}20` : SURFACE,
                    color: n === numOutputs ? CYAN : "#aaa",
                    fontWeight: 800,
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 0",
              background: "none",
              border: "none",
              color: MUTED,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.05em",
            }}
          >
            <span style={{ transform: showAdvanced ? "rotate(90deg)" : "none", transition: "0.2s" }}>
              ▶
            </span>
            ADVANCED SETTINGS
          </button>

          {showAdvanced && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                padding: 14,
                background: SURFACE,
                borderRadius: 10,
                border: `1px solid ${BORDER}`,
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ ...labelStyle, margin: 0 }}>GUIDANCE</label>
                  <span style={{ color: CYAN, fontSize: 13, fontWeight: 700 }}>
                    {guidanceScale.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={0.5}
                  value={guidanceScale}
                  onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                  style={sliderStyle}
                />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ ...labelStyle, margin: 0 }}>STEPS</label>
                  <span style={{ color: CYAN, fontSize: 13, fontWeight: 700 }}>{steps}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={steps}
                  onChange={(e) => setSteps(parseInt(e.target.value))}
                  style={sliderStyle}
                />
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            style={{
              width: "100%",
              padding: "16px 0",
              borderRadius: 12,
              border: "none",
              background: generating
                ? SURFACE2
                : `linear-gradient(135deg, ${CYAN}, #0099BB)`,
              color: generating ? MUTED : "#000",
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "0.08em",
              cursor: generating ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              marginTop: "auto",
            }}
          >
            {generating ? "⏳ GENERATING..." : "⚡ GENERATE"}
          </button>
        </div>

        {/* ═══ CENTER PANEL: Output Stage ═══ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Status bar */}
          {(genStatus || genError) && (
            <div
              style={{
                position: "absolute",
                top: 16,
                left: "50%",
                transform: "translateX(-50%)",
                padding: "6px 16px",
                borderRadius: 20,
                background: `${statusColor}15`,
                border: `1px solid ${statusColor}33`,
                fontSize: 12,
                fontWeight: 600,
                color: statusColor,
                zIndex: 10,
              }}
            >
              {genError || genStatus.toUpperCase()}
              {genMetrics?.predict_time && (
                <span style={{ marginLeft: 8, opacity: 0.7 }}>
                  {genMetrics.predict_time.toFixed(1)}s
                </span>
              )}
            </div>
          )}

          {outputImages.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                maxHeight: "100%",
                width: "100%",
              }}
            >
              {/* Main image */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  minHeight: 0,
                }}
              >
                <img
                  src={outputImages[selectedOutput]}
                  alt="Generated"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "calc(100vh - 260px)",
                    borderRadius: 12,
                    border: `1px solid ${BORDER}`,
                    objectFit: "contain",
                    boxShadow: `0 0 40px ${CYAN}15`,
                  }}
                />
              </div>

              {/* Thumbnails if multiple */}
              {outputImages.length > 1 && (
                <div style={{ display: "flex", gap: 8 }}>
                  {outputImages.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedOutput(i)}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 8,
                        overflow: "hidden",
                        border: `2px solid ${i === selectedOutput ? CYAN : BORDER}`,
                        padding: 0,
                        cursor: "pointer",
                        background: "none",
                      }}
                    >
                      <img
                        src={url}
                        alt={`Output ${i + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => handleSaveToVault(outputImages[selectedOutput])}
                  style={actionBtnStyle}
                >
                  💎 SAVE TO VAULT
                </button>
                <button
                  onClick={() => handleSetHero(outputImages[selectedOutput])}
                  style={{ ...actionBtnStyle, borderColor: "#FFD70044", color: "#FFD700" }}
                >
                  👑 SET AS HERO
                </button>
                <a
                  href={outputImages[selectedOutput]}
                  download
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    ...actionBtnStyle,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  ⬇ DOWNLOAD
                </a>
              </div>
            </div>
          ) : generating ? (
            /* Loading state */
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  border: `3px solid ${BORDER}`,
                  borderTopColor: CYAN,
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 24px",
                }}
              />
              <p style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
                Generating Your Clone...
              </p>
              <p style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>
                {genStatus === "starting"
                  ? "Warming up the model..."
                  : genStatus === "processing"
                    ? "Creating your image..."
                    : "Preparing..."}
              </p>
            </div>
          ) : (
            /* Empty state */
            <div style={{ textAlign: "center", maxWidth: 400 }}>
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 20,
                  background: `linear-gradient(135deg, ${CYAN}15, ${CYAN}05)`,
                  border: `1px dashed ${CYAN}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 42,
                  margin: "0 auto 20px",
                }}
              >
                🎨
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
                Ready to Generate
              </p>
              <p style={{ fontSize: 13, color: MUTED, marginTop: 8, lineHeight: 1.6 }}>
                Enter a prompt with your vision. The{" "}
                <span style={{ color: CYAN, fontWeight: 700 }}>{TRIGGER}</span> trigger word
                is automatically prepended to every generation.
              </p>
            </div>
          )}
        </div>

        {/* ═══ RIGHT PANEL: Vault History ═══ */}
        <div
          style={{
            borderLeft: `1px solid ${BORDER}`,
            padding: 16,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", color: MUTED }}>
              VAULT HISTORY
            </h2>
            <span style={{ fontSize: 11, color: MUTED }}>
              {historyQuery.data?.total || 0} total
            </span>
          </div>

          {historyQuery.isPending ? (
            <div style={{ textAlign: "center", padding: 40, color: MUTED }}>Loading...</div>
          ) : historyQuery.data?.generations?.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: MUTED, fontSize: 13 }}>
              No generations yet.
              <br />
              Fire your first one!
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, flex: 1 }}>
              {historyQuery.data?.generations?.map((gen: any) => (
                <div key={gen.id} style={{ position: "relative" }}>
                  {gen.outputUrls?.[0] ? (
                    <button
                      onClick={() => {
                        setOutputImages(gen.outputUrls);
                        setSelectedOutput(0);
                        setGenStatus("succeeded");
                        setGenError("");
                      }}
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        borderRadius: 8,
                        overflow: "hidden",
                        border: `1px solid ${BORDER}`,
                        cursor: "pointer",
                        padding: 0,
                        background: SURFACE,
                        position: "relative",
                      }}
                    >
                      <img
                        src={gen.outputUrls[0]}
                        alt={gen.prompt}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        loading="lazy"
                      />
                      {gen.savedToVault && (
                        <div
                          style={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: CYAN,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                          }}
                        >
                          💎
                        </div>
                      )}
                    </button>
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        borderRadius: 8,
                        background: SURFACE,
                        border: `1px solid ${BORDER}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        color:
                          gen.status === "failed"
                            ? "#FF4444"
                            : gen.status === "processing" || gen.status === "starting"
                              ? CYAN
                              : MUTED,
                      }}
                    >
                      {gen.status === "failed"
                        ? "✕"
                        : gen.status === "processing" || gen.status === "starting"
                          ? "◌"
                          : "—"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {(historyQuery.data?.total || 0) > 20 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px solid ${BORDER}`,
              }}
            >
              <button
                disabled={vaultPage === 0}
                onClick={() => setVaultPage((p) => Math.max(0, p - 1))}
                style={{
                  ...navBtnStyle,
                  opacity: vaultPage === 0 ? 0.3 : 1,
                }}
              >
                ← Prev
              </button>
              <button
                disabled={(vaultPage + 1) * 20 >= (historyQuery.data?.total || 0)}
                onClick={() => setVaultPage((p) => p + 1)}
                style={{
                  ...navBtnStyle,
                  opacity:
                    (vaultPage + 1) * 20 >= (historyQuery.data?.total || 0) ? 0.3 : 1,
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── CSS Animations ─────────────────────────────────────────── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        input[type="range"] {
          -webkit-appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: ${BORDER};
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${CYAN};
          cursor: pointer;
          border: 2px solid ${BG};
        }
        textarea:focus, input:focus {
          outline: none;
          border-color: ${CYAN}66 !important;
          box-shadow: 0 0 0 2px ${CYAN}15;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${BORDER}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${MUTED}; }
      `}</style>
    </div>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.1em",
  color: MUTED,
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: `1px solid ${BORDER}`,
  background: SURFACE,
  color: "#fff",
  fontSize: 14,
  boxSizing: "border-box",
};

const sliderStyle: React.CSSProperties = {
  width: "100%",
  cursor: "pointer",
};

const actionBtnStyle: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 10,
  border: `1px solid ${CYAN}33`,
  background: `${CYAN}10`,
  color: CYAN,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.05em",
  cursor: "pointer",
};

const navBtnStyle: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 6,
  border: `1px solid ${BORDER}`,
  background: SURFACE,
  color: "#aaa",
  fontSize: 12,
  cursor: "pointer",
};
