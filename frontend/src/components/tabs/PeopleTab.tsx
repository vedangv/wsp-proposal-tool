import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { peopleApi, type Person } from "../../api/people";
import { agentsApi, type CVResult } from "../../api/agents";
import CVCard from "../CVCard";

interface Props { proposalId: string; }

type FetchState = "idle" | "fetching" | "done" | "error";

export default function PeopleTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Person>>({});
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [cvResults, setCvResults] = useState<CVResult[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: people = [], isLoading } = useQuery({
    queryKey: ["people", proposalId],
    queryFn: () => peopleApi.list(proposalId),
  });

  const createMutation = useMutation({
    mutationFn: () => peopleApi.create(proposalId, { employee_name: "New Person" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people", proposalId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Person> }) =>
      peopleApi.update(proposalId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["people", proposalId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => peopleApi.delete(proposalId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people", proposalId] }),
  });

  const startEdit = (p: Person) => {
    setEditingId(p.id);
    setEditValues({
      employee_name: p.employee_name,
      employee_id: p.employee_id || "",
      wsp_role: p.wsp_role || "",
      team: p.team || "",
      role_on_project: p.role_on_project || "",
      hourly_rate: p.hourly_rate ?? undefined,
      years_experience: p.years_experience ?? undefined,
    });
  };

  const saveEdit = (id: string) => updateMutation.mutate({ id, data: editValues });

  // Apply CV result → update person record then re-query
  const applyCV = async (cv: CVResult, personId?: string) => {
    const target = personId
      ? people.find(p => p.id === personId)
      : people.find(p =>
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

  // Cleanup poll on unmount
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
            <span className="text-xs text-wsp-red font-body">Fetch failed — try again</span>
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
          <button onClick={() => createMutation.mutate()} className="wsp-btn-ghost">
            + Add Person
          </button>
        </div>
      </div>

      {/* CV results panel */}
      {fetchState !== "idle" && visibleResults.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-display font-semibold tracking-widest uppercase text-wsp-muted">
              CV Results — {visibleResults.length} match{visibleResults.length !== 1 ? "es" : ""}
            </p>
            <button
              onClick={() => { setFetchState("idle"); setCvResults([]); setDismissed(new Set()); }}
              className="text-xs text-wsp-muted hover:text-wsp-dark font-body"
            >
              Clear all
            </button>
          </div>
          <div className="grid gap-3 grid-cols-1 xl:grid-cols-2">
            {visibleResults.map(cv => (
              <CVCard
                key={cv.employee_id}
                cv={cv}
                onApply={cv => applyCV(cv)}
                onDismiss={() => dismissCV(cv.employee_id)}
              />
            ))}
          </div>
        </div>
      )}

      {fetchState === "fetching" && cvResults.length === 0 && (
        <div className="wsp-card p-6 mb-6 flex items-center gap-3">
          <span className="w-4 h-4 border-2 border-wsp-border border-t-wsp-red rounded-full animate-spin" />
          <span className="text-sm text-wsp-muted font-body">
            Searching HR system for CVs…
          </span>
        </div>
      )}

      {/* People table */}
      <div className="wsp-card overflow-x-auto">
        <table className="wsp-table w-full min-w-max">
          <thead>
            <tr>
              <th>Name</th>
              <th className="w-32">Employee ID</th>
              <th>WSP Role</th>
              <th className="w-36">Team / Discipline</th>
              <th>Role on Project</th>
              <th className="text-right w-28">Rate ($/hr)</th>
              <th className="text-right w-24">Exp (yrs)</th>
              <th className="w-24">CV</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {people.map(person => (
              <tr key={person.id}>
                {editingId === person.id ? (
                  <>
                    <td><input className="wsp-input w-full" value={editValues.employee_name || ""} onChange={e => setEditValues(v => ({ ...v, employee_name: e.target.value }))} /></td>
                    <td><input className="wsp-input w-full font-mono text-xs" value={editValues.employee_id || ""} onChange={e => setEditValues(v => ({ ...v, employee_id: e.target.value }))} /></td>
                    <td><input className="wsp-input w-full text-xs" placeholder="e.g. Senior Project Manager" value={editValues.wsp_role || ""} onChange={e => setEditValues(v => ({ ...v, wsp_role: e.target.value }))} /></td>
                    <td><input className="wsp-input w-full text-xs" placeholder="e.g. Transportation" value={editValues.team || ""} onChange={e => setEditValues(v => ({ ...v, team: e.target.value }))} /></td>
                    <td><input className="wsp-input w-full text-xs" placeholder="Role on this proposal" value={editValues.role_on_project || ""} onChange={e => setEditValues(v => ({ ...v, role_on_project: e.target.value }))} /></td>
                    <td><input type="number" className="wsp-input w-full text-right" placeholder="0.00" value={editValues.hourly_rate ?? ""} onChange={e => setEditValues(v => ({ ...v, hourly_rate: parseFloat(e.target.value) || undefined }))} /></td>
                    <td><input type="number" className="wsp-input w-full text-right" value={editValues.years_experience ?? ""} onChange={e => setEditValues(v => ({ ...v, years_experience: parseInt(e.target.value) || undefined }))} /></td>
                    <td className="text-xs text-wsp-muted">{person.cv_path ? "✓ on file" : "—"}</td>
                    <td>
                      <div className="flex gap-1 px-2">
                        <button onClick={() => saveEdit(person.id)} className="text-green-700 text-xs px-2 py-1 border border-green-300 hover:bg-green-50">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-wsp-muted text-xs px-2 py-1 border border-wsp-border">✕</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="font-medium text-wsp-dark">{person.employee_name}</td>
                    <td className="font-mono text-wsp-red text-xs">{person.employee_id || "—"}</td>
                    <td className="text-wsp-muted text-xs">{person.wsp_role || "—"}</td>
                    <td className="text-xs">
                      {person.team
                        ? <span className="wsp-badge bg-wsp-bg-soft text-wsp-muted border border-wsp-border text-[10px]">{person.team}</span>
                        : <span className="text-wsp-border">—</span>}
                    </td>
                    <td className="text-wsp-muted text-xs">{person.role_on_project || "—"}</td>
                    <td className="text-right font-mono text-sm font-semibold text-wsp-dark">
                      {person.hourly_rate != null ? `$${Number(person.hourly_rate).toFixed(0)}/hr` : "—"}
                    </td>
                    <td className="text-right font-mono text-sm">{person.years_experience ?? "—"}</td>
                    <td className="text-xs">
                      {person.cv_path
                        ? <span className="text-emerald-600 font-display tracking-wide text-[10px] uppercase">✓ on file</span>
                        : <span className="text-wsp-border">—</span>}
                    </td>
                    <td>
                      <div className="flex gap-2 px-4">
                        <button onClick={() => startEdit(person)} className="text-wsp-muted hover:text-wsp-dark text-xs">Edit</button>
                        <button onClick={() => deleteMutation.mutate(person.id)} className="text-wsp-red/60 hover:text-wsp-red text-xs">Del</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {people.length === 0 && !isLoading && (
          <p className="text-center py-12 text-wsp-muted text-sm font-body">
            No team members yet. Add one or use Fetch CVs.
          </p>
        )}
      </div>
    </div>
  );
}
