import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Users, Search, Filter, UserCheck, UserX, DollarSign, TrendingUp, Mail } from "lucide-react";

export default function CreatorManagement() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const { data: users } = trpc.users.getAll.useQuery(undefined, { retry: false });

  const creators = (users || []).filter((u: any) => 
    (filter === "all" || u.role === filter) &&
    (u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400">Creator Management</h1>
            <p className="text-gray-400 mt-1">Manage all creators on the platform</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Users", value: users?.length || 0, icon: Users, color: "text-blue-400" },
            { label: "Creators", value: users?.filter((u: any) => u.role === "creator").length || 0, icon: UserCheck, color: "text-green-400" },
            { label: "Admins", value: users?.filter((u: any) => u.role === "admin" || u.role === "owner").length || 0, icon: UserX, color: "text-purple-400" },
            { label: "Active", value: users?.length || 0, icon: TrendingUp, color: "text-yellow-400" },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="w-full bg-white/5 border border-white/20 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500" />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-white/5 border border-white/20 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500">
            <option value="all">All Roles</option>
            <option value="creator">Creators</option>
            <option value="admin">Admins</option>
            <option value="owner">Owners</option>
          </select>
        </div>

        {/* User Table */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-sm">
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {creators.slice(0, 20).map((user: any) => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold text-sm">
                        {user.name?.[0] || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.name || "Unknown"}</p>
                        <p className="text-gray-500 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${user.role === "owner" ? "bg-yellow-500/20 text-yellow-400" : user.role === "admin" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}`}>
                      {user.role || "user"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <button className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg transition-colors flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Message
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {creators.length === 0 && <div className="text-center py-8 text-gray-500">No users found</div>}
        </div>
      </div>
    </div>
  );
}
