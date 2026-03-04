import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { proposalsApi, type Proposal } from "../api/proposals";
import { templatesApi, type ProposalTemplate } from "../api/templates";
import AppNav from "../components/AppNav";

const STATUS_STYLES: Record<string, string> = {
  draft:       "bg-wsp-bg-soft text-wsp-muted border border-wsp-border",
  in_review:   "bg-amber-50 text-amber-700 border border-amber-200",
  submitted:   "bg-blue-50 text-blue-700 border border-blue-200",
  won:         "bg-emerald-50 text-emerald-700 border border-emerald-200",
  lost:        "bg-red-50 text-wsp-red border border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost",
};

const ALL_STATUSES = ["draft", "in_review", "submitted", "won", "lost"];

export default function ProposalsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProposalTemplate | null>(null);
  const [form, setForm] = useState({ proposal_number: "", title: "", client_name: "" });

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: proposalsApi.list,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: templatesApi.list,
    enabled: showTemplates,
  });

  const createMutation = useMutation({
    mutationFn: proposalsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      setShowForm(false);
      setForm({ proposal_number: "", title: "", client_name: "" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Proposal["status"] }) =>
      proposalsApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: templatesApi.createProposal,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["proposals"] });
      setShowTemplates(false);
      setSelectedTemplate(null);
      setForm({ proposal_number: "", title: "", client_name: "" });
      navigate(`/proposals/${data.id}`);
    },
  });

  return (
    <div className="min-h-screen bg-wsp-bg-soft">
      <AppNav />

      <main className="max-w-6xl mx-auto py-8 px-6">
        {/* Page title row */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="font-display text-2xl font-semibold text-wsp-dark tracking-tight">Proposals</h2>
            <p className="text-wsp-muted text-sm font-body mt-0.5">
              {proposals.length} proposal{proposals.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowTemplates(v => !v); setShowForm(false); }}
              className="wsp-btn-ghost"
            >
              From Template
            </button>
            <button
              onClick={() => { setShowForm(v => !v); setShowTemplates(false); }}
              className="wsp-btn-primary"
            >
              + New Proposal
            </button>
          </div>
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

        {/* Template picker */}
        {showTemplates && (
          <div className="wsp-card p-5 mb-5">
            <h3 className="font-display font-semibold text-wsp-dark text-sm tracking-widest uppercase mb-4">
              New from Template
            </h3>

            {!selectedTemplate ? (
              <div className="grid grid-cols-3 gap-3">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t)}
                    className="text-left p-4 border border-wsp-border hover:border-wsp-red transition-colors"
                  >
                    <p className="font-display font-semibold text-wsp-dark text-sm mb-1">{t.name}</p>
                    <p className="text-xs text-wsp-muted font-body">{t.description}</p>
                    <p className="text-[10px] text-wsp-muted font-mono mt-2">
                      {t.template_data.wbs_items.length} WBS items · {t.template_data.phases.length} phases
                    </p>
                  </button>
                ))}
                {templates.length === 0 && (
                  <p className="text-wsp-muted text-sm font-body col-span-3">No templates available.</p>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="text-xs text-wsp-muted hover:text-wsp-dark font-body"
                  >
                    ← Back
                  </button>
                  <span className="font-display font-semibold text-wsp-dark text-sm">{selectedTemplate.name}</span>
                </div>
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
                    onClick={() => createFromTemplateMutation.mutate({
                      template_id: selectedTemplate.id,
                      proposal_number: form.proposal_number,
                      title: form.title,
                      client_name: form.client_name || undefined,
                    })}
                    disabled={!form.proposal_number || !form.title}
                    className="wsp-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Create from Template
                  </button>
                  <button onClick={() => { setShowTemplates(false); setSelectedTemplate(null); }} className="wsp-btn-ghost">
                    Cancel
                  </button>
                </div>
              </div>
            )}
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
                    <td onClick={e => e.stopPropagation()}>
                      <select
                        value={p.status}
                        onChange={e => updateStatusMutation.mutate({ id: p.id, status: e.target.value as Proposal["status"] })}
                        className={`wsp-badge ${STATUS_STYLES[p.status] || STATUS_STYLES.draft} cursor-pointer appearance-none pr-5 bg-[length:12px] bg-[right_4px_center] bg-no-repeat`}
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z'/%3E%3C/svg%3E")` }}
                      >
                        {ALL_STATUSES.map(s => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
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
