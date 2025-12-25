import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { DollarSign, Video, ShoppingBag, TrendingUp, Shield, Zap } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 text-white">
        <div className="container py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              CreatorVault <span className="text-pink-300">ULTRASTATE</span>
            </h1>
            <p className="text-2xl md:text-3xl font-medium">
              The Platform Where Creators Keep 85%
            </p>
            <p className="text-xl md:text-2xl text-purple-100 max-w-3xl mx-auto">
              No Twitch. No YouTube. No OnlyFans taking 50%. This is YOUR platform. Built by a creator, for creators.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {user ? (
                <>
                  <Button
                    size="lg"
                    className="bg-white text-purple-700 hover:bg-purple-50 text-lg px-8 py-6"
                    onClick={() => setLocation("/start")}
                  >
                    Start Earning
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/10 text-lg px-8 py-6"
                    onClick={() => setLocation("/vaultlive")}
                  >
                    Go Live
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="bg-white text-purple-700 hover:bg-purple-50 text-lg px-8 py-6"
                    onClick={() => window.location.href = getLoginUrl()}
                  >
                    Get Started Free
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/10 text-lg px-8 py-6"
                    onClick={() => setLocation("/guia")}
                  >
                    🇩🇴 Ver Guía en Español
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Why CreatorVault?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We built the platform we wish existed. Fair splits, powerful tools, zero BS.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <DollarSign className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Keep 85% of Everything</CardTitle>
              <CardDescription>
                Live tips, subscriptions, product sales. You keep 85%, we take 15%. That's it.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Video className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>VaultLive Streaming</CardTitle>
              <CardDescription>
                Go live, receive tips in real-time. No complicated setup. Just stream and earn.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <ShoppingBag className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Sell Anything</CardTitle>
              <CardDescription>
                Digital products, physical goods, services, coaching. One platform for everything.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Growth Tools</CardTitle>
              <CardDescription>
                AI-powered content tools, analytics, and insights to help you grow faster.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Your Platform</CardTitle>
              <CardDescription>
                No arbitrary bans. No sudden policy changes. Built for creators, by creators.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Fast Payouts</CardTitle>
              <CardDescription>
                Get paid via Cash App or PayPal. No waiting 30 days for your money.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-purple-50 dark:bg-purple-950 py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl font-bold">Ready to Keep What You Earn?</h2>
            <p className="text-xl text-muted-foreground">
              Join creators who are done with platforms taking 50%. Start earning 85% today.
            </p>
            {!user && (
              <Button
                size="lg"
                className="bg-purple-600 hover:bg-purple-700 text-lg px-8 py-6"
                onClick={() => window.location.href = getLoginUrl()}
              >
                Sign Up Free - No Credit Card
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
