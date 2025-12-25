import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, ArrowRight, CheckCircle } from "lucide-react";

export default function Demos() {
  const demos = [
    {
      title: "VaultLive Streaming",
      description: "See how creators go live and keep 85% of tips",
      thumbnail: "https://via.placeholder.com/640x360/8B5CF6/FFFFFF?text=VaultLive+Demo",
      videoUrl: "#", // Replace with actual video URLs
      features: ["Real-time tipping", "85/15 split", "Instant payouts"]
    },
    {
      title: "Creator Marketplace",
      description: "Sell digital products, physical goods, and services",
      thumbnail: "https://via.placeholder.com/640x360/EC4899/FFFFFF?text=Marketplace+Demo",
      videoUrl: "#",
      features: ["Digital downloads", "Physical shipping", "Service bookings"]
    },
    {
      title: "Subscription Tiers",
      description: "Build recurring revenue with 70/30 split",
      thumbnail: "https://via.placeholder.com/640x360/8B5CF6/FFFFFF?text=Subscriptions+Demo",
      videoUrl: "#",
      features: ["Multiple tiers", "Exclusive content", "Fan management"]
    },
    {
      title: "Podcast Studio",
      description: "Create, distribute, and monetize podcasts",
      thumbnail: "https://via.placeholder.com/640x360/EC4899/FFFFFF?text=Podcast+Demo",
      videoUrl: "#",
      features: ["Easy recording", "Auto-distribution", "Sponsorship tools"]
    },
    {
      title: "Social Media Audit",
      description: "See how much money you're leaving on the table",
      thumbnail: "https://via.placeholder.com/640x360/8B5CF6/FFFFFF?text=Audit+Demo",
      videoUrl: "#",
      features: ["Revenue analysis", "Growth insights", "Platform comparison"]
    },
    {
      title: "Creator Dashboard",
      description: "Manage everything from one place",
      thumbnail: "https://via.placeholder.com/640x360/EC4899/FFFFFF?text=Dashboard+Demo",
      videoUrl: "#",
      features: ["Earnings tracking", "Analytics", "Fan engagement"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-700">
      <div className="container max-w-7xl py-12 md:py-24 space-y-12">
        {/* Header */}
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold text-white">
            See CreatorVault in Action
          </h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto">
            Watch how creators are taking back control and keeping 85% of their earnings
          </p>
        </div>

        {/* Featured Demo */}
        <Card className="bg-black/60 border-white/20 backdrop-blur-xl overflow-hidden">
          <div className="aspect-video bg-gradient-to-br from-purple-600 to-pink-600 relative group cursor-pointer">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full bg-white/20 backdrop-blur p-6 group-hover:bg-white/30 transition-all">
                <Play className="h-12 w-12 text-white" fill="white" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <h3 className="text-2xl font-bold text-white">Platform Overview</h3>
              <p className="text-gray-200">Complete walkthrough of all features</p>
            </div>
          </div>
        </Card>

        {/* Demo Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {demos.map((demo, index) => (
            <Card key={index} className="bg-black/40 border-purple-400/30 backdrop-blur overflow-hidden group cursor-pointer hover:border-purple-400/60 transition-all">
              <div className="aspect-video relative overflow-hidden">
                <img 
                  src={demo.thumbnail} 
                  alt={demo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="rounded-full bg-white/20 backdrop-blur p-4">
                    <Play className="h-8 w-8 text-white" fill="white" />
                  </div>
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-white">{demo.title}</CardTitle>
                <CardDescription className="text-gray-300">
                  {demo.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {demo.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-purple-600 to-pink-600 border-0 text-center">
          <CardContent className="py-12 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Ready to Keep 85% of Your Earnings?
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Join the waitlist and be among the first creators to take back control
            </p>
            <Button 
              size="lg"
              onClick={() => window.location.href = '/waitlist'}
              className="bg-white text-purple-600 hover:bg-gray-100 font-semibold text-lg px-8"
            >
              Join Waitlist
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div className="space-y-2">
            <div className="text-4xl md:text-5xl font-bold text-white">85%</div>
            <div className="text-gray-300">Creator Revenue Share</div>
          </div>
          <div className="space-y-2">
            <div className="text-4xl md:text-5xl font-bold text-white">$0</div>
            <div className="text-gray-300">Platform Fees</div>
          </div>
          <div className="space-y-2">
            <div className="text-4xl md:text-5xl font-bold text-white">24h</div>
            <div className="text-gray-300">Payout Time</div>
          </div>
        </div>
      </div>
    </div>
  );
}
