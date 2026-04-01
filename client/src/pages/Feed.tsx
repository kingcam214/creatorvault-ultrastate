/**
 * ============================================================
 * CREATORVAULT — UNIFIED FEED v2
 * 3-Zone Spatial Layout: Left Nav | Center Stream | Right Radar
 * Visual-first, luxury editorial design system
 * ============================================================
 */
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  Heart, MessageCircle, Share2, Bookmark, Play, ShoppingBag,
  BookOpen, TrendingUp, Zap, Award, ChevronRight, Plus,
  MoreHorizontal, Eye, Star, ArrowUpRight, Flame, Target
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

// ── Post type config ─────────────────────────────────────────────────────────
const POST_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  organic: { label: "Post", color: T.textMuted, icon: null },
  proof_drop: { label: "Proof Drop", color: T.gold, icon: <Award className="w-3 h-3" /> },
  lesson_snippet: { label: "Lesson", color: "#4a9eff", icon: <BookOpen className="w-3 h-3" /> },
  product_drop: { label: "Product Drop", color: "#7c4dff", icon: <ShoppingBag className="w-3 h-3" /> },
  monetization_insight: { label: "Insight", color: "#00c896", icon: <TrendingUp className="w-3 h-3" /> },
  creator_win: { label: "Creator Win", color: T.gold, icon: <Flame className="w-3 h-3" /> },
  opportunity: { label: "Opportunity", color: "#ff6b35", icon: <Target className="w-3 h-3" /> },
};

// ── Filter tabs ──────────────────────────────────────────────────────────────
const FILTERS = [
  { key: "all", label: "All" },
  { key: "proof_drop", label: "Wins" },
  { key: "lesson_snippet", label: "Lessons" },
  { key: "product_drop", label: "Drops" },
  { key: "monetization_insight", label: "Insights" },
  { key: "opportunity", label: "Opportunities" },
];

// ── Purchase Drawer ──────────────────────────────────────────────────────────
function PurchaseDrawer({
  product,
  onClose,
}: {
  product: any;
  onClose: () => void;
}) {
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
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: T.border }} />

        {/* Product info */}
        <div className="flex gap-4 mb-6">
          {product.main_image && (
            <img
              src={product.main_image}
              alt={product.title}
              className="w-20 h-20 object-cover rounded"
              style={{ border: `1px solid ${T.border}` }}
            />
          )}
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: T.gold }}>
              Digital Product
            </p>
            <h3 className="text-lg font-bold mb-1" style={{ color: T.text, fontFamily: "Playfair Display, serif" }}>
              {product.title}
            </h3>
            <p className="text-sm" style={{ color: T.textMuted }}>{product.short_description}</p>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mb-6 py-4" style={{ borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
          <span style={{ color: T.textMuted }}>Total</span>
          <span className="text-2xl font-bold" style={{ color: T.text, fontFamily: "Playfair Display, serif" }}>
            ${(product.price_amount / 100).toFixed(2)}
          </span>
        </div>

        {/* CTA */}
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

// ── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, onProductClick }: { post: any; onProductClick?: (p: any) => void }) {
  const [liked, setLiked] = useState(post.is_liked_by_viewer);
  const [likeCount, setLikeCount] = useState(post.likes_count ?? 0);
  const toggleLike = trpc.post.toggleLike.useMutation();
  const typeConfig = POST_TYPE_CONFIG[post.post_type ?? "organic"] ?? POST_TYPE_CONFIG.organic;

  const handleLike = async () => {
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    await toggleLike.mutateAsync({ postId: post.id });
  };

  const isProof = post.post_type === "proof_drop" || post.post_type === "creator_win";
  const isProduct = post.post_type === "product_drop";
  const isLesson = post.post_type === "lesson_snippet";
  const isInsight = post.post_type === "monetization_insight";

  return (
    <article
      className="mb-4"
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: "2px",
        overflow: "hidden",
      }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 flex items-center justify-center font-bold text-sm"
            style={{
              background: isProof ? T.goldDim : T.surfaceHigh,
              border: `1px solid ${isProof ? T.gold : T.border}`,
              color: isProof ? T.gold : T.text,
              borderRadius: "2px",
            }}
          >
            {post.author_username?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: T.text }}>
              {post.author_username ?? "Creator"}
            </p>
            <p className="text-xs" style={{ color: T.textMuted }}>
              {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* Type badge */}
        {typeConfig.label !== "Post" && (
          <div
            className="flex items-center gap-1 px-2 py-1 text-xs uppercase tracking-widest"
            style={{
              color: typeConfig.color,
              border: `1px solid ${typeConfig.color}`,
              borderRadius: "2px",
              opacity: 0.9,
            }}
          >
            {typeConfig.icon}
            {typeConfig.label}
          </div>
        )}
      </div>

      {/* Media */}
      {post.media_urls?.length > 0 && (
        <div className="relative" style={{ aspectRatio: isLesson ? "16/9" : "4/3", background: "#000" }}>
          {post.media_type === "video" || isLesson ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src={post.media_urls[0]}
                alt=""
                className="w-full h-full object-cover"
                style={{ opacity: 0.7 }}
              />
              <div
                className="absolute w-14 h-14 flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${T.border}`, borderRadius: "2px" }}
              >
                <Play className="w-5 h-5" style={{ color: T.text }} />
              </div>
              {isLesson && (
                <div
                  className="absolute bottom-3 right-3 px-2 py-1 text-xs uppercase tracking-widest"
                  style={{ background: "#4a9eff", color: "#fff", borderRadius: "2px" }}
                >
                  VaultU
                </div>
              )}
            </div>
          ) : (
            <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover" />
          )}

          {/* Proof metric overlay */}
          {isProof && post.proof_metric && (
            <div
              className="absolute bottom-0 left-0 right-0 px-4 py-3"
              style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.9))" }}
            >
              <p className="text-2xl font-bold" style={{ color: T.gold, fontFamily: "Playfair Display, serif" }}>
                {post.proof_metric}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {post.content && (
        <div className="px-4 py-3">
          <p className="text-sm leading-relaxed" style={{ color: T.text }}>
            {post.content}
          </p>
        </div>
      )}

      {/* Product tag */}
      {isProduct && post.tagged_product && (
        <div
          className="mx-4 mb-3 p-3 flex items-center justify-between cursor-pointer"
          style={{ background: T.surfaceHigh, border: `1px solid ${T.border}`, borderRadius: "2px" }}
          onClick={() => onProductClick?.(post.tagged_product)}
        >
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-4 h-4" style={{ color: "#7c4dff" }} />
            <div>
              <p className="text-xs" style={{ color: T.textMuted }}>Digital Product</p>
              <p className="text-sm font-semibold" style={{ color: T.text }}>{post.tagged_product.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: T.text }}>
              ${(post.tagged_product.price_amount / 100).toFixed(0)}
            </span>
            <button
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest"
              style={{ background: T.gold, color: "#0a0a0a", borderRadius: "2px" }}
              onClick={(e) => { e.stopPropagation(); onProductClick?.(post.tagged_product); }}
            >
              Acquire
            </button>
          </div>
        </div>
      )}

      {/* Lesson CTA */}
      {isLesson && post.tagged_course && (
        <div
          className="mx-4 mb-3 p-3 flex items-center justify-between"
          style={{ background: "rgba(74,158,255,0.08)", border: "1px solid rgba(74,158,255,0.2)", borderRadius: "2px" }}
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-4 h-4" style={{ color: "#4a9eff" }} />
            <div>
              <p className="text-xs" style={{ color: "rgba(74,158,255,0.7)" }}>Full Lesson Available</p>
              <p className="text-sm font-semibold" style={{ color: T.text }}>{post.tagged_course.title}</p>
            </div>
          </div>
          <button
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest"
            style={{ background: "rgba(74,158,255,0.15)", color: "#4a9eff", border: "1px solid rgba(74,158,255,0.3)", borderRadius: "2px" }}
          >
            Take Lesson
          </button>
        </div>
      )}

      {/* Insight why-shown */}
      {isInsight && (
        <div className="px-4 pb-3">
          <p className="text-xs" style={{ color: T.textMuted }}>
            <span style={{ color: T.gold }}>Why you're seeing this:</span> Based on your recent activity
          </p>
        </div>
      )}

      {/* Actions */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderTop: `1px solid ${T.border}` }}
      >
        <div className="flex items-center gap-5">
          <button
            onClick={handleLike}
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: liked ? T.gold : T.textMuted }}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
            <span>{likeCount}</span>
          </button>
          <button className="flex items-center gap-1.5 text-sm" style={{ color: T.textMuted }}>
            <MessageCircle className="w-4 h-4" />
            <span>{post.comments_count ?? 0}</span>
          </button>
          <button className="flex items-center gap-1.5 text-sm" style={{ color: T.textMuted }}>
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        <button style={{ color: T.textMuted }}>
          <Bookmark className="w-4 h-4" />
        </button>
      </div>
    </article>
  );
}

// ── Radar Rail ───────────────────────────────────────────────────────────────
function RadarRail() {
  const { data: products } = trpc.marketplace.getProducts.useQuery();
  const topProducts = (products ?? []).filter((p: any) => p.status === "active").slice(0, 3);

  const insights = [
    { text: "Your audience is growing. Time to launch a $47 playbook.", action: "Create Product" },
    { text: "Creators posting Proof Drops get 3x more profile visits.", action: "Post a Win" },
    { text: "YouTube monetization threshold: 1,000 subscribers + 4,000 watch hours.", action: "Learn More" },
  ];

  return (
    <aside className="sticky top-4 space-y-4">
      {/* Next Money Move */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "2px", overflow: "hidden" }}>
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" style={{ color: T.gold }} />
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: T.gold }}>
            Next Money Move
          </p>
        </div>
        <div className="px-4 pb-4">
          <p className="text-sm mb-3" style={{ color: T.text }}>
            {insights[0].text}
          </p>
          <button
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest"
            style={{ color: T.gold }}
          >
            {insights[0].action} <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Trending Drops */}
      {topProducts.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "2px", overflow: "hidden" }}>
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" style={{ color: "#7c4dff" }} />
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#7c4dff" }}>
              Trending Drops
            </p>
          </div>
          <div className="pb-2">
            {topProducts.map((p: any) => (
              <div
                key={p.id}
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
                style={{ borderTop: `1px solid ${T.border}` }}
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-semibold truncate" style={{ color: T.text }}>{p.title}</p>
                  <p className="text-xs" style={{ color: T.textMuted }}>${(p.price_amount / 100).toFixed(0)}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: T.textMuted }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monetization Insights */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "2px", overflow: "hidden" }}>
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <Star className="w-3.5 h-3.5" style={{ color: "#00c896" }} />
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#00c896" }}>
            Smart Insights
          </p>
        </div>
        <div className="pb-2">
          {insights.slice(1).map((insight, i) => (
            <div
              key={i}
              className="px-4 py-3"
              style={{ borderTop: `1px solid ${T.border}` }}
            >
              <p className="text-xs leading-relaxed mb-2" style={{ color: T.text }}>{insight.text}</p>
              <button
                className="text-xs font-bold uppercase tracking-widest flex items-center gap-1"
                style={{ color: "#00c896" }}
              >
                {insight.action} <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ── Main Feed ────────────────────────────────────────────────────────────────
export default function Feed() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const { data: feedData, isLoading, fetchNextPage, hasNextPage } = trpc.post.getFeed.useInfiniteQuery(
    { limit: 20 },
    {
      getNextPageParam: (lastPage: any) => lastPage.nextCursor ?? undefined,
    }
  );

  const allPosts = feedData?.pages.flatMap((p: any) => p.posts) ?? [];
  const filteredPosts = activeFilter === "all"
    ? allPosts
    : allPosts.filter((p: any) => (p.post_type ?? "organic") === activeFilter);

  // Insert monetization insight cards every 12 posts
  const postsWithInsights: any[] = [];
  filteredPosts.forEach((post, i) => {
    postsWithInsights.push(post);
    if ((i + 1) % 12 === 0) {
      postsWithInsights.push({
        id: `insight-${i}`,
        post_type: "monetization_insight",
        content: "Creators who post consistently for 30 days see an average 47% increase in profile visits. Your next Proof Drop could be the one that converts.",
        created_at: new Date().toISOString(),
        author_username: "VaultAI",
        likes_count: 0,
        comments_count: 0,
        is_liked_by_viewer: false,
        _isInjected: true,
      });
    }
  });

  return (
    <div
      className="min-h-screen"
      style={{ background: T.bg, color: T.text, fontFamily: "Inter, sans-serif" }}
    >
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">

          {/* ── Left: Filter Nav ── */}
          <nav className="hidden lg:block w-44 flex-shrink-0">
            <div className="sticky top-4">
              <p
                className="text-xs uppercase tracking-widest mb-4 font-semibold"
                style={{ color: T.textMuted }}
              >
                Filter
              </p>
              <div className="space-y-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setActiveFilter(f.key)}
                    className="w-full text-left px-3 py-2 text-sm transition-all"
                    style={{
                      color: activeFilter === f.key ? T.gold : T.textMuted,
                      background: activeFilter === f.key ? T.goldDim : "transparent",
                      borderLeft: `2px solid ${activeFilter === f.key ? T.gold : "transparent"}`,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Compose button */}
              <button
                onClick={() => navigate("/compose")}
                className="w-full mt-6 py-3 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest transition-opacity hover:opacity-80"
                style={{ background: T.gold, color: "#0a0a0a", borderRadius: "2px" }}
              >
                <Plus className="w-4 h-4" />
                Post
              </button>
            </div>
          </nav>

          {/* ── Center: The Stream ── */}
          <main className="flex-1 min-w-0">
            {/* Mobile filter pills */}
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest"
                  style={{
                    color: activeFilter === f.key ? "#0a0a0a" : T.textMuted,
                    background: activeFilter === f.key ? T.gold : T.surfaceHigh,
                    border: `1px solid ${activeFilter === f.key ? T.gold : T.border}`,
                    borderRadius: "2px",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Loading state */}
            {isLoading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse"
                    style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "2px" }}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && postsWithInsights.length === 0 && (
              <div
                className="py-20 text-center"
                style={{ border: `1px solid ${T.border}`, borderRadius: "2px" }}
              >
                <p
                  className="text-2xl mb-2"
                  style={{ color: T.text, fontFamily: "Playfair Display, serif" }}
                >
                  The stream is quiet.
                </p>
                <p className="text-sm mb-6" style={{ color: T.textMuted }}>
                  Follow creators or post your first win to get started.
                </p>
                <button
                  onClick={() => navigate("/compose")}
                  className="px-6 py-3 text-sm font-bold uppercase tracking-widest"
                  style={{ background: T.gold, color: "#0a0a0a", borderRadius: "2px" }}
                >
                  Post Your First Win
                </button>
              </div>
            )}

            {/* Posts */}
            {postsWithInsights.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onProductClick={setSelectedProduct}
              />
            ))}

            {/* Load more */}
            {hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                className="w-full py-4 text-sm font-semibold uppercase tracking-widest mt-2 transition-opacity hover:opacity-70"
                style={{ color: T.textMuted, border: `1px solid ${T.border}`, borderRadius: "2px" }}
              >
                Load More
              </button>
            )}
          </main>

          {/* ── Right: The Radar ── */}
          <aside className="hidden xl:block w-64 flex-shrink-0">
            <RadarRail />
          </aside>
        </div>
      </div>

      {/* Purchase Drawer */}
      {selectedProduct && (
        <PurchaseDrawer
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
