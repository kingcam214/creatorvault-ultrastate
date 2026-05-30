interface VisualCommandSurfaceProps {
  title: string;
  lane?: string;
}

const visualAssets = [
  {
    kind: 'video',
    src: '/videos/vaultx-cinematic-trailer.mp4',
    poster: '/videos/vaultx-cinematic-trailer-poster.png',
    label: 'Living trailer rail',
    detail: 'A hero-grade motion layer for launch teasers, VIP previews, and paid-drop atmosphere.',
  },
  {
    kind: 'image',
    src: '/images/reel/reel-creator-promo.png',
    label: 'Creator promo card',
    detail: 'Static and story-safe cards built to move followers into the VaultX funnel.',
  },
  {
    kind: 'image',
    src: '/images/reel/reel-product-drop.png',
    label: 'Paid drop visual',
    detail: 'Offer packaging that separates public anticipation from private unlock value.',
  },
  {
    kind: 'image',
    src: '/images/vaultx/vaultx-business-presenter-hero.png',
    label: 'Operator proof frame',
    detail: 'Premium creator-OS positioning that makes the product feel credible, alive, and ready.',
  },
];

const commandCards = [
  { title: 'Ingest', copy: 'Pull owned clips, creator imagery, screenshots, product assets, or clone frames into one polished surface.' },
  { title: 'Direct', copy: 'Choose the release intent: teaser, PPV cover, VIP invite, motion flyer, or social cutdown.' },
  { title: 'Package', copy: 'Return the asset with captions, destination logic, safety notes, and a clear money route.' },
];

const outputLanes = ['VaultX teaser', 'VIP funnel', 'PPV cover', 'Motion flyer', 'Clone loop', 'Social cutdown'];

export function VisualCommandSurface({ title, lane = 'VaultX Media OS' }: VisualCommandSurfaceProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#040404] text-white">
      <section className="relative border-b border-white/10 px-6 py-12 sm:px-10 lg:px-16">
        <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_15%_15%,_rgba(250,204,21,0.35),_transparent_28%),radial-gradient(circle_at_85%_20%,_rgba(168,85,247,0.28),_transparent_30%),radial-gradient(circle_at_45%_95%,_rgba(14,165,233,0.18),_transparent_34%)]" />
        <div className="absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-yellow-300/10 blur-[110px]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-yellow-300/40 bg-yellow-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.35em] text-yellow-100 shadow-[0_0_40px_rgba(250,204,21,0.12)]">
              {lane} · immersive launch console
            </p>
            <h1 className="max-w-4xl text-5xl font-black uppercase leading-[0.88] tracking-tight sm:text-7xl">
              {title}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-200">
              This is no longer a blank utility page. It is a living media command surface for turning raw attention into anticipation, premium packaging, and paid creator movement. Every lane is designed to feel cinematic, adult-safe, conversion-aware, and ready for the first VaultX soft-launch audience.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {outputLanes.map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-zinc-200">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-yellow-300/20 via-fuchsia-500/10 to-cyan-400/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-yellow-300/30 bg-black/70 p-3 shadow-[0_0_90px_rgba(250,204,21,0.18)]">
              <video className="aspect-video w-full rounded-[1.5rem] object-cover" src="/videos/vaultx-cinematic-trailer.mp4" poster="/videos/vaultx-cinematic-trailer-poster.png" autoPlay muted loop playsInline />
              <div className="pointer-events-none absolute inset-x-6 bottom-6 rounded-2xl border border-white/10 bg-black/65 p-4 backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.32em] text-yellow-100">Live output stack</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {['1080p vertical', 'caption pack', 'money route'].map((item) => (
                    <div key={item} className="rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-100">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-10 sm:px-10 md:grid-cols-3 lg:px-16">
        {commandCards.map((card, index) => (
          <article key={card.title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/30">
            <p className="text-4xl font-black text-yellow-100">0{index + 1}</p>
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-white">{card.title}</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">{card.copy}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-10 sm:px-10 lg:grid-cols-4 lg:px-16">
        {visualAssets.map((asset) => (
          <article key={asset.src} className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-zinc-950 shadow-2xl shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-yellow-300/40">
            {asset.kind === 'video' ? (
              <video className="h-48 w-full object-cover opacity-90 transition duration-300 group-hover:scale-105" src={asset.src} poster={asset.poster} autoPlay muted loop playsInline />
            ) : (
              <img className="h-48 w-full object-cover opacity-90 transition duration-300 group-hover:scale-105" src={asset.src} alt={asset.label} />
            )}
            <div className="p-5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-yellow-100">{asset.label}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{asset.detail}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14 sm:px-10 lg:px-16">
        <div className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">VaultX release intelligence</p>
            <h2 className="mt-4 text-3xl font-black uppercase tracking-tight text-white">Every visual should leave with a job.</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              The upgraded media pipeline now treats output generation as a release package instead of a single file. Assets are planned with a provider route, public-safe positioning, destination-specific derivatives, and conversion intent.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {['Provider plan', 'Safety rule', 'Derivative list', 'Launch copy'].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-black/45 p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-100">Included</p>
                <p className="mt-2 text-lg font-black text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
