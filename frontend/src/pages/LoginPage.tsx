import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("alice@wsp.com");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/proposals");
    } catch {
      setError("Invalid credentials");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white shadow rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">WSP Proposal Tool</h1>
        <p className="text-gray-500 text-sm mb-6">Sign in to continue</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" required
          />
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700"
          >
            Sign In
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-4">
          Demo: alice@wsp.com / bob@wsp.com / carol@wsp.com — password: demo123
        </p>
      </div>
    </div>
  );
}
