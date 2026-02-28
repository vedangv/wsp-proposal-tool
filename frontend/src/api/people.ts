import api from "./client";

export interface Person {
  id: string;
  proposal_id: string;
  employee_name: string;
  employee_id: string | null;
  wsp_role: string | null;
  team: string | null;
  role_on_project: string | null;
  hourly_rate: number | null;
  years_experience: number | null;
  cv_path: string | null;
}

export const peopleApi = {
  list: (proposalId: string) =>
    api.get<Person[]>(`/api/proposals/${proposalId}/people/`).then(r => r.data),
  create: (proposalId: string, data: Partial<Person>) =>
    api.post<Person>(`/api/proposals/${proposalId}/people/`, data).then(r => r.data),
  update: (proposalId: string, personId: string, data: Partial<Person>) =>
    api.patch<Person>(`/api/proposals/${proposalId}/people/${personId}`, data).then(r => r.data),
  delete: (proposalId: string, personId: string) =>
    api.delete(`/api/proposals/${proposalId}/people/${personId}`),
};
