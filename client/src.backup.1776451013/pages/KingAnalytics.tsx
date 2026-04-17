import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, Video, Eye, Heart, Share2, MessageCircle } from "lucide-react";

export default function KingAnalytics() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Platform Analytics</h1>
          <p className="text-gray-400">Track platform performance and growth</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">0</div>
              <p className="text-sm text-gray-400 mt-1">Registered creators</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">$0</div>
              <p className="text-sm text-gray-400 mt-1">Platform earnings</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Video className="h-5 w-5 text-purple-400" />
                Live Streams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">0</div>
              <p className="text-sm text-gray-400 mt-1">Active streams</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-yellow-400" />
                Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">0%</div>
              <p className="text-sm text-gray-400 mt-1">Month over month</p>
            </CardContent>
          </Card>
        </div>

        {/* Engagement Metrics */}
        <Card className="bg-slate-800/50 border-white/10 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Engagement Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <Eye className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">0</div>
                <p className="text-sm text-gray-400">Total Views</p>
              </div>
              <div className="text-center">
                <Heart className="h-8 w-8 text-pink-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">0</div>
                <p className="text-sm text-gray-400">Total Likes</p>
              </div>
              <div className="text-center">
                <Share2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">0</div>
                <p className="text-sm text-gray-400">Total Shares</p>
              </div>
              <div className="text-center">
                <MessageCircle className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">0</div>
                <p className="text-sm text-gray-400">Total Comments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-slate-800/50 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-400">
              No activity data yet
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
