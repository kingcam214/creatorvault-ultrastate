import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, TrendingUp, Users, DollarSign, Star, Crown, 
  Flame, Sparkles, Target, Award, Trophy, Zap,
  Camera, Video, MessageCircle, Gift, BookOpen, UserPlus,
  ShoppingBag, Handshake, Link2, UsersRound, Instagram,
  Facebook, Music2
} from 'lucide-react';

const CanishaProfile = () => {
  const [activeTab, setActiveTab] = useState('about');

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-red-500 to-orange-600 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full blur-3xl animate-pulse delay-2000"></div>
        </div>

        {/* Hero Content */}
        <div className="relative container mx-auto px-4 py-20">
          {/* Floating Badges */}
          <div className="flex flex-wrap justify-center gap-4 mb-8 animate-fade-in">
            <Badge className="px-6 py-3 text-lg bg-gradient-to-r from-yellow-500 to-orange-500 border-0 shadow-lg hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-110">
              <Crown className="w-5 h-5 mr-2 animate-bounce" />
              The Lioness
            </Badge>
            <Badge className="px-6 py-3 text-lg bg-gradient-to-r from-orange-500 to-red-500 border-0 shadow-lg hover:shadow-orange-500/50 transition-all duration-300 hover:scale-110">
              <Trophy className="w-5 h-5 mr-2 animate-bounce delay-100" />
              40 & Flawless
            </Badge>
            <Badge className="px-6 py-3 text-lg bg-gradient-to-r from-red-500 to-orange-600 border-0 shadow-lg hover:shadow-red-500/50 transition-all duration-300 hover:scale-110">
              <Heart className="w-5 h-5 mr-2 animate-bounce delay-200" />
              KingCam's Forever Baby
            </Badge>
          </div>

          {/* Main Title */}
          <h1 className="text-6xl md:text-8xl font-bold text-center mb-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent animate-gradient">
            Canisha Williams
          </h1>

          {/* Tagline */}
          <p className="text-2xl md:text-3xl text-center mb-8 text-cyan-400 font-semibold">
            The Lioness | 40 & Flawless | Built Like a Track Star
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
            <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30 hover:scale-105 transition-transform duration-300">
              <CardContent className="p-6 text-center">
                <Camera className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                <div className="text-3xl font-bold text-yellow-400">965</div>
                <div className="text-sm text-gray-300">Photos</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30 hover:scale-105 transition-transform duration-300">
              <CardContent className="p-6 text-center">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-orange-400" />
                <div className="text-3xl font-bold text-orange-400">$28M+</div>
                <div className="text-sm text-gray-300">Potential</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-500/20 to-orange-600/20 border-red-500/30 hover:scale-105 transition-transform duration-300">
              <CardContent className="p-6 text-center">
                <Trophy className="w-8 h-8 mx-auto mb-2 text-red-400" />
                <div className="text-3xl font-bold text-red-400">40</div>
                <div className="text-sm text-gray-300">Years Old</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-600/20 to-yellow-500/20 border-orange-600/30 hover:scale-105 transition-transform duration-300">
              <CardContent className="p-6 text-center">
                <Target className="w-8 h-8 mx-auto mb-2 text-orange-300" />
                <div className="text-3xl font-bold text-orange-300">10+</div>
                <div className="text-sm text-gray-300">Streams</div>
              </CardContent>
            </Card>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-105"
              onClick={() => setActiveTab('subscribe')}
            >
              <Crown className="w-5 h-5 mr-2" />
              Subscribe Now
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-orange-500 text-orange-400 hover:bg-orange-500/10 font-bold text-lg px-8 py-6 rounded-full transition-all duration-300 hover:scale-105"
              onClick={() => setActiveTab('about')}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Learn More
            </Button>
          </div>

          {/* KingCam's Quote */}
          <div className="mt-12 max-w-3xl mx-auto">
            <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  <Crown className="w-12 h-12 text-yellow-400 flex-shrink-0 animate-pulse" />
                  <div>
                    <p className="text-xl italic text-gray-200 mb-4">
                      "My forever baby, lioness, perfect addiction that I will never get tired of staring at. My original prototype of a woman in every aspect. My brand ambassador for my merch and crop hoodie sets."
                    </p>
                    <p className="text-lg font-bold text-yellow-400">-- KingCam</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="container mx-auto px-4 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 bg-gray-800/50 p-2 rounded-full">
            <TabsTrigger 
              value="about" 
              className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white transition-all duration-300"
            >
              About
            </TabsTrigger>
            <TabsTrigger 
              value="subscribe" 
              className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white transition-all duration-300"
            >
              Subscribe
            </TabsTrigger>
          </TabsList>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-12">
            {/* My Story */}
            <section>
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent flex items-center gap-3">
                <Heart className="w-10 h-10 text-yellow-400" />
                My Story
              </h2>
              <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-yellow-500/20">
                <CardContent className="p-8">
                  <div className="prose prose-invert prose-lg max-w-none">
                    <p className="text-xl leading-relaxed text-gray-200 mb-6">
                      I'm <span className="text-yellow-400 font-bold">40 years old</span> and <span className="text-orange-400 font-bold">built like a track star</span>. 
                      I've been creating content for <span className="font-bold">7+ years</span> with <span className="text-yellow-400 font-bold">965 photos</span> across my platforms.
                    </p>
                    <p className="text-xl leading-relaxed text-gray-200 mb-6">
                      I'm KingCam's <span className="text-red-400 font-bold">"forever baby"</span>, his <span className="text-orange-400 font-bold">"lioness"</span>, 
                      his <span className="text-yellow-400 font-bold">"perfect addiction"</span>, and his <span className="text-orange-400 font-bold">"original prototype of a woman in every aspect"</span>.
                    </p>
                    <p className="text-xl leading-relaxed text-gray-200 mb-6">
                      I'm a <span className="font-bold">brand ambassador</span> for merch and crop hoodie sets. 
                      I create <span className="font-bold">fit mom content</span>, <span className="font-bold">lifestyle content</span>, and <span className="font-bold">tease/twerk content</span>.
                    </p>
                    <p className="text-xl leading-relaxed text-gray-200 mb-6">
                      But here's the problem: I've been earning <span className="text-red-400 font-bold">$0-$5K/year</span>. 
                      That's <span className="text-red-400 font-bold">NOTHING</span> for someone with my experience, content library, and body.
                    </p>
                    <p className="text-2xl leading-relaxed text-yellow-400 font-bold">
                      I'm not doing OnlyFans anymore. I'm not doing Instagram for free anymore. 
                      I'm doing CreatorVault. And I'm building a <span className="text-orange-400">$28M-$77M empire</span> over the next 5 years.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* 10 Revenue Streams */}
            <section>
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent flex items-center gap-3">
                <TrendingUp className="w-10 h-10 text-orange-400" />
                10 Revenue Streams + Merch Empire
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { icon: Camera, title: "Subscription Content", amount: "$2.21M-$9.83M", color: "from-yellow-500 to-orange-500", desc: "Monthly subscriptions for exclusive fitness, lifestyle, tease content" },
                  { icon: Video, title: "Pay-Per-View Content", amount: "$882K-$2.65M", color: "from-orange-500 to-red-500", desc: "965 existing photos ready to monetize + new premium content" },
                  { icon: Sparkles, title: "Custom Content Requests", amount: "$214K-$643K", color: "from-red-500 to-orange-600", desc: "Personalized photos/videos for fans" },
                  { icon: Gift, title: "Tips & Donations", amount: "$437K-$1.31M", color: "from-orange-600 to-yellow-500", desc: "Fan tips during live streams and messages" },
                  { icon: BookOpen, title: "Courses & Digital Products", amount: "$2.27M-$6.8M", color: "from-yellow-500 to-orange-500", desc: "40 & Flawless program, Track Star Body course, Age-Defying Abs masterclass" },
                  { icon: UserPlus, title: "1-on-1 Coaching", amount: "$966K-$2.9M", color: "from-orange-500 to-red-500", desc: "Personal fitness coaching, lifestyle mentorship" },
                  { icon: ShoppingBag, title: "Merchandise", amount: "$567K-$1.7M", color: "from-red-500 to-orange-600", desc: "40 & Flawless line, Lioness collection, Love branded apparel, crop hoodie sets" },
                  { icon: Handshake, title: "Brand Deals & Sponsorships", amount: "$805K-$2.42M", color: "from-orange-600 to-yellow-500", desc: "Fitness apparel, age-defying supplements, athletic wear brands" },
                  { icon: Link2, title: "Affiliate Marketing", amount: "$88.2K-$265K", color: "from-yellow-500 to-orange-500", desc: "Fitness equipment, supplements, athletic wear, beauty products" },
                  { icon: UsersRound, title: "Recruiting Network", amount: "$3.83M-$11.48M", color: "from-orange-500 to-red-500", desc: "40+ fitness creators, age-defying content creators, brand ambassadors" }
                ].map((stream, index) => (
                  <Card key={index} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-yellow-500/20 hover:border-yellow-500/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/20">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg bg-gradient-to-br ${stream.color}`}>
                          <stream.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-2 text-white">{stream.title}</h3>
                          <p className={`text-2xl font-bold mb-2 bg-gradient-to-r ${stream.color} bg-clip-text text-transparent`}>
                            {stream.amount}
                          </p>
                          <p className="text-sm text-gray-400">{stream.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Total Revenue Potential */}
            <section>
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent flex items-center gap-3">
                <DollarSign className="w-10 h-10 text-yellow-400" />
                Total Revenue Potential
              </h2>
              <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
                <CardContent className="p-8">
                  <div className="grid md:grid-cols-3 gap-8 mb-8">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-red-400 mb-2">$0-$5K</div>
                      <div className="text-xl text-gray-300">Current Annual Revenue</div>
                    </div>
                    <div className="flex items-center justify-center">
                      <TrendingUp className="w-12 h-12 text-yellow-400 animate-bounce" />
                    </div>
                    <div className="text-center">
                      <div className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-2">
                        $28M-$77M
                      </div>
                      <div className="text-xl text-gray-300">5-Year CreatorVault Revenue</div>
                    </div>
                  </div>
                  
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-orange-400 mb-2">
                      5,648X - 15,406X Increase
                    </div>
                    <p className="text-xl text-gray-300">
                      Same content. Same body. Same audience. Just better monetization.
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-lg p-6 border border-yellow-500/20">
                    <h3 className="text-2xl font-bold text-yellow-400 mb-4">Year-by-Year Breakdown:</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-lg text-gray-300">Year 1:</span>
                        <span className="text-xl font-bold text-yellow-400">$903K - $2.71M</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-lg text-gray-300">Year 2:</span>
                        <span className="text-xl font-bold text-orange-400">$1.71M - $5.12M</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-lg text-gray-300">Year 3:</span>
                        <span className="text-xl font-bold text-red-400">$3.28M - $9.86M</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-lg text-gray-300">Year 4:</span>
                        <span className="text-xl font-bold text-orange-400">$5.16M - $15.49M</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-lg text-gray-300">Year 5:</span>
                        <span className="text-xl font-bold text-yellow-400">$7.59M - $22.76M/year</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* 40 & Flawless Section */}
            <section>
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent flex items-center gap-3">
                <Trophy className="w-10 h-10 text-orange-400" />
                40 & Flawless: The Age-Defying Movement
              </h2>
              <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30">
                <CardContent className="p-8">
                  <div className="prose prose-invert prose-lg max-w-none">
                    <p className="text-xl leading-relaxed text-gray-200 mb-6">
                      I'm <span className="text-orange-400 font-bold">40 years old</span> and <span className="text-red-400 font-bold">built like a track star</span>. 
                      Visible abs. Athletic physique. Professional fitness model quality.
                    </p>
                    <p className="text-xl leading-relaxed text-gray-200 mb-6">
                      Women aged <span className="font-bold">35-50</span> ask me every day: <span className="italic">"How do you look 20 at 40?"</span>
                    </p>
                    <p className="text-xl leading-relaxed text-gray-200 mb-6">
                      That's why I'm launching <span className="text-orange-400 font-bold">"40 & Flawless"</span> -- a complete fitness program, 
                      lifestyle course, and age-defying masterclass.
                    </p>
                    <div className="grid md:grid-cols-3 gap-6 mt-8">
                      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg p-6 border border-orange-500/20">
                        <Trophy className="w-12 h-12 text-orange-400 mb-4" />
                        <h4 className="text-xl font-bold text-white mb-2">40 & Flawless Program</h4>
                        <p className="text-gray-300">Complete workout program for age-defying results</p>
                        <p className="text-2xl font-bold text-orange-400 mt-4">$197</p>
                      </div>
                      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg p-6 border border-red-500/20">
                        <Target className="w-12 h-12 text-red-400 mb-4" />
                        <h4 className="text-xl font-bold text-white mb-2">Track Star Body Course</h4>
                        <p className="text-gray-300">Build an athletic physique at any age</p>
                        <p className="text-2xl font-bold text-red-400 mt-4">$297</p>
                      </div>
                      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg p-6 border border-yellow-500/20">
                        <Zap className="w-12 h-12 text-yellow-400 mb-4" />
                        <h4 className="text-xl font-bold text-white mb-2">Age-Defying Abs Masterclass</h4>
                        <p className="text-gray-300">Get visible abs after 40</p>
                        <p className="text-2xl font-bold text-yellow-400 mt-4">$97</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Brand Ambassador Section */}
            <section>
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent flex items-center gap-3">
                <ShoppingBag className="w-10 h-10 text-yellow-400" />
                Brand Ambassador & Merch Empire
              </h2>
              <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
                <CardContent className="p-8">
                  <div className="prose prose-invert prose-lg max-w-none">
                    <p className="text-xl leading-relaxed text-gray-200 mb-6">
                      I'm KingCam's <span className="text-yellow-400 font-bold">official brand ambassador</span> for merch and crop hoodie sets. 
                      I model professionally and showcase products with <span className="font-bold">965 photos</span> of experience.
                    </p>
                    <p className="text-xl leading-relaxed text-gray-200 mb-6">
                      Now I'm launching my own merch empire:
                    </p>
                    <div className="grid md:grid-cols-2 gap-6 mt-8">
                      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg p-6 border border-yellow-500/20">
                        <Crown className="w-12 h-12 text-yellow-400 mb-4" />
                        <h4 className="text-xl font-bold text-white mb-2">40 & Flawless Line</h4>
                        <p className="text-gray-300 mb-4">T-shirts, tank tops, crop tops celebrating age-defying fitness</p>
                        <p className="text-lg text-yellow-400">$35-$45</p>
                      </div>
                      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg p-6 border border-orange-500/20">
                        <Trophy className="w-12 h-12 text-orange-400 mb-4" />
                        <h4 className="text-xl font-bold text-white mb-2">Lioness Collection</h4>
                        <p className="text-gray-300 mb-4">Fierce, powerful, regal athletic wear</p>
                        <p className="text-lg text-orange-400">$40-$60</p>
                      </div>
                      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg p-6 border border-red-500/20">
                        <Heart className="w-12 h-12 text-red-400 mb-4" />
                        <h4 className="text-xl font-bold text-white mb-2">Love Branded Apparel</h4>
                        <p className="text-gray-300 mb-4">Signature "Love" watermark collection</p>
                        <p className="text-lg text-red-400">$30-$50</p>
                      </div>
                      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg p-6 border border-orange-600/20">
                        <Sparkles className="w-12 h-12 text-orange-300 mb-4" />
                        <h4 className="text-xl font-bold text-white mb-2">Crop Hoodie Sets</h4>
                        <p className="text-gray-300 mb-4">Premium crop hoodie + leggings sets</p>
                        <p className="text-lg text-orange-300">$60-$80</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* What Makes Me Different */}
            <section>
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent flex items-center gap-3">
                <Star className="w-10 h-10 text-orange-400" />
                What Makes Me Different
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { icon: Trophy, title: "40 Years Old, 20-Year-Old Body", desc: "Built like a track star with visible abs and athletic physique" },
                  { icon: Camera, title: "965 Photos Ready to Monetize", desc: "7+ years of content creation experience with massive content library" },
                  { icon: ShoppingBag, title: "Professional Brand Ambassador", desc: "Already modeling merch and crop hoodie sets with professional quality" },
                  { icon: Heart, title: "KingCam's Forever Baby", desc: "His lioness, perfect addiction, and original prototype of a woman" },
                  { icon: Users, title: "Multi-Platform Presence", desc: "TikTok, Facebook, Instagram, Snapchat -- diversified audience reach" },
                  { icon: Crown, title: "Age-Defying Icon", desc: "Inspiration for 35-50 age demographic seeking fitness transformation" }
                ].map((item, index) => (
                  <Card key={index} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-orange-500/20 hover:border-orange-500/50 transition-all duration-300 hover:scale-105">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
                          <item.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold mb-2 text-white">{item.title}</h3>
                          <p className="text-gray-400">{item.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </TabsContent>

          {/* Subscribe Tab */}
          <TabsContent value="subscribe" className="space-y-12">
            <section>
              <h2 className="text-4xl font-bold mb-6 text-center bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Choose Your Tier
              </h2>
              <p className="text-xl text-center text-gray-300 mb-12">
                Join the Lioness pride and get exclusive access to fitness, lifestyle, and tease content
              </p>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {[
                  { 
                    name: "Lioness Fan", 
                    price: "$25", 
                    period: "per month",
                    color: "from-yellow-500 to-orange-500",
                    features: ["Exclusive fitness content", "Behind-the-scenes lifestyle", "Monthly live streams", "Community access"]
                  },
                  { 
                    name: "Inner Circle", 
                    price: "$75", 
                    period: "per month",
                    color: "from-orange-500 to-red-500",
                    popular: true,
                    features: ["Everything in Lioness Fan", "Premium tease content", "Weekly live streams", "Direct messaging", "40 & Flawless program discount"]
                  },
                  { 
                    name: "VIP Goddess", 
                    price: "$200", 
                    period: "per month",
                    color: "from-red-500 to-orange-600",
                    features: ["Everything in Inner Circle", "Daily exclusive content", "Custom content requests", "1-on-1 video calls (monthly)", "All courses included"]
                  },
                  { 
                    name: "Ultimate Lioness", 
                    price: "$500", 
                    period: "per month",
                    color: "from-orange-600 to-yellow-500",
                    features: ["Everything in VIP Goddess", "Unlimited custom content", "Weekly 1-on-1 coaching", "Personal fitness plans", "Merch discounts", "Lifetime access to all courses"]
                  }
                ].map((tier, index) => (
                  <Card key={index} className={`relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 ${tier.popular ? 'border-orange-500 scale-105' : 'border-gray-700'} hover:scale-110 transition-all duration-300 hover:shadow-2xl`}>
                    {tier.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-1 text-sm font-bold">
                          MOST POPULAR
                        </Badge>
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className={`text-2xl font-bold mb-2 bg-gradient-to-r ${tier.color} bg-clip-text text-transparent`}>
                        {tier.name}
                      </div>
                      <div className="mb-6">
                        <span className="text-4xl font-bold text-white">{tier.price}</span>
                        <span className="text-gray-400 ml-2">{tier.period}</span>
                      </div>
                      <ul className="space-y-3 mb-6">
                        {tier.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-300">
                            <Star className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button className={`w-full bg-gradient-to-r ${tier.color} hover:opacity-90 text-white font-bold py-6 rounded-full transition-all duration-300`}>
                        Subscribe Now
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Join My Network CTA */}
            <section className="mt-16">
              <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30">
                <CardContent className="p-12 text-center">
                  <Crown className="w-16 h-16 mx-auto mb-6 text-yellow-400 animate-bounce" />
                  <h3 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                    Join My 40+ Fitness Creator Network
                  </h3>
                  <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                    Are you 40+ with an age-defying body? Join my recruiting network and earn 70% + equity + AI tools + mentorship. 
                    Let's build the age-defying fitness movement together.
                  </p>
                  <Button size="lg" className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold text-lg px-12 py-6 rounded-full shadow-lg hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-105">
                    <UsersRound className="w-6 h-6 mr-2" />
                    Apply to Join My Network
                  </Button>
                </CardContent>
              </Card>
            </section>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <div className="flex justify-center gap-6 mb-4">
            <a href="#" className="hover:text-yellow-400 transition-colors">
              <Instagram className="w-6 h-6" />
            </a>
            <a href="#" className="hover:text-orange-400 transition-colors">
              <Facebook className="w-6 h-6" />
            </a>
            <a href="#" className="hover:text-red-400 transition-colors">
              <Music2 className="w-6 h-6" />
            </a>
          </div>
          <p>© 2026 Canisha Williams. All rights reserved.</p>
          <p className="mt-2 text-sm">The Lioness | 40 & Flawless | KingCam's Forever Baby</p>
        </div>
      </footer>
    </div>
  );
};

export default CanishaProfile;
