import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { proposalsApi } from "../api/proposals";
import { useAuth } from "../context/AuthContext";

const STATUS_STYLES: Record<string, string> = {
  draft:     "bg-wsp-bg-soft text-wsp-muted border border-wsp-border",
  active:    "bg-green-50 text-green-700 border border-green-200",
  submitted: "bg-blue-50 text-blue-700 border border-blue-200",
  won:       "bg-emerald-50 text-emerald-700 border border-emerald-200",
  lost:      "bg-red-50 text-wsp-red border border-red-200",
};

export default function ProposalsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ proposal_number: "", title: "", client_name: "" });

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: proposalsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: proposalsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      setShowForm(false);
      setForm({ proposal_number: "", title: "", client_name: "" });
    },
  });

  return (
    <div className="min-h-screen bg-wsp-bg-soft">
      {/* Header */}
      <header className="bg-wsp-dark border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="font-display font-bold text-white text-xl tracking-[0.3em] uppercase">WSP</span>
            <span className="text-white/20 text-lg">|</span>
            <span className="font-display text-white/70 text-sm tracking-widest uppercase font-medium">
              Proposal Tool
            </span>
          </div>
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

      <main className="max-w-6xl mx-auto py-8 px-6">
        {/* Page title row */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="font-display text-2xl font-semibold text-wsp-dark tracking-tight">Proposals</h2>
            <p className="text-wsp-muted text-sm font-body mt-0.5">
              {proposals.length} proposal{proposals.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="wsp-btn-primary"
          >
            + New Proposal
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="wsp-card p-5 mb-5">
            <h3 className="font-display font-semibold text-wsp-dark text-sm tracking-widest uppercase mb-4">
              New Proposal
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-display font-semibold tracking-widest uppercase text-wsp-muted mb-1.5">
                  Proposal #
                </label>
                <input
                  className="wsp-input w-full font-mono"
                  placeholder="e.g. WSP-2026-001"
                  value={form.proposal_number}
                  onChange={e => setForm(f => ({ ...f, proposal_number: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-display font-semibold tracking-widest uppercase text-wsp-muted mb-1.5">
                  Title
                </label>
                <input
                  className="wsp-input w-full"
                  placeholder="Project title"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-display font-semibold tracking-widest uppercase text-wsp-muted mb-1.5">
                  Client
                </label>
                <input
                  className="wsp-input w-full"
                  placeholder="Client name"
                  value={form.client_name}
                  onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => createMutation.mutate({ ...form, status: "draft" })}
                disabled={!form.proposal_number || !form.title}
                className="wsp-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Create Proposal
              </button>
              <button onClick={() => setShowForm(false)} className="wsp-btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <p className="text-wsp-muted text-sm font-body py-8">Loading…</p>
        ) : (
          <div className="wsp-card overflow-hidden">
            <table className="wsp-table w-full">
              <thead>
                <tr>
                  <th>Proposal #</th>
                  <th>Title</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th className="text-right">Updated</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map(p => (
                  <tr
                    key={p.id}
                    className="cursor-pointer group"
                    onClick={() => navigate(`/proposals/${p.id}`)}
                  >
                    <td>
                      <span className="font-mono text-wsp-red text-xs tracking-wider group-hover:underline">
                        {p.proposal_number}
                      </span>
                    </td>
                    <td className="font-body text-wsp-dark font-medium">{p.title}</td>
                    <td className="text-wsp-muted">{p.client_name || "—"}</td>
                    <td>
                      <span className={`wsp-badge ${STATUS_STYLES[p.status] || STATUS_STYLES.draft}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="text-right text-wsp-muted font-mono text-xs">
                      {new Date(p.updated_at).toLocaleDateString("en-AU", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {proposals.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-wsp-muted text-sm font-body">No proposals yet.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-3 text-wsp-red text-sm font-display tracking-wide hover:underline"
                >
                  Create your first proposal →
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
