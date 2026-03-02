import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deliverablesApi, type Deliverable, type DeliverableType } from "../../api/deliverables";
import { wbsApi, type WBSItem } from "../../api/wbs";
import { agentsApi, type DeliverableResult } from "../../api/agents";
import SlideOver from "../SlideOver";

interface Props { proposalId: string; }

const TYPE_LABELS: Record<DeliverableType, string> = {
  report: "Report", model: "Model", specification: "Spec", drawing_package: "Drawings", other: "Other",
};

const DELIVERABLE_TYPES: DeliverableType[] = ["report", "model", "specification", "drawing_package", "other"];

export default function DeliverablesTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const [slideOpen, setSlideOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Deliverable | null>(null);
  const [formValues, setFormValues] = useState<Partial<Deliverable>>({});
  const [fetching, setFetching] = useState(false);
  const [fetchResults, setFetchResults] = useState<DeliverableResult[] | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const startFetch = useCallback(async () => {
    setFetching(true);
    setFetchResults(null);
    try {
      const { job_id } = await agentsApi.startDeliverablesFetch(proposalId);
      pollRef.current = setInterval(async () => {
        try {
          const job = await agentsApi.pollJob(job_id);
          if (job.status === "complete" && job.result) {
            if (pollRef.current) clearInterval(pollRef.current);
            setFetchResults(job.result as unknown as DeliverableResult[]);
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

  const acceptResult = async (r: DeliverableResult) => {
    await deliverablesApi.create(proposalId, {
      deliverable_ref: r.deliverable_ref,
      title: r.title,
      type: r.type as DeliverableType,
      description: r.description,
      responsible_party: r.responsible_party,
    });
    qc.invalidateQueries({ queryKey: ["deliverables", proposalId] });
    setFetchResults(prev => prev ? prev.filter(x => x !== r) : null);
  };

  const dismissResult = (r: DeliverableResult) => {
    setFetchResults(prev => prev ? prev.filter(x => x !== r) : null);
  };

  const openAdd = () => {
    setEditingItem(null);
    setFormValues({ title: "", type: "other", deliverable_ref: "", responsible_party: "", description: "" });
    setSlideOpen(true);
  };

  const openEdit = (d: Deliverable) => {
    setEditingItem(d);
    setFormValues({
      wbs_id: d.wbs_id || undefined,
      deliverable_ref: d.deliverable_ref || "",
      title: d.title,
      type: d.type,
      description: d.description || "",
      responsible_party: d.responsible_party || "",
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
        <div>
          <h3 className="font-display font-semibold text-wsp-dark text-base tracking-tight">Deliverables</h3>
          <p className="text-xs text-wsp-muted font-body mt-0.5">
            Required deliverables extracted from the RFP
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
          <button onClick={openAdd} className="wsp-btn-primary">+ Add Deliverable</button>
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
                      <span className="font-mono text-wsp-red text-xs">{r.deliverable_ref}</span>
                      <span className="font-display font-semibold text-wsp-dark text-sm">{r.title}</span>
                      <span className="wsp-badge bg-wsp-bg-soft text-wsp-muted border border-wsp-border text-[10px]">
                        {TYPE_LABELS[r.type as DeliverableType] || r.type}
                      </span>
                    </div>
                    {r.description && (
                      <p className="text-xs text-purple-700 font-body mt-2 bg-purple-50 p-2 rounded">{r.description}</p>
                    )}
                    {r.responsible_party && (
                      <span className="text-xs text-wsp-muted font-body mt-1 inline-block">Responsible: {r.responsible_party}</span>
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

      <div className="wsp-card overflow-hidden">
        <table className="wsp-table w-full">
          <thead>
            <tr>
              <th className="w-24">Ref</th>
              <th>Title</th>
              <th className="w-28">Type</th>
              <th className="w-28">WBS</th>
              <th>Responsible</th>
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
                <td className="text-wsp-muted">{d.responsible_party || "—"}</td>
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
          <p className="text-center py-12 text-wsp-muted text-sm font-body">No deliverables yet. Use "Fetch from RFP" to extract deliverables or add one manually.</p>
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
            <label className="text-xs text-wsp-muted block mb-1">Description</label>
            <textarea rows={3} className="border rounded px-3 py-2 w-full text-sm resize-none" placeholder="Description of the deliverable..." value={formValues.description || ""} onChange={e => setFormValues(v => ({ ...v, description: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-wsp-muted block mb-1">Responsible Party</label>
            <input className="border rounded px-3 py-2 w-full text-sm" value={formValues.responsible_party || ""} onChange={e => setFormValues(v => ({ ...v, responsible_party: e.target.value }))} />
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
