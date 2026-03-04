import api from "./client";

export interface Lesson {
  id: string;
  title: string;
  description: string | null;
  source: string;
  category: string;
  impact: string;
  recommendation: string | null;
  sector: string | null;
  disciplines: string[];
  client: string | null;
  region: string | null;
  project_id: string | null;
  proposal_id: string | null;
  reported_by: string | null;
  date_reported: string | null;
  updated_at: string | null;
}

export const lessonsApi = {
  list: (params?: { search?: string; source?: string; category?: string; sector?: string; client?: string; impact?: string; discipline?: string }) =>
    api.get<Lesson[]>("/api/lessons/", { params }).then(r => r.data),
  get: (id: string) =>
    api.get<Lesson>(`/api/lessons/${id}`).then(r => r.data),
  create: (data: Partial<Lesson>) =>
    api.post<Lesson>("/api/lessons/", data).then(r => r.data),
  update: (id: string, data: Partial<Lesson>) =>
    api.patch<Lesson>(`/api/lessons/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/api/lessons/${id}`),
};
