import api from "./client";

export interface Project {
  id: string;
  project_number: string | null;
  project_name: string;
  client: string | null;
  location: string | null;
  contract_value: number | null;
  year_completed: string | null;
  status: string;
  wsp_role: string | null;
  project_manager: string | null;
  sector: string | null;
  services_performed: string | null;
  key_personnel: { name: string; role: string }[];
  description: string | null;
  outcomes: string | null;
  updated_at: string | null;
}

export const projectsApi = {
  list: (params?: { search?: string; sector?: string; status?: string; client?: string }) =>
    api.get<Project[]>("/api/projects/", { params }).then(r => r.data),
  get: (id: string) =>
    api.get<Project>(`/api/projects/${id}`).then(r => r.data),
  create: (data: Partial<Project>) =>
    api.post<Project>("/api/projects/", data).then(r => r.data),
  update: (id: string, data: Partial<Project>) =>
    api.patch<Project>(`/api/projects/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/api/projects/${id}`),
  lessons: (id: string) =>
    api.get<any[]>(`/api/projects/${id}/lessons`).then(r => r.data),
};
