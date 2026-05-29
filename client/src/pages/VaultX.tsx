/**
 * ============================================================================
 * VAULTX — THE UNCENSORED SOCIAL ECONOMY
 * ============================================================================
 * First non-censoring platform and social economy for adult creators.
 * Tabs: Discover | My Profile | Monetize | Telegram | X.com | Earnings
 * ============================================================================
 */
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Shield, Lock, Flame, Star, TrendingUp, DollarSign, Users,
  Award, BarChart2, Settings, Zap, Eye, Heart, MessageCircle,
  Send, ExternalLink, Copy, CheckCircle, AlertTriangle,
  Instagram, Twitter, Bell, Crown, Sparkles, Play, Image,
  CreditCard, Gift, Unlock, Plus, ChevronRight, Globe,
  Camera, Video, FileText, Hash, AtSign, Link2, Bot,
  Layers, Radio, ShoppingBag, Wallet, ArrowUpRight,
  Inbox, Filter, Bookmark, ThumbsUp, Share2, MoreHorizontal,
  ChevronDown, X as XIcon, Clapperboard, Package
} from "lucide-react";
import { VaultXActionCard, VaultXLogo, VaultXWorkflow } from "@/components/vaultx/VaultXBrand";

// ============================================================================
// TYPES
// ============================================================================
interface VaultXCreator {
  id: string;
  creator_id: number;
  display_name: string;
  bio: string;
  profile_banner_url: string;
  categories: string[];
  content_style: string;
  base_subscription_price: number;
  total_subscribers: number;
  total_posts: number;
  total_revenue: number;
  tier: "emerging" | "rising" | "established" | "elite" | "legend";
  is_featured: boolean;
  ppv_enabled: boolean;
  tips_enabled: boolean;
  custom_requests_enabled: boolean;
}

// ============================================================================
// TIER CONFIG
// ============================================================================
const TIER_CONFIG = {
  emerging: { color: "#9CA3AF", label: "Emerging", icon: "⭐" },
  rising: { color: "#60A5FA", label: "Rising", icon: "🔥" },
  established: { color: "#A78BFA", label: "Established", icon: "💎" },
  elite: { color: "#F59E0B", label: "Elite", icon: "👑" },
  legend: { color: "#EF4444", label: "Legend", icon: "⚡" },
};

// ============================================================================
// AGE GATE
// ============================================================================
function AgeGate({ onVerified }: { onVerified: () => void }) {
  const [dob, setDob] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  const verify = trpc.vaultx.submitAgeVerification.useMutation({
    onSuccess: () => { toast.success("Welcome to VaultX."); onVerified(); },
    onError: (e) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!confirmed) return setError("You must confirm you are 18 or older.");
    if (!dob) return setError("Please enter your date of birth.");
    verify.mutate({ dateOfBirth: dob, confirmOver18: confirmed });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex flex-col items-center mb-4">
            <VaultXLogo size="lg" />
            <div className="text-xs text-red-400 font-semibold uppercase tracking-widest">Uncensored Social Economy</div>
          </div>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            The first platform built exclusively for adult creators. No censorship. No shadowbans. Just revenue.
          </p>
        </div>

        {/* Warning */}
        <div className="border border-red-900/50 bg-red-950/30 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-red-300 font-semibold text-sm mb-1">Adults Only — 18+</div>
              <div className="text-gray-400 text-xs leading-relaxed">
                VaultX contains explicit adult content. By entering, you confirm you are 18 years of age or older and consent to viewing adult material. This content is legal in your jurisdiction.
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-2">Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <div
              onClick={() => setConfirmed(!confirmed)}
              className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center cursor-pointer transition-colors ${confirmed ? "bg-red-500 border-red-500" : "border-gray-600"}`}
            >
              {confirmed && <CheckCircle className="w-3 h-3 text-white" />}
            </div>
            <span className="text-gray-400 text-sm">
              I confirm I am 18 years of age or older and consent to viewing adult content.
            </span>
          </label>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={verify.isPending}
            className="w-full bg-[#0a0a0a] from-red-500 to-orange-500 text-white font-bold py-4 rounded-xl text-sm uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {verify.isPending ? "Verifying..." : "Enter VaultX →"}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          By entering, you agree to VaultX Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// CREATOR CARD
// ============================================================================
function CreatorCard({ creator, onClick }: { creator: any; onClick: () => void }) {
  const tier = TIER_CONFIG[creator.tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.emerging;
  return (
    <div
      onClick={onClick}
      className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden cursor-pointer hover:border-red-500/50 hover:bg-gray-900 transition-all group"
    >
      {/* Banner */}
      <div className="h-24 bg-[#0a0a0a] from-red-900/40 to-orange-900/40 relative overflow-hidden">
        {creator.profile_banner_url && (
          <img src={creator.profile_banner_url} alt="" className="w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-[#0a0a0a] from-gray-900 to-transparent" />
        {creator.is_featured && (
          <div className="absolute top-2 right-2 bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">FEATURED</div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 -mt-6 relative">
        <div className="flex items-end justify-between mb-3">
          <div className="w-12 h-12 rounded-xl bg-[#0a0a0a] from-red-500 to-orange-500 flex items-center justify-center text-white font-black text-lg border-2 border-gray-900">
            {creator.display_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="text-xs font-bold px-2 py-1 rounded-full" style={{ color: tier.color, backgroundColor: `${tier.color}20` }}>
            {tier.icon} {tier.label}
          </div>
        </div>

        <div className="font-bold text-white text-sm mb-1">{creator.display_name}</div>
        <div className="text-gray-500 text-xs line-clamp-2 mb-3">{creator.bio || "Adult content creator"}</div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{creator.total_subscribers || 0}</span>
            <span className="flex items-center gap-1"><Image className="w-3 h-3" />{creator.total_posts || 0}</span>
          </div>
          <div className="text-red-400 font-bold text-sm">
            ${creator.base_subscription_price || "—"}<span className="text-gray-600 font-normal text-xs">/mo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DISCOVER TAB
// ============================================================================

// ============================================================================
// ============================================================================
// FOR YOU FEED — Full-screen vertical video player (TikTok/Pollo-style)
// ============================================================================
function ForYouFeed() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [likedItems, setLikedItems] = useState<Set<number>>(new Set());
  const [sort, setSort] = useState<"trending" | "top_earners" | "new" | "price_low">("trending");
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = trpc.vaultx.getForYouFeed.useQuery(
    { sort, limit: 10, offset },
    { placeholderData: (prev: any) => prev }
  );

  const subscribeMut = trpc.vaultx.subscribeToCreator.useMutation();
  const buyPPV = trpc.vaultx.purchasePpv.useMutation();

  // Accumulate items as user scrolls
  useEffect(() => {
    if (data?.creators) {
      if (offset === 0) {
        setAllItems(data.creators);
      } else {
        setAllItems(prev => [...prev, ...data.creators]);
      }
    }
  }, [data, offset]);

  // Autoplay current video, pause others
  useEffect(() => {
    videoRefs.current.forEach((video, idx) => {
      if (idx === currentIndex) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIndex]);

  // Load more when near end
  useEffect(() => {
    if (currentIndex >= allItems.length - 3 && data?.creators?.length === 10) {
      setOffset(prev => prev + 10);
    }
  }, [currentIndex, allItems.length]);

  const handleScroll = (e: React.WheelEvent) => {
    if (e.deltaY > 50 && currentIndex < allItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (e.deltaY < -50 && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Touch support
  const touchStartY = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (delta > 60 && currentIndex < allItems.length - 1) setCurrentIndex(prev => prev + 1);
    else if (delta < -60 && currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  if (isLoading && allItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading feed...</p>
        </div>
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-900/40 to-purple-900/40 flex items-center justify-center">
          <Play className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-white font-bold text-xl">No Content Yet</h3>
        <p className="text-gray-400 text-sm">Be the first creator to go live on VaultX.</p>
      </div>
    );
  }

  const item = allItems[currentIndex];
  if (!item) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-black select-none"
      onWheel={handleScroll}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sort pills — top */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
        {(["trending", "new", "top_earners"] as const).map(s => (
          <button
            key={s}
            onClick={() => { setSort(s); setOffset(0); setCurrentIndex(0); }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              sort === s
                ? "bg-red-600 text-white shadow-lg shadow-red-900/50"
                : "bg-black/60 text-gray-400 backdrop-blur-sm border border-white/10"
            }`}
          >
            {s === "trending" ? "🔥 Hot" : s === "new" ? "✨ New" : "💰 Top"}
          </button>
        ))}
      </div>

      {/* Video / thumbnail */}
      <div className="absolute inset-0">
        {item.latest_video_url ? (
          <video
            ref={el => { if (el) videoRefs.current.set(currentIndex, el); }}
            src={item.latest_video_url}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
          />
        ) : item.latest_censored_thumb ? (
          <img
            src={item.latest_censored_thumb}
            alt={item.display_name}
            className="w-full h-full object-cover"
          />
        ) : item.profile_image_url ? (
          <img
            src={item.profile_image_url}
            alt={item.display_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-950 via-black to-purple-950 flex items-center justify-center">
            <div className="text-8xl opacity-20">🔥</div>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />
      </div>

      {/* Right action bar */}
      <div className="absolute right-4 bottom-32 z-20 flex flex-col items-center gap-6">
        {/* Creator avatar */}
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-red-500 overflow-hidden">
            {item.profile_image_url ? (
              <img src={item.profile_image_url} alt={item.display_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-red-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                {item.display_name?.[0] || "?"}
              </div>
            )}
          </div>
          <button
            onClick={async () => {
              try {
                await subscribeMut.mutateAsync({ creatorId: item.id, tier: "basic" });
                toast.success(`Subscribed to ${item.display_name}`);
              } catch (e: any) { toast.error(e.message); }
            }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold hover:bg-red-500 transition-colors"
          >
            +
          </button>
        </div>

        {/* Like */}
        <button
          onClick={() => setLikedItems(prev => {
            const next = new Set(prev);
            if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
            return next;
          })}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
            likedItems.has(item.id) ? "bg-red-600 shadow-lg shadow-red-900/50" : "bg-black/60 backdrop-blur-sm border border-white/10"
          }`}>
            <Heart className={`w-5 h-5 ${likedItems.has(item.id) ? "text-white fill-white" : "text-white"}`} />
          </div>
          <span className="text-white text-xs font-semibold">{((item.latest_like_count || 0) + (likedItems.has(item.id) ? 1 : 0)).toLocaleString()}</span>
        </button>

        {/* Comment */}
        <button className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-semibold">{(item.latest_view_count || 0).toLocaleString()}</span>
        </button>

        {/* Share */}
        <button className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-semibold">Share</span>
        </button>

        {/* Tip / PPV */}
        <button
          onClick={async () => {
            try {
              const result = await buyPPV.mutateAsync({ contentId: item.id });
              if (result.purchaseId) {
                window.location.href = `/telegram-connect?purchaseId=${result.purchaseId}`;
              } else {
                toast.success("PPV unlocked!");
              }
            } catch (e: any) { toast.error(e.message); }
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full bg-amber-600/80 backdrop-blur-sm border border-amber-500/30 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-semibold">Tip</span>
        </button>
      </div>

      {/* Bottom creator info */}
      <div className="absolute bottom-0 left-0 right-16 z-20 p-5 pb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full border-2 border-red-500/60 overflow-hidden flex-shrink-0">
            {item.profile_image_url ? (
              <img src={item.profile_image_url} alt={item.display_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-red-600 to-purple-600 flex items-center justify-center text-white font-bold">
                {item.display_name?.[0] || "?"}
              </div>
            )}
          </div>
          <div>
            <div className="text-white font-bold text-sm">{item.display_name}</div>
            <div className="text-gray-400 text-xs">@{item.username} · {(item.total_subscribers || 0).toLocaleString()} fans</div>
          </div>
          <button
            onClick={async () => {
              try {
                await subscribeMut.mutateAsync({ creatorId: item.id, tier: "basic" });
                toast.success(`Subscribed!`);
              } catch (e: any) { toast.error(e.message); }
            }}
            className="ml-auto px-4 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold hover:bg-red-500 transition-colors"
          >
            Subscribe ${(item.subscription_price_basic || 0).toFixed(0)}/mo
          </button>
        </div>
        {item.latest_content_title && (
          <p className="text-white/90 text-sm font-medium mb-1 line-clamp-2">{item.latest_content_title}</p>
        )}
        {item.bio && (
          <p className="text-gray-400 text-xs line-clamp-2">{item.bio}</p>
        )}
      </div>

      {/* Scroll indicators */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5">
        {allItems.slice(Math.max(0, currentIndex - 2), currentIndex + 5).map((_, i) => {
          const absIdx = Math.max(0, currentIndex - 2) + i;
          return (
            <button
              key={absIdx}
              onClick={() => setCurrentIndex(absIdx)}
              className={`rounded-full transition-all ${
                absIdx === currentIndex ? "w-1.5 h-4 bg-white" : "w-1 h-1.5 bg-white/30"
              }`}
            />
          );
        })}
      </div>

      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 z-30">
        <div
          className="h-full bg-gradient-to-r from-red-500 to-purple-500 transition-all duration-300"
          style={{ width: `${allItems.length > 0 ? ((currentIndex + 1) / allItems.length) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// CONTENT FEED TAB — Subscribed creator content with free preview / blur gate
// ============================================================================
function ContentFeedTab({ userId }: { userId: number }) {
  const [creatorId, setCreatorId] = useState<number | null>(null);
  const { data: subsData } = trpc.vaultx.getMySubscriptions.useQuery(undefined, { retry: false });
  const subscriptions = (subsData as any)?.subscriptions || [];

  const { data: contentData, isLoading } = trpc.vaultx.getCreatorContent.useQuery(
    { creatorId: creatorId || 0, limit: 24, offset: 0 },
    { retry: false, enabled: !!creatorId }
  );
  const items = (contentData as any)?.items || [];
  const isSubscribed = (contentData as any)?.isSubscribed || false;

  const buyPPV = trpc.vaultx.purchasePpv.useMutation();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-white font-black text-xl mb-1">Content Feed</h2>
        <p className="text-gray-500 text-sm">Browse content from creators you follow.</p>
      </div>

      {/* Creator selector */}
      {subscriptions.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {subscriptions.map((sub: any) => (
            <button
              key={sub.creator_id}
              onClick={() => setCreatorId(sub.creator_id)}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                creatorId === sub.creator_id
                  ? "bg-red-500 text-white"
                  : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-red-500/50"
              }`}
            >
              <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-black text-xs">
                {sub.creator_name?.[0]?.toUpperCase() || "?"}
              </div>
              {sub.creator_name || `Creator ${sub.creator_id}`}
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 text-center">
          <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <div className="text-white font-bold mb-1">No subscriptions yet</div>
          <div className="text-gray-500 text-sm">Subscribe to creators in the Discover tab to see their content here.</div>
        </div>
      )}

      {/* Content grid */}
      {creatorId && (
        isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="aspect-square bg-gray-900 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Image className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <div className="font-semibold">No content posted yet</div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {items.map((item: any) => (
              <div key={item.id} className="relative rounded-xl overflow-hidden aspect-square bg-gray-900 group cursor-pointer">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${
                      item.locked ? "blur-lg" : ""
                    }`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">
                    {item.content_type === "video" ? "🎬" : item.content_type === "audio" ? "🎵" : "🖼️"}
                  </div>
                )}
                {item.locked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                    <Lock className="w-5 h-5 text-white mb-1" />
                    {item.unlock_type === "ppv" && (
                      <>
                        <div className="text-white text-xs font-bold">${(item.price_cents / 100).toFixed(2)}</div>
                        <button
                          onClick={async () => {
                            try {
                              const result = await buyPPV.mutateAsync({ contentId: item.id });
                              if (result.purchaseId) {
                                window.location.href = `/telegram-connect?purchaseId=${result.purchaseId}`;
                              } else {
                                toast.success("PPV purchase initiated");
                              }
                            } catch (e: any) { toast.error(e.message); }
                          }}
                          className="mt-1 bg-amber-500 text-black font-bold px-2 py-0.5 rounded-lg text-xs"
                        >
                          Buy
                        </button>
                      </>
                    )}
                  </div>
                )}
                {item.content_type === "video" && !item.locked && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-8 h-8 text-white drop-shadow-lg" />
                  </div>
                )}
                {item.unlock_type === "ppv" && !item.locked && (
                  <div className="absolute top-1 right-1 bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full">PPV</div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ============================================================================
// MESSAGING TAB — Real DMs via vaultx_messages table
// ============================================================================
function MessagingTab({ userId }: { userId: number }) {
  const [selectedConvo, setSelectedConvo] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: convoData, refetch: refetchConvos } = trpc.vaultx.getInbox.useQuery(undefined, { retry: false });
  const threads = (convoData as any)?.conversations || [];

  const { data: msgData, refetch: refetchMsgs } = trpc.vaultx.getConversation.useQuery(
    { otherUserId: selectedConvo || 0 },
    { retry: false, enabled: !!selectedConvo }
  );
  const messages = (msgData as any)?.messages || [];

  const sendMsg = trpc.vaultx.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText("");
      refetchMsgs();
      refetchConvos();
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!messageText.trim() || !selectedConvo) return;
    sendMsg.mutate({ recipientId: selectedConvo, messageText: messageText.trim() });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-black text-xl">Messages</h2>
        {selectedConvo && (
          <button
            onClick={() => setSelectedConvo(null)}
            className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
          >
            <XIcon className="w-4 h-4" /> Back
          </button>
        )}
      </div>

      {!selectedConvo ? (
        // Thread list
        threads.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Inbox className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <div className="font-semibold">No messages yet</div>
            <div className="text-sm mt-1">Subscribe to a creator and send them a DM</div>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((thread: any) => (
              <button
                key={thread.other_user_id}
                onClick={() => setSelectedConvo(thread.other_user_id)}
                className="w-full flex items-center gap-3 bg-gray-900/60 border border-gray-800 rounded-2xl p-4 hover:border-red-500/40 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                  {thread.other_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-sm truncate">{thread.other_name || `User ${thread.other_user_id}`}</div>
                  <div className="text-gray-500 text-xs truncate">{thread.last_message || "No messages yet"}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-gray-600 text-xs">
                    {thread.last_at ? new Date(thread.last_at).toLocaleDateString() : ""}
                  </div>
                  {thread.unread_count > 0 && (
                    <div className="w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                      {thread.unread_count}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        // Message view
        <div className="flex flex-col" style={{ height: "60vh" }}>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-sm">No messages yet. Say hello!</div>
            ) : (
              messages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
                      msg.sender_id === userId
                        ? "bg-red-500 text-white rounded-br-sm"
                        : "bg-gray-800 text-gray-200 rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                    <div className={`text-xs mt-1 ${
                      msg.sender_id === userId ? "text-red-200" : "text-gray-500"
                    }`}>
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800">
            <input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type a message..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500"
            />
            <button
              onClick={handleSend}
              disabled={sendMsg.isPending || !messageText.trim()}
              className="bg-red-500 text-white font-bold px-4 py-3 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STRIPE PAYMENT MODAL — Real card input via Stripe Elements
// ============================================================================
function StripePaymentForm({
  clientSecret,
  intentId,
  amountCents,
  label,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  intentId: string;
  amountCents: number;
  label: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    const cardEl = elements.getElement(CardElement);
    if (!cardEl) return;
    setLoading(true);
    setCardError(null);
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardEl },
      });
      if (error) throw new Error(error.message);
      if (paymentIntent?.status !== "succeeded") throw new Error("Payment did not complete");
      onSuccess();
    } catch (e: any) {
      setCardError(e.message || "Payment failed");
      onError(e.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-gray-400 text-xs mb-3 font-semibold uppercase tracking-wider">Card Details</p>
        <CardElement
          options={{
            style: {
              base: { color: "#fff", fontSize: "16px", "::placeholder": { color: "#6B7280" } },
              invalid: { color: "#EF4444" },
            },
          }}
        />
      </div>
      {cardError && <p className="text-red-400 text-sm">{cardError}</p>}
      <button
        onClick={handlePay}
        disabled={loading || !stripe}
        className="w-full py-3 rounded-xl font-black text-white text-sm transition-opacity"
        style={{
          background: loading ? "rgba(239,68,68,0.3)" : "linear-gradient(135deg, #EF4444, #F97316)",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Processing..." : `Pay $${(amountCents / 100).toFixed(2)} — ${label}`}
      </button>
    </div>
  );
}

function StripePaymentModal({
  clientSecret,
  intentId,
  amountCents,
  label,
  onSuccess,
  onClose,
}: {
  clientSecret: string;
  intentId: string;
  amountCents: number;
  label: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="bg-gray-950 border border-red-900/40 rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <h2 className="text-xl font-black text-white">{label}</h2>
          <p className="text-3xl font-black text-red-400 mt-2">${(amountCents / 100).toFixed(2)}</p>
        </div>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <StripePaymentForm
            clientSecret={clientSecret}
            intentId={intentId}
            amountCents={amountCents}
            label={label}
            onSuccess={onSuccess}
            onError={(msg) => toast.error(msg)}
          />
        </Elements>
        <button
          onClick={onClose}
          className="w-full mt-3 py-2 text-gray-500 text-sm hover:text-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// TIP MODAL
// ============================================================================
function TipModal({ creator, onClose }: { creator: any; onClose: () => void }) {
  const [amount, setAmount] = useState(5);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"input" | "pay">("input");
  const [intentData, setIntentData] = useState<{ clientSecret: string; intentId: string; amountCents: number } | null>(null);
  const createTipIntent = trpc.vaultx.createTipIntent.useMutation();
  const confirmTip = trpc.vaultx.confirmTip.useMutation();

  const handleCreateIntent = async () => {
    try {
      const result = await createTipIntent.mutateAsync({
        creatorId: creator.creator_id,
        amountCents: Math.round(amount * 100),
      });
      setIntentData({ clientSecret: result.clientSecret ?? "", intentId: String(result.tipId), amountCents: Math.round(amount * 100) });
      setStep("pay");
    } catch (e: any) {
      toast.error(e.message || "Failed to create tip");
    }
  };

  const handleTipSuccess = async () => {
    if (!intentData) return;
    try {
      await confirmTip.mutateAsync({ tipId: Number(intentData.intentId) });
      toast.success(`Tip sent to ${creator.display_name}!`);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to confirm tip");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="bg-gray-950 border border-pink-900/40 rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-black text-white mb-6 text-center">Send a Tip to {creator.display_name}</h2>
        {step === "input" ? (
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider font-semibold">Amount</p>
              <div className="flex gap-2 flex-wrap">
                {[1, 5, 10, 20, 50, 100].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v)}
                    className="px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                    style={{
                      background: amount === v ? "#EC4899" : "rgba(255,255,255,0.05)",
                      color: amount === v ? "white" : "#9CA3AF",
                      border: `1px solid ${amount === v ? "#EC4899" : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    ${v}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                max={1000}
                value={amount}
                onChange={(e) => setAmount(Math.max(1, Math.min(1000, Number(e.target.value))))}
                className="w-full mt-3 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500"
                placeholder="Custom amount"
              />
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider font-semibold">Message (optional)</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500 resize-none"
                placeholder="Leave a message..."
              />
            </div>
            <button
              onClick={handleCreateIntent}
              disabled={createTipIntent.isPending}
              className="w-full py-3 rounded-xl font-black text-white text-sm"
              style={{ background: "linear-gradient(135deg, #EC4899, #F43F5E)" }}
            >
              {createTipIntent.isPending ? "Processing..." : `Send $${amount} Tip`}
            </button>
          </div>
        ) : intentData ? (
          <Elements stripe={stripePromise} options={{ clientSecret: intentData.clientSecret }}>
            <StripePaymentForm
              clientSecret={intentData.clientSecret}
              intentId={intentData.intentId}
              amountCents={intentData.amountCents}
              label={`Tip to ${creator.display_name}`}
              onSuccess={handleTipSuccess}
              onError={(msg) => toast.error(msg)}
            />
          </Elements>
        ) : null}
        <button onClick={onClose} className="w-full mt-3 py-2 text-gray-500 text-sm hover:text-gray-300 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

function DiscoverTab() {
  const [showFeed, setShowFeed] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCreator, setSelectedCreator] = useState<any>(null);

  const { data: networkData } = trpc.vaultx.getNetwork.useQuery(
    { limit: 50, offset: 0 },
    { retry: false }
  );

  const creators = (networkData as any)?.creators || [];
  const paymentReadyCreators = creators.filter((c: any) => Number(c.base_subscription_price ?? 0) > 0 || c.ppv_enabled || c.tips_enabled || c.custom_requests_enabled);
  const messageReadyCreators = creators.filter((c: any) => c.custom_requests_enabled || c.tips_enabled);
  const featuredCreators = creators.filter((c: any) => c.is_featured);
  const creatorReadiness = creators.length > 0 ? Math.round((paymentReadyCreators.length / creators.length) * 100) : 0;

  const categories = ["all", "fitness", "cosplay", "dance", "lifestyle", "art", "gaming", "music", "custom"];

  const filtered = creators.filter((c: any) => {
    const matchSearch = !search || c.display_name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === "all" || (c.categories || []).includes(selectedCategory);
    return matchSearch && matchCat;
  });

  if (selectedCreator) {
    return <CreatorProfile creator={selectedCreator} onBack={() => setSelectedCreator(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Feed / Discover toggle */}
      <div className="flex gap-2 p-1 bg-gray-900 rounded-2xl">
        <button
          onClick={() => setShowFeed(false)}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
            !showFeed ? "bg-red-500 text-white" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Discover Creators
        </button>
        <button
          onClick={() => setShowFeed(true)}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
            showFeed ? "bg-red-500 text-white" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          For You
        </button>
      </div>

      {showFeed ? (
        <ForYouFeed />
      ) : (
      <>
      {/* Marketplace operating status — payment-ready inventory and next actions */}
      <div className="relative rounded-3xl overflow-hidden p-5 sm:p-8 lg:p-10 mb-2" style={{
        background: "linear-gradient(135deg, rgba(220,38,38,0.15) 0%, rgba(147,51,234,0.10) 50%, rgba(0,0,0,0.8) 100%)",
        border: "1px solid rgba(220,38,38,0.2)",
        boxShadow: "0 0 80px rgba(220,38,38,0.15) inset",
      }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 80% 20%, rgba(239,68,68,0.12), transparent 60%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#EF4444" }} />
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: "#EF4444" }}>Live marketplace status</span>
          </div>
          <h1 className="font-black text-white mb-3" style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            Browse real creator storefronts.<br />
            <span style={{ background: "linear-gradient(135deg, #DC2626, #EC4899, #9333EA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Buy, message, subscribe.
            </span>
          </h1>
          <p className="text-sm max-w-2xl mb-6" style={{ color: "#9CA3AF", lineHeight: 1.7 }}>
            This screen is now an operating surface, not a static shell. Every number below comes from the live VaultX creator database: searchable storefronts, payment-ready profiles, message-ready creators, and the exact next action a buyer can take.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:gap-4 sm:flex-wrap">
            {[
              { value: creators.length.toString(), label: creators.length === 1 ? "Live Creator" : "Live Creators" },
              { value: paymentReadyCreators.length.toString(), label: "Payment-Ready" },
              { value: messageReadyCreators.length.toString(), label: "Message/Tip Ready" },
              { value: `${creatorReadiness}%`, label: "Storefront Readiness" },
            ].map((stat, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-left">
                <div className="text-xl sm:text-2xl font-black text-white">{stat.value}</div>
                <div className="text-[11px] mt-0.5 uppercase tracking-[.12em]" style={{ color: "#6B7280" }}>{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="relative mt-5 grid gap-3 md:grid-cols-3">
            {[
              { title: "1. Open a real profile", body: filtered.length > 0 ? "Tap any live storefront to review subscription price, PPV, tips, custom requests, and creator proof." : "No storefront matches this filter yet; complete onboarding before selling." },
              { title: "2. Choose the money path", body: paymentReadyCreators.length > 0 ? "Subscribe, buy PPV, tip, or request custom work only where the creator has enabled that lane." : "Payment lanes are not ready until a creator sets pricing or enables paid features." },
              { title: "3. Verify before scaling", body: "Revenue should move through Stripe-backed purchase flows and verified ledgers, not inflated static counters." },
            ].map((step) => (
              <div key={step.title} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs font-black uppercase tracking-[.16em] text-red-300 mb-2">{step.title}</div>
                <div className="text-xs leading-5 text-gray-400">{step.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="flex-1 relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search live creator storefronts..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 pl-10"
          />
          <Eye className="absolute left-3 top-3.5 w-4 h-4 text-gray-600" />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold capitalize transition-colors ${
              selectedCategory === cat
                ? "bg-red-500 text-white"
                : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-red-500/50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Featured */}
      {filtered.filter((c: any) => c.is_featured).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-white font-bold text-sm">Featured Creators</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.filter((c: any) => c.is_featured).slice(0, 6).map((c: any) => (
              <CreatorCard key={c.id} creator={c} onClick={() => setSelectedCreator(c)} />
            ))}
          </div>
        </div>
      )}

      {/* All Creators */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-red-400" />
          <span className="text-white font-bold text-sm">
            {filtered.length === 0 ? "No live storefronts match" : `${filtered.length} live storefront${filtered.length === 1 ? "" : "s"}`}
          </span>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Flame className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <div className="font-semibold">No matching storefronts yet</div>
            <div className="text-sm mt-1 mb-4">Create or complete a creator profile so this marketplace has real inventory to sell.</div>
            <a href="/vaultx-onboarding" className="inline-block bg-red-500 text-white font-bold py-3 px-6 rounded-xl text-sm uppercase tracking-wider hover:bg-red-600 transition-colors">
              Complete creator onboarding →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map((c: any) => (
              <CreatorCard key={c.id} creator={c} onClick={() => setSelectedCreator(c)} />
            ))}
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}

// ============================================================================
// CREATOR PROFILE VIEW — with 3-tier subscription modal
// ============================================================================
function CreatorProfile({ creator, onBack }: { creator: any; onBack: () => void }) {
  const tier = TIER_CONFIG[creator.tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.emerging;
  const [subStep, setSubStep] = useState<"idle" | "tiers" | "pay" | "done">("idle");
  const [selectedTier, setSelectedTier] = useState<{ id: number; name: string; price: number } | null>(null);
  const [subIntentData, setSubIntentData] = useState<{ clientSecret: string; intentId: string; amountCents: number; tierId: number } | null>(null);
  const [showTip, setShowTip] = useState(false);
  const subscribeIntent = trpc.vaultx.subscribeToCreator.useMutation();
  const confirmSub = trpc.vaultx.confirmSubscription.useMutation();
  const { data: tiersData } = trpc.vaultx.getCreatorProfile.useQuery(
    { creatorId: creator.creator_id },
    { retry: false, enabled: !!creator.creator_id }
  );
  const { data: contentData } = trpc.vaultx.getCreatorContent.useQuery(
    { creatorId: creator.creator_id, limit: 12, offset: 0 },
    { retry: false, enabled: !!creator.creator_id }
  );
  const isSubscribed = (contentData as any)?.isSubscribed || subStep === "done";

  // Build tiers: use DB tiers if available, else derive from creator's base price
  const tiers = (tiersData as any)?.creator?.tiers?.length > 0
    ? (tiersData as any).creator.tiers
    : [
        { id: 1, name: "Fan", price: creator.base_subscription_price || 9.99, description: "Access to all posts and DMs", perks: ["All posts unlocked", "DM access", "Subscriber badge"] },
        { id: 2, name: "Super Fan", price: (creator.base_subscription_price || 9.99) * 2, description: "Everything in Fan + PPV discounts", perks: ["All Fan perks", "20% PPV discount", "Priority DM reply", "Exclusive content"] },
        { id: 3, name: "VIP", price: (creator.base_subscription_price || 9.99) * 5, description: "Full access + custom requests", perks: ["All Super Fan perks", "1 custom request/month", "VIP badge", "First access to new content"] },
      ];

  const handleSubscribe = async (tierOverride?: { id: number; price: number }) => {
    const t = tierOverride || selectedTier;
    if (!t) { setSubStep("tiers"); return; }
    try {
      const result = await subscribeIntent.mutateAsync({ creatorId: creator.creator_id, tier: (t.id === 1 ? "basic" : t.id === 2 ? "premium" : "vip") as any });
      setSubIntentData({
        clientSecret: "",
        intentId: String(result.subscriptionId),
        amountCents: Math.round((t.price || 9.99) * 100),
        tierId: t.id,
      });
      setSubStep("pay");
    } catch (e: any) {
      if (e.message?.includes("Already subscribed")) {
        toast.info("You are already subscribed");
        setSubStep("done");
      } else {
        toast.error(e.message || "Failed to start subscription");
      }
    }
  };

  const handleSubSuccess = async () => {
    if (!subIntentData) return;
    try {
      await confirmSub.mutateAsync({
        subscriptionId: Number(subIntentData.intentId),
      });
      setSubStep("done");
      toast.success(`Subscribed to ${creator.display_name}!`);
    } catch (e: any) {
      toast.error(e.message || "Failed to confirm subscription");
    }
  };

  return (
    <div className="space-y-4">
      {showTip && <TipModal creator={creator} onClose={() => setShowTip(false)} />}
      {subStep === "pay" && subIntentData && (
        <StripePaymentModal
          clientSecret={subIntentData.clientSecret}
          intentId={subIntentData.intentId}
          amountCents={subIntentData.amountCents}
          label={`Subscribe to ${creator.display_name}`}
          onSuccess={handleSubSuccess}
          onClose={() => setSubStep("idle")}
        />
      )}
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
        ← Back to Discover
      </button>

      {/* Banner */}
      <div className="rounded-2xl overflow-hidden border border-gray-800">
        <div className="h-40 bg-[#0a0a0a] from-red-900/60 to-orange-900/40 relative">
          {creator.profile_banner_url && (
            <img src={creator.profile_banner_url} alt="" className="w-full h-full object-cover opacity-50" />
          )}
          <div className="absolute inset-0 bg-[#0a0a0a] from-gray-950 via-transparent to-transparent" />
        </div>
        <div className="bg-gray-950 p-5 -mt-8 relative">
          <div className="flex items-end justify-between mb-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0a0a0a] from-red-500 to-orange-500 flex items-center justify-center text-white font-black text-2xl border-4 border-gray-950">
              {creator.display_name?.[0]?.toUpperCase()}
            </div>
            <div className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ color: tier.color, backgroundColor: `${tier.color}20` }}>
              {tier.icon} {tier.label}
            </div>
          </div>
          <div className="font-black text-white text-xl mb-1">{creator.display_name}</div>
          <div className="text-gray-400 text-sm mb-4">{creator.bio}</div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-gray-900 rounded-xl p-3 text-center">
              <div className="text-white font-bold">{creator.total_subscribers || 0}</div>
              <div className="text-gray-500 text-xs">Subscribers</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-3 text-center">
              <div className="text-white font-bold">{creator.total_posts || 0}</div>
              <div className="text-gray-500 text-xs">Posts</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-3 text-center">
              <div className="text-red-400 font-bold">${creator.base_subscription_price || "—"}</div>
              <div className="text-gray-500 text-xs">Per Month</div>
            </div>
          </div>

          {/* 3-Tier Subscription Modal */}
          {subStep === "tiers" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSubStep("idle")}>
              <div className="bg-gray-950 border border-red-900/40 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="text-center mb-5">
                  <div className="text-xl font-black text-white">Subscribe to {creator.display_name}</div>
                  <div className="text-gray-500 text-sm mt-1">Choose your tier</div>
                </div>
                <div className="space-y-3">
                  {tiers.map((t: any, i: number) => (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedTier(t); handleSubscribe(t); }}
                      disabled={subscribeIntent.isPending}
                      className={`w-full text-left border rounded-2xl p-4 transition-all hover:border-red-500/60 ${
                        i === 1 ? "border-red-500/50 bg-red-950/20" : "border-gray-800 bg-gray-900/60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {i === 1 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">POPULAR</span>}
                          <span className="text-white font-bold">{t.name}</span>
                        </div>
                        <span className="text-red-400 font-black">${typeof t.price === "number" ? t.price.toFixed(2) : t.price}<span className="text-gray-600 font-normal text-xs">/mo</span></span>
                      </div>
                      <div className="text-gray-500 text-xs mb-2">{t.description || t.perks?.[0]}</div>
                      <div className="space-y-1">
                        {(t.perks || []).map((perk: string) => (
                          <div key={perk} className="flex items-center gap-2 text-xs text-gray-400">
                            <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                            {perk}
                          </div>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setSubStep("idle")} className="w-full mt-3 py-2 text-gray-500 text-sm hover:text-gray-300">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => isSubscribed ? null : setSubStep("tiers")}
              disabled={subscribeIntent.isPending}
              className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {subscribeIntent.isPending ? "Loading..." : isSubscribed ? "✓ Subscribed" : `Subscribe from $${creator.base_subscription_price || "9.99"}/mo`}
            </button>
            {creator.tips_enabled && (
              <button
                onClick={() => setShowTip(true)}
                className="bg-gray-800 text-white font-bold py-3 px-4 rounded-xl text-sm hover:bg-gray-700 transition-colors"
              >
                <Gift className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid — real data from getCreatorContent */}
      {contentData && contentData.items.length > 0 ? (
        <div className="space-y-3">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Content ({contentData.items.length})</p>
          <div className="grid grid-cols-3 gap-2">
            {contentData.items.map((item: any) => (
              <div key={item.id} className="relative rounded-xl overflow-hidden aspect-square bg-gray-900">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className={`w-full h-full object-cover ${item.locked ? "blur-md" : ""}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-2xl">
                    {item.content_type === "video" ? "🎬" : item.content_type === "image" ? "🖼️" : "🎵"}
                  </div>
                )}
                {item.locked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                )}
                {item.unlock_type === "ppv" && !item.locked && (
                  <div className="absolute top-1 right-1 bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full">PPV</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : !isSubscribed ? (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 text-center">
          <Lock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <div className="text-white font-bold mb-1">Content is locked</div>
          <div className="text-gray-500 text-sm">Subscribe to unlock all posts, videos, and DMs</div>
        </div>
      ) : null}

      {/* PPV */}
      {creator.ppv_enabled && (
        <div className="bg-gray-900/60 border border-amber-900/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 font-bold text-sm">Pay-Per-View Available</span>
          </div>
          <div className="text-gray-400 text-xs">Purchase individual pieces of content without a subscription.</div>
        </div>
      )}

      {/* Custom Requests */}
      {creator.custom_requests_enabled && (
        <div className="bg-gray-900/60 border border-purple-900/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-purple-400" />
            <span className="text-purple-400 font-bold text-sm">Custom Requests Open</span>
          </div>
          <div className="text-gray-400 text-xs">DM to request custom content. Prices vary.</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MY PROFILE TAB
// ============================================================================
function MyProfileTab({ userId }: { userId: number }) {
  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    contentStyle: "",
    subscriptionPrice: "9.99",
    ppvEnabled: true,
    tipsEnabled: true,
    customRequestsEnabled: true,
    dmPaywallEnabled: false,
    categories: [] as string[],
  });
  const [saved, setSaved] = useState(false);

  const { data: profileData } = trpc.vaultx.getMyCreatorProfile.useQuery(undefined, { retry: false });

  useEffect(() => {
    if (profileData && (profileData as any).profile) {
      const p = (profileData as any).profile;
      setForm({
        displayName: p.display_name || "",
        bio: p.bio || "",
        contentStyle: p.content_style || "",
        subscriptionPrice: p.base_subscription_price?.toString() || "9.99",
        ppvEnabled: p.ppv_enabled ?? true,
        tipsEnabled: p.tips_enabled ?? true,
        customRequestsEnabled: p.custom_requests_enabled ?? true,
        dmPaywallEnabled: p.dm_paywall_enabled ?? false,
        categories: p.categories || [],
      });
    }
  }, [profileData]);

  const updateProfile = trpc.vaultx.updateCreatorProfile.useMutation({
    onSuccess: () => { setSaved(true); toast.success("Profile saved!"); setTimeout(() => setSaved(false), 2000); },
    onError: (e) => toast.error(e.message),
  });

  const categoryOptions = ["fitness", "cosplay", "dance", "lifestyle", "art", "gaming", "music", "custom", "modeling", "comedy"];

  const toggleCategory = (cat: string) => {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(cat) ? f.categories.filter(c => c !== cat) : [...f.categories, cat]
    }));
  };

  const handleSave = () => {
    updateProfile.mutate({
      displayName: form.displayName,
      bio: form.bio,
      contentStyle: form.contentStyle,
      subscriptionPrice: parseFloat(form.subscriptionPrice),
      ppvEnabled: form.ppvEnabled,
      tipsEnabled: form.tipsEnabled,
      customRequestsEnabled: form.customRequestsEnabled,
      dmPaywallEnabled: form.dmPaywallEnabled,
      categories: form.categories,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-black text-xl">My VaultX Profile</h2>
        <button
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className="bg-red-500 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {saved ? "✓ Saved" : updateProfile.isPending ? "Saving..." : "Save Profile"}
        </button>
      </div>

      {/* Display Name */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="text-white font-bold text-sm flex items-center gap-2">
          <Camera className="w-4 h-4 text-red-400" /> Identity
        </div>
        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Display Name</label>
          <input
            value={form.displayName}
            onChange={(e) => setForm(f => ({ ...f, displayName: e.target.value }))}
            placeholder="Your creator name on VaultX"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500"
          />
        </div>
        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))}
            placeholder="Tell subscribers what you offer..."
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 resize-none"
          />
        </div>
        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Content Style</label>
          <input
            value={form.contentStyle}
            onChange={(e) => setForm(f => ({ ...f, contentStyle: e.target.value }))}
            placeholder="e.g. Sensual, Explicit, Artistic..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm flex items-center gap-2 mb-4">
          <Hash className="w-4 h-4 text-red-400" /> Categories
        </div>
        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                form.categories.includes(cat)
                  ? "bg-red-500 text-white"
                  : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-red-500/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Monetization */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="text-white font-bold text-sm flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-red-400" /> Monetization
        </div>
        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Monthly Subscription Price ($)</label>
          <input
            type="number"
            value={form.subscriptionPrice}
            onChange={(e) => setForm(f => ({ ...f, subscriptionPrice: e.target.value }))}
            min="4.99"
            step="0.01"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500"
          />
          <div className="text-gray-600 text-xs mt-1">You keep 85% — platform takes 15%</div>
        </div>

        {/* Toggles */}
        {[
          { key: "ppvEnabled", label: "Pay-Per-View", desc: "Sell individual posts/videos" },
          { key: "tipsEnabled", label: "Tips", desc: "Accept tips from fans" },
          { key: "customRequestsEnabled", label: "Custom Requests", desc: "Accept custom content orders" },
          { key: "dmPaywallEnabled", label: "DM Paywall", desc: "Charge to unlock your DMs" },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between py-3 border-t border-gray-800">
            <div>
              <div className="text-white text-sm font-semibold">{label}</div>
              <div className="text-gray-500 text-xs">{desc}</div>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, [key]: !f[key as keyof typeof f] }))}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                form[key as keyof typeof form] ? "bg-red-500" : "bg-gray-700"
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                form[key as keyof typeof form] ? "translate-x-6" : "translate-x-0.5"
              }`} />
            </button>
          </div>
        ))}
      </div>

      {/* Revenue Share Info */}
      <div className="bg-[#0a0a0a] from-red-950/50 to-orange-950/30 border border-red-900/30 rounded-2xl p-5">
        <div className="text-red-400 font-bold text-sm mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Your Revenue Breakdown
        </div>
        <div className="space-y-2 text-sm">
          {[
            { label: "Subscriptions", pct: "85%" },
            { label: "Pay-Per-View", pct: "85%" },
            { label: "Tips", pct: "90%" },
            { label: "Custom Requests", pct: "85%" },
          ].map(({ label, pct }) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-400">{label}</span>
              <span className="text-white font-bold">{pct} to you</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
// ============================================================================
// TELEGRAM TAB
// ============================================================================
function TelegramTab({ userId }: { userId: number }) {
  // ── Real tRPC state ────────────────────────────────────────────────────
  const utils = trpc.useUtils();

  // Query: load the currently linked channel from the DB on mount
  const { data: linkedChannel, isLoading: channelLoading } =
    trpc.vaultx.getLinkedChannel.useQuery(undefined, { retry: false });

  // Mutation: upsert a channel row into telegram_channels
  const linkMutation = trpc.vaultx.linkChannel.useMutation({
    onSuccess: (row) => {
      utils.vaultx.getLinkedChannel.invalidate();
      setChannelUsername(row?.channel_id ?? "");
      toast.success(
        row?.channel_id
          ? `Channel @${row.channel_id} linked to VaultX!`
          : "Channel linked!"
      );
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to link channel");
    },
  });

  // ── Local UI state ────────────────────────────────────────────────────
  const [channelUsername, setChannelUsername] = useState("");
  const [channelPrice, setChannelPrice] = useState("9.99");
  const [botToken, setBotToken] = useState("");
  const [copied, setCopied] = useState(false);

  // Pre-fill the input once the query resolves
  const prevLinkedRef = useRef<string | null>(null);
  useEffect(() => {
    if (linkedChannel?.channel_id && linkedChannel.channel_id !== prevLinkedRef.current) {
      prevLinkedRef.current = linkedChannel.channel_id;
      setChannelUsername(linkedChannel.channel_id);
    }
  }, [linkedChannel]);

  const linked = Boolean(linkedChannel?.channel_id);
  const vaultxBotUsername = "@VaultXBot";
  const inviteLink = `https://t.me/VaultXBot?start=sub_${userId}`;
  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleLinkChannel = () => {
    if (!channelUsername.trim()) return toast.error("Enter your channel username");
    linkMutation.mutate({
      channelId: channelUsername.trim().replace(/^@/, ""),
      channelName: channelUsername.trim().replace(/^@/, ""),
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-white font-black text-xl mb-1">Telegram Integration</h2>
        <p className="text-gray-500 text-sm">Link your Telegram channel. Fans pay VaultX to get added automatically.</p>
      </div>

      {/* How It Works */}
      <div className="bg-gray-900/60 border border-blue-900/30 rounded-2xl p-5">
        <div className="text-blue-400 font-bold text-sm mb-4 flex items-center gap-2">
          <Bot className="w-4 h-4" /> How VaultX Telegram Works
        </div>
        <div className="space-y-3">
          {[
            { step: "1", text: "Link your private Telegram channel below" },
            { step: "2", text: "Set your monthly access price" },
            { step: "3", text: "Share your VaultX subscribe link" },
            { step: "4", text: "Fans pay → VaultX bot auto-adds them to your channel" },
            { step: "5", text: "Expired subscriptions = auto-removed. Zero manual work." },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{step}</div>
              <span className="text-gray-400 text-sm">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Link Channel */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="text-white font-bold text-sm flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-400" /> Link Your Channel
        </div>

        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Channel Username</label>
          <div className="flex gap-2">
            <div className="flex items-center bg-gray-800 border border-gray-700 rounded-xl px-3 text-gray-500 text-sm">@</div>
            <input
              value={channelUsername}
              onChange={(e) => setChannelUsername(e.target.value.replace("@", ""))}
              placeholder="yourchannelname"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Monthly Access Price ($)</label>
          <input
            type="number"
            value={channelPrice}
            onChange={(e) => setChannelPrice(e.target.value)}
            min="4.99"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Setup Instructions</label>
          <div className="bg-gray-800 rounded-xl p-4 text-xs text-gray-400 space-y-1.5">
            <div>1. Add <span className="text-blue-400 font-mono">{vaultxBotUsername}</span> as admin to your channel</div>
            <div>2. Give it "Add Members" permission</div>
            <div>3. Enter your channel username above and click Link</div>
          </div>
        </div>

        {/* Linked status badge */}
        {channelLoading ? (
          <div className="text-gray-500 text-xs">Checking linked channel…</div>
        ) : linked ? (
          <div className="flex items-center gap-2 text-green-400 text-xs font-semibold">
            <CheckCircle className="w-4 h-4" />
            Linked to: @{linkedChannel!.channel_id}
          </div>
        ) : null}

        <button
          onClick={handleLinkChannel}
          disabled={linkMutation.isPending}
          className={`w-full font-bold py-3 rounded-xl text-sm transition-colors ${
            linkMutation.isPending
              ? "bg-gray-700 text-gray-400 cursor-not-allowed"
              : linked
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {linkMutation.isPending
            ? "Linking…"
            : linked
            ? "Update Channel"
            : "Link Channel"}
        </button>

        {/* Inline error */}
        {linkMutation.isError && (
          <p className="text-red-400 text-xs mt-1">
            {linkMutation.error?.message ?? "Failed to link channel"}
          </p>
        )}
      </div>

      {/* Subscribe Link */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm flex items-center gap-2 mb-3">
          <Send className="w-4 h-4 text-blue-400" /> Your Subscribe Link
        </div>
        <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
          <div className="flex-1 text-blue-400 text-xs font-mono truncate">{inviteLink}</div>
          <button onClick={copyLink} className="text-gray-400 hover:text-white transition-colors">
            {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <div className="text-gray-600 text-xs mt-2">Share this link on X, Instagram, or anywhere. Fans click → pay → get added automatically.</div>
      </div>

      {/* Telegram Content Ideas */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-amber-400" /> What to Post in Your VaultX Channel
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "🔥", label: "Daily exclusives", desc: "Content fans can't get anywhere else" },
            { icon: "💬", label: "Voice messages", desc: "Personal audio for subscribers" },
            { icon: "📸", label: "Behind the scenes", desc: "Raw, unfiltered moments" },
            { icon: "⚡", label: "Flash PPV drops", desc: "Limited-time premium content" },
            { icon: "🎁", label: "Subscriber rewards", desc: "Loyalty bonuses and gifts" },
            { icon: "🗳️", label: "Polls & requests", desc: "Let fans vote on content" },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="bg-gray-800 rounded-xl p-3">
              <div className="text-lg mb-1">{icon}</div>
              <div className="text-white text-xs font-semibold">{label}</div>
              <div className="text-gray-500 text-xs">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// X.COM TAB
// ============================================================================
function XComTab({ userId }: { userId: number }) {
  const [xHandle, setXHandle] = useState("");
  const [teaserText, setTeaserText] = useState("");
  const [generatedTeaser, setGeneratedTeaser] = useState("");
  const [copied, setCopied] = useState(false);

  const vaultxProfileUrl = `https://creatorvault.live/vault-x/creator/${userId}`;

  const teaserTemplates = [
    `🔥 New content just dropped on VaultX. Subscribers only.\n\nSubscribe now 👇\n${vaultxProfileUrl}\n\n#VaultX #AdultContent #Exclusive`,
    `Can't post this here 😈\n\nYou know where to find it 👇\n${vaultxProfileUrl}\n\n#VaultX #Uncensored`,
    `POV: You're not subscribed to my VaultX yet 😏\n\nFix that 👇\n${vaultxProfileUrl}`,
    `New PPV just went live 🔐\n\nFirst 10 subscribers get it free.\n${vaultxProfileUrl}\n\n#VaultX #PPV`,
    `I post what I want on VaultX. No censorship. No limits.\n\nJoin the uncensored side 👇\n${vaultxProfileUrl}`,
  ];

  const generateTeaser = () => {
    const random = teaserTemplates[Math.floor(Math.random() * teaserTemplates.length)];
    setGeneratedTeaser(random);
  };

  const copyTeaser = () => {
    navigator.clipboard.writeText(generatedTeaser);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openXPost = () => {
    const text = encodeURIComponent(generatedTeaser || `Subscribe to my VaultX for exclusive adult content 🔥\n${vaultxProfileUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-white font-black text-xl mb-1">X.com Funnel</h2>
        <p className="text-gray-500 text-sm">Post teasers on X. Drive traffic to your VaultX. Convert followers into paying subscribers.</p>
      </div>

      {/* Strategy */}
      <div className="bg-[#0a0a0a] from-gray-900 to-black border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <Twitter className="w-4 h-4 text-sky-400" /> The X → VaultX Funnel
        </div>
        <div className="flex items-center gap-2 text-sm overflow-x-auto pb-2">
          {[
            { icon: "📱", label: "Post teaser on X" },
            { icon: "→", label: "" },
            { icon: "👁️", label: "Followers see it" },
            { icon: "→", label: "" },
            { icon: "🔗", label: "Click VaultX link" },
            { icon: "→", label: "" },
            { icon: "💳", label: "Subscribe" },
            { icon: "→", label: "" },
            { icon: "💰", label: "You get paid" },
          ].map(({ icon, label }, i) => (
            <div key={i} className={`flex-shrink-0 ${label === "" ? "text-gray-600" : "text-center"}`}>
              {label === "" ? (
                <span className="text-gray-600">→</span>
              ) : (
                <div>
                  <div className="text-lg">{icon}</div>
                  <div className="text-gray-500 text-xs whitespace-nowrap">{label}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Your VaultX Link */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-red-400" /> Your VaultX Profile Link
        </div>
        <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
          <div className="flex-1 text-red-400 text-xs font-mono truncate">{vaultxProfileUrl}</div>
          <button
            onClick={() => { navigator.clipboard.writeText(vaultxProfileUrl); toast.success("Copied!"); }}
            className="text-gray-400 hover:text-white"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <div className="text-gray-600 text-xs mt-2">Put this in your X bio. Post it in every teaser tweet.</div>
      </div>

      {/* Teaser Generator */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="text-white font-bold text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Teaser Generator
        </div>
        <p className="text-gray-500 text-xs">Generate ready-to-post X teasers that drive clicks to your VaultX.</p>

        <button
          onClick={generateTeaser}
          className="w-full bg-sky-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-sky-700 transition-colors"
        >
          Generate Teaser Post
        </button>

        {generatedTeaser && (
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-xl p-4 text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
              {generatedTeaser}
            </div>
            <div className="flex gap-3">
              <button
                onClick={copyTeaser}
                className="flex-1 bg-gray-700 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={openXPost}
                className="flex-1 bg-sky-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-sky-700 transition-colors flex items-center justify-center gap-2"
              >
                <Twitter className="w-4 h-4" />
                Post to X
              </button>
              <button
                onClick={generateTeaser}
                className="bg-gray-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm hover:bg-gray-600 transition-colors"
              >
                ↺
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Strategy */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-red-400" /> Proven X Content Strategy for Adult Creators
        </div>
        <div className="space-y-3">
          {[
            { pct: "40%", type: "Teasers", desc: "Censored previews with VaultX link", color: "bg-red-500" },
            { pct: "30%", type: "Personality", desc: "Your life, opinions, humor — build connection", color: "bg-orange-500" },
            { pct: "20%", type: "Social proof", desc: "Subscriber counts, testimonials, earnings", color: "bg-amber-500" },
            { pct: "10%", type: "Direct CTA", desc: "Hard sell — subscribe now, limited spots", color: "bg-yellow-500" },
          ].map(({ pct, type, desc, color }) => (
            <div key={type} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>{pct}</div>
              <div>
                <div className="text-white text-sm font-semibold">{type}</div>
                <div className="text-gray-500 text-xs">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Posting Schedule */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-purple-400" /> Optimal Posting Schedule
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { time: "9–11 AM", label: "Morning tease", desc: "Catch commuters" },
            { time: "12–2 PM", label: "Lunch drop", desc: "Peak engagement" },
            { time: "6–8 PM", label: "Evening heat", desc: "After work crowd" },
            { time: "10 PM–12 AM", label: "Late night", desc: "Highest conversion" },
          ].map(({ time, label, desc }) => (
            <div key={time} className="bg-gray-800 rounded-xl p-3">
              <div className="text-purple-400 text-xs font-bold">{time}</div>
              <div className="text-white text-sm font-semibold">{label}</div>
              <div className="text-gray-500 text-xs">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EARNINGS TAB
// ============================================================================
function EarningsTab({ userId }: { userId: number }) {
  const { data: revenueData } = trpc.vaultx.getRevenueStats.useQuery(undefined, { retry: false });
  const stats = (revenueData as any) || {};

  const earningsBreakdown = [
    { label: "Subscriptions", amount: stats.subscription_revenue || 0, icon: "👥", color: "text-red-400" },
    { label: "Pay-Per-View", amount: stats.ppv_revenue || 0, icon: "🔐", color: "text-orange-400" },
    { label: "Tips", amount: stats.tip_revenue || 0, icon: "💝", color: "text-pink-400" },
    { label: "Custom Requests", amount: stats.custom_revenue || 0, icon: "✨", color: "text-purple-400" },
  ];

  const totalEarnings = earningsBreakdown.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-white font-black text-xl mb-1">Earnings Dashboard</h2>
        <p className="text-gray-500 text-sm">Your VaultX revenue breakdown.</p>
      </div>

      {/* Total */}
      <div className="bg-[#0a0a0a] from-red-950/60 to-orange-950/40 border border-red-900/30 rounded-2xl p-6 text-center">
        <div className="text-gray-400 text-sm mb-1">Total VaultX Earnings</div>
        <div className="text-5xl font-black text-white mb-1">${totalEarnings.toFixed(2)}</div>
        <div className="text-red-400 text-xs">85% revenue share on all sales</div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {earningsBreakdown.map(({ label, amount, icon, color }) => (
          <div key={label} className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
            <div className="text-2xl mb-2">{icon}</div>
            <div className={`text-xl font-black ${color}`}>${amount.toFixed(2)}</div>
            <div className="text-gray-500 text-xs">{label}</div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-red-400" /> Creator Stats
        </div>
        <div className="space-y-3">
          {[
            { label: "Total Subscribers", value: stats.total_subscribers || 0 },
            { label: "Active Subscribers", value: stats.active_subscribers || 0 },
            { label: "Total Posts", value: stats.total_posts || 0 },
            { label: "Avg Monthly Revenue", value: `$${(stats.avg_monthly_revenue || 0).toFixed(2)}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
              <span className="text-gray-400 text-sm">{label}</span>
              <span className="text-white font-bold">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payout */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-green-400" /> Payout Settings
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Payout Schedule</span>
            <span className="text-white text-sm font-semibold">Weekly (Fridays)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Minimum Payout</span>
            <span className="text-white text-sm font-semibold">$50</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Methods</span>
            <span className="text-white text-sm font-semibold">CashApp, Zelle, Crypto</span>
          </div>
        </div>
        <button className="w-full mt-4 bg-green-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-green-700 transition-colors">
          Request Payout
        </button>
      </div>

      {/* Revenue Projections */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" /> Revenue Projections
        </div>
        <div className="text-gray-500 text-xs mb-4">Based on $9.99/mo subscription price:</div>
        <div className="space-y-2">
          {[
            { subs: 50, monthly: 424, annual: 5088 },
            { subs: 100, monthly: 849, annual: 10188 },
            { subs: 250, monthly: 2122, annual: 25464 },
            { subs: 500, monthly: 4245, annual: 50940 },
            { subs: 1000, monthly: 8490, annual: 101880 },
          ].map(({ subs, monthly, annual }) => (
            <div key={subs} className="flex items-center gap-3">
              <div className="w-20 text-gray-500 text-xs">{subs} subs</div>
              <div className="flex-1 bg-gray-800 rounded-full h-2">
                <div
                  className="bg-[#0a0a0a] from-red-500 to-orange-500 h-2 rounded-full"
                  style={{ width: `${Math.min((subs / 1000) * 100, 100)}%` }}
                />
              </div>
              <div className="text-white text-xs font-bold w-16 text-right">${monthly}/mo</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN VAULTX PAGE
// ============================================================================

// ─── RealmToggle ─────────────────────────────────────────────────────────────
// Exported for use in AppHeader — shows VaultX status indicator when adult-verified
export function RealmToggle() {
  const { data: realmStatus } = trpc.vaultx.getRealmStatus.useQuery(undefined, {
    retry: false,
  });
  if (!realmStatus?.adultVerified) return null;
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "oklch(0.18 0.04 0 / 0.6)", border: "1px solid oklch(0.3 0.08 0 / 0.4)" }}>
      <span className="text-xs font-medium" style={{ color: "oklch(0.75 0.2 0)" }}>VaultX</span>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "oklch(0.65 0.22 140)" }} />
    </div>
  );
}


function VaultXPublicLanding() {
  const offerParams = new URLSearchParams(window.location.search);
  const offerSlug = offerParams.get("offer") || "";
  const offerPrice = Number(offerParams.get("price") || "97");
  const offerRef = offerParams.get("ref") || "direct";
  const paidSessionId = offerParams.get("session_id") || "";
  const isBodyCinemaOffer = offerSlug === "body-cinema";
  const vaultXOfferCheckout = trpc.stripeCheckout.createVaultXOfferCheckout.useMutation({
    onSuccess: (result) => {
      window.location.href = result.url;
    },
    onError: (error) => {
      toast.error(error.message || "VaultX checkout is not available right now.");
    },
  });

  const startVaultXOfferCheckout = () => {
    if (!isBodyCinemaOffer) {
      window.location.href = "/vault-x/editor";
      return;
    }

    vaultXOfferCheckout.mutate({
      offer: offerSlug,
      price: offerPrice,
      ref: offerRef,
    });
  };

  const priceLabel = `$${Number.isFinite(offerPrice) ? offerPrice : 97}`;

  const deliverables = [
    {
      icon: Video,
      title: "Angle Stack",
      body: "Turn one raw clip into multiple buyer-ready angles: hero framing, close crop, reveal cut, profile crop, and vertical story version.",
    },
    {
      icon: Sparkles,
      title: "Skin Pop Polish",
      body: "A creator-safe finishing pass focused on glow, contrast, pacing, caption rhythm, and premium visual presentation.",
    },
    {
      icon: Eye,
      title: "Reveal Teaser System",
      body: "Build public-safe teasers that create curiosity without exposing the premium asset before the checkout moment.",
    },
    {
      icon: Camera,
      title: "Close-Up Isolator",
      body: "Pull the most magnetic body, outfit, motion, and expression moments into short clips that feel intentional instead of random.",
    },
    {
      icon: Play,
      title: "60-Second Body Highlight Reel",
      body: "Package a concise highlight sequence for profile posts, fan drops, paid previews, Telegram pushes, and follow-up campaigns.",
    },
    {
      icon: DollarSign,
      title: "Revenue Route Notes",
      body: "Get clear next-step guidance for where to use each cut: free preview, paid unlock, VIP message, or retargeting follow-up.",
    },
  ];

  const moneyFlow = [
    { step: "Upload", copy: "Bring the raw clip, selfie set, gym clip, outfit change, or creator footage into the VaultX workflow." },
    { step: "Cinema Cut", copy: "The kit breaks it into angles, hook moments, safe teasers, premium-ready highlights, and caption-ready assets." },
    { step: "Launch", copy: "Use the finished package for profile drops, fan messages, Telegram pushes, paid unlocks, and offer follow-up." },
  ];

  const proofTiles = [
    { value: "5", label: "creator-ready cut types" },
    { value: "60s", label: "highlight reel target" },
    { value: "18+", label: "adult creator business context" },
    { value: "$97", label: "real Stripe offer" },
  ];

  const faqs = [
    {
      q: "Is this explicit content?",
      a: "No. This public page is business-safe. The product is for adult, fitness, beauty, and body-led creators who need premium, platform-aware content packaging without exposing private material in the sales page.",
    },
    {
      q: "What happens after checkout?",
      a: "Stripe processes the purchase and returns you to CreatorVault. Access and challenge credit are finalized only after the live webhook confirms the completed payment.",
    },
    {
      q: "Who is this for?",
      a: "Creators who already have raw footage but need a sharper money path: better teasers, stronger highlights, cleaner visual polish, and content versions that are ready to send, post, and monetize.",
    },
  ];

  return (
    <div className="min-h-screen text-white overflow-hidden relative" style={{ background: "#060606" }}>
      <style>{`
        @keyframes vxGlow { 0%,100%{opacity:.55;transform:scale(1)} 50%{opacity:.9;transform:scale(1.08)} }
        @keyframes vxFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .vx-shell{max-width:1180px;margin:0 auto;padding-left:20px;padding-right:20px}
        .vx-glass{background:linear-gradient(180deg,rgba(20,20,20,.86),rgba(10,10,10,.76));border:1px solid rgba(201,168,76,.18);box-shadow:0 24px 80px rgba(0,0,0,.48);backdrop-filter:blur(18px)}
        .vx-card{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09);transition:transform .22s ease,border-color .22s ease,background .22s ease}.vx-card:hover{transform:translateY(-4px);border-color:rgba(201,168,76,.34);background:rgba(255,255,255,.065)}
        .vx-gold{background:linear-gradient(135deg,#c9a84c,#f3d68b);-webkit-background-clip:text;background-clip:text;color:transparent}
        .vx-btn{background:linear-gradient(135deg,#c9a84c,#f3d68b);color:#050505;box-shadow:0 20px 55px rgba(201,168,76,.28)}
        .vx-btn:disabled{opacity:.55;cursor:not-allowed;filter:saturate(.4)}
      `}</style>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 18% 6%, rgba(201,168,76,.22), transparent 32%), radial-gradient(circle at 88% 18%, rgba(6,182,212,.13), transparent 30%), radial-gradient(circle at 50% 92%, rgba(239,68,68,.12), transparent 36%)" }} />
      <div className="absolute inset-0 pointer-events-none opacity-[.05]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.55) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

      <nav className="vx-shell relative z-10 flex items-center justify-between py-5 md:py-7">
        <a href="/vault-x?offer=body-cinema" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center kc-animate-pulse-gold" style={{ background: "linear-gradient(135deg,#c9a84c,#f3d68b)" }}><Flame className="w-5 h-5 text-black" /></div>
          <div>
            <VaultXLogo size="sm" />
            <div className="text-[10px] uppercase tracking-[.28em] font-black" style={{ color: "#c9a84c" }}>Body Cinema</div>
          </div>
        </a>
        <div className="flex items-center gap-2 md:gap-3">
          <a href="/login" className="hidden sm:inline-flex px-4 py-2.5 rounded-xl text-sm font-bold border border-white/10 text-white/70 hover:text-white hover:bg-white/5">Sign In</a>
          <button onClick={startVaultXOfferCheckout} disabled={vaultXOfferCheckout.isPending} className="vx-btn inline-flex items-center gap-2 px-4 md:px-6 py-3 rounded-2xl text-sm font-black">
            <CreditCard className="w-4 h-4" /> {vaultXOfferCheckout.isPending ? "Opening..." : `${priceLabel} Checkout`}
          </button>
        </div>
      </nav>

      <main className="relative z-10">
        {paidSessionId && (
          <section className="vx-shell pt-2">
            <div className="rounded-2xl p-4 border" style={{ background: "rgba(16,185,129,.11)", borderColor: "rgba(16,185,129,.28)", color: "#bbf7d0" }}>
              <strong>Payment return detected.</strong> Final access and challenge revenue credit depend on the Stripe webhook confirmation for session {paidSessionId.slice(0, 12)}...
            </div>
          </section>
        )}

        <section className="vx-shell pt-8 md:pt-14 pb-16 md:pb-24">
          <div className="grid lg:grid-cols-[1fr_.9fr] gap-10 lg:gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6" style={{ background: "rgba(201,168,76,.12)", border: "1px solid rgba(201,168,76,.28)", color: "#f3d68b" }}>
                <Shield className="w-4 h-4" /><span className="text-xs font-black uppercase tracking-[.18em]">Secure Stripe checkout · public-safe creator offer</span>
              </div>
              <h1 className="font-black leading-[.9] tracking-[-.055em] mb-6" style={{ fontSize: "clamp(3rem, 8vw, 7.2rem)" }}>
                Make the body look expensive before you sell it.
              </h1>
              <p className="text-lg md:text-2xl leading-8 md:leading-10 max-w-2xl mb-8" style={{ color: "#d8d8d3" }}>
                <strong>Body Cinema</strong> is the VaultX revenue kit for creators who have raw footage but need it cut into seductive, premium, platform-safe assets that are ready to post, message, tease, and monetize.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <button onClick={startVaultXOfferCheckout} disabled={vaultXOfferCheckout.isPending} className="vx-btn inline-flex justify-center items-center gap-2 rounded-2xl px-8 py-4 text-base font-black">
                  <Unlock className="w-5 h-5" /> {vaultXOfferCheckout.isPending ? "Opening secure checkout..." : `Unlock Body Cinema — ${priceLabel}`}
                </button>
                <a href="#body-cinema-kit" className="inline-flex justify-center items-center gap-2 rounded-2xl px-8 py-4 text-base font-bold border border-white/15 text-white hover:bg-white/5">See what you get <ChevronRight className="w-5 h-5" /></a>
              </div>
              <p className="text-sm leading-6 max-w-xl" style={{ color: "#888" }}>
                Revenue proof is limited to real Stripe Checkout events. Challenge ledger movement waits for the live payment webhook, so buyers and operators see payment-backed progress instead of manual claims.
              </p>
            </div>

            <div className="vx-glass rounded-[2rem] p-4 md:p-6 relative" style={{ animation: "vxFloat 5s ease-in-out infinite" }}>
              <div className="absolute -inset-6 rounded-full blur-3xl opacity-40" style={{ background: "radial-gradient(circle, rgba(201,168,76,.32), transparent 64%)", animation: "vxGlow 4s ease-in-out infinite" }} />
              <div className="relative rounded-[1.6rem] overflow-hidden border border-white/10" style={{ background: "linear-gradient(160deg,#171717,#050505)" }}>
                <div className="aspect-[4/5] p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="kc-badge kc-badge-gold">Body Cinema Kit</span>
                    <span className="text-xs font-black text-white/60">VaultX</span>
                  </div>
                  <div className="space-y-3">
                    <div className="h-40 rounded-[1.5rem] relative overflow-hidden" style={{ background: "radial-gradient(circle at 40% 20%, rgba(245,194,122,.28), transparent 28%), linear-gradient(145deg,#2a1812,#080808 70%)" }}>
                      <div className="absolute left-6 right-6 top-8 h-24 rounded-full blur-2xl" style={{ background: "rgba(201,168,76,.26)" }} />
                      <div className="absolute inset-x-8 bottom-6 h-2 rounded-full" style={{ background: "linear-gradient(90deg,transparent,#c9a84c,transparent)" }} />
                      <div className="absolute bottom-5 left-5 right-5 grid grid-cols-5 gap-2">
                        {[0,1,2,3,4].map((i) => <div key={i} className="h-16 rounded-xl" style={{ background: `rgba(255,255,255,${0.08 + i * 0.025})`, border: "1px solid rgba(255,255,255,.08)" }} />)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {proofTiles.map((tile) => (
                        <div key={tile.label} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}>
                          <div className="text-2xl font-black vx-gold">{tile.value}</div>
                          <div className="text-xs leading-4 text-white/55 mt-1">{tile.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={startVaultXOfferCheckout} disabled={vaultXOfferCheckout.isPending} className="vx-btn w-full rounded-2xl py-4 font-black flex items-center justify-center gap-2"><CreditCard className="w-5 h-5" /> Buy the kit now</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="body-cinema-kit" className="vx-shell pb-16 md:pb-24">
          <div className="max-w-3xl mb-10">
            <div className="text-sm font-black uppercase tracking-[.22em] mb-4" style={{ color: "#c9a84c" }}>What the buyer receives</div>
            <h2 className="text-4xl md:text-6xl font-black tracking-[-.04em] leading-none mb-5">A content-money kit, not another empty landing page.</h2>
            <p className="text-base md:text-lg leading-8" style={{ color: "#b8b8b8" }}>The offer is built for the moment a creator already has usable footage but does not have the angles, teaser sequence, premium polish, or revenue routing needed to turn that footage into a paid asset path.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliverables.map(({ icon: Icon, title, body }) => (
              <div key={title} className="vx-card rounded-[1.7rem] p-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(201,168,76,.14)", border: "1px solid rgba(201,168,76,.25)", color: "#f3d68b" }}><Icon className="w-6 h-6" /></div>
                <h3 className="text-2xl font-black mb-3">{title}</h3>
                <p className="text-sm leading-7" style={{ color: "#aaa" }}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="vx-shell pb-16 md:pb-24">
          <div className="vx-glass rounded-[2rem] p-6 md:p-10 grid lg:grid-cols-[.8fr_1.2fr] gap-8 items-start">
            <div>
              <div className="text-sm font-black uppercase tracking-[.22em] mb-4" style={{ color: "#c9a84c" }}>Money path</div>
              <h2 className="text-4xl md:text-5xl font-black tracking-[-.04em] leading-none mb-5">Raw footage becomes a buyer sequence.</h2>
              <p className="text-base leading-8 mb-7" style={{ color: "#b8b8b8" }}>Body Cinema is positioned around practical creator revenue mechanics: make the first frame stronger, cut the asset into monetizable versions, and give every version a job in the funnel.</p>
              <button onClick={startVaultXOfferCheckout} disabled={vaultXOfferCheckout.isPending} className="vx-btn inline-flex items-center gap-2 rounded-2xl px-7 py-4 font-black"><Crown className="w-5 h-5" /> Get Body Cinema</button>
            </div>
            <div className="grid gap-3">
              {moneyFlow.map((item, index) => (
                <div key={item.step} className="rounded-3xl p-5 flex gap-4" style={{ background: "rgba(0,0,0,.32)", border: "1px solid rgba(255,255,255,.08)" }}>
                  <div className="w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center font-black" style={{ background: "rgba(201,168,76,.16)", color: "#f3d68b" }}>{index + 1}</div>
                  <div>
                    <h3 className="text-xl font-black mb-1">{item.step}</h3>
                    <p className="text-sm leading-7" style={{ color: "#aaa" }}>{item.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="vx-shell pb-16 md:pb-24">
          <div className="grid lg:grid-cols-3 gap-4">
            {faqs.map((item) => (
              <div key={item.q} className="vx-card rounded-[1.7rem] p-6">
                <h3 className="text-xl font-black mb-3">{item.q}</h3>
                <p className="text-sm leading-7" style={{ color: "#aaa" }}>{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-5 pb-20 md:pb-28">
          <div className="max-w-5xl mx-auto text-center rounded-[2rem] p-7 md:p-12" style={{ background: "linear-gradient(135deg,rgba(201,168,76,.22),rgba(6,182,212,.10),rgba(239,68,68,.10))", border: "1px solid rgba(201,168,76,.25)" }}>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6" style={{ background: "rgba(0,0,0,.28)", border: "1px solid rgba(255,255,255,.12)" }}><Lock className="w-4 h-4" /><span className="text-xs font-black uppercase tracking-[.16em]">Secure payment. Webhook-proved credit.</span></div>
            <h2 className="text-4xl md:text-6xl font-black tracking-[-.045em] leading-none mb-6">If the clip already has attention, Body Cinema gives it a money route.</h2>
            <p className="text-base md:text-lg leading-8 max-w-3xl mx-auto mb-8" style={{ color: "#f5f0e8" }}>Buy the kit, complete Stripe Checkout, and return to CreatorVault for the access path. This is the buyer page that should be used for VaultX Body Cinema outreach.</p>
            <button onClick={startVaultXOfferCheckout} disabled={vaultXOfferCheckout.isPending} className="vx-btn inline-flex items-center justify-center gap-2 rounded-2xl px-9 py-4 font-black"><CreditCard className="w-5 h-5" /> {vaultXOfferCheckout.isPending ? "Opening secure checkout..." : `Unlock Body Cinema — ${priceLabel}`}</button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function VaultX() {
  const { user } = useAuth();
  const [verified, setVerified] = useState(false);
  const [activeTab, setActiveTab] = useState<"discover" | "feed" | "messages" | "profile" | "telegram" | "xcom" | "earnings">("discover");

  const { data: realmData, isLoading } = trpc.vaultx.getRealmStatus.useQuery(undefined, {
    retry: false,
    enabled: !!user,
  });

  const isVerified = verified || (realmData as any)?.adultVerified;

  if (!user) {
    return <VaultXPublicLanding />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-gray-500 text-sm">Loading VaultX...</div>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return <AgeGate onVerified={() => setVerified(true)} />;
  }

  const tabs = [
    { id: "discover", label: "Discover", icon: Flame },
    { id: "feed", label: "Feed", icon: Layers },
    { id: "messages", label: "Messages", icon: Inbox },
    { id: "profile", label: "My Profile", icon: Settings },
    { id: "telegram", label: "Telegram", icon: Send },
    { id: "xcom", label: "X.com", icon: Twitter },
    { id: "earnings", label: "Earnings", icon: DollarSign },
  ] as const;

    const workflowSteps = [
    { label: "Create the asset", detail: "Upload raw footage or open the editor for Body Cinema processing.", done: activeTab !== "discover" },
    { label: "Package the drop", detail: "Use Studio to create master, teaser, PPV bundle, captions, sound, and platform exports.", done: ["feed", "messages", "earnings"].includes(activeTab) },
    { label: "Launch to fans", detail: "Publish to VaultX, Telegram, X.com, and fan platforms with direct monetization paths.", done: ["telegram", "xcom", "earnings"].includes(activeTab) },
    { label: "Collect revenue", detail: "Track subscriptions, PPV, tips, and creator earnings from real transactions.", done: activeTab === "earnings" },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-28 right-0 h-72 w-72 rounded-full bg-red-600/20 blur-3xl" />
        <div className="absolute top-1/2 -left-24 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
      </div>
      <div className="sticky top-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <a href="/vault-x" className="flex items-center gap-2"><VaultXLogo size="sm" /><span className="rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-black text-red-300">18+ VERIFIED</span></a>
            <div className="hidden items-center gap-2 sm:flex">
              <a href="/vault-x/editor" className="rounded-xl bg-red-500 px-4 py-2 text-xs font-black text-white hover:bg-red-600">Upload & Process</a>
              <a href="/vault-x/studio" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-white hover:border-red-400/50">Open Studio</a>
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black transition-colors ${
                  activeTab === id ? "bg-red-500 text-white shadow-lg shadow-red-950/30" : "bg-white/[.045] text-zinc-400 hover:bg-white/[.08] hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/[.035] p-5 shadow-2xl shadow-black/40 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[.28em] text-red-300">Creator command center</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-.06em] sm:text-5xl">Build the clip, package the drop, launch the money route.</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">VaultX now opens with the actual operating path: create or process content, package it into sellable video assets, distribute it, and track revenue. Every primary action points to a live production workflow.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <a href="/vault-x/editor" className="rounded-3xl bg-red-500 p-4 text-sm font-black text-white shadow-2xl shadow-red-950/30 hover:bg-red-600"><Video className="mb-4 h-5 w-5" />Upload & Process</a>
              <a href="/vault-x/studio" className="rounded-3xl border border-white/10 bg-white/10 p-4 text-sm font-black text-white hover:border-red-400/50"><Clapperboard className="mb-4 h-5 w-5" />Launch Studio</a>
              <a href="/vaultx/distribution" className="rounded-3xl border border-white/10 bg-white/10 p-4 text-sm font-black text-white hover:border-red-400/50"><Globe className="mb-4 h-5 w-5" />Distribute</a>
              <button onClick={() => setActiveTab("earnings")} className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-left text-sm font-black text-emerald-100 hover:border-emerald-300/50"><DollarSign className="mb-4 h-5 w-5" />View Earnings</button>
            </div>
          </div>
          <div className="mt-6"><VaultXWorkflow steps={workflowSteps} activeStep={activeTab === "discover" ? 0 : activeTab === "profile" ? 1 : activeTab === "telegram" || activeTab === "xcom" ? 2 : activeTab === "earnings" ? 3 : 1} /></div>
        </section>

        {activeTab === "discover" && (
          <section className="mb-6 grid gap-3 md:grid-cols-4">
            <VaultXActionCard href="/vault-x/editor" title="Process a new video" body="Start with a raw asset and generate Body Cinema outputs, AI analysis, export packages, and publish-ready assets." icon={<Video className="h-5 w-5" />} cta="Open Editor" />
            <VaultXActionCard href="/vault-x/studio" title="Build a revenue bundle" body="Package master files, teasers, captions, sound, platform exports, PPV logic, and distribution assets." icon={<Package className="h-5 w-5" />} cta="Open Studio" />
            <VaultXActionCard href="/vaultx/distribution" title="Push the launch" body="Move finished content into distribution paths for VaultX, Telegram, X.com, and external fan platforms." icon={<Globe className="h-5 w-5" />} cta="Open Distribution" />
            <VaultXActionCard href="/god-mode" title="Command God Mode" body="Use the AI command layer to turn a creator goal into concrete revenue actions and measurable proof." icon={<Sparkles className="h-5 w-5" />} cta="Open God Mode" />
          </section>
        )}

        <section className="rounded-[2rem] border border-white/10 bg-black/35 p-4 shadow-2xl shadow-black/30 sm:p-6">
          {activeTab === "discover" && <DiscoverTab />}
          {activeTab === "feed" && <ContentFeedTab userId={user.id} />}
          {activeTab === "messages" && <MessagingTab userId={user.id} />}
          {activeTab === "profile" && <MyProfileTab userId={user.id} />}
          {activeTab === "telegram" && <TelegramTab userId={user.id} />}
          {activeTab === "xcom" && <XComTab userId={user.id} />}
          {activeTab === "earnings" && <EarningsTab userId={user.id} />}
        </section>
      </main>
    </div>
  );
}
