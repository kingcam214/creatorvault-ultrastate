import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Heart,
  Star,
  Crown,
  Flame,
  Dumbbell,
  ShoppingBag,
  Video,
  Users,
  Bot,
  Gift,
  MessageCircle,
  TrendingUp,
  Zap,
  Target,
} from "lucide-react";

export default function LuvRoxieProfile() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-orange-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-pink-500 via-purple-600 to-orange-500">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
        
        <div className="container relative z-10 py-16">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            {/* Profile Image */}
            <div className="flex justify-center lg:justify-start">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-purple-400 to-orange-400 rounded-full blur-2xl opacity-60 animate-pulse" />
                <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-white shadow-2xl">
                  <div className="w-full h-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center">
                    <Sparkles className="w-32 h-32 text-white" />
                  </div>
                </div>
                {/* Floating Badges */}
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                  🍑 Georgia Peach
                </div>
                <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-green-400 to-cyan-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Good Girl Energy
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="text-center lg:text-left space-y-4">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-bold">
                <Crown className="w-4 h-4" />
                Petite Queen
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-black text-white drop-shadow-lg">
                luvRoxie
                <span className="inline-flex items-center ml-3">
                  <div className="bg-pink-500 text-white px-3 py-1 rounded-full text-base flex items-center gap-1">
                    <Star className="w-4 h-4 fill-current" />
                    Verified
                  </div>
                </span>
              </h1>
              
              <p className="text-xl text-white/90">@luvroxie</p>
              
              <div className="flex flex-wrap gap-3 text-white/90 text-sm justify-center lg:justify-start">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4" /> Petite Fantasy Queen
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" /> "Itty Bitty"
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  🍑 GA Native
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4" /> Good Girl Energy
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Flame className="w-4 h-4" /> All Natural
                </span>
              </div>
              
              <p className="text-2xl font-bold text-cyan-300 italic">
                "Your Favorite Petite Fantasy 😭🍑"
              </p>
              
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 pt-4">
                <div className="text-center">
                  <div className="text-3xl font-black text-white">12.8K</div>
                  <div className="text-sm text-white/80">likes</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-white">567</div>
                  <div className="text-sm text-white/80">content pieces</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-white">122</div>
                  <div className="text-sm text-white/80">videos</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-white">$40M+</div>
                  <div className="text-sm text-white/80">potential</div>
                </div>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex gap-4 pt-4 justify-center lg:justify-start">
                <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-lg px-8 shadow-xl">
                  Subscribe
                </Button>
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/20 font-bold text-lg px-8">
                  Follow
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12">
        <Tabs defaultValue="about" className="space-y-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-14">
            <TabsTrigger value="about" className="text-lg font-bold">About</TabsTrigger>
            <TabsTrigger value="subscribe" className="text-lg font-bold">Subscribe</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="space-y-12">
            {/* Intro Section */}
            <Card className="p-8 bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-200">
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-3 rounded-xl">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-gray-900 mb-2">
                    The Petite Fantasy Queen: 10 Revenue Streams, One Unstoppable Mogul
                  </h2>
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                    <Target className="w-4 h-4" />
                    Category Creator
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 text-lg text-gray-700">
                <p className="leading-relaxed">
                  "Hey, it's <span className="font-bold text-pink-600">Itty Bitty</span>! 😁 I'm your favorite petite fantasy. I've got 567 pieces of content, 12.8K likes, and I'm making $36K-$72K/year on OnlyFans. But here's the thing..."
                </p>
                
                <p className="leading-relaxed font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
                  "I'm leaving $40 MILLION on the table. And I didn't even know it."
                </p>
                
                <p className="leading-relaxed">
                  "I'm a <span className="font-bold text-purple-600">Georgia Peach</span> 🍑 with a petite body and a BIG personality. I'm all about having fun and doing what I love! I'm a good girl... with a naughty side. 😈"
                </p>
                
                <p className="leading-relaxed">
                  "I'm not doing OnlyFans anymore. I'm doing <span className="font-bold text-orange-600">CreatorVault</span> where I keep <span className="font-bold text-green-600">70% + equity</span>. I'm building my empire. I'm showing every petite creator that you don't have to settle for $72K/year when you can make <span className="font-bold text-purple-600">$40M over 5 years</span>."
                </p>
                
                <p className="leading-relaxed font-bold text-xl">
                  "This is the Greatest Show on Earth. And I'm the Petite Fantasy Queen. 👑🍑✨"
                </p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div className="bg-gradient-to-br from-pink-100 to-purple-100 p-4 rounded-xl text-center border-2 border-pink-300">
                  <div className="text-2xl mb-2">🍑</div>
                  <div className="font-bold text-gray-900">Georgia Peach</div>
                </div>
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-4 rounded-xl text-center border-2 border-purple-300">
                  <div className="text-2xl mb-2">💖</div>
                  <div className="font-bold text-gray-900">All Natural</div>
                </div>
                <div className="bg-gradient-to-br from-orange-100 to-pink-100 p-4 rounded-xl text-center border-2 border-orange-300">
                  <div className="text-2xl mb-2">✨</div>
                  <div className="font-bold text-gray-900">Good Girl</div>
                </div>
                <div className="bg-gradient-to-br from-cyan-100 to-blue-100 p-4 rounded-xl text-center border-2 border-cyan-300">
                  <div className="text-2xl mb-2">👑</div>
                  <div className="font-bold text-gray-900">Petite Queen</div>
                </div>
              </div>
            </Card>

            {/* 10 Revenue Streams */}
            <div className="space-y-6">
              <h2 className="text-4xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
                The 10 Revenue Streams
              </h2>
              
              <div className="grid gap-6 md:grid-cols-2">
                {/* Stream 1 */}
                <Card className="p-6 bg-gradient-to-br from-pink-50 to-red-50 border-2 border-pink-300 hover:shadow-xl transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-pink-500 to-red-600 p-3 rounded-xl flex-shrink-0">
                      <Flame className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-900 mb-2">
                        1. Premium Adult Content
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Exclusive photos, videos, behind-the-scenes content
                      </p>
                      <div className="text-2xl font-black text-pink-600 mb-1">
                        $900K-$2.7M/year (Year 1)
                      </div>
                      <div className="text-sm text-gray-500">
                        3 tiers: $15, $50, $150/month
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Stream 2 */}
                <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 hover:shadow-xl transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-xl flex-shrink-0">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-900 mb-2">
                        2. Custom Content & Experiences
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Custom videos, photos, shoutouts, 1-on-1 calls
                      </p>
                      <div className="text-2xl font-black text-purple-600 mb-1">
                        $180K-$540K/year (Year 1)
                      </div>
                      <div className="text-sm text-gray-500">
                        $100-$1,000 per request
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Stream 3 */}
                <Card className="p-6 bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-300 hover:shadow-xl transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-orange-500 to-yellow-600 p-3 rounded-xl flex-shrink-0">
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-900 mb-2">
                        3. VIP Experiences & Meetups
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        In-person meetups, dinner dates, VIP events
                      </p>
                      <div className="text-2xl font-black text-orange-600 mb-1">
                        $120K-$360K/year (Year 1)
                      </div>
                      <div className="text-sm text-gray-500">
                        $1,000-$10,000 per experience
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Stream 4 */}
                <Card className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-300 hover:shadow-xl transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-3 rounded-xl flex-shrink-0">
                      <ShoppingBag className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-900 mb-2">
                        4. Merchandise & Branded Products
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Lingerie line, apparel, accessories, signed prints
                      </p>
                      <div className="text-2xl font-black text-cyan-600 mb-1">
                        $150K-$450K/year (Year 1)
                      </div>
                      <div className="text-sm text-gray-500">
                        $25-$200 per item
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Stream 5 */}
                <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 hover:shadow-xl transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-3 rounded-xl flex-shrink-0">
                      <Dumbbell className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-900 mb-2">
                        5. Fitness & Wellness Content
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Petite fitness programs, nutrition, body confidence
                      </p>
                      <div className="text-2xl font-black text-green-600 mb-1">
                        $200K-$600K/year (Year 1)
                      </div>
                      <div className="text-sm text-gray-500">
                        $97-$497 per program
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Stream 6 */}
                <Card className="p-6 bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-300 hover:shadow-xl transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-3 rounded-xl flex-shrink-0">
                      <Heart className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-900 mb-2">
                        6. Lifestyle & Behind-the-Scenes
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Daily vlogs, shopping trips, "day in the life"
                      </p>
                      <div className="text-2xl font-black text-pink-600 mb-1">
                        $180K-$540K/year (Year 1)
                      </div>
                      <div className="text-sm text-gray-500">
                        $25-$75/month tier
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Stream 7 */}
                <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-300 hover:shadow-xl transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl flex-shrink-0">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-900 mb-2">
                        7. Coaching & Mentorship
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Creator coaching, OF strategy, confidence building
                      </p>
                      <div className="text-2xl font-black text-indigo-600 mb-1">
                        $100K-$300K/year (Year 1)
                      </div>
                      <div className="text-sm text-gray-500">
                        $197-$997 per program
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Stream 8 */}
                <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 hover:shadow-xl transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-3 rounded-xl flex-shrink-0">
                      <Gift className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-900 mb-2">
                        8. Brand Partnerships
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Lingerie brands, beauty products, lifestyle brands
                      </p>
                      <div className="text-2xl font-black text-yellow-600 mb-1">
                        $120K-$360K/year (Year 1)
                      </div>
                      <div className="text-sm text-gray-500">
                        $5K-$30K per partnership
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Stream 9 */}
                <Card className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-300 hover:shadow-xl transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-3 rounded-xl flex-shrink-0">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-900 mb-2">
                        9. Recruiting Network
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Recruit other petite creators to CreatorVault
                      </p>
                      <div className="text-2xl font-black text-teal-600 mb-1">
                        $60K-$180K/year (Year 1)
                      </div>
                      <div className="text-sm text-gray-500">
                        5-10% of recruited creators' earnings
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Stream 10 */}
                <Card className="p-6 bg-gradient-to-br from-violet-50 to-fuchsia-50 border-2 border-violet-300 hover:shadow-xl transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 p-3 rounded-xl flex-shrink-0">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-900 mb-2">
                        10. AI-Powered Content Tools
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        AI chatbot setup, content creation, automation
                      </p>
                      <div className="text-2xl font-black text-violet-600 mb-1">
                        $90K-$270K/year (Year 1)
                      </div>
                      <div className="text-sm text-gray-500">
                        $97-$497 per product
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Total Revenue Projection */}
            <Card className="p-8 bg-gradient-to-br from-purple-900 to-pink-900 text-white border-4 border-yellow-400">
              <div className="text-center space-y-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <TrendingUp className="w-12 h-12 text-yellow-400" />
                  <h2 className="text-4xl font-black">Total Revenue Projection</h2>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border-2 border-white/20">
                    <div className="text-sm text-cyan-300 mb-2 font-bold">Year 1 (Launch)</div>
                    <div className="text-3xl font-black text-white mb-1">$2.1M-$6.3M</div>
                    <div className="text-sm text-gray-300">Her 70% share: $1.47M-$4.41M</div>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border-2 border-white/20">
                    <div className="text-sm text-yellow-300 mb-2 font-bold">Year 5 (Empire)</div>
                    <div className="text-3xl font-black text-white mb-1">$21.3M-$58.8M</div>
                    <div className="text-sm text-gray-300">Her 70% share: $14.91M-$41.16M/year</div>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border-2 border-white/20">
                    <div className="text-sm text-pink-300 mb-2 font-bold">5-Year Total</div>
                    <div className="text-3xl font-black text-white mb-1">$56.7M-$156.6M</div>
                    <div className="text-sm text-gray-300">Her 70% share: $39.69M-$109.62M</div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 p-6 rounded-xl mt-6">
                  <div className="text-lg font-bold mb-2">From $36K-$72K/year to $39.69M-$109.62M over 5 years</div>
                  <div className="text-3xl font-black">
                    That's a 551X-1,522X increase with the SAME content. This is the power of proper monetization.
                  </div>
                </div>
              </div>
            </Card>

            {/* What Makes luvRoxie Different */}
            <div className="space-y-6">
              <h2 className="text-4xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
                What Makes luvRoxie Different
              </h2>
              
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-6 bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-300">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">🍑</div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 mb-2">The Petite Powerhouse</h3>
                      <p className="text-gray-700 leading-relaxed">
                        "Good things come in small packages." In an era of BBLs and enhancements, she's 100% natural. 5'2" of pure fantasy. Petite but mighty. She celebrates her small frame and doesn't apologize for it.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">💖</div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 mb-2">The Girl Next Door</h3>
                      <p className="text-gray-700 leading-relaxed">
                        "Your favorite petite fantasy" • "I'm all about having fun!" • "A good girl" (with a naughty side). Authentic, relatable, approachable. She's not trying to be someone she's not.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-300">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">🍑</div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 mb-2">The Georgia Peach</h3>
                      <p className="text-gray-700 leading-relaxed">
                        Southern charm meets petite fantasy. "GA 🍑" branding. Sweet, playful, fun energy. Regional pride + national appeal. She's the peach everyone wants a taste of.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-300">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">👑</div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 mb-2">The Content Queen</h3>
                      <p className="text-gray-700 leading-relaxed">
                        567 pieces of content (445 photos + 122 videos). Consistent, prolific creator. Quality + quantity. She always delivers for her fans. That's why they keep coming back.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">✨</div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 mb-2">The Natural Beauty</h3>
                      <p className="text-gray-700 leading-relaxed">
                        All-natural petite body. No enhancements, no surgery. Authentic curves on a small frame. Relatable to petite women everywhere. She's proof that natural is beautiful.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-pink-50 to-red-50 border-2 border-pink-300">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">😁</div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 mb-2">The Fun-Loving Spirit</h3>
                      <p className="text-gray-700 leading-relaxed">
                        "I'm all about having fun!" Playful, not overly serious. Joyful energy in all content. Makes fantasy feel accessible. She's the girl you want to hang out with AND fantasize about.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* The Petite Fantasy Manifesto */}
            <Card className="p-8 bg-gradient-to-br from-pink-100 to-purple-100 border-4 border-pink-400">
              <div className="text-center space-y-4">
                <Sparkles className="w-16 h-16 mx-auto text-pink-600" />
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
                  The Petite Fantasy Manifesto
                </h2>
                <div className="max-w-3xl mx-auto space-y-4 text-lg text-gray-700">
                  <p className="leading-relaxed">
                    "I'm <span className="font-bold text-pink-600">Itty Bitty</span>. I'm 5'2" of pure fantasy. I'm a <span className="font-bold text-orange-600">Georgia Peach</span> 🍑 with a petite body and a BIG personality."
                  </p>
                  <p className="leading-relaxed">
                    "I've got 567 pieces of content. 12.8K likes. And I was making $36K-$72K/year on OnlyFans. But that's not enough. Not when I have <span className="font-bold text-purple-600">$40M+ potential</span>."
                  </p>
                  <p className="leading-relaxed">
                    "So I'm moving to <span className="font-bold text-orange-600">CreatorVault</span>. Where I keep <span className="font-bold text-green-600">70% + equity</span>. Where I control my empire. Where I build generational wealth."
                  </p>
                  <p className="leading-relaxed font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
                    "I'm not just a petite creator. I'm the PETITE FANTASY QUEEN. And this is my empire. 👑🍑✨"
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="subscribe" className="space-y-8">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
                Choose Your Tier
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Join the Petite Fantasy Kingdom and get exclusive access to Itty Bitty's world
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
              {/* Tier 1: Petite Fam */}
              <Card className="p-6 bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-300 hover:shadow-2xl hover:scale-105 transition-all">
                <div className="text-center space-y-4">
                  <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                    <Heart className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">Petite Fam</h3>
                  <div className="text-4xl font-black text-pink-600">$15</div>
                  <div className="text-sm text-gray-600">per month</div>
                  
                  <ul className="space-y-2 text-left text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-pink-600">✓</span>
                      <span>All exclusive photos</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-600">✓</span>
                      <span>Weekly new content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-600">✓</span>
                      <span>Behind-the-scenes access</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-600">✓</span>
                      <span>Community chat access</span>
                    </li>
                  </ul>
                  
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold">
                    Subscribe
                  </Button>
                </div>
              </Card>

              {/* Tier 2: Inner Circle */}
              <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-4 border-purple-500 hover:shadow-2xl hover:scale-105 transition-all relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                  POPULAR
                </div>
                <div className="text-center space-y-4">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                    <Star className="w-10 h-10 text-white fill-current" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">Inner Circle</h3>
                  <div className="text-4xl font-black text-purple-600">$50</div>
                  <div className="text-sm text-gray-600">per month</div>
                  
                  <ul className="space-y-2 text-left text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600">✓</span>
                      <span>Everything in Petite Fam</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600">✓</span>
                      <span>Exclusive videos</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600">✓</span>
                      <span>Daily stories & updates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600">✓</span>
                      <span>Monthly Q&A sessions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600">✓</span>
                      <span>Priority DM responses</span>
                    </li>
                  </ul>
                  
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold">
                    Subscribe
                  </Button>
                </div>
              </Card>

              {/* Tier 3: VIP Goddess */}
              <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400 hover:shadow-2xl hover:scale-105 transition-all">
                <div className="text-center space-y-4">
                  <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                    <Crown className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">VIP Goddess</h3>
                  <div className="text-4xl font-black text-yellow-600">$150</div>
                  <div className="text-sm text-gray-600">per month</div>
                  
                  <ul className="space-y-2 text-left text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600">✓</span>
                      <span>Everything in Inner Circle</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600">✓</span>
                      <span>Custom content requests</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600">✓</span>
                      <span>1-on-1 video calls (monthly)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600">✓</span>
                      <span>Exclusive fitness programs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600">✓</span>
                      <span>Priority DM access</span>
                    </li>
                  </ul>
                  
                  <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold">
                    Subscribe
                  </Button>
                </div>
              </Card>

              {/* Tier 4: Ultimate Fantasy */}
              <Card className="p-6 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-400 hover:shadow-2xl hover:scale-105 transition-all">
                <div className="text-center space-y-4">
                  <div className="bg-gradient-to-br from-red-500 to-pink-600 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                    <Flame className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">Ultimate Fantasy</h3>
                  <div className="text-4xl font-black text-red-600">$500</div>
                  <div className="text-sm text-gray-600">per month</div>
                  
                  <ul className="space-y-2 text-left text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-red-600">✓</span>
                      <span>Everything in VIP Goddess</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600">✓</span>
                      <span>Unlimited custom content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600">✓</span>
                      <span>Weekly 1-on-1 video calls</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600">✓</span>
                      <span>VIP meetup opportunities</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600">✓</span>
                      <span>Direct phone number access</span>
                    </li>
                  </ul>
                  
                  <Button className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold">
                    Subscribe
                  </Button>
                </div>
              </Card>
            </div>

            {/* Join Network CTA */}
            <Card className="p-8 bg-gradient-to-br from-teal-900 to-cyan-900 text-white border-4 border-cyan-400 mt-12">
              <div className="flex items-start gap-6">
                <div className="bg-gradient-to-br from-cyan-400 to-teal-500 p-4 rounded-xl flex-shrink-0">
                  <Users className="w-12 h-12 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-3xl font-black mb-4">Are You a Creator? Join luvRoxie's Network</h3>
                  <p className="text-xl text-cyan-100 mb-6">
                    luvRoxie is recruiting petite creators, especially those who want to escape OnlyFans and build their own empires.
                  </p>
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl mb-6 border-2 border-cyan-400">
                    <p className="text-lg font-bold text-cyan-300">
                      You get: 70% revenue share + platform equity + AI tools + her mentorship
                    </p>
                  </div>
                  <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white font-bold text-lg">
                    <Users className="w-5 h-5 mr-2" />
                    Apply to Join Her Network
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
