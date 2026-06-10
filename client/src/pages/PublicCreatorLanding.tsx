import React from "react";
import { Link, useRoute } from "wouter";

type Creator = {
  handle: string;
  name: string;
  photo: string;
  bio: string;
  accent: string;
  tiers: Array<{ name: string; price: string; description: string }>;
  content: Array<{ title: string; type: "free" | "paid"; description: string }>;
};

const creators: Record<string, Creator> = {
  kingcam: {
    handle: "kingcam",
    name: "King Cam",
    photo: "KC",
    bio: "Founder-led creator profile for premium drops, behind-the-scenes vault updates, launch trailers, and business-forward creator education built around the VaultX operating system.",
    accent: "#f7d67a",
    tiers: [
      { name: "Vault Insider", price: "$19/mo", description: "Free previews, creator notes, early announcements, and community updates." },
      { name: "Premium Vault", price: "$49/mo", description: "Subscriber-only drops, extended previews, launch packs, and priority unlock windows." },
      { name: "Executive Access", price: "$149/mo", description: "Private business breakdowns, campaign receipts, and high-touch creator workflow insights." },
    ],
    content: [
      { title: "VaultX launch signal", type: "free", description: "Public preview of the system, positioning, and launch direction." },
      { title: "Body Cinema command notes", type: "paid", description: "Premium planning layer for high-conversion adult-business trailer packaging." },
      { title: "Creator monetization receipt", type: "paid", description: "Subscriber-only proof pack and workflow breakdown." },
    ],
  },
  negriitax3: {
    handle: "negriitax3",
    name: "Negriitax3",
    photo: "N3",
    bio: "Launch creator profile prepared for premium fan conversion, subscription packaging, teaser-led discovery, and adult-business automation workflows.",
    accent: "#ff4fb8",
    tiers: [
      { name: "Preview Pass", price: "$15/mo", description: "Public-safe drops, schedule updates, and profile announcements." },
      { name: "Premium Club", price: "$39/mo", description: "Locked previews, member posts, and curated vault releases." },
      { name: "VIP Route", price: "$99/mo", description: "Priority drops, request windows, and campaign-driven premium access." },
    ],
    content: [
      { title: "Welcome preview", type: "free", description: "Creator intro and public-safe profile teaser." },
      { title: "Premium drop queue", type: "paid", description: "Blurred subscriber preview for upcoming member content." },
      { title: "VIP announcement", type: "paid", description: "Locked campaign preview and subscriber-first update." },
    ],
  },
  bcb: {
    handle: "bcb",
    name: "BCB",
    photo: "BCB",
    bio: "Adult-business creator profile prepared for premium subscriptions, locked content previews, subscriber tiers, and launch-campaign conversion pages.",
    accent: "#7bdcff",
    tiers: [
      { name: "Fan Entry", price: "$12/mo", description: "Follow public updates, teaser posts, and profile announcements." },
      { name: "Premium Access", price: "$35/mo", description: "Member-only previews, curated drops, and vault updates." },
      { name: "Top Shelf", price: "$125/mo", description: "VIP campaign access, private release windows, and priority subscriber perks." },
    ],
    content: [
      { title: "Creator intro", type: "free", description: "Public-facing bio and launch announcement." },
      { title: "Locked premium preview", type: "paid", description: "Subscriber-only content preview with protected paywall treatment." },
      { title: "Campaign drop board", type: "paid", description: "Upcoming monetized content queue for paid members." },
    ],
  },
};

export default function PublicCreatorLanding() {
  const [, params] = useRoute("/creator/:handle");
  const handle = params?.handle?.toLowerCase() ?? "kingcam";
  const creator = creators[handle];

  if (!creator) {
    return (
      <main style={styles.shell}>
        <section style={styles.card}>
          <Link href="/" style={styles.brand}>VaultX Creator Profile</Link>
          <h1 style={styles.title}>Creator profile coming online.</h1>
          <p style={styles.copy}>This public creator route exists, but the requested handle is not one of the launch profiles yet.</p>
          <Link href="/signup"><button style={styles.primary}>Request Access</button></Link>
        </section>
      </main>
    );
  }

  return (
    <main style={{ ...styles.shell, background: `radial-gradient(circle at 20% 0%, ${creator.accent}24, transparent 32%), linear-gradient(145deg,#050508,#09070d 48%,#110611)` }}>
      <section style={styles.hero}>
        <div style={{ ...styles.photo, borderColor: `${creator.accent}88`, color: creator.accent }}>{creator.photo}</div>
        <div>
          <Link href="/" style={{ ...styles.brand, color: creator.accent }}>VaultX Creator</Link>
          <h1 style={styles.title}>{creator.name}</h1>
          <p style={styles.handle}>@{creator.handle}</p>
          <p style={styles.copy}>{creator.bio}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 22 }}>
            <Link href={`/signup?creator=${creator.handle}`}><button style={{ ...styles.primary, background: `linear-gradient(135deg, ${creator.accent}, #c9a84c)` }}>Request Subscribe Access</button></Link>
            <Link href="/signup"><button style={styles.secondary}>Request creator access</button></Link>
          </div>
        </div>
      </section>

      <section style={styles.grid}>
        {creator.tiers.map((tier) => (
          <article key={tier.name} style={styles.panel}>
            <p style={{ ...styles.eyebrow, color: creator.accent }}>{tier.name}</p>
            <h2 style={styles.price}>{tier.price}</h2>
            <p style={styles.panelCopy}>{tier.description}</p>
            <Link href={`/signup?creator=${creator.handle}&tier=${encodeURIComponent(tier.name)}`}><button style={styles.tierButton}>Request Subscribe Access</button></Link>
          </article>
        ))}
      </section>

      <section style={{ ...styles.card, marginTop: 24 }}>
        <p style={{ ...styles.eyebrow, color: creator.accent }}>Recent content</p>
        <h2 style={{ ...styles.sectionTitle, marginTop: 6 }}>Free previews and paid vault drops</h2>
        <div style={styles.contentGrid}>
          {creator.content.map((item) => (
            <article key={item.title} style={{ ...styles.contentCard, filter: item.type === "paid" ? "blur(.45px)" : "none" }}>
              <span style={{ ...styles.badge, background: item.type === "paid" ? "rgba(255,255,255,.08)" : `${creator.accent}22`, color: item.type === "paid" ? "rgba(255,255,255,.72)" : creator.accent }}>{item.type === "paid" ? "Paid preview" : "Free"}</span>
              <h3 style={styles.contentTitle}>{item.title}</h3>
              <p style={styles.panelCopy}>{item.description}</p>
              {item.type === "paid" && <div style={styles.locked}>Subscribe to unlock</div>}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: { minHeight: "100vh", color: "#fff", padding: "38px 20px 56px" },
  hero: { maxWidth: 1120, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(120px, 220px) 1fr", gap: 32, alignItems: "center", border: "1px solid rgba(255,255,255,.10)", borderRadius: 30, background: "linear-gradient(160deg, rgba(255,255,255,.08), rgba(255,255,255,.026))", boxShadow: "0 32px 120px rgba(0,0,0,.54)", padding: "clamp(24px, 5vw, 52px)" },
  card: { maxWidth: 1120, margin: "0 auto", border: "1px solid rgba(255,255,255,.10)", borderRadius: 28, background: "rgba(255,255,255,.045)", padding: "clamp(22px, 4vw, 36px)" },
  photo: { width: "min(34vw, 190px)", aspectRatio: "1", borderRadius: 34, border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(145deg, rgba(255,255,255,.12), rgba(255,255,255,.03))", fontSize: 42, fontWeight: 950, letterSpacing: "-.06em" },
  brand: { textDecoration: "none", fontSize: 12, fontWeight: 950, letterSpacing: ".18em", textTransform: "uppercase" },
  title: { margin: "18px 0 8px", fontSize: "clamp(44px, 8vw, 86px)", lineHeight: .86, letterSpacing: "-.07em", fontWeight: 950 },
  handle: { margin: 0, color: "rgba(255,255,255,.48)", fontWeight: 850, letterSpacing: ".08em", textTransform: "uppercase" },
  copy: { maxWidth: 760, color: "rgba(255,255,255,.72)", fontSize: 17, lineHeight: 1.66 },
  primary: { border: "none", borderRadius: 13, padding: "14px 22px", color: "#050508", fontWeight: 950, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" },
  secondary: { border: "1px solid rgba(255,255,255,.18)", borderRadius: 13, padding: "14px 22px", background: "rgba(255,255,255,.055)", color: "#fff", fontWeight: 850, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" },
  grid: { maxWidth: 1120, margin: "24px auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 },
  panel: { border: "1px solid rgba(255,255,255,.10)", borderRadius: 24, background: "rgba(255,255,255,.052)", padding: 24 },
  eyebrow: { margin: 0, fontSize: 11, fontWeight: 950, letterSpacing: ".16em", textTransform: "uppercase" },
  price: { margin: "12px 0 10px", fontSize: 36, letterSpacing: "-.05em" },
  panelCopy: { color: "rgba(255,255,255,.66)", lineHeight: 1.6, fontSize: 14 },
  tierButton: { marginTop: 10, width: "100%", border: "1px solid rgba(255,255,255,.16)", borderRadius: 12, padding: "12px 16px", background: "rgba(255,255,255,.075)", color: "#fff", fontWeight: 850, cursor: "pointer" },
  sectionTitle: { fontSize: "clamp(26px, 4vw, 42px)", margin: 0, letterSpacing: "-.05em" },
  contentGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 20 },
  contentCard: { position: "relative", minHeight: 170, border: "1px solid rgba(255,255,255,.10)", borderRadius: 20, padding: 20, background: "linear-gradient(145deg, rgba(255,255,255,.07), rgba(255,255,255,.025))", overflow: "hidden" },
  badge: { display: "inline-flex", borderRadius: 999, padding: "6px 10px", fontSize: 10, fontWeight: 900, letterSpacing: ".11em", textTransform: "uppercase" },
  contentTitle: { margin: "16px 0 8px", fontSize: 20 },
  locked: { position: "absolute", inset: "auto 16px 16px 16px", borderRadius: 12, padding: "10px 12px", background: "rgba(0,0,0,.54)", color: "#fff", textAlign: "center", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em" },
};
