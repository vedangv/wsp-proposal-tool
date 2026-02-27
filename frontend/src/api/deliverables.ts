import api from "./client";

export type DeliverableType = "report" | "model" | "specification" | "drawing_package" | "other";
export type DeliverableStatus = "tbd" | "in_progress" | "complete";

export interface Deliverable {
  id: string;
  proposal_id: string;
  wbs_id: string | null;
  deliverable_ref: string | null;
  title: string;
  type: DeliverableType;
  description: string | null;
  due_date: string | null;
  responsible_party: string | null;
  status: DeliverableStatus;
}

export const deliverablesApi = {
  list: (proposalId: string) =>
    api.get<Deliverable[]>(`/api/proposals/${proposalId}/deliverables/`).then(r => r.data),
  create: (proposalId: string, data: Partial<Deliverable>) =>
    api.post<Deliverable>(`/api/proposals/${proposalId}/deliverables/`, data).then(r => r.data),
  update: (proposalId: string, id: string, data: Partial<Deliverable>) =>
    api.patch<Deliverable>(`/api/proposals/${proposalId}/deliverables/${id}`, data).then(r => r.data),
  delete: (proposalId: string, id: string) =>
    api.delete(`/api/proposals/${proposalId}/deliverables/${id}`),
  drawingCount: (proposalId: string, id: string) =>
    api.get<{ count: number }>(`/api/proposals/${proposalId}/deliverables/${id}/drawing-count`).then(r => r.data),
};
