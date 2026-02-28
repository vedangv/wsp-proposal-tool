import { useRef, useCallback } from "react";
import type { ScheduleItem } from "../../api/schedule";
import type { WBSItem } from "../../api/wbs";

interface Props {
  items: ScheduleItem[];
  wbsItems?: WBSItem[];
  viewMode?: "Week" | "Month" | "Quarter Year";
}

const parseDate = (s: string) => new Date(s + "T00:00:00");
const daysBetween = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / 86400000);
const floorMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);
const fmtShort = (d: Date) =>
  d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
const wbsLevel = (code: string) => code.split(".").length;

const ROW_H = 34;
const HEADER_H = 44;

export default function GanttChart({ items, wbsItems = [], viewMode = "Month" }: Props) {
  const tasks = items.filter((i) => i.start_date && i.end_date);
  const rightRef = useRef<HTMLDivElement>(null);

  // Build wbs_code lookup
  const wbsMap = Object.fromEntries(wbsItems.map((w) => [w.id, w]));

  if (tasks.length === 0) {
    return (
      <div className="py-12 text-center text-wsp-muted text-sm font-body">
        Add tasks with start/end dates to see the Gantt chart.
      </div>
    );
  }

  // Timeline range — full months surrounding all tasks
  const allDates = tasks.flatMap((t) => [parseDate(t.start_date!), parseDate(t.end_date!)]);
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
  const timelineStart = floorMonth(minDate);
  const timelineEnd = addMonths(floorMonth(maxDate), 1);

  // Pixels-per-day by view mode
  const DAY_PX = viewMode === "Week" ? 10 : viewMode === "Quarter Year" ? 1.2 : 3;

  const dateToX = (d: Date) => Math.round(daysBetween(timelineStart, d) * DAY_PX);
  const totalDays = daysBetween(timelineStart, timelineEnd);
  const totalW = Math.max(totalDays * DAY_PX, 400);

  // Month header columns
  const months: Date[] = [];
  let cur = new Date(timelineStart);
  while (cur < timelineEnd) {
    months.push(new Date(cur));
    cur = addMonths(cur, 1);
  }

  // Today
  const today = new Date();
  const todayX =
    today >= timelineStart && today <= timelineEnd ? dateToX(today) : null;

  const totalContentH = tasks.length * ROW_H;

  return (
    <div className="flex" style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12 }}>
      {/* ─── LEFT PANEL ─── */}
      <div
        className="flex-shrink-0 border-r-2 border-wsp-border"
        style={{ width: 460 }}
      >
        {/* Left header */}
        <div
          className="flex items-end border-b-2 border-wsp-border bg-wsp-bg-soft px-2 pb-1"
          style={{ height: HEADER_H }}
        >
          <span
            className="text-[9px] font-display tracking-widest uppercase text-wsp-muted"
            style={{ width: 48, flexShrink: 0 }}
          >
            WBS
          </span>
          <span className="text-[9px] font-display tracking-widest uppercase text-wsp-muted flex-1 pl-1">
            Task Name
          </span>
          <span
            className="text-[9px] font-display tracking-widest uppercase text-wsp-muted text-right"
            style={{ width: 66, flexShrink: 0 }}
          >
            Start
          </span>
          <span
            className="text-[9px] font-display tracking-widest uppercase text-wsp-muted text-right"
            style={{ width: 66, flexShrink: 0 }}
          >
            Finish
          </span>
          <span
            className="text-[9px] font-display tracking-widest uppercase text-wsp-muted text-right pr-1"
            style={{ width: 40, flexShrink: 0 }}
          >
            Dur
          </span>
        </div>

        {/* Left rows */}
        {tasks.map((task, i) => {
          const wbs = task.wbs_id ? wbsMap[task.wbs_id] : null;
          const code = wbs?.wbs_code ?? "—";
          const lvl = wbs ? wbsLevel(wbs.wbs_code) : 1;
          const dur = daysBetween(parseDate(task.start_date!), parseDate(task.end_date!));
          const isBold = lvl === 1;

          return (
            <div
              key={task.id}
              className={`flex items-center border-b border-wsp-border px-2 ${
                i % 2 === 0 ? "bg-white" : "bg-[#f8f8f7]"
              }`}
              style={{ height: ROW_H }}
            >
              <span
                className="font-mono text-wsp-red tracking-wider flex-shrink-0"
                style={{ width: 48, fontSize: 10 }}
              >
                {code}
              </span>
              <span
                className={`flex-1 truncate pl-1 ${
                  isBold ? "font-semibold text-wsp-dark" : "text-wsp-dark"
                }`}
                style={{
                  fontSize: 12,
                  paddingLeft: `${4 + (lvl - 1) * 10}px`,
                }}
                title={task.task_name}
              >
                {task.is_milestone && (
                  <span className="inline-block w-2 h-2 bg-wsp-dark rotate-45 mr-1.5 align-middle" />
                )}
                {task.task_name}
              </span>
              <span
                className="font-mono text-wsp-muted text-right flex-shrink-0"
                style={{ width: 66, fontSize: 10 }}
              >
                {fmtShort(parseDate(task.start_date!))}
              </span>
              <span
                className="font-mono text-wsp-muted text-right flex-shrink-0"
                style={{ width: 66, fontSize: 10 }}
              >
                {fmtShort(parseDate(task.end_date!))}
              </span>
              <span
                className="font-mono text-wsp-muted text-right flex-shrink-0 pr-1"
                style={{ width: 40, fontSize: 10 }}
              >
                {dur}d
              </span>
            </div>
          );
        })}
      </div>

      {/* ─── RIGHT PANEL (scrollable timeline) ─── */}
      <div ref={rightRef} className="flex-1 overflow-x-auto">
        <div style={{ width: totalW, minWidth: totalW }}>
          {/* Month header */}
          <div
            className="relative border-b-2 border-wsp-border bg-wsp-bg-soft"
            style={{ height: HEADER_H }}
          >
            {months.map((m) => {
              const x = dateToX(m);
              const w = dateToX(addMonths(m, 1)) - x;
              return (
                <div
                  key={m.toISOString()}
                  className="absolute top-0 bottom-0 border-r border-wsp-border flex flex-col justify-end pb-1 px-2"
                  style={{ left: x, width: w }}
                >
                  <span className="text-[9px] font-display tracking-widest uppercase text-wsp-muted whitespace-nowrap">
                    {m.toLocaleDateString("en-CA", { month: "short" })}
                  </span>
                  <span className="text-[9px] font-mono text-wsp-border">
                    {m.getFullYear()}
                  </span>
                </div>
              );
            })}
            {todayX !== null && (
              <div
                className="absolute top-0 bottom-0 w-px bg-wsp-red opacity-50"
                style={{ left: todayX }}
              />
            )}
          </div>

          {/* Bars area */}
          <div className="relative" style={{ height: totalContentH }}>
            {/* Alternating row backgrounds */}
            {tasks.map((_, i) => (
              <div
                key={i}
                className={`absolute border-b border-wsp-border ${
                  i % 2 === 0 ? "bg-white" : "bg-[#f8f8f7]"
                }`}
                style={{ top: i * ROW_H, height: ROW_H, left: 0, right: 0 }}
              />
            ))}

            {/* Month dividers */}
            {months.map((m) => (
              <div
                key={m.toISOString()}
                className="absolute top-0 bottom-0 w-px bg-wsp-border opacity-30"
                style={{ left: dateToX(m) }}
              />
            ))}

            {/* Today column highlight */}
            {todayX !== null && (
              <div
                className="absolute top-0 bg-wsp-red opacity-[0.06]"
                style={{ left: todayX, width: 2, height: totalContentH }}
              />
            )}

            {/* Task bars */}
            {tasks.map((task, i) => {
              const wbs = task.wbs_id ? wbsMap[task.wbs_id] : null;
              const lvl = wbs ? wbsLevel(wbs.wbs_code) : 1;
              const x1 = dateToX(parseDate(task.start_date!));
              const x2 = dateToX(parseDate(task.end_date!));
              const barW = Math.max(x2 - x1, 3);
              const barH = task.is_milestone ? 14 : lvl === 1 ? 14 : 18;
              const barY = i * ROW_H + Math.floor((ROW_H - barH) / 2);

              if (task.is_milestone) {
                const cx = x1;
                const cy = i * ROW_H + ROW_H / 2;
                return (
                  <div
                    key={task.id}
                    title={task.task_name}
                    className="absolute bg-wsp-dark rotate-45"
                    style={{ left: cx - 6, top: cy - 6, width: 12, height: 12 }}
                  />
                );
              }

              const barColor =
                lvl === 1
                  ? "#c8201a"
                  : lvl === 2
                  ? "#ef3427"
                  : "#f57570";

              return (
                <div
                  key={task.id}
                  title={`${task.task_name}: ${task.start_date} → ${task.end_date}`}
                  className="absolute flex items-center overflow-hidden"
                  style={{
                    left: x1,
                    top: barY,
                    width: barW,
                    height: barH,
                    backgroundColor: barColor,
                    borderRadius: lvl === 1 ? 1 : 2,
                    opacity: lvl === 1 ? 0.85 : 1,
                  }}
                >
                  {barW > 50 && (
                    <span
                      style={{
                        color: "#fff",
                        fontSize: 10,
                        padding: "0 5px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        lineHeight: 1,
                      }}
                    >
                      {task.task_name}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Today line */}
            {todayX !== null && (
              <div
                className="absolute top-0 w-px bg-wsp-red"
                style={{ left: todayX, height: totalContentH }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
