/**
 * ============================================================================
 * CLONE COMMAND CENTER — /clone/command-center
 * The world's most powerful AI creator clone platform.
 *
 * Beats HeyGen, Synthesia, ElevenLabs, Runway, Captions.ai by combining:
 *   - Multi-provider AI routing (Replicate, Runway, Luma, Pollo, MiniMax, ElevenLabs)
 *   - Real LoRA fine-tuning pipeline with training progress
 *   - Clone Passport — persistent identity/persona/voice/visual profile
 *   - Compliance Vault integration — every output is consent-gated
 *   - Talking Head synthesis — voice + face sync + video in one click
 *   - Full generation history across all types
 *   - Distribution to Vault, Telegram, VaultX, PPV, VIP feeds
 *   - Mobile-first responsive layout
 *
 * Layout (desktop): [Identity] [Controls] [Output Stage] [Training Lab] [History]
 * Layout (mobile):  Tabbed single-column
 * ============================================================================
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#080808",
  surface: "#111111",
  surface2: "#181818",
  surface3: "#1e1e1e",
  border: "#2a2a2a",
  borderAccent: "#c9a84c",
  text: "#f0ece4",
  muted: "rgba(240,236,228,0.55)",
  accent: "#c9a84c",
  accentDim: "rgba(201,168,76,0.15)",
  cyan: "#00d9ff",
  cyanDim: "rgba(0,217,255,0.12)",
  green: "#00e676",
  red: "#ff4444",
  purple: "#9c27b0",
  purpleDim: "rgba(156,39,176,0.15)",
};

// ─── Provider Colors ──────────────────────────────────────────────────────────
const PROVIDER_COLORS: Record<string, string> = {
  "replicate-fluxdevcam": "#00d9ff",
  "replicate-flux-dev": "#7c3aed",
  "pollo-v1-6": "#f59e0b",
  "runway-gen3": "#ec4899",
  "luma-dream-machine": "#10b981",
  "minimax-video": "#6366f1",
  "elevenlabs-voice": "#22d3ee",
};

// ─── Motion Style Labels ──────────────────────────────────────────────────────
const MOTION_STYLES = [
  { id: "vaultx_teaser", label: "VaultX Teaser", icon: "◈" },
  { id: "vip_invite", label: "VIP Invite", icon: "◆" },
  { id: "ppv_cover", label: "PPV Cover", icon: "◉" },
  { id: "brand_loop", label: "Brand Loop", icon: "◎" },
  { id: "course_intro", label: "Course Intro", icon: "◐" },
  { id: "sales_pitch", label: "Sales Pitch", icon: "◑" },
] as const;

// ─── Tab Definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: "identity", label: "Identity", icon: "◈" },
  { id: "generate", label: "Generate", icon: "⚡" },
  { id: "output", label: "Output", icon: "▶" },
  { id: "training", label: "Training", icon: "◉" },
  { id: "history", label: "History", icon: "◎" },
] as const;
type Tab = typeof TABS[number]["id"];

// ─── Consent Types ────────────────────────────────────────────────────────────
const CONSENT_TYPES = [
  { id: "ai_transformation", label: "AI Transformation", desc: "Allow AI to transform your likeness" },
  { id: "monetization", label: "Monetization", desc: "Allow monetization of clone outputs" },
  { id: "distribution", label: "Distribution", desc: "Allow distribution to platforms" },
  { id: "voice_clone", label: "Voice Clone", desc: "Allow AI voice synthesis" },
  { id: "likeness", label: "Likeness Rights", desc: "Allow use of your likeness for training" },
] as const;

// ─── Polling statuses ─────────────────────────────────────────────────────────
const POLLING = new Set(["queued", "processing", "starting", "waiting", "running", "in_progress", "pending"]);

export default function CloneCommandCenter() {
  const { user } = useAuth();
  const { toast } = useToast();

  // ─── Layout ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("generate");
  const [isPhone, setIsPhone] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const sync = () => {
      setIsPhone(window.innerWidth < 768);
      setIsTablet(window.innerWidth < 1280);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  // ─── Generation State ──────────────────────────────────────────────────────
  const [genMode, setGenMode] = useState<"image" | "video" | "voice" | "talking_head">("image");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [imageProvider, setImageProvider] = useState("replicate-fluxdevcam");
  const [videoProvider, setVideoProvider] = useState("pollo-v1-6");
  const [motionStyle, setMotionStyle] = useState<typeof MOTION_STYLES[number]["id"]>("vaultx_teaser");
  const [resolution, setResolution] = useState<"480p" | "720p" | "1080p">("720p");
  const [videoLength, setVideoLength] = useState<"5s" | "10s">("5s");
  const [numOutputs, setNumOutputs] = useState(1);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [inferenceSteps, setInferenceSteps] = useState(28);
  const [previewApproved, setPreviewApproved] = useState(false);
  const [promptPreview, setPromptPreview] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ─── Source Image ──────────────────────────────────────────────────────────
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState("");
  const [sourceImagePreview, setSourceImagePreview] = useState("");

  // ─── Voice/Talking Head ───────────────────────────────────────────────────
  const [script, setScript] = useState("");
  const [talkingHeadStyle, setTalkingHeadStyle] = useState<"studio" | "street" | "course" | "sales" | "tour">("studio");

  // ─── Output State ─────────────────────────────────────────────────────────
  const [activeJobId, setActiveJobId] = useState("");
  const [activeJobType, setActiveJobType] = useState<"image" | "video" | "voice" | "talking_head">("image");
  const [activeProvider, setActiveProvider] = useState("");
  const [jobStatus, setJobStatus] = useState("idle");
  const [outputImages, setOutputImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [outputVideoUrl, setOutputVideoUrl] = useState("");
  const [outputAudioUrl, setOutputAudioUrl] = useState("");
  const [costPreview, setCostPreview] = useState<any>(null);

  // ─── Training State ───────────────────────────────────────────────────────
  const [trainingJobId, setTrainingJobId] = useState("");
  const [triggerWord, setTriggerWord] = useState("fluxdevCam");
  const [trainingSteps, setTrainingSteps] = useState(1000);
  const [trainingProvider, setTrainingProvider] = useState<"replicate" | "local">("replicate");
  const [trainingStatus, setTrainingStatus] = useState("idle");

  // ─── Consent State ────────────────────────────────────────────────────────
  const [consents, setConsents] = useState<Record<string, boolean>>({});

  // ─── History Pagination ───────────────────────────────────────────────────
  const [historyType, setHistoryType] = useState<"all" | "image" | "video" | "talking_head">("all");
  const [historyPage, setHistoryPage] = useState(0);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);

  // ─── tRPC Queries ─────────────────────────────────────────────────────────
  // @ts-ignore
  const providersQuery = (trpc as any).cloneEngine.getProviders.useQuery();
  // @ts-ignore
  const cloneQuery = (trpc as any).cloneEngine.getClone.useQuery({ cloneId: undefined });
  // @ts-ignore
  const historyQuery = (trpc as any).cloneEngine.getHistory.useQuery(
    { type: historyType, limit: 20, offset: historyPage * 20 },
    { keepPreviousData: true }
  );
  // @ts-ignore
  const eligibilityQuery = (trpc as any).cloneEngine.checkEligibility.useQuery(
    { exportType: "public" },
    { enabled: !!user }
  );

  // ─── tRPC Mutations ───────────────────────────────────────────────────────
  // @ts-ignore
  const generateImageMut = (trpc as any).cloneEngine.generateImage.useMutation();
  // @ts-ignore
  const generateVideoMut = (trpc as any).cloneEngine.generateVideo.useMutation();
  // @ts-ignore
  const generateVoiceMut = (trpc as any).cloneEngine.generateVoice.useMutation();
  // @ts-ignore
  const generateTalkingHeadMut = (trpc as any).cloneEngine.generateTalkingHead.useMutation();
  // @ts-ignore
  const saveToVaultMut = (trpc as any).cloneEngine.saveToVault.useMutation();
  // @ts-ignore
  const startTrainingMut = (trpc as any).cloneEngine.startTraining.useMutation();
  // @ts-ignore
  const promoteModelMut = (trpc as any).cloneEngine.promoteModel.useMutation();
  // @ts-ignore
  const recordConsentMut = (trpc as any).cloneEngine.recordConsent.useMutation();
  // @ts-ignore
  const distributeContentMut = (trpc as any).cloneEngine.distributeContent.useMutation();
  // @ts-ignore
  const uploadMut = (trpc as any).content?.upload?.useMutation?.() || { mutateAsync: async () => ({ url: "" }) };

  // ─── Status Polling ───────────────────────────────────────────────────────
  // @ts-ignore
  const statusQuery = (trpc as any).cloneEngine.getGenerationStatus.useQuery(
    { generationType: activeJobType, id: activeJobId, provider: activeProvider },
    {
      enabled: !!activeJobId && POLLING.has(jobStatus.toLowerCase()),
      refetchInterval: (data: any) => {
        const s = String(data?.status || jobStatus || "").toLowerCase();
        return POLLING.has(s) ? 2500 : false;
      },
    }
  );

  // @ts-ignore
  const trainingStatusQuery = (trpc as any).cloneEngine.getTrainingStatus.useQuery(
    { jobId: trainingJobId },
    {
      enabled: !!trainingJobId && ["queued", "running"].includes(trainingStatus),
      refetchInterval: 5000,
    }
  );

  // ─── Status Effect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!statusQuery.data) return;
    const { status, output, videoUrl, audioUrl, error } = statusQuery.data as any;
    setJobStatus(status || "idle");

    if (status === "succeeded") {
      if (output) {
        const urls = Array.isArray(output) ? output : [output];
        setOutputImages(urls);
        setSelectedImage(0);
        setActiveTab("output");
        toast({ title: "Clone image ready", description: `${urls.length} shot${urls.length > 1 ? "s" : ""} generated.` });
      }
      if (videoUrl) {
        setOutputVideoUrl(videoUrl);
        setActiveTab("output");
        toast({ title: "Clone video ready", description: "Your motion clone is ready." });
      }
      if (audioUrl) {
        setOutputAudioUrl(audioUrl);
        setActiveTab("output");
        toast({ title: "Voice clone ready" });
      }
      void historyQuery.refetch();
    } else if (status === "failed") {
      toast({ title: "Generation failed", description: error || "Unknown error", variant: "destructive" });
    }
  }, [statusQuery.data]);

  useEffect(() => {
    if (!trainingStatusQuery.data) return;
    const { status } = trainingStatusQuery.data as any;
    setTrainingStatus(status || "idle");
    if (status === "succeeded") {
      toast({ title: "Training complete!", description: "Your LoRA model is ready to promote." });
    } else if (status === "failed") {
      toast({ title: "Training failed", variant: "destructive" });
    }
  }, [trainingStatusQuery.data]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handlePickImage = useCallback((file: File | null) => {
    if (!file) return;
    setSourceImageFile(file);
    setSourceImageUrl("");
    setSourceImagePreview(URL.createObjectURL(file));
  }, []);

  const handlePreviewPrompt = useCallback(async () => {
    if (!prompt.trim()) { toast({ title: "Enter a prompt", variant: "destructive" }); return; }
    try {
      const preview = await generateImageMut.mutateAsync({
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        provider: imageProvider as any,
        previewOnly: true,
      });
      setPromptPreview(preview);
      setPreviewApproved(false);
      setCostPreview(preview.cost);
    } catch (err: any) {
      toast({ title: "Preview error", description: err.message, variant: "destructive" });
    }
  }, [prompt, negativePrompt, imageProvider]);

  const handleGenerate = useCallback(async () => {
    setOutputImages([]);
    setOutputVideoUrl("");
    setOutputAudioUrl("");
    setJobStatus("starting");

    try {
      if (genMode === "image") {
        if (!promptPreview || !previewApproved) {
          toast({ title: "Preview and approve the prompt first", variant: "destructive" });
          return;
        }
        const result = await generateImageMut.mutateAsync({
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim() || undefined,
          provider: imageProvider as any,
          width: 1024, height: 1024,
          numOutputs, guidanceScale, numInferenceSteps: inferenceSteps,
        });
        setActiveJobId(result.predictionId);
        setActiveJobType("image");
        setActiveProvider(imageProvider);
        setJobStatus(result.status || "starting");
        toast({ title: "Image generation started" });

      } else if (genMode === "video") {
        let finalImageUrl = sourceImageUrl;
        if (!finalImageUrl && sourceImageFile) {
          const uploaded = await uploadMut.mutateAsync({
            fileData: await toBase64(sourceImageFile),
            fileName: sourceImageFile.name,
            mimeType: sourceImageFile.type || "image/png",
            title: "Clone Source",
            contentType: "image",
          });
          finalImageUrl = String(uploaded?.url ?? "");
          setSourceImageUrl(finalImageUrl);
        }
        if (!finalImageUrl) { toast({ title: "Upload a source image first", variant: "destructive" }); return; }

        const result = await generateVideoMut.mutateAsync({
          imageUrl: finalImageUrl,
          prompt: prompt.trim() || undefined,
          motionStyle,
          provider: videoProvider as any,
          resolution,
          length: videoLength,
          mode: "pro",
        });
        setActiveJobId(result.taskId);
        setActiveJobType("video");
        setActiveProvider(videoProvider);
        setJobStatus("queued");
        toast({ title: "Video generation started", description: result.directorBrief?.provider });

      } else if (genMode === "voice") {
        if (!script.trim()) { toast({ title: "Enter a script", variant: "destructive" }); return; }
        const result = await generateVoiceMut.mutateAsync({ script: script.trim() });
        setOutputAudioUrl(result.audioUrl);
        setActiveJobType("voice");
        setJobStatus("succeeded");
        setActiveTab("output");
        toast({ title: "Voice generated", description: `${result.duration}s via ${result.provider}` });

      } else if (genMode === "talking_head") {
        if (!script.trim()) { toast({ title: "Enter a script", variant: "destructive" }); return; }
        const result = await generateTalkingHeadMut.mutateAsync({
          script: script.trim(),
          imageUrl: sourceImageUrl || undefined,
          style: talkingHeadStyle,
          videoProvider: videoProvider as any,
        });
        setActiveJobId(result.jobId);
        setActiveJobType("talking_head");
        setActiveProvider("composite");
        setJobStatus("rendering");
        toast({ title: "Talking head started", description: result.estimatedTime });
      }
    } catch (err: any) {
      setJobStatus("failed");
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    }
  }, [genMode, prompt, negativePrompt, imageProvider, videoProvider, motionStyle, resolution, videoLength,
      numOutputs, guidanceScale, inferenceSteps, sourceImageUrl, sourceImageFile, script, talkingHeadStyle,
      promptPreview, previewApproved]);

  const handleSaveToVault = useCallback(async (url: string, type: string) => {
    try {
      await saveToVaultMut.mutateAsync({ generationType: type as any, outputUrl: url, tags: ["clone"] });
      toast({ title: "Saved to Vault" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  }, []);

  const handleRecordConsent = useCallback(async (consentType: string) => {
    try {
      await recordConsentMut.mutateAsync({ consentType: consentType as any });
      setConsents(prev => ({ ...prev, [consentType]: true }));
      toast({ title: "Consent recorded", description: consentType });
    } catch (err: any) {
      toast({ title: "Consent error", description: err.message, variant: "destructive" });
    }
  }, []);

  const handleStartTraining = useCallback(async () => {
    if (!triggerWord.trim()) { toast({ title: "Enter a trigger word", variant: "destructive" }); return; }
    try {
      const result = await startTrainingMut.mutateAsync({
        cloneId: "kingcam",
        triggerWord: triggerWord.trim(),
        steps: trainingSteps,
        provider: trainingProvider,
      });
      setTrainingJobId(result.jobId);
      setTrainingStatus("queued");
      toast({ title: "Training started", description: result.estimatedTime });
    } catch (err: any) {
      toast({ title: "Training failed", description: err.message, variant: "destructive" });
    }
  }, [triggerWord, trainingSteps, trainingProvider]);

  const handleDistribute = useCallback(async (url: string, type: string, channels: string[]) => {
    try {
      await distributeContentMut.mutateAsync({
        assetUrl: url,
        assetType: type as any,
        channels: channels as any,
      });
      toast({ title: "Queued for distribution", description: channels.join(", ") });
    } catch (err: any) {
      toast({ title: "Distribution failed", description: err.message, variant: "destructive" });
    }
  }, []);

  // ─── Providers from backend ───────────────────────────────────────────────
  const providers: any[] = providersQuery.data?.providers || [];
  const imageProviders = providers.filter((p: any) => p.type === "image");
  const videoProviders = providers.filter((p: any) => p.type === "video");

  // ─── Status Color ─────────────────────────────────────────────────────────
  const statusColor = jobStatus === "succeeded" ? T.green : jobStatus === "failed" ? T.red : T.cyan;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter', -apple-system, sans-serif", position: "relative" }}>
      {/* Background ambient video */}
      <video
        src="/videos/platform/clone-command-hero.mp4"
        aria-hidden="true"
        muted autoPlay loop playsInline preload="metadata"
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.08, pointerEvents: "none", zIndex: 0 }}
      />
      <div style={{ position: "fixed", inset: 0, background: "linear-gradient(180deg, rgba(8,8,8,0.85) 0%, rgba(8,8,8,0.97) 100%)", pointerEvents: "none", zIndex: 1 }} />

      <div style={{ position: "relative", zIndex: 2 }}>
        {/* ─── Header ──────────────────────────────────────────────────── */}
        <header style={{
          padding: isPhone ? "14px 16px" : "18px 28px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, #8b6914)`, display: "grid", placeItems: "center", fontSize: 20 }}>◈</div>
            <div>
              <h1 style={{ margin: 0, fontSize: isPhone ? 18 : 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: T.text }}>Clone Command Center</h1>
              <p style={{ margin: 0, fontSize: 11, color: T.muted }}>Multi-provider AI · LoRA Training · Voice Clone · Talking Head · Distribution</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Provider status badges */}
            {!isPhone && providers.slice(0, 4).map((p: any) => (
              <span key={p.id} style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 4,
                background: p.status === "active" ? "rgba(0,230,118,0.12)" : "rgba(255,68,68,0.12)",
                color: p.status === "active" ? T.green : T.red,
                border: `1px solid ${p.status === "active" ? "rgba(0,230,118,0.3)" : "rgba(255,68,68,0.3)"}`,
              }}>
                {p.name.split("—")[0].trim()} {p.status === "active" ? "●" : "○"}
              </span>
            ))}
            <span style={{
              fontSize: 11, padding: "4px 10px", borderRadius: 4,
              background: jobStatus === "succeeded" ? "rgba(0,230,118,0.12)" : jobStatus === "failed" ? "rgba(255,68,68,0.12)" : T.cyanDim,
              color: statusColor,
              border: `1px solid ${statusColor}40`,
            }}>
              {jobStatus === "idle" ? "Ready" : jobStatus.charAt(0).toUpperCase() + jobStatus.slice(1)}
            </span>
          </div>
        </header>

        {/* ─── Mobile Tab Bar ───────────────────────────────────────────── */}
        {(isPhone || isTablet) && (
          <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, background: T.surface, overflowX: "auto" }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, minWidth: 70, padding: "12px 8px", border: "none", cursor: "pointer",
                  background: activeTab === tab.id ? T.accentDim : "transparent",
                  color: activeTab === tab.id ? T.accent : T.muted,
                  borderBottom: activeTab === tab.id ? `2px solid ${T.accent}` : "2px solid transparent",
                  fontSize: 11, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                }}>
                <span style={{ fontSize: 16 }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ─── Main Grid ───────────────────────────────────────────────── */}
        <div style={{
          display: isPhone || isTablet ? "block" : "grid",
          gridTemplateColumns: "280px minmax(0,1fr) minmax(0,1.4fr) 280px 280px",
          gap: 0,
          minHeight: "calc(100vh - 80px)",
        }}>

          {/* ═══════════════════════════════════════════════════════════════
              PANEL 1: CLONE IDENTITY
          ═══════════════════════════════════════════════════════════════ */}
          {(!isPhone && !isTablet) || activeTab === "identity" ? (
            <aside style={{ borderRight: `1px solid ${T.border}`, padding: 16, overflowY: "auto", maxHeight: "calc(100vh - 80px)" }}>
              <SectionHeader icon="◈" label="Clone Identity" color={T.accent} />

              {/* Clone Profile */}
              <div style={card()}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>Active Clone</div>
                {cloneQuery.data?.profile ? (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{cloneQuery.data.profile.name || "KingCam"}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                      Trigger: <span style={{ color: T.cyan }}>{cloneQuery.data.profile.trigger_word || "fluxdevCam"}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: T.muted }}>Loading profile...</div>
                )}
              </div>

              {/* Stats */}
              {cloneQuery.data?.stats && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {[
                    { label: "Images", value: cloneQuery.data.stats.totalImages },
                    { label: "Videos", value: cloneQuery.data.stats.totalVideos },
                    { label: "Training", value: cloneQuery.data.stats.totalTrainingJobs },
                    { label: "Models", value: cloneQuery.data.activeModels?.length || 0 },
                  ].map(s => (
                    <div key={s.label} style={{ ...card(), textAlign: "center", padding: "10px 8px" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: T.accent }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: T.muted }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Models */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>Production Models</div>
                {(cloneQuery.data?.activeModels || []).length === 0 ? (
                  <div style={{ fontSize: 11, color: T.muted, padding: "8px 0" }}>No promoted models yet. Train and promote a model to activate it.</div>
                ) : (
                  (cloneQuery.data?.activeModels || []).map((m: any) => (
                    <div key={m.id} style={{ ...card(), marginBottom: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{m.label || "v1"}</div>
                      <div style={{ fontSize: 10, color: T.green }}>● Production</div>
                    </div>
                  ))
                )}
              </div>

              {/* Compliance Consent */}
              <SectionHeader icon="◉" label="Compliance Vault" color={T.green} />
              <div style={{ marginBottom: 12 }}>
                {CONSENT_TYPES.map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{c.label}</div>
                      <div style={{ fontSize: 10, color: T.muted }}>{c.desc}</div>
                    </div>
                    <button
                      onClick={() => handleRecordConsent(c.id)}
                      disabled={consents[c.id] || recordConsentMut.isPending}
                      style={{
                        padding: "4px 10px", fontSize: 10, borderRadius: 4, border: "none", cursor: "pointer",
                        background: consents[c.id] ? "rgba(0,230,118,0.15)" : T.accentDim,
                        color: consents[c.id] ? T.green : T.accent,
                      }}>
                      {consents[c.id] ? "✓ Signed" : "Sign"}
                    </button>
                  </div>
                ))}
              </div>

              {/* Eligibility */}
              {eligibilityQuery.data && (
                <div style={{ ...card(), borderColor: eligibilityQuery.data.eligible ? "rgba(0,230,118,0.3)" : "rgba(255,68,68,0.3)" }}>
                  <div style={{ fontSize: 11, color: eligibilityQuery.data.eligible ? T.green : T.red, fontWeight: 600 }}>
                    {eligibilityQuery.data.eligible ? "✓ Eligible for export" : "⚠ Missing consents"}
                  </div>
                  {!eligibilityQuery.data.eligible && (
                    <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>
                      Required: {eligibilityQuery.data.missingConsents?.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </aside>
          ) : null}

          {/* ═══════════════════════════════════════════════════════════════
              PANEL 2: GENERATION CONTROLS
          ═══════════════════════════════════════════════════════════════ */}
          {(!isPhone && !isTablet) || activeTab === "generate" ? (
            <section style={{ borderRight: `1px solid ${T.border}`, padding: 16, overflowY: "auto", maxHeight: "calc(100vh - 80px)" }}>
              <SectionHeader icon="⚡" label="Generate" color={T.cyan} />

              {/* Mode Selector */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
                {(["image", "video", "voice", "talking_head"] as const).map(m => (
                  <button key={m} onClick={() => setGenMode(m)}
                    style={{
                      padding: "8px 4px", fontSize: 10, fontWeight: 700, borderRadius: 4, border: "none", cursor: "pointer",
                      background: genMode === m ? T.accentDim : T.surface2,
                      color: genMode === m ? T.accent : T.muted,
                      borderBottom: genMode === m ? `2px solid ${T.accent}` : "2px solid transparent",
                    }}>
                    {m === "talking_head" ? "HEAD" : m.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Image Generation Controls */}
              {genMode === "image" && (
                <>
                  <Label>Image Provider</Label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                    {(imageProviders.length > 0 ? imageProviders : [
                      { id: "replicate-fluxdevcam", name: "Replicate — FluxDevCam", status: "active" },
                      { id: "replicate-flux-dev", name: "Replicate — Flux Dev", status: "active" },
                    ]).map((p: any) => (
                      <button key={p.id} onClick={() => { setImageProvider(p.id); setPromptPreview(null); setPreviewApproved(false); }}
                        style={{
                          padding: "8px 6px", fontSize: 10, borderRadius: 4, border: "none", cursor: "pointer", textAlign: "left",
                          background: imageProvider === p.id ? `${PROVIDER_COLORS[p.id] || T.cyan}18` : T.surface2,
                          color: imageProvider === p.id ? (PROVIDER_COLORS[p.id] || T.cyan) : T.muted,
                          borderLeft: `3px solid ${imageProvider === p.id ? (PROVIDER_COLORS[p.id] || T.cyan) : "transparent"}`,
                        }}>
                        {p.name.split("—")[1]?.trim() || p.name}
                      </button>
                    ))}
                  </div>

                  <Label>Scene Prompt</Label>
                  <textarea value={prompt} onChange={e => { setPrompt(e.target.value); setPromptPreview(null); setPreviewApproved(false); }}
                    placeholder="dark throne room, velvet suit, gold chains, neon lighting, looking into camera..."
                    style={textarea()} />

                  <Label>Negative Prompt</Label>
                  <textarea value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)}
                    placeholder="Optional: describe what to avoid..."
                    style={{ ...textarea(), minHeight: 48 }} />

                  {/* Outputs & Dimensions */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                    <div>
                      <Label>Outputs</Label>
                      <select value={numOutputs} onChange={e => setNumOutputs(Number(e.target.value))} style={select()}>
                        {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Width</Label>
                      <select style={select()} defaultValue="1024">
                        {[512, 768, 1024, 1344].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Height</Label>
                      <select style={select()} defaultValue="1024">
                        {[512, 768, 1024, 1344].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Advanced Toggle */}
                  <button onClick={() => setShowAdvanced(!showAdvanced)}
                    style={{ ...ghostBtn(), marginBottom: 8 }}>
                    {showAdvanced ? "▲ Hide Advanced" : "▼ Advanced Settings"}
                  </button>

                  {showAdvanced && (
                    <div style={{ marginBottom: 12 }}>
                      <Label>Guidance Scale: {guidanceScale}</Label>
                      <input type="range" min={0} max={20} step={0.5} value={guidanceScale}
                        onChange={e => setGuidanceScale(Number(e.target.value))} style={{ width: "100%", marginBottom: 8 }} />
                      <Label>Inference Steps: {inferenceSteps}</Label>
                      <input type="range" min={1} max={50} step={1} value={inferenceSteps}
                        onChange={e => setInferenceSteps(Number(e.target.value))} style={{ width: "100%" }} />
                    </div>
                  )}

                  {/* Prompt Preview */}
                  {promptPreview && (
                    <div style={{ ...card(), marginBottom: 12, borderColor: previewApproved ? "rgba(0,230,118,0.4)" : T.borderAccent }}>
                      <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>Final Identity-Locked Prompt</div>
                      <div style={{ fontSize: 10, color: T.text, lineHeight: 1.5, maxHeight: 80, overflowY: "auto" }}>{promptPreview.finalPrompt}</div>
                      {promptPreview.cost && (
                        <div style={{ fontSize: 10, color: T.accent, marginTop: 6 }}>Cost: {promptPreview.cost.breakdown}</div>
                      )}
                      <button onClick={() => setPreviewApproved(true)} disabled={previewApproved}
                        style={{ marginTop: 8, ...primaryBtn(previewApproved ? T.green : T.accent), fontSize: 10, padding: "6px 12px" }}>
                        {previewApproved ? "✓ Approved — Ready to Generate" : "Approve & Unlock Generate"}
                      </button>
                    </div>
                  )}

                  <button onClick={handlePreviewPrompt} disabled={generateImageMut.isPending}
                    style={{ ...ghostBtn(), width: "100%", marginBottom: 8 }}>
                    Preview Identity-Locked Prompt
                  </button>
                </>
              )}

              {/* Video Generation Controls */}
              {genMode === "video" && (
                <>
                  <Label>Source Image</Label>
                  <label style={{ display: "block", border: `1px dashed ${T.border}`, borderRadius: 4, padding: 10, cursor: "pointer", marginBottom: 10 }}>
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => handlePickImage(e.target.files?.[0] ?? null)} />
                    <div style={{ fontSize: 11, color: T.muted }}>{sourceImageFile ? sourceImageFile.name : "Click to upload source image"}</div>
                  </label>
                  {sourceImagePreview && (
                    <img src={sourceImagePreview} alt="source" style={{ width: "100%", borderRadius: 4, marginBottom: 10, border: `1px solid ${T.border}` }} />
                  )}

                  <Label>Video Provider</Label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                    {(videoProviders.length > 0 ? videoProviders : [
                      { id: "pollo-v1-6", name: "Pollo v1.6", status: "active" },
                      { id: "runway-gen3", name: "Runway Gen-3", status: "active" },
                      { id: "luma-dream-machine", name: "Luma Dream", status: "active" },
                      { id: "minimax-video", name: "MiniMax Video", status: "active" },
                    ]).map((p: any) => (
                      <button key={p.id} onClick={() => setVideoProvider(p.id)}
                        style={{
                          padding: "8px 6px", fontSize: 10, borderRadius: 4, border: "none", cursor: "pointer", textAlign: "left",
                          background: videoProvider === p.id ? `${PROVIDER_COLORS[p.id] || T.accent}18` : T.surface2,
                          color: videoProvider === p.id ? (PROVIDER_COLORS[p.id] || T.accent) : T.muted,
                          borderLeft: `3px solid ${videoProvider === p.id ? (PROVIDER_COLORS[p.id] || T.accent) : "transparent"}`,
                        }}>
                        {p.name.split("—")[1]?.trim() || p.name}
                      </button>
                    ))}
                  </div>

                  <Label>Motion Style</Label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
                    {MOTION_STYLES.map(s => (
                      <button key={s.id} onClick={() => setMotionStyle(s.id)}
                        style={{
                          padding: "8px 4px", fontSize: 10, borderRadius: 4, border: "none", cursor: "pointer",
                          background: motionStyle === s.id ? T.accentDim : T.surface2,
                          color: motionStyle === s.id ? T.accent : T.muted,
                        }}>
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>

                  <Label>Custom Prompt (optional)</Label>
                  <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                    placeholder="Override motion prompt or leave blank to use preset..."
                    style={{ ...textarea(), minHeight: 60 }} />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                    <div>
                      <Label>Resolution</Label>
                      <select value={resolution} onChange={e => setResolution(e.target.value as any)} style={select()}>
                        {["480p", "720p", "1080p"].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Length</Label>
                      <select value={videoLength} onChange={e => setVideoLength(e.target.value as any)} style={select()}>
                        {["5s", "10s"].map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Voice Controls */}
              {(genMode === "voice" || genMode === "talking_head") && (
                <>
                  <Label>Script</Label>
                  <textarea value={script} onChange={e => setScript(e.target.value)}
                    placeholder="Enter the script for voice synthesis or talking head..."
                    style={{ ...textarea(), minHeight: 120 }} />

                  {genMode === "talking_head" && (
                    <>
                      <Label>Style</Label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
                        {(["studio", "street", "course", "sales", "tour"] as const).map(s => (
                          <button key={s} onClick={() => setTalkingHeadStyle(s)}
                            style={{
                              padding: "8px 4px", fontSize: 10, borderRadius: 4, border: "none", cursor: "pointer",
                              background: talkingHeadStyle === s ? T.accentDim : T.surface2,
                              color: talkingHeadStyle === s ? T.accent : T.muted,
                            }}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>

                      <Label>Video Provider</Label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
                        {["pollo-v1-6", "runway-gen3", "luma-dream-machine"].map(p => (
                          <button key={p} onClick={() => setVideoProvider(p)}
                            style={{
                              padding: "8px 4px", fontSize: 10, borderRadius: 4, border: "none", cursor: "pointer",
                              background: videoProvider === p ? T.accentDim : T.surface2,
                              color: videoProvider === p ? T.accent : T.muted,
                            }}>
                            {p.split("-")[0].charAt(0).toUpperCase() + p.split("-")[0].slice(1)}
                          </button>
                        ))}
                      </div>

                      <Label>Source Image (optional)</Label>
                      <label style={{ display: "block", border: `1px dashed ${T.border}`, borderRadius: 4, padding: 10, cursor: "pointer", marginBottom: 10 }}>
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => handlePickImage(e.target.files?.[0] ?? null)} />
                        <div style={{ fontSize: 11, color: T.muted }}>{sourceImageFile ? sourceImageFile.name : "Upload source image (uses env default if blank)"}</div>
                      </label>
                    </>
                  )}
                </>
              )}

              {/* Cost Preview */}
              {costPreview && (
                <div style={{ ...card(), marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: T.muted }}>Estimated Cost</div>
                  <div style={{ fontSize: 12, color: T.accent, fontWeight: 700 }}>{costPreview.breakdown}</div>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generateImageMut.isPending || generateVideoMut.isPending || generateVoiceMut.isPending || generateTalkingHeadMut.isPending}
                style={{ ...primaryBtn(T.accent), width: "100%", fontSize: 14, padding: "13px 16px", marginTop: 4 }}>
                {(generateImageMut.isPending || generateVideoMut.isPending || generateVoiceMut.isPending || generateTalkingHeadMut.isPending)
                  ? "Generating..." : `Generate ${genMode === "talking_head" ? "Talking Head" : genMode.charAt(0).toUpperCase() + genMode.slice(1)}`}
              </button>
            </section>
          ) : null}

          {/* ═══════════════════════════════════════════════════════════════
              PANEL 3: OUTPUT STAGE
          ═══════════════════════════════════════════════════════════════ */}
          {(!isPhone && !isTablet) || activeTab === "output" ? (
            <section style={{ borderRight: `1px solid ${T.border}`, padding: 16, overflowY: "auto", maxHeight: "calc(100vh - 80px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <SectionHeader icon="▶" label="Output Stage" color={T.text} />
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 4, background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}40` }}>
                  {jobStatus === "idle" ? "No active job" : jobStatus}
                </span>
              </div>

              {/* Image Output */}
              {outputImages.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <img
                    src={outputImages[selectedImage]}
                    alt="Clone output"
                    style={{ width: "100%", borderRadius: 6, border: `1px solid ${T.border}`, marginBottom: 8 }}
                  />
                  {outputImages.length > 1 && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                      {outputImages.map((url, i) => (
                        <button key={i} onClick={() => setSelectedImage(i)}
                          style={{ padding: 0, border: `2px solid ${selectedImage === i ? T.accent : T.border}`, borderRadius: 4, cursor: "pointer", background: "none" }}>
                          <img src={url} alt={`Output ${i + 1}`} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 3, display: "block" }} />
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ActionBtn label="Save to Vault" onClick={() => handleSaveToVault(outputImages[selectedImage], "image")} />
                    <ActionBtn label="Generate Video" onClick={() => { setSourceImageUrl(outputImages[selectedImage]); setGenMode("video"); setActiveTab("generate"); }} />
                    <ActionBtn label="Distribute" onClick={() => handleDistribute(outputImages[selectedImage], "image", ["vault", "vaultx"])} />
                    <a href={outputImages[selectedImage]} download style={{ ...actionBtnStyle(), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Download</a>
                  </div>
                </div>
              )}

              {/* Video Output */}
              {outputVideoUrl && (
                <div style={{ marginBottom: 16 }}>
                  <video src={outputVideoUrl} controls style={{ width: "100%", borderRadius: 6, border: `1px solid ${T.border}`, marginBottom: 8, background: "#000" }} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ActionBtn label="Save to Vault" onClick={() => handleSaveToVault(outputVideoUrl, "video")} />
                    <ActionBtn label="Distribute" onClick={() => handleDistribute(outputVideoUrl, "video", ["vault", "telegram", "vaultx"])} />
                    <a href={outputVideoUrl} download style={{ ...actionBtnStyle(), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Download</a>
                  </div>
                </div>
              )}

              {/* Audio Output */}
              {outputAudioUrl && (
                <div style={{ marginBottom: 16 }}>
                  <audio src={outputAudioUrl} controls style={{ width: "100%", marginBottom: 8 }} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ActionBtn label="Save to Vault" onClick={() => handleSaveToVault(outputAudioUrl, "voice")} />
                    <a href={outputAudioUrl} download style={{ ...actionBtnStyle(), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Download</a>
                  </div>
                </div>
              )}

              {/* Empty / Loading State */}
              {outputImages.length === 0 && !outputVideoUrl && !outputAudioUrl && (
                <div style={{ border: `1px solid ${T.border}`, borderRadius: 6, minHeight: 400, display: "grid", placeItems: "center", color: T.muted }}>
                  {POLLING.has(jobStatus.toLowerCase()) ? (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 32, marginBottom: 12, animation: "spin 2s linear infinite" }}>◈</div>
                      <div style={{ fontSize: 13, color: T.cyan }}>{jobStatus}...</div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Polling every 2.5s</div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>◈</div>
                      <div style={{ fontSize: 12 }}>No output yet. Generate something.</div>
                    </div>
                  )}
                </div>
              )}

              {/* Distribution Panel */}
              {(outputImages.length > 0 || outputVideoUrl) && (
                <div style={{ marginTop: 16 }}>
                  <SectionHeader icon="◎" label="Distribute" color={T.purple} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    {[
                      { id: "vault", label: "Vault", icon: "◈" },
                      { id: "telegram", label: "Telegram", icon: "✈" },
                      { id: "vaultx", label: "VaultX", icon: "◉" },
                      { id: "ppv", label: "PPV", icon: "◆" },
                      { id: "vip_feed", label: "VIP Feed", icon: "★" },
                    ].map(ch => (
                      <button key={ch.id}
                        onClick={() => handleDistribute(
                          outputVideoUrl || outputImages[selectedImage] || "",
                          outputVideoUrl ? "video" : "image",
                          [ch.id]
                        )}
                        style={{ ...ghostBtn(), fontSize: 10, padding: "8px 4px" }}>
                        {ch.icon} {ch.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {/* ═══════════════════════════════════════════════════════════════
              PANEL 4: TRAINING LAB
          ═══════════════════════════════════════════════════════════════ */}
          {(!isPhone && !isTablet) || activeTab === "training" ? (
            <aside style={{ borderRight: `1px solid ${T.border}`, padding: 16, overflowY: "auto", maxHeight: "calc(100vh - 80px)" }}>
              <SectionHeader icon="◉" label="Training Lab" color={T.purple} />

              <div style={card()}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>LoRA Fine-Tune</div>
                <div style={{ fontSize: 10, color: T.muted, lineHeight: 1.5, marginBottom: 10 }}>
                  Train a custom Flux LoRA model on your likeness. Beats all preset-avatar competitors.
                </div>

                <Label>Trigger Word</Label>
                <input value={triggerWord} onChange={e => setTriggerWord(e.target.value)}
                  placeholder="e.g. fluxdevCam"
                  style={inputStyle()} />

                <Label>Training Steps: {trainingSteps}</Label>
                <input type="range" min={100} max={4000} step={100} value={trainingSteps}
                  onChange={e => setTrainingSteps(Number(e.target.value))}
                  style={{ width: "100%", marginBottom: 12 }} />

                <Label>Provider</Label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
                  {(["replicate", "local"] as const).map(p => (
                    <button key={p} onClick={() => setTrainingProvider(p)}
                      style={{
                        padding: "8px 6px", fontSize: 11, borderRadius: 4, border: "none", cursor: "pointer",
                        background: trainingProvider === p ? T.purpleDim : T.surface2,
                        color: trainingProvider === p ? T.purple : T.muted,
                        borderLeft: `3px solid ${trainingProvider === p ? T.purple : "transparent"}`,
                      }}>
                      {p === "replicate" ? "Replicate Cloud" : "Local GPU"}
                    </button>
                  ))}
                </div>

                <button onClick={handleStartTraining} disabled={startTrainingMut.isPending}
                  style={{ ...primaryBtn(T.purple), width: "100%", marginBottom: 10 }}>
                  {startTrainingMut.isPending ? "Starting..." : "Start LoRA Training"}
                </button>
              </div>

              {/* Training Status */}
              {trainingJobId && (
                <div style={{ ...card(), marginTop: 12, borderColor: trainingStatus === "succeeded" ? "rgba(0,230,118,0.3)" : trainingStatus === "failed" ? "rgba(255,68,68,0.3)" : T.border }}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Training Job</div>
                  <div style={{ fontSize: 11, color: trainingStatus === "succeeded" ? T.green : trainingStatus === "failed" ? T.red : T.cyan }}>
                    {trainingStatus}
                  </div>
                  {trainingStatusQuery.data?.progress > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ height: 4, background: T.surface3, borderRadius: 2 }}>
                        <div style={{ height: "100%", width: `${trainingStatusQuery.data.progress}%`, background: T.purple, borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>{trainingStatusQuery.data.progress}%</div>
                    </div>
                  )}
                  {trainingStatus === "succeeded" && trainingStatusQuery.data?.outputModel && (
                    <button
                      onClick={() => promoteModelMut.mutate({
                        jobId: trainingJobId,
                        cloneId: "kingcam",
                        modelVersion: trainingStatusQuery.data.outputModel,
                      })}
                      style={{ ...primaryBtn(T.green), width: "100%", marginTop: 10, fontSize: 11 }}>
                      Promote to Production
                    </button>
                  )}
                </div>
              )}

              {/* Link to full Training Lab */}
              <a href="/king/clone-training-lab"
                style={{ display: "block", marginTop: 12, padding: "10px 12px", borderRadius: 4, border: `1px solid ${T.border}`, color: T.muted, textDecoration: "none", fontSize: 11, textAlign: "center" }}>
                Open Full 3D Training Lab →
              </a>
            </aside>
          ) : null}

          {/* ═══════════════════════════════════════════════════════════════
              PANEL 5: HISTORY
          ═══════════════════════════════════════════════════════════════ */}
          {(!isPhone && !isTablet) || activeTab === "history" ? (
            <aside style={{ padding: 16, overflowY: "auto", maxHeight: "calc(100vh - 80px)" }}>
              <SectionHeader icon="◎" label="History" color={T.muted} />

              {/* Type Filter */}
              <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
                {(["all", "image", "video", "talking_head"] as const).map(t => (
                  <button key={t} onClick={() => { setHistoryType(t); setHistoryPage(0); }}
                    style={{
                      padding: "4px 10px", fontSize: 10, borderRadius: 4, border: "none", cursor: "pointer",
                      background: historyType === t ? T.accentDim : T.surface2,
                      color: historyType === t ? T.accent : T.muted,
                    }}>
                    {t === "talking_head" ? "Head" : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {/* History Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(historyQuery.data?.items || []).map((item: any) => (
                  <button key={item.id || item.taskId} onClick={() => {
                    setSelectedHistoryItem(item);
                    if (item.type === "image" && item.outputUrls?.length) {
                      setOutputImages(item.outputUrls);
                      setSelectedImage(0);
                      setJobStatus("succeeded");
                      setActiveTab("output");
                    } else if ((item.type === "video" || item.type === "talking_head") && item.outputUrls?.[0]) {
                      setOutputVideoUrl(item.outputUrls[0]);
                      setJobStatus("succeeded");
                      setActiveTab("output");
                    }
                  }}
                    style={{
                      background: T.surface2, border: `1px solid ${selectedHistoryItem?.id === item.id ? T.accent : T.border}`,
                      borderRadius: 4, padding: 8, textAlign: "left", cursor: "pointer", color: T.text,
                    }}>
                    <div style={{ fontSize: 9, color: T.muted, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ textTransform: "uppercase" }}>{item.type}</span>
                      <span style={{ color: item.status === "succeeded" ? T.green : item.status === "failed" ? T.red : T.cyan }}>
                        {item.status}
                      </span>
                    </div>
                    {item.outputUrls?.[0] ? (
                      item.type === "video" || item.type === "talking_head" ? (
                        <video src={item.outputUrls[0]} muted style={{ width: "100%", borderRadius: 3, border: `1px solid ${T.border}`, display: "block" }} />
                      ) : (
                        <img src={item.outputUrls[0]} alt="output" style={{ width: "100%", borderRadius: 3, border: `1px solid ${T.border}`, display: "block" }} />
                      )
                    ) : (
                      <div style={{ height: 70, border: `1px solid ${T.border}`, borderRadius: 3, display: "grid", placeItems: "center", color: T.muted, fontSize: 10 }}>
                        {POLLING.has((item.status || "").toLowerCase()) ? "Processing..." : "No output"}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Pagination */}
              {(historyQuery.data?.items || []).length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                  <button onClick={() => setHistoryPage(p => Math.max(0, p - 1))} disabled={historyPage === 0} style={ghostBtn()}>← Prev</button>
                  <span style={{ fontSize: 11, color: T.muted }}>Page {historyPage + 1}</span>
                  <button onClick={() => setHistoryPage(p => p + 1)} disabled={(historyQuery.data?.items || []).length < 20} style={ghostBtn()}>Next →</button>
                </div>
              )}

              {(historyQuery.data?.items || []).length === 0 && !historyQuery.isLoading && (
                <div style={{ textAlign: "center", color: T.muted, fontSize: 12, padding: "24px 0" }}>No history yet. Generate something.</div>
              )}
            </aside>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        select option { background: #181818; color: #f0ece4; }
      `}</style>
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────
function SectionHeader({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ color, fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
    </div>
  );
}

function ActionBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={actionBtnStyle()}>{label}</button>
  );
}

// ─── Style Helpers ────────────────────────────────────────────────────────────
function card(): React.CSSProperties {
  return { background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, padding: 12, marginBottom: 10 };
}

function textarea(): React.CSSProperties {
  return {
    width: "100%", minHeight: 80, resize: "vertical",
    background: T.surface2, color: T.text, border: `1px solid ${T.border}`,
    borderRadius: 4, padding: "8px 10px", fontSize: 12, lineHeight: 1.5,
    marginBottom: 10, fontFamily: "inherit",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%", background: T.surface2, color: T.text, border: `1px solid ${T.border}`,
    borderRadius: 4, padding: "8px 10px", fontSize: 12, marginBottom: 10, fontFamily: "inherit",
  };
}

function select(): React.CSSProperties {
  return {
    width: "100%", background: T.surface2, color: T.text, border: `1px solid ${T.border}`,
    borderRadius: 4, padding: "7px 8px", fontSize: 12, cursor: "pointer",
  };
}

function primaryBtn(color: string): React.CSSProperties {
  return {
    background: color, color: color === T.accent ? "#16120b" : "#fff",
    border: "none", borderRadius: 4, padding: "10px 14px", fontSize: 12,
    fontWeight: 700, cursor: "pointer", transition: "opacity 0.15s",
  };
}

function ghostBtn(): React.CSSProperties {
  return {
    background: T.surface2, color: T.muted, border: `1px solid ${T.border}`,
    borderRadius: 4, padding: "7px 12px", fontSize: 11, cursor: "pointer",
  };
}

function actionBtnStyle(): React.CSSProperties {
  return {
    background: T.surface2, color: T.text, border: `1px solid ${T.border}`,
    borderRadius: 4, padding: "7px 12px", fontSize: 11, cursor: "pointer",
  };
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, color: T.muted, marginBottom: 5, fontWeight: 600 }}>{children}</div>;
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const val = String(reader.result ?? "");
      resolve(val.includes(",") ? val.split(",")[1] : val);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
