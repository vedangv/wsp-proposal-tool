import { useEffect, useRef } from "react";
import Gantt from "frappe-gantt";
import { ScheduleItem } from "../../api/schedule";

interface Props {
  items: ScheduleItem[];
  viewMode?: "Day" | "Week" | "Month" | "Quarter Year" | "Year";
}

export default function GanttChart({ items, viewMode = "Week" }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const ganttRef = useRef<Gantt | null>(null);

  const tasks = items
    .filter(i => i.start_date && i.end_date)
    .map(i => ({
      id: i.id,
      name: i.task_name,
      start: i.start_date!,
      end: i.end_date!,
      progress: 0,
      custom_class: i.is_milestone ? "wsp-milestone" : (i.phase ? `wsp-phase-${i.phase.toLowerCase().replace(/\s+/g, "-")}` : ""),
    }));

  useEffect(() => {
    if (!svgRef.current || tasks.length === 0) return;

    ganttRef.current = new Gantt(svgRef.current, tasks, {
      view_mode: viewMode,
      bar_height: 24,
      padding: 14,
      date_format: "YYYY-MM-DD",
      popup_trigger: "click",
      on_date_change: () => {},
      on_progress_change: () => {},
      on_view_change: () => {},
      on_click: () => {},
    });

    return () => {
      if (ganttRef.current) {
        ganttRef.current = null;
      }
    };
  }, [tasks.length, viewMode]);

  useEffect(() => {
    if (ganttRef.current && tasks.length > 0) {
      ganttRef.current.change_view_mode(viewMode);
    }
  }, [viewMode]);

  if (tasks.length === 0) {
    return (
      <div className="py-12 text-center text-wsp-muted text-sm font-body">
        Add tasks with start/end dates to see the Gantt chart.
      </div>
    );
  }

  return (
    <div className="gantt-wrapper overflow-x-auto">
      <svg ref={svgRef} className="w-full" />
      <style>{`
        .gantt-wrapper .bar-wrapper .bar { fill: #ef3427; }
        .gantt-wrapper .bar-wrapper.wsp-milestone .bar { fill: #313131; }
        .gantt-wrapper .bar-label { fill: #fff; font-family: 'Barlow', sans-serif; font-size: 11px; }
        .gantt-wrapper .grid-header { fill: #f5f4f2; }
        .gantt-wrapper .grid-row:nth-child(even) { fill: #fafafa; }
        .gantt-wrapper .grid-row:nth-child(odd) { fill: #fff; }
        .gantt-wrapper .lower-text, .gantt-wrapper .upper-text {
          font-family: 'Barlow Semi Condensed', sans-serif;
          fill: #767676;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .gantt-wrapper .today-highlight { fill: rgba(239,52,39,0.07); }
        .gantt-wrapper .handle { fill: #c8201a; }
      `}</style>
    </div>
  );
}
