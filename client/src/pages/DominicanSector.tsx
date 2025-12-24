import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";

export default function DominicanSector() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");

  // Get Emma Network entries (Dominican creators)
  const { data: creators, refetch } = trpc.emma.getAll.useQuery();

  // Create Emma Network entry (register Dominican creator)
  const createCreator = trpc.emma.create.useMutation({
    onSuccess: () => {
      refetch();
      setName("");
      setWhatsapp("");
      setCity("");
    },
  });

  const handleSubmit = () => {
    if (!user || !name || !whatsapp) return;
    createCreator.mutate({
      userId: user.id,
      whatsapp,
      city,
      contentTags: ["dominican"],
      notes: `Registered via Dominican Sector - ${new Date().toISOString()}`,
    });
  };

  const dominicanCreators = creators?.filter(c => 
    c.contentTags?.includes("dominican")
  ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-black to-green-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2">🇩🇴 CreatorVault Dominicana</h1>
          <p className="text-2xl text-blue-400">Pa' Lo' Creadores Dominicanos</p>
          <p className="text-lg text-gray-400 mt-2">Emma's 2,000+ Dominican Creator Network</p>
        </div>

        {/* Registration Form */}
        <div className="bg-gray-900 p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-bold mb-4">Register as Dominican Creator</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block mb-2 text-sm">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full bg-gray-800 p-2 rounded text-white"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm">WhatsApp</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+1 (XXX) XXX-XXXX"
                className="w-full bg-gray-800 p-2 rounded text-white"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm">City (Optional)</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Santo Domingo, Santiago, etc."
                className="w-full bg-gray-800 p-2 rounded text-white"
              />
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!user || !name || !whatsapp || createCreator.isPending}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-2 rounded font-bold"
          >
            {createCreator.isPending ? "Registering..." : "🇩🇴 Register Now"}
          </button>
          {createCreator.isSuccess && (
            <p className="text-green-400 mt-2">✅ Registered successfully!</p>
          )}
          {createCreator.isError && (
            <p className="text-red-400 mt-2">❌ Error: {createCreator.error.message}</p>
          )}
        </div>

        {/* Dominican Creators List */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">
            Dominican Creators ({dominicanCreators.length})
          </h2>
          {dominicanCreators.length === 0 ? (
            <p className="text-gray-400">No creators registered yet. Be the first! 🇩🇴</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dominicanCreators.map((creator) => (
                <div key={creator.id} className="bg-gray-800 p-4 rounded">
                  <p className="font-bold text-lg mb-1">Creator #{creator.id}</p>
                  <p className="text-sm text-gray-400 mb-2">
                    WhatsApp: {creator.whatsapp || "Not provided"}
                  </p>
                  {creator.city && (
                    <p className="text-sm text-blue-400">📍 {creator.city}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Joined: {new Date(creator.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <span className="px-2 py-1 bg-blue-600 text-xs rounded">🇩🇴 Dominican</span>
                    {creator.instagram && <span className="px-2 py-1 bg-pink-600 text-xs rounded">IG</span>}
                    {creator.tiktok && <span className="px-2 py-1 bg-purple-600 text-xs rounded">TT</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="bg-blue-900/30 p-4 rounded-lg">
            <p className="text-3xl font-bold text-blue-400">{dominicanCreators.length}</p>
            <p className="text-sm text-gray-400">Registered Creators</p>
          </div>
          <div className="bg-green-900/30 p-4 rounded-lg">
            <p className="text-3xl font-bold text-green-400">85%</p>
            <p className="text-sm text-gray-400">Creator Revenue Split</p>
          </div>
          <div className="bg-yellow-900/30 p-4 rounded-lg">
            <p className="text-3xl font-bold text-yellow-400">$0</p>
            <p className="text-sm text-gray-400">Total Earned (Launch Soon)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
