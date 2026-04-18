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
        // Write to both safeStorage and raw localStorage for maximum compatibility
        safeStorage.setItem("authToken", data.token);
        try { localStorage.setItem("authToken", data.token); } catch (_) {}
      }
      // Small delay to ensure storage write completes before navigation
      await new Promise(resolve => setTimeout(resolve, 150));
      // Role-based redirect
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
    // Read directly from DOM refs as fallback for mobile browsers
    // where React synthetic events may not fire for autofill/paste
    const emailVal = emailRef.current?.value ?? "";
    const passwordVal = passwordRef.current?.value ?? "";
    await doLogin(emailVal, passwordVal);
  };

  const handleButtonClick = async () => {
    // Direct click handler as fallback if form onSubmit doesn't fire
    const emailVal = emailRef.current?.value ?? "";
    const passwordVal = passwordRef.current?.value ?? "";
    await doLogin(emailVal, passwordVal);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="max-w-md w-full space-y-8 bg-[var(--bg-surface)] backdrop-blur-lg p-8 rounded-sm border border-[color:rgba(245,240,232,0.10)]">
        <div>
          <h2 className="mt-6 text-center text-4xl font-extrabold text-[var(--text-primary)]">
            Welcome Back
          </h2>
          <p className="mt-2 text-center text-sm text-[var(--text-primary)]/70">
            Sign in to your CreatorVault account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-[color:rgba(245,240,232,0.12)] placeholder-gray-500 text-[var(--text-primary)] bg-[var(--bg-primary)] rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                ref={passwordRef}
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-[color:rgba(245,240,232,0.12)] placeholder-gray-500 text-[var(--text-primary)] bg-[var(--bg-primary)] rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              onClick={handleButtonClick}
              className="group relative w-full flex justify-center py-3 px-4 border border-[color:rgba(245,240,232,0.10)] text-sm font-medium rounded-sm text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-gold)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
          <div className="text-center">
            <p className="text-sm text-[var(--text-primary)]/70">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="font-medium text-[var(--accent-gold)] hover:text-[var(--accent-gold)]/85"
              >
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
