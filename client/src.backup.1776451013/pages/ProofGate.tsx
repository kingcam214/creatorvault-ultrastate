import { trpc } from "@/lib/trpc";

export default function ProofGate() {
  const { data: allFeatures } = trpc.proofGate.getAllFeatures.useQuery();

  const real = allFeatures?.filter(f => f.status === "REAL") || [];
  const partial = allFeatures?.filter(f => f.status === "PARTIAL") || [];
  const notReal = allFeatures?.filter(f => f.status === "NOT_REAL") || [];

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">🛡️ Proof Gate</h1>
        <p className="text-xl text-gray-400 mb-8">Feature Reality Check - What's REAL vs NOT REAL</p>

        <div className="grid grid-cols-1 gap-8">
          {/* REAL Features */}
          <div>
            <h2 className="text-2xl font-bold mb-4 text-green-400">✅ FULLY FUNCTIONAL ({real.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {real.map(feature => (
                <div key={feature.id} className="bg-green-900/20 border border-green-500 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-1">{feature.name}</h3>
                  <p className="text-sm text-gray-300">{feature.description}</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-green-500 text-black text-xs font-bold rounded">REAL</span>
                </div>
              ))}
            </div>
          </div>

          {/* PARTIAL Features */}
          <div>
            <h2 className="text-2xl font-bold mb-4 text-yellow-400">⚠️ PARTIALLY WORKING ({partial.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {partial.map(feature => (
                <div key={feature.id} className="bg-yellow-900/20 border border-yellow-500 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-1">{feature.name}</h3>
                  <p className="text-sm text-gray-300 mb-2">{feature.description}</p>
                  {feature.missingRequirements && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-yellow-400 mb-1">Missing:</p>
                      <ul className="text-xs text-gray-400 space-y-1">
                        {feature.missingRequirements.map((req, i) => (
                          <li key={i}>• {req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <span className="inline-block mt-2 px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded">PARTIAL</span>
                </div>
              ))}
            </div>
          </div>

          {/* NOT REAL Features */}
          <div>
            <h2 className="text-2xl font-bold mb-4 text-red-400">❌ PLACEHOLDER / BROKEN ({notReal.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notReal.map(feature => (
                <div key={feature.id} className="bg-red-900/20 border border-red-500 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-1">{feature.name}</h3>
                  <p className="text-sm text-gray-300 mb-2">{feature.description}</p>
                  {feature.missingRequirements && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-red-400 mb-1">Missing:</p>
                      <ul className="text-xs text-gray-400 space-y-1">
                        {feature.missingRequirements.map((req, i) => (
                          <li key={i}>• {req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <span className="inline-block mt-2 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded">NOT REAL</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 bg-gray-900 rounded-lg">
          <h3 className="text-xl font-bold mb-2">📊 Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-green-400">{real.length}</p>
              <p className="text-sm text-gray-400">Fully Functional</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-yellow-400">{partial.length}</p>
              <p className="text-sm text-gray-400">Partially Working</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-400">{notReal.length}</p>
              <p className="text-sm text-gray-400">Placeholder/Broken</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
