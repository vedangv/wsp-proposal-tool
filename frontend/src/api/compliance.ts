import api from "./client";

export interface ComplianceItem {
  id: string;
  proposal_id: string;
  item_name: string;
  category: string;
  status: string;
  assigned_to: string | null;
  notes: string | null;
  order_index: number;
  updated_at: string | null;
}

export const complianceApi = {
  list: (proposalId: string) =>
    api.get<ComplianceItem[]>(`/api/proposals/${proposalId}/compliance/`).then(r => r.data),
  create: (proposalId: string, data: Partial<ComplianceItem>) =>
    api.post<ComplianceItem>(`/api/proposals/${proposalId}/compliance/`, data).then(r => r.data),
  init: (proposalId: string) =>
    api.post<ComplianceItem[]>(`/api/proposals/${proposalId}/compliance/init`).then(r => r.data),
  update: (proposalId: string, id: string, data: Partial<ComplianceItem>) =>
    api.patch<ComplianceItem>(`/api/proposals/${proposalId}/compliance/${id}`, data).then(r => r.data),
  delete: (proposalId: string, id: string) =>
    api.delete(`/api/proposals/${proposalId}/compliance/${id}`),
};
