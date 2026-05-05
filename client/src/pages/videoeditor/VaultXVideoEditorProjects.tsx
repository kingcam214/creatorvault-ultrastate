import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Film, Plus, Clock, Eye, DollarSign, Edit, Trash2, Play, Lock, Unlock } from "lucide-react";

export default function VaultXVideoEditorProjects() {
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState("all");

  const { data: projects, refetch } = trpc.vaultx?.getCreatorContent?.useQuery?.(undefined, { retry: false }) || { data: [], refetch: () => {} };

  const filtered = (projects || []).filter((p: any) => filter === "all" || p.unlockType === filter);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
              <Film className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-yellow-400">VaultX Projects</h1>
              <p className="text-gray-400 text-sm">All your monetized video content</p>
            </div>
          </div>
          <button onClick={() => navigate("/vaultx/studio")} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2.5 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Projects", value: projects?.length || 0, icon: Film, color: "text-yellow-400" },
            { label: "PPV Content", value: projects?.filter((p: any) => p.unlockType === "ppv").length || 0, icon: Lock, color: "text-red-400" },
            { label: "Free Content", value: projects?.filter((p: any) => p.unlockType === "free").length || 0, icon: Unlock, color: "text-green-400" },
            { label: "Total Revenue", value: `$${(projects?.reduce((acc: number, p: any) => acc + (p.priceCents || 0) / 100, 0) || 0).toFixed(2)}`, icon: DollarSign, color: "text-green-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {["all", "ppv", "free", "subscription"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${filter === f ? "bg-yellow-500 text-black" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>{f}</button>
          ))}
        </div>

        {/* Projects Grid */}
        {filtered.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project: any) => (
              <div key={project.id} className="bg-white/5 border border-white/10 hover:border-yellow-500/30 rounded-xl overflow-hidden transition-all group">
                <div className="aspect-video bg-gray-900 relative flex items-center justify-center">
                  {project.fileUrl ? (
                    <video src={project.fileUrl} className="w-full h-full object-cover" />
                  ) : (
                    <Film className="w-10 h-10 text-gray-600" />
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${project.unlockType === "ppv" ? "bg-red-500 text-white" : project.unlockType === "subscription" ? "bg-purple-500 text-white" : "bg-green-500 text-white"}`}>
                      {project.unlockType?.toUpperCase()}
                    </span>
                  </div>
                  <button onClick={() => navigate(`/vaultx/video-editor/${project.id}`)} className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-10 h-10 text-white" />
                  </button>
                </div>
                <div className="p-4">
                  <p className="font-semibold truncate">{project.title || "Untitled"}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-400 text-sm flex items-center gap-1"><Eye className="w-3 h-3" /> {project.viewCount || 0} views</span>
                    {project.priceCents > 0 && <span className="text-green-400 text-sm font-bold">${(project.priceCents / 100).toFixed(2)}</span>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => navigate(`/vaultx/video-editor/${project.id}`)} className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1">
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <Film className="w-12 h-12 mx-auto mb-3 text-gray-700" />
            <p className="text-lg font-medium">No projects yet</p>
            <p className="text-sm mt-1">Upload your first video to VaultX Studio to get started</p>
            <button onClick={() => navigate("/vaultx/studio")} className="mt-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-2.5 rounded-xl transition-colors">
              Open VaultX Studio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
