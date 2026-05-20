import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Send, ChevronLeft, Bot, Users, MessageSquare, TrendingUp,
  Plus, Trash2, CheckCircle, XCircle, RefreshCw, Video,
  Zap, Radio, Eye, Hash, Globe, Crown, WalletCards, Smartphone
} from "lucide-react";

function BotStatusDot({ online }: { online: boolean }) {
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
      toast({ title: `Sent to ${data.sent}/${data.total} channels`, description: data.failed > 0 ? `${data.failed} failed` : "All delivered" });
      setBroadcastMsg("");
      refetchOverview();
    },
    onError: (err) => toast({ title: "Broadcast failed", description: err.message, variant: "destructive" }),
  });

  const addChannel = trpc.telegramHub.addChannel.useMutation({
    onSuccess: () => {
      toast({ title: "Channel added" });
      setNewChannelId(""); setNewChannelName("");
      refetchChannels(); refetchOverview();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeChannel = trpc.telegramHub.removeChannel.useMutation({
    onSuccess: () => { toast({ title: "Channel removed" }); refetchChannels(); refetchOverview(); },
  });

  const activateAllSegments = trpc.telegramFunnel["acquisition.activateAllSegments"].useMutation({
    onSuccess: (data) => {
      toast({
        title: `Activated ${data.totalSegments} creator acquisition lanes`,
        description: `Indie coverage: ${data.independentSegmentsCovered.join(", ")}`,
      });
      refetchOverview();
    },
    onError: (err) => toast({ title: "Acquisition activation failed", description: err.message, variant: "destructive" }),
  });

  const { data: miniAppRails, refetch: refetchMiniAppRails } = trpc.telegramFunnel["miniApp.packageRails"].useQuery({
    baseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
  });

  const createStarInvoice = trpc.telegramFunnel["stars.createPackageInvoice"].useMutation({
    onSuccess: (data) => {
      if (data.invoiceLink) window.open(data.invoiceLink, "_blank", "noopener,noreferrer");
      toast({
        title: data.success ? `${data.packageName} Stars invoice ready` : "Stars invoice needs bot configuration",
        description: data.success ? `${data.starPrice} Stars · ${data.segment}` : (data.error || "Check Telegram monetization bot token / Stars setup."),
        variant: data.success ? undefined : "destructive",
      });
      refetchMiniAppRails();
    },
    onError: (err) => toast({ title: "Stars invoice failed", description: err.message, variant: "destructive" }),
  });

  const handleBroadcast = () => {
    if (!broadcastMsg.trim()) { toast({ title: "Enter a message", variant: "destructive" }); return; }
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
    { key: "overview", label: "Overview", icon: TrendingUp },
    { key: "broadcast", label: "Broadcast", icon: Radio },
    { key: "channels", label: "Channels", icon: Hash },
    { key: "leads", label: "Leads", icon: Users },
    { key: "history", label: "History", icon: MessageSquare },
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
            <div style={{ fontSize: 16, fontWeight: 700 }}>Telegram Money Hub</div>
            <div style={{ fontSize: 11, color: "#666" }}>
              {bots.filter((b: any) => b.online).length}/{bots.length} bots online
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
              <StatCard icon={Hash} label="Channels" value={overview?.totalChannels || 0} color="#00D9FF" />
              <StatCard icon={MessageSquare} label="Total Messages" value={overview?.totalMessages || 0} color="#C9A84C" />
              <StatCard icon={Users} label="Total Leads" value={overview?.totalLeads || 0} color="#27AE60" />
              <StatCard icon={Bot} label="Active Bots" value={`${overview?.activeBots || 0}/4`} color="#9B59B6" />
            </div>

            {/* Domination Activation */}
            <div style={{ background: "linear-gradient(135deg, #1a1203, #0f0f1a)", border: "1px solid #C9A84C55", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "#C9A84C22", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #C9A84C55" }}>
                  <Crown size={20} color="#C9A84C" />
                </div>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "white" }}>All-Creator Acquisition Domination</div>
                  <div style={{ fontSize: 12, color: "#bca76a", lineHeight: 1.5 }}>
                    Creates tracked CreatorVault/VaultX Telegram campaigns and keyword funnels for studios, platforms, distributors, indie creators, solo operators, and small creator groups.
                  </div>
                </div>
                <button onClick={() => activateAllSegments.mutate({ sendNow: false, refreshFunnels: true })} disabled={activateAllSegments.isPending}
                  style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: activateAllSegments.isPending ? "#2a2414" : "linear-gradient(135deg, #C9A84C, #F0D27A)", color: activateAllSegments.isPending ? "#777" : "#0a0a0a", cursor: activateAllSegments.isPending ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", gap: 7 }}>
                  {activateAllSegments.isPending ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Activating...</> : <><Zap size={14} /> Activate Every Segment</>}
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
                  <div style={{ fontSize: 15, fontWeight: 800, color: "white" }}>Telegram Mini App + Stars Checkout Rails</div>
                  <div style={{ fontSize: 12, color: "#8fddea", lineHeight: 1.5 }}>
                    Native Telegram package entry is wired for studios, platforms, distributors, indie creators, solo operators, and groups. Star invoices open instantly when the monetization bot is configured.
                  </div>
                </div>
                <a href={miniAppRails?.miniAppEntry || "/vaultx?source=telegram_mini_app"} target="_blank" rel="noreferrer"
                  style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #00D9FF55", background: "#00D9FF18", color: "#9ceeff", cursor: "pointer", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", gap: 7, textDecoration: "none" }}>
                  <Smartphone size={14} /> Open Mini App Path
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
                          CTA: {pkg.deliveryContract.primaryCTA} · Proof required before render release
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

            {/* Bot Status */}
            <div style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <Bot size={14} color="#9B59B6" /> Bot Status
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                {bots.map((bot: any) => (
                  <div key={bot.name} style={{ padding: "12px 14px", background: "#0a0a1a", borderRadius: 8, border: `1px solid ${bot.online ? "#27AE6033" : "#1a1a2e"}`, display: "flex", alignItems: "center", gap: 10 }}>
                    <BotStatusDot online={bot.online} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: bot.online ? "#e0e0e0" : "#555" }}>@{bot.username || bot.name}</div>
                      <div style={{ fontSize: 11, color: "#555", textTransform: "capitalize" }}>{bot.role}</div>
                    </div>
                    <div style={{ marginLeft: "auto", fontSize: 11, color: bot.online ? "#27AE60" : "#E74C3C", fontWeight: 700 }}>
                      {bot.online ? "ONLINE" : "OFFLINE"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Broadcast */}
            <div style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <Radio size={14} color="#00D9FF" /> Quick Broadcast
              </div>
              <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                placeholder="Type your message... (supports HTML: <b>bold</b>, <i>italic</i>, <a href='...'>link</a>)"
                rows={4} style={{ width: "100%", padding: "12px", background: "#0a0a1a", border: "1px solid #1a1a2e", borderRadius: 8, color: "white", fontSize: 13, lineHeight: 1.6, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                <select value={selectedBot} onChange={e => setSelectedBot(e.target.value)}
                  style={{ padding: "8px 12px", background: "#0a0a1a", border: "1px solid #1a1a2e", borderRadius: 8, color: "#888", fontSize: 12, cursor: "pointer" }}>
                  <option value="main">Main Bot</option>
                  <option value="recruiter">Recruiter Bot</option>
                  <option value="engagement">Engagement Bot</option>
                  <option value="monetization">Monetization Bot</option>
                </select>
                <span style={{ fontSize: 12, color: "#555" }}>→ {selectedChannels.length > 0 ? `${selectedChannels.length} selected` : "all channels"}</span>
                <button onClick={handleBroadcast} disabled={broadcast.isPending || !broadcastMsg.trim()}
                  style={{ marginLeft: "auto", padding: "8px 20px", borderRadius: 8, border: "none", background: broadcast.isPending ? "#1a1a2e" : "#00D9FF", color: broadcast.isPending ? "#555" : "#000", cursor: broadcast.isPending ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  {broadcast.isPending ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Sending...</> : <><Send size={13} /> Broadcast</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Broadcast Tab */}
        {activeTab === "broadcast" && (
          <div style={{ maxWidth: 800 }}>
            <div style={{ marginBottom: 20, fontSize: 18, fontWeight: 700 }}>Broadcast Message</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>
              <div>
                <label style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 8 }}>Message (HTML supported)</label>
                <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}
                  placeholder="<b>🔥 KingCam Empire Update</b>&#10;&#10;Your message here..."
                  rows={12} style={{ width: "100%", padding: "14px", background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 10, color: "white", fontSize: 14, lineHeight: 1.7, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "monospace" }} />
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <select value={selectedBot} onChange={e => setSelectedBot(e.target.value)}
                    style={{ padding: "8px 12px", background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 8, color: "#888", fontSize: 12, cursor: "pointer" }}>
                    <option value="main">Main Bot</option>
                    <option value="recruiter">Recruiter Bot</option>
                    <option value="engagement">Engagement Bot</option>
                    <option value="monetization">Monetization Bot</option>
                  </select>
                  <button onClick={handleBroadcast} disabled={broadcast.isPending || !broadcastMsg.trim()}
                    style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: broadcast.isPending ? "#1a1a2e" : "linear-gradient(135deg, #00D9FF, #0099BB)", color: broadcast.isPending ? "#555" : "#000", cursor: broadcast.isPending ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {broadcast.isPending ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Sending...</> : <><Send size={14} /> Send to {selectedChannels.length > 0 ? `${selectedChannels.length} channels` : "all channels"}</>}
                  </button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Target Channels</div>
                <div style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "#888" }}>{channels.length} channels</span>
                    <button onClick={() => setSelectedChannels(selectedChannels.length === channels.length ? [] : channels.map((c: any) => c.id))}
                      style={{ fontSize: 11, color: "#00D9FF", background: "none", border: "none", cursor: "pointer" }}>
                      {selectedChannels.length === channels.length ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  {channels.length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", color: "#444", fontSize: 13 }}>No channels added yet</div>
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
              <div style={{ fontSize: 18, fontWeight: 700 }}>Channels & Groups</div>
            </div>
            {/* Add Channel */}
            <div style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "#888" }}>Add Channel / Group</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newChannelId} onChange={e => setNewChannelId(e.target.value)}
                  placeholder="Chat ID (e.g. -1001234567890)"
                  style={{ flex: 1, padding: "10px 12px", background: "#0a0a1a", border: "1px solid #1a1a2e", borderRadius: 8, color: "white", fontSize: 13, outline: "none" }} />
                <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
                  placeholder="Display name"
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
                  <Plus size={14} /> Add
                </button>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "#555" }}>
                To get your channel/group ID: forward a message to @userinfobot or use @getidsbot
              </div>
            </div>
            {/* Channel List */}
            {channels.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#444" }}>
                <Hash size={40} style={{ marginBottom: 12 }} />
                <div>No channels added yet. Add a channel above to start broadcasting.</div>
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
            <div style={{ marginBottom: 20, fontSize: 18, fontWeight: 700 }}>Telegram Leads ({leads.length})</div>
            {leads.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#444" }}>
                <Users size={40} style={{ marginBottom: 12 }} />
                <div>No leads yet. Leads are captured when users interact with your bots.</div>
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
            <div style={{ marginBottom: 20, fontSize: 18, fontWeight: 700 }}>Message History</div>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#444" }}>
                <MessageSquare size={40} style={{ marginBottom: 12 }} />
                <div>No messages sent yet.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {history.map((msg: any) => (
                  <div key={msg.id} style={{ background: "#0f0f1a", border: "1px solid #1a1a2e", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: "#888" }}>{msg.channel_name || "Direct"}</span>
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
