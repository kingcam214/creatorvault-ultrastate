import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

const T = {
  bg: "#080808",
  panel: "#101010",
  panel2: "#151515",
  border: "#252018",
  text: "#f7efe1",
  sub: "#b7aa91",
  muted: "#766d5d",
  gold: "#d6b25e",
  green: "#61d394",
  red: "#ff6b6b",
};

type FieldProps = { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean };
function Field({ label, value, onChange, placeholder, textarea }: FieldProps) {
  return <label style={{ display: "grid", gap: 8 }}>
    <span style={{ color: T.sub, fontSize: 12, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 800 }}>{label}</span>
    {textarea ? <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} style={inputStyle as any} /> : <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />}
  </label>;
}

const inputStyle: React.CSSProperties = { background: "#0b0b0b", border: `1px solid ${T.border}`, color: T.text, borderRadius: 12, padding: "13px 14px", outline: "none", fontSize: 14 };

export function PresentationBuilder() {
  const [title, setTitle] = useState("CreatorVault Revenue Audit Package");
  const [topic, setTopic] = useState("Expose revenue leakage, package a paid offer, and activate Telegram follow-up for a creator prospect");
  const [audience, setAudience] = useState("creator prospect, manager, or sponsor buyer");
  const [creatorHandle, setCreatorHandle] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [monetizationGoal, setMonetizationGoal] = useState("Sell a $497 audit and convert to ongoing CreatorVault monetization workflow");
  const [distributionChannel, setDistributionChannel] = useState("Telegram internal alert plus direct DM close sequence");
  const [slides, setSlides] = useState(12);
  const [offerPriceUsd, setOfferPriceUsd] = useState(497);
  const [style, setStyle] = useState("premium dark executive sales deck");
  const [slideTitle, setSlideTitle] = useState("Revenue Leak Diagnosis");
  const [slideContext, setSlideContext] = useState("A creator has audience attention but no structured paid conversion path, no Telegram sequence, and no quantified offer ladder.");
  const [slideType, setSlideType] = useState("proof-and-CTA");

  const build = trpc.presentationBuilder.buildPresentation.useMutation();
  const slide = trpc.presentationBuilder.generateSlideContent.useMutation();
  const templates = trpc.presentationBuilder.listTemplates.useQuery(undefined, { staleTime: 30000 });
  const empirePackages = trpc.presentationEmpire.listPackages.useQuery({ limit: 6 } as any, { staleTime: 15000 });

  const canBuild = title.trim().length > 2 && topic.trim().length > 2 && audience.trim().length > 1;
  const latestPackages = useMemo(() => {
    const raw = (empirePackages.data as any)?.packages ?? (Array.isArray(empirePackages.data) ? empirePackages.data : []);
    return Array.isArray(raw) ? raw.slice(0, 6) : [];
  }, [empirePackages.data]);

  async function runBuild() {
    if (!canBuild) return;
    await build.mutateAsync({ title, topic, audience, slides, style, creatorHandle: creatorHandle || undefined, platform, monetizationGoal, offerPriceUsd, distributionChannel });
  }

  async function runSlide() {
    await slide.mutateAsync({ slideTitle, context: slideContext, slideType });
  }

  return <div style={{ minHeight: "100vh", background: `radial-gradient(circle at top left, rgba(214,178,94,.12), transparent 34%), ${T.bg}`, color: T.text, padding: 32 }}>
    <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: 22 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start" }}>
        <div>
          <div style={{ color: T.gold, fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".16em" }}>CreatorVault Presentation Empire</div>
          <h1 style={{ fontSize: 42, lineHeight: 1, margin: "10px 0 8px", letterSpacing: "-.04em" }}>Revenue deck builder wired to production persistence.</h1>
          <p style={{ color: T.sub, maxWidth: 760, fontSize: 16 }}>This surface generates sendable creator monetization decks and slide copy, persists the output to Empire Agent Reports, and shows recent Presentation Empire packages from the live backend.</p>
        </div>
        <button disabled={!canBuild || build.isPending} onClick={runBuild} style={{ background: canBuild ? T.gold : T.border, color: "#111", border: 0, borderRadius: 14, padding: "15px 22px", fontWeight: 900, cursor: canBuild ? "pointer" : "not-allowed" }}>{build.isPending ? "Generating..." : "Build Production Deck"}</button>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 18 }}>
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Deck Command Inputs</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Deck title" value={title} onChange={setTitle} />
            <Field label="Audience" value={audience} onChange={setAudience} />
            <Field label="Creator handle" value={creatorHandle} onChange={setCreatorHandle} placeholder="optional: @prospect" />
            <Field label="Platform" value={platform} onChange={setPlatform} />
            <Field label="Style" value={style} onChange={setStyle} />
            <label style={{ display: "grid", gap: 8 }}><span style={labelStyle}>Slides / Offer price</span><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><input type="number" value={slides} onChange={(e) => setSlides(Number(e.target.value))} style={inputStyle} /><input type="number" value={offerPriceUsd} onChange={(e) => setOfferPriceUsd(Number(e.target.value))} style={inputStyle} /></div></label>
          </div>
          <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
            <Field label="Topic" value={topic} onChange={setTopic} textarea />
            <Field label="Monetization goal" value={monetizationGoal} onChange={setMonetizationGoal} textarea />
            <Field label="Distribution channel" value={distributionChannel} onChange={setDistributionChannel} />
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitle}>Template Catalog</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {((templates.data as any)?.templates ?? []).map((template: any) => <button key={template.id} onClick={() => { setTitle(template.name); setSlides(template.slides); setStyle(template.style); setTopic(template.useCase); }} style={{ textAlign: "left", background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14, color: T.text, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><b>{template.name}</b><span style={{ color: T.gold }}>{template.slides} slides</span></div>
              <p style={{ color: T.sub, margin: "8px 0 0", fontSize: 13 }}>{template.useCase}</p>
            </button>)}
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={cardStyle}>
          <h2 style={sectionTitle}>Generated Deck Output</h2>
          {build.error && <p style={{ color: T.red }}>{build.error.message}</p>}
          {build.data ? <><div style={badgeStyle}>Persisted report: {(build.data as any).reportType} • Revenue impact ${(build.data as any).revenueImpact}</div><pre style={preStyle}>{(build.data as any).presentation}</pre></> : <p style={{ color: T.muted }}>Run the builder to generate a deck that is saved into Empire Agent Reports. Empty output is treated as a production failure, not a silent placeholder.</p>}
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitle}>Single-Slide Generator</h2>
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="Slide title" value={slideTitle} onChange={setSlideTitle} />
            <Field label="Slide type" value={slideType} onChange={setSlideType} />
            <Field label="Context" value={slideContext} onChange={setSlideContext} textarea />
            <button onClick={runSlide} disabled={slide.isPending} style={{ background: T.panel2, border: `1px solid ${T.gold}`, color: T.gold, borderRadius: 12, padding: 13, fontWeight: 900 }}>{slide.isPending ? "Generating..." : "Generate Slide Copy"}</button>
            {slide.error && <p style={{ color: T.red }}>{slide.error.message}</p>}
            {slide.data && <><div style={badgeStyle}>Persisted report: {(slide.data as any).reportType}</div><pre style={preStyle}>{(slide.data as any).content}</pre></>}
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitle}>Live Presentation Empire Packages</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {latestPackages.length ? latestPackages.map((pkg: any) => <div key={pkg.packageId || pkg.id} style={{ background: "#0d0d0d", border: `1px solid ${T.border}`, borderRadius: 14, padding: 14 }}>
            <div style={{ color: T.gold, fontWeight: 900 }}>@{pkg.handle || pkg.client_handle}</div>
            <div style={{ color: T.sub, fontSize: 13 }}>{pkg.platform} • {pkg.status}</div>
            <div style={{ marginTop: 10, fontSize: 12, color: T.muted }}>Leak: ${Number(pkg.revenueLeak || pkg.revenue_leak_usd || 0).toLocaleString()} • Price: ${Number(pkg.priceUsd || pkg.price_usd || 497).toLocaleString()}</div>
          </div>) : <p style={{ color: T.muted }}>No packages returned yet from presentationEmpire.listPackages.</p>}
        </div>
      </section>
    </div>
  </div>;
}

const cardStyle: React.CSSProperties = { background: "rgba(16,16,16,.88)", border: `1px solid ${T.border}`, borderRadius: 22, padding: 22, boxShadow: "0 20px 60px rgba(0,0,0,.3)" };
const sectionTitle: React.CSSProperties = { margin: "0 0 16px", fontSize: 18, letterSpacing: "-.02em" };
const labelStyle: React.CSSProperties = { color: T.sub, fontSize: 12, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 800 };
const badgeStyle: React.CSSProperties = { display: "inline-block", color: T.green, background: "rgba(97,211,148,.1)", border: "1px solid rgba(97,211,148,.25)", borderRadius: 999, padding: "7px 10px", fontSize: 12, fontWeight: 800, marginBottom: 12 };
const preStyle: React.CSSProperties = { whiteSpace: "pre-wrap", background: "#090909", border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, color: T.text, lineHeight: 1.5, maxHeight: 620, overflow: "auto" };

export default PresentationBuilder;

