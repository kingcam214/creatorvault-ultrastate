import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { safeStorage } from "@/lib/safeStorage";
import { HOMEPAGE_MEDIA_SEQUENCE } from "@/lib/homepageMediaRegistry";

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

function LoginMotionStage({
  videoSrc,
  posterSrc,
}: {
  videoSrc: string;
  posterSrc?: string;
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
    <div className="absolute inset-0 bg-[#0A0A0A]" aria-hidden="true">
      {showStill ? (
        posterSrc && !posterUnavailable ? (
          <img
            src={posterSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setPosterUnavailable(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_25%,rgba(0,217,255,.16),transparent_26%),linear-gradient(145deg,#1A1A1A_0%,#0A0A0A_68%)]" />
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
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => {
            videoRef.current?.pause();
            setVideoUnavailable(true);
          }}
        />
      )}
    </div>
  );
}

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const entryMotion = HOMEPAGE_MEDIA_SEQUENCE.find(
    asset => asset.assetId === "platform-marketplace-hero"
  );
  const inputClass =
    "cv-input w-full px-4 py-3.5 text-sm text-white placeholder:text-white/30";

  if (!entryMotion) {
    throw new Error("CreatorVault login requires certified public motion.");
  }

  const doLogin = async (emailVal: string, passwordVal: string) => {
    if (!emailVal || !passwordVal) {
      setError("Add your email and password to enter your CreatorVault.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: emailVal.trim(), password: passwordVal }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(
          data.error || "That email and password did not match. Try again."
        );
        setLoading(false);
        return;
      }
      if (data.token) {
        safeStorage.setItem("authToken", data.token);
        try {
          localStorage.setItem("authToken", data.token);
        } catch (_) {}
      }
      await new Promise(resolve => setTimeout(resolve, 150));
      const userRole = data.user?.role || "";
      if (userRole === "chica") {
        window.location.replace("/chica");
      } else if (userRole === "king" || userRole === "admin") {
        window.location.replace("/owner-cockpit");
      } else {
        window.location.replace("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(
        "CreatorVault could not reach your account right now. Please try again."
      );
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await doLogin(
      emailRef.current?.value ?? "",
      passwordRef.current?.value ?? ""
    );
  };

  return (
    <main className="cv-dna cv-page min-h-screen overflow-hidden bg-[#0A0A0A] text-white selection:bg-[#00D9FF]/30">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_.92fr]">
        <section
          className="relative isolate min-h-[34rem] overflow-hidden border-b border-white/10 lg:min-h-screen lg:border-b-0 lg:border-r"
          aria-labelledby="login-return-title"
        >
          <LoginMotionStage
            videoSrc={entryMotion.livePath}
            posterSrc={entryMotion.fallbackAsset}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,.12),rgba(10,10,10,.10)_32%,rgba(10,10,10,.92)_100%)]" />
          <div className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,rgba(10,10,10,.64),transparent_66%)]" />

          <div className="relative z-10 flex min-h-[34rem] flex-col p-6 sm:p-9 lg:min-h-screen lg:p-12 xl:p-16">
            <Link asChild href="/">
              <a
                className="inline-flex w-fit items-center gap-3"
                aria-label="Return to CreatorVault home"
              >
                <img src="/logo-white.png" alt="CreatorVault" className="h-8" />
                <span className="cv-eyebrow eyebrow border-l border-white/25 pl-3 text-[#00D9FF]">
                  Creator return
                </span>
              </a>
            </Link>
            <div className="mt-auto max-w-xl pb-3 sm:pb-7 lg:pb-12">
              <p className="cv-eyebrow eyebrow text-[#00D9FF]">
                Creator access / secure entry
              </p>
              <h1
                id="login-return-title"
                className="display-xl mt-5 text-white"
              >
                RETURN TO
                <br />
                <span className="text-[#00D9FF]">YOUR WORK.</span>
              </h1>
              <p className="body-lg mt-6 max-w-lg text-white/75">
                Your saved media, private directions, and existing creator rooms
                remain connected to your account.
              </p>
              <div className="mt-8 grid gap-3 border-t border-white/20 pt-5 text-white/70 sm:grid-cols-3">
                <span className="body-md flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#00D9FF]" /> Your media
                </span>
                <span className="body-md flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#00D9FF]" /> Your
                  direction
                </span>
                <span className="body-md flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#00D9FF]" /> Your next
                  move
                </span>
              </div>
            </div>
          </div>
        </section>

        <section
          className="relative flex min-h-screen items-center justify-center bg-[#0A0A0A] px-5 py-10 sm:px-8 lg:px-12"
          aria-labelledby="login-form-title"
        >
          <div className="pointer-events-none absolute right-[-10rem] top-[-8rem] h-[28rem] w-[28rem] bg-[#00D9FF]/[.07] blur-[120px]" />
          <div className="relative w-full max-w-md">
            <div className="mb-8 border-b border-white/10 pb-5">
              <p className="cv-eyebrow eyebrow text-[#00D9FF]">
                Account access
              </p>
              <h2 id="login-form-title" className="heading-xl mt-2 text-white">
                ENTER CREATORVAULT.
              </h2>
            </div>

            {error && (
              <p
                role="alert"
                className="cv-state mb-5 border border-[#FF3B3B]/30 bg-[#FF3B3B]/10 px-4 py-3 text-sm text-white"
              >
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <Field label="Email">
                <input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </Field>
              <Field label="Password">
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Your password"
                  className={inputClass}
                />
              </Field>
              <button
                type="submit"
                disabled={loading}
                className="cv-cta group w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Opening your room…" : "Enter my CreatorVault"}
                {!loading && (
                  <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                )}
              </button>
            </form>

            <div className="body-md mt-8 border-t border-white/10 pt-6 text-center text-white/50">
              New to CreatorVault?{" "}
              <Link asChild href="/signup">
                <a className="font-medium text-[#00D9FF] transition hover:text-white">
                  Open your account
                </a>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="cv-eyebrow eyebrow mb-2 block text-white/45">
        {label}
      </span>
      {children}
    </label>
  );
}
