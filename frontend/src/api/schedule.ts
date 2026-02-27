import api from "./client";

export interface ScheduleItem {
  id: string;
  proposal_id: string;
  wbs_id: string | null;
  task_name: string;
  start_date: string | null;
  end_date: string | null;
  responsible_party: string | null;
  is_milestone: boolean;
  phase: string | null;
}

export const scheduleApi = {
  list: (proposalId: string) =>
    api.get<ScheduleItem[]>(`/api/proposals/${proposalId}/schedule/`).then(r => r.data),
  create: (proposalId: string, data: Partial<ScheduleItem>) =>
    api.post<ScheduleItem>(`/api/proposals/${proposalId}/schedule/`, data).then(r => r.data),
  update: (proposalId: string, itemId: string, data: Partial<ScheduleItem>) =>
    api.patch<ScheduleItem>(`/api/proposals/${proposalId}/schedule/${itemId}`, data).then(r => r.data),
  delete: (proposalId: string, itemId: string) =>
    api.delete(`/api/proposals/${proposalId}/schedule/${itemId}`),
};
