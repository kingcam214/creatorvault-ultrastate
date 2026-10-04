import { ArrowUpRight, Clapperboard, Play, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { CreatorVaultRoute } from "@/lib/productArchitecture";
import {
  HOMEPAGE_MEDIA,
  hasCertifiedPublicProof,
  type HomepageMediaAsset,
} from "@/lib/homepageMediaRegistry";

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return reducedMotion;
}

function MotionStage({
  videoSrc,
  posterSrc,
  className = "relative",
  style,
  priority = false,
  objectFit = "cover",
  objectPosition = "center",
}: {
  videoSrc: string;
  posterSrc?: string;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  objectFit?: "cover" | "contain";
  objectPosition?: string;
}) {
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const [posterUnavailable, setPosterUnavailable] = useState(false);
  const showStill = reducedMotion || videoUnavailable;

  useEffect(() => {
    if (showStill) videoRef.current?.pause();
  }, [showStill]);

  return (
    <div
      className={`overflow-hidden bg-[#0A0A0A] ${className}`}
      style={style}
      aria-hidden="true"
    >
      {showStill ? (
        posterSrc && !posterUnavailable ? (
          <img
            src={posterSrc}
            alt=""
            className={`absolute inset-0 h-full w-full ${objectFit === "contain" ? "object-contain" : "object-cover"}`}
            style={{ objectPosition }}
            onError={() => setPosterUnavailable(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(0,217,255,0.16),transparent_28%),linear-gradient(135deg,#1A1A1A_0%,#0A0A0A_58%,#000_100%)]" />
        )
      ) : (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={posterSrc || undefined}
          autoPlay
          loop
          muted
          playsInline
          preload={priority ? "auto" : "metadata"}
          className={`absolute inset-0 h-full w-full ${objectFit === "contain" ? "object-contain" : "object-cover"}`}
          style={{ objectPosition }}
          onError={() => {
            videoRef.current?.pause();
            setVideoUnavailable(true);
          }}
        />
      )}
    </div>
  );
}

function approvedMotion(assetId: string): HomepageMediaAsset {
  const asset = Object.values(HOMEPAGE_MEDIA).find(
    candidate => candidate.assetId === assetId
  );
  if (
    !asset ||
    !hasCertifiedPublicProof(asset) ||
    asset.mediaKind !== "motion"
  ) {
    throw new Error(
      `CreatorVault home requires an approved moving asset: ${assetId}`
    );
  }
  return asset;
}

function DirectionLink({
  href,
  eyebrow,
  title,
  copy,
  tone = "cyan",
}: {
  href: string;
  eyebrow: string;
  title: string;
  copy: string;
  tone?: "cyan" | "gold";
}) {
  const accent =
    tone === "gold"
      ? "text-[#C9A84C] group-hover:border-[#C9A84C]"
      : "text-[#00D9FF] group-hover:border-[#00D9FF]";

  return (
    <Link asChild href={href}>
      <a className="group grid gap-4 border-b border-white/10 py-7 transition-colors hover:border-white/40 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-8">
        <span className={`eyebrow ${accent.split(" ")[0]}`}>{eyebrow}</span>
        <span>
          <span className="display-lg block text-white">{title}</span>
          <span className="body-md mt-2 block max-w-2xl text-white/60">
            {copy}
          </span>
        </span>
        <span
          className={`hidden h-10 w-10 items-center justify-center border border-white/20 text-white transition sm:inline-flex ${accent.split(" ").slice(1).join(" ")}`}
          aria-hidden="true"
        >
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </a>
    </Link>
  );
}

function CtaLink({
  href,
  children,
  tone = "primary",
}: {
  href: string;
  children: ReactNode;
  tone?: "primary" | "outline" | "gold";
}) {
  const className =
    tone === "gold"
      ? "cv-cta-gold"
      : tone === "outline"
        ? "cv-cta-outline"
        : "cv-cta";
  return (
    <Link asChild href={href}>
      <a className={className}>
        {children}
        <ArrowUpRight className="h-4 w-4" />
      </a>
    </Link>
  );
}

export default function Home() {
  const kingcamHero = approvedMotion("kingcam-hero-cam");
  const womenCampaignMotion = approvedMotion("homepage-motion-pilot-78");
  const campaignVisualPoster = HOMEPAGE_MEDIA.campaignVisualProof.livePath;

  return (
    <main className="cv-dna cv-page min-h-screen overflow-hidden bg-[#0A0A0A] text-white selection:bg-[#00D9FF]/30">
      <section
        className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden border-b border-white/10"
        aria-labelledby="home-hero-title"
      >
        <MotionStage
          videoSrc={kingcamHero.livePath}
          posterSrc={kingcamHero.fallbackAsset}
          className="absolute inset-0"
          objectFit="cover"
          objectPosition="82% center"
          priority
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,.96)_0%,rgba(10,10,10,.76)_38%,rgba(10,10,10,.24)_70%,rgba(10,10,10,.52)_100%),linear-gradient(180deg,rgba(10,10,10,.08)_0%,rgba(10,10,10,.20)_52%,#0A0A0A_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-[21%] h-px bg-[linear-gradient(90deg,transparent,rgba(0,217,255,.72),transparent)]" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl flex-col justify-end px-5 pb-10 pt-20 sm:px-8 sm:pb-14 lg:px-12 lg:pb-20">
          <div className="max-w-3xl">
            <p className="cv-eyebrow eyebrow text-[#C9A84C]">
              Founder signal / KingCam
            </p>
            <h1
              id="home-hero-title"
              className="display-xl mt-5 max-w-2xl text-white"
            >
              THE CREATOR
              <br />
              <span className="text-[#00D9FF]">IS THE</span>
              <br />
              CULTURE.
            </h1>
            <p className="body-lg mt-7 max-w-xl text-white/70">
              CreatorVault keeps your source, direction, and next move in one
              controlled creative universe.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <CtaLink href={CreatorVaultRoute.creatorOS}>
                Enter Creator OS
              </CtaLink>
              <CtaLink href="/creator/video-studio" tone="outline">
                <Play className="h-4 w-4 fill-current" /> Open Video Studio
              </CtaLink>
            </div>
          </div>

          <div className="mt-14 grid gap-4 border-t border-white/15 pt-5 text-white/60 sm:grid-cols-3">
            <span className="eyebrow">Owned source</span>
            <span className="eyebrow sm:text-center">Editorial direction</span>
            <span className="eyebrow sm:text-right">
              Creator-controlled release
            </span>
          </div>
        </div>
      </section>

      <section
        className="relative isolate min-h-[calc(100svh-4rem)] overflow-hidden border-b border-white/10"
        aria-labelledby="source-title"
      >
        <MotionStage
          videoSrc={womenCampaignMotion.livePath}
          posterSrc={campaignVisualPoster}
          className="absolute inset-0"
          objectPosition="center"
          priority
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,.96)_0%,rgba(10,10,10,.68)_44%,rgba(10,10,10,.18)_78%),linear-gradient(180deg,rgba(10,10,10,.12)_0%,#0A0A0A_100%)]" />
        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl items-end px-5 py-12 sm:px-8 lg:items-center lg:px-12">
          <div className="max-w-3xl">
            <p className="cv-eyebrow eyebrow text-[#00D9FF]">
              Creator kernel / Source first
            </p>
            <h2 id="source-title" className="display-xl mt-5 text-white">
              YOUR SOURCE.
              <br />
              <span className="text-[#00D9FF]">YOUR DIRECTION.</span>
            </h2>
            <p className="body-lg mt-7 max-w-xl text-white/70">
              Move from footage you can identify into the existing source-first
              studio and workspace. Nothing in this campaign view represents an
              unpublished result.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <CtaLink href="/creator/video-studio">
                <Clapperboard className="h-4 w-4" /> Start with a source
              </CtaLink>
              <CtaLink href="/creator/workspace" tone="outline">
                Open workspace
              </CtaLink>
            </div>
          </div>
        </div>
      </section>

      <section
        className="bg-[#0A0A0A] px-5 py-16 sm:px-8 sm:py-24 lg:px-12"
        aria-labelledby="paths-title"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 border-b border-white/15 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="cv-eyebrow eyebrow text-[#00D9FF]">
                CreatorVault / Editorial lanes
              </p>
              <h2 id="paths-title" className="heading-xl mt-4 text-white">
                MOVE WITH INTENT.
              </h2>
            </div>
            <p className="body-md max-w-md text-white/55">
              Each lane leads to an existing CreatorVault room. Availability and
              progress remain visible inside the room itself.
            </p>
          </div>

          <div>
            <DirectionLink
              href="/creator/video-studio"
              eyebrow="01 / CREATE"
              title="Creator Video Studio"
              copy="Bring a source into the creator-first production lane."
            />
            <DirectionLink
              href="/creator/workspace"
              eyebrow="02 / DIRECT"
              title="Creator Workspace"
              copy="Keep a working draft, its direction, and its next decision together."
            />
            <DirectionLink
              href={CreatorVaultRoute.bodyCinema}
              eyebrow="03 / BUILD"
              title="Body Cinema"
              copy="Open the existing governed production room for source-aware direction."
            />
            <DirectionLink
              href={CreatorVaultRoute.socialEmpire}
              eyebrow="04 / REACH"
              title="Social Empire"
              copy="Prepare audience-facing work without representing external distribution as complete."
            />
            <DirectionLink
              href={CreatorVaultRoute.creatorMoney}
              eyebrow="05 / EARN"
              title="Creator Earnings"
              copy="Review the existing earnings path and its available records."
              tone="gold"
            />
          </div>

          <div className="cv-panel mt-10 flex flex-col gap-6 border border-[#00D9FF]/25 bg-[#1A1A1A] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="cv-eyebrow eyebrow text-[#00D9FF]">
                <ShieldCheck className="mr-2 inline h-3.5 w-3.5" /> Truth stays
                with the work
              </p>
              <p className="body-md mt-2 max-w-2xl text-white/65">
                CreatorVault separates campaign atmosphere from a creator
                result. A result earns its status only where the record exists.
              </p>
            </div>
            <CtaLink href="/login" tone="outline">
              Creator sign in
            </CtaLink>
          </div>
        </div>
      </section>
    </main>
  );
}
