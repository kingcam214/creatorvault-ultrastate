import { Link } from "wouter";
import { ArrowUpRight, Crown, Film, Mic, Play, Shield, Sparkles, User, Video } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorVaultRoute } from "@/lib/productArchitecture";

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
            className="h-full w-full object-cover object-right opacity-30"
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
            <p className="text-lg leading-relaxed text-zinc-400 sm:text-xl">
              Your personal creation arsenal. Build clone video, shape your voice, make cinematic trailers, and command every source clip in your private vault.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
      </div>
    </div>
  );
}
