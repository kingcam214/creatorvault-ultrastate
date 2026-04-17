import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function SubscriptionSuccess() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8] flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-lg border border-[#2a2a2a] bg-[#141414] p-8 text-center">
        <h1 className="text-3xl font-semibold mb-3">Subscription Confirmed</h1>
        <p className="text-[#b8b8b8] mb-6">Thank you for subscribing. Your account benefits are now active.</p>
        <Link href="/dashboard">
          <Button className="bg-[#c9a84c] text-[#0a0a0a] hover:opacity-90">Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
