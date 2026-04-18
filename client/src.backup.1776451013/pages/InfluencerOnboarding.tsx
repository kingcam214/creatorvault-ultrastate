/**
 * 🌟 INFLUENCER/CELEBRITY ONBOARDING
 * 
 * VaultLive-first activation path for high-value creators
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Video, DollarSign, Users, TrendingUp, Sparkles } from "lucide-react";

export default function InfluencerOnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    instagram: "",
    tiktok: "",
    youtube: "",
    followers: "",
    contentType: "",
    goals: "",
  });

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your influencer profile has been set up successfully!",
      });
      if (step === 3) {
        // Final step - redirect to VaultLive
        setLocation("/vault-live");
      } else {
        setStep(step + 1);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      // Basic info validation
      if (!formData.name || !formData.email) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Social profiles validation
      if (!formData.instagram && !formData.tiktok && !formData.youtube) {
        toast({
          title: "Social Profiles Required",
          description: "Please add at least one social media profile",
          variant: "destructive",
        });
        return;
      }
      setStep(3);
    } else if (step === 3) {
      // Final submission
      updateProfileMutation.mutate({
        name: formData.name,
        email: formData.email,
        role: "influencer", // Upgrade to influencer role
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900">
      <div className="container max-w-4xl py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-pink-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Welcome to VaultLive
            </h1>
            <Sparkles className="h-8 w-8 text-purple-500" />
          </div>
          <p className="text-xl text-gray-300">
            The creator platform built for influencers and celebrities
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center gap-4 mb-12">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                s === step
                  ? "border-pink-500 bg-pink-500/20 text-pink-500"
                  : s < step
                  ? "border-green-500 bg-green-500/20 text-green-500"
                  : "border-gray-600 bg-gray-800/50 text-gray-500"
              }`}
            >
              {s < step ? "✓" : s}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Card className="bg-black/40 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Let's Get Started</CardTitle>
              <CardDescription className="text-gray-400">
                Tell us a bit about yourself
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-white">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your name"
                    className="bg-black/50 border-purple-500/30 text-white"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-white">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    className="bg-black/50 border-purple-500/30 text-white"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="contentType" className="text-white">Content Type</Label>
                  <Input
                    id="contentType"
                    value={formData.contentType}
                    onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                    placeholder="e.g., Lifestyle, Gaming, Music, Comedy"
                    className="bg-black/50 border-purple-500/30 text-white"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  Continue
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Social Profiles */}
        {step === 2 && (
          <Card className="bg-black/40 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Connect Your Platforms</CardTitle>
              <CardDescription className="text-gray-400">
                Add your social media profiles (at least one required)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="instagram" className="text-white">Instagram Handle</Label>
                  <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="@yourhandle"
                    className="bg-black/50 border-purple-500/30 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="tiktok" className="text-white">TikTok Handle</Label>
                  <Input
                    id="tiktok"
                    value={formData.tiktok}
                    onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                    placeholder="@yourhandle"
                    className="bg-black/50 border-purple-500/30 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="youtube" className="text-white">YouTube Channel</Label>
                  <Input
                    id="youtube"
                    value={formData.youtube}
                    onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                    placeholder="Channel name or URL"
                    className="bg-black/50 border-purple-500/30 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="followers" className="text-white">Total Followers (Approximate)</Label>
                  <Input
                    id="followers"
                    value={formData.followers}
                    onChange={(e) => setFormData({ ...formData, followers: e.target.value })}
                    placeholder="e.g., 100K, 1M, 5M+"
                    className="bg-black/50 border-purple-500/30 text-white"
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 border-purple-500/30 text-white hover:bg-purple-500/10"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    Continue
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: VaultLive Benefits */}
        {step === 3 && (
          <Card className="bg-black/40 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Why VaultLive?</CardTitle>
              <CardDescription className="text-gray-400">
                Built specifically for creators like you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 mb-8">
                {/* Benefit 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">85% Revenue Share</h3>
                    <p className="text-gray-400">
                      Keep 85% of all tips and donations. We only take 15% - the lowest in the industry.
                    </p>
                  </div>
                </div>

                {/* Benefit 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                    <Video className="h-6 w-6 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">WebRTC Live Streaming</h3>
                    <p className="text-gray-400">
                      Crystal-clear peer-to-peer streaming with no delays. Your fans see you in real-time.
                    </p>
                  </div>
                </div>

                {/* Benefit 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Users className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Direct Fan Connection</h3>
                    <p className="text-gray-400">
                      No middlemen. Your fans tip you directly during streams. Instant monetization.
                    </p>
                  </div>
                </div>

                {/* Benefit 4 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Real-Time Analytics</h3>
                    <p className="text-gray-400">
                      Track viewer count, revenue, and engagement metrics as you stream.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="goals" className="text-white">What are your streaming goals?</Label>
                  <Textarea
                    id="goals"
                    value={formData.goals}
                    onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                    placeholder="Tell us what you want to achieve with VaultLive..."
                    className="bg-black/50 border-purple-500/30 text-white min-h-[100px]"
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1 border-purple-500/30 text-white hover:bg-purple-500/10"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {updateProfileMutation.isPending ? "Setting up..." : "Start Streaming →"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-400 text-sm">
          <p>Already have an account? <a href="/" className="text-purple-400 hover:text-purple-300">Sign in</a></p>
        </div>
      </div>
    </div>
  );
}
