import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Mic, Globe, Play, Upload, Languages, Zap } from "lucide-react";

export default function DubbingAI() {
  const [videoUrl, setVideoUrl] = useState("");
  const [targetLang, setTargetLang] = useState("es");
  const [voice, setVoice] = useState("natural");

  const languages = [
    { code: "es", name: "Spanish", flag: "🇪🇸" },
    { code: "fr", name: "French", flag: "🇫🇷" },
    { code: "pt", name: "Portuguese", flag: "🇧🇷" },
    { code: "de", name: "German", flag: "🇩🇪" },
    { code: "it", name: "Italian", flag: "🇮🇹" },
    { code: "ja", name: "Japanese", flag: "🇯🇵" },
    { code: "ko", name: "Korean", flag: "🇰🇷" },
    { code: "zh", name: "Chinese", flag: "🇨🇳" },
    { code: "ar", name: "Arabic", flag: "🇸🇦" },
    { code: "hi", name: "Hindi", flag: "🇮🇳" },
    { code: "ht", name: "Haitian Creole", flag: "🇭🇹" },
    { code: "ru", name: "Russian", flag: "🇷🇺" },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Languages className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Dubbing AI</h1>
            <p className="text-gray-400">Translate & dub your videos into 12+ languages with AI voice cloning</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Languages", value: "12+", icon: Globe, color: "text-blue-400" },
            { label: "Voice Quality", value: "Studio", icon: Mic, color: "text-green-400" },
            { label: "Turnaround", value: "< 5 min", icon: Zap, color: "text-yellow-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <s.icon className={`w-6 h-6 ${s.color} mx-auto mb-2`} />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Main Form */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="font-bold text-lg mb-4">Dub Your Video</h2>
          
          {/* Video Input */}
          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-2 block">Video URL or Upload</label>
            <div className="flex gap-3">
              <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="Paste video URL (YouTube, direct link, etc.)" className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
              <button className="bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-3 rounded-lg transition-colors flex items-center gap-2">
                <Upload className="w-4 h-4" /> Upload
              </button>
            </div>
          </div>

          {/* Language Selection */}
          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-2 block">Target Language</label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {languages.map(lang => (
                <button key={lang.code} onClick={() => setTargetLang(lang.code)} className={`p-2 rounded-lg border text-center transition-all ${targetLang === lang.code ? "border-blue-500 bg-blue-500/20" : "border-white/10 bg-white/5 hover:border-white/30"}`}>
                  <div className="text-xl">{lang.flag}</div>
                  <div className="text-xs mt-1 text-gray-300">{lang.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Style */}
          <div className="mb-6">
            <label className="text-sm text-gray-400 mb-2 block">Voice Style</label>
            <div className="flex gap-2">
              {["natural", "energetic", "professional", "casual"].map(v => (
                <button key={v} onClick={() => setVoice(v)} className={`px-4 py-2 rounded-lg text-sm capitalize transition-all ${voice === v ? "bg-blue-500 text-white" : "bg-white/10 text-gray-400 hover:bg-white/20"}`}>{v}</button>
              ))}
            </div>
          </div>

          <button disabled={!videoUrl} className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
            <Languages className="w-5 h-5" /> Start Dubbing
          </button>
        </div>

        {/* How it works */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h3 className="font-bold mb-3">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Upload Video", desc: "Paste a URL or upload your video file" },
              { step: "2", title: "Choose Language", desc: "Select from 12+ target languages" },
              { step: "3", title: "AI Dubs It", desc: "AI translates and clones the voice in the new language" },
            ].map(s => (
              <div key={s.step} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm flex-shrink-0">{s.step}</div>
                <div>
                  <p className="font-semibold text-sm">{s.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
