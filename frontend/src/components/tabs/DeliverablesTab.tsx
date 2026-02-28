import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deliverablesApi, type Deliverable, type DeliverableType, type DeliverableStatus } from "../../api/deliverables";
import { wbsApi, type WBSItem } from "../../api/wbs";

interface Props { proposalId: string; }

const TYPE_LABELS: Record<DeliverableType, string> = {
  report: "Report",
  model: "Model",
  specification: "Spec",
  drawing_package: "Drawings",
  other: "Other",
};

const STATUS_STYLES: Record<DeliverableStatus, string> = {
  tbd:         "bg-wsp-bg-soft text-wsp-muted border border-wsp-border",
  in_progress: "bg-blue-50 text-blue-700 border border-blue-200",
  complete:    "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

const STATUS_LABELS: Record<DeliverableStatus, string> = {
  tbd: "TBD",
  in_progress: "In Progress",
  complete: "Complete",
};

const DELIVERABLE_TYPES: DeliverableType[] = ["report", "model", "specification", "drawing_package", "other"];
const STATUSES: DeliverableStatus[] = ["tbd", "in_progress", "complete"];

export default function DeliverablesTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Deliverable>>({});

  const { data: deliverables = [], isLoading } = useQuery({
    queryKey: ["deliverables", proposalId],
    queryFn: () => deliverablesApi.list(proposalId),
  });

  const { data: wbsItems = [] } = useQuery({
    queryKey: ["wbs", proposalId],
    queryFn: () => wbsApi.list(proposalId),
  });

  const createMutation = useMutation({
    mutationFn: () => deliverablesApi.create(proposalId, {
      title: "New Deliverable",
      type: "other",
      status: "tbd",
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliverables", proposalId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Deliverable> }) =>
      deliverablesApi.update(proposalId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliverables", proposalId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deliverablesApi.delete(proposalId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliverables", proposalId] }),
  });

  const startEdit = (d: Deliverable) => {
    setEditingId(d.id);
    setEditValues({
      wbs_id: d.wbs_id || undefined,
      deliverable_ref: d.deliverable_ref || "",
      title: d.title,
      type: d.type,
      due_date: d.due_date || "",
      responsible_party: d.responsible_party || "",
      status: d.status,
    });
  };

  const wbsLabel = (id: string | null) => {
    if (!id) return "—";
    const item = wbsItems.find((w: WBSItem) => w.id === id);
    return item ? item.wbs_code : id.slice(0, 6);
  };

  const statusCounts = {
    tbd:         deliverables.filter(d => d.status === "tbd").length,
    in_progress: deliverables.filter(d => d.status === "in_progress").length,
    complete:    deliverables.filter(d => d.status === "complete").length,
  };

  return (
    <div>
      {/* Header + stats */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h3 className="font-display font-semibold text-wsp-dark text-base tracking-tight">Deliverables</h3>
          <div className="flex gap-4 mt-1">
            {STATUSES.map(s => (
              <span key={s} className={`wsp-badge ${STATUS_STYLES[s]} text-[10px]`}>
                {STATUS_LABELS[s]} · {statusCounts[s]}
              </span>
            ))}
          </div>
        </div>
        <button onClick={() => createMutation.mutate()} className="wsp-btn-primary">
          + Add Deliverable
        </button>
      </div>

      <div className="wsp-card overflow-hidden">
        <table className="wsp-table w-full">
          <thead>
            <tr>
              <th className="w-24">Ref</th>
              <th>Title</th>
              <th className="w-28">Type</th>
              <th className="w-28">WBS</th>
              <th className="w-28">Due</th>
              <th>Responsible</th>
              <th className="w-28">Status</th>
              <th className="w-24">Drawings</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {deliverables.map(d => (
              <tr key={d.id}>
                {editingId === d.id ? (
                  <>
                    <td><input className="wsp-input w-full font-mono text-xs" value={editValues.deliverable_ref || ""} onChange={e => setEditValues(v => ({ ...v, deliverable_ref: e.target.value }))} /></td>
                    <td><input className="wsp-input w-full" value={editValues.title || ""} onChange={e => setEditValues(v => ({ ...v, title: e.target.value }))} /></td>
                    <td>
                      <select className="wsp-input w-full text-xs"
                        value={editValues.type || "other"}
                        onChange={e => setEditValues(v => ({ ...v, type: e.target.value as DeliverableType }))}>
                        {DELIVERABLE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="wsp-input w-full text-xs"
                        value={editValues.wbs_id || ""}
                        onChange={e => setEditValues(v => ({ ...v, wbs_id: e.target.value || undefined }))}>
                        <option value="">—</option>
                        {wbsItems.map((w: WBSItem) => (
                          <option key={w.id} value={w.id}>{w.wbs_code} {w.description}</option>
                        ))}
                      </select>
                    </td>
                    <td><input type="date" className="wsp-input font-mono text-xs" value={editValues.due_date || ""} onChange={e => setEditValues(v => ({ ...v, due_date: e.target.value }))} /></td>
                    <td><input className="wsp-input w-full" value={editValues.responsible_party || ""} onChange={e => setEditValues(v => ({ ...v, responsible_party: e.target.value }))} /></td>
                    <td>
                      <select className="wsp-input w-full text-xs"
                        value={editValues.status || "tbd"}
                        onChange={e => setEditValues(v => ({ ...v, status: e.target.value as DeliverableStatus }))}>
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td />
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => updateMutation.mutate({ id: d.id, data: editValues })} className="text-green-700 text-xs px-2 py-1 border border-green-300 hover:bg-green-50">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-wsp-muted text-xs px-2 py-1 border border-wsp-border hover:text-wsp-dark">✕</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td><span className="font-mono text-wsp-red text-xs">{d.deliverable_ref || "—"}</span></td>
                    <td className="font-body font-medium text-wsp-dark">{d.title}</td>
                    <td>
                      <span className="wsp-badge bg-wsp-bg-soft text-wsp-muted border border-wsp-border text-[10px]">
                        {TYPE_LABELS[d.type]}
                      </span>
                    </td>
                    <td><span className="font-mono text-wsp-red text-xs">{wbsLabel(d.wbs_id)}</span></td>
                    <td className="font-mono text-xs text-wsp-muted">{d.due_date || "—"}</td>
                    <td className="text-wsp-muted">{d.responsible_party || "—"}</td>
                    <td>
                      <span className={`wsp-badge ${STATUS_STYLES[d.status]} text-[10px]`}>
                        {STATUS_LABELS[d.status]}
                      </span>
                    </td>
                    <td>
                      <DrawingCount proposalId={proposalId} deliverableId={d.id} />
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
        {deliverables.length === 0 && !isLoading && (
          <p className="text-center py-12 text-wsp-muted text-sm font-body">
            No deliverables yet. Add one to get started.
          </p>
        )}
      </div>
    </div>
  );
}

function DrawingCount({ proposalId, deliverableId }: { proposalId: string; deliverableId: string }) {
  const { data } = useQuery({
    queryKey: ["drawing-count", proposalId, deliverableId],
    queryFn: () => deliverablesApi.drawingCount(proposalId, deliverableId),
  });
  const count = data?.count ?? 0;
  return (
    <span className={`font-mono text-xs ${count > 0 ? "text-wsp-dark font-semibold" : "text-wsp-muted"}`}>
      {count > 0 ? `${count} dwg` : "—"}
    </span>
  );
}
