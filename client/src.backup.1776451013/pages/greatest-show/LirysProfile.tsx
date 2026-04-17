import { Link } from "wouter";
import LirysMissedRevenue from "./LirysMissedRevenue";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Crown, Star, Heart, Play, ChefHat, Home, Youtube,
  ShoppingBag, Flame, Users, TrendingUp, DollarSign,
  MapPin, Camera, Sparkles, ExternalLink
} from "lucide-react";

export default function LirysProfile() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* HERO */}
      <div
        className="relative min-h-[700px] flex items-center"
        style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a0533 40%, #0d1a0d 70%, #0a0a0a 100%)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-purple-500/20 to-yellow-500/10" />
        {/* Animated orbs */}
        <div className="absolute top-20 right-20 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-20 left-20 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Avatar */}
            <div className="relative flex justify-center">
              <div className="w-80 h-80 rounded-full bg-gradient-to-br from-emerald-400 via-purple-400 to-yellow-400 p-1 mx-auto shadow-2xl shadow-emerald-500/30">
                <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                  <div className="text-9xl">👩‍🍳</div>
                </div>
              </div>
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full px-5 py-2 shadow-xl animate-pulse">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-white" />
                  <span className="text-white font-bold text-sm">5-Star Chef</span>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full px-5 py-2 shadow-xl">
                <div className="flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-white" />
                  <span className="text-white font-bold text-sm">YouTube Creator</span>
                </div>
              </div>
              <div className="absolute top-1/2 -left-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full px-5 py-2 shadow-xl">
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-white" />
                  <span className="text-white font-bold text-sm">Airbnb Host</span>
                </div>
              </div>
              <div className="absolute top-8 -right-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full px-5 py-2 shadow-xl">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-white" />
                  <span className="text-white font-bold text-sm">Brand Partner</span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-5xl md:text-6xl font-bold text-white font-['Playfair_Display']">Lirys</h1>
                <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-base px-4 py-2">
                  <Crown className="w-4 h-4 mr-2" />
                  The Twin
                </Badge>
              </div>
              <div className="text-lg text-emerald-300 mb-1 font-semibold">@lirystwin</div>
              <div className="text-yellow-400 font-bold text-xl mb-4 italic">"The Greatest Show's 5-Star Chef & Host"</div>

              <div className="flex flex-wrap gap-2 text-sm text-white/80 mb-6">
                <span>👩‍🍳 Self-Taught Chef</span><span>•</span>
                <span>🏡 Airbnb Host</span><span>•</span>
                <span>📺 YouTube Creator</span><span>•</span>
                <span>👗 SHEIN Ambassador</span><span>•</span>
                <span>🌴 Dominican Republic</span><span>•</span>
                <span>👶 Single Mom</span><span>•</span>
                <span>💄 Lifestyle Queen</span>
              </div>

              <p className="text-white/70 text-base mb-6 leading-relaxed">
                Self-taught 5-star chef, Airbnb superhost, and lifestyle creator from the Dominican Republic.
                My kitchen is my stage. My Airbnb is my empire. My content is my legacy.
                SHEIN ambassador, Fashion Nova partner, and the most dangerous woman with a spatula you've ever seen.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">1.4K</div>
                  <div className="text-xs text-white/60">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">5★</div>
                  <div className="text-xs text-white/60">Chef Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">3</div>
                  <div className="text-xs text-white/60">Businesses</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-400">$25M+</div>
                  <div className="text-xs text-white/60">Potential</div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold px-8">
                  <Crown className="w-4 h-4 mr-2" /> Subscribe
                </Button>
                <Button size="lg" variant="outline" className="border-2 border-white/30 text-white hover:bg-white/10">
                  <Heart className="w-4 h-4 mr-2" /> Follow
                </Button>
                <a href="https://youtube.com/@liryscooks" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white font-bold">
                    <Youtube className="w-4 h-4 mr-2" /> YouTube
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="container mx-auto px-4 py-16">
        <Tabs defaultValue="youtube" className="w-full">
          <TabsList className="grid grid-cols-6 w-full mb-12 bg-white/5 border border-white/10 rounded-2xl p-1">
            <TabsTrigger value="youtube" className="data-[state=active]:bg-red-600 data-[state=active]:text-white rounded-xl font-semibold">
              <Youtube className="w-4 h-4 mr-2" /> YouTube
            </TabsTrigger>
            <TabsTrigger value="airbnb" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-xl font-semibold">
              <Home className="w-4 h-4 mr-2" /> Airbnb
            </TabsTrigger>
            <TabsTrigger value="brands" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black rounded-xl font-semibold">
              <ShoppingBag className="w-4 h-4 mr-2" /> Brand Deals
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-xl font-semibold">
              <Camera className="w-4 h-4 mr-2" /> Content
            </TabsTrigger>
            <TabsTrigger value="money" className="data-[state=active]:bg-red-600 data-[state=active]:text-white rounded-xl font-semibold">
              <DollarSign className="w-4 h-4 mr-2" /> 💀 Money Lost
            </TabsTrigger>
            <TabsTrigger value="subscribe" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white rounded-xl font-semibold">
              <Crown className="w-4 h-4 mr-2" /> Subscribe
            </TabsTrigger>
          </TabsList>

          {/* ===== YOUTUBE TAB ===== */}
          <TabsContent value="youtube">
            <div className="space-y-8">
              {/* Channel Hero */}
              <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-red-900/40 to-orange-900/40 border border-red-500/30 p-8">
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-5xl shadow-xl">
                    👩‍🍳
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white font-['Playfair_Display']">Lirys Cooks</h2>
                    <p className="text-red-300 text-lg font-semibold">Sexy Dominican Kitchen</p>
                    <p className="text-white/60 text-sm">@liryscooks • youtube.com/@liryscooks</p>
                  </div>
                  <div className="ml-auto">
                    <a href="https://youtube.com/@liryscooks" target="_blank" rel="noopener noreferrer">
                      <Button className="bg-red-600 hover:bg-red-700 text-white font-bold px-6">
                        <Youtube className="w-4 h-4 mr-2" /> Subscribe on YouTube
                      </Button>
                    </a>
                  </div>
                </div>
                <p className="text-white/80 text-base leading-relaxed">
                  A self-taught Dominican chef who cooks with passion, confidence, and a whole lot of flavor.
                  Every recipe is a story. Every video is a vibe. From traditional Dominican cuisine to
                  fusion dishes that'll make you forget every restaurant you've ever been to — this is
                  the kitchen you didn't know you needed.
                </p>
              </div>

              {/* Content Strategy */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-6 font-['Playfair_Display']">
                  <Sparkles className="w-6 h-6 inline mr-2 text-yellow-400" />
                  YouTube Content Strategy
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="p-6 bg-gradient-to-br from-red-900/30 to-orange-900/30 border-red-500/30">
                    <div className="text-3xl mb-3">🍽️</div>
                    <h4 className="text-lg font-bold text-white mb-2">Dominican Classics</h4>
                    <p className="text-white/70 text-sm mb-4">
                      Sancocho, mangu, tostones, pollo guisado. Authentic recipes with a sexy, cinematic presentation.
                      These are the videos that go viral in the DR diaspora.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge className="bg-red-500/20 text-red-300 text-xs">SEO: Dominican recipes</Badge>
                      <Badge className="bg-red-500/20 text-red-300 text-xs">SEO: Caribbean food</Badge>
                    </div>
                  </Card>
                  <Card className="p-6 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30">
                    <div className="text-3xl mb-3">🔥</div>
                    <h4 className="text-lg font-bold text-white mb-2">Sexy Cooking Series</h4>
                    <p className="text-white/70 text-sm mb-4">
                      "Cooking for Him" series. Dress up, cook something incredible, make it a whole vibe.
                      Fashion Nova outfit + 5-star meal = viral content every time.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge className="bg-purple-500/20 text-purple-300 text-xs">SEO: Cooking for your man</Badge>
                      <Badge className="bg-purple-500/20 text-purple-300 text-xs">SEO: Sexy chef</Badge>
                    </div>
                  </Card>
                  <Card className="p-6 bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border-emerald-500/30">
                    <div className="text-3xl mb-3">🏡</div>
                    <h4 className="text-lg font-bold text-white mb-2">Airbnb Kitchen Tours</h4>
                    <p className="text-white/70 text-sm mb-4">
                      Cook in the Airbnb kitchen. Show guests what they could be eating.
                      "What I cooked for my Airbnb guests this week" — drives bookings AND views.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge className="bg-emerald-500/20 text-emerald-300 text-xs">SEO: Airbnb host cooking</Badge>
                      <Badge className="bg-emerald-500/20 text-emerald-300 text-xs">SEO: DR Airbnb</Badge>
                    </div>
                  </Card>
                  <Card className="p-6 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-yellow-500/30">
                    <div className="text-3xl mb-3">👗</div>
                    <h4 className="text-lg font-bold text-white mb-2">SHEIN Kitchen Fits</h4>
                    <p className="text-white/70 text-sm mb-4">
                      Cook in SHEIN outfits. "What I wore while making [recipe]." Integrates brand deals
                      naturally into cooking content. SHEIN + food = untapped niche.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge className="bg-yellow-500/20 text-yellow-300 text-xs">SEO: SHEIN cooking outfit</Badge>
                      <Badge className="bg-yellow-500/20 text-yellow-300 text-xs">Sponsored</Badge>
                    </div>
                  </Card>
                  <Card className="p-6 bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border-cyan-500/30">
                    <div className="text-3xl mb-3">🌴</div>
                    <h4 className="text-lg font-bold text-white mb-2">DR Travel + Food</h4>
                    <p className="text-white/70 text-sm mb-4">
                      "Best food spots in the DR" + "I tried cooking what I ate at [restaurant]."
                      Drives tourism content, Airbnb bookings, and food discovery traffic.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge className="bg-cyan-500/20 text-cyan-300 text-xs">SEO: Dominican Republic food</Badge>
                      <Badge className="bg-cyan-500/20 text-cyan-300 text-xs">SEO: DR travel vlog</Badge>
                    </div>
                  </Card>
                  <Card className="p-6 bg-gradient-to-br from-pink-900/30 to-rose-900/30 border-pink-500/30">
                    <div className="text-3xl mb-3">👶</div>
                    <h4 className="text-lg font-bold text-white mb-2">Single Mom Meal Prep</h4>
                    <p className="text-white/70 text-sm mb-4">
                      "How I feed my family like a 5-star chef on a budget." Relatable, shareable,
                      and drives massive engagement from single moms worldwide.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge className="bg-pink-500/20 text-pink-300 text-xs">SEO: Single mom meal prep</Badge>
                      <Badge className="bg-pink-500/20 text-pink-300 text-xs">SEO: Budget cooking</Badge>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Monetization Path */}
              <Card className="p-8 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-yellow-500/30">
                <h3 className="text-2xl font-bold text-white mb-6">
                  <DollarSign className="w-6 h-6 inline mr-2 text-yellow-400" />
                  YouTube Monetization Roadmap
                </h3>
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <div className="text-3xl font-bold text-yellow-400 mb-1">500</div>
                    <div className="text-sm text-white/70 mb-2">Subscribers</div>
                    <div className="text-xs text-white/50">Community tab unlocks. Start building audience.</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <div className="text-3xl font-bold text-orange-400 mb-1">1,000</div>
                    <div className="text-sm text-white/70 mb-2">Subscribers + 4K hrs</div>
                    <div className="text-xs text-white/50">YouTube Partner Program. Ad revenue begins.</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <div className="text-3xl font-bold text-red-400 mb-1">10K</div>
                    <div className="text-sm text-white/70 mb-2">Subscribers</div>
                    <div className="text-xs text-white/50">Brand deals activate. SHEIN, Fashion Nova, HelloFresh.</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <div className="text-3xl font-bold text-pink-400 mb-1">100K</div>
                    <div className="text-sm text-white/70 mb-2">Subscribers</div>
                    <div className="text-xs text-white/50">Silver Play Button. Cookbook deal. $10K+/month.</div>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-white/5 rounded-xl">
                  <p className="text-white/80 text-sm">
                    <strong className="text-yellow-400">TikTok → YouTube Bridge:</strong> Post 3-5 TikToks/day.
                    Every TikTok ends with "Full recipe on YouTube — link in bio."
                    TikTok is the free ad. YouTube is where the money lives.
                  </p>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ===== AIRBNB TAB ===== */}
          <TabsContent value="airbnb">
            <div className="space-y-8">
              <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-500/30 p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <Home className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Lirys' Dominican Paradise</h2>
                    <p className="text-emerald-300">Airbnb Superhost • Dominican Republic</p>
                  </div>
                  <div className="ml-auto flex gap-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">5.0 ★</div>
                      <div className="text-xs text-white/60">Rating</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-400">Superhost</div>
                      <div className="text-xs text-white/60">Status</div>
                    </div>
                  </div>
                </div>
                <p className="text-white/80 mb-6">
                  Stay in the most beautiful Airbnb in the Dominican Republic. Chef-cooked breakfast available.
                  Your host is a 5-star chef who will make your stay unforgettable.
                </p>
                <a href="https://airbnb.com/rooms/lirystwin" target="_blank" rel="noopener noreferrer">
                  <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold px-8">
                    <ExternalLink className="w-4 h-4 mr-2" /> Book on Airbnb
                  </Button>
                </a>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-6 bg-white/5 border-white/10">
                  <ChefHat className="w-8 h-8 text-emerald-400 mb-3" />
                  <h4 className="font-bold text-white mb-2">Chef's Breakfast Add-On</h4>
                  <p className="text-white/60 text-sm">Book a chef-cooked Dominican breakfast. Mangu, salami, eggs, fresh juice. The full experience.</p>
                </Card>
                <Card className="p-6 bg-white/5 border-white/10">
                  <Camera className="w-8 h-8 text-purple-400 mb-3" />
                  <h4 className="font-bold text-white mb-2">Content Creator Package</h4>
                  <p className="text-white/60 text-sm">Book the Airbnb for content shoots. Beautiful DR backdrop, chef-cooked meals, full creator setup.</p>
                </Card>
                <Card className="p-6 bg-white/5 border-white/10">
                  <MapPin className="w-8 h-8 text-yellow-400 mb-3" />
                  <h4 className="font-bold text-white mb-2">DR Experience Guide</h4>
                  <p className="text-white/60 text-sm">Lirys' personal guide to the best spots in the DR. Restaurants, beaches, hidden gems — all included.</p>
                </Card>
              </div>

              {/* TikTok to Airbnb funnel */}
              <Card className="p-6 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border-purple-500/30">
                <h3 className="text-xl font-bold text-white mb-4">
                  <TrendingUp className="w-5 h-5 inline mr-2 text-purple-400" />
                  TikTok → Airbnb Traffic Funnel
                </h3>
                <div className="grid md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-white/5 rounded-xl">
                    <div className="text-2xl mb-1">📱</div>
                    <div className="text-sm font-semibold text-white">TikTok</div>
                    <div className="text-xs text-white/50">"POV: Staying at my Airbnb in DR"</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <div className="text-2xl mb-1">🔗</div>
                    <div className="text-sm font-semibold text-white">Link in Bio</div>
                    <div className="text-xs text-white/50">creatorvault.live/chica/8004</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <div className="text-2xl mb-1">💬</div>
                    <div className="text-sm font-semibold text-white">WhatsApp</div>
                    <div className="text-xs text-white/50">Booking inquiry → Airbnb link</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <div className="text-2xl mb-1">🏡</div>
                    <div className="text-sm font-semibold text-white">Airbnb Booking</div>
                    <div className="text-xs text-white/50">$$$</div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ===== BRAND DEALS TAB ===== */}
          <TabsContent value="brands">
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white font-['Playfair_Display'] mb-3">
                  Brand Partnership Opportunities
                </h2>
                <p className="text-white/60">
                  Lirys is actively seeking brand deals in fashion, food, travel, and lifestyle.
                  These are the brands she is targeting and the deals available on the platform.
                </p>
              </div>

              {/* Active Targets */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* SHEIN */}
                <Card className="p-6 bg-gradient-to-br from-pink-900/40 to-rose-900/40 border-2 border-pink-500/40 hover:border-pink-400 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-2xl shadow-lg">
                      👗
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">SHEIN</h3>
                      <p className="text-pink-300 text-sm">Fashion Ambassador Deal</p>
                    </div>
                    <Badge className="ml-auto bg-green-500/20 text-green-300 border-green-500/30">Open</Badge>
                  </div>
                  <p className="text-white/70 text-sm mb-4">
                    SHEIN x Dominican Republic lifestyle campaign. Cooking in SHEIN outfits, haul videos,
                    lifestyle content. Perfect fit for Lirys' cooking + fashion content mix.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="p-2 bg-white/5 rounded-lg">
                      <div className="text-pink-400 font-bold">$500 – $2,500</div>
                      <div className="text-white/50 text-xs">Per campaign</div>
                    </div>
                    <div className="p-2 bg-white/5 rounded-lg">
                      <div className="text-white font-semibold">Ambassador</div>
                      <div className="text-white/50 text-xs">Deal type</div>
                    </div>
                  </div>
                  <div className="text-xs text-white/50 mb-4">
                    Deliverables: 2 IG posts, 3 TikToks, 1 YouTube integration, SHEIN haul video
                  </div>
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold">
                    Apply for This Deal
                  </Button>
                </Card>

                {/* Fashion Nova */}
                <Card className="p-6 bg-gradient-to-br from-red-900/40 to-orange-900/40 border-2 border-red-500/40 hover:border-red-400 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-2xl shadow-lg">
                      💃
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Fashion Nova</h3>
                      <p className="text-red-300 text-sm">Curve Collection Ambassador</p>
                    </div>
                    <Badge className="ml-auto bg-green-500/20 text-green-300 border-green-500/30">Open</Badge>
                  </div>
                  <p className="text-white/70 text-sm mb-4">
                    Fashion Nova Curve — real women, real bodies. Dominican and Latina creators
                    for authentic lifestyle + cooking content. Monthly ambassador deal.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="p-2 bg-white/5 rounded-lg">
                      <div className="text-red-400 font-bold">$750 – $3,000</div>
                      <div className="text-white/50 text-xs">Per campaign</div>
                    </div>
                    <div className="p-2 bg-white/5 rounded-lg">
                      <div className="text-white font-semibold">Ambassador</div>
                      <div className="text-white/50 text-xs">Deal type</div>
                    </div>
                  </div>
                  <div className="text-xs text-white/50 mb-4">
                    Deliverables: 3 IG posts, 2 TikToks, 1 YouTube Shorts series (3 parts), monthly content
                  </div>
                  <Button className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold">
                    Apply for This Deal
                  </Button>
                </Card>

                {/* HelloFresh */}
                <Card className="p-6 bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-2 border-green-500/40 hover:border-green-400 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-2xl shadow-lg">
                      🥗
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">HelloFresh</h3>
                      <p className="text-green-300 text-sm">Caribbean Home Chef Campaign</p>
                    </div>
                    <Badge className="ml-auto bg-green-500/20 text-green-300 border-green-500/30">Open</Badge>
                  </div>
                  <p className="text-white/70 text-sm mb-4">
                    HelloFresh partnering with Caribbean home chefs. Recipe videos featuring
                    HelloFresh ingredients. Perfect for Lirys' YouTube cooking channel.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="p-2 bg-white/5 rounded-lg">
                      <div className="text-green-400 font-bold">$400 – $1,500</div>
                      <div className="text-white/50 text-xs">Per campaign</div>
                    </div>
                    <div className="p-2 bg-white/5 rounded-lg">
                      <div className="text-white font-semibold">Sponsored Post</div>
                      <div className="text-white/50 text-xs">Deal type</div>
                    </div>
                  </div>
                  <div className="text-xs text-white/50 mb-4">
                    Deliverables: 2 recipe videos with HelloFresh ingredients, 1 YouTube integration
                  </div>
                  <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold">
                    Apply for This Deal
                  </Button>
                </Card>

                {/* Airbnb Brand */}
                <Card className="p-6 bg-gradient-to-br from-teal-900/40 to-cyan-900/40 border-2 border-teal-500/40 hover:border-teal-400 transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-2xl shadow-lg">
                      🏡
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Airbnb</h3>
                      <p className="text-teal-300 text-sm">Host Stories Campaign</p>
                    </div>
                    <Badge className="ml-auto bg-green-500/20 text-green-300 border-green-500/30">Open</Badge>
                  </div>
                  <p className="text-white/70 text-sm mb-4">
                    Airbnb Host Stories — Caribbean hosts sharing their story. 3-part YouTube series,
                    IG posts, TikToks. Lirys is the perfect face for this campaign.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="p-2 bg-white/5 rounded-lg">
                      <div className="text-teal-400 font-bold">$1,000 – $5,000</div>
                      <div className="text-white/50 text-xs">Per campaign</div>
                    </div>
                    <div className="p-2 bg-white/5 rounded-lg">
                      <div className="text-white font-semibold">Series</div>
                      <div className="text-white/50 text-xs">Deal type</div>
                    </div>
                  </div>
                  <div className="text-xs text-white/50 mb-4">
                    Deliverables: 3-part YouTube series, 4 IG posts, 2 TikToks, 1 blog post
                  </div>
                  <Button className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold">
                    Apply for This Deal
                  </Button>
                </Card>
              </div>

              {/* Brand Deal Income Potential */}
              <Card className="p-6 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-yellow-500/30">
                <h3 className="text-xl font-bold text-white mb-4">
                  <DollarSign className="w-5 h-5 inline mr-2 text-yellow-400" />
                  Brand Deal Income Potential
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl text-center">
                    <div className="text-2xl font-bold text-yellow-400">$1,650 – $8,500</div>
                    <div className="text-sm text-white/60">Per month (all 4 deals active)</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl text-center">
                    <div className="text-2xl font-bold text-orange-400">$19,800 – $102,000</div>
                    <div className="text-sm text-white/60">Annual brand deal potential</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl text-center">
                    <div className="text-2xl font-bold text-pink-400">70%</div>
                    <div className="text-sm text-white/60">Lirys' revenue share</div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ===== CONTENT TAB ===== */}
          <TabsContent value="content">
            <div className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="p-6 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30">
                  <h3 className="text-xl font-bold text-white mb-4">
                    <Play className="w-5 h-5 inline mr-2 text-purple-400" />
                    TikTok Content Plan
                  </h3>
                  <div className="space-y-3 text-sm text-white/80">
                    <div className="p-3 bg-white/5 rounded-lg">
                      <strong className="text-purple-300">Hook (0-2 sec):</strong> "POV: Your Airbnb host is a 5-star chef 🍽️"
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <strong className="text-purple-300">Cooking Series:</strong> "Cooking [dish] in my SHEIN fit 🔥"
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <strong className="text-purple-300">Airbnb Tours:</strong> "Come see my Airbnb in the DR 🌴"
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <strong className="text-purple-300">Single Mom Life:</strong> "How I feed my kids like a 5-star chef 👶"
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <strong className="text-purple-300">CTA:</strong> "Full recipe on YouTube — link in bio 📺"
                    </div>
                  </div>
                </Card>
                <Card className="p-6 bg-gradient-to-br from-red-900/30 to-orange-900/30 border-red-500/30">
                  <h3 className="text-xl font-bold text-white mb-4">
                    <Youtube className="w-5 h-5 inline mr-2 text-red-400" />
                    YouTube Upload Schedule
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-white">Monday</span>
                      <span className="text-red-300">Dominican Classic Recipe</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-white">Wednesday</span>
                      <span className="text-pink-300">Sexy Cooking / SHEIN Fit</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-white">Friday</span>
                      <span className="text-emerald-300">Airbnb Tour / DR Lifestyle</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-white">Sunday</span>
                      <span className="text-yellow-300">Meal Prep / Single Mom Life</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ===== SUBSCRIBE TAB ===== */}
          <TabsContent value="subscribe">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 bg-gradient-to-br from-emerald-900/50 to-teal-900/50 border-emerald-500/50 hover:scale-105 transition-transform">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Kitchen Fan</h3>
                  <div className="text-4xl font-bold text-emerald-400 mb-1">$9.99</div>
                  <div className="text-white/60 text-sm">per month</div>
                </div>
                <ul className="space-y-2 mb-6 text-sm text-white/80">
                  <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Exclusive recipes</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Behind-the-scenes cooking</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Monthly meal plan</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> DR travel tips</li>
                </ul>
                <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold">Subscribe</Button>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-2 border-purple-400 hover:scale-105 transition-transform relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                  MOST POPULAR
                </div>
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                    <Flame className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">VIP Chef's Table</h3>
                  <div className="text-4xl font-bold text-purple-400 mb-1">$29.99</div>
                  <div className="text-white/60 text-sm">per month</div>
                </div>
                <ul className="space-y-2 mb-6 text-sm text-white/80">
                  <li className="flex items-center gap-2"><span className="text-purple-400">✓</span> Everything in Kitchen Fan</li>
                  <li className="flex items-center gap-2"><span className="text-purple-400">✓</span> Live cooking sessions</li>
                  <li className="flex items-center gap-2"><span className="text-purple-400">✓</span> Airbnb early access booking</li>
                  <li className="flex items-center gap-2"><span className="text-purple-400">✓</span> SHEIN discount codes</li>
                  <li className="flex items-center gap-2"><span className="text-purple-400">✓</span> Private Telegram group</li>
                </ul>
                <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold">Subscribe</Button>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-yellow-900/50 to-orange-900/50 border-yellow-500/50 hover:scale-105 transition-transform">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-4">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Empire Access</h3>
                  <div className="text-4xl font-bold text-yellow-400 mb-1">$99.99</div>
                  <div className="text-white/60 text-sm">per month</div>
                </div>
                <ul className="space-y-2 mb-6 text-sm text-white/80">
                  <li className="flex items-center gap-2"><span className="text-yellow-400">✓</span> Everything in VIP Chef's Table</li>
                  <li className="flex items-center gap-2"><span className="text-yellow-400">✓</span> 1-on-1 cooking lesson (monthly)</li>
                  <li className="flex items-center gap-2"><span className="text-yellow-400">✓</span> Airbnb VIP discount (20% off)</li>
                  <li className="flex items-center gap-2"><span className="text-yellow-400">✓</span> Brand deal referral network</li>
                  <li className="flex items-center gap-2"><span className="text-yellow-400">✓</span> DR trip planning with Lirys</li>
                </ul>
                <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold">Subscribe</Button>
              </Card>
            </div>
          </TabsContent>
          {/* ===== MONEY LEFT ON TABLE TAB ===== */}
          <TabsContent value="money">
            <LirysMissedRevenue />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
