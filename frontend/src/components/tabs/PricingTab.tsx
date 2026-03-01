import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pricingApi, type PricingRow } from "../../api/pricing";
import { wbsApi } from "../../api/wbs";
import { peopleApi, type Person } from "../../api/people";
import { usePhases } from "../../hooks/usePhases";
import ClickToEditCell from "../ClickToEditCell";

interface Props { proposalId: string; }

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
  const PHASES = usePhases(proposalId);

  // Adding a new row to a specific WBS item
  const [addingToWbs, setAddingToWbs] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<NewRowState>(emptyNewRow());

  const { data: rows = [] } = useQuery({
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
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pricingApi.delete(proposalId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing", proposalId] });
      qc.invalidateQueries({ queryKey: ["wbs", proposalId] });
    },
  });

  // Click-to-edit: update a single phase hours value
  const updatePhaseHours = (rowId: string, row: PricingRow, phase: string, value: number) => {
    const newPhases = { ...row.hours_by_phase, [phase]: value };
    updateMutation.mutate({ id: rowId, data: { hours_by_phase: newPhases } });
  };

  // Click-to-edit: change person on a row
  const updatePerson = (rowId: string, personId: string) => {
    const person = people.find((p: Person) => p.id === personId);
    updateMutation.mutate({
      id: rowId,
      data: {
        person_id: personId || undefined,
        hourly_rate: person?.hourly_rate ?? 0,
      },
    });
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
    const existing = rows.find(r => r.wbs_id === wbsId && r.person_id === newRow.person_id);
    if (existing) {
      const personName = people.find((p: Person) => p.id === newRow.person_id)?.employee_name || "This person";
      if (!window.confirm(`${personName} is already assigned to this WBS item. Add a duplicate row?`)) return;
    }
    createMutation.mutate({
      wbs_id: wbsId,
      person_id: newRow.person_id,
      hourly_rate: newRow.hourly_rate,
      hours_by_phase: newRow.hours_by_phase,
    });
  };

  const grandTotalHours = rows.reduce((s, r) => s + (r.total_hours || 0), 0);
  const grandTotal = rows.reduce((s, r) => s + (r.total_cost || 0), 0);
  const grandTotalInternal = rows.reduce((s, r) => s + (r.total_cost_internal || 0), 0);
  const grandMargin = grandTotal - grandTotalInternal;
  const grandMarginPct = grandTotal > 0 ? (grandMargin / grandTotal) * 100 : 0;

  const newPreviewHours = Object.values(newRow.hours_by_phase).reduce((s, v) => s + v, 0);
  const newPreviewCost = newPreviewHours * newRow.hourly_rate;

  if (wbsLoading) return <div className="text-wsp-muted text-sm font-body py-8 text-center">Loading…</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-end mb-5">
        <div>
          <h3 className="font-display font-semibold text-wsp-dark text-base tracking-tight">Pricing Matrix</h3>
          <p className="text-xs text-wsp-muted font-body mt-0.5">
            Click any hours cell to edit · rates flow from People tab
          </p>
        </div>
        {grandTotal > 0 && (
          <div className="flex items-center gap-6 text-right">
            <div>
              <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Total Hours</p>
              <p className="font-mono font-bold text-wsp-dark text-base">{grandTotalHours}</p>
            </div>
            <div>
              <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Billing</p>
              <p className="font-mono font-bold text-wsp-dark text-base">{fmt(grandTotal)}</p>
            </div>
            <div>
              <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Cost</p>
              <p className="font-mono font-bold text-wsp-muted text-base">{fmt(grandTotalInternal)}</p>
            </div>
            <div>
              <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Margin</p>
              <p className={`font-mono font-bold text-base ${grandMarginPct >= 30 ? "text-emerald-600" : "text-amber-600"}`}>
                {grandMarginPct.toFixed(0)}%
              </p>
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
          const isLeaf = !wbsItems.some(other => other.id !== wbs.id && other.wbs_code.startsWith(wbs.wbs_code + "."));

          return (
            <div key={wbs.id} className="wsp-card overflow-hidden">
              {/* WBS section header */}
              <div className={`flex items-center justify-between px-4 py-2.5
                ${lvl === 1 ? "bg-wsp-dark" : lvl === 2 ? "bg-wsp-bg-soft border-b border-wsp-border" : "bg-white border-b border-wsp-border"}`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs tracking-wider text-wsp-red">{wbs.wbs_code}</span>
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
                      <span className={`font-mono text-sm ${lvl === 1 ? "text-white/70" : "text-wsp-muted"}`}>{secHours}h</span>
                      <span className={`font-mono text-sm font-semibold ${lvl === 1 ? "text-white" : "text-wsp-dark"}`}>{fmt(secCost)}</span>
                    </div>
                  )}
                  {isLeaf ? (
                    <button
                      onClick={() => {
                        if (isAdding) { setAddingToWbs(null); setNewRow(emptyNewRow()); }
                        else { setAddingToWbs(wbs.id); setNewRow(emptyNewRow()); }
                      }}
                      className={`text-xs font-display tracking-wide px-3 py-1 rounded transition-colors
                        ${lvl === 1 ? "text-white/70 hover:text-white border border-white/20 hover:bg-white/10" : "text-wsp-muted hover:text-wsp-dark border border-wsp-border hover:bg-wsp-bg-soft"}
                        ${isAdding ? "bg-white/10 text-white" : ""}`}
                    >
                      {isAdding ? "✕ Cancel" : "+ Add Person"}
                    </button>
                  ) : (
                    <span className={`text-[10px] font-display tracking-widest uppercase ${lvl === 1 ? "text-white/30" : "text-wsp-border"}`}>
                      Subtasks ↓
                    </span>
                  )}
                </div>
              </div>

              {/* Rows with click-to-edit */}
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
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {wbsRows.map(row => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5">
                          <PersonSelector
                            currentName={row.person_name || "—"}
                            people={people}
                            onSelect={personId => updatePerson(row.id, personId)}
                          />
                        </td>
                        <td className="text-wsp-muted text-xs px-3">{row.person_wsp_role || "—"}</td>
                        <td className="text-xs px-3">
                          {row.person_team
                            ? <span className="wsp-badge bg-wsp-bg-soft text-wsp-muted border border-wsp-border text-[10px]">{row.person_team}</span>
                            : <span className="text-wsp-border">—</span>}
                        </td>
                        <td className="text-right font-mono text-sm px-3">{fmt(row.hourly_rate)}</td>
                        {PHASES.map(p => (
                          <td key={p} className="text-right font-mono text-sm text-wsp-muted px-2">
                            <ClickToEditCell
                              value={row.hours_by_phase?.[p] ?? 0}
                              onSave={val => updatePhaseHours(row.id, row, p, val)}
                            />
                          </td>
                        ))}
                        <td className="text-right font-mono text-sm font-semibold px-3">{row.total_hours}</td>
                        <td className="text-right font-mono font-semibold text-sm px-3">{fmt(row.total_cost)}</td>
                        <td className="px-2">
                          <button onClick={() => deleteMutation.mutate(row.id)} className="text-wsp-red/60 hover:text-wsp-red text-xs">Del</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Add person form */}
              {isAdding && isLeaf && (
                <div className="border-t border-wsp-border bg-blue-50/30 px-4 py-3">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Person *</label>
                      <select className="border rounded px-2 py-1.5 text-sm w-48 bg-white" value={newRow.person_id} onChange={e => onNewPersonChange(e.target.value)} autoFocus>
                        <option value="">— select person —</option>
                        {people.map((p: Person) => (
                          <option key={p.id} value={p.id}>{p.employee_name}{p.team ? ` (${p.team})` : ""}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Rate $/hr</label>
                      <div className="border border-wsp-border rounded px-2 py-1.5 text-sm w-24 text-right bg-wsp-bg-soft font-mono text-wsp-muted">
                        {newRow.hourly_rate ? `$${newRow.hourly_rate}` : <span className="text-wsp-border">auto</span>}
                      </div>
                    </div>
                    {PHASES.map(phase => (
                      <div key={phase} className="flex flex-col gap-1">
                        <label className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">{phase}</label>
                        <input type="number" className="border rounded px-2 py-1.5 text-sm w-20 text-right bg-white" value={newRow.hours_by_phase[phase] ?? ""} placeholder="0"
                          onChange={e => setNewRow(v => ({ ...v, hours_by_phase: { ...v.hours_by_phase, [phase]: parseFloat(e.target.value) || 0 } }))} />
                      </div>
                    ))}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Total</label>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="font-mono text-sm text-wsp-muted w-24 text-right">
                          {newPreviewHours > 0 ? `${newPreviewHours}h · ${fmt(newPreviewCost)}` : "—"}
                        </span>
                        <button onClick={() => saveNew(wbs.id)} disabled={!newRow.person_id || createMutation.isPending}
                          className="wsp-btn-primary text-xs py-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                          {createMutation.isPending ? "Saving…" : "Add"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {wbsRows.length === 0 && !isAdding && (
                <div className="px-4 py-3 text-xs text-wsp-muted font-body italic">
                  {isLeaf ? "No team members assigned — click \"+ Add Person\" to assign hours" : "Totals rolled up from subtasks"}
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
              <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Total Hours</p>
              <p className="font-mono font-bold text-wsp-dark text-lg">{grandTotalHours}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Billing Total</p>
              <p className="font-mono font-bold text-wsp-dark text-lg">{fmt(grandTotal)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Cost Total</p>
              <p className="font-mono font-bold text-wsp-muted text-lg">{fmt(grandTotalInternal)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Net Margin</p>
              <p className={`font-mono font-bold text-lg ${grandMarginPct >= 30 ? "text-emerald-600" : "text-amber-600"}`}>
                {fmt(grandMargin)} ({grandMarginPct.toFixed(0)}%)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Inline person selector — click name to open dropdown */
function PersonSelector({ currentName, people, onSelect }: {
  currentName: string;
  people: Person[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <select
        className="border border-blue-400 rounded px-1 py-0.5 text-xs w-40 bg-white"
        autoFocus
        defaultValue=""
        onChange={e => { onSelect(e.target.value); setOpen(false); }}
        onBlur={() => setOpen(false)}
      >
        <option value="">— select person —</option>
        {people.map(p => (
          <option key={p.id} value={p.id}>{p.employee_name}</option>
        ))}
      </select>
    );
  }

  return (
    <span
      onClick={() => setOpen(true)}
      className="font-body font-medium text-sm cursor-pointer hover:text-blue-600 transition-colors"
    >
      {currentName}
    </span>
  );
}
