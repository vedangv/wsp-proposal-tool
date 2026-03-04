import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientHistoryApi, type OutreachType } from "../../api/client-history";
import { proposalsApi, type Proposal } from "../../api/proposals";

interface Props { proposalId: string; }

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600",
  in_review: "bg-amber-50 text-amber-700",
  submitted: "bg-blue-50 text-blue-700",
  won:       "bg-emerald-50 text-emerald-700",
  lost:      "bg-red-50 text-red-600",
};

const OUTREACH_COLORS: Record<string, string> = {
  call:         "bg-blue-100 text-blue-700",
  email:        "bg-purple-100 text-purple-700",
  meeting:      "bg-emerald-100 text-emerald-700",
  presentation: "bg-amber-100 text-amber-700",
  site_visit:   "bg-teal-100 text-teal-700",
  other:        "bg-gray-100 text-gray-600",
};

const OUTREACH_TYPES: { value: OutreachType; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "presentation", label: "Presentation" },
  { value: "site_visit", label: "Site Visit" },
  { value: "other", label: "Other" },
];

export default function ClientHistoryTab({ proposalId }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    outreach_date: new Date().toISOString().slice(0, 10),
    outreach_type: "call" as OutreachType,
    contact_name: "",
    contact_role: "",
    notes: "",
  });

  const { data: proposal } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => proposalsApi.get(proposalId),
  });

  const { data: pastProposals = [], isLoading: loadingPast } = useQuery({
    queryKey: ["client-history", proposalId, "past"],
    queryFn: () => clientHistoryApi.listPastProposals(proposalId),
  });

  const { data: allOutreach = [], isLoading: loadingOutreach } = useQuery({
    queryKey: ["client-history", proposalId, "outreach-all"],
    queryFn: () => clientHistoryApi.listAllOutreach(proposalId),
  });

  const updateProposal = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Proposal> }) =>
      proposalsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-history", proposalId, "past"] });
      qc.invalidateQueries({ queryKey: ["proposal"] });
    },
  });

  const createOutreach = useMutation({
    mutationFn: (data: Parameters<typeof clientHistoryApi.createOutreach>[1]) =>
      clientHistoryApi.createOutreach(proposalId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-history", proposalId] });
      setShowForm(false);
      setFormData({ outreach_date: new Date().toISOString().slice(0, 10), outreach_type: "call", contact_name: "", contact_role: "", notes: "" });
    },
  });

  const deleteOutreach = useMutation({
    mutationFn: (outreachId: string) => clientHistoryApi.deleteOutreach(proposalId, outreachId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-history", proposalId] }),
  });

  const handleSubmitOutreach = () => {
    createOutreach.mutate({
      outreach_date: formData.outreach_date,
      outreach_type: formData.outreach_type,
      contact_name: formData.contact_name || null,
      contact_role: formData.contact_role || null,
      notes: formData.notes || null,
    });
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Past Proposals */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-display font-semibold text-wsp-dark text-base tracking-tight">
              Past Proposals — {proposal?.client_name || "Client"}
            </h3>
            <p className="text-xs text-wsp-muted font-body mt-0.5">
              Previous proposals submitted for this client with outcomes and lessons learned
            </p>
          </div>
        </div>

        {loadingPast ? (
          <div className="wsp-card p-8 text-center">
            <span className="text-wsp-muted text-sm">Loading past proposals...</span>
          </div>
        ) : pastProposals.length === 0 ? (
          <div className="wsp-card p-8 text-center">
            <p className="text-wsp-muted text-sm font-body">
              {proposal?.client_name
                ? "No other proposals found for this client."
                : "Set a client name on this proposal to see past proposals."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastProposals.map((p) => (
              <div key={p.id} className="wsp-card">
                {/* Summary row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-wsp-bg-soft/30 transition-colors"
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                >
                  <span className="font-mono text-wsp-red text-xs tracking-wider flex-shrink-0">
                    {p.proposal_number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-display font-semibold text-wsp-dark text-sm">{p.title}</span>
                  </div>
                  {p.submission_deadline && (
                    <span className="text-xs text-wsp-muted font-mono flex-shrink-0">
                      {p.submission_deadline}
                    </span>
                  )}
                  <span className={`wsp-badge text-[10px] flex-shrink-0 ${STATUS_COLORS[p.status] || STATUS_COLORS.draft}`}>
                    {p.status === "in_review" ? "In Review" : p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </span>
                  <span className="text-xs text-wsp-muted">
                    {expandedId === p.id ? "▲" : "▼"}
                  </span>
                </div>

                {/* Expanded: debrief + feedback */}
                {expandedId === p.id && (
                  <div className="border-t border-wsp-border px-4 py-4 bg-wsp-bg-soft/30 space-y-4">
                    <div>
                      <label className="block text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1.5">
                        Debrief Notes
                      </label>
                      <textarea
                        rows={3}
                        className="wsp-input w-full text-xs resize-none font-body"
                        defaultValue={p.debrief_notes || ""}
                        placeholder="Add debrief notes — what went well, lessons learned..."
                        onBlur={(e) => {
                          if (e.target.value !== (p.debrief_notes || "")) {
                            updateProposal.mutate({ id: p.id, data: { debrief_notes: e.target.value || null } });
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1.5">
                        Client Feedback
                      </label>
                      <textarea
                        rows={3}
                        className="wsp-input w-full text-xs resize-none font-body"
                        defaultValue={p.client_feedback || ""}
                        placeholder="Add client feedback received during debrief..."
                        onBlur={(e) => {
                          if (e.target.value !== (p.client_feedback || "")) {
                            updateProposal.mutate({ id: p.id, data: { client_feedback: e.target.value || null } });
                          }
                        }}
                      />
                    </div>

                    {/* Create Lesson from Debrief button */}
                    {(p.debrief_notes || p.client_feedback) && (
                      <div className="pt-1">
                        <button
                          onClick={() => {
                            const params = new URLSearchParams();
                            params.set("source", "proposal_debrief");
                            const category = p.status === "won" ? "win_strategy" : p.status === "lost" ? "loss_reason" : "";
                            if (category) params.set("category", category);
                            params.set("client", proposal?.client_name || "");
                            params.set("proposal_id", p.id);
                            if (p.debrief_notes) params.set("description", p.debrief_notes);
                            if (p.client_feedback) params.set("recommendation", p.client_feedback);
                            navigate(`/lessons/new?${params.toString()}`);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-display tracking-wide text-purple-600 border border-purple-300 rounded px-3 py-1.5 hover:bg-purple-50 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M11 3a1 1 0 10-2 0v1a1 1 0 002 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM4 11a1 1 0 100-2H3a1 1 0 000 2h1zM10 18a1 1 0 001-1v-1a1 1 0 10-2 0v1a1 1 0 001 1zM7 9a3 3 0 116 0 3 3 0 01-6 0z" />
                          </svg>
                          Create Lesson from Debrief
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Client Outreach Log */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-display font-semibold text-wsp-dark text-base tracking-tight">
              Client Outreach Log
            </h3>
            <p className="text-xs text-wsp-muted font-body mt-0.5">
              All outreach activities across proposals for this client
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="wsp-btn-primary">
            + Add Outreach
          </button>
        </div>

        {/* Add outreach form */}
        {showForm && (
          <div className="wsp-card p-4 mb-4 space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">Date *</label>
                <input
                  type="date"
                  className="wsp-input w-full text-xs"
                  value={formData.outreach_date}
                  onChange={(e) => setFormData(d => ({ ...d, outreach_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">Type *</label>
                <select
                  className="wsp-input w-full text-xs"
                  value={formData.outreach_type}
                  onChange={(e) => setFormData(d => ({ ...d, outreach_type: e.target.value as OutreachType }))}
                >
                  {OUTREACH_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">Contact Name</label>
                <input
                  className="wsp-input w-full text-xs"
                  value={formData.contact_name}
                  onChange={(e) => setFormData(d => ({ ...d, contact_name: e.target.value }))}
                  placeholder="e.g. John Smith"
                />
              </div>
              <div>
                <label className="block text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">Contact Role</label>
                <input
                  className="wsp-input w-full text-xs"
                  value={formData.contact_role}
                  onChange={(e) => setFormData(d => ({ ...d, contact_role: e.target.value }))}
                  placeholder="e.g. Project Manager"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">Notes</label>
              <textarea
                rows={2}
                className="wsp-input w-full text-xs resize-none"
                value={formData.notes}
                onChange={(e) => setFormData(d => ({ ...d, notes: e.target.value }))}
                placeholder="Summary of the outreach activity..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubmitOutreach}
                disabled={createOutreach.isPending}
                className="text-green-700 hover:text-green-900 text-xs px-3 py-1.5 border border-green-300 rounded font-display tracking-wide"
              >
                {createOutreach.isPending ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="text-wsp-muted hover:text-wsp-dark text-xs px-3 py-1.5 border border-wsp-border rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loadingOutreach ? (
          <div className="wsp-card p-8 text-center">
            <span className="text-wsp-muted text-sm">Loading outreach records...</span>
          </div>
        ) : allOutreach.length === 0 ? (
          <div className="wsp-card p-8 text-center">
            <p className="text-wsp-muted text-sm font-body">
              No outreach records yet. Track client interactions across proposals.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {allOutreach.map((o) => {
              const isCurrentProposal = o.proposal_id === proposalId;
              const matchingProposal = pastProposals.find(p => p.id === o.proposal_id);
              const sourceLabel = isCurrentProposal
                ? "Current"
                : matchingProposal?.proposal_number || "Other";

              return (
                <div key={o.id} className="wsp-card p-3 flex items-start gap-3">
                  {/* Type badge */}
                  <span className={`wsp-badge text-[10px] flex-shrink-0 mt-0.5 ${OUTREACH_COLORS[o.outreach_type] || OUTREACH_COLORS.other}`}>
                    {o.outreach_type.replace("_", " ")}
                  </span>

                  {/* Date */}
                  <span className="text-xs font-mono text-wsp-muted flex-shrink-0 w-20 mt-0.5">
                    {o.outreach_date}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      {o.contact_name && (
                        <span className="font-display font-medium text-wsp-dark text-xs">{o.contact_name}</span>
                      )}
                      {o.contact_role && (
                        <span className="text-[11px] text-wsp-muted font-body">{o.contact_role}</span>
                      )}
                    </div>
                    {o.notes && (
                      <p className="text-xs text-wsp-dark/80 font-body mt-0.5 line-clamp-2">{o.notes}</p>
                    )}
                  </div>

                  {/* Source proposal */}
                  <span className={`text-[10px] font-mono flex-shrink-0 mt-0.5 ${isCurrentProposal ? "text-wsp-red" : "text-wsp-muted"}`}>
                    {sourceLabel}
                  </span>

                  {/* Actions for current proposal outreach only */}
                  {isCurrentProposal && (
                    <button
                      onClick={() => deleteOutreach.mutate(o.id)}
                      className="text-wsp-red/40 hover:text-wsp-red text-xs flex-shrink-0"
                    >
                      Del
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
