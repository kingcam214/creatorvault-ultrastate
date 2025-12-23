/**
 * Creator Onboarding Page
 * 
 * Allows new users to select role, set up profile, configure payment methods,
 * and activate Adult Sales Bot.
 */

import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Onboard() {
  const [, setLocation] = useLocation();
  
  // Role selection
  const [role, setRole] = useState<"creator" | "user">("creator");
  
  // Profile fields
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("en");
  
  // Payment methods
  const [cashappHandle, setCashappHandle] = useState("");
  const [zelleEmail, setZelleEmail] = useState("");
  const [applepayPhone, setApplepayPhone] = useState("");
  
  // Adult Sales Bot config
  const [enableAdultSalesBot, setEnableAdultSalesBot] = useState(false);
  const [minPhotoPrice, setMinPhotoPrice] = useState("15");
  const [minVideoPrice, setMinVideoPrice] = useState("25");
  const [minCustomPrice, setMinCustomPrice] = useState("50");
  
  const onboardMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully! Welcome to CreatorVault.");
      setLocation("/creator");
    },
    onError: (error: { message: string }) => {
      toast.error(`Onboarding failed: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    onboardMutation.mutate({
      name: name.trim(),
      role,
      language,
      country: country || undefined,
      // Store additional data as JSON in a metadata field if available
      // For now, we'll just update basic profile fields
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 py-8">
      <div className="container mx-auto max-w-3xl">
        <Card className="bg-purple-950/50 border-purple-700">
          <CardHeader>
            <CardTitle className="text-3xl text-white">Welcome to CreatorVault</CardTitle>
            <CardDescription className="text-purple-200">
              Complete your profile to start monetizing your content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-white">I am a:</Label>
                <Select value={role} onValueChange={(value) => setRole(value as "creator" | "user")}>
                  <SelectTrigger id="role" className="bg-purple-900/50 border-purple-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creator">Creator (sell content, earn commissions)</SelectItem>
                    <SelectItem value="user">Recruiter/Ambassador (refer creators, earn 20%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Basic Profile */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white">Profile Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white">Display Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name or stage name"
                    className="bg-purple-900/50 border-purple-700 text-white placeholder:text-purple-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-white">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="bg-purple-900/50 border-purple-700 text-white placeholder:text-purple-400"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-white">Country</Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="United States"
                      className="bg-purple-900/50 border-purple-700 text-white placeholder:text-purple-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language" className="text-white">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger id="language" className="bg-purple-900/50 border-purple-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="ht">Kreyòl Ayisyen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Payment Methods (Creator only) */}
              {role === "creator" && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">Payment Methods</h3>
                  <p className="text-sm text-purple-200">
                    Add at least one payment method to receive earnings
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="cashapp" className="text-white">CashApp Handle</Label>
                    <Input
                      id="cashapp"
                      value={cashappHandle}
                      onChange={(e) => setCashappHandle(e.target.value)}
                      placeholder="$yourcashapp"
                      className="bg-purple-900/50 border-purple-700 text-white placeholder:text-purple-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zelle" className="text-white">Zelle Email</Label>
                    <Input
                      id="zelle"
                      type="email"
                      value={zelleEmail}
                      onChange={(e) => setZelleEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="bg-purple-900/50 border-purple-700 text-white placeholder:text-purple-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="applepay" className="text-white">Apple Pay Phone</Label>
                    <Input
                      id="applepay"
                      type="tel"
                      value={applepayPhone}
                      onChange={(e) => setApplepayPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="bg-purple-900/50 border-purple-700 text-white placeholder:text-purple-400"
                    />
                  </div>
                </div>
              )}

              {/* Adult Sales Bot (Creator only) */}
              {role === "creator" && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">Adult Sales Bot</h3>
                  <p className="text-sm text-purple-200">
                    AI-powered DM-to-revenue conversion with safety guardrails
                  </p>

                  <div className="flex items-center justify-between p-4 bg-purple-900/30 rounded-lg border border-purple-700">
                    <div>
                      <Label htmlFor="enable-bot" className="text-white font-medium">
                        Enable Adult Sales Bot
                      </Label>
                      <p className="text-sm text-purple-200">
                        Automatically handle DMs and convert to sales
                      </p>
                    </div>
                    <Switch
                      id="enable-bot"
                      checked={enableAdultSalesBot}
                      onCheckedChange={setEnableAdultSalesBot}
                    />
                  </div>

                  {enableAdultSalesBot && (
                    <div className="space-y-4 p-4 bg-purple-900/30 rounded-lg border border-purple-700">
                      <h4 className="font-medium text-white">Minimum Pricing (USD)</h4>
                      <p className="text-sm text-purple-200">
                        Set your minimum prices. Bot will not negotiate below these.
                      </p>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="min-photo" className="text-white">Photo Set</Label>
                          <Input
                            id="min-photo"
                            type="number"
                            min="10"
                            value={minPhotoPrice}
                            onChange={(e) => setMinPhotoPrice(e.target.value)}
                            className="bg-purple-900/50 border-purple-700 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="min-video" className="text-white">Video Clip</Label>
                          <Input
                            id="min-video"
                            type="number"
                            min="15"
                            value={minVideoPrice}
                            onChange={(e) => setMinVideoPrice(e.target.value)}
                            className="bg-purple-900/50 border-purple-700 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="min-custom" className="text-white">Custom</Label>
                          <Input
                            id="min-custom"
                            type="number"
                            min="30"
                            value={minCustomPrice}
                            onChange={(e) => setMinCustomPrice(e.target.value)}
                            className="bg-purple-900/50 border-purple-700 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white text-lg py-6"
                disabled={onboardMutation.isPending}
              >
                {onboardMutation.isPending ? "Setting up..." : "Complete Onboarding"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
