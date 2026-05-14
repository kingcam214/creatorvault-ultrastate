import React, { useMemo } from "react";

export default function CheckoutRecovery() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const sessionId = params.get("session_id") || "";
  const checkoutUrl = params.get("checkout_url") || "";
  const decodedCheckoutUrl = checkoutUrl ? decodeURIComponent(checkoutUrl) : "";
  const isStripeCheckout = /^https:\/\/(checkout\.stripe\.com|buy\.stripe\.com)\//i.test(decodedCheckoutUrl);

  const returnToCheckout = () => {
    if (!isStripeCheckout) return;
    window.location.assign(decodedCheckoutUrl);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-2xl rounded-3xl border border-cyan-400/30 bg-slate-900/90 p-8 shadow-2xl shadow-cyan-950/40">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">CreatorVault checkout recovery</p>
        <h1 className="mt-4 text-3xl md:text-5xl font-black leading-tight">Return to your secure checkout</h1>
        <p className="mt-5 text-slate-300 text-lg leading-relaxed">
          Your checkout recovery link was generated from a real CreatorVault checkout session. If the Stripe session is still active, the button below returns you to the same secure payment page so your subscription or VaultX offer can be completed.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Recovery session</p>
          <p className="mt-2 break-all font-mono text-sm text-slate-300">{sessionId || "No session id was supplied."}</p>
        </div>

        {isStripeCheckout ? (
          <button
            type="button"
            onClick={returnToCheckout}
            className="mt-8 w-full rounded-2xl bg-cyan-400 px-6 py-4 text-lg font-black text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-200/40"
          >
            Return to secure Stripe checkout
          </button>
        ) : (
          <div className="mt-8 rounded-2xl border border-amber-400/40 bg-amber-950/40 p-5 text-amber-100">
            This recovery link does not include an active Stripe Checkout URL. Open the creator offer page again to start a new secure checkout session.
          </div>
        )}

        <p className="mt-6 text-sm text-slate-500">
          CreatorVault only redirects to verified Stripe-hosted checkout URLs from this recovery page: checkout.stripe.com and buy.stripe.com. Completed payments are handled by the existing production subscription and onboarding webhook flow.
        </p>
      </section>
    </main>
  );
}
