import React from "react";
import { Crown, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { BrandOverlayState, LogoStingPreset } from "./types";

export type BrandOverlayTrackProps = {
  value: BrandOverlayState;
  onChange: (next: BrandOverlayState) => void;
};

function updateOverlay(
  value: BrandOverlayState,
  onChange: BrandOverlayTrackProps["onChange"],
  patch: Partial<BrandOverlayState>
): void {
  onChange({ ...value, ...patch });
}

function OverlaySwitch({
  id,
  label,
  detail,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  detail: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
      <div>
        <label htmlFor={id} className="text-sm font-bold text-white">
          {label}
        </label>
        <p className="mt-0.5 text-xs leading-relaxed text-white/55">{detail}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="data-[state=checked]:bg-[#D4AF37]"
      />
    </div>
  );
}

export function CreatorVaultLogoSting({ preset }: { preset: LogoStingPreset }) {
  const isSweep = preset === "gold-sweep";
  return (
    <div className="flex items-center gap-2 rounded-full border border-[#D4AF37]/45 bg-[#0A0A0A]/85 px-3 py-2 shadow-[0_0_34px_rgba(212,175,55,0.26)] backdrop-blur">
      <svg
        aria-hidden="true"
        viewBox="0 0 42 28"
        className="h-7 w-10 overflow-visible"
      >
        <path
          d="M5 22 8 8l7 6 6-11 6 11 7-6 3 14H5Z"
          fill="none"
          stroke="#D4AF37"
          strokeWidth="2"
        >
          <animate
            attributeName="stroke-dashoffset"
            values={isSweep ? "80;0" : "0;0"}
            dur="1.2s"
            repeatCount="indefinite"
          />
        </path>
        <circle cx="21" cy="5" r="2" fill="#D4AF37">
          <animate
            attributeName="r"
            values="1.2;2.6;1.2"
            dur="1.35s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
      <span className="font-serif text-sm font-bold tracking-[0.14em] text-[#F6E7B0]">
        CREATORVAULT
      </span>
    </div>
  );
}

export function BrandOverlayPreview({
  overlay,
  currentTimeSec,
  durationSec,
}: {
  overlay: BrandOverlayState;
  currentTimeSec: number;
  durationSec: number;
}) {
  const showEndCard =
    overlay.endCardEnabled &&
    durationSec > 0 &&
    currentTimeSec >= Math.max(0, durationSec - 3.5);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {overlay.introLogoEnabled && currentTimeSec <= 2.4 ? (
        <div className="absolute left-1/2 top-5 -translate-x-1/2">
          <CreatorVaultLogoSting preset={overlay.introPreset} />
        </div>
      ) : null}
      {overlay.lowerThirdEnabled &&
      (overlay.trackName || overlay.artistName) ? (
        <div className="absolute bottom-5 left-5 max-w-[calc(100%-2.5rem)] border-l-2 border-[#D4AF37] bg-[#0A0A0A]/86 px-3 py-2.5 shadow-xl backdrop-blur">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">
            Now playing
          </p>
          <p className="mt-1 truncate text-sm font-bold text-white">
            {overlay.trackName || "Untitled track"}
            {overlay.artistName ? ` · ${overlay.artistName}` : ""}
          </p>
        </div>
      ) : null}
      {showEndCard ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(106,23,51,0.26),rgba(10,10,10,0.88)_72%)] px-6 text-center">
          <div className="max-w-xs">
            <CreatorVaultLogoSting preset={overlay.introPreset} />
            <p className="mt-5 text-lg font-black tracking-[0.08em] text-white">
              {overlay.endCardCta || "FOLLOW THE VAULT"}
            </p>
          </div>
        </div>
      ) : null}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_34%,rgba(10,10,10,0.9)_100%)]"
        style={{ opacity: overlay.vignetteStrength / 100 }}
      />
    </div>
  );
}

export function BrandOverlayTrack({ value, onChange }: BrandOverlayTrackProps) {
  return (
    <section
      aria-labelledby="brand-overlay-heading"
      className="rounded-2xl border border-[#D4AF37]/25 bg-[#11100D] p-4 shadow-[0_20px_60px_-45px_rgba(212,175,55,0.9)]"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 text-[#D4AF37]">
          <Crown className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">
            Overlay track
          </p>
          <h2
            id="brand-overlay-heading"
            className="mt-1 text-lg font-black text-white"
          >
            Brand treatment
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-white/60">
            Preview real overlays against a persisted segment. This panel does
            not claim an exported master.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <OverlaySwitch
          id="intro-logo-toggle"
          label="Intro logo sting"
          detail="A lightweight animated SVG crown mark over the opening seconds."
          checked={value.introLogoEnabled}
          onCheckedChange={introLogoEnabled =>
            updateOverlay(value, onChange, { introLogoEnabled })
          }
        />
        {value.introLogoEnabled ? (
          <fieldset className="rounded-xl border border-white/10 bg-black/20 p-3">
            <legend className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
              Sting preset
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["crown-reveal", "gold-sweep"] as const).map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    updateOverlay(value, onChange, { introPreset: preset })
                  }
                  className={`min-h-11 rounded-lg border px-3 text-xs font-black uppercase tracking-[0.1em] transition ${value.introPreset === preset ? "border-[#D4AF37] bg-[#D4AF37]/15 text-[#F6E7B0]" : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/30"}`}
                >
                  {preset === "crown-reveal" ? "Crown reveal" : "Gold sweep"}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        <OverlaySwitch
          id="lower-third-toggle"
          label="Now playing lower-third"
          detail="Uses your current track and artist labels without modifying the music file."
          checked={value.lowerThirdEnabled}
          onCheckedChange={lowerThirdEnabled =>
            updateOverlay(value, onChange, { lowerThirdEnabled })
          }
        />
        {value.lowerThirdEnabled ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              aria-label="Track title"
              value={value.trackName}
              onChange={event =>
                updateOverlay(value, onChange, {
                  trackName: event.target.value.slice(0, 120),
                })
              }
              placeholder="Track title"
              className="h-11 border-white/10 bg-black/25 text-white placeholder:text-white/35"
            />
            <Input
              aria-label="Artist name"
              value={value.artistName}
              onChange={event =>
                updateOverlay(value, onChange, {
                  artistName: event.target.value.slice(0, 120),
                })
              }
              placeholder="Artist"
              className="h-11 border-white/10 bg-black/25 text-white placeholder:text-white/35"
            />
          </div>
        ) : null}

        <OverlaySwitch
          id="end-card-toggle"
          label="End-card CTA"
          detail="A burgundy vignette and creator-controlled CTA during the final 3.5 seconds."
          checked={value.endCardEnabled}
          onCheckedChange={endCardEnabled =>
            updateOverlay(value, onChange, { endCardEnabled })
          }
        />
        {value.endCardEnabled ? (
          <Input
            aria-label="End-card call to action"
            value={value.endCardCta}
            onChange={event =>
              updateOverlay(value, onChange, {
                endCardCta: event.target.value.slice(0, 80).toUpperCase(),
              })
            }
            placeholder="FOLLOW THE VAULT"
            className="h-11 border-white/10 bg-black/25 text-white placeholder:text-white/35"
          />
        ) : null}

        <label className="block rounded-xl border border-white/10 bg-black/20 p-3">
          <span className="flex items-center justify-between text-xs font-bold text-white">
            <span>Vignette density</span>
            <span className="text-[#D4AF37]">{value.vignetteStrength}%</span>
          </span>
          <input
            aria-label="Vignette density"
            type="range"
            min="20"
            max="90"
            value={value.vignetteStrength}
            onChange={event =>
              updateOverlay(value, onChange, {
                vignetteStrength: Number(event.target.value),
              })
            }
            className="mt-3 w-full accent-[#D4AF37]"
          />
        </label>
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-white/45">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
        Preview controls are local timeline direction. A final branded
        render/export is not created by this screen.
      </p>
    </section>
  );
}
