import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ViralOptimizer() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState<"youtube" | "tiktok" | "instagram" | "twitter">("youtube");
  const [result, setResult] = useState<any>(null);

  const optimize = trpc.viralOptimizer.analyze.useMutation();
  const history = trpc.viralOptimizer.getHistory.useQuery({ limit: 20 });

  const handleOptimize = async () => {
    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    const result = await optimize.mutateAsync({
      title,
      description,
      platform,
    });

    setResult(result);
    history.refetch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🚀 Viral Optimizer</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <Card className="bg-gray-900 p-6 border-2 border-purple-600">
            <h2 className="text-2xl font-bold mb-4">Analyze Content</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Title *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter your content title"
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter your content description"
                  className="bg-gray-800 border-gray-700 min-h-[100px]"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Platform *</label>
                <Select value={platform} onValueChange={(v: any) => setPlatform(v)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleOptimize}
                disabled={optimize.isPending}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {optimize.isPending ? "Analyzing..." : "Optimize for Virality"}
              </Button>
            </div>
          </Card>

          {/* Results */}
          <Card className="bg-gray-900 p-6 border-2 border-cyan-600">
            <h2 className="text-2xl font-bold mb-4">Results</h2>

            {result ? (
              <div className="space-y-4">
                <div>
                  <div className="text-6xl font-bold text-center mb-2">{result.viralScore}/100</div>
                  <div className="text-center text-gray-400">Viral Score</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-2xl font-bold">{result.hookScore}</div>
                    <div className="text-sm text-gray-400">Hook Score</div>
                  </div>
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-2xl font-bold">{result.qualityScore}</div>
                    <div className="text-sm text-gray-400">Quality Score</div>
                  </div>
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-2xl font-bold">{result.trendScore}</div>
                    <div className="text-sm text-gray-400">Trend Score</div>
                  </div>
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-2xl font-bold">{result.audienceScore}</div>
                    <div className="text-sm text-gray-400">Audience Score</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold mb-2">🎯 Viral Hooks</h3>
                  <ul className="space-y-1">
                    {result.hooks.map((hook: string, i: number) => (
                      <li key={i} className="text-sm bg-gray-800 p-2 rounded">{hook}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold mb-2">✨ Optimized Title</h3>
                  <div className="text-sm bg-gray-800 p-2 rounded">{result.optimizedTitle}</div>
                </div>

                <div>
                  <h3 className="font-bold mb-2">💡 Recommendations</h3>
                  <ul className="space-y-1">
                    {result.recommendations.map((rec: string, i: number) => (
                      <li key={i} className="text-sm text-gray-400">• {rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                Run an analysis to see results
              </div>
            )}
          </Card>
        </div>

        {/* History */}
        <Card className="bg-gray-900 p-6 border-2 border-blue-600 mt-8">
          <h2 className="text-2xl font-bold mb-4">📊 History</h2>

          {history.data && history.data.length > 0 ? (
            <div className="space-y-2">
              {history.data.map((item: any) => (
                <div key={item.id} className="bg-gray-800 p-3 rounded flex justify-between items-center">
                  <div>
                    <div className="font-bold">{item.title}</div>
                    <div className="text-sm text-gray-400">{item.platform} • {new Date(item.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-2xl font-bold">{item.viralScore}/100</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">No history yet</div>
          )}
        </Card>
      </div>
    </div>
  );
}
