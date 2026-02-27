import api from "./client";

export interface Proposal {
  id: string;
  proposal_number: string;
  title: string;
  client_name: string | null;
  status: "draft" | "in_review" | "submitted";
  created_at: string;
  updated_at: string;
}

export const proposalsApi = {
  list: () => api.get<Proposal[]>("/api/proposals/").then(r => r.data),
  create: (data: Omit<Proposal, "id" | "created_at" | "updated_at">) =>
    api.post<Proposal>("/api/proposals/", data).then(r => r.data),
  get: (id: string) => api.get<Proposal>(`/api/proposals/${id}`).then(r => r.data),
};
