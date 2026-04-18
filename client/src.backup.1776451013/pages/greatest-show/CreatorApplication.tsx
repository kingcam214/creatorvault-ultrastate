import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

export default function CreatorApplication() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: "",
    email: "",
    phone: "",
    country: "",
    
    // Step 2: Creator Details
    subGroup: "",
    followerCount: "",
    instagram: "",
    tiktok: "",
    twitter: "",
    other: "",
    
    // Step 3: Portfolio
    portfolioUrl1: "",
    portfolioUrl2: "",
    portfolioUrl3: "",
    
    // Step 4: Goals & Experience
    whyJoin: "",
    incomeGoal: "",
    hoursPerWeek: "",
    hasMonetizationExperience: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    // Validation for each step
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.country) {
        toast.error("Please fill in all required fields");
        return;
      }
    } else if (step === 2) {
      if (!formData.subGroup || !formData.followerCount) {
        toast.error("Please select your sub-group and provide follower count");
        return;
      }
    } else if (step === 3) {
      if (!formData.portfolioUrl1) {
        toast.error("Please provide at least one portfolio link");
        return;
      }
    } else if (step === 4) {
      if (!formData.whyJoin || !formData.incomeGoal || !formData.hoursPerWeek) {
        toast.error("Please complete all fields");
        return;
      }
    }
    
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const submitApplication = async () => {
    // TODO: Integrate with tRPC
    toast.success("Application submitted! We'll review and contact you within 48 hours.");
    console.log("Application data:", formData);
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
              Become a <span className="text-[#FFD700]">Creator</span>
            </h1>
            <p className="font-['Inter'] text-xl text-gray-300 mb-8">
              Join the world's most elite content creator network. Earn $5K-$50K+ per month
              while maintaining full creative control.
            </p>

            {/* Progress Indicator */}
            <div className="flex justify-center items-center gap-4 mb-12">
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                      num < step
                        ? "bg-[#FFD700] text-black"
                        : num === step
                        ? "bg-[#FFD700] text-black scale-110"
                        : "bg-white/10 text-gray-500"
                    }`}
                  >
                    {num < step ? "✓" : num}
                  </div>
                  {num < 5 && (
                    <div
                      className={`w-12 h-1 ${
                        num < step ? "bg-[#FFD700]" : "bg-white/10"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="bg-white/5 border border-white/10 p-8">
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="font-['Montserrat'] text-3xl font-bold mb-6">
                    Basic Information
                  </h2>

                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="Your real name"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email Address *</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="your@email.com"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number</label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Country *</label>
                    <Input
                      value={formData.country}
                      onChange={(e) => updateField("country", e.target.value)}
                      placeholder="United States"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <Button
                    onClick={nextStep}
                    className="w-full bg-[#FFD700] hover:bg-[#E5C100] text-black font-bold py-6 text-lg"
                  >
                    Next Step →
                  </Button>
                </div>
              )}

              {/* Step 2: Creator Details */}
              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="font-['Montserrat'] text-3xl font-bold mb-6">
                    Creator Details
                  </h2>

                  <div>
                    <label className="block text-sm font-medium mb-2">Sub-Group *</label>
                    <Select value={formData.subGroup} onValueChange={(value) => updateField("subGroup", value)}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select your vertical" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fitness">💪 Fitness Lifestyle</SelectItem>
                        <SelectItem value="pole">🎪 Pole Entertainment</SelectItem>
                        <SelectItem value="lifestyle">✨ Lifestyle</SelectItem>
                        <SelectItem value="dance">💃 Elite Dance</SelectItem>
                        <SelectItem value="adult">🔥 Adult Content (18+)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Total Follower Count *</label>
                    <Input
                      type="number"
                      value={formData.followerCount}
                      onChange={(e) => updateField("followerCount", e.target.value)}
                      placeholder="10000"
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">Combined across all platforms</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Instagram Handle</label>
                    <Input
                      value={formData.instagram}
                      onChange={(e) => updateField("instagram", e.target.value)}
                      placeholder="@yourhandle"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">TikTok Handle</label>
                    <Input
                      value={formData.tiktok}
                      onChange={(e) => updateField("tiktok", e.target.value)}
                      placeholder="@yourhandle"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Twitter/X Handle</label>
                    <Input
                      value={formData.twitter}
                      onChange={(e) => updateField("twitter", e.target.value)}
                      placeholder="@yourhandle"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Other Platform</label>
                    <Input
                      value={formData.other}
                      onChange={(e) => updateField("other", e.target.value)}
                      placeholder="YouTube, OnlyFans, etc."
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={prevStep}
                      variant="outline"
                      className="flex-1 border-white/20 text-white hover:bg-white/10 py-6"
                    >
                      ← Back
                    </Button>
                    <Button
                      onClick={nextStep}
                      className="flex-1 bg-[#FFD700] hover:bg-[#E5C100] text-black font-bold py-6"
                    >
                      Next Step →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Portfolio */}
              {step === 3 && (
                <div className="space-y-6">
                  <h2 className="font-['Montserrat'] text-3xl font-bold mb-6">
                    Portfolio
                  </h2>

                  <p className="text-gray-400 mb-6">
                    Provide links to your best content. This helps us assess your content quality and style.
                  </p>

                  <div>
                    <label className="block text-sm font-medium mb-2">Portfolio Link 1 *</label>
                    <Input
                      value={formData.portfolioUrl1}
                      onChange={(e) => updateField("portfolioUrl1", e.target.value)}
                      placeholder="https://instagram.com/p/..."
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Portfolio Link 2</label>
                    <Input
                      value={formData.portfolioUrl2}
                      onChange={(e) => updateField("portfolioUrl2", e.target.value)}
                      placeholder="https://tiktok.com/@..."
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Portfolio Link 3</label>
                    <Input
                      value={formData.portfolioUrl3}
                      onChange={(e) => updateField("portfolioUrl3", e.target.value)}
                      placeholder="https://..."
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={prevStep}
                      variant="outline"
                      className="flex-1 border-white/20 text-white hover:bg-white/10 py-6"
                    >
                      ← Back
                    </Button>
                    <Button
                      onClick={nextStep}
                      className="flex-1 bg-[#FFD700] hover:bg-[#E5C100] text-black font-bold py-6"
                    >
                      Next Step →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Goals & Experience */}
              {step === 4 && (
                <div className="space-y-6">
                  <h2 className="font-['Montserrat'] text-3xl font-bold mb-6">
                    Goals & Experience
                  </h2>

                  <div>
                    <label className="block text-sm font-medium mb-2">Why do you want to join? *</label>
                    <Textarea
                      value={formData.whyJoin}
                      onChange={(e) => updateField("whyJoin", e.target.value)}
                      placeholder="Tell us about your goals, what makes you unique, and why you'd be a great fit for The Greatest Show..."
                      rows={6}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Monthly Income Goal *</label>
                    <Select value={formData.incomeGoal} onValueChange={(value) => updateField("incomeGoal", value)}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select your target" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1k-5k">$1,000 - $5,000</SelectItem>
                        <SelectItem value="5k-10k">$5,000 - $10,000</SelectItem>
                        <SelectItem value="10k-25k">$10,000 - $25,000</SelectItem>
                        <SelectItem value="25k-50k">$25,000 - $50,000</SelectItem>
                        <SelectItem value="50k+">$50,000+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Hours per week you can dedicate *</label>
                    <Select value={formData.hoursPerWeek} onValueChange={(value) => updateField("hoursPerWeek", value)}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select hours" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5-10">5-10 hours</SelectItem>
                        <SelectItem value="10-20">10-20 hours</SelectItem>
                        <SelectItem value="20-30">20-30 hours</SelectItem>
                        <SelectItem value="30-40">30-40 hours</SelectItem>
                        <SelectItem value="40+">40+ hours (Full-time)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Do you have content monetization experience? *
                    </label>
                    <Select value={formData.hasMonetizationExperience} onValueChange={(value) => updateField("hasMonetizationExperience", value)}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes - I've monetized content before</SelectItem>
                        <SelectItem value="no">No - This would be my first time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={prevStep}
                      variant="outline"
                      className="flex-1 border-white/20 text-white hover:bg-white/10 py-6"
                    >
                      ← Back
                    </Button>
                    <Button
                      onClick={nextStep}
                      className="flex-1 bg-[#FFD700] hover:bg-[#E5C100] text-black font-bold py-6"
                    >
                      Review Application →
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 5: Review & Submit */}
              {step === 5 && (
                <div className="space-y-6">
                  <h2 className="font-['Montserrat'] text-3xl font-bold mb-6">
                    Review Your Application
                  </h2>

                  <div className="space-y-4 bg-white/5 p-6 rounded-lg">
                    <div>
                      <h3 className="font-bold text-[#FFD700] mb-2">Basic Information</h3>
                      <p><strong>Name:</strong> {formData.name}</p>
                      <p><strong>Email:</strong> {formData.email}</p>
                      <p><strong>Country:</strong> {formData.country}</p>
                    </div>

                    <div>
                      <h3 className="font-bold text-[#FFD700] mb-2">Creator Details</h3>
                      <p><strong>Sub-Group:</strong> {formData.subGroup}</p>
                      <p><strong>Followers:</strong> {formData.followerCount}</p>
                      <p><strong>Instagram:</strong> {formData.instagram || "Not provided"}</p>
                    </div>

                    <div>
                      <h3 className="font-bold text-[#FFD700] mb-2">Goals</h3>
                      <p><strong>Income Goal:</strong> {formData.incomeGoal}</p>
                      <p><strong>Hours/Week:</strong> {formData.hoursPerWeek}</p>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                    <h3 className="font-bold mb-2">What Happens Next?</h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li>✓ Our team will review your application within 48 hours</li>
                      <li>✓ We'll assess your content quality using AI scoring</li>
                      <li>✓ If approved, you'll receive an onboarding email</li>
                      <li>✓ You'll get access to our creator dashboard and training</li>
                      <li>✓ Start earning within 7 days of approval</li>
                    </ul>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={prevStep}
                      variant="outline"
                      className="flex-1 border-white/20 text-white hover:bg-white/10 py-6"
                    >
                      ← Back
                    </Button>
                    <Button
                      onClick={submitApplication}
                      className="flex-1 bg-[#FFD700] hover:bg-[#E5C100] text-black font-bold py-6 text-lg"
                    >
                      Submit Application 🚀
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="font-['Playfair_Display'] text-4xl font-bold text-center mb-12">
            Why Join <span className="text-[#FFD700]">The Greatest Show</span>?
          </h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="bg-white/5 border border-white/10 p-8 text-center">
              <div className="text-5xl mb-4">💰</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-[#FFD700]">
                High Earnings
              </h3>
              <p className="text-gray-400">
                Top creators earn $25K-$100K+ per month with our premium subscription model
              </p>
            </Card>

            <Card className="bg-white/5 border border-white/10 p-8 text-center">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-[#FFD700]">
                Full Support
              </h3>
              <p className="text-gray-400">
                Marketing, content strategy, technical support, and growth coaching included
              </p>
            </Card>

            <Card className="bg-white/5 border border-white/10 p-8 text-center">
              <div className="text-5xl mb-4">👑</div>
              <h3 className="font-['Montserrat'] text-xl font-bold mb-3 text-[#FFD700]">
                Elite Network
              </h3>
              <p className="text-gray-400">
                Join the most exclusive creator community with top-tier talent and opportunities
              </p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
