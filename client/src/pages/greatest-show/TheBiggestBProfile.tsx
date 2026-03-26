import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Heart, Zap, TrendingUp, Sparkles, Crown, Target, 
  Dumbbell, GraduationCap, Briefcase, Users, Brain, Star,
  DollarSign, Trophy, Flame, BookOpen
} from 'lucide-react';

export default function TheBiggestBProfile() {
  const [activeTab, setActiveTab] = useState('about');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Hero Section */}
      <div className="relative h-[600px] overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 via-pink-600/30 to-orange-600/30" />
        
        {/* Content */}
        <div className="relative h-full container mx-auto px-4">
          <div className="h-full flex items-center">
            <div className="grid md:grid-cols-2 gap-12 items-center w-full">
              {/* Profile Image */}
              <div className="relative">
                <div className="w-80 h-80 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-orange-500 p-2 mx-auto">
                  <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                    <div className="text-8xl">🎀</div>
                  </div>
                </div>
                {/* Badges */}
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full px-6 py-3 shadow-xl animate-pulse">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-white" />
                    <span className="text-white font-bold">Greatest Abs on Earth</span>
                  </div>
                </div>
                <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-green-400 to-cyan-500 rounded-full px-6 py-3 shadow-xl">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-white" />
                    <span className="text-white font-bold">CEO at 21</span>
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h1 className="text-6xl font-bold text-white">The Biggest B!</h1>
                  <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-lg px-4 py-2">
                    <Crown className="w-4 h-4 mr-2" />
                    Verified
                  </Badge>
                </div>
                
                <div className="text-xl text-white/80 mb-4">@thatssthebcb_</div>
                
                {/* Roles */}
                <div className="flex flex-wrap gap-3 text-sm text-white/90 mb-6">
                  <span>💪 Fitness Model</span>
                  <span>•</span>
                  <span>🎓 Fisk University '26</span>
                  <span>•</span>
                  <span>💼 Wellness CEO</span>
                  <span>•</span>
                  <span>🔥 All Natural</span>
                  <span>•</span>
                  <span>📚 Smart & Sexy</span>
                  <span>•</span>
                  <span>🙏 Faith-Based</span>
                  <span>•</span>
                  <span>🌸 Free Spirit</span>
                </div>
                
                <div className="text-2xl font-bold text-cyan-400 mb-4">
                  "The College Fitness Mogul | Greatest Abs on Earth"
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-4 gap-6 mb-6">
                  <div>
                    <div className="text-3xl font-bold text-white">106K</div>
                    <div className="text-sm text-white/70">followers</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">133</div>
                    <div className="text-sm text-white/70">posts</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">358K</div>
                    <div className="text-sm text-white/70">peak views</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">21</div>
                    <div className="text-sm text-white/70">years old</div>
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
        {/* The College Mogul Section */}
        <Card className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border-white/10 p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="bg-gradient-to-br from-pink-500 to-purple-500 rounded-full p-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-3xl font-bold text-white">The HBCU Fitness Princess: 10 Revenue Streams, One Unstoppable Mogul</h2>
                <Badge className="bg-cyan-500 text-white">Category Creator</Badge>
              </div>
              
              <div className="space-y-4 text-white/90 text-lg leading-relaxed">
                <p className="font-bold text-xl text-cyan-400">
                  "I'm 21 years old, getting my degree at Fisk University, and building a wellness empire at the same time. While most college students are partying, I'm stacking revenue streams. I'm CEO of ProArmorCore. I'm a fitness model with 106K followers. And I'm just getting started."
                </p>
                
                <p className="font-bold text-xl text-pink-400">
                  "I'm One of God's Favorites. I'm a Free Spirit. I'm Smart & Sexy. I'm All Natural. I Trust God. And I'm proving that you can be educated, spiritual, sexy, AND successful. You don't have to choose. You can be ALL of it."
                </p>
                
                <p className="font-bold text-xl text-yellow-400">
                  "I'm not doing OnlyFans. I'm doing CreatorVault where I keep 70% + equity. I'm building my empire while getting my degree. I'm showing every HBCU student, every young Black woman, every college student that you can build generational wealth WHILE you're in school. This is the Greatest Show on Earth. And I'm the Fitness Princess. 🎀💪🎓"
                </p>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mt-8">
                <div className="bg-purple-800/50 rounded-lg p-4 text-center">
                  <GraduationCap className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                  <div className="text-sm text-white/70">HBCU Excellence</div>
                </div>
                <div className="bg-purple-800/50 rounded-lg p-4 text-center">
                  <Dumbbell className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                  <div className="text-sm text-white/70">All Natural Body</div>
                </div>
                <div className="bg-purple-800/50 rounded-lg p-4 text-center">
                  <Briefcase className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <div className="text-sm text-white/70">CEO at 21</div>
                </div>
                <div className="bg-purple-800/50 rounded-lg p-4 text-center">
                  <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                  <div className="text-sm text-white/70">God's Favorite</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800/50 mb-8">
            <TabsTrigger value="about" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500">
              About
            </TabsTrigger>
            <TabsTrigger value="subscribe" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500">
              Subscribe
            </TabsTrigger>
          </TabsList>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-8">
            {/* The 10 Revenue Streams */}
            <Card className="bg-gray-800/50 border-white/10 p-8">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <Target className="w-8 h-8 text-cyan-400" />
                The 10 Revenue Streams
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Stream 1 */}
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-white/10">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-pink-500 to-purple-500 rounded-full p-3">
                      <Dumbbell className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">1. Fitness Content Subscriptions</h3>
                      <p className="text-white/70 mb-3">Premium workout programs, nutrition guides, fitness content</p>
                      <div className="text-2xl font-bold text-green-400">$435K-$1.11M/year (Year 1)</div>
                      <div className="text-sm text-white/60">3 tiers: $25, $75, $250/month</div>
                    </div>
                  </div>
                </div>

                {/* Stream 2 */}
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-white/10">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-pink-500 to-orange-500 rounded-full p-3">
                      <Flame className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">2. Adult/Exclusive Content</h3>
                      <p className="text-white/70 mb-3">Premium photos, videos, behind-the-scenes content</p>
                      <div className="text-2xl font-bold text-green-400">$900K-$2.7M/year (Year 1)</div>
                      <div className="text-sm text-white/60">$50-$150/month premium tier</div>
                    </div>
                  </div>
                </div>

                {/* Stream 3 */}
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-white/10">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full p-3">
                      <Heart className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">3. Wellness Courses & Digital Products</h3>
                      <p className="text-white/70 mb-3">Complete wellness programs, mindset courses, spiritual growth</p>
                      <div className="text-2xl font-bold text-green-400">$300K-$780K/year (Year 1)</div>
                      <div className="text-sm text-white/60">$97-$497 per course</div>
                    </div>
                  </div>
                </div>

                {/* Stream 4 */}
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-white/10">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-full p-3">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">4. ProArmorCore Product Line</h3>
                      <p className="text-white/70 mb-3">Supplements, fitness gear, wellness products</p>
                      <div className="text-2xl font-bold text-green-400">$250K-$750K/year (Year 1)</div>
                      <div className="text-sm text-white/60">$30-$100 per product</div>
                    </div>
                  </div>
                </div>

                {/* Stream 5 */}
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-white/10">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full p-3">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">5. Digital Boss Academy</h3>
                      <p className="text-white/70 mb-3">Entrepreneurship training for young women</p>
                      <div className="text-2xl font-bold text-green-400">$280K-$700K/year (Year 1)</div>
                      <div className="text-sm text-white/60">$197-$997 per program</div>
                    </div>
                  </div>
                </div>

                {/* Stream 6 */}
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-white/10">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-full p-3">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">6. Brand Partnerships & Sponsorships</h3>
                      <p className="text-white/70 mb-3">Fitness brands, wellness companies, lifestyle brands</p>
                      <div className="text-2xl font-bold text-green-400">$180K-$450K/year (Year 1)</div>
                      <div className="text-sm text-white/60">$5K-$50K per partnership</div>
                    </div>
                  </div>
                </div>

                {/* Stream 7 */}
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-white/10">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-pink-500 to-red-500 rounded-full p-3">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">7. Custom Content & Experiences</h3>
                      <p className="text-white/70 mb-3">Custom videos, shoutouts, 1-on-1 sessions</p>
                      <div className="text-2xl font-bold text-green-400">$125K-$375K/year (Year 1)</div>
                      <div className="text-sm text-white/60">$100-$1,000 per request</div>
                    </div>
                  </div>
                </div>

                {/* Stream 8 */}
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-white/10">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full p-3">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">8. Merchandise Line</h3>
                      <p className="text-white/70 mb-3">Branded apparel, fitness gear, lifestyle products</p>
                      <div className="text-2xl font-bold text-green-400">$175K-$525K/year (Year 1)</div>
                      <div className="text-sm text-white/60">$25-$75 per item</div>
                    </div>
                  </div>
                </div>

                {/* Stream 9 */}
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-white/10">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-green-500 to-cyan-500 rounded-full p-3">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">9. Recruiting Network</h3>
                      <p className="text-white/70 mb-3">Recruit other fitness creators, especially HBCU students</p>
                      <div className="text-2xl font-bold text-green-400">$45K-$112.5K/year (Year 1)</div>
                      <div className="text-sm text-white/60">5-10% of recruited creators' earnings</div>
                    </div>
                  </div>
                </div>

                {/* Stream 10 */}
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-white/10">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-full p-3">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">10. AI-Powered Content Creation Tools</h3>
                      <p className="text-white/70 mb-3">AI courses, bot setup services, consulting</p>
                      <div className="text-2xl font-bold text-green-400">$150K-$450K/year (Year 1)</div>
                      <div className="text-sm text-white/60">$97-$497 per product/service</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Total Revenue Projection */}
            <Card className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 border-green-500/30 p-8">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-400" />
                Total Revenue Projection
              </h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gray-900/50 rounded-xl p-6 border border-green-500/30">
                  <div className="text-sm text-white/60 mb-2">Year 1 (Launch)</div>
                  <div className="text-4xl font-bold text-green-400 mb-2">$2.84M-$7.95M</div>
                  <div className="text-sm text-white/70">Her 70% share: $1.99M-$5.57M</div>
                </div>
                
                <div className="bg-gray-900/50 rounded-xl p-6 border border-green-500/30">
                  <div className="text-sm text-white/60 mb-2">Year 5 (Empire)</div>
                  <div className="text-4xl font-bold text-green-400 mb-2">$27.9M-$77.4M</div>
                  <div className="text-sm text-white/70">Her 70% share: $19.5M-$54.1M/year</div>
                </div>
                
                <div className="bg-gray-900/50 rounded-xl p-6 border border-green-500/30">
                  <div className="text-sm text-white/60 mb-2">5-Year Total</div>
                  <div className="text-4xl font-bold text-green-400 mb-2">$74.2M-$200M</div>
                  <div className="text-sm text-white/70">Her 70% share: $51.9M-$140M</div>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-xl border border-yellow-500/30">
                <div className="flex items-start gap-4">
                  <Trophy className="w-8 h-8 text-yellow-400 flex-shrink-0" />
                  <div>
                    <div className="text-xl font-bold text-white mb-2">From $42K-$360K/year to $51.9M-$140M over 5 years</div>
                    <div className="text-white/70">That's a 54X-150X increase with the SAME 106K followers. This is the power of proper monetization.</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* What Makes Her Different */}
            <Card className="bg-gray-800/50 border-white/10 p-8">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <Star className="w-8 h-8 text-yellow-400" />
                What Makes The Biggest B Different
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-pink-500 to-purple-500 rounded-full p-2 flex-shrink-0">
                      <Dumbbell className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">The All-Natural Fitness Princess</h3>
                      <p className="text-white/70">In an era of BBLs and enhancements, she's 100% natural. Authentic body, authentic journey. Relatable to women who don't want surgery.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full p-2 flex-shrink-0">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">The HBCU Mogul</h3>
                      <p className="text-white/70">Building empire while getting degree at Fisk University. Representing Black excellence. Proving education + entrepreneurship can coexist.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full p-2 flex-shrink-0">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">The Faith-Based Fitness Queen</h3>
                      <p className="text-white/70">"One of God's Favorites" • "Trust God!" • Spiritual + sexy = unique positioning. She shows you can be faithful AND successful.</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-full p-2 flex-shrink-0">
                      <Briefcase className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">The Smart & Sexy Entrepreneur</h3>
                      <p className="text-white/70">"Smart📚 & Sexy" • CEO at 21 • Wellness + Business + Fitness. She's not just a model - she's a mogul in training.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-full p-2 flex-shrink-0">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">The Free Spirit</h3>
                      <p className="text-white/70">Authentic, unfiltered personality. Not afraid to be controversial. Real, not manufactured. She's unapologetically herself.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-pink-500 to-red-500 rounded-full p-2 flex-shrink-0">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">The Young Visionary</h3>
                      <p className="text-white/70">21 years old with 5+ year runway before graduation. Young audience relates to her. Time to build and scale massively.</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* HBCU Excellence */}
            <Card className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-white/10 p-8">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <GraduationCap className="w-8 h-8 text-cyan-400" />
                HBCU Excellence: Fisk University '26
              </h2>
              
              <div className="space-y-6">
                <div className="text-white/90 text-lg leading-relaxed">
                  <p className="mb-4">
                    Fisk University is one of the oldest and most prestigious HBCUs in America, founded in 1866. Notable alumni include W.E.B. Du Bois, Nikki Giovanni, and Ida B. Wells. The Biggest B is carrying on that legacy of Black excellence.
                  </p>
                  <p className="mb-4">
                    As a Fisk student, she represents a new generation of HBCU entrepreneurs who are building empires while getting their education. She's proving that you don't have to wait until after graduation to start building wealth.
                  </p>
                  <p className="font-bold text-cyan-400">
                    "HBCU students are moguls in training. We're not just getting degrees - we're building generational wealth. And I'm showing every HBCU student in America that it's possible. This is Black excellence. This is HBCU pride. This is the future." 🎓💙💛
                  </p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-blue-900/30 rounded-lg p-4 text-center border border-cyan-500/30">
                    <div className="text-3xl font-bold text-cyan-400 mb-2">1866</div>
                    <div className="text-sm text-white/70">Fisk Founded</div>
                  </div>
                  <div className="bg-blue-900/30 rounded-lg p-4 text-center border border-cyan-500/30">
                    <div className="text-3xl font-bold text-cyan-400 mb-2">2026</div>
                    <div className="text-sm text-white/70">Graduation Year</div>
                  </div>
                  <div className="bg-blue-900/30 rounded-lg p-4 text-center border border-cyan-500/30">
                    <div className="text-3xl font-bold text-cyan-400 mb-2">$50M+</div>
                    <div className="text-sm text-white/70">Empire by Graduation</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* ProArmorCore */}
            <Card className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 border-white/10 p-8">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <Briefcase className="w-8 h-8 text-green-400" />
                ProArmorCore: Complete Wellness Empire
              </h2>
              
              <div className="space-y-6">
                <div className="text-white/90 text-lg leading-relaxed">
                  <p className="mb-4">
                    At just 21, The Biggest B is already CEO of ProArmorCore Consulting, a complete wellness company focused on encouraging wellness, igniting entrepreneurship, and inspiring financial freedom.
                  </p>
                  <p className="mb-4">
                    ProArmorCore offers digital products, merchandise, the Digital Boss Academy, and wellness journals. It's not just a business - it's a movement to empower young women to take control of their health, wealth, and futures.
                  </p>
                  <p className="font-bold text-green-400">
                    "My goal is to encourage Complete Wellness, Ignite Entrepreneurship, and Inspire Financial Freedom. ProArmorCore isn't just about fitness - it's about building your COMPLETE life. Body, mind, spirit, and bank account. That's complete wellness." 💚
                  </p>
                </div>
                
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-green-900/30 rounded-lg p-4 text-center border border-green-500/30">
                    <Dumbbell className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <div className="text-sm text-white/70">Fitness Programs</div>
                  </div>
                  <div className="bg-green-900/30 rounded-lg p-4 text-center border border-green-500/30">
                    <BookOpen className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <div className="text-sm text-white/70">Digital Products</div>
                  </div>
                  <div className="bg-green-900/30 rounded-lg p-4 text-center border border-green-500/30">
                    <Sparkles className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <div className="text-sm text-white/70">Merchandise</div>
                  </div>
                  <div className="bg-green-900/30 rounded-lg p-4 text-center border border-green-500/30">
                    <GraduationCap className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <div className="text-sm text-white/70">Boss Academy</div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Subscribe Tab */}
          <TabsContent value="subscribe" className="space-y-8">
            <Card className="bg-gray-800/50 border-white/10 p-8">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">Choose Your Tier</h2>
              
              <div className="grid md:grid-cols-4 gap-6">
                {/* Fit Fam Tier */}
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-white/10 hover:border-pink-500/50 transition">
                  <div className="text-center mb-4">
                    <Dumbbell className="w-12 h-12 text-pink-400 mx-auto mb-3" />
                    <h3 className="text-2xl font-bold text-white mb-2">Fit Fam</h3>
                    <div className="text-4xl font-bold text-pink-400 mb-2">$25</div>
                    <div className="text-sm text-white/60">per month</div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-pink-400">✓</span>
                      <span>All workout videos</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-pink-400">✓</span>
                      <span>Weekly fitness tips</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-pink-400">✓</span>
                      <span>Meal prep guides</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-pink-400">✓</span>
                      <span>Community chat access</span>
                    </li>
                  </ul>
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
                    Subscribe
                  </Button>
                </div>

                {/* Inner Circle Tier */}
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-6 border-2 border-cyan-500/50 hover:border-cyan-500 transition relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">POPULAR</Badge>
                  </div>
                  <div className="text-center mb-4">
                    <Heart className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                    <h3 className="text-2xl font-bold text-white mb-2">Inner Circle</h3>
                    <div className="text-4xl font-bold text-cyan-400 mb-2">$75</div>
                    <div className="text-sm text-white/60">per month</div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-cyan-400">✓</span>
                      <span>Everything in Fit Fam</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-cyan-400">✓</span>
                      <span>Exclusive photoshoots</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-cyan-400">✓</span>
                      <span>Behind-the-scenes content</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-cyan-400">✓</span>
                      <span>Monthly Q&A sessions</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-cyan-400">✓</span>
                      <span>Progress tracking tools</span>
                    </li>
                  </ul>
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
                    Subscribe
                  </Button>
                </div>

                {/* VIP Goddess Tier */}
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-white/10 hover:border-yellow-500/50 transition">
                  <div className="text-center mb-4">
                    <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                    <h3 className="text-2xl font-bold text-white mb-2">VIP Goddess</h3>
                    <div className="text-4xl font-bold text-yellow-400 mb-2">$250</div>
                    <div className="text-sm text-white/60">per month</div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-yellow-400">✓</span>
                      <span>Everything in Inner Circle</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-yellow-400">✓</span>
                      <span>Custom workout programs</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-yellow-400">✓</span>
                      <span>1-on-1 coaching calls (monthly)</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-yellow-400">✓</span>
                      <span>Custom meal plans</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-yellow-400">✓</span>
                      <span>Priority DM access</span>
                    </li>
                  </ul>
                  <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                    Subscribe
                  </Button>
                </div>

                {/* Premium Adult Content Tier */}
                <div className="bg-gradient-to-br from-red-900/50 to-pink-900/50 rounded-xl p-6 border border-white/10 hover:border-red-500/50 transition">
                  <div className="text-center mb-4">
                    <Flame className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h3 className="text-2xl font-bold text-white mb-2">Premium</h3>
                    <div className="text-4xl font-bold text-red-400 mb-2">$100</div>
                    <div className="text-sm text-white/60">per month</div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-red-400">✓</span>
                      <span>Exclusive adult content</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-red-400">✓</span>
                      <span>Premium photos & videos</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-red-400">✓</span>
                      <span>Behind-the-scenes access</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-red-400">✓</span>
                      <span>Custom content requests</span>
                    </li>
                    <li className="flex items-start gap-2 text-white/80">
                      <span className="text-red-400">✓</span>
                      <span>VIP chat access</span>
                    </li>
                  </ul>
                  <Button className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600">
                    Subscribe
                  </Button>
                </div>
              </div>
            </Card>

            {/* Join Her Network */}
            <Card className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 border-green-500/30 p-8">
              <div className="flex items-start gap-6">
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-full p-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-white mb-4">Are You a Creator? Join The Biggest B's Network</h2>
                  <div className="text-white/90 text-lg mb-6">
                    <p className="mb-4">
                      The Biggest B is recruiting fitness creators, especially HBCU students, to join CreatorVault and build their own empires.
                    </p>
                    <p className="font-bold text-green-400">
                      You get: 70% revenue share + platform equity + AI tools + her mentorship
                    </p>
                  </div>
                  <Button size="lg" className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
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
