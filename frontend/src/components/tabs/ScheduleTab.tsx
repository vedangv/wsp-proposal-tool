import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scheduleApi, type ScheduleItem } from "../../api/schedule";
import { wbsApi, type WBSItem } from "../../api/wbs";
import GanttChart from "../gantt/GanttChart";

interface Props { proposalId: string; }

type ViewMode = "Week" | "Month" | "Quarter Year";
const VIEW_MODES: ViewMode[] = ["Week", "Month", "Quarter Year"];

export default function ScheduleTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const [view, setView] = useState<"gantt" | "list">("gantt");
  const [ganttMode, setGanttMode] = useState<ViewMode>("Week");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ScheduleItem>>({});

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["schedule", proposalId],
    queryFn: () => scheduleApi.list(proposalId),
  });

  const { data: wbsItems = [] } = useQuery({
    queryKey: ["wbs", proposalId],
    queryFn: () => wbsApi.list(proposalId),
  });

  const [importing, setImporting] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => scheduleApi.create(proposalId, {
      task_name: "New Task",
      is_milestone: false,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule", proposalId] }),
  });

  const handleImportFromWBS = async () => {
    if (wbsItems.length === 0) return;
    setImporting(true);
    try {
      await Promise.all(
        wbsItems.map((w: WBSItem) =>
          scheduleApi.create(proposalId, {
            task_name: w.description || w.wbs_code,
            wbs_id: w.id,
            phase: w.phase || undefined,
            is_milestone: false,
          })
        )
      );
      qc.invalidateQueries({ queryKey: ["schedule", proposalId] });
    } finally {
      setImporting(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ScheduleItem> }) =>
      scheduleApi.update(proposalId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule", proposalId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => scheduleApi.delete(proposalId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule", proposalId] }),
  });

  const startEdit = (item: ScheduleItem) => {
    setEditingId(item.id);
    setEditValues({
      wbs_id: item.wbs_id || undefined,
      task_name: item.task_name,
      start_date: item.start_date || "",
      end_date: item.end_date || "",
      responsible_party: item.responsible_party || "",
      is_milestone: item.is_milestone,
      phase: item.phase || "",
    });
  };

  const wbsLabel = (id: string | null) => {
    if (!id) return "—";
    const item = wbsItems.find((w: WBSItem) => w.id === id);
    return item ? `${item.wbs_code}` : id.slice(0, 6);
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display font-semibold text-wsp-dark text-base tracking-tight">Schedule</h3>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex border border-wsp-border">
            <button
              onClick={() => setView("gantt")}
              className={`px-4 py-1.5 text-xs font-display font-semibold tracking-widest uppercase transition-colors
                ${view === "gantt" ? "bg-wsp-dark text-white" : "text-wsp-muted hover:text-wsp-dark"}`}
            >Gantt</button>
            <button
              onClick={() => setView("list")}
              className={`px-4 py-1.5 text-xs font-display font-semibold tracking-widest uppercase transition-colors
                border-l border-wsp-border
                ${view === "list" ? "bg-wsp-dark text-white" : "text-wsp-muted hover:text-wsp-dark"}`}
            >List</button>
          </div>

          {/* Gantt zoom */}
          {view === "gantt" && (
            <div className="flex border border-wsp-border">
              {VIEW_MODES.map((m, i) => (
                <button
                  key={m}
                  onClick={() => setGanttMode(m)}
                  className={`px-3 py-1.5 text-xs font-display tracking-wider transition-colors
                    ${i > 0 ? "border-l border-wsp-border" : ""}
                    ${ganttMode === m ? "bg-wsp-red text-white" : "text-wsp-muted hover:text-wsp-dark"}`}
                >{m}</button>
              ))}
            </div>
          )}

          <button
            onClick={handleImportFromWBS}
            disabled={importing || wbsItems.length === 0}
            className="wsp-btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {importing ? "Importing…" : "↑ From WBS"}
          </button>
          <button onClick={() => createMutation.mutate()} className="wsp-btn-primary">
            + Add Task
          </button>
        </div>
      </div>

      {/* Gantt view */}
      {view === "gantt" && (
        <div className="wsp-card p-4">
          {isLoading
            ? <p className="text-wsp-muted text-sm py-8 text-center font-body">Loading…</p>
            : <GanttChart items={items} wbsItems={wbsItems} viewMode={ganttMode} />
          }
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="wsp-card overflow-hidden">
          <table className="wsp-table w-full">
            <thead>
              <tr>
                <th>Task</th>
                <th>WBS</th>
                <th>Phase</th>
                <th>Start</th>
                <th>End</th>
                <th>Responsible</th>
                <th>Type</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className={item.is_milestone ? "bg-wsp-dark/[.02]" : ""}>
                  {editingId === item.id ? (
                    <>
                      <td><input className="wsp-input w-full" value={editValues.task_name || ""} onChange={e => setEditValues(v => ({ ...v, task_name: e.target.value }))} /></td>
                      <td>
                        <select className="wsp-input w-full text-xs"
                          value={editValues.wbs_id || ""}
                          onChange={e => setEditValues(v => ({ ...v, wbs_id: e.target.value || undefined }))}>
                          <option value="">—</option>
                          {wbsItems.map((w: WBSItem) => (
                            <option key={w.id} value={w.id}>{w.wbs_code} {w.description}</option>
                          ))}
                        </select>
                      </td>
                      <td><input className="wsp-input w-24" value={editValues.phase || ""} onChange={e => setEditValues(v => ({ ...v, phase: e.target.value }))} /></td>
                      <td><input type="date" className="wsp-input font-mono text-xs" value={editValues.start_date || ""} onChange={e => setEditValues(v => ({ ...v, start_date: e.target.value }))} /></td>
                      <td><input type="date" className="wsp-input font-mono text-xs" value={editValues.end_date || ""} onChange={e => setEditValues(v => ({ ...v, end_date: e.target.value }))} /></td>
                      <td><input className="wsp-input w-full" value={editValues.responsible_party || ""} onChange={e => setEditValues(v => ({ ...v, responsible_party: e.target.value }))} /></td>
                      <td>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={!!editValues.is_milestone} onChange={e => setEditValues(v => ({ ...v, is_milestone: e.target.checked }))} />
                          <span className="text-xs text-wsp-muted">Milestone</span>
                        </label>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => updateMutation.mutate({ id: item.id, data: editValues })} className="text-green-700 hover:text-green-900 text-xs px-2 py-1 border border-green-300">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-wsp-muted hover:text-wsp-dark text-xs px-2 py-1 border border-wsp-border">✕</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`font-body ${item.is_milestone ? "font-semibold text-wsp-dark" : ""}`}>
                        {item.is_milestone && <span className="inline-block w-2 h-2 bg-wsp-dark rotate-45 mr-2" />}
                        {item.task_name}
                      </td>
                      <td><span className="font-mono text-wsp-red text-xs">{wbsLabel(item.wbs_id)}</span></td>
                      <td className="text-wsp-muted">{item.phase || "—"}</td>
                      <td className="font-mono text-xs text-wsp-muted">{item.start_date || "—"}</td>
                      <td className="font-mono text-xs text-wsp-muted">{item.end_date || "—"}</td>
                      <td className="text-wsp-muted">{item.responsible_party || "—"}</td>
                      <td>
                        {item.is_milestone
                          ? <span className="wsp-badge bg-wsp-dark text-white text-[10px]">Milestone</span>
                          : <span className="wsp-badge bg-wsp-bg-soft text-wsp-muted border border-wsp-border text-[10px]">Task</span>
                        }
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(item)} className="text-wsp-muted hover:text-wsp-dark text-xs">Edit</button>
                          <button onClick={() => deleteMutation.mutate(item.id)} className="text-wsp-red/60 hover:text-wsp-red text-xs">Del</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && !isLoading && (
            <p className="text-center py-12 text-wsp-muted text-sm font-body">
              No schedule items yet. Add one to get started.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
