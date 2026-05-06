/**
 * VaultX AI Chatter
 *
 * Creator configures their AI fan engagement persona.
 * All calls go to the real aiChatterRouter via tRPC.
 * Stats are pulled from real DB aggregates.
 *
 * NO STUBS. NO MOCKS.
 */

import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { useToast } from "../hooks/use-toast";

export default function AIChatter() {
  const { toast } = useToast();

  const { data: config, isLoading, refetch } = trpc.aiChatter.getConfig.useQuery(undefined, {
    retry: false,
  });

  const { data: stats } = trpc.aiChatter.getChatterStats.useQuery(undefined, {
    retry: false,
  });

  const saveConfig = trpc.aiChatter.saveConfig.useMutation({
    onSuccess: () => {
      toast({ title: "AI Chatter saved", description: "Your persona is live." });
      refetch();
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [form, setForm] = useState({
    personaName: "",
    personaDescription: "",
    ppvPitchFrequency: 3,
    tipRequestFrequency: 5,
    isEnabled: false,
    greetingMessage: "",
    scheduleHours: [] as number[],
  });

  // Populate form once config loads
  React.useEffect(() => {
    if (config && config.configured) {
      setForm({
        personaName: config.personaName,
        personaDescription: config.personaDescription,
        ppvPitchFrequency: config.ppvPitchFrequency,
        tipRequestFrequency: config.tipRequestFrequency,
        isEnabled: config.isEnabled,
        greetingMessage: config.greetingMessage,
        scheduleHours: config.scheduleHours,
      });
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveConfig.mutate(form);
  };

  const toggleHour = (hour: number) => {
    setForm((f) => ({
      ...f,
      scheduleHours: f.scheduleHours.includes(hour)
        ? f.scheduleHours.filter((h) => h !== hour)
        : [...f.scheduleHours, hour].sort((a, b) => a - b),
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
              AI Chatter
            </h1>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
              config?.isEnabled ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-white/10 text-white/50"
            }`}>
              <div className={`w-2 h-2 rounded-full ${config?.isEnabled ? "bg-green-400 animate-pulse" : "bg-white/30"}`} />
              {config?.isEnabled ? "Active" : "Inactive"}
            </div>
          </div>
          <p className="text-white/60 text-sm">
            Your AI persona engages fans, pitches PPV content, and requests tips — automatically, 24/7.
          </p>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-pink-400">{stats.uniqueFansEngaged}</div>
              <div className="text-white/50 text-xs mt-1">Fans Engaged</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-rose-400">{stats.totalMessages}</div>
              <div className="text-white/50 text-xs mt-1">Messages Sent</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">${stats.revenueAttributedToChatter.toFixed(0)}</div>
              <div className="text-white/50 text-xs mt-1">Revenue</div>
            </div>
          </div>
        )}

        {/* Configuration form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Enable toggle */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Enable AI Chatter</h3>
                <p className="text-white/50 text-sm mt-0.5">Turn on your AI persona to engage fans automatically</p>
              </div>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isEnabled: !f.isEnabled }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${form.isEnabled ? "bg-pink-500" : "bg-white/20"}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.isEnabled ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>
          </div>

          {/* Persona name */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-white">Persona</h3>

            <div>
              <label className="block text-white/70 text-sm mb-1.5">Persona Name</label>
              <input
                type="text"
                value={form.personaName}
                onChange={(e) => setForm((f) => ({ ...f, personaName: e.target.value }))}
                placeholder="e.g. Destiny, Luna, Scarlett..."
                className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-pink-500 text-sm"
                maxLength={100}
                required
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-1.5">Persona Description</label>
              <textarea
                value={form.personaDescription}
                onChange={(e) => setForm((f) => ({ ...f, personaDescription: e.target.value }))}
                placeholder="Describe your AI persona's personality, tone, and how it should interact with fans..."
                className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-pink-500 text-sm resize-none"
                rows={4}
                maxLength={500}
              />
              <div className="text-white/30 text-xs mt-1 text-right">{form.personaDescription.length}/500</div>
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-1.5">Greeting Message</label>
              <textarea
                value={form.greetingMessage}
                onChange={(e) => setForm((f) => ({ ...f, greetingMessage: e.target.value }))}
                placeholder="First message sent to new subscribers..."
                className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-pink-500 text-sm resize-none"
                rows={2}
                maxLength={300}
              />
            </div>
          </div>

          {/* Monetization settings */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-white">Monetization Frequency</h3>

            <div>
              <label className="block text-white/70 text-sm mb-1.5">
                PPV Pitch Every <span className="text-pink-400 font-bold">{form.ppvPitchFrequency}</span> Messages
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={form.ppvPitchFrequency}
                onChange={(e) => setForm((f) => ({ ...f, ppvPitchFrequency: parseInt(e.target.value) }))}
                className="w-full accent-pink-500"
              />
              <div className="flex justify-between text-white/30 text-xs mt-1">
                <span>Aggressive (1)</span>
                <span>Subtle (10)</span>
              </div>
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-1.5">
                Tip Request Every <span className="text-rose-400 font-bold">{form.tipRequestFrequency}</span> Messages
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={form.tipRequestFrequency}
                onChange={(e) => setForm((f) => ({ ...f, tipRequestFrequency: parseInt(e.target.value) }))}
                className="w-full accent-rose-500"
              />
              <div className="flex justify-between text-white/30 text-xs mt-1">
                <span>Aggressive (1)</span>
                <span>Subtle (10)</span>
              </div>
            </div>
          </div>

          {/* Active hours */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-1">Active Hours</h3>
            <p className="text-white/50 text-xs mb-4">Select which hours your AI should respond (leave empty for 24/7)</p>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 24 }, (_, h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => toggleHour(h)}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                    form.scheduleHours.includes(h)
                      ? "bg-pink-500 text-white"
                      : "bg-white/10 text-white/50 hover:bg-white/20"
                  }`}
                >
                  {h.toString().padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button
            type="submit"
            disabled={saveConfig.isPending || !form.personaName}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-4 rounded-xl text-base disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform shadow-lg shadow-pink-500/20"
          >
            {saveConfig.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              `${form.isEnabled ? "Save & Activate" : "Save Configuration"}`
            )}
          </button>
        </form>

        {/* Info box */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <h4 className="text-blue-400 font-semibold text-sm mb-2">How AI Chatter Works</h4>
          <ul className="text-white/60 text-xs space-y-1.5">
            <li>• Your AI persona responds to fan messages in your voice and style</li>
            <li>• Every {form.ppvPitchFrequency} messages, it naturally mentions your latest PPV content</li>
            <li>• Every {form.tipRequestFrequency} messages, it requests a tip</li>
            <li>• All conversations are logged — you can review and override at any time</li>
            <li>• Revenue from PPV purchases made after chatter interactions is tracked separately</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
