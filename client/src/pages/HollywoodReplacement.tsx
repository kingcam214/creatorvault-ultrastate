/**
 * 🎬 HOLLYWOOD REPLACEMENT - AI PRODUCTION TOOLS
 * 
 * Hollywood Quality. Creator Budget.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Film, Clock, DollarSign, Sparkles, CheckCircle2, TrendingDown } from "lucide-react";

export default function HollywoodReplacement() {
  const [projectType, setProjectType] = useState<"short_film" | "series" | "documentary" | "commercial" | "music_video">("short_film");
  const [targetLength, setTargetLength] = useState(10);
  const [quality, setQuality] = useState<"1080p" | "4K" | "8K">("4K");
  const [includeMusic, setIncludeMusic] = useState(true);
  const [includeVoiceover, setIncludeVoiceover] = useState(true);

  // Get capabilities
  const { data: capabilities } = trpc.hollywoodReplacement.getCapabilities.useQuery();

  // Get value prop
  const { data: valueProp } = trpc.hollywoodReplacement.getValueProp.useQuery();

  // Generate project estimate
  const { data: estimate } = trpc.hollywoodReplacement.generateProjectEstimate.useQuery({
    projectType,
    targetLength,
    quality,
    includeMusic,
    includeVoiceover
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-orange-900">
      <div className="container max-w-7xl py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Film className="h-12 w-12 text-purple-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
              Hollywood Replacement
            </h1>
          </div>
          <p className="text-2xl text-white font-semibold mb-2">
            {valueProp?.tagline || "Hollywood Quality. Creator Budget."}
          </p>
          <p className="text-lg text-gray-300">
            AI-powered content production • 99% cost reduction • 95% time savings
          </p>
        </div>

        {/* Project Configuration */}
        <Card className="bg-black/40 border-purple-500/30 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Configure Your Project
            </CardTitle>
            <CardDescription>Tell us about your production</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="projectType" className="text-white">Project Type</Label>
                <Select value={projectType} onValueChange={(v: any) => setProjectType(v)}>
                  <SelectTrigger className="bg-black/40 border-purple-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short_film">Short Film</SelectItem>
                    <SelectItem value="series">Series</SelectItem>
                    <SelectItem value="documentary">Documentary</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="music_video">Music Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="targetLength" className="text-white">Target Length (minutes)</Label>
                <Input
                  id="targetLength"
                  type="number"
                  value={targetLength}
                  onChange={(e) => setTargetLength(Number(e.target.value))}
                  className="bg-black/40 border-purple-500/30 text-white"
                />
              </div>
              <div>
                <Label htmlFor="quality" className="text-white">Quality</Label>
                <Select value={quality} onValueChange={(v: any) => setQuality(v)}>
                  <SelectTrigger className="bg-black/40 border-purple-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1080p">1080p</SelectItem>
                    <SelectItem value="4K">4K</SelectItem>
                    <SelectItem value="8K">8K</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="includeMusic"
                  checked={includeMusic}
                  onCheckedChange={setIncludeMusic}
                />
                <Label htmlFor="includeMusic" className="text-white">Include AI Music</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="includeVoiceover"
                  checked={includeVoiceover}
                  onCheckedChange={setIncludeVoiceover}
                />
                <Label htmlFor="includeVoiceover" className="text-white">Include AI Voiceover</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Comparison */}
        {estimate && (
          <>
            <Card className="bg-black/40 border-orange-500/30 mb-8">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-orange-400" />
                  Cost Comparison
                </CardTitle>
                <CardDescription>See how much you save with AI production</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Hollywood Traditional */}
                  <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <h3 className="text-red-400 font-semibold text-lg mb-4">Traditional Hollywood</h3>
                    <div className="space-y-2 text-white">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Crew</span>
                        <span>${estimate.costs.hollywood.crew.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Equipment</span>
                        <span>${estimate.costs.hollywood.equipment.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Location</span>
                        <span>${estimate.costs.hollywood.location.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Post-Production</span>
                        <span>${estimate.costs.hollywood.postProduction.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Distribution</span>
                        <span>${estimate.costs.hollywood.distribution.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-red-500/30 font-bold text-xl">
                        <span>Total</span>
                        <span className="text-red-400">${estimate.costs.hollywood.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* CreatorVault AI */}
                  <div className="p-6 bg-gradient-to-br from-purple-500/20 to-orange-500/20 border-2 border-purple-500 rounded-lg">
                    <h3 className="text-purple-400 font-semibold text-lg mb-4">CreatorVault AI</h3>
                    <div className="space-y-2 text-white">
                      <div className="flex justify-between">
                        <span className="text-gray-400">AI Generation</span>
                        <span>${estimate.costs.creatorVault.aiGeneration.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Rendering</span>
                        <span>${estimate.costs.creatorVault.rendering.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Storage</span>
                        <span>${estimate.costs.creatorVault.storage.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Distribution</span>
                        <span>${estimate.costs.creatorVault.distribution.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-purple-500/30 font-bold text-xl">
                        <span>Total</span>
                        <span className="text-green-400">${estimate.costs.creatorVault.total.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded text-center">
                      <p className="text-green-400 font-bold flex items-center justify-center gap-2">
                        <TrendingDown className="h-5 w-5" />
                        Save ${estimate.costs.savings.toFixed(2)} ({estimate.costs.savingsPercentage.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline Comparison */}
            <Card className="bg-black/40 border-blue-500/30 mb-8">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-400" />
                  Timeline Comparison
                </CardTitle>
                <CardDescription>Complete projects in days, not months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Hollywood Timeline */}
                  <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <h3 className="text-red-400 font-semibold text-lg mb-4">Traditional Hollywood</h3>
                    <div className="space-y-2 text-white">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Pre-Production</span>
                        <span>{estimate.timeline.hollywood.preProduction} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Production</span>
                        <span>{estimate.timeline.hollywood.production} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Post-Production</span>
                        <span>{estimate.timeline.hollywood.postProduction} days</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-red-500/30 font-bold text-xl">
                        <span>Total</span>
                        <span className="text-red-400">{estimate.timeline.hollywood.total} days</span>
                      </div>
                    </div>
                  </div>

                  {/* CreatorVault Timeline */}
                  <div className="p-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-blue-500 rounded-lg">
                    <h3 className="text-blue-400 font-semibold text-lg mb-4">CreatorVault AI</h3>
                    <div className="space-y-2 text-white">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Scripting</span>
                        <span>{estimate.timeline.creatorVault.scripting} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">AI Generation</span>
                        <span>{estimate.timeline.creatorVault.aiGeneration} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Rendering</span>
                        <span>{estimate.timeline.creatorVault.rendering} days</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-blue-500/30 font-bold text-xl">
                        <span>Total</span>
                        <span className="text-green-400">{estimate.timeline.creatorVault.total} days</span>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded text-center">
                      <p className="text-green-400 font-bold flex items-center justify-center gap-2">
                        <TrendingDown className="h-5 w-5" />
                        Save {estimate.timeline.timeSavings} days ({estimate.timeline.timeSavingsPercentage.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Capabilities */}
        {capabilities && (
          <Card className="bg-black/40 border-purple-500/30 mb-8">
            <CardHeader>
              <CardTitle className="text-white">AI Production Capabilities</CardTitle>
              <CardDescription>Everything you need to create Hollywood-quality content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {capabilities.map((cap, index) => (
                  <div
                    key={index}
                    className="p-4 bg-black/40 border border-purple-500/30 rounded-lg hover:border-purple-500 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-400 mt-1 flex-shrink-0" />
                      <div>
                        <h4 className="text-white font-semibold mb-1">{cap.name}</h4>
                        <p className="text-gray-400 text-sm mb-2">{cap.description}</p>
                        <p className="text-green-400 text-xs font-semibold">
                          {cap.costSavings}% cost savings vs traditional
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <div className="text-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700"
          >
            <Film className="mr-2 h-5 w-5" />
            Start Your Hollywood Project
          </Button>
          <p className="text-gray-400 mt-4">
            99% cheaper • 95% faster • 100% creative control
          </p>
        </div>
      </div>
    </div>
  );
}
