/**
 * VaultXDistribution.tsx — Distribution Hub
 * Route: /vaultx/distribution
 *
 * 4 Tabs:
 *   CHANNELS    — Channel identities (VaultX brand + creator personal)
 *   ACCOUNTS    — Connected social accounts per channel
 *   COMPOSE     — Create a distribution job with brand safety check
 *   JOBS        — Live job list with attribution stats + tracking URLs
 *
 * All data is real. No stubs. No fake success.
 * Brand safety matrix enforced before every job creation.
 * Tracking URLs: https://creatorvault.live/r/:trackingCode
 */

import { useState } from "react";
import { MediaUpload } from "@/components/MediaUpload";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { VaultXLogo } from "@/components/vaultx/VaultXBrand";
import {
  Globe, Link2, Send, BarChart2, Plus, Trash2, CheckCircle2,
  XCircle, AlertCircle, Loader2, ExternalLink, Copy, RefreshCw,
  Shield, Zap, Eye, DollarSign, Clock, ArrowRight, ChevronRight,
  Twitter, Instagram, Youtube, Facebook, MessageCircle, Radio,
  Lock, Unlock, TrendingUp, Target, Flame, Users,
} from "lucide-react";

// ─── Platform icons & colors ─────────────────────────────────────────────────

const PLATFORM_META: Record<string, { label: string; icon: string; color: string; bg: string; adultOk: boolean; oauthRequired: boolean }> = {
  twitter:   { label: "X / Twitter",  icon: "𝕏",  color: "text-white",      bg: "bg-black border border-gray-700",        adultOk: true,  oauthRequired: true  },
  instagram: { label: "Instagram",    icon: "📷", color: "text-white",      bg: "bg-gradient-to-br from-purple-600 to-pink-500", adultOk: false, oauthRequired: true  },
  tiktok:    { label: "TikTok",       icon: "🎵", color: "text-white",      bg: "bg-black border border-cyan-800",        adultOk: false, oauthRequired: true  },
  youtube:   { label: "YouTube",      icon: "▶️", color: "text-white",      bg: "bg-red-600",                             adultOk: false, oauthRequired: true  },
  facebook:  { label: "Facebook",     icon: "📘", color: "text-white",      bg: "bg-blue-700",                            adultOk: false, oauthRequired: true  },
  telegram:  { label: "Telegram",     icon: "✈️", color: "text-white",      bg: "bg-sky-600",                             adultOk: true,  oauthRequired: false },
  whatsapp:  { label: "WhatsApp",     icon: "💬", color: "text-white",      bg: "bg-green-600",                           adultOk: false, oauthRequired: false },
  onlyfans:  { label: "OnlyFans",     icon: "🔞", color: "text-white",      bg: "bg-blue-500",                            adultOk: true,  oauthRequired: false },
  threads:   { label: "Threads",      icon: "🧵", color: "text-white",      bg: "bg-gray-800",                            adultOk: false, oauthRequired: true  },
  reddit:    { label: "Reddit",       icon: "🤖", color: "text-white",      bg: "bg-orange-600",                          adultOk: false, oauthRequired: true  },
  other:     { label: "Other",        icon: "🌐", color: "text-white",      bg: "bg-gray-700",                            adultOk: false, oauthRequired: false },
};

const BRAND_LANE_META: Record<string, { label: string; color: string; desc: string }> = {
  vaultx_adult:       { label: "VaultX Adult",       color: "text-rose-400",   desc: "Adult content lane — teaser/sensitive allowed on X & Telegram" },
  creatorvault_clean: { label: "CreatorVault Clean",  color: "text-emerald-400", desc: "Clean brand lane — SFW only on all platforms" },
  agency:             { label: "Agency",              color: "text-purple-400", desc: "Agency-managed creator channel" },
  campaign:           { label: "Campaign",            color: "text-amber-400",  desc: "Campaign-specific channel" },
};

const SAFETY_LEVEL_META: Record<string, { label: string; color: string }> = {
  clean:     { label: "Clean",     color: "text-emerald-400" },
  teaser:    { label: "Teaser",    color: "text-amber-400"   },
  sensitive: { label: "Sensitive", color: "text-orange-400"  },
  explicit:  { label: "Explicit",  color: "text-rose-400"    },
};

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:   { label: "Draft",   color: "text-gray-400",   icon: <Clock className="w-3 h-3" /> },
  ready:   { label: "Ready",   color: "text-blue-400",   icon: <CheckCircle2 className="w-3 h-3" /> },
  posting: { label: "Posting", color: "text-amber-400",  icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  posted:  { label: "Posted",  color: "text-emerald-400", icon: <CheckCircle2 className="w-3 h-3" /> },
  failed:  { label: "Failed",  color: "text-rose-400",   icon: <XCircle className="w-3 h-3" /> },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ─── ChannelsTab ─────────────────────────────────────────────────────────────

function ChannelsTab() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: channels, isLoading } = trpc.distribution["channel.list"].useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    brandLane: "vaultx_adult" as const,
    contentSafetyLevel: "teaser" as const,
    channelType: "social",
  });

  const createMut = trpc.distribution["channel.create"].useMutation({
    onSuccess: () => {
      toast({ title: "Channel created" });
      utils.distribution["channel.list"].invalidate();
      setShowCreate(false);
      setForm({ displayName: "", brandLane: "vaultx_adult", contentSafetyLevel: "teaser", channelType: "social" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Channel Identities</h2>
          <p className="text-gray-500 text-sm">Each channel is a distribution voice with its own brand lane and content safety level.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> New Channel
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-gray-900/80 border border-gray-700 rounded-2xl p-5 space-y-4">
          <h3 className="text-white font-bold text-sm">Create Personal Channel</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs block mb-1">Display Name</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                placeholder="e.g. My X Account"
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Brand Lane</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                value={form.brandLane}
                onChange={e => setForm(f => ({ ...f, brandLane: e.target.value as any }))}
              >
                <option value="vaultx_adult">VaultX Adult</option>
                <option value="creatorvault_clean">CreatorVault Clean</option>
                <option value="agency">Agency</option>
                <option value="campaign">Campaign</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Content Safety Level</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                value={form.contentSafetyLevel}
                onChange={e => setForm(f => ({ ...f, contentSafetyLevel: e.target.value as any }))}
              >
                <option value="clean">Clean</option>
                <option value="teaser">Teaser</option>
                <option value="sensitive">Sensitive</option>
                <option value="explicit">Explicit</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Channel Type</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                value={form.channelType}
                onChange={e => setForm(f => ({ ...f, channelType: e.target.value }))}
              >
                <option value="social">Social Media</option>
                <option value="telegram">Telegram</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => createMut.mutate(form)}
              disabled={!form.displayName || createMut.isPending}
              className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Channel
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-5 bg-gray-800 hover:bg-gray-700 text-gray-400 font-bold py-2.5 rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Channel list */}
      <div className="space-y-3">
        {(channels || []).map((ch: any) => {
          const lane = BRAND_LANE_META[ch.brand_lane] || { label: ch.brand_lane, color: "text-gray-400", desc: "" };
          const safety = SAFETY_LEVEL_META[ch.content_safety_level] || { label: ch.content_safety_level, color: "text-gray-400" };
          const isPlatformOwned = ch.owner_type !== "creator_personal";
          return (
            <div key={ch.id} className="bg-gray-900/60 border border-gray-800 hover:border-gray-700 rounded-2xl p-4 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-sm">{ch.display_name}</span>
                    {isPlatformOwned && (
                      <span className="bg-rose-900/50 text-rose-400 text-xs px-2 py-0.5 rounded-full font-medium">Platform</span>
                    )}
                    <span className={`text-xs font-medium ${lane.color}`}>{lane.label}</span>
                    <span className={`text-xs ${safety.color}`}>· {safety.label}</span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">{lane.desc}</div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-gray-600 text-xs">/{ch.slug}</span>
                    <span className="text-gray-600 text-xs">· {ch.account_count || 0} accounts</span>
                    <span className="text-gray-600 text-xs">· {ch.channel_type}</span>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${ch.is_active ? "bg-emerald-400" : "bg-gray-600"}`} />
              </div>
            </div>
          );
        })}
        {(!channels || channels.length === 0) && (
          <div className="text-center py-12 text-gray-600">
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No channels yet. Platform channels will appear once seeded.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AccountsTab ─────────────────────────────────────────────────────────────

function AccountsTab() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: accounts, isLoading } = trpc.distribution["account.list"].useQuery({});
  const { data: channels } = trpc.distribution["channel.list"].useQuery();
  const { data: capabilities } = trpc.distribution["platform.capabilities"].useQuery();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    channelIdentityId: 0,
    platform: "twitter" as const,
    username: "",
    displayName: "",
    platformAccountId: "",
    connectionStatus: "manual" as const,
    canPost: false,
    canSchedule: false,
    canSendDm: false,
    canReadAnalytics: false,
    canTriggerFunnel: false,
    automationEnabled: false,
  });

  const addMut = trpc.distribution["account.register"].useMutation({
    onSuccess: () => {
      toast({ title: "Account registered" });
      utils.distribution["account.list"].invalidate();
      setShowAdd(false);
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeMut = trpc.distribution["account.remove"].useMutation({
    onSuccess: () => {
      toast({ title: "Account removed" });
      utils.distribution["account.list"].invalidate();
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const capMap: Record<string, any> = {};
  (capabilities || []).forEach((c: any) => { capMap[c.platform] = c; });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Connected Accounts</h2>
          <p className="text-gray-500 text-sm">Link your social accounts to channel identities. OAuth credentials required for live posting.</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Account
        </button>
      </div>

      {/* Platform capability matrix */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-4">
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Platform Capability Matrix</h3>
        <div className="grid grid-cols-2 gap-2">
          {(capabilities || []).filter((c: any) => c.platform !== "other").map((cap: any) => {
            const meta = PLATFORM_META[cap.platform] || PLATFORM_META.other;
            return (
              <div key={cap.platform} className="flex items-center gap-3 bg-gray-900/60 rounded-xl p-3">
                <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center text-sm flex-shrink-0`}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-semibold">{meta.label}</div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {cap.supports_posting ? <span className="text-emerald-400 text-xs">Post</span> : <span className="text-gray-600 text-xs">No post</span>}
                    {cap.supports_video && <span className="text-blue-400 text-xs">· Video</span>}
                    {cap.supports_dm && <span className="text-purple-400 text-xs">· DM</span>}
                    {cap.supports_oauth ? <span className="text-amber-400 text-xs">· OAuth</span> : <span className="text-gray-500 text-xs">· Token</span>}
                  </div>
                </div>
                <div className={`text-xs font-bold flex-shrink-0 ${
                  cap.adult_policy_level === "allowed" ? "text-emerald-400" :
                  cap.adult_policy_level === "allowed_with_flag" ? "text-amber-400" :
                  cap.adult_policy_level === "restricted" ? "text-orange-400" : "text-rose-400"
                }`}>
                  {cap.adult_policy_level === "allowed" ? "✓ Adult" :
                   cap.adult_policy_level === "allowed_with_flag" ? "⚑ Flagged" :
                   cap.adult_policy_level === "restricted" ? "⚠ Restricted" : "✗ SFW"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add account form */}
      {showAdd && (
        <div className="bg-gray-900/80 border border-gray-700 rounded-2xl p-5 space-y-4">
          <h3 className="text-white font-bold text-sm">Register Account</h3>
          <div className="bg-amber-900/30 border border-amber-800/50 rounded-xl p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300 text-xs">
              For platforms requiring OAuth (X, Instagram, TikTok, YouTube), set status to <strong>Manual</strong> until you add credentials to .env. The system will honestly report connection status.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs block mb-1">Channel Identity</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                value={form.channelIdentityId}
                onChange={e => setForm(f => ({ ...f, channelIdentityId: Number(e.target.value) }))}
              >
                <option value={0}>Select channel...</option>
                {(channels || []).map((ch: any) => (
                  <option key={ch.id} value={ch.id}>{ch.display_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Platform</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                value={form.platform}
                onChange={e => setForm(f => ({ ...f, platform: e.target.value as any }))}
              >
                {Object.entries(PLATFORM_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Username</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                placeholder="@username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Display Name</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                placeholder="Display name"
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Platform Account ID</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                placeholder="Platform-assigned user ID"
                value={form.platformAccountId}
                onChange={e => setForm(f => ({ ...f, platformAccountId: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1">Connection Status</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                value={form.connectionStatus}
                onChange={e => setForm(f => ({ ...f, connectionStatus: e.target.value as any }))}
              >
                <option value="manual">Manual (no OAuth yet)</option>
                <option value="active">Active (OAuth connected)</option>
                <option value="pending_oauth">Pending OAuth</option>
              </select>
            </div>
          </div>
          {/* Permissions */}
          <div>
            <label className="text-gray-400 text-xs block mb-2">Permissions</label>
            <div className="flex flex-wrap gap-3">
              {[
                { key: "canPost", label: "Post" },
                { key: "canSchedule", label: "Schedule" },
                { key: "canSendDm", label: "DM" },
                { key: "canReadAnalytics", label: "Analytics" },
                { key: "canTriggerFunnel", label: "Funnel" },
                { key: "automationEnabled", label: "Automation" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                    className="w-4 h-4 accent-rose-500"
                  />
                  <span className="text-gray-300 text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => addMut.mutate({ ...form, channelIdentityId: Number(form.channelIdentityId) })}
              disabled={!form.channelIdentityId || addMut.isPending}
              className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {addMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Register Account
            </button>
            <button onClick={() => setShowAdd(false)} className="px-5 bg-gray-800 hover:bg-gray-700 text-gray-400 font-bold py-2.5 rounded-xl text-sm transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Account list */}
      <div className="space-y-3">
        {(accounts || []).map((acc: any) => {
          const meta = PLATFORM_META[acc.platform] || PLATFORM_META.other;
          const statusColors: Record<string, string> = {
            active: "text-emerald-400", manual: "text-amber-400",
            pending_oauth: "text-blue-400", expired: "text-orange-400",
            revoked: "text-rose-400", error: "text-rose-400",
          };
          return (
            <div key={acc.id} className="bg-gray-900/60 border border-gray-800 hover:border-gray-700 rounded-2xl p-4 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center text-lg flex-shrink-0`}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-sm">{meta.label}</span>
                    {acc.username && <span className="text-gray-400 text-sm">@{acc.username}</span>}
                    <span className={`text-xs font-medium ${statusColors[acc.connection_status] || "text-gray-400"}`}>
                      {acc.connection_status === "manual" ? "⚑ Manual" :
                       acc.connection_status === "active" ? "✓ Active" :
                       acc.connection_status === "pending_oauth" ? "⏳ Pending OAuth" :
                       acc.connection_status}
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs mt-0.5">{acc.channel_name} · {acc.brand_lane}</div>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {acc.can_post ? <span className="text-emerald-400 text-xs">✓ Post</span> : <span className="text-gray-600 text-xs">✗ Post</span>}
                    {acc.can_schedule ? <span className="text-emerald-400 text-xs">✓ Schedule</span> : <span className="text-gray-600 text-xs">✗ Schedule</span>}
                    {acc.can_send_dm ? <span className="text-emerald-400 text-xs">✓ DM</span> : <span className="text-gray-600 text-xs">✗ DM</span>}
                    {acc.automation_enabled && <span className="text-purple-400 text-xs">⚡ Auto</span>}
                  </div>
                </div>
                <button
                  onClick={() => removeMut.mutate({ accountId: acc.id })}
                  disabled={removeMut.isPending}
                  className="text-gray-600 hover:text-rose-400 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
        {(!accounts || accounts.length === 0) && (
          <div className="text-center py-12 text-gray-600">
            <Link2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No accounts connected yet.</p>
            <p className="text-xs mt-1">Add an account above to start distributing.</p>
          </div>
        )}
      </div>

      {/* OAuth setup guide */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5">
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">OAuth Setup Required For</h3>
        <div className="space-y-2">
          {[
            { platform: "twitter", label: "X / Twitter", envVars: "TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET", url: "https://developer.twitter.com" },
            { platform: "instagram", label: "Instagram", envVars: "FACEBOOK_APP_ID, FACEBOOK_APP_SECRET", url: "https://developers.facebook.com" },
            { platform: "tiktok", label: "TikTok", envVars: "TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET", url: "https://developers.tiktok.com" },
            { platform: "youtube", label: "YouTube", envVars: "YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET", url: "https://console.cloud.google.com" },
          ].map(({ platform, label, envVars, url }) => {
            const meta = PLATFORM_META[platform];
            return (
              <div key={platform} className="flex items-center gap-3 bg-gray-900/60 rounded-xl p-3">
                <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center text-sm flex-shrink-0`}>{meta.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-semibold">{label}</div>
                  <div className="text-gray-600 text-xs font-mono truncate">{envVars}</div>
                </div>
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors flex-shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── ComposeTab ───────────────────────────────────────────────────────────────

function ComposeTab() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: channels } = trpc.distribution["channel.list"].useQuery();
  const { data: accounts } = trpc.distribution["account.list"].useQuery({});
  const [createdJob, setCreatedJob] = useState<any>(null);
  const [safetyError, setSafetyError] = useState<string | null>(null);

  const [form, setForm] = useState({
    channelIdentityId: 0,
    connectedAccountId: undefined as number | undefined,
    platform: "telegram",
    contentId: undefined as number | undefined,
    assetUrl: "https://creatorvault.live/uploads/ppv_1778107488797/teaser.mp4",
    assetType: "teaser" as const,
    caption: "",
    destinationUrl: "https://creatorvault.live/vaultx",
    scheduledAt: "",
  });

  const createMut = trpc.distribution["job.create"].useMutation({
    onSuccess: (job) => {
      setCreatedJob(job);
      setSafetyError(null);
      utils.distribution["job.list"].invalidate();
      toast({ title: "Distribution job created", description: `Tracking: ${job.tracking_code}` });
    },
    onError: (e) => {
      setSafetyError(e.message);
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    },
  });

  const postMut = trpc.distribution["job.post"].useMutation({
    onSuccess: (result) => {
      toast({ title: "Posted!", description: result.platformPostUrl || "Job posted successfully" });
      utils.distribution["job.list"].invalidate();
      setCreatedJob(null);
    },
    onError: (e) => toast({ title: "Post failed", description: e.message, variant: "destructive" }),
  });

  const filteredAccounts = (accounts || []).filter((a: any) => a.platform === form.platform);

  // Get selected channel to show safety level
  const selectedChannel = (channels || []).find((c: any) => c.id === form.channelIdentityId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-white font-bold text-lg">Compose Distribution Job</h2>
        <p className="text-gray-500 text-sm">Brand safety is enforced automatically. Every job gets a unique tracking URL.</p>
      </div>

      {/* Created job result */}
      {createdJob && (
        <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" /> Job Created — ID #{createdJob.id}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Tracking URL:</span>
              <span className="text-white text-xs font-mono bg-gray-800 px-2 py-1 rounded-lg flex-1 truncate">{createdJob.trackingUrl}</span>
              <button onClick={() => copyToClipboard(createdJob.trackingUrl)} className="text-gray-400 hover:text-white">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Status:</span>
              <span className="text-amber-400 text-xs font-medium">{createdJob.status}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => postMut.mutate({ jobId: createdJob.id })}
              disabled={postMut.isPending}
              className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {postMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Post Now
            </button>
            <button onClick={() => setCreatedJob(null)} className="px-5 bg-gray-800 hover:bg-gray-700 text-gray-400 font-bold py-2.5 rounded-xl text-sm transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Safety error */}
      {safetyError && (
        <div className="bg-rose-900/30 border border-rose-700/50 rounded-2xl p-4 flex gap-3">
          <Shield className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-rose-400 font-bold text-sm">Brand Safety Violation</div>
            <div className="text-rose-300 text-xs mt-1">{safetyError}</div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-400 text-xs block mb-1">Channel Identity</label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
              value={form.channelIdentityId}
              onChange={e => setForm(f => ({ ...f, channelIdentityId: Number(e.target.value) }))}
            >
              <option value={0}>Select channel...</option>
              {(channels || []).map((ch: any) => (
                <option key={ch.id} value={ch.id}>{ch.display_name} ({ch.brand_lane})</option>
              ))}
            </select>
            {selectedChannel && (
              <div className="text-xs mt-1">
                <span className={SAFETY_LEVEL_META[selectedChannel.content_safety_level]?.color || "text-gray-400"}>
                  Safety: {selectedChannel.content_safety_level}
                </span>
              </div>
            )}
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">Platform</label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
              value={form.platform}
              onChange={e => setForm(f => ({ ...f, platform: e.target.value, connectedAccountId: undefined }))}
            >
              {Object.entries(PLATFORM_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          {filteredAccounts.length > 0 && (
            <div>
              <label className="text-gray-400 text-xs block mb-1">Connected Account (optional)</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                value={form.connectedAccountId || ""}
                onChange={e => setForm(f => ({ ...f, connectedAccountId: e.target.value ? Number(e.target.value) : undefined }))}
              >
                <option value="">None (use platform default)</option>
                {filteredAccounts.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.username || a.display_name} ({a.connection_status})</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-gray-400 text-xs block mb-1">Asset Type</label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
              value={form.assetType}
              onChange={e => setForm(f => ({ ...f, assetType: e.target.value as any }))}
            >
              <option value="teaser">Teaser</option>
              <option value="censored_preview">Censored Preview</option>
              <option value="thumbnail">Thumbnail</option>
              <option value="full_video">Full Video</option>
              <option value="image">Image</option>
              <option value="text">Text Only</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">Asset URL (must be public HTTPS)</label>
          <input
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-rose-500"
            placeholder="Tap to upload media"
            value={form.assetUrl}
            onChange={e => setForm(f => ({ ...f, assetUrl: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">Caption</label>
          <textarea
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500 resize-none"
            rows={3}
            placeholder="Your hook caption... (tracking URL appended automatically)"
            value={form.caption}
            onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-gray-400 text-xs block mb-1">Destination URL (where the CTA link goes)</label>
          <input
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-rose-500"
            placeholder="Your VaultX link"
            value={form.destinationUrl}
            onChange={e => setForm(f => ({ ...f, destinationUrl: e.target.value }))}
          />
        </div>
        <div className="flex items-center gap-3 bg-gray-800/50 rounded-xl p-3">
          <Shield className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <p className="text-gray-400 text-xs">
            Brand safety check runs automatically. If the asset type or safety level violates platform policy for this channel's brand lane, the job will be rejected with a clear reason.
          </p>
        </div>
        <button
          onClick={() => {
            setSafetyError(null);
            createMut.mutate({
              ...form,
              channelIdentityId: Number(form.channelIdentityId),
              contentId: form.contentId,
              connectedAccountId: form.connectedAccountId,
              scheduledAt: form.scheduledAt || undefined,
            });
          }}
          disabled={!form.channelIdentityId || !form.assetUrl || !form.destinationUrl || createMut.isPending}
          className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        >
          {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Create Distribution Job
        </button>
      </div>
    </div>
  );
}

// ─── JobsTab ──────────────────────────────────────────────────────────────────

function JobsTab() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: jobs, isLoading, refetch } = trpc.distribution["job.list"].useQuery({ limit: 50 });

  const postMut = trpc.distribution["job.post"].useMutation({
    onSuccess: (result) => {
      toast({ title: "Posted!", description: result.platformPostUrl || "Job posted" });
      utils.distribution["job.list"].invalidate();
    },
    onError: (e) => toast({ title: "Post failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-rose-400 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Distribution Jobs</h2>
          <p className="text-gray-500 text-sm">Every job has a unique tracking URL. Click counts and revenue are attributed in real-time.</p>
        </div>
        <button onClick={() => refetch()} className="text-gray-400 hover:text-white transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {(jobs || []).map((job: any) => {
          const meta = PLATFORM_META[job.platform] || PLATFORM_META.other;
          const status = STATUS_META[job.status] || STATUS_META.draft;
          const clicks = Number(job.click_count || 0);
          const purchases = Number(job.purchase_count || 0);
          const revenue = Number(job.revenue_cents || 0) / 100;

          return (
            <div key={job.id} className="bg-gray-900/60 border border-gray-800 hover:border-gray-700 rounded-2xl p-4 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center text-lg flex-shrink-0`}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-sm">{meta.label}</span>
                    <span className={`flex items-center gap-1 text-xs font-medium ${status.color}`}>
                      {status.icon} {status.label}
                    </span>
                    <span className="text-gray-600 text-xs">#{job.id}</span>
                  </div>
                  <div className="text-gray-500 text-xs mt-0.5">{job.channel_name} · {job.asset_type}</div>
                  {job.caption && (
                    <div className="text-gray-400 text-xs mt-1 truncate max-w-xs">{job.caption}</div>
                  )}

                  {/* Tracking URL */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-gray-600 text-xs font-mono truncate max-w-xs">{job.trackingUrl}</span>
                    <button onClick={() => copyToClipboard(job.trackingUrl)} className="text-gray-600 hover:text-white transition-colors flex-shrink-0">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Attribution stats */}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Eye className="w-3 h-3" /> {clicks} clicks
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <DollarSign className="w-3 h-3" /> {purchases} purchases
                    </div>
                    {revenue > 0 && (
                      <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                        <TrendingUp className="w-3 h-3" /> ${revenue.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Error message */}
                  {job.error_message && (
                    <div className="mt-2 bg-rose-900/30 border border-rose-800/50 rounded-lg px-3 py-2">
                      <span className="text-rose-400 text-xs">{job.error_message}</span>
                    </div>
                  )}

                  {/* Post URL if posted */}
                  {job.platform_post_url && (
                    <a href={job.platform_post_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors">
                      <ExternalLink className="w-3 h-3" /> View post
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex-shrink-0">
                  {["draft", "ready"].includes(job.status) && (
                    <button
                      onClick={() => postMut.mutate({ jobId: job.id })}
                      disabled={postMut.isPending}
                      className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      {postMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Post
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {(!jobs || jobs.length === 0) && (
          <div className="text-center py-12 text-gray-600">
            <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No distribution jobs yet.</p>
            <p className="text-xs mt-1">Create a job in the Compose tab.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "channels" | "accounts" | "compose" | "jobs";

export default function VaultXDistribution() {
  const [activeTab, setActiveTab] = useState<Tab>("channels");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "channels", label: "Channels",  icon: <Globe className="w-4 h-4" /> },
    { id: "accounts", label: "Accounts",  icon: <Link2 className="w-4 h-4" /> },
    { id: "compose",  label: "Compose",   icon: <Send className="w-4 h-4" /> },
    { id: "jobs",     label: "Jobs",      icon: <BarChart2 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gray-950 border-b border-gray-900 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <VaultXLogo size="sm" showTagline={false} />
            <div>
              <h1 className="text-white font-black text-lg">Distribution Hub</h1>
              <p className="text-gray-500 text-xs">Package, post, attribute, and audit every VaultX launch lane.</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1 rounded-2xl border border-white/10 bg-black/40 p-1 text-center text-[10px] font-black uppercase tracking-[.12em] text-gray-500">
            <span className={activeTab === "channels" ? "rounded-xl bg-rose-500/15 py-2 text-rose-300" : "py-2"}>Channels</span>
            <span className={activeTab === "accounts" ? "rounded-xl bg-rose-500/15 py-2 text-rose-300" : "py-2"}>Accounts</span>
            <span className={activeTab === "compose" ? "rounded-xl bg-rose-500/15 py-2 text-rose-300" : "py-2"}>Compose</span>
            <span className={activeTab === "jobs" ? "rounded-xl bg-rose-500/15 py-2 text-rose-300" : "py-2"}>Jobs</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-950 border-b border-gray-900 px-4">
        <div className="max-w-2xl mx-auto flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-rose-500 text-white"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {activeTab === "channels" && <ChannelsTab />}
        {activeTab === "accounts" && <AccountsTab />}
        {activeTab === "compose" && <ComposeTab />}
        {activeTab === "jobs" && <JobsTab />}
      </div>
    </div>
  );
}
