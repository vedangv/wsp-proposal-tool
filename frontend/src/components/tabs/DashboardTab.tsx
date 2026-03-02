import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { dashboardApi } from "../../api/dashboard";
import { proposalsApi } from "../../api/proposals";
import { disciplinesApi, STANDARD_DISCIPLINES, type Discipline } from "../../api/disciplines";
import { complianceApi, type ComplianceItem } from "../../api/compliance";
import SlideOver from "../SlideOver";

interface Props {
  proposalId: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

/* ── Metric Card ──────────────────────────────────── */

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: "default" | "green" | "amber" | "red";
}

function MetricCard({ label, value, sub, color = "default" }: MetricCardProps) {
  const colorClass = {
    default: "text-wsp-dark",
    green: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-wsp-red",
  }[color];

  return (
    <div className="wsp-card p-5">
      <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted mb-1">
        {label}
      </p>
      <p className={`font-mono font-bold text-xl ${colorClass}`}>{value}</p>
      {sub && <p className="text-xs text-wsp-muted font-body mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Timeline Section ────────────────────────────── */

const MILESTONE_COLORS: Record<string, string> = {
  kickoff: "bg-blue-500",
  red_review: "bg-wsp-red",
  gold_review: "bg-amber-500",
  submission: "bg-emerald-600",
};

const MILESTONE_DOT_COLORS: Record<string, string> = {
  kickoff: "border-blue-500",
  red_review: "border-wsp-red",
  gold_review: "border-amber-500",
  submission: "border-emerald-600",
};

function TimelineSection({ proposalId, dash }: { proposalId: string; dash: any }) {
  const qc = useQueryClient();
  const [slideOpen, setSlideOpen] = useState(false);
  const [formDates, setFormDates] = useState({
    kickoff_date: "",
    red_review_date: "",
    gold_review_date: "",
    submission_deadline: "",
  });
  const [formMeetings, setFormMeetings] = useState<{ date: string; notes: string }[]>([]);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, any>) => proposalsApi.update(proposalId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard", proposalId] });
      qc.invalidateQueries({ queryKey: ["proposal", proposalId] });
      setSlideOpen(false);
    },
  });

  const milestones = [
    { key: "kickoff_date" as const, label: "Kickoff", date: dash.kickoff_date },
    { key: "red_review_date" as const, label: "Red Review", date: dash.red_review_date },
    { key: "gold_review_date" as const, label: "Gold Review", date: dash.gold_review_date },
    { key: "submission_deadline" as const, label: "Submission", date: dash.submission_deadline },
  ];

  const checkins: { date: string; notes: string }[] = dash.check_in_meetings || [];

  const openEdit = () => {
    setFormDates({
      kickoff_date: dash.kickoff_date || "",
      red_review_date: dash.red_review_date || "",
      gold_review_date: dash.gold_review_date || "",
      submission_deadline: dash.submission_deadline || "",
    });
    setFormMeetings(checkins.map(m => ({ ...m })));
    setSlideOpen(true);
  };

  const saveAll = () => {
    updateMutation.mutate({
      ...formDates,
      check_in_meetings: formMeetings,
    });
  };

  const addMeeting = () => {
    setFormMeetings(prev => [...prev, { date: "", notes: "" }]);
  };

  const updateMeeting = (idx: number, field: "date" | "notes", value: string) => {
    setFormMeetings(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const removeMeeting = (idx: number) => {
    setFormMeetings(prev => prev.filter((_, i) => i !== idx));
  };

  // Compute timeline bar positions — include check-in meetings
  const allDates = [
    ...milestones.map(m => m.date),
    ...checkins.map(m => m.date),
  ].filter(Boolean) as string[];
  const minDate = allDates.length ? new Date(Math.min(...allDates.map(d => new Date(d).getTime()))) : null;
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map(d => new Date(d).getTime()))) : null;
  const totalSpan = minDate && maxDate ? maxDate.getTime() - minDate.getTime() : 1;

  const getPosition = (dateStr: string | null) => {
    if (!dateStr || !minDate || totalSpan === 0) return 0;
    return Math.min(100, Math.max(0, ((new Date(dateStr).getTime() - minDate.getTime()) / totalSpan) * 100));
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  };

  return (
    <div className="wsp-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-display tracking-widest uppercase text-wsp-muted">
          Proposal Timeline
        </h4>
        <div className="flex items-center gap-3">
          {dash.days_remaining != null && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold
              ${dash.days_remaining <= 3 ? "bg-red-100 text-wsp-red" :
                dash.days_remaining <= 7 ? "bg-amber-100 text-amber-700" :
                "bg-emerald-100 text-emerald-700"}`}>
              {dash.days_remaining > 0 ? `${dash.days_remaining} days remaining` :
               dash.days_remaining === 0 ? "Due today" : `${Math.abs(dash.days_remaining)} days overdue`}
            </span>
          )}
          <button onClick={openEdit} className="text-xs text-wsp-muted hover:text-wsp-dark border border-wsp-border rounded px-2.5 py-1 hover:border-wsp-dark/30 transition-colors">
            Edit Timeline
          </button>
        </div>
      </div>

      {/* Timeline bar */}
      {allDates.length >= 2 && (
        <div className="relative h-12 mb-2">
          <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full" />
          {/* Today marker */}
          {minDate && maxDate && (() => {
            const todayPos = ((Date.now() - minDate.getTime()) / totalSpan) * 100;
            if (todayPos >= 0 && todayPos <= 100) {
              return (
                <div className="absolute top-3 w-0.5 h-5 bg-wsp-dark/30" style={{ left: `${todayPos}%` }}>
                  <span className="absolute -top-4 -translate-x-1/2 text-[9px] text-wsp-muted font-mono">Today</span>
                </div>
              );
            }
            return null;
          })()}
          {/* Check-in meeting markers (smaller, below the line) */}
          {checkins.map((m, i) => m.date && (
            <div
              key={`checkin-${i}`}
              className="absolute top-4 -translate-x-1/2 group"
              style={{ left: `${getPosition(m.date)}%` }}
            >
              <div className="w-2 h-2 rounded-full bg-violet-400 ring-1 ring-white" />
              <div className="absolute top-4 -translate-x-1/2 hidden group-hover:block bg-wsp-dark text-white text-[9px] px-2 py-1 rounded whitespace-nowrap z-10">
                {formatDate(m.date)}: {m.notes || "Check-in"}
              </div>
            </div>
          ))}
          {/* Milestone markers */}
          {milestones.map(m => m.date && (
            <div
              key={m.key}
              className="absolute top-3 -translate-x-1/2"
              style={{ left: `${getPosition(m.date)}%` }}
            >
              <div className={`w-3.5 h-3.5 rounded-full ${MILESTONE_COLORS[m.key.replace("_date", "").replace("_deadline", "")] || "bg-gray-400"} ring-2 ring-white`} />
              <span className="absolute top-5 -translate-x-1/2 text-[9px] text-wsp-muted font-mono whitespace-nowrap">
                {m.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Milestone dates + check-in summary in a compact row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        {milestones.map(m => {
          const colorKey = m.key.replace("_date", "").replace("_deadline", "");
          return (
            <div key={m.key} className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <div className={`w-2 h-2 rounded-full border-2 ${MILESTONE_DOT_COLORS[colorKey] || "border-gray-400"}`} />
                <p className="text-[10px] font-display tracking-wider uppercase text-wsp-muted">{m.label}</p>
              </div>
              <p className="text-sm font-mono text-wsp-dark">{formatDate(m.date)}</p>
            </div>
          );
        })}
      </div>

      {/* Check-ins summary */}
      {checkins.length > 0 && (
        <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-violet-400" />
            <p className="text-[10px] font-display tracking-wider uppercase text-wsp-muted">
              {checkins.length} Check-in{checkins.length !== 1 ? "s" : ""} Scheduled
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {checkins.map((m, i) => (
              <span key={i} className="text-xs text-wsp-muted">
                <span className="font-mono text-wsp-dark">{formatDate(m.date)}</span>
                {m.notes && <span className="ml-1">— {m.notes}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Edit SlideOver — all dates + meetings in one form */}
      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title="Edit Timeline">
        <div className="space-y-5">
          <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Milestone Dates</p>

          {([
            { key: "kickoff_date" as const, label: "Kickoff Date", color: "border-l-blue-500" },
            { key: "red_review_date" as const, label: "Red Review", color: "border-l-red-500" },
            { key: "gold_review_date" as const, label: "Gold Review", color: "border-l-amber-500" },
            { key: "submission_deadline" as const, label: "Submission Deadline", color: "border-l-emerald-600" },
          ]).map(m => (
            <div key={m.key} className={`border-l-4 ${m.color} pl-3`}>
              <label className="text-xs text-wsp-muted block mb-1">{m.label}</label>
              <input
                type="date"
                className="border rounded px-3 py-2 w-full text-sm"
                value={formDates[m.key]}
                onChange={e => setFormDates(prev => ({ ...prev, [m.key]: e.target.value }))}
              />
            </div>
          ))}

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-display tracking-widest uppercase text-wsp-muted">Check-in Meetings</p>
              <button onClick={addMeeting} className="text-xs text-blue-600 hover:text-blue-800">+ Add</button>
            </div>
            {formMeetings.length === 0 && (
              <p className="text-xs text-gray-300 italic">No check-ins. Click + Add to schedule one.</p>
            )}
            {formMeetings.map((m, i) => (
              <div key={i} className="flex gap-2 mb-2 items-start">
                <div className="flex-1 space-y-1">
                  <input
                    type="date"
                    className="border rounded px-3 py-1.5 w-full text-sm"
                    value={m.date}
                    onChange={e => updateMeeting(i, "date", e.target.value)}
                  />
                  <input
                    type="text"
                    className="border rounded px-3 py-1.5 w-full text-sm"
                    placeholder="Notes (optional)"
                    value={m.notes}
                    onChange={e => updateMeeting(i, "notes", e.target.value)}
                  />
                </div>
                <button onClick={() => removeMeeting(i)} className="text-red-400 hover:text-red-600 text-xs mt-2">Remove</button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <button onClick={saveAll} className="wsp-btn-primary">Save Timeline</button>
            <button onClick={() => setSlideOpen(false)} className="wsp-btn-ghost">Cancel</button>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}

/* ── Disciplines Section ────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  not_contacted: "bg-gray-100 text-gray-600",
  contacted: "bg-blue-100 text-blue-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-wsp-red",
};

const STATUS_LABELS: Record<string, string> = {
  not_contacted: "Not Contacted",
  contacted: "Contacted",
  confirmed: "Confirmed",
  declined: "Declined",
};

function DisciplinesSection({ proposalId }: { proposalId: string }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Discipline>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: disciplines = [] } = useQuery({
    queryKey: ["disciplines", proposalId],
    queryFn: () => disciplinesApi.list(proposalId),
  });

  const initMutation = useMutation({
    mutationFn: () => disciplinesApi.init(proposalId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["disciplines", proposalId] }),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => disciplinesApi.create(proposalId, { discipline_name: name, order_index: disciplines.length }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disciplines", proposalId] });
      qc.invalidateQueries({ queryKey: ["dashboard", proposalId] });
      setShowAdd(false);
      setNewName("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Discipline> }) =>
      disciplinesApi.update(proposalId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disciplines", proposalId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => disciplinesApi.delete(proposalId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disciplines", proposalId] });
      qc.invalidateQueries({ queryKey: ["dashboard", proposalId] });
    },
  });

  const startEdit = (d: Discipline) => {
    setEditingId(d.id);
    setEditData({ contact_name: d.contact_name || "", contact_email: d.contact_email || "", contact_phone: d.contact_phone || "", status: d.status, notes: d.notes || "" });
  };

  const saveEdit = (id: string) => updateMutation.mutate({ id, data: editData });

  // Quick status change without opening edit mode
  const quickStatus = (id: string, status: string) =>
    updateMutation.mutate({ id, data: { status } });

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-display tracking-widest uppercase text-wsp-muted">
          Disciplines
        </h4>
        <div className="flex gap-2">
          {disciplines.length === 0 && (
            <button onClick={() => initMutation.mutate()} className="text-xs bg-wsp-red text-white px-3 py-1.5 rounded hover:bg-red-700">
              Initialize Disciplines
            </button>
          )}
          <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-blue-600 hover:text-blue-800">
            + Add
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="flex gap-2 mb-3">
          <select
            className="border rounded px-2 py-1.5 text-sm flex-1"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          >
            <option value="">Select discipline...</option>
            {STANDARD_DISCIPLINES.filter(d => !disciplines.some(ex => ex.discipline_name === d)).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
            <option value="__other">Other (custom)</option>
          </select>
          {newName === "__other" && (
            <input
              type="text"
              className="border rounded px-2 py-1.5 text-sm"
              placeholder="Custom name..."
              onChange={e => setNewName(e.target.value)}
            />
          )}
          <button
            onClick={() => newName && newName !== "__other" && createMutation.mutate(newName)}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded"
          >
            Add
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {disciplines.map(d => (
          <div key={d.id} className="wsp-card p-4">
            {editingId === d.id ? (
              <div className="space-y-2">
                <p className="font-semibold text-sm text-wsp-dark">{d.discipline_name}</p>
                <input className="border rounded px-2 py-1 w-full text-sm" placeholder="Contact name" value={editData.contact_name || ""} onChange={e => setEditData({ ...editData, contact_name: e.target.value })} />
                <input className="border rounded px-2 py-1 w-full text-sm" placeholder="Email" value={editData.contact_email || ""} onChange={e => setEditData({ ...editData, contact_email: e.target.value })} />
                <input className="border rounded px-2 py-1 w-full text-sm" placeholder="Phone" value={editData.contact_phone || ""} onChange={e => setEditData({ ...editData, contact_phone: e.target.value })} />
                <select className="border rounded px-2 py-1 w-full text-sm" value={editData.status || "not_contacted"} onChange={e => setEditData({ ...editData, status: e.target.value })}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <textarea className="border rounded px-2 py-1 w-full text-sm resize-none" rows={2} placeholder="Notes..." value={editData.notes || ""} onChange={e => setEditData({ ...editData, notes: e.target.value })} />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(d.id)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 px-2 py-1">Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm text-wsp-dark">{d.discipline_name}</p>
                    {d.contact_name && <p className="text-xs text-wsp-muted mt-0.5">{d.contact_name}</p>}
                    {d.contact_email && <p className="text-xs text-blue-600 mt-0.5">{d.contact_email}</p>}
                    {d.contact_phone && <p className="text-xs text-wsp-muted">{d.contact_phone}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border-0 cursor-pointer ${STATUS_COLORS[d.status] || "bg-gray-100 text-gray-600"}`}
                      value={d.status}
                      onChange={e => quickStatus(d.id, e.target.value)}
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                {d.notes && <p className="text-xs text-wsp-muted mt-2 italic">{d.notes}</p>}
                <div className="flex gap-3 mt-2">
                  <button onClick={() => startEdit(d)} className="text-xs text-gray-400 hover:text-gray-700">Edit</button>
                  <button onClick={() => deleteMutation.mutate(d.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Compliance Section ──────────────────────────── */

const COMPLIANCE_STATUS_COLORS: Record<string, string> = {
  pending: "text-gray-400",
  in_progress: "text-blue-500",
  completed: "text-emerald-600",
  not_applicable: "text-gray-300",
};

function ComplianceSection({ proposalId }: { proposalId: string }) {
  const qc = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [newCategory, setNewCategory] = useState("Administrative");

  const { data: items = [] } = useQuery({
    queryKey: ["compliance", proposalId],
    queryFn: () => complianceApi.list(proposalId),
  });

  const initMutation = useMutation({
    mutationFn: () => complianceApi.init(proposalId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance", proposalId] });
      qc.invalidateQueries({ queryKey: ["dashboard", proposalId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ComplianceItem> }) =>
      complianceApi.update(proposalId, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance", proposalId] }),
  });

  const createMutation = useMutation({
    mutationFn: () => complianceApi.create(proposalId, { item_name: newItem, category: newCategory, order_index: items.length }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance", proposalId] });
      qc.invalidateQueries({ queryKey: ["dashboard", proposalId] });
      setShowAddForm(false);
      setNewItem("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => complianceApi.delete(proposalId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance", proposalId] });
      qc.invalidateQueries({ queryKey: ["dashboard", proposalId] });
    },
  });

  // Group by category
  const grouped = items.reduce<Record<string, ComplianceItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const completedCount = items.filter(i => i.status === "completed").length;
  const totalCount = items.filter(i => i.status !== "not_applicable").length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const toggleStatus = (item: ComplianceItem) => {
    const nextStatus = item.status === "completed" ? "pending" : "completed";
    updateMutation.mutate({ id: item.id, data: { status: nextStatus } });
  };


  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-display tracking-widest uppercase text-wsp-muted">
          Compliance Checklist
        </h4>
        <div className="flex items-center gap-3">
          {items.length === 0 && (
            <button onClick={() => initMutation.mutate()} className="text-xs bg-wsp-red text-white px-3 py-1.5 rounded hover:bg-red-700">
              Initialize Checklist
            </button>
          )}
          <button onClick={() => setShowAddForm(!showAddForm)} className="text-xs text-blue-600 hover:text-blue-800">
            + Add Item
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-wsp-muted mb-1">
            <span>{completedCount} of {totalCount} completed</span>
            <span className="font-mono font-bold">{pct}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="flex gap-2 mb-3">
          <select className="border rounded px-2 py-1.5 text-sm" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
            <option>Financial</option>
            <option>Legal</option>
            <option>Administrative</option>
            <option>Technical</option>
          </select>
          <input type="text" className="border rounded px-2 py-1.5 text-sm flex-1" placeholder="Item name..." value={newItem} onChange={e => setNewItem(e.target.value)} />
          <button onClick={() => newItem && createMutation.mutate()} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded">Add</button>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(grouped).map(([category, catItems]) => (
          <div key={category}>
            <p className="text-xs font-display font-semibold text-wsp-dark tracking-wide mb-2">{category}</p>
            <div className="space-y-1">
              {catItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 group py-1.5 px-3 rounded hover:bg-gray-50">
                  <button
                    onClick={() => toggleStatus(item)}
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                      ${item.status === "completed" ? "bg-emerald-500 border-emerald-500 text-white" :
                        item.status === "not_applicable" ? "bg-gray-200 border-gray-300" :
                        "border-gray-300"}`}
                  >
                    {item.status === "completed" && <span className="text-[10px]">&#10003;</span>}
                    {item.status === "not_applicable" && <span className="text-[10px] text-gray-400">—</span>}
                  </button>
                  <span className={`text-sm flex-1 ${item.status === "completed" ? "line-through text-wsp-muted" : item.status === "not_applicable" ? "text-gray-300" : "text-wsp-dark"}`}>
                    {item.item_name}
                  </span>
                  <select
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border-0 bg-transparent cursor-pointer ${COMPLIANCE_STATUS_COLORS[item.status]}`}
                    value={item.status}
                    onChange={e => updateMutation.mutate({ id: item.id, data: { status: e.target.value } })}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="not_applicable">N/A</option>
                  </select>
                  <button onClick={() => deleteMutation.mutate(item.id)} className="text-red-400 hover:text-red-600 text-xs opacity-0 group-hover:opacity-100">X</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Count Card ──────────────────────────────────── */

function CountCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="wsp-card px-4 py-3 flex items-center justify-between">
      <span className="text-sm font-body text-wsp-muted">{label}</span>
      <span className={`font-mono font-bold text-lg ${count > 0 ? "text-wsp-dark" : "text-wsp-border"}`}>
        {count}
      </span>
    </div>
  );
}

/* ── Main Dashboard ──────────────────────────────── */

export default function DashboardTab({ proposalId }: Props) {
  const { data: dash, isLoading } = useQuery({
    queryKey: ["dashboard", proposalId],
    queryFn: () => dashboardApi.get(proposalId),
    refetchInterval: 30000,
  });

  if (isLoading || !dash) {
    return (
      <div className="text-wsp-muted text-sm font-body py-8 text-center">
        Loading dashboard...
      </div>
    );
  }

  const dlmColor = dash.achieved_dlm >= dash.target_dlm ? "green" as const : "amber" as const;
  const marginColor = dash.margin_pct >= 30 ? "green" as const : dash.margin_pct >= 15 ? "amber" as const : "red" as const;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-end mb-5">
        <div>
          <h3 className="font-display font-semibold text-wsp-dark text-base tracking-tight">
            Proposal Dashboard
          </h3>
          <p className="text-xs text-wsp-muted font-body mt-0.5">
            Financial summary, timeline, and proposal metrics
          </p>
        </div>
        <Link
          to={`/proposals/${proposalId}/summary`}
          className="wsp-btn-ghost text-xs"
        >
          Print Summary
        </Link>
      </div>

      {/* 1. Timeline */}
      <TimelineSection proposalId={proposalId} dash={dash} />

      {/* 2. Financial metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Billing Total" value={fmt(dash.total_billing)} />
        <MetricCard label="Cost Total" value={fmt(dash.total_cost)} />
        <MetricCard
          label="Net Margin"
          value={fmt(dash.net_margin)}
          sub={`${dash.margin_pct}%`}
          color={marginColor}
        />
        <MetricCard
          label="Achieved DLM"
          value={`${dash.achieved_dlm.toFixed(2)}x`}
          sub={`Target: ${dash.target_dlm.toFixed(1)}x`}
          color={dlmColor}
        />
      </div>

      {/* 3. Sizing metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Team Size" value={String(dash.team_size)} sub="people" />
        <MetricCard label="Total Hours" value={String(dash.total_hours)} />
        <MetricCard
          label="Schedule Start"
          value={dash.schedule_start || "—"}
        />
        <MetricCard
          label="Schedule End"
          value={dash.schedule_end || "—"}
        />
      </div>

      {/* 4. Disciplines */}
      <DisciplinesSection proposalId={proposalId} />

      {/* 5. Compliance */}
      <ComplianceSection proposalId={proposalId} />

      {/* 6. Proposal Completeness */}
      <div className="mb-5">
        <h4 className="text-xs font-display tracking-widest uppercase text-wsp-muted mb-3">
          Proposal Completeness
        </h4>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CountCard label="WBS Items" count={dash.wbs_count} />
        <CountCard label="Pricing Rows" count={dash.pricing_count} />
        <CountCard label="Team Members" count={dash.people_count} />
        <CountCard label="Schedule Tasks" count={dash.schedule_count} />
        <CountCard label="Deliverables" count={dash.deliverables_count} />
        <CountCard label="Drawings" count={dash.drawings_count} />
        <CountCard label="Scope Sections" count={dash.scope_count} />
        <CountCard label="Relevant Projects" count={dash.relevant_projects_count} />
      </div>
    </div>
  );
}
