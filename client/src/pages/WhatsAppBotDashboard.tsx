/**
 * WhatsApp Bot Dashboard — Full Production
 * ============================================================================
 * Channel management, automation rules, broadcast controls, analytics.
 * ============================================================================
 */
import { useState } from "react";
import { trpc } from "../lib/trpc";
import {
  Bot, Users, BarChart3, Settings, Send, Zap, Clock,
  CheckCircle, AlertCircle, Loader2, Plus, Trash2, RefreshCw,
  MessageSquare, Globe, TrendingUp, Activity, ChevronRight,
} from "lucide-react";

type DashTab = "overview" | "channels" | "automation" | "broadcast" | "analytics";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="p-4 bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-xs">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-white text-2xl font-bold">{value}</p>
    </div>
  );
}

function OverviewTab() {
  const analyticsQuery = trpc.whatsappContent.getAnalytics.useQuery();
  const channelsQuery = trpc.whatsappContent.getChannels.useQuery();
  const dropsQuery = trpc.whatsappContent.getScheduledDrops.useQuery();
  const a = analyticsQuery.data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Channels" value={a?.channels || 0} icon={Users} color="text-[#25d366]" />
        <StatCard label="Generations" value={a?.totalGenerations || 0} icon={Zap} color="text-purple-400" />
        <StatCard label="Scheduled Drops" value={dropsQuery.data?.drops.filter((d: any) => d.status === "pending").length || 0} icon={Clock} color="text-blue-400" />
        <StatCard label="Active Channels" value={channelsQuery.data?.channels.filter((c: any) => c.status === "active").length || 0} icon={Activity} color="text-yellow-400" />
      </div>

      <div>
        <h3 className="text-white font-semibold mb-3">Channels</h3>
        <div className="space-y-2">
          {channelsQuery.data?.channels.slice(0, 5).map((ch: any) => (
            <div key={ch.id} className="p-3 bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${ch.status === "active" ? "bg-[#25d366]" : "bg-gray-600"}`} />
                <div>
                  <p className="text-white text-sm font-medium">{ch.community_name}</p>
                  <p className="text-gray-500 text-xs">{ch.phone_number} · {ch.member_count || 0} members</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </div>
          ))}
          {!channelsQuery.data?.channels.length && (
            <p className="text-gray-600 text-sm text-center py-6">No channels yet — go to Channels tab to create one</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-white font-semibold mb-3">Recent Drops</h3>
        <div className="space-y-2">
          {dropsQuery.data?.drops.slice(0, 5).map((d: any) => (
            <div key={d.id} className="p-3 bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-white text-sm capitalize">{d.content_type} drop</p>
                <p className="text-gray-500 text-xs">{new Date(d.created_at).toLocaleString()}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                d.status === "delivered" ? "bg-[#25d366]/20 text-[#25d366]" :
                d.status === "failed" ? "bg-red-900/20 text-red-400" :
                "bg-yellow-900/20 text-yellow-400"
              }`}>{d.status}</span>
            </div>
          ))}
          {!dropsQuery.data?.drops.length && (
            <p className="text-gray-600 text-sm text-center py-4">No drops yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ChannelsTab() {
  const channelsQuery = trpc.whatsappContent.getChannels.useQuery();
  const createChannelMut = trpc.whatsappContent.createChannel.useMutation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name || !phone) return;
    setCreating(true);
    try {
      await createChannelMut.mutateAsync({ name, phoneNumber: phone });
      setName(""); setPhone("");
      channelsQuery.refetch();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl space-y-3">
        <h3 className="text-white font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-[#25d366]" /> Add Channel</h3>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Channel name" className="w-full bg-[#1a1a2e] border border-[#25d366]/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#25d366]/60" />
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number (+1234567890)" className="w-full bg-[#1a1a2e] border border-[#25d366]/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#25d366]/60" />
        <button onClick={handleCreate} disabled={!name || !phone || creating} className="w-full py-2.5 bg-[#25d366] disabled:opacity-40 text-black font-semibold rounded-lg text-sm flex items-center justify-center gap-2">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {creating ? "Creating..." : "Create Channel"}
        </button>
      </div>

      <div className="space-y-3">
        {channelsQuery.data?.channels.map((ch: any) => (
          <div key={ch.id} className="p-4 bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${ch.status === "active" ? "bg-[#25d366]" : "bg-gray-600"}`} />
                  <p className="text-white font-medium">{ch.community_name}</p>
                </div>
                <p className="text-gray-500 text-xs mt-1">{ch.phone_number}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>{ch.member_count || 0} members</span>
                  <span className="capitalize">{ch.status}</span>
                  <span>Created {new Date(ch.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full border ${ch.status === "active" ? "border-[#25d366]/40 text-[#25d366]" : "border-gray-600 text-gray-500"}`}>{ch.status}</span>
            </div>
          </div>
        ))}
        {!channelsQuery.data?.channels.length && (
          <p className="text-gray-600 text-sm text-center py-8">No channels yet</p>
        )}
      </div>
    </div>
  );
}

function AutomationTab() {
  const [rules, setRules] = useState([
    { id: 1, name: "Welcome new subscribers", trigger: "new_subscriber", action: "send_message", active: true },
    { id: 2, name: "Daily content drop", trigger: "schedule_daily", action: "send_video", active: false },
    { id: 3, name: "PPV unlock confirmation", trigger: "payment_received", action: "unlock_content", active: true },
  ]);

  return (
    <div className="space-y-4">
      <div className="p-3 bg-[#25d366]/10 border border-[#25d366]/30 rounded-xl">
        <p className="text-[#25d366] text-sm font-medium">Automation Rules</p>
        <p className="text-gray-400 text-xs mt-1">Trigger-based actions for your WhatsApp channels</p>
      </div>

      <div className="space-y-3">
        {rules.map(rule => (
          <div key={rule.id} className="p-4 bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{rule.name}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>Trigger: <span className="text-gray-300">{rule.trigger.replace(/_/g, " ")}</span></span>
                  <span>Action: <span className="text-gray-300">{rule.action.replace(/_/g, " ")}</span></span>
                </div>
              </div>
              <button
                onClick={() => setRules(rules.map(r => r.id === rule.id ? { ...r, active: !r.active } : r))}
                className={`relative w-10 h-5 rounded-full transition-colors ${rule.active ? "bg-[#25d366]" : "bg-gray-700"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${rule.active ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full py-3 border border-dashed border-[#25d366]/30 rounded-xl text-[#25d366] text-sm flex items-center justify-center gap-2 hover:border-[#25d366]/60 transition-colors">
        <Plus className="w-4 h-4" /> Add Rule
      </button>
    </div>
  );
}

function BroadcastTab() {
  const channelsQuery = trpc.whatsappContent.getChannels.useQuery();
  const broadcastMut = trpc.whatsappContent.broadcastToChannel.useMutation();
  const [channelId, setChannelId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"video" | "image" | "audio" | "none">("none");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleBroadcast = async () => {
    if (!channelId || !message) return;
    setSending(true); setError(""); setSent(false);
    try {
      await broadcastMut.mutateAsync({
        channelId,
        message,
        ...(mediaUrl && mediaType !== "none" ? { mediaUrl, mediaType } : {}),
      });
      setSent(true);
      setMessage(""); setMediaUrl("");
    } catch (e: any) {
      setError(e.message || "Broadcast failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-gray-400 text-xs mb-1 block">Channel</label>
        <select value={channelId || ""} onChange={e => setChannelId(Number(e.target.value))} className="w-full bg-[#0d0d1a] border border-[#25d366]/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none">
          <option value="">Select channel</option>
          {channelsQuery.data?.channels.map((ch: any) => <option key={ch.id} value={ch.id}>{ch.community_name} ({ch.member_count || 0} members)</option>)}
        </select>
      </div>

      <div>
        <label className="text-gray-400 text-xs mb-1 block">Message</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Broadcast message..." rows={4} className="w-full bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#25d366]/60 resize-none" />
        <p className="text-gray-600 text-xs mt-1">{message.length} characters</p>
      </div>

      <div>
        <label className="text-gray-400 text-xs mb-1 block">Attach Media (optional)</label>
        <div className="flex gap-2 mb-2">
          {(["none", "video", "image", "audio"] as const).map(t => (
            <button key={t} onClick={() => setMediaType(t)} className={`px-3 py-1.5 rounded-lg text-xs capitalize font-medium ${mediaType === t ? "bg-[#25d366] text-black" : "bg-[#0d0d1a] border border-[#25d366]/20 text-gray-300"}`}>{t}</button>
          ))}
        </div>
        {mediaType !== "none" && (
          <input value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder={`${mediaType} URL`} className="w-full bg-[#0d0d1a] border border-[#25d366]/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none" />
        )}
      </div>

      {sent && (
        <div className="p-3 bg-[#25d366]/10 border border-[#25d366]/30 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[#25d366]" />
          <p className="text-[#25d366] text-sm">Broadcast sent successfully</p>
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <button onClick={handleBroadcast} disabled={!channelId || !message || sending} className="w-full py-3 bg-[#25d366] hover:bg-[#25d366]/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {sending ? "Sending..." : "Send Broadcast"}
      </button>
    </div>
  );
}

function AnalyticsTab() {
  const analyticsQuery = trpc.whatsappContent.getAnalytics.useQuery();
  const a = analyticsQuery.data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Generations" value={a?.totalGenerations || 0} icon={Zap} color="text-[#25d366]" />
        <StatCard label="Channels" value={a?.channels || 0} icon={Users} color="text-purple-400" />
        <StatCard label="Scheduled Drops" value={a?.scheduledDrops || 0} icon={Clock} color="text-blue-400" />
        <StatCard label="Broadcasts Sent" value={a?.broadcastsSent || 0} icon={Send} color="text-yellow-400" />
      </div>

      {a?.byType && (
        <div>
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#25d366]" /> By Content Type</h3>
          <div className="space-y-2">
            {Object.entries(a.byType).map(([type, count]: [string, any]) => (
              <div key={type} className="p-3 bg-[#0d0d1a] border border-[#25d366]/20 rounded-xl flex items-center justify-between">
                <span className="text-gray-300 text-sm capitalize">{type}</span>
                <span className="text-[#25d366] font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WhatsAppBotDashboard() {
  const [activeTab, setActiveTab] = useState<DashTab>("overview");

  const TABS: { id: DashTab; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "channels", label: "Channels", icon: Users },
    { id: "automation", label: "Automation", icon: Zap },
    { id: "broadcast", label: "Broadcast", icon: Send },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-[#060612] text-white">
      <div className="border-b border-[#25d366]/20 bg-[#060612]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#25d366] flex items-center justify-center">
            <Bot className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">WhatsApp Bot Dashboard</h1>
            <p className="text-gray-500 text-xs mt-0.5">Channel management & automation</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-1 bg-[#0d0d1a] rounded-2xl p-1.5 mb-6 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${activeTab === tab.id ? "bg-[#25d366] text-black" : "text-gray-400 hover:text-white"}`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-[#0d0d1a] border border-[#25d366]/20 rounded-2xl p-6">
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "channels" && <ChannelsTab />}
          {activeTab === "automation" && <AutomationTab />}
          {activeTab === "broadcast" && <BroadcastTab />}
          {activeTab === "analytics" && <AnalyticsTab />}
        </div>
      </div>
    </div>
  );
}
