import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Video, Zap, Play, Download, Clock, CheckCircle, AlertCircle, Loader, Film, Mic, Image } from "lucide-react";

const RENDER_MODES = [
  { id: "talking-head", label: "Talking Head", desc: "AI clone speaks your script", icon: Mic },
  { id: "full-body", label: "Full Body", desc: "Full body AI video generation", icon: Video },
  { id: "image-to-video", label: "Image to Video", desc: "Animate a static image", icon: Image },
];

export default function CloneRenderStudio() {
  const [mode, setMode] = useState("talking-head");
  const [script, setScript] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [voiceStyle, setVoiceStyle] = useState("natural");
  const [rendering, setRendering] = useState(false);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);

  const { data: history } = trpc.cloneEmpire?.listCloneVideos?.useQuery?.(undefined, { retry: false }) || { data: [] };

  const generateTalkingHead = trpc.cloneEmpire?.generateTalkingHeadWithScript?.useMutation?.({
    onSuccess: (data: any) => { setRendering(false); if (data?.videoUrl) setRenderedUrl(data.videoUrl); },
    onError: () => setRendering(false),
  }) || { mutate: () => {}, isPending: false };

  const generateFullBody = trpc.cloneEmpire?.generateFullBodyVideo?.useMutation?.({
    onSuccess: (data: any) => { setRendering(false); if (data?.videoUrl) setRenderedUrl(data.videoUrl); },
    onError: () => setRendering(false),
  }) || { mutate: () => {}, isPending: false };

  const generateImage = trpc.cloneEmpire?.generateCloneImage?.useMutation?.({
    onSuccess: (data: any) => { setRendering(false); if (data?.imageUrl) setRenderedUrl(data.imageUrl); },
    onError: () => setRendering(false),
  }) || { mutate: () => {}, isPending: false };

  const handleRender = () => {
    if (!script && mode !== "image-to-video") return;
    setRendering(true);
    setRenderedUrl(null);
    if (mode === "talking-head") generateTalkingHead.mutate?.({ script });
    else if (mode === "full-body") generateFullBody.mutate?.({ script, style: "studio" });
    else if (mode === "image-to-video") generateImage.mutate?.({ prompt: script || "animate this image", style: "studio" });
  };

  const isPending = generateTalkingHead.isPending || generateFullBody.isPending || generateImage.isPending || rendering;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Film className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Clone Render Studio</h1>
            <p className="text-gray-400">Generate AI clone videos with your voice and likeness</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Controls */}
          <div className="space-y-5">
            {/* Mode Selection */}
            <div>
              <label className="text-sm text-gray-400 mb-2 block font-medium">Render Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {RENDER_MODES.map(m => (
                  <button key={m.id} onClick={() => setMode(m.id)} className={`p-3 rounded-xl border text-center transition-all ${mode === m.id ? "bg-purple-500/20 border-purple-500/50 text-purple-400" : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"}`}>
                    <m.icon className="w-5 h-5 mx-auto mb-1" />
                    <p className="text-xs font-medium">{m.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Script */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block font-medium">
                {mode === "image-to-video" ? "Animation Prompt" : "Script / Dialogue"}
              </label>
              <textarea
                value={script}
                onChange={e => setScript(e.target.value)}
                placeholder={mode === "image-to-video" ? "Describe the animation (e.g., 'person turns head and smiles')..." : "Enter what your clone will say..."}
                rows={6}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
              />
              <p className="text-gray-600 text-xs mt-1">{script.length} characters</p>
            </div>

            {mode === "image-to-video" && (
              <div>
                <label className="text-sm text-gray-400 mb-1 block font-medium">Source Image URL</label>
                <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
              </div>
            )}

            {/* Voice Style */}
            {mode !== "image-to-video" && (
              <div>
                <label className="text-sm text-gray-400 mb-2 block font-medium">Voice Style</label>
                <div className="flex gap-2">
                  {["natural","energetic","calm","authoritative"].map(v => (
                    <button key={v} onClick={() => (setVoiceStyle as (v: string) => void)(v)} className={`flex-1 py-2 rounded-lg text-sm capitalize transition-all ${voiceStyle === v ? "bg-purple-500 text-white font-bold" : "bg-white/10 text-gray-400 hover:bg-white/20"}`}>{v}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Render Button */}
            <button
              onClick={handleRender}
              disabled={isPending || (!script && mode !== "image-to-video")}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 text-lg"
            >
              {isPending ? (
                <><Loader className="w-5 h-5 animate-spin" /> Rendering...</>
              ) : (
                <><Zap className="w-5 h-5" /> Render Clone Video</>
              )}
            </button>

            {isPending && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-purple-400 mb-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="font-medium">AI is generating your clone video...</span>
                </div>
                <p className="text-gray-500 text-sm">This typically takes 30–90 seconds</p>
              </div>
            )}
          </div>

          {/* Right: Preview */}
          <div className="space-y-5">
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
                {renderedUrl ? (
                  mode === "image-to-video" ? (
                    <img src={renderedUrl} alt="Generated" className="w-full h-full object-cover" />
                  ) : (
                    <video src={renderedUrl} controls className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="text-center text-gray-600">
                    <Film className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm">Your rendered video will appear here</p>
                  </div>
                )}
              </div>
              {renderedUrl && (
                <div className="p-4 flex gap-3">
                  <a href={renderedUrl} download className="flex-1 bg-green-500/20 hover:bg-green-500/40 text-green-400 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" /> Download
                  </a>
                  <button className="flex-1 bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <Play className="w-4 h-4" /> Publish to VaultX
                  </button>
                </div>
              )}
            </div>

            {/* History */}
            <div>
              <h3 className="font-semibold text-gray-300 mb-3">Recent Renders</h3>
              {history && (history as any)?.videos?.length > 0 ? (
                <div className="space-y-2">
                  {((history as any)?.videos ?? []).slice(0, 5).map((item: any, i: number) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Film className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title || `Clone Video ${i + 1}`}</p>
                        <p className="text-gray-500 text-xs">{item.status || "completed"}</p>
                      </div>
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-sm">No renders yet. Create your first clone video above.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
