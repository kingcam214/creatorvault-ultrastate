import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LifestyleGoddesses() {
  // Mock creators for Lifestyle vertical
  const creators = [
    {
      id: 12,
      name: "Victoria Laurent",
      stageName: "The Parisian Muse",
      tier: "legend",
      followers: 67800,
      posts: 124,
      engagement: 9.4,
      profilePhoto: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800",
      specialties: ["Luxury Travel", "High Fashion", "Fine Dining"],
      subscriptionPrice: 35,
    },
    {
      id: 13,
      name: "Isabella Monaco",
      stageName: "The Riviera Queen",
      tier: "elite",
      followers: 54200,
      posts: 98,
      engagement: 8.7,
      profilePhoto: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800",
      specialties: ["Yachting", "Luxury Lifestyle", "Mediterranean"],
      subscriptionPrice: 32,
    },
    {
      id: 14,
      name: "Savannah Blake",
      stageName: "The Manhattan Socialite",
      tier: "elite",
      followers: 48900,
      posts: 87,
      engagement: 8.2,
      profilePhoto: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800",
      specialties: ["NYC Lifestyle", "Fashion Week", "Art & Culture"],
      subscriptionPrice: 30,
    },
    {
      id: 15,
      name: "Aria Santorini",
      stageName: "The Greek Goddess",
      tier: "established",
      followers: 39600,
      posts: 76,
      engagement: 7.6,
      profilePhoto: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800",
      specialties: ["Island Living", "Wellness", "Mediterranean Beauty"],
      subscriptionPrice: 28,
    },
    {
      id: 16,
      name: "Sienna Rose",
      stageName: "The Wellness Maven",
      tier: "established",
      followers: 35400,
      posts: 92,
      engagement: 7.3,
      profilePhoto: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800",
      specialties: ["Spa Life", "Self-Care", "Holistic Living"],
      subscriptionPrice: 25,
    },
    {
      id: 17,
      name: "Bianca Milano",
      stageName: "The Italian Bella",
      tier: "rising",
      followers: 28700,
      posts: 64,
      engagement: 6.9,
      profilePhoto: "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800",
      specialties: ["Italian Fashion", "Wine Culture", "Dolce Vita"],
      subscriptionPrice: 25,
    },
  ];

  const tierColors = {
    legend: "#FFD700",
    elite: "#9333EA",
    established: "#B76E79",
    rising: "#EC4899",
  };

  const tierLabels = {
    legend: "LEGEND",
    elite: "ELITE",
    established: "ESTABLISHED",
    rising: "RISING STAR",
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative h-[60vh] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920"
            alt="Lifestyle Goddesses"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-end pb-16">
          <div className="mb-4">
            <Link href="/greatest-show">
              <Button variant="ghost" className="text-white hover:text-[#9333EA] p-0">
                ← Back to The Greatest Show
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="text-6xl">✨</div>
            <div>
              <h1 className="font-['Playfair_Display'] text-5xl md:text-6xl font-bold mb-2">
                Lifestyle <span className="text-[#9333EA]">Goddesses</span>
              </h1>
              <p className="font-['Inter'] text-xl text-gray-300">
                Luxury, travel, and aspirational living • {creators.length} Elite Influencers
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-3">
              <div className="text-2xl font-bold text-[#9333EA]">$50</div>
              <div className="text-sm text-gray-400">per month</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-3">
              <div className="text-2xl font-bold text-[#9333EA]">{creators.reduce((sum, c) => sum + c.followers, 0).toLocaleString()}</div>
              <div className="text-sm text-gray-400">Total Followers</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-3">
              <div className="text-2xl font-bold text-[#9333EA]">{creators.reduce((sum, c) => sum + c.posts, 0)}+</div>
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
                Subscribe to All Lifestyle Goddesses
              </h3>
              <p className="text-gray-400">
                Get unlimited access to all {creators.length} luxury lifestyle creators for one low price
              </p>
            </div>
            <Link href="/greatest-show/subscribe?tier=subgroup&group=lifestyle">
              <Button className="bg-[#9333EA] hover:bg-[#7E22CE] text-white font-['Montserrat'] font-bold px-12 py-6 text-lg rounded-full shadow-lg shadow-[#9333EA]/50 transition-all hover:scale-105">
                Subscribe for $50/month
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
                <Card className="group bg-white/5 border-2 border-white/10 hover:border-[#9333EA] overflow-hidden cursor-pointer transition-all hover:scale-105">
                  {/* Cover Photo */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={creator.coverPhoto}
                      alt={creator.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    
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
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="mt-14">
                      <h3 className="font-['Montserrat'] text-xl font-bold mb-1">
                        {creator.name}
                      </h3>
                      <p className="text-[#9333EA] text-sm mb-4">{creator.stageName}</p>

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
                          <span className="text-2xl font-bold text-[#9333EA]">${creator.subscriptionPrice}</span>
                          <span className="text-sm text-gray-500">/month</span>
                        </div>
                        <Button 
                          size="sm"
                          className="bg-[#9333EA] hover:bg-[#7E22CE] text-white font-semibold"
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
            Why Subscribe to <span className="text-[#9333EA]">Lifestyle Goddesses</span>?
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="bg-white/5 border border-white/10 p-8 text-center">
              <div className="text-5xl mb-4">✈️</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-[#9333EA]">
                Luxury Travel
              </h3>
              <p className="text-gray-400">
                Experience the world's most exclusive destinations through the eyes of elite travelers
              </p>
            </Card>

            <Card className="bg-white/5 border border-white/10 p-8 text-center">
              <div className="text-5xl mb-4">👗</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-[#9333EA]">
                High Fashion
              </h3>
              <p className="text-gray-400">
                Get insider access to fashion weeks, designer collections, and style secrets
              </p>
            </Card>

            <Card className="bg-white/5 border border-white/10 p-8 text-center">
              <div className="text-5xl mb-4">🌟</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-[#9333EA]">
                Aspirational Living
              </h3>
              <p className="text-gray-400">
                Learn how to elevate your lifestyle, from wellness to fine dining to self-care
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold mb-6">
            Ready to Elevate Your <span className="text-[#9333EA]">Lifestyle</span>?
          </h2>
          <p className="font-['Inter'] text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Join subscribers getting exclusive content from the world's top lifestyle influencers
          </p>
          <Link href="/greatest-show/subscribe?tier=subgroup&group=lifestyle">
            <Button className="bg-[#9333EA] hover:bg-[#7E22CE] text-white font-['Montserrat'] font-bold px-12 py-6 text-lg rounded-full shadow-lg shadow-[#9333EA]/50 transition-all hover:scale-105">
              Subscribe Now - $50/month
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
