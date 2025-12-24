import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function HollywoodReplacement() {
  const [projectType, setProjectType] = useState<"short_film" | "series" | "documentary" | "commercial" | "music_video">("short_film");
  const [targetLength, setTargetLength] = useState(10);
  const [quality, setQuality] = useState<"1080p" | "4K" | "8K">("4K");
  const [includeMusic, setIncludeMusic] = useState(true);
  const [includeVoiceover, setIncludeVoiceover] = useState(true);

  const { data: capabilities } = trpc.hollywoodReplacement.getCapabilities.useQuery();
  const { data: valueProp } = trpc.hollywoodReplacement.getValueProp.useQuery();
  const { data: estimate } = trpc.hollywoodReplacement.generateProjectEstimate.useQuery({
    projectType,
    targetLength,
    quality,
    includeMusic,
    includeVoiceover
  });

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">🎬 Hollywood Replacement</h1>
        <p className="text-xl text-purple-400 mb-8">{valueProp?.tagline || "Hollywood Quality. Creator Budget."}</p>

        <div className="bg-gray-900 p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-bold mb-4">Configure Project</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block mb-2">Project Type</label>
              <select value={projectType} onChange={(e) => setProjectType(e.target.value as any)} className="w-full bg-gray-800 p-2 rounded">
                <option value="short_film">Short Film</option>
                <option value="series">Series</option>
                <option value="documentary">Documentary</option>
                <option value="commercial">Commercial</option>
                <option value="music_video">Music Video</option>
              </select>
            </div>
            <div>
              <label className="block mb-2">Length (minutes)</label>
              <input type="number" value={targetLength} onChange={(e) => setTargetLength(Number(e.target.value))} className="w-full bg-gray-800 p-2 rounded" />
            </div>
            <div>
              <label className="block mb-2">Quality</label>
              <select value={quality} onChange={(e) => setQuality(e.target.value as any)} className="w-full bg-gray-800 p-2 rounded">
                <option value="1080p">1080p</option>
                <option value="4K">4K</option>
                <option value="8K">8K</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={includeMusic} onChange={(e) => setIncludeMusic(e.target.checked)} />
              Include AI Music
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={includeVoiceover} onChange={(e) => setIncludeVoiceover(e.target.checked)} />
              Include AI Voiceover
            </label>
          </div>
        </div>

        {estimate && (
          <>
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="bg-red-900/20 border border-red-500 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4 text-red-400">Traditional Hollywood</h3>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>Crew</span><span>${estimate.costs.hollywood.crew.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Equipment</span><span>${estimate.costs.hollywood.equipment.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Location</span><span>${estimate.costs.hollywood.location.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Post-Production</span><span>${estimate.costs.hollywood.postProduction.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Distribution</span><span>${estimate.costs.hollywood.distribution.toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold text-xl pt-2 border-t border-red-500"><span>Total</span><span className="text-red-400">${estimate.costs.hollywood.total.toLocaleString()}</span></div>
                </div>
              </div>

              <div className="bg-purple-900/20 border-2 border-purple-500 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4 text-purple-400">CreatorVault AI</h3>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>AI Generation</span><span>${estimate.costs.creatorVault.aiGeneration.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Rendering</span><span>${estimate.costs.creatorVault.rendering.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Storage</span><span>${estimate.costs.creatorVault.storage.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Distribution</span><span>${estimate.costs.creatorVault.distribution.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-xl pt-2 border-t border-purple-500"><span>Total</span><span className="text-green-400">${estimate.costs.creatorVault.total.toFixed(2)}</span></div>
                </div>
                <div className="mt-4 p-3 bg-green-500/20 border border-green-500 rounded text-center">
                  <p className="text-green-400 font-bold">💰 Save ${estimate.costs.savings.toFixed(2)} ({estimate.costs.savingsPercentage.toFixed(1)}%)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="bg-gray-900 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4">Hollywood Timeline</h3>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>Pre-Production</span><span>{estimate.timeline.hollywood.preProduction} days</span></div>
                  <div className="flex justify-between"><span>Production</span><span>{estimate.timeline.hollywood.production} days</span></div>
                  <div className="flex justify-between"><span>Post-Production</span><span>{estimate.timeline.hollywood.postProduction} days</span></div>
                  <div className="flex justify-between font-bold text-xl pt-2 border-t border-gray-700"><span>Total</span><span className="text-red-400">{estimate.timeline.hollywood.total} days</span></div>
                </div>
              </div>

              <div className="bg-gray-900 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4">CreatorVault Timeline</h3>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>Scripting</span><span>{estimate.timeline.creatorVault.scripting} days</span></div>
                  <div className="flex justify-between"><span>AI Generation</span><span>{estimate.timeline.creatorVault.aiGeneration} days</span></div>
                  <div className="flex justify-between"><span>Rendering</span><span>{estimate.timeline.creatorVault.rendering} days</span></div>
                  <div className="flex justify-between font-bold text-xl pt-2 border-t border-gray-700"><span>Total</span><span className="text-green-400">{estimate.timeline.creatorVault.total} days</span></div>
                </div>
                <div className="mt-4 p-3 bg-green-500/20 border border-green-500 rounded text-center">
                  <p className="text-green-400 font-bold">⏱️ Save {estimate.timeline.timeSavings} days ({estimate.timeline.timeSavingsPercentage.toFixed(1)}%)</p>
                </div>
              </div>
            </div>
          </>
        )}

        {capabilities && (
          <div className="bg-gray-900 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">AI Production Capabilities</h2>
            <div className="grid grid-cols-2 gap-4">
              {capabilities.map((cap, i) => (
                <div key={i} className="bg-gray-800 p-4 rounded">
                  <h4 className="font-bold mb-1">✅ {cap.name}</h4>
                  <p className="text-sm text-gray-400 mb-2">{cap.description}</p>
                  <p className="text-xs text-green-400 font-semibold">{cap.costSavings}% cost savings</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center mt-8">
          <button className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-lg font-bold text-lg">
            🎬 Start Your Hollywood Project
          </button>
          <p className="text-gray-400 mt-4">99% cheaper • 95% faster • 100% creative control</p>
        </div>
      </div>
    </div>
  );
}
