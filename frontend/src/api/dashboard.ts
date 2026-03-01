import api from "./client";

export interface Dashboard {
  total_billing: number;
  total_cost: number;
  total_burdened: number;
  net_margin: number;
  margin_pct: number;
  achieved_dlm: number;
  target_dlm: number;
  team_size: number;
  total_hours: number;
  schedule_start: string | null;
  schedule_end: string | null;
  wbs_count: number;
  pricing_count: number;
  people_count: number;
  schedule_count: number;
  deliverables_count: number;
  drawings_count: number;
  scope_count: number;
  relevant_projects_count: number;
}

export const dashboardApi = {
  get: (proposalId: string) =>
    api.get<Dashboard>(`/api/proposals/${proposalId}/dashboard/`).then(r => r.data),
};
