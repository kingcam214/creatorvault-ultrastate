import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "../hooks/use-toast";
import {
  ArrowUpRight, BadgeCheck, Bell, Bookmark, CheckCircle2, ChevronRight,
  CircleDollarSign, Flame, Heart, Loader2, MessageCircle, Play, Plus,
  Send, Sparkles, Users, Video, Wallet, Zap,
} from "lucide-react";

const packagePlatforms = [
  { id: "native", label: "CreatorVault", sub: "Native post", tone: "from-violet-500 to-fuchsia-500" },
  { id: "telegram", label: "Telegram", sub: "Tracked drop", tone: "from-sky-500 to-cyan-500" },
  { id: "instagram", label: "Instagram", sub: "Vertical teaser", tone: "from-pink-500 to-orange-400" },
  { id: "tiktok", label: "TikTok", sub: "Vertical teaser", tone: "from-cyan-400 to-slate-900" },
  { id: "youtube", label: "YouTube", sub: "Short", tone: "from-red-500 to-rose-700" },
  { id: "twitter", label: "X", sub: "Hook post", tone: "from-slate-500 to-slate-900" },
] as const;

const ctas = [
  ["follow", "Follow"], ["message", "Message"], ["subscribe", "Subscribe"],
  ["unlock", "Unlock"], ["shop", "Shop"], ["join", "Join"],
] as const;

function money(cents?: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((Number(cents || 0)) / 100);
}

export default function SocialHub() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [feedMode, setFeedMode] = useState<"for_you" | "following">("for_you");
  const [packageOpen, setPackageOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["native", "telegram"]);
  const [caption, setCaption] = useState("");
  const [ctaType, setCtaType] = useState<string>("subscribe");

  const command = trpc.socialSpine.commandSummary.useQuery();
  const feed = trpc.socialSpine.feed.useQuery({ mode: feedMode, limit: 12 });
  const media = trpc.mediaAssets.list.useQuery({ filter: "videos", limit: 24 });
  const channels = trpc.distribution["channel.list"].useQuery();
  const accounts = trpc.distribution["account.list"].useQuery({});
  const notifications = trpc.socialSpine.notifications.useQuery({ limit: 12 });

  const packageMut = trpc.socialSpine.packageFromMedia.useMutation({
    onSuccess: (result) => {
      toast({ title: "Your social package is ready", description: `${result.distributionJobIds.length} external draft${result.distributionJobIds.length === 1 ? "" : "s"} are waiting for approval.` });
      setPackageOpen(false);
      utils.socialSpine.commandSummary.invalidate();
      utils.socialSpine.feed.invalidate();
    },
    onError: (error) => toast({ title: "Package not prepared", description: error.message, variant: "destructive" }),
  });
  const followMut = trpc.socialSpine.follow.useMutation({ onSuccess: () => utils.socialSpine.feed.invalidate() });
  const reactMut = trpc.socialSpine.react.useMutation({ onSuccess: () => utils.socialSpine.feed.invalidate() });
  const saveMut = trpc.socialSpine.save.useMutation({ onSuccess: () => utils.socialSpine.feed.invalidate() });

  const connected = Array.isArray(command.data?.accounts) ? command.data.accounts : [];
  const activeAccounts = connected.filter((account: any) => account.connection_status === "active" || account.connection_status === "legacy_imported");
  const distribution = Array.isArray(command.data?.distribution) ? command.data.distribution : [];
  const awaitingApproval = distribution.filter((row: any) => ["draft", "ready", "scheduled"].includes(row.status)).reduce((sum: number, row: any) => sum + Number(row.count || 0), 0);
  const readyMedia = Array.isArray(media.data) ? media.data : [];
  const feedItems = feed.data?.items || [];
  const selectedAsset = readyMedia.find((asset: any) => String(asset.id) === selectedAssetId);
  const selectedChannel = (channels.data || []).find((channel: any) => String(channel.id) === selectedChannelId);
  const totalNotifications = (notifications.data || []).filter((item: any) => !item.is_read).length;

  const canPrepare = Boolean(selectedAssetId && selectedChannelId && selectedPlatforms.length && caption.trim());
  const creatorMetrics = useMemo(() => [
    { label: "Connected paths", value: activeAccounts.length, icon: BadgeCheck, tone: "text-cyan-300" },
    { label: "Drafts awaiting you", value: awaitingApproval, icon: Send, tone: "text-amber-300" },
    { label: "People following", value: Number(command.data?.audience?.followers || 0), icon: Users, tone: "text-violet-300" },
    { label: "Direct earnings", value: money(command.data?.money?.creator_earnings_cents), icon: Wallet, tone: "text-emerald-300" },
  ], [activeAccounts.length, awaitingApproval, command.data]);

  function togglePlatform(platform: string) {
    setSelectedPlatforms((current) => current.includes(platform) ? current.filter((entry) => entry !== platform) : [...current, platform]);
  }

  function preparePackage() {
    if (!canPrepare) return;
    packageMut.mutate({
      sourceAssetId: selectedAssetId,
      channelIdentityId: Number(selectedChannelId),
      destinationUrl: "https://creatorvault.live/vault-x",
      title: selectedAsset?.originalName || selectedAsset?.fileName || "CreatorVault social package",
      purpose: "audience_growth",
      caption,
      platforms: selectedPlatforms as any,
      ctaType: ctaType as any,
      ctaPayload: { origin: "social_empire" },
    });
  }

  return (
    <main className="min-h-screen bg-[#07070a] text-white selection:bg-fuchsia-500/40">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-56 left-[8%] h-[38rem] w-[38rem] rounded-full bg-fuchsia-600/15 blur-[130px]" />
        <div className="absolute top-[28rem] right-[-16rem] h-[34rem] w-[34rem] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-7 sm:px-6 lg:px-8">
        <header className="mb-7 flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-fuchsia-300">
              <Sparkles className="h-3.5 w-3.5" /> CreatorVault Social Empire
            </div>
            <h1 className="max-w-2xl text-4xl font-black leading-none tracking-[-0.055em] sm:text-5xl">
              Your content is not a post. <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-violet-300 to-cyan-300">It is your empire.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
              Build one real social package from a creator-owned video, publish inside CreatorVault, and prepare governed external drafts with tracked money paths. Nothing posts outside CreatorVault until you approve it.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-right sm:block">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Outbound automation</div>
              <div className="mt-1 flex items-center justify-end gap-2 text-sm font-bold text-amber-200"><span className="h-2 w-2 rounded-full bg-amber-400" /> Approval-controlled</div>
            </div>
            <button onClick={() => setPackageOpen(true)} className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-fuchsia-100">
              <Plus className="h-4 w-4" /> Build My Social Package
            </button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {creatorMetrics.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-sm">
              <Icon className={`h-4 w-4 ${tone}`} />
              <div className="mt-5 text-2xl font-black tracking-tight">{value}</div>
              <div className="mt-1 text-xs text-zinc-500">{label}</div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-7 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">CreatorVault Live Feed</div>
                <h2 className="mt-1 text-2xl font-black tracking-tight">Visual proof of your creator world</h2>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-1">
                {(["for_you", "following"] as const).map((mode) => (
                  <button key={mode} onClick={() => setFeedMode(mode)} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${feedMode === mode ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}>
                    {mode === "for_you" ? "For You" : "Following"}
                  </button>
                ))}
              </div>
            </div>

            {feed.isLoading ? <FeedSkeleton /> : feedItems.length ? (
              <div className="grid gap-5 md:grid-cols-2">
                {feedItems.map((post: any) => (
                  <article key={post.id} className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#101015] shadow-2xl shadow-black/30">
                    <div className="relative aspect-[9/14] overflow-hidden bg-black">
                      {post.mediaUrl ? <video src={post.mediaUrl} poster={post.thumbnailUrl || undefined} className="h-full w-full object-cover" muted loop autoPlay playsInline preload="metadata" /> : <div className="grid h-full place-items-center text-zinc-600"><Video className="h-10 w-10" /></div>}
                      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />
                      <div className="absolute left-4 top-4 flex items-center gap-2">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-fuchsia-400 to-violet-600 text-xs font-black">{String(post.creator?.name || "C").slice(0, 1)}</div>
                        <div><div className="text-sm font-black">{post.creator?.name || "Creator"}</div><div className="text-[11px] text-zinc-300">@{post.creator?.username || "creator"}</div></div>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent px-4 pb-4 pt-20">
                        {post.body && <p className="max-w-sm text-sm font-medium leading-relaxed text-white">{post.body}</p>}
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ActionButton active={post.likedByViewer} icon={Heart} label={post.reactions} onClick={() => reactMut.mutate({ postId: post.id, reactionType: "like" })} />
                            <ActionButton icon={MessageCircle} label={post.comments} onClick={() => toast({ title: "Reply from the moment", description: "Comments are part of the native Social Empire record." })} />
                            <ActionButton active={post.savedByViewer} icon={Bookmark} label={post.saves} onClick={() => saveMut.mutate({ postId: post.id })} />
                          </div>
                          {post.ctaType && <button className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-black">{String(post.ctaType).toUpperCase()}</button>}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <section className="overflow-hidden rounded-[2rem] border border-dashed border-white/15 bg-gradient-to-br from-violet-950/45 via-[#12111b] to-cyan-950/25 p-7 sm:p-10">
                <div className="max-w-md">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-black"><Play className="h-5 w-5 fill-current" /></div>
                  <h3 className="mt-6 text-3xl font-black tracking-tight">Your first visual moment starts with a real clip.</h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">Choose a video already inside CreatorVault. The package builder will create a native post and approval-controlled external drafts from that exact owned source—no download, no re-upload, no pretend publish.</p>
                  <button onClick={() => setPackageOpen(true)} className="mt-6 inline-flex items-center gap-2 text-sm font-black text-fuchsia-300 hover:text-fuchsia-200">Choose an existing video <ArrowUpRight className="h-4 w-4" /></button>
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5">
              <div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Your active audience</div><h3 className="mt-1 text-lg font-black">The people behind your money</h3></div><Users className="h-5 w-5 text-cyan-300" /></div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <MiniMetric label="Fans" value={command.data?.audience?.followers || 0} />
                <MiniMetric label="Subscribers" value={command.data?.audience?.subscribers || 0} />
                <MiniMetric label="Conversations" value={command.data?.audience?.conversations || 0} />
              </div>
              <p className="mt-4 text-xs leading-relaxed text-zinc-500">Counts are first-party CreatorVault records only. External followers and platform analytics appear here only when a verified account read exists.</p>
            </section>

            <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5">
              <div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Connected routes</div><h3 className="mt-1 text-lg font-black">Use what is actually connected</h3></div><CheckCircle2 className="h-5 w-5 text-emerald-300" /></div>
              <div className="mt-4 space-y-2">
                {accounts.isLoading ? <div className="h-16 animate-pulse rounded-xl bg-white/5" /> : activeAccounts.length ? activeAccounts.slice(0, 5).map((account: any) => <div key={`${account.platform}-${account.id}`} className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2.5"><span className="text-sm font-bold capitalize">{account.platform}</span><span className="text-[10px] font-black uppercase tracking-wide text-emerald-300">{account.connection_status}</span></div>) : <p className="rounded-xl border border-dashed border-white/10 p-3 text-xs leading-relaxed text-zinc-500">No verified external route is available in the canonical account record yet. Social packages can still prepare your native post and external drafts safely.</p>}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-amber-500/10 to-transparent p-5">
              <div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/60">Signals that need you</div><h3 className="mt-1 text-lg font-black">Your response queue</h3></div><Bell className="h-5 w-5 text-amber-300" /></div>
              <div className="mt-4 space-y-3">
                {notifications.data?.length ? notifications.data.slice(0, 4).map((note: any) => <div key={note.id} className="border-l-2 border-amber-300/70 pl-3 text-xs text-zinc-300">{note.message || note.event_type}</div>) : <p className="text-xs leading-relaxed text-zinc-500">Native follows, comments, replies, reactions, PPV purchases, and messages will appear here as durable CreatorVault signals.</p>}
              </div>
            </section>
          </aside>
        </section>
      </div>

      {packageOpen && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 backdrop-blur-md sm:p-8">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-[#111117] shadow-2xl shadow-black">
          <div className="flex items-start justify-between border-b border-white/10 p-6">
            <div><div className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-300">Use this everywhere</div><h2 className="mt-1 text-3xl font-black tracking-tight">Build a real social package</h2><p className="mt-2 max-w-xl text-sm text-zinc-400">This creates a native CreatorVault post and durable external distribution drafts from one owned video. It does not publish outside CreatorVault.</p></div>
            <button onClick={() => setPackageOpen(false)} className="rounded-xl bg-white/5 px-3 py-2 text-sm font-bold text-zinc-400 hover:bg-white/10 hover:text-white">Close</button>
          </div>
          <div className="grid gap-7 p-6 lg:grid-cols-[1.1fr_.9fr]">
            <div className="space-y-6">
              <div><label className="mb-3 block text-xs font-black uppercase tracking-[0.16em] text-zinc-500">1. Choose your owned video</label><div className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">{readyMedia.map((asset: any) => <button key={asset.id} onClick={() => setSelectedAssetId(String(asset.id))} className={`group overflow-hidden rounded-2xl border text-left transition ${selectedAssetId === String(asset.id) ? "border-fuchsia-400 ring-2 ring-fuchsia-400/30" : "border-white/10 hover:border-white/30"}`}><div className="relative aspect-[9/12] bg-black">{asset.publicUrl ? <video src={asset.publicUrl} poster={asset.thumbnailUrl || undefined} muted preload="metadata" className="h-full w-full object-cover" /> : null}<span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-1.5 py-1 text-[9px] font-bold">{asset.duration ? `${Math.round(asset.duration)}s` : "VIDEO"}</span></div><div className="truncate px-2 py-2 text-[11px] font-bold text-zinc-300">{asset.originalName || asset.fileName}</div></button>)}</div>{!readyMedia.length && <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-zinc-500">No ready CreatorVault videos are available to package yet.</p>}</div>
              <div><label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-zinc-500">2. Give this moment its voice</label><textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="What should this moment make fans feel or do?" rows={4} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-fuchsia-400/60 focus:outline-none" /></div>
              <div><label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-zinc-500">3. Build money into the moment</label><div className="flex flex-wrap gap-2">{ctas.map(([id, label]) => <button key={id} onClick={() => setCtaType(id)} className={`rounded-full px-3 py-2 text-xs font-black ${ctaType === id ? "bg-white text-black" : "border border-white/10 text-zinc-400 hover:text-white"}`}>{label}</button>)}</div></div>
            </div>
            <div className="space-y-6 rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
              <div><label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Canonical identity</label><select value={selectedChannelId} onChange={(event) => setSelectedChannelId(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#16161f] px-3 py-3 text-sm text-white focus:outline-none"> <option value="">Choose your CreatorVault identity</option>{(channels.data || []).map((channel: any) => <option key={channel.id} value={channel.id}>{channel.display_name} · {channel.brand_lane}</option>)}</select>{selectedChannel && <p className="mt-2 text-xs text-zinc-500">Policy lane: {selectedChannel.content_safety_level}. External drafts are checked against this lane before they exist.</p>}</div>
              <div><label className="mb-3 block text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Choose your package</label><div className="space-y-2">{packagePlatforms.map((platform) => <button key={platform.id} onClick={() => togglePlatform(platform.id)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition ${selectedPlatforms.includes(platform.id) ? "border-transparent bg-gradient-to-r " + platform.tone + " text-white" : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/25"}`}><span><span className="block text-sm font-black">{platform.label}</span><span className="block text-[11px] opacity-70">{platform.sub}</span></span>{selectedPlatforms.includes(platform.id) && <CheckCircle2 className="h-4 w-4" />}</button>)}</div></div>
              <div className="rounded-xl border border-amber-300/15 bg-amber-300/5 p-3 text-xs leading-relaxed text-amber-100/70"><Zap className="mr-1 inline h-3.5 w-3.5 text-amber-300" /> External destinations stay in draft and require their existing approval-controlled publishing path. This package does not schedule or publish anything automatically.</div>
              <button disabled={!canPrepare || packageMut.isPending} onClick={preparePackage} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-sm font-black text-black transition hover:bg-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-40">{packageMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Prepare My Social Package</button>
            </div>
          </div>
        </div>
      </div>}
    </main>
  );
}

function ActionButton({ icon: Icon, label, active, onClick }: { icon: any; label: number; active?: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-bold transition ${active ? "bg-fuchsia-500 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}><Icon className={`h-3.5 w-3.5 ${Icon === Heart && active ? "fill-current" : ""}`} />{label}</button>;
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-black/30 px-1 py-3"><div className="text-lg font-black">{Number(value || 0).toLocaleString()}</div><div className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-500">{label}</div></div>;
}

function FeedSkeleton() {
  return <div className="grid gap-5 md:grid-cols-2"><div className="aspect-[9/14] animate-pulse rounded-[1.5rem] bg-white/5" /><div className="aspect-[9/14] animate-pulse rounded-[1.5rem] bg-white/5" /></div>;
}
