/**
 * 🌟 JOIN VAULTLIVE - PUBLIC RECRUITMENT PAGE
 * 
 * Public landing page (no auth required) for influencer/celebrity recruitment
 * - Highlights 85% revenue split vs competitors
 * - Waitlist signup form
 * - Direct link to /onboard/influencer
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, DollarSign, Users, TrendingUp, Sparkles, Check, ArrowRight } from "lucide-react";

export default function JoinVaultLive() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Send to waitlist API
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900">
      {/* Hero Section */}
      <div className="container max-w-6xl py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-6">
            <Sparkles className="h-10 w-10 text-pink-500 animate-pulse" />
            <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              VaultLive
            </h1>
            <Sparkles className="h-10 w-10 text-purple-500 animate-pulse" />
          </div>
          <p className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 font-bold mb-2">
            The Dopest App in the World
          </p>
          <p className="text-3xl text-white font-semibold mb-4">
            The Live Streaming Platform Built for Creators
          </p>
          <p className="text-xl text-gray-300 mb-8">
            Keep 85% of your revenue. Stream directly to your fans. Get paid instantly.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => setLocation("/onboard/influencer")}
              className="h-14 px-8 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Start Streaming Now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
              className="h-14 px-8 text-lg border-purple-500/30 text-white hover:bg-purple-500/10"
            >
              Join Waitlist
            </Button>
          </div>
        </div>

        {/* Revenue Comparison */}
        <Card className="bg-black/40 border-purple-500/30 mb-16">
          <CardHeader>
            <CardTitle className="text-3xl text-center text-white">
              💰 Why VaultLive Pays More
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* VaultLive */}
              <div className="relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  BEST DEAL
                </div>
                <div className="p-6 rounded-lg bg-gradient-to-br from-green-500/20 to-purple-500/20 border-2 border-green-500">
                  <h3 className="text-2xl font-bold text-white mb-2">VaultLive</h3>
                  <div className="text-5xl font-bold text-green-400 mb-4">85%</div>
                  <p className="text-gray-300 mb-4">You keep 85% of all tips and donations</p>
                  <div className="space-y-2">
                    <div className="flex items-center text-green-400">
                      <Check className="h-5 w-5 mr-2" />
                      <span>Instant payouts</span>
                    </div>
                    <div className="flex items-center text-green-400">
                      <Check className="h-5 w-5 mr-2" />
                      <span>No hidden fees</span>
                    </div>
                    <div className="flex items-center text-green-400">
                      <Check className="h-5 w-5 mr-2" />
                      <span>WebRTC streaming</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fanbase */}
              <div className="p-6 rounded-lg bg-black/40 border border-gray-700">
                <h3 className="text-2xl font-bold text-white mb-2">Fanbase</h3>
                <div className="text-5xl font-bold text-gray-400 mb-4">80%</div>
                <p className="text-gray-400 mb-4">They keep 20% of your earnings</p>
                <div className="space-y-2">
                  <div className="flex items-center text-gray-500">
                    <span className="mr-2">•</span>
                    <span>Delayed payouts</span>
                  </div>
                  <div className="flex items-center text-gray-500">
                    <span className="mr-2">•</span>
                    <span>Processing fees</span>
                  </div>
                  <div className="flex items-center text-gray-500">
                    <span className="mr-2">•</span>
                    <span>Limited features</span>
                  </div>
                </div>
              </div>

              {/* OnlyFans */}
              <div className="p-6 rounded-lg bg-black/40 border border-gray-700">
                <h3 className="text-2xl font-bold text-white mb-2">OnlyFans</h3>
                <div className="text-5xl font-bold text-gray-400 mb-4">80%</div>
                <p className="text-gray-400 mb-4">They keep 20% of your earnings</p>
                <div className="space-y-2">
                  <div className="flex items-center text-gray-500">
                    <span className="mr-2">•</span>
                    <span>Weekly payouts</span>
                  </div>
                  <div className="flex items-center text-gray-500">
                    <span className="mr-2">•</span>
                    <span>High minimums</span>
                  </div>
                  <div className="flex items-center text-gray-500">
                    <span className="mr-2">•</span>
                    <span>Content restrictions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Example Earnings */}
            <div className="mt-8 p-6 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <h4 className="text-xl font-semibold text-white mb-4 text-center">
                💵 Example: $1,000 in Tips
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-green-400">$850</div>
                  <div className="text-gray-300">You keep (VaultLive)</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-400">$800</div>
                  <div className="text-gray-400">You keep (Fanbase)</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-400">$800</div>
                  <div className="text-gray-400">You keep (OnlyFans)</div>
                </div>
              </div>
              <p className="text-center text-green-400 font-semibold mt-4">
                ✨ You earn $50 more with VaultLive on every $1,000!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="bg-black/40 border-purple-500/30">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                  <DollarSign className="h-8 w-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">85% Revenue</h3>
                <p className="text-gray-400">
                  Industry-leading revenue split. Keep more of what you earn.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-pink-500/30">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center mb-4">
                  <Video className="h-8 w-8 text-pink-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">WebRTC Streaming</h3>
                <p className="text-gray-400">
                  Crystal-clear peer-to-peer streaming with zero delays.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-green-500/30">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Direct Connection</h3>
                <p className="text-gray-400">
                  Your fans tip you directly. No middlemen, no delays.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-yellow-500/30">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
                  <TrendingUp className="h-8 w-8 text-yellow-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Real-Time Analytics</h3>
                <p className="text-gray-400">
                  Track viewers, revenue, and engagement as you stream.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Waitlist Section */}
        <Card id="waitlist" className="bg-black/40 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-3xl text-center text-white">
              🚀 Join the Waitlist
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!submitted ? (
              <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
                <div>
                  <Label htmlFor="email" className="text-white">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="bg-black/50 border-purple-500/30 text-white"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  Join Waitlist
                </Button>
                <p className="text-center text-gray-400 text-sm">
                  Or <button type="button" onClick={() => setLocation("/onboard/influencer")} className="text-purple-400 hover:text-purple-300 underline">start streaming now</button>
                </p>
              </form>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-2">You're on the list!</h3>
                <p className="text-gray-300 mb-6">
                  We'll notify you when VaultLive is ready for you.
                </p>
                <Button
                  onClick={() => setLocation("/onboard/influencer")}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  Start Streaming Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-400 text-sm">
          <p>© 2024 VaultLive by CreatorVault. All rights reserved.</p>
          <p className="mt-2">
            <a href="/" className="text-purple-400 hover:text-purple-300">Home</a>
            {" • "}
            <a href="/onboard/influencer" className="text-purple-400 hover:text-purple-300">Sign Up</a>
          </p>
        </div>
      </div>
    </div>
  );
}
