import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Instagram, Globe, Lock, Check, Star, Heart, TrendingUp } from "lucide-react";

export default function DianaProfile() {
  const [activeTab, setActiveTab] = useState<"content" | "about" | "subscribe">("content");

  const contentItems = [
    { id: 1, type: "video", thumbnail: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400", views: "1.1M", title: "Booty Building Workout" },
    { id: 2, type: "photo", thumbnail: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400", views: "423K", title: "Beach Fitness Vibes" },
    { id: 3, type: "video", thumbnail: "https://images.unsplash.com/photo-1518310952931-b1de897abd40?w=400", views: "134K", title: "Gym Session" },
    { id: 4, type: "photo", thumbnail: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400", views: "64K", title: "Haitian Pride" },
    { id: 5, type: "video", thumbnail: "https://images.unsplash.com/photo-1518459031867-a89b944bffe4?w=400", views: "52K", title: "Morning Routine" },
    { id: 6, type: "photo", thumbnail: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400", views: "38K", title: "Nail Salon Life" },
    { id: 7, type: "video", thumbnail: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400", views: "29K", title: "Leg Day" },
    { id: 8, type: "photo", thumbnail: "https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=400", views: "24K", title: "Cultural Content" },
    { id: 9, type: "video", thumbnail: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400", views: "18K", title: "Quick Workout" },
    { id: 10, type: "photo", thumbnail: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400", views: "15K", title: "Mom Life" },
    { id: 11, type: "video", thumbnail: "https://images.unsplash.com/photo-1518310952931-b1de897abd40?w=400", views: "12K", title: "Business Tips" },
    { id: 12, type: "photo", thumbnail: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400", views: "9K", title: "Creole Lessons" },
  ];

  const subscriptionTiers = [
    {
      name: "Fit Fam",
      price: 20,
      popular: false,
      features: [
        "Weekly workout videos",
        "Nutrition tips & meal ideas",
        "Monthly Q&A sessions",
        "Exclusive behind-the-scenes",
        "Community chat access",
        "Basic Creole phrases"
      ]
    },
    {
      name: "Inner Circle",
      price: 50,
      popular: true,
      features: [
        "Everything in Fit Fam",
        "Daily motivational content",
        "Personalized workout plans",
        "Monthly 1-on-1 check-ins",
        "Nail care & beauty tips",
        "SlangExxchange Creole lessons",
        "Single mom support group",
        "Early access to new content"
      ]
    },
    {
      name: "VIP Goddess",
      price: 150,
      popular: false,
      features: [
        "Everything in Inner Circle",
        "Weekly 1-on-1 video calls",
        "Custom meal & workout plans",
        "Priority DM responses",
        "Exclusive VIP events",
        "Business coaching sessions",
        "Cultural immersion content",
        "Lifetime content library access",
        "VIP badge in community"
      ]
    }
  ];

  const testimonials = [
    {
      name: "Marie L.",
      role: "Single Mom from Miami",
      text: "Diana inspired me to get back in shape after having my baby. She shows me it's possible to be a great mom AND prioritize yourself!",
      rating: 5
    },
    {
      name: "Jean-Pierre D.",
      role: "Haitian Diaspora",
      text: "Finally someone who represents our culture authentically! Diana's Creole lessons help me connect with my roots.",
      rating: 5
    },
    {
      name: "Sophia R.",
      role: "Entrepreneur",
      text: "Diana runs a nail salon AND builds her fitness empire while raising kids. She's proof that you can do it all!",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800">
        <div className="container mx-auto px-4 py-4">
          <Link asChild href="/greatest-show">
            <a className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to The Greatest Show</span>
            </a>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative h-[400px] md:h-[500px]">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200')",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="relative container mx-auto px-4 h-full flex items-end pb-8">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6 w-full">
            {/* Profile Image */}
            <div className="relative">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-cyan-400 overflow-hidden bg-slate-800">
                <img 
                  src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400" 
                  alt="Diana Fils-Aime"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                🇭🇹 HAITI
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 font-serif">
                Diana Fils-Aime 🇭🇹
              </h1>
              <p className="text-xl md:text-2xl text-cyan-400 font-semibold mb-3">
                The Haitiana Fitness Goddess
              </p>
              <p className="text-lg text-slate-300 mb-4 max-w-2xl">
                Single Mom 👶 | Nail Salon Owner 💅 | Fitness Creator 💪 | SlangExxchange Leader 📚
              </p>
              <p className="text-md text-slate-400 italic mb-4">
                "Building my empire while raising my kids - if I can do it, you can too! 🇭🇹💪"
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 text-center">
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-cyan-400">4.3K</div>
                  <div className="text-sm text-slate-400">Followers</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-pink-400">542</div>
                  <div className="text-sm text-slate-400">Posts</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-yellow-400">1.1M+</div>
                  <div className="text-sm text-slate-400">Peak Views</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-green-400">254x</div>
                  <div className="text-sm text-slate-400">Viral Coefficient</div>
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-purple-400">25%+</div>
                  <div className="text-sm text-slate-400">Engagement</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm sticky top-[73px] z-40">
        <div className="container mx-auto px-4">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("content")}
              className={`py-4 px-2 font-semibold transition-colors relative ${
                activeTab === "content" 
                  ? "text-cyan-400" 
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              Content
              {activeTab === "content" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className={`py-4 px-2 font-semibold transition-colors relative ${
                activeTab === "about" 
                  ? "text-cyan-400" 
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              About
              {activeTab === "about" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("subscribe")}
              className={`py-4 px-2 font-semibold transition-colors relative ${
                activeTab === "subscribe" 
                  ? "text-cyan-400" 
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              Subscribe
              {activeTab === "subscribe" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="container mx-auto px-4 py-12">
        {activeTab === "content" && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white">Exclusive Content</h2>
              <div className="text-slate-400">
                <span className="font-semibold text-cyan-400">{contentItems.length}</span> items
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {contentItems.map((item) => (
                <div key={item.id} className="group relative aspect-square rounded-lg overflow-hidden bg-slate-800 cursor-pointer">
                  <img 
                    src={item.thumbnail} 
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Lock className="w-12 h-12 text-white mb-2 mx-auto" />
                        <p className="text-white font-semibold">Subscribe to unlock</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
                    {item.views} views
                  </div>
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-sm font-medium truncate">{item.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "about" && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8">About Diana</h2>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 mb-8 border border-slate-700">
              <h3 className="text-2xl font-bold text-cyan-400 mb-4">My Story</h3>
              <div className="space-y-4 text-slate-300 leading-relaxed">
                <p>
                  <strong className="text-white">Bonjou!</strong> I'm Diana Fils-Aime, and I'm here to show you that you can build your dream body, your dream business, and your dream life - no matter what obstacles you face.
                </p>
                <p>
                  I'm a <strong className="text-pink-400">single mother</strong> raising my kids while building not one, but TWO businesses. I own and operate <strong className="text-purple-400">@ddiananailqueen</strong>, my nail salon where I help people feel beautiful and confident. And now, I'm building my fitness empire on The Greatest Show on Earth.
                </p>
                <p>
                  As the <strong className="text-cyan-400">Haitiana Brand Ambassador</strong> and <strong className="text-cyan-400">SlangExxchange Leader</strong> for the Haitian community, I'm not just teaching fitness - I'm teaching authentic Haitian Creole, sharing our culture, and representing Haiti on a global stage.
                </p>
                <p>
                  I wake up at 5am to work out before my kids wake up. I run my nail salon during the day. I create content at night. I teach Creole lessons on weekends. I'm living proof that you can do it all - you just have to want it bad enough.
                </p>
                <p className="text-lg font-semibold text-white">
                  If I can build my empire while raising my kids, you can achieve your goals too. No excuses, just results. Ayiti cheri! 🇭🇹💪
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 mb-8 border border-slate-700">
              <h3 className="text-2xl font-bold text-cyan-400 mb-6">What Makes Me Different</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-pink-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2">Single Mother Empowerment</h4>
                    <p className="text-slate-400 text-sm">
                      I'm raising my kids while building my empire. I understand the struggles, the sacrifices, and the determination it takes. You're not alone in this journey.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2">Proven Entrepreneur</h4>
                    <p className="text-slate-400 text-sm">
                      I built my nail salon from scratch. Now I'm building my fitness empire. I can teach you the business side, not just the fitness side.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2">Cultural Ambassador</h4>
                    <p className="text-slate-400 text-sm">
                      I'm proudly Haitian and I celebrate my culture in everything I do. I teach authentic Haitian Creole on SlangExxchange and share our traditions with the world.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2">Viral Content Creator</h4>
                    <p className="text-slate-400 text-sm">
                      1.1M+ views on my viral content with 254x viral coefficient. I know how to create content that resonates and inspires.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 mb-8 border border-slate-700">
              <h3 className="text-2xl font-bold text-cyan-400 mb-6">My Specialties</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-slate-950/50 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">🍑</div>
                  <div className="font-semibold text-white mb-1">Booty Building</div>
                  <div className="text-sm text-slate-400">Glute-focused workouts</div>
                </div>
                <div className="bg-slate-950/50 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">💪</div>
                  <div className="font-semibold text-white mb-1">Sexy Fitness</div>
                  <div className="text-sm text-slate-400">Confidence-building workouts</div>
                </div>
                <div className="bg-slate-950/50 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">🇭🇹</div>
                  <div className="font-semibold text-white mb-1">Haitian Culture</div>
                  <div className="text-sm text-slate-400">Cultural pride & representation</div>
                </div>
                <div className="bg-slate-950/50 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">👶</div>
                  <div className="font-semibold text-white mb-1">Mom Fitness</div>
                  <div className="text-sm text-slate-400">Workouts for busy moms</div>
                </div>
                <div className="bg-slate-950/50 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">💅</div>
                  <div className="font-semibold text-white mb-1">Beauty & Self-Care</div>
                  <div className="text-sm text-slate-400">Nail care & pampering tips</div>
                </div>
                <div className="bg-slate-950/50 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">📚</div>
                  <div className="font-semibold text-white mb-1">Haitian Creole</div>
                  <div className="text-sm text-slate-400">SlangExxchange lessons</div>
                </div>
                <div className="bg-slate-950/50 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">💼</div>
                  <div className="font-semibold text-white mb-1">Entrepreneurship</div>
                  <div className="text-sm text-slate-400">Business building tips</div>
                </div>
                <div className="bg-slate-950/50 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">💖</div>
                  <div className="font-semibold text-white mb-1">Body Positivity</div>
                  <div className="text-sm text-slate-400">Self-love & confidence</div>
                </div>
                <div className="bg-slate-950/50 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">🎯</div>
                  <div className="font-semibold text-white mb-1">Goal Setting</div>
                  <div className="text-sm text-slate-400">Achieving your dreams</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 border border-slate-700">
              <h3 className="text-2xl font-bold text-cyan-400 mb-6">Connect With Me</h3>
              <div className="flex flex-wrap gap-4">
                <a 
                  href="https://instagram.com/diana_queen1112" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all"
                >
                  <Instagram className="w-5 h-5" />
                  @diana_queen1112
                </a>
                <a 
                  href="https://instagram.com/ddiananailqueen" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all"
                >
                  <Instagram className="w-5 h-5" />
                  @ddiananailqueen
                </a>
                <a 
                  href="https://www.tiktok.com/@princess_..." 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 transition-all"
                >
                  <Globe className="w-5 h-5" />
                  TikTok
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === "subscribe" && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">Join My Community</h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                Get exclusive access to my fitness content, Haitian Creole lessons, business tips, and single mom support community
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {subscriptionTiers.map((tier) => (
                <div 
                  key={tier.name}
                  className={`relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 border-2 transition-all hover:scale-105 ${
                    tier.popular 
                      ? "border-cyan-400 shadow-lg shadow-cyan-400/20" 
                      : "border-slate-700"
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-400 to-pink-400 text-slate-950 px-4 py-1 rounded-full text-sm font-bold">
                      MOST POPULAR
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold text-cyan-400">${tier.price}</span>
                      <span className="text-slate-400">/month</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    tier.popular
                      ? "bg-gradient-to-r from-cyan-400 to-pink-400 text-slate-950 hover:shadow-lg hover:shadow-cyan-400/30"
                      : "bg-slate-700 text-white hover:bg-slate-600"
                  }`}>
                    Subscribe Now
                  </button>
                </div>
              ))}
            </div>

            {/* Testimonials */}
            <div className="mb-16">
              <h3 className="text-3xl font-bold text-white text-center mb-8">What Subscribers Say</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {testimonials.map((testimonial, idx) => (
                  <div key={idx} className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-slate-700">
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-slate-300 mb-4 italic">"{testimonial.text}"</p>
                    <div>
                      <div className="font-semibold text-white">{testimonial.name}</div>
                      <div className="text-sm text-slate-400">{testimonial.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 border border-slate-700">
              <h3 className="text-3xl font-bold text-white text-center mb-8">Frequently Asked Questions</h3>
              <div className="space-y-6 max-w-3xl mx-auto">
                <div>
                  <h4 className="font-bold text-white mb-2">What content do I get access to?</h4>
                  <p className="text-slate-300">
                    You'll get exclusive fitness workouts, Haitian Creole lessons, business tips, single mom advice, nail care tutorials, cultural content, and behind-the-scenes access to my life.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-2">Can I cancel anytime?</h4>
                  <p className="text-slate-300">
                    Yes! You can cancel your subscription at any time. No long-term commitments required.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-2">Do I need gym equipment?</h4>
                  <p className="text-slate-300">
                    Most of my workouts can be done at home with minimal equipment. I'll show you how to get results with what you have!
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-2">Is this suitable for beginners?</h4>
                  <p className="text-slate-300">
                    Absolutely! I provide modifications for all fitness levels. Whether you're just starting or you're advanced, I've got you covered.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-2">What makes your content different?</h4>
                  <p className="text-slate-300">
                    I'm a real single mother building real businesses while staying fit and representing my Haitian culture. This isn't just fitness - it's a complete lifestyle and empowerment community.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
