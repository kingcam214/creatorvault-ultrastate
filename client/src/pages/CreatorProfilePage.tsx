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
  Share2, Zap, BarChart2, Check, Crown, ShieldCheck, Radio, Film
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
function ProductCard({ product, onBuy }: { product: any; onBuy: (p: any) => void }) {
  return (
    <div
      className="cursor-pointer group"
      style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "2px", overflow: "hidden" }}
      onClick={() => onBuy(product)}
    >
      <div className="aspect-square relative" style={{ background: T.surfaceHigh }}>
        {product.main_image ? (
          <img src={product.main_image} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ShoppingBag className="w-8 h-8" style={{ color: T.textMuted }} />
          </div>
        )}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <button
            className="px-4 py-2 text-xs font-bold uppercase tracking-widest"
            style={{ background: T.gold, color: "#0a0a0a", borderRadius: "2px" }}
          >
            Acquire
          </button>
        </div>
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold truncate mb-1" style={{ color: T.text }}>{product.title}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: T.gold, fontFamily: "Playfair Display, serif" }}>
            ${(product.price_amount / 100).toFixed(0)}
          </span>
          <span className="text-xs" style={{ color: T.textMuted }}>
            {product.sales_count ?? 0} sold
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Course Card (Vault tab) ───────────────────────────────────────────────────
function CourseCard({ course }: { course: any }) {
  return (
    <div
      style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "2px", overflow: "hidden" }}
    >
      <div className="aspect-video relative" style={{ background: T.surfaceHigh }}>
        {course.intro_video_url || course.promo_video_url ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-12 h-12 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${T.border}`, borderRadius: "2px" }}
            >
              <Play className="w-4 h-4" style={{ color: T.text }} />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-8 h-8" style={{ color: T.textMuted }} />
          </div>
        )}
        {course.is_free && (
          <div
            className="absolute top-2 right-2 px-2 py-0.5 text-xs font-bold uppercase tracking-widest"
            style={{ background: "#00c896", color: "#0a0a0a", borderRadius: "2px" }}
          >
            Free
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold mb-1" style={{ color: T.text }}>{course.title}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: T.textMuted }}>
            {course.estimated_duration_minutes ? `${course.estimated_duration_minutes} min` : "Self-paced"}
          </span>
          {!course.is_free && (
            <span className="text-sm font-bold" style={{ color: T.gold, fontFamily: "Playfair Display, serif" }}>
              ${(course.price_amount / 100).toFixed(0)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Purchase Drawer ──────────────────────────────────────────────────────────
function PurchaseDrawer({ product, onClose }: { product: any; onClose: () => void }) {
  const createCheckout = trpc.marketplace.createCheckoutSession?.useMutation?.();

  const handlePurchase = async () => {
    if (!createCheckout) return;
    try {
      const result = await createCheckout.mutateAsync({ productId: product.id });
      if (result?.url) window.location.href = result.url;
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl p-6"
        style={{ background: T.surface, border: `1px solid ${T.border}`, borderBottom: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: T.border }} />
        <div className="flex gap-4 mb-6">
          {product.main_image && (
            <img src={product.main_image} alt={product.title} className="w-20 h-20 object-cover rounded" style={{ border: `1px solid ${T.border}` }} />
          )}
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: T.gold }}>Digital Product</p>
            <h3 className="text-lg font-bold mb-1" style={{ color: T.text, fontFamily: "Playfair Display, serif" }}>{product.title}</h3>
            <p className="text-sm" style={{ color: T.textMuted }}>{product.short_description}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mb-6 py-4" style={{ borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
          <span style={{ color: T.textMuted }}>Total</span>
          <span className="text-2xl font-bold" style={{ color: T.text, fontFamily: "Playfair Display, serif" }}>
            ${(product.price_amount / 100).toFixed(2)}
          </span>
        </div>
        <button
          onClick={handlePurchase}
          className="w-full py-4 font-bold text-sm uppercase tracking-widest transition-opacity hover:opacity-90"
          style={{ background: T.gold, color: "#0a0a0a", borderRadius: "2px" }}
        >
          Acquire Now
        </button>
        <p className="text-center text-xs mt-3" style={{ color: T.textMuted }}>
          Secure checkout via Stripe · Instant delivery
        </p>
      </div>
    </div>
  );
}

// ── Main Profile Page ────────────────────────────────────────────────────────
const BCB_PROFILE_KEYS = ["officiallybcb", "bcb", "thatssthebcb", "thatssthebcb_", "thebiggestb"];

const BCB_FALLBACK_PROFILE = {
  userId: -202606,
  username: "officiallybcb",
  displayName: "BCB · Body Cinema",
  bio: "Fitness-body proof, Fisk '26 energy, ProArmorCore lane, and adult-safe premium routing built for the VaultX Body Cinema soft launch.",
  followerCount: 17700,
  postCount: 3,
  productCount: 4,
  stripeConnected: true,
  bannerUrl: "",
};

function isBCBUsername(value: string | undefined | null): boolean {
  return BCB_PROFILE_KEYS.includes(String(value || "").toLowerCase());
}

function isBCBProfile(profile: any): boolean {
  const identity = [profile?.username, profile?.displayName, profile?.bio]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return BCB_PROFILE_KEYS.some((key) => identity.includes(key)) || identity.includes("abs prime") || identity.includes("fisk");
}

const bcbProofCards = [
  { label: "TikTok Proof", value: "350.8K likes", detail: "Pinned clips and a video-first grid already prove motion sells the persona." },
  { label: "Audience", value: "17.7K followers", detail: "Enough social heat to validate paid teaser, subscriber, and VIP routes." },
  { label: "Identity", value: "Fisk '26", detail: "HBCU fitness, faith, and ProArmorCore give the profile a story beyond thirst traffic." },
  { label: "Body Cinema Lane", value: "Abs Prime", detail: "The body-value proposition is clear, visual, athletic, and premium-package ready." },
];

const bcbPackageLanes = [
  { title: "Public Heat Teaser", price: "Free", body: "Lead with the proof frame, crop the heat, watermark the preview, and cut before the payoff.", accent: "#FF3D8A" },
  { title: "Subscriber Master", price: "$25+", body: "Deliver the complete fitness-body scene as subscriber value with safe premium pacing.", accent: "#00D9FF" },
  { title: "PPV Unlock", price: "$19-$49", body: "Hold the highest-value beat behind a tracked paid route so curiosity becomes purchase intent.", accent: "#C9A84C" },
  { title: "VIP Upsell Kit", price: "$75+", body: "Turn one clip into cover art, captions, DM copy, Telegram route, and private escalation.", accent: "#A855F7" },
];

function BCBBodyCinemaSpotlight({ profile }: { profile: any }) {
  return (
    <section className="relative overflow-hidden" style={{ borderBottom: `1px solid ${T.border}`, background: "radial-gradient(circle at 15% 0%, rgba(255,61,138,0.20), transparent 34%), radial-gradient(circle at 85% 10%, rgba(0,217,255,0.16), transparent 30%), #050505" }}>
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] items-stretch">
          <div className="relative overflow-hidden p-5 md:p-7" style={{ background: "linear-gradient(135deg, rgba(20,20,20,0.96), rgba(10,10,10,0.86))", border: `1px solid ${T.border}`, borderRadius: "3px" }}>
            <div className="absolute inset-y-0 right-0 w-1/3 opacity-30" style={{ background: "linear-gradient(180deg, rgba(255,61,138,0.35), rgba(201,168,76,0.22), rgba(0,217,255,0.25))" }} />
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-2 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: "#050505", background: T.gold, borderRadius: "999px" }}>
                  <Crown className="w-3.5 h-3.5" /> Body Cinema Soft Launch
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: T.text, border: `1px solid ${T.border}`, borderRadius: "999px", background: "rgba(255,255,255,0.04)" }}>
                  <ShieldCheck className="w-3.5 h-3.5" /> Creator-safe premium routing
                </span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black leading-tight" style={{ color: T.text, fontFamily: "Playfair Display, serif" }}>
                BCB becomes the proof that fitness-body content can move like cinema and sell like a private drop.
              </h2>
              <p className="mt-4 max-w-2xl text-sm md:text-base leading-7" style={{ color: "rgba(245,240,232,0.68)" }}>
                This profile is being positioned as VaultX’s first Body Cinema use case: public social proof, vertical-video heat, subscriber value, PPV unlocks, Telegram routing, and VIP escalation working as one creator-owned funnel.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {bcbProofCards.map((card) => (
                  <div key={card.label} className="p-4" style={{ background: "rgba(255,255,255,0.045)", border: `1px solid ${T.border}`, borderRadius: "3px" }}>
                    <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: T.textMuted }}>{card.label}</div>
                    <div className="mt-1 text-xl font-black" style={{ color: T.text }}>{card.value}</div>
                    <p className="mt-1 text-xs leading-5" style={{ color: "rgba(245,240,232,0.58)" }}>{card.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="/vault-x/editor" className="inline-flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-[0.14em]" style={{ background: T.gold, color: "#050505", borderRadius: "3px" }}>
                  Cut Body Cinema <Film className="w-4 h-4" />
                </a>
                <a href="/mi-panel/bcb-panel" className="inline-flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-[0.14em]" style={{ border: `1px solid ${T.border}`, color: T.text, borderRadius: "3px", background: "rgba(255,255,255,0.04)" }}>
                  Open BCB Launch Room <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {bcbPackageLanes.map((lane, index) => (
              <div key={lane.title} className="group p-4" style={{ background: "rgba(20,20,20,0.92)", border: `1px solid ${T.border}`, borderLeft: `3px solid ${lane.accent}`, borderRadius: "3px" }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 flex items-center justify-center text-xs font-black" style={{ color: lane.accent, background: "rgba(255,255,255,0.05)", border: `1px solid ${T.border}`, borderRadius: "999px" }}>0{index + 1}</div>
                    <div>
                      <h3 className="text-sm font-black" style={{ color: T.text }}>{lane.title}</h3>
                      <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: lane.accent }}>{lane.price}</p>
                    </div>
                  </div>
                  <Radio className="w-4 h-4 opacity-70" style={{ color: lane.accent }} />
                </div>
                <p className="mt-3 text-xs leading-5" style={{ color: "rgba(245,240,232,0.58)" }}>{lane.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function CreatorProfilePage() {
  const [, params] = useRoute("/profile/:username");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"stream" | "showcase" | "vault">("stream");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // @ts-ignore
  const username = params?.username ?? user?.username;
  // @ts-ignore
  const isOwnProfile = username === user?.username;

  const { data: profileData, isLoading } = trpc.profile.getProfile.useQuery(
  // @ts-ignore
    { username: username! },
    { enabled: !!username }
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

  const profile = profileData?.profile ?? (isBCBUsername(username) ? BCB_FALLBACK_PROFILE : null);
  const showBCBSpotlight = isBCBProfile(profile);
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
              <p className="text-sm" style={{ color: T.textMuted }}>@{profile.username}</p>
              {profile.bio && (
                <p className="text-sm mt-1 max-w-md" style={{ color: T.textMuted }}>{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pb-1">
            {isOwnProfile ? (
              <button
                onClick={() => navigate("/settings/profile")}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest"
                style={{ border: `1px solid ${T.border}`, color: T.text, borderRadius: "2px" }}
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  className="px-4 py-2 text-xs font-bold uppercase tracking-widest"
                  style={{ background: T.gold, color: "#0a0a0a", borderRadius: "2px" }}
                >
                  Follow
                </button>
                <button
                  className="px-4 py-2 text-xs font-bold uppercase tracking-widest"
                  style={{ border: `1px solid ${T.border}`, color: T.text, borderRadius: "2px" }}
                >
                  Message
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Revenue Ticker ── */}
      <RevenueTicker stats={{
        totalRevenue: sellerStats?.totalRevenue ?? 0,
        totalSales: sellerStats?.totalSales ?? 0,
        activeProducts: creatorProducts.length,
        followers: profile.followerCount ?? 0,
      }} />

      {showBCBSpotlight && <BCBBodyCinemaSpotlight profile={profile} />}

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
                      No posts yet.
                    </p>
                    {isOwnProfile && (
                      <button
                        onClick={() => navigate("/compose")}
                        className="mt-4 px-6 py-2.5 text-xs font-bold uppercase tracking-widest"
                        style={{ background: T.gold, color: "#0a0a0a", borderRadius: "2px" }}
                      >
                        Post Your First Win
                      </button>
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
                    {isOwnProfile && (
                      <button
                        onClick={() => navigate("/marketplace/create")}
                        className="mt-4 px-6 py-2.5 text-xs font-bold uppercase tracking-widest"
                        style={{ background: T.gold, color: "#0a0a0a", borderRadius: "2px" }}
                      >
                        Create Your First Product
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {creatorProducts.map((p: any) => (
                      <ProductCard key={p.id} product={p} onBuy={setSelectedProduct} />
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
                    {isOwnProfile && (
                      <button
                        onClick={() => navigate("/university/create")}
                        className="mt-4 px-6 py-2.5 text-xs font-bold uppercase tracking-widest"
                        style={{ background: T.gold, color: "#0a0a0a", borderRadius: "2px" }}
                      >
                        Create a Course
                      </button>
                    )}
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
        </div>
      </div>

      {/* Purchase Drawer */}
      {selectedProduct && (
        <PurchaseDrawer product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
}
