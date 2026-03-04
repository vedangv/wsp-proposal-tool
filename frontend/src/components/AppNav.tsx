import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { label: "Proposals", path: "/proposals" },
  { label: "Projects", path: "/projects" },
  { label: "Lessons Learnt", path: "/lessons" },
];

export default function AppNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <header className="bg-wsp-dark border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Left: logo + title */}
        <div className="flex items-center gap-4">
          <span className="font-display font-bold text-white text-xl tracking-[0.3em] uppercase">WSP</span>
          <span className="text-white/20 text-lg">|</span>
          <span className="font-display text-white/70 text-sm tracking-widest uppercase font-medium">
            Proposal Tool
          </span>
        </div>
        {/* Center: nav links */}
        <nav className="flex items-center gap-6">
          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`text-sm font-body transition-colors ${
                location.pathname.startsWith(item.path)
                  ? "text-white border-b-2 border-red-500 pb-1"
                  : "text-white/50 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        {/* Right: user + sign out */}
        <div className="flex items-center gap-5">
          <span className="text-white/50 text-sm font-body">{user?.name}</span>
          <button
            onClick={logout}
            className="text-white/40 hover:text-white text-xs font-display tracking-widest uppercase transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
