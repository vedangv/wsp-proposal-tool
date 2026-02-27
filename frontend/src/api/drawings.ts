import api from "./client";

export type DrawingFormat = "pdf" | "dwg" | "revit" | "other";
export type DrawingStatus = "tbd" | "in_progress" | "complete";

export interface Drawing {
  id: string;
  proposal_id: string;
  wbs_id: string | null;
  deliverable_id: string | null;
  drawing_number: string | null;
  title: string;
  discipline: string | null;
  scale: string | null;
  format: DrawingFormat;
  due_date: string | null;
  responsible_party: string | null;
  revision: string | null;
  status: DrawingStatus;
}

export const drawingsApi = {
  list: (proposalId: string) =>
    api.get<Drawing[]>(`/api/proposals/${proposalId}/drawings/`).then(r => r.data),
  create: (proposalId: string, data: Partial<Drawing>) =>
    api.post<Drawing>(`/api/proposals/${proposalId}/drawings/`, data).then(r => r.data),
  update: (proposalId: string, id: string, data: Partial<Drawing>) =>
    api.patch<Drawing>(`/api/proposals/${proposalId}/drawings/${id}`, data).then(r => r.data),
  delete: (proposalId: string, id: string) =>
    api.delete(`/api/proposals/${proposalId}/drawings/${id}`),
};
