import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { wbsApi, type WBSItem } from "../../api/wbs";

const fmt = (n: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

// WBS level derived from dot-count: "1" → 1, "1.0" → 2, "1.1.1" → 3
const wbsLevel = (code: string) => code.split(".").length;

interface Props { proposalId: string; }

export default function WBSTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<WBSItem>>({});
  const [deleteWarning, setDeleteWarning] = useState<{ id: string; count: number } | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["wbs", proposalId],
    queryFn: () => wbsApi.list(proposalId),
  });

  const createMutation = useMutation({
    mutationFn: () => wbsApi.create(proposalId, {
      wbs_code: "1.0", description: "New item", phase: "", hours: 0, unit_rate: 0,
      order_index: items.length,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wbs", proposalId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WBSItem> }) =>
      wbsApi.update(proposalId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbs", proposalId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wbsApi.delete(proposalId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbs", proposalId] });
      setDeleteWarning(null);
    },
  });

  const totalCost = items.reduce((sum, i) => sum + (i.total_cost || 0), 0);

  const startEdit = (item: WBSItem) => {
    setEditingId(item.id);
    setEditValues({
      wbs_code: item.wbs_code,
      description: item.description || "",
      phase: item.phase || "",
      hours: item.hours,
      unit_rate: item.unit_rate,
    });
  };

  const saveEdit = (id: string) => updateMutation.mutate({ id, data: editValues });

  const handleDelete = async (id: string) => {
    const links = await wbsApi.links(proposalId, id);
    if (links.total > 0) {
      setDeleteWarning({ id, count: links.total });
    } else {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h3 className="font-display font-semibold text-wsp-dark text-base tracking-tight">
          Work Breakdown Structure
        </h3>
        <button onClick={() => createMutation.mutate()} className="wsp-btn-primary">
          + Add Item
        </button>
      </div>

      {deleteWarning && (
        <div className="bg-amber-50 border border-amber-300 p-4 mb-4 flex items-center justify-between">
          <p className="text-sm text-amber-800 font-body">
            This WBS item is linked to <strong>{deleteWarning.count}</strong> other item(s).
            Deleting will set those links to null. Continue?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => deleteMutation.mutate(deleteWarning.id)}
              className="bg-wsp-red text-white px-3 py-1.5 text-xs font-display tracking-widest uppercase hover:bg-wsp-red-dark"
            >Delete</button>
            <button
              onClick={() => setDeleteWarning(null)}
              className="wsp-btn-ghost text-xs py-1.5"
            >Cancel</button>
          </div>
        </div>
      )}

      <div className="wsp-card overflow-hidden">
        <table className="wsp-table w-full">
          <thead>
            <tr>
              <th className="w-28">WBS Code</th>
              <th>Description</th>
              <th className="w-32">Phase</th>
              <th className="text-right w-24">Hours</th>
              <th className="text-right w-28">Rate ($/hr)</th>
              <th className="text-right w-32">Total Cost</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                {editingId === item.id ? (
                  <>
                    <td><input className="wsp-input w-full font-mono" value={editValues.wbs_code || ""} onChange={e => setEditValues(v => ({ ...v, wbs_code: e.target.value }))} /></td>
                    <td><input className="wsp-input w-full" value={editValues.description || ""} onChange={e => setEditValues(v => ({ ...v, description: e.target.value }))} /></td>
                    <td><input className="wsp-input w-full" value={editValues.phase || ""} onChange={e => setEditValues(v => ({ ...v, phase: e.target.value }))} /></td>
                    <td><input className="wsp-input w-full text-right" type="number" value={editValues.hours ?? 0} onChange={e => setEditValues(v => ({ ...v, hours: parseFloat(e.target.value) || 0 }))} /></td>
                    <td><input className="wsp-input w-full text-right" type="number" value={editValues.unit_rate ?? 0} onChange={e => setEditValues(v => ({ ...v, unit_rate: parseFloat(e.target.value) || 0 }))} /></td>
                    <td className="text-right text-wsp-muted text-xs font-mono px-4">
                      {fmt((editValues.hours ?? 0) * (editValues.unit_rate ?? 0))}
                    </td>
                    <td>
                      <div className="flex gap-1 px-2">
                        <button onClick={() => saveEdit(item.id)} className="text-green-700 hover:text-green-900 text-xs px-2 py-1 border border-green-300">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-wsp-muted hover:text-wsp-dark text-xs px-2 py-1 border border-wsp-border">✕</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td>
                      <span className="font-mono text-wsp-red text-xs tracking-wider">{item.wbs_code}</span>
                    </td>
                    <td>
                      {(() => {
                        const lvl = wbsLevel(item.wbs_code);
                        const indent = (lvl - 1) * 16;
                        return (
                          <span
                            className={`font-body block ${lvl === 1 ? "font-semibold text-wsp-dark" : lvl === 2 ? "text-wsp-dark" : "text-wsp-muted text-sm"}`}
                            style={{ paddingLeft: `${indent}px` }}
                          >
                            {lvl > 1 && <span className="text-wsp-border mr-1.5">{"└"}</span>}
                            {item.description || "—"}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="text-wsp-muted">{item.phase || "—"}</td>
                    <td className="text-right font-mono text-sm">{item.hours}</td>
                    <td className="text-right font-mono text-sm">{fmt(item.unit_rate)}</td>
                    <td className="text-right font-mono font-semibold text-sm">{fmt(item.total_cost || 0)}</td>
                    <td>
                      <div className="flex gap-2 px-4">
                        <button onClick={() => startEdit(item)} className="text-wsp-muted hover:text-wsp-dark text-xs">Edit</button>
                        <button onClick={() => handleDelete(item.id)} className="text-wsp-red/60 hover:text-wsp-red text-xs">Del</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-wsp-border bg-wsp-bg-soft">
              <td colSpan={5} className="px-4 py-3 text-right text-xs font-display font-semibold tracking-widest uppercase text-wsp-muted">
                Total
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold text-wsp-dark">
                {fmt(totalCost)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
        {items.length === 0 && !isLoading && (
          <p className="text-center py-12 text-wsp-muted text-sm font-body">
            No WBS items yet. Add one to get started.
          </p>
        )}
      </div>
    </div>
  );
}
