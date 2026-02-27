import api from "./client";

export interface PricingRow {
  id: string;
  proposal_id: string;
  wbs_id: string | null;
  role_title: string | null;
  staff_name: string | null;
  grade: string | null;
  hourly_rate: number;
  hours_by_phase: Record<string, number>;
  total_hours: number;
  total_cost: number;
}

export const pricingApi = {
  list: (proposalId: string) =>
    api.get<PricingRow[]>(`/api/proposals/${proposalId}/pricing/`).then(r => r.data),
  create: (proposalId: string, data: Partial<PricingRow>) =>
    api.post<PricingRow>(`/api/proposals/${proposalId}/pricing/`, data).then(r => r.data),
  update: (proposalId: string, rowId: string, data: Partial<PricingRow>) =>
    api.patch<PricingRow>(`/api/proposals/${proposalId}/pricing/${rowId}`, data).then(r => r.data),
  delete: (proposalId: string, rowId: string) =>
    api.delete(`/api/proposals/${proposalId}/pricing/${rowId}`),
};
