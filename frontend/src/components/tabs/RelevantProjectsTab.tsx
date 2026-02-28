import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { relevantProjectsApi, type RelevantProject } from "../../api/relevantProjects";

interface Props { proposalId: string; }

const fmt = (n: number | null) =>
  n == null ? "—" : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

const WSP_ROLES = ["Prime Consultant", "Sub-Consultant", "Joint Venture", "Support Role"];

export default function RelevantProjectsTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<RelevantProject>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["relevant-projects", proposalId],
    queryFn: () => relevantProjectsApi.list(proposalId),
  });

  const createMutation = useMutation({
    mutationFn: () => relevantProjectsApi.create(proposalId, { project_name: "New Project" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["relevant-projects", proposalId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RelevantProject> }) =>
      relevantProjectsApi.update(proposalId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["relevant-projects", proposalId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => relevantProjectsApi.delete(proposalId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["relevant-projects", proposalId] }),
  });

  const startEdit = (p: RelevantProject) => {
    setEditingId(p.id);
    setExpandedId(null);
    setEditValues({
      project_name: p.project_name,
      project_number: p.project_number || "",
      client: p.client || "",
      location: p.location || "",
      contract_value: p.contract_value ?? undefined,
      year_completed: p.year_completed || "",
      wsp_role: p.wsp_role || "",
      project_manager: p.project_manager || "",
      services_performed: p.services_performed || "",
      relevance_notes: p.relevance_notes || "",
    });
  };

  const ev = (field: keyof RelevantProject, val: string | number | undefined) =>
    setEditValues(v => ({ ...v, [field]: val }));

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="font-display font-semibold text-wsp-dark text-base tracking-tight">
            Relevant Projects
          </h3>
          <p className="text-xs text-wsp-muted font-body mt-0.5">
            Past and current WSP projects demonstrating relevant experience
          </p>
        </div>
        <button onClick={() => createMutation.mutate()} className="wsp-btn-primary">
          + Add Project
        </button>
      </div>

      <div className="space-y-3">
        {projects.map(p => (
          <div key={p.id} className="wsp-card">
            {editingId === p.id ? (
              /* ── Edit form ── */
              <div className="p-4 space-y-4">
                {/* Row 1: name + number + client */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">Project Name *</label>
                    <input className="wsp-input w-full font-medium" value={editValues.project_name || ""} onChange={e => ev("project_name", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">WSP Project No.</label>
                    <input className="wsp-input w-full font-mono text-xs" value={editValues.project_number || ""} onChange={e => ev("project_number", e.target.value)} placeholder="e.g. 221-12345-00" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">Client</label>
                    <input className="wsp-input w-full" value={editValues.client || ""} onChange={e => ev("client", e.target.value)} />
                  </div>
                </div>

                {/* Row 2: location + value + year + role + PM */}
                <div className="grid grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">Location</label>
                    <input className="wsp-input w-full text-xs" value={editValues.location || ""} onChange={e => ev("location", e.target.value)} placeholder="City, Province" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">Contract Value</label>
                    <input type="number" className="wsp-input w-full text-right text-xs" value={editValues.contract_value ?? ""} onChange={e => ev("contract_value", parseFloat(e.target.value) || undefined)} placeholder="CAD" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">Year</label>
                    <input className="wsp-input w-full text-xs" value={editValues.year_completed || ""} onChange={e => ev("year_completed", e.target.value)} placeholder="e.g. 2024 or Ongoing" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">WSP Role</label>
                    <select className="wsp-input w-full text-xs" value={editValues.wsp_role || ""} onChange={e => ev("wsp_role", e.target.value)}>
                      <option value="">—</option>
                      {WSP_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">WSP PM</label>
                    <input className="wsp-input w-full text-xs" value={editValues.project_manager || ""} onChange={e => ev("project_manager", e.target.value)} />
                  </div>
                </div>

                {/* Row 3: services + relevance */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">Services Performed</label>
                    <textarea rows={3} className="wsp-input w-full text-xs resize-none" value={editValues.services_performed || ""} onChange={e => ev("services_performed", e.target.value)} placeholder="List key services provided on this project…" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">Relevance to This RFP</label>
                    <textarea rows={3} className="wsp-input w-full text-xs resize-none" value={editValues.relevance_notes || ""} onChange={e => ev("relevance_notes", e.target.value)} placeholder="Explain why this project demonstrates relevant experience…" />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => updateMutation.mutate({ id: p.id, data: editValues })}
                    className="text-green-700 hover:text-green-900 text-xs px-3 py-1.5 border border-green-300 rounded font-display tracking-wide"
                  >Save</button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-wsp-muted hover:text-wsp-dark text-xs px-3 py-1.5 border border-wsp-border rounded"
                  >Cancel</button>
                </div>
              </div>
            ) : (
              /* ── Read view ── */
              <div>
                {/* Summary row */}
                <div className="flex items-start gap-4 p-4">
                  {/* Project number pill */}
                  {p.project_number && (
                    <span className="font-mono text-wsp-red text-xs tracking-wider flex-shrink-0 pt-0.5">
                      {p.project_number}
                    </span>
                  )}

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="font-display font-semibold text-wsp-dark text-sm">{p.project_name}</span>
                      {p.client && <span className="text-xs text-wsp-muted font-body">{p.client}</span>}
                      {p.location && <span className="text-xs text-wsp-muted font-body">· {p.location}</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      {p.year_completed && (
                        <span className="text-xs font-mono text-wsp-muted">{p.year_completed}</span>
                      )}
                      {p.contract_value != null && (
                        <span className="text-xs font-mono text-wsp-dark font-semibold">{fmt(p.contract_value)}</span>
                      )}
                      {p.wsp_role && (
                        <span className="wsp-badge bg-wsp-bg-soft text-wsp-muted border border-wsp-border text-[10px]">
                          {p.wsp_role}
                        </span>
                      )}
                      {p.project_manager && (
                        <span className="text-xs text-wsp-muted font-body">PM: {p.project_manager}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {(p.services_performed || p.relevance_notes) && (
                      <button
                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                        className="text-xs text-wsp-muted hover:text-wsp-dark font-body"
                      >
                        {expandedId === p.id ? "▲ Less" : "▼ Details"}
                      </button>
                    )}
                    <button onClick={() => startEdit(p)} className="text-wsp-muted hover:text-wsp-dark text-xs">Edit</button>
                    <button onClick={() => deleteMutation.mutate(p.id)} className="text-wsp-red/60 hover:text-wsp-red text-xs">Del</button>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedId === p.id && (
                  <div className="border-t border-wsp-border px-4 py-3 grid grid-cols-2 gap-4 bg-wsp-bg-soft/50">
                    {p.services_performed && (
                      <div>
                        <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">Services Performed</p>
                        <p className="text-xs text-wsp-dark font-body whitespace-pre-line">{p.services_performed}</p>
                      </div>
                    )}
                    {p.relevance_notes && (
                      <div>
                        <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">Relevance to This RFP</p>
                        <p className="text-xs text-wsp-dark font-body whitespace-pre-line">{p.relevance_notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {projects.length === 0 && !isLoading && (
        <div className="wsp-card p-12 text-center">
          <p className="text-wsp-muted text-sm font-body">
            No relevant projects yet. Add past or current WSP projects that demonstrate experience similar to this RFP.
          </p>
        </div>
      )}
    </div>
  );
}
