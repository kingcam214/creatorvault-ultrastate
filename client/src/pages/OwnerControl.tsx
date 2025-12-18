import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Shield,
  Activity,
  Database,
  Link as LinkIcon,
  Bot,
  Radio,
  Users,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  Zap,
  BarChart3,
} from "lucide-react";

export default function OwnerControl() {
  const [selectedTab, setSelectedTab] = useState("overview");

  // Queries
  const { data: deployments, refetch: refetchDeployments } = trpc.ownerControl.getDeployments.useQuery();
  const { data: bots, refetch: refetchBots } = trpc.ownerControl.getBots.useQuery();
  const { data: channels } = trpc.ownerControl.getChannels.useQuery();
  const { data: links } = trpc.ownerControl.getLinks.useQuery();
  const { data: logs } = trpc.ownerControl.getLogs.useQuery({ limit: 50 });
  const { data: dbHealth } = trpc.ownerControl.getDatabaseHealth.useQuery();
  const { data: stats } = trpc.ownerControl.getStats.useQuery();
  const { data: roleGov } = trpc.ownerControl.getRoleGovernance.useQuery();

  // Mutations
  const toggleBotMutation = trpc.ownerControl.toggleBot.useMutation({
    onSuccess: (data) => {
      toast.success(`Bot ${data.success ? "toggled" : "toggle failed"}`);
      refetchBots();
    },
    onError: (error) => toast.error(error.message),
  });

  const toggleBroadcastMutation = trpc.ownerControl.toggleBroadcast.useMutation({
    onSuccess: () => {
      toast.success("Broadcast toggled");
      refetchBots();
    },
    onError: (error) => toast.error(error.message),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "paused":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle2 className="h-4 w-4" />;
      case "paused":
        return <Clock className="h-4 w-4" />;
      case "error":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <Shield className="h-10 w-10 text-purple-400" />
              Owner Control Panel
            </h1>
            <p className="text-gray-400 mt-2">
              Centralized control for all system operations
            </p>
          </div>
          <Badge className="bg-green-500 text-white">
            <Activity className="h-4 w-4 mr-2" />
            System Online
          </Badge>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Deployments</p>
                    <p className="text-3xl font-bold text-white">{stats.deployments.total}</p>
                    <p className="text-xs text-green-400">{stats.deployments.active} active</p>
                  </div>
                  <Globe className="h-10 w-10 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Bots</p>
                    <p className="text-3xl font-bold text-white">{stats.bots.total}</p>
                    <p className="text-xs text-green-400">{stats.bots.active} active</p>
                  </div>
                  <Bot className="h-10 w-10 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Channels</p>
                    <p className="text-3xl font-bold text-white">{stats.channels.total}</p>
                    <p className="text-xs text-green-400">{stats.channels.active} active</p>
                  </div>
                  <Radio className="h-10 w-10 text-cyan-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Links</p>
                    <p className="text-3xl font-bold text-white">{stats.links.total}</p>
                    <p className="text-xs text-gray-400">{stats.links.totalAccess} accesses</p>
                  </div>
                  <LinkIcon className="h-10 w-10 text-pink-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="bg-white/5 border-white/10">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bots">Bots</TabsTrigger>
            <TabsTrigger value="deployments">Deployments</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Database Health */}
              <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Database Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dbHealth && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Status</span>
                        <Badge className={dbHealth.status === "healthy" ? "bg-green-500" : "bg-red-500"}>
                          {dbHealth.status}
                        </Badge>
                      </div>
                      {dbHealth.tables && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Users</span>
                            <span className="text-white">{dbHealth.tables.users}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Bot Events</span>
                            <span className="text-white">{dbHealth.tables.botEvents}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Telegram Bots</span>
                            <span className="text-white">{dbHealth.tables.telegramBots}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">WhatsApp Providers</span>
                            <span className="text-white">{dbHealth.tables.whatsappProviders}</span>
                          </div>
                        </>
                      )}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Last Check</span>
                        <span className="text-gray-500">
                          {dbHealth.lastCheck ? new Date(dbHealth.lastCheck).toLocaleTimeString() : "N/A"}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bot Types Breakdown */}
              {stats && (
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Bot Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Telegram</span>
                        <span className="text-white">{stats.bots.byType.telegram}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">WhatsApp</span>
                        <span className="text-white">{stats.bots.byType.whatsapp}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">AI Assistant</span>
                        <span className="text-white">{stats.bots.byType.ai_assistant}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Live</span>
                        <span className="text-white">{stats.bots.byType.live}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Bots Tab */}
          <TabsContent value="bots">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Bot Management</CardTitle>
                <CardDescription className="text-gray-400">
                  Enable/disable bots and broadcasts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {bots && bots.length > 0 ? (
                    <div className="space-y-4">
                      {bots.map((bot) => (
                        <div
                          key={bot.id}
                          className="p-4 rounded-lg bg-white/5 border border-white/10"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-semibold text-white">{bot.name}</h3>
                                <Badge className={getStatusColor(bot.status)}>
                                  {getStatusIcon(bot.status)}
                                  <span className="ml-1">{bot.status}</span>
                                </Badge>
                                <Badge variant="outline" className="text-gray-400">
                                  {bot.type}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-400">ID: {bot.id}</p>
                              {bot.lastActivity && (
                                <p className="text-xs text-gray-500">
                                  Last activity: {new Date(bot.lastActivity).toLocaleString()}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">Messages: {bot.messageCount}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={bot.enabled}
                                onCheckedChange={(checked) => {
                                  toggleBotMutation.mutate({
                                    botId: bot.id,
                                    enabled: checked,
                                  });
                                }}
                              />
                              <span className="text-sm text-gray-400">Bot Enabled</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Switch
                                checked={bot.broadcastEnabled}
                                onCheckedChange={(checked) => {
                                  toggleBroadcastMutation.mutate({
                                    botId: bot.id,
                                    enabled: checked,
                                  });
                                }}
                              />
                              <span className="text-sm text-gray-400">Broadcast Enabled</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No bots registered</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deployments Tab */}
          <TabsContent value="deployments">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Active Deployments</CardTitle>
              </CardHeader>
              <CardContent>
                {deployments && deployments.length > 0 ? (
                  <div className="space-y-4">
                    {deployments.map((deployment) => (
                      <div
                        key={deployment.id}
                        className="p-4 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold text-white">{deployment.name}</h3>
                              <Badge className={getStatusColor(deployment.status)}>
                                {deployment.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-400 mb-2">{deployment.url}</p>
                            <p className="text-xs text-gray-500">Owner: {deployment.owner}</p>
                            <p className="text-xs text-gray-500">
                              Deployed: {new Date(deployment.deployedAt).toLocaleString()}
                            </p>
                            {deployment.lastHealthCheck && (
                              <p className="text-xs text-gray-500">
                                Health check: {new Date(deployment.lastHealthCheck).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => window.open(deployment.url, "_blank")}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            Visit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No deployments found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Channels Tab */}
          <TabsContent value="channels">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Channels & Platforms</CardTitle>
              </CardHeader>
              <CardContent>
                {channels && channels.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {channels.map((channel) => (
                      <div
                        key={channel.id}
                        className="p-4 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-white">{channel.name}</h3>
                          <Badge className={getStatusColor(channel.status)}>
                            {channel.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400">{channel.platform}</p>
                        {channel.subscriberCount && (
                          <p className="text-xs text-gray-500">
                            Subscribers: {channel.subscriberCount}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <Radio className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No channels found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Links Tab */}
          <TabsContent value="links">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Generated Links</CardTitle>
                <CardDescription className="text-gray-400">
                  All manus.space links with traceability
                </CardDescription>
              </CardHeader>
              <CardContent>
                {links && links.length > 0 ? (
                  <div className="space-y-4">
                    {links.map((link) => (
                      <div
                        key={link.id}
                        className="p-4 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-mono text-purple-400 mb-1">{link.url}</p>
                            <p className="text-sm text-gray-400">→ {link.destination}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>Type: {link.type}</span>
                              <span>Created by: {link.createdBy}</span>
                              <span>Accesses: {link.accessCount}</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Created: {new Date(link.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <LinkIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No links generated</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white">System Logs</CardTitle>
                <CardDescription className="text-gray-400">
                  Real-time execution logs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {logs && logs.length > 0 ? (
                    <div className="space-y-2">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-lg bg-white/5 border border-white/10"
                        >
                          <div className="flex items-start justify-between mb-1">
                            <Badge
                              className={
                                log.level === "error" || log.level === "critical"
                                  ? "bg-red-500"
                                  : log.level === "warn"
                                  ? "bg-yellow-500"
                                  : "bg-blue-500"
                              }
                            >
                              {log.level}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-white mb-2">{log.message}</p>
                          <p className="text-xs text-gray-400 mb-2">Component: {log.component}</p>
                          {log.metadata && (
                            <details className="mt-2">
                              <summary className="text-xs text-purple-400 cursor-pointer hover:text-purple-300 select-none">
                                View Full Payload
                              </summary>
                              <pre className="mt-2 p-3 bg-black/50 rounded text-xs text-gray-300 overflow-x-auto overflow-y-auto max-h-80 whitespace-pre-wrap break-words border border-white/10">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No logs available</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Role Governance</CardTitle>
                <CardDescription className="text-gray-400">
                  User roles and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {roleGov && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">By Role</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <p className="text-sm text-gray-400">Owner</p>
                          <p className="text-3xl font-bold text-purple-400">{roleGov.byRole.owner}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <p className="text-sm text-gray-400">Admin</p>
                          <p className="text-3xl font-bold text-blue-400">{roleGov.byRole.admin}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <p className="text-sm text-gray-400">Creator</p>
                          <p className="text-3xl font-bold text-green-400">{roleGov.byRole.creator}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <p className="text-sm text-gray-400">User</p>
                          <p className="text-3xl font-bold text-gray-400">{roleGov.byRole.user}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">By Status</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <p className="text-sm text-gray-400">Active</p>
                          <p className="text-3xl font-bold text-green-400">{roleGov.byStatus.active}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <p className="text-sm text-gray-400">Pending</p>
                          <p className="text-3xl font-bold text-yellow-400">{roleGov.byStatus.pending}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <p className="text-sm text-gray-400">Suspended</p>
                          <p className="text-3xl font-bold text-red-400">{roleGov.byStatus.suspended}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <p className="text-sm text-purple-300">
                        <strong>Total Users:</strong> {roleGov.total}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
