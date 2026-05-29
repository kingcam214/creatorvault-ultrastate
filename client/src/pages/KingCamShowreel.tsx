import React from "react";
import { Link } from "wouter";

const media = [
  { title: "Operator Hero", video: "/videos/kingcam-hero-cam.mp4", poster: "/assets/kingcam-hero.jpg", tag: "Founder signal" },
  { title: "Clone Ambassador", video: "/videos/kingcam-clone-1.mp4", poster: "/images/clone-ambassador.webp", tag: "Avatar proof" },
  { title: "VaultX Trailer", video: "/videos/vaultx-cinematic-trailer.mp4", poster: "/videos/vaultx-cinematic-trailer-poster.png", tag: "Premium funnel" },
  { title: "OpenArt Motion", video: "/videos/openart-showcase.mp4", poster: "/images/reel/reel-creator-promo.png", tag: "AI campaign" },
];

export default function KingCamShowreel() {
  return <main style={{ minHeight: "100vh", background: "#050508", color: "#fff", fontFamily: "Inter, sans-serif", padding: "48px 24px" }}>
    <section style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 28, alignItems: "center" }}>
      <div>
        <div style={{ color: "#C9A84C", letterSpacing: ".18em", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>God Mode AI Video Weapon</div>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "clamp(44px,7vw,88px)", lineHeight: .92, margin: "14px 0" }}>KingCam showreel is the proof wall.</h1>
        <p style={{ color: "rgba(255,255,255,.72)", fontSize: 18, lineHeight: 1.7, maxWidth: 720 }}>This route now shows the owned motion stack: founder video, clone visuals, VaultX trailer flow, and AI campaign motion. It is built to push creators into the editor and trailer studio, not sit as a dead placeholder.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
          <Link href="/vault-x/editor"><a style={{ padding: "13px 18px", borderRadius: 12, background: "#C9A84C", color: "#050508", fontWeight: 900, textDecoration: "none" }}>Open VaultX Editor</a></Link>
          <Link href="/launch-trailer-studio"><a style={{ padding: "13px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", color: "#fff", fontWeight: 900, textDecoration: "none" }}>Build Launch Trailer</a></Link>
        </div>
      </div>
      <div style={{ borderRadius: 28, overflow: "hidden", border: "1px solid rgba(201,168,76,.35)", boxShadow: "0 30px 90px rgba(0,0,0,.55)", background: "#0b0b10" }}>
        <video src="/videos/kingcam-hero-cam.mp4" poster="/assets/kingcam-hero.jpg" autoPlay muted loop playsInline style={{ width: "100%", height: 580, objectFit: "cover", display: "block" }} />
      </div>
    </section>
    <section style={{ maxWidth: 1180, margin: "42px auto 0", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16 }}>
      {media.map(item => <article key={item.title} style={{ border: "1px solid rgba(255,255,255,.10)", borderRadius: 20, overflow: "hidden", background: "rgba(255,255,255,.035)" }}>
        <video src={item.video} poster={item.poster} autoPlay muted loop playsInline style={{ width: "100%", height: 260, objectFit: "cover", display: "block" }} />
        <div style={{ padding: 16 }}><div style={{ color: "#38BDF8", fontSize: 11, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase" }}>{item.tag}</div><h2 style={{ margin: "8px 0 0", fontSize: 18 }}>{item.title}</h2></div>
      </article>)}
    </section>
  </main>;
}
