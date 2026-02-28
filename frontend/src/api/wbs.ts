import api from "./client";

export interface WBSItem {
  id: string;
  proposal_id: string;
  wbs_code: string;
  description: string | null;
  phase: string | null;
  total_hours: number;
  total_cost: number;
  order_index: number;
}

export const wbsApi = {
  list: (proposalId: string) =>
    api.get<WBSItem[]>(`/api/proposals/${proposalId}/wbs/`).then(r => r.data),
  create: (proposalId: string, data: Partial<WBSItem>) =>
    api.post<WBSItem>(`/api/proposals/${proposalId}/wbs/`, data).then(r => r.data),
  update: (proposalId: string, itemId: string, data: Partial<WBSItem>) =>
    api.patch<WBSItem>(`/api/proposals/${proposalId}/wbs/${itemId}`, data).then(r => r.data),
  delete: (proposalId: string, itemId: string) =>
    api.delete(`/api/proposals/${proposalId}/wbs/${itemId}`),
  links: (proposalId: string, itemId: string) =>
    api.get<{ total: number; counts: Record<string, number> }>(
      `/api/proposals/${proposalId}/wbs/${itemId}/links`
    ).then(r => r.data),
};
