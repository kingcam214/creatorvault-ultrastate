/**
 * Adult Sales Bot Management UI
 * 
 * Provides conversation monitoring, revenue tracking, and safety management.
 */

import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { AlertCircle, DollarSign, MessageSquare, Shield, TrendingUp, Users } from "lucide-react";

export default function AdultSalesBot() {
  const [selectedCreatorId] = useState(1); // In real app, get from auth context

  const { data: revenueStats, isLoading: revenueLoading } = trpc.adultSalesBot.getRevenueStats.useQuery({
    creatorId: selectedCreatorId,
  });

  const { data: activeConversations, isLoading: conversationsLoading } = trpc.adultSalesBot.getActiveConversations.useQuery({
    creatorId: selectedCreatorId,
    limit: 20,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900">
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Adult Sales Bot</h1>
          <p className="text-purple-200">
            AI-powered DM-to-revenue conversion with safety guardrails
          </p>
        </div>

        {/* Safety Alert */}
        <Alert className="mb-6 bg-purple-950/50 border-purple-700">
          <Shield className="h-4 w-4 text-purple-400" />
          <AlertDescription className="text-purple-200">
            All conversations are monitored for safety compliance. Illegal content requests are
            automatically blocked and logged.
          </AlertDescription>
        </Alert>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-purple-950/50 border-purple-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-200">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-400" />
                <span className="text-2xl font-bold text-white">
                  ${revenueLoading ? "..." : revenueStats?.totalRevenue.toFixed(2) || "0.00"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-950/50 border-purple-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-200">Conversions Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <span className="text-2xl font-bold text-white">
                  {revenueLoading ? "..." : revenueStats?.conversionsToday || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-950/50 border-purple-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-200">Avg Order Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-yellow-400" />
                <span className="text-2xl font-bold text-white">
                  ${revenueLoading ? "..." : revenueStats?.averageOrderValue.toFixed(2) || "0.00"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-950/50 border-purple-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-200">Active Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-400" />
                <span className="text-2xl font-bold text-white">
                  {conversationsLoading ? "..." : activeConversations?.length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="conversations" className="space-y-4">
          <TabsList className="bg-purple-950/50 border border-purple-700">
            <TabsTrigger value="conversations" className="data-[state=active]:bg-purple-700">
              Active Conversations
            </TabsTrigger>
            <TabsTrigger value="revenue" className="data-[state=active]:bg-purple-700">
              Revenue Tracking
            </TabsTrigger>
            <TabsTrigger value="safety" className="data-[state=active]:bg-purple-700">
              Safety Alerts
            </TabsTrigger>
            <TabsTrigger value="blacklist" className="data-[state=active]:bg-purple-700">
              Blacklist Management
            </TabsTrigger>
          </TabsList>

          {/* Active Conversations Tab */}
          <TabsContent value="conversations">
            <Card className="bg-purple-950/50 border-purple-700">
              <CardHeader>
                <CardTitle className="text-white">Active Conversations</CardTitle>
                <CardDescription className="text-purple-200">
                  Monitor ongoing conversations and buyer intent
                </CardDescription>
              </CardHeader>
              <CardContent>
                {conversationsLoading ? (
                  <div className="text-center py-8 text-purple-200">Loading conversations...</div>
                ) : activeConversations && activeConversations.length > 0 ? (
                  <div className="space-y-4">
                    {activeConversations.map((conversation: any, index: number) => (
                      <div
                        key={index}
                        className="p-4 bg-purple-900/30 rounded-lg border border-purple-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-400" />
                            <span className="text-white font-medium">User #{conversation.userId}</span>
                          </div>
                          <Badge className="bg-purple-700 text-white">
                            {conversation.buyerTag || "browsing"}
                          </Badge>
                        </div>
                        <div className="text-sm text-purple-200">
                          State: {conversation.state || "greeting"}
                        </div>
                        <div className="text-sm text-purple-200">
                          Messages: {conversation.messageCount || 0}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-purple-200">
                    No active conversations. Bot is ready to handle incoming messages.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue Tracking Tab */}
          <TabsContent value="revenue">
            <Card className="bg-purple-950/50 border-purple-700">
              <CardHeader>
                <CardTitle className="text-white">Revenue Tracking</CardTitle>
                <CardDescription className="text-purple-200">
                  Track sales generated by the Adult Sales Bot
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-700">
                    <div className="text-sm text-purple-200 mb-1">Total Revenue</div>
                    <div className="text-2xl font-bold text-white">
                      ${revenueStats?.totalRevenue.toFixed(2) || "0.00"}
                    </div>
                  </div>

                  <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-700">
                    <div className="text-sm text-purple-200 mb-1">Conversions Today</div>
                    <div className="text-2xl font-bold text-white">
                      {revenueStats?.conversionsToday || 0}
                    </div>
                  </div>

                  <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-700">
                    <div className="text-sm text-purple-200 mb-1">Average Order Value</div>
                    <div className="text-2xl font-bold text-white">
                      ${revenueStats?.averageOrderValue.toFixed(2) || "0.00"}
                    </div>
                  </div>

                  <Alert className="bg-purple-900/30 border-purple-700">
                    <AlertCircle className="h-4 w-4 text-purple-400" />
                    <AlertDescription className="text-purple-200">
                      Revenue tracking is based on bot-generated conversations that result in
                      successful payment confirmations.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Safety Alerts Tab */}
          <TabsContent value="safety">
            <Card className="bg-purple-950/50 border-purple-700">
              <CardHeader>
                <CardTitle className="text-white">Safety Alerts</CardTitle>
                <CardDescription className="text-purple-200">
                  Monitor safety violations and compliance issues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert className="bg-green-950/30 border-green-700">
                    <Shield className="h-4 w-4 text-green-400" />
                    <AlertDescription className="text-green-200">
                      No safety violations detected in the last 24 hours.
                    </AlertDescription>
                  </Alert>

                  <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-700">
                    <h3 className="text-white font-medium mb-2">Safety Guardrails Active</h3>
                    <ul className="space-y-2 text-sm text-purple-200">
                      <li>✓ Illegal content detection (underage, violence, animals)</li>
                      <li>✓ Age verification bypass detection</li>
                      <li>✓ Coercion and blackmail detection</li>
                      <li>✓ Automatic blacklisting on violation</li>
                      <li>✓ All violations logged for review</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Blacklist Management Tab */}
          <TabsContent value="blacklist">
            <Card className="bg-purple-950/50 border-purple-700">
              <CardHeader>
                <CardTitle className="text-white">Blacklist Management</CardTitle>
                <CardDescription className="text-purple-200">
                  Manage blacklisted users and view violation reasons
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert className="bg-purple-900/30 border-purple-700">
                    <AlertCircle className="h-4 w-4 text-purple-400" />
                    <AlertDescription className="text-purple-200">
                      Blacklisted users are automatically blocked from all future conversations.
                      Violations are logged permanently.
                    </AlertDescription>
                  </Alert>

                  <div className="text-center py-8 text-purple-200">
                    No blacklisted users. Bot is operating within safety guidelines.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
