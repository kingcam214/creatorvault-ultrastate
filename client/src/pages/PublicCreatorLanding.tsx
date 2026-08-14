import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowUpRight, LockKeyhole, Play, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";

function priceFrom(product: any) {
  const cents = Number(product.salePrice ?? product.sale_price ?? product.priceAmount ?? product.price_amount ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function creatorIdFrom(product: any) {
  return Number(product.creatorId ?? product.creator_id ?? 0);
}

function isPublicOffer(product: any) {
  const identity = [product?.title, product?.shortDescription, product?.short_description, product?.description]
    .filter(Boolean)
    .join(" ");
  return !/\b(test|audit)\b/i.test(identity);
}

export default function PublicCreatorLanding() {
  const [, params] = useRoute("/creator/:handle");
  const handle = (params as { handle?: string } | null)?.handle?.replace(/^@/, "").toLowerCase() ?? "";
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const profileQuery = trpc.profile.getProfile.useQuery({ username: handle }, { enabled: Boolean(handle) });
  const productsQuery = trpc.marketplace.getProducts.useQuery();
  const checkout = trpc.marketplace.createCheckoutSession.useMutation({
    onSuccess: (result: any) => {
      if (result?.url) window.location.assign(result.url);
    },
    onError: (error) => {
      setCheckoutMessage(error.message || "Sign in to continue to secure checkout.");
    },
  });

  const profile = profileQuery.data?.profile ?? null;
  const offers = useMemo(() => {
    const products = Array.isArray(productsQuery.data) ? productsQuery.data : [];
    return profile ? products.filter((product: any) => creatorIdFrom(product) === Number(profile.userId) && isPublicOffer(product)).slice(0, 12) : [];
  }, [productsQuery.data, profile]);
  const heroOffer = offers.find((offer: any) => Boolean(offer.productVideo ?? offer.product_video));

  if (profileQuery.isLoading) {
    return <main className="min-h-screen bg-[#080706] text-white"><div className="mx-auto max-w-6xl px-5 py-32 sm:px-8"><div className="h-[28rem] animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04]" /></div></main>;
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#080706] px-5 py-24 text-white sm:px-8">
        <section className="mx-auto max-w-2xl rounded-[2rem] border border-white/10 bg-[#11100e] p-7 sm:p-12">
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#efd18c]">CreatorVault</p>
          <h1 className="mt-4 text-4xl font-black leading-[.9] tracking-[-.06em] sm:text-6xl">This creator link is not open to the public yet.</h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400">There is no verified public creator record attached to this handle, so CreatorVault will not invent a storefront, offer, preview, or audience.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/"><a className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#f3d899] px-6 font-black text-[#19130c]">Return to CreatorVault <ArrowUpRight className="h-4 w-4" /></a></Link><Link href="/signup"><a className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/20 px-6 font-black text-white">Open your CreatorVault</a></Link></div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080706] text-white selection:bg-[#f0d18a]/40">
      <section className="relative isolate min-h-[42rem] overflow-hidden border-b border-white/10">
        {heroOffer?.productVideo || heroOffer?.product_video ? <video src={heroOffer.productVideo ?? heroOffer.product_video} poster={heroOffer.mainImage ?? heroOffer.main_image ?? undefined} autoPlay loop muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" aria-label={`${profile.displayName} public offer motion`} /> : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(239,202,131,.18),transparent_34%),linear-gradient(180deg,rgba(4,3,3,.22),rgba(4,3,3,.9)_84%,#080706)]" />
        <div className="relative mx-auto flex min-h-[42rem] max-w-6xl flex-col px-5 py-7 sm:px-8 sm:py-10 lg:px-12">
          <Link href="/"><a className="inline-flex w-fit items-center gap-3"><img src="/logo-white.png" alt="CreatorVault" className="h-7" /><span className="border-l border-white/25 pl-3 text-[10px] font-black uppercase tracking-[.2em] text-[#efd18c]">Creator storefront</span></a></Link>
          <div className="mt-auto max-w-3xl pb-4 sm:pb-8">
            <div className="flex items-end gap-4 sm:gap-6">
              {profile.avatarUrl || profile.avatar ? <img src={profile.avatarUrl ?? profile.avatar} alt="" className="h-16 w-16 rounded-full border-2 border-[#efd18c] object-cover sm:h-20 sm:w-20" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#efd18c] bg-black/30 text-2xl font-black text-[#efd18c] sm:h-20 sm:w-20">{String(profile.displayName || profile.username).slice(0, 1).toUpperCase()}</div>}
              <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#efd18c]">Verified public creator</p><h1 className="mt-2 text-4xl font-black tracking-[-.06em] sm:text-6xl">{profile.displayName || profile.username}</h1><p className="mt-1 text-sm text-zinc-300">@{profile.username}</p></div>
            </div>
            {profile.bio && <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-100 sm:text-lg">{profile.bio}</p>}
            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-2 text-[10px] font-black uppercase tracking-[.16em] text-zinc-100 backdrop-blur"><ShieldCheck className="h-3.5 w-3.5 text-[#efd18c]" /> {offers.length ? `${offers.length} published offer${offers.length === 1 ? "" : "s"}` : "No published offer yet"}</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#efd18c]">Available now</p><h2 className="mt-3 text-4xl font-black leading-[.9] tracking-[-.06em] sm:text-6xl">{offers.length ? "Choose your access." : "Nothing is being sold here yet."}</h2></div>{offers.length > 0 && <p className="max-w-sm text-sm leading-relaxed text-zinc-400">Each offer below comes directly from this creator&apos;s active CreatorVault record. Prices and availability are never filled in by a template.</p>}</div>

        {productsQuery.isLoading ? <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><div className="h-80 animate-pulse rounded-[2rem] bg-white/[0.05]" /><div className="h-80 animate-pulse rounded-[2rem] bg-white/[0.05]" /></div> : offers.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer: any) => <article key={offer.id} className="group overflow-hidden rounded-[2rem] border border-white/10 bg-[#12100e]">
              <div className="relative aspect-[4/5] overflow-hidden bg-black">
                {offer.productVideo || offer.product_video ? <video src={offer.productVideo ?? offer.product_video} poster={offer.mainImage ?? offer.main_image ?? undefined} autoPlay loop muted playsInline preload="metadata" className="h-full w-full object-cover" aria-label={`${offer.title} motion preview`} /> : offer.mainImage || offer.main_image ? <img src={offer.mainImage ?? offer.main_image} alt={offer.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-end bg-[radial-gradient(circle_at_50%_0%,rgba(239,202,131,.18),transparent_46%),#11100e] p-6"><span className="text-xs font-black uppercase tracking-[.18em] text-[#efd18c]">CreatorVault access</span></div>}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_48%,rgba(4,3,3,.9))]" />
                <div className="absolute inset-x-0 bottom-0 p-5"><p className="text-xl font-black leading-tight">{offer.title}</p><p className="mt-2 text-lg font-black text-[#efd18c]">{priceFrom(offer)}</p></div>
              </div>
              <div className="p-5"><p className="min-h-10 text-sm leading-relaxed text-zinc-400">{offer.shortDescription ?? offer.short_description ?? offer.description ?? "Creator-selected access through CreatorVault."}</p><button type="button" onClick={() => { setCheckoutMessage(null); checkout.mutate({ productId: offer.id }); }} disabled={checkout.isPending} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#f3d899] px-5 text-sm font-black text-[#19130c] transition hover:bg-white disabled:opacity-50">{checkout.isPending ? "Opening secure checkout…" : "Continue to checkout"}<ArrowUpRight className="h-4 w-4" /></button></div>
            </article>)}
          </div>
        ) : <section className="mt-8 rounded-[2rem] border border-dashed border-white/15 bg-[#11100e] p-7 sm:p-10"><LockKeyhole className="h-7 w-7 text-[#efd18c]" /><h3 className="mt-5 text-2xl font-black">This storefront is waiting for the creator&apos;s first published offer.</h3><p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">CreatorVault keeps this page honest: it will not display made-up prices, locked previews, subscriber counts, or purchase activity while there is no active offer to show.</p></section>}
        {checkoutMessage && <p role="status" className="mt-6 rounded-2xl border border-[#efd18c]/25 bg-[#efd18c]/10 px-4 py-3 text-sm font-bold text-[#f7dfa6]">{checkoutMessage}</p>}
      </section>
    </main>
  );
}
