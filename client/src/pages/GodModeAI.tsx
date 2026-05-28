import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const accent = "#00D9FF";
const hot = "#FF2BD6";
const gold = "#FFD166";

const fallbackSystems = [
  { key: "vaultx", label: "VaultX Editor", status: "armed", promise: "Turn raw clips into sellable bundles." },
  { key: "body_cinema", label: "Body Cinema", status: "flagship", promise: "Direct visual enhancement controls for premium creator scenes." },
  { key: "trailer", label: "Trailer Studio", status: "wired", promise: "Launch trailers, teaser cuts, captions, and platform packs." },
  { key: "clone", label: "Clone Lab", status: "armed", promise: "Synthetic image and short-video scenes from trained creator models." },
  { key: "challenge", label: "AI Agent Challenge", status: "monetizing", promise: "Live Stripe-backed public revenue proof." },
];

export default function GodModeAI() {
  const [offerName, setOfferName] = useState("Friday Night Premium Drop");
  const [targetRevenue, setTargetRevenue] = useState(5000);
  const [selectedSystem, setSelectedSystem] = useState<"vaultx" | "body_cinema" | "trailer" | "clone" | "challenge">("body_cinema");

  const { data } = (trpc.godMode as any)?.getConsoleState?.useQuery?.(undefined, { staleTime: 30_000 }) || { data: null };
  const launchAttack = (trpc.godMode as any)?.launchCreatorAttack?.useMutation?.() || null;

  const systems = data?.systems || fallbackSystems;
  const bodyCinema = data?.bodyCinema;
  const launchResult = launchAttack?.data;

  const headline = useMemo(() => {
    return bodyCinema?.headline || "Stop posting clips. Start dropping scenes people pay to unlock.";
  }, [bodyCinema]);

  const runAttack = async () => {
    if (!launchAttack) return;
    await launchAttack.mutateAsync({ system: selectedSystem, offerName, targetRevenue, audience: "adult creators, VIP fans, PPV buyers, and launch-week observers" });
  };

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top left, rgba(0,217,255,.20), transparent 36%), radial-gradient(circle at top right, rgba(255,43,214,.18), transparent 34%), #050505", color: "white", fontFamily: "Inter, ui-sans-serif, system-ui" }}>
      <section style={{ padding: "56px 32px 24px", maxWidth: 1320, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ maxWidth: 820 }}>
            <div style={{ color: accent, letterSpacing: ".22em", textTransform: "uppercase", fontWeight: 900, fontSize: 12 }}>CreatorVault God Mode</div>
            <h1 style={{ fontSize: "clamp(44px, 7vw, 94px)", lineHeight: .88, margin: "18px 0", letterSpacing: "-.08em", fontWeight: 950 }}>
              The adult creator command center built to make raw content feel expensive.
            </h1>
            <p style={{ fontSize: 22, color: "#d7d7d7", lineHeight: 1.45, maxWidth: 760 }}>
              {headline} This is not another editor with vague buttons. Every action is named by the money outcome: enhance the scene, build the PPV bundle, cut the trailer, launch the proof board, and track the revenue.
            </p>
          </div>
          <div style={{ minWidth: 280, padding: 20, border: "1px solid rgba(255,255,255,.12)", borderRadius: 28, background: "rgba(10,10,10,.72)", boxShadow: "0 24px 80px rgba(0,0,0,.45)" }}>
            <div style={{ color: gold, fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".16em" }}>Live target</div>
            <div style={{ fontSize: 48, fontWeight: 950, marginTop: 10 }}>${Number(data?.revenueTarget || targetRevenue).toLocaleString()}</div>
            <p style={{ color: "#aaa", lineHeight: 1.5 }}>Use God Mode to push every clip toward an actual checkout, not just another view.</p>
            <Link href="/ai-agent-challenge"><button style={buttonStyle(hot)}>Open Revenue Board</button></Link>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1320, margin: "0 auto", padding: "24px 32px 40px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {systems.map((system: any) => (
          <button key={system.key} onClick={() => setSelectedSystem(system.key)} style={{ textAlign: "left", padding: 22, borderRadius: 24, border: `1px solid ${selectedSystem === system.key ? accent : "rgba(255,255,255,.12)"}`, background: selectedSystem === system.key ? "linear-gradient(135deg, rgba(0,217,255,.18), rgba(255,255,255,.04))" : "rgba(255,255,255,.045)", color: "white", cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <strong style={{ fontSize: 18 }}>{system.label}</strong>
              <span style={{ color: selectedSystem === system.key ? accent : "#888", fontSize: 11, textTransform: "uppercase", fontWeight: 900 }}>{system.status}</span>
            </div>
            <p style={{ color: "#bcbcbc", lineHeight: 1.45 }}>{system.promise}</p>
          </button>
        ))}
      </section>

      <section style={{ maxWidth: 1320, margin: "0 auto", padding: "0 32px 60px", display: "grid", gridTemplateColumns: "minmax(300px, 1.1fr) minmax(300px, .9fr)", gap: 22 }}>
        <div style={panelStyle}>
          <div style={{ color: accent, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".18em", fontSize: 12 }}>Body Cinema flagship</div>
          <h2 style={{ fontSize: 42, letterSpacing: "-.05em", margin: "14px 0 10px" }}>Buttons creators instantly understand.</h2>
          <p style={{ color: "#cfcfcf", fontSize: 17, lineHeight: 1.55 }}>
            Body Cinema should feel like walking into a private production house. The creator does not choose confusing parameters; they choose the business outcome and the visual fantasy.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 22 }}>
            {(bodyCinema?.directCTAs || ["Make It Cinematic", "Build My PPV Drop", "Find The Money Shot", "Turn This Into A Trailer", "Package For Every Platform"]).map((cta: string) => (
              <div key={cta} style={{ padding: 16, border: "1px solid rgba(0,217,255,.25)", borderRadius: 18, background: "rgba(0,217,255,.07)", fontWeight: 900 }}>{cta}</div>
            ))}
          </div>
          <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/vaultx-editor"><button style={buttonStyle(accent)}>Open Body Cinema</button></Link>
            <Link href="/launch-trailer-studio"><button style={buttonStyle(gold, true)}>Build Trailer Pack</button></Link>
            <Link href="/king/clone-command"><button style={buttonStyle(hot, true)}>Clone Scene</button></Link>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={{ color: hot, fontWeight: 950, textTransform: "uppercase", letterSpacing: ".18em", fontSize: 12 }}>Launch attack</div>
          <h2 style={{ fontSize: 34, letterSpacing: "-.04em", margin: "14px 0" }}>Name the drop. Pick the weapon. Ship toward revenue.</h2>
          <label style={labelStyle}>Offer name</label>
          <input value={offerName} onChange={(event) => setOfferName(event.target.value)} style={inputStyle} />
          <label style={labelStyle}>Revenue target</label>
          <input type="number" value={targetRevenue} onChange={(event) => setTargetRevenue(Number(event.target.value || 0))} style={inputStyle} />
          <button onClick={runAttack} disabled={launchAttack?.isPending} style={{ ...buttonStyle(hot), marginTop: 18, width: "100%" }}>
            {launchAttack?.isPending ? "Arming System..." : "Launch Creator Attack"}
          </button>
          {launchResult && (
            <div style={{ marginTop: 18, padding: 16, borderRadius: 18, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)" }}>
              <strong>{launchResult.command}</strong>
              <ol style={{ color: "#cfcfcf", lineHeight: 1.7 }}>
                {launchResult.nextSteps.map((step: string) => <li key={step}>{step}</li>)}
              </ol>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function buttonStyle(color: string, outline = false): CSSProperties {
  return { border: `1px solid ${color}`, background: outline ? "rgba(255,255,255,.04)" : color, color: outline ? color : "#050505", borderRadius: 999, padding: "13px 18px", fontWeight: 950, cursor: "pointer", boxShadow: outline ? "none" : `0 14px 40px ${color}33` };
}

const panelStyle: CSSProperties = { padding: 28, borderRadius: 30, border: "1px solid rgba(255,255,255,.12)", background: "linear-gradient(145deg, rgba(255,255,255,.075), rgba(255,255,255,.035))", boxShadow: "0 24px 90px rgba(0,0,0,.38)" };
const labelStyle: CSSProperties = { display: "block", color: "#aaa", textTransform: "uppercase", letterSpacing: ".13em", fontSize: 11, fontWeight: 900, margin: "16px 0 8px" };
const inputStyle: CSSProperties = { width: "100%", boxSizing: "border-box", borderRadius: 16, border: "1px solid rgba(255,255,255,.14)", background: "rgba(0,0,0,.35)", color: "white", padding: "14px 16px", fontSize: 16, outline: "none" };
