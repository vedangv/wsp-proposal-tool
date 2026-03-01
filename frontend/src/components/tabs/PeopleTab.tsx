import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { peopleApi, type Person } from "../../api/people";
import { pricingApi } from "../../api/pricing";
import { agentsApi, type CVResult } from "../../api/agents";
import CVCard from "../CVCard";
import SlideOver from "../SlideOver";

interface Props { proposalId: string; }

type FetchState = "idle" | "fetching" | "done" | "error";

export default function PeopleTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const [slideOpen, setSlideOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [formValues, setFormValues] = useState<Partial<Person>>({});
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [cvResults, setCvResults] = useState<CVResult[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: people = [], isLoading } = useQuery({
    queryKey: ["people", proposalId],
    queryFn: () => peopleApi.list(proposalId),
  });

  const { data: pricingRows = [] } = useQuery({
    queryKey: ["pricing", proposalId],
    queryFn: () => pricingApi.list(proposalId),
  });

  const hoursByPerson = pricingRows.reduce<Record<string, number>>((acc, row) => {
    if (row.person_id) acc[row.person_id] = (acc[row.person_id] ?? 0) + (row.total_hours ?? 0);
    return acc;
  }, {});

  const createMutation = useMutation({
    mutationFn: (data: Partial<Person>) => peopleApi.create(proposalId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["people", proposalId] });
      setSlideOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Person> }) =>
      peopleApi.update(proposalId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["people", proposalId] });
      qc.invalidateQueries({ queryKey: ["pricing", proposalId] });
      setSlideOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => peopleApi.delete(proposalId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people", proposalId] }),
  });

  const openAdd = () => {
    setEditingPerson(null);
    setFormValues({ employee_name: "" });
    setSlideOpen(true);
  };

  const openEdit = (p: Person) => {
    setEditingPerson(p);
    setFormValues({
      employee_name: p.employee_name,
      employee_id: p.employee_id || "",
      wsp_role: p.wsp_role || "",
      team: p.team || "",
      role_on_project: p.role_on_project || "",
      cost_rate: p.cost_rate ?? undefined,
      burdened_rate: p.burdened_rate ?? undefined,
      hourly_rate: p.hourly_rate ?? undefined,
      years_experience: p.years_experience ?? undefined,
    });
    setSlideOpen(true);
  };

  const saveForm = () => {
    if (editingPerson) {
      updateMutation.mutate({ id: editingPerson.id, data: formValues });
    } else {
      createMutation.mutate(formValues);
    }
  };

  // DLM calculation
  const dlm = formValues.cost_rate && formValues.hourly_rate && Number(formValues.cost_rate) > 0
    ? (Number(formValues.hourly_rate) / Number(formValues.cost_rate)).toFixed(2)
    : null;

  // Apply CV result
  const applyCV = async (cv: CVResult) => {
    const target = people.find(p =>
      p.employee_name.toLowerCase().includes(cv.requested_name.toLowerCase()) ||
      cv.employee_name.toLowerCase().includes(p.employee_name.toLowerCase().split(" ")[0])
    );
    if (target) {
      await peopleApi.update(proposalId, target.id, {
        employee_id: cv.employee_id,
        role_on_project: cv.role_on_project,
        years_experience: cv.years_experience,
      });
    } else {
      await peopleApi.create(proposalId, {
        employee_name: cv.employee_name,
        employee_id: cv.employee_id,
        role_on_project: cv.role_on_project,
        years_experience: cv.years_experience,
      });
    }
    qc.invalidateQueries({ queryKey: ["people", proposalId] });
    setDismissed(d => new Set(d).add(cv.employee_id));
  };

  const dismissCV = (employeeId: string) =>
    setDismissed(d => new Set(d).add(employeeId));

  const handleFetchCVs = async () => {
    const names = people.map(p => p.employee_name).filter(Boolean);
    setFetchState("fetching");
    setCvResults([]);
    setDismissed(new Set());
    try {
      const { job_id } = await agentsApi.startCVFetch(proposalId, names);
      pollRef.current = setInterval(async () => {
        const job = await agentsApi.pollJob(job_id);
        if (job.status === "complete" && job.result) {
          clearInterval(pollRef.current!);
          setCvResults(job.result);
          setFetchState("done");
        } else if (job.status === "error") {
          clearInterval(pollRef.current!);
          setFetchState("error");
        }
      }, 800);
    } catch {
      setFetchState("error");
    }
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const visibleResults = cvResults.filter(cv => !dismissed.has(cv.employee_id));

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-end mb-5">
        <div>
          <h3 className="font-display font-semibold text-wsp-dark text-base tracking-tight">
            Proposed Team
          </h3>
          <p className="text-xs text-wsp-muted font-body mt-0.5">
            {people.length} team member{people.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {fetchState === "error" && (
            <span className="text-xs text-wsp-red font-body">Fetch failed</span>
          )}
          <button
            onClick={handleFetchCVs}
            disabled={fetchState === "fetching"}
            className={`wsp-btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2
              ${fetchState === "fetching" ? "animate-pulse" : ""}`}
          >
            {fetchState === "fetching" ? (
              <>
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Fetching CVs…
              </>
            ) : "Fetch CVs"}
          </button>
          <button onClick={openAdd} className="wsp-btn-ghost">
            + Add Person
          </button>
        </div>
      </div>

      {/* CV results */}
      {fetchState !== "idle" && visibleResults.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-display font-semibold tracking-widest uppercase text-wsp-muted">
              CV Results — {visibleResults.length} match{visibleResults.length !== 1 ? "es" : ""}
            </p>
            <button onClick={() => { setFetchState("idle"); setCvResults([]); setDismissed(new Set()); }} className="text-xs text-wsp-muted hover:text-wsp-dark">
              Clear all
            </button>
          </div>
          <div className="grid gap-3 grid-cols-1 xl:grid-cols-2">
            {visibleResults.map(cv => (
              <CVCard key={cv.employee_id} cv={cv} onApply={cv => applyCV(cv)} onDismiss={() => dismissCV(cv.employee_id)} />
            ))}
          </div>
        </div>
      )}

      {fetchState === "fetching" && cvResults.length === 0 && (
        <div className="wsp-card p-6 mb-6 flex items-center gap-3">
          <span className="w-4 h-4 border-2 border-wsp-border border-t-wsp-red rounded-full animate-spin" />
          <span className="text-sm text-wsp-muted font-body">Searching HR system for CVs…</span>
        </div>
      )}

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {people.map(person => {
          const personDlm = person.cost_rate && person.hourly_rate && Number(person.cost_rate) > 0
            ? (Number(person.hourly_rate) / Number(person.cost_rate)).toFixed(2)
            : null;
          const hours = hoursByPerson[person.id] || 0;

          return (
            <div key={person.id} className="wsp-card p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => openEdit(person)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-display font-semibold text-wsp-dark text-sm">{person.employee_name}</h4>
                    {person.team && (
                      <span className="wsp-badge bg-wsp-bg-soft text-wsp-muted border border-wsp-border text-[10px]">
                        {person.team}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-wsp-muted">{person.role_on_project || person.wsp_role || "No role set"}</p>
                  {person.employee_id && (
                    <p className="text-[10px] font-mono text-wsp-red mt-0.5">{person.employee_id}</p>
                  )}
                </div>
                <div className="text-right">
                  {personDlm && (
                    <span className={`font-mono font-bold text-sm ${Number(personDlm) >= 3.0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {personDlm}x
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs">
                  <span className="text-wsp-muted">Cost </span>
                  <span className="font-mono font-semibold">{person.cost_rate ? `$${Number(person.cost_rate).toFixed(0)}` : "—"}</span>
                </div>
                <div className="text-xs">
                  <span className="text-wsp-muted">Burdened </span>
                  <span className="font-mono font-semibold">{person.burdened_rate ? `$${Number(person.burdened_rate).toFixed(0)}` : "—"}</span>
                </div>
                <div className="text-xs">
                  <span className="text-wsp-muted">Billing </span>
                  <span className="font-mono font-bold text-wsp-dark">{person.hourly_rate ? `$${Number(person.hourly_rate).toFixed(0)}` : "—"}</span>
                </div>
                <div className="ml-auto text-xs">
                  <span className="text-wsp-muted">Hours </span>
                  <span className="font-mono font-semibold">{hours || "—"}</span>
                </div>
                {person.years_experience && (
                  <div className="text-xs">
                    <span className="text-wsp-muted">Exp </span>
                    <span className="font-mono">{person.years_experience}yr</span>
                  </div>
                )}
              </div>

              {/* Delete button - visible on hover */}
              <button
                onClick={e => { e.stopPropagation(); deleteMutation.mutate(person.id); }}
                className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>

      {people.length === 0 && !isLoading && (
        <div className="wsp-card p-12 text-center">
          <p className="text-wsp-muted text-sm font-body">No team members yet. Add one or use Fetch CVs.</p>
        </div>
      )}

      {/* SlideOver form */}
      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={editingPerson ? `Edit — ${editingPerson.employee_name}` : "Add Team Member"}
      >
        <div className="space-y-5">
          {/* Identity */}
          <div>
            <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-2">Identity</p>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-wsp-muted block mb-1">Full Name *</label>
                <input className="border rounded px-3 py-2 w-full text-sm" value={formValues.employee_name || ""} onChange={e => setFormValues(v => ({ ...v, employee_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-wsp-muted block mb-1">Employee ID</label>
                <input className="border rounded px-3 py-2 w-full text-sm font-mono" value={formValues.employee_id || ""} onChange={e => setFormValues(v => ({ ...v, employee_id: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Role */}
          <div>
            <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-2">Role</p>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-wsp-muted block mb-1">WSP Role</label>
                <input className="border rounded px-3 py-2 w-full text-sm" placeholder="e.g. Senior Project Manager" value={formValues.wsp_role || ""} onChange={e => setFormValues(v => ({ ...v, wsp_role: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-wsp-muted block mb-1">Team / Discipline</label>
                <input className="border rounded px-3 py-2 w-full text-sm" placeholder="e.g. Transportation" value={formValues.team || ""} onChange={e => setFormValues(v => ({ ...v, team: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-wsp-muted block mb-1">Role on This Proposal</label>
                <input className="border rounded px-3 py-2 w-full text-sm" placeholder="e.g. Lead Designer" value={formValues.role_on_project || ""} onChange={e => setFormValues(v => ({ ...v, role_on_project: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Rates */}
          <div>
            <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-2">Rates ($/hr)</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-wsp-muted block mb-1">Cost</label>
                <input type="number" className="border rounded px-3 py-2 w-full text-sm text-right" placeholder="0" value={formValues.cost_rate ?? ""} onChange={e => setFormValues(v => ({ ...v, cost_rate: parseFloat(e.target.value) || undefined }))} />
              </div>
              <div>
                <label className="text-xs text-wsp-muted block mb-1">Burdened</label>
                <input type="number" className="border rounded px-3 py-2 w-full text-sm text-right" placeholder="0" value={formValues.burdened_rate ?? ""} onChange={e => setFormValues(v => ({ ...v, burdened_rate: parseFloat(e.target.value) || undefined }))} />
              </div>
              <div>
                <label className="text-xs text-wsp-muted block mb-1">Billing</label>
                <input type="number" className="border rounded px-3 py-2 w-full text-sm text-right" placeholder="0" value={formValues.hourly_rate ?? ""} onChange={e => setFormValues(v => ({ ...v, hourly_rate: parseFloat(e.target.value) || undefined }))} />
              </div>
            </div>
            {dlm && (
              <p className="text-xs text-wsp-muted mt-2">
                DLM: <span className={`font-mono font-bold ${Number(dlm) >= 3.0 ? "text-emerald-600" : "text-amber-600"}`}>{dlm}x</span>
              </p>
            )}
          </div>

          {/* Experience */}
          <div>
            <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-2">Experience</p>
            <div>
              <label className="text-xs text-wsp-muted block mb-1">Years of Experience</label>
              <input type="number" className="border rounded px-3 py-2 w-32 text-sm text-right" value={formValues.years_experience ?? ""} onChange={e => setFormValues(v => ({ ...v, years_experience: parseInt(e.target.value) || undefined }))} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <button
              onClick={saveForm}
              disabled={!formValues.employee_name}
              className="wsp-btn-primary disabled:opacity-40"
            >
              {editingPerson ? "Save Changes" : "Add Person"}
            </button>
            <button onClick={() => setSlideOpen(false)} className="wsp-btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
