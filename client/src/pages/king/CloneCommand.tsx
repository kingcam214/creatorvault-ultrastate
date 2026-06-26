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

const KINGCAM_DEFAULT_SCENE_PROMPT =
  "dark throne room, velvet suit, gold chains, neon lighting, looking into camera";

const KINGCAM_FINAL_IDENTITY_NEGATIVE =
  "wrong hairstyle, invented hairstyle, generic AI haircut, unrequested natural hair fade, unrequested thick waves, " +
  "bald, shaved head, no hair, no crown, hat, beanie, hood, " +
  "wrong glasses, no sunglasses, plastic cheap frames, light skin, medium skin, thin build, " +
  "slim, lanky, no beard, clean shaven, large hoop earrings, oversized hoops, " +
  "big earrings, chunky earrings, dangling earrings, no earrings, studs, plain hoops without diamonds, no jewelry, no chain";

const KINGCAM_JEWELRY_DESCRIPTOR =
  "small diamond hoop earrings, tiny diamond hoops, small gold hoops with diamonds";

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
  const [prompt, setPrompt] = useState(KINGCAM_DEFAULT_SCENE_PROMPT);
  const [negativePrompt, setNegativePrompt] = useState(KINGCAM_FINAL_IDENTITY_NEGATIVE);
  const [preset, setPreset] = useState(0);
  const [numOutputs, setNumOutputs] = useState(1);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [steps, setSteps] = useState(28);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isPhone, setIsPhone] = useState(false);
  const [promptPreview, setPromptPreview] = useState<{ prompt: string; negativePrompt: string; safetyRule: string } | null>(null);
  const [promptPreviewApproved, setPromptPreviewApproved] = useState(false);

  // ─── State: Generation ──────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [activePredictionId, setActivePredictionId] = useState<string | null>(null);
  const [outputImages, setOutputImages] = useState<string[]>([]);
  const [selectedOutput, setSelectedOutput] = useState(0);
  const [genStatus, setGenStatus] = useState<string>("");
  const [genError, setGenError] = useState<string>("");
  const [genMetrics, setGenMetrics] = useState<any>(null);
  const [videoPrompt, setVideoPrompt] = useState("Premium motion teaser: slow luxury camera move, cinematic lighting, face consistency, confident creator-brand energy.");
  const [videoLength, setVideoLength] = useState<"5s" | "10s">("5s");
  const [videoResolution, setVideoResolution] = useState<"480p" | "720p" | "1080p">("720p");
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoTaskId, setVideoTaskId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<string>("");

  // ─── State: Vault ───────────────────────────────────────────────────
  const [vaultPage, setVaultPage] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── tRPC ───────────────────────────────────────────────────────────
  // @ts-ignore
  const previewPromptMutation = trpc.cloneCommand.previewImagePrompt.useMutation();
  // @ts-ignore
  const generateMutation = trpc.cloneCommand.generateImage.useMutation();
  // @ts-ignore
  const saveToVaultMutation = trpc.cloneCommand.saveToVault.useMutation();
  // @ts-ignore
  const setHeroMutation = trpc.cloneCommand.setHeroImage.useMutation();
  // @ts-ignore
  const generateVideoMutation = trpc.cloneCommand.generateCloneVideo.useMutation();

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

  // @ts-ignore
  const videoStatusQuery = trpc.cloneCommand.getCloneVideoStatus.useQuery(
    { taskId: videoTaskId! },
    { enabled: !!videoTaskId && videoGenerating, refetchInterval: 2500 },
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
      toast({ title: "Clone image ready", description: `${urls.length} shot${urls.length > 1 ? "s" : ""} ready to save, download, or turn into motion.` });
    } else if (status === "failed" || status === "canceled") {
      setGenError(error || "Generation failed");
      setGenerating(false);
      setActivePredictionId(null);
    }
  }, [statusQuery.data]);

  useEffect(() => {
    if (!videoStatusQuery.data) return;
    const { status, videoUrl: readyUrl } = videoStatusQuery.data;
    setVideoStatus(status);
    if (status === "succeed" && readyUrl) {
      setVideoUrl(readyUrl);
      setVideoGenerating(false);
      setVideoTaskId(null);
      toast({ title: "Clone video ready", description: "Your motion clone teaser is ready." });
    } else if (status === "failed") {
      setVideoGenerating(false);
      setVideoTaskId(null);
      toast({ title: "Clone video failed", variant: "destructive" });
    }
  }, [videoStatusQuery.data]);

  useEffect(() => {
    const syncPhoneLayout = () => setIsPhone(window.innerWidth < 900);
    syncPhoneLayout();
    window.addEventListener("resize", syncPhoneLayout);
    return () => window.removeEventListener("resize", syncPhoneLayout);
  }, []);

  useEffect(() => {
    setPromptPreview(null);
    setPromptPreviewApproved(false);
  }, [prompt, negativePrompt]);

  const handlePreviewPrompt = useCallback(async () => {
    if (!prompt.trim()) {
      toast({ title: "Enter a prompt", variant: "destructive" });
      return;
    }

    try {
      const preview = await previewPromptMutation.mutateAsync({
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
      });
      setPromptPreview(preview);
      setPromptPreviewApproved(false);
      toast({ title: "Final direction ready", description: "Review the shot plan before you spend a generation." });
    } catch (err: any) {
      toast({ title: "Preview error", description: err.message, variant: "destructive" });
    }
  }, [prompt, negativePrompt]);

  // ─── Generate handler ──────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast({ title: "Enter a prompt", variant: "destructive" });
      return;
    }

    if (!promptPreview || !promptPreviewApproved) {
      toast({
        title: "Preview the shot plan first",
        description: "Review and approve the final direction before creating the image.",
        variant: "destructive",
      });
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
      toast({ title: "Could not start", description: err.message, variant: "destructive" });
    }
  }, [prompt, negativePrompt, preset, numOutputs, guidanceScale, steps, promptPreview, promptPreviewApproved]);

  const handleGenerateVideo = useCallback(async () => {
    const imageUrl = outputImages[selectedOutput];
    if (!imageUrl) {
      toast({ title: "Generate an image first", description: "Clone video starts from the selected clone image.", variant: "destructive" });
      return;
    }
    setVideoGenerating(true);
    setVideoUrl(null);
    setVideoStatus("waiting");
    try {
      const result = await generateVideoMutation.mutateAsync({
        imageUrl,
        prompt: videoPrompt.trim() || undefined,
        resolution: videoResolution,
        length: videoLength,
        mode: "pro",
      });
      setVideoTaskId(result.taskId);
      setVideoStatus(result.status || "waiting");
      toast({ title: "Motion video started", description: "Your selected clone shot is being turned into a teaser." });
    } catch (err: any) {
      setVideoGenerating(false);
      toast({ title: "Motion video error", description: err.message, variant: "destructive" });
    }
  }, [outputImages, selectedOutput, videoPrompt, videoResolution, videoLength]);

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
        toast({ title: "Saved to your Vault" });
      } catch (err: any) {
        toast({ title: "Could not start", description: err.message, variant: "destructive" });
      }
    },
    [historyQuery.data],
  );

  // ─── Set hero image handler ────────────────────────────────────────
  const handleSetHero = useCallback(async (imageUrl: string) => {
    try {
      await setHeroMutation.mutateAsync({ imageUrl });
      toast({ title: "Hero image updated", description: "This shot can now headline the experience." });
    } catch (err: any) {
      toast({ title: "Could not start", description: err.message, variant: "destructive" });
    }
  }, []);

  // ─── Status indicator ──────────────────────────────────────────────
  const statusColor =
    genStatus === "succeeded"
      ? "#00FF88"
      : genStatus === "failed" || genStatus === "canceled"
        ? "#FF4444"
        : CYAN;

  const creatorStatus = genError
    || (genStatus === "starting"
      ? "Setting up your shot"
      : genStatus === "processing"
        ? "Creating your clone image"
        : genStatus === "succeeded"
          ? "Ready to use"
          : genStatus
            ? genStatus.replace(/_/g, " ")
            : "");

  const workflowSteps = [
    { label: "1. Scene", help: "Tell the studio what the shot should look and feel like." },
    { label: "2. Preview", help: "Review the final direction before you spend a generation." },
    { label: "3. Create", help: "Generate the clone image and pick the strongest result." },
    { label: "4. Move", help: "Turn the winning image into a short motion teaser." },
  ];

  return (
    <div
      style={{
        background: BG,
        minHeight: "100vh",
        color: "#fff",
        fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <video src="/videos/platform/clone-command-hero.mp4" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.24, pointerEvents: "none" }} muted autoPlay loop playsInline preload="metadata" />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(180deg, rgba(0,0,0,.64), rgba(0,0,0,.9))" }} />
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div
        style={{
          padding: isPhone ? "18px 16px 14px" : "24px 32px 16px",
          borderBottom: `1px solid ${BORDER}`,
          display: "flex",
          alignItems: isPhone ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: isPhone ? 12 : 16,
          flexWrap: "wrap",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: isPhone ? 12 : 16 }}>
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
              Clone Command Studio
            </h1>
            <p style={{ fontSize: 12, color: MUTED, margin: 0, marginTop: 2 }}>
              Create the image, then turn it into motion — built for phone-first creators.
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
              CREATING
            </span>
          </div>
        )}
      </div>

      {/* ─── Main 3-Panel Layout ────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isPhone ? "1fr" : "320px 1fr 300px",
          height: isPhone ? "auto" : "calc(100vh - 90px)",
          overflow: isPhone ? "visible" : "hidden",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* ═══ LEFT PANEL: Controls ═══ */}
        <div
          style={{
            borderRight: isPhone ? "none" : `1px solid ${BORDER}`,
            borderBottom: isPhone ? `1px solid ${BORDER}` : "none",
            padding: isPhone ? 16 : 20,
            overflowY: isPhone ? "visible" : "auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ padding: 14, background: "linear-gradient(135deg, rgba(0,217,255,0.10), rgba(255,255,255,0.025))", borderRadius: 14, border: `1px solid ${CYAN}22` }}>
            <label style={{ ...labelStyle, color: CYAN }}>YOUR PHONE-FIRST FLOW</label>
            <div style={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr", gap: 8 }}>
              {workflowSteps.map((step) => (
                <div key={step.label} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(0,0,0,0.28)", border: `1px solid ${BORDER}` }}>
                  <div style={{ color: "#fff", fontSize: 12, fontWeight: 800, marginBottom: 4 }}>{step.label}</div>
                  <div style={{ color: "#888", fontSize: 11, lineHeight: 1.45 }}>{step.help}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label style={labelStyle}>DESCRIBE THE SCENE</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: luxury penthouse at night, confident eye contact, cinematic neon, premium creator-brand energy. Add hairstyle, outfit, jewelry, mood, and camera angle."
              rows={5}
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: 100,
                fontFamily: "inherit",
              }}
            />
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                color: "var(--text-muted)",
                marginTop: 4,
              }}
            >
              Creator tip: include the hairstyle, outfit, expression, setting, camera angle, and mood you want. The identity rules protect the look you describe.
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
              The clone identity is added automatically, so you can focus on the scene and creative direction.
            </div>
          </div>

          {/* Jewelry Identity Descriptor */}
          <div>
            <label style={labelStyle}>LOCK THE SIGNATURE DETAILS</label>
            <textarea
              value={KINGCAM_JEWELRY_DESCRIPTOR}
              readOnly
              rows={2}
              style={{
                ...inputStyle,
                resize: "vertical",
                fontFamily: "inherit",
                color: CYAN,
                border: `1px solid ${CYAN}33`,
                background: "rgba(0,217,255,0.06)",
              }}
            />
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4, lineHeight: 1.45 }}>
              These details help keep the clone recognizable and consistent from image to video.
            </div>
          </div>

          {/* Negative Prompt */}
          <div>
            <label style={labelStyle}>KEEP OUT OF THE SHOT</label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Anything you do not want: wrong hair, cheap lighting, extra fingers, blurry face, bad jewelry, off-brand outfit..."
              rows={2}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </div>

          {/* Aspect Ratio Presets */}
          <div>
            <label style={labelStyle}>FORMAT</label>
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
            <label style={labelStyle}>HOW MANY OPTIONS?</label>
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

          {/* Clone Video Controls */}
          <div style={{ padding: 14, background: "linear-gradient(135deg, rgba(0,217,255,0.10), rgba(255,255,255,0.03))", borderRadius: 12, border: `1px solid ${CYAN}22`, display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ ...labelStyle, color: CYAN }}>TURN THE BEST SHOT INTO MOTION</label>
            <textarea
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              rows={3}
              placeholder="Example: slow luxury push-in, confident glance, neon glow, premium teaser energy..."
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", minHeight: 76 }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <select value={videoResolution} onChange={(e) => setVideoResolution(e.target.value as any)} style={inputStyle}>
                <option value="480p">480p Fast</option>
                <option value="720p">720p Premium</option>
                <option value="1080p">1080p Hero</option>
              </select>
              <select value={videoLength} onChange={(e) => setVideoLength(e.target.value as any)} style={inputStyle}>
                <option value="5s">5s Teaser</option>
                <option value="10s">10s Hero Clip</option>
              </select>
            </div>
            <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>First create a clone image. Then choose your favorite shot and create a motion teaser right here.</div>
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
            FINE-TUNE THE SHOT
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
                  <label style={{ ...labelStyle, margin: 0 }}>CREATIVE STRENGTH</label>
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
                  <label style={{ ...labelStyle, margin: 0 }}>DETAIL LEVEL</label>
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

          {/* No-credit final prompt preview */}
          <div style={{ padding: 14, background: SURFACE, borderRadius: 12, border: `1px solid ${promptPreviewApproved ? CYAN : BORDER}`, display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ ...labelStyle, color: CYAN }}>PREVIEW THE FINAL DIRECTION</label>
            <button
              onClick={handlePreviewPrompt}
              disabled={previewPromptMutation.isPending || generating || !prompt.trim()}
              style={{
                padding: "12px 12px", minHeight: 44,
                borderRadius: 8,
                border: `1px solid ${CYAN}55`,
                background: "rgba(0,217,255,0.08)",
                color: CYAN,
                fontSize: 12,
                fontWeight: 800,
                cursor: previewPromptMutation.isPending ? "wait" : "pointer",
                letterSpacing: "0.05em",
              }}
            >
              {previewPromptMutation.isPending ? "PREPARING PREVIEW..." : "PREVIEW MY SHOT PLAN"}
            </button>
            {promptPreview && (
              <>
                <div style={{ maxHeight: 150, overflowY: "auto", whiteSpace: "pre-wrap", fontSize: 11, lineHeight: 1.5, color: "#ddd", background: "#050505", border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10 }}>
                  {promptPreview.prompt}
                  {"\n\nNEGATIVE: "}{promptPreview.negativePrompt}
                </div>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: "#ccc", lineHeight: 1.45 }}>
                  <input
                    type="checkbox"
                    checked={promptPreviewApproved}
                    onChange={(e) => setPromptPreviewApproved(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  I reviewed the final shot direction. It matches the look, hairstyle, and creator-brand details I want.
                </label>
              </>
            )}
            <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.45 }}>
              This protects you from spending a generation before the shot direction looks right.
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim() || !promptPreviewApproved}
            style={{
              width: "100%",
              padding: "16px 0", minHeight: 52,
              borderRadius: 12,
              border: "none",
              background: generating || !promptPreviewApproved
                ? SURFACE2
                : `linear-gradient(135deg, ${CYAN}, #0099BB)`,
              color: generating || !promptPreviewApproved ? MUTED : "#000",
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "0.08em",
              cursor: generating || !promptPreviewApproved ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              marginTop: "auto",
            }}
          >
            {generating ? "CREATING YOUR CLONE..." : promptPreviewApproved ? "CREATE MY CLONE IMAGE" : "PREVIEW THE SHOT PLAN FIRST"}
          </button>
        </div>

        {/* ═══ CENTER PANEL: Output Stage ═══ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: isPhone ? 16 : 24,
            overflow: isPhone ? "visible" : "hidden",
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
              {creatorStatus.toUpperCase()}
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
                    maxHeight: isPhone ? "72vh" : "calc(100vh - 260px)",
                    borderRadius: 12,
                    border: `1px solid ${BORDER}`,
                    objectFit: "contain",
                    boxShadow: `0 0 40px ${CYAN}15`,
                  }}
                />
              </div>

              {videoUrl && (
                <div style={{ width: "min(520px, 100%)", border: `1px solid ${CYAN}33`, borderRadius: 12, padding: 10, background: `${CYAN}08` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ color: CYAN, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em" }}>MOTION TEASER READY</span>
                    <a href={videoUrl} target="_blank" rel="noreferrer" style={{ color: CYAN, fontSize: 11, fontWeight: 700 }}>OPEN TEASER</a>
                  </div>
                  <video src={videoUrl} controls playsInline style={{ width: "100%", maxHeight: 260, borderRadius: 10, background: "#000" }} />
                </div>
              )}
              {videoGenerating && (
                <div style={{ color: CYAN, fontSize: 12, fontWeight: 700 }}>Motion teaser: {videoStatus === "waiting" ? "getting ready" : videoStatus || "getting ready"}</div>
              )}

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
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%", justifyContent: "center" }}>
                <button
                  onClick={() => handleSaveToVault(outputImages[selectedOutput])}
                  style={{ ...actionBtnStyle, flex: isPhone ? "1 1 100%" : undefined }}
                >
                  💎 SAVE TO VAULT
                </button>
                <button
                  onClick={() => handleSetHero(outputImages[selectedOutput])}
                  style={{ ...actionBtnStyle, borderColor: "#FFD70044", color: "#FFD700", flex: isPhone ? "1 1 100%" : undefined }}
                >
                  👑 SET AS HERO
                </button>
                <button
                  onClick={handleGenerateVideo}
                  disabled={videoGenerating}
                  style={{ ...actionBtnStyle, borderColor: `${CYAN}55`, color: CYAN, flex: isPhone ? "1 1 100%" : undefined }}
                >
                  {videoGenerating ? "MAKING MOTION TEASER" : "CREATE MOTION TEASER"}
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
                    justifyContent: "center",
                    flex: isPhone ? "1 1 100%" : undefined,
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
                Creating your clone image...
              </p>
              <p style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>
                {genStatus === "starting"
                  ? "Setting up the shot..."
                  : genStatus === "processing"
                    ? "Building the image now..."
                    : "Preparing your studio..."}
              </p>
            </div>
          ) : (
            /* Empty state */
            <div style={{ textAlign: "center", maxWidth: 520 }}>
              <video
                src="/videos/platform/clone-command-hero.mp4"
                aria-label="Clone Command ambient throne-room loop representing persona selection, scenario prompt, approval gate, motion render, and vault save"
                style={{
                  width: "100%",
                  aspectRatio: "9 / 16",
                  maxHeight: 430,
                  objectFit: "cover",
                  borderRadius: 22,
                  border: `1px solid ${CYAN}33`,
                  boxShadow: `0 24px 70px rgba(0,0,0,0.42)`,
                  margin: "0 auto 22px",
                }}
                muted
                autoPlay
                loop
                playsInline
                preload="metadata"
              />
              <p style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
                Ready to create your first shot
              </p>
              <p style={{ fontSize: 13, color: MUTED, marginTop: 8, lineHeight: 1.6 }}>
                Choose a persona, shape the scenario prompt, approve the generated frame, then move the winner into motion and save it back to the vault.
              </p>
            </div>
          )}
        </div>

        {/* ═══ RIGHT PANEL: Vault History ═══ */}
        <div
          style={{
            borderLeft: isPhone ? "none" : `1px solid ${BORDER}`,
            borderTop: isPhone ? `1px solid ${BORDER}` : "none",
            padding: isPhone ? 16 : 16,
            overflowY: isPhone ? "visible" : "auto",
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
              RECENT SHOTS
            </h2>
            <span style={{ fontSize: 11, color: MUTED }}>
              {historyQuery.data?.total || 0} total
            </span>
          </div>

          {historyQuery.isPending ? (
            <div style={{ textAlign: "center", padding: 40, color: MUTED }}>Loading...</div>
          ) : historyQuery.data?.generations?.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: MUTED, fontSize: 13 }}>
              No shots yet.
              <br />
              Create your first clone image above.
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
  padding: "12px 18px",
  minHeight: 44,
  boxSizing: "border-box",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
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
  padding: "10px 14px",
  minHeight: 44,
  borderRadius: 6,
  border: `1px solid ${BORDER}`,
  background: SURFACE,
  color: "#aaa",
  fontSize: 12,
  cursor: "pointer",
};
