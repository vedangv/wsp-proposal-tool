import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { drawingsApi, type Drawing, type DrawingFormat, type DrawingStatus } from "../../api/drawings";
import { wbsApi, type WBSItem } from "../../api/wbs";
import { deliverablesApi, type Deliverable } from "../../api/deliverables";

interface Props { proposalId: string; }

const FORMAT_LABELS: Record<DrawingFormat, string> = {
  pdf: "PDF", dwg: "DWG", revit: "Revit", other: "Other",
};

const STATUS_STYLES: Record<DrawingStatus, string> = {
  tbd:         "bg-wsp-bg-soft text-wsp-muted border border-wsp-border",
  in_progress: "bg-blue-50 text-blue-700 border border-blue-200",
  complete:    "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

const FORMATS: DrawingFormat[] = ["pdf", "dwg", "revit", "other"];
const STATUSES: DrawingStatus[] = ["tbd", "in_progress", "complete"];
const STATUS_LABELS: Record<DrawingStatus, string> = {
  tbd: "TBD", in_progress: "In Progress", complete: "Complete",
};

const DISCIPLINES = ["Civil", "Structural", "Mechanical", "Electrical", "Environmental", "Survey", "Other"];

export default function DrawingsTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Drawing>>({});
  const [filterDiscipline, setFilterDiscipline] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

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
      title: "New Drawing", format: "pdf", status: "tbd",
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
      due_date: d.due_date || "",
      responsible_party: d.responsible_party || "",
      revision: d.revision || "",
      status: d.status,
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
    (!filterDiscipline || d.discipline === filterDiscipline) &&
    (!filterStatus || d.status === filterStatus)
  );

  const byStatus = Object.fromEntries(
    STATUSES.map(s => [s, drawings.filter(d => d.status === s).length])
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h3 className="font-display font-semibold text-wsp-dark text-base tracking-tight">Drawing List</h3>
          <div className="flex gap-3 mt-1">
            {STATUSES.map(s => (
              <span key={s} className={`wsp-badge ${STATUS_STYLES[s]} text-[10px]`}>
                {STATUS_LABELS[s]} · {byStatus[s] ?? 0}
              </span>
            ))}
          </div>
        </div>
        <button onClick={() => createMutation.mutate()} className="wsp-btn-primary">
          + Add Drawing
        </button>
      </div>

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
        <select
          className="wsp-input text-xs"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        {(filterDiscipline || filterStatus) && (
          <button
            onClick={() => { setFilterDiscipline(""); setFilterStatus(""); }}
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
              <th className="w-24">Due</th>
              <th>Responsible</th>
              <th className="w-28">Status</th>
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
                    <td><input type="date" className="wsp-input font-mono text-xs" value={editValues.due_date || ""} onChange={e => setEditValues(v => ({ ...v, due_date: e.target.value }))} /></td>
                    <td><input className="wsp-input w-full" value={editValues.responsible_party || ""} onChange={e => setEditValues(v => ({ ...v, responsible_party: e.target.value }))} /></td>
                    <td>
                      <select className="wsp-input w-full text-xs"
                        value={editValues.status || "tbd"}
                        onChange={e => setEditValues(v => ({ ...v, status: e.target.value as DrawingStatus }))}>
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </td>
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
                    <td className="font-mono text-xs text-wsp-muted">{d.due_date || "—"}</td>
                    <td className="text-wsp-muted">{d.responsible_party || "—"}</td>
                    <td>
                      <span className={`wsp-badge ${STATUS_STYLES[d.status]} text-[10px]`}>
                        {STATUS_LABELS[d.status]}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(d)} className="text-wsp-muted hover:text-wsp-dark text-xs">Edit</button>
                        <button onClick={() => deleteMutation.mutate(d.id)} className="text-wsp-red/60 hover:text-wsp-red text-xs">Del</button>
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
            {drawings.length === 0 ? "No drawings yet. Add one." : "No drawings match the current filters."}
          </p>
        )}
      </div>
    </div>
  );
}
