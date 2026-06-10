import {
  ArrowUpRight, BadgeDollarSign, Crown, Dumbbell, Film,
  Flame, Radio, Route, ShieldCheck, Sparkles,
  Target
} from "lucide-react";

const proofStats = [
  { label: "TikTok likes", value: "350.8K", detail: "Existing public social proof from the uploaded profile." },
  { label: "Followers", value: "17.7K", detail: "Audience base ready for a tracked VaultX soft launch." },
  { label: "Pinned proof", value: "3", detail: "Pinned video slots already frame the top-of-profile sales story." },
  { label: "Creator lane", value: "Abs Prime", detail: "Fitness-body identity that makes Body Cinema immediately legible." },
];

const launchLanes = [
  {
    icon: Film,
    title: "Body Cinema Cut",
    status: "Editor route ready",
    href: "/vault-x/editor",
    body: "Trim the public preview, keep the strongest payoff private, and attach the clip to an unlock path before distribution.",
    cta: "Open editor",
  },
  {
    icon: Radio,
    title: "Telegram Drop Route",
    status: "FAST / BOOST / FULL packaging",
    href: "/vaultx/distribution",
    body: "Turn the teaser into tracked route copy with a public hook, private CTA, follow-up logic, and proof code.",
    cta: "Build route",
  },
  {
    icon: BadgeDollarSign,
    title: "PPV + VIP Offer Stack",
    status: "Paid unlock structure",
    href: "/vaultx",
    body: "Package public heat, subscriber master, PPV unlock, and VIP upsell as one creator-owned revenue ladder.",
    cta: "Review VaultX",
  },
  {
    icon: Crown,
    title: "Empire Dossier",
    status: "Preserved creator story",
    href: "/greatest-show/thebiggestb",
    body: "Keep the deeper Fisk, ProArmorCore, faith, fitness, and entrepreneur narrative alive as long-form brand proof.",
    cta: "Open dossier",
  },
];

const packageStack = [
  { title: "Public Heat Teaser", value: "Free attention", body: "A vertical preview that sells the missing moment without burning the paid value.", accent: "from-pink-500 to-rose-500" },
  { title: "Subscriber Master", value: "Recurring value", body: "The full premium body-cinema scene for paying fans who want the complete drop.", accent: "from-cyan-400 to-blue-500" },
  { title: "PPV Unlock", value: "Direct purchase", body: "A one-click unlock route with checkout, tracking, and proof status attached.", accent: "from-yellow-400 to-orange-500" },
  { title: "VIP Upsell Kit", value: "Campaign layer", body: "Cover, caption, DM copy, private route, and escalation language built from the same asset.", accent: "from-purple-500 to-fuchsia-500" },
];

export function BCBPanel() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <section className="relative border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_5%,rgba(255,61,138,0.26),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(0,217,255,0.18),transparent_28%),linear-gradient(135deg,#050505,#120711_52%,#050505)]" />
        <div className="relative mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#C9A84C] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-black">
                  <Crown className="h-3.5 w-3.5" /> BCB Body Cinema Launch Room
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">
                  <ShieldCheck className="h-3.5 w-3.5" /> Non-destructive creator setup
                </span>
              </div>
              <h1 className="max-w-4xl text-4xl font-black leading-[0.96] tracking-tight md:text-7xl">
                Make BCB the soft-launch proof that VaultX turns motion into money routes.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/65 md:text-lg">
                This room connects her public proof, fitness-body identity, ProArmorCore lane, and adult-safe premium unlock path into one operating surface: profile, Body Cinema edit, Telegram route, paid package, and proof.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="/profile/officiallybcb" className="inline-flex min-h-12 items-center gap-2 rounded-sm bg-[#C9A84C] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-black transition hover:brightness-110">
                  View public profile <ArrowUpRight className="h-4 w-4" />
                </a>
                <a href="/vault-x/editor" className="inline-flex min-h-12 items-center gap-2 rounded-sm border border-white/10 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/10">
                  Cut Body Cinema <Film className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="relative rounded-[2rem] border border-white/10 bg-black/45 p-4 shadow-2xl shadow-pink-950/20 backdrop-blur-xl">
              <div className="aspect-[9/14] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,61,138,0.22),rgba(0,0,0,0.2)_38%,rgba(201,168,76,0.18)),radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.18),transparent_24%),#080808] p-5">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] text-white/55">
                  <span>@officiallybcb</span>
                  <span>Body Cinema</span>
                </div>
                <div className="mt-14 rounded-2xl border border-white/10 bg-black/45 p-5 backdrop-blur-md">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-[#C9A84C]">
                      <Dumbbell className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="text-lg font-black">God-Fearing Abs Prime</div>
                      <div className="text-xs text-white/55">Fisk '26 · ProArmorCore · Fitness body proof</div>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-white/70">
                    Public teaser hooks the eye. Subscriber master keeps the value. PPV unlock converts the moment. VIP kit turns it into a campaign.
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {proofStats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
                      <div className="text-xl font-black">{stat.value}</div>
                      <div className="text-[10px] uppercase tracking-[0.15em] text-white/45">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          {proofStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <div className="text-3xl font-black text-white">{stat.value}</div>
              <div className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-[#C9A84C]">{stat.label}</div>
              <p className="mt-3 text-sm leading-6 text-white/55">{stat.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-12 md:px-8 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
          <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#C9A84C]">
            <Target className="h-4 w-4" /> Soft-launch operating logic
          </div>
          <h2 className="text-3xl font-black">One creator, multiple pages, one revenue machine.</h2>
          <p className="mt-4 text-sm leading-7 text-white/60">
            The goal is not to delete or collapse her content. The goal is to make each BCB surface do a different job: public profile sells the proof, this panel controls the launch, Greatest Show preserves the empire story, VaultX editor builds the asset, and distribution routes the drop.
          </p>
          <div className="mt-6 space-y-3">
            {["Profile spotlight now recognizes BCB-specific handles.", "Panel no longer opens as a generic command surface.", "Existing Greatest Show BCB page stays preserved and linked.", "VaultX routes remain the money and distribution system."].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/35 p-3 text-sm text-white/70">
                <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-pink-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {launchLanes.map((lane) => {
            const Icon = lane.icon;
            return (
              <a key={lane.title} href={lane.href} className="group rounded-3xl border border-white/10 bg-[#0b0b0b] p-5 transition hover:-translate-y-1 hover:border-[#C9A84C]/60 hover:bg-white/[0.055]">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-[#C9A84C]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-white/35 transition group-hover:text-[#C9A84C]" />
                </div>
                <div className="text-xs font-black uppercase tracking-[0.16em] text-pink-300">{lane.status}</div>
                <h3 className="mt-2 text-xl font-black text-white">{lane.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/58">{lane.body}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#C9A84C]">
                  {lane.cta} <Route className="h-3.5 w-3.5" />
                </div>
              </a>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 md:px-8">
        <div className="mb-5 flex items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#C9A84C]"><Flame className="h-4 w-4" /> Package stack</div>
            <h2 className="mt-2 text-3xl font-black">The BCB Body Cinema money ladder</h2>
          </div>
          <a href="/vaultx" className="hidden text-xs font-black uppercase tracking-[0.16em] text-white/55 hover:text-white md:inline-flex">Open VaultX</a>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {packageStack.map((pkg) => (
            <div key={pkg.title} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
              <div className={`h-1.5 bg-gradient-to-r ${pkg.accent}`} />
              <div className="p-5">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-white/45">{pkg.value}</div>
                <h3 className="mt-2 text-xl font-black">{pkg.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/58">{pkg.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default BCBPanel;
