import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { relevantProjectsApi, type RelevantProject } from "../../api/relevantProjects";
import { peopleApi, type Person } from "../../api/people";
import { agentsApi, type RelevantProjectResult, type ProjectSearchResult } from "../../api/agents";

interface Props { proposalId: string; }

const fmt = (n: number | null) =>
  n == null ? "—" : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

const WSP_ROLES = ["Prime Consultant", "Sub-Consultant", "Joint Venture", "Support Role"];

export default function RelevantProjectsTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<RelevantProject>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchResults, setFetchResults] = useState<RelevantProjectResult[] | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [searchFetching, setSearchFetching] = useState(false);
  const [searchResults, setSearchResults] = useState<ProjectSearchResult[] | null>(null);
  const searchPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startFetch = useCallback(async () => {
    setFetching(true);
    setFetchResults(null);
    try {
      const { job_id } = await agentsApi.startRelevantProjectsFetch(proposalId);
      pollRef.current = setInterval(async () => {
        try {
          const job = await agentsApi.pollJob(job_id);
          if (job.status === "complete" && job.result) {
            if (pollRef.current) clearInterval(pollRef.current);
            setFetchResults(job.result as unknown as RelevantProjectResult[]);
            setFetching(false);
          } else if (job.status === "error") {
            if (pollRef.current) clearInterval(pollRef.current);
            setFetching(false);
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current);
          setFetching(false);
        }
      }, 1000);
    } catch {
      setFetching(false);
    }
  }, [proposalId]);

  const acceptResult = async (r: RelevantProjectResult) => {
    await relevantProjectsApi.create(proposalId, {
      project_name: r.project_name,
      client: r.client,
      contract_value: r.contract_value,
      year_completed: r.year_completed,
      location: r.location,
      wsp_role: r.wsp_role,
      project_manager: r.project_manager,
      services_performed: r.services_performed,
      relevance_notes: r.relevance_notes,
    });
    qc.invalidateQueries({ queryKey: ["relevant-projects", proposalId] });
    setFetchResults(prev => prev ? prev.filter(x => x !== r) : null);
  };

  const dismissResult = (r: RelevantProjectResult) => {
    setFetchResults(prev => prev ? prev.filter(x => x !== r) : null);
  };

  const startSearch = useCallback(async () => {
    setSearchFetching(true);
    setSearchResults(null);
    try {
      const { job_id } = await agentsApi.startProjectsSearch(proposalId);
      searchPollRef.current = setInterval(async () => {
        try {
          const job = await agentsApi.pollJob(job_id);
          if (job.status === "complete" && job.result) {
            if (searchPollRef.current) clearInterval(searchPollRef.current);
            setSearchResults(job.result as unknown as ProjectSearchResult[]);
            setSearchFetching(false);
          } else if (job.status === "error") {
            if (searchPollRef.current) clearInterval(searchPollRef.current);
            setSearchFetching(false);
          }
        } catch {
          if (searchPollRef.current) clearInterval(searchPollRef.current);
          setSearchFetching(false);
        }
      }, 1000);
    } catch {
      setSearchFetching(false);
    }
  }, [proposalId]);

  const acceptSearchResult = async (r: ProjectSearchResult) => {
    await relevantProjectsApi.create(proposalId, {
      project_name: r.project_name,
      client: r.client,
      contract_value: r.contract_value,
      year_completed: r.year_completed,
      location: r.location,
      wsp_role: r.wsp_role,
      services_performed: r.services_performed,
      relevance_notes: r.relevance_notes,
    });
    qc.invalidateQueries({ queryKey: ["relevant-projects", proposalId] });
    setSearchResults(prev => prev ? prev.filter(x => x !== r) : null);
  };

  const dismissSearchResult = (r: ProjectSearchResult) => {
    setSearchResults(prev => prev ? prev.filter(x => x !== r) : null);
  };

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["relevant-projects", proposalId],
    queryFn: () => relevantProjectsApi.list(proposalId),
  });

  const { data: people = [] } = useQuery({
    queryKey: ["people", proposalId],
    queryFn: () => peopleApi.list(proposalId),
  });

  const peopleMap = Object.fromEntries(people.map((p: Person) => [p.id, p]));

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
      key_personnel_ids: p.key_personnel_ids || [],
    });
  };

  const ev = (field: keyof RelevantProject, val: string | number | string[] | undefined) =>
    setEditValues(v => ({ ...v, [field]: val }));

  const togglePersonnel = (personId: string) => {
    const current = (editValues.key_personnel_ids as string[]) || [];
    const next = current.includes(personId)
      ? current.filter(id => id !== personId)
      : [...current, personId];
    ev("key_personnel_ids", next);
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={startFetch}
            disabled={fetching}
            className="px-4 py-2 text-xs font-display tracking-wide rounded border
              bg-purple-600 text-white border-purple-600 hover:bg-purple-700
              disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {fetching && (
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {fetching ? "Analyzing RFP..." : "Fetch from RFP"}
          </button>
          <button
            onClick={startSearch}
            disabled={searchFetching}
            className="px-4 py-2 text-xs font-display tracking-wide rounded border
              bg-purple-600 text-white border-purple-600 hover:bg-purple-700
              disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {searchFetching && (
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {searchFetching ? "Searching..." : "Search Projects DB"}
          </button>
          <button onClick={() => createMutation.mutate()} className="wsp-btn-primary">
            + Add Project
          </button>
        </div>
      </div>

      {/* Agent fetch results — from RFP */}
      {fetchResults && fetchResults.length > 0 && (
        <div className="mb-5 space-y-3">
          <h4 className="text-xs font-display tracking-widest uppercase text-purple-600 font-semibold">
            AI Suggestions — Review & Accept
          </h4>
          {fetchResults.map((r, i) => (
            <div key={i} className="wsp-card border-purple-200 border-l-4 border-l-purple-500">
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="font-display font-semibold text-wsp-dark text-sm">{r.project_name}</span>
                      <span className="text-xs text-wsp-muted font-body">{r.client}</span>
                      {r.location && <span className="text-xs text-wsp-muted font-body">· {r.location}</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs font-mono text-wsp-muted">{r.year_completed}</span>
                      <span className="text-xs font-mono text-wsp-dark font-semibold">{fmt(r.contract_value)}</span>
                      <span className="wsp-badge bg-wsp-bg-soft text-wsp-muted border border-wsp-border text-[10px]">{r.wsp_role}</span>
                      <span className="text-xs text-wsp-muted font-body">PM: {r.project_manager}</span>
                    </div>
                    {r.relevance_notes && (
                      <p className="text-xs text-purple-700 font-body mt-2 bg-purple-50 p-2 rounded">{r.relevance_notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => acceptResult(r)}
                      className="text-xs px-3 py-1.5 border border-green-300 text-green-700 hover:bg-green-50 rounded font-display tracking-wide"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => dismissResult(r)}
                      className="text-xs px-3 py-1.5 border border-wsp-border text-wsp-muted hover:text-wsp-dark rounded"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Projects DB search results */}
      {searchResults && searchResults.length > 0 && (
        <div className="mb-5 space-y-3">
          <h4 className="text-xs font-display tracking-widest uppercase text-purple-600 font-semibold">
            Projects DB Results — Review & Accept
          </h4>
          {searchResults.map((r, i) => (
            <div key={i} className="wsp-card border-purple-200 border-l-4 border-l-purple-500">
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="font-display font-semibold text-wsp-dark text-sm">{r.project_name}</span>
                      <span className="text-xs text-wsp-muted font-body">{r.client}</span>
                      {r.location && <span className="text-xs text-wsp-muted font-body">· {r.location}</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs font-mono text-wsp-muted">{r.year_completed}</span>
                      <span className="text-xs font-mono text-wsp-dark font-semibold">{fmt(r.contract_value)}</span>
                      <span className="wsp-badge bg-wsp-bg-soft text-wsp-muted border border-wsp-border text-[10px]">{r.wsp_role}</span>
                    </div>
                    {r.relevance_notes && (
                      <p className="text-xs text-purple-700 font-body mt-2 bg-purple-50 p-2 rounded">{r.relevance_notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => acceptSearchResult(r)}
                      className="text-xs px-3 py-1.5 border border-green-300 text-green-700 hover:bg-green-50 rounded font-display tracking-wide"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => dismissSearchResult(r)}
                      className="text-xs px-3 py-1.5 border border-wsp-border text-wsp-muted hover:text-wsp-dark rounded"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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

                {/* Row 4: key personnel */}
                {people.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">Key Personnel</label>
                    <div className="flex flex-wrap gap-1.5">
                      {people.map((person: Person) => {
                        const selected = ((editValues.key_personnel_ids as string[]) || []).includes(person.id);
                        return (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => togglePersonnel(person.id)}
                            className={`px-2.5 py-1 text-xs rounded border transition-colors
                              ${selected
                                ? "bg-wsp-dark text-white border-wsp-dark"
                                : "bg-white text-wsp-muted border-wsp-border hover:border-wsp-dark hover:text-wsp-dark"}`}
                          >
                            {person.employee_name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                    {p.key_personnel_ids.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Team:</span>
                        {p.key_personnel_ids.map(id => {
                          const person = peopleMap[id];
                          return (
                            <span key={id} className="wsp-badge bg-wsp-bg-soft text-wsp-dark border border-wsp-border text-[10px]">
                              {person ? person.employee_name : id.slice(0, 6)}
                            </span>
                          );
                        })}
                      </div>
                    )}
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
                    <button onClick={() => window.confirm("Remove this project?") && deleteMutation.mutate(p.id)} className="text-wsp-red/60 hover:text-wsp-red text-xs">Del</button>
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
