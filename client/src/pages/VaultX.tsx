/**
 * ============================================================================
 * VAULTX — THE UNCENSORED SOCIAL ECONOMY
 * ============================================================================
 * First non-censoring platform and social economy for adult creators.
 * Tabs: Discover | My Profile | Monetize | Telegram | X.com | Earnings
 * ============================================================================
 */
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Shield, Lock, Flame, Star, TrendingUp, DollarSign, Users,
  Award, BarChart2, Settings, Zap, Eye, Heart, MessageCircle,
  Send, ExternalLink, Copy, CheckCircle, AlertTriangle,
  Instagram, Twitter, Bell, Crown, Sparkles, Play, Image,
  CreditCard, Gift, Unlock, Plus, ChevronRight, Globe,
  Camera, Video, FileText, Hash, AtSign, Link2, Bot,
  Layers, Radio, ShoppingBag, Wallet, ArrowUpRight
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================
interface VaultXCreator {
  id: string;
  creator_id: number;
  display_name: string;
  bio: string;
  profile_banner_url: string;
  categories: string[];
  content_style: string;
  base_subscription_price: number;
  total_subscribers: number;
  total_posts: number;
  total_revenue: number;
  tier: "emerging" | "rising" | "established" | "elite" | "legend";
  is_featured: boolean;
  ppv_enabled: boolean;
  tips_enabled: boolean;
  custom_requests_enabled: boolean;
}

// ============================================================================
// TIER CONFIG
// ============================================================================
const TIER_CONFIG = {
  emerging: { color: "#9CA3AF", label: "Emerging", icon: "⭐" },
  rising: { color: "#60A5FA", label: "Rising", icon: "🔥" },
  established: { color: "#A78BFA", label: "Established", icon: "💎" },
  elite: { color: "#F59E0B", label: "Elite", icon: "👑" },
  legend: { color: "#EF4444", label: "Legend", icon: "⚡" },
};

// ============================================================================
// AGE GATE
// ============================================================================
function AgeGate({ onVerified }: { onVerified: () => void }) {
  const [dob, setDob] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  const verify = trpc.vaultx.submitAgeVerification.useMutation({
    onSuccess: () => { toast.success("Welcome to VaultX."); onVerified(); },
    onError: (e) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!confirmed) return setError("You must confirm you are 18 or older.");
    if (!dob) return setError("Please enter your date of birth.");
    verify.mutate({ dateOfBirth: dob, confirmOver18: confirmed });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0a0a0a] from-red-500 to-orange-500 flex items-center justify-center">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <div className="text-3xl font-black text-white tracking-tight">VaultX</div>
              <div className="text-xs text-red-400 font-semibold uppercase tracking-widest">Uncensored Social Economy</div>
            </div>
          </div>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            The first platform built exclusively for adult creators. No censorship. No shadowbans. Just revenue.
          </p>
        </div>

        {/* Warning */}
        <div className="border border-red-900/50 bg-red-950/30 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-red-300 font-semibold text-sm mb-1">Adults Only — 18+</div>
              <div className="text-gray-400 text-xs leading-relaxed">
                VaultX contains explicit adult content. By entering, you confirm you are 18 years of age or older and consent to viewing adult material. This content is legal in your jurisdiction.
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-2">Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <div
              onClick={() => setConfirmed(!confirmed)}
              className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center cursor-pointer transition-colors ${confirmed ? "bg-red-500 border-red-500" : "border-gray-600"}`}
            >
              {confirmed && <CheckCircle className="w-3 h-3 text-white" />}
            </div>
            <span className="text-gray-400 text-sm">
              I confirm I am 18 years of age or older and consent to viewing adult content.
            </span>
          </label>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={verify.isPending}
            className="w-full bg-[#0a0a0a] from-red-500 to-orange-500 text-white font-bold py-4 rounded-xl text-sm uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {verify.isPending ? "Verifying..." : "Enter VaultX →"}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          By entering, you agree to VaultX Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// CREATOR CARD
// ============================================================================
function CreatorCard({ creator, onClick }: { creator: any; onClick: () => void }) {
  const tier = TIER_CONFIG[creator.tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.emerging;
  return (
    <div
      onClick={onClick}
      className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden cursor-pointer hover:border-red-500/50 hover:bg-gray-900 transition-all group"
    >
      {/* Banner */}
      <div className="h-24 bg-[#0a0a0a] from-red-900/40 to-orange-900/40 relative overflow-hidden">
        {creator.profile_banner_url && (
          <img src={creator.profile_banner_url} alt="" className="w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-[#0a0a0a] from-gray-900 to-transparent" />
        {creator.is_featured && (
          <div className="absolute top-2 right-2 bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">FEATURED</div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 -mt-6 relative">
        <div className="flex items-end justify-between mb-3">
          <div className="w-12 h-12 rounded-xl bg-[#0a0a0a] from-red-500 to-orange-500 flex items-center justify-center text-white font-black text-lg border-2 border-gray-900">
            {creator.display_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="text-xs font-bold px-2 py-1 rounded-full" style={{ color: tier.color, backgroundColor: `${tier.color}20` }}>
            {tier.icon} {tier.label}
          </div>
        </div>

        <div className="font-bold text-white text-sm mb-1">{creator.display_name}</div>
        <div className="text-gray-500 text-xs line-clamp-2 mb-3">{creator.bio || "Adult content creator"}</div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{creator.total_subscribers || 0}</span>
            <span className="flex items-center gap-1"><Image className="w-3 h-3" />{creator.total_posts || 0}</span>
          </div>
          <div className="text-red-400 font-bold text-sm">
            ${creator.base_subscription_price || "—"}<span className="text-gray-600 font-normal text-xs">/mo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DISCOVER TAB
// ============================================================================

// ============================================================================
// STRIPE PAYMENT MODAL — Real card input via Stripe Elements
// ============================================================================
function StripePaymentForm({
  clientSecret,
  intentId,
  amountCents,
  label,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  intentId: string;
  amountCents: number;
  label: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    const cardEl = elements.getElement(CardElement);
    if (!cardEl) return;
    setLoading(true);
    setCardError(null);
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardEl },
      });
      if (error) throw new Error(error.message);
      if (paymentIntent?.status !== "succeeded") throw new Error("Payment did not complete");
      onSuccess();
    } catch (e: any) {
      setCardError(e.message || "Payment failed");
      onError(e.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-gray-400 text-xs mb-3 font-semibold uppercase tracking-wider">Card Details</p>
        <CardElement
          options={{
            style: {
              base: { color: "#fff", fontSize: "16px", "::placeholder": { color: "#6B7280" } },
              invalid: { color: "#EF4444" },
            },
          }}
        />
      </div>
      {cardError && <p className="text-red-400 text-sm">{cardError}</p>}
      <button
        onClick={handlePay}
        disabled={loading || !stripe}
        className="w-full py-3 rounded-xl font-black text-white text-sm transition-opacity"
        style={{
          background: loading ? "rgba(239,68,68,0.3)" : "linear-gradient(135deg, #EF4444, #F97316)",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Processing..." : `Pay $${(amountCents / 100).toFixed(2)} — ${label}`}
      </button>
    </div>
  );
}

function StripePaymentModal({
  clientSecret,
  intentId,
  amountCents,
  label,
  onSuccess,
  onClose,
}: {
  clientSecret: string;
  intentId: string;
  amountCents: number;
  label: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="bg-gray-950 border border-red-900/40 rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <h2 className="text-xl font-black text-white">{label}</h2>
          <p className="text-3xl font-black text-red-400 mt-2">${(amountCents / 100).toFixed(2)}</p>
        </div>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <StripePaymentForm
            clientSecret={clientSecret}
            intentId={intentId}
            amountCents={amountCents}
            label={label}
            onSuccess={onSuccess}
            onError={(msg) => toast.error(msg)}
          />
        </Elements>
        <button
          onClick={onClose}
          className="w-full mt-3 py-2 text-gray-500 text-sm hover:text-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// TIP MODAL
// ============================================================================
function TipModal({ creator, onClose }: { creator: any; onClose: () => void }) {
  const [amount, setAmount] = useState(5);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"input" | "pay">("input");
  const [intentData, setIntentData] = useState<{ clientSecret: string; intentId: string; amountCents: number } | null>(null);
  const createTipIntent = trpc.vaultx.createTipIntent.useMutation();
  const confirmTip = trpc.vaultx.confirmTip.useMutation();

  const handleCreateIntent = async () => {
    try {
      const result = await createTipIntent.mutateAsync({
        creatorId: creator.creator_id,
        amountCents: Math.round(amount * 100),
        message: message || undefined,
      });
      setIntentData({ clientSecret: result.clientSecret!, intentId: result.intentId, amountCents: result.amountCents });
      setStep("pay");
    } catch (e: any) {
      toast.error(e.message || "Failed to create tip");
    }
  };

  const handleTipSuccess = async () => {
    if (!intentData) return;
    try {
      await confirmTip.mutateAsync({ intentId: intentData.intentId });
      toast.success(`Tip sent to ${creator.display_name}!`);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to confirm tip");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="bg-gray-950 border border-pink-900/40 rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-black text-white mb-6 text-center">Send a Tip to {creator.display_name}</h2>
        {step === "input" ? (
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider font-semibold">Amount</p>
              <div className="flex gap-2 flex-wrap">
                {[1, 5, 10, 20, 50, 100].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v)}
                    className="px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                    style={{
                      background: amount === v ? "#EC4899" : "rgba(255,255,255,0.05)",
                      color: amount === v ? "white" : "#9CA3AF",
                      border: `1px solid ${amount === v ? "#EC4899" : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    ${v}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                max={1000}
                value={amount}
                onChange={(e) => setAmount(Math.max(1, Math.min(1000, Number(e.target.value))))}
                className="w-full mt-3 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500"
                placeholder="Custom amount"
              />
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider font-semibold">Message (optional)</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500 resize-none"
                placeholder="Leave a message..."
              />
            </div>
            <button
              onClick={handleCreateIntent}
              disabled={createTipIntent.isPending}
              className="w-full py-3 rounded-xl font-black text-white text-sm"
              style={{ background: "linear-gradient(135deg, #EC4899, #F43F5E)" }}
            >
              {createTipIntent.isPending ? "Processing..." : `Send $${amount} Tip`}
            </button>
          </div>
        ) : intentData ? (
          <Elements stripe={stripePromise} options={{ clientSecret: intentData.clientSecret }}>
            <StripePaymentForm
              clientSecret={intentData.clientSecret}
              intentId={intentData.intentId}
              amountCents={intentData.amountCents}
              label={`Tip to ${creator.display_name}`}
              onSuccess={handleTipSuccess}
              onError={(msg) => toast.error(msg)}
            />
          </Elements>
        ) : null}
        <button onClick={onClose} className="w-full mt-3 py-2 text-gray-500 text-sm hover:text-gray-300 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

function DiscoverTab() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCreator, setSelectedCreator] = useState<any>(null);

  const { data: networkData } = trpc.vaultx.getNetwork.useQuery(
    { limit: 50, offset: 0 },
    { retry: false }
  );

  const creators = (networkData as any)?.creators || [];

  const categories = ["all", "fitness", "cosplay", "dance", "lifestyle", "art", "gaming", "music", "custom"];

  const filtered = creators.filter((c: any) => {
    const matchSearch = !search || c.display_name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === "all" || (c.categories || []).includes(selectedCategory);
    return matchSearch && matchCat;
  });

  if (selectedCreator) {
    return <CreatorProfile creator={selectedCreator} onBack={() => setSelectedCreator(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden bg-[#0a0a0a] from-red-950 via-gray-900 to-black border border-red-900/30 p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(239,68,68,0.15),_transparent_60%)]" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-5 h-5 text-red-400" />
            <span className="text-red-400 text-xs font-bold uppercase tracking-widest">The Uncensored Network</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">VaultX</h1>
          <p className="text-gray-400 text-sm max-w-md">
            The first social economy where adult creators own their audience, set their prices, and keep 85% of every dollar.
          </p>
          <div className="flex items-center gap-6 mt-5">
            <div className="text-center">
              <div className="text-2xl font-black text-white">{creators.length}</div>
              <div className="text-gray-500 text-xs">Creators</div>
            </div>
            <div className="w-px h-8 bg-gray-800" />
            <div className="text-center">
              <div className="text-2xl font-black text-white">85%</div>
              <div className="text-gray-500 text-xs">Revenue Share</div>
            </div>
            <div className="w-px h-8 bg-gray-800" />
            <div className="text-center">
              <div className="text-2xl font-black text-white">0</div>
              <div className="text-gray-500 text-xs">Censorship</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search creators..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 pl-10"
          />
          <Eye className="absolute left-3 top-3.5 w-4 h-4 text-gray-600" />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold capitalize transition-colors ${
              selectedCategory === cat
                ? "bg-red-500 text-white"
                : "bg-gray-900 text-gray-400 border border-gray-800 hover:border-red-500/50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Featured */}
      {filtered.filter((c: any) => c.is_featured).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-white font-bold text-sm">Featured Creators</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {filtered.filter((c: any) => c.is_featured).slice(0, 4).map((c: any) => (
              <CreatorCard key={c.id} creator={c} onClick={() => setSelectedCreator(c)} />
            ))}
          </div>
        </div>
      )}

      {/* All Creators */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-red-400" />
          <span className="text-white font-bold text-sm">
            {filtered.length === 0 ? "No creators yet" : `${filtered.length} Creators`}
          </span>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Flame className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <div className="font-semibold">Be the first creator on VaultX</div>
            <div className="text-sm mt-1 mb-4">Set up your profile and start earning today</div>
            <a href="/vaultx-onboarding" className="inline-block bg-[#0a0a0a] from-red-500 to-orange-500 text-white font-bold py-3 px-6 rounded-xl text-sm uppercase tracking-wider hover:opacity-90 transition-opacity">
              Join VaultX as Creator →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((c: any) => (
              <CreatorCard key={c.id} creator={c} onClick={() => setSelectedCreator(c)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CREATOR PROFILE VIEW
// ============================================================================
function CreatorProfile({ creator, onBack }: { creator: any; onBack: () => void }) {
  const tier = TIER_CONFIG[creator.tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.emerging;
  const [subStep, setSubStep] = useState<"idle" | "pay" | "done">("idle");
  const [subIntentData, setSubIntentData] = useState<{ clientSecret: string; intentId: string; amountCents: number; tierId: number } | null>(null);
  const [showTip, setShowTip] = useState(false);
  const subscribeIntent = trpc.vaultx.subscribeToCreator.useMutation();
  const confirmSub = trpc.vaultx.confirmSubscription.useMutation();
  const { data: contentData } = trpc.vaultx.getCreatorContent.useQuery(
    { creatorId: creator.creator_id, limit: 12, offset: 0 },
    { retry: false, enabled: !!creator.creator_id }
  );
  const isSubscribed = contentData?.isSubscribed || subStep === "done";

  const handleSubscribe = async () => {
    try {
      const result = await subscribeIntent.mutateAsync({ creatorId: creator.creator_id });
      setSubIntentData({
        clientSecret: result.clientSecret!,
        intentId: result.intentId,
        amountCents: result.amount,
        tierId: 0,
      });
      setSubStep("pay");
    } catch (e: any) {
      if (e.message?.includes("Already subscribed")) {
        toast.info("You are already subscribed");
        setSubStep("done");
      } else {
        toast.error(e.message || "Failed to start subscription");
      }
    }
  };

  const handleSubSuccess = async () => {
    if (!subIntentData) return;
    try {
      await confirmSub.mutateAsync({
        intentId: subIntentData.intentId,
        creatorId: creator.creator_id,
        tierId: subIntentData.tierId || 1,
      });
      setSubStep("done");
      toast.success(`Subscribed to ${creator.display_name}!`);
    } catch (e: any) {
      toast.error(e.message || "Failed to confirm subscription");
    }
  };

  return (
    <div className="space-y-4">
      {showTip && <TipModal creator={creator} onClose={() => setShowTip(false)} />}
      {subStep === "pay" && subIntentData && (
        <StripePaymentModal
          clientSecret={subIntentData.clientSecret}
          intentId={subIntentData.intentId}
          amountCents={subIntentData.amountCents}
          label={`Subscribe to ${creator.display_name}`}
          onSuccess={handleSubSuccess}
          onClose={() => setSubStep("idle")}
        />
      )}
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
        ← Back to Discover
      </button>

      {/* Banner */}
      <div className="rounded-2xl overflow-hidden border border-gray-800">
        <div className="h-40 bg-[#0a0a0a] from-red-900/60 to-orange-900/40 relative">
          {creator.profile_banner_url && (
            <img src={creator.profile_banner_url} alt="" className="w-full h-full object-cover opacity-50" />
          )}
          <div className="absolute inset-0 bg-[#0a0a0a] from-gray-950 via-transparent to-transparent" />
        </div>
        <div className="bg-gray-950 p-5 -mt-8 relative">
          <div className="flex items-end justify-between mb-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0a0a0a] from-red-500 to-orange-500 flex items-center justify-center text-white font-black text-2xl border-4 border-gray-950">
              {creator.display_name?.[0]?.toUpperCase()}
            </div>
            <div className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ color: tier.color, backgroundColor: `${tier.color}20` }}>
              {tier.icon} {tier.label}
            </div>
          </div>
          <div className="font-black text-white text-xl mb-1">{creator.display_name}</div>
          <div className="text-gray-400 text-sm mb-4">{creator.bio}</div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-gray-900 rounded-xl p-3 text-center">
              <div className="text-white font-bold">{creator.total_subscribers || 0}</div>
              <div className="text-gray-500 text-xs">Subscribers</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-3 text-center">
              <div className="text-white font-bold">{creator.total_posts || 0}</div>
              <div className="text-gray-500 text-xs">Posts</div>
            </div>
            <div className="bg-gray-900 rounded-xl p-3 text-center">
              <div className="text-red-400 font-bold">${creator.base_subscription_price || "—"}</div>
              <div className="text-gray-500 text-xs">Per Month</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSubscribe}
              disabled={subscribeIntent.isPending}
              className="flex-1 bg-[#0a0a0a] from-red-500 to-orange-500 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
            >
              {subscribeIntent.isPending ? "Loading..." : isSubscribed ? "✓ Subscribed" : `Subscribe $$${creator.base_subscription_price || "9.99"}/mo`}
            </button>
            {creator.tips_enabled && (
              <button
                onClick={() => setShowTip(true)}
                className="bg-gray-800 text-white font-bold py-3 px-4 rounded-xl text-sm hover:bg-gray-700 transition-colors"
              >
                <Gift className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid — real data from getCreatorContent */}
      {contentData && contentData.items.length > 0 ? (
        <div className="space-y-3">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Content ({contentData.items.length})</p>
          <div className="grid grid-cols-3 gap-2">
            {contentData.items.map((item: any) => (
              <div key={item.id} className="relative rounded-xl overflow-hidden aspect-square bg-gray-900">
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className={`w-full h-full object-cover ${item.locked ? "blur-md" : ""}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-2xl">
                    {item.content_type === "video" ? "🎬" : item.content_type === "image" ? "🖼️" : "🎵"}
                  </div>
                )}
                {item.locked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                )}
                {item.unlock_type === "ppv" && !item.locked && (
                  <div className="absolute top-1 right-1 bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full">PPV</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : !isSubscribed ? (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 text-center">
          <Lock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <div className="text-white font-bold mb-1">Content is locked</div>
          <div className="text-gray-500 text-sm">Subscribe to unlock all posts, videos, and DMs</div>
        </div>
      ) : null}

      {/* PPV */}
      {creator.ppv_enabled && (
        <div className="bg-gray-900/60 border border-amber-900/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 font-bold text-sm">Pay-Per-View Available</span>
          </div>
          <div className="text-gray-400 text-xs">Purchase individual pieces of content without a subscription.</div>
        </div>
      )}

      {/* Custom Requests */}
      {creator.custom_requests_enabled && (
        <div className="bg-gray-900/60 border border-purple-900/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-purple-400" />
            <span className="text-purple-400 font-bold text-sm">Custom Requests Open</span>
          </div>
          <div className="text-gray-400 text-xs">DM to request custom content. Prices vary.</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MY PROFILE TAB
// ============================================================================
function MyProfileTab({ userId }: { userId: number }) {
  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    contentStyle: "",
    subscriptionPrice: "9.99",
    ppvEnabled: true,
    tipsEnabled: true,
    customRequestsEnabled: true,
    dmPaywallEnabled: false,
    categories: [] as string[],
  });
  const [saved, setSaved] = useState(false);

  const { data: profileData } = trpc.vaultx.getCreatorProfile.useQuery(undefined, { retry: false });

  useEffect(() => {
    if (profileData && (profileData as any).profile) {
      const p = (profileData as any).profile;
      setForm({
        displayName: p.display_name || "",
        bio: p.bio || "",
        contentStyle: p.content_style || "",
        subscriptionPrice: p.base_subscription_price?.toString() || "9.99",
        ppvEnabled: p.ppv_enabled ?? true,
        tipsEnabled: p.tips_enabled ?? true,
        customRequestsEnabled: p.custom_requests_enabled ?? true,
        dmPaywallEnabled: p.dm_paywall_enabled ?? false,
        categories: p.categories || [],
      });
    }
  }, [profileData]);

  const updateProfile = trpc.vaultx.updateCreatorProfile.useMutation({
    onSuccess: () => { setSaved(true); toast.success("Profile saved!"); setTimeout(() => setSaved(false), 2000); },
    onError: (e) => toast.error(e.message),
  });

  const categoryOptions = ["fitness", "cosplay", "dance", "lifestyle", "art", "gaming", "music", "custom", "modeling", "comedy"];

  const toggleCategory = (cat: string) => {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(cat) ? f.categories.filter(c => c !== cat) : [...f.categories, cat]
    }));
  };

  const handleSave = () => {
    updateProfile.mutate({
      displayName: form.displayName,
      bio: form.bio,
      contentStyle: form.contentStyle,
      subscriptionPrice: parseFloat(form.subscriptionPrice),
      ppvEnabled: form.ppvEnabled,
      tipsEnabled: form.tipsEnabled,
      customRequestsEnabled: form.customRequestsEnabled,
      dmPaywallEnabled: form.dmPaywallEnabled,
      categories: form.categories,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-black text-xl">My VaultX Profile</h2>
        <button
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className="bg-red-500 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {saved ? "✓ Saved" : updateProfile.isPending ? "Saving..." : "Save Profile"}
        </button>
      </div>

      {/* Display Name */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="text-white font-bold text-sm flex items-center gap-2">
          <Camera className="w-4 h-4 text-red-400" /> Identity
        </div>
        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Display Name</label>
          <input
            value={form.displayName}
            onChange={(e) => setForm(f => ({ ...f, displayName: e.target.value }))}
            placeholder="Your creator name on VaultX"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500"
          />
        </div>
        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))}
            placeholder="Tell subscribers what you offer..."
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 resize-none"
          />
        </div>
        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Content Style</label>
          <input
            value={form.contentStyle}
            onChange={(e) => setForm(f => ({ ...f, contentStyle: e.target.value }))}
            placeholder="e.g. Sensual, Explicit, Artistic..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm flex items-center gap-2 mb-4">
          <Hash className="w-4 h-4 text-red-400" /> Categories
        </div>
        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                form.categories.includes(cat)
                  ? "bg-red-500 text-white"
                  : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-red-500/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Monetization */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="text-white font-bold text-sm flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-red-400" /> Monetization
        </div>
        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Monthly Subscription Price ($)</label>
          <input
            type="number"
            value={form.subscriptionPrice}
            onChange={(e) => setForm(f => ({ ...f, subscriptionPrice: e.target.value }))}
            min="4.99"
            step="0.01"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500"
          />
          <div className="text-gray-600 text-xs mt-1">You keep 85% — platform takes 15%</div>
        </div>

        {/* Toggles */}
        {[
          { key: "ppvEnabled", label: "Pay-Per-View", desc: "Sell individual posts/videos" },
          { key: "tipsEnabled", label: "Tips", desc: "Accept tips from fans" },
          { key: "customRequestsEnabled", label: "Custom Requests", desc: "Accept custom content orders" },
          { key: "dmPaywallEnabled", label: "DM Paywall", desc: "Charge to unlock your DMs" },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between py-3 border-t border-gray-800">
            <div>
              <div className="text-white text-sm font-semibold">{label}</div>
              <div className="text-gray-500 text-xs">{desc}</div>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, [key]: !f[key as keyof typeof f] }))}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                form[key as keyof typeof form] ? "bg-red-500" : "bg-gray-700"
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                form[key as keyof typeof form] ? "translate-x-6" : "translate-x-0.5"
              }`} />
            </button>
          </div>
        ))}
      </div>

      {/* Revenue Share Info */}
      <div className="bg-[#0a0a0a] from-red-950/50 to-orange-950/30 border border-red-900/30 rounded-2xl p-5">
        <div className="text-red-400 font-bold text-sm mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Your Revenue Breakdown
        </div>
        <div className="space-y-2 text-sm">
          {[
            { label: "Subscriptions", pct: "85%" },
            { label: "Pay-Per-View", pct: "85%" },
            { label: "Tips", pct: "90%" },
            { label: "Custom Requests", pct: "85%" },
          ].map(({ label, pct }) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-400">{label}</span>
              <span className="text-white font-bold">{pct} to you</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TELEGRAM TAB
// ============================================================================
function TelegramTab({ userId }: { userId: number }) {
  // ── Real tRPC state ────────────────────────────────────────────────────
  const utils = trpc.useUtils();

  // Query: load the currently linked channel from the DB on mount
  const { data: linkedChannel, isLoading: channelLoading } =
    trpc.vaultx.getLinkedChannel.useQuery(undefined, { retry: false });

  // Mutation: upsert a channel row into telegram_channels
  const linkMutation = trpc.vaultx.linkChannel.useMutation({
    onSuccess: (row) => {
      utils.vaultx.getLinkedChannel.invalidate();
      setChannelUsername(row?.channel_id ?? "");
      toast.success(
        row?.channel_id
          ? `Channel @${row.channel_id} linked to VaultX!`
          : "Channel linked!"
      );
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to link channel");
    },
  });

  // ── Local UI state ────────────────────────────────────────────────────
  const [channelUsername, setChannelUsername] = useState("");
  const [channelPrice, setChannelPrice] = useState("9.99");
  const [botToken, setBotToken] = useState("");
  const [copied, setCopied] = useState(false);

  // Pre-fill the input once the query resolves
  const prevLinkedRef = useRef<string | null>(null);
  useEffect(() => {
    if (linkedChannel?.channel_id && linkedChannel.channel_id !== prevLinkedRef.current) {
      prevLinkedRef.current = linkedChannel.channel_id;
      setChannelUsername(linkedChannel.channel_id);
    }
  }, [linkedChannel]);

  const linked = Boolean(linkedChannel?.channel_id);
  const vaultxBotUsername = "@VaultXBot";
  const inviteLink = `https://t.me/VaultXBot?start=sub_${userId}`;
  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleLinkChannel = () => {
    if (!channelUsername.trim()) return toast.error("Enter your channel username");
    linkMutation.mutate({
      channelId: channelUsername.trim().replace(/^@/, ""),
      channelName: channelUsername.trim().replace(/^@/, ""),
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-white font-black text-xl mb-1">Telegram Integration</h2>
        <p className="text-gray-500 text-sm">Link your Telegram channel. Fans pay VaultX to get added automatically.</p>
      </div>

      {/* How It Works */}
      <div className="bg-gray-900/60 border border-blue-900/30 rounded-2xl p-5">
        <div className="text-blue-400 font-bold text-sm mb-4 flex items-center gap-2">
          <Bot className="w-4 h-4" /> How VaultX Telegram Works
        </div>
        <div className="space-y-3">
          {[
            { step: "1", text: "Link your private Telegram channel below" },
            { step: "2", text: "Set your monthly access price" },
            { step: "3", text: "Share your VaultX subscribe link" },
            { step: "4", text: "Fans pay → VaultX bot auto-adds them to your channel" },
            { step: "5", text: "Expired subscriptions = auto-removed. Zero manual work." },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{step}</div>
              <span className="text-gray-400 text-sm">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Link Channel */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="text-white font-bold text-sm flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-400" /> Link Your Channel
        </div>

        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Channel Username</label>
          <div className="flex gap-2">
            <div className="flex items-center bg-gray-800 border border-gray-700 rounded-xl px-3 text-gray-500 text-sm">@</div>
            <input
              value={channelUsername}
              onChange={(e) => setChannelUsername(e.target.value.replace("@", ""))}
              placeholder="yourchannelname"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Monthly Access Price ($)</label>
          <input
            type="number"
            value={channelPrice}
            onChange={(e) => setChannelPrice(e.target.value)}
            min="4.99"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wider block mb-2">Setup Instructions</label>
          <div className="bg-gray-800 rounded-xl p-4 text-xs text-gray-400 space-y-1.5">
            <div>1. Add <span className="text-blue-400 font-mono">{vaultxBotUsername}</span> as admin to your channel</div>
            <div>2. Give it "Add Members" permission</div>
            <div>3. Enter your channel username above and click Link</div>
          </div>
        </div>

        {/* Linked status badge */}
        {channelLoading ? (
          <div className="text-gray-500 text-xs">Checking linked channel…</div>
        ) : linked ? (
          <div className="flex items-center gap-2 text-green-400 text-xs font-semibold">
            <CheckCircle className="w-4 h-4" />
            Linked to: @{linkedChannel!.channel_id}
          </div>
        ) : null}

        <button
          onClick={handleLinkChannel}
          disabled={linkMutation.isPending}
          className={`w-full font-bold py-3 rounded-xl text-sm transition-colors ${
            linkMutation.isPending
              ? "bg-gray-700 text-gray-400 cursor-not-allowed"
              : linked
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {linkMutation.isPending
            ? "Linking…"
            : linked
            ? "Update Channel"
            : "Link Channel"}
        </button>

        {/* Inline error */}
        {linkMutation.isError && (
          <p className="text-red-400 text-xs mt-1">
            {linkMutation.error?.message ?? "Failed to link channel"}
          </p>
        )}
      </div>

      {/* Subscribe Link */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm flex items-center gap-2 mb-3">
          <Send className="w-4 h-4 text-blue-400" /> Your Subscribe Link
        </div>
        <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
          <div className="flex-1 text-blue-400 text-xs font-mono truncate">{inviteLink}</div>
          <button onClick={copyLink} className="text-gray-400 hover:text-white transition-colors">
            {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <div className="text-gray-600 text-xs mt-2">Share this link on X, Instagram, or anywhere. Fans click → pay → get added automatically.</div>
      </div>

      {/* Telegram Content Ideas */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-amber-400" /> What to Post in Your VaultX Channel
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "🔥", label: "Daily exclusives", desc: "Content fans can't get anywhere else" },
            { icon: "💬", label: "Voice messages", desc: "Personal audio for subscribers" },
            { icon: "📸", label: "Behind the scenes", desc: "Raw, unfiltered moments" },
            { icon: "⚡", label: "Flash PPV drops", desc: "Limited-time premium content" },
            { icon: "🎁", label: "Subscriber rewards", desc: "Loyalty bonuses and gifts" },
            { icon: "🗳️", label: "Polls & requests", desc: "Let fans vote on content" },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="bg-gray-800 rounded-xl p-3">
              <div className="text-lg mb-1">{icon}</div>
              <div className="text-white text-xs font-semibold">{label}</div>
              <div className="text-gray-500 text-xs">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// X.COM TAB
// ============================================================================
function XComTab({ userId }: { userId: number }) {
  const [xHandle, setXHandle] = useState("");
  const [teaserText, setTeaserText] = useState("");
  const [generatedTeaser, setGeneratedTeaser] = useState("");
  const [copied, setCopied] = useState(false);

  const vaultxProfileUrl = `https://creatorvault.live/vault-x/creator/${userId}`;

  const teaserTemplates = [
    `🔥 New content just dropped on VaultX. Subscribers only.\n\nSubscribe now 👇\n${vaultxProfileUrl}\n\n#VaultX #AdultContent #Exclusive`,
    `Can't post this here 😈\n\nYou know where to find it 👇\n${vaultxProfileUrl}\n\n#VaultX #Uncensored`,
    `POV: You're not subscribed to my VaultX yet 😏\n\nFix that 👇\n${vaultxProfileUrl}`,
    `New PPV just went live 🔐\n\nFirst 10 subscribers get it free.\n${vaultxProfileUrl}\n\n#VaultX #PPV`,
    `I post what I want on VaultX. No censorship. No limits.\n\nJoin the uncensored side 👇\n${vaultxProfileUrl}`,
  ];

  const generateTeaser = () => {
    const random = teaserTemplates[Math.floor(Math.random() * teaserTemplates.length)];
    setGeneratedTeaser(random);
  };

  const copyTeaser = () => {
    navigator.clipboard.writeText(generatedTeaser);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openXPost = () => {
    const text = encodeURIComponent(generatedTeaser || `Subscribe to my VaultX for exclusive adult content 🔥\n${vaultxProfileUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-white font-black text-xl mb-1">X.com Funnel</h2>
        <p className="text-gray-500 text-sm">Post teasers on X. Drive traffic to your VaultX. Convert followers into paying subscribers.</p>
      </div>

      {/* Strategy */}
      <div className="bg-[#0a0a0a] from-gray-900 to-black border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <Twitter className="w-4 h-4 text-sky-400" /> The X → VaultX Funnel
        </div>
        <div className="flex items-center gap-2 text-sm overflow-x-auto pb-2">
          {[
            { icon: "📱", label: "Post teaser on X" },
            { icon: "→", label: "" },
            { icon: "👁️", label: "Followers see it" },
            { icon: "→", label: "" },
            { icon: "🔗", label: "Click VaultX link" },
            { icon: "→", label: "" },
            { icon: "💳", label: "Subscribe" },
            { icon: "→", label: "" },
            { icon: "💰", label: "You get paid" },
          ].map(({ icon, label }, i) => (
            <div key={i} className={`flex-shrink-0 ${label === "" ? "text-gray-600" : "text-center"}`}>
              {label === "" ? (
                <span className="text-gray-600">→</span>
              ) : (
                <div>
                  <div className="text-lg">{icon}</div>
                  <div className="text-gray-500 text-xs whitespace-nowrap">{label}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Your VaultX Link */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-red-400" /> Your VaultX Profile Link
        </div>
        <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
          <div className="flex-1 text-red-400 text-xs font-mono truncate">{vaultxProfileUrl}</div>
          <button
            onClick={() => { navigator.clipboard.writeText(vaultxProfileUrl); toast.success("Copied!"); }}
            className="text-gray-400 hover:text-white"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <div className="text-gray-600 text-xs mt-2">Put this in your X bio. Post it in every teaser tweet.</div>
      </div>

      {/* Teaser Generator */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="text-white font-bold text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Teaser Generator
        </div>
        <p className="text-gray-500 text-xs">Generate ready-to-post X teasers that drive clicks to your VaultX.</p>

        <button
          onClick={generateTeaser}
          className="w-full bg-sky-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-sky-700 transition-colors"
        >
          Generate Teaser Post
        </button>

        {generatedTeaser && (
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-xl p-4 text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
              {generatedTeaser}
            </div>
            <div className="flex gap-3">
              <button
                onClick={copyTeaser}
                className="flex-1 bg-gray-700 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={openXPost}
                className="flex-1 bg-sky-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-sky-700 transition-colors flex items-center justify-center gap-2"
              >
                <Twitter className="w-4 h-4" />
                Post to X
              </button>
              <button
                onClick={generateTeaser}
                className="bg-gray-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm hover:bg-gray-600 transition-colors"
              >
                ↺
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Strategy */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-red-400" /> Proven X Content Strategy for Adult Creators
        </div>
        <div className="space-y-3">
          {[
            { pct: "40%", type: "Teasers", desc: "Censored previews with VaultX link", color: "bg-red-500" },
            { pct: "30%", type: "Personality", desc: "Your life, opinions, humor — build connection", color: "bg-orange-500" },
            { pct: "20%", type: "Social proof", desc: "Subscriber counts, testimonials, earnings", color: "bg-amber-500" },
            { pct: "10%", type: "Direct CTA", desc: "Hard sell — subscribe now, limited spots", color: "bg-yellow-500" },
          ].map(({ pct, type, desc, color }) => (
            <div key={type} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>{pct}</div>
              <div>
                <div className="text-white text-sm font-semibold">{type}</div>
                <div className="text-gray-500 text-xs">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Posting Schedule */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-purple-400" /> Optimal Posting Schedule
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { time: "9–11 AM", label: "Morning tease", desc: "Catch commuters" },
            { time: "12–2 PM", label: "Lunch drop", desc: "Peak engagement" },
            { time: "6–8 PM", label: "Evening heat", desc: "After work crowd" },
            { time: "10 PM–12 AM", label: "Late night", desc: "Highest conversion" },
          ].map(({ time, label, desc }) => (
            <div key={time} className="bg-gray-800 rounded-xl p-3">
              <div className="text-purple-400 text-xs font-bold">{time}</div>
              <div className="text-white text-sm font-semibold">{label}</div>
              <div className="text-gray-500 text-xs">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EARNINGS TAB
// ============================================================================
function EarningsTab({ userId }: { userId: number }) {
  const { data: revenueData } = trpc.vaultx.getRevenueStats.useQuery(undefined, { retry: false });
  const stats = (revenueData as any) || {};

  const earningsBreakdown = [
    { label: "Subscriptions", amount: stats.subscription_revenue || 0, icon: "👥", color: "text-red-400" },
    { label: "Pay-Per-View", amount: stats.ppv_revenue || 0, icon: "🔐", color: "text-orange-400" },
    { label: "Tips", amount: stats.tip_revenue || 0, icon: "💝", color: "text-pink-400" },
    { label: "Custom Requests", amount: stats.custom_revenue || 0, icon: "✨", color: "text-purple-400" },
  ];

  const totalEarnings = earningsBreakdown.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-white font-black text-xl mb-1">Earnings Dashboard</h2>
        <p className="text-gray-500 text-sm">Your VaultX revenue breakdown.</p>
      </div>

      {/* Total */}
      <div className="bg-[#0a0a0a] from-red-950/60 to-orange-950/40 border border-red-900/30 rounded-2xl p-6 text-center">
        <div className="text-gray-400 text-sm mb-1">Total VaultX Earnings</div>
        <div className="text-5xl font-black text-white mb-1">${totalEarnings.toFixed(2)}</div>
        <div className="text-red-400 text-xs">85% revenue share on all sales</div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {earningsBreakdown.map(({ label, amount, icon, color }) => (
          <div key={label} className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
            <div className="text-2xl mb-2">{icon}</div>
            <div className={`text-xl font-black ${color}`}>${amount.toFixed(2)}</div>
            <div className="text-gray-500 text-xs">{label}</div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-red-400" /> Creator Stats
        </div>
        <div className="space-y-3">
          {[
            { label: "Total Subscribers", value: stats.total_subscribers || 0 },
            { label: "Active Subscribers", value: stats.active_subscribers || 0 },
            { label: "Total Posts", value: stats.total_posts || 0 },
            { label: "Avg Monthly Revenue", value: `$${(stats.avg_monthly_revenue || 0).toFixed(2)}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
              <span className="text-gray-400 text-sm">{label}</span>
              <span className="text-white font-bold">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payout */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-green-400" /> Payout Settings
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Payout Schedule</span>
            <span className="text-white text-sm font-semibold">Weekly (Fridays)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Minimum Payout</span>
            <span className="text-white text-sm font-semibold">$50</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Methods</span>
            <span className="text-white text-sm font-semibold">CashApp, Zelle, Crypto</span>
          </div>
        </div>
        <button className="w-full mt-4 bg-green-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-green-700 transition-colors">
          Request Payout
        </button>
      </div>

      {/* Revenue Projections */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <div className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" /> Revenue Projections
        </div>
        <div className="text-gray-500 text-xs mb-4">Based on $9.99/mo subscription price:</div>
        <div className="space-y-2">
          {[
            { subs: 50, monthly: 424, annual: 5088 },
            { subs: 100, monthly: 849, annual: 10188 },
            { subs: 250, monthly: 2122, annual: 25464 },
            { subs: 500, monthly: 4245, annual: 50940 },
            { subs: 1000, monthly: 8490, annual: 101880 },
          ].map(({ subs, monthly, annual }) => (
            <div key={subs} className="flex items-center gap-3">
              <div className="w-20 text-gray-500 text-xs">{subs} subs</div>
              <div className="flex-1 bg-gray-800 rounded-full h-2">
                <div
                  className="bg-[#0a0a0a] from-red-500 to-orange-500 h-2 rounded-full"
                  style={{ width: `${Math.min((subs / 1000) * 100, 100)}%` }}
                />
              </div>
              <div className="text-white text-xs font-bold w-16 text-right">${monthly}/mo</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN VAULTX PAGE
// ============================================================================

// ─── RealmToggle ─────────────────────────────────────────────────────────────
// Exported for use in AppHeader — shows VaultX status indicator when adult-verified
export function RealmToggle() {
  const { data: realmStatus } = trpc.vaultx.getRealmStatus.useQuery(undefined, {
    retry: false,
  });
  if (!realmStatus?.adultVerified) return null;
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "oklch(0.18 0.04 0 / 0.6)", border: "1px solid oklch(0.3 0.08 0 / 0.4)" }}>
      <span className="text-xs font-medium" style={{ color: "oklch(0.75 0.2 0)" }}>VaultX</span>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "oklch(0.65 0.22 140)" }} />
    </div>
  );
}

export default function VaultX() {
  const { user } = useAuth();
  const [verified, setVerified] = useState(false);
  const [activeTab, setActiveTab] = useState<"discover" | "profile" | "telegram" | "xcom" | "earnings">("discover");

  const { data: realmData, isLoading } = trpc.vaultx.getRealmStatus.useQuery(undefined, {
    retry: false,
    enabled: !!user,
  });

  const isVerified = verified || (realmData as any)?.adultVerified;

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <Flame className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <div className="text-white font-black text-2xl mb-2">VaultX</div>
          <div className="text-gray-400 text-sm mb-6">Sign in to access the uncensored social economy</div>
          <a href="/login" className="bg-red-500 text-white font-bold px-8 py-3 rounded-xl text-sm hover:bg-red-600 transition-colors">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-gray-500 text-sm">Loading VaultX...</div>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return <AgeGate onVerified={() => setVerified(true)} />;
  }

  const tabs = [
    { id: "discover", label: "Discover", icon: Flame },
    { id: "profile", label: "My Profile", icon: Settings },
    { id: "telegram", label: "Telegram", icon: Send },
    { id: "xcom", label: "X.com", icon: Twitter },
    { id: "earnings", label: "Earnings", icon: DollarSign },
  ] as const;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur border-b border-gray-900">
        <div className="max-w-2xl mx-auto px-4">
          {/* Top bar */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0a0a0a] from-red-500 to-orange-500 flex items-center justify-center">
                <Flame className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-black text-lg tracking-tight">VaultX</span>
              <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">18+</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs font-semibold">Verified</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 pb-2 overflow-x-auto scrollbar-hide">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0 transition-colors ${
                  activeTab === id
                    ? "bg-red-500 text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {activeTab === "discover" && <DiscoverTab />}
        {activeTab === "profile" && <MyProfileTab userId={user.id} />}
        {activeTab === "telegram" && <TelegramTab userId={user.id} />}
        {activeTab === "xcom" && <XComTab userId={user.id} />}
        {activeTab === "earnings" && <EarningsTab userId={user.id} />}
      </div>
    </div>
  );
}
