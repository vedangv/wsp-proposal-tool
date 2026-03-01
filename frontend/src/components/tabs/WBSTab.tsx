import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { wbsApi, type WBSItem } from "../../api/wbs";
import { usePhases } from "../../hooks/usePhases";
import SlideOver from "../SlideOver";

const fmt = (n: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

const wbsLevel = (code: string) => code.split(".").length;

interface Props { proposalId: string; }

export default function WBSTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const phases = usePhases(proposalId);
  const [slideOpen, setSlideOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WBSItem | null>(null);
  const [formValues, setFormValues] = useState<Partial<WBSItem>>({});
  const [parentCode, setParentCode] = useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<{ id: string; count: number } | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["wbs", proposalId],
    queryFn: () => wbsApi.list(proposalId),
  });

  const createMutation = useMutation({
    mutationFn: (data: { wbs_code: string; description: string; phase: string; order_index: number }) =>
      wbsApi.create(proposalId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbs", proposalId] });
      setSlideOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WBSItem> }) =>
      wbsApi.update(proposalId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbs", proposalId] });
      setSlideOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wbsApi.delete(proposalId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbs", proposalId] });
      setDeleteWarning(null);
    },
  });

  const nextTopLevelCode = () => {
    const topCodes = items.map(i => i.wbs_code).filter(c => !c.includes(".")).map(Number).filter(n => !isNaN(n));
    return String((topCodes.length > 0 ? Math.max(...topCodes) : 0) + 1);
  };

  const nextChildCode = (pc: string) => {
    const prefix = pc + ".";
    const childNums = items.map(i => i.wbs_code).filter(c => c.startsWith(prefix) && !c.slice(prefix.length).includes(".")).map(c => Number(c.slice(prefix.length))).filter(n => !isNaN(n));
    return prefix + String((childNums.length > 0 ? Math.max(...childNums) : 0) + 1);
  };

  const openAdd = (pc?: string) => {
    setEditingItem(null);
    setParentCode(pc || null);
    const code = pc ? nextChildCode(pc) : nextTopLevelCode();
    setFormValues({ wbs_code: code, description: "", phase: "" });
    setSlideOpen(true);
  };

  const openEdit = (item: WBSItem) => {
    setEditingItem(item);
    setParentCode(null);
    setFormValues({ wbs_code: item.wbs_code, description: item.description || "", phase: item.phase || "" });
    setSlideOpen(true);
  };

  const saveForm = () => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formValues });
    } else {
      createMutation.mutate({
        wbs_code: formValues.wbs_code || "",
        description: formValues.description || "",
        phase: formValues.phase || "",
        order_index: items.length,
      });
    }
  };

  const handleDelete = async (id: string) => {
    const links = await wbsApi.links(proposalId, id);
    if (links.total > 0) {
      setDeleteWarning({ id, count: links.total });
    } else {
      if (window.confirm("Delete this WBS item?")) deleteMutation.mutate(id);
    }
  };

  const isParent = (item: WBSItem) => items.some(other => other.id !== item.id && other.wbs_code.startsWith(item.wbs_code + "."));
  const totalHours = items.reduce((sum, i) => isParent(i) ? sum : sum + (i.total_hours || 0), 0);
  const totalCost = items.reduce((sum, i) => isParent(i) ? sum : sum + (i.total_cost || 0), 0);
  const totalCostInternal = items.reduce((sum, i) => isParent(i) ? sum : sum + (i.total_cost_internal || 0), 0);
  const totalMargin = totalCost - totalCostInternal;
  const totalMarginPct = totalCost > 0 ? (totalMargin / totalCost) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="font-display font-semibold text-wsp-dark text-base tracking-tight">Work Breakdown Structure</h3>
          <p className="text-xs text-wsp-muted font-body mt-0.5">Hours and cost are computed from the Pricing Matrix</p>
        </div>
        <button onClick={() => openAdd()} className="wsp-btn-primary">+ Add Item</button>
      </div>

      {deleteWarning && (
        <div className="bg-amber-50 border border-amber-300 p-4 mb-4 flex items-center justify-between">
          <p className="text-sm text-amber-800 font-body">
            This WBS item is linked to <strong>{deleteWarning.count}</strong> other item(s). Deleting will set those links to null. Continue?
          </p>
          <div className="flex gap-2">
            <button onClick={() => deleteMutation.mutate(deleteWarning.id)} className="bg-wsp-red text-white px-3 py-1.5 text-xs font-display tracking-widest uppercase hover:bg-wsp-red-dark">Delete</button>
            <button onClick={() => setDeleteWarning(null)} className="wsp-btn-ghost text-xs py-1.5">Cancel</button>
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
              <th className="text-right w-28">Cost</th>
              <th className="text-right w-28">Billing</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const lvl = wbsLevel(item.wbs_code);
              const indent = (lvl - 1) * 16;
              return (
                <tr key={item.id}>
                  <td><span className="font-mono text-wsp-red text-xs tracking-wider">{item.wbs_code}</span></td>
                  <td>
                    <span className={`font-body block ${lvl === 1 ? "font-semibold text-wsp-dark" : lvl === 2 ? "text-wsp-dark" : "text-wsp-muted text-sm"}`} style={{ paddingLeft: `${indent}px` }}>
                      {lvl > 1 && <span className="text-wsp-border mr-1.5">{"└"}</span>}
                      {item.description || "—"}
                    </span>
                  </td>
                  <td className="text-wsp-muted">{item.phase || "—"}</td>
                  <td className="text-right font-mono text-sm">{item.total_hours > 0 ? item.total_hours : <span className="text-wsp-border">—</span>}</td>
                  <td className="text-right font-mono text-sm text-wsp-muted">{item.total_cost_internal > 0 ? fmt(item.total_cost_internal) : <span className="text-wsp-border">—</span>}</td>
                  <td className="text-right font-mono font-semibold text-sm">{item.total_cost > 0 ? fmt(item.total_cost) : <span className="text-wsp-border font-normal">—</span>}</td>
                  <td>
                    <div className="flex gap-2 px-2">
                      <button onClick={() => openAdd(item.wbs_code)} className="text-wsp-muted hover:text-wsp-dark text-xs" title="Add child item">+Child</button>
                      <button onClick={() => openEdit(item)} className="text-wsp-muted hover:text-wsp-dark text-xs">Edit</button>
                      <button onClick={() => handleDelete(item.id)} className="text-wsp-red/60 hover:text-wsp-red text-xs">Del</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-wsp-border bg-wsp-bg-soft">
              <td colSpan={3} className="px-4 py-3 text-right text-xs font-display font-semibold tracking-widest uppercase text-wsp-muted">Total</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-wsp-dark">{totalHours || "—"}</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-wsp-muted">{totalCostInternal > 0 ? fmt(totalCostInternal) : "—"}</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-wsp-dark">{totalCost > 0 ? fmt(totalCost) : "—"}</td>
              <td />
            </tr>
            {totalCost > 0 && (
              <tr className="bg-wsp-bg-soft">
                <td colSpan={3} className="px-4 pb-3 text-right text-xs font-display font-semibold tracking-widest uppercase text-wsp-muted">Margin</td>
                <td />
                <td className="px-4 pb-3 text-right font-mono text-sm text-wsp-muted">{fmt(totalMargin)}</td>
                <td className={`px-4 pb-3 text-right font-mono font-bold text-sm ${totalMarginPct >= 30 ? "text-emerald-600" : "text-amber-600"}`}>{totalMarginPct.toFixed(0)}%</td>
                <td />
              </tr>
            )}
          </tfoot>
        </table>
        {items.length === 0 && !isLoading && (
          <p className="text-center py-12 text-wsp-muted text-sm font-body">No WBS items yet. Add one to get started.</p>
        )}
      </div>

      {/* SlideOver form */}
      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={editingItem ? `Edit — ${editingItem.wbs_code}` : parentCode ? `Add Child to ${parentCode}` : "Add WBS Item"}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-wsp-muted block mb-1">WBS Code</label>
            <input className="border rounded px-3 py-2 w-full text-sm font-mono" value={formValues.wbs_code || ""} onChange={e => setFormValues(v => ({ ...v, wbs_code: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-wsp-muted block mb-1">Description</label>
            <textarea className="border rounded px-3 py-2 w-full text-sm resize-none" rows={3} value={formValues.description || ""} onChange={e => setFormValues(v => ({ ...v, description: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-wsp-muted block mb-1">Phase</label>
            <select className="border rounded px-3 py-2 w-full text-sm" value={formValues.phase || ""} onChange={e => setFormValues(v => ({ ...v, phase: e.target.value }))}>
              <option value="">— No phase —</option>
              {phases.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-4 border-t">
            <button onClick={saveForm} disabled={!formValues.wbs_code} className="wsp-btn-primary disabled:opacity-40">
              {editingItem ? "Save Changes" : "Add Item"}
            </button>
            <button onClick={() => setSlideOpen(false)} className="wsp-btn-ghost">Cancel</button>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
