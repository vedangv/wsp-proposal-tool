import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { dashboardApi } from "../../api/dashboard";

interface Props {
  proposalId: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

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

export default function DashboardTab({ proposalId }: Props) {
  const { data: dash, isLoading } = useQuery({
    queryKey: ["dashboard", proposalId],
    queryFn: () => dashboardApi.get(proposalId),
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
      <div className="flex justify-between items-end mb-5">
        <div>
          <h3 className="font-display font-semibold text-wsp-dark text-base tracking-tight">
            Proposal Dashboard
          </h3>
          <p className="text-xs text-wsp-muted font-body mt-0.5">
            Financial summary and proposal metrics
          </p>
        </div>
        <Link
          to={`/proposals/${proposalId}/summary`}
          className="wsp-btn-ghost text-xs"
        >
          Print Summary
        </Link>
      </div>

      {/* Financial metrics */}
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

      {/* Sizing metrics */}
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

      {/* Tab counts */}
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
