import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, ShoppingBag, TrendingUp, Sparkles } from "lucide-react";

const T = {
  bg: "#0a0a0a",
  surface: "#141414",
  surfaceHigh: "#1a1a1a",
  border: "rgba(255,255,255,0.08)",
  text: "#f5f0e8",
  textMuted: "rgba(245,240,232,0.45)",
  gold: "#c9a84c",
  goldDim: "rgba(201,168,76,0.15)",
};

const CATEGORIES = [
  "all",
  "courses",
  "ebooks",
  "templates",
  "audio",
  "software",
  "services",
  "other",
] as const;

type SortBy = "newest" | "popular" | "price-low" | "price-high";

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

      const matchesSearch =
        !searchQuery || title.includes(searchQuery.toLowerCase()) || shortDescription.includes(searchQuery.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || category.includes(categoryFilter) || (!p.category && categoryFilter === "other");

      return matchesSearch && matchesCategory && status === "active";
    });

    return normalized.sort((a: any, b: any) => {
      const salesA = a.sales_count ?? a.salesCount ?? 0;
      const salesB = b.sales_count ?? b.salesCount ?? 0;
      const priceA = a.sale_price ?? a.salePrice ?? a.price_amount ?? a.priceAmount ?? 0;
      const priceB = b.sale_price ?? b.salePrice ?? b.price_amount ?? b.priceAmount ?? 0;
      const dateA = new Date(a.created_at ?? a.createdAt ?? 0).getTime();
      const dateB = new Date(b.created_at ?? b.createdAt ?? 0).getTime();

      switch (sortBy) {
        case "popular":
          return salesB - salesA;
        case "price-low":
          return priceA - priceB;
        case "price-high":
          return priceB - priceA;
        case "newest":
        default:
          return dateB - dateA;
      }
    });
  }, [products, searchQuery, categoryFilter, sortBy]);

  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] mb-2" style={{ color: T.gold }}>
            CreatorVault
          </p>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "Playfair Display, serif" }}>
            Marketplace
          </h1>
          <p className="mt-2 text-sm" style={{ color: T.textMuted }}>
            Premium digital drops, playbooks, and creator assets.
          </p>
        </header>

        <section
          className="p-4 md:p-5 mb-6"
          style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "2px" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.textMuted }} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="pl-9 h-10"
                style={{
                  background: T.surfaceHigh,
                  borderColor: T.border,
                  color: T.text,
                }}
              />
            </div>

            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {CATEGORIES.map((cat) => {
                const active = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className="px-3 py-2 text-xs uppercase tracking-widest font-semibold whitespace-nowrap"
                    style={{
                      background: active ? T.goldDim : T.surfaceHigh,
                      border: `1px solid ${active ? T.gold : T.border}`,
                      color: active ? T.gold : T.textMuted,
                      borderRadius: "2px",
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs md:text-sm" style={{ color: T.textMuted }}>
              {isLoading ? "Loading products..." : `${filteredProducts.length} products found`}
            </p>

            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" style={{ color: T.textMuted }} />
              <div className="flex rounded-sm overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
                {([
                  { key: "newest", label: "Newest" },
                  { key: "popular", label: "Popular" },
                  { key: "price-low", label: "$ ↑" },
                  { key: "price-high", label: "$ ↓" },
                ] as const).map((s) => {
                  const active = sortBy === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setSortBy(s.key)}
                      className="px-2.5 md:px-3 py-1.5 text-[11px] md:text-xs font-semibold"
                      style={{
                        background: active ? T.goldDim : T.surface,
                        color: active ? T.gold : T.textMuted,
                        borderLeft: s.key !== "newest" ? `1px solid ${T.border}` : "none",
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-72 animate-pulse"
                style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "2px" }}
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "2px" }}>
            <ShoppingBag className="w-10 h-10 mx-auto mb-3" style={{ color: T.textMuted }} />
            <p className="text-xl mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
              No products match your filters.
            </p>
            <p className="text-sm" style={{ color: T.textMuted }}>
              Try another search, category, or sorting style.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product: any) => {
              const mainImage = product.main_image ?? product.mainImage;
              const rawPrice = product.sale_price ?? product.salePrice ?? product.price_amount ?? product.priceAmount ?? 0;
              const basePrice = product.price_amount ?? product.priceAmount ?? rawPrice;
              const salesCount = product.sales_count ?? product.salesCount ?? 0;
              const productType = product.type ?? "digital";

              return (
                <article
                  key={product.id}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/marketplace/${product.id}`)}
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: "2px",
                    overflow: "hidden",
                  }}
                >
                  <div className="aspect-square relative" style={{ background: T.surfaceHigh }}>
                    {mainImage ? (
                      <img src={mainImage} alt={product.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8" style={{ color: T.textMuted }} />
                      </div>
                    )}

                    <div className="absolute top-2 left-2 px-2 py-1 text-[10px] uppercase tracking-widest"
                      style={{ background: "rgba(10,10,10,0.78)", border: `1px solid ${T.border}`, color: T.textMuted, borderRadius: "2px" }}>
                      {productType}
                    </div>

                    <div className="absolute top-2 right-2 px-2 py-1 text-[10px] uppercase tracking-widest"
                      style={{ background: T.goldDim, border: `1px solid ${T.gold}`, color: T.gold, borderRadius: "2px" }}>
                      Acquire
                    </div>
                  </div>

                  <div className="p-3">
                    <h3 className="text-sm font-semibold line-clamp-1 mb-1" style={{ color: T.text }}>
                      {product.title}
                    </h3>

                    <p className="text-xs line-clamp-2 mb-3" style={{ color: T.textMuted }}>
                      {product.short_description ?? product.shortDescription ?? product.description ?? "Premium creator drop"}
                    </p>

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-lg font-bold" style={{ color: T.gold, fontFamily: "Playfair Display, serif" }}>
                          ${(rawPrice / 100).toFixed(2)}
                        </p>
                        {rawPrice < basePrice && (
                          <p className="text-xs line-through" style={{ color: T.textMuted }}>
                            ${(basePrice / 100).toFixed(2)}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs" style={{ color: T.textMuted }}>
                        <TrendingUp className="w-3 h-3" />
                        {salesCount > 0 ? `${salesCount} sold` : "new"}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer className="mt-8 text-xs flex items-center gap-2" style={{ color: T.textMuted }}>
          <Sparkles className="w-3.5 h-3.5" style={{ color: T.gold }} />
          Curated marketplace tuned for premium creator conversion.
        </footer>
      </div>
    </div>
  );
}
