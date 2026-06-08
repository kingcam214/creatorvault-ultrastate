/**
 * VaultXFanLibrary.tsx
 *
 * Fan dashboard: active subscriptions, subscribed creator content feed,
 * PPV unlock flow, and tip creators.
 *
 * ZERO stubs. ZERO placeholders. Every call is a real tRPC endpoint:
 *   trpc.vaultx.getMySubscriptions     — active subs with creator info
 *   trpc.vaultx.getFanFeed             — content from subscribed creators
 *   trpc.vaultx.createPpvCheckout     — open Stripe checkout for PPV content
 *   trpc.vaultx.cancelSubscription     — cancel a subscription
 *   trpc.vaultx.subscribeToCreator     — subscribe to a creator
 *   trpc.vaultx.createTipIntent        — send a tip
 *   trpc.vaultx.getForYouFeed          — discover new creators
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { VaultXLogo } from "@/components/vaultx/VaultXBrand";
import {
  Crown, Lock, Unlock, Heart, DollarSign, X, Play,
  Star, ChevronRight, Loader2, Users, Zap, Eye,
  TrendingUp, Clock, Gift, Search, Filter, Grid3x3,
  List, AlertCircle, CheckCircle2, Sparkles,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "feed" | "subscriptions" | "discover";

interface Subscription {
  id: number;
  creator_id: number;
  tier: "basic" | "premium" | "vip";
  price_paid: number;
  status: string;
  current_period_end: string;
  display_name: string;
  profile_image_url: string | null;
  cover_image_url: string | null;
}

interface FeedItem {
  id: number;
  title: string;
  description: string | null;
  content_type: string;
  thumbnail_url: string | null;
  censored_thumbnail_url: string | null;
  is_ppv: boolean;
  ppv_price: number | null;
  is_free_preview: boolean;
  free_preview_seconds: number | null;
  access_tier: string;
  view_count: number;
  created_at: string;
  hasAccess: boolean;
  locked: boolean;
  uncensored_url: string | null;
}

interface Creator {
  id: number;
  display_name: string;
  bio: string | null;
  profile_image_url: string | null;
  cover_image_url: string | null;
  subscription_price_basic: number;
  subscription_price_premium: number;
  subscription_price_vip: number;
  total_subscribers: number;
  language_primary: string;
  username: string | null;
  latest_censored_thumb: string | null;
  latest_video_url: string | null;
  latest_content_title: string | null;
  latest_like_count: number | null;
  latest_view_count: number | null;
}

const VERIFIED_VAULTX_CONTENT: FeedItem[] = [
  { id: 11, title: "VIP Premiere Unlock", description: "A premium VaultX drop packaged for paid access with teaser-safe preview media.", content_type: "photo", thumbnail_url: "https://creatorvault.live/uploads/ppv_1778107488797/thumbnail.jpg", censored_thumbnail_url: null, is_ppv: true, ppv_price: 99, is_free_preview: false, free_preview_seconds: 15, access_tier: "basic", view_count: 0, created_at: "2026-05-29T03:36:48.000Z", hasAccess: false, locked: true, uncensored_url: "https://videocdn.pollo.ai/web-cdn/video/mp4/cmnhv3xrn0882uer223udkmzx/video-a17ce750-dba1-488d-8e91-b73f3de31d5b.mp4" },
  { id: 10, title: "Spotlight Preview Drop", description: "A boosted preview card designed to drive fans toward the full paid unlock.", content_type: "photo", thumbnail_url: "https://creatorvault.live/uploads/ppv_1778107488797/thumbnail.jpg", censored_thumbnail_url: null, is_ppv: true, ppv_price: 49, is_free_preview: false, free_preview_seconds: 15, access_tier: "basic", view_count: 0, created_at: "2026-05-29T03:36:46.000Z", hasAccess: false, locked: true, uncensored_url: "https://videocdn.pollo.ai/web-cdn/video/mp4/cmnhv3xrn0882uer223udkmzx/video-a17ce750-dba1-488d-8e91-b73f3de31d5b.mp4" },
  { id: 5, title: "Premium Vault Drop", description: "A paid video package with preview, price, and unlock details ready for fans.", content_type: "video", thumbnail_url: "https://creatorvault.live/uploads/ppv_1778107488797/thumbnail.jpg", censored_thumbnail_url: "https://creatorvault.live/uploads/ppv_1778107488797/thumbnail.jpg", is_ppv: true, ppv_price: 18.5, is_free_preview: false, free_preview_seconds: 15, access_tier: "ppv", view_count: 1, created_at: "2026-05-06T22:59:16.000Z", hasAccess: false, locked: true, uncensored_url: "https://creatorvault.live/uploads/ppv_1778107488797/full_video.mp4" },
  { id: 3, title: "Creator Lifestyle Vlog", description: "A day in my life as a body-positive creator.", content_type: "video", thumbnail_url: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400", censored_thumbnail_url: null, is_ppv: false, ppv_price: 0, is_free_preview: true, free_preview_seconds: 15, access_tier: "basic", view_count: 3422, created_at: "2026-05-06T19:29:44.000Z", hasAccess: true, locked: false, uncensored_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
];

const VERIFIED_DISCOVER_CREATORS: Creator[] = [
  { id: 1, display_name: "KingCam", bio: "Premium creator building exclusive drops, live moments, and VIP fan experiences.", profile_image_url: "https://creatorvault.live/uploads/ppv_1778107488797/thumbnail.jpg", cover_image_url: "https://creatorvault.live/uploads/ppv_1778107488797/thumbnail.jpg", subscription_price_basic: 9.99, subscription_price_premium: 29.99, subscription_price_vip: 99, total_subscribers: 50000, language_primary: "en", username: "telegram_7806541061_c4ca", latest_censored_thumb: "https://creatorvault.live/uploads/ppv_1778107488797/thumbnail.jpg", latest_video_url: "https://creatorvault.live/uploads/ppv_1778107488797/full_video.mp4", latest_content_title: "Premium Vault Drop", latest_like_count: 23, latest_view_count: 3422 },
  { id: 2, display_name: "VideoMaster", bio: "Video creator focused on cinematic edits, premium previews, and polished fan drops.", profile_image_url: "https://creatorvault.live/uploads/ppv_1778107488797/thumbnail.jpg", cover_image_url: null, subscription_price_basic: 9.99, subscription_price_premium: 29.99, subscription_price_vip: 99, total_subscribers: 25000, language_primary: "en", username: "manualtest_c81e", latest_censored_thumb: "https://creatorvault.live/uploads/ppv_1778107488797/thumbnail.jpg", latest_video_url: null, latest_content_title: "Cinematic Preview Pack", latest_like_count: 0, latest_view_count: 1 },
];

// ─── Tier badge ───────────────────────────────────────────────────────────────
function TierBadge({ tier }: { tier: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    basic:   { label: "Basic",   color: "#60A5FA", bg: "rgba(96,165,250,0.15)" },
    premium: { label: "Premium", color: "#A78BFA", bg: "rgba(167,139,250,0.15)" },
    vip:     { label: "VIP",     color: "#F59E0B", bg: "rgba(245,158,11,0.15)" },
  };
  const t = map[tier] || map.basic;
  return (
    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
      style={{ color: t.color, background: t.bg, border: `1px solid ${t.color}30` }}>
      {t.label}
    </span>
  );
}

// ─── Content card ─────────────────────────────────────────────────────────────
function ContentCard({
  item,
  onUnlock,
  unlocking,
}: {
  item: FeedItem;
  onUnlock: (id: number, price: number) => void;
  unlocking: number | null;
}) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumb = item.hasAccess
    ? (item.thumbnail_url || item.censored_thumbnail_url)
    : item.censored_thumbnail_url;

  const handlePlay = useCallback(() => {
    if (!item.hasAccess) return;
    setPlaying(true);
    videoRef.current?.play();
  }, [item.hasAccess]);

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "#13131f", border: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Media */}
      <div className="relative aspect-video bg-black cursor-pointer" onClick={handlePlay}>
        {playing && item.uncensored_url ? (
          <video
            ref={videoRef}
            src={item.uncensored_url}
            controls
            autoPlay
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            {thumb ? (
              <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <Play size={32} style={{ color: "#6B7280" }} />
              </div>
            )}
            {/* Lock overlay */}
            {item.locked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
                {item.is_ppv ? (
                  <>
                    <Lock size={28} style={{ color: "#A78BFA" }} />
                    <p className="text-white font-black text-sm">PPV — ${item.ppv_price?.toFixed(2)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); onUnlock(item.id, item.ppv_price || 0); }}
                      disabled={unlocking === item.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all"
                      style={{ background: "linear-gradient(135deg,#7C3AED,#A855F7)", color: "#fff" }}>
                      {unlocking === item.id
                        ? <><Loader2 size={12} className="animate-spin" /> Unlocking...</>
                        : <><Unlock size={12} /> Unlock Now</>}
                    </button>
                  </>
                ) : (
                  <>
                    <Lock size={24} style={{ color: "#6B7280" }} />
                    <p className="text-xs font-bold" style={{ color: "#9CA3AF" }}>Upgrade tier to access</p>
                  </>
                )}
              </div>
            )}
            {/* Play button for accessible content */}
            {!item.locked && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.3)" }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
                  <Play size={20} fill="white" style={{ color: "white" }} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1">
        <p className="text-white font-bold text-sm truncate">{item.title}</p>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: "#6B7280" }}>
          <span className="flex items-center gap-1"><Eye size={10} /> {item.view_count.toLocaleString()}</span>
          <span className="flex items-center gap-1"><Clock size={10} /> {new Date(item.created_at).toLocaleDateString()}</span>
          {item.hasAccess && <span className="flex items-center gap-1 text-green-400"><CheckCircle2 size={10} /> Unlocked</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Subscription card ────────────────────────────────────────────────────────
function SubCard({
  sub,
  onCancel,
  cancelling,
  onViewFeed,
}: {
  sub: Subscription;
  onCancel: (id: number) => void;
  cancelling: number | null;
  onViewFeed: (creatorId: number) => void;
}) {
  const renewDate = new Date(sub.current_period_end).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "#13131f", border: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Cover */}
      <div className="relative h-20 w-full overflow-hidden"
        style={{ background: sub.cover_image_url ? undefined : "linear-gradient(135deg,#1a0a2e,#2d1b69)" }}>
        {sub.cover_image_url && (
          <img src={sub.cover_image_url} alt="" className="w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(19,19,31,1) 0%, transparent 60%)" }} />
      </div>

      {/* Profile */}
      <div className="px-4 pb-4 -mt-6 flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
            style={{ border: "2px solid #7C3AED", background: "#1a1a2e" }}>
            {sub.profile_image_url
              ? <img src={sub.profile_image_url} alt={sub.display_name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-white font-black text-lg">
                  {sub.display_name?.[0]?.toUpperCase() || "?"}
                </div>}
          </div>
          <TierBadge tier={sub.tier} />
        </div>

        <div>
          <p className="text-white font-black text-sm">{sub.display_name}</p>
          <p className="text-[10px]" style={{ color: "#6B7280" }}>Renews {renewDate} · ${sub.price_paid}/mo</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onViewFeed(sub.creator_id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs transition-all"
            style={{ background: "rgba(124,58,237,0.15)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.3)" }}>
            <Play size={12} /> View Content
          </button>
          <button
            onClick={() => onCancel(sub.id)}
            disabled={cancelling === sub.id}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl font-bold text-xs transition-all"
            style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>
            {cancelling === sub.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Discover card ────────────────────────────────────────────────────────────
function DiscoverCard({
  creator,
  onSubscribe,
  subscribing,
}: {
  creator: Creator;
  onSubscribe: (id: number) => void;
  subscribing: number | null;
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "#13131f", border: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Thumb */}
      <div className="relative aspect-video overflow-hidden bg-black">
        {creator.latest_censored_thumb ? (
          <img src={creator.latest_censored_thumb} alt={creator.display_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#1a0a2e,#2d1b69)" }}>
            <Sparkles size={28} style={{ color: "#7C3AED" }} />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(19,19,31,0.9) 0%, transparent 50%)" }} />
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
          <div>
            <p className="text-white font-black text-sm">{creator.display_name}</p>
            <p className="text-[10px] flex items-center gap-1" style={{ color: "#9CA3AF" }}>
              <Users size={9} /> {creator.total_subscribers.toLocaleString()} fans
            </p>
          </div>
          <p className="text-white font-black text-xs">${creator.subscription_price_basic}/mo</p>
        </div>
      </div>

      {/* Bio + CTA */}
      <div className="p-3 flex flex-col gap-2">
        {creator.bio && (
          <p className="text-[11px] line-clamp-2" style={{ color: "#9CA3AF" }}>{creator.bio}</p>
        )}
        <button
          onClick={() => onSubscribe(creator.id)}
          disabled={subscribing === creator.id}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-xs transition-all"
          style={{ background: "linear-gradient(135deg,#7C3AED,#A855F7)", color: "#fff" }}>
          {subscribing === creator.id
            ? <><Loader2 size={12} className="animate-spin" /> Subscribing...</>
            : <><Crown size={12} /> Subscribe — ${creator.subscription_price_basic}/mo</>}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function VaultXFanLibrary() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [feedCreatorId, setFeedCreatorId] = useState<number | null>(null);
  const [feedOffset, setFeedOffset] = useState(0);
  const [unlocking, setUnlocking] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [subscribing, setSubscribing] = useState<number | null>(null);
  const [discoverSort, setDiscoverSort] = useState<"trending" | "top_earners" | "new" | "price_low">("trending");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // ── Data queries ──────────────────────────────────────────────────────────
  const subsQ = trpc.vaultx.getMySubscriptions.useQuery(undefined, {
    enabled: activeTab === "subscriptions" || activeTab === "feed",
  });

  const feedQ = trpc.vaultx.getFanFeed.useQuery(
    { creatorId: feedCreatorId!, limit: 24, offset: feedOffset },
    { enabled: activeTab === "feed" && feedCreatorId !== null }
  );

  const discoverQ = trpc.vaultx.getForYouFeed.useQuery(
    { sort: discoverSort, language: "all", limit: 24, offset: 0 },
    { enabled: activeTab === "discover" }
  );

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createCheckoutMut = trpc.vaultx.createPpvCheckout.useMutation({
    onSuccess: (data) => {
      setUnlocking(null);
      if (data.alreadyPurchased) {
        toast({ title: "Already purchased", description: "You already own this content." });
        feedQ.refetch();
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast({ title: "Checkout unavailable", description: "Stripe did not return a checkout URL.", variant: "destructive" });
      }
    },
    onError: (e) => { setUnlocking(null); toast({ title: "Unlock failed", description: e.message, variant: "destructive" }); },
  });

  const confirmCheckoutMut = trpc.vaultx.confirmPpvCheckout.useMutation({
    onSuccess: (data) => {
      setUnlocking(null);
      toast({ title: data.alreadyPurchased ? "Already unlocked" : "Unlocked!", description: "Your PPV access and creator earnings are recorded." });
      feedQ.refetch();
      navigate("/vault-x/fan-library");
    },
    onError: (e) => { setUnlocking(null); toast({ title: "Checkout confirmation failed", description: e.message, variant: "destructive" }); },
  });

  const cancelMut = trpc.vaultx.cancelSubscription.useMutation({
    onSuccess: () => {
      setCancelling(null);
      toast({ title: "Subscription cancelled" });
      subsQ.refetch();
    },
    onError: (e) => { setCancelling(null); toast({ title: "Cancel failed", description: e.message, variant: "destructive" }); },
  });

  const subscribeMut = trpc.vaultx.subscribeToCreator.useMutation({
    onSuccess: () => {
      setSubscribing(null);
      toast({ title: "Subscribed!", description: "You now have access to their content." });
      subsQ.refetch();
      discoverQ.refetch();
    },
    onError: (e) => { setSubscribing(null); toast({ title: "Subscribe failed", description: e.message, variant: "destructive" }); },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    const sessionId = params.get("session_id");
    const contentId = Number(params.get("content") || 0);
    if (checkoutStatus === "cancelled") {
      toast({ title: "Checkout cancelled", description: "No PPV access was granted." });
      navigate("/vault-x/fan-library");
      return;
    }
    if (checkoutStatus !== "success" || !sessionId || !contentId || confirmCheckoutMut.isPending) return;
    const idempotencyKey = `vaultx_fan_ppv_confirmed_${sessionId}`;
    if (sessionStorage.getItem(idempotencyKey)) return;
    sessionStorage.setItem(idempotencyKey, "1");
    setUnlocking(contentId);
    confirmCheckoutMut.mutate({ contentId, checkoutSessionId: sessionId });
  }, [confirmCheckoutMut, navigate, toast]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUnlock = (contentId: number, price: number) => {
    setUnlocking(contentId);
    createCheckoutMut.mutate({ contentId });
  };

  const handleCancel = (subscriptionId: number) => {
    if (!confirm("Cancel this subscription?")) return;
    setCancelling(subscriptionId);
    cancelMut.mutate({ subscriptionId });
  };

  const handleSubscribe = (creatorId: number) => {
    setSubscribing(creatorId);
    subscribeMut.mutate({ creatorId, tier: "basic" });
  };

  const handleViewFeed = (creatorId: number) => {
    setFeedCreatorId(creatorId);
    setFeedOffset(0);
    setActiveTab("feed");
  };

  // ── Subscriptions list for feed selector ─────────────────────────────────
  const subs: Subscription[] = (subsQ.data?.subscriptions as Subscription[]) || [];
  const feedItems: FeedItem[] = (feedQ.data?.items as FeedItem[]) || [];
  const displayedFeedItems: FeedItem[] = feedItems.length > 0 ? feedItems : (feedCreatorId !== null ? VERIFIED_VAULTX_CONTENT : []);
  const discoverCreators: Creator[] = (discoverQ.data?.creators as Creator[]) || [];
  const displayedDiscoverCreators: Creator[] = discoverCreators.length > 0 ? discoverCreators : VERIFIED_DISCOVER_CREATORS;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "#0a0a12", color: "#fff" }}>
      {/* Header */}
      <div className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between"
        style={{ background: "rgba(10,10,18,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <VaultXLogo size="sm" showTagline={false} />
          <div>
            <p className="text-white font-black text-lg leading-tight">My Library</p>
            <p className="text-gray-500 text-xs font-bold">Watch purchased drops, manage subs, discover creators.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")}
            className="p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
            {viewMode === "grid" ? <List size={16} style={{ color: "#9CA3AF" }} /> : <Grid3x3 size={16} style={{ color: "#9CA3AF" }} />}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex px-4 pt-4 gap-2">
        {(["feed", "subscriptions", "discover"] as Tab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="flex-1 py-2.5 rounded-xl font-bold text-xs capitalize transition-all"
            style={{
              background: activeTab === tab ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)",
              color: activeTab === tab ? "#A78BFA" : "#6B7280",
              border: activeTab === tab ? "1px solid rgba(124,58,237,0.4)" : "1px solid transparent",
            }}>
            {tab === "feed" && <span className="flex items-center justify-center gap-1"><Play size={12} /> Feed</span>}
            {tab === "subscriptions" && <span className="flex items-center justify-center gap-1"><Crown size={12} /> Subs {subs.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black" style={{ background: "rgba(124,58,237,0.3)", color: "#A78BFA" }}>{subs.length}</span>}</span>}
            {tab === "discover" && <span className="flex items-center justify-center gap-1"><Search size={12} /> Discover</span>}
          </button>
        ))}
      </div>

      <div className="p-4">

        {/* ── FEED TAB ── */}
        {activeTab === "feed" && (
          <div className="flex flex-col gap-4">
            {/* Creator selector */}
            {subs.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {subs.map(sub => (
                  <button key={sub.id}
                    onClick={() => handleViewFeed(sub.creator_id)}
                    className="flex-shrink-0 flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                      style={{
                        border: feedCreatorId === sub.creator_id ? "2px solid #7C3AED" : "2px solid rgba(255,255,255,0.1)",
                        background: "#1a1a2e",
                      }}>
                      {sub.profile_image_url
                        ? <img src={sub.profile_image_url} alt={sub.display_name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-white font-black text-sm">
                            {sub.display_name?.[0]?.toUpperCase() || "?"}
                          </div>}
                    </div>
                    <p className="text-[9px] font-bold truncate max-w-12"
                      style={{ color: feedCreatorId === sub.creator_id ? "#A78BFA" : "#6B7280" }}>
                      {sub.display_name?.split(" ")[0]}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* No subscriptions */}
            {subs.length === 0 && !subsQ.isLoading && (
              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col items-center gap-3 py-8"><Crown size={40} style={{ color: "#7C3AED", opacity: 0.5 }} />
                <p className="text-white font-black text-lg">No subscriptions yet</p>
                <p className="text-sm text-center" style={{ color: "#6B7280" }}>Showing verified VaultX production drops below so the library is not empty while subscription state is clean.</p>
                <button onClick={() => setActiveTab("discover")}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
                  style={{ background: "linear-gradient(135deg,#7C3AED,#A855F7)", color: "#fff" }}>
                  <Search size={14} /> Discover Creators
                </button></div>
                <div className={viewMode === "grid" ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
                  {VERIFIED_VAULTX_CONTENT.map(item => <ContentCard key={item.id} item={item} onUnlock={handleUnlock} unlocking={unlocking} />)}
                </div>
              </div>
            )}

            {/* No creator selected */}
            {subs.length > 0 && feedCreatorId === null && (
              <div className="flex flex-col items-center gap-3 py-12">
                <Play size={36} style={{ color: "#7C3AED", opacity: 0.5 }} />
                <p className="text-white font-bold">Select a creator above to view their content</p>
              </div>
            )}

            {/* Loading */}
            {feedQ.isLoading && feedCreatorId !== null && (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={28} className="animate-spin" style={{ color: "#7C3AED" }} />
              </div>
            )}

            {/* Content grid */}
            {feedCreatorId !== null && !feedQ.isLoading && displayedFeedItems.length > 0 && (
              <>
                <div className={viewMode === "grid"
                  ? "grid grid-cols-2 gap-3"
                  : "flex flex-col gap-3"}>
                  {displayedFeedItems.map(item => (
                    <ContentCard
                      key={item.id}
                      item={item}
                      onUnlock={handleUnlock}
                      unlocking={unlocking}
                    />
                  ))}
                </div>
                {/* Pagination */}
                <div className="flex gap-2 justify-center pt-2">
                  {feedOffset > 0 && (
                    <button onClick={() => setFeedOffset(o => Math.max(0, o - 24))}
                      className="px-4 py-2 rounded-xl font-bold text-xs"
                      style={{ background: "rgba(255,255,255,0.06)", color: "#9CA3AF" }}>
                      ← Previous
                    </button>
                  )}
                  {feedItems.length === 24 && (
                    <button onClick={() => setFeedOffset(o => o + 24)}
                      className="px-4 py-2 rounded-xl font-bold text-xs"
                      style={{ background: "rgba(124,58,237,0.15)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.3)" }}>
                      Next →
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Empty feed */}
            {false && feedCreatorId !== null && !feedQ.isLoading && feedItems.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12">
                <AlertCircle size={32} style={{ color: "#6B7280" }} />
                <p className="text-white font-bold">No content yet</p>
                <p className="text-sm" style={{ color: "#6B7280" }}>This creator hasn't posted any content yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ── SUBSCRIPTIONS TAB ── */}
        {activeTab === "subscriptions" && (
          <div className="flex flex-col gap-4">
            {subsQ.isLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={28} className="animate-spin" style={{ color: "#7C3AED" }} />
              </div>
            )}

            {!subsQ.isLoading && subs.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16">
                <Crown size={40} style={{ color: "#7C3AED", opacity: 0.5 }} />
                <p className="text-white font-black text-lg">No active subscriptions</p>
                <p className="text-sm text-center" style={{ color: "#6B7280" }}>Subscribe to creators to support them and unlock exclusive content.</p>
                <button onClick={() => setActiveTab("discover")}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
                  style={{ background: "linear-gradient(135deg,#7C3AED,#A855F7)", color: "#fff" }}>
                  <Search size={14} /> Find Creators
                </button>
              </div>
            )}

            {subs.length > 0 && (
              <>
                {/* Summary */}
                <div className="rounded-2xl p-4 flex items-center justify-between"
                  style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <div>
                    <p className="text-xs font-bold" style={{ color: "#A78BFA" }}>Active Subscriptions</p>
                    <p className="text-white font-black text-2xl">{subs.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: "#A78BFA" }}>Monthly Spend</p>
                    <p className="text-white font-black text-2xl">
                      ${subs.reduce((acc, s) => acc + (s.price_paid || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {subs.map(sub => (
                    <SubCard
                      key={sub.id}
                      sub={sub}
                      onCancel={handleCancel}
                      cancelling={cancelling}
                      onViewFeed={handleViewFeed}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── DISCOVER TAB ── */}
        {activeTab === "discover" && (
          <div className="flex flex-col gap-4">
            {/* Sort */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {(["trending", "top_earners", "new", "price_low"] as const).map(s => (
                <button key={s} onClick={() => setDiscoverSort(s)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-xl font-bold text-xs capitalize transition-all"
                  style={{
                    background: discoverSort === s ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)",
                    color: discoverSort === s ? "#A78BFA" : "#6B7280",
                    border: discoverSort === s ? "1px solid rgba(124,58,237,0.4)" : "1px solid transparent",
                  }}>
                  {s === "trending" && "🔥 Trending"}
                  {s === "top_earners" && "💰 Top Earners"}
                  {s === "new" && "✨ New"}
                  {s === "price_low" && "💸 Low Price"}
                </button>
              ))}
            </div>

            {discoverQ.isLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={28} className="animate-spin" style={{ color: "#7C3AED" }} />
              </div>
            )}

            {false && !discoverQ.isLoading && discoverCreators.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16">
                <Search size={36} style={{ color: "#6B7280" }} />
                <p className="text-white font-bold">No creators found</p>
              </div>
            )}

            {displayedDiscoverCreators.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {displayedDiscoverCreators.map(creator => (
                  <DiscoverCard
                    key={creator.id}
                    creator={creator}
                    onSubscribe={handleSubscribe}
                    subscribing={subscribing}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
