import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Heart, Sparkles, Crown, Target, 
  Dumbbell, Baby, Briefcase, Users, Scissors, ShoppingBag,
  DollarSign, Trophy, Flame, Star, Zap, TrendingUp
} from 'lucide-react';

export default function DelBaniaProfile() {
  const [activeTab, setActiveTab] = useState('about');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-pink-900 to-purple-900">
      {/* Hero Section */}
      <div className="relative h-[600px] overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/30 via-purple-500/30 to-yellow-500/30" />
        
        {/* Content */}
        <div className="relative h-full container mx-auto px-4">
          <div className="h-full flex items-center">
            <div className="grid md:grid-cols-2 gap-12 items-center w-full">
              {/* Profile Image */}
              <div className="relative">
                <div className="w-80 h-80 rounded-full bg-gradient-to-br from-pink-400 via-purple-400 to-yellow-400 p-2 mx-auto">
                  <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                    <div className="text-8xl">💅</div>
                  </div>
                </div>
                {/* Badges */}
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full px-6 py-3 shadow-xl animate-pulse">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-white" />
                    <span className="text-white font-bold">Fit Mom Boss</span>
                  </div>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-6 py-3 shadow-xl">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-white" />
                    <span className="text-white font-bold">Multi-Business Queen</span>
                  </div>
                </div>
                <div className="absolute top-1/2 -left-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full px-6 py-3 shadow-xl">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-white" />
                    <span className="text-white font-bold">Sexy Boss</span>
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h1 className="text-6xl font-bold text-white">Del Bania</h1>
                  <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-lg px-4 py-2">
                    <Crown className="w-4 h-4 mr-2" />
                    Verified
                  </Badge>
                </div>
                
                <div className="text-xl text-white/80 mb-4">@delbanianailsbar05</div>
                
                {/* Roles */}
                <div className="flex flex-wrap gap-3 text-sm text-white/90 mb-6">
                  <span>💅 Nail Salon Owner</span>
                  <span>•</span>
                  <span>👗 Boutique Owner</span>
                  <span>•</span>
                  <span>💪 Fit Mom</span>
                  <span>•</span>
                  <span>👶 Mother</span>
                  <span>•</span>
                  <span>💼 Entrepreneur</span>
                  <span>•</span>
                  <span>🔥 Sexy Boss</span>
                  <span>•</span>
                  <span>✨ Lifestyle Creator</span>
                </div>
                
                <div className="text-2xl font-bold text-cyan-400 mb-4">
                  "The Multi-Business Mom Mogul"
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-4 gap-6 mb-6">
                  <div>
                    <div className="text-3xl font-bold text-white">15.1K</div>
                    <div className="text-sm text-white/70">followers</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">74.4K</div>
                    <div className="text-sm text-white/70">likes</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">2</div>
                    <div className="text-sm text-white/70">businesses</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">$38M+</div>
                    <div className="text-sm text-white/70">potential</div>
                  </div>
                </div>
                
                {/* CTA Buttons */}
                <div className="flex gap-4">
                  <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold px-8">
                    Subscribe
                  </Button>
                  <Button size="lg" variant="outline" className="border-2 border-white/30 text-white hover:bg-white/10">
                    Follow
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="subscribe">Subscribe</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="space-y-12">
            {/* Hero Story */}
            <Card className="p-8 bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-500/30">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-full bg-gradient-to-br from-pink-500 to-purple-500">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">The Multi-Business Mom: From Brick-and-Mortar to Digital Empire</h2>
                  <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                    Category Creator
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-4 text-white/90 text-lg leading-relaxed">
                <p>
                  "I own a nail salon. I own a boutique. I'm a mother. I'm a fitness creator with 15.1K followers. And I'm working 75-105 hours a week for $95K-$320K a year. I'm exhausted. But I'm not giving up."
                </p>
                <p>
                  "I'm Del Bania. I'm the Multi-Business Mom Mogul. I'm not just a content creator - I'm a REAL entrepreneur with REAL businesses. Brick-and-mortar businesses that I built from scratch. A nail salon where I create art. A boutique where I curate fashion. And now I'm building a digital empire."
                </p>
                <p className="text-yellow-400 font-semibold">
                  "I'm not doing OnlyFans. I'm doing CreatorVault where I keep 70% + equity. I'm turning my nail salon knowledge into $5.4M-$14M in courses. I'm turning my boutique knowledge into $4M-$12M in products. I'm turning my fit mom journey into $8M-$21M in fitness content. And I'm building a $38M-$106M empire while being present for my kids. This is the Greatest Show on Earth. And I'm the Multi-Business Mom Mogul. 💅💪👶"
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-3xl mb-2">💅</div>
                  <div className="text-white font-bold">Nail Salon Owner</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-3xl mb-2">👗</div>
                  <div className="text-white font-bold">Boutique Owner</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-3xl mb-2">💪</div>
                  <div className="text-white font-bold">Fit Mom Boss</div>
                </div>
              </div>
            </Card>

            {/* 10 Revenue Streams */}
            <div>
              <h2 className="text-4xl font-bold text-white mb-8 text-center">The 10 Revenue Streams</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Stream 1 */}
                <Card className="p-6 bg-gradient-to-br from-pink-900/50 to-purple-900/50 border-pink-500/30 hover:scale-105 transition-transform">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex-shrink-0">
                      <Dumbbell className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">1. Fitness Content Subscriptions</h3>
                      <p className="text-white/70 mb-3">Fit mom workout programs, nutrition guides, postpartum fitness</p>
                      <div className="text-2xl font-bold text-pink-400 mb-2">$300K-$780K/year (Year 1)</div>
                      <div className="text-sm text-white/60">3 tiers: $25, $75, $250/month</div>
                    </div>
                  </div>
                </Card>

                {/* Stream 2 */}
                <Card className="p-6 bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-500/30 hover:scale-105 transition-transform">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
                      <Flame className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">2. Adult/Exclusive Content</h3>
                      <p className="text-white/70 mb-3">Sexy content, behind-the-scenes, body-positive content</p>
                      <div className="text-2xl font-bold text-purple-400 mb-2">$600K-$1.8M/year (Year 1)</div>
                      <div className="text-sm text-white/60">$50-$150/month premium tiers</div>
                      <Badge className="mt-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                        BIGGEST REVENUE STREAM
                      </Badge>
                    </div>
                  </div>
                </Card>

                {/* Stream 3 */}
                <Card className="p-6 bg-gradient-to-br from-yellow-900/50 to-orange-900/50 border-yellow-500/30 hover:scale-105 transition-transform">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex-shrink-0">
                      <Scissors className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">3. Nail Art Courses & Salon Business</h3>
                      <p className="text-white/70 mb-3">Nail techniques, salon management, nail tech training</p>
                      <div className="text-2xl font-bold text-yellow-400 mb-2">$200K-$520K/year (Year 1)</div>
                      <div className="text-sm text-white/60">$97-$1,997 per course</div>
                    </div>
                  </div>
                </Card>

                {/* Stream 4 */}
                <Card className="p-6 bg-gradient-to-br from-pink-900/50 to-yellow-900/50 border-pink-500/30 hover:scale-105 transition-transform">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-pink-500 to-yellow-500 flex-shrink-0">
                      <ShoppingBag className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">4. Boutique Digital Products</h3>
                      <p className="text-white/70 mb-3">Fashion styling, personal shopping, wardrobe consulting</p>
                      <div className="text-2xl font-bold text-pink-400 mb-2">$150K-$450K/year (Year 1)</div>
                      <div className="text-sm text-white/60">$47-$2,000 per product/service</div>
                    </div>
                  </div>
                </Card>

                {/* Stream 5 */}
                <Card className="p-6 bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-purple-500/30 hover:scale-105 transition-transform">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex-shrink-0">
                      <Baby className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">5. Mom Boss Academy</h3>
                      <p className="text-white/70 mb-3">Entrepreneurship for mothers, multi-business management</p>
                      <div className="text-2xl font-bold text-purple-400 mb-2">$200K-$560K/year (Year 1)</div>
                      <div className="text-sm text-white/60">$197-$5,000 per program</div>
                    </div>
                  </div>
                </Card>

                {/* Stream 6 */}
                <Card className="p-6 bg-gradient-to-br from-green-900/50 to-cyan-900/50 border-green-500/30 hover:scale-105 transition-transform">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex-shrink-0">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">6. Brand Partnerships</h3>
                      <p className="text-white/70 mb-3">Fitness, beauty, fashion, mom lifestyle brands</p>
                      <div className="text-2xl font-bold text-green-400 mb-2">$120K-$300K/year (Year 1)</div>
                      <div className="text-sm text-white/60">$2K-$100K per partnership</div>
                    </div>
                  </div>
                </Card>

                {/* Stream 7 */}
                <Card className="p-6 bg-gradient-to-br from-orange-900/50 to-red-900/50 border-orange-500/30 hover:scale-105 transition-transform">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex-shrink-0">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">7. Custom Content & Experiences</h3>
                      <p className="text-white/70 mb-3">Custom videos, shoutouts, 1-on-1 sessions</p>
                      <div className="text-2xl font-bold text-orange-400 mb-2">$100K-$300K/year (Year 1)</div>
                      <div className="text-sm text-white/60">$50-$2,000 per request</div>
                    </div>
                  </div>
                </Card>

                {/* Stream 8 */}
                <Card className="p-6 bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-blue-500/30 hover:scale-105 transition-transform">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">8. Merchandise Line</h3>
                      <p className="text-white/70 mb-3">Del Bania branded apparel, fitness gear, beauty products</p>
                      <div className="text-2xl font-bold text-blue-400 mb-2">$125K-$375K/year (Year 1)</div>
                      <div className="text-sm text-white/60">$15-$75 per item</div>
                    </div>
                  </div>
                </Card>

                {/* Stream 9 */}
                <Card className="p-6 bg-gradient-to-br from-cyan-900/50 to-teal-900/50 border-cyan-500/30 hover:scale-105 transition-transform">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex-shrink-0">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">9. Recruiting Network</h3>
                      <p className="text-white/70 mb-3">Recruit mom entrepreneurs, fit moms, salon/boutique owners</p>
                      <div className="text-2xl font-bold text-cyan-400 mb-2">$30K-$75K/year (Year 1)</div>
                      <div className="text-sm text-white/60">5-10% of recruited creators' earnings</div>
                    </div>
                  </div>
                </Card>

                {/* Stream 10 */}
                <Card className="p-6 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-indigo-500/30 hover:scale-105 transition-transform">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex-shrink-0">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">10. AI-Powered Business Tools</h3>
                      <p className="text-white/70 mb-3">AI courses, bot setup, business automation consulting</p>
                      <div className="text-2xl font-bold text-indigo-400 mb-2">$100K-$375K/year (Year 1)</div>
                      <div className="text-sm text-white/60">$97-$5,000 per product/service</div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Total Revenue */}
            <Card className="p-8 bg-gradient-to-br from-yellow-900/50 to-orange-900/50 border-yellow-500/30">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">Total Revenue Projection</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-white/5 rounded-lg">
                  <div className="text-sm text-white/60 mb-2">Year 1 (Launch)</div>
                  <div className="text-4xl font-bold text-yellow-400 mb-2">$2.1M-$6M</div>
                  <div className="text-white/80">Her 70% share: $1.49M-$4.24M</div>
                </div>
                <div className="text-center p-6 bg-white/5 rounded-lg">
                  <div className="text-sm text-white/60 mb-2">Year 5 (Empire)</div>
                  <div className="text-4xl font-bold text-orange-400 mb-2">$15.5M-$42.9M</div>
                  <div className="text-white/80">Her 70% share: $10.89M-$30M/year</div>
                </div>
                <div className="text-center p-6 bg-white/5 rounded-lg">
                  <div className="text-sm text-white/60 mb-2">5-Year Total</div>
                  <div className="text-4xl font-bold text-red-400 mb-2">$54.9M-$151.5M</div>
                  <div className="text-white/80">Her 70% share: $38.43M-$106.05M</div>
                </div>
              </div>
              <div className="mt-8 p-6 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-lg border border-pink-500/30">
                <p className="text-white text-center text-lg">
                  From <span className="font-bold text-yellow-400">$95K-$320K/year</span> to <span className="font-bold text-pink-400">$38.43M-$106.05M</span> over 5 years
                </p>
                <p className="text-white/70 text-center mt-2">
                  That's a <span className="font-bold text-cyan-400">24X-66X increase</span> with the SAME audience. This is the power of proper monetization.
                </p>
              </div>
            </Card>

            {/* What Makes Her Different */}
            <div>
              <h2 className="text-4xl font-bold text-white mb-8 text-center">What Makes Del Bania Different</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 bg-gradient-to-br from-pink-900/50 to-purple-900/50 border-pink-500/30">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">💅</div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">The Multi-Business Mom</h3>
                      <p className="text-white/70">
                        Not just a creator - owns REAL businesses. Nail salon + boutique = proven entrepreneur. She understands business, not just content.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-500/30">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">💪</div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">The Fit Mom Boss</h3>
                      <p className="text-white/70">
                        Mother who maintains incredible physique while running 2 businesses. Relatable to moms who want to stay fit. Aspirational but achievable.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-yellow-900/50 to-orange-900/50 border-yellow-500/30">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">✨</div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">The Lifestyle Entrepreneur</h3>
                      <p className="text-white/70">
                        Beauty (nail salon) + Fashion (boutique) + Fitness (gym content) + Motherhood (family content) + Sexy (confident, body-positive). She's EVERYTHING.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-green-900/50 to-cyan-900/50 border-green-500/30">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">🏢</div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">The Brick-and-Mortar to Digital Queen</h3>
                      <p className="text-white/70">
                        Already successful offline. Now scaling online. Best of both worlds. Physical businesses become digital assets.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-orange-900/50 to-red-900/50 border-orange-500/30">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">👑</div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">The Sexy Boss</h3>
                      <p className="text-white/70">
                        Confident, powerful, unapologetic. Part of Greatest Show on Earth culture. She's a boss in business AND in life.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-blue-500/30">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">👶</div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">The Present Mom</h3>
                      <p className="text-white/70">
                        Building empire while being present for her kids. Not choosing between motherhood and success - she's doing BOTH.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Del Bania Nails Bar Section */}
            <Card className="p-8 bg-gradient-to-br from-pink-900/50 to-yellow-900/50 border-pink-500/30">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">💅 Del Bania Nails Bar: From Local Salon to Global Empire</h2>
              <div className="space-y-4 text-white/90 text-lg leading-relaxed">
                <p>
                  Del Bania Nails Bar isn't just a nail salon - it's where Del Bania perfected her craft, built her reputation, and learned how to run a successful business.
                </p>
                <p>
                  Now she's taking that knowledge and turning it into digital gold: nail art courses, salon business training, nail tech certification programs. Every nail she's ever done, every client she's ever served, every business lesson she's ever learned - it's all becoming content.
                </p>
                <p className="text-yellow-400 font-semibold">
                  "I've done thousands of nails. I've built a successful salon from scratch. Now I'm teaching other women how to do the same. My salon isn't just a business - it's a content goldmine. And I'm turning it into $5.4M-$14M over 5 years." 💅✨
                </p>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-6">
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-pink-400">1000s</div>
                  <div className="text-sm text-white/70">Nails Done</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">Years</div>
                  <div className="text-sm text-white/70">Experience</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">$14M</div>
                  <div className="text-sm text-white/70">Course Potential</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-orange-400">Global</div>
                  <div className="text-sm text-white/70">Reach</div>
                </div>
              </div>
            </Card>

            {/* The Multi-Business Mom Manifesto */}
            <Card className="p-8 bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-500/30">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">The Multi-Business Mom Manifesto</h2>
              <div className="space-y-4 text-white/90 text-lg leading-relaxed">
                <p>
                  I'm not just a content creator. I'm not just an influencer. I'm a REAL entrepreneur with REAL businesses.
                </p>
                <p>
                  I own a nail salon. I own a boutique. I create content. I'm a mother. I'm a fit mom. I'm a sexy boss. And I'm building a $38M-$106M empire.
                </p>
                <p>
                  I'm not choosing between motherhood and success. I'm not choosing between physical businesses and digital businesses. I'm not choosing between being sexy and being a mom. I'm doing ALL of it.
                </p>
                <p className="text-pink-400 font-bold text-xl">
                  I'm not just a multi-business mom. I'm the MULTI-BUSINESS MOM MOGUL. 👑
                </p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="subscribe" className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-white mb-4" style={{color: 'rgb(236, 72, 153)'}}>Choose Your Tier</h2>
              <p className="text-white/70 text-lg">Join the Multi-Business Mom Mogul's world and get exclusive access to Del Bania's empire</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Tier 1 */}
              <Card className="p-6 bg-gradient-to-br from-pink-900/50 to-purple-900/50 border-pink-500/50 hover:scale-105 transition-transform">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Boss Babe</h3>
                  <div className="text-4xl font-bold mb-2" style={{color: 'rgb(236, 72, 153)'}}>$25</div>
                  <div className="text-white/60">per month</div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-pink-400">✓</span>
                    <span>All exclusive photos</span>
                  </li>
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-pink-400">✓</span>
                    <span>Weekly fitness content</span>
                  </li>
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-pink-400">✓</span>
                    <span>Behind-the-scenes access</span>
                  </li>
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-pink-400">✓</span>
                    <span>Community access</span>
                  </li>
                </ul>
                <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold">
                  Subscribe
                </Button>
              </Card>

              {/* Tier 2 */}
              <Card className="p-6 bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-purple-500/50 hover:scale-105 transition-transform relative">
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                  POPULAR
                </Badge>
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Inner Circle</h3>
                  <div className="text-4xl font-bold mb-2" style={{color: 'rgb(168, 85, 247)'}}>$75</div>
                  <div className="text-white/60">per month</div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-purple-400">✓</span>
                    <span>Everything in Boss Babe</span>
                  </li>
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-purple-400">✓</span>
                    <span>Exclusive videos</span>
                  </li>
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-purple-400">✓</span>
                    <span>Daily stories & updates</span>
                  </li>
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-purple-400">✓</span>
                    <span>Monthly Q&A sessions</span>
                  </li>
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-purple-400">✓</span>
                    <span>Priority DM responses</span>
                  </li>
                </ul>
                <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold">
                  Subscribe
                </Button>
              </Card>

              {/* Tier 3 */}
              <Card className="p-6 bg-gradient-to-br from-yellow-900/50 to-orange-900/50 border-yellow-500/50 hover:scale-105 transition-transform">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-4">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">VIP Mogul</h3>
                  <div className="text-4xl font-bold mb-2" style={{color: 'rgb(251, 191, 36)'}}>$200</div>
                  <div className="text-white/60">per month</div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-yellow-400">✓</span>
                    <span>Everything in Inner Circle</span>
                  </li>
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-yellow-400">✓</span>
                    <span>Custom content requests</span>
                  </li>
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-yellow-400">✓</span>
                    <span>1-on-1 video calls (monthly)</span>
                  </li>
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-yellow-400">✓</span>
                    <span>Exclusive fitness programs</span>
                  </li>
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-yellow-400">✓</span>
                    <span>Business mentorship access</span>
                  </li>
                </ul>
                <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold">
                  Subscribe
                </Button>
              </Card>

              {/* Tier 4 */}
              <Card className="p-6 bg-gradient-to-br from-red-900/50 to-pink-900/50 border-red-500/50 hover:scale-105 transition-transform">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                    <Flame className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Ultimate Boss</h3>
                  <div className="text-4xl font-bold mb-2" style={{color: 'rgb(239, 68, 68)'}}>$750</div>
                  <div className="text-white/60">per month</div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-red-400">✓</span>
                    <span>Everything in VIP Mogul</span>
                  </li>
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-red-400">✓</span>
                    <span>Unlimited custom content</span>
                  </li>
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-red-400">✓</span>
                    <span>Weekly 1-on-1 video calls</span>
                  </li>
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-red-400">✓</span>
                    <span>VIP meetup opportunities</span>
                  </li>
                  <li className="flex items-start gap-2 text-white/80">
                    <span className="text-red-400">✓</span>
                    <span>Direct phone number access</span>
                  </li>
                </ul>
                <Button className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold">
                  Subscribe
                </Button>
              </Card>
            </div>

            {/* Recruiting CTA */}
            <Card className="p-8 bg-gradient-to-br from-cyan-900/50 to-teal-900/50 border-cyan-500/30">
              <div className="flex items-start gap-6">
                <div className="p-4 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex-shrink-0">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-3">Are You a Creator? Join Del Bania's Network</h3>
                  <p className="text-white/80 mb-4">
                    Del Bania is recruiting mom entrepreneurs, fit moms, nail salon owners, and boutique owners who want to escape the grind and build their own empires.
                  </p>
                  <div className="p-4 bg-white/10 rounded-lg mb-4">
                    <p className="text-white font-semibold">
                      You get: 70% revenue share + platform equity + AI tools + her mentorship
                    </p>
                  </div>
                  <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-bold">
                    <Users className="w-4 h-4 mr-2" />
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
