import React, { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Crown, Flame, Globe, Sparkles, TrendingUp, DollarSign, Video, BookOpen, Users, ShoppingBag, Award, Heart, Scissors } from 'lucide-react';

export default function AderlyProfile() {
  const [activeTab, setActiveTab] = useState<'about' | 'subscribe'>('about');

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 via-orange-600/20 to-pink-600/20" />
          <div className="absolute top-20 left-20 w-96 h-96 bg-red-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          {/* Back Button */}
          <Link href="/greatest-show">
            <button className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all">
              <ArrowLeft className="w-6 h-6" />
            </button>
          </Link>

          {/* Badges */}
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <div className="px-6 py-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-full font-bold text-sm flex items-center gap-2 animate-pulse">
              <Flame className="w-5 h-5" />
              VIRAL QUEEN
            </div>
            <div className="px-6 py-2 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full font-bold text-sm flex items-center gap-2">
              <Crown className="w-5 h-5" />
              LA MAS PERRA
            </div>
            <div className="px-6 py-2 bg-gradient-to-r from-pink-500 to-red-500 rounded-full font-bold text-sm flex items-center gap-2">
              <Globe className="w-5 h-5" />
              BILINGUAL BOSS
            </div>
          </div>

          {/* Name */}
          <h1 className="text-6xl md:text-8xl font-bold mb-4">
            <span className="bg-gradient-to-r from-red-400 via-orange-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
              Aderly
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-2xl md:text-3xl text-cyan-400 mb-6 font-semibold">
            The Viral Content Queen | LA MAS PERRA 🔥
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-lg border border-red-500/30">
              <div className="text-3xl font-bold text-yellow-400">1.7K</div>
              <div className="text-sm text-gray-300">Likes</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-lg border border-orange-500/30">
              <div className="text-3xl font-bold text-yellow-400">$35M+</div>
              <div className="text-sm text-gray-300">Potential</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-pink-500/20 to-red-500/20 rounded-lg border border-pink-500/30">
              <div className="text-3xl font-bold text-yellow-400">10</div>
              <div className="text-sm text-gray-300">Revenue Streams</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-lg border border-red-500/30">
              <div className="text-3xl font-bold text-yellow-400">2</div>
              <div className="text-sm text-gray-300">Businesses</div>
            </div>
          </div>

          {/* Hook */}
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            I missed <span className="text-red-400 font-bold">$18,000</span> from TikTok engagement.{' '}
            <span className="text-orange-400 font-bold">NEVER AGAIN.</span>{' '}
            Now I'm building a <span className="text-pink-400 font-bold">$100M empire</span> with the most addictive content on earth.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('about')}
              className={`py-4 px-6 font-semibold transition-all ${
                activeTab === 'about'
                  ? 'text-orange-400 border-b-2 border-orange-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              About
            </button>
            <button
              onClick={() => setActiveTab('subscribe')}
              className={`py-4 px-6 font-semibold transition-all ${
                activeTab === 'subscribe'
                  ? 'text-orange-400 border-b-2 border-orange-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        {activeTab === 'about' && (
          <div className="space-y-16">
            {/* Story */}
            <section>
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                My Story
              </h2>
              <div className="prose prose-invert prose-lg max-w-none">
                <p className="text-gray-300 leading-relaxed text-lg">
                  Hey, it's Aderly. <span className="text-orange-400 font-bold">LA MAS PERRA.</span> 🔥
                </p>
                <p className="text-gray-300 leading-relaxed text-lg">
                  I create the most <span className="text-red-400 font-bold">addictive</span>, most <span className="text-orange-400 font-bold">viral</span> content you've ever seen. 
                  I'm KingCam's <span className="text-pink-400 font-bold">second biggest influence</span> for a reason.
                </p>
                <p className="text-gray-300 leading-relaxed text-lg">
                  But here's the truth: I was leaving <span className="text-red-400 font-bold">MASSIVE</span> money on the table.
                </p>
                <p className="text-gray-300 leading-relaxed text-lg">
                  I missed <span className="text-red-400 font-bold text-2xl">$18,000</span> just from TikTok engagement. My content went viral. 
                  Millions of views. But I wasn't monetizing it properly.
                </p>
                <p className="text-gray-300 leading-relaxed text-lg">
                  I was charging <span className="text-gray-400 line-through">$15/month</span> on OnlyFans. Making $6K-$12K/year. 
                  Working my ass off running my braid salon. Earning $26K-$62K/year total.
                </p>
                <p className="text-gray-300 leading-relaxed text-lg">
                  <span className="text-orange-400 font-bold text-2xl">NEVER AGAIN.</span>
                </p>
                <p className="text-gray-300 leading-relaxed text-lg">
                  Now I'm on CreatorVault. I'm not doing OnlyFans anymore. I'm doing <span className="text-orange-400 font-bold">EMPIRE.</span>
                </p>
                <p className="text-gray-300 leading-relaxed text-lg">
                  I'm charging <span className="text-orange-400 font-bold">$40-$50/month</span>. I'm monetizing my viral content properly. 
                  I'm turning my braid expertise into <span className="text-pink-400 font-bold">$1.5M-$4.2M in courses</span>. 
                  I'm building a recruiting network of <span className="text-red-400 font-bold">Spanish-speaking creators</span>.
                </p>
                <p className="text-gray-300 leading-relaxed text-lg">
                  I'm bilingual. I'm a braid expert. I'm a content creator. I'm a salon owner. I'm <span className="text-orange-400 font-bold">LA MAS PERRA</span>.
                </p>
                <p className="text-gray-300 leading-relaxed text-lg">
                  And I'm building a <span className="text-pink-400 font-bold text-2xl">$100M empire</span> with the most addictive content on earth.
                </p>
              </div>
            </section>

            {/* 10 Revenue Streams */}
            <section>
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                10 Revenue Streams
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { icon: Video, title: 'Subscriptions', amount: '$3M-$8.4M', color: 'from-red-500 to-orange-500', description: 'Telegram, WhatsApp, Web subscriptions' },
                  { icon: Sparkles, title: 'Pay-Per-View', amount: '$7.26M-$20.16M', color: 'from-orange-500 to-pink-500', description: 'Exclusive viral content drops' },
                  { icon: Heart, title: 'Custom Content', amount: '$454K-$1.26M', color: 'from-pink-500 to-red-500', description: 'Personalized videos & photos' },
                  { icon: DollarSign, title: 'Tips & Donations', amount: '$1.81M-$5.04M', color: 'from-red-500 to-orange-500', description: 'Fan appreciation & support' },
                  { icon: BookOpen, title: 'Courses', amount: '$1.51M-$4.18M', color: 'from-orange-500 to-pink-500', description: 'Braid Masterclass + Viral Content Formula' },
                  { icon: Users, title: 'Coaching', amount: '$605K-$1.68M', color: 'from-pink-500 to-red-500', description: 'Braid Business + Content Coaching' },
                  { icon: ShoppingBag, title: 'Merchandise', amount: '$630K-$1.75M', color: 'from-red-500 to-orange-500', description: '"LA MAS PERRA" brand + braid products' },
                  { icon: Award, title: 'Brand Deals', amount: '$910K-$3.36M', color: 'from-orange-500 to-pink-500', description: 'Hair, beauty, fashion sponsorships' },
                  { icon: TrendingUp, title: 'Affiliate Marketing', amount: '$151K-$420K', color: 'from-pink-500 to-red-500', description: 'Braid products & beauty brands' },
                  { icon: Crown, title: 'Recruiting Network', amount: '$2.52M-$6.3M', color: 'from-red-500 to-orange-500', description: 'Spanish-speaking creator empire' },
                ].map((stream, index) => (
                  <div
                    key={index}
                    className="p-6 bg-gradient-to-br from-gray-900 to-black rounded-lg border border-gray-800 hover:border-orange-500/50 transition-all hover:scale-105"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-r ${stream.color} rounded-lg flex items-center justify-center mb-4`}>
                      <stream.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{stream.title}</h3>
                    <div className="text-2xl font-bold text-orange-400 mb-2">{stream.amount}</div>
                    <p className="text-gray-400 text-sm">{stream.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Total Revenue */}
            <section className="bg-gradient-to-br from-red-900/30 to-orange-900/30 rounded-lg p-8 border border-red-500/30">
              <h2 className="text-4xl font-bold mb-6 text-center bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Total Revenue Potential
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Conservative (5 Years)</div>
                  <div className="text-5xl font-bold text-orange-400 mb-2">$35M</div>
                  <div className="text-sm text-gray-400">Aderly's 70% Share</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-2">Aggressive (5 Years)</div>
                  <div className="text-5xl font-bold text-pink-400 mb-2">$97M</div>
                  <div className="text-sm text-gray-400">Aderly's 70% Share</div>
                </div>
              </div>
              <div className="mt-8 text-center">
                <p className="text-xl text-gray-300">
                  From <span className="text-gray-400 line-through">$26K-$62K/year</span> to{' '}
                  <span className="text-orange-400 font-bold">$35M-$97M over 5 years</span>
                </p>
                <p className="text-2xl text-pink-400 font-bold mt-2">
                  134X-372X INCREASE 🚀
                </p>
              </div>
            </section>

            {/* The $18K Problem */}
            <section>
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
                The $18K TikTok Problem - SOLVED
              </h2>
              <div className="bg-gradient-to-br from-red-900/20 to-pink-900/20 rounded-lg p-8 border border-red-500/30">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-2xl font-bold text-red-400 mb-4">❌ Before CreatorVault</h3>
                    <ul className="space-y-3 text-gray-300">
                      <li className="flex items-start gap-3">
                        <span className="text-red-400 mt-1">•</span>
                        <span>Viral content on TikTok - millions of views</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-red-400 mt-1">•</span>
                        <span>No monetization strategy</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-red-400 mt-1">•</span>
                        <span>Missed <span className="font-bold text-red-400">$18,000</span> from engagement</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-red-400 mt-1">•</span>
                        <span>No funnel to paid platforms</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-red-400 mt-1">•</span>
                        <span>Working harder, earning less</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-green-400 mb-4">✅ After CreatorVault</h3>
                    <ul className="space-y-3 text-gray-300">
                      <li className="flex items-start gap-3">
                        <span className="text-green-400 mt-1">•</span>
                        <span>TikTok → Telegram/WhatsApp funnel (automated)</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-green-400 mt-1">•</span>
                        <span>Every viral video = 10-100 new subscribers</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-green-400 mt-1">•</span>
                        <span>AI bots handle conversion 24/7</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-green-400 mt-1">•</span>
                        <span>$18K missed → <span className="font-bold text-green-400">$100K-$300K/year GAINED</span></span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-green-400 mt-1">•</span>
                        <span>Viral content finally monetized properly</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Braid Business */}
            <section>
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                <Scissors className="inline w-10 h-10 mr-3" />
                My Braid Empire
              </h2>
              <div className="bg-gradient-to-br from-orange-900/20 to-pink-900/20 rounded-lg p-8 border border-orange-500/30">
                <p className="text-xl text-gray-300 mb-6 leading-relaxed">
                  I'm not just a content creator. I'm a <span className="text-orange-400 font-bold">braid expert</span> with my own salon (@ady.braid).
                </p>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="p-6 bg-black/50 rounded-lg border border-orange-500/30">
                    <div className="text-3xl font-bold text-orange-400 mb-2">304</div>
                    <div className="text-gray-400">Posts</div>
                  </div>
                  <div className="p-6 bg-black/50 rounded-lg border border-pink-500/30">
                    <div className="text-3xl font-bold text-pink-400 mb-2">1,131</div>
                    <div className="text-gray-400">Followers</div>
                  </div>
                  <div className="p-6 bg-black/50 rounded-lg border border-red-500/30">
                    <div className="text-3xl font-bold text-red-400 mb-2">$1.5M+</div>
                    <div className="text-gray-400">Course Potential</div>
                  </div>
                </div>
                <p className="text-lg text-gray-300 mt-6">
                  I'm turning my braid expertise into <span className="text-orange-400 font-bold">$1.5M-$4.2M in courses and coaching</span>. 
                  "LA MAS PERRA Braid Masterclass" is coming. And it's going to change the game.
                </p>
              </div>
            </section>

            {/* What Makes Aderly Different */}
            <section>
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-pink-400 to-red-400 bg-clip-text text-transparent">
                What Makes Me Different
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    title: 'Most Addictive Content',
                    description: "KingCam's #2 influence. My content is naturally viral and impossible to stop watching.",
                  },
                  {
                    title: 'Bilingual (Spanish + English)',
                    description: 'I can reach 2X the market. Spanish-speaking creators are an untapped goldmine.',
                  },
                  {
                    title: 'Multi-Business Mogul',
                    description: 'OnlyFans + Braid Salon. I know how to build and scale multiple businesses.',
                  },
                  {
                    title: 'Braid Expertise',
                    description: '304 posts, 1,131 followers. My braid courses will generate $1.5M-$4.2M.',
                  },
                  {
                    title: '"LA MAS PERRA" Brand',
                    description: 'Strong, memorable, merchandise-ready. This brand is worth millions.',
                  },
                  {
                    title: 'Professional Quality',
                    description: 'High production value, consistent posting, strong aesthetic. Not amateur hour.',
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="p-6 bg-gradient-to-br from-gray-900 to-black rounded-lg border border-gray-800 hover:border-pink-500/50 transition-all"
                  >
                    <h3 className="text-xl font-bold mb-3 text-orange-400">{item.title}</h3>
                    <p className="text-gray-300">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'subscribe' && (
          <div className="space-y-12">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Choose Your Experience
              </h2>
              <p className="text-xl text-gray-300">
                The most addictive content on earth. Now properly monetized.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Tier 1 */}
              <div className="p-6 bg-gradient-to-br from-red-900/20 to-orange-900/20 rounded-lg border border-red-500/30 hover:border-red-500 transition-all hover:scale-105">
                <div className="text-center mb-6">
                  <div className="text-sm text-gray-400 mb-2">LA PERRA FAN</div>
                  <div className="text-4xl font-bold text-red-400 mb-2">$25</div>
                  <div className="text-sm text-gray-400">per month</div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">All viral content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">Daily updates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">Community access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">Behind the scenes</span>
                  </li>
                </ul>
                <button className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg font-semibold hover:scale-105 transition-all">
                  Subscribe
                </button>
              </div>

              {/* Tier 2 - POPULAR */}
              <div className="p-6 bg-gradient-to-br from-orange-900/30 to-pink-900/30 rounded-lg border-2 border-orange-500 hover:border-orange-400 transition-all scale-105 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full text-xs font-bold">
                  ⭐ MOST POPULAR ⭐
                </div>
                <div className="text-center mb-6">
                  <div className="text-sm text-gray-400 mb-2">INNER CIRCLE</div>
                  <div className="text-4xl font-bold text-orange-400 mb-2">$50</div>
                  <div className="text-sm text-gray-400">per month</div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">Everything in LA PERRA FAN</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">Exclusive PPV content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">Priority messaging</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">Monthly Q&A sessions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">Braid tips & tutorials</span>
                  </li>
                </ul>
                <button className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg font-semibold hover:scale-105 transition-all">
                  Subscribe
                </button>
              </div>

              {/* Tier 3 */}
              <div className="p-6 bg-gradient-to-br from-pink-900/20 to-red-900/20 rounded-lg border border-pink-500/30 hover:border-pink-500 transition-all hover:scale-105">
                <div className="text-center mb-6">
                  <div className="text-sm text-gray-400 mb-2">VIP GODDESS</div>
                  <div className="text-4xl font-bold text-pink-400 mb-2">$150</div>
                  <div className="text-sm text-gray-400">per month</div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-pink-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">Everything in INNER CIRCLE</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">Custom content requests</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">1-on-1 video calls (monthly)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">Exclusive merchandise</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-pink-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">Free braid course access</span>
                  </li>
                </ul>
                <button className="w-full py-3 bg-gradient-to-r from-pink-500 to-red-500 rounded-lg font-semibold hover:scale-105 transition-all">
                  Subscribe
                </button>
              </div>

              {/* Tier 4 */}
              <div className="p-6 bg-gradient-to-br from-red-900/30 to-orange-900/30 rounded-lg border border-red-500/30 hover:border-red-500 transition-all hover:scale-105">
                <div className="text-center mb-6">
                  <div className="text-sm text-gray-400 mb-2">ULTIMATE PERRA</div>
                  <div className="text-4xl font-bold text-red-400 mb-2">$500</div>
                  <div className="text-sm text-gray-400">per month</div>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">Everything in VIP GODDESS</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">Weekly 1-on-1 video calls</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">Unlimited custom content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">Personal braid coaching</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">All courses & products free</span>
                  </li>
                </ul>
                <button className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg font-semibold hover:scale-105 transition-all">
                  Subscribe
                </button>
              </div>
            </div>

            {/* Recruiting CTA */}
            <div className="mt-16 p-8 bg-gradient-to-br from-orange-900/30 to-pink-900/30 rounded-lg border border-orange-500/30">
              <div className="text-center">
                <Crown className="w-16 h-16 mx-auto mb-4 text-orange-400" />
                <h3 className="text-3xl font-bold mb-4 text-orange-400">
                  Join My Spanish-Speaking Creator Network
                </h3>
                <p className="text-xl text-gray-300 mb-6 max-w-2xl mx-auto">
                  I'm building the largest network of Spanish-speaking creators on CreatorVault. 
                  Get 70% + equity + AI tools + my personal mentorship.
                </p>
                <button className="px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg font-semibold text-lg hover:scale-105 transition-all">
                  Apply to Join My Network
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
