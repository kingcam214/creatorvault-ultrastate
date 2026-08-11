import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, Crown, Film, Mic, Play, Shield, Sparkles, User, Video, Image as ImageIcon, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorVaultRoute } from "@/lib/productArchitecture";
import MediaPicker, { MediaAssetItem } from "@/components/MediaPicker";
import { trpc } from "@/lib/trpc";

export default function KingContent() {
  const { user, isLoading } = useAuth();
  const isKingCamOwner = user?.id === 6 || user?.id === 33 || user?.role === "king" || user?.role === "admin";

  if (isLoading) {
    return <div className="min-h-screen bg-[#050505]" aria-busy="true" />;
  }

  if (!user || !isKingCamOwner) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <Shield className="w-12 h-12 text-zinc-600 mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Owner Only</h1>
        <p className="text-zinc-400 mb-6">This creation surface is reserved for KingCam.</p>
        <Link href="/dashboard">
          <a className="rounded-xl bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-zinc-200">
            Return to Creator OS
          </a>
        </Link>
      </div>
    );
  }

  const [intent, setIntent] = useState("");
  const [activeStage, setActiveStage] = useState<"intent" | "orchestrating" | "ready">("intent");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"clone" | "trailer" | "social" | "dubbing" | null>(null);
  const [, setLocation] = useLocation();

  // Read-only queries for creation history
  const { data: mediaAssets } = trpc.mediaAssets.list.useQuery({ limit: 10 });
  const { data: socialFeed } = trpc.socialSpine.feed.useQuery({ limit: 5 });
  const { data: kingcamIdentity } = (trpc as any).cloneEngine.getClone.useQuery({});
  const createTrailerProject = trpc.mediaAssets.createTrailerProject.useMutation();
  const prepareCreationPath = (trpc as any).creationDirector.prepare.useMutation();
  const openCreationProject = (trpc as any).creationProjects.open.useMutation();
  const linkCreationProject = (trpc as any).creationProjects.link.useMutation();

  const kingcamIdentityReference = (() => {
    const activeModel = kingcamIdentity?.activeModels?.[0];
    if (activeModel?.id) return `clone_model:${activeModel.id}`;
    if (kingcamIdentity?.profile?.id) return `clone_profile:${kingcamIdentity.profile.id}`;
    return "kingcam_identity_pending";
  })();

  const openKingcamCreation = async (asset: MediaAssetItem, purpose: string) => {
    return openCreationProject.mutateAsync({
      title: intent.trim() || purpose,
      intent: intent.trim() || purpose,
      outputPurpose: purpose,
      sourceAssetId: asset.id,
      identityReference: kingcamIdentityReference,
      metadata: {
        enteredFrom: "kingcam_content",
        identityState: kingcamIdentity?.activeModels?.[0]?.id ? "production_identity_model" : "identity_profile",
      },
    });
  };

  const linkPreparedCreation = async (projectId: string, plan: any, extras: Record<string, unknown> = {}) => {
    const state = plan?.state === "ready_to_finish"
      ? "ready_to_create"
      : plan?.state === "in_progress"
        ? "in_progress"
        : plan?.state === "not_ready"
          ? "blocked"
          : "ready_to_review";
    await linkCreationProject.mutateAsync({
      projectId,
      creationDirectorRequestId: plan?.requestId || null,
      state,
      metadata: extras,
    });
  };

  const handlePickerConfirm = async (selected: MediaAssetItem[]) => {
    setIsPickerOpen(false);
    if (!selected.length || !pickerTarget) return;

    const asset = selected[0];
    const sourceUrl = String(asset.publicUrl || "").trim();
    const plannedDuration = Math.max(1, Math.min(60, Math.round(asset.duration || 15)));

    // Every handoff keeps the creator's selected asset attached to the destination.
    // The trailer path also records a durable, no-spend project before opening the studio.
    switch (pickerTarget) {
      case "clone": {
        const project = await openKingcamCreation(asset, "KingCam clone motion");
        if (sourceUrl) {
          const plan = await prepareCreationPath.mutateAsync({
            tool: "kingcam_content",
            intent: intent.trim() || "Create a KingCam clone motion piece.",
            outputPurpose: "KingCam clone motion",
            source: { assetUrl: sourceUrl, ownershipConfirmed: true, consentConfirmed: true, adultVerified: true },
            capabilities: { requiresGeneratedShot: true, requiredInputModes: ["reference_image"], durationSeconds: 6, resolution: "720p", preserveIdentity: true, naturalBody: true, cameraControl: true, minimumQualityScore: 75 },
            creativeDirection: { prompt: intent.trim() || "Create a polished full-body KingCam motion moment from the approved identity source.", identityRequirements: ["preserve KingCam identity", "natural full-body motion"] },
            output: { durationSeconds: 6, aspectRatio: "9:16", resolution: "720p" },
            metadata: { mediaAssetId: asset.id, creationProjectId: project.id, preparedFrom: "kingcam_content" },
          });
          await linkPreparedCreation(project.id, plan, { nextDestination: "clone_empire" });
        }
        setLocation(`/clone-empire-home?sourceAssetId=${asset.id}&creationProjectId=${project.id}`);
        break;
      }
      case "trailer": {
        let creationProjectId: string | null = null;
        try {
          const creationProject = await openKingcamCreation(asset, "KingCam cinematic trailer");
          creationProjectId = creationProject.id;
          if (sourceUrl) {
            const plan = await prepareCreationPath.mutateAsync({
              tool: "kingcam_content",
              intent: intent.trim() || "Build a KingCam cinematic trailer from approved footage.",
              outputPurpose: "KingCam trailer",
              source: { assetUrl: sourceUrl, ownershipConfirmed: true, consentConfirmed: true, adultVerified: true },
              capabilities: { requiresGeneratedShot: false, requiredInputModes: ["source_video"], requiredOutputMode: "video", durationSeconds: plannedDuration, resolution: "720p" },
              creativeDirection: { prompt: intent.trim() || "Build a music-led cinematic trailer from this approved KingCam footage.", motionPlan: "Use the strongest source moments and preserve original identity.", cameraPlan: "Shape the source footage into a clean premium campaign cut." },
              output: { durationSeconds: plannedDuration, aspectRatio: "9:16", resolution: "720p" },
              metadata: { mediaAssetId: asset.id, creationProjectId: creationProject.id, preparedFrom: "kingcam_content" },
            });
            await linkPreparedCreation(creationProject.id, plan, { nextDestination: "trailer_studio" });
          }
          const trailerProject = await createTrailerProject.mutateAsync({
            projectName: intent.trim() || "KingCam cinematic trailer",
            projectType: "launch_trailer",
            format: "9:16",
            title: intent.trim() || undefined,
            concept: intent.trim() || undefined,
            selectedAssetIds: selected.map((selectedAsset) => selectedAsset.id),
          });
          await linkCreationProject.mutateAsync({
            projectId: creationProject.id,
            metadata: { trailerProjectId: trailerProject.trailerProjectId, nextDestination: "trailer_studio" },
          });
          setLocation(`/vaultx/trailers?projectId=${trailerProject.trailerProjectId}&creationProjectId=${creationProject.id}`);
        } catch {
          // The studio remains available even if a future destination is temporarily unavailable.
          setLocation(`/vaultx/trailers?sourceAssetId=${asset.id}${creationProjectId ? `&creationProjectId=${creationProjectId}` : ""}`);
        }
        break;
      }
      case "social": {
        const project = await openKingcamCreation(asset, "KingCam social package");
        if (sourceUrl) {
          const plan = await prepareCreationPath.mutateAsync({
            tool: "kingcam_content",
            intent: intent.trim() || "Prepare an approved KingCam social drop.",
            outputPurpose: "KingCam social package",
            source: { assetUrl: sourceUrl, ownershipConfirmed: true, consentConfirmed: true, adultVerified: true },
            capabilities: { requiresGeneratedShot: false, requiredInputModes: ["source_video"], requiredOutputMode: "social_variant", durationSeconds: plannedDuration, resolution: "720p" },
            creativeDirection: { prompt: intent.trim() || "Prepare social-ready variants from this approved KingCam footage.", motionPlan: "Preserve the original source and use the strongest opening.", cameraPlan: "Use the source framing without synthetic changes." },
            output: { durationSeconds: plannedDuration, aspectRatio: "9:16", resolution: "720p" },
            metadata: { mediaAssetId: asset.id, creationProjectId: project.id, preparedFrom: "kingcam_content" },
          });
          await linkPreparedCreation(project.id, plan, { nextDestination: "social_empire" });
        }
        setLocation(`${CreatorVaultRoute.socialEmpire}?sourceAssetId=${asset.id}&creationProjectId=${project.id}`);
        break;
      }
      case "dubbing": {
        const project = await openKingcamCreation(asset, "KingCam voice and dubbing");
        setLocation(`/king/dubbing?sourceAssetId=${asset.id}&creationProjectId=${project.id}`);
        break;
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] pb-24 pt-20">
      {/* Hero Section */}
      <div className="relative mb-12 border-b border-white/10 bg-[#0a0a0f]">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent z-10" />
          <video
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-contain object-right opacity-30"
            src="/videos/kingcam-hero-cam.mp4"
            poster="/assets/kingcam-hero.jpg"
          />
        </div>

        <div className="relative z-20 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-fuchsia-200">
              <Crown className="h-3.5 w-3.5" />
              Owner Command
            </div>
            <h1 className="mb-4 text-4xl font-black text-white sm:text-5xl lg:text-6xl">
              Create the Empire.
            </h1>
            <p className="text-lg leading-relaxed text-zinc-400 sm:text-xl mb-8">
              Your personal creation arsenal. Build clone video, shape your voice, make cinematic trailers, and command every source clip in your private vault.
            </p>

            {/* Intent Command Bar */}
            <div className="relative max-w-xl">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-fuchsia-500/20 via-cyan-500/20 to-amber-500/20 blur-lg transition-opacity duration-500" />
              <div className="relative flex items-center gap-3 rounded-xl border border-white/10 bg-[#0d0d14] p-2 shadow-2xl">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  placeholder="What do you want to create?"
                  className="flex-1 bg-transparent text-base font-medium text-white placeholder:text-zinc-600 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && intent.trim()) {
                      setActiveStage("orchestrating");
                    }
                  }}
                />
                <button
                  onClick={() => intent.trim() && setActiveStage("orchestrating")}
                  disabled={!intent.trim()}
                  className="shrink-0 rounded-lg bg-white px-6 py-2.5 text-sm font-black text-black transition hover:bg-zinc-200 disabled:opacity-50 disabled:hover:bg-white"
                >
                  Start
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Clone teaser", "Cinematic trailer", "Voice dub", "Social drop"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setIntent(suggestion);
                      setActiveStage("orchestrating");
                    }}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-400 transition hover:bg-white/10 hover:text-white"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {activeStage === "orchestrating" && (
          <div className="mb-12 rounded-2xl border border-fuchsia-500/30 bg-[#0d0d14] p-8 shadow-[0_0_40px_-10px_rgba(217,70,239,0.15)]">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fuchsia-500/20 text-fuchsia-300">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Directing Your Creation</h2>
                <p className="text-sm text-zinc-400">"{intent}"</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <button
                onClick={() => { setPickerTarget("clone"); setIsPickerOpen(true); }}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-fuchsia-500/20 text-fuchsia-300">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white">Create Clone Motion</div>
                    <div className="text-xs text-zinc-400">Pick a source photo to animate</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-zinc-500" />
              </button>

              <button
                onClick={() => { setPickerTarget("trailer"); setIsPickerOpen(true); }}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                    <Film className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white">Build Cinematic Trailer</div>
                    <div className="text-xs text-zinc-400">Pick clips to assemble</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-zinc-500" />
              </button>

              <button
                onClick={() => { setPickerTarget("social"); setIsPickerOpen(true); }}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white">Prepare My Sales Package</div>
                    <div className="text-xs text-zinc-400">Pick a finished video to distribute</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-zinc-500" />
              </button>

              <button
                onClick={() => { setPickerTarget("dubbing"); setIsPickerOpen(true); }}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                    <Mic className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white">Voice & Dubbing</div>
                    <div className="text-xs text-zinc-400">Pick a video to translate</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-zinc-500" />
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setActiveStage("intent")}
                className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-xs font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-black text-white">Creation History & Engines</h2>
          <div className="h-px flex-1 ml-6 bg-gradient-to-r from-white/10 to-transparent" />
        </div>
        <div className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Clone Command */}
          <Link href="/clone-empire-home">
            <a className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0f] p-6 transition hover:border-fuchsia-300/40 hover:bg-[#0d0d14]">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-fuchsia-500/10 blur-3xl transition group-hover:bg-fuchsia-500/20" />
              <div>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/20 text-fuchsia-300">
                  <User className="h-5 w-5" />
                </div>
                <h2 className="mb-2 text-xl font-black text-white">Clone Command</h2>
                <p className="text-sm leading-relaxed text-zinc-400">
                  Build talking-head video and full-body motion from your signature identity. Put your clone to work on social drops and PPV teasers.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Your Signature</span>
                <ArrowUpRight className="h-4 w-4 text-zinc-500 transition group-hover:text-fuchsia-300" />
              </div>
            </a>
          </Link>

          {/* Dubbing & Voice */}
          <Link href="/king/dubbing">
            <a className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0f] p-6 transition hover:border-cyan-300/40 hover:bg-[#0d0d14]">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl transition group-hover:bg-cyan-500/20" />
              <div>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
                  <Mic className="h-5 w-5" />
                </div>
                <h2 className="mb-2 text-xl font-black text-white">Voice & Dubbing</h2>
                <p className="text-sm leading-relaxed text-zinc-400">
                  Create voiceovers in your sound. Translate and dub your existing videos for a wider audience.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Your Voice</span>
                <ArrowUpRight className="h-4 w-4 text-zinc-500 transition group-hover:text-cyan-300" />
              </div>
            </a>
          </Link>

          {/* Cinematic Trailers */}
          <Link href="/vaultx/trailers">
            <a className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0f] p-6 transition hover:border-amber-300/40 hover:bg-[#0d0d14]">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl transition group-hover:bg-amber-500/20" />
              <div>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
                  <Film className="h-5 w-5" />
                </div>
                <h2 className="mb-2 text-xl font-black text-white">Cinematic Trailers</h2>
                <p className="text-sm leading-relaxed text-zinc-400">
                  Build multi-scene launch trailers. Your clips, music, and pacing come together as one polished campaign asset.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Your Trailer</span>
                <ArrowUpRight className="h-4 w-4 text-zinc-500 transition group-hover:text-amber-300" />
              </div>
            </a>
          </Link>

          {/* Media Vault */}
          <Link href="/king/media-vault">
            <a className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0f] p-6 transition hover:border-white/30 hover:bg-[#0d0d14]">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5 blur-3xl transition group-hover:bg-white/10" />
              <div>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                  <Video className="h-5 w-5" />
                </div>
                <h2 className="mb-2 text-xl font-black text-white">Media Vault</h2>
                <p className="text-sm leading-relaxed text-zinc-400">
                  Your private media library. Organize source clips, audio tracks, and finished drops so every move starts from what you already own.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Your Vault</span>
                <ArrowUpRight className="h-4 w-4 text-zinc-500 transition group-hover:text-white" />
              </div>
            </a>
          </Link>

          {/* Creator Video Studio */}
          <Link href="/creator/video-studio">
            <a className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0f] p-6 transition hover:border-emerald-300/40 hover:bg-[#0d0d14]">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl transition group-hover:bg-emerald-500/20" />
              <div>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                  <Play className="h-5 w-5" />
                </div>
                <h2 className="mb-2 text-xl font-black text-white">Creator Video Studio</h2>
                <p className="text-sm leading-relaxed text-zinc-400">
                  Take precise control. Combine clips, add captions, shape the sound, and prepare the finished package exactly how you want it.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Hands-On Control</span>
                <ArrowUpRight className="h-4 w-4 text-zinc-500 transition group-hover:text-emerald-300" />
              </div>
            </a>
          </Link>

          {/* Social Empire Handoff */}
          <Link href={CreatorVaultRoute.socialEmpire}>
            <a className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0f] p-6 transition hover:border-indigo-300/40 hover:bg-[#0d0d14]">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl transition group-hover:bg-indigo-500/20" />
              <div>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="mb-2 text-xl font-black text-white">Social Empire</h2>
                <p className="text-sm leading-relaxed text-zinc-400">
                  Turn your finished media into ready-to-approve posts. Keep your audience, channels, and launch timing in one place.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Your Audience</span>
                <ArrowUpRight className="h-4 w-4 text-zinc-500 transition group-hover:text-indigo-300" />
              </div>
            </a>
          </Link>
        </div>

        {/* Creation History Read-Only Preview */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Media Vault Preview */}
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0f] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Recent Media</h3>
              <Link href="/king/media-vault">
                <a className="text-xs font-bold text-fuchsia-300 transition hover:text-fuchsia-200">View Vault &rarr;</a>
              </Link>
            </div>
            <div className="space-y-3">
              {mediaAssets && mediaAssets.length > 0 ? (
                mediaAssets.slice(0, 3).map((asset) => (
                  <div key={asset.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-black">
                      {asset.thumbnailUrl ? (
                        <img src={asset.thumbnailUrl} alt="" className="h-full w-full object-cover opacity-80" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Video className="h-4 w-4 text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-white">{asset.fileName}</div>
                      <div className="text-xs text-zinc-500">
                        {asset.assetType} &bull; {new Date(asset.createdAt || "").toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
                  No media in vault yet.
                </div>
              )}
            </div>
          </div>

          {/* Social Empire Preview */}
          <div className="rounded-2xl border border-white/10 bg-[#0a0a0f] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Recent Sales Packages</h3>
              <Link href={CreatorVaultRoute.socialEmpire}>
                <a className="text-xs font-bold text-indigo-300 transition hover:text-indigo-200">View Empire &rarr;</a>
              </Link>
            </div>
            <div className="space-y-3">
              {socialFeed && socialFeed.items.length > 0 ? (
                socialFeed.items.slice(0, 3).map((post) => (
                  <div key={post.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-indigo-500/10 text-indigo-400">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-white">{post.body || "No caption"}</div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-zinc-300">
                          {post.visibility}
                        </span>
                        &bull; {new Date(post.createdAt || "").toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
                  No social drops yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isPickerOpen && (
        <MediaPicker
          open={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onConfirm={handlePickerConfirm}
          mode={pickerTarget === "trailer" ? "multi" : "single"}
          title={
            pickerTarget === "clone" ? "Select Source Image" :
            pickerTarget === "trailer" ? "Select Trailer Clips" :
            pickerTarget === "social" ? "Select Finished Video" :
            "Select Video for Dubbing"
          }
          subtitle={
            pickerTarget === "clone" ? "Pick a high-quality portrait from your vault" :
            pickerTarget === "trailer" ? "Pick 2-6 clips to assemble" :
            pickerTarget === "social" ? "Pick a ready asset to distribute" :
            "Pick a video with clear dialogue"
          }
          confirmLabel={`Continue to ${
            pickerTarget === "clone" ? "Clone Command" :
            pickerTarget === "trailer" ? "Trailer Studio" :
            pickerTarget === "social" ? "Social Empire" :
            "Dubbing"
          }`}
          maxSelect={pickerTarget === "trailer" ? 6 : 1}
        />
      )}
    </div>
  );
}
