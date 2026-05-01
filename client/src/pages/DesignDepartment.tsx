import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Palette, Image, Type, Layout, Sparkles, Download } from "lucide-react";
import { Link } from "wouter";

export default function DesignDepartment() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("modern");
  const genDesign = trpc.designDepartment?.generateDesign?.useMutation?.() || { mutate: () => {}, isPending: false, data: null };

  const tools = [
    { label: "Flyer Generator", href: "/flyer-generator", icon: "📄", desc: "AI-powered promotional flyers" },
    { label: "Animated Flyer", href: "/animated-flyer-studio", icon: "✨", desc: "Motion graphics & animations" },
    { label: "Business Cards", href: "/business-cards", icon: "💼", desc: "Professional card designs" },
    { label: "Album Covers", href: "/album-cover-designer", icon: "🎵", desc: "Music artwork & covers" },
    { label: "Thumbnail Studio", href: "/thumbnail-generator", icon: "🖼️", desc: "YouTube & social thumbnails" },
    { label: "Brand Assets", href: "/brand-assets", icon: "🎨", desc: "Logos, colors, typography" },
    { label: "Apparel Lab", href: "/apparel-lab", icon: "👕", desc: "Merch & clothing designs" },
    { label: "NFC Cards", href: "/nfc-cards", icon: "📱", desc: "Digital business cards" },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Palette className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Design Department</h1>
            <p className="text-gray-400">AI-powered creative studio for all your visual needs</p>
          </div>
        </div>

        {/* Quick Generate */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6 mb-8">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-400" /> Quick Design Generator</h2>
          <div className="flex gap-3">
            <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe your design (e.g., 'bold flyer for music event, gold and black')..." className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
            <select value={style} onChange={e => setStyle(e.target.value)} className="bg-white/10 border border-white/20 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-purple-500">
              <option value="modern">Modern</option>
              <option value="luxury">Luxury</option>
              <option value="urban">Urban</option>
              <option value="minimal">Minimal</option>
              <option value="bold">Bold</option>
            </select>
            <button onClick={() => genDesign.mutate?.({ prompt, style })} disabled={!prompt || genDesign.isPending} className="bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-lg transition-colors flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> {genDesign.isPending ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>

        {/* Design Tools Grid */}
        <h2 className="text-lg font-semibold text-gray-300 mb-4">Design Tools</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tools.map(tool => (
            <Link key={tool.href} href={tool.href}>
              <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 rounded-xl p-4 cursor-pointer transition-all group text-center">
                <div className="text-3xl mb-2">{tool.icon}</div>
                <p className="font-semibold text-sm group-hover:text-purple-400 transition-colors">{tool.label}</p>
                <p className="text-gray-500 text-xs mt-1">{tool.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Designs */}
        <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Image className="w-4 h-4 text-purple-400" /> Recent Designs</h3>
          <div className="text-center py-8 text-gray-500">
            <Palette className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No designs yet. Use a tool above to create your first design.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
