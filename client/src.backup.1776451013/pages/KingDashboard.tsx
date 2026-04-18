import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Users, Video, List, TrendingUp, DollarSign, Globe } from "lucide-react";

export default function KingDashboard() {
  const { user } = useAuth();
  const { data: users } = trpc.users.getAll.useQuery();
  const { data: waitlist } = trpc.waitlist.getAll.useQuery();
  const { data: content } = trpc.content.getAll.useQuery();

  const stats = [
    {
      title: "Total Users",
      value: users?.length || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Waitlist",
      value: waitlist?.length || 0,
      icon: List,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Content Items",
      value: content?.length || 0,
      icon: Video,
      color: "text-pink-600",
      bgColor: "bg-pink-100",
    },
    {
      title: "Creators",
      value: users?.filter(u => u.role === "creator").length || 0,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  const quickActions = [
    { title: "User Management", href: "/king/users", icon: Users, description: "Manage all users and roles" },
    { title: "Waitlist", href: "/king/waitlist", icon: List, description: "Review and approve waitlist signups" },
    { title: "Content", href: "/king/content", icon: Video, description: "Moderate and manage content" },
    { title: "Video Lab", href: "/king/video-lab", icon: Video, description: "Generate AI videos" },
    { title: "Emma Network", href: "/king/emma", icon: Globe, description: "Track recruitment network" },
    { title: "Analytics", href: "/king/analytics", icon: TrendingUp, description: "View platform analytics" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            King Dashboard
          </h1>
          <p className="text-gray-300">
            Welcome back, {user?.name || "King"}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.title} className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <Card className="bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/20 transition-all cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <action.icon className="w-6 h-6 text-purple-400" />
                      <CardTitle className="text-white">{action.title}</CardTitle>
                    </div>
                    <CardDescription className="text-gray-300">
                      {action.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
            <CardDescription className="text-gray-300">
              Latest platform updates and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {waitlist?.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-3 border-b border-white/10">
                  <div>
                    <p className="text-white font-medium">{entry.email}</p>
                    <p className="text-sm text-gray-400">
                      Joined waitlist • {new Date(entry.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full">
                    {entry.status}
                  </span>
                </div>
              ))}
              {(!waitlist || waitlist.length === 0) && (
                <p className="text-gray-400 text-center py-8">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
