import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Save, Check } from "lucide-react";

export default function EditProfile() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState((user as any)?.username || "");
  const [bio, setBio] = useState((user as any)?.bio || "");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // The name lives on the account record. The public handle and bio live on the
  // canonical profile record, so both durable paths are deliberately kept together.
  const updateAccount = (trpc.users as any).updateProfile.useMutation();
  const updateCreatorProfile = trpc.profile.updateProfile.useMutation();
  const isSaving = updateAccount.isPending || updateCreatorProfile.isPending;

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setUsername((user as any)?.username || "");
      setBio((user as any)?.bio || "");
    }
  }, [user]);

  const saveIdentity = async () => {
    setSaveError(null);
    try {
      await updateAccount.mutateAsync({ name: name.trim() });
      await updateCreatorProfile.mutateAsync({
        ...(username.trim() ? { username: username.trim() } : {}),
        bio: bio.trim(),
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("Your identity did not save. Nothing was changed—try again when you are ready.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.22em] text-yellow-400 mb-3">CreatorVault / Your name</p>
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">Make your name unmistakable.</h1>
        <p className="text-gray-400 mb-8">Set the three things people see before they meet you. Your login, money details, and internal account records stay private.</p>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold text-3xl">
            {name?.[0] || user?.name?.[0] || "C"}
          </div>
          <div>
            <p className="font-semibold">{name || user?.name || "Creator"}</p>
            <p className="text-gray-400 text-sm">Your CreatorVault identity</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-sm text-gray-300 mb-1.5 block">The name they see</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors" placeholder="Your name" />
          </div>
          <div>
            <label className="text-sm text-gray-300 mb-1.5 block">Your public @ name</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
              <input value={username} onChange={e => setUsername(e.target.value.replace(/^@/, ""))} className="w-full bg-white/5 border border-white/20 rounded-lg pl-8 pr-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors" placeholder="yourname" />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-300 mb-1.5 block">The words that introduce you</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors resize-none" placeholder="Tell people what makes your world worth stepping into..." />
          </div>

          {saveError && <p className="text-sm text-red-300">{saveError}</p>}

          <div className="pt-2">
            <button onClick={saveIdentity} disabled={isSaving} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold px-6 py-3 rounded-lg transition-colors">
              {saved ? <><Check className="w-4 h-4" /> Your identity is saved</> : <><Save className="w-4 h-4" /> {isSaving ? "Saving your identity" : "Save my identity"}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
