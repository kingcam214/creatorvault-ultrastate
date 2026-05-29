interface VisualCommandSurfaceProps {
  title: string;
  lane?: string;
}

const visualAssets = [
  {
    kind: 'video',
    src: '/videos/vaultx-cinematic-trailer.mp4',
    poster: '/videos/vaultx-cinematic-trailer-poster.png',
    label: 'Cinematic trailer engine',
  },
  {
    kind: 'image',
    src: '/images/reel/reel-creator-promo.png',
    label: 'Creator promo rail',
  },
  {
    kind: 'image',
    src: '/images/reel/reel-product-drop.png',
    label: 'Product drop visual',
  },
  {
    kind: 'image',
    src: '/images/vaultx/vaultx-business-presenter-hero.png',
    label: 'VaultX presenter proof',
  },
];

const playbook = [
  'Drop owned footage or visuals into the media vault.',
  'Turn raw attention into branded cuts, reels, cards, drops, or campaign assets.',
  'Route the finished asset into CreatorVault monetization, VaultX, Telegram, social, or offer pages.',
];

export function VisualCommandSurface({ title, lane = 'CreatorVault God Mode' }: VisualCommandSurfaceProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <section className="relative border-b border-white/10 px-6 py-10 sm:px-10 lg:px-16">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_top_left,_#f4c84a,_transparent_32%),radial-gradient(circle_at_bottom_right,_#7c3aed,_transparent_34%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.35em] text-yellow-200">
              {lane} · visual-first surface
            </p>
            <h1 className="max-w-4xl text-5xl font-black uppercase leading-[0.9] tracking-tight sm:text-7xl">
              {title}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-200">
              This surface is wired as a content weapon instead of a blank shell. It gives the operator a visual rail, a production intent, and a direct path for turning owned videos, images, products, creator footage, or campaign assets into monetizable CreatorVault outputs.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {['Owned media', 'AI video lab', 'Money route'].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/30">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">Active lane</p>
                  <p className="mt-2 text-lg font-black text-white">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-yellow-400/30 bg-black/60 p-3 shadow-[0_0_80px_rgba(250,204,21,0.16)]">
            <video
              className="aspect-video w-full rounded-[1.5rem] object-cover"
              src="/videos/vaultx-cinematic-trailer.mp4"
              poster="/videos/vaultx-cinematic-trailer-poster.png"
              autoPlay
              muted
              loop
              playsInline
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-10 sm:px-10 lg:grid-cols-4 lg:px-16">
        {visualAssets.map((asset) => (
          <article key={asset.src} className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-zinc-950 shadow-2xl shadow-black/30">
            {asset.kind === 'video' ? (
              <video className="h-44 w-full object-cover" src={asset.src} poster={asset.poster} autoPlay muted loop playsInline />
            ) : (
              <img className="h-44 w-full object-cover" src={asset.src} alt={asset.label} />
            )}
            <div className="p-4">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-yellow-200">{asset.label}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">Use this lane as a starting canvas, then replace or extend it with your own owned footage, creator visuals, campaign renders, or premium offer assets.</p>
            </div>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12 sm:px-10 lg:px-16">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">Operator playbook</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {playbook.map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-black/40 p-5">
                <p className="text-3xl font-black text-yellow-200">0{index + 1}</p>
                <p className="mt-3 text-sm leading-6 text-zinc-200">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
