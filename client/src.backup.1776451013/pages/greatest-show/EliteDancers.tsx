import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function EliteDancers() {
  // Mock creators for Dance vertical
  const creators = [
    {
      id: 18,
      name: "Carmen Rodriguez",
      stageName: "La Reina del Baile",
      tier: "legend",
      followers: 71200,
      posts: 156,
      engagement: 9.8,
      profilePhoto: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800",
      specialties: ["Salsa", "Bachata", "Latin Dance"],
      subscriptionPrice: 30,
    },
    {
      id: 19,
      name: "Natasha Ivanova",
      stageName: "The Ballet Empress",
      tier: "elite",
      followers: 58400,
      posts: 103,
      engagement: 8.9,
      profilePhoto: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?w=800",
      specialties: ["Ballet", "Contemporary", "Classical"],
      subscriptionPrice: 28,
    },
    {
      id: 20,
      name: "Zara Jackson",
      stageName: "The Hip-Hop Queen",
      tier: "elite",
      followers: 52900,
      posts: 94,
      engagement: 8.4,
      profilePhoto: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1547153760-18fc86324498?w=800",
      specialties: ["Hip-Hop", "Breaking", "Urban Dance"],
      subscriptionPrice: 28,
    },
    {
      id: 21,
      name: "Amara Okafor",
      stageName: "The Afrobeat Princess",
      tier: "established",
      followers: 43600,
      posts: 81,
      engagement: 7.9,
      profilePhoto: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800",
      specialties: ["Afrobeat", "African Dance", "Cultural"],
      subscriptionPrice: 25,
    },
    {
      id: 22,
      name: "Yuki Tanaka",
      stageName: "The Tokyo Dancer",
      tier: "established",
      followers: 38200,
      posts: 72,
      engagement: 7.5,
      profilePhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800",
      specialties: ["J-Pop", "K-Pop", "Asian Fusion"],
      subscriptionPrice: 25,
    },
    {
      id: 23,
      name: "Layla Hassan",
      stageName: "The Belly Dance Goddess",
      tier: "rising",
      followers: 31800,
      posts: 65,
      engagement: 7.1,
      profilePhoto: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800",
      specialties: ["Belly Dance", "Middle Eastern", "Fusion"],
      subscriptionPrice: 22,
    },
  ];

  const tierColors = {
    legend: "#FFD700",
    elite: "#FF6B35",
    established: "#B76E79",
    rising: "#F59E0B",
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
            src="https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=1920"
            alt="Elite Dancers"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-end pb-16">
          <div className="mb-4">
            <Link href="/greatest-show">
              <Button variant="ghost" className="text-white hover:text-[#FF6B35] p-0">
                ← Back to The Greatest Show
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="text-6xl">💃</div>
            <div>
              <h1 className="font-['Playfair_Display'] text-5xl md:text-6xl font-bold mb-2">
                Elite <span className="text-[#FF6B35]">Dancers</span>
              </h1>
              <p className="font-['Inter'] text-xl text-gray-300">
                World-class technique and performance • {creators.length} Master Dancers
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-3">
              <div className="text-2xl font-bold text-[#FF6B35]">$45</div>
              <div className="text-sm text-gray-400">per month</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-3">
              <div className="text-2xl font-bold text-[#FF6B35]">{creators.reduce((sum, c) => sum + c.followers, 0).toLocaleString()}</div>
              <div className="text-sm text-gray-400">Total Followers</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-3">
              <div className="text-2xl font-bold text-[#FF6B35]">{creators.reduce((sum, c) => sum + c.posts, 0)}+</div>
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
                Subscribe to All Elite Dancers
              </h3>
              <p className="text-gray-400">
                Get unlimited access to all {creators.length} world-class dancers for one low price
              </p>
            </div>
            <Link href="/greatest-show/subscribe?tier=subgroup&group=dance">
              <Button className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-['Montserrat'] font-bold px-12 py-6 text-lg rounded-full shadow-lg shadow-[#FF6B35]/50 transition-all hover:scale-105">
                Subscribe for $45/month
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
                <Card className="group bg-white/5 border-2 border-white/10 hover:border-[#FF6B35] overflow-hidden cursor-pointer transition-all hover:scale-105">
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
                      <p className="text-[#FF6B35] text-sm mb-4">{creator.stageName}</p>

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
                          <span className="text-2xl font-bold text-[#FF6B35]">${creator.subscriptionPrice}</span>
                          <span className="text-sm text-gray-500">/month</span>
                        </div>
                        <Button 
                          size="sm"
                          className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-semibold"
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
            Why Subscribe to <span className="text-[#FF6B35]">Elite Dancers</span>?
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="bg-white/5 border border-white/10 p-8 text-center">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-[#FF6B35]">
                Master Technique
              </h3>
              <p className="text-gray-400">
                Learn from professional dancers with decades of training and performance experience
              </p>
            </Card>

            <Card className="bg-white/5 border border-white/10 p-8 text-center">
              <div className="text-5xl mb-4">🌍</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-[#FF6B35]">
                Global Styles
              </h3>
              <p className="text-gray-400">
                Explore dance styles from around the world - Latin, Ballet, Hip-Hop, Afrobeat, and more
              </p>
            </Card>

            <Card className="bg-white/5 border border-white/10 p-8 text-center">
              <div className="text-5xl mb-4">🎬</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-[#FF6B35]">
                Performance Art
              </h3>
              <p className="text-gray-400">
                Watch captivating performances that blend technical skill with artistic expression
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold mb-6">
            Ready to Experience <span className="text-[#FF6B35]">World-Class Dance</span>?
          </h2>
          <p className="font-['Inter'] text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Join subscribers getting exclusive content from the world's elite dancers
          </p>
          <Link href="/greatest-show/subscribe?tier=subgroup&group=dance">
            <Button className="bg-[#FF6B35] hover:bg-[#E55A2B] text-white font-['Montserrat'] font-bold px-12 py-6 text-lg rounded-full shadow-lg shadow-[#FF6B35]/50 transition-all hover:scale-105">
              Subscribe Now - $45/month
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
