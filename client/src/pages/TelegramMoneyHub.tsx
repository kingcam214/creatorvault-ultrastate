import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Send, ChevronLeft, Users, MessageSquare, TrendingUp,
  Plus, Trash2, CheckCircle, XCircle, RefreshCw, Video,
  Zap, Radio, Eye, Hash, Globe, Crown, WalletCards, Smartphone
} from "lucide-react";

function EngineStatusDot({ online }: { online: boolean }) {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%",
      background: online ? "#27AE60" : "#E74C3C",
      boxShadow: online ? "0 0 6px #27AE60" : "none",
    }} />
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "white" }}>{value}</div>
        <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      </div>
    </div>
  );
}

export function TelegramMoneyHub() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "broadcast" | "channels" | "leads" | "history">("overview");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedBot, setSelectedBot] = useState("main");
  const [newChannelId, setNewChannelId] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"channel" | "group" | "supergroup">("channel");

  const { data: overview, refetch: refetchOverview } = trpc.telegramHub.getHubOverview.useQuery();
  const { data: channelsData, refetch: refetchChannels } = trpc.telegramHub.getChannels.useQuery();
  const { data: leadsData } = trpc.telegramHub.getLeads.useQuery({ limit: 100 });
  const { data: historyData } = trpc.telegramHub.getMessageHistory.useQuery({ limit: 50 });
  const { data: botStatus, refetch: refetchBots } = trpc.telegramHub.checkBotStatus.useQuery();

  const broadcast = trpc.telegramHub.broadcastMessage.useMutation({
    onSuccess: (data) => {
      toast({ title: `Delivered to ${data.sent}/${data.total} audience lanes`, description: data.failed > 0 ? `${data.failed} lane needs attention` : "Every selected lane received the drop" });
      setBroadcastMsg("");
      refetchOverview();
    },
    onError: (err) => toast({ title: "Drop delivery needs attention", description: err.message, variant: "destructive" }),
  });

  const addChannel = trpc.telegramHub.addChannel.useMutation({
    onSuccess: () => {
      toast({ title: "Audience lane added" });
      setNewChannelId(""); setNewChannelName("");
      refetchChannels(); refetchOverview();
    },
    onError: (err) => toast({ title: "Audience lane could not be saved", description: err.message, variant: "destructive" }),
  });

  const removeChannel = trpc.telegramHub.removeChannel.useMutation({
    onSuccess: () => { toast({ title: "Audience lane removed" }); refetchChannels(); refetchOverview(); },
  });

  const activateAllSegments = trpc.telegramFunnel["acquisition.activateAllSegments"].useMutation({
    onSuccess: (data) => {
      toast({
        title: `Activated ${data.totalSegments} profit acquisition lanes`,
        description: `Covered segments: ${data.independentSegmentsCovered.join(", ")}`,
      });
      refetchOverview();
    },
    onError: (err) => toast({ title: "Acquisition engine needs attention", description: err.message, variant: "destructive" }),
  });

  const { data: miniAppRails, refetch: refetchMiniAppRails } = trpc.telegramFunnel["miniApp.packageRails"].useQuery({
    baseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
  });

  const createStarInvoice = trpc.telegramFunnel["stars.createPackageInvoice"].useMutation({
    onSuccess: (data) => {
      if (data.invoiceLink) window.open(data.invoiceLink, "_blank", "noopener,noreferrer");
      toast({
        title: data.success ? `${data.packageName} Stars invoice ready` : "Stars checkout rail needs a connected payment engine",
        description: data.success ? `${data.starPrice} Stars · ${data.segment}` : (data.error || "Connect the Telegram payment engine to unlock instant paid package checkout."),
        variant: data.success ? undefined : "destructive",
      });
      refetchMiniAppRails();
    },
    onError: (err) => toast({ title: "Stars checkout could not open", description: err.message, variant: "destructive" }),
  });

  const handleBroadcast = () => {
    if (!broadcastMsg.trim()) { toast({ title: "Write the drop before sending", variant: "destructive" }); return; }
    broadcast.mutate({
      message: broadcastMsg,
      channelIds: selectedChannels.length > 0 ? selectedChannels : undefined,
      botRole: selectedBot,
    });
  };

  const toggleChannel = (id: string) => {
    setSelectedChannels(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const channels = channelsData?.channels || [];
  const leads = leadsData?.leads || [];
  const history = historyData?.messages || [];
  const bots = botStatus?.bots || overview?.bots || [];

  const TABS = [
    { key: "overview", label: "Command", icon: TrendingUp },
    { key: "broadcast", label: "Drops", icon: Radio },
    { key: "channels", label: "Lanes", icon: Hash },
    { key: "leads", label: "Buyers", icon: Users },
    { key: "history", label: "Receipts", icon: MessageSquare },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080810", color: "white", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1a1a2e", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16, background: "#0a0a1a" }}>
        <Link href="/king">
          <button style={{ background: "none", border: "1px solid #333", borderRadius: 8, padding: "6px 12px", color: "#888", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <ChevronLeft size={14} /> King Hub
          </button>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#00D9FF22", border: "1px solid #00D9FF44", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Send size={16} color="#00D9FF" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Telegram Profit Command</div>
            <div style={{ fontSize: 11, color: "#666" }}>
              {bots.filter((b: any) => b.online).length}/{bots.length} engines live
              {bots.filter((b: any) => b.online).length > 0 && <span style={{ color: "#27AE60", marginLeft: 6 }}>● LIVE</span>}
            </div>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => { refetchOverview(); refetchBots(); }}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #333", background: "none", color: "#888", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid #1a1a2e", padding: "0 24px", display: "flex", gap: 4, background: "#09090f" }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            style={{ padding: "12px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 400, color: activeTab === tab.key ? "#00D9FF" : "#666", borderBottom: `2px solid ${activeTab === tab.key ? "#00D9FF" : "transparent"}`, display: "flex", alignItems: "center", gap: 6 }}>
            <tab.icon size={13} /> {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 24 }}>
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div>
            <div style={{ background: "radial-gradient(circle at top left, #00D9FF22, transparent 34%), linear-gradient(135deg, #061621, #120817 58%, #1a1203)", border: "1px solid #00D9FF44", borderRadius: 18, padding: 22, marginBottom: 20, boxShadow: "0 0 60px rgba(0,217,255,0.10)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(240px, 0.75fr)", gap: 18, alignItems: "end" }}>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: 999, border: "1px solid #C9A84C55", background: "#C9A84C14", color: "#f0d27a", fontSize: 11, fontWeight: 900, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>
                    <Crown size={13} /> Raw footage to paid Telegram packages
                  </div>
                  <div style={{ fontSize: 30, lineHeight: 1.08, fontWeight: 950, letterSpacing: -0.8, maxWidth: 760 }}>Turn attention into unlocks with a polished, consent-first Telegram revenue lane.</div>
                  <div style={{ color: "#b9c8d0", fontSize: 13, lineHeight: 1.65, marginTop: 12, maxWidth: 760 }}>
                    Build buyer paths for Body Cinema drops, route every segment into the right lane, and sell final packages through Telegram Mini App and Stars checkout when the monetization engine is connected.
                  </div>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {["Studio acquisition", "Buyer-ready package rails", "Approved Telegram delivery", "No deepfake positioning"].map((item) => (
                    <div key={item} style={{ padding: "10px 12px", border: "1px solid #ffffff14", background: "#ffffff08", borderRadius: 10, color: "#e8fbff", fontSize: 12, fontWeight: 800 }}>{item}</div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
              <StatCard icon={Hash} label="Audience Lanes" value={overview?.totalChannels || 0} color="#00D9FF" />
              <StatCard icon={MessageSquare} label="Drops Sent" value={overview?.totalMessages || 0} color="#C9A84C" />
              <StatCard icon={Users} label="Captured Buyers" value={overview?.totalLeads || 0} color="#27AE60" />
              <StatCard icon={Zap} label="Live Engines" value={`${overview?.activeBots || 0}/4`} color="#9B59B6" />
            </div>

            {/* Domination Activation */}
            <div style={{ background: "linear-gradient(135deg, #1a1203, #0f0f1a)", border: "1px solid #C9A84C55", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "#C9A84C22", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #C9A84C55" }}>
                  <Crown size={20} color="#C9A84C" />
                </div>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "white" }}>Telegram Profit Acquisition Engine</div>
                  <div style={{ fontSize: 12, color: "#bca76a", lineHeight: 1.5 }}>
                    Creates tracked campaign lanes for studios, platforms, distributors, indie creators, solo talent, and private groups so every audience has a clean path from curiosity to paid package.
                  </div>
                </div>
                <button onClick={() => activateAllSegments.mutate({ sendNow: false, refreshFunnels: true })} disabled={activateAllSegments.isPending}
                  style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: activateAllSegments.isPending ? "#2a2414" : "linear-gradient(135deg, #C9A84C, #F0D27A)", color: activateAllSegments.isPending ? "#777" : "#0a0a0a", cursor: activateAllSegments.isPending ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", gap: 7 }}>
                  {activateAllSegments.isPending ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Lighting the lanes...</> : <><Zap size={14} /> Light Up Every Segment</>}
                </button>
              </div>
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                {["Studios", "Platforms", "Distributors", "Indie Creators", "Solo Operators", "Small Groups"].map((item) => (
                  <div key={item} style={{ padding: "8px 10px", background: "#0a0a1a", border: "1px solid #C9A84C22", borderRadius: 8, fontSize: 11, color: "#d8c57d", fontWeight: 700 }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Telegram Mini App + Stars Native Checkout */}
            <div style={{ background: "linear-gradient(135deg, #051416, #0f0f1a)", border: "1px solid #00D9FF55", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "#00D9FF22", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #00D9FF55" }}>
                  <Smartphone size={20} color="#00D9FF" />
                </div>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "white" }}>Telegram Mini App + Stars Checkout</div>
                  <div style={{ fontSize: 12, color: "#8fddea", lineHeight: 1.5 }}>
                    Native Telegram package entry turns interest into paid unlocks. Stars invoices open instantly once the monetization lane is connected and approved.
                  </div>
                </div>
                <a href={miniAppRails?.miniAppEntry || "/vaultx?source=telegram_mini_app"} target="_blank" rel="noreferrer"
                  style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #00D9FF55", background: "#00D9FF18", color: "#9ceeff", cursor: "pointer", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", gap: 7, textDecoration: "none" }}>
                  <Smartphone size={14} /> Preview Buyer Path
                </a>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                {(miniAppRails?.packages || []).map((pkg: any) => (
                  <div key={pkg.segment} style={{ padding: 12, background: "#0a0a1a", border: "1px solid #00D9FF22", borderRadius: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#dffbff", marginBottom: 4 }}>{pkg.packageName}</div>
                    <div style={{ fontSize: 11, color: "#7fb8c2", marginBottom: 8 }}>{pkg.label} · {pkg.starPrice} Stars</div>
                    {pkg.deliveryContract && (
                      <div style={{ border: "1px solid #C9A84C33", background: "#1b160822", borderRadius: 8, padding: 8, marginBottom: 10 }}>
                        <div style={{ fontSize: 10, color: "#f0d27a", fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>What gets delivered</div>
                        <div style={{ fontSize: 11, color: "#e9faff", lineHeight: 1.45, marginBottom: 6 }}>{pkg.deliveryContract.saleClaim}</div>
                        <div style={{ fontSize: 10, color: "#9bd5dd", lineHeight: 1.45 }}>
                          {(pkg.deliveryContract.deliveredFiles || []).slice(0, 3).join(" · ")}
                        </div>
                        <div style={{ fontSize: 10, color: "#7fb8c2", marginTop: 6 }}>
                          CTA: {pkg.deliveryContract.primaryCTA} · Buyer proof unlocks final package release
                        </div>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <a href={pkg.miniAppUrl} target="_blank" rel="noreferrer" style={{ padding: "7px 9px", borderRadius: 8, background: "#00D9FF18", border: "1px solid #00D9FF33", color: "#9ceeff", fontSize: 11, fontWeight: 800, textDecoration: "none" }}>Mini App</a>
                      <button onClick={() => createStarInvoice.mutate({ segment: pkg.segment, trackingCode: pkg.trackingCode, baseUrl: typeof window !== "undefined" ? window.location.origin : undefined })} disabled={createStarInvoice.isPending}
                        style={{ padding: "7px 9px", borderRadius: 8, background: createStarInvoice.isPending ? "#182326" : "#C9A84C22", border: "1px solid #C9A84C44", color: createStarInvoice.isPending ? "#666" : "#f0d27a", fontSize: 11, fontWeight: 900, cursor: createStarInvoice.isPending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                        <WalletCards size={11} /> Stars Invoice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Engines */}
            <div style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <Zap size={14} color="#9B59B6" /> Delivery Engines
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                {bots.map((engine: any, index: number) => (
                  <div key={engine.name || index} style={{ padding: "12px 14px", background: "#0a0a1a", borderRadius: 8, border: `1px solid ${engine.online ? "#27AE6033" : "#1a1a2e"}`, display: "flex", alignItems: "center", gap: 10 }}>
                    <EngineStatusDot online={engine.online} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: engine.online ? "#e0e0e0" : "#555" }}>{engine.username ? `Engine ${index + 1}` : (engine.name ? `${engine.name} Engine` : `Engine ${index + 1}`)}</div>
                      <div style={{ fontSize: 11, color: "#555", textTransform: "capitalize" }}>{engine.role}</div>
                    </div>
                    <div style={{ marginLeft: "auto", fontSize: 11, color: engine.online ? "#27AE60" : "#E74C3C", fontWeight: 700 }}>
                      {engine.online ? "LIVE" : "ACTION NEEDED"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Broadcast */}
            <div style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <Radio size={14} color="#00D9FF" /> Fast Drop
              </div>
              <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                placeholder="Write the drop: hook, benefit, scarcity, package link, and buyer instruction."
                rows={4} style={{ width: "100%", padding: "12px", background: "#0a0a1a", border: "1px solid #1a1a2e", borderRadius: 8, color: "white", fontSize: 13, lineHeight: 1.6, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                <select value={selectedBot} onChange={e => setSelectedBot(e.target.value)}
                  style={{ padding: "8px 12px", background: "#0a0a1a", border: "1px solid #1a1a2e", borderRadius: 8, color: "#888", fontSize: 12, cursor: "pointer" }}>
                  <option value="main">Main Delivery Engine</option>
                  <option value="recruiter">Acquisition Engine</option>
                  <option value="engagement">Engagement Engine</option>
                  <option value="monetization">Checkout Engine</option>
                </select>
                <span style={{ fontSize: 12, color: "#555" }}>→ {selectedChannels.length > 0 ? `${selectedChannels.length} selected` : "all audience lanes"}</span>
                <button onClick={handleBroadcast} disabled={broadcast.isPending || !broadcastMsg.trim()}
                  style={{ marginLeft: "auto", padding: "8px 20px", borderRadius: 8, border: "none", background: broadcast.isPending ? "#1a1a2e" : "#00D9FF", color: broadcast.isPending ? "#555" : "#000", cursor: broadcast.isPending ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  {broadcast.isPending ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Delivering...</> : <><Send size={13} /> Send Drop</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Broadcast Tab */}
        {activeTab === "broadcast" && (
          <div style={{ maxWidth: 800 }}>
            <div style={{ marginBottom: 20, fontSize: 18, fontWeight: 800 }}>Drop Composer</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>
              <div>
                <label style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 8 }}>Drop script</label>
                <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                  placeholder="VIP drop incoming: lead with the tease, name the package, state the unlock, add scarcity, and close with the link."
                  rows={12} style={{ width: "100%", padding: "14px", background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 10, color: "white", fontSize: 14, lineHeight: 1.7, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <select value={selectedBot} onChange={e => setSelectedBot(e.target.value)}
                    style={{ padding: "8px 12px", background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 8, color: "#888", fontSize: 12, cursor: "pointer" }}>
                    <option value="main">Main Delivery Engine</option>
                    <option value="recruiter">Acquisition Engine</option>
                    <option value="engagement">Engagement Engine</option>
                    <option value="monetization">Checkout Engine</option>
                  </select>
                  <button onClick={handleBroadcast} disabled={broadcast.isPending || !broadcastMsg.trim()}
                    style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: broadcast.isPending ? "#1a1a2e" : "linear-gradient(135deg, #00D9FF, #0099BB)", color: broadcast.isPending ? "#555" : "#000", cursor: broadcast.isPending ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {broadcast.isPending ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Delivering...</> : <><Send size={14} /> Send to {selectedChannels.length > 0 ? `${selectedChannels.length} lanes` : "all lanes"}</>}
                  </button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Target Audience Lanes</div>
                <div style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#888" }}>{channels.length} lanes</span>
                    <button onClick={() => setSelectedChannels(selectedChannels.length === channels.length ? [] : channels.map((c: any) => c.id))}
                      style={{ fontSize: 11, color: "#00D9FF", background: "none", border: "none", cursor: "pointer" }}>
                      {selectedChannels.length === channels.length ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  {channels.length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", color: "#444", fontSize: 13 }}>No audience lanes connected yet</div>
                  ) : (
                    channels.map((ch: any) => (
                      <div key={ch.id} onClick={() => toggleChannel(ch.id)}
                        style={{ padding: "10px 14px", borderBottom: "1px solid #1a1a2e", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: selectedChannels.includes(ch.id) ? "#00D9FF10" : "none" }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${selectedChannels.includes(ch.id) ? "#00D9FF" : "#333"}`, background: selectedChannels.includes(ch.id) ? "#00D9FF" : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {selectedChannels.includes(ch.id) && <CheckCircle size={10} color="#000" />}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#e0e0e0" }}>{ch.channel_name}</div>
                          <div style={{ fontSize: 11, color: "#555" }}>{ch.channel_id} · {ch.channel_type}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Channels Tab */}
        {activeTab === "channels" && (
          <div>
            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Audience Lanes</div>
            </div>
            {/* Add Channel */}
            <div style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "#888" }}>Add Audience Lane</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newChannelId} onChange={e => setNewChannelId(e.target.value)}
                  placeholder="Telegram channel, group link, or saved delivery lane"
                  style={{ flex: 1, padding: "10px 12px", background: "#0a0a1a", border: "1px solid #1a1a2e", borderRadius: 8, color: "white", fontSize: 13, outline: "none" }} />
                <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
                  placeholder="Audience lane name"
                  style={{ flex: 1, padding: "10px 12px", background: "#0a0a1a", border: "1px solid #1a1a2e", borderRadius: 8, color: "white", fontSize: 13, outline: "none" }} />
                <select value={newChannelType} onChange={e => setNewChannelType(e.target.value as any)}
                  style={{ padding: "10px 12px", background: "#0a0a1a", border: "1px solid #1a1a2e", borderRadius: 8, color: "#888", fontSize: 12, cursor: "pointer" }}>
                  <option value="channel">Channel</option>
                  <option value="group">Group</option>
                  <option value="supergroup">Supergroup</option>
                </select>
                <button onClick={() => { if (!newChannelId || !newChannelName) { toast({ title: "Fill in all fields", variant: "destructive" }); return; } addChannel.mutate({ channelId: newChannelId, channelName: newChannelName, channelType: newChannelType }); }}
                  disabled={addChannel.isPending}
                  style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#00D9FF", color: "#000", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <Plus size={14} /> Save Lane
                </button>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "#555" }}>
                Use an approved Telegram channel or private group where your delivery engine is an admin before saving the lane.
              </div>
            </div>
            {/* Channel List */}
            {channels.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#444" }}>
                <Hash size={40} style={{ marginBottom: 12 }} />
                <div>No audience lanes connected yet. Add the first Telegram lane, then start sending paid-drop campaigns.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {channels.map((ch: any) => (
                  <div key={ch.id} style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: "#00D9FF20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Hash size={16} color="#00D9FF" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#e0e0e0" }}>{ch.channel_name}</div>
                      <div style={{ fontSize: 12, color: "#555" }}>{ch.channel_id} · {ch.channel_type}</div>
                    </div>
                    <button onClick={() => removeChannel.mutate({ channelId: ch.id })}
                      style={{ padding: "6px", borderRadius: 6, border: "1px solid #E74C3C33", background: "none", color: "#E74C3C", cursor: "pointer" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Leads Tab */}
        {activeTab === "leads" && (
          <div>
            <div style={{ marginBottom: 20, fontSize: 18, fontWeight: 700 }}>Buyer Signals ({leads.length})</div>
            {leads.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#444" }}>
                <Users size={40} style={{ marginBottom: 12 }} />
                <div>No buyer signals yet. They appear as soon as people tap, reply, or enter your Telegram package lanes.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {leads.map((lead: any) => (
                  <div key={lead.id} style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#9B59B620", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Users size={16} color="#9B59B6" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e0e0e0" }}>{lead.first_name || lead.username || "Unknown"} {lead.last_name || ""}</div>
                      <div style={{ fontSize: 11, color: "#555" }}>@{lead.username || "no username"} · {lead.telegram_user_id || lead.telegramUserId}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "#555" }}>{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ""}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div>
            <div style={{ marginBottom: 20, fontSize: 18, fontWeight: 700 }}>Delivery Receipts</div>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#444" }}>
                <MessageSquare size={40} style={{ marginBottom: 12 }} />
                <div>No drops sent yet. Your delivery receipts will appear here after the first campaign.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {history.map((msg: any) => (
                  <div key={msg.id} style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: "#888" }}>{msg.channel_name || "Direct lane"}</span>
                      <span style={{ fontSize: 11, color: "#555" }}>{msg.sent_at ? new Date(msg.sent_at).toLocaleString() : ""}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                      {msg.message_text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: #444; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0a0a1a; } ::-webkit-scrollbar-thumb { background: #1a1a2e; border-radius: 2px; }
        select option { background: #0f0f1a; }
      `}</style>
    </div>
  );
}

export default TelegramMoneyHub;
