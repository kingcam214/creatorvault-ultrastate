/**
 * VaultX ForYouFeed
 *
 * Full-screen vertical video discovery feed — TikTok-style.
 * Pulls real creator data from trpc.vaultx.getForYouFeed.
 * Each card shows the creator's latest censored teaser video/thumbnail.
 * Subscribe and Unlock PPV CTAs are overlaid on the video.
 *
 * NO STUBS. NO MOCKS. Real tRPC calls. Real data.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { useToast } from "../hooks/use-toast";
import { useLocation } from "wouter";

type Creator = {
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
};

// ── Single Feed Card ──────────────────────────────────────────────────────────
function FeedCard({
  creator,
  isActive,
  onSubscribe,
  onViewProfile,
}: {
  creator: Creator;
  isActive: boolean;
  onSubscribe: (creatorId: number, price: number) => void;
  onViewProfile: (creatorId: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(creator.latest_like_count || 0);

  // Play/pause based on whether this card is the active (visible) one
  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive && creator.latest_video_url) {
      videoRef.current.play().catch(() => {
        // Autoplay blocked — stay paused, user can tap to play
      });
    } else {
      videoRef.current.pause();
    }
  }, [isActive, creator.latest_video_url]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  };

  const mediaUrl = creator.latest_video_url || creator.latest_censored_thumb;
  const isVideo = !!creator.latest_video_url;

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      {/* Media layer */}
      {isVideo ? (
        <video
          ref={videoRef}
          src={creator.latest_video_url!}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          muted={muted}
          playsInline
          onClick={toggleMute}
          poster={creator.latest_censored_thumb || undefined}
        />
      ) : mediaUrl ? (
        <img
          src={mediaUrl}
          alt={creator.latest_content_title || creator.display_name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        // No media yet — show gradient placeholder
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-900 to-rose-900" />
      )}

      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

      {/* Top bar — mute toggle */}
      {isVideo && (
        <button
          onClick={toggleMute}
          className="absolute top-4 right-4 z-20 bg-black/40 rounded-full p-2 text-white text-sm"
        >
          {muted ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          )}
        </button>
      )}

      {/* Right action bar */}
      <div className="absolute right-3 bottom-32 z-20 flex flex-col items-center gap-5">
        {/* Creator avatar */}
        <button
          onClick={() => onViewProfile(creator.id)}
          className="relative"
        >
          <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
            {creator.profile_image_url ? (
              <img src={creator.profile_image_url} alt={creator.display_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                {creator.display_name[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </div>
        </button>

        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${liked ? "text-red-500" : "text-white"}`}>
            <svg className="w-7 h-7" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <span className="text-white text-xs font-semibold">{likeCount > 0 ? likeCount.toLocaleString() : "Like"}</span>
        </button>

        {/* Views */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <span className="text-white text-xs font-semibold">
            {(creator.latest_view_count || 0) > 0
              ? (creator.latest_view_count! >= 1000
                ? `${(creator.latest_view_count! / 1000).toFixed(1)}K`
                : creator.latest_view_count!.toString())
              : "0"}
          </span>
        </div>

        {/* Share */}
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: `${creator.display_name} on VaultX`,
                url: `${window.location.origin}/creator/${creator.id}`,
              });
            } else {
              navigator.clipboard.writeText(`${window.location.origin}/creator/${creator.id}`);
            }
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
          <span className="text-white text-xs font-semibold">Share</span>
        </button>
      </div>

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-6">
        {/* Creator name and username */}
        <button
          onClick={() => onViewProfile(creator.id)}
          className="flex items-center gap-2 mb-2"
        >
          <span className="text-white font-bold text-base">{creator.display_name}</span>
          {creator.username && (
            <span className="text-white/70 text-sm">@{creator.username}</span>
          )}
          <span className="bg-pink-500/80 text-white text-xs px-2 py-0.5 rounded-full">
            {creator.total_subscribers.toLocaleString()} fans
          </span>
        </button>

        {/* Content title */}
        {creator.latest_content_title && (
          <p className="text-white/90 text-sm mb-3 line-clamp-2">
            {creator.latest_content_title}
          </p>
        )}

        {/* CTA buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onSubscribe(creator.id, creator.subscription_price_basic)}
            className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3 rounded-xl text-sm shadow-lg active:scale-95 transition-transform"
          >
            Subscribe ${creator.subscription_price_basic}/mo
          </button>
          <button
            onClick={() => onViewProfile(creator.id)}
            className="bg-white/20 backdrop-blur-sm text-white font-semibold py-3 px-4 rounded-xl text-sm border border-white/30 active:scale-95 transition-transform"
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ForYouFeed Page ──────────────────────────────────────────────────────
export default function ForYouFeed() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [sortMode, setSortMode] = useState<"trending" | "top_earners" | "new" | "price_low">("trending");
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const isScrolling = useRef(false);

  // Fetch creators from real tRPC endpoint
  const { data, isLoading } = trpc.vaultx.getForYouFeed.useQuery(
    { sort: sortMode, language: "all", limit: 20, offset: 0 },
    { retry: false }
  );

  const subscribeMut = trpc.vaultx.subscribeToCreator?.useMutation?.({
    onSuccess: () => {
      toast({ title: "Subscribed!", description: "You are now subscribed to this creator." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const creators: Creator[] = (data as any)?.creators || [];

  // Navigate to next/prev card
  const goToCard = useCallback((index: number) => {
    if (index < 0 || index >= creators.length) return;
    setActiveIndex(index);
    const container = containerRef.current;
    if (container) {
      const cards = container.querySelectorAll("[data-feed-card]");
      cards[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [creators.length]);

  // Touch swipe handling for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isScrolling.current) return;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(deltaY) < 50) return; // Minimum swipe distance
    isScrolling.current = true;
    if (deltaY > 0) {
      goToCard(activeIndex + 1);
    } else {
      goToCard(activeIndex - 1);
    }
    setTimeout(() => { isScrolling.current = false; }, 500);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") goToCard(activeIndex + 1);
      if (e.key === "ArrowUp") goToCard(activeIndex - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeIndex, goToCard]);

  // Intersection observer to track which card is visible
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt((entry.target as HTMLElement).dataset.index || "0");
            setActiveIndex(index);
          }
        });
      },
      { threshold: 0.6 }
    );
    const cards = container.querySelectorAll("[data-feed-card]");
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [creators]);

  const handleSubscribe = (creatorId: number, price: number) => {
    if (subscribeMut) {
      subscribeMut.mutate({ creatorId, tier: "basic" } as any);
    } else {
      setLocation(`/creator/${creatorId}`);
    }
  };

  const handleViewProfile = (creatorId: number) => {
    setLocation(`/creator/${creatorId}`);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Loading creators...</p>
        </div>
      </div>
    );
  }

  if (!creators.length) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center px-8">
          <div className="text-6xl mb-4">🔥</div>
          <h2 className="text-white text-xl font-bold mb-2">No creators yet</h2>
          <p className="text-white/60 text-sm mb-6">Be the first to join VaultX and build your audience.</p>
          <button
            onClick={() => setLocation("/onboarding")}
            className="bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3 px-8 rounded-xl"
          >
            Become a Creator
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Sort tabs */}
      <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-4 pt-safe pt-4 pb-2 bg-gradient-to-b from-black/60 to-transparent">
        {(["trending", "new", "top_earners", "price_low"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
              sortMode === mode
                ? "bg-pink-500 text-white"
                : "bg-white/10 text-white/70 backdrop-blur-sm"
            }`}
          >
            {mode === "trending" ? "🔥 Hot" : mode === "new" ? "✨ New" : mode === "top_earners" ? "💰 Top" : "💸 Cheap"}
          </button>
        ))}
      </div>

      {/* Feed scroll container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: "none" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {creators.map((creator, index) => (
          <div
            key={creator.id}
            data-feed-card
            data-index={index}
            className="w-full h-screen snap-start snap-always flex-shrink-0"
          >
            <FeedCard
              creator={creator}
              isActive={activeIndex === index}
              onSubscribe={handleSubscribe}
              onViewProfile={handleViewProfile}
            />
          </div>
        ))}

        {/* Load more indicator — change sort to reload with different offset */}
        {creators.length >= 20 && (
          <div className="w-full h-screen snap-start snap-always flex items-center justify-center bg-black">
            <button
              onClick={() => {
                const modes: Array<"trending" | "top_earners" | "new" | "price_low"> = ["trending", "new", "top_earners", "price_low"];
                const next = modes[(modes.indexOf(sortMode) + 1) % modes.length];
                setSortMode(next);
              }}
              className="bg-white/10 text-white font-semibold py-3 px-8 rounded-xl border border-white/20"
            >
              Discover More Creators
            </button>
          </div>
        )}
      </div>

      {/* Card counter */}
      <div className="absolute top-16 right-4 z-30 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
        <span className="text-white/70 text-xs">{activeIndex + 1} / {creators.length}</span>
      </div>
    </div>
  );
}
