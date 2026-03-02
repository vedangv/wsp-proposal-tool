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

/* ── Timeline Section (Full Calendar View) ────────── */

const MILESTONE_PILL: Record<string, string> = {
  kickoff_date: "bg-blue-100 text-blue-700 border-blue-200",
  red_review_date: "bg-red-100 text-red-700 border-red-200",
  gold_review_date: "bg-amber-100 text-amber-700 border-amber-200",
  submission_deadline: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const MILESTONE_DOT: Record<string, string> = {
  kickoff_date: "bg-blue-500",
  red_review_date: "bg-wsp-red",
  gold_review_date: "bg-amber-500",
  submission_deadline: "bg-emerald-600",
};

const MILESTONE_LABELS: Record<string, string> = {
  kickoff_date: "Kickoff",
  red_review_date: "Red Review",
  gold_review_date: "Gold Review",
  submission_deadline: "Submission Deadline",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const days: (number | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

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

  const milestoneKeys = ["kickoff_date", "red_review_date", "gold_review_date", "submission_deadline"] as const;
  const milestones = milestoneKeys.map(key => ({
    key,
    label: MILESTONE_LABELS[key],
    date: dash[key] as string | null,
  }));

  const checkins: { date: string; notes: string }[] = dash.check_in_meetings || [];

  // Build lookup: dateStr → events
  const dateEvents: Record<string, any[]> = {};
  const addEvent = (dateStr: string, event: any) => {
    if (!dateEvents[dateStr]) dateEvents[dateStr] = [];
    dateEvents[dateStr].push(event);
  };
  for (const m of milestones) {
    if (m.date) addEvent(m.date, { type: "milestone", key: m.key, label: m.label });
  }
  for (const c of checkins) {
    if (c.date) addEvent(c.date, { type: "checkin", notes: c.notes });
  }

  // Determine which months to show
  const allDates = [...milestones.map(m => m.date), ...checkins.map(c => c.date)].filter(Boolean) as string[];
  const months: { year: number; month: number }[] = [];
  if (allDates.length > 0) {
    const sorted = allDates.map(d => new Date(d + "T00:00:00")).sort((a, b) => a.getTime() - b.getTime());
    let cur = new Date(sorted[0].getFullYear(), sorted[0].getMonth(), 1);
    const end = new Date(sorted[sorted.length - 1].getFullYear(), sorted[sorted.length - 1].getMonth(), 1);
    while (cur <= end) {
      months.push({ year: cur.getFullYear(), month: cur.getMonth() });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);

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

  return (
    <div className="wsp-card mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
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

      {/* Full Calendar */}
      {months.length > 0 ? (
        <div className="space-y-0">
          {months.map(({ year, month }, monthIdx) => {
            const grid = getMonthGrid(year, month);
            const monthLabel = new Date(year, month).toLocaleDateString("en-CA", { month: "long", year: "numeric" });
            const weeks: (number | null)[][] = [];
            for (let i = 0; i < grid.length; i += 7) {
              weeks.push(grid.slice(i, i + 7));
            }

            return (
              <div key={`${year}-${month}`}>
                {/* Month header */}
                <div className="px-5 py-2 bg-gray-50 border-y border-gray-100">
                  <h3 className="font-display font-semibold text-wsp-dark text-lg tracking-tight">{monthLabel}</h3>
                </div>

                {/* Day-of-week header */}
                {monthIdx === 0 && (
                  <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50">
                    {DAY_NAMES.map(d => (
                      <div key={d} className="text-xs text-wsp-muted font-display font-medium text-center py-2 tracking-wide">
                        {d}
                      </div>
                    ))}
                  </div>
                )}

                {/* Week rows */}
                {weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 border-b border-gray-100 last:border-0">
                    {week.map((day, di) => {
                      if (day === null) {
                        return <div key={`empty-${di}`} className="min-h-[72px] border-r border-gray-50 last:border-r-0" />;
                      }
                      const ds = toDateStr(year, month, day);
                      const events = dateEvents[ds] || [];
                      const isToday = ds === todayStr;

                      return (
                        <div
                          key={ds}
                          className={`min-h-[72px] border-r border-gray-50 last:border-r-0 p-1 ${isToday ? "bg-blue-50/40" : "hover:bg-gray-50/50"}`}
                        >
                          {/* Day number */}
                          <div className="flex justify-end mb-0.5">
                            {isToday ? (
                              <span className="w-6 h-6 rounded-full bg-wsp-red text-white text-xs font-bold flex items-center justify-center">
                                {day}
                              </span>
                            ) : (
                              <span className={`text-xs px-1 py-0.5 ${day === 1 ? "text-wsp-dark font-medium" : "text-gray-500"}`}>
                                {day === 1
                                  ? new Date(year, month).toLocaleDateString("en-CA", { month: "short" }) + " " + day
                                  : day}
                              </span>
                            )}
                          </div>

                          {/* Event pills */}
                          <div className="space-y-0.5">
                            {events.map((e: any, j: number) =>
                              e.type === "milestone" ? (
                                <div
                                  key={j}
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold truncate border ${MILESTONE_PILL[e.key]}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${MILESTONE_DOT[e.key]}`} />
                                  <span className="truncate">{e.label}</span>
                                </div>
                              ) : (
                                <div
                                  key={`c${j}`}
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate bg-violet-100 text-violet-700 border border-violet-200"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-violet-500" />
                                  <span className="truncate">
                                    {e.notes ? `Check-in: ${e.notes}` : "Check-in"}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-5 pb-5">
          <p className="text-sm text-gray-300 italic text-center py-8">No dates set. Click Edit Timeline to get started.</p>
        </div>
      )}

      {/* Edit SlideOver */}
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
