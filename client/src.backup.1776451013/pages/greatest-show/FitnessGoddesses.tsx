import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function FitnessGoddesses() {
  // Mock creators for Fitness vertical
  const creators = [
    {
      id: 1,
      name: "Maily Gonzalez",
      stageName: "The Dominican Diamond",
      tier: "legend",
      followers: 49600,
      posts: 43,
      engagement: 8.5,
      profilePhoto: "https://images.unsplash.com/photo-1550259979-ed79b48d2a30?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1540206395-68808572332f?w=800",
      specialties: ["Beach Body", "Bikini Fitness", "Lifestyle"],
      subscriptionPrice: 25,
    },
    {
      id: 2,
      name: "Sofia Martinez",
      stageName: "The Strength Queen",
      tier: "elite",
      followers: 38200,
      posts: 67,
      engagement: 7.2,
      profilePhoto: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800",
      specialties: ["Strength Training", "Powerlifting", "Nutrition"],
      subscriptionPrice: 25,
    },
    {
      id: 3,
      name: "Isabella Santos",
      stageName: "Yoga Goddess",
      tier: "established",
      followers: 31500,
      posts: 89,
      engagement: 6.8,
      profilePhoto: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800",
      specialties: ["Yoga", "Flexibility", "Mindfulness"],
      subscriptionPrice: 20,
    },
    {
      id: 4,
      name: "Valentina Cruz",
      stageName: "Cardio Queen",
      tier: "established",
      followers: 28900,
      posts: 52,
      engagement: 6.3,
      profilePhoto: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1483721310020-03333e577078?w=800",
      specialties: ["HIIT", "Running", "Endurance"],
      subscriptionPrice: 20,
    },
    {
      id: 5,
      name: "Camila Rodriguez",
      stageName: "The Transformation Coach",
      tier: "rising",
      followers: 19400,
      posts: 34,
      engagement: 5.9,
      profilePhoto: "https://images.unsplash.com/photo-1524863479829-916d8e77f114?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800",
      specialties: ["Weight Loss", "Body Recomp", "Coaching"],
      subscriptionPrice: 18,
    },
    {
      id: 6,
      name: "Luna Morales",
      stageName: "Booty Builder",
      tier: "rising",
      followers: 22100,
      posts: 41,
      engagement: 6.1,
      profilePhoto: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400",
      coverPhoto: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800",
      specialties: ["Glute Training", "Lower Body", "Aesthetics"],
      subscriptionPrice: 18,
    },
  ];

  const tierColors = {
    legend: "#FFD700",
    elite: "#00D9FF",
    established: "#B76E79",
    rising: "#9333EA",
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
            src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920"
            alt="Fitness Goddesses"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-end pb-16">
          <div className="mb-4">
            <Link href="/greatest-show">
              <Button variant="ghost" className="text-white hover:text-[#00BFFF] p-0">
                ← Back to The Greatest Show
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="text-6xl">💪</div>
            <div>
              <h1 className="font-['Playfair_Display'] text-5xl md:text-6xl font-bold mb-2">
                Fitness <span className="text-[#00BFFF]">Lifestyle Goddesses</span>
              </h1>
              <p className="font-['Inter'] text-xl text-gray-300">
                Athletic excellence meets sensual appeal • {creators.length} Elite Creators
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-3">
              <div className="text-2xl font-bold text-[#00BFFF]">$40</div>
              <div className="text-sm text-gray-400">per month</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-3">
              <div className="text-2xl font-bold text-[#00BFFF]">{creators.reduce((sum, c) => sum + c.followers, 0).toLocaleString()}</div>
              <div className="text-sm text-gray-400">Total Followers</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6 py-3">
              <div className="text-2xl font-bold text-[#00BFFF]">{creators.reduce((sum, c) => sum + c.posts, 0)}+</div>
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
                Subscribe to All Fitness Creators
              </h3>
              <p className="text-gray-400">
                Get unlimited access to all {creators.length} fitness goddesses for one low price
              </p>
            </div>
            <Link href="/greatest-show/subscribe?tier=subgroup&group=fitness">
              <Button className="bg-[#00BFFF] hover:bg-[#00A0D0] text-black font-['Montserrat'] font-bold px-12 py-6 text-lg rounded-full shadow-lg shadow-[#00BFFF]/50 transition-all hover:scale-105">
                Subscribe for $40/month
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
              <Link key={creator.id} href={creator.id === 1 ? "/greatest-show/maily" : `/greatest-show/creator/${creator.id}`}>
                <Card className="group bg-white/5 border-2 border-white/10 hover:border-[#00BFFF] overflow-hidden cursor-pointer transition-all hover:scale-105">
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
                        color: '#000'
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
                      <p className="text-[#00BFFF] text-sm mb-4">{creator.stageName}</p>

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
                          <span className="text-2xl font-bold text-[#00BFFF]">${creator.subscriptionPrice}</span>
                          <span className="text-sm text-gray-500">/month</span>
                        </div>
                        <Button 
                          size="sm"
                          className="bg-[#00BFFF] hover:bg-[#00A0D0] text-black font-semibold"
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
            Why Subscribe to <span className="text-[#00BFFF]">Fitness Goddesses</span>?
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="bg-white/5 border border-white/10 p-8 text-center">
              <div className="text-5xl mb-4">🏋️</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-[#00BFFF]">
                Expert Training
              </h3>
              <p className="text-gray-400">
                Learn from certified trainers and fitness competitors with proven results
              </p>
            </Card>

            <Card className="bg-white/5 border border-white/10 p-8 text-center">
              <div className="text-5xl mb-4">📸</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-[#00BFFF]">
                Premium Content
              </h3>
              <p className="text-gray-400">
                Daily workout videos, meal plans, and lifestyle content from elite creators
              </p>
            </Card>

            <Card className="bg-white/5 border border-white/10 p-8 text-center">
              <div className="text-5xl mb-4">💎</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-[#00BFFF]">
                No Adult Content
              </h3>
              <p className="text-gray-400">
                Athletic excellence and sensual appeal without crossing into adult material
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your <span className="text-[#00BFFF]">Fitness Journey</span>?
          </h2>
          <p className="font-['Inter'] text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Join thousands of subscribers getting exclusive content from the world's top fitness creators
          </p>
          <Link href="/greatest-show/subscribe?tier=subgroup&group=fitness">
            <Button className="bg-[#00BFFF] hover:bg-[#00A0D0] text-black font-['Montserrat'] font-bold px-12 py-6 text-lg rounded-full shadow-lg shadow-[#00BFFF]/50 transition-all hover:scale-105">
              Subscribe Now - $40/month
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
