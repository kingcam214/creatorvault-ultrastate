import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Sparkles, DollarSign, Zap, Users } from "lucide-react";

export default function Waitlist() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [creatorType, setCreatorType] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const joinWaitlist = trpc.waitlist.join.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("You're on the list! We'll notify you when we launch.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !creatorType) {
      toast.error("Please fill in all fields");
      return;
    }

    joinWaitlist.mutate({ name, email, creatorType });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-700 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-black/40 border-white/20 backdrop-blur">
          <CardContent className="pt-12 pb-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-500/20 p-4">
                <CheckCircle2 className="h-12 w-12 text-green-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">You're In!</h2>
              <p className="text-gray-300">
                We'll email you at <span className="text-purple-300 font-semibold">{email}</span> when CreatorVault launches.
              </p>
            </div>
            <div className="pt-4 space-y-2">
              <p className="text-sm text-gray-400">
                Want to learn more? Check out our demo videos:
              </p>
              <Button 
                onClick={() => window.location.href = '/demos'}
                variant="outline"
                className="w-full border-purple-400 text-purple-300 hover:bg-purple-500/20"
              >
                Watch Demos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-700">
      {/* Hero Section */}
      <div className="container max-w-6xl py-12 md:py-24 space-y-12">
        <div className="text-center space-y-6">
          <div className="inline-block">
            <div className="flex items-center gap-2 bg-purple-500/20 backdrop-blur px-4 py-2 rounded-full border border-purple-400/30">
              <Sparkles className="h-4 w-4 text-purple-300" />
              <span className="text-sm font-medium text-purple-200">Coming Soon</span>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
            CreatorVault
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300">
              ULTRASTATE
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto">
            The Platform Where Creators Keep <span className="text-purple-300 font-bold">85%</span>
          </p>
          
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            No Twitch. No YouTube. No OnlyFans taking 50%. This is YOUR platform. Built by a creator, for creators.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 pt-8">
          <Card className="bg-black/40 border-purple-400/30 backdrop-blur">
            <CardHeader>
              <DollarSign className="h-8 w-8 text-green-400 mb-2" />
              <CardTitle className="text-white">Keep 85%</CardTitle>
              <CardDescription className="text-gray-300">
                VaultLive streaming with the highest creator split in the industry
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-black/40 border-purple-400/30 backdrop-blur">
            <CardHeader>
              <Zap className="h-8 w-8 text-yellow-400 mb-2" />
              <CardTitle className="text-white">Instant Payouts</CardTitle>
              <CardDescription className="text-gray-300">
                Cash App, PayPal, Zelle - get paid your way, fast
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-black/40 border-purple-400/30 backdrop-blur">
            <CardHeader>
              <Users className="h-8 w-8 text-blue-400 mb-2" />
              <CardTitle className="text-white">Your Community</CardTitle>
              <CardDescription className="text-gray-300">
                Subscriptions, marketplace, podcast studio - all in one place
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Waitlist Form */}
        <Card className="max-w-xl mx-auto bg-black/60 border-white/20 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-white text-center">Join the Waitlist</CardTitle>
            <CardDescription className="text-gray-300 text-center">
              Be the first to know when we launch. Limited spots available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-200">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-200">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creator-type" className="text-gray-200">I'm a...</Label>
                <Select value={creatorType} onValueChange={setCreatorType}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select creator type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="streamer">Streamer</SelectItem>
                    <SelectItem value="podcaster">Podcaster</SelectItem>
                    <SelectItem value="influencer">Influencer</SelectItem>
                    <SelectItem value="adult_creator">Adult Creator</SelectItem>
                    <SelectItem value="artist">Artist/Musician</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
                disabled={joinWaitlist.isPending}
              >
                {joinWaitlist.isPending ? "Joining..." : "Join Waitlist"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Social Proof */}
        <div className="text-center space-y-4 pt-8">
          <p className="text-gray-300">
            Want to see what we're building?
          </p>
          <Button 
            onClick={() => window.location.href = '/demos'}
            variant="outline"
            size="lg"
            className="border-purple-400 text-purple-300 hover:bg-purple-500/20"
          >
            Watch Demo Videos
          </Button>
        </div>
      </div>
    </div>
  );
}
