/**
 * 💰 VAULTPAY - REVENUE SIMULATION TOOLS
 * 
 * Help creators forecast earnings, plan growth, optimize revenue
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { DollarSign, TrendingUp, Calculator, Target } from "lucide-react";

export default function VaultPay() {
  const [followers, setFollowers] = useState(1000);
  const [avgTip, setAvgTip] = useState(5);
  const [streamsPerWeek, setStreamsPerWeek] = useState(3);
  const [growthScenario, setGrowthScenario] = useState<"conservative" | "moderate" | "aggressive">("moderate");
  const [timeframe, setTimeframe] = useState<"3months" | "6months" | "12months">("6months");

  // Calculate VaultLive projection
  const { data: projection } = trpc.vaultPay.calculateVaultLiveProjection.useQuery({
    followers,
    avgTipPerViewer: avgTip,
    streamsPerWeek
  });

  // Compare platforms
  const { data: comparison } = trpc.vaultPay.comparePlatforms.useQuery({
    followers,
    avgTipPerViewer: avgTip,
    streamsPerWeek
  });

  // Project growth
  const { data: growth } = trpc.vaultPay.projectGrowth.useQuery({
    currentFollowers: followers,
    currentMonthlyRevenue: projection?.monthlyRevenue || 0,
    scenario: growthScenario,
    timeframe
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-black to-blue-900">
      <div className="container max-w-7xl py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <DollarSign className="h-12 w-12 text-green-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              VaultPay
            </h1>
          </div>
          <p className="text-2xl text-white font-semibold mb-2">Know Your Worth</p>
          <p className="text-lg text-gray-300">
            Revenue simulation and projection tools for creators
          </p>
        </div>

        {/* Input Section */}
        <Card className="bg-black/40 border-green-500/30 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Your Creator Stats
            </CardTitle>
            <CardDescription>Enter your current metrics to see projections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="followers" className="text-white">Followers</Label>
                <Input
                  id="followers"
                  type="number"
                  value={followers}
                  onChange={(e) => setFollowers(Number(e.target.value))}
                  className="bg-black/40 border-green-500/30 text-white"
                />
              </div>
              <div>
                <Label htmlFor="avgTip" className="text-white">Avg Tip Per Viewer ($)</Label>
                <Input
                  id="avgTip"
                  type="number"
                  value={avgTip}
                  onChange={(e) => setAvgTip(Number(e.target.value))}
                  className="bg-black/40 border-green-500/30 text-white"
                />
              </div>
              <div>
                <Label htmlFor="streams" className="text-white">Streams Per Week</Label>
                <Input
                  id="streams"
                  type="number"
                  value={streamsPerWeek}
                  onChange={(e) => setStreamsPerWeek(Number(e.target.value))}
                  className="bg-black/40 border-green-500/30 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Projection */}
        {projection && (
          <Card className="bg-black/40 border-green-500/30 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                Your VaultLive Revenue (85% Split)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-gray-400 mb-2">Monthly Revenue</p>
                  <p className="text-4xl font-bold text-white">
                    ${projection.monthlyRevenue.toFixed(2)}
                  </p>
                  <p className="text-green-400 mt-2">
                    You keep: ${projection.creatorAmount.toFixed(2)} (85%)
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 mb-2">Weekly Revenue</p>
                  <p className="text-4xl font-bold text-white">
                    ${projection.weeklyRevenue.toFixed(2)}
                  </p>
                  <p className="text-gray-400 mt-2">
                    {projection.streamsPerWeek} streams/week
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 mb-2">Yearly Revenue</p>
                  <p className="text-4xl font-bold text-white">
                    ${projection.yearlyRevenue.toFixed(2)}
                  </p>
                  <p className="text-green-400 mt-2">
                    You keep: ${(projection.creatorAmount * 12).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Platform Comparison */}
        {comparison && (
          <Card className="bg-black/40 border-green-500/30 mb-8">
            <CardHeader>
              <CardTitle className="text-white">Platform Comparison</CardTitle>
              <CardDescription>See how VaultLive compares to competitors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {comparison.map((platform) => (
                  <div
                    key={platform.platform}
                    className={`p-4 rounded-lg ${
                      platform.platform === "VaultLive"
                        ? "bg-green-500/20 border-2 border-green-500"
                        : "bg-black/40 border border-gray-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white font-semibold">{platform.platform}</p>
                        <p className="text-gray-400 text-sm">
                          {platform.split}% creator split
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">
                          ${platform.creatorAmount.toFixed(2)}
                        </p>
                        {platform.difference !== 0 && (
                          <p className="text-red-400 text-sm">
                            -${Math.abs(platform.difference).toFixed(2)} vs VaultLive
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Growth Projection */}
        {growth && (
          <Card className="bg-black/40 border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                Growth Projection
              </CardTitle>
              <CardDescription>See your potential in {timeframe.replace("months", " months")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="scenario" className="text-white">Growth Scenario</Label>
                    <Select value={growthScenario} onValueChange={(v: any) => setGrowthScenario(v)}>
                      <SelectTrigger className="bg-black/40 border-blue-500/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservative">Conservative</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="aggressive">Aggressive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="timeframe" className="text-white">Timeframe</Label>
                    <Select value={timeframe} onValueChange={(v: any) => setTimeframe(v)}>
                      <SelectTrigger className="bg-black/40 border-blue-500/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3months">3 Months</SelectItem>
                        <SelectItem value="6months">6 Months</SelectItem>
                        <SelectItem value="12months">12 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center p-6 bg-black/40 rounded-lg">
                  <p className="text-gray-400 mb-2">Current State</p>
                  <p className="text-3xl font-bold text-white mb-1">
                    {growth.currentFollowers.toLocaleString()} followers
                  </p>
                  <p className="text-2xl text-white">
                    ${growth.currentMonthlyRevenue.toFixed(2)}/mo
                  </p>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-blue-500/20 to-green-500/20 rounded-lg border-2 border-blue-500">
                  <p className="text-gray-400 mb-2">Projected ({growth.scenario})</p>
                  <p className="text-3xl font-bold text-green-400 mb-1">
                    {growth.projectedFollowers.toLocaleString()} followers
                  </p>
                  <p className="text-2xl text-green-400">
                    ${growth.projectedMonthlyRevenue.toFixed(2)}/mo
                  </p>
                  <p className="text-blue-400 mt-2">
                    +{growth.growthRate.toFixed(1)}% growth
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <div className="text-center mt-12">
          <Button
            size="lg"
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          >
            <Target className="mr-2 h-5 w-5" />
            Start Earning on VaultLive
          </Button>
        </div>
      </div>
    </div>
  );
}
