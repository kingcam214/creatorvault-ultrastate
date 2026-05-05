import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Copy, Plus, Zap, Globe, TrendingUp, Play, Settings, CheckCircle, ArrowRight } from "lucide-react";

const PLATFORMS = ["OnlyFans","Fansly","Telegram","Instagram","TikTok","YouTube","Twitter/X","Kick"];
const STYLES = ["Luxury","Urban","Fitness","Comedy","Educational","Lifestyle","Music","Gaming"];

export default function KingCamClone() {
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [style, setStyle] = useState("Luxury");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["Telegram","OnlyFans"]);

  const { data: clones, refetch } = trpc.kingcamClone?.getKingcamClones?.useQuery?.(undefined, { retry: false }) || { data: [], refetch: () => {} };
  const createClone = trpc.kingcamClone?.createKingcamClone?.useMutation?.({ onSuccess: () => { refetch(); setShowCreate(false); setName(""); } }) || { mutate: () => {}, isPending: false };
  const trainClone = trpc.kingcamClone?.trainKingcamClone?.useMutation?.() || { mutate: () => {}, isPending: false };

  const togglePlatform = (p: string) => setSelectedPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Copy className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-yellow-400">KingCam Clone</h1>
              <p className="text-gray-400">Deploy AI-powered creator clones across every platform</p>
            </div>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-5 py-2.5 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Create Clone
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Clones", value: clones?.length || 0, icon: Copy, color: "text-yellow-400" },
            { label: "Platforms Covered", value: "8", icon: Globe, color: "text-blue-400" },
            { label: "Content Generated", value: "∞", icon: Zap, color: "text-purple-400" },
            { label: "Revenue Multiplier", value: `${(clones?.length || 0) + 1}x`, icon: TrendingUp, color: "text-green-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Create Clone Form */}
        {showCreate && (
          <div className="bg-white/5 border border-yellow-500/30 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-bold text-yellow-400 mb-5">Configure New Clone</h2>
            <div className="space-y-5">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Clone Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., KingCam DR, KingCam Fitness" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Content Style</label>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map(s => (
                    <button key={s} onClick={() => setStyle(s)} className={`px-3 py-1.5 rounded-full text-sm transition-all ${style === s ? "bg-yellow-500 text-black font-bold" : "bg-white/10 text-gray-400 hover:bg-white/20"}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Target Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map(p => (
                    <button key={p} onClick={() => togglePlatform(p)} className={`px-3 py-1.5 rounded-full text-sm transition-all ${selectedPlatforms.includes(p) ? "bg-blue-500 text-white font-bold" : "bg-white/10 text-gray-400 hover:bg-white/20"}`}>{p}</button>
                  ))}
                </div>
              </div>
              <button onClick={() => createClone.mutate?.({ name, style, platforms: selectedPlatforms })} disabled={!name || createClone.isPending} className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                {createClone.isPending ? "Creating..." : <><Zap className="w-4 h-4" /> Deploy Clone</>}
              </button>
            </div>
          </div>
        )}

        {/* Clone List */}
        {clones && clones.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-300">Your Active Clones</h2>
            {clones.map((clone: any) => (
              <div key={clone.id} className="bg-white/5 border border-white/10 hover:border-yellow-500/20 rounded-2xl p-5 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black font-bold text-lg">
                      {clone.name?.[0] || "K"}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{clone.name}</p>
                      <p className="text-gray-400 text-sm">Style: {clone.style} · {clone.platforms?.join(", ")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${clone.status === "active" ? "bg-green-500/20 text-green-400" : clone.status === "training" ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-500/20 text-gray-400"}`}>
                      {clone.status || "active"}
                    </span>
                    <button onClick={() => trainClone.mutate?.({ cloneId: clone.id, content: "latest" })} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Train
                    </button>
                    <button onClick={() => navigate(`/clone-empire-home`)} className="bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1">
                      <Play className="w-3 h-3" /> Manage
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
              <Copy className="w-10 h-10 text-yellow-400" />
            </div>
            <h2 className="text-xl font-bold text-yellow-400 mb-2">No Clones Yet</h2>
            <p className="text-gray-400 mb-6">Create your first AI clone to multiply your presence across every platform simultaneously.</p>
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-6">
              {[
                { step: "1", title: "Configure", desc: "Set name, style & platforms" },
                { step: "2", title: "Train", desc: "Feed it your content" },
                { step: "3", title: "Deploy", desc: "It posts 24/7 for you" },
              ].map(s => (
                <div key={s.step} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                  <div className="w-8 h-8 rounded-full bg-yellow-500 text-black font-bold flex items-center justify-center mx-auto mb-2 text-sm">{s.step}</div>
                  <p className="font-semibold text-sm">{s.title}</p>
                  <p className="text-gray-500 text-xs">{s.desc}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setShowCreate(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl transition-colors flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" /> Create Your First Clone
            </button>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <button onClick={() => navigate("/clone-empire-home")} className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-500/30 rounded-xl p-4 flex items-center gap-3 transition-all">
            <Globe className="w-5 h-5 text-yellow-400" />
            <div className="text-left">
              <p className="font-semibold">Clone Empire Home</p>
              <p className="text-gray-500 text-xs">Full empire overview</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-500 ml-auto" />
          </button>
          <button onClick={() => navigate("/king/clone-studio")} className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-500/30 rounded-xl p-4 flex items-center gap-3 transition-all">
            <Settings className="w-5 h-5 text-yellow-400" />
            <div className="text-left">
              <p className="font-semibold">Clone Studio</p>
              <p className="text-gray-500 text-xs">Advanced clone settings</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-500 ml-auto" />
          </button>
        </div>
      </div>
    </div>
  );
}
