/**
 * 🌟 INFLUENCER DASHBOARD
 * 
 * VaultLive-first dashboard for influencers and celebrities
 * Shows streaming metrics, revenue tracking, and quick actions
 */

import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Video, DollarSign, Users, TrendingUp, Play, BarChart3, Settings } from "lucide-react";

export default function InfluencerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch influencer stats
  const { data: stats, isLoading } = trpc.vaultLive.getCreatorStats.useQuery(
    undefined,
    { enabled: !!user }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900">
      <div className="container py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {user?.name || "Creator"}! 🌟
          </h1>
          <p className="text-xl text-gray-300">
            Your VaultLive command center
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Button
            onClick={() => setLocation("/vault-live")}
            className="h-24 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Play className="h-6 w-6 mr-2" />
            Go Live Now
          </Button>
          
          <Button
            onClick={() => setLocation("/creator-analytics")}
            variant="outline"
            className="h-24 text-lg border-purple-500/30 text-white hover:bg-purple-500/10"
          >
            <BarChart3 className="h-6 w-6 mr-2" />
            View Analytics
          </Button>
          
          <Button
            onClick={() => setLocation("/owner-control")}
            variant="outline"
            className="h-24 text-lg border-purple-500/30 text-white hover:bg-purple-500/10"
          >
            <Settings className="h-6 w-6 mr-2" />
            Settings
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Total Streams */}
          <Card className="bg-black/40 border-purple-500/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Total Streams
              </CardTitle>
              <Video className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats?.totalStreams || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                All time
              </p>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className="bg-black/40 border-pink-500/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Total Revenue (85%)
              </CardTitle>
              <DollarSign className="h-4 w-4 text-pink-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                ${((stats?.totalRevenue || 0) / 100).toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Your earnings
              </p>
            </CardContent>
          </Card>

          {/* Total Viewers */}
          <Card className="bg-black/40 border-green-500/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Total Viewers
              </CardTitle>
              <Users className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats?.totalViewers || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Unique viewers
              </p>
            </CardContent>
          </Card>

          {/* Avg Revenue per Stream */}
          <Card className="bg-black/40 border-yellow-500/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                Avg per Stream
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                ${stats?.totalStreams && stats.totalStreams > 0
                  ? ((stats.totalRevenue / stats.totalStreams) / 100).toFixed(2)
                  : "0.00"
                }
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Revenue per stream
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Streams */}
        <Card className="bg-black/40 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white">Recent Streams</CardTitle>
            <CardDescription className="text-gray-400">
              Your latest streaming activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentStreams && stats.recentStreams.length > 0 ? (
              <div className="space-y-4">
                {stats.recentStreams.map((stream: any) => (
                  <div
                    key={stream.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-purple-500/10 border border-purple-500/20"
                  >
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{stream.title}</h3>
                      <p className="text-sm text-gray-400">
                        {new Date(stream.startedAt).toLocaleDateString()} • {stream.viewerCount} viewers
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-green-400">
                        ${((stream.totalRevenue || 0) / 100).toFixed(2)}
                      </div>
                      <p className="text-xs text-gray-500">
                        {stream.status === "live" ? "🔴 Live" : "Ended"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Video className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No streams yet
                </h3>
                <p className="text-gray-400 mb-6">
                  Start your first VaultLive stream and connect with your fans!
                </p>
                <Button
                  onClick={() => setLocation("/vault-live")}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Go Live Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips & Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {/* VaultLive Tips */}
          <Card className="bg-black/40 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white">Streaming Tips 💡</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-300">
              <p>• <strong>Stream consistently:</strong> Regular schedules build loyal audiences</p>
              <p>• <strong>Engage with viewers:</strong> Respond to comments and tips in real-time</p>
              <p>• <strong>Set stream goals:</strong> Give viewers a reason to tip and support you</p>
              <p>• <strong>Promote your streams:</strong> Share on Instagram, TikTok, and Twitter</p>
            </CardContent>
          </Card>

          {/* Revenue Breakdown */}
          <Card className="bg-black/40 border-pink-500/30">
            <CardHeader>
              <CardTitle className="text-white">Revenue Split 💰</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">You keep</span>
                  <span className="text-green-400 font-semibold">85%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: "85%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Platform fee</span>
                  <span className="text-purple-400 font-semibold">15%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: "15%" }} />
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-4">
                Example: $100 in tips = <strong className="text-green-400">$85 for you</strong>, $15 platform fee
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
