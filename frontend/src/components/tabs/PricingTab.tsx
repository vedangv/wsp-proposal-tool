import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pricingApi, type PricingRow } from "../../api/pricing";
import { wbsApi, type WBSItem } from "../../api/wbs";
import { peopleApi, type Person } from "../../api/people";

interface Props { proposalId: string; }

const PHASES = ["Study", "Preliminary", "Detailed", "Tender", "Construction"];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

const wbsLevel = (code: string) => code.split(".").length;

type NewRowState = {
  person_id: string;
  hourly_rate: number;
  hours_by_phase: Record<string, number>;
};

const emptyNewRow = (): NewRowState => ({
  person_id: "",
  hourly_rate: 0,
  hours_by_phase: {},
});

export default function PricingTab({ proposalId }: Props) {
  const qc = useQueryClient();

  // Editing an existing row
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PricingRow>>({});

  // Adding a new row to a specific WBS item
  const [addingToWbs, setAddingToWbs] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<NewRowState>(emptyNewRow());

  const { data: rows = [], isLoading: rowsLoading } = useQuery({
    queryKey: ["pricing", proposalId],
    queryFn: () => pricingApi.list(proposalId),
  });

  const { data: wbsItems = [], isLoading: wbsLoading } = useQuery({
    queryKey: ["wbs", proposalId],
    queryFn: () => wbsApi.list(proposalId),
  });

  const { data: people = [] } = useQuery({
    queryKey: ["people", proposalId],
    queryFn: () => peopleApi.list(proposalId),
  });

  const createMutation = useMutation({
    mutationFn: (data: { wbs_id: string; person_id: string; hourly_rate: number; hours_by_phase: Record<string, number> }) =>
      pricingApi.create(proposalId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing", proposalId] });
      qc.invalidateQueries({ queryKey: ["wbs", proposalId] });
      setAddingToWbs(null);
      setNewRow(emptyNewRow());
    },
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
    setAddingToWbs(null);
    setEditingId(row.id);
    setEditValues({
      person_id: row.person_id || undefined,
      hourly_rate: row.hourly_rate,
      hours_by_phase: { ...row.hours_by_phase },
    });
  };

  const onEditPersonChange = (personId: string) => {
    const person = people.find((p: Person) => p.id === personId);
    setEditValues(v => ({
      ...v,
      person_id: personId || undefined,
      hourly_rate: personId ? (person?.hourly_rate ?? v.hourly_rate ?? 0) : v.hourly_rate ?? 0,
    }));
  };

  const onNewPersonChange = (personId: string) => {
    const person = people.find((p: Person) => p.id === personId);
    setNewRow(v => ({
      ...v,
      person_id: personId,
      hourly_rate: personId ? (person?.hourly_rate ?? 0) : 0,
    }));
  };

  const saveNew = (wbsId: string) => {
    if (!newRow.person_id) return;
    createMutation.mutate({
      wbs_id: wbsId,
      person_id: newRow.person_id,
      hourly_rate: newRow.hourly_rate,
      hours_by_phase: newRow.hours_by_phase,
    });
  };

  const grandTotalHours = rows.reduce((s, r) => s + (r.total_hours || 0), 0);
  const grandTotal = rows.reduce((s, r) => s + (r.total_cost || 0), 0);

  const editPreviewHours = Object.values(editValues.hours_by_phase || {})
    .reduce((s: number, v) => s + (v as number), 0);
  const editPreviewCost = editPreviewHours * (editValues.hourly_rate || 0);

  const newPreviewHours = Object.values(newRow.hours_by_phase)
    .reduce((s, v) => s + v, 0);
  const newPreviewCost = newPreviewHours * newRow.hourly_rate;

  if (wbsLoading) return <div className="text-wsp-muted text-sm font-body py-8 text-center">Loading…</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-end mb-5">
        <div>
          <h3 className="font-display font-semibold text-wsp-dark text-base tracking-tight">Pricing Matrix</h3>
          <p className="text-xs text-wsp-muted font-body mt-0.5">
            Assign team members to WBS items and enter hours · rates flow from People tab
          </p>
        </div>
        {/* Grand total summary */}
        {grandTotal > 0 && (
          <div className="flex items-center gap-6 text-right">
            <div>
              <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Total Hours</p>
              <p className="font-mono font-bold text-wsp-dark text-base">{grandTotalHours}</p>
            </div>
            <div>
              <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Total Cost</p>
              <p className="font-mono font-bold text-wsp-dark text-base">{fmt(grandTotal)}</p>
            </div>
          </div>
        )}
      </div>

      {wbsItems.length === 0 && (
        <div className="wsp-card p-12 text-center">
          <p className="text-wsp-muted text-sm font-body">No WBS items yet. Add items in the WBS tab first.</p>
        </div>
      )}

      {/* One section per WBS item */}
      <div className="space-y-3">
        {wbsItems.map(wbs => {
          const wbsRows = rows.filter(r => r.wbs_id === wbs.id);
          const secHours = wbsRows.reduce((s, r) => s + r.total_hours, 0);
          const secCost  = wbsRows.reduce((s, r) => s + r.total_cost, 0);
          const lvl = wbsLevel(wbs.wbs_code);
          const isAdding = addingToWbs === wbs.id;
          const isLeaf = !wbsItems.some(
            other => other.id !== wbs.id && other.wbs_code.startsWith(wbs.wbs_code + ".")
          );

          return (
            <div key={wbs.id} className="wsp-card overflow-hidden">
              {/* WBS section header */}
              <div className={`flex items-center justify-between px-4 py-2.5
                ${lvl === 1 ? "bg-wsp-dark" : lvl === 2 ? "bg-wsp-bg-soft border-b border-wsp-border" : "bg-white border-b border-wsp-border"}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-xs tracking-wider ${lvl === 1 ? "text-wsp-red" : "text-wsp-red"}`}>
                    {wbs.wbs_code}
                  </span>
                  <span className={`font-display text-sm font-semibold ${lvl === 1 ? "text-white" : "text-wsp-dark"}`}>
                    {wbs.description || "—"}
                  </span>
                  {wbs.phase && (
                    <span className={`text-[10px] font-display tracking-widest uppercase px-1.5 py-0.5 rounded
                      ${lvl === 1 ? "text-white/50 bg-white/10" : "text-wsp-muted bg-wsp-bg-soft border border-wsp-border"}`}>
                      {wbs.phase}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-6">
                  {secHours > 0 && (
                    <div className="flex items-center gap-4 text-right">
                      <span className={`font-mono text-sm ${lvl === 1 ? "text-white/70" : "text-wsp-muted"}`}>
                        {secHours}h
                      </span>
                      <span className={`font-mono text-sm font-semibold ${lvl === 1 ? "text-white" : "text-wsp-dark"}`}>
                        {fmt(secCost)}
                      </span>
                    </div>
                  )}
                  {isLeaf ? (
                    <button
                      onClick={() => {
                        if (isAdding) {
                          setAddingToWbs(null);
                          setNewRow(emptyNewRow());
                        } else {
                          setEditingId(null);
                          setAddingToWbs(wbs.id);
                          setNewRow(emptyNewRow());
                        }
                      }}
                      className={`text-xs font-display tracking-wide px-3 py-1 rounded transition-colors
                        ${lvl === 1
                          ? "text-white/70 hover:text-white border border-white/20 hover:bg-white/10"
                          : "text-wsp-muted hover:text-wsp-dark border border-wsp-border hover:bg-wsp-bg-soft"
                        }
                        ${isAdding ? "bg-white/10 text-white" : ""}`}
                    >
                      {isAdding ? "✕ Cancel" : "+ Add Person"}
                    </button>
                  ) : (
                    <span className={`text-[10px] font-display tracking-widest uppercase
                      ${lvl === 1 ? "text-white/30" : "text-wsp-border"}`}>
                      Subtasks ↓
                    </span>
                  )}
                </div>
              </div>

              {/* Existing rows for this WBS item */}
              {wbsRows.length > 0 && (
                <table className="wsp-table w-full">
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th className="w-36">WSP Role</th>
                      <th className="w-24">Team</th>
                      <th className="text-right w-20">Rate</th>
                      {PHASES.map(p => <th key={p} className="text-right w-20">{p}</th>)}
                      <th className="text-right w-16">Hrs</th>
                      <th className="text-right w-28">Total</th>
                      <th className="w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {wbsRows.map(row => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        {editingId === row.id ? (
                          <>
                            <td className="px-2 py-1">
                              <select
                                className="border rounded px-1 py-1 text-xs w-40"
                                value={editValues.person_id || ""}
                                onChange={e => onEditPersonChange(e.target.value)}
                              >
                                <option value="">— select person —</option>
                                {people.map((p: Person) => (
                                  <option key={p.id} value={p.id}>{p.employee_name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-1 text-xs text-wsp-muted">
                              {people.find((p: Person) => p.id === editValues.person_id)?.wsp_role || "—"}
                            </td>
                            <td className="px-3 py-1 text-xs text-wsp-muted">
                              {people.find((p: Person) => p.id === editValues.person_id)?.team || "—"}
                            </td>
                            <td className="px-3 py-1 text-right font-mono text-xs text-wsp-muted">
                              {editValues.hourly_rate ? `$${editValues.hourly_rate}/hr` : "—"}
                            </td>
                            {PHASES.map(p => (
                              <td key={p} className="px-2 py-1">
                                <input type="number" className="border rounded px-1 py-1 text-xs w-16 text-right"
                                  value={editValues.hours_by_phase?.[p] ?? 0}
                                  onChange={e => setEditValues(v => ({
                                    ...v,
                                    hours_by_phase: { ...(v.hours_by_phase || {}), [p]: parseFloat(e.target.value) || 0 }
                                  }))} />
                              </td>
                            ))}
                            <td className="px-3 py-1 text-right text-xs text-gray-400">{editPreviewHours}</td>
                            <td className="px-3 py-1 text-right text-xs text-gray-400">{fmt(editPreviewCost)}</td>
                            <td className="px-2 py-1">
                              <div className="flex gap-1">
                                <button onClick={() => updateMutation.mutate({ id: row.id, data: editValues })}
                                  className="text-green-600 hover:text-green-800 text-xs px-2 py-1 border border-green-300 rounded">Save</button>
                                <button onClick={() => setEditingId(null)}
                                  className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 border rounded">✕</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
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
                            <td className="text-right font-mono font-semibold text-sm">{fmt(row.total_cost)}</td>
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
                </table>
              )}

              {/* Inline "add person" form — leaf nodes only */}
              {isAdding && isLeaf && (
                <div className="border-t border-wsp-border bg-blue-50/30 px-4 py-3">
                  <div className="flex items-start gap-3 flex-wrap">
                    {/* Person */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Person *</label>
                      <select
                        className="border rounded px-2 py-1.5 text-sm w-48 bg-white"
                        value={newRow.person_id}
                        onChange={e => onNewPersonChange(e.target.value)}
                        autoFocus
                      >
                        <option value="">— select person —</option>
                        {people.map((p: Person) => (
                          <option key={p.id} value={p.id}>
                            {p.employee_name}{p.team ? ` (${p.team})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Rate (auto-filled from People tab, read-only) */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Rate $/hr</label>
                      <div className="border border-wsp-border rounded px-2 py-1.5 text-sm w-24 text-right bg-wsp-bg-soft font-mono text-wsp-muted">
                        {newRow.hourly_rate ? `$${newRow.hourly_rate}` : <span className="text-wsp-border">auto</span>}
                      </div>
                    </div>

                    {/* Phase hours */}
                    {PHASES.map(phase => (
                      <div key={phase} className="flex flex-col gap-1">
                        <label className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">{phase}</label>
                        <input
                          type="number"
                          className="border rounded px-2 py-1.5 text-sm w-20 text-right bg-white"
                          value={newRow.hours_by_phase[phase] ?? ""}
                          placeholder="0"
                          onChange={e => setNewRow(v => ({
                            ...v,
                            hours_by_phase: { ...v.hours_by_phase, [phase]: parseFloat(e.target.value) || 0 }
                          }))}
                        />
                      </div>
                    ))}

                    {/* Preview + save */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Total</label>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="font-mono text-sm text-wsp-muted w-24 text-right">
                          {newPreviewHours > 0 ? `${newPreviewHours}h · ${fmt(newPreviewCost)}` : "—"}
                        </span>
                        <button
                          onClick={() => saveNew(wbs.id)}
                          disabled={!newRow.person_id || createMutation.isPending}
                          className="wsp-btn-primary text-xs py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {createMutation.isPending ? "Saving…" : "Add"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state for this WBS item */}
              {wbsRows.length === 0 && !isAdding && (
                <div className="px-4 py-3 text-xs text-wsp-muted font-body italic">
                  {isLeaf
                    ? "No team members assigned — click \"+\u00a0Add Person\" to assign hours"
                    : "Totals rolled up from subtasks"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grand total footer */}
      {grandTotal > 0 && (
        <div className="mt-4 flex justify-end">
          <div className="wsp-card px-6 py-3 flex gap-8">
            <div className="text-right">
              <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Grand Total Hours</p>
              <p className="font-mono font-bold text-wsp-dark text-lg">{grandTotalHours}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Grand Total Cost</p>
              <p className="font-mono font-bold text-wsp-dark text-lg">{fmt(grandTotal)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
