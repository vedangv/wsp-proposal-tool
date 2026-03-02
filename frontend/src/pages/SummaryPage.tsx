import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { proposalsApi } from "../api/proposals";
import { dashboardApi } from "../api/dashboard";
import { peopleApi } from "../api/people";
import { wbsApi } from "../api/wbs";
import { deliverablesApi } from "../api/deliverables";
import { scheduleApi } from "../api/schedule";
import { drawingsApi } from "../api/drawings";
import { disciplinesApi } from "../api/disciplines";
import { complianceApi } from "../api/compliance";
import { relevantProjectsApi } from "../api/relevantProjects";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

export default function SummaryPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;

  return <SummaryContent proposalId={id} />;
}

function SummaryContent({ proposalId }: { proposalId: string }) {
  const { data: proposal } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => proposalsApi.get(proposalId),
  });

  const { data: dash } = useQuery({
    queryKey: ["dashboard", proposalId],
    queryFn: () => dashboardApi.get(proposalId),
  });

  const { data: people = [] } = useQuery({
    queryKey: ["people", proposalId],
    queryFn: () => peopleApi.list(proposalId),
  });

  const { data: wbsItems = [] } = useQuery({
    queryKey: ["wbs", proposalId],
    queryFn: () => wbsApi.list(proposalId),
  });

  const { data: deliverables = [] } = useQuery({
    queryKey: ["deliverables", proposalId],
    queryFn: () => deliverablesApi.list(proposalId),
  });

  const { data: schedule = [] } = useQuery({
    queryKey: ["schedule", proposalId],
    queryFn: () => scheduleApi.list(proposalId),
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ["drawings", proposalId],
    queryFn: () => drawingsApi.list(proposalId),
  });

  const { data: disciplines = [] } = useQuery({
    queryKey: ["disciplines", proposalId],
    queryFn: () => disciplinesApi.list(proposalId),
  });

  const { data: complianceItems = [] } = useQuery({
    queryKey: ["compliance", proposalId],
    queryFn: () => complianceApi.list(proposalId),
  });

  const { data: relevantProjects = [] } = useQuery({
    queryKey: ["relevant-projects", proposalId],
    queryFn: () => relevantProjectsApi.list(proposalId),
  });

  const milestones = schedule.filter(s => s.is_milestone);

  const isParent = (code: string) => wbsItems.some(w => w.wbs_code.startsWith(code + "."));

  if (!proposal || !dash) {
    return <div className="p-8 text-center text-gray-400">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Screen-only nav bar */}
      <div className="print:hidden bg-wsp-dark text-white px-6 py-3 flex justify-between items-center">
        <Link to={`/proposals/${proposalId}`} className="text-white/60 hover:text-white text-sm font-body">
          ← Back to Proposal
        </Link>
        <button
          onClick={() => window.print()}
          className="wsp-btn-primary text-xs"
        >
          Print / Export PDF
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 print:py-6 print:px-0 print:max-w-none">
        {/* Header */}
        <div className="border-b-2 border-wsp-dark pb-4 mb-8 print:mb-6">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="font-display font-bold text-xl tracking-[0.3em] uppercase text-wsp-dark">WSP</p>
              <h1 className="font-display font-bold text-2xl text-wsp-dark mt-2">{proposal.title}</h1>
            </div>
            <div className="text-right">
              <p className="font-mono text-wsp-red text-sm">{proposal.proposal_number}</p>
              {proposal.client_name && (
                <p className="text-sm text-wsp-muted font-body mt-1">{proposal.client_name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Fee Summary */}
        <section className="mb-8 print:mb-6">
          <h2 className="font-display font-semibold text-sm tracking-widest uppercase text-wsp-muted mb-3 border-b border-wsp-border pb-1">
            Fee Summary
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-wsp-muted font-body">Billing Total</p>
              <p className="font-mono font-bold text-lg text-wsp-dark">{fmt(dash.total_billing)}</p>
            </div>
            <div>
              <p className="text-xs text-wsp-muted font-body">Cost Total</p>
              <p className="font-mono font-bold text-lg text-wsp-muted">{fmt(dash.total_cost)}</p>
            </div>
            <div>
              <p className="text-xs text-wsp-muted font-body">Net Margin</p>
              <p className={`font-mono font-bold text-lg ${dash.margin_pct >= 30 ? "text-emerald-600" : "text-amber-600"}`}>
                {fmt(dash.net_margin)} ({dash.margin_pct}%)
              </p>
            </div>
            <div>
              <p className="text-xs text-wsp-muted font-body">DLM</p>
              <p className={`font-mono font-bold text-lg ${dash.achieved_dlm >= dash.target_dlm ? "text-emerald-600" : "text-amber-600"}`}>
                {dash.achieved_dlm.toFixed(2)}x
              </p>
              <p className="text-[10px] text-wsp-muted">Target: {dash.target_dlm.toFixed(1)}x</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-3">
            <div>
              <p className="text-xs text-wsp-muted font-body">Total Hours</p>
              <p className="font-mono font-bold text-wsp-dark">{dash.total_hours}</p>
            </div>
            <div>
              <p className="text-xs text-wsp-muted font-body">Team Size</p>
              <p className="font-mono font-bold text-wsp-dark">{dash.team_size}</p>
            </div>
            <div>
              <p className="text-xs text-wsp-muted font-body">Schedule Start</p>
              <p className="font-mono text-sm text-wsp-dark">{dash.schedule_start || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-wsp-muted font-body">Schedule End</p>
              <p className="font-mono text-sm text-wsp-dark">{dash.schedule_end || "—"}</p>
            </div>
          </div>
        </section>

        {/* Timeline / Key Dates */}
        <section className="mb-8 print:mb-6">
          <h2 className="font-display font-semibold text-sm tracking-widest uppercase text-wsp-muted mb-3 border-b border-wsp-border pb-1">
            Proposal Timeline
          </h2>
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[
              { label: "Kickoff", date: proposal.kickoff_date, color: "border-l-blue-500" },
              { label: "Red Review", date: proposal.red_review_date, color: "border-l-red-500" },
              { label: "Gold Review", date: proposal.gold_review_date, color: "border-l-amber-500" },
              { label: "Submission Deadline", date: proposal.submission_deadline, color: "border-l-emerald-600" },
            ].map(m => (
              <div key={m.label} className={`border-l-4 ${m.color} pl-3`}>
                <p className="text-xs text-wsp-muted font-body">{m.label}</p>
                <p className="font-mono text-sm text-wsp-dark font-semibold">{m.date || "—"}</p>
              </div>
            ))}
          </div>
          {proposal.check_in_meetings && proposal.check_in_meetings.length > 0 && (
            <div>
              <p className="text-xs font-display font-semibold text-wsp-dark tracking-wide mb-2">Check-in Meetings</p>
              <div className="grid grid-cols-2 gap-2">
                {proposal.check_in_meetings.map((m: any, i: number) => (
                  <div key={i} className="flex gap-3 items-baseline">
                    <span className="font-mono text-xs text-wsp-muted w-20 flex-shrink-0">{m.date}</span>
                    <span className="text-xs text-wsp-dark">{m.notes || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {dash.days_remaining != null && (
            <p className={`text-xs font-mono font-bold mt-3 ${
              dash.days_remaining <= 3 ? "text-wsp-red" : dash.days_remaining <= 7 ? "text-amber-600" : "text-emerald-600"
            }`}>
              {dash.days_remaining > 0 ? `${dash.days_remaining} days remaining` :
               dash.days_remaining === 0 ? "Due today" : `${Math.abs(dash.days_remaining)} days overdue`}
            </p>
          )}
        </section>

        {/* Disciplines */}
        {disciplines.length > 0 && (
          <section className="mb-8 print:mb-6">
            <h2 className="font-display font-semibold text-sm tracking-widest uppercase text-wsp-muted mb-3 border-b border-wsp-border pb-1">
              Disciplines ({disciplines.length})
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-wsp-border text-left">
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted">Discipline</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted">Contact</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted">Email</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {disciplines.map(d => (
                  <tr key={d.id} className="border-b border-wsp-border/50">
                    <td className="py-1 font-medium text-wsp-dark">{d.discipline_name}</td>
                    <td className="py-1 text-wsp-muted">{d.contact_name || "—"}</td>
                    <td className="py-1 text-blue-600 text-xs">{d.contact_email || "—"}</td>
                    <td className="py-1 text-xs">
                      <span className={`${d.status === "confirmed" ? "text-emerald-600" : d.status === "contacted" ? "text-blue-600" : d.status === "declined" ? "text-red-600" : "text-gray-400"}`}>
                        {d.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Team List */}
        {people.length > 0 && (
          <section className="mb-8 print:mb-6">
            <h2 className="font-display font-semibold text-sm tracking-widest uppercase text-wsp-muted mb-3 border-b border-wsp-border pb-1">
              Proposed Team ({people.length})
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-wsp-border text-left">
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted">Name</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted">Role on Project</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted">Team</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted text-right">Exp (yrs)</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted text-right">Rate</th>
                </tr>
              </thead>
              <tbody>
                {people.map(p => (
                  <tr key={p.id} className="border-b border-wsp-border/50">
                    <td className="py-1.5 font-medium text-wsp-dark">{p.employee_name}</td>
                    <td className="py-1.5 text-wsp-muted">{p.role_on_project || "—"}</td>
                    <td className="py-1.5 text-wsp-muted">{p.team || "—"}</td>
                    <td className="py-1.5 text-right font-mono text-wsp-muted">{p.years_experience ?? "—"}</td>
                    <td className="py-1.5 text-right font-mono font-semibold text-wsp-dark">
                      {p.hourly_rate != null && Number(p.hourly_rate) > 0 ? `$${Number(p.hourly_rate).toFixed(0)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* WBS */}
        {wbsItems.length > 0 && (
          <section className="mb-8 print:mb-6">
            <h2 className="font-display font-semibold text-sm tracking-widest uppercase text-wsp-muted mb-3 border-b border-wsp-border pb-1">
              Work Breakdown Structure
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-wsp-border text-left">
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted w-20">Code</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted">Description</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted w-24">Phase</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted text-right w-20">Hours</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted text-right w-24">Billing</th>
                </tr>
              </thead>
              <tbody>
                {wbsItems.map(w => {
                  const level = w.wbs_code.split(".").length;
                  const parent = isParent(w.wbs_code);
                  return (
                    <tr key={w.id} className={`border-b border-wsp-border/50 ${parent ? "font-semibold" : ""}`}>
                      <td className="py-1 font-mono text-wsp-red text-xs">{w.wbs_code}</td>
                      <td className="py-1 text-wsp-dark" style={{ paddingLeft: `${(level - 1) * 16}px` }}>
                        {w.description || "—"}
                      </td>
                      <td className="py-1 text-wsp-muted text-xs">{w.phase || "—"}</td>
                      <td className="py-1 text-right font-mono text-wsp-muted">
                        {w.total_hours > 0 ? w.total_hours : "—"}
                      </td>
                      <td className="py-1 text-right font-mono text-wsp-dark">
                        {w.total_cost > 0 ? fmt(w.total_cost) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-wsp-dark font-bold">
                  <td colSpan={3} className="py-1.5 text-right text-xs font-display tracking-widest uppercase text-wsp-muted">
                    Total
                  </td>
                  <td className="py-1.5 text-right font-mono text-wsp-dark">{dash.total_hours}</td>
                  <td className="py-1.5 text-right font-mono text-wsp-dark">{fmt(dash.total_billing)}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        )}

        {/* Deliverables */}
        {deliverables.length > 0 && (
          <section className="mb-8 print:mb-6">
            <h2 className="font-display font-semibold text-sm tracking-widest uppercase text-wsp-muted mb-3 border-b border-wsp-border pb-1">
              Deliverables ({deliverables.length})
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-wsp-border text-left">
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted w-20">Ref</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted">Title</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted w-24">Type</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted w-24">Due</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {deliverables.map(d => (
                  <tr key={d.id} className="border-b border-wsp-border/50">
                    <td className="py-1 font-mono text-wsp-red text-xs">{d.deliverable_ref || "—"}</td>
                    <td className="py-1 text-wsp-dark">{d.title}</td>
                    <td className="py-1 text-wsp-muted text-xs">{d.type}</td>
                    <td className="py-1 font-mono text-xs text-wsp-muted">{d.due_date || "—"}</td>
                    <td className="py-1 text-xs text-wsp-muted">{d.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Milestones */}
        {milestones.length > 0 && (
          <section className="mb-8 print:mb-6">
            <h2 className="font-display font-semibold text-sm tracking-widest uppercase text-wsp-muted mb-3 border-b border-wsp-border pb-1">
              Key Milestones ({milestones.length})
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-wsp-border text-left">
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted">Milestone</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted w-24">Date</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted">Responsible</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map(m => (
                  <tr key={m.id} className="border-b border-wsp-border/50">
                    <td className="py-1 font-semibold text-wsp-dark">
                      <span className="inline-block w-2 h-2 bg-wsp-dark rotate-45 mr-2" />
                      {m.task_name}
                    </td>
                    <td className="py-1 font-mono text-xs text-wsp-muted">{m.end_date || m.start_date || "—"}</td>
                    <td className="py-1 text-wsp-muted">{m.responsible_party || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Drawings */}
        {drawings.length > 0 && (
          <section className="mb-8 print:mb-6">
            <h2 className="font-display font-semibold text-sm tracking-widest uppercase text-wsp-muted mb-3 border-b border-wsp-border pb-1">
              Drawing List ({drawings.length})
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-wsp-border text-left">
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted w-20">No.</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted">Title</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted w-24">Discipline</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted w-16">Scale</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted w-16">Format</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {drawings.map(d => (
                  <tr key={d.id} className="border-b border-wsp-border/50">
                    <td className="py-1 font-mono text-wsp-red text-xs">{d.drawing_number || "—"}</td>
                    <td className="py-1 text-wsp-dark">{d.title}</td>
                    <td className="py-1 text-wsp-muted text-xs">{d.discipline || "—"}</td>
                    <td className="py-1 font-mono text-xs text-wsp-muted">{d.scale || "—"}</td>
                    <td className="py-1 text-xs text-wsp-muted uppercase">{d.format}</td>
                    <td className="py-1 text-xs">
                      <span className={`${d.status === "complete" ? "text-emerald-600" : d.status === "in_progress" ? "text-blue-600" : "text-gray-400"}`}>
                        {d.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Relevant Projects */}
        {relevantProjects.length > 0 && (
          <section className="mb-8 print:mb-6">
            <h2 className="font-display font-semibold text-sm tracking-widest uppercase text-wsp-muted mb-3 border-b border-wsp-border pb-1">
              Relevant Projects ({relevantProjects.length})
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-wsp-border text-left">
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted">Project</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted">Client</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted w-24">Value</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted w-16">Year</th>
                  <th className="py-1.5 font-display text-xs tracking-wider text-wsp-muted w-28">Role</th>
                </tr>
              </thead>
              <tbody>
                {relevantProjects.map(p => (
                  <tr key={p.id} className="border-b border-wsp-border/50">
                    <td className="py-1 font-medium text-wsp-dark">{p.project_name}</td>
                    <td className="py-1 text-wsp-muted text-xs">{p.client || "—"}</td>
                    <td className="py-1 text-right font-mono text-xs text-wsp-dark">
                      {p.contract_value != null ? fmt(Number(p.contract_value)) : "—"}
                    </td>
                    <td className="py-1 font-mono text-xs text-wsp-muted">{p.year_completed || "—"}</td>
                    <td className="py-1 text-xs text-wsp-muted">{p.wsp_role || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Compliance Checklist */}
        {complianceItems.length > 0 && (
          <section className="mb-8 print:mb-6">
            <h2 className="font-display font-semibold text-sm tracking-widest uppercase text-wsp-muted mb-3 border-b border-wsp-border pb-1">
              Compliance Checklist
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {complianceItems.map(item => (
                <div key={item.id} className="flex items-center gap-2 py-1">
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0
                    ${item.status === "completed" ? "bg-emerald-500 border-emerald-500 text-white" :
                      item.status === "not_applicable" ? "bg-gray-200 border-gray-300" :
                      "border-gray-300"}`}>
                    {item.status === "completed" && <span className="text-[8px]">&#10003;</span>}
                    {item.status === "not_applicable" && <span className="text-[8px] text-gray-400">—</span>}
                  </span>
                  <span className={`text-xs flex-1 ${item.status === "completed" ? "line-through text-wsp-muted" : item.status === "not_applicable" ? "text-gray-300" : "text-wsp-dark"}`}>
                    {item.item_name}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="border-t border-wsp-border pt-4 mt-8 text-center">
          <p className="text-[10px] text-wsp-muted font-body">
            Generated {new Date().toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })} · WSP Proposal Tool
          </p>
        </div>
      </div>
    </div>
  );
}
