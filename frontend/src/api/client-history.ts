import api from "./client";
import type { Proposal } from "./proposals";

export interface ClientOutreach {
  id: string;
  proposal_id: string;
  outreach_date: string;
  outreach_type: string;
  contact_name: string | null;
  contact_role: string | null;
  notes: string | null;
}

export type OutreachType = "call" | "email" | "meeting" | "presentation" | "site_visit" | "other";

export const clientHistoryApi = {
  listPastProposals: (proposalId: string) =>
    api.get<Proposal[]>(`/api/proposals/${proposalId}/client-history/past-proposals`).then(r => r.data),

  listAllOutreach: (proposalId: string) =>
    api.get<ClientOutreach[]>(`/api/proposals/${proposalId}/client-history/outreach/all`).then(r => r.data),

  listOutreach: (proposalId: string) =>
    api.get<ClientOutreach[]>(`/api/proposals/${proposalId}/client-history/outreach`).then(r => r.data),

  createOutreach: (proposalId: string, data: Omit<ClientOutreach, "id" | "proposal_id">) =>
    api.post<ClientOutreach>(`/api/proposals/${proposalId}/client-history/outreach`, data).then(r => r.data),

  updateOutreach: (proposalId: string, outreachId: string, data: Partial<ClientOutreach>) =>
    api.patch<ClientOutreach>(`/api/proposals/${proposalId}/client-history/outreach/${outreachId}`, data).then(r => r.data),

  deleteOutreach: (proposalId: string, outreachId: string) =>
    api.delete(`/api/proposals/${proposalId}/client-history/outreach/${outreachId}`),
};
