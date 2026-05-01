import { useState, useRef } from "react";
import { Link } from "wouter";
import { safeStorage } from "@/lib/safeStorage";

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const doLogin = async (emailVal: string, passwordVal: string) => {
    if (!emailVal || !passwordVal) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: emailVal.trim(), password: passwordVal }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Invalid email or password");
        setLoading(false);
        return;
      }
      if (data.token) {
        safeStorage.setItem("authToken", data.token);
        try { localStorage.setItem("authToken", data.token); } catch (_) {}
      }
      await new Promise(resolve => setTimeout(resolve, 150));
      const userRole = data.user?.role || '';
      if (userRole === 'chica') {
        window.location.replace('/chica');
      } else if (userRole === 'king' || userRole === 'admin') {
        window.location.replace('/owner-cockpit');
      } else {
        window.location.replace('/dashboard');
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailVal = emailRef.current?.value ?? "";
    const passwordVal = passwordRef.current?.value ?? "";
    await doLogin(emailVal, passwordVal);
  };

  const handleButtonClick = async () => {
    const emailVal = emailRef.current?.value ?? "";
    const passwordVal = passwordRef.current?.value ?? "";
    await doLogin(emailVal, passwordVal);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050508",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Ambient background glow */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(201,168,76,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      <div style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        maxWidth: "400px",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <img
            src="/logo-white.png"
            alt="CreatorVault"
            style={{ height: 48, objectFit: "contain", margin: "0 auto" }}
          />
          <p style={{
            marginTop: "12px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "#c9a84c",
          }}>
            Empire OS
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(20,20,20,0.95)",
          border: "1px solid rgba(201,168,76,0.15)",
          borderRadius: "16px",
          padding: "36px 32px",
          backdropFilter: "blur(20px)",
        }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "28px",
            fontWeight: 700,
            color: "#f5f0e8",
            marginBottom: "6px",
            textAlign: "center",
          }}>
            Welcome Back
          </h1>
          <p style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.4)",
            textAlign: "center",
            marginBottom: "28px",
          }}>
            Sign in to your CreatorVault account
          </p>

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.4)",
              color: "#ef4444",
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              marginBottom: "20px",
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.5)",
                marginBottom: "8px",
              }}>
                Email
              </label>
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="your@email.com"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#f5f0e8",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => { e.target.style.borderColor = "rgba(201,168,76,0.5)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.5)",
                marginBottom: "8px",
              }}>
                Password
              </label>
              <input
                ref={passwordRef}
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#f5f0e8",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => { e.target.style.borderColor = "rgba(201,168,76,0.5)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              onClick={handleButtonClick}
              style={{
                width: "100%",
                padding: "14px",
                background: loading ? "rgba(201,168,76,0.4)" : "#c9a84c",
                border: "none",
                borderRadius: "8px",
                color: "#050508",
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.2s, transform 0.1s",
                boxShadow: loading ? "none" : "0 4px 20px rgba(201,168,76,0.3)",
              }}
              onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.background = "#d4b05c"; }}
              onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.background = "#c9a84c"; }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p style={{
            textAlign: "center",
            marginTop: "20px",
            fontSize: "13px",
            color: "rgba(255,255,255,0.35)",
          }}>
            Don't have an account?{" "}
            <Link to="/signup">
              <span style={{
                color: "#c9a84c",
                cursor: "pointer",
                fontWeight: 600,
                textDecoration: "none",
              }}>
                Sign up
              </span>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
