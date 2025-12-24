import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">
            CreatorVault <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">ULTRASTATE</span>
          </h1>
          <p className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 mb-6">
            The Platform Where Creators Keep 85%
          </p>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            No Twitch. No YouTube. No OnlyFans taking 50%. This is YOUR platform. Built by a creator, for creators.
          </p>
        </div>

        {/* Test Instructions Card */}
        <Card className="max-w-4xl mx-auto bg-white/95 backdrop-blur-lg mb-12">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">🎄 Christmas Eve Test</CardTitle>
            <CardDescription className="text-lg">
              Testing real money flow - 10 minutes total
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border-2 border-green-500">
              <h3 className="text-xl font-bold mb-3 text-gray-900">What You're Testing:</h3>
              <p className="text-gray-700 text-lg mb-4">
                Can real money flow through CreatorVault? You'll send yourself $5 via Zelle, see it split 70/30, then get $3.50 back.
              </p>
              <div className="bg-white p-4 rounded border border-gray-200">
                <p className="font-semibold text-gray-900">💰 Money Flow:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 mt-2">
                  <li>You send: $5.00</li>
                  <li>Creator gets: $3.50 (70%)</li>
                  <li>Platform fee: $1.50 (30%)</li>
                  <li>You get back: $3.50</li>
                </ul>
              </div>
            </div>

            {/* Step-by-step instructions */}
            <div className="space-y-4">
              <div className="bg-purple-50 p-5 rounded-lg border-l-4 border-purple-500">
                <h4 className="font-bold text-lg text-purple-900 mb-2">STEP 1: Be the Creator (5 min)</h4>
                <p className="text-gray-700 mb-3">On your COMPUTER:</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Click "Login" button below</li>
                  <li>Sign in with Google</li>
                  <li>Go to "Creator Subscriptions"</li>
                  <li>Create a $5 tier called "Test"</li>
                  <li>Copy the subscribe link</li>
                </ol>
              </div>

              <div className="bg-pink-50 p-5 rounded-lg border-l-4 border-pink-500">
                <h4 className="font-bold text-lg text-pink-900 mb-2">STEP 2: Be the Fan (3 min)</h4>
                <p className="text-gray-700 mb-3">On your PHONE (different browser):</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Open the subscribe link</li>
                  <li>Login with a different email</li>
                  <li>Choose "Zelle" payment</li>
                  <li>Send yourself $5 via Zelle</li>
                  <li>Enter "TEST" as confirmation</li>
                  <li>TEXT CAMERON: "Payment sent"</li>
                </ol>
              </div>

              <div className="bg-blue-50 p-5 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-bold text-lg text-blue-900 mb-2">STEP 3: Cameron Confirms</h4>
                <p className="text-gray-700">
                  Cameron clicks "Confirm Payment" on his admin page. Money splits automatically.
                </p>
              </div>

              <div className="bg-green-50 p-5 rounded-lg border-l-4 border-green-500">
                <h4 className="font-bold text-lg text-green-900 mb-2">STEP 4: Get Your Money (2 min)</h4>
                <p className="text-gray-700 mb-3">Back on your COMPUTER:</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Go to "Creator Earnings"</li>
                  <li>See your $3.50 balance</li>
                  <li>Click "Request Payout"</li>
                  <li>TEXT CAMERON: "Payout requested"</li>
                </ol>
                <p className="text-gray-700 mt-3">
                  Cameron approves and sends you $3.50 via Zelle. Test complete! ✅
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-4 pt-6">
              {!user ? (
                <>
                  <Button 
                    asChild 
                    size="lg" 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xl py-8"
                  >
                    <a href={import.meta.env.VITE_OAUTH_PORTAL_URL}>🚀 Start Test - Login Here</a>
                  </Button>
                  <p className="text-center text-sm text-gray-600">
                    Questions? Text Cameron
                  </p>
                </>
              ) : (
                <>
                  <Button 
                    asChild 
                    size="lg" 
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white text-xl py-8"
                  >
                    <Link href="/creator-subscriptions">✅ Logged In - Go to Step 1</Link>
                  </Button>
                  <div className="grid grid-cols-2 gap-4">
                    <Button asChild variant="outline" size="lg">
                      <Link href="/creator-earnings">💰 Creator Earnings</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link href="/creator-subscriptions">📋 Subscriptions</Link>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* What CreatorVault Is */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
            <CardHeader>
              <CardTitle className="text-2xl text-center">What is CreatorVault?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-200">
              <p className="text-lg">
                CreatorVault is the platform where creators actually make money. No middleman taking 50%. No waiting for payouts. No bullshit.
              </p>
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-3xl mb-2">85%</div>
                  <div className="text-sm">Creator Split</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-3xl mb-2">🎥</div>
                  <div className="text-sm">Live Streaming</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-3xl mb-2">💳</div>
                  <div className="text-sm">Any Payment Method</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-300">
          <p className="text-sm">
            © 2024 CreatorVault ULTRASTATE. Built on Christmas Eve by KingCam.
          </p>
        </div>
      </div>
    </div>
  );
}
