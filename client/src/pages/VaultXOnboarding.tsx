import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { CheckCircle, ArrowRight, ArrowLeft, DollarSign, Lock, Zap, Star } from "lucide-react";

const STEPS = [
  { id: 1, title: "Welcome to VaultX", subtitle: "Your premium content monetization vault" },
  { id: 2, title: "Creator Profile", subtitle: "Set up your creator identity" },
  { id: 3, title: "Link Your Channel", subtitle: "Connect your Telegram channel" },
  { id: 4, title: "Monetization Setup", subtitle: "Configure how you earn" },
  { id: 5, title: "You're Ready!", subtitle: "Your vault is live" },
];

const niches = ["lifestyle","fitness","music","comedy","education","cooking","travel","gaming","beauty","business"];

export default function VaultXOnboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({ displayName: "", bio: "", niche: "lifestyle" });
  const [channel, setChannel] = useState({ handle: "", channelId: "" });
  const [monetization, setMonetization] = useState({ ppvEnabled: true, subscriptionEnabled: true, tipsEnabled: true, defaultPpvPrice: "9.99", subscriptionPrice: "14.99" });

  const updateProfile = trpc.vaultx?.updateCreatorProfile?.useMutation?.({ onSuccess: () => {} }) || { mutate: () => {}, isPending: false };
  const linkChannel = trpc.vaultx?.linkChannel?.useMutation?.({ onSuccess: () => {} }) || { mutate: () => {}, isPending: false };

  const handleNext = () => {
    if (step === 2 && profile.displayName) {
      updateProfile.mutate?.({ displayName: profile.displayName, bio: profile.bio, niche: profile.niche });
    }
    if (step === 3 && channel.channelId) {
      linkChannel.mutate?.({ channelId: channel.channelId, channelHandle: channel.handle });
    }
    if (step < 5) setStep(s => s + 1);
    else navigate("/vaultx/studio");
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step > s.id ? "bg-yellow-400 text-black" : step === s.id ? "bg-yellow-500 text-black ring-4 ring-yellow-500/30" : "bg-white/10 text-gray-500"}`}>
                {step > s.id ? <CheckCircle className="w-4 h-4" /> : s.id}
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 transition-all ${step > s.id ? "bg-yellow-400" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-yellow-400">{STEPS[step - 1].title}</h1>
          <p className="text-gray-400 mt-1">{STEPS[step - 1].subtitle}</p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Lock, label: "PPV Content", desc: "Charge per view", color: "text-yellow-400" },
                { icon: DollarSign, label: "Subscriptions", desc: "Monthly recurring", color: "text-green-400" },
                { icon: Zap, label: "Instant Tips", desc: "Fan support", color: "text-blue-400" },
              ].map(f => (
                <div key={f.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <f.icon className={`w-8 h-8 ${f.color} mx-auto mb-2`} />
                  <p className="font-semibold text-sm">{f.label}</p>
                  <p className="text-gray-500 text-xs">{f.desc}</p>
                </div>
              ))}
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <p className="text-yellow-400 font-semibold mb-1 flex items-center gap-2"><Star className="w-4 h-4" /> Why VaultX?</p>
              <p className="text-gray-300 text-sm">VaultX is the only platform built specifically for Caribbean creators. Upload once, monetize everywhere — Telegram, web, and mobile. Keep 85% of every dollar you earn.</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Display Name *</label>
              <input value={profile.displayName} onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))} placeholder="e.g., KingCam Official" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Bio</label>
              <textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Tell your fans who you are..." rows={3} className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 resize-none" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Content Niche</label>
              <div className="flex flex-wrap gap-2">
                {niches.map(n => (
                  <button key={n} onClick={() => setProfile(p => ({ ...p, niche: n }))} className={`px-3 py-1.5 rounded-full text-sm capitalize transition-all ${profile.niche === n ? "bg-yellow-500 text-black font-bold" : "bg-white/10 text-gray-400 hover:bg-white/20"}`}>{n}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
              <p className="font-semibold mb-1">How to connect your Telegram channel:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-300">
                <li>Open your Telegram channel settings</li>
                <li>Add <span className="text-yellow-400 font-mono">@CreatorVaultBot</span> as an admin</li>
                <li>Copy your channel ID (starts with -100...)</li>
                <li>Paste it below</li>
              </ol>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Channel Handle (optional)</label>
              <input value={channel.handle} onChange={e => setChannel(c => ({ ...c, handle: e.target.value }))} placeholder="@yourchannel" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Channel ID</label>
              <input value={channel.channelId} onChange={e => setChannel(c => ({ ...c, channelId: e.target.value }))} placeholder="-1001234567890" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500" />
            </div>
            <button onClick={() => setStep(s => s + 1)} className="text-sm text-gray-500 underline">Skip for now</button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="space-y-3">
              {[
                { key: "ppvEnabled" as const, label: "Pay-Per-View", desc: "Charge fans to unlock individual videos", icon: Lock },
                { key: "subscriptionEnabled" as const, label: "Subscriptions", desc: "Monthly recurring fan memberships", icon: Star },
                { key: "tipsEnabled" as const, label: "Tips", desc: "Accept direct fan support payments", icon: DollarSign },
              ].map(opt => (
                <div key={opt.key} onClick={() => setMonetization(m => ({ ...m, [opt.key]: !m[opt.key] }))} className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${monetization[opt.key] ? "bg-yellow-500/10 border-yellow-500/30" : "bg-white/5 border-white/10"}`}>
                  <div className="flex items-center gap-3">
                    <opt.icon className={`w-5 h-5 ${monetization[opt.key] ? "text-yellow-400" : "text-gray-500"}`} />
                    <div>
                      <p className="font-semibold text-sm">{opt.label}</p>
                      <p className="text-gray-500 text-xs">{opt.desc}</p>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-all relative ${monetization[opt.key] ? "bg-yellow-500" : "bg-white/20"}`}>
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${monetization[opt.key] ? "left-5" : "left-1"}`} />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Default PPV Price ($)</label>
                <input value={monetization.defaultPpvPrice} onChange={e => setMonetization(m => ({ ...m, defaultPpvPrice: e.target.value }))} type="number" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Subscription Price ($/mo)</label>
                <input value={monetization.subscriptionPrice} onChange={e => setMonetization(m => ({ ...m, subscriptionPrice: e.target.value }))} type="number" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500" />
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-yellow-400">Your VaultX is Live!</h2>
              <p className="text-gray-400 mt-2">You're all set to start monetizing your content. Upload your first video to the studio and start earning.</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[{ label: "85%", desc: "Revenue share" }, { label: "0%", desc: "Setup fees" }, { label: "24h", desc: "Payout speed" }].map(s => (
                <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-2xl font-bold text-yellow-400">{s.label}</p>
                  <p className="text-gray-400 text-sm">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : <div />}
          <button onClick={handleNext} disabled={step === 2 && !profile.displayName} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold px-6 py-3 rounded-xl transition-colors">
            {step === 5 ? "Enter VaultX Studio" : "Continue"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
