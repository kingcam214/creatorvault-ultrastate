import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crown, Sparkles, Flame, Star, Users, TrendingUp, Zap } from "lucide-react";

export default function GreatestShowIndex() {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Hero Section - Epic Circus Tent */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Spotlight Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-32 h-full bg-gradient-to-b from-yellow-300/30 to-transparent blur-xl animate-pulse" />
          <div className="absolute top-0 right-1/4 w-32 h-full bg-gradient-to-b from-purple-300/30 to-transparent blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-0 left-1/2 w-32 h-full bg-gradient-to-b from-cyan-300/30 to-transparent blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          {/* Animated Circus Tent Icon */}
          <div className="mb-8 relative">
            <div className="text-9xl animate-bounce">🎪</div>
            <div className="absolute -top-4 -right-4 text-4xl animate-spin-slow">✨</div>
            <div className="absolute -bottom-4 -left-4 text-4xl animate-spin-slow" style={{ animationDelay: '1s' }}>🌟</div>
          </div>

          {/* Main Title */}
          <h1 className="font-['Playfair_Display'] text-7xl md:text-9xl font-bold mb-6 bg-gradient-to-r from-yellow-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent animate-gradient">
            The Greatest Show
          </h1>
          <h2 className="font-['Playfair_Display'] text-5xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-purple-300 via-pink-300 to-yellow-300 bg-clip-text text-transparent">
            On Earth
          </h2>

          {/* Tagline */}
          <p className="font-['Inter'] text-2xl md:text-3xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed">
            Where <span className="text-yellow-300 font-bold">fitness goddesses</span>, 
            <span className="text-pink-300 font-bold"> lifestyle queens</span>, 
            <span className="text-purple-300 font-bold"> elite dancers</span>, and 
            <span className="text-cyan-300 font-bold"> multi-business moguls</span> build 
            <span className="text-yellow-300 font-bold"> $100M+ empires</span>
          </p>

          {/* Live Stats Counter */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-12">
            <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30 p-6">
              <div className="text-4xl font-bold text-yellow-300 mb-2">4+</div>
              <div className="text-sm text-gray-400 font-['Inter']">Featured Creators</div>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 p-6">
              <div className="text-4xl font-bold text-purple-300 mb-2">$500M+</div>
              <div className="text-sm text-gray-400 font-['Inter']">Revenue Potential</div>
            </Card>
            <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30 p-6">
              <div className="text-4xl font-bold text-cyan-300 mb-2">10</div>
              <div className="text-sm text-gray-400 font-['Inter']">Revenue Streams</div>
            </Card>
            <Card className="bg-gradient-to-br from-pink-500/20 to-red-500/20 border-pink-500/30 p-6">
              <div className="text-4xl font-bold text-pink-300 mb-2">70%</div>
              <div className="text-sm text-gray-400 font-['Inter']">Creator Share</div>
            </Card>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link href="/greatest-show/subscribe">
              <Button className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-['Montserrat'] font-bold px-12 py-8 text-xl rounded-full shadow-2xl shadow-yellow-500/50 transition-all hover:scale-110 hover:shadow-yellow-500/70">
                <Crown className="mr-3 h-6 w-6" />
                Enter The Show
              </Button>
            </Link>
            <Link href="/greatest-show/join">
              <Button variant="outline" className="border-2 border-purple-400 text-purple-300 hover:bg-purple-500 hover:text-white hover:border-purple-500 font-['Montserrat'] font-semibold px-12 py-8 text-xl rounded-full transition-all hover:scale-110 shadow-2xl shadow-purple-500/30">
                <Sparkles className="mr-3 h-6 w-6" />
                Become a Star
              </Button>
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="text-4xl">👇</div>
        </div>
      </section>

      {/* Featured Creators Section */}
      <section className="py-24 bg-gradient-to-b from-black via-purple-900/10 to-black relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-['Playfair_Display'] text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
              Meet The Stars
            </h2>
            <p className="font-['Inter'] text-xl text-gray-400 max-w-3xl mx-auto">
              Four incredible women building multi-million dollar empires on their own terms
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Emma - The Godmother */}
            <Link href="/greatest-show/emma">
              <Card className="group bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-2 border-purple-500/30 hover:border-purple-400 p-8 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/20 group-hover:to-pink-500/20 transition-all" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-5xl">👑</div>
                    <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">🇩🇴 GODMOTHER</div>
                  </div>
                  <h3 className="font-['Montserrat'] text-2xl font-bold mb-2">Emma</h3>
                  <p className="text-cyan-300 text-sm font-semibold mb-4">The Godmother of Dominican Creators</p>
                  <div className="space-y-2 text-sm text-gray-400 mb-6">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-purple-400" />
                      29K followers
                    </div>
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2 text-pink-400" />
                      $154M-$1.454B potential
                    </div>
                    <div className="flex items-center">
                      <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                      11 Revenue Streams
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs">Single Mom of 2</span>
                    <span className="bg-pink-500/20 text-pink-300 px-2 py-1 rounded text-xs">AI Pioneer</span>
                    <span className="bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded text-xs">Multi-Vertical</span>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold">
                    View Profile
                  </Button>
                </div>
              </Card>
            </Link>

            {/* The Biggest B - Greatest Abs */}
            <Link href="/greatest-show/thebiggestb">
              <Card className="group bg-gradient-to-br from-orange-900/40 to-yellow-900/40 border-2 border-orange-500/30 hover:border-orange-400 p-8 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-yellow-500/0 group-hover:from-orange-500/20 group-hover:to-yellow-500/20 transition-all" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-5xl">💪</div>
                    <div className="bg-orange-500 text-black px-3 py-1 rounded-full text-xs font-bold">🏆 GREATEST ABS</div>
                  </div>
                  <h3 className="font-['Montserrat'] text-2xl font-bold mb-2">The Biggest B</h3>
                  <p className="text-orange-300 text-sm font-semibold mb-4">The College Fitness Mogul</p>
                  <div className="space-y-2 text-sm text-gray-400 mb-6">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-orange-400" />
                      106K followers
                    </div>
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2 text-yellow-400" />
                      $51.9M-$140M potential
                    </div>
                    <div className="flex items-center">
                      <Zap className="w-4 h-4 mr-2 text-orange-400" />
                      10 Revenue Streams
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded text-xs">HBCU Princess</span>
                    <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs">CEO at 21</span>
                    <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">All Natural</span>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black font-bold">
                    View Profile
                  </Button>
                </div>
              </Card>
            </Link>

            {/* luvRoxie - Petite Fantasy Queen */}
            <Link href="/greatest-show/luvroxie">
              <Card className="group bg-gradient-to-br from-pink-900/40 to-purple-900/40 border-2 border-pink-500/30 hover:border-pink-400 p-8 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 to-purple-500/0 group-hover:from-pink-500/20 group-hover:to-purple-500/20 transition-all" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-5xl">🍑</div>
                    <div className="bg-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold">PETITE QUEEN</div>
                  </div>
                  <h3 className="font-['Montserrat'] text-2xl font-bold mb-2">luvRoxie</h3>
                  <p className="text-pink-300 text-sm font-semibold mb-4">The Petite Fantasy Queen</p>
                  <div className="space-y-2 text-sm text-gray-400 mb-6">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-pink-400" />
                      12.8K likes
                    </div>
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2 text-purple-400" />
                      $39.69M-$109.62M potential
                    </div>
                    <div className="flex items-center">
                      <Zap className="w-4 h-4 mr-2 text-pink-400" />
                      10 Revenue Streams
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-pink-500/20 text-pink-300 px-2 py-1 rounded text-xs">Georgia Peach</span>
                    <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs">Good Girl Energy</span>
                    <span className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded text-xs">Itty Bitty</span>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold">
                    View Profile
                  </Button>
                </div>
              </Card>
            </Link>

            {/* Del Bania - Multi-Business Mom */}
            <Link href="/greatest-show/lirys">
              <Card className="group bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border-2 border-emerald-500/30 hover:border-emerald-400 p-8 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-teal-500/0 group-hover:from-emerald-500/20 group-hover:to-teal-500/20 transition-all" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-5xl">👩‍🍳</div>
                    <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold">🌴 CHEF & HOST</div>
                  </div>
                  <h3 className="font-['Montserrat'] text-2xl font-bold mb-2">Lirys</h3>
                  <p className="text-emerald-300 text-sm font-semibold mb-4">5-Star Chef • Airbnb Host • YouTube Creator</p>
                  <div className="space-y-2 text-sm text-gray-400 mb-6">
                    <div>🍽️ Self-Taught 5-Star Chef</div>
                    <div>🏡 Airbnb Superhost</div>
                    <div>📺 YouTube: Lirys Cooks</div>
                    <div>👗 SHEIN & Fashion Nova Partner</div>
                  </div>
                  <div className="text-emerald-400 font-bold text-sm">View Profile →</div>
                </div>
              </Card>
            </Link>
            <Link href="/greatest-show/delbania">
              <Card className="group bg-gradient-to-br from-purple-900/40 to-orange-900/40 border-2 border-purple-500/30 hover:border-purple-400 p-8 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-orange-500/0 group-hover:from-purple-500/20 group-hover:to-orange-500/20 transition-all" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-5xl">💅</div>
                    <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold">MOM MOGUL</div>
                  </div>
                  <h3 className="font-['Montserrat'] text-2xl font-bold mb-2">Del Bania</h3>
                  <p className="text-purple-300 text-sm font-semibold mb-4">The Multi-Business Mom Mogul</p>
                  <div className="space-y-2 text-sm text-gray-400 mb-6">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-purple-400" />
                      15.1K followers
                    </div>
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2 text-orange-400" />
                      $38.43M-$106.05M potential
                    </div>
                    <div className="flex items-center">
                      <Zap className="w-4 h-4 mr-2 text-pink-400" />
                      10 Revenue Streams
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs">Nail Salon</span>
                    <span className="bg-pink-500/20 text-pink-300 px-2 py-1 rounded text-xs">Boutique</span>
                    <span className="bg-orange-500/20 text-orange-300 px-2 py-1 rounded text-xs">Fit Mom</span>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-orange-500 hover:from-purple-600 hover:to-orange-600 text-white font-bold">
                    View Profile
                  </Button>
                </div>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-24 bg-gradient-to-b from-black via-cyan-900/10 to-black relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-['Playfair_Display'] text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
              Explore The Show
            </h2>
            <p className="font-['Inter'] text-xl text-gray-400 max-w-3xl mx-auto">
              Multiple verticals, infinite possibilities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Fitness Goddesses */}
            <Link href="/greatest-show/fitness">
              <Card className="group bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-2 border-green-500/30 hover:border-green-400 p-8 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl hover:shadow-green-500/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-emerald-500/0 group-hover:from-green-500/20 group-hover:to-emerald-500/20 transition-all" />
                <div className="relative z-10">
                  <div className="text-6xl mb-4">💪</div>
                  <h3 className="font-['Montserrat'] text-2xl font-bold mb-3">Fitness Goddesses</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Elite fitness creators with sculpted physiques, workout programs, and transformation stories
                  </p>
                  <div className="flex items-center text-green-400 font-semibold">
                    <span>Explore</span>
                    <span className="ml-2 group-hover:ml-4 transition-all">→</span>
                  </div>
                </div>
              </Card>
            </Link>

            {/* Elite Dancers */}
            <Link href="/greatest-show/dancers">
              <Card className="group bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-2 border-purple-500/30 hover:border-purple-400 p-8 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/20 group-hover:to-pink-500/20 transition-all" />
                <div className="relative z-10">
                  <div className="text-6xl mb-4">💃</div>
                  <h3 className="font-['Montserrat'] text-2xl font-bold mb-3">Elite Dancers</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Professional dancers, choreographers, and movement artists showcasing their craft
                  </p>
                  <div className="flex items-center text-purple-400 font-semibold">
                    <span>Explore</span>
                    <span className="ml-2 group-hover:ml-4 transition-all">→</span>
                  </div>
                </div>
              </Card>
            </Link>

            {/* Lifestyle Goddesses */}
            <Link href="/greatest-show/lifestyle">
              <Card className="group bg-gradient-to-br from-pink-900/30 to-rose-900/30 border-2 border-pink-500/30 hover:border-pink-400 p-8 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/0 to-rose-500/0 group-hover:from-pink-500/20 group-hover:to-rose-500/20 transition-all" />
                <div className="relative z-10">
                  <div className="text-6xl mb-4">✨</div>
                  <h3 className="font-['Montserrat'] text-2xl font-bold mb-3">Lifestyle Goddesses</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Fashion, beauty, travel, and luxury lifestyle content from influencers worldwide
                  </p>
                  <div className="flex items-center text-pink-400 font-semibold">
                    <span>Explore</span>
                    <span className="ml-2 group-hover:ml-4 transition-all">→</span>
                  </div>
                </div>
              </Card>
            </Link>

            {/* Adult Content */}
            <Link href="/greatest-show/adult">
              <Card className="group bg-gradient-to-br from-red-900/30 to-orange-900/30 border-2 border-red-500/30 hover:border-red-400 p-8 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl hover:shadow-red-500/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 to-orange-500/0 group-hover:from-red-500/20 group-hover:to-orange-500/20 transition-all" />
                <div className="relative z-10">
                  <div className="text-6xl mb-4">🔥</div>
                  <h3 className="font-['Montserrat'] text-2xl font-bold mb-3">Adult Content</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Exclusive adult content from verified creators. Must be 18+ to access.
                  </p>
                  <div className="flex items-center text-red-400 font-semibold">
                    <span>Explore</span>
                    <span className="ml-2 group-hover:ml-4 transition-all">→</span>
                  </div>
                </div>
              </Card>
            </Link>

            {/* Pole Artists */}
            <Link href="/greatest-show/pole">
              <Card className="group bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border-2 border-cyan-500/30 hover:border-cyan-400 p-8 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/20 group-hover:to-blue-500/20 transition-all" />
                <div className="relative z-10">
                  <div className="text-6xl mb-4">🎪</div>
                  <h3 className="font-['Montserrat'] text-2xl font-bold mb-3">Pole Artists</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Professional pole dancers showcasing strength, flexibility, and artistic expression
                  </p>
                  <div className="flex items-center text-cyan-400 font-semibold">
                    <span>Explore</span>
                    <span className="ml-2 group-hover:ml-4 transition-all">→</span>
                  </div>
                </div>
              </Card>
            </Link>

            {/* Multi-Business Moguls */}
            <Card className="group bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-2 border-yellow-500/30 hover:border-yellow-400 p-8 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 to-orange-500/0 group-hover:from-yellow-500/20 group-hover:to-orange-500/20 transition-all" />
              <div className="relative z-10">
                <div className="text-6xl mb-4">👑</div>
                <h3 className="font-['Montserrat'] text-2xl font-bold mb-3">Multi-Business Moguls</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Entrepreneurs running multiple businesses, sharing their journey and expertise
                </p>
                <div className="flex items-center text-yellow-400 font-semibold">
                  <span>Coming Soon</span>
                  <span className="ml-2">✨</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Different Section */}
      <section className="py-24 bg-gradient-to-b from-black via-purple-900/10 to-black relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-['Playfair_Display'] text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
              Why The Greatest Show?
            </h2>
            <p className="font-['Inter'] text-xl text-gray-400 max-w-3xl mx-auto">
              This isn't OnlyFans. This is the future of creator economy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-2 border-purple-500/30 p-8">
              <div className="text-5xl mb-4">💰</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-purple-300">70% Revenue Share</h3>
              <p className="text-gray-400 text-sm">
                Creators keep 70% of all revenue + platform equity. OnlyFans takes 20%. We give you 50% MORE.
              </p>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-2 border-cyan-500/30 p-8">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-cyan-300">AI-Powered Tools</h3>
              <p className="text-gray-400 text-sm">
                Telegram & WhatsApp bots that work 24/7. Automated content delivery, payments, and customer service.
              </p>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border-2 border-yellow-500/30 p-8">
              <div className="text-5xl mb-4">📈</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-yellow-300">10 Revenue Streams</h3>
              <p className="text-gray-400 text-sm">
                Subscriptions, PPV, courses, coaching, merchandise, brand deals, recruiting, and more.
              </p>
            </Card>

            <Card className="bg-gradient-to-br from-pink-900/20 to-red-900/20 border-2 border-pink-500/30 p-8">
              <div className="text-5xl mb-4">🌍</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-pink-300">Global Reach</h3>
              <p className="text-gray-400 text-sm">
                Multi-language support, international payments, and recruiting networks across continents.
              </p>
            </Card>

            <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-2 border-green-500/30 p-8">
              <div className="text-5xl mb-4">👥</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-green-300">Recruiting Network</h3>
              <p className="text-gray-400 text-sm">
                Earn 5-10% of every creator you recruit. Build a network, earn passive income forever.
              </p>
            </Card>

            <Card className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border-2 border-orange-500/30 p-8">
              <div className="text-5xl mb-4">🏆</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-orange-300">Platform Equity</h3>
              <p className="text-gray-400 text-sm">
                Top creators get platform equity. You're not just using the platform - you OWN part of it.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Subscription Tiers Section */}
      <section className="py-24 bg-gradient-to-b from-black via-cyan-900/10 to-black relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-['Playfair_Display'] text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
              Choose Your Experience
            </h2>
            <p className="font-['Inter'] text-xl text-gray-400 max-w-3xl mx-auto">
              From single creators to the full show - there's a tier for everyone
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Single Creator */}
            <Card className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-2 border-cyan-500/30 p-8">
              <div className="text-5xl mb-4">⭐</div>
              <h3 className="font-['Montserrat'] text-2xl font-bold mb-2">Single Creator</h3>
              <div className="font-['Playfair_Display'] text-5xl font-bold text-cyan-300 mb-6">
                $25-$100<span className="text-lg text-gray-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 font-['Inter'] text-sm text-gray-400">
                <li className="flex items-start">
                  <span className="text-cyan-300 mr-2">✓</span>
                  Access to one creator's content
                </li>
                <li className="flex items-start">
                  <span className="text-cyan-300 mr-2">✓</span>
                  Exclusive photos & videos
                </li>
                <li className="flex items-start">
                  <span className="text-cyan-300 mr-2">✓</span>
                  Daily content updates
                </li>
                <li className="flex items-start">
                  <span className="text-cyan-300 mr-2">✓</span>
                  Community access
                </li>
              </ul>
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold">
                Choose Creator
              </Button>
            </Card>

            {/* Full Show - POPULAR */}
            <Card className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border-2 border-yellow-500 p-8 relative scale-105 shadow-2xl shadow-yellow-500/30">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                ⭐ MOST POPULAR ⭐
              </div>
              <div className="text-5xl mb-4 mt-4">💎</div>
              <h3 className="font-['Montserrat'] text-2xl font-bold mb-2">Full Show</h3>
              <div className="font-['Playfair_Display'] text-5xl font-bold text-yellow-300 mb-6">
                $100<span className="text-lg text-gray-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 font-['Inter'] text-sm text-gray-400">
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">✓</span>
                  All creators, all verticals
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">✓</span>
                  Unlimited content access
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">✓</span>
                  Priority support
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">✓</span>
                  Early access to new creators
                </li>
              </ul>
              <Button className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold shadow-lg">
                Get Full Access
              </Button>
            </Card>

            {/* VIP */}
            <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-2 border-purple-500/30 p-8">
              <div className="text-5xl mb-4">👑</div>
              <h3 className="font-['Montserrat'] text-2xl font-bold mb-2">VIP</h3>
              <div className="font-['Playfair_Display'] text-5xl font-bold text-purple-300 mb-6">
                $500<span className="text-lg text-gray-500">/mo</span>
              </div>
              <ul className="space-y-3 mb-8 font-['Inter'] text-sm text-gray-400">
                <li className="flex items-start">
                  <span className="text-purple-300 mr-2">✓</span>
                  Everything in Full Show
                </li>
                <li className="flex items-start">
                  <span className="text-purple-300 mr-2">✓</span>
                  1-on-1 video calls
                </li>
                <li className="flex items-start">
                  <span className="text-purple-300 mr-2">✓</span>
                  Custom content requests
                </li>
                <li className="flex items-start">
                  <span className="text-purple-300 mr-2">✓</span>
                  Exclusive merchandise
                </li>
              </ul>
              <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold">
                Go VIP
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 bg-gradient-to-b from-black via-purple-900/20 to-black relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="text-8xl mb-8 animate-bounce">🎪</div>
          <h2 className="font-['Playfair_Display'] text-6xl md:text-8xl font-bold mb-8 bg-gradient-to-r from-yellow-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent">
            The Show Awaits
          </h2>
          <p className="font-['Inter'] text-2xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed">
            Join thousands of fans experiencing the greatest content on earth. Or become a star and build your empire.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link href="/greatest-show/subscribe">
              <Button className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-['Montserrat'] font-bold px-16 py-10 text-2xl rounded-full shadow-2xl shadow-yellow-500/50 transition-all hover:scale-110 hover:shadow-yellow-500/70">
                <Crown className="mr-4 h-8 w-8" />
                Enter The Show
              </Button>
            </Link>
            <Link href="/greatest-show/join">
              <Button variant="outline" className="border-2 border-purple-400 text-purple-300 hover:bg-purple-500 hover:text-white hover:border-purple-500 font-['Montserrat'] font-semibold px-16 py-10 text-2xl rounded-full transition-all hover:scale-110 shadow-2xl shadow-purple-500/30">
                <Sparkles className="mr-4 h-8 w-8" />
                Become a Star
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-black border-t border-gray-800">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-500 font-['Inter']">
            © 2026 The Greatest Show on Earth. Part of CreatorVault ULTRASTATE.
          </p>
        </div>
      </footer>

  // @ts-ignore
      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
