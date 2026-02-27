import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("alice@wsp.com");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/proposals");
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-wsp-dark flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-wsp-dark-2 p-12 relative overflow-hidden">
        {/* Geometric accent */}
        <div className="absolute top-0 right-0 w-64 h-64 border-l-2 border-b-2 border-wsp-red/20 -translate-y-1/4 translate-x-1/4" />
        <div className="absolute bottom-20 left-0 w-48 h-48 border-r-2 border-t-2 border-wsp-red/10" />

        <div>
          <span className="font-display font-bold text-white text-2xl tracking-[0.3em] uppercase">WSP</span>
        </div>

        <div>
          <h2 className="font-display text-5xl font-bold text-white leading-tight tracking-tight mb-4">
            Proposal<br />Management<br />
            <span className="text-wsp-red">Tool</span>
          </h2>
          <p className="text-white/40 font-body text-sm leading-relaxed max-w-xs">
            Centralised RFP responses — WBS, Pricing, People,
            Schedule and Deliverables in one place.
          </p>
        </div>

        <p className="text-white/20 text-xs font-mono tracking-wider">PoC v0.1 — Confidential</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-wsp-bg-soft">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <span className="font-display font-bold text-wsp-dark text-xl tracking-[0.3em] uppercase">WSP</span>
          </div>

          <h1 className="font-display text-2xl font-semibold text-wsp-dark tracking-tight mb-1">
            Sign in
          </h1>
          <p className="text-wsp-muted text-sm font-body mb-8">
            Access your proposals
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-display font-semibold tracking-widest uppercase text-wsp-muted mb-1.5">
                Email
              </label>
              <input
                className="wsp-input w-full"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@wsp.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-display font-semibold tracking-widest uppercase text-wsp-muted mb-1.5">
                Password
              </label>
              <input
                className="wsp-input w-full"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-wsp-red text-xs font-body border-l-2 border-wsp-red pl-3 py-1">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="wsp-btn-primary w-full mt-2 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-wsp-border">
            <p className="text-xs text-wsp-muted font-body mb-2 font-semibold uppercase tracking-wider">Demo accounts</p>
            <div className="space-y-1 font-mono text-xs text-wsp-muted">
              <p>alice@wsp.com · bob@wsp.com · carol@wsp.com</p>
              <p>password: <span className="text-wsp-dark">demo123</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
