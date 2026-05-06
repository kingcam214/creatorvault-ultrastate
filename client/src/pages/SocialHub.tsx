/**
 * SocialHub.tsx — Unified Social Media Command Center
 * Consolidates: PlatformConnections, MultiPlatformPosting, ContentScheduler,
 *               UnifiedContentPublisher, SocialAutoposterAgent
 *
 * 4 Tabs: CONNECT · POST · SCHEDULE · AUTOPILOT
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "../hooks/use-toast";
import {
  Link2, Link2Off, CheckCircle2, XCircle, RefreshCw, Trash2,
  Send, Calendar, Zap, Globe, Clock, TrendingUp, Users,
  Image, Video, FileText, Plus, X, ChevronRight, Settings,
  Play, Pause, BarChart2, AlertCircle, Loader2, ExternalLink,
} from "lucide-react";

// ─── Platform config ──────────────────────────────────────────────────────────
const PLATFORMS = [
  {
    id: "instagram", name: "Instagram", icon: "📷",
    gradient: "from-purple-600 via-pink-500 to-orange-400",
    border: "border-pink-500/30", glow: "shadow-pink-900/30",
    description: "Photos, Reels, Stories",
    adultFriendly: false, note: "SFW content only",
  },
  {
    id: "tiktok", name: "TikTok", icon: "🎵",
    gradient: "from-cyan-400 to-black",
    border: "border-cyan-500/30", glow: "shadow-cyan-900/30",
    description: "Short-form video",
    adultFriendly: false, note: "SFW content only",
  },
  {
    id: "twitter", name: "Twitter / X", icon: "𝕏",
    gradient: "from-gray-700 to-black",
    border: "border-gray-500/30", glow: "shadow-gray-900/30",
    description: "Posts, threads, media",
    adultFriendly: true, note: "Adult content allowed (18+ toggle)",
  },
  {
    id: "youtube", name: "YouTube", icon: "▶",
    gradient: "from-red-600 to-red-900",
    border: "border-red-500/30", glow: "shadow-red-900/30",
    description: "Videos, Shorts, Members",
    adultFriendly: false, note: "Age-restricted allowed",
  },
  {
    id: "facebook", name: "Facebook", icon: "f",
    gradient: "from-blue-600 to-blue-900",
    border: "border-blue-500/30", glow: "shadow-blue-900/30",
    description: "Posts, Reels, Groups",
    adultFriendly: false, note: "SFW content only",
  },
];

const TABS = [
  { id: "connect", label: "Connect", icon: Link2 },
  { id: "post", label: "Post Now", icon: Send },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "autopilot", label: "Autopilot", icon: Zap },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SocialHub() {
  const [activeTab, setActiveTab] = useState("connect");

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-900/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Social Hub</h1>
              <p className="text-gray-500 text-sm">Connect, post, schedule, and automate across every platform</p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-8 bg-white/5 rounded-2xl p-1 backdrop-blur-sm border border-white/10">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "connect" && <ConnectTab />}
        {activeTab === "post" && <PostTab />}
        {activeTab === "schedule" && <ScheduleTab />}
        {activeTab === "autopilot" && <AutopilotTab />}
      </div>
    </div>
  );
}

// ─── CONNECT TAB ─────────────────────────────────────────────────────────────
function ConnectTab() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [connecting, setConnecting] = useState<string | null>(null);

  const { data: connectionStatus, isLoading } = trpc.oauthCallback.getConnectionStatus.useQuery();

  const getAuthUrl = trpc.oauthCallback.getAuthUrl.useMutation({
    onSuccess: (data) => {
      const popup = window.open(data.authUrl, "oauth", "width=600,height=700,scrollbars=yes");
      const poll = setInterval(() => {
        if (popup?.closed) {
          clearInterval(poll);
          setConnecting(null);
          utils.oauthCallback.getConnectionStatus.invalidate();
        }
      }, 1000);
    },
    onError: (e) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setConnecting(null);
    },
  });

  const disconnect = trpc.platformPosting.disconnectPlatform.useMutation({
    onSuccess: () => {
      utils.oauthCallback.getConnectionStatus.invalidate();
      toast({ title: "Disconnected", description: "Platform disconnected" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleConnect = (platformId: string) => {
    setConnecting(platformId);
    getAuthUrl.mutate({ platform: platformId as any });
  };

  const connectedCount = connectionStatus?.filter((s: any) => s.connected).length || 0;

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${connectedCount > 0 ? "bg-green-400 animate-pulse" : "bg-gray-600"}`} />
          <span className="text-sm text-gray-300">
            {connectedCount > 0 ? `${connectedCount} platform${connectedCount > 1 ? "s" : ""} connected` : "No platforms connected"}
          </span>
        </div>
        <button
          onClick={() => utils.oauthCallback.getConnectionStatus.invalidate()}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Important note for adult creators */}
      <div className="p-4 rounded-2xl bg-amber-900/20 border border-amber-500/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-bold text-sm mb-1">Adult Content Distribution Note</p>
            <p className="text-amber-400/70 text-xs leading-relaxed">
              Instagram, TikTok, Facebook, and YouTube enforce SFW-only policies. Use these platforms for teasers, SFW previews, and traffic driving only. Twitter/X supports adult content with the 18+ toggle enabled. For full uncensored distribution, use VaultX direct publishing and your subscriber messaging channels.
            </p>
          </div>
        </div>
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORMS.map(platform => {
          const status = connectionStatus?.find((s: any) => s.platform === platform.id);
          const isConnected = status?.connected || false;
          const isConnecting = connecting === platform.id;

          return (
            <div
              key={platform.id}
              className={`relative rounded-2xl border bg-white/5 backdrop-blur-sm overflow-hidden transition-all hover:bg-white/8 ${platform.border} ${isConnected ? `shadow-lg ${platform.glow}` : ""}`}
            >
              {/* Connected indicator */}
              {isConnected && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
              )}

              <div className="p-5">
                {/* Platform header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center text-white font-black text-lg`}>
                    {platform.icon}
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{platform.name}</div>
                    <div className="text-gray-500 text-xs">{platform.description}</div>
                  </div>
                </div>

                {/* Adult content badge */}
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mb-4 ${
                  platform.adultFriendly
                    ? "bg-green-900/40 text-green-400 border border-green-500/30"
                    : "bg-gray-800 text-gray-500 border border-gray-700"
                }`}>
                  {platform.adultFriendly ? "✓ Adult Friendly" : "⚠ SFW Only"}
                </div>

                {/* Connection status */}
                {isConnected && (status?.username || (status as any)?.platformUsername) && (
                  <div className="flex items-center gap-2 mb-4 p-2 rounded-xl bg-green-900/20 border border-green-500/20">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-green-300 text-xs font-semibold">@{status?.username || (status as any)?.platformUsername}</span>
                    {status?.followerCount && (
                      <span className="text-gray-500 text-xs ml-auto">{status?.followerCount?.toLocaleString()} followers</span>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  {!isConnected ? (
                    <button
                      onClick={() => handleConnect(platform.id)}
                      disabled={isConnecting}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all bg-gradient-to-r ${platform.gradient} text-white hover:opacity-90 disabled:opacity-50`}
                    >
                      {isConnecting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
                      ) : (
                        <><Link2 className="w-4 h-4" /> Connect</>
                      )}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleConnect(platform.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-white/10 text-white hover:bg-white/15 transition-all"
                      >
                        <RefreshCw className="w-4 h-4" /> Reconnect
                      </button>
                      <button
                        onClick={() => disconnect.mutate({ platform: platform.id as any })}
                        disabled={disconnect.isPending}
                        className="w-10 h-10 rounded-xl bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-all flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Setup instructions */}
      <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4 text-purple-400" />
          OAuth App Setup Required
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          To enable real OAuth connections, add your platform app credentials to the server environment. Each platform requires a Client ID and Client Secret from their developer portal.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: "Instagram / Facebook", url: "https://developers.facebook.com/apps", vars: "INSTAGRAM_CLIENT_ID, INSTAGRAM_CLIENT_SECRET" },
            { name: "TikTok", url: "https://developers.tiktok.com", vars: "TIKTOK_CLIENT_ID, TIKTOK_CLIENT_SECRET" },
            { name: "Twitter / X", url: "https://developer.twitter.com/en/portal", vars: "TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET" },
            { name: "YouTube", url: "https://console.cloud.google.com", vars: "YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET" },
          ].map(item => (
            <div key={item.name} className="p-3 rounded-xl bg-black/40 border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-xs font-bold">{item.name}</span>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-gray-600 text-xs font-mono">{item.vars}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── POST TAB ─────────────────────────────────────────────────────────────────
function PostTab() {
  const { toast } = useToast();
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [contentType, setContentType] = useState<"image" | "video" | "text">("video");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [postResult, setPostResult] = useState<any>(null);

  const { data: connectedPlatforms } = trpc.platformPosting.getConnectedPlatforms.useQuery();
  const connectedIds = connectedPlatforms?.map((p: any) => p.platform) || [];

  const postMut = trpc.platformPosting.postToMultiplePlatforms.useMutation({
    onSuccess: (data) => {
      setPostResult(data);
      toast({ title: "Posted!", description: `Posted to ${selectedPlatforms.length} platform(s)` });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handlePost = () => {
    if (!caption.trim()) return toast({ title: "Error", description: "Add a caption", variant: "destructive" });
    if (selectedPlatforms.length === 0) return toast({ title: "Error", description: "Select at least one platform", variant: "destructive" });
    postMut.mutate({
      platforms: selectedPlatforms as any,
      caption,
      mediaUrls: mediaUrl ? [mediaUrl] : [],
      contentType: contentType as any,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Platform selector */}
      <div>
        <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 block">Post To</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => {
            const isConnected = connectedIds.includes(p.id);
            const isSelected = selectedPlatforms.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => isConnected && togglePlatform(p.id)}
                disabled={!isConnected}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                  !isConnected
                    ? "opacity-30 cursor-not-allowed bg-white/5 border-white/5 text-gray-500"
                    : isSelected
                    ? `bg-gradient-to-r ${p.gradient} text-white border-transparent shadow-lg`
                    : `bg-white/5 border-white/10 text-gray-300 hover:bg-white/10`
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.name}</span>
                {!isConnected && <span className="text-xs opacity-50">(not connected)</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content type */}
      <div>
        <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 block">Content Type</label>
        <div className="flex gap-2">
          {[
            { id: "video", label: "Video", icon: Video },
            { id: "image", label: "Photo", icon: Image },
            { id: "text", label: "Text Only", icon: FileText },
          ].map(ct => (
            <button
              key={ct.id}
              onClick={() => setContentType(ct.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                contentType === ct.id
                  ? "bg-purple-600 text-white border-purple-500"
                  : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
              }`}
            >
              <ct.icon className="w-4 h-4" />
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Media URL */}
      {contentType !== "text" && (
        <div>
          <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 block">
            {contentType === "video" ? "Video URL" : "Image URL"}
          </label>
          <input
            type="url"
            value={mediaUrl}
            onChange={e => setMediaUrl(e.target.value)}
            placeholder="https://cdn.creatorvault.live/..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
      )}

      {/* Caption */}
      <div>
        <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 block">Caption</label>
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Write your caption... AI will optimize it per platform automatically"
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
        />
        <div className="flex justify-between mt-1">
          <span className="text-gray-600 text-xs">{caption.length} chars</span>
          <span className="text-gray-600 text-xs">AI will add platform-specific hashtags</span>
        </div>
      </div>

      {/* Post button */}
      <button
        onClick={handlePost}
        disabled={postMut.isPending || selectedPlatforms.length === 0}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black text-lg hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-3 shadow-lg shadow-purple-900/30"
      >
        {postMut.isPending ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Posting...</>
        ) : (
          <><Send className="w-5 h-5" /> Post to {selectedPlatforms.length || "Selected"} Platform{selectedPlatforms.length !== 1 ? "s" : ""}</>
        )}
      </button>

      {/* Result */}
      {postResult && (
        <div className="p-4 rounded-2xl bg-green-900/20 border border-green-500/30">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-green-300 font-bold">Posted Successfully</span>
          </div>
          <div className="space-y-2">
            {postResult.results?.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">{r.platform}:</span>
                <span className={r.success ? "text-green-400" : "text-red-400"}>
                  {r.success ? "✓ Published" : `✗ ${r.error}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SCHEDULE TAB ─────────────────────────────────────────────────────────────
function ScheduleTab() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [caption, setCaption] = useState("");
  const [mediaUrls, setMediaUrls] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [contentType, setContentType] = useState("video");

  const { data: scheduledPosts, isLoading } = trpc.scheduler.getScheduledPosts.useQuery({ status: "scheduled" });
  const { data: optimalTimes } = trpc.scheduler.getOptimalPostingTimes.useQuery(
    { platform: (selectedPlatforms[0] || "instagram") as any },
    { enabled: selectedPlatforms.length > 0 }
  );

  const scheduleMut = trpc.scheduler.schedulePost.useMutation({
    onSuccess: () => {
      toast({ title: "Scheduled!", description: "Post scheduled!" });
      utils.scheduler.getScheduledPosts.invalidate();
      setCaption("");
      setMediaUrls("");
      setSelectedPlatforms([]);
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cancelMut = trpc.scheduler.cancelScheduledPost.useMutation({
    onSuccess: () => {
      utils.scheduler.getScheduledPosts.invalidate();
      toast({ title: "Cancelled", description: "Post cancelled" });
    },
  });

  const handleSchedule = () => {
    if (!caption.trim()) return toast({ title: "Error", description: "Add a caption", variant: "destructive" });
    if (selectedPlatforms.length === 0) return toast({ title: "Error", description: "Select platforms", variant: "destructive" });
    if (!scheduledDate || !scheduledTime) return toast({ title: "Error", description: "Set date and time", variant: "destructive" });

    const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
    scheduleMut.mutate({
      caption,
      platforms: selectedPlatforms as any,
      contentType: contentType as any,
      mediaUrls: mediaUrls ? [mediaUrls] : [],
      scheduledFor,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Schedule form */}
      <div className="space-y-5">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-400" />
          Schedule New Post
        </h3>

        {/* Platform selector */}
        <div>
          <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">Platforms</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPlatforms(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  selectedPlatforms.includes(p.id)
                    ? `bg-gradient-to-r ${p.gradient} text-white border-transparent`
                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                }`}
              >
                {p.icon} {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Optimal times */}
        {optimalTimes && (Array.isArray(optimalTimes) ? optimalTimes : (optimalTimes as any)?.times)?.length > 0 && (
          <div className="p-3 rounded-xl bg-purple-900/20 border border-purple-500/20">
            <p className="text-purple-300 text-xs font-bold mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Optimal posting times for {selectedPlatforms[0]}
            </p>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(optimalTimes) ? optimalTimes : (optimalTimes as any)?.times || []).slice(0, 4).map((t: any, i: number) => (
                <button
                  key={i}
                  onClick={() => {
                    const d = new Date(t);
                    setScheduledDate(d.toISOString().split("T")[0]);
                    setScheduledTime(d.toTimeString().slice(0, 5));
                  }}
                  className="px-2 py-1 rounded-lg bg-purple-800/40 text-purple-300 text-xs hover:bg-purple-800/60 transition-colors"
                >
                  {new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date/time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">Date</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">Time</label>
            <input
              type="time"
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>

        {/* Caption */}
        <div>
          <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">Caption</label>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Caption..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 resize-none"
          />
        </div>

        {/* Media URL */}
        <div>
          <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 block">Media URL</label>
          <input
            type="url"
            value={mediaUrls}
            onChange={e => setMediaUrls(e.target.value)}
            placeholder="https://cdn.creatorvault.live/..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        <button
          onClick={handleSchedule}
          disabled={scheduleMut.isPending}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {scheduleMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
          Schedule Post
        </button>
      </div>

      {/* Scheduled queue */}
      <div>
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          Scheduled Queue
          {scheduledPosts?.posts?.length > 0 && (
            <span className="ml-auto bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {scheduledPosts.posts.length}
            </span>
          )}
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : scheduledPosts?.posts?.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No scheduled posts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduledPosts?.posts?.map((post: any) => (
              <div key={post.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{post.caption || "No caption"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-500 text-xs">
                        {new Date(post.scheduledFor).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {post.platforms?.map((p: string) => (
                        <span key={p} className="text-xs bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">{p}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => cancelMut.mutate({ scheduleId: post.id })}
                    className="w-8 h-8 rounded-xl bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-all flex items-center justify-center flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AUTOPILOT TAB ────────────────────────────────────────────────────────────
function AutopilotTab() {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "tiktok"]);
  const [scheduleTime, setScheduleTime] = useState<"now" | "1h" | "6h" | "24h" | "optimal">("optimal");
  const [result, setResult] = useState<any>(null);

  const postMut = trpc.socialMediaAutoPoster.schedulePost.useMutation({
    onSuccess: (d) => {
      setResult(d);
      toast({ title: "Queued!", description: "Autopilot post queued!" });
    },
    onError: (e) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const getScheduledFor = (t: string) => {
    const d = new Date();
    if (t === "1h") d.setHours(d.getHours() + 1);
    else if (t === "6h") d.setHours(d.getHours() + 6);
    else if (t === "24h") d.setDate(d.getDate() + 1);
    else if (t === "optimal") d.setHours(d.getHours() + 3);
    return d.toISOString();
  };

  const handleAutoPost = () => {
    if (!content.trim()) return toast({ title: "Error", description: "Add content", variant: "destructive" });
    if (selectedPlatforms.length === 0) return toast({ title: "Error", description: "Select platforms", variant: "destructive" });
    postMut.mutate({
      content,
      platforms: selectedPlatforms,
      scheduledFor: getScheduledFor(scheduleTime),
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Autopilot header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-black">AI Autopilot</h3>
            <p className="text-gray-400 text-xs">AI optimizes and distributes your content automatically</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "Platform Optimization", desc: "AI rewrites for each platform" },
            { label: "Hashtag Intelligence", desc: "Trending tags auto-added" },
            { label: "Optimal Timing", desc: "Posts when your audience is active" },
          ].map(f => (
            <div key={f.label} className="p-3 rounded-xl bg-black/30 border border-white/5">
              <div className="text-white text-xs font-bold mb-1">{f.label}</div>
              <div className="text-gray-500 text-xs">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform selector */}
      <div>
        <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 block">Distribute To</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlatforms(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                selectedPlatforms.includes(p.id)
                  ? `bg-gradient-to-r ${p.gradient} text-white border-transparent shadow-lg`
                  : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
              }`}
            >
              {p.icon} {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Timing */}
      <div>
        <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 block">Post Timing</label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "now", label: "Now" },
            { id: "1h", label: "In 1 hour" },
            { id: "6h", label: "In 6 hours" },
            { id: "24h", label: "Tomorrow" },
            { id: "optimal", label: "⚡ Optimal Time" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setScheduleTime(t.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                scheduleTime === t.id
                  ? "bg-purple-600 text-white border-purple-500"
                  : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        <label className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 block">Content / Caption</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Paste your content, caption, or media URL here. AI will optimize it for each platform..."
          rows={5}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 resize-none"
        />
      </div>

      {/* Launch button */}
      <button
        onClick={handleAutoPost}
        disabled={postMut.isPending}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-black text-lg hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-3 shadow-lg shadow-purple-900/30"
      >
        {postMut.isPending ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
        ) : (
          <><Zap className="w-5 h-5" /> Launch Autopilot</>
        )}
      </button>

      {/* Result */}
      {result && (
        <div className="p-4 rounded-2xl bg-green-900/20 border border-green-500/30">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-green-300 font-bold">Autopilot Activated</span>
          </div>
          <div className="space-y-1">
            {result.scheduled?.map((r: any, i: number) => (
              <div key={i} className="text-sm text-gray-400">
                <span className="text-white">{r.platform}</span> → scheduled for {new Date(result.scheduledFor).toLocaleString()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
