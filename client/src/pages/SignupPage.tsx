import { useState } from "react";
import { ArrowUpRight, CheckCircle2, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { HOMEPAGE_MEDIA_SEQUENCE } from "@/lib/homepageMediaRegistry";
import { toast } from "sonner";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const signupMotion = HOMEPAGE_MEDIA_SEQUENCE.find((asset) => asset.assetId === "platform-dashboard-hero");
  const inputClass = "w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3.5 text-sm font-medium text-white outline-none transition placeholder:text-zinc-600 focus:border-[#efd18c]/70 focus:bg-white/[0.07] focus:ring-2 focus:ring-[#efd18c]/15";

  if (!signupMotion) {
    throw new Error("CreatorVault signup requires certified public motion.");
  }

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: () => {
      toast.success("Your CreatorVault account is ready. Sign in to enter your creation room.");
      setLocation("/login");
    },
    onError: (err) => {
      setError(err.message || "Your account could not be opened yet. Please try again.");
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!email || !username || !password) {
      setError("Add your email, creator name, and password to open your account.");
      return;
    }
    signupMutation.mutate({ email, username, password, name: name || undefined, role: "creator" });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#070606] text-white selection:bg-[#f0d18a]/40">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative isolate min-h-[40rem] overflow-hidden border-b border-white/10 lg:min-h-screen lg:border-b-0 lg:border-r">
          <video
            src={signupMotion.livePath}
            poster={signupMotion.fallbackAsset}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
            aria-label="CreatorVault creator-at-work motion"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,3,3,.18),rgba(4,3,3,.12)_32%,rgba(4,3,3,.92)_100%)]" />
          <div className="absolute inset-y-0 left-0 w-full bg-[radial-gradient(circle_at_16%_58%,rgba(0,0,0,.26),transparent_48%)]" />

          <div className="relative z-10 flex min-h-[40rem] flex-col p-6 sm:p-9 lg:min-h-screen lg:p-12 xl:p-16">
            <Link href="/"><a className="inline-flex w-fit items-center gap-3"><img src="/logo-white.png" alt="CreatorVault" className="h-8" /><span className="border-l border-white/25 pl-3 text-[10px] font-black uppercase tracking-[.22em] text-[#f2d99c]">Creator entry</span></a></Link>

            <div className="mt-auto max-w-xl pb-3 sm:pb-7 lg:pb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#efd18c]/45 bg-black/35 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-[#f7dfa6] backdrop-blur-md"><Sparkles className="h-3.5 w-3.5" /> Your world starts with your work</div>
              <h1 className="mt-6 text-5xl font-black leading-[.84] tracking-[-.075em] sm:text-7xl">Make the next move<br /><span className="text-[#f1d599]">feel like yours.</span></h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-zinc-100 sm:text-lg">Open your CreatorVault account and step into a creation room built around the media, visual direction, and release decisions you control.</p>
              <div className="mt-8 grid gap-3 border-t border-white/20 pt-5 text-sm font-bold text-zinc-100 sm:grid-cols-3 sm:text-xs">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#efd18c]" /> Bring your media</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#efd18c]" /> Build your drop</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#efd18c]" /> Move on your terms</span>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center bg-[#0b0908] px-5 py-10 sm:px-8 lg:px-12">
          <div className="pointer-events-none absolute -right-36 top-[-8rem] h-[30rem] w-[30rem] rounded-full bg-[#d7a75a]/10 blur-[110px]" />
          <div className="relative w-full max-w-md">
            <div className="mb-8 flex items-end justify-between border-b border-white/10 pb-5">
              <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#ebce88]">Open your CreatorVault</p><h2 className="mt-2 text-3xl font-black tracking-[-.05em]">Your creation room is waiting.</h2></div>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-zinc-300">Creator</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Your name" optional>
                  <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="How should we call you?" className={inputClass} />
                </Field>
                <Field label="Creator name">
                  <input type="text" value={username} onChange={(event) => setUsername(event.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} placeholder="your_creator_name" autoComplete="username" className={inputClass} />
                </Field>
              </div>
              <Field label="Email">
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" className={inputClass} />
              </Field>
              <Field label="Password">
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete="new-password" className={inputClass} />
              </Field>

              {error && <p role="alert" className="rounded-2xl border border-rose-300/25 bg-rose-300/10 px-4 py-3 text-sm font-bold text-rose-100">{error}</p>}

              <button type="submit" disabled={signupMutation.isPending} className="group inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#f3d899] px-6 py-4 text-sm font-black text-[#181109] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">
                {signupMutation.isPending ? "Opening your account…" : "Open my CreatorVault"}
                {!signupMutation.isPending && <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
              </button>
            </form>

            <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-zinc-400">Already inside? <Link href="/login"><a className="font-black text-[#f0d18a] transition hover:text-white">Enter your room</a></Link></div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, optional = false, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[.16em] text-zinc-400"><span>{label}</span>{optional && <span className="text-zinc-600">Optional</span>}</span>{children}</label>;
}
