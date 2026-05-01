import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { User, Camera, Save, Check } from "lucide-react";

export default function EditProfile() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState((user as any)?.username || "");
  const [bio, setBio] = useState((user as any)?.bio || "");
  const [saved, setSaved] = useState(false);
  const updateProfile = trpc.users?.updateProfile?.useMutation?.({ onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); } }) || { mutate: () => {}, isPending: false };

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setUsername((user as any)?.username || "");
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">Edit Profile</h1>
        <p className="text-gray-400 mb-8">Update your creator profile information</p>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold text-3xl">
              {name?.[0] || user?.name?.[0] || "C"}
            </div>
            <button className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1">
              <Camera className="w-3 h-3 text-black" />
            </button>
          </div>
          <div>
            <p className="font-semibold">{user?.name || "Creator"}</p>
            <p className="text-gray-400 text-sm">{user?.email}</p>
            <p className="text-yellow-400 text-xs mt-1 capitalize">{(user as any)?.role || "creator"}</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors" placeholder="Your name" />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
              <input value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-lg pl-8 pr-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors" placeholder="username" />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors resize-none" placeholder="Tell your audience about yourself..." />
          </div>

          <div className="pt-2">
            <button onClick={() => updateProfile.mutate({ name, username, bio })} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-lg transition-colors">
              {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        </div>

        {/* Account Info */}
        <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="font-semibold mb-3">Account Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Email</span>
              <span>{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Role</span>
              <span className="text-yellow-400 capitalize">{(user as any)?.role || "creator"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">User ID</span>
              <span className="text-gray-500">{user?.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
