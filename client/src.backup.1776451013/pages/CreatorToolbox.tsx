import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CreatorToolbox() {
  const tools = [
    {
      name: "Viral Optimizer",
      route: "/tools/viral-optimizer",
      description: "Analyze and optimize content for maximum virality",
      icon: "🚀",
    },
    {
      name: "Content Orchestrator",
      route: "/tools/content-orchestrator",
      description: "Multi-platform content repurposing and distribution",
      icon: "🎬",
    },
    {
      name: "Ad Optimizer",
      route: "/tools/ad-optimizer",
      description: "Create and optimize Facebook/Instagram ads",
      icon: "📊",
    },
    {
      name: "Thumbnail Generator",
      route: "/tools/thumbnail-generator",
      description: "Generate high-CTR YouTube thumbnails",
      icon: "🖼️",
    },
    {
      name: "KingCam Demo Engine",
      route: "/tools/kingcam-demos",
      description: "Generate demo content and virtual tours",
      icon: "👑",
    },
    {
      name: "Video Studio",
      route: "/tools/video-studio",
      description: "AI-powered video scene generation",
      icon: "🎥",
    },
    {
      name: "Content Scheduler",
      route: "/tools/content-scheduler",
      description: "Schedule and export content to platforms",
      icon: "📅",
    },
    {
      name: "Performance Dashboard",
      route: "/tools/performance-dashboard",
      description: "Analytics and performance feedback",
      icon: "📈",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-blue-900 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4">🛠️ Creator Toolbox</h1>
          <p className="text-xl text-gray-300">
            AI-powered tools to create, optimize, and monetize your content
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tools.map((tool) => (
            <Link key={tool.route} href={tool.route}>
              <Card className="bg-gray-900 p-6 border-2 border-blue-600 hover:border-cyan-400 transition-all cursor-pointer h-full">
                <div className="text-6xl mb-4">{tool.icon}</div>
                <h3 className="text-xl font-bold mb-2">{tool.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{tool.description}</p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Open Tool
                </Button>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
