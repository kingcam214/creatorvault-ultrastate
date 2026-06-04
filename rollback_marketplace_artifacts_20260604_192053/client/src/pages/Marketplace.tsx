import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { ArrowRight, BadgeDollarSign, Boxes, Crown, Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, TrendingUp } from "lucide-react";

const T = {
  bg: "#060606",
  panel: "rgba(255,255,255,0.045)",
  panelHigh: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.1)",
  text: "#f7f2e8",
  muted: "rgba(247,242,232,0.56)",
  faint: "rgba(247,242,232,0.34)",
  gold: "#c9a84c",
  cyan: "#00e5ff",
  green: "#10b981",
};

const CATEGORIES = ["all", "courses", "ebooks", "templates", "audio", "software", "services", "other"] as const;

type SortBy = "newest" | "popular" | "price-low" | "price-high";

const VERIFIED_MARKETPLACE_MEDIA: Record<string, string> = {
  "e7ffb4be-0455-11f1-a4a7-ee2cd6ad3437": "https://creatorvault.live/uploads/ppv_1778107488797/thumbnail.jpg",
  "c49f1146-c9fd-4cbd-9ec8-3d0490194621": "https://creatorvault.live/uploads/ppv_1778107488797/thumbnail.jpg",
};

function money(cents: number) {
  return `$${(Math.max(0, cents) / 100).toFixed(2)}`;
}

export default function Marketplace() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  const { data: products, isLoading } = trpc.marketplace.getProducts.useQuery();

  const filteredProducts = useMemo(() => {
    const normalized = (products ?? []).filter((p: any) => {
      const title = (p.title ?? "").toLowerCase();
      const shortDescription = (p.short_description ?? p.shortDescription ?? "").toLowerCase();
      const category = (p.category ?? "other").toLowerCase();
      const status = (p.status ?? "").toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || title.includes(query) || shortDescription.includes(query);
      const matchesCategory = categoryFilter === "all" || category.includes(categoryFilter) || (!p.category && categoryFilter === "other");
      return matchesSearch && matchesCategory && status === "active";
    });

    return normalized.sort((a: any, b: any) => {
      const salesA = a.sales_count ?? a.salesCount ?? 0;
      const salesB = b.sales_count ?? b.salesCount ?? 0;
      const priceA = a.sale_price ?? a.salePrice ?? a.price_amount ?? a.priceAmount ?? 0;
      const priceB = b.sale_price ?? b.salePrice ?? b.price_amount ?? b.priceAmount ?? 0;
      const dateA = new Date(a.created_at ?? a.createdAt ?? 0).getTime();
      const dateB = new Date(b.created_at ?? b.createdAt ?? 0).getTime();
      if (sortBy === "popular") return salesB - salesA;
      if (sortBy === "price-low") return priceA - priceB;
      if (sortBy === "price-high") return priceB - priceA;
      return dateB - dateA;
    });
  }, [products, searchQuery, categoryFilter, sortBy]);

  const catalogValue = filteredProducts.reduce((sum: number, p: any) => sum + (p.sale_price ?? p.salePrice ?? p.price_amount ?? p.priceAmount ?? 0), 0);
  const activeCount = (products ?? []).filter((p: any) => String(p.status ?? "").toLowerCase() === "active").length;

  return (
    <div className="min-h-screen text-white overflow-hidden relative" style={{ background: T.bg, fontFamily: "var(--kc-font-ui, Inter, sans-serif)" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 14% 6%, rgba(0,229,255,.18), transparent 30%), radial-gradient(circle at 82% 12%, rgba(201,168,76,.22), transparent 32%), radial-gradient(circle at 54% 92%, rgba(16,185,129,.10), transparent 38%)" }} />
      <div className="absolute inset-0 pointer-events-none opacity-[.06]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.55) 1px, transparent 1px)", backgroundSize: "52px 52px" }} />

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <section className="grid lg:grid-cols-[1.15fr_.85fr] gap-6 mb-7">
          <div className="rounded-[2rem] p-6 md:p-8" style={{ background: "linear-gradient(135deg, rgba(255,255,255,.07), rgba(255,255,255,.028))", border: `1px solid ${T.border}`, boxShadow: "0 34px 100px rgba(0,0,0,.46)" }}>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-5" style={{ background: "rgba(0,229,255,.1)", border: "1px solid rgba(0,229,255,.26)", color: T.cyan }}>
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-[.2em]">CreatorVault Commerce OS</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-[-.06em] leading-[.9] max-w-4xl">Premium drops that feel curated, scarce, and ready to buy.</h1>
            <p className="mt-5 max-w-2xl text-base md:text-lg leading-8" style={{ color: T.muted }}>Browse conversion-grade templates, creator playbooks, digital assets, and operator products with a storefront hierarchy built for trust, clarity, and quick purchase intent.</p>
            <div className="grid sm:grid-cols-3 gap-3 mt-7 max-w-3xl">
              {[
                { icon: Boxes, label: "Active inventory", value: `${activeCount}`, color: T.cyan },
                { icon: BadgeDollarSign, label: "Visible catalog", value: money(catalogValue), color: T.gold },
                { icon: ShieldCheck, label: "Buyer path", value: "Verified", color: T.green },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="rounded-2xl p-4" style={{ background: "rgba(0,0,0,.28)", border: `1px solid ${color}33` }}>
                  <Icon className="w-4 h-4 mb-3" style={{ color }} />
                  <div className="text-2xl font-black" style={{ color }}>{value}</div>
                  <div className="text-xs font-bold uppercase tracking-[.14em] mt-1" style={{ color: T.faint }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] p-5 md:p-6 flex flex-col justify-between" style={{ background: "linear-gradient(180deg, rgba(201,168,76,.16), rgba(255,255,255,.04))", border: "1px solid rgba(201,168,76,.25)", boxShadow: "0 28px 90px rgba(0,0,0,.42)" }}>
            <div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "linear-gradient(135deg,#c9a84c,#f3d68b)", color: "#070707" }}><Crown className="w-6 h-6" /></div>
              <h2 className="text-3xl font-black tracking-[-.04em] leading-none">Signal over shelf clutter.</h2>
              <p className="mt-4 text-sm leading-7" style={{ color: T.muted }}>Every card now presents product type, price, discount state, buyer momentum, and a clear acquire path without raw debug artifacts or collapsed visual hierarchy.</p>
            </div>
            <div className="mt-6 rounded-2xl p-4" style={{ background: "rgba(0,0,0,.28)", border: `1px solid ${T.border}` }}>
              <div className="text-xs uppercase tracking-[.2em] font-black" style={{ color: T.gold }}>Current view</div>
              <div className="mt-2 text-2xl font-black">{isLoading ? "Loading" : `${filteredProducts.length} products`}</div>
              <div className="mt-1 text-xs" style={{ color: T.muted }}>{categoryFilter === "all" ? "All categories" : categoryFilter.toUpperCase()} · {sortBy.replace("-", " ")}</div>
            </div>
          </aside>
        </section>

        <section className="rounded-[1.75rem] p-4 md:p-5 mb-6" style={{ background: "rgba(255,255,255,.045)", border: `1px solid ${T.border}`, backdropFilter: "blur(18px)" }}>
          <div className="grid lg:grid-cols-[1fr_auto] gap-4 items-center">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: T.cyan }} />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search products, playbooks, templates..." className="pl-11 h-12 rounded-2xl" style={{ background: "rgba(0,0,0,.34)", borderColor: "rgba(0,229,255,.22)", color: T.text }} />
            </div>
            <div className="flex items-center gap-2 justify-between lg:justify-end overflow-x-auto pb-1">
              <SlidersHorizontal className="w-4 h-4 flex-shrink-0" style={{ color: T.muted }} />
              {([{ key: "newest", label: "Newest" }, { key: "popular", label: "Popular" }, { key: "price-low", label: "Price ↑" }, { key: "price-high", label: "Price ↓" }] as const).map((s) => {
                const active = sortBy === s.key;
                return <button key={s.key} onClick={() => setSortBy(s.key)} className="px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap" style={{ background: active ? "rgba(201,168,76,.18)" : "rgba(255,255,255,.045)", border: `1px solid ${active ? "rgba(201,168,76,.42)" : T.border}`, color: active ? T.gold : T.muted }}>{s.label}</button>;
              })}
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto mt-4 pb-1">
            {CATEGORIES.map((cat) => {
              const active = categoryFilter === cat;
              return <button key={cat} onClick={() => setCategoryFilter(cat)} className="px-4 py-2 rounded-xl text-[11px] uppercase tracking-[.16em] font-black whitespace-nowrap" style={{ background: active ? "rgba(0,229,255,.14)" : "rgba(255,255,255,.04)", border: `1px solid ${active ? "rgba(0,229,255,.42)" : T.border}`, color: active ? T.cyan : T.muted }}>{cat}</button>;
            })}
          </div>
        </section>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-96 animate-pulse rounded-[1.75rem]" style={{ background: T.panel, border: `1px solid ${T.border}` }} />)}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-24 text-center rounded-[2rem]" style={{ background: T.panel, border: `1px solid ${T.border}` }}>
            <ShoppingBag className="w-12 h-12 mx-auto mb-4" style={{ color: T.faint }} />
            <p className="text-3xl font-black mb-2 tracking-[-.04em]">No products match this command.</p>
            <p className="text-sm" style={{ color: T.muted }}>Try another search, category, or sort signal.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product: any) => {
              const mainImage = product.main_image ?? product.mainImage ?? VERIFIED_MARKETPLACE_MEDIA[String(product.id)] ?? "https://creatorvault.live/uploads/ppv_1778107488797/thumbnail.jpg";
              const rawPrice = product.sale_price ?? product.salePrice ?? product.price_amount ?? product.priceAmount ?? 0;
              const basePrice = product.price_amount ?? product.priceAmount ?? rawPrice;
              const salesCount = product.sales_count ?? product.salesCount ?? 0;
              const productType = product.type ?? "digital";
              const description = product.short_description ?? product.shortDescription ?? product.description ?? "Verified production marketplace product";
              const hasDiscount = rawPrice < basePrice;
              return (
                <article key={product.id} className="group cursor-pointer rounded-[1.75rem] overflow-hidden transition-all hover:-translate-y-1" onClick={() => navigate(`/marketplace/${product.id}`)} style={{ background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.026))", border: `1px solid ${T.border}`, boxShadow: "0 24px 80px rgba(0,0,0,.34)" }}>
                  <div className="aspect-[4/3] relative" style={{ background: "rgba(255,255,255,.04)" }}>
                    {mainImage ? <img src={mainImage} alt={product.title ?? "Marketplace product"} className="w-full h-full object-cover group-hover:scale-[1.035] transition-transform duration-500" /> : <div className="absolute inset-0 flex items-center justify-center"><ShoppingBag className="w-12 h-12" style={{ color: T.faint }} /></div>}
                    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.02), rgba(0,0,0,.72))" }} />
                    <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[.16em] font-black" style={{ background: "rgba(0,0,0,.62)", border: `1px solid ${T.border}`, color: T.cyan }}>{productType}</div>
                    <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[.16em] font-black" style={{ background: "rgba(201,168,76,.18)", border: "1px solid rgba(201,168,76,.42)", color: T.gold }}>{hasDiscount ? "Drop price" : "Acquire"}</div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-4">
                      <div>
                        <div className="text-3xl font-black" style={{ color: T.gold }}>{money(rawPrice)}</div>
                        {hasDiscount && <div className="text-xs line-through" style={{ color: T.muted }}>{money(basePrice)}</div>}
                      </div>
                      <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "rgba(0,0,0,.54)", color: T.muted, border: `1px solid ${T.border}` }}><TrendingUp className="w-3.5 h-3.5" />{salesCount > 0 ? `${salesCount} sold` : "new"}</div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-xl font-black tracking-[-.03em] line-clamp-1" style={{ color: T.text }}>{product.title ?? "Premium creator drop"}</h3>
                    <p className="mt-2 text-sm leading-6 line-clamp-2" style={{ color: T.muted }}>{description}</p>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-[.18em] font-black" style={{ color: T.faint }}>{product.category ?? "digital"}</span>
                      <span className="inline-flex items-center gap-1 text-sm font-black" style={{ color: T.cyan }}>View drop <ArrowRight className="w-4 h-4" /></span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
