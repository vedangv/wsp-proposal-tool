import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deliverablesApi, type Deliverable, type DeliverableType, type DeliverableStatus } from "../../api/deliverables";
import { wbsApi, type WBSItem } from "../../api/wbs";
import SlideOver from "../SlideOver";

interface Props { proposalId: string; }

const TYPE_LABELS: Record<DeliverableType, string> = {
  report: "Report", model: "Model", specification: "Spec", drawing_package: "Drawings", other: "Other",
};

const STATUS_STYLES: Record<DeliverableStatus, string> = {
  tbd: "bg-wsp-bg-soft text-wsp-muted border border-wsp-border",
  in_progress: "bg-blue-50 text-blue-700 border border-blue-200",
  complete: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

const STATUS_LABELS: Record<DeliverableStatus, string> = {
  tbd: "TBD", in_progress: "In Progress", complete: "Complete",
};

const DELIVERABLE_TYPES: DeliverableType[] = ["report", "model", "specification", "drawing_package", "other"];
const STATUSES: DeliverableStatus[] = ["tbd", "in_progress", "complete"];

export default function DeliverablesTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const [slideOpen, setSlideOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Deliverable | null>(null);
  const [formValues, setFormValues] = useState<Partial<Deliverable>>({});

  const { data: deliverables = [], isLoading } = useQuery({
    queryKey: ["deliverables", proposalId],
    queryFn: () => deliverablesApi.list(proposalId),
  });

  const { data: wbsItems = [] } = useQuery({
    queryKey: ["wbs", proposalId],
    queryFn: () => wbsApi.list(proposalId),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Deliverable>) => deliverablesApi.create(proposalId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliverables", proposalId] });
      setSlideOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Deliverable> }) =>
      deliverablesApi.update(proposalId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliverables", proposalId] });
      setSlideOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deliverablesApi.delete(proposalId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliverables", proposalId] }),
  });

  const openAdd = () => {
    setEditingItem(null);
    setFormValues({ title: "", type: "other", status: "tbd", deliverable_ref: "", responsible_party: "", due_date: "" });
    setSlideOpen(true);
  };

  const openEdit = (d: Deliverable) => {
    setEditingItem(d);
    setFormValues({
      wbs_id: d.wbs_id || undefined,
      deliverable_ref: d.deliverable_ref || "",
      title: d.title,
      type: d.type,
      due_date: d.due_date || "",
      responsible_party: d.responsible_party || "",
      status: d.status,
    });
    setSlideOpen(true);
  };

  const saveForm = () => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formValues });
    } else {
      createMutation.mutate(formValues);
    }
  };

  const wbsLabel = (id: string | null) => {
    if (!id) return "—";
    const item = wbsItems.find((w: WBSItem) => w.id === id);
    return item ? item.wbs_code : id.slice(0, 6);
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <h3 className="font-display font-semibold text-wsp-dark text-base tracking-tight">Deliverables</h3>
        <button onClick={openAdd} className="wsp-btn-primary">+ Add Deliverable</button>
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
                <td><DrawingCount proposalId={proposalId} deliverableId={d.id} /></td>
                <td>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(d)} className="text-wsp-muted hover:text-wsp-dark text-xs">Edit</button>
                    <button onClick={() => deleteMutation.mutate(d.id)} className="text-wsp-red/60 hover:text-wsp-red text-xs">Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {deliverables.length === 0 && !isLoading && (
          <p className="text-center py-12 text-wsp-muted text-sm font-body">No deliverables yet. Add one to get started.</p>
        )}
      </div>

      {/* SlideOver form */}
      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={editingItem ? `Edit — ${editingItem.title}` : "Add Deliverable"}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-wsp-muted block mb-1">Reference Code</label>
            <input className="border rounded px-3 py-2 w-full text-sm font-mono" placeholder="e.g. D-001" value={formValues.deliverable_ref || ""} onChange={e => setFormValues(v => ({ ...v, deliverable_ref: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-wsp-muted block mb-1">Title *</label>
            <input className="border rounded px-3 py-2 w-full text-sm" value={formValues.title || ""} onChange={e => setFormValues(v => ({ ...v, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-wsp-muted block mb-1">Type</label>
            <select className="border rounded px-3 py-2 w-full text-sm" value={formValues.type || "other"} onChange={e => setFormValues(v => ({ ...v, type: e.target.value as DeliverableType }))}>
              {DELIVERABLE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-wsp-muted block mb-1">WBS Link</label>
            <select className="border rounded px-3 py-2 w-full text-sm" value={formValues.wbs_id || ""} onChange={e => setFormValues(v => ({ ...v, wbs_id: e.target.value || undefined }))}>
              <option value="">— No WBS link —</option>
              {wbsItems.map((w: WBSItem) => (
                <option key={w.id} value={w.id}>{w.wbs_code} {w.description}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-wsp-muted block mb-1">Due Date</label>
            <input type="date" className="border rounded px-3 py-2 w-full text-sm" value={formValues.due_date || ""} onChange={e => setFormValues(v => ({ ...v, due_date: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-wsp-muted block mb-1">Responsible Party</label>
            <input className="border rounded px-3 py-2 w-full text-sm" value={formValues.responsible_party || ""} onChange={e => setFormValues(v => ({ ...v, responsible_party: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-wsp-muted block mb-1">Status</label>
            <select className="border rounded px-3 py-2 w-full text-sm" value={formValues.status || "tbd"} onChange={e => setFormValues(v => ({ ...v, status: e.target.value as DeliverableStatus }))}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-4 border-t">
            <button onClick={saveForm} disabled={!formValues.title} className="wsp-btn-primary disabled:opacity-40">
              {editingItem ? "Save Changes" : "Add Deliverable"}
            </button>
            <button onClick={() => setSlideOpen(false)} className="wsp-btn-ghost">Cancel</button>
          </div>
        </div>
      </SlideOver>
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
