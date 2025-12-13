import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowLeft, Search, UserCheck, UserX, Crown, Users } from "lucide-react";
import { toast } from "sonner";

export default function KingUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  
  const { data: users, refetch } = trpc.users.getAll.useQuery();
  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateCreatorStatusMutation = trpc.users.updateCreatorStatus.useMutation({
    onSuccess: () => {
      toast.success("Creator status updated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const filteredUsers = users?.filter(user => {
    const matchesSearch = !searchQuery || 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "king": return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
      case "admin": return "bg-red-500/20 text-red-300 border-red-500/50";
      case "creator": return "bg-purple-500/20 text-purple-300 border-purple-500/50";
      default: return "bg-blue-500/20 text-blue-300 border-blue-500/50";
    }
  };

  const getStatusBadgeColor = (status: string | null) => {
    switch (status) {
      case "approved": return "bg-green-500/20 text-green-300 border-green-500/50";
      case "pending": return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
      case "rejected": return "bg-red-500/20 text-red-300 border-red-500/50";
      default: return "bg-gray-500/20 text-gray-300 border-gray-500/50";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/king">
            <Button variant="outline" size="icon" className="bg-white/10 border-white/20 hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 text-white" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">User Management</h1>
            <p className="text-gray-300">Manage all platform users and roles</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Total Users</p>
                  <p className="text-2xl font-bold text-white">{users?.length || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Creators</p>
                  <p className="text-2xl font-bold text-white">
                    {users?.filter(u => u.role === "creator").length || 0}
                  </p>
                </div>
                <UserCheck className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Admins</p>
                  <p className="text-2xl font-bold text-white">
                    {users?.filter(u => u.role === "admin").length || 0}
                  </p>
                </div>
                <Crown className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Regular Users</p>
                  <p className="text-2xl font-bold text-white">
                    {users?.filter(u => u.role === "user").length || 0}
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/20 text-white"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48 bg-white/5 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="creator">Creators</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="king">Kings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white">All Users</CardTitle>
            <CardDescription className="text-gray-300">
              {filteredUsers?.length || 0} users found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead className="text-gray-300">User</TableHead>
                    <TableHead className="text-gray-300">Email</TableHead>
                    <TableHead className="text-gray-300">Role</TableHead>
                    <TableHead className="text-gray-300">Creator Status</TableHead>
                    <TableHead className="text-gray-300">Country</TableHead>
                    <TableHead className="text-gray-300">Joined</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-white font-medium">
                        {user.name || "Unknown"}
                      </TableCell>
                      <TableCell className="text-gray-300">{user.email || "N/A"}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) => {
                            updateRoleMutation.mutate({
                              userId: user.id,
                              role: value as "user" | "creator" | "admin" | "king",
                            });
                          }}
                        >
                          <SelectTrigger className={`w-32 ${getRoleBadgeColor(user.role)} border`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="creator">Creator</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="king">King</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {user.role === "creator" ? (
                          <Select
                            value={user.creatorStatus || "pending"}
                            onValueChange={(value) => {
                              updateCreatorStatusMutation.mutate({
                                userId: user.id,
                                status: value,
                              });
                            }}
                          >
                            <SelectTrigger className={`w-32 ${getStatusBadgeColor(user.creatorStatus)} border`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300">{user.country || "N/A"}</TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                          onClick={() => toast.info("User details coming soon")}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!filteredUsers || filteredUsers.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
