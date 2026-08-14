import { useRef, useState } from "react";
import { ArrowUpRight, CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { safeStorage } from "@/lib/safeStorage";
import { HOMEPAGE_MEDIA_SEQUENCE } from "@/lib/homepageMediaRegistry";

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const entryMotion = HOMEPAGE_MEDIA_SEQUENCE.find((asset) => asset.assetId === "platform-marketplace-hero");
  const inputClass = "w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-sm font-medium text-white outline-none transition placeholder:text-zinc-600 focus:border-[#efd18c]/70 focus:bg-white/[0.07] focus:ring-2 focus:ring-[#efd18c]/15";

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
        setError(data.error || "That email and password did not match. Try again.");
        setLoading(false);
        return;
      }
      if (data.token) {
        safeStorage.setItem("authToken", data.token);
        try { localStorage.setItem("authToken", data.token); } catch (_) {}
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
      setError("CreatorVault could not reach your account right now. Please try again.");
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await doLogin(emailRef.current?.value ?? "", passwordRef.current?.value ?? "");
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#070606] text-white selection:bg-[#f0d18a]/40">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative isolate min-h-[37rem] overflow-hidden border-b border-white/10 lg:min-h-screen lg:border-b-0 lg:border-r">
          <video src={entryMotion.livePath} poster={entryMotion.fallbackAsset} autoPlay loop muted playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover" aria-label="CreatorVault creator and audience motion" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,3,3,.18),rgba(4,3,3,.1)_32%,rgba(4,3,3,.92)_100%)]" />
          <div className="absolute inset-y-0 left-0 w-full bg-[radial-gradient(circle_at_16%_58%,rgba(0,0,0,.3),transparent_48%)]" />

          <div className="relative z-10 flex min-h-[37rem] flex-col p-6 sm:p-9 lg:min-h-screen lg:p-12 xl:p-16">
            <Link href="/"><a className="inline-flex w-fit items-center gap-3"><img src="/logo-white.png" alt="CreatorVault" className="h-8" /><span className="border-l border-white/25 pl-3 text-[10px] font-black uppercase tracking-[.22em] text-[#f2d99c]">Creator return</span></a></Link>
            <div className="mt-auto max-w-xl pb-3 sm:pb-7 lg:pb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#efd18c]/45 bg-black/35 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-[#f7dfa6] backdrop-blur-md"><Sparkles className="h-3.5 w-3.5" /> Pick up where your work left off</div>
              <h1 className="mt-6 text-5xl font-black leading-[.84] tracking-[-.075em] sm:text-7xl">Come back to<br /><span className="text-[#f1d599]">your world.</span></h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-zinc-100 sm:text-lg">Your next creation, saved media, private release, and every decision around them live in one place that is still yours.</p>
              <div className="mt-8 grid gap-3 border-t border-white/20 pt-5 text-sm font-bold text-zinc-100 sm:grid-cols-3 sm:text-xs"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#efd18c]" /> Your media</span><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#efd18c]" /> Your direction</span><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#efd18c]" /> Your next move</span></div>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center bg-[#0b0908] px-5 py-10 sm:px-8 lg:px-12">
          <div className="pointer-events-none absolute -right-36 top-[-8rem] h-[30rem] w-[30rem] rounded-full bg-[#d7a75a]/10 blur-[110px]" />
          <div className="relative w-full max-w-md">
            <div className="mb-8 flex items-end justify-between border-b border-white/10 pb-5"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#ebce88]">Welcome back</p><h2 className="mt-2 text-3xl font-black tracking-[-.05em]">Enter your CreatorVault.</h2></div><span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-zinc-300">Private entry</span></div>

            {error && <p role="alert" className="mb-5 rounded-2xl border border-rose-300/25 bg-rose-300/10 px-4 py-3 text-sm font-bold text-rose-100">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <Field label="Email"><input ref={emailRef} id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" className={inputClass} /></Field>
              <Field label="Password"><input ref={passwordRef} id="password" name="password" type="password" autoComplete="current-password" required placeholder="Your password" className={inputClass} /></Field>
              <button type="submit" disabled={loading} className="group inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#f3d899] px-6 py-4 text-sm font-black text-[#181109] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Opening your room…" : "Enter my CreatorVault"}{!loading && <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}</button>
            </form>

            <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-zinc-400">New to CreatorVault? <Link href="/signup"><a className="font-black text-[#f0d18a] transition hover:text-white">Open your account</a></Link></div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-zinc-400">{label}</span>{children}</label>;
}
