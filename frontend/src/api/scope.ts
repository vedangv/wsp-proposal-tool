import api from "./client";

export interface ScopeSection {
  id: string;
  proposal_id: string;
  section_name: string;
  content: string;
  order_index: number;
}

export const scopeApi = {
  list: (proposalId: string) =>
    api.get<ScopeSection[]>(`/api/proposals/${proposalId}/scope/`).then(r => r.data),
  update: (proposalId: string, sectionId: string, data: Partial<ScopeSection>) =>
    api.patch<ScopeSection>(`/api/proposals/${proposalId}/scope/${sectionId}`, data).then(r => r.data),
  create: (proposalId: string, data: Partial<ScopeSection>) =>
    api.post<ScopeSection>(`/api/proposals/${proposalId}/scope/`, data).then(r => r.data),
  delete: (proposalId: string, sectionId: string) =>
    api.delete(`/api/proposals/${proposalId}/scope/${sectionId}`),
};
