import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pricingApi, PricingRow } from "../../api/pricing";
import { wbsApi, WBSItem } from "../../api/wbs";

interface Props { proposalId: string; }

const PHASES = ["Study", "Preliminary", "Detailed", "Tender", "Construction"];

export default function PricingTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PricingRow>>({});

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
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-800">Pricing Matrix</h3>
        <button
          onClick={() => createMutation.mutate()}
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
        >+ Add Row</button>
      </div>

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 text-gray-600 font-medium">WBS Link</th>
              <th className="text-left px-3 py-2 text-gray-600 font-medium">Role</th>
              <th className="text-left px-3 py-2 text-gray-600 font-medium">Staff</th>
              <th className="text-left px-3 py-2 text-gray-600 font-medium">Grade</th>
              <th className="text-right px-3 py-2 text-gray-600 font-medium">Rate</th>
              {PHASES.map(p => (
                <th key={p} className="text-right px-3 py-2 text-gray-600 font-medium w-20">{p}</th>
              ))}
              <th className="text-right px-3 py-2 text-gray-600 font-medium">Hrs</th>
              <th className="text-right px-3 py-2 text-gray-600 font-medium">Total</th>
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
                    <td className="px-3 py-2 text-xs text-blue-700 max-w-[9rem] truncate">{wbsLabel(row.wbs_id)}</td>
                    <td className="px-3 py-2">{row.role_title || "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{row.staff_name || "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{row.grade || "—"}</td>
                    <td className="px-3 py-2 text-right">${row.hourly_rate}</td>
                    {PHASES.map(p => (
                      <td key={p} className="px-3 py-2 text-right text-gray-600">
                        {row.hours_by_phase?.[p] ?? 0}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-medium">{row.total_hours}</td>
                    <td className="px-3 py-2 text-right font-medium">${(row.total_cost || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 flex gap-2">
                      <button onClick={() => startEdit(row)} className="text-gray-400 hover:text-gray-700 text-xs">Edit</button>
                      <button onClick={() => deleteMutation.mutate(row.id)} className="text-red-400 hover:text-red-600 text-xs">Del</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-gray-50">
            <tr>
              <td colSpan={8 + PHASES.length} className="px-3 py-3 text-right text-sm font-semibold text-gray-700">Grand Total</td>
              <td className="px-3 py-3 text-right font-bold text-gray-900">${grandTotal.toLocaleString()}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
        {rows.length === 0 && !isLoading && (
          <p className="text-center py-10 text-gray-400 text-sm">No pricing rows yet. Add one.</p>
        )}
      </div>
    </div>
  );
}
