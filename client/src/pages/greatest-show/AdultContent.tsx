import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";

export default function AdultContent() {
  const [ageVerified, setAgeVerified] = useState(false);

  // Mock creators for Adult Content vertical
  const creators = [
    {
      id: 24,
      name: "Scarlett Divine",
      stageName: "The Crimson Queen",
      tier: "legend",
      followers: 89300,
      posts: 187,
      engagement: 11.2,
      profilePhoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1485230405346-71acb9518d9c?w=800",
      specialties: ["Glamour", "Boudoir", "Artistic Nude"],
      subscriptionPrice: 40,
    },
    {
      id: 25,
      name: "Raven Noir",
      stageName: "The Dark Angel",
      tier: "elite",
      followers: 76800,
      posts: 142,
      engagement: 10.4,
      profilePhoto: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800",
      specialties: ["Alternative", "Gothic", "Fetish Fashion"],
      subscriptionPrice: 38,
    },
    {
      id: 26,
      name: "Diamond Rose",
      stageName: "The Platinum Princess",
      tier: "elite",
      followers: 68200,
      posts: 129,
      engagement: 9.8,
      profilePhoto: "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800",
      specialties: ["Luxury", "High Fashion", "Sensual Art"],
      subscriptionPrice: 35,
    },
    {
      id: 27,
      name: "Phoenix Blaze",
      stageName: "The Fire Goddess",
      tier: "established",
      followers: 54700,
      posts: 98,
      engagement: 9.1,
      profilePhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800",
      specialties: ["Fitness Model", "Athletic", "Body Confidence"],
      subscriptionPrice: 32,
    },
    {
      id: 28,
      name: "Luna Starr",
      stageName: "The Moonlight Muse",
      tier: "established",
      followers: 47900,
      posts: 86,
      engagement: 8.6,
      profilePhoto: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?w=800",
      specialties: ["Artistic", "Ethereal", "Fantasy"],
      subscriptionPrice: 30,
    },
  ];

  const tierColors = {
    legend: "#FFD700",
    elite: "#DC2626",
    established: "#B76E79",
    rising: "#EC4899",
  };

  const tierLabels = {
    legend: "LEGEND",
    elite: "ELITE",
    established: "ESTABLISHED",
    rising: "RISING STAR",
  };

  // Age verification gate
  if (!ageVerified) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="bg-white/5 border-2 border-[#DC2626] p-12 max-w-2xl text-center">
          <div className="text-6xl mb-6">🔞</div>
          <h1 className="font-['Playfair_Display'] text-4xl font-bold mb-4">
            Age Verification <span className="text-[#DC2626]">Required</span>
          </h1>
          <p className="font-['Inter'] text-lg text-gray-300 mb-8">
            This section contains adult content and is restricted to users 18 years of age or older.
            By clicking "I am 18+" below, you confirm that you are of legal age to view adult content
            in your jurisdiction.
          </p>

          <div className="space-y-4">
            <Button
              onClick={() => setAgeVerified(true)}
              className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white font-['Montserrat'] font-bold py-6 text-lg rounded-full shadow-lg shadow-[#DC2626]/50"
            >
              I am 18+ - Enter
            </Button>
            <Link href="/greatest-show">
              <Button
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 font-['Montserrat'] py-6 text-lg rounded-full"
              >
                I am under 18 - Go Back
              </Button>
            </Link>
          </div>

          <p className="text-sm text-gray-500 mt-8">
            All content on this platform is created by consenting adults for adult audiences.
            We maintain strict content policies and age verification standards.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative h-[60vh] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1485230405346-71acb9518d9c?w=1920"
            alt="Adult Content Creators"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-end pb-16">
          <div className="mb-4">
            <Link href="/greatest-show">
              <Button variant="ghost" className="text-white hover:text-[#DC2626] p-0">
                ← Back to The Greatest Show
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="text-6xl">🔥</div>
            <div>
              <h1 className="font-['Playfair_Display'] text-5xl md:text-6xl font-bold mb-2">
                Adult Content <span className="text-[#DC2626]">Creators</span>
              </h1>
              <p className="font-['Inter'] text-xl text-gray-300">
                Premium adult content from elite creators • {creators.length} Exclusive Models • 18+ Only
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-3">
              <div className="text-2xl font-bold text-[#DC2626]">$60</div>
              <div className="text-sm text-gray-400">per month</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-3">
              <div className="text-2xl font-bold text-[#DC2626]">{creators.reduce((sum, c) => sum + c.followers, 0).toLocaleString()}</div>
              <div className="text-sm text-gray-400">Total Followers</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-3">
              <div className="text-2xl font-bold text-[#DC2626]">{creators.reduce((sum, c) => sum + c.posts, 0)}+</div>
              <div className="text-sm text-gray-400">Content Pieces</div>
            </div>
          </div>
        </div>
      </section>

      {/* Subscribe CTA */}
      <section className="bg-gradient-to-b from-black to-gray-900 py-8 border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-['Montserrat'] text-2xl font-bold mb-2">
                Subscribe to All Adult Creators
              </h3>
              <p className="text-gray-400">
                Get unlimited access to all {creators.length} premium adult content creators for one low price
              </p>
            </div>
            <Link href="/greatest-show/subscribe?tier=subgroup&group=adult">
              <Button className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-['Montserrat'] font-bold px-12 py-6 text-lg rounded-full shadow-lg shadow-[#DC2626]/50 transition-all hover:scale-105">
                Subscribe for $60/month
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Creators Grid */}
      <section className="py-16 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {creators.map((creator) => (
              <Link key={creator.id} href={`/greatest-show/creator/${creator.id}`}>
                <Card className="group bg-white/5 border-2 border-white/10 hover:border-[#DC2626] overflow-hidden cursor-pointer transition-all hover:scale-105">
                  {/* Cover Photo */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={creator.coverPhoto}
                      alt={creator.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110 blur-sm"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
                    
                    {/* 18+ Badge */}
                    <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold bg-[#DC2626] text-white">
                      18+
                    </div>

                    {/* Tier Badge */}
                    <div 
                      className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold"
                      style={{ 
                        backgroundColor: tierColors[creator.tier as keyof typeof tierColors],
                        color: creator.tier === 'legend' ? '#000' : '#FFF'
                      }}
                    >
                      {tierLabels[creator.tier as keyof typeof tierLabels]}
                    </div>
                  </div>

                  {/* Profile Section */}
                  <div className="p-6 relative">
                    {/* Profile Photo */}
                    <div className="absolute -top-12 left-6">
                      <div className="w-24 h-24 rounded-full border-4 border-gray-900 overflow-hidden">
                        <img
                          src={creator.profilePhoto}
                          alt={creator.name}
                          className="w-full h-full object-cover blur-sm"
                        />
                      </div>
                    </div>

                    <div className="mt-14">
                      <h3 className="font-['Montserrat'] text-xl font-bold mb-1">
                        {creator.name}
                      </h3>
                      <p className="text-[#DC2626] text-sm mb-4">{creator.stageName}</p>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="text-center">
                          <div className="font-bold text-lg">{(creator.followers / 1000).toFixed(1)}K</div>
                          <div className="text-xs text-gray-500">Followers</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-lg">{creator.posts}</div>
                          <div className="text-xs text-gray-500">Posts</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-lg">{creator.engagement}%</div>
                          <div className="text-xs text-gray-500">Engagement</div>
                        </div>
                      </div>

                      {/* Specialties */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {creator.specialties.map((specialty, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-white/10 px-2 py-1 rounded-full text-gray-300"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>

                      {/* Price */}
                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div>
                          <span className="text-2xl font-bold text-[#DC2626]">${creator.subscriptionPrice}</span>
                          <span className="text-sm text-gray-500">/month</span>
                        </div>
                        <Button 
                          size="sm"
                          className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold"
                        >
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Subscribe Section */}
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4">
          <h2 className="font-['Playfair_Display'] text-4xl font-bold text-center mb-12">
            Why Subscribe to <span className="text-[#DC2626]">Adult Content</span>?
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="bg-white/5 border border-white/10 p-8 text-center">
              <div className="text-5xl mb-4">👑</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-[#DC2626]">
                Premium Quality
              </h3>
              <p className="text-gray-400">
                Professional photography, videography, and production quality from elite creators
              </p>
            </Card>

            <Card className="bg-white/5 border border-white/10 p-8 text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-[#DC2626]">
                Private & Secure
              </h3>
              <p className="text-gray-400">
                Your privacy is protected with encrypted payments and discreet billing
              </p>
            </Card>

            <Card className="bg-white/5 border border-white/10 p-8 text-center">
              <div className="text-5xl mb-4">✨</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-[#DC2626]">
                Exclusive Content
              </h3>
              <p className="text-gray-400">
                Access content you won't find anywhere else - created exclusively for subscribers
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold mb-6">
            Ready for <span className="text-[#DC2626]">Premium Access</span>?
          </h2>
          <p className="font-['Inter'] text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Join subscribers getting exclusive adult content from elite creators (18+ only)
          </p>
          <Link href="/greatest-show/subscribe?tier=subgroup&group=adult">
            <Button className="bg-[#DC2626] hover:bg-[#B91C1C] text-white font-['Montserrat'] font-bold px-12 py-6 text-lg rounded-full shadow-lg shadow-[#DC2626]/50 transition-all hover:scale-105">
              Subscribe Now - $60/month
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
