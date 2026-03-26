import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MailyProfile() {
  const [selectedTier, setSelectedTier] = useState<"fit-fam" | "inner-circle" | "vip">("fit-fam");

  // Maily's content (mix of workout, beach, lifestyle)
  const content = [
    { id: 1, type: "photo", url: "https://images.unsplash.com/photo-1550259979-ed79b48d2a30?w=600", views: 295000, likes: 12400 },
    { id: 2, type: "video", url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600", views: 327000, likes: 15200 },
    { id: 3, type: "photo", url: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600", views: 282000, likes: 11800 },
    { id: 4, type: "photo", url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600", views: 476000, likes: 18900 },
    { id: 5, type: "video", url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600", views: 412000, likes: 16700 },
    { id: 6, type: "photo", url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600", views: 358000, likes: 14200 },
    { id: 7, type: "photo", url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600", views: 391000, likes: 15600 },
    { id: 8, type: "video", url: "https://images.unsplash.com/photo-1524863479829-916d8e77f114?w=600", views: 445000, likes: 17800 },
    { id: 9, type: "photo", url: "https://images.unsplash.com/photo-1540206395-68808572332f?w=600", views: 312000, likes: 13100 },
    { id: 10, type: "photo", url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600", views: 367000, likes: 14900 },
    { id: 11, type: "video", url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600", views: 523000, likes: 20100 },
    { id: 12, type: "photo", url: "https://images.unsplash.com/photo-1550259979-ed79b48d2a30?w=600", views: 289000, likes: 12200 },
  ];

  const tiers = {
    "fit-fam": {
      name: "Fit Fam",
      price: 25,
      color: "#00BFFF",
      features: [
        "All workout videos",
        "Weekly fitness tips",
        "Meal prep guides",
        "Community chat access",
        "Monthly challenges",
      ],
    },
    "inner-circle": {
      name: "Inner Circle",
      price: 50,
      color: "#FFD700",
      features: [
        "Everything in Fit Fam",
        "Exclusive photoshoots",
        "Behind-the-scenes content",
        "Monthly Q&A sessions",
        "Direct messaging (1x/month)",
        "Early access to new content",
      ],
    },
    "vip": {
      name: "VIP Experience",
      price: 150,
      color: "#FF00FF",
      features: [
        "Everything in Inner Circle",
        "Personalized workout plans",
        "Monthly video call (15 min)",
        "Early access to DMBIKINIS products",
        "Exclusive merchandise",
        "Birthday shoutout",
        "Custom content requests (1x/month)",
      ],
    },
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative h-[70vh] overflow-hidden">
        {/* Cover Photo */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1540206395-68808572332f?w=1920"
            alt="Maily Gonzalez Cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
        </div>

        {/* Profile Info */}
        <div className="absolute bottom-0 left-0 right-0 pb-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-end gap-8">
              {/* Profile Photo */}
              <div className="relative">
                <div className="w-40 h-40 rounded-full border-4 border-[#FFD700] overflow-hidden shadow-2xl">
                  <img
                    src="https://images.unsplash.com/photo-1550259979-ed79b48d2a30?w=400"
                    alt="Maily Gonzalez"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-[#FFD700] text-black rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl">
                  ✓
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold">
                    Maily Gonzalez
                  </h1>
                  <span className="bg-[#00BFFF] text-black px-3 py-1 rounded-full text-sm font-bold">
                    FITNESS
                  </span>
                </div>
                <p className="font-['Inter'] text-xl text-[#E5E4E2] mb-4">
                  The Dominican Diamond 💎 • CEO of DMBIKINIS
                </p>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-[#FFD700] font-bold text-2xl">49.6K</span>
                    <span className="text-gray-400 ml-2">Followers</span>
                  </div>
                  <div>
                    <span className="text-[#FFD700] font-bold text-2xl">43</span>
                    <span className="text-gray-400 ml-2">Posts</span>
                  </div>
                  <div>
                    <span className="text-[#FFD700] font-bold text-2xl">64K+</span>
                    <span className="text-gray-400 ml-2">Viral Views</span>
                  </div>
                  <div>
                    <span className="text-[#FFD700] font-bold text-2xl">8.5%</span>
                    <span className="text-gray-400 ml-2">Engagement</span>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div>
                <Button className="bg-[#FFD700] hover:bg-[#FFC700] text-black font-['Montserrat'] font-bold px-8 py-6 text-lg rounded-full shadow-lg shadow-[#FFD700]/50 transition-all hover:scale-105">
                  Subscribe Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="sticky top-0 z-40 bg-black/95 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="bg-transparent border-0 h-auto p-0 space-x-8">
              <TabsTrigger 
                value="content" 
                className="bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#FFD700] rounded-none px-0 py-4 font-['Montserrat'] font-semibold"
              >
                Content
              </TabsTrigger>
              <TabsTrigger 
                value="about" 
                className="bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#FFD700] rounded-none px-0 py-4 font-['Montserrat'] font-semibold"
              >
                About
              </TabsTrigger>
              <TabsTrigger 
                value="subscribe" 
                className="bg-transparent border-0 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#FFD700] rounded-none px-0 py-4 font-['Montserrat'] font-semibold"
              >
                Subscribe
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </section>

      {/* Content Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {content.map((item) => (
              <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer">
                <img
                  src={item.url}
                  alt={`Content ${item.id}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                />
                {/* Video indicator */}
                {item.type === "video" && (
                  <div className="absolute top-3 right-3 bg-black/80 rounded-full p-2">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-6 text-white">
                      <div className="flex items-center gap-2">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        <span className="font-bold">{(item.views / 1000).toFixed(0)}K</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        <span className="font-bold">{(item.likes / 1000).toFixed(1)}K</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Lock overlay for non-subscribers */}
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-[#FFD700] mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-[#FFD700] font-semibold">Subscribe to unlock</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-12">
            <Button variant="outline" className="border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700] hover:text-black px-8 py-4 rounded-full">
              Load More Content
            </Button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-24 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold mb-8 text-center">
              About <span className="text-[#FFD700]">Maily</span>
            </h2>

            <Card className="bg-white/5 border border-white/10 p-8 mb-8">
              <p className="font-['Inter'] text-lg text-gray-300 leading-relaxed mb-6">
                Dominican-born fitness entrepreneur and content creator. CEO of <span className="text-[#FFD700] font-semibold">DMBIKINIS</span>, pioneering the fusion of athletic excellence and sensual appeal without adult content.
              </p>
              <p className="font-['Inter'] text-lg text-gray-300 leading-relaxed mb-6">
                Leading the fitness lifestyle goddesses vertical and setting the standard for premium creator content. With over 49,600 followers and multiple viral posts exceeding 64,000 views, Maily represents the perfect balance of fitness, lifestyle, and entrepreneurship.
              </p>
              <p className="font-['Inter'] text-lg text-gray-300 leading-relaxed">
                Based in Santo Domingo, Dominican Republic 🇩🇴, Maily creates handmade bikinis while inspiring thousands with her fitness journey, beach lifestyle content, and authentic cultural representation.
              </p>
            </Card>

            {/* Specialties */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="bg-white/5 border border-[#00BFFF]/30 p-6 text-center">
                <div className="text-4xl mb-3">💪</div>
                <h3 className="font-['Montserrat'] font-bold text-[#00BFFF] mb-2">Fitness</h3>
                <p className="text-sm text-gray-400">Workout routines, fitness tips, body transformation</p>
              </Card>
              <Card className="bg-white/5 border border-[#FFD700]/30 p-6 text-center">
                <div className="text-4xl mb-3">👙</div>
                <h3 className="font-['Montserrat'] font-bold text-[#FFD700] mb-2">Bikini Boss</h3>
                <p className="text-sm text-gray-400">Handmade bikinis, fashion, beach lifestyle</p>
              </Card>
              <Card className="bg-white/5 border border-[#B76E79]/30 p-6 text-center">
                <div className="text-4xl mb-3">✨</div>
                <h3 className="font-['Montserrat'] font-bold text-[#B76E79] mb-2">Lifestyle</h3>
                <p className="text-sm text-gray-400">Travel, culture, entrepreneurship</p>
              </Card>
            </div>

            {/* Social Links */}
            <div className="flex justify-center gap-4">
              <a href="https://instagram.com/maily_gonzalez08" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-[#E5E4E2] text-white hover:bg-white hover:text-black rounded-full px-6">
                  Instagram
                </Button>
              </a>
              <a href="https://instagram.com/maily_crochet_08" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700] hover:text-black rounded-full px-6">
                  DMBIKINIS
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Tiers */}
      <section className="py-24 bg-black">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold mb-4">
              Choose Your <span className="text-[#FFD700]">Tier</span>
            </h2>
            <p className="font-['Inter'] text-xl text-gray-400">
              Get exclusive access to Maily's premium content
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {Object.entries(tiers).map(([key, tier]) => (
              <Card
                key={key}
                className={`bg-white/5 border-2 p-8 cursor-pointer transition-all hover:scale-105 ${
                  selectedTier === key
                    ? `border-[${tier.color}] shadow-2xl shadow-[${tier.color}]/50`
                    : "border-white/10"
                }`}
                onClick={() => setSelectedTier(key as any)}
              >
                <div className="text-center mb-6">
                  <h3 className="font-['Montserrat'] text-2xl font-bold mb-2">{tier.name}</h3>
                  <div className="font-['Playfair_Display'] text-5xl font-bold mb-2" style={{ color: tier.color }}>
                    ${tier.price}
                    <span className="text-lg text-gray-500">/mo</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-300">
                      <span className="mr-2" style={{ color: tier.color }}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full font-bold rounded-full py-6"
                  style={{
                    backgroundColor: selectedTier === key ? tier.color : "transparent",
                    color: selectedTier === key ? "#000" : tier.color,
                    border: `2px solid ${tier.color}`,
                  }}
                >
                  {selectedTier === key ? "Selected" : "Select Tier"}
                </Button>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/greatest-show/subscribe?creator=maily">
              <Button className="bg-[#FFD700] hover:bg-[#FFC700] text-black font-['Montserrat'] font-bold px-12 py-6 text-lg rounded-full shadow-lg shadow-[#FFD700]/50 transition-all hover:scale-105">
                Subscribe to Maily
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Back to Show */}
      <section className="py-12 bg-gray-900">
        <div className="container mx-auto px-4 text-center">
          <Link href="/greatest-show">
            <Button variant="outline" className="border-[#E5E4E2] text-white hover:bg-white hover:text-black rounded-full px-8 py-4">
              ← Back to The Greatest Show
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
