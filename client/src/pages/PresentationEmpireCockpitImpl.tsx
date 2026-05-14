import { useState } from "react";
import { trpc } from "@/lib/trpc";

const C = {
  bg: "#070707",
  panel: "#101010",
  panel2: "#151515",
  border: "#2a2419",
  text: "#f8f1df",
  sub: "#b9ad95",
  muted: "#756b58",
  gold: "#d8b45f",
  green: "#67d69b",
  red: "#ff6b6b",
};

const platforms = ["tiktok", "instagram", "youtube", "x"] as const;

export function PresentationEmpireCockpit() {
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState<(typeof platforms)[number]>("instagram");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "scraping" | "auditing" | "rendering" | "packaging" | "complete" | "failed">("all");

  const stats = trpc.presentationEmpire.getEmpireStats.useQuery(undefined, { refetchInterval: 15000 });
  const packages = trpc.presentationEmpire.listPackages.useQuery({ limit: 25, status: statusFilter }, { refetchInterval: 15000 });
  const generate = trpc.presentationEmpire.generatePackage.useMutation({ onSuccess: () => { packages.refetch(); stats.refetch(); } });
  const markSold = trpc.presentationEmpire.markPackageSold.useMutation({ onSuccess: () => { packages.refetch(); stats.refetch(); } });

  const data: any = stats.data ?? {};
  const packageRows: any[] = Array.isArray(packages.data) ? packages.data as any[] : [];

  async function startPackage() {
    const clean = handle.replace(/^@/, "").trim();
    if (!clean) return;
    await generate.mutateAsync({ handle: clean, platform });
    setHandle("");
  }

  return <div style={{ minHeight: "100vh", background: `radial-gradient(circle at top right, rgba(216,180,95,.16), transparent 30%), ${C.bg}`, color: C.text, padding: 32 }}>
    <div style={{ maxWidth: 1320, margin: "0 auto", display: "grid", gap: 22 }}>
      <header style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "start" }}>
        <div>
          <div style={eyebrow}>Presentation Empire Operator Cockpit</div>
          <h1 style={{ fontSize: 44, lineHeight: .98, margin: "10px 0", letterSpacing: "-.045em" }}>Turn creator handles into paid audit packages.</h1>
          <p style={{ color: C.sub, maxWidth: 820, fontSize: 16 }}>This is wired to the real <b>presentationEmpire</b> backend: package generation, async scraping/audit/render/package lifecycle, Telegram notification, sales marking, and Empire Challenge crediting through existing production procedures.</p>
        </div>
        <div style={{ ...card, minWidth: 310 }}>
          <div style={sectionTitle}>Generate $497 Package</div>
          <div style={{ display: "grid", gap: 10 }}>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="creator handle, no placeholder allowed" style={input} />
            <select value={platform} onChange={(e) => setPlatform(e.target.value as any)} style={input}>{platforms.map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}</select>
            <button onClick={startPackage} disabled={!handle.trim() || generate.isPending} style={primaryButton}>{generate.isPending ? "Starting package..." : "Launch Package Pipeline"}</button>
            {generate.error && <div style={{ color: C.red, fontSize: 13 }}>{generate.error.message}</div>}
            {generate.data && <div style={successBox}>Package started: {(generate.data as any).packageId}</div>}
          </div>
        </div>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
        <Metric label="Generated" value={data.totalGenerated ?? 0} />
        <Metric label="Complete" value={data.totalComplete ?? 0} />
        <Metric label="Sold" value={data.totalSold ?? 0} />
        <Metric label="Revenue" value={`$${Number(data.totalRevenue ?? 0).toLocaleString()}`} />
        <Metric label="KingCam Cut" value={`$${Number(data.kingcamCut ?? 0).toLocaleString()}`} />
      </section>

      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={sectionTitle}>Package Pipeline</div>
            <p style={{ color: C.sub, margin: 0 }}>Polls production every 15 seconds. Every row comes from presentation_empire_packages.</p>
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} style={{ ...input, width: 180 }}>
            {['all','pending','scraping','auditing','rendering','packaging','complete','failed'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Handle","Platform","Status","Leak","Price","Payment","Seller","ZIP","Action"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {packageRows.map((pkg) => <tr key={pkg.packageId}>
                <td style={td}>@{pkg.handle}</td>
                <td style={td}>{String(pkg.platform).toUpperCase()}</td>
                <td style={td}><span style={statusPill(pkg.status)}>{pkg.status}</span></td>
                <td style={td}>${Number(pkg.revenueLeak ?? 0).toLocaleString()}</td>
                <td style={td}>${Number(pkg.priceUsd ?? 497).toLocaleString()}</td>
                <td style={td}>{pkg.paymentStatus}</td>
                <td style={td}>{pkg.soldByChica || "direct"}</td>
                <td style={td}>{pkg.zipUrl ? <a href={pkg.zipUrl} style={{ color: C.gold }}>Download</a> : <span style={{ color: C.muted }}>pending</span>}</td>
                <td style={td}><button disabled={markSold.isPending || pkg.paymentStatus === 'paid'} onClick={() => markSold.mutate({ packageId: pkg.packageId })} style={miniButton}>{pkg.paymentStatus === 'paid' ? 'Sold' : 'Mark Sold'}</button></td>
              </tr>)}
              {!packageRows.length && <tr><td colSpan={9} style={{ ...td, color: C.muted, textAlign: "center", padding: 30 }}>No package rows returned for this filter.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={card}><div style={sectionTitle}>Recent Package Activity</div>{(data.recentPackages ?? []).map((pkg: any, i: number) => <div key={`${pkg.handle}-${i}`} style={activity}><b>@{pkg.handle}</b><span>{pkg.platform} • {pkg.status} • {pkg.paymentStatus}</span><em>${Number(pkg.revenueLeak ?? 0).toLocaleString()} leak</em></div>)}</div>
        <div style={card}><div style={sectionTitle}>Operating Rules</div><p style={{ color: C.sub }}>No placeholder UI remains on this route. The launch button calls the live async package generator. Sales marking calls the live markPackageSold mutation, which sends the Telegram sale alert and credits the active Empire Challenge when configured.</p><p style={{ color: C.sub }}>If a package fails, the row stays visible with <b>failed</b> status so the operator can see the blocker instead of being given a fake success.</p></div>
      </section>
    </div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div style={card}><div style={{ color: C.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 900 }}>{label}</div><div style={{ fontSize: 28, fontWeight: 950, marginTop: 8 }}>{value}</div></div>;
}

function statusPill(status: string): React.CSSProperties {
  const good = status === "complete";
  const bad = status === "failed";
  return { display: "inline-block", padding: "6px 9px", borderRadius: 999, fontSize: 12, fontWeight: 900, color: good ? C.green : bad ? C.red : C.gold, background: good ? "rgba(103,214,155,.1)" : bad ? "rgba(255,107,107,.1)" : "rgba(216,180,95,.1)", border: `1px solid ${good ? 'rgba(103,214,155,.3)' : bad ? 'rgba(255,107,107,.3)' : 'rgba(216,180,95,.3)'}` };
}

const card: React.CSSProperties = { background: "rgba(16,16,16,.9)", border: `1px solid ${C.border}`, borderRadius: 22, padding: 20, boxShadow: "0 18px 60px rgba(0,0,0,.28)" };
const eyebrow: React.CSSProperties = { color: C.gold, fontSize: 12, textTransform: "uppercase", letterSpacing: ".16em", fontWeight: 950 };
const sectionTitle: React.CSSProperties = { fontSize: 17, fontWeight: 950, marginBottom: 12 };
const input: React.CSSProperties = { background: "#090909", border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, padding: "12px 13px", outline: "none" };
const primaryButton: React.CSSProperties = { background: C.gold, color: "#111", border: 0, borderRadius: 12, padding: "13px 16px", fontWeight: 950, cursor: "pointer" };
const miniButton: React.CSSProperties = { background: "#151515", color: C.gold, border: `1px solid ${C.gold}`, borderRadius: 9, padding: "8px 10px", fontWeight: 850, cursor: "pointer" };
const successBox: React.CSSProperties = { background: "rgba(103,214,155,.1)", color: C.green, border: "1px solid rgba(103,214,155,.3)", borderRadius: 12, padding: 10, fontSize: 13 };
const th: React.CSSProperties = { textAlign: "left", color: C.sub, borderBottom: `1px solid ${C.border}`, padding: "11px 10px", fontSize: 12, textTransform: "uppercase", letterSpacing: ".1em" };
const td: React.CSSProperties = { borderBottom: `1px solid ${C.border}`, padding: "12px 10px", color: C.text, fontSize: 14 };
const activity: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1.2fr auto", gap: 10, padding: "12px 0", borderBottom: `1px solid ${C.border}`, color: C.sub };

export default PresentationEmpireCockpit;

