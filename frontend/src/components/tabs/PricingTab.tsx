import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pricingApi, type PricingRow } from "../../api/pricing";
import { wbsApi, type WBSItem } from "../../api/wbs";

interface Props { proposalId: string; }

const PHASES = ["Study", "Preliminary", "Detailed", "Tender", "Construction"];

const fmt = (n: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

// Distribute WBS hours across phases based on phase name
const phaseHours = (phase: string | null, totalHours: number): Record<string, number> => {
  const p = (phase || "").toLowerCase();
  if (p.includes("study") || p.includes("assessment") || p.includes("1"))
    return { Study: totalHours };
  if (p.includes("prelim") || p.includes("design") || p.includes("2"))
    return { Preliminary: totalHours };
  if (p.includes("report") || p.includes("3"))
    return { Preliminary: Math.round(totalHours * 0.6), Detailed: Math.round(totalHours * 0.4) };
  return { Study: Math.round(totalHours * 0.5), Preliminary: Math.round(totalHours * 0.5) };
};

export default function PricingTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PricingRow>>({});
  const [importing, setImporting] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pricing", proposalId],
    queryFn: () => pricingApi.list(proposalId),
  });

  const { data: wbsItems = [] } = useQuery({
    queryKey: ["wbs", proposalId],
    queryFn: () => wbsApi.list(proposalId),
  });

  const createMutation = useMutation({
    mutationFn: () => pricingApi.create(proposalId, {
      role_title: "New Role", hourly_rate: 0, hours_by_phase: {},
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing", proposalId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PricingRow> }) =>
      pricingApi.update(proposalId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing", proposalId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pricingApi.delete(proposalId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing", proposalId] }),
  });

  const startEdit = (row: PricingRow) => {
    setEditingId(row.id);
    setEditValues({
      wbs_id: row.wbs_id || undefined,
      role_title: row.role_title || "",
      staff_name: row.staff_name || "",
      grade: row.grade || "",
      hourly_rate: row.hourly_rate,
      hours_by_phase: { ...row.hours_by_phase },
    });
  };

  const saveEdit = (id: string) => updateMutation.mutate({ id, data: editValues });

  const handleImportFromWBS = async () => {
    const leafItems = wbsItems.filter((w: WBSItem) => w.hours > 0);
    if (leafItems.length === 0) return;
    setImporting(true);
    try {
      await Promise.all(
        leafItems.map((w: WBSItem) =>
          pricingApi.create(proposalId, {
            wbs_id: w.id,
            role_title: w.description || w.wbs_code,
            hourly_rate: w.unit_rate,
            hours_by_phase: phaseHours(w.phase, w.hours),
          })
        )
      );
      qc.invalidateQueries({ queryKey: ["pricing", proposalId] });
    } finally {
      setImporting(false);
    }
  };

  const setPhaseHours = (phase: string, val: number) => {
    setEditValues(v => ({
      ...v,
      hours_by_phase: { ...(v.hours_by_phase || {}), [phase]: val },
    }));
  };

  const grandTotal = rows.reduce((s, r) => s + (r.total_cost || 0), 0);

  const wbsLabel = (id: string | null) => {
    if (!id) return "—";
    const item = wbsItems.find((w: WBSItem) => w.id === id);
    return item ? `${item.wbs_code} ${item.description || ""}`.trim() : id.slice(0, 8);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h3 className="font-display font-semibold text-wsp-dark text-base tracking-tight">Pricing Matrix</h3>
        <div className="flex gap-2">
          <button
            onClick={handleImportFromWBS}
            disabled={importing || wbsItems.length === 0}
            className="wsp-btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {importing ? "Importing…" : "↑ From WBS"}
          </button>
          <button
            onClick={() => createMutation.mutate()}
            className="wsp-btn-primary"
          >+ Add Row</button>
        </div>
      </div>

      <div className="wsp-card overflow-x-auto">
        <table className="wsp-table w-full min-w-max">
          <thead>
            <tr>
              <th className="w-36">WBS Link</th>
              <th>Role</th>
              <th className="w-28">Staff</th>
              <th className="w-20">Grade</th>
              <th className="text-right w-20">Rate</th>
              {PHASES.map(p => (
                <th key={p} className="text-right w-20">{p}</th>
              ))}
              <th className="text-right w-16">Hrs</th>
              <th className="text-right w-28">Total</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                {editingId === row.id ? (
                  <>
                    <td className="px-2 py-1">
                      <select
                        className="border rounded px-1 py-1 text-xs w-36"
                        value={editValues.wbs_id || ""}
                        onChange={e => setEditValues(v => ({ ...v, wbs_id: e.target.value || undefined }))}
                      >
                        <option value="">— none —</option>
                        {wbsItems.map((w: WBSItem) => (
                          <option key={w.id} value={w.id}>{w.wbs_code} {w.description}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1"><input className="border rounded px-2 py-1 text-xs w-28" value={editValues.role_title || ""} onChange={e => setEditValues(v => ({ ...v, role_title: e.target.value }))} /></td>
                    <td className="px-2 py-1"><input className="border rounded px-2 py-1 text-xs w-24" value={editValues.staff_name || ""} onChange={e => setEditValues(v => ({ ...v, staff_name: e.target.value }))} /></td>
                    <td className="px-2 py-1"><input className="border rounded px-2 py-1 text-xs w-16" value={editValues.grade || ""} onChange={e => setEditValues(v => ({ ...v, grade: e.target.value }))} /></td>
                    <td className="px-2 py-1"><input type="number" className="border rounded px-2 py-1 text-xs w-20 text-right" value={editValues.hourly_rate ?? 0} onChange={e => setEditValues(v => ({ ...v, hourly_rate: parseFloat(e.target.value) || 0 }))} /></td>
                    {PHASES.map(p => (
                      <td key={p} className="px-2 py-1">
                        <input type="number" className="border rounded px-1 py-1 text-xs w-16 text-right"
                          value={editValues.hours_by_phase?.[p] ?? 0}
                          onChange={e => setPhaseHours(p, parseFloat(e.target.value) || 0)} />
                      </td>
                    ))}
                    <td className="px-3 py-1 text-right text-xs text-gray-400">
                      {Object.values(editValues.hours_by_phase || {}).reduce((s: number, v) => s + (v as number), 0)}
                    </td>
                    <td className="px-3 py-1 text-right text-xs text-gray-400">
                      ${(Object.values(editValues.hours_by_phase || {}).reduce((s: number, v) => s + (v as number), 0) * (editValues.hourly_rate || 0)).toLocaleString()}
                    </td>
                    <td className="px-2 py-1 flex gap-1">
                      <button onClick={() => saveEdit(row.id)} className="text-green-600 hover:text-green-800 text-xs px-2 py-1 border border-green-300 rounded">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 border rounded">✕</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td><span className="font-mono text-wsp-red text-xs truncate block max-w-[9rem]">{wbsLabel(row.wbs_id)}</span></td>
                    <td className="font-body">{row.role_title || "—"}</td>
                    <td className="text-wsp-muted">{row.staff_name || "—"}</td>
                    <td className="text-wsp-muted">{row.grade || "—"}</td>
                    <td className="text-right font-mono text-sm">{fmt(row.hourly_rate)}</td>
                    {PHASES.map(p => (
                      <td key={p} className="text-right font-mono text-sm text-wsp-muted">
                        {row.hours_by_phase?.[p] ?? 0}
                      </td>
                    ))}
                    <td className="text-right font-mono text-sm font-semibold">{row.total_hours}</td>
                    <td className="text-right font-mono font-semibold text-sm">{fmt(row.total_cost || 0)}</td>
                    <td>
                      <div className="flex gap-2 px-4">
                        <button onClick={() => startEdit(row)} className="text-wsp-muted hover:text-wsp-dark text-xs">Edit</button>
                        <button onClick={() => deleteMutation.mutate(row.id)} className="text-wsp-red/60 hover:text-wsp-red text-xs">Del</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-wsp-border bg-wsp-bg-soft">
              <td colSpan={8 + PHASES.length} className="px-4 py-3 text-right text-xs font-display font-semibold tracking-widest uppercase text-wsp-muted">Grand Total</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-wsp-dark">{fmt(grandTotal)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
        {rows.length === 0 && !isLoading && (
          <p className="text-center py-12 text-wsp-muted text-sm font-body">No pricing rows yet. Add one or use ↑ From WBS.</p>
        )}
      </div>
    </div>
  );
}
