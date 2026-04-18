import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";

export default function FanSubscription() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split('?')[1]);
  const tierParam = params.get('tier');
  const groupParam = params.get('group');
  const creatorParam = params.get('creator');

  const [selectedTier, setSelectedTier] = useState(tierParam || "");

  // Subscription tiers
  const tiers = [
    {
      id: "single",
      name: "Single Creator",
      price: 25,
      priceId: "price_single_creator",
      color: "#00BFFF",
      features: [
        "Access to 1 creator's full library",
        "New content as it's released",
        "Direct messaging with creator",
        "Exclusive behind-the-scenes",
        "Cancel anytime",
      ],
    },
    {
      id: "subgroup",
      name: "Sub-Group Access",
      price: 40,
      priceId: "price_subgroup_access",
      color: "#E91E63",
      features: [
        "Access to all creators in one sub-group",
        "5-10 elite creators",
        "Hundreds of content pieces",
        "New content daily",
        "Group chat access",
        "Priority support",
        "Cancel anytime",
      ],
      popular: true,
    },
    {
      id: "full",
      name: "Full Access",
      price: 100,
      priceId: "price_full_access",
      color: "#FFD700",
      features: [
        "Access to ALL creators",
        "All 5 sub-groups included",
        "100+ elite creators",
        "Thousands of content pieces",
        "Exclusive events & live streams",
        "VIP community access",
        "Priority DMs with creators",
        "Early access to new creators",
        "Cancel anytime",
      ],
    },
    {
      id: "vip",
      name: "VIP Experience",
      price: 500,
      priceId: "price_vip_experience",
      color: "#9333EA",
      features: [
        "Everything in Full Access",
        "Private 1-on-1 video calls",
        "Custom content requests",
        "VIP-only events & meetups",
        "Exclusive merchandise",
        "Personal account manager",
        "First access to new features",
        "Lifetime VIP status",
        "Cancel anytime",
      ],
    },
  ];

  // Get tier details based on params
  let recommendedTier = tiers.find(t => t.id === tierParam);
  if (groupParam) {
    recommendedTier = tiers.find(t => t.id === "subgroup");
  } else if (creatorParam) {
    recommendedTier = tiers.find(t => t.id === "single");
  }

  const handleSubscribe = async (tier: typeof tiers[0]) => {
    // TODO: Integrate with Stripe via tRPC
    toast.success(`Redirecting to secure checkout for ${tier.name}...`);
    console.log("Subscribe to:", tier);
    
    // Simulate Stripe redirect
    setTimeout(() => {
      toast.info("Stripe integration coming soon! This will redirect to secure payment.");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative py-16 bg-gradient-to-b from-gray-900 to-black border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Link href="/greatest-show">
              <Button variant="ghost" className="text-white hover:text-[#FFD700] mb-8">
                ← Back to The Greatest Show
              </Button>
            </Link>

            <h1 className="font-['Playfair_Display'] text-5xl md:text-6xl font-bold mb-6">
              Choose Your <span className="text-[#FFD700]">Experience</span>
            </h1>
            <p className="font-['Inter'] text-xl text-gray-300 mb-8">
              Get unlimited access to the world's most elite content creators.
              All plans include HD content, mobile access, and cancel anytime.
            </p>

            {recommendedTier && (
              <div className="inline-block bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-full px-6 py-3 mb-8">
                <span className="text-[#FFD700] font-semibold">
                  ⭐ Recommended for you: {recommendedTier.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {tiers.map((tier) => (
              <Card
                key={tier.id}
                className={`relative bg-white/5 border-2 overflow-hidden transition-all hover:scale-105 ${
                  tier.popular
                    ? "border-[#E91E63] shadow-lg shadow-[#E91E63]/20"
                    : "border-white/10 hover:border-white/30"
                } ${
                  selectedTier === tier.id
                    ? "ring-4 ring-[#FFD700] ring-offset-2 ring-offset-black"
                    : ""
                }`}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0 bg-[#E91E63] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                )}

                <div className="p-6">
                  {/* Tier Name & Price */}
                  <div className="text-center mb-6">
                    <h3
                      className="font-['Montserrat'] text-2xl font-bold mb-2"
                      style={{ color: tier.color }}
                    >
                      {tier.name}
                    </h3>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-5xl font-bold">${tier.price}</span>
                      <span className="text-gray-500">/month</span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-[#FFD700] mt-0.5">✓</span>
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Subscribe Button */}
                  <Button
                    onClick={() => handleSubscribe(tier)}
                    className="w-full font-bold py-6 text-lg rounded-full transition-all"
                    style={{
                      backgroundColor: tier.color,
                      color: tier.id === "full" ? "#000" : "#FFF",
                    }}
                  >
                    Subscribe Now
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="font-['Playfair_Display'] text-4xl font-bold text-center mb-12">
            Compare <span className="text-[#FFD700]">Plans</span>
          </h2>

          <div className="max-w-6xl mx-auto overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-4 px-6 font-['Montserrat'] font-bold">Feature</th>
                  <th className="py-4 px-6 text-center font-['Montserrat'] font-bold">Single</th>
                  <th className="py-4 px-6 text-center font-['Montserrat'] font-bold">Sub-Group</th>
                  <th className="py-4 px-6 text-center font-['Montserrat'] font-bold">Full</th>
                  <th className="py-4 px-6 text-center font-['Montserrat'] font-bold">VIP</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6">Number of Creators</td>
                  <td className="py-4 px-6 text-center">1</td>
                  <td className="py-4 px-6 text-center">5-10</td>
                  <td className="py-4 px-6 text-center">100+</td>
                  <td className="py-4 px-6 text-center">100+</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6">HD Content Library</td>
                  <td className="py-4 px-6 text-center text-[#FFD700]">✓</td>
                  <td className="py-4 px-6 text-center text-[#FFD700]">✓</td>
                  <td className="py-4 px-6 text-center text-[#FFD700]">✓</td>
                  <td className="py-4 px-6 text-center text-[#FFD700]">✓</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6">Direct Messaging</td>
                  <td className="py-4 px-6 text-center text-[#FFD700]">✓</td>
                  <td className="py-4 px-6 text-center text-[#FFD700]">✓</td>
                  <td className="py-4 px-6 text-center text-[#FFD700]">✓</td>
                  <td className="py-4 px-6 text-center text-[#FFD700]">✓</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6">Exclusive Events</td>
                  <td className="py-4 px-6 text-center text-gray-600">--</td>
                  <td className="py-4 px-6 text-center text-gray-600">--</td>
                  <td className="py-4 px-6 text-center text-[#FFD700]">✓</td>
                  <td className="py-4 px-6 text-center text-[#FFD700]">✓</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6">1-on-1 Video Calls</td>
                  <td className="py-4 px-6 text-center text-gray-600">--</td>
                  <td className="py-4 px-6 text-center text-gray-600">--</td>
                  <td className="py-4 px-6 text-center text-gray-600">--</td>
                  <td className="py-4 px-6 text-center text-[#FFD700]">✓</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-6">Custom Content Requests</td>
                  <td className="py-4 px-6 text-center text-gray-600">--</td>
                  <td className="py-4 px-6 text-center text-gray-600">--</td>
                  <td className="py-4 px-6 text-center text-gray-600">--</td>
                  <td className="py-4 px-6 text-center text-[#FFD700]">✓</td>
                </tr>
                <tr>
                  <td className="py-4 px-6">Account Manager</td>
                  <td className="py-4 px-6 text-center text-gray-600">--</td>
                  <td className="py-4 px-6 text-center text-gray-600">--</td>
                  <td className="py-4 px-6 text-center text-gray-600">--</td>
                  <td className="py-4 px-6 text-center text-[#FFD700]">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4">
          <h2 className="font-['Playfair_Display'] text-4xl font-bold text-center mb-12">
            Frequently Asked <span className="text-[#FFD700]">Questions</span>
          </h2>

          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="bg-white/5 border border-white/10 p-6">
              <h3 className="font-bold text-lg mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-400">
                Yes! All subscriptions are month-to-month with no long-term commitment.
                Cancel anytime from your account settings.
              </p>
            </Card>

            <Card className="bg-white/5 border border-white/10 p-6">
              <h3 className="font-bold text-lg mb-2">How does billing work?</h3>
              <p className="text-gray-400">
                You'll be charged monthly on the date you subscribe. All payments are
                processed securely through Stripe. Billing is discreet.
              </p>
            </Card>

            <Card className="bg-white/5 border border-white/10 p-6">
              <h3 className="font-bold text-lg mb-2">Can I upgrade or downgrade?</h3>
              <p className="text-gray-400">
                Yes! You can change your plan at any time. Upgrades take effect immediately,
                and downgrades take effect at the end of your current billing period.
              </p>
            </Card>

            <Card className="bg-white/5 border border-white/10 p-6">
              <h3 className="font-bold text-lg mb-2">Is my payment information secure?</h3>
              <p className="text-gray-400">
                Absolutely. We use Stripe for payment processing, which is PCI-DSS compliant
                and trusted by millions of businesses worldwide. We never store your card details.
              </p>
            </Card>

            <Card className="bg-white/5 border border-white/10 p-6">
              <h3 className="font-bold text-lg mb-2">What devices can I use?</h3>
              <p className="text-gray-400">
                Access your subscription on any device - desktop, mobile, or tablet.
                Stream or download content for offline viewing.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-b from-black to-gray-900">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold mb-6">
            Ready to Experience <span className="text-[#FFD700]">The Greatest Show</span>?
          </h2>
          <p className="font-['Inter'] text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Join thousands of subscribers getting exclusive content from the world's elite creators
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            {tiers.slice(1, 3).map((tier) => (
              <Button
                key={tier.id}
                onClick={() => handleSubscribe(tier)}
                className="font-bold px-8 py-6 text-lg rounded-full transition-all hover:scale-105"
                style={{
                  backgroundColor: tier.color,
                  color: tier.id === "full" ? "#000" : "#FFF",
                }}
              >
                {tier.name} - ${tier.price}/mo
              </Button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
