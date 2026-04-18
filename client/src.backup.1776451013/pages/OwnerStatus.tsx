/**
 * Owner Status Dashboard
 * 
 * Single-screen view showing:
 * - What works
 * - What earns
 * - What's pending
 * - What advanced while owner was offline
 */

import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function OwnerStatus() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch system stats
  const { data: stats, isLoading: statsLoading } = trpc.ownerControl.getStats.useQuery();
  const { data: logs, isLoading: logsLoading } = trpc.ownerControl.getLogs.useQuery({ limit: 10 });
  const { data: bots, isLoading: botsLoading } = trpc.ownerControl.getBots.useQuery();

  if (authLoading || statsLoading || logsLoading || botsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Owner Status...</div>
      </div>
    );
  }

  if (!user || (user.role !== "king" && user.role !== "admin")) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 flex items-center justify-center">
        <Card className="p-8 bg-black/40 border-white/10">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">Owner/Admin access required</p>
          <Button onClick={() => setLocation("/")}>Go Home</Button>
        </Card>
      </div>
    );
  }

  const activeBots = bots?.filter((bot: any) => bot.status === "active") || [];
  const totalBots = bots?.length || 0;
  const recentLogs = logs?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Owner Status</h1>
            <p className="text-purple-200">Real-time system overview</p>
          </div>
          <Button onClick={() => setLocation("/owner-control")} variant="outline" className="border-white/20 text-white">
            Full Control Panel →
          </Button>
        </div>

        {/* What Works */}
        <Card className="p-6 bg-black/40 border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4">✅ What Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="text-3xl font-bold text-green-400">{activeBots.length}/{totalBots}</div>
              <div className="text-sm text-gray-300">Active Bots</div>
            </div>
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="text-3xl font-bold text-green-400">{stats?.bots.total || 0}</div>
              <div className="text-sm text-gray-300">Total Bots</div>
            </div>
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="text-3xl font-bold text-green-400">{stats?.channels.total || 0}</div>
              <div className="text-sm text-gray-300">Total Channels</div>
            </div>
          </div>
        </Card>

        {/* What Earns */}
        <Card className="p-6 bg-black/40 border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4">💰 What Earns</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="text-3xl font-bold text-yellow-400">$0.00</div>
              <div className="text-sm text-gray-300">Total Revenue</div>
              <div className="text-xs text-gray-400 mt-1">Manual-pay system active</div>
            </div>
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="text-3xl font-bold text-yellow-400">0</div>
              <div className="text-sm text-gray-300">Pending Orders</div>
              <div className="text-xs text-gray-400 mt-1">Awaiting confirmation</div>
            </div>
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="text-3xl font-bold text-yellow-400">70/20/10</div>
              <div className="text-sm text-gray-300">Commission Split</div>
              <div className="text-xs text-gray-400 mt-1">Creator/Recruiter/Platform</div>
            </div>
          </div>
        </Card>

        {/* What's Pending */}
        <Card className="p-6 bg-black/40 border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4">⏳ What's Pending</h2>
          <div className="space-y-3">
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Real Telegram Bot Connection</div>
                  <div className="text-sm text-gray-400">Simulated bot active, real bot pending BotFather setup</div>
                </div>
                <Badge variant="outline" className="border-orange-500/50 text-orange-400">PENDING</Badge>
              </div>
            </div>
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Real WhatsApp Bot Connection</div>
                  <div className="text-sm text-gray-400">Simulated bot active, real bot pending Business API setup</div>
                </div>
                <Badge variant="outline" className="border-orange-500/50 text-orange-400">PENDING</Badge>
              </div>
            </div>
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Stripe Test Environment</div>
                  <div className="text-sm text-gray-400">Sandbox created, claim required before 2026-02-12</div>
                </div>
                <Badge variant="outline" className="border-orange-500/50 text-orange-400">PENDING</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* What Advanced While Offline */}
        <Card className="p-6 bg-black/40 border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4">🚀 What Advanced While Offline</h2>
          <div className="space-y-3">
            {recentLogs.length > 0 ? (
              recentLogs.map((log: any, idx: number) => (
                <div key={idx} className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="border-blue-500/50 text-blue-400 text-xs">
                          {log.component}
                        </Badge>
                        <span className="text-sm text-gray-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-white">{log.message}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center text-gray-400">
                No recent autonomous activity
              </div>
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6 bg-black/40 border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4">⚡ Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => setLocation("/command-hub")}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Command Hub
            </Button>
            <Button 
              onClick={() => setLocation("/ai-bot")}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              AI Assistant
            </Button>
            <Button 
              onClick={() => setLocation("/owner-control")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Full Control Panel
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
