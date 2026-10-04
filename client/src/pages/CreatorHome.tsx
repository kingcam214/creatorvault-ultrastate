import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ArrowUpRight,
  BarChart3,
  Clapperboard,
  Crown,
  Layers3,
  Radio,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { CreatorVaultRoute } from "@/lib/productArchitecture";
import { HOMEPAGE_MEDIA } from "@/lib/homepageMediaRegistry";

const lanes: Array<{
  id: string;
  eyebrow: string;
  title: string;
  copy: string;
  href: string;
  icon: LucideIcon;
  tone: "cyan" | "gold";
}> = [
  {
    id: "create",
    eyebrow: "01 / CREATE",
    title: "Work from what you own",
    copy: "Start with a saved video, choose its direction, and work from the source that is already yours.",
    href: CreatorVaultRoute.bodyCinema,
    icon: Clapperboard,
    tone: "cyan",
  },
  {
    id: "access",
    eyebrow: "02 / ACCESS",
    title: "Turn a moment into access",
    copy: "Shape a private offer and give it an existing home inside VaultX.",
    href: CreatorVaultRoute.vaultX,
    icon: Crown,
    tone: "gold",
  },
  {
    id: "reach",
    eyebrow: "03 / REACH",
    title: "Build audience with intent",
    copy: "Prepare the moment for the places you choose to show up, without representing a release as sent.",
    href: CreatorVaultRoute.socialEmpire,
    icon: Radio,
    tone: "cyan",
  },
  {
    id: "earn",
    eyebrow: "04 / EARN",
    title: "Keep the money path visible",
    copy: "Review the creator earnings room and its existing records.",
    href: CreatorVaultRoute.creatorMoney,
    icon: WalletCards,
    tone: "gold",
  },
  {
    id: "learn",
    eyebrow: "05 / LEARN",
    title: "Learn from what happened",
    copy: "Open the creator intelligence lane and assess the records available to you.",
    href: CreatorVaultRoute.creatorIntelligence,
    icon: BarChart3,
    tone: "cyan",
  },
];

type Availability = "reading" | "available" | "unavailable";

type Readout = {
  label: string;
  value: string;
  availability: Availability;
};

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

function DashboardAmbient() {
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const [posterUnavailable, setPosterUnavailable] = useState(false);
  const ambient = HOMEPAGE_MEDIA.womenCreatorMotion;
  const showStill = reducedMotion || videoUnavailable;

  useEffect(() => {
    if (showStill) videoRef.current?.pause();
  }, [showStill]);

  return (
    <div className="absolute inset-0 bg-[#0A0A0A]" aria-hidden="true">
      {showStill ? (
        ambient.fallbackAsset && !posterUnavailable ? (
          <img
            src={ambient.fallbackAsset}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            onError={() => setPosterUnavailable(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(0,217,255,.16),transparent_28%),linear-gradient(145deg,#1A1A1A_0%,#0A0A0A_68%)]" />
        )
      ) : (
        <video
          ref={videoRef}
          src={ambient.livePath}
          poster={ambient.fallbackAsset || undefined}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover object-center"
          onError={() => {
            videoRef.current?.pause();
            setVideoUnavailable(true);
          }}
        />
      )}
    </div>
  );
}

function recordValue(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  return (value as Record<string, unknown>)[key];
}

function nestedValue(value: unknown, keys: string[]): unknown {
  return keys.reduce<unknown>(
    (current, key) => recordValue(current, key),
    value
  );
}

function countFrom(value: unknown): number | null {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? count : null;
}

function firstCount(...values: unknown[]): number | null {
  for (const value of values) {
    const count = countFrom(value);
    if (count !== null) return count;
  }
  return null;
}

function collectionFrom(value: unknown): readonly unknown[] {
  if (Array.isArray(value)) return value;
  const items = recordValue(value, "items");
  return Array.isArray(items) ? items : [];
}

function waitingDraftCount(value: unknown): number | null {
  if (!Array.isArray(value)) return null;
  return value.reduce((total, row) => {
    const status = String(recordValue(row, "status") ?? "");
    const count = countFrom(recordValue(row, "count")) ?? 0;
    return ["draft", "ready", "scheduled"].includes(status)
      ? total + count
      : total;
  }, 0);
}

function readout(
  label: string,
  value: number | null,
  isLoading: boolean,
  isError: boolean
): Readout {
  if (isLoading) return { label, value: "READING", availability: "reading" };
  if (isError || value === null)
    return { label, value: "UNAVAILABLE", availability: "unavailable" };
  return { label, value: String(value), availability: "available" };
}

export default function CreatorHome() {
  const { user } = useAuth();
  const socialSummary = trpc.socialSpine.commandSummary.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  });
  const mediaLibrary = trpc.mediaAssets.list.useQuery(
    { filter: "videos", limit: 4 },
    { retry: false, staleTime: 30_000 }
  );
  const summary = socialSummary.data as unknown;
  const mediaItems = collectionFrom(mediaLibrary.data);
  const nativePosts = firstCount(
    nestedValue(summary, ["native", "posts"]),
    nestedValue(summary, ["posts"])
  );
  const distributionDrafts = waitingDraftCount(
    nestedValue(summary, ["distribution"])
  );
  const packages = firstCount(
    nestedValue(summary, ["packages", "count"]),
    nestedValue(summary, ["packages"])
  );
  const creatorName = user?.name?.trim() || "Creator";
  const readouts = [
    readout(
      "Saved source videos",
      mediaLibrary.isSuccess ? mediaItems.length : null,
      mediaLibrary.isLoading,
      mediaLibrary.isError
    ),
    readout(
      "Native moments",
      nativePosts,
      socialSummary.isLoading,
      socialSummary.isError
    ),
    readout(
      "Drafts awaiting review",
      distributionDrafts,
      socialSummary.isLoading,
      socialSummary.isError
    ),
  ];

  return (
    <main className="cv-dna cv-page min-h-screen overflow-hidden bg-[#0A0A0A] pb-16 text-white sm:pb-24">
      <section
        className="relative isolate min-h-[34rem] overflow-hidden border-b border-white/10"
        aria-labelledby="creator-home-title"
      >
        <DashboardAmbient />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,.96)_0%,rgba(10,10,10,.78)_42%,rgba(10,10,10,.24)_78%),linear-gradient(180deg,rgba(10,10,10,.06)_0%,#0A0A0A_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-[28%] h-px bg-[linear-gradient(90deg,transparent,rgba(0,217,255,.62),transparent)]" />

        <div className="relative z-10 mx-auto flex min-h-[34rem] max-w-7xl flex-col justify-end px-5 pb-10 pt-28 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <p className="cv-eyebrow eyebrow text-[#00D9FF]">
              Creator OS / personal control room
            </p>
            <h1 id="creator-home-title" className="display-xl mt-4 text-white">
              WELCOME BACK,
              <br />
              <span className="text-[#00D9FF]">
                {creatorName.toUpperCase()}.
              </span>
            </h1>
            <p className="body-lg mt-6 max-w-2xl text-white/70">
              Start with the work you can identify, then choose the lane that
              matches your next decision.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link asChild href="/creator/video-studio">
                <a className="cv-cta">
                  <Clapperboard className="h-4 w-4" /> Open Video Studio
                </a>
              </Link>
              <Link asChild href="/creator/workspace">
                <a className="cv-cta-outline">
                  Open Workspace <ArrowUpRight className="h-4 w-4" />
                </a>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        className="mx-auto max-w-7xl px-5 pt-10 sm:px-8 sm:pt-14 lg:px-12"
        aria-labelledby="readout-title"
      >
        <div className="flex flex-col gap-4 border-b border-white/15 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="cv-eyebrow eyebrow text-[#00D9FF]">
              Read-only system record
            </p>
            <h2 id="readout-title" className="heading-xl mt-2 text-white">
              YOUR CURRENT SIGNAL.
            </h2>
          </div>
          <p className="body-md max-w-md text-white/55">
            These counts read the existing media library and social summary. A
            zero is a zero; unavailable is shown separately.
          </p>
        </div>

        <dl className="divide-y divide-white/10 border-b border-white/10">
          {readouts.map(item => (
            <div
              key={item.label}
              className="grid gap-2 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-8"
            >
              <dt className="body-md text-white/65">{item.label}</dt>
              <dd
                className={`heading-xl ${item.availability === "unavailable" ? "text-white/35" : item.availability === "reading" ? "cv-shimmer text-white/50" : "text-[#00D9FF]"}`}
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        className="mx-auto max-w-7xl px-5 pt-14 sm:px-8 lg:px-12"
        aria-labelledby="lanes-title"
      >
        <div className="flex flex-col gap-4 border-b border-white/15 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="cv-eyebrow eyebrow text-[#00D9FF]">
              Editorial lane list
            </p>
            <h2 id="lanes-title" className="heading-xl mt-2 text-white">
              CHOOSE THE NEXT MOVE.
            </h2>
          </div>
          <Link asChild href={CreatorVaultRoute.mediaVault}>
            <a className="body-md inline-flex items-center gap-2 text-[#00D9FF] transition hover:text-white">
              Open saved media <ArrowUpRight className="h-4 w-4" />
            </a>
          </Link>
        </div>

        <div>
          {lanes.map(lane => {
            const Icon = lane.icon;
            const accent =
              lane.tone === "gold" ? "text-[#C9A84C]" : "text-[#00D9FF]";
            return (
              <Link asChild key={lane.id} href={lane.href}>
                <a className="group grid gap-4 border-b border-white/10 py-7 transition-colors hover:border-white/45 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center sm:gap-8">
                  <span className={`cv-eyebrow eyebrow ${accent}`}>
                    {lane.eyebrow}
                  </span>
                  <span>
                    <span className="display-lg block text-white">
                      {lane.title}
                    </span>
                    <span className="body-md mt-2 block max-w-2xl text-white/60">
                      {lane.copy}
                    </span>
                  </span>
                  <span
                    className={`hidden h-11 w-11 items-center justify-center border border-white/20 transition group-hover:border-current sm:inline-flex ${accent}`}
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                </a>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pt-10 sm:px-8 lg:px-12">
        <div className="cv-panel flex flex-col gap-5 border border-[#00D9FF]/25 bg-[#1A1A1A] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="cv-eyebrow eyebrow text-[#00D9FF]">
              <Layers3 className="mr-2 inline h-3.5 w-3.5" /> Your source stays
              central
            </p>
            <p className="body-md mt-2 max-w-2xl text-white/60">
              Open the source-first studio or workspace when you are ready to
              work from an existing media record.
            </p>
          </div>
          <Link asChild href="/creator/video-studio">
            <a className="cv-cta-outline">
              Start with a source <ArrowUpRight className="h-4 w-4" />
            </a>
          </Link>
        </div>
      </section>
    </main>
  );
}
