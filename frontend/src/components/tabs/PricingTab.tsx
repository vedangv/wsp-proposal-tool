import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pricingApi, type PricingRow } from "../../api/pricing";
import { wbsApi, type WBSItem } from "../../api/wbs";
import { peopleApi, type Person } from "../../api/people";

interface Props { proposalId: string; }

const PHASES = ["Study", "Preliminary", "Detailed", "Tender", "Construction"];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

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

  const { data: people = [] } = useQuery({
    queryKey: ["people", proposalId],
    queryFn: () => peopleApi.list(proposalId),
  });

  const createMutation = useMutation({
    mutationFn: () => pricingApi.create(proposalId, { hours_by_phase: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pricing", proposalId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PricingRow> }) =>
      pricingApi.update(proposalId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing", proposalId] });
      qc.invalidateQueries({ queryKey: ["wbs", proposalId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pricingApi.delete(proposalId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing", proposalId] });
      qc.invalidateQueries({ queryKey: ["wbs", proposalId] });
    },
  });

  const startEdit = (row: PricingRow) => {
    setEditingId(row.id);
    setEditValues({
      wbs_id: row.wbs_id || undefined,
      person_id: row.person_id || undefined,
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

  const onPersonChange = (personId: string) => {
    const person = people.find((p: Person) => p.id === personId);
    setEditValues(v => ({
      ...v,
      person_id: personId || undefined,
      hourly_rate: person?.hourly_rate ?? v.hourly_rate ?? 0,
    }));
  };

  const grandTotalHours = rows.reduce((s, r) => s + (r.total_hours || 0), 0);
  const grandTotal = rows.reduce((s, r) => s + (r.total_cost || 0), 0);

  const wbsLabel = (id: string | null) => {
    if (!id) return "—";
    const item = wbsItems.find((w: WBSItem) => w.id === id);
    return item ? `${item.wbs_code} ${item.description || ""}`.trim() : id.slice(0, 8);
  };

  const editPreviewHours = Object.values(editValues.hours_by_phase || {})
    .reduce((s: number, v) => s + (v as number), 0);
  const editPreviewCost = editPreviewHours * (editValues.hourly_rate || 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h3 className="font-display font-semibold text-wsp-dark text-base tracking-tight">Pricing Matrix</h3>
          <p className="text-xs text-wsp-muted font-body mt-0.5">
            Hours and cost per person per WBS item · rates drawn from People tab
          </p>
        </div>
        <button onClick={() => createMutation.mutate()} className="wsp-btn-primary">
          + Add Row
        </button>
      </div>

      <div className="wsp-card overflow-x-auto">
        <table className="wsp-table w-full min-w-max">
          <thead>
            <tr>
              <th className="w-40">WBS Item</th>
              <th className="w-44">Person</th>
              <th className="w-36">WSP Role</th>
              <th className="w-28">Team</th>
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
                    {/* WBS selector */}
                    <td className="px-2 py-1">
                      <select
                        className="border rounded px-1 py-1 text-xs w-40"
                        value={editValues.wbs_id || ""}
                        onChange={e => setEditValues(v => ({ ...v, wbs_id: e.target.value || undefined }))}
                      >
                        <option value="">— none —</option>
                        {wbsItems.map((w: WBSItem) => (
                          <option key={w.id} value={w.id}>{w.wbs_code} {w.description}</option>
                        ))}
                      </select>
                    </td>
                    {/* Person selector */}
                    <td className="px-2 py-1">
                      <select
                        className="border rounded px-1 py-1 text-xs w-40"
                        value={editValues.person_id || ""}
                        onChange={e => onPersonChange(e.target.value)}
                      >
                        <option value="">— select person —</option>
                        {people.map((p: Person) => (
                          <option key={p.id} value={p.id}>{p.employee_name}</option>
                        ))}
                      </select>
                    </td>
                    {/* WSP role + team: read-only from person */}
                    <td className="px-3 py-1 text-xs text-wsp-muted">
                      {people.find((p: Person) => p.id === editValues.person_id)?.wsp_role || "—"}
                    </td>
                    <td className="px-3 py-1 text-xs text-wsp-muted">
                      {people.find((p: Person) => p.id === editValues.person_id)?.team || "—"}
                    </td>
                    {/* Rate: auto-filled from person but editable */}
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        className="border rounded px-1 py-1 text-xs w-20 text-right"
                        value={editValues.hourly_rate ?? 0}
                        onChange={e => setEditValues(v => ({ ...v, hourly_rate: parseFloat(e.target.value) || 0 }))}
                      />
                    </td>
                    {/* Phase hours */}
                    {PHASES.map(p => (
                      <td key={p} className="px-2 py-1">
                        <input
                          type="number"
                          className="border rounded px-1 py-1 text-xs w-16 text-right"
                          value={editValues.hours_by_phase?.[p] ?? 0}
                          onChange={e => setPhaseHours(p, parseFloat(e.target.value) || 0)}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-1 text-right text-xs text-gray-400">{editPreviewHours}</td>
                    <td className="px-3 py-1 text-right text-xs text-gray-400">{fmt(editPreviewCost)}</td>
                    <td className="px-2 py-1">
                      <div className="flex gap-1">
                        <button onClick={() => saveEdit(row.id)} className="text-green-600 hover:text-green-800 text-xs px-2 py-1 border border-green-300 rounded">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 border rounded">✕</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td>
                      <span className="font-mono text-wsp-red text-xs truncate block max-w-[10rem]">{wbsLabel(row.wbs_id)}</span>
                    </td>
                    <td className="font-body font-medium text-sm">{row.person_name || "—"}</td>
                    <td className="text-wsp-muted text-xs">{row.person_wsp_role || "—"}</td>
                    <td className="text-xs">
                      {row.person_team
                        ? <span className="wsp-badge bg-wsp-bg-soft text-wsp-muted border border-wsp-border text-[10px]">{row.person_team}</span>
                        : <span className="text-wsp-border">—</span>}
                    </td>
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
              <td colSpan={5 + PHASES.length} className="px-4 py-3 text-right text-xs font-display font-semibold tracking-widest uppercase text-wsp-muted">
                Grand Total
              </td>
              <td className="px-4 py-3 text-right font-mono font-bold text-wsp-dark">{grandTotalHours}</td>
              <td className="px-4 py-3 text-right font-mono font-bold text-wsp-dark">{fmt(grandTotal)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
        {rows.length === 0 && !isLoading && (
          <p className="text-center py-12 text-wsp-muted text-sm font-body">
            No pricing rows yet. Add people in the People tab first, then assign them to WBS items here.
          </p>
        )}
      </div>
    </div>
  );
}
