/**
 * ============================================================
 * CREATORVAULT — CREATOR PROFILE v2 "Digital Atelier"
 * Cinematic banner · Revenue ticker · 3 tabs: Stream / Showcase / Vault
 * ============================================================
 */
import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowUpRight, ShoppingBag, BookOpen, TrendingUp, Users,
  Star, Award, ChevronRight, Play, Heart, MessageCircle,
  Share2, Zap, BarChart2, Check
} from "lucide-react";

// ── Design tokens ────────────────────────────────────────────────────────────
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

// ── Revenue Ticker ───────────────────────────────────────────────────────────
function RevenueTicker({ stats }: { stats: any }) {
  const items = [
    { label: "Total Revenue", value: stats?.totalRevenue ? `$${(stats.totalRevenue / 100).toLocaleString()}` : "$0", color: T.gold },
    { label: "Products Sold", value: stats?.totalSales?.toString() ?? "0", color: T.text },
    { label: "Active Products", value: stats?.activeProducts?.toString() ?? "0", color: T.text },
    { label: "Followers", value: stats?.followers?.toString() ?? "0", color: T.text },
  ];

  return (
    <div
      className="flex items-center gap-0 overflow-x-auto scrollbar-hide"
      style={{ borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className="flex-shrink-0 px-6 py-3 flex items-center gap-3"
          style={{ borderRight: i < items.length - 1 ? `1px solid ${T.border}` : "none" }}
        >
          <span className="text-xs uppercase tracking-widest" style={{ color: T.textMuted }}>
            {item.label}
          </span>
          <span className="text-sm font-bold" style={{ color: item.color, fontFamily: "Playfair Display, serif" }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Monetization Readiness Gauge ─────────────────────────────────────────────
function MonetizationGauge({ profile }: { profile: any }) {
  const checks = [
    { label: "Profile complete", done: !!profile?.bio && !!profile?.displayName },
    { label: "First product live", done: (profile?.productCount ?? 0) > 0 },
    { label: "10+ followers", done: (profile?.followerCount ?? 0) >= 10 },
    { label: "5+ posts", done: (profile?.postCount ?? 0) >= 5 },
    { label: "Payment connected", done: !!profile?.stripeConnected },
  ];
  const score = checks.filter((c) => c.done).length;
  const pct = (score / checks.length) * 100;

  return (
    <div
      className="p-5"
      style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "2px" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" style={{ color: T.gold }} />
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: T.gold }}>
            Monetization Readiness
          </p>
        </div>
        <span className="text-sm font-bold" style={{ color: T.text, fontFamily: "Playfair Display, serif" }}>
          {score}/{checks.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 mb-4" style={{ background: T.surfaceHigh, borderRadius: "1px" }}>
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, background: T.gold, borderRadius: "1px" }}
        />
      </div>

      <div className="space-y-2">
        {checks.map((c, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div
              className="w-4 h-4 flex items-center justify-center flex-shrink-0"
              style={{
                background: c.done ? T.goldDim : T.surfaceHigh,
                border: `1px solid ${c.done ? T.gold : T.border}`,
                borderRadius: "2px",
              }}
            >
              {c.done && <Check className="w-2.5 h-2.5" style={{ color: T.gold }} />}
            </div>
            <span className="text-xs" style={{ color: c.done ? T.text : T.textMuted }}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Product Card (Showcase tab) ───────────────────────────────────────────────
function ProductCard({ product, onSelect }: { product: any; onSelect: (p: any) => void }) {
  return (
    <button
      type="button"
      className="group w-full text-left"
      style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "2px", overflow: "hidden" }}
      onClick={() => onSelect(product)}
    >
      <div className="aspect-square relative" style={{ background: T.surfaceHigh }}>
        {product.main_image ? (
          <img src={product.main_image} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ShoppingBag className="w-8 h-8" style={{ color: T.textMuted }} />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold truncate" style={{ color: T.text }}>{product.title}</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest" style={{ color: T.gold }}>Saved listing · not open for sale</p>
      </div>
    </button>
  );
}

// ── Course Card (Vault tab) ───────────────────────────────────────────────────
function CourseCard({ course }: { course: any }) {
  return (
    <article style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "2px", overflow: "hidden" }}>
      <div className="flex aspect-video items-center justify-center" style={{ background: T.surfaceHigh }}>
        <BookOpen className="w-8 h-8" style={{ color: T.textMuted }} />
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold" style={{ color: T.text }}>{course.title}</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest" style={{ color: T.gold }}>Saved course idea · not open for enrollment</p>
      </div>
    </article>
  );
}

// ── Purchase Drawer ──────────────────────────────────────────────────────────
function PurchaseDrawer({ product, onClose }: { product: any; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl p-6"
        style={{ background: T.surface, border: `1px solid ${T.border}`, borderBottom: "none" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: T.border }} />
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: T.gold }}>Saved listing</p>
        <h3 className="text-lg font-bold" style={{ color: T.text, fontFamily: "Playfair Display, serif" }}>{product.title}</h3>
        <p className="mt-4 text-sm leading-relaxed" style={{ color: T.textMuted }}>This listing is saved with the creator, but it is not open for sale. CreatorVault will not collect money or promise delivery from this room until the full payment, access, and payout path is proven.</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full py-4 font-bold text-sm uppercase tracking-widest"
          style={{ background: T.gold, color: "#0a0a0a", borderRadius: "2px" }}
        >
          Back to profile
        </button>
      </div>
    </div>
  );
}

// ── Main Profile Page ────────────────────────────────────────────────────────
export default function CreatorProfilePage() {
  const [, params] = useRoute("/profile/:username");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"stream" | "showcase" | "vault">("stream");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Wouter's typed route helper does not infer this legacy route parameter shape.
  const requestedUsername = (params as any)?.username as string | undefined;
  const accountUsername = (user as { username?: string | null } | null)?.username ?? undefined;
  const username = requestedUsername ?? accountUsername;
  const hasPublicHandle = Boolean(requestedUsername || accountUsername);
  // A canonical owner page has no public handle requirement. When there is no route
  // handle and no stored username, the existing authenticated profile read returns
  // the account’s real safe profile instead of pretending the creator is missing.
  const isOwnProfile = !requestedUsername || username === accountUsername;

  const { data: profileData, isLoading } = trpc.profile.getProfile.useQuery(
    username ? { username } : undefined
  );

  // @ts-ignore
  const { data: posts } = trpc.post.getByUser.useQuery(
    { userId: profileData?.profile?.userId ?? 0, limit: 20 },
    { enabled: !!profileData?.profile?.userId }
  );

  const { data: products } = trpc.marketplace.getProducts.useQuery();
  const creatorProducts = (products ?? []).filter(
    (p: any) => (p.creatorId ?? p.creator_id) === profileData?.profile?.userId && (p.status ?? p.status) === "active"
  );

  const { data: sellerStats } = trpc.marketplace.getSellerStats.useQuery(undefined, {
    enabled: isOwnProfile,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}>
        <div className="w-8 h-8 border-2 border-t-transparent animate-spin" style={{ borderColor: T.gold, borderRadius: "50%" }} />
      </div>
    );
  }

  const profile = profileData?.profile ?? null;
  const hasProfileActivity = Boolean(
    (sellerStats?.totalRevenue ?? 0) > 0 ||
    (sellerStats?.totalSales ?? 0) > 0 ||
    creatorProducts.length > 0 ||
    (profile?.followerCount ?? 0) > 0 ||
    (posts?.posts?.length ?? 0) > 0
  );
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}>
        <p style={{ color: T.textMuted }}>Creator not found.</p>
      </div>
    );
  }

  const TABS = [
    { key: "stream", label: "Stream", count: posts?.posts?.length ?? 0 },
    { key: "showcase", label: "Showcase", count: creatorProducts.length },
    { key: "vault", label: "Vault", count: profileData?.courses?.length ?? 0 },
  ] as const;

  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.text, fontFamily: "Inter, sans-serif" }}>

      {/* ── Cinematic Banner ── */}
      <div
        className="relative w-full"
        style={{
          height: "280px",
          background: profile.bannerUrl
            ? `url(${profile.bannerUrl}) center/cover no-repeat`
            : `linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)`,
        }}
      >
        {/* Overlay */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(10,10,10,0.95) 100%)" }}
        />

        {/* Profile info overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 flex items-end justify-between">
          <div className="flex items-end gap-5">
            {/* Avatar */}
            <div
              className="w-20 h-20 flex items-center justify-center text-2xl font-bold flex-shrink-0"
              style={{
                background: T.goldDim,
                border: `2px solid ${T.gold}`,
                borderRadius: "2px",
                fontFamily: "Playfair Display, serif",
                color: T.gold,
              }}
            >
              {profile.displayName?.[0]?.toUpperCase() ?? profile.username?.[0]?.toUpperCase() ?? "?"}
            </div>

            <div className="pb-1">
              <h1
                className="text-2xl font-bold mb-0.5"
                style={{ color: T.text, fontFamily: "Playfair Display, serif" }}
              >
                {profile.displayName ?? profile.username}
              </h1>
              {hasPublicHandle ? (
                <p className="text-sm" style={{ color: T.textMuted }}>@{profile.username}</p>
              ) : (
                <p className="text-sm" style={{ color: T.textMuted }}>Your CreatorVault identity</p>
              )}
              {profile.bio && (
                <p className="text-sm mt-1 max-w-md" style={{ color: T.textMuted }}>{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pb-1">
            {isOwnProfile ? (
              <button
                onClick={() => navigate("/profile/edit")}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest"
                style={{ border: `1px solid ${T.border}`, color: T.text, borderRadius: "2px" }}
              >
                Edit Profile
              </button>
            ) : (
              <p className="max-w-xs text-right text-xs leading-relaxed" style={{ color: T.textMuted }}>
                Following and private messages open only when CreatorVault can prove the real connection behind them.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Money appears only once this profile has real recorded activity. */}
      {isOwnProfile && hasProfileActivity && <RevenueTicker stats={{
        totalRevenue: sellerStats?.totalRevenue ?? 0,
        totalSales: sellerStats?.totalSales ?? 0,
        activeProducts: creatorProducts.length,
        followers: profile.followerCount ?? 0,
      }} />}

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">

          {/* ── Main content area ── */}
          <div className="flex-1 min-w-0">
            {/* Tab bar */}
            <div
              className="flex mb-6"
              style={{ borderBottom: `1px solid ${T.border}` }}
            >
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="px-5 py-3 text-sm font-semibold uppercase tracking-widest flex items-center gap-2 transition-colors"
                  style={{
                    color: activeTab === tab.key ? T.gold : T.textMuted,
                    borderBottom: `2px solid ${activeTab === tab.key ? T.gold : "transparent"}`,
                    marginBottom: "-1px",
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className="text-xs px-1.5 py-0.5"
                      style={{
                        background: activeTab === tab.key ? T.goldDim : T.surfaceHigh,
                        color: activeTab === tab.key ? T.gold : T.textMuted,
                        borderRadius: "2px",
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Stream Tab ── */}
            {activeTab === "stream" && (
              <div>
                {!posts?.posts?.length ? (
                  <div
                    className="py-16 text-center"
                    style={{ border: `1px solid ${T.border}`, borderRadius: "2px" }}
                  >
                    <p className="text-lg mb-2" style={{ color: T.text, fontFamily: "Playfair Display, serif" }}>
                      Nothing with your name on it is here yet.
                    </p>
                    {isOwnProfile && (
                      <div className="mt-4 flex flex-wrap justify-center gap-3">
                        <button
                          onClick={() => navigate("/vault-x/studio")}
                          className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest"
                          style={{ background: T.gold, color: "#0a0a0a", borderRadius: "2px" }}
                        >
                          Start with Body Cinema
                        </button>
                        <button
                          onClick={() => navigate("/social-hub")}
                          className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest"
                          style={{ border: `1px solid ${T.border}`, color: T.text, borderRadius: "2px" }}
                        >
                          Get a moment ready
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.posts.map((post: any) => (
                      <article
                        key={post.id}
                        style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "2px", overflow: "hidden" }}
                      >
                        {post.media_urls?.length > 0 && (
                          <div className="aspect-video relative" style={{ background: "#000" }}>
                            {post.media_type === "video" ? (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover opacity-70" />
                                <div className="absolute w-12 h-12 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${T.border}`, borderRadius: "2px" }}>
                                  <Play className="w-4 h-4" style={{ color: T.text }} />
                                </div>
                              </div>
                            ) : (
                              <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                        )}
                        {post.content && (
                          <div className="px-4 py-3">
                            <p className="text-sm leading-relaxed" style={{ color: T.text }}>{post.content}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-5 px-4 py-3" style={{ borderTop: `1px solid ${T.border}` }}>
                          <button className="flex items-center gap-1.5 text-sm" style={{ color: T.textMuted }}>
                            <Heart className="w-4 h-4" /> {post.likes_count ?? 0}
                          </button>
                          <button className="flex items-center gap-1.5 text-sm" style={{ color: T.textMuted }}>
                            <MessageCircle className="w-4 h-4" /> {post.comments_count ?? 0}
                          </button>
                          <span className="text-xs ml-auto" style={{ color: T.textMuted }}>
                            {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Showcase Tab ── */}
            {activeTab === "showcase" && (
              <div>
                {creatorProducts.length === 0 ? (
                  <div
                    className="py-16 text-center"
                    style={{ border: `1px solid ${T.border}`, borderRadius: "2px" }}
                  >
                    <p className="text-lg mb-2" style={{ color: T.text, fontFamily: "Playfair Display, serif" }}>
                      No products live yet.
                    </p>
                    {isOwnProfile && <p className="mt-4 text-sm leading-relaxed" style={{ color: T.textMuted }}>Product creation stays closed until a real purchase and delivery path is ready.</p>}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {creatorProducts.map((p: any) => (
                      <ProductCard key={p.id} product={p} onSelect={setSelectedProduct} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Vault Tab ── */}
            {activeTab === "vault" && (
              <div>
                {!profileData?.courses?.length ? (
                  <div
                    className="py-16 text-center"
                    style={{ border: `1px solid ${T.border}`, borderRadius: "2px" }}
                  >
                    <p className="text-lg mb-2" style={{ color: T.text, fontFamily: "Playfair Display, serif" }}>
                      No courses published yet.
                    </p>
                    {isOwnProfile && <p className="mt-4 text-sm leading-relaxed" style={{ color: T.textMuted }}>Course creation stays closed until real enrollment and delivery are ready.</p>}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profileData.courses.map((course: any) => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right sidebar ── */}
          {hasProfileActivity && (
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <MonetizationGauge profile={{
              bio: profile.bio,
              displayName: profile.displayName,
              productCount: creatorProducts.length,
              followerCount: profile.followerCount ?? 0,
              postCount: posts?.posts?.length ?? 0,
              stripeConnected: profile.stripeConnected,
            }} />
          </aside>
          )}
        </div>
      </div>

      {/* Purchase Drawer */}
      {selectedProduct && (
        <PurchaseDrawer product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
}
