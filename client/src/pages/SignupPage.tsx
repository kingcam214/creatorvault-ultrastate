import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: () => {
      toast.success("Account created! Sign in to continue.");
      setLocation("/login");
    },
    onError: (err) => {
      setError(err.message || "Signup failed. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !username || !password) {
      setError("Email, username, and password are required.");
      return;
    }
    signupMutation.mutate({ email, username, password, name: name || undefined, role: "creator" });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050508",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        position: "fixed",
        inset: 0,
        background: "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(0,217,255,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />
      <div style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        maxWidth: "420px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "20px",
        padding: "40px 36px",
        backdropFilter: "blur(20px)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <p style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "10px",
            color: "#00D9FF",
            letterSpacing: "0.2em",
            marginBottom: "8px",
          }}>CREATORVAULT</p>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "32px",
            color: "#FFFFFF",
            margin: 0,
            letterSpacing: "0.05em",
          }}>Create Your Account</h1>
          <p style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.4)",
            marginTop: "6px",
          }}>Start earning 85% of every sale</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: "6px" }}>
              DISPLAY NAME (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "12px 14px",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: "6px" }}>
              USERNAME *
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              placeholder="your_username"
              autoComplete="username"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "12px 14px",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: "6px" }}>
              EMAIL *
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "12px 14px",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", marginBottom: "6px" }}>
              PASSWORD *
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "12px 14px",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <p style={{
              background: "rgba(255,60,60,0.1)",
              border: "1px solid rgba(255,60,60,0.3)",
              borderRadius: "8px",
              padding: "10px 14px",
              color: "#ff6b6b",
              fontSize: "13px",
              margin: 0,
            }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={signupMutation.isPending}
            style={{
              width: "100%",
              background: signupMutation.isPending ? "rgba(0,217,255,0.4)" : "#00D9FF",
              color: "#000",
              border: "none",
              borderRadius: "10px",
              padding: "14px",
              fontSize: "14px",
              fontWeight: 800,
              cursor: signupMutation.isPending ? "not-allowed" : "pointer",
              letterSpacing: "0.05em",
              marginTop: "4px",
              transition: "background 0.2s",
            }}
          >
            {signupMutation.isPending ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p style={{
          textAlign: "center",
          marginTop: "20px",
          fontSize: "13px",
          color: "rgba(255,255,255,0.35)",
        }}>
          Already have an account?{" "}
          <Link to="/login">
            <span style={{ color: "#C9A84C", cursor: "pointer", fontWeight: 600 }}>Sign in</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
