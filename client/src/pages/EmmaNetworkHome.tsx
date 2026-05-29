import React from "react";
import { Link } from "wouter";

const lanes = [
  { title: "Short-form attack", copy: "Turn one asset into hooks, teasers, captions, and daily posting angles.", video: "/videos/openart-showcase.mp4", poster: "/images/reel/reel-creator-promo.png" },
  { title: "VaultX monetization", copy: "Route warm attention into FAST, BOOST, and FULL premium drops.", video: "/videos/vaultx-cinematic-trailer.mp4", poster: "/videos/vaultx-cinematic-trailer-poster.png" },
  { title: "Clone-led visuals", copy: "Use avatar and presenter assets to keep the campaign alive when the creator is offline.", video: "/videos/kingcam-clone-2.mp4", poster: "/images/vaultx/vaultx-business-presenter-hero.png" },
];

export default function EmmaNetworkHome() {
  return <main style={{ minHeight: "100vh", background: "linear-gradient(135deg,#06060a,#130817 55%,#050508)", color: "#fff", fontFamily: "Inter, sans-serif", padding: "48px 24px" }}>
    <section style={{ maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, alignItems: "center" }}>
        <div>
          <div style={{ color: "#EC4899", letterSpacing: ".18em", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>Creator Network Command</div>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(42px,7vw,82px)", lineHeight: .94, margin: "14px 0" }}>Every empty lane becomes a content weapon.</h1>
          <p style={{ color: "rgba(255,255,255,.72)", fontSize: 18, lineHeight: 1.7 }}>Emma Network is now a visual command page for creators, managers, and teams: produce the content, route it through VaultX, publish to Telegram and socials, then keep the loop moving with AI-assisted campaigns.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
            <Link href="/vault-x"><a style={{ padding: "13px 18px", borderRadius: 12, background: "#EC4899", color: "#fff", fontWeight: 900, textDecoration: "none" }}>Open VaultX Home</a></Link>
            <Link href="/vault-x/editor"><a style={{ padding: "13px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", color: "#fff", fontWeight: 900, textDecoration: "none" }}>Launch Editor</a></Link>
          </div>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {lanes.map(lane => <article key={lane.title} style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 14, border: "1px solid rgba(255,255,255,.1)", borderRadius: 22, padding: 12, background: "rgba(255,255,255,.04)" }}>
            <video src={lane.video} poster={lane.poster} autoPlay muted loop playsInline style={{ width: 150, height: 190, objectFit: "cover", borderRadius: 16 }} />
            <div style={{ alignSelf: "center" }}><h2 style={{ margin: 0, fontSize: 22 }}>{lane.title}</h2><p style={{ color: "rgba(255,255,255,.65)", lineHeight: 1.55 }}>{lane.copy}</p></div>
          </article>)}
        </div>
      </div>
    </section>
  </main>;
}
