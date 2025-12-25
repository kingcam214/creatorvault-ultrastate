import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Mail, User, Calendar } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function KingWaitlist() {
  const { data: waitlist, isLoading, refetch } = trpc.waitlist.getAll.useQuery();
  const updateStatus = trpc.waitlist.updateStatus.useMutation();
  const { toast } = useToast();
  const [updating, setUpdating] = useState<number | null>(null);

  const handleApprove = async (id: number, email: string) => {
    setUpdating(id);
    try {
      await updateStatus.mutateAsync({ id, status: "approved" });
      toast({
        title: "Approved",
        description: `${email} has been approved`,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleReject = async (id: number, email: string) => {
    setUpdating(id);
    try {
      await updateStatus.mutateAsync({ id, status: "rejected" });
      toast({
        title: "Rejected",
        description: `${email} has been rejected`,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject user",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading waitlist...</div>
      </div>
    );
  }

  const pending = waitlist?.filter((w: any) => w.status === "pending") || [];
  const approved = waitlist?.filter((w: any) => w.status === "approved") || [];
  const rejected = waitlist?.filter((w: any) => w.status === "rejected") || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Waitlist Management</h1>
          <p className="text-gray-400">Review and approve creator signups</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-yellow-400">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">{pending.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-green-500/20">
            <CardHeader>
              <CardTitle className="text-green-400">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">{approved.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-red-500/20">
            <CardHeader>
              <CardTitle className="text-red-400">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">{rejected.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pending List */}
        {pending.length > 0 && (
          <Card className="bg-slate-800/50 border-white/10 mb-8">
            <CardHeader>
              <CardTitle className="text-white">Pending Approvals</CardTitle>
              <CardDescription>Review and approve these signups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pending.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-white/5"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-white font-medium">{item.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.interestedIn?.[0] || "Creator"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {item.email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                        onClick={() => handleApprove(item.id, item.email)}
                        disabled={updating === item.id}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                        onClick={() => handleReject(item.id, item.email)}
                        disabled={updating === item.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approved List */}
        {approved.length > 0 && (
          <Card className="bg-slate-800/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Approved ({approved.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {approved.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-slate-900/30 rounded border border-green-500/10"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-white">{item.name}</span>
                      <span className="text-gray-400 text-sm">{item.email}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
