import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileVideo,
  Film,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
  Wand2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { analyzeBodyCinemaSourceLocally } from "@/lib/bodyCinemaPerception";
import MediaPicker, { type MediaAssetItem } from "@/components/MediaPicker";
import { toast } from "sonner";

const GOLD = "#D5B760";
const GOLD_DIM = "rgba(213,183,96,0.12)";
const GOLD_BORDER = "rgba(213,183,96,0.38)";
const BG = "#070707";
const CARD = "#111111";
const CARD_SOFT = "#171717";
const BORDER = "rgba(255,255,255,0.09)";
const MUTED = "rgba(255,255,255,0.55)";
const GREEN = "#45E38A";
const CYAN = "#63D9F5";
const RED = "#FF7C7C";

type Step = "upload" | "preset" | "configure" | "review";
type UploadReceipt = {
  id: string;
  mediaAssetId?: string;
  sha256: string;
  verified: boolean;
  ownerBound: boolean;
  createdAt: string;
  codec: string;
  width: number;
  height: number;
  durationSec: number;
};

type QuickPreset = {
  id: string;
  name: string;
  direction: string;
  focus: string;
};

type GovernedJob = {
  id: number | null;
  requestId: string;
  state: string;
  fingerprint: string;
  sourceUrl: string;
  providerModelPath: string;
  resolution: string;
  durationSeconds: number;
  estimatedCostCredits: number | null;
  actualCostCredits: number | null;
  costEvidenceReference: string | null;
  providerJobId: string | null;
  outputUrl: string | null;
  artifactUrl: string | null;
  qualityState: string | null;
  qualityScore: number | null;
  qualityReason: string | null;
  failureMessage: string | null;
  audioAssetId?: string | null;
};

const STEP_ORDER: Step[] = ["upload", "preset", "configure", "review"];
const STEP_LABELS: Record<Step, string> = {
  upload: "Source",
  preset: "Treatment",
  configure: "Request",
  review: "Review",
};

const QUICK_PRESETS: QuickPreset[] = [
  { id: "the-arch", name: "The Arch", direction: "Sculpted side light, a controlled body line, and a delayed payoff.", focus: "Structural reveal" },
  { id: "silhouette", name: "Silhouette", direction: "Backlight, negative space, and a clear graphic outline.", focus: "Shape & light" },
  { id: "luxury-reveal", name: "Luxury Reveal", direction: "Warm private-campaign detail that unfolds slowly into a polished reveal.", focus: "Private campaign" },
  { id: "vip-tease", name: "VIP Tease", direction: "A decisive first second, a measured hold, and an unresolved private-access finish.", focus: "Access hook" },
];

const TREATMENT_PREVIEW: Record<string, string> = {
  "the-arch": "/assets/preview-arch.mp4",
  "silhouette": "/assets/preview-silhouette.mp4",
  "luxury-reveal": "/assets/preview-mirror.mp4",
  "vip-tease": "/assets/preview-curves-360.mp4",
};

function stepIndex(step: Step) {
  return STEP_ORDER.indexOf(step);
}

function formatSeconds(value?: number) {
  if (!Number.isFinite(value)) return "—";
  return `${Number(value).toFixed(value && value < 10 ? 1 : 0)}s`;
}

function formatMoment(timestampMs?: number) {
  if (!Number.isFinite(timestampMs)) return "—";
  return `${(Number(timestampMs) / 1000).toFixed(Number(timestampMs) < 10_000 ? 1 : 0)}s`;
}

function statusCopy(state?: string | null) {
  switch (state) {
    case "cost_pending": return { label: "Cost evidence required", detail: "No provider request was sent. An owner must add a documented credit cap before approval.", tone: "locked" as const };
    case "awaiting_approval": return { label: "Awaiting owner approval", detail: "The source, treatment, and approved maximum are locked for owner review. No provider request was sent.", tone: "working" as const };
    case "approved": return { label: "Approved — queue controlled", detail: "The request has a reserved cap. Submission remains a separate, logged owner action.", tone: "working" as const };
    case "queued": return { label: "Worker lease active", detail: "A governed worker has the exclusive lease. Duplicate submissions are blocked.", tone: "working" as const };
    case "submitted": return { label: "Rendering under control", detail: "One provider task is recorded. This status does not create another request.", tone: "working" as const };
    case "submission_unknown": return { label: "Reconciliation required", detail: "The provider response was ambiguous. Automatic retries are blocked to prevent duplicate spend.", tone: "failed" as const };
    case "provider_complete": return { label: "Output pending quality review", detail: "The provider output exists but cannot be sold or published until a durable artifact passes review.", tone: "working" as const };
    case "accepted": return { label: "Accepted after review", detail: "A durable asset passed review. Checkout and publication still require separate future approvals.", tone: "ready" as const };
    case "rejected": return { label: "Output rejected", detail: "The output did not meet the acceptance standard. It is not sellable or publishable.", tone: "failed" as const };
    case "failed": return { label: "Request failed safely", detail: "No automatic retry is permitted. A new reviewed request is required for another attempt.", tone: "failed" as const };
    case "cancelled": return { label: "Request cancelled", detail: "The request was cancelled before a provider submission.", tone: "locked" as const };
    default: return { label: "Draft recorded", detail: "Your source and treatment are saved. No provider request has been sent.", tone: "locked" as const };
  }
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        window.setTimeout(() => setDone(false), 1500);
      }}
      style={{ minHeight: 32, padding: "5px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: done ? GREEN : MUTED, fontSize: 11, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      {done ? <Check size={13} /> : <Copy size={13} />}
      {done ? "Copied" : label}
    </button>
  );
}

function StatusRow({ label, value, state }: { label: string; value: string; state: "ready" | "working" | "locked" | "failed" }) {
  const color = state === "ready" ? GREEN : state === "working" ? GOLD : state === "failed" ? RED : MUTED;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 12, color: MUTED }}>{label}</span>
      <span style={{ fontSize: 12, color, fontWeight: 800, textAlign: "right", display: "inline-flex", alignItems: "center", gap: 6 }}>
        {state === "working" && <Loader2 size={13} className="body-cinema-spin" />}
        {state === "ready" && <Check size={13} />}
        {value}
      </span>
    </div>
  );
}

export default function VaultXDrop() {
  const search = useSearch();
  const selectedVaultAssetId = new URLSearchParams(search).get("sourceAssetId");
  const [step, setStep] = useState<Step>("upload");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [uploadReceipt, setUploadReceipt] = useState<UploadReceipt | null>(null);
  const [fileName, setFileName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<QuickPreset | null>(null);
  const [audioAssetId, setAudioAssetId] = useState<string | null>(null);
  const [audioLibraryOpen, setAudioLibraryOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [consent, setConsent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [creating, setCreating] = useState(false);
  const [governedJob, setGovernedJob] = useState<GovernedJob | null>(null);
  const [sourceEvidence, setSourceEvidence] = useState<any>(null);
  const [analyzingSource, setAnalyzingSource] = useState(false);
  const [activeInsightId, setActiveInsightId] = useState<string | null>(null);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [creationProjectId, setCreationProjectId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prepareCreationPath = (trpc as any).creationDirector.prepare.useMutation();
  const openCreationProject = (trpc as any).creationProjects.open.useMutation();
  const linkCreationProject = (trpc as any).creationProjects.link.useMutation();
  const analyzeSource = (trpc as any).bodyCinema.analyzeSource.useMutation();
  const planAudioTimeline = (trpc as any).editor.planAudioDirectedEdit.useMutation();
  const audioLibraryQ = (trpc as any).audioIntelligence.listAssets.useQuery();
  const audioReadinessQ = (trpc as any).audioIntelligence.getRenderReadiness.useQuery(
    { assetId: audioAssetId || "", platform: "creatorvault" },
    { enabled: Boolean(audioAssetId) }
  );
  const approveDirection = (trpc as any).bodyCinema.approveDirection.useMutation();
  const existingVideosQuery = (trpc as any).mediaAssets.list.useQuery(
    { filter: "videos", limit: 120 },
    { staleTime: 30_000 },
  );
  const autoSelectedMediaIdRef = useRef<string | null>(null);
  const jobQuery = trpc.governedPollo.job.useQuery(
    { jobId: governedJob?.id ?? 1 },
    { enabled: typeof governedJob?.id === "number" && governedJob.id > 0, refetchInterval: governedJob && typeof governedJob.id === "number" && governedJob.id > 0 && ["approved", "queued", "submitted", "provider_complete", "quality_review"].includes(governedJob.state) ? 8000 : false },
  );
  const currentJob = (jobQuery.data as GovernedJob | undefined) || governedJob;
  const currentStatus = statusCopy(currentJob?.state);
  const acceptedAsset = currentJob?.state === "accepted" && Boolean(currentJob.artifactUrl);
  const sourceDurationMs = Math.max(
    Number(uploadReceipt?.durationSec || 0) * 1000,
    ...(sourceEvidence?.frameEvidence || []).map((frame: any) => Number(frame.timestampMs || 0)),
    1,
  );
  const jumpToSourceMoment = useCallback((insight: any) => {
    const timestampMs = Math.max(0, Number(insight?.timestampMs || 0));
    setActiveInsightId(String(insight?.id || ""));
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = timestampMs / 1000;
    void video.play().catch(() => undefined);
  }, []);

  const openBodyCinemaCreation = useCallback(async (sourceAssetId: string, sourceUrl: string) => {
    const project = await openCreationProject.mutateAsync({
      title: title.trim() || "Body Cinema private release",
      intent: "Turn this creator-owned video into a distinct cinematic Body Cinema treatment.",
      outputPurpose: "Body Cinema Drop",
      sourceAssetId,
      metadata: { enteredFrom: "body_cinema", sourceUrl, finishingLane: "source_preserving_assembly" },
    });
    setCreationProjectId(project.id);
    return project;
  }, [openCreationProject, title]);

  const linkBodyCinemaEvidence = useCallback(async (projectId: string, evidence: any, treatmentId?: string | null, audioId?: string | null) => {
    await linkCreationProject.mutateAsync({
      projectId,
      sourceEvidenceId: evidence.id,
      treatmentId: treatmentId || undefined,
      audioAssetId: audioId || undefined,
      state: "ready_to_create",
      metadata: { analysisStatus: evidence.analysisStatus, analysisVersion: evidence.analysisVersion || null, treatmentSelected: treatmentId || null },
    });
  }, [linkCreationProject]);

  useEffect(() => () => {
    if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Choose a video file.");
      event.target.value = "";
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Choose a video up to 100 MB.");
      event.target.value = "";
      return;
    }

    if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    const localPreview = URL.createObjectURL(file);
    setVideoUrl(localPreview);
    setFileName(file.name);
    setHostedUrl(null);
    setUploadReceipt(null);
    setGovernedJob(null);
    setSourceEvidence(null);
    setActiveInsightId(null);
    setCreationProjectId(null);
    setUploadProgress(0);
    setUploading(true);
    setStep("preset");

    try {
      const form = new FormData();
      form.append("file", file);
      const payload = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = progressEvent => {
          if (progressEvent.lengthComputable) setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
        };
        xhr.onload = () => {
          let body: any = null;
          try { body = JSON.parse(xhr.responseText); } catch { /* handled below */ }
          if (xhr.status >= 200 && xhr.status < 300 && body?.url && body?.uploadReceipt?.verified) resolve(body);
          else reject(new Error(body?.error || `Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Upload network error"));
        xhr.open("POST", "/api/video/upload/direct");
        xhr.withCredentials = true;
        xhr.send(form);
      });
      setHostedUrl(payload.url);
      setUploadReceipt({ ...payload.uploadReceipt, mediaAssetId: payload.mediaAssetId || payload.uploadReceipt?.mediaAssetId });
      setUploadProgress(100);
      setAnalyzingSource(true);
      try {
        const localAnalysis = await analyzeBodyCinemaSourceLocally(file);
        const evidence = await analyzeSource.mutateAsync({
          sourceMediaUrl: payload.url,
          sourceType: "video",
          sourceFingerprint: localAnalysis.sourceFingerprint,
          analysisVersion: localAnalysis.analyzer,
          frameEvidence: localAnalysis.frameEvidence,
        });
        setSourceEvidence(evidence);
        const sourceAssetId = payload.mediaAssetId || payload.uploadReceipt?.mediaAssetId;
        if (!sourceAssetId) throw new Error("CreatorVault could not attach this verified upload to your Vault.");
        const project = await openBodyCinemaCreation(sourceAssetId, payload.url);
        await linkBodyCinemaEvidence(project.id, evidence);
        toast.success("Source verified and analyzed. Choose a treatment supported by the observed frames.");
      } catch (analysisError: any) {
        setSourceEvidence(null);
        toast.error(analysisError?.message || "Source uploaded, but local evidence analysis could not verify enough usable frames.");
      } finally {
        setAnalyzingSource(false);
      }
    } catch (error: any) {
      setHostedUrl(null);
      setUploadReceipt(null);
      setVideoUrl(null);
      setFileName("");
      setStep("upload");
      toast.error(error?.message || "Upload verification failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [videoUrl]);

  const handleExistingMediaSelection = useCallback(async (selected: MediaAssetItem[]) => {
    const asset = selected[0];
    setMediaLibraryOpen(false);
    if (!asset?.publicUrl) {
      toast.error("That video is not ready to use yet. Choose another video from your Vault.");
      return;
    }

    if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    setUploading(true);
    setAnalyzingSource(true);
    setUploadProgress(0);
    setHostedUrl(asset.publicUrl);
    setUploadReceipt(null);
    setGovernedJob(null);
    setSourceEvidence(null);
    setActiveInsightId(null);
    setCreationProjectId(null);
    setFileName(asset.originalName || asset.fileName || "CreatorVault video");

    try {
      const response = await fetch(asset.publicUrl, { credentials: "include" });
      if (!response.ok) throw new Error("Your saved video could not be opened for analysis.");
      const blob = await response.blob();
      const file = new File([blob], asset.originalName || asset.fileName || "creatorvault-video.mp4", {
        type: asset.mimeType || blob.type || "video/mp4",
        lastModified: asset.createdAt ? Date.parse(asset.createdAt) || Date.now() : Date.now(),
      });
      const previewUrl = URL.createObjectURL(file);
      setVideoUrl(previewUrl);
      setUploadProgress(25);
      const localAnalysis = await analyzeBodyCinemaSourceLocally(file);
      setUploadProgress(70);
      const evidence = await analyzeSource.mutateAsync({
        sourceMediaUrl: asset.publicUrl,
        sourceType: "video",
        sourceFingerprint: localAnalysis.sourceFingerprint,
        analysisVersion: localAnalysis.analyzer,
        frameEvidence: localAnalysis.frameEvidence,
      });
      setSourceEvidence(evidence);
      const project = await openBodyCinemaCreation(asset.id, asset.publicUrl);
      await linkBodyCinemaEvidence(project.id, evidence);
      setUploadReceipt({
        id: asset.id,
        mediaAssetId: asset.id,
        sha256: localAnalysis.sourceFingerprint,
        verified: true,
        ownerBound: true,
        createdAt: asset.createdAt || new Date().toISOString(),
        codec: asset.mimeType || "video/mp4",
        width: asset.width || 0,
        height: asset.height || 0,
        durationSec: asset.duration || 0,
      });
      setUploadProgress(100);
      setStep("preset");
      toast.success("Your saved video is ready. We found the strongest moments and built your treatment options.");
    } catch (error: any) {
      setHostedUrl(null);
      setVideoUrl(null);
      setUploadReceipt(null);
      setSourceEvidence(null);
      setFileName("");
      setStep("upload");
      toast.error(error?.message || "We could not analyze that saved video. Choose another clip from your Vault.");
    } finally {
      setUploading(false);
      setAnalyzingSource(false);
    }
  }, [analyzeSource, videoUrl]);

  useEffect(() => {
    const videos = Array.isArray(existingVideosQuery.data) ? existingVideosQuery.data as MediaAssetItem[] : [];
    const usableVideos = videos.filter((asset) => asset.publicUrl && (asset.assetType === "video" || asset.mimeType?.startsWith("video/")));
    const requestedVaultVideo = selectedVaultAssetId ? usableVideos.find((asset) => asset.id === selectedVaultAssetId) : null;
    const sourceToUse = requestedVaultVideo || usableVideos[0];
    if (!sourceToUse || autoSelectedMediaIdRef.current || uploading || videoUrl || sourceEvidence) return;
    autoSelectedMediaIdRef.current = sourceToUse.id;
    void handleExistingMediaSelection([sourceToUse]);
  }, [existingVideosQuery.data, handleExistingMediaSelection, selectedVaultAssetId, sourceEvidence, uploading, videoUrl]);

  const handleSelectPreset = useCallback(async (preset: QuickPreset) => {
    if (!sourceEvidence?.id || sourceEvidence?.analysisStatus !== "verified") {
      toast.error("A verified local source analysis is required before choosing a treatment.");
      return;
    }
    const directionId = preset.id;
    try {
      const evidence = await approveDirection.mutateAsync({ evidenceId: sourceEvidence.id, directionId });
      setSourceEvidence(evidence);
      if (creationProjectId) await linkBodyCinemaEvidence(creationProjectId, evidence, preset.id, audioAssetId);
      setSelectedPreset(preset);
      setTitle(`${preset.name} — Private Release`);
      setStep("configure");
    } catch (error: any) {
      toast.error(error?.message || "This treatment is not supported by the verified source evidence.");
    }
  }, [approveDirection, audioAssetId, creationProjectId, linkBodyCinemaEvidence, sourceEvidence]);

  const handleCreateGovernedDraft = useCallback(async () => {
    if (!hostedUrl || !uploadReceipt?.verified) {
      toast.error(uploading ? "Your source is still being verified." : "Upload and verify a source video first.");
      return;
    }
    if (!selectedPreset || !sourceEvidence?.id || !sourceEvidence?.selectedDirectionId) {
      toast.error("Choose and approve an evidence-backed treatment first.");
      setStep("preset");
      return;
    }
    if (!consent) {
      toast.error("Confirm ownership and consent before requesting a render.");
      return;
    }
    setCreating(true);
    try {
      let audioPlan: any = null;
      if (audioAssetId) {
        if (!audioReadinessQ.data?.ready) {
          toast.error(audioReadinessQ.data?.reason || "CreatorVault must verify this soundtrack before it can direct your treatment.");
          return;
        }
        audioPlan = await planAudioTimeline.mutateAsync({
          audioAssetId,
          sourceEvidenceId: sourceEvidence.id,
          treatmentId: selectedPreset.id,
          targetDurationSeconds: 6,
          preserveSourceAudio: true,
          destinationPlatform: "creatorvault",
        });
      }
      const sourceAssetId = uploadReceipt.mediaAssetId || uploadReceipt.id;
      const project = creationProjectId
        ? { id: creationProjectId }
        : await openBodyCinemaCreation(sourceAssetId, hostedUrl);
      const response = await prepareCreationPath.mutateAsync({
        tool: "body_cinema",
        intent: `${selectedPreset.name}: ${selectedPreset.direction}`,
        outputPurpose: "Body Cinema Drop",
        source: {
          assetUrl: hostedUrl,
          sourceEvidenceId: sourceEvidence.id,
          sourceFingerprint: uploadReceipt.sha256,
          ownershipConfirmed: true,
          consentConfirmed: true,
          adultVerified: true,
        },
        capabilities: {
          requiresGeneratedShot: true,
          requiredInputModes: ["reference_video"],
          durationSeconds: 6,
          resolution: "720p",
          preserveIdentity: true,
          naturalBody: true,
          preserveProps: true,
          cameraControl: true,
          minimumQualityScore: 75,
        },
        creativeDirection: {
          treatment: selectedPreset.id,
          prompt: `${selectedPreset.name}: ${selectedPreset.direction} Preserve the creator-owned source identity, natural anatomy, and stable cinematic motion.`,
          motionPlan: "Match the source body mechanics.",
          cameraPlan: selectedPreset.focus,
          identityRequirements: ["preserve creator identity", "natural anatomy", "preserve outfit and props"],
          sourceAnalysisReference: sourceEvidence.id,
          audioAssetId: audioAssetId || null,
        },
        output: { durationSeconds: 6, aspectRatio: "9:16", resolution: "720p" },
        metadata: {
          product: "body_cinema",
          releaseTitle: title.trim() || `${selectedPreset.name} — Private Release`,
          presetId: selectedPreset.id,
          presetName: selectedPreset.name,
          sourceReceiptId: uploadReceipt.id,
          audioTimelinePlanId: audioPlan?.planId || undefined,
          audioTimingEvidence: audioPlan?.anchors || undefined,
          creationProjectId: project.id,
        },
      });
      await linkCreationProject.mutateAsync({
        projectId: project.id,
        sourceEvidenceId: sourceEvidence.id,
        treatmentId: selectedPreset.id,
        audioAssetId: audioAssetId || undefined,
        creationDirectorRequestId: response.requestId,
        state: response.state === "ready_to_finish" ? "ready_to_create" : response.state === "in_progress" ? "in_progress" : "blocked",
        metadata: { releaseTitle: title.trim() || `${selectedPreset.name} — Private Release`, creationPath: response.creationPath },
      });
      setCreationProjectId(project.id);
      setGovernedJob({ id: null, requestId: response.requestId, state: response.state === "ready_to_finish" ? "cost_pending" : "failed", fingerprint: uploadReceipt.sha256, sourceUrl: hostedUrl, providerModelPath: response.selectedLane || "no provider route", resolution: "720p", durationSeconds: 6, estimatedCostCredits: null, actualCostCredits: null, costEvidenceReference: null, providerJobId: null, outputUrl: null, artifactUrl: null, qualityState: null, qualityScore: null, qualityReason: null, failureMessage: response.blockedReasons?.[0] || null, audioAssetId: audioAssetId || undefined });
      setStep("review");
      toast.success(response.creationPath);
    } catch (error: any) {
      toast.error(error?.message || "The governed request could not be recorded.");
    } finally {
      setCreating(false);
    }
  }, [audioAssetId, audioReadinessQ.data, consent, creationProjectId, hostedUrl, linkCreationProject, openBodyCinemaCreation, planAudioTimeline, prepareCreationPath, selectedPreset, sourceEvidence, title, uploadReceipt, uploading]);

  const handleDownload = useCallback(() => {
    if (!currentJob?.artifactUrl) return;
    const anchor = document.createElement("a");
    anchor.href = currentJob.artifactUrl;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.download = `${(title || "body-cinema").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.mp4`;
    anchor.click();
  }, [currentJob?.artifactUrl, title]);

  const reuseSource = useCallback(() => {
    setSelectedPreset(null);
    setTitle("");
    setConsent(false);
    setGovernedJob(null);
    setStep("preset");
    toast.info("Source retained. Choose another treatment to create a separate governed request.");
  }, []);

  const reset = useCallback(() => {
    if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    autoSelectedMediaIdRef.current = null;
    setStep("upload");
    setVideoUrl(null);
    setHostedUrl(null);
    setUploadReceipt(null);
    setSourceEvidence(null);
    setActiveInsightId(null);
    setFileName("");
    setSelectedPreset(null);
    setAudioAssetId(null);
    setTitle("");
    setConsent(false);
    setUploading(false);
    setUploadProgress(0);
    setCreating(false);
    setGovernedJob(null);
  }, [videoUrl]);

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff", fontFamily: "DM Sans, sans-serif", paddingBottom: 96 }}>
      <style>{`
        @keyframes body-cinema-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .body-cinema-spin { animation: body-cinema-spin 1s linear infinite; }
        .body-cinema-button { transition: transform 150ms cubic-bezier(0.23,1,0.32,1), border-color 150ms cubic-bezier(0.23,1,0.32,1), background 150ms cubic-bezier(0.23,1,0.32,1); }
        .body-cinema-button:active:not(:disabled) { transform: scale(0.975); }
        .body-cinema-button:focus-visible { outline: 2px solid ${GOLD}; outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) { .body-cinema-spin { animation: none; } .body-cinema-button { transition: none; } }
      `}</style>

      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(7,7,7,0.94)", borderBottom: `1px solid ${BORDER}`, backdropFilter: "blur(16px)" }}>
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/vault-x" aria-label="Back to VaultX" style={{ color: MUTED, display: "inline-flex", alignItems: "center" }}><ArrowLeft size={19} /></Link>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontFamily: "Bebas Neue, sans-serif", fontSize: 21, letterSpacing: "0.06em" }}>Body <span style={{ color: GOLD }}>Cinema</span></p>
            <p style={{ margin: "1px 0 0", color: MUTED, fontSize: 10 }}>Shape your video into a cinematic drop plan.</p>
          </div>
          {step === "review" && <button type="button" className="body-cinema-button" onClick={reset} style={{ border: `1px solid ${BORDER}`, background: "transparent", color: "#fff", borderRadius: 999, padding: "7px 11px", fontSize: 11, cursor: "pointer" }}>New source</button>}
        </div>
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "0 16px 11px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {STEP_ORDER.map((item, index) => {
            const active = item === step;
            const complete = stepIndex(step) > index;
            return <div key={item} aria-current={active ? "step" : undefined}><div style={{ height: 3, borderRadius: 3, background: complete ? GREEN : active ? GOLD : BORDER, marginBottom: 5 }} /><p style={{ margin: 0, textAlign: "center", fontSize: 9, color: active ? "#fff" : complete ? GREEN : MUTED }}>{STEP_LABELS[item]}</p></div>;
          })}
        </div>
      </header>

      <MediaPicker
        open={mediaLibraryOpen}
        onClose={() => setMediaLibraryOpen(false)}
        onConfirm={(assets) => void handleExistingMediaSelection(assets)}
        mode="single"
        title="Your Vault"
        subtitle="Choose a video you have already uploaded. Body Cinema will analyze this exact source."
        confirmLabel="Use this video"
      />
      <main style={{ maxWidth: 620, margin: "0 auto", padding: "24px 16px" }}>
        {step === "upload" && (
          <section style={{ animation: "fadeIn 0.6s cubic-bezier(0.23,1,0.32,1)" }}>
            <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", marginBottom: 32, border: `1px solid ${BORDER}`, boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
              <video src="/assets/hero-transformation.mp4" autoPlay loop muted playsInline style={{ width: "100%", display: "block" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 24, background: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)" }}>
                <p style={{ fontSize: 10, color: GOLD, fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 8px", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>Your Footage, Refined</p>
                <h1 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 48, letterSpacing: "0.025em", lineHeight: 0.98, margin: 0, textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>Your Body.<br /><span style={{ color: GOLD }}>Your Empire.</span></h1>
              </div>
            </div>
            
            <p style={{ fontSize: 16, color: "#fff", lineHeight: 1.65, margin: "0 0 20px", textAlign: "center", fontWeight: 500 }}>Start with a video you already have in CreatorVault. We read its movement and framing, then help you choose a cinematic plan for your next drop.</p>
            {existingVideosQuery.isLoading && <p style={{ color: GOLD, fontSize: 12, textAlign: "center", margin: "-8px 0 20px" }}>Finding your saved videos…</p>}
            {!existingVideosQuery.isLoading && Array.isArray(existingVideosQuery.data) && existingVideosQuery.data.length > 0 && <p style={{ color: GREEN, fontSize: 12, textAlign: "center", margin: "-8px 0 20px" }}>Your newest saved video is selected automatically. You can choose another below.</p>}

            <button type="button" className="body-cinema-button" onClick={() => setMediaLibraryOpen(true)} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 150, padding: 24, borderRadius: 24, border: `1px solid ${GOLD_BORDER}`, background: `linear-gradient(145deg, ${CARD}, #0a0a0a)`, cursor: "pointer", textAlign: "center", boxShadow: "0 8px 30px rgba(213,183,96,0.1)", color: "#fff" }}>
              <div style={{ width: 58, height: 58, borderRadius: 18, background: `linear-gradient(135deg, ${GOLD}, #b09140)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(213,183,96,0.25)" }}><Film size={26} color="#080808" /></div>
              <div><p style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Choose from your Vault</p><p style={{ fontSize: 13, color: MUTED, margin: "6px 0 0" }}>Your saved videos appear here automatically</p></div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, color: GREEN, fontSize: 11, fontWeight: 800 }}><ShieldCheck size={14} /> Your videos stay attached to your account</div>
            </button>
            <p style={{ margin: "14px 0 20px", textAlign: "center", color: MUTED, fontSize: 12 }}>Need a brand-new clip instead? Add it below.</p>
            
            <label className="body-cinema-button" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, minHeight: 220, padding: 24, borderRadius: 24, border: `1px solid ${GOLD_BORDER}`, background: `linear-gradient(145deg, ${CARD}, #0a0a0a)`, cursor: "pointer", textAlign: "center", boxShadow: "0 8px 30px rgba(213,183,96,0.1)" }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: `linear-gradient(135deg, ${GOLD}, #b09140)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(213,183,96,0.25)" }}><Upload size={28} color="#080808" /></div>
              <div><p style={{ fontSize: 20, fontWeight: 900, margin: 0, letterSpacing: "-0.01em", color: "#fff" }}>Tap to upload your source</p><p style={{ fontSize: 13, color: MUTED, margin: "6px 0 0" }}>High quality video works best · up to 100 MB</p></div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, color: GREEN, fontSize: 11, fontWeight: 800, marginTop: 4 }}><ShieldCheck size={14} /> 100% Creator Owned & Protected</div>
              <input ref={fileInputRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo,video/x-m4v" style={{ display: "none" }} onChange={handleFileUpload} />
            </label>

            <div style={{ margin: "44px -16px 0", padding: "32px 16px", background: "linear-gradient(180deg, rgba(213,183,96,0.06), transparent)", borderTop: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: 10, color: GOLD, fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", textAlign: "center", margin: "0 0 10px" }}>See the treatments move</p>
              <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 38, lineHeight: 0.95, letterSpacing: "0.03em", textAlign: "center", margin: "0 0 12px" }}>Pick a world.<br /><span style={{ color: GOLD }}>Start the plan.</span></h2>
              <p style={{ maxWidth: 440, margin: "0 auto 24px", color: MUTED, fontSize: 13, lineHeight: 1.55, textAlign: "center" }}>Every look begins as a moving treatment—your clip, your identity, your version of the plan.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                {QUICK_PRESETS.map(preset => (
                  <div key={`showcase-${preset.id}`} style={{ position: "relative", overflow: "hidden", aspectRatio: "3 / 4", borderRadius: 16, background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 8px 20px rgba(0,0,0,0.35)" }}>
                    <video src={TREATMENT_PREVIEW[preset.id]} autoPlay loop muted playsInline preload="metadata" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.05) 65%)" }} />
                    <div style={{ position: "absolute", left: 12, right: 12, bottom: 12 }}>
                      <p style={{ margin: 0, color: "#fff", fontSize: 15, fontWeight: 900, textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>{preset.name}</p>
                      <p style={{ margin: "3px 0 0", color: GOLD, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 800 }}>{preset.focus}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ position: "relative", overflow: "hidden", borderRadius: 20, marginTop: 20, aspectRatio: "9 / 16", maxHeight: 520, background: "#000", border: `1px solid ${GOLD_BORDER}`, boxShadow: "0 14px 36px rgba(213,183,96,0.12)" }}>
                <video src="/assets/final-drop.mp4" autoPlay loop muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.05) 65%)" }} />
                <div style={{ position: "absolute", left: 20, right: 20, bottom: 20 }}>
                  <p style={{ margin: 0, color: GOLD, fontSize: 10, fontFamily: "monospace", letterSpacing: "0.16em", textTransform: "uppercase" }}>Demo Drop Preview</p>
                  <p style={{ margin: "8px 0 0", color: "#fff", fontSize: 24, fontWeight: 900, lineHeight: 1.05 }}>This is one example of the energy a finished drop can carry.</p>
                  <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.75)", fontSize: 12, lineHeight: 1.45 }}>A premium teaser, built around the footage you own and the treatment you choose.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {step === "preset" && (
          <section>
            {videoUrl && <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", marginBottom: 20, background: "#000", aspectRatio: "16/9", maxHeight: 290, border: `1px solid ${BORDER}` }}>
              <video ref={videoRef} src={videoUrl} muted={isMuted} playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
              <div style={{ position: "absolute", inset: "auto 10px 10px 10px", display: "flex", alignItems: "center", gap: 7 }}>
                <button type="button" aria-label={isPlaying ? "Pause source preview" : "Play source preview"} onClick={() => isPlaying ? videoRef.current?.pause() : void videoRef.current?.play()} style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.74)", border: `1px solid ${BORDER}`, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{isPlaying ? <Pause size={15} /> : <Play size={15} />}</button>
                <button type="button" aria-label={isMuted ? "Unmute source preview" : "Mute source preview"} onClick={() => { const next = !isMuted; setIsMuted(next); if (videoRef.current) videoRef.current.muted = next; }} style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(0,0,0,0.74)", border: `1px solid ${BORDER}`, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>
                <div style={{ marginLeft: "auto", background: "rgba(0,0,0,0.74)", border: `1px solid ${BORDER}`, borderRadius: 999, padding: "7px 10px", fontSize: 10, color: uploadReceipt ? GREEN : GOLD, display: "inline-flex", alignItems: "center", gap: 6 }}>{uploadReceipt ? <Check size={12} /> : <Loader2 size={12} className="body-cinema-spin" />}{uploadReceipt ? "Source verified" : `Verifying ${uploadProgress}%`}</div>
              </div>
            </div>}
            <p style={{ fontSize: 10, color: GOLD, fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 6px" }}>Cinematic Direction</p>
            <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 40, letterSpacing: "0.035em", margin: 0 }}>Set the vibe.</h2>
            <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: "8px 0 20px" }}>Choose the editorial treatment. We map the motion and lighting to fit your exact source.</p>
            
            {analyzingSource && (
              <div style={{ background: `linear-gradient(145deg, ${CARD}, #0a0a0a)`, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 24, marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
                <Loader2 size={24} color={GOLD} className="body-cinema-spin" />
                <div>
                  <p style={{ fontSize: 15, fontWeight: 900, color: "#fff", margin: 0 }}>Reading source movement...</p>
                  <p style={{ fontSize: 12, color: MUTED, margin: "4px 0 0" }}>Mapping framing and exposure locally.</p>
                </div>
              </div>
            )}
            
            {sourceEvidence?.analysisStatus === "verified" && <div style={{ background: `linear-gradient(145deg, ${CARD}, #0a0a0a)`, border: `1px solid rgba(69,227,138,0.35)`, borderRadius: 20, padding: 20, marginBottom: 24, boxShadow: "0 8px 30px rgba(69,227,138,0.08)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}><div><p style={{ fontSize: 11, color: GREEN, fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0, display: "flex", alignItems: "center", gap: 6 }}><Sparkles size={14} /> Analysis Complete</p><p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, margin: "6px 0 0" }}>We found the strongest moments in your clip. The treatments below are mapped to your actual movement and framing.</p></div></div>
              {sourceEvidence.editorFindings?.insights?.length > 0 && <div style={{ marginTop: 18, borderTop: `1px solid ${BORDER}`, paddingTop: 18 }}>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 13 }}>
                  <div><p style={{ margin: 0, color: GOLD, fontSize: 10, fontFamily: "monospace", letterSpacing: "0.14em", textTransform: "uppercase" }}>Moment map</p><p style={{ margin: "5px 0 0", color: "#fff", fontSize: 14, fontWeight: 900 }}>Tap a marker. Your actual source jumps to that moment.</p></div>
                  <span style={{ color: GREEN, fontSize: 10, fontWeight: 900, whiteSpace: "nowrap" }}>{sourceEvidence.analysisScore}/100 source read</span>
                </div>
                <div style={{ position: "relative", minHeight: 56, overflow: "hidden", borderRadius: 14, border: `1px solid ${BORDER}`, background: "linear-gradient(90deg, rgba(213,183,96,0.12), rgba(0,0,0,0.56) 42%, rgba(99,217,245,0.10))", marginBottom: 12 }}>
                  <div style={{ position: "absolute", left: 12, right: 12, top: "50%", height: 1, background: "rgba(255,255,255,0.20)" }} />
                  {sourceEvidence.editorFindings.insights.map((insight: any) => {
                    const isWeak = insight.id === "weakest";
                    const active = activeInsightId === insight.id;
                    const left = `${Math.min(96, Math.max(2, (Number(insight.timestampMs || 0) / sourceDurationMs) * 96 + 2))}%`;
                    return <button key={`marker-${insight.id}`} type="button" onClick={() => jumpToSourceMoment(insight)} aria-label={`Watch ${insight.label} at ${formatMoment(insight.timestampMs)}`} style={{ position: "absolute", left, top: "50%", transform: "translate(-50%, -50%)", width: active ? 31 : 25, height: active ? 31 : 25, padding: 0, borderRadius: 999, border: `2px solid ${active ? "#fff" : isWeak ? RED : GOLD}`, background: active ? (isWeak ? RED : GOLD) : "#090909", color: active ? "#090909" : isWeak ? RED : GOLD, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: active ? `0 0 0 5px ${isWeak ? "rgba(255,124,124,0.16)" : "rgba(213,183,96,0.18)"}` : "0 4px 12px rgba(0,0,0,0.55)", transition: "all 160ms cubic-bezier(0.23,1,0.32,1)", zIndex: active ? 3 : 2 }}><span style={{ fontSize: 8, fontWeight: 950 }}>{formatMoment(insight.timestampMs).replace("s", "")}</span></button>;
                  })}
                  <span style={{ position: "absolute", left: 10, bottom: 7, color: MUTED, fontSize: 9 }}>0:00</span><span style={{ position: "absolute", right: 10, bottom: 7, color: MUTED, fontSize: 9 }}>{formatMoment(sourceDurationMs)}</span>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {sourceEvidence.editorFindings.insights.map((insight: any) => {
                    const isWeak = insight.id === "weakest";
                    const active = activeInsightId === insight.id;
                    return <button key={insight.id} type="button" className="body-cinema-button" onClick={() => jumpToSourceMoment(insight)} style={{ width: "100%", padding: "13px 14px", textAlign: "left", background: active ? (isWeak ? "rgba(255,124,124,0.10)" : "rgba(213,183,96,0.12)") : "rgba(0,0,0,0.38)", border: `1px solid ${active ? (isWeak ? "rgba(255,124,124,0.52)" : GOLD_BORDER) : (isWeak ? "rgba(255,124,124,0.26)" : BORDER)}`, borderRadius: 14, color: "#fff", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><span style={{ color: isWeak ? "#ffb2b2" : "#fff", fontSize: 12, fontWeight: 950 }}>{insight.label}</span><span style={{ color: isWeak ? RED : GOLD, fontSize: 11, fontWeight: 900, whiteSpace: "nowrap" }}>{formatMoment(insight.timestampMs)} · Watch</span></div>
                      <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.75)", fontSize: 11, lineHeight: 1.45 }}>{insight.why}</p>
                      <p style={{ margin: "6px 0 0", color: isWeak ? "#ffb2b2" : GREEN, fontSize: 10, lineHeight: 1.42, fontWeight: 800 }}>{insight.action}</p>
                    </button>;
                  })}
                </div>
              </div>}
              <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                {sourceEvidence.directions?.map((dir: any) => (
                  <div key={dir.id} style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <p style={{ margin: 0, color: "#fff", fontSize: 14, fontWeight: 900 }}>{dir.label}</p>
                      <span style={{ background: "rgba(213,183,96,0.15)", color: GOLD, padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 800 }}>{dir.confidence}% Match</span>
                    </div>
                    <p style={{ margin: "0 0 8px", color: "rgba(255,255,255,0.78)", fontSize: 11, lineHeight: 1.45 }}>{dir.grammar?.pace || dir.distinction}</p>
                    <div style={{ display: "grid", gap: 6 }}>
                      {dir.evidence?.map((ev: string, i: number) => (
                        <p key={i} style={{ margin: 0, color: MUTED, fontSize: 11, display: "flex", gap: 6 }}><span style={{ color: GOLD }}>•</span> {ev}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>}
            
            {sourceEvidence?.analysisStatus === "rejected" && <div style={{ background: "rgba(255,124,124,0.1)", border: "1px solid rgba(255,124,124,0.3)", borderRadius: 16, padding: 16, marginBottom: 20, color: RED, fontSize: 13, lineHeight: 1.5 }}>{(sourceEvidence.rejectionReasons || ["We need a clearer clip to build a high-quality drop."]).map((reason: string) => <p key={reason} style={{ margin: "4px 0" }}>{reason}</p>)}</div>}
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              {QUICK_PRESETS.map(preset => {
                const videoSrc = TREATMENT_PREVIEW[preset.id];
                return (
                  <button key={preset.id} type="button" className="body-cinema-button" onClick={() => void handleSelectPreset(preset)} disabled={analyzingSource || sourceEvidence?.analysisStatus !== "verified"} style={{ position: "relative", overflow: "hidden", minHeight: 240, padding: 0, textAlign: "left", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, color: "#fff", cursor: analyzingSource || sourceEvidence?.analysisStatus !== "verified" ? "not-allowed" : "pointer", opacity: analyzingSource || sourceEvidence?.analysisStatus !== "verified" ? 0.4 : 1, boxShadow: "0 4px 15px rgba(0,0,0,0.3)" }}>
                    <video src={videoSrc} autoPlay loop muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.6) 100%)" }} />
                    <div style={{ position: "relative", zIndex: 1, padding: 20, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div><span style={{ display: "inline-block", background: "rgba(0,0,0,0.7)", border: `1px solid ${BORDER}`, padding: "4px 10px", borderRadius: 999, fontSize: 9, color: GOLD, fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", backdropFilter: "blur(4px)" }}>{preset.focus}</span></div>
                      <div>
                        <p style={{ fontSize: 20, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.01em", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>{preset.name}</p>
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", lineHeight: 1.4, margin: 0, textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>{preset.direction}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === "configure" && (
          <section>
            <button type="button" onClick={() => setStep("preset")} style={{ border: "none", background: "transparent", color: MUTED, padding: 0, marginBottom: 18, display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 12 }}><ArrowLeft size={15} /> Change treatment</button>
            <div style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, borderRadius: 16, padding: "14px", marginBottom: 20 }}><p style={{ fontSize: 10, color: GOLD, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 5px" }}>{selectedPreset?.focus || "Custom"} treatment</p><p style={{ fontSize: 16, fontWeight: 900, margin: "0 0 4px" }}>{selectedPreset?.name || "Custom direction"}</p><p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: 0 }}>{selectedPreset?.direction || "A restrained cinematic treatment."}</p></div>
            <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 40, letterSpacing: "0.035em", margin: "0 0 6px" }}>Prepare the drop.</h2>
            <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: "0 0 24px" }}>Set the title and confirm your ownership. We'll lock the cinematic plan so it's ready for final review.</p>
            
            <div style={{ background: `linear-gradient(180deg, ${CARD_SOFT}, ${CARD})`, border: `1px solid ${uploadReceipt ? "rgba(69,227,138,0.3)" : BORDER}`, borderRadius: 20, padding: 20, marginBottom: 20, boxShadow: uploadReceipt ? "0 8px 24px rgba(69,227,138,0.05)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>{uploading ? <Loader2 size={24} color={GOLD} className="body-cinema-spin" /> : uploadReceipt ? <div style={{ background: "rgba(69,227,138,0.15)", padding: 10, borderRadius: 12 }}><ShieldCheck size={22} color={GREEN} /></div> : <FileVideo size={24} color={MUTED} />}<div style={{ flex: 1, minWidth: 0 }}><p style={{ fontSize: 15, fontWeight: 900, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fileName || "No source selected"}</p><p style={{ fontSize: 12, color: uploadReceipt ? GREEN : GOLD, margin: "4px 0 0", fontWeight: 600 }}>{uploading ? `Securing upload… ${uploadProgress}%` : uploadReceipt ? `Verified · ${formatSeconds(uploadReceipt.durationSec)}` : "Waiting for video"}</p></div></div>
              {uploadReceipt?.verified && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}`, display: "grid", gap: 10, fontSize: 12, color: MUTED }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#fff" }}>Render Purpose</span><span>Premium PPV Teaser</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#fff" }}>Expected Output</span><span>6-second cinematic loop</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#fff" }}>Soundtrack</span><span style={{ color: audioAssetId ? GREEN : MUTED }}>{audioAssetId ? "Verified" : "None"}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#fff" }}>Estimated Cost</span><span style={{ color: GOLD, fontWeight: 800 }}>Not approved yet</span></div>
                  <p style={{ margin: 0, color: MUTED, fontSize: 11, lineHeight: 1.5 }}>No render can start until an owner records a real credit estimate and you can see the approved cap.</p>
                </div>
              )}
            </div>
            
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 13, color: "#fff", fontWeight: 800, display: "block", marginBottom: 8 }}>Music Direction</span>
              <p style={{ margin: "0 0 10px", color: MUTED, fontSize: 12, lineHeight: 1.45 }}>Choose a rights-cleared soundtrack to shape the pace of this treatment. You can leave this off for a visual-only plan.</p>
              <div style={{ display: "grid", gap: 8 }}>
                {audioLibraryQ.isLoading ? <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>Loading your soundtracks...</p> : audioLibraryQ.data?.assets?.length ? audioLibraryQ.data.assets.map((asset: any) => (
                  <button key={asset.id} type="button" onClick={() => setAudioAssetId(asset.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", textAlign: "left", background: audioAssetId === asset.id ? GOLD_DIM : CARD, border: `1px solid ${audioAssetId === asset.id ? GOLD_BORDER : BORDER}`, borderRadius: 12, color: "#fff", cursor: asset.status === "ready" ? "pointer" : "not-allowed", opacity: asset.status === "ready" ? 1 : 0.55 }}>
                    <span><strong style={{ display: "block", fontSize: 13 }}>🎵 {asset.title}</strong><small style={{ color: MUTED }}>{Math.round(asset.durationSeconds || 0)}s · {(asset.rights?.state || "unknown").replace(/_/g, " ")}</small></span>
                    <span style={{ color: audioAssetId === asset.id ? GOLD : MUTED, fontSize: 11, fontWeight: 800 }}>{audioAssetId === asset.id ? "Selected" : "Choose"}</span>
                  </button>
                )) : <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>{audioLibraryQ.data?.creatorMessage || "Add a creator-owned soundtrack in VaultX Editor to use music direction."}</p>}
              </div>
              {audioAssetId && audioReadinessQ.data && <p style={{ margin: "10px 0 0", color: audioReadinessQ.data.ready ? GREEN : GOLD, fontSize: 11 }}>{audioReadinessQ.data.reason}</p>}
            </div>
            <label style={{ display: "block", marginBottom: 24 }}><span style={{ fontSize: 13, color: "#fff", fontWeight: 800, display: "block", marginBottom: 8 }}>Release Title</span><input value={title} onChange={event => setTitle(event.target.value)} maxLength={120} placeholder="e.g. Midnight Arch Drop" style={{ width: "100%", boxSizing: "border-box", background: "#000", border: `1px solid ${BORDER}`, borderRadius: 16, color: "#fff", fontSize: 16, padding: "16px 18px", outline: "none", transition: "border-color 0.2s", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)" }} onFocus={e => e.target.style.borderColor = GOLD} onBlur={e => e.target.style.borderColor = BORDER} /></label>
            
            <label style={{ display: "flex", alignItems: "flex-start", gap: 14, background: consent ? "rgba(69,227,138,0.05)" : "transparent", border: `1px solid ${consent ? "rgba(69,227,138,0.4)" : BORDER}`, borderRadius: 16, padding: "18px", cursor: "pointer", marginBottom: 24, transition: "all 0.2s" }}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} style={{ width: 22, height: 22, accentColor: GREEN, marginTop: 2, flexShrink: 0, cursor: "pointer" }} /><span style={{ fontSize: 13, color: consent ? "#fff" : MUTED, lineHeight: 1.6 }}>I confirm I am 18+, I own this content, and I authorize CreatorVault to transform it into a cinematic PPV drop.</span></label>
            
            <button type="button" className="body-cinema-button" onClick={() => void handleCreateGovernedDraft()} disabled={!consent || !uploadReceipt?.verified || creating || uploading} style={{ width: "100%", minHeight: 64, borderRadius: 20, border: "none", background: consent && uploadReceipt?.verified && !uploading ? `linear-gradient(135deg, ${GOLD}, #b09140)` : CARD_SOFT, color: consent && uploadReceipt?.verified && !uploading ? "#090909" : MUTED, fontFamily: "Bebas Neue, sans-serif", fontSize: 22, letterSpacing: "0.08em", fontWeight: 900, cursor: consent && uploadReceipt?.verified && !uploading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: consent && uploadReceipt?.verified && !uploading ? "0 10px 30px rgba(213,183,96,0.3)" : "none" }}>{creating ? <Loader2 size={22} className="body-cinema-spin" /> : <Wand2 size={22} />} Lock Cinematic Plan</button>
          </section>
        )}

        {step === "review" && currentJob && (
          <section>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 58, height: 58, borderRadius: 19, background: currentStatus.tone === "ready" ? "rgba(69,227,138,0.13)" : currentStatus.tone === "failed" ? "rgba(255,124,124,0.11)" : GOLD_DIM, border: `1px solid ${currentStatus.tone === "ready" ? "rgba(69,227,138,0.42)" : currentStatus.tone === "failed" ? "rgba(255,124,124,0.35)" : GOLD_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>{currentStatus.tone === "ready" ? <Check size={25} color={GREEN} /> : currentStatus.tone === "failed" ? <ShieldCheck size={25} color={RED} /> : <Loader2 size={25} color={GOLD} className="body-cinema-spin" />}</div>
              <p style={{ fontSize: 10, color: currentStatus.tone === "ready" ? GREEN : currentStatus.tone === "failed" ? RED : GOLD, fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 6px" }}>{currentStatus.label}</p>
              <h2 style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 35, letterSpacing: "0.035em", margin: "0 0 7px" }}>{acceptedAsset ? "Asset accepted." : "Your request is protected."}</h2>
              <p style={{ color: MUTED, fontSize: 12, lineHeight: 1.55, margin: 0 }}>{currentStatus.detail}</p>
            </div>
            <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", background: "#000", aspectRatio: "9/16", maxHeight: 560, margin: "0 auto 24px", border: `1px solid ${BORDER}`, boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
              <video src={currentJob?.artifactUrl || currentJob?.outputUrl || undefined} autoPlay={acceptedAsset} loop={acceptedAsset} controls={acceptedAsset} muted={!acceptedAsset} playsInline style={{ width: "100%", height: "100%", objectFit: "cover", opacity: acceptedAsset ? 1 : 0.7 }} />
              {!acceptedAsset && (
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.7) 100%)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 24 }}>
                  <div style={{ alignSelf: "flex-start", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", padding: "6px 12px", borderRadius: 999, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, animation: "pulse 2s infinite" }} />
                    <style>{`@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }`}</style>
                    <span style={{ fontSize: 10, color: "#fff", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}>No finished drop yet</span>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <Film size={32} color={GOLD} style={{ marginBottom: 12, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }} />
                    <p style={{ margin: 0, fontSize: 18, color: "#fff", fontWeight: 900, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>Your source and treatment are locked</p>
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.5, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>CreatorVault shows a video here only after a real finished drop passes review.</p>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 16 }}><button type="button" className="body-cinema-button" onClick={handleDownload} disabled={!acceptedAsset} style={{ minHeight: 46, borderRadius: 12, border: `1px solid ${acceptedAsset ? GOLD_BORDER : BORDER}`, background: acceptedAsset ? GOLD_DIM : CARD, color: acceptedAsset ? GOLD : MUTED, fontWeight: 800, cursor: acceptedAsset ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><Download size={16} /> Download</button><button type="button" className="body-cinema-button" onClick={reuseSource} style={{ minHeight: 46, borderRadius: 12, border: `1px solid ${BORDER}`, background: CARD, color: "#fff", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><RotateCcw size={16} /> Reuse source</button></div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "10px 20px", marginBottom: 20, boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }}>
              <StatusRow label="Source Ownership" value="Verified & Bound" state="ready" />
              {currentJob.audioAssetId && <StatusRow label="Music Direction" value="Rights verified" state="ready" />}
              <StatusRow label="Production Status" value={currentJob.state.replace(/_/g, " ")} state={currentStatus.tone} />
              <StatusRow label="Cost Cap" value={currentJob.estimatedCostCredits ? `${currentJob.estimatedCostCredits} credits` : "Awaiting Approval"} state={currentJob.estimatedCostCredits ? "working" : "locked"} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 0" }}><span style={{ fontSize: 13, color: MUTED }}>Sales & Distribution</span><span style={{ fontSize: 13, color: MUTED, fontWeight: 800 }}>Requires Final Creator Review</span></div>
            </div>
            
            <div style={{ background: `linear-gradient(145deg, ${CARD_SOFT}, ${CARD})`, border: `1px solid ${GOLD_BORDER}`, borderRadius: 20, padding: "20px", marginBottom: 20, boxShadow: "0 8px 24px rgba(213,183,96,0.08)" }}>
              <p style={{ fontSize: 11, color: GOLD, fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}><ShieldCheck size={14} /> Immutable Production Record</p>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: "0 0 16px" }}>This production plan is locked. Your identity, source framing, and chosen cinematic treatment cannot be altered or retried without your explicit consent.</p>
              <div style={{ display: "grid", gap: 10, fontSize: 12, color: MUTED, background: "rgba(0,0,0,0.4)", padding: 16, borderRadius: 12, border: `1px solid ${BORDER}` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#fff", fontWeight: 800 }}>Plan ID</span><span style={{ fontFamily: "monospace", color: GOLD }}>{currentJob.requestId.slice(0, 12)}...</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#fff", fontWeight: 800 }}>Security Fingerprint</span><span style={{ fontFamily: "monospace", color: GOLD }}>{currentJob.fingerprint.slice(0, 12)}...</span></div>
                {currentJob.costEvidenceReference && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "#fff", fontWeight: 800 }}>Cost Evidence</span><span style={{ fontFamily: "monospace", color: GREEN }}>Verified</span></div>}
                {currentJob.qualityReason && <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}><span style={{ color: "#fff", fontWeight: 800, display: "block", marginBottom: 4 }}>Quality Review</span>{currentJob.qualityReason}</div>}
                {currentJob.failureMessage && <div style={{ color: RED, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}><span style={{ fontWeight: 800, display: "block", marginBottom: 4 }}>Safe Failure</span>{currentJob.failureMessage}</div>}
              </div>
              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {typeof currentJob?.id === "number" && currentJob.id > 0 ? <a href={`/vault-x/library/${currentJob.id}`} style={{ color: GOLD, fontSize: 11, fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}><ShieldCheck size={12} /> View Truth Library Record</a> : <span style={{ color: MUTED, fontSize: 11, fontWeight: 800 }}>Creation record saved</span>}
                <CopyButton text={currentJob.requestId} label="Copy Plan ID" />
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
