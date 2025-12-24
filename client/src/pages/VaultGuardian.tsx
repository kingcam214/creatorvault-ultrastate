import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function VaultGuardian() {
  const { user } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<"not_started" | "pending" | "approved">("not_started");

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-cyan-900 to-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-6xl">🛡️</span>
            <h1 className="text-5xl font-bold">VaultGuardian</h1>
          </div>
          <p className="text-2xl text-cyan-400 font-bold">Your content. Your rules. Your money. Protected.</p>
          <p className="text-lg text-gray-400 mt-2">The most powerful, creator-friendly adult monetization system</p>
        </div>

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-900 p-6 rounded-lg border-2 border-cyan-600">
            <h3 className="text-xl font-bold mb-2">🔒 Enhanced Privacy</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Anonymous payments</li>
              <li>• Geographic blocking</li>
              <li>• Screenshot prevention</li>
              <li>• Watermark automation</li>
              <li>• DMCA takedown service</li>
            </ul>
          </div>

          <div className="bg-gray-900 p-6 rounded-lg border-2 border-cyan-600">
            <h3 className="text-xl font-bold mb-2">💰 70/30 Split</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• You keep 70% (vs OnlyFans 80%)</li>
              <li>• NO hidden fees</li>
              <li>• Instant payouts</li>
              <li>• Full control</li>
              <li>• Transparent earnings</li>
            </ul>
          </div>

          <div className="bg-gray-900 p-6 rounded-lg border-2 border-cyan-600">
            <h3 className="text-xl font-bold mb-2">🚨 Safety First</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Panic button (instant lock)</li>
              <li>• Stalker protection</li>
              <li>• Harassment reporting</li>
              <li>• Legal support resources</li>
              <li>• Mental health resources</li>
            </ul>
          </div>
        </div>

        {/* Verification Section */}
        <div className="bg-gray-900 p-8 rounded-lg mb-12 border-2 border-cyan-600">
          <h2 className="text-3xl font-bold mb-4">Age Verification & Compliance</h2>
          <p className="text-gray-300 mb-6">
            All adult creators must complete age verification (18+) and consent documentation before publishing content.
            This protects you legally and ensures platform compliance.
          </p>

          {verificationStatus === "not_started" && (
            <div>
              <p className="text-yellow-400 mb-4">⚠️ Verification required to publish adult content</p>
              <Button 
                onClick={() => setVerificationStatus("pending")}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                Start Verification Process
              </Button>
            </div>
          )}

          {verificationStatus === "pending" && (
            <div>
              <p className="text-yellow-400 mb-4">⏳ Verification in progress (24-48 hours)</p>
              <p className="text-sm text-gray-400">We'll notify you when verification is complete.</p>
            </div>
          )}

          {verificationStatus === "approved" && (
            <div>
              <p className="text-green-400 mb-4">✅ Verified - You can now publish adult content</p>
            </div>
          )}
        </div>

        {/* Revenue Streams */}
        <div className="bg-gray-900 p-8 rounded-lg mb-12">
          <h2 className="text-3xl font-bold mb-6">Multiple Revenue Streams</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-cyan-400 mb-2">Subscription Tiers</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Tier 1: $9.99-$19.99/month (casual fans)</li>
                <li>• Tier 2: $29.99-$49.99/month (dedicated fans)</li>
                <li>• Tier 3: $99.99-$199.99/month (VIP fans)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-cyan-400 mb-2">Additional Income</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Pay-per-view content ($5-$50)</li>
                <li>• Custom requests ($50-$500+)</li>
                <li>• Tips/donations</li>
                <li>• Private messaging (paid DMs)</li>
                <li>• Exclusive video calls</li>
              </ul>
            </div>
          </div>
        </div>

        {/* DayShift Doctor Pipeline */}
        <div className="bg-gradient-to-r from-purple-900 to-pink-900 p-8 rounded-lg mb-12 border-2 border-pink-600">
          <h2 className="text-3xl font-bold mb-4">🎀 DayShift Doctor Pipeline</h2>
          <p className="text-lg mb-4">Dallas strip club recruitment and partnership vertical</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-black/30 p-4 rounded text-center">
              <p className="font-bold">Diamond Girls</p>
            </div>
            <div className="bg-black/30 p-4 rounded text-center">
              <p className="font-bold">Baby Dolls</p>
            </div>
            <div className="bg-black/30 p-4 rounded text-center">
              <p className="font-bold">Onyx</p>
            </div>
            <div className="bg-black/30 p-4 rounded text-center">
              <p className="font-bold">Bucks Wild</p>
            </div>
          </div>
          <p className="text-sm text-gray-300">
            Partner clubs help dancers monetize beyond club earnings. VIP room content → platform monetization.
            Private dances → exclusive subscriber content. Offline earnings + online passive income.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a href="/creator-subscriptions">
            <Button size="lg" className="bg-cyan-600 hover:bg-cyan-700 text-xl px-12 py-6">
              Manage Your Subscriptions
            </Button>
          </a>
          <p className="text-sm text-gray-400 mt-4">Protected. Empowered. Profitable.</p>
        </div>
      </div>
    </div>
  );
}
