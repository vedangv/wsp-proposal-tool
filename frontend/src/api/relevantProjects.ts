import api from "./client";

export interface RelevantProject {
  id: string;
  proposal_id: string;
  project_name: string;
  project_number: string | null;
  client: string | null;
  location: string | null;
  contract_value: number | null;
  year_completed: string | null;
  wsp_role: string | null;
  project_manager: string | null;
  services_performed: string | null;
  relevance_notes: string | null;
}

export const relevantProjectsApi = {
  list: (proposalId: string) =>
    api.get<RelevantProject[]>(`/api/proposals/${proposalId}/relevant-projects/`).then(r => r.data),
  create: (proposalId: string, data: Partial<RelevantProject>) =>
    api.post<RelevantProject>(`/api/proposals/${proposalId}/relevant-projects/`, data).then(r => r.data),
  update: (proposalId: string, id: string, data: Partial<RelevantProject>) =>
    api.patch<RelevantProject>(`/api/proposals/${proposalId}/relevant-projects/${id}`, data).then(r => r.data),
  delete: (proposalId: string, id: string) =>
    api.delete(`/api/proposals/${proposalId}/relevant-projects/${id}`),
};
