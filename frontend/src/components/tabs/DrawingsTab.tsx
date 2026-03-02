import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { drawingsApi, type Drawing, type DrawingFormat } from "../../api/drawings";
import { wbsApi, type WBSItem } from "../../api/wbs";
import { deliverablesApi, type Deliverable } from "../../api/deliverables";
import { agentsApi, type DrawingResult } from "../../api/agents";

interface Props { proposalId: string; }

const FORMAT_LABELS: Record<DrawingFormat, string> = {
  pdf: "PDF", dwg: "DWG", revit: "Revit", other: "Other",
};

const FORMATS: DrawingFormat[] = ["pdf", "dwg", "revit", "other"];
const DISCIPLINES = ["Civil", "Structural", "Mechanical", "Electrical", "Environmental", "Survey", "Other"];

export default function DrawingsTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Drawing>>({});
  const [filterDiscipline, setFilterDiscipline] = useState<string>("");
  const [fetching, setFetching] = useState(false);
  const [fetchResults, setFetchResults] = useState<DrawingResult[] | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: drawings = [], isLoading } = useQuery({
    queryKey: ["drawings", proposalId],
    queryFn: () => drawingsApi.list(proposalId),
  });

  const { data: wbsItems = [] } = useQuery({
    queryKey: ["wbs", proposalId],
    queryFn: () => wbsApi.list(proposalId),
  });

  const { data: deliverables = [] } = useQuery({
    queryKey: ["deliverables", proposalId],
    queryFn: () => deliverablesApi.list(proposalId),
  });

  const createMutation = useMutation({
    mutationFn: () => drawingsApi.create(proposalId, {
      title: "New Drawing", format: "pdf",
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drawings", proposalId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Drawing> }) =>
      drawingsApi.update(proposalId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drawings", proposalId] });
      qc.invalidateQueries({ queryKey: ["drawing-count", proposalId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => drawingsApi.delete(proposalId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drawings", proposalId] });
      qc.invalidateQueries({ queryKey: ["drawing-count", proposalId] });
    },
  });

  const startFetch = useCallback(async () => {
    setFetching(true);
    setFetchResults(null);
    try {
      const { job_id } = await agentsApi.startDrawingsFetch(proposalId);
      pollRef.current = setInterval(async () => {
        try {
          const job = await agentsApi.pollJob(job_id);
          if (job.status === "complete" && job.result) {
            if (pollRef.current) clearInterval(pollRef.current);
            setFetchResults(job.result as unknown as DrawingResult[]);
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

  const acceptResult = async (r: DrawingResult) => {
    await drawingsApi.create(proposalId, {
      drawing_number: r.drawing_number,
      title: r.title,
      discipline: r.discipline,
      scale: r.scale,
      format: r.format as DrawingFormat,
      responsible_party: r.responsible_party,
    });
    qc.invalidateQueries({ queryKey: ["drawings", proposalId] });
    setFetchResults(prev => prev ? prev.filter(x => x !== r) : null);
  };

  const dismissResult = (r: DrawingResult) => {
    setFetchResults(prev => prev ? prev.filter(x => x !== r) : null);
  };

  const startEdit = (d: Drawing) => {
    setEditingId(d.id);
    setEditValues({
      wbs_id: d.wbs_id || undefined,
      deliverable_id: d.deliverable_id || undefined,
      drawing_number: d.drawing_number || "",
      title: d.title,
      discipline: d.discipline || "",
      scale: d.scale || "",
      format: d.format,
      responsible_party: d.responsible_party || "",
      revision: d.revision || "",
    });
  };

  const wbsLabel = (id: string | null) => {
    if (!id) return "—";
    const w = wbsItems.find((i: WBSItem) => i.id === id);
    return w ? w.wbs_code : id.slice(0, 6);
  };

  const deliverableLabel = (id: string | null) => {
    if (!id) return "—";
    const d = deliverables.find((i: Deliverable) => i.id === id);
    return d ? (d.deliverable_ref || d.title.slice(0, 12)) : id.slice(0, 6);
  };

  const filtered = drawings.filter(d =>
    (!filterDiscipline || d.discipline === filterDiscipline)
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h3 className="font-display font-semibold text-wsp-dark text-base tracking-tight">Drawing List</h3>
          <p className="text-xs text-wsp-muted font-body mt-0.5">
            Expected drawings if the project is awarded
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
          <button onClick={() => createMutation.mutate()} className="wsp-btn-primary">
            + Add Drawing
          </button>
        </div>
      </div>

      {/* Agent fetch results */}
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
                      <span className="font-mono text-wsp-red text-xs">{r.drawing_number}</span>
                      <span className="font-display font-semibold text-wsp-dark text-sm">{r.title}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-wsp-muted font-body">{r.discipline}</span>
                      <span className="wsp-badge bg-wsp-bg-soft text-wsp-muted border border-wsp-border text-[10px]">
                        {FORMAT_LABELS[r.format as DrawingFormat] || r.format.toUpperCase()}
                      </span>
                      <span className="text-xs text-wsp-muted font-mono">{r.scale}</span>
                      <span className="text-xs text-wsp-muted font-body">Responsible: {r.responsible_party}</span>
                    </div>
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

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          className="wsp-input text-xs"
          value={filterDiscipline}
          onChange={e => setFilterDiscipline(e.target.value)}
        >
          <option value="">All Disciplines</option>
          {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {filterDiscipline && (
          <button
            onClick={() => setFilterDiscipline("")}
            className="text-xs text-wsp-red hover:underline font-body"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-wsp-muted font-mono self-center">
          {filtered.length} of {drawings.length}
        </span>
      </div>

      <div className="wsp-card overflow-x-auto">
        <table className="wsp-table w-full min-w-max">
          <thead>
            <tr>
              <th className="w-28">Dwg No.</th>
              <th>Title</th>
              <th className="w-24">Discipline</th>
              <th className="w-20">Format</th>
              <th className="w-16">Scale</th>
              <th className="w-16">Rev.</th>
              <th className="w-24">WBS</th>
              <th className="w-28">Deliverable</th>
              <th>Responsible</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id}>
                {editingId === d.id ? (
                  <>
                    <td><input className="wsp-input w-full font-mono text-xs" value={editValues.drawing_number || ""} onChange={e => setEditValues(v => ({ ...v, drawing_number: e.target.value }))} /></td>
                    <td><input className="wsp-input w-full" value={editValues.title || ""} onChange={e => setEditValues(v => ({ ...v, title: e.target.value }))} /></td>
                    <td>
                      <select className="wsp-input w-full text-xs"
                        value={editValues.discipline || ""}
                        onChange={e => setEditValues(v => ({ ...v, discipline: e.target.value }))}>
                        <option value="">—</option>
                        {DISCIPLINES.map(disc => <option key={disc} value={disc}>{disc}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="wsp-input w-full text-xs"
                        value={editValues.format || "pdf"}
                        onChange={e => setEditValues(v => ({ ...v, format: e.target.value as DrawingFormat }))}>
                        {FORMATS.map(f => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
                      </select>
                    </td>
                    <td><input className="wsp-input w-16 text-xs" value={editValues.scale || ""} onChange={e => setEditValues(v => ({ ...v, scale: e.target.value }))} /></td>
                    <td><input className="wsp-input w-14 text-xs" value={editValues.revision || ""} onChange={e => setEditValues(v => ({ ...v, revision: e.target.value }))} /></td>
                    <td>
                      <select className="wsp-input w-full text-xs"
                        value={editValues.wbs_id || ""}
                        onChange={e => setEditValues(v => ({ ...v, wbs_id: e.target.value || undefined }))}>
                        <option value="">—</option>
                        {wbsItems.map((w: WBSItem) => (
                          <option key={w.id} value={w.id}>{w.wbs_code}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select className="wsp-input w-full text-xs"
                        value={editValues.deliverable_id || ""}
                        onChange={e => setEditValues(v => ({ ...v, deliverable_id: e.target.value || undefined }))}>
                        <option value="">—</option>
                        {deliverables.map((del: Deliverable) => (
                          <option key={del.id} value={del.id}>{del.deliverable_ref || del.title.slice(0, 14)}</option>
                        ))}
                      </select>
                    </td>
                    <td><input className="wsp-input w-full" value={editValues.responsible_party || ""} onChange={e => setEditValues(v => ({ ...v, responsible_party: e.target.value }))} /></td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => updateMutation.mutate({ id: d.id, data: editValues })} className="text-green-700 text-xs px-2 py-1 border border-green-300 hover:bg-green-50">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-wsp-muted text-xs px-2 py-1 border border-wsp-border">✕</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td><span className="font-mono text-wsp-red text-xs">{d.drawing_number || "—"}</span></td>
                    <td className="font-medium text-wsp-dark">{d.title}</td>
                    <td className="text-wsp-muted text-xs">{d.discipline || "—"}</td>
                    <td>
                      <span className="wsp-badge bg-wsp-bg-soft text-wsp-muted border border-wsp-border text-[10px]">
                        {FORMAT_LABELS[d.format]}
                      </span>
                    </td>
                    <td className="text-wsp-muted text-xs">{d.scale || "—"}</td>
                    <td className="font-mono text-xs text-wsp-muted">{d.revision || "—"}</td>
                    <td><span className="font-mono text-wsp-red text-xs">{wbsLabel(d.wbs_id)}</span></td>
                    <td><span className="font-mono text-xs text-wsp-muted">{deliverableLabel(d.deliverable_id)}</span></td>
                    <td className="text-wsp-muted">{d.responsible_party || "—"}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(d)} className="text-wsp-muted hover:text-wsp-dark text-xs">Edit</button>
                        <button onClick={() => window.confirm("Delete this drawing?") && deleteMutation.mutate(d.id)} className="text-wsp-red/60 hover:text-wsp-red text-xs">Del</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && !isLoading && (
          <p className="text-center py-12 text-wsp-muted text-sm font-body">
            {drawings.length === 0 ? "No drawings yet. Use \"Fetch from RFP\" to generate a drawing list or add one manually." : "No drawings match the current filters."}
          </p>
        )}
      </div>
    </div>
  );
}
