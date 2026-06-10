import { useEffect, useState } from "react";
import { Link } from "wouter";

const COOKIE_NAME = "age_verified";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function hasAgeCookie() {
  if (typeof document === "undefined") return true;
  return document.cookie.split(";").some((entry) => entry.trim().startsWith(`${COOKIE_NAME}=true`));
}

export default function AgeGate() {
  const [verified, setVerified] = useState(() => hasAgeCookie());

  useEffect(() => {
    setVerified(hasAgeCookie());
  }, []);

  const enterSite = () => {
    document.cookie = `${COOKIE_NAME}=true; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
    setVerified(true);
  };

  const exitSite = () => {
    window.location.href = "https://www.google.com";
  };

  if (verified) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background:
          "radial-gradient(circle at 50% 0%, rgba(201,168,76,.22), transparent 34%), linear-gradient(145deg, #050508 0%, #0b0710 48%, #120611 100%)",
        color: "#fff",
      }}
    >
      <div
        style={{
          width: "min(560px, 100%)",
          border: "1px solid rgba(247,214,122,.34)",
          borderRadius: 28,
          padding: "34px 28px",
          background: "linear-gradient(160deg, rgba(255,255,255,.095), rgba(255,255,255,.028))",
          boxShadow: "0 32px 120px rgba(0,0,0,.66)",
          textAlign: "center",
          backdropFilter: "blur(18px)",
        }}
      >
        <div style={{ marginBottom: 18, fontSize: 13, fontWeight: 950, letterSpacing: ".24em", textTransform: "uppercase", color: "#f7d67a" }}>
          VaultX
        </div>
        <h1 id="age-gate-title" style={{ margin: 0, fontSize: "clamp(30px, 7vw, 52px)", lineHeight: .92, letterSpacing: "-.05em", fontWeight: 950 }}>
          Adult Access Verification
        </h1>
        <p style={{ margin: "22px auto 0", maxWidth: 430, color: "rgba(255,255,255,.74)", fontSize: 17, lineHeight: 1.65 }}>
          This site contains adult content. You must be 18 or older to enter.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 28 }}>
          <button
            type="button"
            onClick={enterSite}
            style={{
              border: "none",
              borderRadius: 14,
              padding: "15px 18px",
              background: "linear-gradient(135deg,#f7d67a,#c9a84c 48%,#8f6b21)",
              color: "#050508",
              fontWeight: 950,
              letterSpacing: ".07em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Enter — I am 18+
          </button>
          <button
            type="button"
            onClick={exitSite}
            style={{
              border: "1px solid rgba(255,255,255,.18)",
              borderRadius: 14,
              padding: "15px 18px",
              background: "rgba(255,255,255,.055)",
              color: "rgba(255,255,255,.86)",
              fontWeight: 850,
              letterSpacing: ".07em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Exit
          </button>
        </div>
        <p style={{ margin: "20px auto 0", maxWidth: 440, color: "rgba(255,255,255,.42)", fontSize: 12, lineHeight: 1.55 }}>
          By entering you confirm you are 18+ and agree to our <Link href="/terms" style={{ color: "#f7d67a", textDecoration: "none" }}>Terms of Service</Link>.
        </p>
      </div>
    </div>
  );
}
