import React, { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Waitlist() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [audienceType, setAudienceType] = useState<"" | "creator" | "fan">("");
  const [socialHandle, setSocialHandle] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const requestAccess = trpc.waitlist.signup.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Access request saved.");
    },
    onError: (error) => {
      if (error.message.toLowerCase().includes("already")) {
        setSubmitted(true);
        toast.success("You are already on the access list.");
        return;
      }
      toast.error(error.message || "Could not save your request.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !audienceType) {
      toast.error("Name, email, and Creator/Fan selection are required.");
      return;
    }

    requestAccess.mutate({
      name: name.trim(),
      email: email.trim(),
      referralSource: socialHandle.trim() ? `social:${socialHandle.trim()}` : "public-signup",
      interestedIn: [audienceType, "vaultx", "creatorvault"],
    });
  };

  return (
    <main style={styles.shell}>
      <section style={styles.card}>
        <Link href="/" style={styles.brand}>CreatorVault / VaultX</Link>
        {submitted ? (
          <div style={{ textAlign: "center" }}>
            <p style={styles.kicker}>Request received</p>
            <h1 style={styles.title}>You are on the access list.</h1>
            <p style={styles.copy}>We saved your request for <strong style={{ color: "#f7d67a" }}>{email}</strong>. Creator, fan, and partner access is being staged carefully so the front door, legal layer, and creator profiles stay ready for serious conversations.</p>
            <div style={styles.actions}>
              <Link href="/"><button style={styles.primary}>Back to homepage</button></Link>
              <Link href="/creator/kingcam"><button style={styles.secondary}>View creator profile</button></Link>
            </div>
          </div>
        ) : (
          <>
            <p style={styles.kicker}>Request Access</p>
            <h1 style={styles.title}>Enter the CreatorVault / VaultX launch lane.</h1>
            <p style={styles.copy}>Request early access as a creator or fan. This public page saves to the real waitlist database and does not require login.</p>
            <form onSubmit={handleSubmit} style={styles.form}>
              <label style={styles.label}>
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={styles.input} />
              </label>
              <label style={styles.label}>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={styles.input} />
              </label>
              <label style={styles.label}>
                I am a
                <select value={audienceType} onChange={(e) => setAudienceType(e.target.value as "creator" | "fan" | "")} style={styles.input}>
                  <option value="" style={styles.option}>Select one</option>
                  <option value="creator" style={styles.option}>Creator</option>
                  <option value="fan" style={styles.option}>Fan</option>
                </select>
              </label>
              <label style={styles.label}>
                Social handle <span style={{ color: "rgba(255,255,255,.34)" }}>(optional)</span>
                <input value={socialHandle} onChange={(e) => setSocialHandle(e.target.value)} placeholder="@handle or profile URL" style={styles.input} />
              </label>
              <button type="submit" disabled={requestAccess.isPending} style={{ ...styles.primary, width: "100%", opacity: requestAccess.isPending ? .7 : 1 }}>
                {requestAccess.isPending ? "Saving request..." : "Request Access"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "radial-gradient(circle at 20% 0%, rgba(201,168,76,.18), transparent 34%), linear-gradient(145deg,#050508,#09070d 50%,#130611)", color: "#fff" },
  card: { width: "min(720px, 100%)", border: "1px solid rgba(255,255,255,.10)", borderRadius: 30, background: "linear-gradient(160deg, rgba(255,255,255,.08), rgba(255,255,255,.026))", boxShadow: "0 34px 120px rgba(0,0,0,.58)", padding: "clamp(24px, 5vw, 52px)" },
  brand: { color: "#f7d67a", textDecoration: "none", fontSize: 12, fontWeight: 950, letterSpacing: ".18em", textTransform: "uppercase" },
  kicker: { margin: "24px 0 10px", color: "#f7d67a", fontSize: 12, fontWeight: 950, letterSpacing: ".18em", textTransform: "uppercase" },
  title: { margin: 0, fontSize: "clamp(38px, 7vw, 68px)", lineHeight: .9, letterSpacing: "-.065em", fontWeight: 950 },
  copy: { color: "rgba(255,255,255,.70)", fontSize: 17, lineHeight: 1.68, marginTop: 18 },
  form: { display: "grid", gap: 16, marginTop: 28 },
  label: { display: "grid", gap: 8, color: "rgba(255,255,255,.58)", fontSize: 11, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase" },
  input: { width: "100%", border: "1px solid rgba(255,255,255,.14)", borderRadius: 13, background: "rgba(255,255,255,.06)", color: "#fff", padding: "14px 15px", fontSize: 15, outline: "none" },
  option: { background: "#09070d", color: "#fff" },
  primary: { border: "none", borderRadius: 13, padding: "15px 22px", background: "linear-gradient(135deg,#f7d67a,#c9a84c 48%,#8f6b21)", color: "#050508", fontWeight: 950, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" },
  secondary: { border: "1px solid rgba(255,255,255,.18)", borderRadius: 13, padding: "15px 22px", background: "rgba(255,255,255,.055)", color: "#fff", fontWeight: 850, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer" },
  actions: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 26 },
};
