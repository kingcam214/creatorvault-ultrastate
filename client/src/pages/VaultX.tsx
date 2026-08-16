/**
 * ============================================================================
 * VAULTX — THE UNCENSORED SOCIAL ECONOMY
 * ============================================================================
 * First non-censoring platform and social economy for adult creators.
 * Tabs: Discover | My Profile | Monetize | Telegram | X.com | Earnings
 * ============================================================================
 */
import { useState, useEffect, useRef, type CSSProperties } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { HOMEPAGE_MEDIA } from "@/lib/homepageMediaRegistry";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
function MediaFallback({
  videoSrc,
  posterSrc,
  alt,
  className = "",
  style = {},
  objectFit = "cover"
}: {
  videoSrc: string;
  posterSrc?: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  objectFit?: "cover" | "contain";
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-black ${className}`} style={style} aria-label={alt}>
      {posterSrc ? <img
        src={posterSrc}
        alt={alt}
        className={`absolute inset-0 h-full w-full object-${objectFit} transition-opacity duration-700 ${loaded && !error ? "opacity-0" : "opacity-100"}`}
      /> : null}
      {!error && (
        <video
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onCanPlay={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`absolute inset-0 h-full w-full object-${objectFit} transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
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
import { useVaultXLang, VaultXLangSwitcher } from "@/lib/vaultxI18n";

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
  const createPpvCheckout = trpc.vaultx.createPpvCheckout.useMutation();

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
    const openingMotion = HOMEPAGE_MEDIA.homepageMotionPilot;
    return (
      <div className="relative h-full min-h-[620px] overflow-hidden bg-black">
        <MediaFallback
          videoSrc={openingMotion.livePath}
          posterSrc={openingMotion.fallbackAsset}
          alt="Certified CreatorVault female-creator campaign motion"
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
        <div className="relative z-10 flex h-full min-h-[620px] max-w-lg flex-col justify-end px-7 pb-12 pt-20 text-left sm:px-10">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/80 backdrop-blur-md">
            <Play className="h-3.5 w-3.5 text-[#f3d899]" /> CreatorVault visual experience
          </div>
          <h3 className="max-w-md text-4xl font-black leading-[0.95] tracking-[-0.045em] text-white sm:text-5xl">VaultX opens with real creator releases.</h3>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/75 sm:text-base">We do not fill your feed with unjoined women, fake fan counts, or placeholder drops. A public release appears here only after its creator is active, has approved visibility, and has a real playable video ready.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup?vertical=vaultx"><a className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#f3d899] px-6 text-sm font-black text-[#19130c] transition hover:bg-white">Open your creator account <ArrowUpRight className="ml-2 h-4 w-4" /></a></Link>
            <Link href="/"><a className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/25 bg-black/30 px-6 text-sm font-black text-white backdrop-blur-md transition hover:border-white">Explore CreatorVault</a></Link>
          </div>
        </div>
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
              const result = await createPpvCheckout.mutateAsync({ contentId: item.id });
              if (result.alreadyPurchased) {
                toast.success("You already own this PPV unlock.");
              } else if (result.checkoutUrl) {
                window.location.href = result.checkoutUrl;
              } else {
                toast.error("Stripe checkout did not return a redirect URL.");
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

  const createPpvCheckout = trpc.vaultx.createPpvCheckout.useMutation();

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
                              const result = await createPpvCheckout.mutateAsync({ contentId: item.id });
                              if (result.alreadyPurchased) {
                                toast.success("You already own this PPV unlock.");
                              } else if (result.checkoutUrl) {
                                window.location.href = result.checkoutUrl;
                              } else {
                                toast.error("Stripe checkout did not return a redirect URL.");
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
            <div className="text-sm mt-1">Messages open here when the path to reach someone is real and ready.</div>
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
// MONEY PATH — HELD UNTIL PAYMENT, ACCESS, DELIVERY, AND PAYOUT ARE PROVEN
// ============================================================================
function MoneyPathHeld({ label, onClose }: { label: string; onClose?: () => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-5 text-center">
      <p className="text-sm font-black text-white">${label}</p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">CreatorVault will not collect payment or tell anyone access is ready until the complete fan-to-creator money path is proven.</p>
      {onClose ? <button onClick={onClose} className="mt-4 rounded-xl border border-white/15 px-4 py-2 text-sm font-black text-white">Close</button> : null}
    </div>
  );
}

function StripePaymentForm(_: { clientSecret: string; intentId: string; amountCents: number; label: string; onSuccess: () => void; onError: (msg: string) => void }) {
  return <MoneyPathHeld label="Card payment is not open yet." />;
}

function StripePaymentModal({ onClose }: { clientSecret: string; intentId: string; amountCents: number; label: string; onSuccess: () => void; onClose: () => void }) {
  return <MoneyPathHeld label="Card payment is not open yet." onClose={onClose} />;
}

function TipModal({ onClose }: { creator: any; onClose: () => void }) {
  return <MoneyPathHeld label="Tips are not open yet." onClose={onClose} />;
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
            Browse real VaultX storefronts with creator profiles, payment-ready offers, messaging paths, and clear next steps for buying or subscribing.
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
              { title: "1. Open a real profile", body: filtered.length > 0 ? "Tap any live storefront to review subscription price, PPV, tips, custom requests, and creator credibility." : "No storefront matches this filter yet; complete onboarding before selling." },
              { title: "2. Choose the money path", body: paymentReadyCreators.length > 0 ? "Subscribe, buy PPV, tip, or request custom work only where the creator has enabled that lane." : "Payment lanes are not ready until a creator sets pricing or enables paid features." },
              { title: "3. Verify before scaling", body: "Use secure checkout and confirmed creator offers instead of vague claims or vanity counters." },
            ].map((step) => (
              <div key={step.title} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs font-black uppercase tracking-[.16em] text-red-300 mb-2">{step.title}</div>
                <div className="text-xs leading-5 text-gray-400">{step.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-pink-500/20 bg-black/50 p-5 sm:p-6" style={{ boxShadow: "0 0 70px rgba(236,72,153,0.10) inset" }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(236,72,153,0.22),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(34,211,238,0.14),transparent_28%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-pink-200">
              <Clapperboard className="h-3.5 w-3.5" /> Soft-launch use case · BCB Body Cinema
            </div>
            <h2 className="text-2xl font-black leading-tight text-white sm:text-3xl">
              Watch VaultX turn a real fitness-body creator profile into teaser, unlock, Telegram route, and VIP package logic.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              BCB is wired as the first Body Cinema proof lane: public social heat, subscriber master, PPV unlock, and private-route upsell all pointing back into the CreatorVault OS.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="/profile/officiallybcb" className="inline-flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-pink-400">
              Open profile <ArrowUpRight className="h-4 w-4" />
            </a>
            <a href="/mi-panel/bcb-panel" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-white/10">
              Launch room <Crown className="h-4 w-4 text-amber-300" />
            </a>
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
  const [showTip, setShowTip] = useState(false);
  const { data: contentData } = trpc.vaultx.getCreatorContent.useQuery(
    { creatorId: creator.creator_id, limit: 12, offset: 0 },
    { retry: false, enabled: !!creator.creator_id }
  );
  return (
    <div className="space-y-4">
      {showTip && <TipModal creator={creator} onClose={() => setShowTip(false)} />}
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
              <div className="text-amber-200 font-bold">—</div>
              <div className="text-gray-500 text-xs">Memberships held</div>
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
            <p className="text-sm font-black text-amber-100">Membership access is not open for sale yet.</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">This profile will only offer membership access after payment, access, and the creator’s money record are connected for real.</p>
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
      ) : (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 text-center">
          <Lock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <div className="text-white font-bold mb-1">Nothing is posted here yet.</div>
          <div className="text-gray-500 text-sm">When this creator shares a finished piece, it will show up here.</div>
        </div>
      )}

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
    categories: [] as string[],
  });
  const [saved, setSaved] = useState(false);

  const { data: profileData } = trpc.vaultx.getEditableCreatorProfile.useQuery(undefined, { retry: false });

  useEffect(() => {
    if (profileData && (profileData as any).profile) {
      const p = (profileData as any).profile;
      setForm({
        displayName: p.display_name || "",
        bio: p.bio || "",
        contentStyle: p.content_style || "",
        categories: Array.isArray(p.categories) ? p.categories : (() => {
          try { return p.categories ? JSON.parse(p.categories) : []; } catch { return []; }
        })(),
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
      // Membership and cash controls stay off until checkout and access are proven together.
      subscriptionPrice: 0,
      ppvEnabled: false,
      tipsEnabled: false,
      customRequestsEnabled: false,
      dmPaywallEnabled: false,
      categories: form.categories,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-black text-xl">Your VaultX identity</h2>
        <button
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className="bg-red-500 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {saved ? "✓ Saved" : updateProfile.isPending ? "Saving..." : "Save My Identity"}
        </button>
      </div>

      {/* Display Name */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="text-white font-bold text-sm flex items-center gap-2">
          <Camera className="w-4 h-4 text-red-400" /> Identity
        </div>
        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Your name</label>
          <input
            value={form.displayName}
            onChange={(e) => setForm(f => ({ ...f, displayName: e.target.value }))}
            placeholder="The name people see on VaultX"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500"
          />
        </div>
        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">In your words</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))}
            placeholder="Tell people what they should feel when they land here..."
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 resize-none"
          />
        </div>
        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Your vibe</label>
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

      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <p className="text-sm font-black text-white">Selling access comes later.</p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">Individual paid drops remain tied to a finished moment. Recurring memberships, tips, custom requests, direct-message charges, and cash-out settings will appear here only when CreatorVault can prove the full path from what a fan pays to what they receive and what belongs to you.</p>
      </div>
    </div>
  );
}
// ============================================================================
// TELEGRAM TAB
// ============================================================================
function TelegramTab({ userId: _userId }: { userId: number }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-white">Messages need a real delivery lane.</h2>
        <p className="mt-1 text-sm text-zinc-400">This room will not pretend a channel is connected, sell recurring access, send an invite, or tell you a fan was added automatically when that path is not proven end to end.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,.14),transparent_52%),#101015] p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">What stays protected</p>
        <p className="mt-3 text-lg font-black text-white">Your channel and your people stay in your hands.</p>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-300">CreatorVault will open this room only after it can prove the whole path: the right channel, a real payment, the access someone receives, and a message you can actually see delivered. Until then, no channel connection or paid-message action runs here.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <p className="text-sm font-black text-white">Your next move is still live.</p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">Keep your source, treatment, and next paid-drop direction together in Body Cinema. That work stays connected to real media you own.</p>
        <a href="/vaultx/drop" className="mt-4 inline-flex items-center rounded-xl bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-zinc-200">Open Body Cinema →</a>
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
            { pct: "20%", type: "Social proof", desc: "Subscriber counts, testimonials, results", color: "bg-amber-500" },
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
function EarningsTab({ userId: _userId }: { userId: number }) {
  const { data: revenueData, isLoading } = trpc.vaultx.getRevenueAnalytics.useQuery(undefined, { retry: false });
  const totals = (revenueData as any)?.totals ?? {};
  const paidDropRecord = Number(totals.total_ppv ?? 0) || 0;
  const paidMessageRecord = Number(totals.total_messages ?? 0) || 0;
  const realPaidRecord = paidDropRecord + paidMessageRecord;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-white">Money that has a real record.</h2>
        <p className="mt-1 text-sm text-zinc-400">This room shows completed paid-drop and paid-message records only. It does not guess at future money or offer cash-out controls that are not connected yet.</p>
      </div>

      <div className="rounded-2xl border border-amber-200/20 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,.14),transparent_48%),#101015] p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-100">Completed paid records</p>
        <p className="mt-3 text-5xl font-black tracking-[-0.06em] text-white">{isLoading ? "—" : `$${realPaidRecord.toFixed(2)}`}</p>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-300">{realPaidRecord > 0 ? "This number comes from completed paid records already tied to your VaultX history." : "No completed paid-drop or paid-message record is connected to this account yet. Start with a real moment and keep the sale path honest."}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Paid drops</p>
          <p className="mt-2 text-2xl font-black text-white">{isLoading ? "—" : `$${paidDropRecord.toFixed(2)}`}</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">Completed PPV records only.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Paid messages</p>
          <p className="mt-2 text-2xl font-black text-white">{isLoading ? "—" : `$${paidMessageRecord.toFixed(2)}`}</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">Completed unlock records only.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <p className="text-sm font-black text-white">What comes next</p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">Cash-out options and recurring membership money will appear here only after CreatorVault can prove the full path from what a fan pays to what they receive and what belongs to you. Until then, this page stays read-only and real.</p>
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
  const startVaultXOnboarding = () => {
    window.location.href = "/signup?vertical=vaultx";
  };

  const featureCards = [
    {
      title: "Private paid moments",
      body: "Set the access. Fans unlock when they choose. A real sale shows up after it happens.",
    },
    {
      title: "Private membership",
      body: "Membership access opens only when payment, access, and your money record can stay tied together for real.",
    },
    {
      title: "Private messages",
      body: "Your time has value. Decide how close people can get to you.",
    },
    {
      title: "Your channel-ready versions",
      body: "Prepare versions for the places you actually use. Nothing goes out until you decide.",
    },
  ];

  return (
    <div className="min-h-screen text-white overflow-hidden relative" style={{ background: "#060606" }}>
      <style>{`
        .vx-shell{max-width:1180px;margin:0 auto;padding-left:20px;padding-right:20px}
        .vx-card{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09);transition:transform .22s ease,border-color .22s ease,background .22s ease}.vx-card:hover{transform:translateY(-4px);border-color:rgba(201,168,76,.34);background:rgba(255,255,255,.065)}
        .vx-gold{background:linear-gradient(135deg,#c9a84c,#f3d68b);-webkit-background-clip:text;background-clip:text;color:transparent}
        .vx-btn{background:linear-gradient(135deg,#c9a84c,#f3d68b);color:#050505;box-shadow:0 20px 55px rgba(201,168,76,.28)}
        .vx-btn:disabled{opacity:.55;cursor:not-allowed;filter:saturate(.4)}
      `}</style>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 18% 6%, rgba(201,168,76,.22), transparent 32%), radial-gradient(circle at 88% 18%, rgba(6,182,212,.13), transparent 30%), radial-gradient(circle at 50% 92%, rgba(239,68,68,.12), transparent 36%)" }} />
      <div className="absolute inset-0 pointer-events-none opacity-[.05]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.55) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

      <nav className="vx-shell relative z-10 flex items-center justify-between py-5 md:py-7">
        <a href="/" className="text-2xl font-black tracking-[-.04em] vx-gold">CreatorVault <span className="text-white/45">/</span> VaultX</a>
        <div className="flex items-center gap-2 md:gap-4">
          <a href="/login" className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/10 text-white/70 hover:text-white hover:bg-white/5">Sign In</a>
          <button onClick={startVaultXOnboarding} className="vx-btn px-4 md:px-6 py-3 rounded-2xl text-sm font-black">Get Started</button>
        </div>
      </nav>

      <main className="relative z-10">
        <section
          aria-label="VaultX cinematic creator monetization hero"
          style={{
            position: "relative",
            width: "100vw",
            height: "100vh",
            minHeight: "700px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "0 0 60px 0",
            marginLeft: "calc(50% - 50vw)",
            marginRight: "calc(50% - 50vw)",
          }}
        >
          {/* BACKGROUND VIDEO — fullscreen behind everything */}
          <video
            src={HOMEPAGE_MEDIA.vaultxRevenueVisual.livePath}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
              zIndex: 0,
            }}
          />

          {/* GRADIENT OVERLAY — darkens bottom so text is readable */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(
                to bottom,
                rgba(0,0,0,0.05) 0%,
                rgba(0,0,0,0.1) 30%,
                rgba(0,0,0,0.6) 60%,
                rgba(10,10,10,0.95) 100%
              )`,
              zIndex: 1,
            }}
          />

          {/* CONTENT — sits above video */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              padding: "0 24px",
            }}
          >
            <h1
              style={{
                fontFamily: "Bebas Neue, sans-serif",
                fontSize: "clamp(48px, 12vw, 80px)",
                lineHeight: 0.95,
                color: "#FFFFFF",
                margin: "0 0 16px 0",
              }}
            >
              YOUR BODY.<br />
              YOUR CONTENT.<br />
              YOUR MONEY.
            </h1>

            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: "16px",
                color: "rgba(255,255,255,0.75)",
                maxWidth: "340px",
                lineHeight: 1.5,
                margin: "0 0 32px 0",
              }}
            >
              CreatorVault’s private-sales vertical for adult creators who want ownership, access, and stronger money paths in one private creation space.
            </p>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                onClick={startVaultXOnboarding}
                style={{
                  fontFamily: "Bebas Neue, sans-serif",
                  fontSize: "17px",
                  letterSpacing: "0.08em",
                  background: "#C9A84C",
                  color: "#0A0A0A",
                  border: "none",
                  padding: "14px 32px",
                  cursor: "pointer",
                }}
              >
                Explore VaultX
              </button>
              <a
                href="#body-cinema"
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: "15px",
                  background: "transparent",
                  color: "#FFFFFF",
                  border: "1px solid rgba(255,255,255,0.4)",
                  padding: "14px 24px",
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                See How It Works
              </a>
            </div>
          </div>
        </section>

        <section id="body-cinema" className="vx-shell pb-16 md:pb-24">
          <div className="grid gap-8 lg:grid-cols-[.92fr_1.08fr] lg:items-center">
            <div className="max-w-3xl">
              <div className="text-sm font-black uppercase tracking-[.22em] mb-4" style={{ color: "#c9a84c" }}>BODY CINEMA</div>
              <h2 className="text-4xl md:text-6xl font-black tracking-[-.04em] leading-none mb-6">
                Choose what you own.<br />
                Give it a feeling they remember.
              </h2>
              <p className="text-base md:text-lg leading-8 mb-8" style={{ color: "#b8b8b8" }}>
                Body Cinema starts with your own footage, your consent, and a clear feeling. You see the cost, the finished piece, and the quality call before a moment earns its place in a private release.
              </p>
              <div className="grid gap-3 mb-8 md:grid-cols-3" style={{ color: "#f5f0e8" }}>
                {[
                  ["Start clean", "Your footage, your consent, and a clear body direction come first."],
                  ["Shape the moment", "A reviewed moment can become a private offer with the access and price you choose."],
                  ["Know what happened", "A sale, a payment, and the unlock appear only after they really happen."],
                ].map(([title, body]) => (
                  <div key={title} className="rounded-[1.25rem] border border-white/10 bg-white/[.035] p-4">
                    <p className="text-sm font-black text-white">{title}</p>
                    <p className="mt-2 text-xs leading-5" style={{ color: "#aaa" }}>{body}</p>
                  </div>
                ))}
              </div>
              <a href="/vault-x/studio" className="vx-btn inline-flex items-center rounded-2xl px-7 py-4 font-black">Open Body Cinema Studio</a>
            </div>
            <figure className="relative min-h-[620px] overflow-hidden rounded-[2rem] border border-[#c9a84c]/25 bg-black shadow-2xl shadow-black/50" aria-label="Body Cinema silhouette direction reference">
              <MediaFallback videoSrc="/assets/preview-silhouette.mp4" posterSrc="/images/platform/body-cinema-hero.webp" alt="Body Cinema silhouette direction reference" className="absolute inset-0 h-full w-full opacity-90" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.22)_36%,rgba(0,0,0,.94))]" />
              <div className="absolute inset-x-4 top-4 flex flex-wrap items-center gap-2"><span className="rounded-full border border-white/20 bg-black/55 px-3 py-2 text-[10px] font-black uppercase tracking-[.18em] text-white backdrop-blur">Silhouette style reference</span><span className="rounded-full border border-[#c9a84c]/40 bg-[#c9a84c]/15 px-3 py-2 text-[10px] font-black uppercase tracking-[.18em] text-[#f5df98] backdrop-blur">Library motion</span></div>
              <figcaption className="absolute inset-x-4 bottom-4 space-y-3">
                <div className="rounded-[1.35rem] border border-white/10 bg-black/70 p-4 backdrop-blur-xl"><p className="text-lg font-black text-white">See the direction before you choose it.</p><p className="mt-2 text-xs leading-5 text-zinc-300">This looping library piece demonstrates the Silhouette editorial language. It is not presented as a result from a creator’s current video.</p></div>
                {[
                  { step: "01", title: "Your saved video", detail: "Choose a video already inside CreatorVault. Consent and readiness come first." },
                  { step: "02", title: "Direction you can feel", detail: "The treatment, the offer, and the cost stay together so you stay in control." },
                  { step: "03", title: "A result earns its place", detail: "A finished piece appears for sale only after it clears its quality decision." },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 rounded-[1.35rem] border border-white/10 bg-black/70 p-3 backdrop-blur-xl">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-[#c9a84c] text-sm font-black text-black">{item.step}</div>
                    <div><p className="text-sm font-black text-white">{item.title}</p><p className="mt-1 text-xs leading-5 text-zinc-300">{item.detail}</p></div>
                  </div>
                ))}
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="vx-shell pb-16 md:pb-24">
          <div className="rounded-[2rem] p-7 md:p-12" style={{ background: "linear-gradient(180deg,rgba(20,20,20,.86),rgba(10,10,10,.76))", border: "1px solid rgba(201,168,76,.18)", boxShadow: "0 24px 80px rgba(0,0,0,.48)" }}>
            <h2 className="text-4xl md:text-6xl font-black tracking-[-.04em] leading-none mb-6">
              Your money story stays real.<br />
              Always yours to see.
            </h2>
            <p className="text-base md:text-lg leading-8 max-w-3xl mb-8" style={{ color: "#b8b8b8" }}>
              VaultX keeps what you offered, what fans paid, what you received, and where it came from together instead of making you chase the story behind your money.
            </p>
            <p className="text-base md:text-lg leading-8 max-w-3xl mb-8" style={{ color: "#b8b8b8" }}>
              Money shows up only after a real payment has cleared. CreatorVault never dresses up a guess as money you earned.
            </p>
            <button onClick={startVaultXOnboarding} className="vx-btn inline-flex items-center rounded-2xl px-7 py-4 font-black">Create Your Free Profile</button>
          </div>
        </section>

        <section className="vx-shell pb-16 md:pb-24">
          <div className="max-w-3xl mb-10">
            <h2 className="text-4xl md:text-6xl font-black tracking-[-.04em] leading-none mb-5">Everything you need. Nothing you don't.</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {featureCards.map((item) => (
              <div key={item.title} className="vx-card rounded-[1.7rem] p-6">
                <h3 className="text-2xl font-black mb-3">{item.title}</h3>
                <p className="text-sm leading-7" style={{ color: "#aaa" }}>{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="vx-shell pb-16 md:pb-24">
          <div className="max-w-3xl">
            <h2 className="text-4xl md:text-6xl font-black tracking-[-.04em] leading-none mb-6">Your work. Your choices. What really happened.</h2>
            <p className="text-base md:text-lg leading-8 mb-8" style={{ color: "#b8b8b8" }}>
              VaultX gives adult creators a focused CreatorVault place for private offers, fan access, and moments prepared from real creator-owned media. No money story is told before it is real.
            </p>
            <button onClick={startVaultXOnboarding} className="vx-btn inline-flex items-center rounded-2xl px-7 py-4 font-black">Request Your Invite</button>
          </div>
        </section>

        <section className="px-5 pb-20 md:pb-28">
          <div className="max-w-5xl mx-auto text-center rounded-[2rem] p-7 md:p-12" style={{ background: "linear-gradient(135deg,rgba(201,168,76,.22),rgba(6,182,212,.10),rgba(239,68,68,.10))", border: "1px solid rgba(201,168,76,.25)" }}>
            <h2 className="text-4xl md:text-6xl font-black tracking-[-.045em] leading-none mb-6">Own the creator relationship.</h2>
            <p className="text-base md:text-lg leading-8 max-w-3xl mx-auto mb-8" style={{ color: "#f5f0e8" }}>Enter CreatorVault, then open VaultX when your business needs private access, premium offers, and a stronger way to take care of your people.</p>
            <button onClick={startVaultXOnboarding} className="vx-btn inline-flex items-center justify-center rounded-2xl px-9 py-4 font-black">Get Started Free</button>
          </div>
        </section>
      </main>

      <footer className="vx-shell relative z-10 pb-8 flex flex-col md:flex-row gap-4 md:items-center md:justify-between text-sm" style={{ color: "#8f8f8f" }}>
        <p>© 2026 CreatorVault. All rights reserved.</p>
        <div className="flex gap-5">
          <a href="/privacy" className="hover:text-white">Privacy Policy</a>
          <a href="/terms" className="hover:text-white">Terms of Service</a>
          <a href="/contact" className="hover:text-white">Contact</a>
        </div>
      </footer>
    </div>
  );
}


export default function VaultX() {
  const { user } = useAuth();
  const [verified, setVerified] = useState(false);
  const [realmTimedOut, setRealmTimedOut] = useState(false);
  const [activeTab, setActiveTab] = useState<"discover" | "feed" | "messages" | "profile" | "telegram" | "xcom" | "earnings">("discover");

  const { data: realmData, isLoading } = trpc.vaultx.getRealmStatus.useQuery(undefined, {
    retry: false,
    enabled: !!user,
  });

  const confirmPpvCheckout = trpc.vaultx.confirmPpvCheckout.useMutation();

  useEffect(() => {
    if (!user || !isLoading) {
      setRealmTimedOut(false);
      return;
    }
    const timeout = window.setTimeout(() => setRealmTimedOut(true), 9_000);
    return () => window.clearTimeout(timeout);
  }, [user, isLoading]);

  useEffect(() => {
    if (!user || confirmPpvCheckout.isPending) return;
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    const sessionId = params.get("session_id");
    const contentId = Number(params.get("content") || 0);
    if (checkoutStatus === "cancelled") {
      toast.info("VaultX checkout was cancelled. No PPV access was granted.");
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    if (checkoutStatus !== "success" || !sessionId || !contentId) return;
    const idempotencyKey = `vaultx_ppv_confirmed_${sessionId}`;
    if (sessionStorage.getItem(idempotencyKey)) return;
    sessionStorage.setItem(idempotencyKey, "1");
    confirmPpvCheckout.mutate(
      { contentId, checkoutSessionId: sessionId },
      {
        onSuccess: (result) => {
          toast.success(result.alreadyPurchased ? "VaultX PPV already unlocked." : "VaultX PPV unlocked. Access and creator earnings were recorded.");
          if (result.purchaseId) {
            window.history.replaceState({}, "", `/vaultx?purchaseId=${result.purchaseId}`);
          } else {
            window.history.replaceState({}, "", window.location.pathname);
          }
        },
        onError: (error) => {
          sessionStorage.removeItem(idempotencyKey);
          toast.error(error.message || "VaultX could not confirm this checkout.");
        },
      }
    );
  }, [user, confirmPpvCheckout]);

  const isVerified = verified || (realmData as any)?.adultVerified;

  if (!user) {
    return <VaultXPublicLanding />;
  }

  if (isLoading && !realmTimedOut) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-gray-500 text-sm">Opening VaultX...</div>
        </div>
      </div>
    );
  }

  if (isLoading && realmTimedOut) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-black text-white">
        <video src={HOMEPAGE_MEDIA.homepageMotionPilot.livePath} autoPlay loop muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover opacity-35" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/80 to-black" />
        <section className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col justify-end px-6 pb-14 pt-28">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">VaultX private access</p>
          <h1 className="max-w-lg text-5xl font-black leading-[0.9] tracking-[-0.06em] sm:text-6xl">Your private room is still opening.</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-zinc-300">Your access check is taking longer than it should. Your work is still yours, and nothing is being posted or sold. You can keep moving from the footage already in your Vault.</p>
          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            <Link href="/king/media-vault" className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-black transition hover:bg-amber-100">See your Vault</Link>
            <Link href="/vault-x/studio" className="rounded-2xl border border-white/30 bg-black/40 px-5 py-4 text-center text-sm font-black text-white backdrop-blur transition hover:border-white">Open Body Cinema</Link>
          </div>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 self-start text-sm font-bold text-amber-100 underline underline-offset-4">Try VaultX again</button>
        </section>
      </main>
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
    { label: "Approve the source", detail: "Start with creator-owned media, consent, adult gating, and a clean Body Cinema intake.", done: activeTab !== "discover" },
    { label: "Package the drop", detail: "Use Studio to create teaser, paid unlock, VIP ladder, provider generation, checkout, and receipts.", done: ["feed", "messages", "earnings"].includes(activeTab) },
    { label: "Launch the route", detail: "Push finished content into VaultX, Telegram, X.com, and fan-platform paths with tracked monetization.", done: ["telegram", "xcom", "earnings"].includes(activeTab) },
    { label: "Prove revenue", detail: "Track purchases, routes, receipts, and creator earnings from real backend records.", done: activeTab === "earnings" },
  ];

  // Creator-first home screen — no developer panels, no GAP badges, no config walls
  const { t } = useVaultXLang();

  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* Clean sticky header */}
      <div className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
          <a href="/vault-x" className="text-xl font-black tracking-tight" style={{ background: "linear-gradient(135deg,#c9a84c,#f3d68b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>VaultX</a>
          <div className="flex items-center gap-2">
            <VaultXLangSwitcher />
            <button onClick={() => setActiveTab("earnings")} className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${ activeTab === "earnings" ? "bg-emerald-500/20 text-emerald-300" : "text-zinc-500 hover:text-white" }`}>{t("hub.earnings")}</button>
            <button onClick={() => setActiveTab("profile")} className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${ activeTab === "profile" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white" }`}>{t("hub.profile")}</button>
            <button onClick={() => setActiveTab("messages")} className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${ activeTab === "messages" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white" }`}>{t("hub.messages")}</button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 pb-32 pt-6">

        {/* ── HOME VIEW ─────────────────────────────────────────────────── */}
        {activeTab === "discover" && (
          <div>
            <section aria-label="VaultX private creator opening" className="relative -mx-4 -mt-6 mb-8 min-h-[580px] overflow-hidden bg-black sm:rounded-[2rem]">
              <video
                src={HOMEPAGE_MEDIA.homepageMotionPilot.livePath}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className="absolute inset-0 h-full w-full object-cover object-center"
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_24%,rgba(137,24,72,.28),transparent_35%),linear-gradient(90deg,rgba(5,5,5,.93)_0%,rgba(5,5,5,.58)_56%,rgba(5,5,5,.12)_100%),linear-gradient(0deg,rgba(5,5,5,.94)_0%,rgba(5,5,5,.04)_60%,rgba(5,5,5,.36)_100%)]" />
              <div className="pointer-events-none absolute inset-x-6 top-[25%] h-px bg-gradient-to-r from-transparent via-[#f3d68b]/70 to-transparent" />
              <div className="relative z-10 flex min-h-[580px] flex-col justify-end px-6 pb-7 pt-20 sm:px-10 sm:pb-10">
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.24em] text-amber-200">VaultX · private access</p>
                <h1 className="max-w-md text-5xl font-black leading-[0.84] tracking-[-0.075em] text-white sm:text-6xl">Make them want<br />the <span className="text-[#f3d68b]">next drop.</span></h1>
                <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/80">Your owned footage. Your offer. Your rules. Build something worth putting behind the door.</p>
                <a
                  href="/vault-x/studio"
                  className="mt-8 flex w-full max-w-md items-center justify-between rounded-2xl px-5 py-4 transition hover:brightness-110"
                  style={{ background: "linear-gradient(135deg,#c9a84c,#f3d68b)", color: "#050505" }}
                >
                  <div>
                    <p className="text-lg font-black">Start my private drop</p>
                    <p className="text-sm font-medium opacity-70">Choose a saved moment. Keep the power.</p>
                  </div>
                  <div className="text-2xl">→</div>
                </a>
                <p className="mt-6 max-w-sm text-xs leading-relaxed text-white/55">CreatorVault campaign motion sets the mood here. It is not presented as a creator result.</p>
              </div>
            </section>

            <section aria-label="VaultX creation paths" className="mb-8 border-t border-white/[0.12]">
              {[
                { number: "01", title: "Body Cinema", desc: "Take the footage you already own and build the next release you want to sell.", href: "/vault-x/studio", tone: "#f3d68b" },
                { number: "02", title: "Private drop", desc: "Shape the access around a finished moment only when it is ready to stand on its own.", href: "/vault-x/studio", tone: "#df6a9e" },
                { number: "03", title: "Lead-up energy", desc: "Build the trailer, visual, and social lead-in around the moment you chose.", href: "/vaultx/trailers", tone: "#d7a9ff" },
              ].map((item) => (
                <a key={item.title} href={item.href} className="group grid gap-3 border-b border-white/[0.12] py-7 transition hover:border-white/45 sm:grid-cols-[48px_1fr_auto] sm:items-center sm:gap-5">
                  <span className="text-[10px] font-black tracking-[.18em]" style={{ color: item.tone }}>{item.number}</span>
                  <div><p className="text-2xl font-black tracking-[-0.045em] text-white">{item.title}</p><p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">{item.desc}</p></div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-lg text-white transition group-hover:border-[#f3d68b] group-hover:bg-[#f3d68b] group-hover:text-black">↗</span>
                </a>
              ))}
            </section>

            <section className="relative mb-8 overflow-hidden rounded-[1.75rem] border border-white/[0.12] bg-[radial-gradient(circle_at_82%_12%,rgba(217,70,239,.16),transparent_32%),linear-gradient(135deg,#110d11,#070707)] px-6 py-8 sm:px-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-200">The way it should feel</p>
              <h2 className="mt-4 max-w-lg text-3xl font-black leading-[.9] tracking-[-.055em] text-white sm:text-4xl">Make the clip hit before you ask anybody to unlock it.</h2>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-zinc-300">Pick the moment. Decide the feeling. See the piece before you use it. Nothing is sold as finished when it is not.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row"><a href="/vault-x/studio" className="inline-flex min-h-13 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-[#f3d68b]">Open Body Cinema</a><a href="/creator/video-studio" className="inline-flex min-h-13 items-center justify-center rounded-full border border-white/25 bg-black/25 px-6 py-3 text-sm font-black text-white transition hover:border-white">Open Creator Video Studio</a></div>
            </section>
          </div>
        )}

        {/* ── OTHER TABS ─────────────────────────────────────────────────── */}
        {activeTab === "feed" && <ContentFeedTab userId={user.id} />}
        {activeTab === "messages" && <MessagingTab userId={user.id} />}
        {activeTab === "profile" && <MyProfileTab userId={user.id} />}
        {activeTab === "telegram" && <TelegramTab userId={user.id} />}
        {activeTab === "xcom" && <XComTab userId={user.id} />}
        {activeTab === "earnings" && <EarningsTab userId={user.id} />}

      </main>

      {/* Bottom nav — mobile */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.07] bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-2 grid grid-cols-4 gap-1">
          {[
            { id: "discover", label: "Home", icon: Flame },
            { id: "messages", label: "Messages", icon: Inbox },
            { id: "profile", label: "Profile", icon: Settings },
            { id: "earnings", label: "Earnings", icon: DollarSign },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-black transition ${
                activeTab === id ? "text-white" : "text-zinc-600"
              }`}
            >
              <Icon className={`h-5 w-5 ${ activeTab === id ? "text-[#c9a84c]" : "" }`} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
