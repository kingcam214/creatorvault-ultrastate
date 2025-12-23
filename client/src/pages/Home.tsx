import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Home() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("en");
  const [referralSource, setReferralSource] = useState("");
  const [interestedIn, setInterestedIn] = useState<string[]>([]);

  const signupMutation = trpc.waitlist.signup.useMutation({
    onSuccess: () => {
      toast.success("You've been added to the waitlist. We'll be in touch soon!");
      setEmail("");
      setName("");
      setPhone("");
      setCountry("");
      setReferralSource("");
      setInterestedIn([]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signupMutation.mutate({
      email,
      name: name || undefined,
      phone: phone || undefined,
      country: country || undefined,
      language,
      referralSource: referralSource || undefined,
      interestedIn: interestedIn.length > 0 ? interestedIn : undefined,
    });
  };

  const toggleInterest = (interest: string) => {
    setInterestedIn(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            CreatorVault <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">ULTRASTATE</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            The ultimate creator economy platform. Monetize your content, build your brand, and connect with your audience across cultures.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Button asChild size="lg" className="bg-white text-purple-900 hover:bg-gray-100">
              <Link href="/marketplace">Browse Marketplace</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <Link href="/university">Explore Courses</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <Link href="/services">View Services</Link>
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Button asChild size="lg" variant="secondary" className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600">
              <Link href="/creator">Creator Dashboard</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600">
              <Link href="/ai-bot">🤖 AI Assistant</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white hover:from-indigo-600 hover:to-blue-600">
              <Link href="/command-hub">⚡ Command Hub</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="bg-gradient-to-r from-green-500 to-teal-500 text-white hover:from-green-600 hover:to-teal-600">
              <Link href="/creator-tools">🎨 Creator Tools</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600">
              <Link href="/adult-sales-bot">💬 Adult Sales Bot</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="bg-gradient-to-r from-slate-700 to-purple-700 text-white hover:from-slate-800 hover:to-purple-800 border-2 border-purple-500">
              <Link href="/owner-control">🛡️ Owner Control</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
            <CardHeader>
              <CardTitle className="text-2xl">🎬 AI Video Generation</CardTitle>
              <CardDescription className="text-gray-300">
                Transform images into stunning videos with our advanced AI technology
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
            <CardHeader>
              <CardTitle className="text-2xl">🌍 Cultural Intelligence</CardTitle>
              <CardDescription className="text-gray-300">
                Reach global audiences with multi-language support and cultural adaptation
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
            <CardHeader>
              <CardTitle className="text-2xl">💰 Creator Monetization</CardTitle>
              <CardDescription className="text-gray-300">
                Earn from your content with integrated payments and analytics
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Waitlist Signup Form */}
        <Card className="max-w-2xl mx-auto bg-white/95 backdrop-blur-lg">
          <CardHeader>
            <CardTitle className="text-3xl text-center">Join the Waitlist</CardTitle>
            <CardDescription className="text-center text-lg">
              Be among the first to experience the future of creator economy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    type="text"
                    placeholder="United States"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Preferred Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="ht">Kreyòl Ayisyen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referral">How did you hear about us?</Label>
                <Input
                  id="referral"
                  type="text"
                  placeholder="Social media, friend, etc."
                  value={referralSource}
                  onChange={(e) => setReferralSource(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label>I'm interested in:</Label>
                <div className="space-y-2">
                  {[
                    { id: "creating", label: "Creating Content" },
                    { id: "consuming", label: "Consuming Content" },
                    { id: "video-gen", label: "AI Video Generation" },
                    { id: "monetization", label: "Monetization Tools" },
                  ].map((interest) => (
                    <div key={interest.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={interest.id}
                        checked={interestedIn.includes(interest.id)}
                        onCheckedChange={() => toggleInterest(interest.id)}
                      />
                      <Label htmlFor={interest.id} className="cursor-pointer font-normal">
                        {interest.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg py-6"
                disabled={signupMutation.isPending}
              >
                {signupMutation.isPending ? "Joining..." : "Join Waitlist"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-300">
          <p className="text-sm">
            © 2024 CreatorVault ULTRASTATE. Built with passion for creators worldwide.
          </p>
        </div>
      </div>
    </div>
  );
}
