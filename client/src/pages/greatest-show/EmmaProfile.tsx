import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, Zap, TrendingUp, Users, Crown, Flame, Globe, BookOpen, 
  Heart, Package, DollarSign, Target, Award, Star, Instagram, Music
} from "lucide-react";

export default function EmmaProfile() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900">
      {/* Hero Section */}
      <div className="relative h-[600px] overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/50 via-pink-600/50 to-purple-900/50" />
        
        {/* Content */}
        <div className="relative container mx-auto px-4 h-full flex items-center">
          <div className="max-w-4xl">
            {/* Top Badge - DOMINICAN GODMOTHER */}
            <div className="flex gap-3 mb-6">
              <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 text-sm font-bold">
                <Sparkles className="w-4 h-4 mr-2" />
                AI-POWERED SWISS ARMY KNIFE
              </Badge>
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 text-sm font-bold">
                <Crown className="w-4 h-4 mr-2" />
                🇩🇴 FIRST CREATOR FOR DOMINICAN REPUBLIC
              </Badge>
            </div>

            {/* Profile Header */}
            <div className="flex items-start gap-8 mb-8">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-5xl font-bold border-4 border-white/20">
                  <Zap className="w-16 h-16" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-pink-500 rounded-full p-2">
                  <Crown className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Name and Stats */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-5xl font-bold text-white">Emma (Paola ReShula)</h1>
                  <Badge className="bg-yellow-500 text-black font-bold">⭐ Featured</Badge>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4 text-sm text-white/90">
                  <span>👶 Single Mom of 2</span>
                  <span>•</span>
                  <span>🤖 AI-Powered Pioneer</span>
                  <span>•</span>
                  <span>💪 Fitness Brand Owner</span>
                  <span>•</span>
                  <span>📦 Clothing Entrepreneur</span>
                  <span>•</span>
                  <span>🔥 OnlyFans Alternative</span>
                  <span>•</span>
                  <span>📚 SlangExxchange Leader</span>
                  <span>•</span>
                  <span>🌍 International Lifestyle</span>
                  <span>•</span>
                  <span>🇩🇴 Dominican Pride</span>
                </div>

                <div className="text-2xl font-bold text-cyan-400 mb-4">
                  "The Godmother of Dominican Creators"
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-6 mb-6">
                  <div>
                    <div className="text-3xl font-bold text-white">29K</div>
                    <div className="text-sm text-white/70">followers</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">86</div>
                    <div className="text-sm text-white/70">posts</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">1.1M+</div>
                    <div className="text-sm text-white/70">peak views</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">3.8%</div>
                    <div className="text-sm text-white/70">engagement</div>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex gap-4">
                  <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold">
                    Subscribe
                  </Button>
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
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
        {/* The Swiss Army Knife Section */}
        <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-white/10 p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="bg-gradient-to-br from-pink-500 to-purple-500 rounded-full p-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-3xl font-bold text-white">The Swiss Army Knife: 11 Revenue Streams, One Unstoppable Mom</h2>
                <Badge className="bg-cyan-500 text-white">Category Creator</Badge>
              </div>
              
              <div className="space-y-4 text-white/90 text-lg leading-relaxed">
                <p className="font-bold text-xl text-cyan-400">
                  "I'm a single mother of TWO. I wake up at 5am before my kids wake up. I work out, I create content, I run 7 businesses, I use AI to work smarter not harder. By the time my kids are awake, I'm MOM."
                </p>
                
                <p className="font-bold text-xl text-pink-400">
                  "But I'm also building a $100M empire. Because my kids deserve to see their mom WIN. They deserve generational wealth. They deserve to know that being a single mother isn't a limitation - it's a SUPERPOWER."
                </p>
                
                <p className="font-bold text-xl text-yellow-400">
                  "I'm not doing OnlyFans. I'm doing CreatorVault where I keep 70% + equity. I'm not just surviving. I'm THRIVING. And I'm showing every single mother in the world that you can too. This is for my kids. This is for every single mom. I'm going to be BIGGER THAN CARDI B." 🚀👶👶💰
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-8">
                <div className="bg-purple-800/50 rounded-lg p-4 text-center">
                  <Heart className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                  <div className="text-sm text-white/70">Single Mom Power</div>
                </div>
                <div className="bg-purple-800/50 rounded-lg p-4 text-center">
                  <Zap className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                  <div className="text-sm text-white/70">AI Infrastructure</div>
                </div>
                <div className="bg-purple-800/50 rounded-lg p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <div className="text-sm text-white/70">10x Content Output</div>
                </div>
                <div className="bg-purple-800/50 rounded-lg p-4 text-center">
                  <Crown className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                  <div className="text-sm text-white/70">Multi-Vertical Mogul</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-purple-900/50 border border-white/10">
            <TabsTrigger value="content" className="data-[state=active]:bg-purple-700">Content</TabsTrigger>
            <TabsTrigger value="about" className="data-[state=active]:bg-purple-700">About</TabsTrigger>
            <TabsTrigger value="subscribe" className="data-[state=active]:bg-purple-700">Subscribe</TabsTrigger>
          </TabsList>

          {/* Content Tab */}
          <TabsContent value="content" className="mt-8">
            <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((item) => (
                <Card key={item} className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-white/10 overflow-hidden group cursor-pointer hover:border-pink-500/50 transition-all">
                  <div className="aspect-square bg-gradient-to-br from-purple-600/20 to-pink-600/20 relative">
                    <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-black/50">
                      <div className="text-center">
                        <div className="text-white font-bold text-lg mb-2">Subscribe to unlock</div>
                        <div className="text-cyan-400 text-sm">{(Math.random() * 50 + 5).toFixed(1)}K views</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <Badge className="bg-pink-500/20 text-pink-300 text-xs">
                      {item % 2 === 0 ? 'VIDEO' : 'PHOTO'}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold">
                Subscribe to View All Content
              </Button>
            </div>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="mt-8">
            <div className="space-y-8">
              {/* About Emma */}
              <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-white/10 p-8">
                <h3 className="text-2xl font-bold text-white mb-4">About Emma</h3>
                <div className="space-y-4 text-white/90 text-base leading-relaxed">
                  <p>
                    Emma (Paola ReShula) is a single mother of two building a $100M+ empire across 11 revenue streams. She's the world's first AI-powered multi-vertical mogul, combining fitness, adult content, language education, imported clothing business, and international lifestyle into one unstoppable brand.
                  </p>
                  <p>
                    <strong className="text-yellow-400">🇩🇴 FIRST CREATOR FOR DOMINICAN REPUBLIC:</strong> Emma was the first creator onboarded from Dominican Republic, giving her a monopoly on the entire Dominican creator market. Every Dominican chica who joins CreatorVault goes under Emma's recruiting network, generating massive passive income.
                  </p>
                  <p>
                    Based in the Dominican Republic but currently traveling the world with her kids (currently in Brazil 🇧🇷), Emma represents the new generation of creators who use AI to work smarter, not harder. She wakes up at 5am, works out, creates content, and runs 7 businesses before her kids wake up.
                  </p>
                  <p>
                    Emma is the lead influencer for SlangExxchange, teaching real street English and Dominican slang to a global audience. She's also launching her fitness brand "Emma Fit" and positioning her adult content as the premium alternative to OnlyFans.
                  </p>
                  <p className="text-cyan-400 font-bold text-lg">
                    "I'm not just surviving. I'm THRIVING. And I'm showing every single mother in the world that you can too."
                  </p>
                </div>
              </Card>

              {/* The 11 Revenue Streams */}
              <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-white/10 p-8">
                <h3 className="text-2xl font-bold text-white mb-6">The 11 Revenue Streams</h3>
                <div className="grid grid-cols-2 gap-6">
                  {/* Stream 1 */}
                  <div className="bg-purple-800/30 rounded-lg p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <Zap className="w-6 h-6 text-cyan-400" />
                      <h4 className="text-lg font-bold text-white">AI-Powered Content</h4>
                    </div>
                    <p className="text-white/70 text-sm mb-2">10x content output with AI agents</p>
                    <p className="text-green-400 font-bold">$5M-$20M/year</p>
                  </div>

                  {/* Stream 2 */}
                  <div className="bg-purple-800/30 rounded-lg p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <Target className="w-6 h-6 text-pink-400" />
                      <h4 className="text-lg font-bold text-white">Emma Fit Brand</h4>
                    </div>
                    <p className="text-white/70 text-sm mb-2">Fitness programs, products, coaching</p>
                    <p className="text-green-400 font-bold">$3M-$12M/year</p>
                  </div>

                  {/* Stream 3 */}
                  <div className="bg-purple-800/30 rounded-lg p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <Package className="w-6 h-6 text-purple-400" />
                      <h4 className="text-lg font-bold text-white">Imported Clothing</h4>
                    </div>
                    <p className="text-white/70 text-sm mb-2">Fashion entrepreneur business</p>
                    <p className="text-green-400 font-bold">$2M-$8M/year</p>
                  </div>

                  {/* Stream 4 */}
                  <div className="bg-purple-800/30 rounded-lg p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <Flame className="w-6 h-6 text-orange-400" />
                      <h4 className="text-lg font-bold text-white">Adult Content</h4>
                    </div>
                    <p className="text-white/70 text-sm mb-2">OnlyFans alternative on CreatorVault</p>
                    <p className="text-green-400 font-bold">$10M-$40M/year</p>
                  </div>

                  {/* Stream 5 */}
                  <div className="bg-purple-800/30 rounded-lg p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <BookOpen className="w-6 h-6 text-blue-400" />
                      <h4 className="text-lg font-bold text-white">SlangExxchange</h4>
                    </div>
                    <p className="text-white/70 text-sm mb-2">Teaching real street English</p>
                    <p className="text-green-400 font-bold">$2M-$8M/year</p>
                  </div>

                  {/* Stream 6 */}
                  <div className="bg-purple-800/30 rounded-lg p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <Globe className="w-6 h-6 text-green-400" />
                      <h4 className="text-lg font-bold text-white">Street English Content</h4>
                    </div>
                    <p className="text-white/70 text-sm mb-2">Language learning content</p>
                    <p className="text-green-400 font-bold">$1M-$4M/year</p>
                  </div>

                  {/* Stream 7 */}
                  <div className="bg-purple-800/30 rounded-lg p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <Globe className="w-6 h-6 text-cyan-400" />
                      <h4 className="text-lg font-bold text-white">International Lifestyle</h4>
                    </div>
                    <p className="text-white/70 text-sm mb-2">Travel content from around the world</p>
                    <p className="text-green-400 font-bold">$2M-$8M/year</p>
                  </div>

                  {/* Stream 8 */}
                  <div className="bg-purple-800/30 rounded-lg p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <Heart className="w-6 h-6 text-pink-400" />
                      <h4 className="text-lg font-bold text-white">Mom Content</h4>
                    </div>
                    <p className="text-white/70 text-sm mb-2">Single mom empire building courses</p>
                    <p className="text-green-400 font-bold">$1M-$5M/year</p>
                  </div>

                  {/* Stream 9 */}
                  <div className="bg-purple-800/30 rounded-lg p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <Users className="w-6 h-6 text-purple-400" />
                      <h4 className="text-lg font-bold text-white">Mom Community</h4>
                    </div>
                    <p className="text-white/70 text-sm mb-2">Private community for single moms</p>
                    <p className="text-green-400 font-bold">$500K-$2M/year</p>
                  </div>

                  {/* Stream 10 */}
                  <div className="bg-purple-800/30 rounded-lg p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <Package className="w-6 h-6 text-yellow-400" />
                      <h4 className="text-lg font-bold text-white">Mom Products</h4>
                    </div>
                    <p className="text-white/70 text-sm mb-2">Productivity tools for busy moms</p>
                    <p className="text-green-400 font-bold">$1M-$4M/year</p>
                  </div>

                  {/* Stream 11 - DOMINICAN RECRUITING MONOPOLY */}
                  <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg p-6 border-2 border-yellow-500/50 col-span-2">
                    <div className="flex items-center gap-3 mb-3">
                      <Crown className="w-8 h-8 text-yellow-400" />
                      <div>
                        <h4 className="text-xl font-bold text-white">🇩🇴 Dominican Recruiting Monopoly</h4>
                        <p className="text-yellow-400 text-sm font-bold">BIGGEST REVENUE STREAM BY YEAR 5</p>
                      </div>
                    </div>
                    <p className="text-white/90 mb-3">
                      As the FIRST CREATOR for Dominican Republic, Emma gets revenue share from EVERY Dominican creator who joins CreatorVault. 100K-500K potential creators. By Year 5, this becomes her largest revenue stream.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-white/70 text-sm">Dominican Creators Only:</p>
                        <p className="text-green-400 font-bold text-lg">$36M-$985M over 5 years</p>
                      </div>
                      <div>
                        <p className="text-white/70 text-sm">Total Recruiting (Dominican + International):</p>
                        <p className="text-green-400 font-bold text-lg">$87.6M-$1.187B over 5 years</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Revenue */}
                <div className="mt-8 bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-lg p-6 border-2 border-green-500/50">
                  <div className="text-center">
                    <p className="text-white/70 text-sm mb-2">TOTAL PROJECTED REVENUE (5 YEARS)</p>
                    <p className="text-4xl font-bold text-white mb-2">$154M - $1.454 BILLION</p>
                    <p className="text-cyan-400 text-lg font-bold">Emma's Share: 70-100% depending on stream</p>
                  </div>
                </div>
              </Card>

              {/* Emma vs Cardi B */}
              <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 p-8">
                <div className="flex items-center gap-4 mb-6">
                  <Crown className="w-12 h-12 text-yellow-400" />
                  <h3 className="text-3xl font-bold text-white">Emma vs Cardi B</h3>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-xl font-bold text-white mb-4">Cardi B</h4>
                    <ul className="space-y-2 text-white/80">
                      <li>• Net Worth: ~$80M</li>
                      <li>• Mom of 2 (married)</li>
                      <li>• 3-4 revenue streams</li>
                      <li>• Manual work</li>
                      <li>• No platform ownership</li>
                      <li>• 50-70% revenue control</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-4">Emma</h4>
                    <ul className="space-y-2 text-white/80">
                      <li>• Projected: $154M-$1.454B (Year 5)</li>
                      <li>• Single mom of 2</li>
                      <li>• 11 revenue streams</li>
                      <li>• AI-powered (10x output)</li>
                      <li>• Platform ownership + equity</li>
                      <li>• 70-100% revenue control</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-6 text-center">
                  <p className="text-3xl font-bold text-yellow-400">EMMA IS 1.9X-18.2X BIGGER 🚀</p>
                  <p className="text-white/70 mt-2">Conservative: 1.9X bigger | Aggressive: 18.2X BIGGER!</p>
                </div>
              </Card>

              {/* Emma's Network - Dominican Monopoly */}
              <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-white/10 p-8">
                <div className="flex items-center gap-4 mb-6">
                  <Crown className="w-12 h-12 text-yellow-400" />
                  <div>
                    <h3 className="text-3xl font-bold text-white">Emma's Network: The Dominican Monopoly</h3>
                    <p className="text-cyan-400 text-lg">First Creator for Dominican Republic = Market Dominance</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <div className="bg-purple-800/30 rounded-lg p-6 text-center">
                    <div className="text-4xl font-bold text-white mb-2">100K-500K</div>
                    <div className="text-white/70">Potential Dominican Creators</div>
                  </div>
                  <div className="bg-purple-800/30 rounded-lg p-6 text-center">
                    <div className="text-4xl font-bold text-white mb-2">3K-25K</div>
                    <div className="text-white/70">Target by Year 5</div>
                  </div>
                  <div className="bg-purple-800/30 rounded-lg p-6 text-center">
                    <div className="text-4xl font-bold text-white mb-2">$5K-$20K</div>
                    <div className="text-white/70">Per Creator/Year (Emma's Share)</div>
                  </div>
                </div>
                <div className="space-y-4 text-white/90">
                  <p>
                    <strong className="text-yellow-400">🇩🇴 First-Mover Advantage:</strong> Emma was the FIRST CREATOR onboarded from Dominican Republic. This means EVERY Dominican chica who joins CreatorVault automatically goes under Emma's recruiting ID. She doesn't have competition - she has a MONOPOLY.
                  </p>
                  <p>
                    <strong className="text-cyan-400">Network Effects:</strong> Every creator Emma recruits brings 5-10 more through family connections, geographic clustering, and cultural ties. By Year 5, Emma could have 25% of ALL Dominican creators on the platform.
                  </p>
                  <p>
                    <strong className="text-pink-400">National Hero Status:</strong> "Dominican single mom builds $100M empire with AI" - this story will generate massive media coverage in DR, driving thousands of creators to join Emma's network.
                  </p>
                  <p>
                    <strong className="text-green-400">Passive Income Forever:</strong> Emma earns $5K-$20K per creator per year in ongoing revenue share. This compounds forever. By Year 5, recruiting revenue alone could be $31.75M-$575M/year.
                  </p>
                </div>
              </Card>

              {/* What Makes Emma Different */}
              <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-white/10 p-8">
                <h3 className="text-2xl font-bold text-white mb-6">What Makes Emma Different</h3>
                <ul className="space-y-3 text-white/90">
                  <li className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-yellow-400 mt-1 flex-shrink-0" />
                    <span>Single mother of TWO building generational wealth</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                    <span>AI infrastructure - 10x content output advantage</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-pink-400 mt-1 flex-shrink-0" />
                    <span>11 revenue streams vs competitors' 1-2</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                    <span>Platform ownership (CreatorVault equity)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                    <span>International lifestyle (DR, Brazil, global)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-yellow-400 mt-1 flex-shrink-0" />
                    <span>🇩🇴 Cultural leadership (Dominican + SlangExxchange)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-orange-400 mt-1 flex-shrink-0" />
                    <span>Fitness brand owner + entrepreneur</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                    <span>OnlyFans alternative (better economics: 70% vs 80%)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                    <span>Tech pioneer (first AI-powered multi-vertical mogul)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-yellow-400 mt-1 flex-shrink-0" />
                    <span>🇩🇴 FIRST CREATOR FOR DOMINICAN REPUBLIC (monopoly advantage)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Star className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                    <span>Goal: BIGGER THAN CARDI B ($100M+ empire)</span>
                  </li>
                </ul>
              </Card>

              {/* Social Links */}
              <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-white/10 p-8">
                <h3 className="text-2xl font-bold text-white mb-6">Social Links</h3>
                <div className="flex flex-wrap gap-4">
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                    <Instagram className="w-5 h-5 mr-2" />
                    Instagram: @reshula24
                  </Button>
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                    <Music className="w-5 h-5 mr-2" />
                    TikTok: @reshula24
                  </Button>
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                    <BookOpen className="w-5 h-5 mr-2" />
                    SlangExxchange
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Subscribe Tab */}
          <TabsContent value="subscribe" className="mt-8">
            <div className="space-y-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-white mb-4">Join Emma's Empire</h2>
                <p className="text-xl text-white/80">Choose your tier and get exclusive access to Emma's content, community, and empire-building strategies</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                {/* Tier 1: Fit Fam */}
                <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-white/10 p-8 hover:border-pink-500/50 transition-all">
                  <div className="text-center mb-6">
                    <div className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 rounded-full p-4 mb-4">
                      <Target className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Fit Fam</h3>
                    <div className="text-4xl font-bold text-white mb-2">$25<span className="text-lg text-white/70">/month</span></div>
                    <p className="text-white/70">Get fit with Emma</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>All workout videos</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Weekly fitness tips</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Meal prep guides</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Community chat access</span>
                    </li>
                  </ul>
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold">
                    Subscribe Now
                  </Button>
                </Card>

                {/* Tier 2: Inner Circle */}
                <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-white/10 p-8 hover:border-pink-500/50 transition-all">
                  <div className="text-center mb-6">
                    <div className="inline-block bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full p-4 mb-4">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Inner Circle</h3>
                    <div className="text-4xl font-bold text-white mb-2">$75<span className="text-lg text-white/70">/month</span></div>
                    <p className="text-white/70">Get closer to Emma</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Everything in Fit Fam</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Exclusive photoshoots</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Behind-the-scenes content</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Monthly Q&A sessions</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Direct messaging (1x/month)</span>
                    </li>
                  </ul>
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold">
                    Subscribe Now
                  </Button>
                </Card>

                {/* Tier 3: VIP Goddess */}
                <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 p-8 hover:border-yellow-500 transition-all">
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-yellow-500 text-black font-bold">POPULAR</Badge>
                  </div>
                  <div className="text-center mb-6">
                    <div className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full p-4 mb-4">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">VIP Goddess</h3>
                    <div className="text-4xl font-bold text-white mb-2">$250<span className="text-lg text-white/70">/month</span></div>
                    <p className="text-white/70">Premium access</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Everything in Inner Circle</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Premium adult content</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Custom content requests (1x/month)</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>AI empire-building course</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>SlangExxchange premium access</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Direct messaging (unlimited)</span>
                    </li>
                  </ul>
                  <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold">
                    Subscribe Now
                  </Button>
                </Card>

                {/* Tier 4: Emma's Elite */}
                <Card className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-2 border-pink-500/50 p-8 hover:border-pink-500 transition-all">
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-pink-500 text-white font-bold">ELITE</Badge>
                  </div>
                  <div className="text-center mb-6">
                    <div className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 rounded-full p-4 mb-4">
                      <Award className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Emma's Elite</h3>
                    <div className="text-4xl font-bold text-white mb-2">$1,000<span className="text-lg text-white/70">/month</span></div>
                    <p className="text-white/70">Ultimate access</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Everything in VIP Goddess</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Monthly 1-on-1 video call (30 min)</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Custom content requests (unlimited)</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Business mentorship & coaching</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>AI agent setup & training</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Join Emma's recruiting network</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/90">
                      <Star className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>VIP event invitations</span>
                    </li>
                  </ul>
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold">
                    Subscribe Now
                  </Button>
                </Card>
              </div>

              {/* Join Emma's Network CTA */}
              <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 p-12 text-center">
                <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
                <h3 className="text-3xl font-bold text-white mb-4">🇩🇴 Join Emma's Dominican Creator Network</h3>
                <p className="text-xl text-white/90 mb-6 max-w-3xl mx-auto">
                  Are you Dominican? Are you a creator? Join the Godmother's network and build your empire with AI, mentorship, and the best economics in the creator space.
                </p>
                <div className="grid grid-cols-3 gap-6 mb-8 max-w-3xl mx-auto">
                  <div>
                    <div className="text-3xl font-bold text-white mb-2">70%</div>
                    <div className="text-white/70">Revenue Share</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white mb-2">+ Equity</div>
                    <div className="text-white/70">Platform Ownership</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white mb-2">+ Recruiting</div>
                    <div className="text-white/70">Bonus Revenue</div>
                  </div>
                </div>
                <Button size="lg" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold text-lg px-12">
                  Apply to Join Emma's Network
                </Button>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
