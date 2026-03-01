import api from "./client";

export interface Discipline {
  id: string;
  proposal_id: string;
  discipline_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  notes: string | null;
  order_index: number;
  updated_at: string | null;
}

export const STANDARD_DISCIPLINES = [
  "Transportation",
  "Structural",
  "Environmental",
  "Geotechnical",
  "Electrical",
  "Mechanical",
  "Water Resources",
  "Survey",
  "Planning",
  "Architecture",
];

export const disciplinesApi = {
  list: (proposalId: string) =>
    api.get<Discipline[]>(`/api/proposals/${proposalId}/disciplines/`).then(r => r.data),
  create: (proposalId: string, data: Partial<Discipline>) =>
    api.post<Discipline>(`/api/proposals/${proposalId}/disciplines/`, data).then(r => r.data),
  init: (proposalId: string) =>
    api.post<Discipline[]>(`/api/proposals/${proposalId}/disciplines/init`).then(r => r.data),
  update: (proposalId: string, id: string, data: Partial<Discipline>) =>
    api.patch<Discipline>(`/api/proposals/${proposalId}/disciplines/${id}`, data).then(r => r.data),
  delete: (proposalId: string, id: string) =>
    api.delete(`/api/proposals/${proposalId}/disciplines/${id}`),
};
